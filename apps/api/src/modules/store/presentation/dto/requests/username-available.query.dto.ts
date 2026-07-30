import { IsString, MaxLength, MinLength } from 'class-validator';

export class UsernameAvailableQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  username!: string;
}
