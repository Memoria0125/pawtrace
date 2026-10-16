import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { cityOf } from '../../common/city';
import { CreateRecordDto } from './dto/create-record.dto';
import { QueryRecordsDto } from './dto/query-records.dto';

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 阶段2：authorId 一律来自 JWT uid，前端传的会被 ValidationPipe 剔除 */
  async create(dto: CreateRecordDto, uid: string) {
    // 2026-10-07：写记录自动落关注（「给它记了一笔」就算我的观测对象，无需再手动关注）
    await this.ensureFollow(uid, dto.profileId);
    await this.touchProfileSpot(dto);
    return this.prisma.record.create({
      data: this.toData(dto, uid),
      include: { photos: true },
    });
  }

  async batchUpsert(dtos: CreateRecordDto[], uid: string) {
    // 离线补传：客户端草稿已有 id，按 id upsert 保证幂等（重复提交不产生重复记录）
    const results: unknown[] = [];
    for (const dto of dtos) {
      if (!dto.id) {
        results.push(await this.create(dto, uid));
        continue;
      }
      await this.ensureFollow(uid, dto.profileId);
      await this.touchProfileSpot(dto);
      results.push(
        await this.prisma.record.upsert({
          where: { id: dto.id },
          create: { id: dto.id, ...this.toData(dto, uid) },
          update: { ...this.toData(dto, uid), version: { increment: 1 } },
        }),
      );
    }
    return { count: results.length };
  }

  /**
   * 点位自动跟随（2026-10-10，用户诉求「记录相遇的点位更新就在地图上自动跟随最新记录」）：
   * 带定位的记录落库时，档案「出现点位」更新为这次的位置 —— 地图 marker = 最近一次有人看到它。
   * 仅当记录时间不早于档案当前 lastSeenAt（离线补传的旧记录不会把点位拉回过去）；
   * 重复提交（batch 幂等路径）写入同值，无副作用。locDesc 缺省时保留原有点位名。
   */
  private async touchProfileSpot(dto: CreateRecordDto) {
    if (dto.lat == null || dto.lng == null || !dto.profileId) return;
    const p = await this.prisma.profile.findUnique({
      where: { id: dto.profileId },
      select: { lastSeenAt: true },
    });
    if (!p) return;
    const at = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    if (p.lastSeenAt && p.lastSeenAt > at) return;
    await this.prisma.profile.update({
      where: { id: dto.profileId },
      data: {
        lastSeenLat: dto.lat,
        lastSeenLng: dto.lng,
        lastSeenDesc: dto.locDesc || undefined,
        lastSeenAt: at,
      },
    });
  }

  /** 幂等 upsert 关注关系（observations 联合唯一，重复调用不产生新行） */
  private async ensureFollow(uid: string, profileId: string) {
    if (!profileId) return;
    await this.prisma.observation.upsert({
      where: { userId_profileId: { userId: uid, profileId } },
      create: { userId: uid, profileId },
      update: {},
    });
  }

  private toData(dto: CreateRecordDto, uid: string) {
    return {
      type: dto.type,
      // 多类型标签（2026-10-10）：去重 + 剔除与主 type 重复的项，逗号分隔落库
      subTypes:
        dto.subTypes?.filter((t, i, a) => t !== dto.type && a.indexOf(t) === i).join(',') ||
        undefined,
      content: dto.content,
      season: dto.season,
      lat: dto.lat,
      lng: dto.lng,
      locDesc: dto.locDesc,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      authorId: uid,
      profileId: dto.profileId,
      photos: dto.photoIds?.length
        ? { connect: dto.photoIds.map((id) => ({ id })) }
        : undefined,
    };
  }

  /**
   * S3 首页三宫格（2026-10-07）：**本人口径**
   * - today：我「今天」写的记录数（occurredAt 落在今天 0 点之后）
   * - spots：我记录里去重后的点位名数（保留兼容，前端 2026-10-11 起不再展示）
   * - cities（2026-10-11 用户定案）：「城市点位」= **我去过的点位覆盖了几个城市**。
   *   ⚠️ 此前该格展示的是 spots（点位数），数字上等于「踩过的点位个数」，用户报障
   *   「我记录的都是杭州市的，却显示 5」→ 改为城市数。判定方式：坐标归属城市
   *   （记录自身 lat/lng 优先；记录没带坐标就用该猫档案的常驻点坐标），
   *   内置城市中心表最近邻匹配（见 common/city.ts）。判不出城市的记录不计入。
   */
  async myStats(uid: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [today, spotRows, geoRows] = await Promise.all([
      this.prisma.record.count({ where: { authorId: uid, occurredAt: { gte: start } } }),
      this.prisma.record.findMany({
        where: { authorId: uid, locDesc: { not: null } },
        distinct: ['locDesc'],
        select: { locDesc: true },
      }),
      // 城市判定：记录自身坐标缺失时回落到所属档案的常驻点坐标
      this.prisma.record.findMany({
        where: { authorId: uid },
        select: {
          lat: true,
          lng: true,
          profile: { select: { lastSeenLat: true, lastSeenLng: true } },
        },
      }),
    ]);
    const citySet = new Set<string>();
    for (const r of geoRows) {
      const c = cityOf(r.lat ?? r.profile?.lastSeenLat, r.lng ?? r.profile?.lastSeenLng);
      if (c) citySet.add(c);
    }
    return { today, spots: spotRows.filter((r) => r.locDesc).length, cities: citySet.size };
  }

  async list(q: QueryRecordsDto, uid: string) {
    // 阶段2：固定查当前登录用户自己的记录（观察史/我的页），
    // 不再接受前端 authorId——否则任何登录用户可枚举他人记录
    return this.prisma.record.findMany({
      where: {
        authorId: uid,
        profileId: q.profileId,
        type: q.type,
      },
      orderBy: { occurredAt: 'desc' },
      take: q.pageSize,
      skip: (q.page - 1) * q.pageSize,
      include: { photos: true, profile: { select: { id: true, name: true } } },
    });
  }

  async todayFeeding() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const rows = await this.prisma.record.findMany({
      where: { type: 'FEEDING', occurredAt: { gte: start } },
      include: { profile: { select: { id: true, name: true } }, photos: true },
      orderBy: { occurredAt: 'desc' },
    });
    return {
      count: rows.length,
      profiles: [...new Set(rows.map((r) => r.profile.name))],
      items: rows,
    };
  }

  async update(id: string, dto: Partial<CreateRecordDto>) {
    // 防越权：归属字段只读（虽然 DTO 已删，Partial 展开仍可能带进来）
    delete (dto as Record<string, unknown>).authorId;
    // subTypes：DTO 是数组、列是逗号串 —— 与 create 的 toData() 同一套转换口径
    // （2026-10-10 修类型错：直接展开 DTO 会把数组塞进 String 列，watch 重编译才暴露）
    const { subTypes, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest, version: { increment: 1 } };
    if (subTypes !== undefined) {
      data.subTypes =
        subTypes.filter((t, i, a) => t !== dto.type && a.indexOf(t) === i).join(',') || undefined;
    }
    return this.prisma.record.update({ where: { id }, data });
  }
}
