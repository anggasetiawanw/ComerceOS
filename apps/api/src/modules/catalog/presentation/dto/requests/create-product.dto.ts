import { IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const MONEY_PATTERN = /^\d+$/;

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @Matches(MONEY_PATTERN)
  price!: string;

  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  hpp?: string;

  @IsIn(['digital', 'physical', 'service'])
  productType!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}
