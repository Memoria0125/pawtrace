import { IsString, Matches } from 'class-validator';

/** P1 手机号绑定：请求验证码（演示环境无短信通道，验证码直接随响应返回） */
export class PhoneCodeDto {
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;
}
