export type EntraConfig = {
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
};

export type AuthConfig = {
  authSecret: string;
  basicAuth: {
    username: string;
    password: string;
  };
  oAuth: {
    github: {
      clientId?: string;
      clientSecret?: string;
    };
  };
  entra: EntraConfig;
};
