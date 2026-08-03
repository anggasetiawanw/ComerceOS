import { IsIn, IsOptional, IsString } from 'class-validator';
import { CursorQueryDto } from '../../../../../shared/presentation/dto/cursor-query.dto';
import { StoreBuyerSort } from '../../../domain/repositories/store-buyer-read.repository';

const SORT_VALUES: readonly StoreBuyerSort[] = ['recent', 'total_spent', 'total_orders'];

export class ListBuyersQueryDto extends CursorQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(SORT_VALUES)
  sort: StoreBuyerSort = 'recent';
}
