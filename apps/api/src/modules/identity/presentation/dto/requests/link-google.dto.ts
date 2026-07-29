import { IsString, MinLength } from 'class-validator';

export class LinkGoogleDto {
  @IsString()
  @MinLength(1)
  idToken!: string;
}
