import { Strategy } from "passport";
import { Payload } from "payload";
import { Request } from "express";
import { pino } from "pino";
import { PaginatedDocs } from "payload/database";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import getExtractJWT from "payload/dist/auth/getExtractJWT";
import { PayloadRequest } from "payload/types";
import { FieldMapping } from "../types";

export class ZitadelStrategy extends Strategy {
  ctx: Payload;
  readonly slug: string;
  logger: pino.Logger;

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
    const result = Object.assign({}, oidcUser);
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
  createUser(oidcUser): Promise<any> {
    return this.ctx.create({
      collection: this.slug,
      data: {
        ...this.remapFields(oidcUser),
        password: this.createPassword(),
      },
    });
  }
  async findUser(oidcUser): Promise<PaginatedDocs<any>> {
    const result = await this.ctx.find({
      collection: this.slug,
      where: {
        sub: {
          equals: oidcUser.sub,
        },
      },
    });
    if (result.docs && result.docs.length) {
      return Promise.resolve(result);
    }
    return this.ctx.find({
      collection: this.slug,
      where: {
        email: {
          equals: oidcUser.email,
        },
      },
    });
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
  async authenticate(req: Request): Promise<any> {
    const { PAYLOAD_PUBLIC_ZITADEL_USER_INFO } = process.env;
    if (!PAYLOAD_PUBLIC_ZITADEL_USER_INFO) {
      this.logger.info("No 'PAYLOAD_PUBLIC_ZITADEL_USER_INFO' key set");
      this.success(null);
      return;
    }
    const idpToken = req.cookies["idp_token"];
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
      if (collection.docs && collection.docs.length) {
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
          if (collection && collection.docs && collection.docs.length) {
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
