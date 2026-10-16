/**
 * 分享档案卡 —— 把 S4 个体档案渲染成一张可带走的手账风卡片（2026-10-08 晚新增）
 *
 * 背景：档案页底部第三个按钮原为「生成壁纸」，点了只弹一句 toast（`onWallpaper`），
 *      对「观测手账」没有任何真实出口——壁纸和记录 / 守护链路无关，也落不了地。
 *      用户要求换掉 → 改为「分享档案卡」：把这只猫的档案导出成一张图，能存下来、
 *      能复制文案发到群里，让更多人认识并留意它。
 *
 * 两个平台两条出口，绘制逻辑共用同一份 drawShareCard：
 *   H5        ：离屏 document.createElement('canvas') → toDataURL → 浏览器下载
 *   微信小程序 ：页面内 <canvas type="2d"> 节点 → uni.canvasToTempFilePath → 保存到相册
 * 卡片画布 750×1120 px（= 375×560 逻辑尺寸的 2 倍，与交付图口径一致）。
 *
 * 配色全部取自 uni.scss 令牌（米底 / 纸白 / 苔绿 / 墨绿 / 芥末），不引新色。
 */

export const CARD_W = 750;
export const CARD_H = 1120;

/** 无衬线字族：canvas 环境里不能用 rpx / 变量，只能写死平台字体栈 */
const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Heiti SC", sans-serif';

export interface ShareCardRow {
  k: string;
  v: string;
}

export interface ShareCardData {
  name: string;
  /** 「档案ID：PT-20261005-E04·猫」 */
  idText: string;
  /** 状态胶囊（已绝育 / 健康…），最多画 3 个 */
  pills: string[];
  /** 属性行：毛色 / 体型 / 特征 / 出没点位，最多画 4 行 */
  rows: ShareCardRow[];
  slogan: string;
  dateText: string;
  avatarUrl?: string;
}

/* ------------------------------------------------------------------ *
 * 绘制原语
 * ------------------------------------------------------------------ */

/** 圆角矩形路径（canvas 原生 roundRect 在小程序端不一定可用，手绘最稳） */
function roundRectPath(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function fillRound(ctx: any, x: number, y: number, w: number, h: number, r: number, color: string) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

/** 胶囊渐变档（苔绿 → 芥末 → 米底描边），按顺序取色 */
const PILL_TONES = [
  { bg: '#8fa08b', fg: '#faf7f1' },
  { bg: '#d9c389', fg: '#5f4f26' },
  { bg: '#f0ebdf', fg: '#6e6f58' },
];

/** 一排居中排布的胶囊，返回实际占用宽度 */
function drawPills(ctx: any, pills: string[], cx: number, cy: number) {
  if (!pills.length) return;
  const fs = 24;
  const h = 52;
  const padX = 26;
  const gap = 16;
  const widths = pills.map((t) => {
    ctx.font = `600 ${fs}px ${FONT}`;
    return ctx.measureText(t).width + padX * 2;
  });
  const total = widths.reduce((a, b) => a + b, 0) + gap * (pills.length - 1);
  let x = cx - total / 2;
  pills.forEach((t, i) => {
    const tone = PILL_TONES[Math.min(i, PILL_TONES.length - 1)];
    fillRound(ctx, x, cy - h / 2, widths[i], h, h / 2, tone.bg);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = tone.fg;
    ctx.font = `600 ${fs}px ${FONT}`;
    ctx.fillText(t, x + widths[i] / 2, cy);
    x += widths[i] + gap;
  });
}

/** 猫爪印（无档案照时的占位）：一个掌垫 + 四趾，比「名字首字」更稳
 *  —— 首字占位在某些字上会闹笑话（「三」渲染出来就是三条横杠，像菜单图标）。 */
function drawPaw(ctx: any, cx: number, cy: number, s: number, color: string) {
  ctx.fillStyle = color;
  // 掌垫
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.24, s * 0.4, s * 0.33, 0, 0, Math.PI * 2);
  ctx.fill();
  // 四趾（外二内二，内侧两趾略高）
  const toes: [number, number, number][] = [
    [-0.46, -0.2, 0.155],
    [-0.16, -0.42, 0.165],
    [0.16, -0.42, 0.165],
    [0.46, -0.2, 0.155],
  ];
  toes.forEach(([dx, dy, r]) => {
    ctx.beginPath();
    ctx.ellipse(cx + dx * s, cy + dy * s, s * r, s * r * 1.12, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ------------------------------------------------------------------ *
 * 卡片主体
 * ------------------------------------------------------------------ */

/**
 * 把档案画到任意 2d context 上。
 * @param avatar 已加载完成的图片对象（H5: HTMLImageElement / 小程序: 本地临时路径）。
 *               传空则退化画「名字首字」占位框（设计稿里头像本来也是文字占位）。
 */
export function drawShareCard(ctx: any, d: ShareCardData, avatar?: any) {
  ctx.clearRect(0, 0, CARD_W, CARD_H);

  // —— 米底 + 纸白卡 ——
  ctx.fillStyle = '#f0ebdf';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  fillRound(ctx, 40, 40, 670, 1040, 48, '#faf7f1');

  // —— 顶部芥末胶带（压在卡顶边缘，手账感） ——
  fillRound(ctx, 215, 26, 320, 56, 8, '#dfcf9f');

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a8a7e';
  ctx.font = `27px ${FONT}`;
  ctx.fillText('PawTrace 爪迹 · 猫档案', CARD_W / 2, 150);

  // —— 头像框（240 方 / 圆角 44 / 淡紫底） ——
  const ax = 255;
  const ay = 200;
  const as = 240;
  fillRound(ctx, ax, ay, as, as, 44, '#e6e7eb');
  if (avatar) {
    ctx.save();
    roundRectPath(ctx, ax, ay, as, as, 44);
    ctx.clip();
    ctx.drawImage(avatar, ax, ay, as, as);
    ctx.restore();
  } else {
    drawPaw(ctx, ax + as / 2, ay + as / 2, 110, '#b9bdc7');
  }

  // —— 名字 / 档案ID ——
  ctx.fillStyle = '#3c4036';
  ctx.font = `bold 62px ${FONT}`;
  ctx.fillText(d.name, CARD_W / 2, 508);
  ctx.fillStyle = '#8a8a7e';
  ctx.font = `25px ${FONT}`;
  ctx.fillText(d.idText, CARD_W / 2, 558);

  // —— 状态胶囊 ——
  drawPills(ctx, d.pills.slice(0, 3), CARD_W / 2, 618);

  // —— 虚线分隔（手账口径：虚线而不是实线） ——
  ctx.save();
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = '#e2ded0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(110, 660);
  ctx.lineTo(640, 660);
  ctx.stroke();
  ctx.restore();

  // —— 属性区：手账风「键上值下」网格 ——
  // ⚠️ 曾用过「左灰键 / 右墨值 + 超长自动缩字号 + 右对齐」，结果阿黑那种长值
  //    （特征「尾巴尖白一撮，怕人但每晚准时来吃」17 字、点位「翰墨香林苑与浪漫和山花园之间小路」）
  //    缩到最小字号仍压住左侧键名 —— measureText 与实际光栅宽度有偏差，右对齐会向左溢出。
  //    改成键上值下后，每格宽度固定，长值只需在自己那格内缩字，永远不会撞到别的元素。
  //    短值（能塞进半栏）两两并排，长值独占一行 —— 阿黑 3 行、年糕/演示态 2 行。
  const COL_L = 112;
  const COL_R = 378;
  const HALF = 240; // 半栏可用宽（两列并排时单列上限，留出列间距）
  const FULL = 526; // 整行可用宽（112 → 638）
  const ROW_H = 92; // 每格高：键（25px）+ 值（30px）

  const kv = (k: string, v: string, x: number, y: number, fs: number) => {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8a8a7e';
    ctx.font = `25px ${FONT}`;
    ctx.fillText(k, x, y);
    ctx.fillStyle = '#3c4036';
    ctx.font = `600 ${fs}px ${FONT}`;
    ctx.fillText(v, x, y + 38);
  };

  const measure = (t: string, fs: number) => {
    ctx.font = `600 ${fs}px ${FONT}`;
    return ctx.measureText(t).width;
  };
  const fitFs = (t: string, max: number) => {
    let fs = 30;
    while (measure(t, fs) > max && fs > 22) fs -= 1;
    return fs;
  };

  // 先量一遍要占几行（短值并排 / 长值独占，规则与下面绘制一致），
  // 再把整块在 720~970 区间垂直居中 —— 2 行（年糕）与 3 行（阿黑）上下留白才均衡。
  let used = 0;
  for (let i = 0; i < d.rows.length && i < 4; i++) {
    const next = d.rows[i + 1];
    if (measure(d.rows[i].v, 30) <= HALF && next && measure(next.v, 30) <= HALF) i += 1;
    used += 1;
  }
  const visualH = (used - 1) * ROW_H + 60;
  let y = 720 + Math.max(0, Math.round((250 - visualH) / 2));

  for (let i = 0; i < d.rows.length && i < 4; i++) {
    const r = d.rows[i];
    const next = d.rows[i + 1];
    const w = measure(r.v, 30);
    const wNext = next ? measure(next.v, 30) : Infinity;

    // 两个短值 → 并排一行
    if (w <= HALF && wNext <= HALF) {
      kv(r.k, r.v, COL_L, y, fitFs(r.v, HALF));
      kv(next.k, next.v, COL_R, y, fitFs(next.v, HALF));
      i += 1;
    } else {
      // 长值 → 独占一行，整行宽内缩字
      kv(r.k, r.v, COL_L, y, fitFs(r.v, FULL));
    }
    y += ROW_H;
    if (y + 38 > 990) break; // 下一格的「值」基线会越界 → 不再画（阿黑 3 行正好用满，第 4 行被舍弃）
  }

  // —— 底部署名 ——
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a8a7e';
  ctx.font = `25px ${FONT}`;
  ctx.fillText(d.slogan, CARD_W / 2, 1008);
  ctx.fillStyle = '#a29e8f';
  ctx.font = `22px ${FONT}`;
  ctx.fillText(d.dateText, CARD_W / 2, 1046);
}

/* ------------------------------------------------------------------ *
 * 文案（复制到剪贴板用）
 * ------------------------------------------------------------------ */

export function buildShareText(d: ShareCardData): string {
  const lines: string[] = [`【PawTrace 爪迹 · 猫档案】${d.name}`, d.idText];
  if (d.pills.length) lines.push(d.pills.join(' · '));
  d.rows.forEach((r) => lines.push(`${r.k}：${r.v}`));
  lines.push('', `${d.slogan}。`);
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * H5 出口：离屏 canvas → dataURL（供 <image> 预览 + <a download> 下载）
 * ------------------------------------------------------------------ */

// #ifdef H5
/** 加载头像（crossOrigin=anonymous；后端 /uploads 带 ACAO 头，画布不会被污染） */
function loadAvatarH5(url?: string): Promise<any> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function exportShareCardH5(d: ShareCardData): Promise<string> {
  const avatar = await loadAvatarH5(d.avatarUrl);
  const c = document.createElement('canvas');
  c.width = CARD_W;
  c.height = CARD_H;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  drawShareCard(ctx, d, avatar);
  try {
    return c.toDataURL('image/png');
  } catch {
    // 极端情况下画布被跨域图污染：去掉头像重画一次，保证导出不失败
    drawShareCard(ctx, d, null);
    try {
      return c.toDataURL('image/png');
    } catch {
      return '';
    }
  }
}
// #endif
