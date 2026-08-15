import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEmail, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class ManualOrderItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  @IsString()
  priceOverride?: string;
}

export class CreateManualOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ManualOrderItemDto)
  items!: ManualOrderItemDto[];

  @IsEmail()
  buyerEmail!: string;

  @IsString()
  @MinLength(1)
  buyerName!: string;

  @IsOptional()
  @IsString()
  buyerPhone?: string | null;
}
