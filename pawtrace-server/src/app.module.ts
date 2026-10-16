import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { RecordsModule } from './modules/records/records.module';
import { UploadModule } from './modules/upload/upload.module';
import { SyncModule } from './modules/sync/sync.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { AiModule } from './modules/ai/ai.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';

@Module({
  imports: [
    // .env 配置加载
    ConfigModule.forRoot({ isGlobal: true }),
    // 全局基础限流；AI 模块内部还有按用户限流
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 120 },
    ]),
    PrismaModule,
    AuthModule,
    ProfilesModule,
    RecordsModule,
    UploadModule,
    SyncModule,
    SpacesModule,
    AiModule,
  ],
  providers: [
    // 全局 JWT 守卫：默认所有路由需登录；@Public() 放行（阶段2 真联调）
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
