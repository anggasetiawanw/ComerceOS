import { Injectable } from '@nestjs/common';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'node:crypto';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import {
  GoogleAuthorizationRequest,
  GoogleOAuthClient,
  GoogleProfile,
} from '../../application/ports/google-oauth-client.port';

@Injectable()
export class GoogleOAuthClientImpl implements GoogleOAuthClient {
  private readonly client: OAuth2Client;

  constructor(private readonly config: AppConfigService) {
    this.client = new OAuth2Client(this.config.googleClientId, this.config.googleClientSecret);
  }

  async createAuthorizationRequest(redirectUri: string): Promise<GoogleAuthorizationRequest> {
    const state = randomBytes(32).toString('base64url');
    const { codeVerifier, codeChallenge } = await this.client.generateCodeVerifierAsync();

    const url = this.client.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });

    return { state, codeVerifier, url };
  }

  async exchangeCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<GoogleProfile> {
    const { tokens } = await this.client.getToken({
      code: params.code,
      redirect_uri: params.redirectUri,
      codeVerifier: params.codeVerifier,
    });

    if (!tokens.id_token) {
      throw new Error('Google token exchange did not return an id_token');
    }

    return this.verifyIdToken(tokens.id_token);
  }

  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.config.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error('Google id_token payload is missing required claims');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified ?? false,
      name: payload.name ?? payload.email,
      avatarUrl: payload.picture ?? null,
    };
  }
}
