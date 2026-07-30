import { Result } from '../../../../shared/kernel/result';
import { ValueObject } from '../../../../shared/kernel/value-object.base';

export class ProductImagesError extends Error {}

export interface ProductImage {
  id: string;
  path: string;
  url: string;
}

interface ProductImagesProps {
  items: ProductImage[];
}

const isValidUrl = (value: string): boolean => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};

const isProductImage = (value: unknown): value is ProductImage => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || !('path' in value) || !('url' in value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.path === 'string' &&
    value.path.length > 0 &&
    typeof value.url === 'string' &&
    isValidUrl(value.url)
  );
};

export class ProductImages extends ValueObject<ProductImagesProps> {
  private constructor(props: ProductImagesProps) {
    super(props);
  }

  static empty(): ProductImages {
    return new ProductImages({ items: [] });
  }

  static create(input: unknown): Result<ProductImages, ProductImagesError> {
    if (!Array.isArray(input)) {
      return Result.err(new ProductImagesError('Product images must be an array'));
    }
    if (!input.every(isProductImage)) {
      return Result.err(new ProductImagesError('Product images contain a malformed entry'));
    }
    return Result.ok(new ProductImages({ items: input }));
  }

  get items(): readonly ProductImage[] {
    return this.props.items;
  }

  get count(): number {
    return this.props.items.length;
  }

  get primaryUrl(): string | null {
    return this.props.items[0]?.url ?? null;
  }

  has(id: string): boolean {
    return this.props.items.some((image) => image.id === id);
  }

  withAdded(image: ProductImage): ProductImages {
    return new ProductImages({ items: [...this.props.items, image] });
  }

  withRemoved(id: string): ProductImages {
    return new ProductImages({ items: this.props.items.filter((image) => image.id !== id) });
  }

  toJSON(): Record<string, string>[] {
    return this.props.items.map((image) => ({ id: image.id, path: image.path, url: image.url }));
  }
}
