import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const INQUIRY_STATUS_VALUES = ['open', 'converted', 'lost'];

export class ListInquiriesQueryDto {
  @IsOptional()
  @IsIn(INQUIRY_STATUS_VALUES)
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
