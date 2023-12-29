export declare type ZitadelStrategyPluginConfig = {
  ui: UIPluginConfig;
  auth: AuthPluginConfig;
  fieldsMappings: FieldMapping[];
  loggerOptions?: any;
};

export type AuthPluginConfig = {
  authorizeEndpoint: string;
  redirectUri: string;
  clientID: string;
  scope?: string;
  organizationId?: string;
};

export type UIPluginConfig = {
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

export declare type FieldMapping = {
  from: string;
  to: string;
  decode?: boolean;
};
