import {
  IsArray,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

/** S9 记录痕迹表单 */
export class CreateRecordDto {
  @IsOptional()
  @IsString()
  id?: string; // 离线草稿带本地生成的 id（cuid 由服务端生成，本地用 uuid）

  @IsIn(['APPEARANCE', 'LOCATION', 'HEALTH', 'FEEDING', 'SEASON', 'DEVICE'])
  type!: 'APPEARANCE' | 'LOCATION' | 'HEALTH' | 'FEEDING' | 'SEASON' | 'DEVICE';

  @IsOptional()
  @IsArray()
  @IsIn(['APPEARANCE', 'LOCATION', 'HEALTH', 'FEEDING', 'SEASON', 'DEVICE'], { each: true })
  subTypes?: ('APPEARANCE' | 'LOCATION' | 'HEALTH' | 'FEEDING' | 'SEASON' | 'DEVICE')[];
  // 附加类型标签（2026-10-10「一次打卡记多件事」）：胶囊多选时 = 除主 type 外的所选；
  // 不含主 type，服务端落库前去重并剔除与 type 重复项。

  @IsString()
  @Length(1, 500)
  content!: string;

  @IsOptional()
  @IsIn(['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'])
  season?: 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

  @IsOptional()
  @IsNumber()
  lat?: number; // 街区级模糊坐标

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  locDesc?: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string; // 观察时间，可回溯填写

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoIds?: string[]; // 已上传照片的 id 列表

  @IsString()
  profileId!: string;
}
