/**
 * 图片上传（2026-10-06 阶段3）
 *
 * 链路：uni.chooseImage 的 tempFilePath → fetch 成 blob → FileReader 转 dataURL
 * → POST /upload/image（base64 JSON，服务端剥 EXIF/GPS 后落盘）→ { id, url }。
 * 业务侧用 id 关联（records.photoIds / profiles.avatarPhotoId），用 assetUrl(url) 显示。
 */
import { BASE_URL } from './config';
import { api } from './api';

/** 后端返回相对路径（/uploads/...）→ 拼后端 origin；已是绝对地址/dataURL 原样返回 */
export function assetUrl(u?: string): string {
  if (!u) return '';
  if (/^(https?:|data:|blob:)/.test(u)) return u;
  const origin = BASE_URL.replace(/\/api\/?$/, '');
  return origin + (u.startsWith('/') ? u : '/' + u);
}

/** 本地临时文件 / 任意可 fetch 的 URL → dataURL（ai-parse 的 toBase64 同款实现） */
export function toBase64(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fetch(path)
      .then((r) => r.blob())
      .then((blob) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error('读取图片失败'));
        fr.readAsDataURL(blob);
      })
      .catch(reject);
  });
}

export interface UploadedPhoto {
  id: string;
  url: string;
  width?: number;
  height?: number;
}

/** 上传单图；离线/失败 reject（调用方自行决定是否静默降级） */
export async function uploadImage(filePath: string): Promise<UploadedPhoto> {
  const dataUrl = await toBase64(filePath);
  return api.post<UploadedPhoto>('/upload/image', { imageBase64: dataUrl });
}
