import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, static as serveStatic, urlencoded } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // bodyParser:false → 手动挂 express 解析器，放开 body 限制（AI 识别/图片上传直传 base64，默认 100kb 不够）
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '12mb' }));
  app.use(urlencoded({ limit: '12mb', extended: true }));

  // CORS 必须先于静态服务注册（中间件按注册顺序匹配）：否则 /uploads 响应不带 ACAO 头，
  // H5 前端 fetch 前端图（toBase64 预读、<image> 无碍但 fetch 全挂 CORS）
  app.enableCors(); // 开发期放开跨域，上线收紧为 App 域名

  // 上传文件静态服务（Photo.url 存相对路径 /uploads/...，前端 assetUrl 拼后端 origin）
  app.use('/uploads', serveStatic(join(process.cwd(), 'uploads'), { maxAge: '30d', immutable: true }));

  // 全局前缀：App 端统一请求 /api/xxx
  app.setGlobalPrefix('api');

  // 全局入参校验（DTO 用 class-validator 装饰）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 剔除 DTO 未声明的字段
      transform: true, // 自动类型转换（query 里的数字等）
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🐾 PawTrace server running on http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
