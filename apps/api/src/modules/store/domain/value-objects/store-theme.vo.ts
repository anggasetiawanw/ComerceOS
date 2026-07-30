import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class StoreThemeError extends Error {}

export type StoreThemeValue = Readonly<Record<string, string>>;

interface StoreThemeProps {
  value: StoreThemeValue | null;
}

const ALLOWED_THEME_KEYS = ['primaryColor', 'accentColor', 'layout'] as const;
type AllowedThemeKey = (typeof ALLOWED_THEME_KEYS)[number];
const THEME_VALUE_MAX_LENGTH = 32;

const isAllowedThemeKey = (key: string): key is AllowedThemeKey =>
  ALLOWED_THEME_KEYS.find((allowed) => allowed === key) !== undefined;

export class StoreTheme extends ValueObject<StoreThemeProps> {
  private constructor(props: StoreThemeProps) {
    super(props);
  }

  static empty(): StoreTheme {
    return new StoreTheme({ value: null });
  }

  static create(input: unknown): Result<StoreTheme, StoreThemeError> {
    if (input === null || input === undefined) {
      return Result.ok(StoreTheme.empty());
    }
    if (typeof input !== 'object' || Array.isArray(input)) {
      return Result.err(new StoreThemeError('Theme must be an object'));
    }

    const entries: Array<[string, unknown]> = Object.entries(input);
    const value: Record<string, string> = {};

    for (const [key, val] of entries) {
      if (!isAllowedThemeKey(key)) continue;
      if (typeof val !== 'string' || val.length === 0 || val.length > THEME_VALUE_MAX_LENGTH) {
        return Result.err(new StoreThemeError(`Invalid value for theme key "${key}"`));
      }
      value[key] = val;
    }

    const hasKeys = Object.keys(value).length > 0;
    return Result.ok(new StoreTheme({ value: hasKeys ? value : null }));
  }

  get value(): StoreThemeValue | null {
    return this.props.value;
  }

  toJSON(): StoreThemeValue | null {
    return this.props.value;
  }
}
