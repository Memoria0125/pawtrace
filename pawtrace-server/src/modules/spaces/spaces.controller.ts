import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { AddSpaceProfileDto } from './dto/add-space-profile.dto';
import { ok } from '../../common/api';
import { CurrentUid } from '../../common/current-uid.decorator';
import { Public } from '../../common/public.decorator';

/**
 * 协作空间模块 —— F5.1 / F5.2 / F5.3
 * 对应线框：S12 协作空间、S15 小组列表、S16 申请协作、S17 协作申请（审批）
 * 阶段2（2026-10-02）：ownerId / uid 一律取自 JWT
 *
 * 2026-10-08 晚（游客可浏览）：小组列表 / 推荐附近 / 小组详情 三个**只读**接口
 * 标记为 @Public —— 退出登录或新注册账号也能看到公开互助小组与猫咪；
 * 此时 uid 为空，服务层按「游客」降级（myState=none / pendingCount=0 / nearby 空）。
 * 写入类接口（建组 / 申请 / 审批 / 看板）保持鉴权。
 */
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  /** 创建小组（同时成为 OWNER） */
  @Post()
  async create(@CurrentUid() uid: string, @Body() dto: CreateSpaceDto) {
    return ok(await this.spaces.create(dto, uid), '小组已创建');
  }

  /** S15：我的小组列表 */
  @Get('mine')
  async mine(@CurrentUid() uid: string) {
    return ok(await this.spaces.mine(uid));
  }

  /** S10-1 公开小组列表（code 空/带关键字）/ S16 凭邀请码搜索小组（code 非空） */
  @Public()
  @Get('search')
  async search(
    @CurrentUid() uid: string,
    @Query('code') code?: string,
    @Query('keyword') keyword?: string,
  ) {
    return ok(await this.spaces.search(code, uid, keyword));
  }

  /** S10-1「我的申请」条：当前用户的入组申请 */
  @Get('my-requests')
  async myRequests(@CurrentUid() uid: string) {
    return ok(await this.spaces.myRequests(uid));
  }

  /** S10-1 推荐附近小组（按最近观察猫咪的位置算距离）；游客无「我的位置」→ 空数组 */
  @Public()
  @Get('nearby')
  async nearby(@CurrentUid() uid: string) {
    return ok(await this.spaces.nearby(uid));
  }

  /** B 页：小组详情（完整简介 + 统计 + 看板摘要 + 按钮四态）；游客 myState=none */
  @Public()
  @Get(':id')
  async detail(@CurrentUid() uid: string, @Param('id') id: string) {
    return ok(await this.spaces.detail(id, uid));
  }

  /** 撤销我的入组申请（仅 PENDING 可撤） */
  @Delete('join-requests/:reqId')
  async cancelRequest(@CurrentUid() uid: string, @Param('reqId') reqId: string) {
    return ok(await this.spaces.cancelRequest(reqId, uid), '已撤销申请');
  }

  /** S16：提交入组申请 */
  @Post(':id/join')
  async join(@CurrentUid() uid: string, @Param('id') id: string, @Body() dto: { message?: string }) {
    return ok(await this.spaces.join(id, uid, dto.message), '申请已提交');
  }

  /** S17：审批（OWNER） */
  @Patch('join-requests/:reqId')
  async review(
    @CurrentUid() uid: string,
    @Param('reqId') reqId: string,
    @Body() dto: { approve: boolean },
  ) {
    return ok(await this.spaces.review(reqId, dto.approve, uid), dto.approve ? '已通过' : '已拒绝');
  }

  /** S17：小组的待审批列表 + 最近已处理（OWNER） */
  @Get(':id/join-requests')
  async joinRequests(@CurrentUid() uid: string, @Param('id') id: string) {
    return ok(await this.spaces.joinRequests(id, uid));
  }

  /** S10：协作看板数据（成员专属；非成员 403，前端回退 DEMO 撑版） */
  @Get(':id/board')
  async board(@CurrentUid() uid: string, @Param('id') id: string) {
    return ok(await this.spaces.board(id, uid));
  }

  /** 小组内的共享档案列表（公开：游客从小组详情的「猫咪」格点进来可看） */
  @Public()
  @Get(':id/profiles')
  async profiles(@Param('id') id: string) {
    return ok(await this.spaces.profiles(id));
  }

  /**
   * 组员把猫拉进小组（2026-10-10 用户定案：所有成员可添加；幂等）
   * 候选清单由前端用 GET /profiles（我的观测对象 = 我建的 + 我关注的）自行求差
   */
  @Post(':id/profiles')
  async addProfile(
    @CurrentUid() uid: string,
    @Param('id') id: string,
    @Body() dto: AddSpaceProfileDto,
  ) {
    return ok(await this.spaces.addProfile(id, uid, dto.profileId), '已加入小组');
  }

  /** 把猫移出小组（2026-10-10 用户定案：仅组长可移除） */
  @Delete(':id/profiles/:profileId')
  async removeProfile(
    @CurrentUid() uid: string,
    @Param('id') id: string,
    @Param('profileId') profileId: string,
  ) {
    return ok(await this.spaces.removeProfile(id, uid, profileId), '已移出小组');
  }

  /**
   * 小组成员名单（公开：互助小组对小组成员公开透明；不要求鉴权/成员身份）
   * 2026-10-08 新增：供 S10-2 小组详情页「N 位成员」点击进入
   * 2026-10-08 晚：补 @Public —— 之前注释写着"公开"但实际仍被全局守卫拦成 401，
   *                游客点进二级列表直接空掉（这次加游客链路才暴露）
   */
  @Public()
  @Get(':id/members')
  async members(@Param('id') id: string) {
    return ok(await this.spaces.members(id));
  }

  /**
   * 小组打卡全量列表（公开：所有痕迹记录按时间倒序；未加入也可见摘要）
   * 2026-10-08 新增：供 S10-2 小组详情页「N 次打卡」点击进入
   * 2026-10-08 晚：补 @Public（同上）
   */
  @Public()
  @Get(':id/records')
  async records(@Param('id') id: string) {
    return ok(await this.spaces.records(id));
  }
}
