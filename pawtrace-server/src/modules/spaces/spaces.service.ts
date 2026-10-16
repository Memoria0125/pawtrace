import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSpaceDto } from './dto/create-space.dto';

/** 列表/详情通用的 include（组长 + 成员/猫咪计数） */
const LIST_INCLUDE = {
  owner: { select: { id: true, nickname: true, avatarUrl: true } },
  _count: { select: { members: true, profiles: true } },
} as const;

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 阶段2：ownerId 一律来自 JWT uid */
  async create(dto: CreateSpaceDto, uid: string) {
    return this.prisma.space.create({
      data: {
        name: dto.name,
        description: dto.description,
        tags: dto.tags,
        community: dto.community,
        lat: dto.lat,
        lng: dto.lng,
        ownerId: uid,
        inviteCode: this.genCode(),
        members: { create: { userId: uid, role: 'OWNER' } },
      },
      include: LIST_INCLUDE,
    });
  }

  private genCode() {
    // 6 位数字字母邀请码，冲突时 Prisma unique 会报错重试
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  async mine(uid: string) {
    return this.prisma.spaceMember.findMany({
      where: { userId: uid },
      include: { space: { include: { _count: { select: { members: true, profiles: true } } } } },
    });
  }

  /**
   * S10-1 / S16：小组检索
   * - code 非空 → 按邀请码精确查找（原有语义，返回单个）
   * - code 为空 → 返回公开小组列表（列表页用），带组长 / 成员数 / 猫咪数 / 我的状态
   * - keyword → 按名称 / 小区 / 标签模糊过滤（列表页搜索框）
   * - uid 为空（游客态，@Public）→ 全部按 none 处理，跳过三张用户态查询
   */
  async search(code: string | undefined, uid: string | undefined, keyword?: string) {
    if (code) {
      const space = await this.prisma.space.findUnique({
        where: { inviteCode: code },
        include: LIST_INCLUDE,
      });
      if (!space) throw new NotFoundException('邀请码无效');
      return space;
    }

    // myState：member（已加入）/ pending（申请审核中）/ rejected（被拒过，可重申）/ none
    // pendingCount：本人任组长的小组的待审批数（列表页角标用；非组长恒 0）
    const list = await this.prisma.space.findMany({
      where: keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { community: { contains: keyword } },
              { tags: { contains: keyword } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'asc' },
      take: 20,
      include: LIST_INCLUDE,
    });

    // 游客：没有任何「我的状态」，全部 none（不查用户态三张表）
    if (!uid) return list.map((s) => ({ ...s, myState: 'none', pendingCount: 0 }));

    const [myMembers, myReqs, myOwnedPending] = await Promise.all([
      this.prisma.spaceMember.findMany({ where: { userId: uid }, select: { spaceId: true } }),
      this.prisma.spaceJoinRequest.findMany({
        where: { userId: uid },
        select: { spaceId: true, status: true },
      }),
      this.prisma.spaceJoinRequest.findMany({
        where: { status: 'PENDING', space: { ownerId: uid } },
        select: { spaceId: true },
      }),
    ]);
    const joined = new Set(myMembers.map((m) => m.spaceId));
    const pendingMap = new Map<string, number>();
    for (const r of myOwnedPending) pendingMap.set(r.spaceId, (pendingMap.get(r.spaceId) ?? 0) + 1);
    const stateOf = (spaceId: string): string => {
      if (joined.has(spaceId)) return 'member';
      const req = myReqs.find((r) => r.spaceId === spaceId);
      if (req?.status === 'PENDING') return 'pending';
      if (req?.status === 'REJECTED') return 'rejected';
      return 'none';
    };
    return list.map((s) => ({
      ...s,
      myState: stateOf(s.id),
      pendingCount: pendingMap.get(s.id) ?? 0,
    }));
  }

  /** S10-1「我的申请」条：当前用户的入组申请（含小组摘要） */
  async myRequests(uid: string) {
    return this.prisma.spaceJoinRequest.findMany({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      include: { space: { select: { id: true, name: true, inviteCode: true } } },
    });
  }

  /**
   * 小组详情（B 页）：完整简介 + 统计（成员/猫咪/打卡总数/小区）+ 看板摘要 + 按钮四态
   * myRequestId 供「撤销申请」用
   * uid 为空（游客态，@Public）→ myState = 'none'，不查成员/申请两张表
   */
  async detail(id: string, uid?: string) {
    const space = await this.prisma.space.findUnique({ where: { id }, include: LIST_INCLUDE });
    if (!space) throw new NotFoundException('小组不存在');

    const [checkins, myMember, myReq, recentRecords] = await Promise.all([
      // 打卡总数 = 小组内所有猫咪的痕迹记录数
      this.prisma.record.count({
        where: { profile: { spaceBindings: { some: { spaceId: id } } } },
      }),
      uid
        ? this.prisma.spaceMember.findUnique({
            where: { spaceId_userId: { spaceId: id, userId: uid } },
          })
        : Promise.resolve(null),
      uid
        ? this.prisma.spaceJoinRequest.findUnique({
            where: { spaceId_userId: { spaceId: id, userId: uid } },
          })
        : Promise.resolve(null),
      // 看板摘要：最近 3 条（未加入只能看摘要，前端控制展示形态）
      this.prisma.record.findMany({
        where: { profile: { spaceBindings: { some: { spaceId: id } } } },
        orderBy: { occurredAt: 'desc' },
        take: 3,
        select: {
          id: true,
          type: true,
          // 2026-10-10 晚：前端一直在读 r.subTypes（多类型标签「投喂 + 点位」），
          // 这里漏了 select → 附加标签永远为空。纯补字段，不改响应口径。
          subTypes: true,
          content: true,
          occurredAt: true,
          profile: { select: { name: true } },
        },
      }),
    ]);

    const myState = myMember
      ? 'member'
      : myReq?.status === 'PENDING'
        ? 'pending'
        : myReq?.status === 'REJECTED'
          ? 'rejected'
          : 'none';

    // myRole（2026-10-10）：小组猫咪「组员可添加、组长独占移除」前端门控用；
    // 游客/未加入 → null（前端不显示任何管理入口）。
    return {
      ...space,
      checkins,
      recentRecords,
      myState,
      myRequestId: myReq?.id ?? null,
      myRole: myMember?.role ?? null,
    };
  }

  /**
   * 推荐附近小组：以用户最近一条有坐标的档案位置为"我的位置"，
   * 按小组活动中心坐标算距离排序；无坐标数据时返回不了 → 空数组（前端隐藏该栏）
   * uid 为空（游客态，@Public）→ 没有「我的位置」→ 空数组
   */
  async nearby(uid?: string) {
    if (!uid) return { refDesc: '以你最近观察的猫咪位置为基准', items: [] };
    const myProfile = await this.prisma.profile.findFirst({
      where: {
        lastSeenLat: { not: null },
        lastSeenLng: { not: null },
        OR: [{ creatorId: uid }, { observations: { some: { userId: uid } } }],
      },
      orderBy: { lastSeenAt: 'desc' },
      select: { lastSeenLat: true, lastSeenLng: true },
    });
    if (!myProfile?.lastSeenLat || !myProfile?.lastSeenLng) return [];

    const [spaces, myMembers, myReqs] = await Promise.all([
      this.prisma.space.findMany({
        where: { lat: { not: null }, lng: { not: null } },
        include: LIST_INCLUDE,
      }),
      this.prisma.spaceMember.findMany({ where: { userId: uid }, select: { spaceId: true } }),
      this.prisma.spaceJoinRequest.findMany({
        where: { userId: uid, status: 'PENDING' },
        select: { spaceId: true },
      }),
    ]);
    const joined = new Set(myMembers.map((m) => m.spaceId));
    const pending = new Set(myReqs.map((r) => r.spaceId));

    const withDist = spaces
      .map((s) => ({
        id: s.id,
        name: s.name,
        tags: s.tags,
        community: s.community,
        inviteCode: s.inviteCode,
        owner: s.owner,
        _count: s._count,
        distance: haversine(myProfile.lastSeenLat!, myProfile.lastSeenLng!, s.lat!, s.lng!),
        myState: joined.has(s.id) ? 'member' : pending.has(s.id) ? 'pending' : 'none',
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    return { refDesc: '以你最近观察的猫咪位置为基准', items: withDist };
  }

  async join(spaceId: string, uid: string, message?: string) {
    // upsert：被拒过（REJECTED）重申 → 状态翻回 PENDING（详情页状态 4）
    return this.prisma.spaceJoinRequest.upsert({
      where: { spaceId_userId: { spaceId, userId: uid } },
      create: { spaceId, userId: uid, message },
      update: { status: 'PENDING', message },
    });
  }

  /** 撤销申请：只能撤自己的 PENDING 申请；撤销后记录删除（myState 回到 none） */
  async cancelRequest(reqId: string, uid: string) {
    const req = await this.prisma.spaceJoinRequest.findUnique({ where: { id: reqId } });
    if (!req || req.userId !== uid) throw new NotFoundException('申请不存在');
    if (req.status !== 'PENDING') throw new BadRequestException('该申请已处理，无法撤销');
    await this.prisma.spaceJoinRequest.delete({ where: { id: reqId } });
    return { cancelled: true };
  }

  /** 组长身份校验（审批/看板等OWNER专属操作） */
  private async assertOwner(spaceId: string, uid: string) {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { ownerId: true },
    });
    if (!space) throw new NotFoundException('小组不存在');
    if (space.ownerId !== uid) throw new ForbiddenException('仅组长可操作');
  }

  /**
   * S10-3 审批页（OWNER）：待审批列表 + 最近已处理记录
   * user 带 records/profiles 计数（申请卡的「投喂记录 N 条 · 建立档案 N 只」）
   */
  async joinRequests(spaceId: string, uid: string) {
    await this.assertOwner(spaceId, uid);
    const [pending, history] = await Promise.all([
      this.prisma.spaceJoinRequest.findMany({
        where: { spaceId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
              _count: { select: { records: true, profiles: true } },
            },
          },
        },
      }),
      this.prisma.spaceJoinRequest.findMany({
        where: { spaceId, status: { not: 'PENDING' } },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        include: { user: { select: { id: true, nickname: true } } },
      }),
    ]);
    return { pending, history };
  }

  /** S10-3 审批（OWNER）：通过 → 建 member（幂等）；拒绝 → 状态置 REJECTED */
  async review(reqId: string, approve: boolean, uid: string) {
    const req = await this.prisma.spaceJoinRequest.findUnique({
      where: { id: reqId },
      include: { space: { select: { ownerId: true } } },
    });
    if (!req) throw new NotFoundException('申请不存在');
    if (req.space.ownerId !== uid) throw new ForbiddenException('仅组长可审批');
    if (req.status !== 'PENDING') throw new BadRequestException('该申请已处理');

    const updated = await this.prisma.spaceJoinRequest.update({
      where: { id: reqId },
      data: { status: approve ? 'APPROVED' : 'REJECTED' },
    });
    if (approve) {
      // upsert 幂等：重复通过/曾是成员不会撞唯一键
      await this.prisma.spaceMember.upsert({
        where: { spaceId_userId: { spaceId: req.spaceId, userId: req.userId } },
        create: { spaceId: req.spaceId, userId: req.userId },
        update: {},
      });
    }
    return updated;
  }

  /**
   * S10 看板（成员专属）：统计三宫格 + 绝育覆盖率 + 最近协作
   * 非成员 403 → 前端保留 DEMO 撑版（设计稿演示数据）
   */
  async board(spaceId: string, uid: string) {
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      include: LIST_INCLUDE,
    });
    if (!space) throw new NotFoundException('小组不存在');
    const myMember = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: uid } },
    });
    if (!myMember) throw new ForbiddenException('加入小组后可查看看板');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [members, sterilized, monthRecords, recents] = await Promise.all([
      this.prisma.spaceMember.findMany({
        where: { spaceId },
        orderBy: { joinedAt: 'asc' },
        take: 3,
        select: { user: { select: { nickname: true } } },
      }),
      this.prisma.spaceProfile.count({
        where: { spaceId, profile: { sterilizationStatus: 'STERILIZED' } },
      }),
      this.prisma.record.count({
        where: {
          profile: { spaceBindings: { some: { spaceId } } },
          occurredAt: { gte: monthStart },
        },
      }),
      this.prisma.record.findMany({
        where: { profile: { spaceBindings: { some: { spaceId } } } },
        orderBy: { occurredAt: 'desc' },
        take: 3,
        select: {
          type: true,
          occurredAt: true,
          author: { select: { nickname: true } },
          profile: { select: { name: true } },
        },
      }),
    ]);

    const catCount = space._count.profiles;
    const coverage = catCount > 0 ? Math.round((sterilized / catCount) * 100) : 0;
    return {
      id: space.id,
      name: space.name,
      community: space.community,
      memberCount: space._count.members,
      catCount,
      sterilized,
      monthRecords,
      coverage,
      members: members.map((m) => ({ initial: m.user.nickname.slice(0, 1) || '友' })),
      recents: recents.map((r) => ({
        text: `${r.author.nickname} ${ACTION_LABEL[r.type]}「${r.profile.name}」`,
        occurredAt: r.occurredAt,
      })),
    };
  }

  async profiles(spaceId: string) {
    return this.prisma.spaceProfile.findMany({
      where: { spaceId },
      include: { profile: { include: { avatarPhoto: true } } },
    });
  }

  /**
   * 组员把猫拉进小组（2026-10-10，用户定案：**所有成员都可添加**）
   * 权限：spaceMember 存在即可（组长也是成员，天然可添加）
   * 幂等：已在组 → upsert 空更新直接返回成功（重复点按不报错）
   */
  async addProfile(spaceId: string, uid: string, profileId: string) {
    const [space, member, profile] = await Promise.all([
      this.prisma.space.findUnique({ where: { id: spaceId }, select: { id: true } }),
      this.prisma.spaceMember.findUnique({
        where: { spaceId_userId: { spaceId, userId: uid } },
      }),
      this.prisma.profile.findUnique({ where: { id: profileId }, select: { id: true, name: true } }),
    ]);
    if (!space) throw new NotFoundException('小组不存在');
    if (!member) throw new ForbiddenException('加入小组后才能添加猫咪');
    if (!profile) throw new NotFoundException('档案不存在');
    await this.prisma.spaceProfile.upsert({
      where: { spaceId_profileId: { spaceId, profileId } },
      update: {},
      create: { spaceId, profileId },
    });
    return { profileId, name: profile.name };
  }

  /**
   * 把猫移出小组（2026-10-10，用户定案：**仅组长可移除** —— 成员添加的猫也只有组长能撤，
   * 防止互相删来删去；要撤就找组长，组内口径统一）
   */
  async removeProfile(spaceId: string, uid: string, profileId: string) {
    const member = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: uid } },
    });
    if (!member || member.role !== 'OWNER') throw new ForbiddenException('只有组长可以移除猫咪');
    const exist = await this.prisma.spaceProfile.findUnique({
      where: { spaceId_profileId: { spaceId, profileId } },
    });
    if (!exist) throw new NotFoundException('这只猫不在小组里');
    await this.prisma.spaceProfile.delete({
      where: { spaceId_profileId: { spaceId, profileId } },
    });
    return { profileId };
  }

  /**
   * 小组成员名单（公开 2026-10-08）
   * 字段：user { id/nickname/avatarUrl } + role/joinedAt + **组内**投喂/档案计数
   * 排序：组长在前，其余按 joinedAt 升序
   * ⚠️ 计数口径：只数「本组的猫咪」下的记录（不是该用户的全局总数），
   *    否则小鹿会显示 9 条投喂——跨组累计，与「小组详情」语境不符。
   */
  async members(spaceId: string) {
    const rows = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    });
    // 组内猫咪 id 集合 → 两个分组计数
    const catIds = (
      await this.prisma.spaceProfile.findMany({
        where: { spaceId },
        select: { profileId: true },
      })
    ).map((b) => b.profileId);

    const [recGroups, profGroups] = await Promise.all([
      this.prisma.record.groupBy({
        by: ['authorId'],
        where: { profileId: { in: catIds } },
        _count: { _all: true },
      }),
      this.prisma.profile.groupBy({
        by: ['creatorId'],
        where: { id: { in: catIds } },
        _count: { _all: true },
      }),
    ]);
    const recMap = new Map(recGroups.map((g) => [g.authorId, g._count._all]));
    const profMap = new Map(profGroups.map((g) => [g.creatorId, g._count._all]));

    return rows.map((m) => ({
      userId: m.userId,
      nickname: m.user.nickname,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      joinedAt: m.joinedAt,
      recordCount: recMap.get(m.userId) ?? 0,
      profileCount: profMap.get(m.userId) ?? 0,
    }));
  }

  /**
   * 小组打卡全量列表（公开 2026-10-08）
   * 字段：record { id/type/subTypes/season/content/occurredAt/locDesc/photos } + profile + author
   * 排序：occurredAt desc
   *
   * 2026-10-10 晚：补 subTypes / season / photos —— 打卡卡点开后的「记录详情浮层」
   * （components/paw-record-detail）要展示多类型标签、季节与照片，而这些字段列表接口原样返回
   * 就能让浮层**零新请求**（同 S5 时间轴 / S13 观察史的做法）。
   * ⚠️ 刻意**不**下发 lat/lng：本接口是 @Public（游客可读），精确到 4 位小数的坐标
   *    对别人的记录属于过度暴露；详情里只展示文字点位 locDesc。
   */
  async records(spaceId: string) {
    const rows = await this.prisma.record.findMany({
      where: { profile: { spaceBindings: { some: { spaceId } } } },
      orderBy: { occurredAt: 'desc' },
      select: {
        id: true,
        type: true,
        subTypes: true,
        season: true,
        content: true,
        occurredAt: true,
        locDesc: true,
        photos: { select: { id: true, url: true } },
        profile: {
          select: { id: true, name: true, coatColor: true, lastSeenDesc: true, avatarPhoto: { select: { url: true } } },
        },
        author: { select: { id: true, nickname: true } },
      },
    });
    return rows;
  }
}

/** 街区级粗算距离（米），够"附近推荐"排序与展示用 */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
}

/** 看板「最近协作」的动作短句（对齐设计稿 p12 的文案风格） */
const ACTION_LABEL: Record<string, string> = {
  APPEARANCE: '记录了',
  LOCATION: '更新了位置',
  HEALTH: '记录了健康',
  FEEDING: '投喂了',
  SEASON: '记录了季节',
  DEVICE: '记录了',
};
