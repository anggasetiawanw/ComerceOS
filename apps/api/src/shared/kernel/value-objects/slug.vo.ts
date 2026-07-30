import { Result } from '../result';
import { ValueObject } from '../value-object.base';

export type SlugRejectionReason = 'format' | 'empty';

export class SlugError extends Error {
  constructor(
    message: string,
    readonly reason: SlugRejectionReason,
  ) {
    super(message);
  }
}

interface SlugProps {
  value: string;
}

const SLUG_MAX_LENGTH = 120;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const DIACRITIC_MARKS = /\p{Diacritic}/gu;

const slugify = (input: string): string =>
  input
    .normalize('NFKD')
    .replace(DIACRITIC_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');

export class Slug extends ValueObject<SlugProps> {
  private constructor(props: SlugProps) {
    super(props);
  }

  static create(value: string): Result<Slug, SlugError> {
    const normalized = value.trim().toLowerCase();

    if (normalized.length === 0) {
      return Result.err(new SlugError('Slug cannot be empty', 'empty'));
    }

    if (normalized.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(normalized)) {
      return Result.err(new SlugError(`Invalid slug format: "${value}"`, 'format'));
    }

    return Result.ok(new Slug({ value: normalized }));
  }

  static fromName(name: string): Result<Slug, SlugError> {
    return Slug.create(slugify(name));
  }

  withSuffix(suffix: number): Slug {
    const suffixed = `-${suffix}`;
    const base = this.props.value.slice(0, SLUG_MAX_LENGTH - suffixed.length);
    return new Slug({ value: `${base}${suffixed}` });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }

  toJSON(): string {
    return this.props.value;
  }
}
