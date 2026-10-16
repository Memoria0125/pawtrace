import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncPushDto } from './dto/sync-push.dto';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async pull(uid: string, since: string) {
    const sinceAt = since ? new Date(since) : new Date(0);
    const [profiles, records] = await Promise.all([
      this.prisma.profile.findMany({
        where: { updatedAt: { gt: sinceAt }, creatorId: uid },
      }),
      this.prisma.record.findMany({
        where: { updatedAt: { gt: sinceAt }, authorId: uid },
      }),
    ]);
    return {
      serverTime: new Date().toISOString(), // 客户端存为下次的 lastSyncAt
      profiles,
      records,
    };
  }

  /** 阶段2：uid 来自 JWT；push 的宽松 any[] 强制归属当前用户，防越权覆盖他人数据 */
  async push(dto: SyncPushDto, uid: string) {
    // last-write-wins：服务端 version 更大则拒绝覆盖，返回冲突项让客户端用服务端版
    const conflicts: string[] = [];
    const accepted = { profiles: 0, records: 0 };

    for (const p of dto.profiles ?? []) {
      const owned = { ...p, creatorId: uid };
      const existing = p.id
        ? await this.prisma.profile.findUnique({ where: { id: p.id } })
        : null;
      if (existing && existing.version >= (p.version ?? 1)) {
        conflicts.push(p.id!);
        continue;
      }
      await this.prisma.profile.upsert({
        where: { id: p.id ?? '' },
        create: { ...owned, id: p.id ?? undefined },
        update: { ...owned, version: { increment: 1 } },
      });
      accepted.profiles++;
    }

    for (const r of dto.records ?? []) {
      const owned = { ...r, authorId: uid };
      const existing = r.id
        ? await this.prisma.record.findUnique({ where: { id: r.id } })
        : null;
      if (existing && existing.version >= (r.version ?? 1)) {
        conflicts.push(r.id!);
        continue;
      }
      await this.prisma.record.upsert({
        where: { id: r.id ?? '' },
        create: { ...owned, id: r.id ?? undefined, occurredAt: new Date() },
        update: { ...owned, version: { increment: 1 } },
      });
      accepted.records++;
    }

    return { accepted, conflicts, serverTime: new Date().toISOString() };
  }
}
