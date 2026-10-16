import { IsIn, IsNumber, IsOptional, IsString, Length } from 'class-validator';

/** S5 新增档案表单（含 S6 AI 识别回填后的字段） */
export class CreateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 20)
  name?: string;

  /**
   * 2026-10-07 产品定案「只做猫」：接口层收窄为仅接受 CAT（传 DOG 直接 400），
   * 与建档页一致。DB 枚举仍保留 CAT/DOG，便于后续扩展到其他流浪动物。
   */
  @IsOptional()
  @IsIn(['CAT'])
  animalType: 'CAT' = 'CAT';

  @IsOptional()
  @IsString()
  coatColor?: string; // 毛色

  @IsOptional()
  @IsString()
  bodySize?: string; // 体型

  @IsOptional()
  @IsString()
  specialMarks?: string; // 特殊标记（耳标/剪耳/伤疤/花纹）

  @IsOptional()
  @IsIn(['UNKNOWN', 'STERILIZED', 'NOT_STERILIZED'])
  sterilizationStatus?: 'UNKNOWN' | 'STERILIZED' | 'NOT_STERILIZED';

  @IsOptional()
  @IsIn(['HEALTHY', 'THIN', 'INJURED', 'SICK', 'DECEASED'])
  healthStatus?: 'HEALTHY' | 'THIN' | 'INJURED' | 'SICK' | 'DECEASED';

  /** 以下坐标均为客户端模糊化后的街区级坐标（PRD 6.4） */
  @IsOptional()
  @IsNumber()
  lastSeenLat?: number;

  @IsOptional()
  @IsNumber()
  lastSeenLng?: number;

  @IsOptional()
  @IsString()
  lastSeenDesc?: string;

  /** S3 建档照片（2026-10-06）：POST /upload/image 返回的 photo id */
  @IsOptional()
  @IsString()
  avatarPhotoId?: string;

  @IsOptional()
  @IsString()
  lastSeenAt?: string; // ISO 时间
}
