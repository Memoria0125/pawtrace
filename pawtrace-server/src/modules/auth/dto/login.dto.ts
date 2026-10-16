import { IsString, Length, Matches } from 'class-validator';

/** 密码登录（2026-10-06 密码账号体系）：手机号 + 密码 */
export class LoginDto {
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @IsString()
  @Length(1, 20)
  password!: string;
}
