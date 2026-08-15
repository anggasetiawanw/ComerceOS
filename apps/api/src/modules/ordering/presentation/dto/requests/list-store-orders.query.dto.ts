import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { CursorQueryDto } from '../../../../../shared/presentation/dto/cursor-query.dto';

const ORDER_STATUS_VALUES = ['pending_payment', 'paid', 'holding', 'released', 'disputed', 'refunded', 'cancelled', 'expired'];
const ORDER_SOURCE_VALUES = ['self_checkout', 'manual'];

export class ListStoreOrdersQueryDto extends CursorQueryDto {
  @IsOptional()
  @IsIn(ORDER_STATUS_VALUES)
  status?: string;

  @IsOptional()
  @IsIn(ORDER_SOURCE_VALUES)
  source?: string;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @IsOptional()
  @IsString()
  buyerSearch?: string;
}
