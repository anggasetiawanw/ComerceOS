import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class StoreProfileError extends Error {}

interface StoreProfileProps {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
}

export const DISPLAY_NAME_MAX_LENGTH = 100;
export const BIO_MAX_LENGTH = 500;

const isAbsoluteHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

export class StoreProfile extends ValueObject<StoreProfileProps> {
  private constructor(props: StoreProfileProps) {
    super(props);
  }

  static create(params: {
    displayName: string;
    bio?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
  }): Result<StoreProfile, StoreProfileError> {
    const displayName = params.displayName.trim();
    if (displayName.length < 1 || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
      return Result.err(
        new StoreProfileError(
          `Display name must be between 1 and ${DISPLAY_NAME_MAX_LENGTH} characters`,
        ),
      );
    }

    const trimmedBio = params.bio?.trim() ?? null;
    if (trimmedBio && trimmedBio.length > BIO_MAX_LENGTH) {
      return Result.err(new StoreProfileError(`Bio must be at most ${BIO_MAX_LENGTH} characters`));
    }
    const bio = trimmedBio && trimmedBio.length > 0 ? trimmedBio : null;

    const avatarUrl = params.avatarUrl ?? null;
    if (avatarUrl && !isAbsoluteHttpsUrl(avatarUrl)) {
      return Result.err(new StoreProfileError('Avatar URL must be an absolute https URL'));
    }

    const bannerUrl = params.bannerUrl ?? null;
    if (bannerUrl && !isAbsoluteHttpsUrl(bannerUrl)) {
      return Result.err(new StoreProfileError('Banner URL must be an absolute https URL'));
    }

    return Result.ok(new StoreProfile({ displayName, bio, avatarUrl, bannerUrl }));
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get bio(): string | null {
    return this.props.bio;
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }

  get bannerUrl(): string | null {
    return this.props.bannerUrl;
  }

  withAvatarUrl(avatarUrl: string | null): StoreProfile {
    return new StoreProfile({ ...this.props, avatarUrl });
  }

  withBannerUrl(bannerUrl: string | null): StoreProfile {
    return new StoreProfile({ ...this.props, bannerUrl });
  }
}
