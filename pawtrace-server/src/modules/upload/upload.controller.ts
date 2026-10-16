import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUid } from '../../common/current-uid.decorator';
import { ok } from '../../common/api';
import { UploadService } from './upload.service';
import { UploadImageDto } from './dto/upload-image.dto';

/**
 * 图片上传模块（2026-10-06 本地磁盘版，接替原阶段2 的 COS 预签名 TODO）
 *
 * POST /upload/image：base64 → 服务端 EXIF/GPS/XMP 剥离 → 落盘 → 登记 Photo
 * 返回 { id, url }；业务侧用 id 关联（records.photoIds / profiles.avatarPhotoId）。
 */
@Controller('upload')
export class UploadController {
  constructor(private readonly upload: UploadService) {}

  @Post('image')
  async image(@CurrentUid() uid: string, @Body() dto: UploadImageDto) {
    return ok(await this.upload.uploadImage(uid, dto.imageBase64), '上传成功');
  }
}
