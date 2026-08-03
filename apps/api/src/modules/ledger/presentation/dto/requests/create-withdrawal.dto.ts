import { IsInt, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @IsInt()
  @Min(1)
  amount!: number;
}
