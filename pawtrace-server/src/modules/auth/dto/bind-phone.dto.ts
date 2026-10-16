import { IsString, Matches, Length } from 'class-validator';

/** P1 手机号绑定：校验验证码并绑定到当前登录用户（uid 取自 JWT） */
export class BindPhoneDto {
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @IsString()
  @Length(4, 6)
  code!: string;
}
