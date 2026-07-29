export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface EmailSender {
  sendVerificationEmail(params: { to: string; name: string; token: string }): Promise<void>;
  sendPasswordResetEmail(params: { to: string; name: string; token: string }): Promise<void>;
}
