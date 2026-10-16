import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 取当前登录用户 uid（JWT payload 里的 uid，由 JwtAuthGuard 写入 request.user）。
 * 用法：async create(@CurrentUid() uid: string, @Body() dto: XxDto) {}
 */
export const CurrentUid = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.uid as string;
  },
);
