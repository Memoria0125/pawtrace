import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { QueryProfilesDto } from './dto/query-profiles.dto';
import { ok } from '../../common/api';
import { CurrentUid } from '../../common/current-uid.decorator';
import { Public } from '../../common/public.decorator';

/**
 * 个体档案模块 —— F1.1 建档 / F1.2 档案详情 / F1.4 观察史
 * 对应线框：S3 首页档案卡、S5 新增档案、S6 AI 识别建档、S7 档案详情
 * 阶段2（2026-10-02）：creatorId 取自 JWT，不再信任前端传参
 * 2026-10-08 晚：档案详情 / 时间轴两个只读接口 @Public（游客从协作空间点猫咪名字可看）
 */
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  /** S3 首页：档案列表（我的观测对象 = 我创建的 + 我关注的） */
  @Get()
  async list(@CurrentUid() uid: string, @Query() q: QueryProfilesDto) {
    return ok(await this.profiles.list(q, uid));
  }

  /** S5：新建档案 */
  @Post()
  async create(@CurrentUid() uid: string, @Body() dto: CreateProfileDto) {
    return ok(await this.profiles.create(dto, uid), '建档成功');
  }

  /** S2 附近点位（2026-10-07）：街区级模糊坐标的档案 + 观察者视角标记；
   *  ⚠️ 必须声明在 @Get(':id') 之前，否则 'nearby' 会被当作 id 匹配。
   *  2026-10-11：改 @Public（游客可浏览）——用户报障「未登录时地图页只有演示卡、点猫点点不出档案」：
   *  附近点位是只读浏览接口，与其他浏览接口（/profiles/:id、/timeline、/spaces/*）同口径；
   *  档案坐标本就是街区级模糊值，游客可读无隐私增量。游客态 mine/observed 恒 false（见 service）。 */
  @Public()
  @Get('nearby')
  async nearby(
    @CurrentUid() uid: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {    const n = (v?: string) => (v == null || v === '' ? undefined : Number(v));
    return ok(await this.profiles.nearby(uid, n(lat), n(lng)));
  }

  /** 今日相遇·盲盒（2026-10-07）：随机一只「别人建档 + 我未关注」的猫；⚠️ 同样须在 :id 之前 */
  @Get('blindbox')
  async blindbox(@CurrentUid() uid: string) {
    return ok(await this.profiles.blindbox(uid));
  }

  /** S4：档案详情（含建档人、我的关注态、最近记录摘要与展示聚合）；游客可看（mine/关注均 false） */
  @Public()
  @Get(':id')
  async detail(@CurrentUid() uid: string, @Param('id') id: string) {
    return ok(await this.profiles.detail(id, uid));
  }

  /** S7：更新档案（昵称/毛色/体型/特征/健康/绝育/点位）；仅建档人本人可改 */
  @Patch(':id')
  async update(
    @CurrentUid() uid: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateProfileDto>,
  ) {
    return ok(await this.profiles.update(id, dto, uid), '已更新');
  }

  /** F1.4：该档案的时间轴（S8 屏，按 occurredAt 倒序）；游客可看 */
  @Public()
  @Get(':id/timeline')
  async timeline(@Param('id') id: string, @Query('cursor') cursor?: string) {
    return ok(await this.profiles.timeline(id, cursor));
  }

  /** 认领/关注档案（我的观测对象） */
  @Post(':id/observe')
  async observe(@CurrentUid() uid: string, @Param('id') id: string) {
    return ok(await this.profiles.observe(id, uid), '已加入我的观察');
  }

  /** 取消关注（2026-10-07：S4 详情按钮切换用；不影响已写记录，只摘出观测对象列表） */
  @Delete(':id/observe')
  async unobserve(@CurrentUid() uid: string, @Param('id') id: string) {
    return ok(await this.profiles.unobserve(id, uid), '已取消关注');
  }
}
