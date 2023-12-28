import React from "react";
import { LoginButtonProps } from "../types";
import { useTranslation } from "react-i18next";

export const LoginButton = (props?: LoginButtonProps) => {
  return () => {
    const { t } = useTranslation("zitadel");
    const {
      loginButtonLabel,
      authorizeEndpoint,
      clientID,
      scope,
      codeChallenge,
      state,
      codeChallengeMethod,
      redirectUri,
    } = props || {};
    return (
      <a
        className="btn btn--style-secondary btn--icon-style-without-border btn--size-medium"
        style={{
          width: "100%",
          display: "block",
        }}
        href={`${authorizeEndpoint}?response_mode=query&response_type=code&client_id=${clientID}&scope=${scope}&code_challenge=${codeChallenge}&code_challenge_method=${codeChallengeMethod}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&state=${state}`}
      >
        {t(loginButtonLabel)}
      </a>
    );
  };
};
