import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { QueryProfilesDto } from './dto/query-profiles.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * S2 附近点位（2026-10-07 接真；2026-10-10 晚扩「坐标多级兜底」）：
   * 返回带街区级模糊坐标的档案（PRD 6.4 隐私：坐标本身在建档时已模糊到街区）；
   * 带观察者视角标记 mine / observed，供地图点卡判断「去关注」还是「已在我的观测对象里」。
   * 传 lat/lng 时按距离排序并给出 distanceM（街区级，不存精确坐标）。
   *
   * ⚠️ 2026-10-10 晚修（用户报障「我写了其他三个协会的猫咪，地图上没显示」）：
   * 原 `where: { lastSeenLat: { not: null } }` 会把**只写了文字点位、没存坐标**的档案
   * 整只滤掉（seed 的 大胖/阿黑/小白/团子/布丁 五只全中，永远不上图，且没有任何提示）。
   * 现改为「坐标多级兜底」——只要下面任一级能定位就上图：
   *   ① `lastSeenLat/Lng`（档案级，最准：建档 / 带定位记录自动跟随写入）
   *   ② 该猫**最近一条带坐标的记录**（记录带了坐标但档案没同步：旧记录早于 lastSeenAt 时会走到这里）
   *   ③ 该猫所属**小组的活动中心**（小区级，最粗 —— 标注 coordSource='space' 让前端如实说明）
   * 三级全无 → 仍不上图（宁可不上，也不给它编一个坐标）。
   * 响应新增（纯增量）：
   *   - `displayLat/displayLng`：**地图落点/测距用**的坐标（= 兜底链解出来的那一级）
   *   - `coordSource: 'profile' | 'record' | 'space'`：该坐标来自哪一级（前端据此标注「小区级」）
   *   ⚠️ `lastSeenLat/lastSeenLng` 仍是**档案里存的原值**（可能为 null），不偷梁换柱。
   *
   * 2026-10-11：本接口转 @Public（游客可浏览，见 controller 注释）→ uid 变可选。
   * 游客态：mine/observed 恒 false。观测关系查询用**哨兵值** `userId: uid ?? '__guest__'`
   * —— ⚠️ 不能传 `undefined`，Prisma 会把 undefined 当作「未提供该条件」返回**全部**关注行，
   * 导致每只猫都误判 `observed = true`（S10 游客链路同款坑，见核对文档 12.3）。
   */
  async nearby(uid: string, lat?: number, lng?: number, radiusM = 5000) {
    const rows = await this.prisma.profile.findMany({
      where: {
        OR: [
          { lastSeenLat: { not: null }, lastSeenLng: { not: null } },
          { records: { some: { lat: { not: null }, lng: { not: null } } } },
          { spaceBindings: { some: { space: { lat: { not: null }, lng: { not: null } } } } },
        ],
      },
      orderBy: { lastSeenAt: 'desc' },
      take: 30,
      include: {
        avatarPhoto: true,
        observations: { where: { userId: uid ?? '__guest__' }, select: { id: true }, take: 1 },
        _count: { select: { records: true } },
        // 兜底 ②：最近一条带坐标的记录（只取坐标，不把整条记录带进响应）
        records: {
          where: { lat: { not: null }, lng: { not: null } },
          orderBy: { occurredAt: 'desc' },
          take: 1,
          select: { lat: true, lng: true },
        },
        // 兜底 ③：所属小组的活动中心（一个小组可能含多只猫，任取第一个有坐标的组）
        spaceBindings: {
          select: { space: { select: { lat: true, lng: true } } },
        },
      },
    });

    const out = rows.map((r) => {
      const { observations, records, spaceBindings, ...rest } = r;
      const coord = resolveDisplayCoord(r, records, spaceBindings);
      if (!coord) return null; // 三级全无：不上图（不编坐标）
      let distanceM: number | null = null;
      if (lat != null && lng != null) {
        distanceM = Math.round(haversineM(lat, lng, coord.lat, coord.lng));
      }
      return {
        ...rest,
        // 游客（uid 为空）：两者恒 false —— 别用 `creatorId === uid` 裸比，
        // uid 为 undefined 时语义靠巧合（当前恰好不相等），显式判空更稳。
        mine: !!uid && r.creatorId === uid,
        observed: (!!uid && r.creatorId === uid) || observations.length > 0,
        displayLat: coord.lat,
        displayLng: coord.lng,
        coordSource: coord.source,
        distanceM,
      };
    });

    const resolved = out.filter((r): r is NonNullable<typeof r> => r !== null);
    const kept = lat != null && lng != null && radiusM > 0
      ? resolved.filter((r) => r.distanceM == null || r.distanceM <= radiusM)
      : resolved;
    if (lat != null && lng != null) kept.sort((a, b) => (a.distanceM ?? 1e9) - (b.distanceM ?? 1e9));
    return kept;
  }

  /**
   * 今日相遇·盲盒（2026-10-07）：从「别人建档 + 我还没关注」的档案池里随机抽一只。
   * 池空时返回 cat:null（前端提示「附近的猫都进了你的观测对象」）。
   */
  async blindbox(uid: string) {
    const pool = await this.prisma.profile.findMany({
      where: { creatorId: { not: uid }, observations: { none: { userId: uid } } },
      include: {
        avatarPhoto: true,
        creator: { select: { nickname: true } },
        _count: { select: { records: true } },
      },
    });
    if (!pool.length) return { cat: null, remain: 0 };
    const cat = pool[Math.floor(Math.random() * pool.length)];
    return { cat, remain: pool.length };
  }

  async list(q: QueryProfilesDto, uid: string) {
    // S3 首页语义「我的观测对象」= 我创建的 + 我关注的（Observation 落表于 POST /:id/observe）
    // 口径说明（2026-10-06 定案）：别人建档、我在观测的个体也算（社区接力观测立意），
    // 但首页不在卡上标注建档来源（用户当晚撤掉该展示）。
    return this.prisma.profile.findMany({
      where: {
        OR: [{ creatorId: uid }, { observations: { some: { userId: uid } } }],
      },
      orderBy: { updatedAt: 'desc' },
      take: q.pageSize,
      skip: (q.page - 1) * q.pageSize,
      include: { avatarPhoto: true },
    });
  }

  /** 阶段2：creatorId 一律来自 JWT uid，前端传的会被 ValidationPipe 剔除 */
  async create(dto: CreateProfileDto, uid: string) {
    // 坐标为客户端模糊化后的街区级坐标（PRD 6.4），后端不再加工
    return this.prisma.profile.create({
      data: {
        // 自动命名（2026-10-09 修）：原名写死「橘猫·MMDD」，三花猫也会被命名成橘猫。
        // 现改为「有毛色就用毛色 + 月日」，无毛色时用中性兜底，绝不假设花色。
        name: dto.name || `${dto.coatColor || '猫咪'}·${new Date().toISOString().slice(5, 10).replace('-', '')}`,
        animalType: dto.animalType,
        coatColor: dto.coatColor,
        bodySize: dto.bodySize,
        specialMarks: dto.specialMarks,
        sterilizationStatus: dto.sterilizationStatus,
        healthStatus: dto.healthStatus,
        lastSeenLat: dto.lastSeenLat,
        lastSeenLng: dto.lastSeenLng,
        lastSeenDesc: dto.lastSeenDesc,
        lastSeenAt: dto.lastSeenAt ? new Date(dto.lastSeenAt) : new Date(),
        creatorId: uid,
        // S3 建档照片（2026-10-06）：已上传 Photo 的 id
        avatarPhotoId: dto.avatarPhotoId,
      },
    });
  }

  /**
   * S4 档案详情。除本体外返回前端展示所需聚合（2026-10-06）：
   * - creator：建档人昵称（设计稿「建档人：林晚」位置的真实数据）
   * - myObservation：当前用户是否已关注（「我的观测对象」胶囊）
   * - firstSeenAt：最早一条记录的 occurredAt（「初遇」），无记录回落档案 createdAt
   * - spotNames：去重后的出没点位（出没点位胶囊）
   * - spots：同上 + 坐标（2026-10-10，点胶囊跳地图页聚焦用）
   * uid 为空（游客态，@Public）→ mine/myObservation 均 false（未登录谈不上关注）
   */
  async detail(id: string, uid?: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      include: {
        avatarPhoto: true,
        creator: { select: { id: true, nickname: true } },
        records: { orderBy: { occurredAt: 'desc' }, take: 5, include: { photos: true } },
        _count: { select: { records: true } },
        // 游客不查关注表：where 用一个不可能命中的 uid 兜底，避免 undefined 被 Prisma
        // 当作「未提供条件」→ 返回全部关注行 → myObservation 误判为 true
        observations: {
          where: { userId: uid ?? '__guest__' },
          select: { userId: true },
          take: 1,
        },
      },
    });
    if (!profile) throw new NotFoundException('档案不存在');

    const [firstRecord, spotRows] = await Promise.all([
      this.prisma.record.findFirst({
        where: { profileId: id },
        orderBy: { occurredAt: 'asc' },
        select: { occurredAt: true },
      }),
      this.prisma.record.findMany({
        where: { profileId: id, locDesc: { not: null } },
        orderBy: { occurredAt: 'desc' },
        distinct: ['locDesc'],
        // lat/lng（2026-10-10 加）：详情页点「出没点位」要跳地图页聚焦到该点位
        select: { locDesc: true, lat: true, lng: true },
      }),
    ]);

    const { observations, ...rest } = profile;
    // 2026-10-07：mine = 我建的档案（永远在观测对象列表里，谈不上关注/取关）
    const mine = profile.creatorId === uid;

    /**
     * 出没点位（2026-10-10 晚修：用户报障「我写的东和公寓西门，档案页却显示楼下花坛」）。
     * 原来只取**记录**的 locDesc 去重 —— 用户在建档/编辑档案里亲手写的常驻点位
     * （profile.lastSeenDesc）根本不参与，于是「我写的点位不显示、旧记录的点位倒成了主点位」。
     * 现在：主点位 = 档案自身的常驻点位（建档/编辑写入，且记录带定位时由 touchProfileSpot
     * 自动跟随），次点位 = 记录去重点位里排除主点位后的其余项（按 occurredAt desc）。
     * 同名去重；主点位缺坐标时用记录里的坐标补（老档案可能没存 lastSeenLat/Lng）。
     */
    const profileSpot = (profile.lastSeenDesc || '').trim();
    const spotList: { name: string; lat: number | null; lng: number | null }[] = [];
    if (profileSpot) {
      spotList.push({
        name: profileSpot,
        lat: typeof profile.lastSeenLat === 'number' ? profile.lastSeenLat : null,
        lng: typeof profile.lastSeenLng === 'number' ? profile.lastSeenLng : null,
      });
    }
    for (const s of spotRows) {
      const name = (s.locDesc || '').trim();
      if (!name) continue;
      const lat = typeof s.lat === 'number' ? s.lat : null;
      const lng = typeof s.lng === 'number' ? s.lng : null;
      const hit = spotList.find((x) => x.name === name);
      if (hit) {
        // 记录里的坐标更新（档案侧没存坐标时补上）
        if (hit.lat === null && lat !== null) {
          hit.lat = lat;
          hit.lng = lng;
        }
        continue;
      }
      spotList.push({ name, lat, lng });
    }

    return {
      ...rest,
      mine,
      myObservation: mine || observations.length > 0,
      creatorNickname: profile.creator?.nickname || '',
      firstSeenAt: firstRecord?.occurredAt ?? profile.createdAt,
      spotNames: spotList.map((s) => s.name),
      /**
       * 点位 + 坐标（纯增量）。
       * S4 个体档案点「出没点位」胶囊 → 跳地图页聚焦到这只猫的点位。
       * 记录侧 locDesc 去重取「最近一条」（orderBy occurredAt desc + distinct），
       * 所以坐标 = 最近一次在该点位观测到的位置；缺坐标时前端回落档案自身 lastSeenLat/Lng。
       */
      spots: spotList,
    };
  }

  /**
   * S7：更新档案（昵称/毛色/体型/特征/健康/绝育/点位）。
   * 2026-10-09：加归属校验——只有建档人本人能改（原实现任何人带 token 都能改别人的猫）。
   */
  async update(id: string, dto: Partial<CreateProfileDto>, uid: string) {
    // 防越权：归属字段只读（虽然 DTO 已删，Partial 展开仍可能带进来）
    delete (dto as Record<string, unknown>).creatorId;
    const profile = await this.prisma.profile.findUnique({ where: { id }, select: { creatorId: true } });
    if (!profile) throw new NotFoundException('档案不存在');
    if (profile.creatorId !== uid) throw new ForbiddenException('只能编辑自己建的档案');
    return this.prisma.profile.update({
      where: { id },
      // version 自增：离线同步 last-write-wins 的依据
      data: { ...dto, version: { increment: 1 } },
    });
  }

  async timeline(id: string, cursor?: string) {
    // TODO(阶段2)：cursor 分页 + 照片/季节筛选
    return this.prisma.record.findMany({
      where: { profileId: id },
      orderBy: { occurredAt: 'desc' },
      take: 50,
      include: { photos: true },
    });
  }

  /** 阶段2：落 Observation 表（幂等：重复关注不报错） */
  async observe(profileId: string, uid: string) {
    await this.prisma.observation.upsert({
      where: { userId_profileId: { userId: uid, profileId } },
      create: { userId: uid, profileId },
      update: {},
    });
    return { profileId, observed: true };
  }

  /** 2026-10-07：取消关注。摘出观测对象列表；已写记录保留（观察史仍可见）。 */
  async unobserve(profileId: string, uid: string) {
    await this.prisma.observation.deleteMany({
      where: { userId: uid, profileId },
    });
    return { profileId, observed: false };
  }
}

/**
 * 「这只猫该画在哪」的坐标多级兜底（2026-10-10 晚，配套 nearby）：
 *   ① 档案 lastSeenLat/Lng（最准）→ ② 最近一条带坐标的记录 → ③ 所属小组活动中心（小区级）
 * 返回 null = 三级都没有 → 调用方不上图（**宁可不上，也不编一个坐标**）。
 * 与 S4「出没点位 → 地图聚焦」的兜底口径同族（那边是 记录坐标 → 档案 lastSeen → 不聚焦但给出口）。
 */
function resolveDisplayCoord(
  profile: { lastSeenLat: number | null; lastSeenLng: number | null },
  records: { lat: number | null; lng: number | null }[],
  bindings: { space: { lat: number | null; lng: number | null } }[],
): { lat: number; lng: number; source: 'profile' | 'record' | 'space' } | null {
  const num = (v: number | null): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

  const pLat = num(profile.lastSeenLat);
  const pLng = num(profile.lastSeenLng);
  if (pLat != null && pLng != null) return { lat: pLat, lng: pLng, source: 'profile' };

  for (const r of records) {
    const rLat = num(r.lat);
    const rLng = num(r.lng);
    if (rLat != null && rLng != null) return { lat: rLat, lng: rLng, source: 'record' };
  }

  for (const b of bindings) {
    const sLat = num(b.space.lat);
    const sLng = num(b.space.lng);
    if (sLat != null && sLng != null) return { lat: sLat, lng: sLng, source: 'space' };
  }
  return null;
}

/** 两点球面距离（米）—— 仅用于街区级「距你约 X m」展示，不涉及精确定位 */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
