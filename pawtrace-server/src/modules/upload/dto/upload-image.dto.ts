import { IsString, Length } from 'class-validator';

export class UploadImageDto {
  /** dataURL（data:image/jpeg;base64,xxx）或裸 base64 均可 */
  @IsString()
  @Length(16, 14_000_000) // 12mb 限制内的 base64 文本
  imageBase64!: string;
}
