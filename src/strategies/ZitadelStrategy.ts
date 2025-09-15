import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Payload } from "mzinga";
import { PaginatedDocs } from "mzinga/database";
import getExtractJWT from "mzinga/dist/auth/getExtractJWT";
import type { PayloadRequest } from "mzinga/types";
import { Strategy } from "passport";
import { pino } from "pino";
import type { FieldMapping } from "../types";

export class ZitadelStrategy extends Strategy {
  ctx: Payload;
  readonly slug: string;
  logger: pino.Logger;
  collectionHaveEmailField: boolean = true;
  constructor(
    ctx: Payload,
    collectionSlug: string,
    private readonly fieldsMappings: FieldMapping[] = [],
    loggerOptions?: any
  ) {
    super();
    this.ctx = ctx;
    this.name = "zitadel";
    this.logger = pino({
      name: this.name,
      level: process.env.PAYLOAD_LOG_LEVEL || "debug",
      ...loggerOptions,
    });
    this.slug = collectionSlug;
    const collection = ctx.collections[collectionSlug];
    this.collectionHaveEmailField =
      !collection?.config?.auth?.disableLocalStrategy;
  }

  createPassword(
    length = 32,
    wishlist = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$"
  ): string {
    return Array.from(crypto.randomFillSync(new Uint32Array(length)))
      .map((x) => wishlist[x % wishlist.length])
      .join("");
  }
  remapFields(oidcUser) {
    const result = { ...oidcUser };
    for (const mapping of this.fieldsMappings) {
      if (!(mapping.from && oidcUser[mapping.from])) {
        continue;
      }
      result[mapping.to] = mapping.decode
        ? atob(oidcUser[mapping.from])
        : oidcUser[mapping.from];
    }
    return result;
  }
  async createUser(oidcUser): Promise<any> {
    this.logger.debug(`Creating user = ${oidcUser.sub}`);
    return await this.ctx.create({
      collection: this.slug,
      disableVerificationEmail: true,
      data: {
        ...this.remapFields(oidcUser),
        password: this.createPassword(),
      },
    });
  }
  async findUser(oidcUser): Promise<PaginatedDocs<any>> {
    this.logger.debug(`Searching user with sub = ${oidcUser.sub}`);
    const userFromSub = await this.ctx.find({
      collection: this.slug,
      where: {
        sub: {
          equals: oidcUser.sub,
        },
      },
    });
    if (userFromSub.docs?.length) {
      this.logger.debug(`User found with sub search`);
      return userFromSub;
    }
    try {
      this.logger.debug(
        `Trying to search user with email search (it may fail caused by missing 'email' path)`
      );
      return await this.ctx.find({
        collection: this.slug,
        where: {
          email: {
            equals: oidcUser.email,
          },
        },
      });
    } catch {
      return userFromSub;
    }
  }

  async mergeUsers(foundUser, oidcUser): Promise<void> {
    const doc = await this.ctx.update({
      collection: this.slug,
      id: foundUser.id,
      data: {
        ...this.remapFields(oidcUser),
      },
    });
    this.successCallback(doc);
  }
  successCallback(user): void {
    user.collection = this.slug;
    user._strategy = `${this.slug}-${this.name}`;
    this.success(user);
  }
  async authenticate(req: any): Promise<any> {
    if (req.user) {
      this.success(req.user);
      return;
    }
    if (req.url === `/${this.slug}/init`) {
      this.logger.debug("Skipping endpoint to avoid duplicate requests");
      this.success(null);
      return;
    }
    const { PAYLOAD_PUBLIC_ZITADEL_USER_INFO } = process.env;
    if (!PAYLOAD_PUBLIC_ZITADEL_USER_INFO) {
      this.logger.info("No 'PAYLOAD_PUBLIC_ZITADEL_USER_INFO' key set");
      this.success(null);
      return;
    }
    const cookieName =
      process.env.PAYLOAD_PUBLIC_ZITADEL_COOKIE_NAME || "idp_token";
    const idpToken = req.cookies[cookieName];
    if (idpToken) {
      const response = await fetch(PAYLOAD_PUBLIC_ZITADEL_USER_INFO, {
        headers: {
          Authorization: `Bearer ${idpToken}`,
        },
      });
      if (response.status > 299) {
        this.logger.info(
          `Received ${response.status} from 'PAYLOAD_PUBLIC_ZITADEL_USER_INFO' endpoint`
        );
        this.success(null);
        return;
      }
      const oidcUser = await response.json();
      if (oidcUser["urn:zitadel:iam:user:metadata"]) {
        const rolesAsString = oidcUser["urn:zitadel:iam:user:metadata"].roles;
        if (rolesAsString) {
          const decodedRoles = atob(rolesAsString).replace(/"/g, "").split(",");
          oidcUser.roles = decodedRoles;
        }
      }
      const collection = await this.findUser(oidcUser);
      if (collection.docs?.length) {
        const doc = collection.docs[0];
        this.logger.debug(`User found (id = ${doc.id}). Merging info`);
        await this.mergeUsers(doc, oidcUser);
        return;
      }
      const doc = await this.createUser(oidcUser);
      this.logger.debug(`No user found. Created new one (id = ${doc.id})`);
      this.successCallback(doc);
      return;
    }
    if (!req.user) {
      this.logger.debug(`Proceeding with default login strategy`);
      const payloadToken = getExtractJWT(this.ctx.config)(req);
      if (payloadToken) {
        const tokenData = jwt.verify(
          payloadToken,
          (req as PayloadRequest).payload.secret,
          {}
        );
        if (tokenData) {
          const collection = await this.ctx.find({
            collection: tokenData.collection as string,
            where: {
              id: {
                equals: tokenData.id,
              },
            },
          });
          if (collection?.docs?.length) {
            const user = collection.docs[0];
            this.success({
              ...user,
              collection: tokenData.collection,
            });

            return;
          }
        }
      }
    }
    this.success(req.user);
  }
}
