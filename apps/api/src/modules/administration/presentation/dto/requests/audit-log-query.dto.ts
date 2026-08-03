import { IsOptional, IsString } from 'class-validator';
import { CursorQueryDto } from '../../../../../shared/presentation/dto/cursor-query.dto';

export class AuditLogQueryDto extends CursorQueryDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  action?: string;
}
