import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/presentation/dto/pagination-query.dto';
import { ProductStatusValue } from '../../../domain/value-objects/product-status.vo';
import { ProductTypeValue } from '../../../domain/value-objects/product-type.vo';

export class ListProductsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['active', 'draft', 'archived'])
  status?: ProductStatusValue;

  @IsOptional()
  @IsIn(['digital', 'physical', 'service'])
  productType?: ProductTypeValue;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
