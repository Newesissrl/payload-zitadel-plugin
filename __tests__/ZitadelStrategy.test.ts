import { ZitadelStrategy } from "../src/strategies/ZitadelStrategy";
import payload, { Payload } from "payload";
import { Request } from "express";
import { PaginatedDocs } from "payload/database";
import { buildConfig, sanitizeConfig } from "payload/config";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { slateEditor } from "@payloadcms/richtext-slate";

jest.mock("payload");

describe("ZitadelStrategy", () => {
  let strategy: ZitadelStrategy;
  let protoSuccessMock;
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV }; // Make a copy
  });
  beforeAll(async () => {
    const config = await buildConfig({
      db: mongooseAdapter({ url: "" }),
      editor: slateEditor({}),
      collections: [
        {
          slug: "test-slug",
          fields: [
            {
              name: "firstName",
              type: "text",
              required: true,
            },
            {
              name: "last-Name",
              type: "text",
              required: true,
            },
          ],
        },
      ],
    });
    strategy = new ZitadelStrategy(
      {
        ...payload,
        config: config,
      } as Payload,
      "test-slug",
      [
        {
          from: "first_name",
          to: "firstName",
        },
        {
          from: "sub",
          to: "lastName",
        },
      ]
    );
    ZitadelStrategy.prototype.success = () => {};
    ZitadelStrategy.prototype.error = () => {};
    process.env.PAYLOAD_PUBLIC_ZITADEL_USER_INFO = "http://localhost:8080";
    protoSuccessMock = jest
      .spyOn(ZitadelStrategy.prototype, "success")
      .mockImplementation();
    jest.spyOn(ZitadelStrategy.prototype, "error").mockImplementation();
    jest
      .spyOn(strategy, "createPassword")
      .mockImplementation(() => "9Xp0a7OrLv613l1aR9k4");
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  it("slug should not be null", () => {
    expect(strategy.slug).toBe("test-slug");
  });
  it("name should be 'zitadel'", () => {
    expect(strategy.name).toBe("zitadel");
  });
  describe("authenticate", () => {
    it("should fallback to standard user-pwd login", async () => {
      const req = {
        cookies: {},
        user: {
          id: "test",
        },
      } as unknown as Request;
      await strategy.authenticate(req);
      expect(strategy.success).toBeCalledWith(req.user);
    });
    it("non-existing user should create a new one", async () => {
      const req = {
        cookies: {
          idp_token: "42",
        },
      } as unknown as Request;
      const user = {
        id: "non-existing-oidc",
        email: "non-existing@oidc.com",
      };
      (fetch as any).mockResponseOnce(JSON.stringify(user));
      const spyCreate = jest.spyOn(strategy.ctx, "create").mockResolvedValue({
        ...user,
        password: strategy.createPassword(),
      });
      const spyFind = jest
        .spyOn(strategy.ctx, "find")
        .mockResolvedValue({ docs: [] } as unknown as PaginatedDocs<any>);
      await strategy.authenticate(req);
      expect(spyFind).toBeCalledTimes(2);
      expect(spyCreate).toBeCalledTimes(1);
      expect(protoSuccessMock).toBeCalledWith({
        id: "non-existing-oidc",
        email: "non-existing@oidc.com",
        password: "9Xp0a7OrLv613l1aR9k4",
        collection: "test-slug",
        _strategy: "test-slug-zitadel",
      });
    });
    it("existing user should merge the two", async () => {
      const oidcUser = {
        id: "existing-oidc",
        email: "existing@oidc.com",
      };
      const req = {
        cookies: {
          idp_token: "42",
        },
      } as unknown as Request;
      (fetch as any).mockResponseOnce(JSON.stringify(oidcUser));
      const foundUser = {
        id: "existing-oidc",
        full_name: "Test User",
      };
      const spyFind = jest.spyOn(strategy.ctx, "find").mockResolvedValue({
        docs: [foundUser],
      } as unknown as PaginatedDocs<any>);
      const spyUpdate = jest.spyOn(strategy.ctx, "update").mockResolvedValue({
        ...foundUser,
        ...oidcUser,
      } as unknown as any);
      await strategy.authenticate(req);
      expect(spyFind).toBeCalledTimes(1);
      expect(spyUpdate).toBeCalledWith({
        collection: strategy.slug,
        id: foundUser.id,
        data: {
          ...oidcUser,
        },
      });
      expect(protoSuccessMock).toBeCalledWith({
        id: "existing-oidc",
        email: "existing@oidc.com",
        full_name: "Test User",
        collection: "test-slug",
        _strategy: "test-slug-zitadel",
      });
    });
    it("should remap oidc fields", () => {
      const remappedUser = strategy.remapFields({
        first_name: "Alberto",
        sub: "1234567890",
        additional_field: "my-custom-field",
      }) as any;
      expect(remappedUser.firstName).toBe("Alberto");
      expect(remappedUser.lastName).toBe("1234567890");
      expect(remappedUser.additional_field).toBe("my-custom-field");
    });
  });
});
