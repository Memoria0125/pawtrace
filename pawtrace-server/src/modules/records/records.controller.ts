import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RecordsService } from './records.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { QueryRecordsDto } from './dto/query-records.dto';
import { ok } from '../../common/api';
import { CurrentUid } from '../../common/current-uid.decorator';

/**
 * 痕迹记录模块 —— F2.2 记录 / F2.3 投喂
 * 对应线框：S9 记录痕迹、S10 今日投喂、S13 观察史
 * 阶段2（2026-10-02）：authorId 一律取自 JWT，不再信任前端传参
 */
@Controller('records')
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  /** S9：新增痕迹记录（外貌/点位/健康/投喂/季节） */
  @Post()
  async create(@CurrentUid() uid: string, @Body() dto: CreateRecordDto) {
    return ok(await this.records.create(dto, uid), '记录已保存');
  }

  /** S13 观察史：当前登录用户的记录列表（跨档案） */
  @Get()
  async list(@CurrentUid() uid: string, @Query() q: QueryRecordsDto) {
    return ok(await this.records.list(q, uid));
  }

  /** S10：今日投喂汇总（统计口径：occurredAt 在今天且 type=FEEDING） */
  @Get('today-feeding')
  async todayFeeding() {
    return ok(await this.records.todayFeeding());
  }

  /** S3 首页三宫格（2026-10-07，本人口径）：今日记录数 + 我去过的点位去重数 */
  @Get('stats')
  async stats(@CurrentUid() uid: string) {
    return ok(await this.records.myStats(uid));
  }

  /** 离线补传：草稿记录批量提交（幂等，按 id upsert） */
  @Post('batch')
  async batchCreate(@CurrentUid() uid: string, @Body() dtos: CreateRecordDto[]) {
    return ok(await this.records.batchUpsert(dtos, uid), '补传完成');
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateRecordDto>) {
    return ok(await this.records.update(id, dto), '已更新');
  }
}
