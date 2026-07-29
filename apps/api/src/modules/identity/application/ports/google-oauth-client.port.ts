export const GOOGLE_OAUTH_CLIENT = Symbol('GOOGLE_OAUTH_CLIENT');

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl: string | null;
}

export interface GoogleAuthorizationRequest {
  state: string;
  codeVerifier: string;
  url: string;
}

export interface GoogleOAuthClient {
  createAuthorizationRequest(redirectUri: string): Promise<GoogleAuthorizationRequest>;
  exchangeCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<GoogleProfile>;
  verifyIdToken(idToken: string): Promise<GoogleProfile>;
}
