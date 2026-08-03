import { IsIn, IsOptional, IsString } from 'class-validator';

export class SimulateWebhookDto {
  @IsString()
  orderNumber!: string;

  @IsOptional()
  @IsIn(['settlement', 'pending', 'deny', 'cancel', 'expire'])
  transactionStatus?: string;

  @IsOptional()
  @IsIn(['accept', 'challenge', 'deny'])
  fraudStatus?: string;
}
