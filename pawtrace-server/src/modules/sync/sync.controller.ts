import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncPushDto } from './dto/sync-push.dto';
import { ok } from '../../common/api';
import { CurrentUid } from '../../common/current-uid.decorator';

/**
 * 离线同步模块 —— PRD 9.5
 * 策略：updated_at + version，last-write-wins（不做 CRDT）
 * 拉：客户端带 lastSyncAt → 返回增量
 * 推：草稿/变更批量 upsert，冲突按 version 大者胜
 * 阶段2（2026-10-02）：uid 取自 JWT
 */
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  /** 增量拉取：profiles + records 中我创建的数据 */
  @Get('pull')
  async pull(@CurrentUid() uid: string, @Query('since') since: string) {
    return ok(await this.sync.pull(uid, since));
  }

  /** 批量推送本地变更（离线草稿补传） */
  @Post('push')
  async push(@CurrentUid() uid: string, @Body() dto: SyncPushDto) {
    return ok(await this.sync.push(dto, uid));
  }
}
