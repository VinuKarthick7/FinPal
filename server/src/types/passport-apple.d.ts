declare module 'passport-apple' {
  import { Strategy as PassportStrategy } from 'passport';

  interface AppleStrategyOptions {
    clientID: string;
    teamID: string;
    keyID: string;
    privateKeyString?: string;
    privateKeyLocation?: string;
    callbackURL: string;
    scope?: string[];
    passReqToCallback?: boolean;
  }

  type VerifyCallback = (
    err: Error | null,
    user?: any,
    info?: any
  ) => void;

  type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: VerifyCallback
  ) => void;

  type VerifyFunctionWithRequest = (
    req: any,
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: VerifyCallback
  ) => void;

  class Strategy extends PassportStrategy {
    constructor(
      options: AppleStrategyOptions,
      verify: VerifyFunction | VerifyFunctionWithRequest
    );
    name: string;
  }

  export = Strategy;
}
