import { Config } from "payload/config";
import { ZitadelStrategyPluginConfig } from "../types";
import { generateCodeChallenge } from "../utils/pcke";
import { ZitadelStrategy } from "../strategies";
const generateComponentConfigForProviders = async (
  pluginConfig: ZitadelStrategyPluginConfig
) => {
  const pkce = await generateCodeChallenge();
  const { authorizeEndpoint, redirectUri, clientID, scope } = pluginConfig.auth;
  const orgIdScope = pluginConfig.auth.organizationId
    ? `urn:zitadel:iam:org:id:${pluginConfig.auth.organizationId}`
    : null;
  return pluginConfig.ui.LoginButton({
    loginButtonLabel: pluginConfig.ui.loginButtonLabel,
    codeChallenge: pkce.code_challenge,
    authorizeEndpoint,
    redirectUri,
    clientID,
    scope: [
      scope || "openid email profile urn:zitadel:iam:user:metadata",
      orgIdScope,
    ]
      .filter((s) => Boolean(s))
      .join(" "),
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
    if (
      !(pluginConfig.ui && pluginConfig.auth && pluginConfig?.ui.LoginButton)
    ) {
      return incomingConfig;
    }
    pluginConfig = {
      ...pluginConfig,
      ui: {
        ...pluginConfig.ui,
        loginButtonLabel:
          pluginConfig.ui.loginButtonLabel || DEFAULT_LOGIN_BUTTON_LABEL,
      },
    };

    const componentPlacement = pluginConfig.ui.beforeOrAfterLogin || "after";
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
            return new ZitadelStrategy(
              ctx,
              "users",
              pluginConfig.fieldsMappings,
              pluginConfig.loggerOptions
            );
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
