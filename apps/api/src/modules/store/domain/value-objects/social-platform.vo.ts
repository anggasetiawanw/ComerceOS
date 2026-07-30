import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class SocialPlatformError extends Error {}

export type SocialPlatformValue = 'instagram' | 'tiktok' | 'whatsapp' | 'youtube' | 'other';

interface SocialPlatformProps {
  value: SocialPlatformValue;
}

const VALID_PLATFORMS: readonly SocialPlatformValue[] = [
  'instagram',
  'tiktok',
  'whatsapp',
  'youtube',
  'other',
];

export class SocialPlatform extends ValueObject<SocialPlatformProps> {
  private constructor(props: SocialPlatformProps) {
    super(props);
  }

  static create(value: string): Result<SocialPlatform, SocialPlatformError> {
    const match = VALID_PLATFORMS.find((platform) => platform === value);
    if (!match) {
      return Result.err(new SocialPlatformError(`Invalid social platform: "${value}"`));
    }
    return Result.ok(new SocialPlatform({ value: match }));
  }

  get value(): SocialPlatformValue {
    return this.props.value;
  }
}
