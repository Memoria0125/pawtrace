import { IsNumber, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateSpaceDto {
  @IsString()
  @Length(1, 30)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  description?: string;

  /** 列表卡片展示的短标签（顿号分隔，如"投喂 · TNR"） */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tags?: string;

  /** 所属小区（搜索 / 附近推荐用） */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  community?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
