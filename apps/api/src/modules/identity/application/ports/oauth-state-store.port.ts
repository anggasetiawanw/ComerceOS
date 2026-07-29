export const OAUTH_STATE_STORE = Symbol('OAUTH_STATE_STORE');

export interface OAuthStateRecord {
  codeVerifier: string;
  redirectUri: string;
}

export interface OAuthStateStore {
  save(state: string, record: OAuthStateRecord): Promise<void>;
  /** Single-use: the record is deleted as part of the read. */
  consume(state: string): Promise<OAuthStateRecord | null>;
}
