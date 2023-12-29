import { Express, Request, Response } from "express";

export const ZitadelRoutes = (app: Express) => {
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
    for (var property in data) {
      var encodedKey = encodeURIComponent(property);
      var encodedValue = encodeURIComponent(data[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    }
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
      res
        .sendStatus(400)
        .send(`Error: ${json.error} (${json.error_description})`);
      return;
    }
    res.cookie("idp_token", json.access_token, {
      maxAge: +json.expires_in * 1000,
      sameSite: "none",
      secure: true,
      domain: process.env.PAYLOAD_PUBLIC_COOKIE_DOMAIN,
    });
    res.redirect("/");
  });
};
