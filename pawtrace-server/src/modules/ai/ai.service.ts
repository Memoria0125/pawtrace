import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';

/** 演示兜底结果（无 AI_API_KEY / 调用失败时返回，供前端联调与离线撑版） */
const DEMO_RESULT = {
  species: '猫',
  coat: '三花',
  features: '右耳缺角 · 佩戴项圈',
  body: '体型偏瘦，精神尚可',
  draft: '三花母猫，右耳缺角（疑似 TNR 标记），体型偏瘦但毛色尚可，主动靠近觅食，精神状态良好。',
  confidence: 0.87,
  sciCard: {
    title: '橘猫小知识',
    content: '约 80% 的橘猫是公猫，这是伴 X 染色体遗传决定的。',
  },
};

/** 每张新照片最多比对几只候选（控制时延与费用：1 只 ≈ 2s） */
const MATCH_CANDIDATES = 5;

/** 「附近」半径（米）：带定位比对时候选池只取这个距离内的档案猫（环境变量可调） */
const MATCH_RADIUS_M = Number(process.env.AI_MATCH_RADIUS_M ?? 1500);

/** 绝育状态中文（匹配摘要卡用；写成完整短语，避免「绝育未绝育」这种拼接） */
const STERILIZATION_LABEL: Record<string, string> = {
  UNKNOWN: '绝育待确认',
  STERILIZED: '已绝育',
  NOT_STERILIZED: '未绝育',
};

/** 记录类型中文（匹配摘要卡「上次记录」用） */
const RECORD_TYPE_LABEL: Record<string, string> = {
  APPEARANCE: '外貌',
  LOCATION: '相遇',
  HEALTH: '健康',
  FEEDING: '投喂',
  SEASON: '季节',
  DEVICE: '设备',
};

/** 单只候选的比对结论 */
interface MatchVerdict {
  same: boolean;
  similarity: number;
  reason: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /** 上传根目录（与 UploadService 同口径；读候选档案照的字节用） */
  private readonly uploadRoot = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 识别流程：
   * 1. 查缓存：photoKey 命中直接返回（同图不重复调用）
   * 2. 限流：该用户今日调用数 < AI_DAILY_LIMIT_PER_USER
   * 3. 调 OpenAI 兼容视觉模型（密钥只在后端 .env，绝不下发到 App）
   * 4. 结果落库 ai_usages（缓存 + 计数）+ 返回结构化识别结果 + 科普卡
   * 未配置密钥 / 调用失败 → 返回演示结果（source: 'demo'），前端可据此标注
   */
  async recognize(dto: { photoKey: string; uid: string; imageBase64?: string }) {
    // 1. 缓存命中
    const cached = await this.prisma.aiUsage.findFirst({
      where: { photoKey: dto.photoKey },
    });
    if (cached?.result && typeof cached.result === 'object') {
      return { ...(cached.result as Record<string, unknown>), cached: true };
    }

    const day = new Date();
    day.setHours(0, 0, 0, 0);

    const apiUrl = process.env.AI_API_URL?.trim();
    const apiKey = process.env.AI_API_KEY?.trim();
    const model = process.env.AI_MODEL?.trim() || 'gpt-4o-mini';
    const dailyLimit = Number(process.env.AI_DAILY_LIMIT_PER_USER ?? 50);

    // 2. 限流（真实调用才计数；演示兜底不占额度）
    if (apiUrl && apiKey) {
      const used = await this.prisma.aiUsage.count({
        where: { userId: dto.uid, day },
      });
      if (used >= dailyLimit) {
        throw new BadRequestException(`今日 AI 识别次数已用完（限 ${dailyLimit} 次/天）`);
      }
    }

    let result: Record<string, unknown>;
    if (apiUrl && apiKey && dto.imageBase64) {
      // 3. 真实调用
      result = await this.callVisionModel(apiUrl, apiKey, model, dto.imageBase64);
    } else {
      // 4. 演示兜底（未配 key / 无图）
      result = { ...DEMO_RESULT, source: 'demo' };
    }

    // 落库：缓存 + 当日计数（result 是宽松 JSON，cast 进 Prisma 的 JsonValue 输入类型）
    await this.prisma.aiUsage.create({
      data: {
        userId: dto.uid,
        photoKey: dto.photoKey,
        result: result as object as import('@prisma/client').Prisma.InputJsonValue,
        day,
      },
    });
    return { ...result, cached: false };
  }

  /**
   * S6 建档页「AI 匹配」（2026-10-09 接真，替掉原先前端写死的演示卡）：
   * 新拍的照片 vs 已有档案，逐只让视觉模型判断「是不是同一只」。
   *
   * 为什么要接真：原先弹窗是设计稿 p37 的演示态（三花-0824 / 江湾小区 / 92%），
   * 前端无条件弹出 —— 用户传什么猫都显示「和三花很像」。改成：
   *   · 候选来自真库（且**必须有档案照**，没照片无从比对）；
   *   · 相似度是模型对两张照片的判定结果；
   *   · 低于阈值 → 不返回候选（前端不弹窗），宁可不提示也不误报（PRD 6.3 误报抑制）。
   * 2026-10-09 二（用户诉求）：候选池加**距离条件** ——
   *   · 带定位（lat/lng）→ 候选 = 附近 MATCH_RADIUS_M 米内**所有**带档案照的猫，
   *     按距离升序取前 MATCH_CANDIDATES 只（不限「我建的」——「别人已建档的附近猫」
   *     正是匹配的价值；游客模式下档案本就公开可浏览，无隐私增量）；
   *   · 没定位 → 回落旧行为（我建的 + 我观测的），别让没 GPS 就完全没匹配。
   * 无候选 / 无 key → 返回 matched:null + reason，前端静默（不编造候选）。
   */
  async match(dto: { photoKey: string; uid: string; imageBase64?: string; lat?: number; lng?: number }) {
    const threshold = Number(process.env.AI_MATCH_THRESHOLD ?? 0.85);
    const origin =
      typeof dto.lat === 'number' && typeof dto.lng === 'number'
        ? { lat: dto.lat, lng: dto.lng }
        : null;
    // 缓存 key 带定位网格后缀：定位变了（客户端坐标本就吸附 ~220m 网格）→ 换个池重比，
    // 避免「在 A 处比过没候选」把「走到 B 处、猫就在附近」也一并缓存成未命中。
    const cacheKey = `match:${dto.photoKey}${origin ? `@${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}` : ''}`;

    // 1. 同图（同图+同位置）缓存：同一张照片重复上传不重复比对（同时不重复计费）。
    //    ⚠️ 只复用**比对结论**（命中哪只 / 相似度），摘要卡与「相距 N 米」每次现算 ——
    //    否则库里那只猫的点位、记录数一变，弹窗就还在展示旧的摘要。
    const cached = await this.prisma.aiUsage.findFirst({ where: { photoKey: cacheKey } });
    const cachedBody = (cached?.result ?? null) as {
      verdict?: { profileId: string; similarity: number; reason: string } | null;
      compared?: number;
      reason?: string;
      threshold?: number;
      closest?: { name: string; similarity: number } | null;
    } | null;
    if (cachedBody && 'verdict' in cachedBody) {
      const v = cachedBody.verdict;
      if (v?.profileId) {
        const p = await this.prisma.profile.findUnique({
          where: { id: v.profileId },
          include: { avatarPhoto: true, _count: { select: { records: true } } },
        });
        if (p) {
          return {
            matched: await this.summarizeMatch(p, {
              same: true,
              similarity: v.similarity,
              reason: v.reason || '',
            }, origin),
            compared: cachedBody.compared ?? 0,
            reason: 'matched',
            threshold: cachedBody.threshold ?? threshold,
            source: 'ai',
            cached: true,
          };
        }
      }
      return {
        matched: null,
        compared: cachedBody.compared ?? 0,
        reason: cachedBody.reason ?? 'below_threshold',
        threshold: cachedBody.threshold ?? threshold,
        closest: cachedBody.closest ?? null,
        source: 'ai',
        cached: true,
      };
    }

    // 2. 候选池：带定位 → 附近半径内所有带档案照的猫（按距离升序）；没定位 → 我建的 + 我观测的
    let candidates;
    if (origin) {
      const all = await this.prisma.profile.findMany({
        where: { avatarPhotoId: { not: null }, lastSeenLat: { not: null }, lastSeenLng: { not: null } },
        include: { avatarPhoto: true, _count: { select: { records: true } } },
      });
      candidates = all
        .map((p) => ({
          p,
          d: p.lastSeenLat != null && p.lastSeenLng != null
            ? haversineM(origin.lat, origin.lng, p.lastSeenLat, p.lastSeenLng)
            : Number.POSITIVE_INFINITY,
        }))
        .filter((x) => x.d <= MATCH_RADIUS_M)
        .sort((a, b) => a.d - b.d)
        .slice(0, MATCH_CANDIDATES)
        .map((x) => x.p);
    } else {
      candidates = await this.prisma.profile.findMany({
        where: {
          avatarPhotoId: { not: null },
          OR: [{ creatorId: dto.uid }, { observations: { some: { userId: dto.uid } } }],
        },
        orderBy: { updatedAt: 'desc' },
        take: MATCH_CANDIDATES,
        include: { avatarPhoto: true, _count: { select: { records: true } } },
      });
    }
    if (!candidates.length) {
      return {
        matched: null,
        compared: 0,
        reason: origin ? 'no_nearby_candidates' : 'no_candidates',
        threshold,
      };
    }

    const apiUrl = process.env.AI_API_URL?.trim();
    const apiKey = process.env.AI_API_KEY?.trim();
    const model = process.env.AI_MODEL?.trim() || 'gpt-4o-mini';
    // 没配 key 或本次照片没传上来 → 老实用「暂不可用」，不编一个候选糊弄用户
    if (!apiUrl || !apiKey || !dto.imageBase64) {
      return { matched: null, compared: 0, reason: 'ai_unavailable', threshold };
    }

    const day = new Date();
    day.setHours(0, 0, 0, 0);
    const dailyLimit = Number(process.env.AI_DAILY_LIMIT_PER_USER ?? 50);
    const used = await this.prisma.aiUsage.count({ where: { userId: dto.uid, day } });
    if (used + candidates.length > dailyLimit) {
      throw new BadRequestException(`今日 AI 识别次数已用完（限 ${dailyLimit} 次/天）`);
    }

    // 3. 逐只比对（并行；单只失败只跳过它，不影响其余候选）
    const verdicts = await Promise.all(
      candidates.map(async (c) => {
        const photo = c.avatarPhoto;
        if (!photo) return null;
        try {
          const buf = await readFile(join(this.uploadRoot, photo.cosKey));
          const mime = photo.cosKey.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
          const refUrl = `data:image/${mime};base64,${buf.toString('base64')}`;
          const v = await this.compareCats(apiUrl, apiKey, model, dto.imageBase64 as string, refUrl);
          return v ? { c, v } : null;
        } catch (e: any) {
          this.logger.warn(`候选比对失败（${c.id}）：${e?.message ?? e}`);
          return null;
        }
      }),
    );

    const scored = verdicts
      .filter((x): x is { c: (typeof candidates)[number]; v: MatchVerdict } => !!x)
      .sort((a, b) => b.v.similarity - a.v.similarity);
    const best = scored[0];

    // 4. 落库（缓存比对结论 + 当日计数，与 /ai/recognize 共用 ai_usages）
    let matched: Record<string, unknown> | null = null;
    const hit = !!best && best.v.similarity >= threshold;
    if (hit && best) matched = await this.summarizeMatch(best.c, best.v, origin);
    await this.prisma.aiUsage.create({
      data: {
        userId: dto.uid,
        photoKey: cacheKey,
        result: {
          // 只存结论：命中哪只 + 相似度（摘要卡现算，见上方缓存段）
          verdict: hit && best
            ? { profileId: best.c.id, similarity: best.v.similarity, reason: best.v.reason }
            : null,
          compared: candidates.length,
          reason: hit ? 'matched' : 'below_threshold',
          threshold,
          // 仅供日志/调试：最接近的一只及其相似度（前端不展示，避免误导）
          closest: best
            ? { name: best.c.name, similarity: Math.round(best.v.similarity * 100) }
            : null,
        } as object as import('@prisma/client').Prisma.InputJsonValue,
        day,
      },
    });
    return {
      matched,
      compared: candidates.length,
      reason: hit ? 'matched' : 'below_threshold',
      threshold,
      source: 'ai',
      cached: false,
    };
  }

  /** 命中档案的摘要卡（全部字段来自真库，杜绝演示值；带定位时附「相距 N 米」） */
  private async summarizeMatch(
    p: {
      id: string;
      name: string;
      coatColor: string | null;
      sterilizationStatus: string;
      lastSeenDesc: string | null;
      lastSeenLat: number | null;
      lastSeenLng: number | null;
      createdAt: Date;
      avatarPhoto: { url: string } | null;
      _count: { records: number };
    },
    v: MatchVerdict,
    origin?: { lat: number; lng: number } | null,
  ) {
    const last = await this.prisma.record.findFirst({
      where: { profileId: p.id },
      orderBy: { occurredAt: 'desc' },
      include: { author: { select: { nickname: true } } },
    });
    // 「相距」= 用户当前位置（街区级模糊）与该档案点位（同为街区级模糊 GCJ02）的球面距离
    const distanceM =
      origin && p.lastSeenLat != null && p.lastSeenLng != null
        ? Math.round(haversineM(origin.lat, origin.lng, p.lastSeenLat, p.lastSeenLng))
        : null;
    return {
      id: p.id,
      name: p.name,
      /** 短名 = 毛色（设计稿「已有档案 · 三花」里的那一截） */
      coat: p.coatColor || '猫',
      avatarUrl: p.avatarPhoto?.url || '',
      similarity: Math.round(v.similarity * 100),
      reason: v.reason,
      daysAgo: Math.max(0, Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000)),
      distanceM,
      detail: [
        ...(distanceM != null ? [`相距约 ${fmtDistCn(distanceM)}`] : []),
        p.lastSeenDesc || '点位未记录',
        STERILIZATION_LABEL[p.sterilizationStatus] ?? '绝育待确认',
        `记录 ${p._count.records} 条`,
      ].join(' · '),
      lastRecord: last
        ? `上次记录：${relTimeCn(last.occurredAt)} ${last.author?.nickname || '猫友'} ${
            RECORD_TYPE_LABEL[last.type] ?? ''
          }`.trim()
        : '还没有记录',
    };
  }

  /** 两图比对（图1 = 本次拍摄，图2 = 已建档的猫）：只判「是否同一只」并给一个相似度 */
  private async compareCats(
    apiUrl: string,
    apiKey: string,
    model: string,
    shotUrl: string,
    refUrl: string,
  ): Promise<MatchVerdict | null> {
    const system = [
      '你在帮流浪猫观察者判断：新拍到的这只猫，是不是他档案里已经建过档的某只猫。',
      '你会收到两张照片：图1 = 本次拍摄，图2 = 已建档的猫。',
      '对比毛色花纹、脸型、耳朵（剪耳/耳标）、眼睛颜色、显著特征与体型，判断是否同一只猫。',
      '严格只输出一个 JSON 对象（不要 markdown 代码块、不要解释文字），字段：',
      'same（布尔：是否同一只猫）、similarity（0-1 的数字：是同一只猫的置信度，不同猫给 0-0.4）、',
      'reason（一句话中文依据，20 字内）。',
    ].join('');

    try {
      const resp = await fetch(`${apiUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            {
              role: 'user',
              content: [
                { type: 'text', text: '图1是本次拍摄，图2是已建档的猫。它们是不是同一只猫？' },
                { type: 'image_url', image_url: { url: shotUrl } },
                { type: 'image_url', image_url: { url: refUrl } },
              ],
            },
          ],
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!resp.ok) throw new Error(`上游 ${resp.status}: ${(await resp.text()).slice(0, 160)}`);
      const body: any = await resp.json();
      const content: string = body?.choices?.[0]?.message?.content ?? '';
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('模型未返回 JSON');
      const parsed = JSON.parse(m[0]);
      const sim = typeof parsed.similarity === 'number' ? parsed.similarity : 0;
      return {
        same: parsed.same === true,
        similarity: Math.min(1, Math.max(0, sim)),
        reason: String(parsed.reason ?? '').slice(0, 40),
      };
    } catch (e: any) {
      this.logger.warn(`两图比对失败：${e?.message ?? e}`);
      return null;
    }
  }

  /** OpenAI 兼容 chat/completions 视觉调用；失败时降级演示结果（不抛错打断前端流程） */
  private async callVisionModel(
    apiUrl: string,
    apiKey: string,
    model: string,
    imageBase64: string,
  ): Promise<Record<string, unknown>> {
    const dataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;
    const system = [
      '你是流浪猫观察助手。根据照片识别这只猫，严格只输出一个 JSON 对象（不要 markdown 代码块），字段：',
      'species（物种，如"猫"）、coat（毛色花纹，如"三花""橘白"）、',
      'features（明显特征，多个用「·」分隔，如"右耳缺角 · 佩戴项圈"，没有则写"无明显特征"）、',
      'body（身体状态判断，一句话，含体型/精神/可见伤病）、',
      'draft（一段 40-80 字的中文观测草稿，客观描述，供观察者直接采用）、',
      'confidence（0-1 的数字）、',
      'sciCard（对象：{title: 科普标题, content: 一条 50 字内与这只猫特征相关的科普}）。',
      '如果照片里没有猫，species 写"未识别到猫"，其余字段给保守描述。',
    ].join('');

    try {
      const resp = await fetch(`${apiUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            {
              role: 'user',
              content: [
                { type: 'text', text: '请识别这张照片里的猫。' },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!resp.ok) {
        throw new Error(`上游 ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
      }
      const body: any = await resp.json();
      const content: string = body?.choices?.[0]?.message?.content ?? '';
      return this.parseModelJson(content);
    } catch (e: any) {
      // 降级：AI 故障不该打断记录流程，返回演示结果并打日志
      this.logger.warn(`AI 调用失败，降级演示结果：${e?.message ?? e}`);
      return { ...DEMO_RESULT, source: 'demo', error: String(e?.message ?? e).slice(0, 120) };
    }
  }

  /** 从模型回复中稳健抽取 JSON（容忍 markdown 代码块/前后缀文本） */
  private parseModelJson(content: string): Record<string, unknown> {
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('模型未返回 JSON');
    const parsed = JSON.parse(m[0]);
    return {
      species: parsed.species ?? '猫',
      coat: parsed.coat ?? '未知',
      features: parsed.features ?? '无明显特征',
      body: parsed.body ?? '状态待观察',
      draft: parsed.draft ?? '',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      sciCard: parsed.sciCard ?? DEMO_RESULT.sciCard,
      source: 'ai',
    };
  }
}

/** 相对时间中文（匹配摘要卡的「上次记录：3 天前 王阿姨 投喂」） */
function relTimeCn(t: Date | string | null | undefined): string {
  if (!t) return '';
  const ms = Date.now() - new Date(t).getTime();
  if (ms < 0) return '刚刚';
  const min = Math.floor(ms / 60000);
  if (min < 60) return min <= 1 ? '刚刚' : `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day === 1) return '昨天';
  if (day < 30) return `${day} 天前`;
  const mon = Math.floor(day / 30);
  return mon < 12 ? `${mon} 个月前` : `${Math.floor(mon / 12)} 年前`;
}

/** 球面距离（米）—— 与 profiles.nearby / spaces.nearby 同一套 haversine 口径 */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 距离中文：<1 公里显米，≥1 公里显一位小数公里（摘要卡「相距约 …」用） */
function fmtDistCn(m: number): string {
  return m < 1000 ? `${m} 米` : `${(m / 1000).toFixed(1)} 公里`;
}
