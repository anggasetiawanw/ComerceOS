import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class ProductStatusError extends Error {}

export type ProductStatusValue = 'active' | 'draft' | 'archived';

interface ProductStatusProps {
  value: ProductStatusValue;
}

const VALID_STATUSES: readonly ProductStatusValue[] = ['active', 'draft', 'archived'];

export class ProductStatus extends ValueObject<ProductStatusProps> {
  private constructor(props: ProductStatusProps) {
    super(props);
  }

  static create(value: string): Result<ProductStatus, ProductStatusError> {
    const match = VALID_STATUSES.find((status) => status === value);
    if (!match) {
      return Result.err(new ProductStatusError(`Invalid product status: "${value}"`));
    }
    return Result.ok(new ProductStatus({ value: match }));
  }

  static draft(): ProductStatus {
    return new ProductStatus({ value: 'draft' });
  }

  static active(): ProductStatus {
    return new ProductStatus({ value: 'active' });
  }

  static archived(): ProductStatus {
    return new ProductStatus({ value: 'archived' });
  }

  get value(): ProductStatusValue {
    return this.props.value;
  }

  isActive(): boolean {
    return this.props.value === 'active';
  }

  isDraft(): boolean {
    return this.props.value === 'draft';
  }

  isArchived(): boolean {
    return this.props.value === 'archived';
  }
}
