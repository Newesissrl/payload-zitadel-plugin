import type { Express, Request, Response } from "express";
import { pino } from "pino";

export const ZitadelRoutes = (app: Express, loggerOptions?: any) => {
  const logger = pino({
    name: "zitadel-routes",
    level: process.env.PAYLOAD_LOG_LEVEL || "debug",
    ...loggerOptions,
  });
  const zitadelRedirectURL = new URL(
    process.env.PAYLOAD_PUBLIC_ZITADEL_REDIRECT_URI
  );
  app.get(zitadelRedirectURL.pathname, async (req: Request, res: Response) => {
    const { code, state, error, error_description } = req.query;
    if (!state) {
      res.status(400).send("Invalid 'state'");
      return;
    }
    if (error) {
      logger.error(`There was an error: ${error_description}`);
      res.status(500).send(`There was an error: ${error_description}`);
      return;
    }
    const decodedState = atob(state.toString());
    const stateJson = JSON.parse(decodedState);
    const data = {
      grant_type: "authorization_code",
      code: code.toString(),
      redirect_uri: zitadelRedirectURL.toString(),
      client_id: process.env.PAYLOAD_PUBLIC_ZITADEL_CLIENT_ID,
      code_verifier: stateJson.codeVerifier,
    };
    const formBody = [];
    for (const property in data) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(data[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    }
    logger.debug(
      `Fetching ${process.env.PAYLOAD_PUBLIC_ZITADEL_TOKEN_ENDPOINT}`
    );
    const response = await fetch(
      process.env.PAYLOAD_PUBLIC_ZITADEL_TOKEN_ENDPOINT,
      {
        method: "POST",
        body: formBody.join("&"),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const json = await response.json();
    if (json.error) {
      logger.error(`Error: ${json.error} (${json.error_description})`);
      res
        .sendStatus(400)
        .send(`Error: ${json.error} (${json.error_description})`);
      return;
    }
    const cookieName =
      process.env.PAYLOAD_PUBLIC_ZITADEL_COOKIE_NAME || "idp_token";
    logger.debug(
      `Setting "${cookieName}" cookie (maxAge: ${
        +json.expires_in * 1000
      }, domain: ${process.env.PAYLOAD_PUBLIC_COOKIE_DOMAIN}")`
    );
    res.cookie(cookieName, json.access_token, {
      maxAge: +json.expires_in * 1000,
      sameSite: (process.env.PAYLOAD_PUBLIC_ZITADEL_COOKIE_SAMESITE ||
        "lax") as any,
      httpOnly: true,
      secure: Boolean(
        process.env.PAYLOAD_PUBLIC_ZITADEL_COOKIE_SECURE || false
      ),
      domain: process.env.PAYLOAD_PUBLIC_COOKIE_DOMAIN,
    });
    res.redirect("/");
  });
};
