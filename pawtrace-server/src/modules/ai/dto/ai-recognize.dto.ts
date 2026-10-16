import { IsOptional, IsString } from 'class-validator';

export class AiRecognizeDto {
  /** 识别对象指纹（同图缓存命中判断；前端对图片内容做稳定 hash） */
  @IsString()
  photoKey!: string;

  /** 图片 base64（或 data: URL）。阶段3 直传——COS 直传上线后改传 photoKey + COS URL */
  @IsOptional()
  @IsString()
  imageBase64?: string;
}
