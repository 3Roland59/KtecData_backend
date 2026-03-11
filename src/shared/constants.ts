export interface JwtConstants {
  secret: string;
  signOptions: {
    expiresIn: any;
  };
}

export interface AuthConfig {
  saltRounds: number;
  jwt: JwtConstants;
}



