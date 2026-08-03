export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');

export interface Recipient {
  email: string | null;
  phone: string | null;
}

export interface RenderedMessage {
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

export interface DeliveryResult {
  provider: string;
  success: boolean;
  error?: string;
}

// Email is guaranteed; WhatsApp (Sprint 9) is best-effort — no user-visible
// promise may depend solely on WA delivery (.docs/10-background-jobs.md §3,
// AD-10). NOTIFICATION_CHANNELS resolves to an array so the dispatcher can
// select every channel a template + recipient combination supports.
export interface NotificationChannel {
  readonly type: 'email' | 'whatsapp';
  readonly provider: string;
  send(recipient: Recipient, message: RenderedMessage): Promise<DeliveryResult>;
  supports(recipient: Recipient): boolean;
}
