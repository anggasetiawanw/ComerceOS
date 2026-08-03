import { IsIn, IsOptional } from 'class-validator';
import { CursorQueryDto } from '../../../../../shared/presentation/dto/cursor-query.dto';

const WITHDRAWAL_STATUSES = ['requested', 'approved', 'paid', 'rejected'] as const;

export class AdminWithdrawalQueryDto extends CursorQueryDto {
  @IsOptional()
  @IsIn(WITHDRAWAL_STATUSES)
  status?: (typeof WITHDRAWAL_STATUSES)[number];
}
