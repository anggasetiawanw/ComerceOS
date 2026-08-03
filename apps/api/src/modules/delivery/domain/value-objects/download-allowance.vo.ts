import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class DownloadAllowanceError extends Error {}

interface DownloadAllowanceProps {
  count: number;
  max: number;
}

export class DownloadAllowance extends ValueObject<DownloadAllowanceProps> {
  private constructor(props: DownloadAllowanceProps) {
    super(props);
  }

  static create(count: number, max: number): Result<DownloadAllowance, DownloadAllowanceError> {
    if (!Number.isInteger(max) || max <= 0) {
      return Result.err(new DownloadAllowanceError(`Max downloads must be a positive integer, got ${max}`));
    }
    if (!Number.isInteger(count) || count < 0 || count > max) {
      return Result.err(new DownloadAllowanceError(`Download count must be between 0 and ${max}, got ${count}`));
    }
    return Result.ok(new DownloadAllowance({ count, max }));
  }

  get count(): number {
    return this.props.count;
  }

  get max(): number {
    return this.props.max;
  }

  hasRemaining(): boolean {
    return this.props.count < this.props.max;
  }

  increment(): Result<DownloadAllowance, DownloadAllowanceError> {
    if (!this.hasRemaining()) {
      return Result.err(new DownloadAllowanceError('Download limit reached'));
    }
    return Result.ok(new DownloadAllowance({ count: this.props.count + 1, max: this.props.max }));
  }
}
