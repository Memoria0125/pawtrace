import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { stripImageMeta } from './strip-meta';

/**
 * 图片上传（2026-10-06 本地磁盘版）
 *
 * 设计：POST /upload/image 收 base64 JSON（与 /ai/recognize 同风格，走全局 12mb body 限制）
 * → 服务端元数据剥离（EXIF/GPS/XMP/IPTC，见 strip-meta.ts，防御性二次处理）
 * → 落盘 uploads/photos/{yyyyMM}/{uid8}-{rand}.{ext} → 登记 Photo 表。
 *
 * Photo.url 存相对路径（/uploads/...），前端用 assetUrl() 拼后端 origin。
 * 阶段4 若接腾讯云 COS：本方法内换 cos-nodejs-sdk-v5 putObject，字段语义不变（cosKey 即对象键）。
 */
@Injectable()
export class UploadService {
  /** 上传根目录（start:dev 的 cwd = pawtrace-server） */
  private readonly root = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

  /** 单图上限：压缩后 ≤ 1MB（PRD 性能指标 500KB 的余量） */
  private readonly MAX_BYTES = 1024 * 1024;

  constructor(private readonly prisma: PrismaService) {}

  async uploadImage(uid: string, imageBase64: string) {
    const b64 = imageBase64.includes(',') ? imageBase64.split(',').pop()! : imageBase64;
    const raw = Buffer.from(b64, 'base64');
    if (!raw.length) throw new BadRequestException('图片数据为空');

    // 元数据剥离（非 JPEG/PNG 抛错 → 统一转 400，不给前端糊 500）
    let meta;
    try {
      meta = stripImageMeta(raw);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    if (meta.buffer.length > this.MAX_BYTES) {
      throw new BadRequestException('图片超过 1MB，请压缩后重试');
    }

    const ext = meta.mime === 'image/png' ? 'png' : 'jpg';
    const ym = new Date().toISOString().slice(0, 7).replace('-', '');
    const key = `photos/${ym}/${uid.slice(0, 8)}-${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}.${ext}`;

    const dir = join(this.root, 'photos', ym);
    await mkdir(dir, { recursive: true });
    await writeFile(join(this.root, key), meta.buffer);

    return this.prisma.photo.create({
      data: {
        url: `/uploads/${key}`,
        cosKey: key, // 本地版 = 相对路径；COS 版 = 对象键，语义兼容
        size: meta.buffer.length,
        width: meta.width,
        height: meta.height,
      },
      select: { id: true, url: true, width: true, height: true },
    });
  }
}
