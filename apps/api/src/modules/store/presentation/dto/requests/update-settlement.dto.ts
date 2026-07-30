import { IsIn } from 'class-validator';

export class UpdateSettlementDto {
  @IsIn(['auto', 'manual'])
  mode!: 'auto' | 'manual';
}
