/**
 * 图片元数据剥离（PRD 6.4 位置隐私：拍猫不暴露拍摄者）
 *
 * 纯 Buffer 实现，零第三方依赖：
 * - JPEG：逐标记段扫描，丢弃 APP1（EXIF/XMP，含 GPS）、APP13（Photoshop IPTC）、COM（注释），
 *   保留 APP0（JFIF）/ APP2（ICC 色彩配置）与全部图像数据段；
 * - PNG：逐 chunk 扫描，丢弃 tEXt / zTXt / iTXt（文本元数据）与 eXIf / tIME；
 * - 解析失败（非标准结构）一律原样返回，绝不因剥离而损坏图片。
 *
 * 尺寸解析（顺手返回，供 Photo 表 width/height）：
 * - JPEG：SOF0/1/2 段（0xC0–0xCF，除 C4/C8/CC）内的精度后两个 uint16；
 * - PNG：IHDR 段固定布局。
 */

export interface ImageMeta {
  buffer: Buffer;
  width?: number;
  height?: number;
  mime: 'image/jpeg' | 'image/png';
}

export function stripImageMeta(input: Buffer): ImageMeta {
  if (input.length > 4 && input[0] === 0xff && input[1] === 0xd8) {
    return stripJpeg(input);
  }
  if (
    input.length > 8 &&
    input[0] === 0x89 && input[1] === 0x50 && input[2] === 0x4e && input[3] === 0x47
  ) {
    return stripPng(input);
  }
  throw new Error('仅支持 JPEG / PNG 图片');
}

// ---------- JPEG ----------

function stripJpeg(buf: Buffer): ImageMeta {
  const chunks: Buffer[] = [buf.subarray(0, 2)]; // SOI
  let width: number | undefined;
  let height: number | undefined;
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) return { buffer: buf, width, height, mime: 'image/jpeg' }; // 结构异常：原样返回
    const marker = buf[i + 1];
    // 无长度标记（RST/SOI/EOI/TEM）
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (marker === 0xd9) break; // EOI
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) {
      return { buffer: buf, width, height, mime: 'image/jpeg' };
    }
    const seg = buf.subarray(i, i + 2 + len);
    const isApp = marker >= 0xe0 && marker <= 0xef;
    // 剥离：APP1（EXIF/XMP 含 GPS）、APP13（IPTC）、COM（注释）；保留 APP0/APP2 与其余段
    const drop = (marker === 0xe1 || marker === 0xed || marker === 0xfe);
    if (!drop) {
      chunks.push(seg);
      // SOF0/1/2/3/5/6/7/9/10/11/13/14/15：解析尺寸
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        height = seg.readUInt16BE(5);
        width = seg.readUInt16BE(7);
      }
    }
    i += 2 + len;
    if (marker === 0xda) {
      // SOS：熵编码数据原样跟随
      chunks.push(buf.subarray(i));
      i = buf.length;
      break;
    }
  }
  return { buffer: Buffer.concat(chunks), width, height, mime: 'image/jpeg' };
}

// ---------- PNG ----------

const PNG_DROP_CHUNKS = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

function stripPng(buf: Buffer): ImageMeta {
  const sig = buf.subarray(0, 8);
  const chunks: Buffer[] = [sig];
  let width: number | undefined;
  let height: number | undefined;
  let i = 8;
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    if (i + 12 + len > buf.length) return { buffer: buf, width, height, mime: 'image/png' };
    if (type === 'IHDR') {
      width = buf.readUInt32BE(i + 8);
      height = buf.readUInt32BE(i + 12);
    }
    if (!PNG_DROP_CHUNKS.has(type)) chunks.push(buf.subarray(i, i + 12 + len));
    i += 12 + len;
    if (type === 'IEND') break;
  }
  return { buffer: Buffer.concat(chunks), width, height, mime: 'image/png' };
}
