# payload-zitadel-plugin

Extends `payloadcms` with [Zitadel](https://www.zitadel.com) integration

## Install

`yarn add @newesissrl/payload-zitadel-plugin`
`yarn add cookie-parser`

## Get Started



### server.ts
```js
const cookieParser = require("cookie-parser");
....
app.use(cookieParser());
```

### PAYLOAD_PUBLIC mandatory env variable

```sh
PAYLOAD_PUBLIC_ZITADEL_REDIRECT_URI=http://localhost:3030/zitadel/redirect
```

### PAYLOAD_PUBLIC suggested env variables

```sh
PAYLOAD_PUBLIC_ZITADEL_AUTHORIZE_ENDPOINT=http://localhost:8080/oauth/v2/authorize
PAYLOAD_PUBLIC_ZITADEL_USER_INFO=http://localhost:8080/oidc/v1/userinfo
PAYLOAD_PUBLIC_ZITADEL_CLIENT_ID= #the one you get from Zitadel app
```

### payload.config.ts

```js
import { ZitadelStrategyPlugin } from "@newesissrl/payload-zitadel-plugin/dist/plugins";
import { LoginButton } from "@newesissrl/payload-zitadel-plugin/dist/components/LoginButton";

const buildConfigAsync = async () => {
    const zitadelPlugin = await ZitadelStrategyPlugin({
      ui: {
        beforeOrAfterLogin? // where to place the button (before|after, default = "after")
        loginButtonLabel? // the label to use for the login button (default = "login-with-zitadel")
        LoginButton: LoginButton // the component to use for the login button
      },
      auth: {
        authorizeEndpoint: process.env.PAYLOAD_PUBLIC_ZITADEL_AUTHORIZE_ENDPOINT,
        clientID: process.env.PAYLOAD_PUBLIC_ZITADEL_CLIENT_ID,
        redirectUri: process.env.PAYLOAD_PUBLIC_ZITADEL_REDIRECT_URI,
      }
    });
    return buildConfig({
      .....
      plugins: [...., zitadelPlugin],
    })
}
```

## Notes

If you want to override the `LoginButton` component, your React component must accept those properties:

```js
loginButtonLabel,
codeChallenge,
authorizeEndpoint,
redirectUri,
clientID,
scope,
codeChallengeMethod,
state
```