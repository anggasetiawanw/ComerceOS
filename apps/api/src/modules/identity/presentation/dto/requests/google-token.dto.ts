import { IsString, MinLength } from 'class-validator';

export class GoogleTokenDto {
  @IsString()
  @MinLength(1)
  idToken!: string;
}
