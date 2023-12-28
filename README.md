# payload-zitadel-plugin

Extends `payloadcms` with [Zitadel](https://www.zitadel.com) integration

## Install

`yarn add @newesissrl/payload-zitadel-plugin`
`yarn add cookie-parser`

## Get Started


### PAYLOAD_PUBLIC env variables

```sh
PAYLOAD_PUBLIC_SERVER_BASE_URL=http://localhost:3030
PAYLOAD_PUBLIC_ZITADEL_AUTHORIZE_ENDPOINT=http://localhost:8080/oauth/v2/authorize
PAYLOAD_PUBLIC_ZITADEL_TOKEN_ENDPOINT=http://localhost:8080/oauth/v2/token
PAYLOAD_PUBLIC_ZITADEL_REDIRECT_URI=http://localhost:3030/zitadel/redirect
PAYLOAD_PUBLIC_ZITADEL_USER_INFO=http://localhost:8080/oidc/v1/userinfo
PAYLOAD_PUBLIC_ZITADEL_CLIENT_ID= #the one you get from Zitadel app
```

### server.ts
```js
const cookieParser = require("cookie-parser");
....
app.use(cookieParser());
```

### payload.config.ts

```js
import { ZitadelStrategyPlugin } from "@newesissrl/payload-zitadel-plugin/dist/plugins";

const buildConfigAsync = async () => {
    const zitadelPlugin = await ZitadelStrategyPlugin({
      beforeOrAfterLogin? // where to place the button (before|after, default = "after")
      loginButtonLabel? // the label to use for the login button (default = "login-with-zitadel")
    });
    return buildConfig({
      .....
      plugins: [...., zitadelPlugin],
    })
}

```