import { IsOptional, IsString, Length, Matches } from 'class-validator';

/** 注册（2026-10-06 密码账号体系）：手机号 + 短信验证码 + 密码 + 昵称，注册即绑定手机号 */
export class RegisterDto {
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  /** 短信验证码（演示环境由 /auth/phone-code 返回） */
  @Length(4, 6)
  code!: string;

  /** 密码：至少 6 位（与注册页占位文案「至少 6 位，字母或数字」一致） */
  @IsString()
  @Length(6, 20, { message: '密码需 6-20 位' })
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 20, { message: '昵称需 1-20 字' })
  nickname?: string;
}
