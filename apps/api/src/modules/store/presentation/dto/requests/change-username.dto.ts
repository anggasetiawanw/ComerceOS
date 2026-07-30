import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangeUsernameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username!: string;
}
