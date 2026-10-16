import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../modules/auth/auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * 全局 JWT 守卫（2026-10-02 阶段2 真联调）：
 * - 所有路由默认要求 Authorization: Bearer <token>
 * - @Public() 标记的路由放行（登录/注册等）
 * - 校验通过后把 { uid } 挂到 request.user，controller 用 @CurrentUid() 取
 * - 无 token / 过期 / 伪造 → 401（前端 api.ts 收到后清 token 跳登录页）
 *
 * 2026-10-08 晚（游客模式）**公开路由也做「尽力解析」**：
 *   带了 token 就顺手 verify 并写入 request.user，解析失败按游客处理、照样放行。
 *   否则 @Public 的只读接口在登录态下会拿不到 uid —— 小组列表就会把「已加入/审核中」
 *   全判成 none（已实际踩到：小鹿登录后搜索列表 4 个组全显示「申请加入」）。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const header: string = request.headers['authorization'] ?? '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (isPublic) {
      // 公开路由：有 token 尽力解析（让登录用户看公开页也能带上自己的状态），失败不拦
      if (bearer) {
        try {
          request.user = await this.auth.verify(bearer);
        } catch {
          /* token 失效/伪造 → 按游客放行 */
        }
      }
      return true;
    }

    if (!bearer) throw new UnauthorizedException('未登录');

    // verify 失败（过期/伪造）时抛 UnauthorizedException
    request.user = await this.auth.verify(bearer);
    return true;
  }
}
