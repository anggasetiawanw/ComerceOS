import { Injectable } from '@nestjs/common';
import { importPKCS8, importSPKI, SignJWT, jwtVerify, type KeyLike } from 'jose';
import { AppConfigService } from '../config/app-config.service';

const ISSUER = 'nagihin.id';
const AUDIENCE = 'nagihin-api';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: string;
  storeId?: string;
}

export interface VerifiedAccessToken extends AccessTokenClaims {
  iat: number;
  exp: number;
}

@Injectable()
export class AppJwtService {
  private privateKeyPromise: Promise<KeyLike> | null = null;
  private publicKeyPromise: Promise<KeyLike> | null = null;

  constructor(private readonly config: AppConfigService) {}

  private privateKey(): Promise<KeyLike> {
    if (!this.privateKeyPromise) {
      this.privateKeyPromise = importPKCS8(this.config.jwtPrivateKey, 'RS256');
    }
    return this.privateKeyPromise;
  }

  private publicKey(): Promise<KeyLike> {
    if (!this.publicKeyPromise) {
      this.publicKeyPromise = importSPKI(this.config.jwtPublicKey, 'RS256');
    }
    return this.publicKeyPromise;
  }

  async signAccessToken(claims: AccessTokenClaims): Promise<string> {
    const key = await this.privateKey();
    return new SignJWT({ email: claims.email, role: claims.role, storeId: claims.storeId })
      .setProtectedHeader({ alg: 'RS256', kid: this.config.jwtKid })
      .setSubject(claims.sub)
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime(`${this.config.jwtAccessTtlSeconds}s`)
      .sign(key);
  }

  async verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
    const key = await this.publicKey();
    const { payload } = await jwtVerify(token, key, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    const { sub, email, role, exp, iat, storeId } = payload;

    if (
      typeof sub !== 'string' ||
      typeof email !== 'string' ||
      typeof role !== 'string' ||
      typeof exp !== 'number' ||
      typeof iat !== 'number'
    ) {
      throw new Error('Access token payload is missing required claims');
    }

    return {
      sub,
      email,
      role,
      exp,
      iat,
      storeId: typeof storeId === 'string' ? storeId : undefined,
    };
  }
}
