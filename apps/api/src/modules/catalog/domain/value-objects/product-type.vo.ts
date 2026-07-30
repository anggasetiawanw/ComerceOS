import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class ProductTypeError extends Error {}

export type ProductTypeValue = 'digital' | 'physical' | 'service';

interface ProductTypeProps {
  value: ProductTypeValue;
}

const VALID_TYPES: readonly ProductTypeValue[] = ['digital', 'physical', 'service'];

export class ProductType extends ValueObject<ProductTypeProps> {
  private constructor(props: ProductTypeProps) {
    super(props);
  }

  static create(value: string): Result<ProductType, ProductTypeError> {
    const match = VALID_TYPES.find((type) => type === value);
    if (!match) {
      return Result.err(new ProductTypeError(`Invalid product type: "${value}"`));
    }
    return Result.ok(new ProductType({ value: match }));
  }

  static digital(): ProductType {
    return new ProductType({ value: 'digital' });
  }

  static physical(): ProductType {
    return new ProductType({ value: 'physical' });
  }

  static service(): ProductType {
    return new ProductType({ value: 'service' });
  }

  get value(): ProductTypeValue {
    return this.props.value;
  }

  isDigital(): boolean {
    return this.props.value === 'digital';
  }

  isPhysical(): boolean {
    return this.props.value === 'physical';
  }

  isService(): boolean {
    return this.props.value === 'service';
  }
}
