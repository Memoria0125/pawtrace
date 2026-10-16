import { SetMetadata } from '@nestjs/common';

/**
 * 公开接口标记：加在不需要登录的端点上（如 auth/device）。
 * 全局 JwtAuthGuard 会跳过带此标记的路由。
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
