import { Config } from "payload/config";
import { ZitadelStrategyPluginConfig } from "../types";
import { generateCodeChallenge } from "../utils/pcke";
import { ZitadelStrategy } from "../strategies";
const generateComponentConfigForProviders = async (
  pluginConfig: ZitadelStrategyPluginConfig
) => {
  const pkce = await generateCodeChallenge();
  const {
    PAYLOAD_PUBLIC_ZITADEL_AUTHORIZE_ENDPOINT,
    PAYLOAD_PUBLIC_ZITADEL_REDIRECT_URI,
    PAYLOAD_PUBLIC_ZITADEL_CLIENT_ID,
    PAYLOAD_PUBLIC_ZITADEL_SCOPES,
  } = process.env;
  return pluginConfig.LoginButton({
    loginButtonLabel: pluginConfig.loginButtonLabel,
    codeChallenge: pkce.code_challenge,
    authorizeEndpoint: PAYLOAD_PUBLIC_ZITADEL_AUTHORIZE_ENDPOINT,
    redirectUri: PAYLOAD_PUBLIC_ZITADEL_REDIRECT_URI,
    clientID: PAYLOAD_PUBLIC_ZITADEL_CLIENT_ID,
    scope:
      PAYLOAD_PUBLIC_ZITADEL_SCOPES ||
      "openid email profile urn:zitadel:iam:user:metadata",
    codeChallengeMethod: "S256",
    state: btoa(
      JSON.stringify({
        codeVerifier: pkce.code_verifier,
      })
    ),
  });
};
const DEFAULT_LOGIN_BUTTON_LABEL = "login-with-zitadel";
export const ZitadelStrategyPlugin = async (
  pluginConfig?: ZitadelStrategyPluginConfig
) => {
  return async (incomingConfig: Config): Promise<Config> => {
    const collectionWithAuth = incomingConfig.collections?.find((c) => c.auth);
    if (!collectionWithAuth) {
      return incomingConfig;
    }
    if (!pluginConfig?.LoginButton) {
      return incomingConfig;
    }
    pluginConfig.loginButtonLabel =
      pluginConfig.loginButtonLabel ||
      process.env.PAYLOAD_PUBLIC_ZITADEL_LOGIN_BUTTON_LABEL ||
      DEFAULT_LOGIN_BUTTON_LABEL;
    const componentPlacement = pluginConfig.beforeOrAfterLogin || "after";
    const componentsType = `${componentPlacement}Login`;
    const baseLoginComponents =
      (incomingConfig.admin?.components || {})[componentsType] || [];
    const loginComponents = [].concat(
      baseLoginComponents,
      await generateComponentConfigForProviders(pluginConfig)
    );
    collectionWithAuth.fields.push({
      name: "sub",
      type: "text",
      admin: {
        readOnly: true,
        condition: (data) => {
          return data.sub;
        },
      },
    });
    collectionWithAuth.auth = {
      strategies: [
        {
          name: ZitadelStrategy.name,
          strategy: (ctx) => {
            return new ZitadelStrategy(ctx, "users");
          },
        },
      ],
    };
    collectionWithAuth.hooks = {
      ...collectionWithAuth.hooks,
      afterLogout: (collectionWithAuth.hooks?.afterLogout || []).concat([
        async ({ collection, res }) => {
          const cookieOptions = {
            domain: undefined,
            httpOnly: true,
            path: "/",
            sameSite: collection.auth.cookies.sameSite,
            secure: collection.auth.cookies.secure,
          };

          if (collection.auth.cookies.domain) {
            cookieOptions.domain = collection.auth.cookies.domain;
          }
          res.clearCookie("idp_token", cookieOptions);
        },
      ]),
    };
    const config: Config = {
      ...incomingConfig,
      i18n: {
        resources: {
          ...incomingConfig.i18n?.resources,
          en: {
            zitadel: {
              [DEFAULT_LOGIN_BUTTON_LABEL]: "Login with Zitadel",
            },
            ...incomingConfig.i18n?.resources?.en,
          },
          it: {
            zitadel: {
              [DEFAULT_LOGIN_BUTTON_LABEL]: "Effettua l'accesso con Zitadel",
            },
            ...incomingConfig.i18n?.resources?.it,
          },
        },
      },
      admin: {
        ...incomingConfig.admin,
        components: {
          ...incomingConfig.components,
          [componentsType]: loginComponents,
        },
      },
    };
    return config;
  };
};
