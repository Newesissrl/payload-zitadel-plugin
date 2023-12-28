export declare type LoginButtonProps = {
  loginButtonLabel?: string;
  clientID?: string;
  clientSecret?: string;
  scope?: string;
  codeChallenge: string;
  state?: string;
  redirectUri: string;
  authorizeEndpoint: string;
  codeChallengeMethod?: string;
};
