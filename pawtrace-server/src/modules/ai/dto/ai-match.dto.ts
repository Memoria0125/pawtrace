import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * S6 建档页「AI 匹配」：本次拍摄的照片 vs 附近的（或我已建档 / 我在观测的）猫。
 * 与 /ai/recognize 同风格：photoKey 做同图缓存，imageBase64 直传（COS 直传上线后改传 URL）。
 */
export class AiMatchDto {
  /** 本次照片指纹（前端对图片内容做稳定 hash；同图命中缓存，不重复比对、不重复计费） */
  @IsString()
  photoKey!: string;

  /** 本次照片 base64（或 data: URL）——缺图时无法比对，直接返回未命中 */
  @IsOptional()
  @IsString()
  imageBase64?: string;

  /** 当前位置（街区级模糊 GCJ02，与档案坐标同系）。带了 → 候选池 = 附近半径内的猫 */
  @IsOptional()
  @IsNumber()
  lat?: number;

  /** 同上 */
  @IsOptional()
  @IsNumber()
  lng?: number;
}
