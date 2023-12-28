import { User } from "payload/auth";

export declare type ZitadelStrategyPluginConfig = {
  loginButtonLabel?: string;
  beforeOrAfterLogin?: beforeOrAfterLoginType;
  LoginButton: any;
};

export declare type beforeOrAfterLoginType = "before" | "after";

export declare type ZitadelProviderConfig = {
  loginButtonLabel?: string;
  clientID?: string;
  clientSecret?: string;
  scope?: string;
};
export declare type LoginButtonProps = ZitadelProviderConfig & {
  codeChallenge: string;
  state?: string;
  redirectUri: string;
  authorizeEndpoint: string;
  codeChallengeMethod?: string;
};

export interface Auth0User extends User {
  picture: string;
}
export declare type PKCE = {
  code_verifier: string;
  code_challenge: string;
};
