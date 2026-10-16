import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryRecordsDto {
  @IsOptional()
  @IsString()
  profileId?: string;

  @IsOptional()
  @IsIn(['APPEARANCE', 'LOCATION', 'HEALTH', 'FEEDING', 'SEASON', 'DEVICE'])
  type?: 'APPEARANCE' | 'LOCATION' | 'HEALTH' | 'FEEDING' | 'SEASON' | 'DEVICE';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize: number = 20;
}
