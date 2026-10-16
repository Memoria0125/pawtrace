import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PhoneCodeDto } from './dto/phone-code.dto';
import { BindPhoneDto } from './dto/bind-phone.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ok } from '../../common/api';
import { Public } from '../../common/public.decorator';
import { CurrentUid } from '../../common/current-uid.decorator';

/**
 * 认证模块 —— 对应 PRD「用户登录/注册」
 * 2026-10-06 起：手机号+密码账号体系（注册即强制绑定手机号）。
 * 原 deviceId 匿名登录已下线（deviceId 字段仅保留给历史演示数据）。
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** S0-注册：验证码校验 → 建号绑手机 → 直接发 token（注册即登录） */
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return ok(await this.auth.register(dto), '注册成功');
  }

  /** S0-登录：手机号 + 密码 */
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return ok(await this.auth.loginByPassword(dto.phone, dto.password));
  }

  /** 发送手机验证码（公开——注册/换绑前尚未登录） */
  @Public()
  @Post('phone-code')
  async phoneCode(@Body() dto: PhoneCodeDto) {
    const { code } = await this.auth.sendPhoneCode(dto.phone);
    // 演示环境无短信通道：验证码直接随 data 返回，前端弹提示引导填写
    return ok({ code }, '验证码已发送（演示环境）');
  }

  /** 校验验证码并把手机号绑定到当前账号（需登录，uid 取自 JWT；已绑即换绑） */
  @Post('bind-phone')
  async bindPhone(@CurrentUid() uid: string, @Body() dto: BindPhoneDto) {
    return ok(await this.auth.bindPhone(uid, dto.phone, dto.code), '绑定成功');
  }
}
