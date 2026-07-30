import { Entity } from '../../../../shared/kernel/entity.base';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Result } from '../../../../shared/kernel/result';
import { SocialPlatform } from '../value-objects/social-platform.vo';

export class SocialLinkError extends Error {}

export interface SocialLinkProps {
  storeId: string;
  platform: SocialPlatform;
  url: string;
  position: number;
}

const isValidHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidWhatsappUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'wa.me' || url.hostname === 'api.whatsapp.com');
  } catch {
    return false;
  }
};

const validateUrl = (platform: SocialPlatform, url: string): SocialLinkError | null => {
  if (platform.value === 'whatsapp') {
    return isValidWhatsappUrl(url)
      ? null
      : new SocialLinkError(
          'WhatsApp links must be an https://wa.me/ or https://api.whatsapp.com/ URL',
        );
  }
  return isValidHttpsUrl(url) ? null : new SocialLinkError('Social link URL must be an absolute https URL');
};

export class SocialLink extends Entity<SocialLinkProps> {
  private constructor(props: SocialLinkProps, id?: UniqueId) {
    super(props, id);
  }

  static create(params: {
    storeId: string;
    platform: SocialPlatform;
    url: string;
    position: number;
  }): Result<SocialLink, SocialLinkError> {
    const url = params.url.trim();
    const urlError = validateUrl(params.platform, url);
    if (urlError) return Result.err(urlError);

    if (params.position < 0) {
      return Result.err(new SocialLinkError('Position cannot be negative'));
    }

    return Result.ok(
      new SocialLink({ storeId: params.storeId, platform: params.platform, url, position: params.position }),
    );
  }

  static reconstitute(props: SocialLinkProps, id: UniqueId): SocialLink {
    return new SocialLink(props, id);
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get platform(): SocialPlatform {
    return this.props.platform;
  }

  get url(): string {
    return this.props.url;
  }

  get position(): number {
    return this.props.position;
  }

  update(params: { platform?: SocialPlatform; url?: string }): Result<void, SocialLinkError> {
    const platform = params.platform ?? this.props.platform;
    const url = (params.url ?? this.props.url).trim();
    const urlError = validateUrl(platform, url);
    if (urlError) return Result.err(urlError);

    this.props.platform = platform;
    this.props.url = url;
    return Result.ok(undefined);
  }

  changePosition(position: number): void {
    this.props.position = position;
  }
}
