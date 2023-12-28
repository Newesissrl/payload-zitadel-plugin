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

export declare type PKCE = {
  code_verifier: string;
  code_challenge: string;
};
