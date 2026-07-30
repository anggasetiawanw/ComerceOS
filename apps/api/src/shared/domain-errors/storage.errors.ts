import { DomainError } from './domain.error';

export class StorageNotConfiguredError extends DomainError {
  readonly code = 'STORAGE.NOT_CONFIGURED';
  readonly status = 503;

  constructor() {
    super('Supabase Storage belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY kosong)');
  }
}

export class StorageUploadFailedError extends DomainError {
  readonly code = 'STORAGE.UPLOAD_FAILED';
  readonly status = 502;

  constructor(message: string) {
    super(message);
  }
}
