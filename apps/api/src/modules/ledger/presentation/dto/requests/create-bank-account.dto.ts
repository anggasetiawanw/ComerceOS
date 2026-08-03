import { IsBoolean, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @MaxLength(20)
  bankCode!: string;

  @IsString()
  @Length(4, 20)
  accountNumber!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  accountHolderName!: string;

  @IsOptional()
  @IsBoolean()
  makeDefault?: boolean;
}
