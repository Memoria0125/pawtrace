import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/** 发送验证码的内存暂存（单实例够用；多实例部署需换 Redis） */
interface CodeEntry {
  code: string;
  expiresAt: number;
  lastSentAt: number;
}

@Injectable()
export class AuthService {
  /** phone → 验证码条目（演示环境无短信通道，验证码随响应返回给前端提示） */
  private readonly phoneCodes = new Map<string, CodeEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ---------- 密码哈希（crypto.scrypt，免第三方依赖） ----------

  private hashPassword(password: string): string {
    const salt = randomBytes(8).toString('hex');
    return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
  }

  private verifyPassword(password: string, stored: string | null): boolean {
    if (!stored || !stored.includes(':')) return false;
    const [salt, hash] = stored.split(':');
    const calc = scryptSync(password, salt, 32);
    const expect = Buffer.from(hash, 'hex');
    return calc.length === expect.length && timingSafeEqual(calc, expect);
  }

  private signSession(
    user: {
      id: string;
      nickname: string;
      avatarUrl: string | null;
      phone: string | null;
      createdAt: Date;
    },
  ) {
    return this.jwt.signAsync({ uid: user.id }).then((token) => ({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        // 「我的」页等级胶囊「温柔观测者 · N 天」用：注册至今的天数
        createdAt: user.createdAt,
      },
    }));
  }

  /**
   * 注册（2026-10-06 密码账号体系）：验证码校验 → 建号（手机号即账号，强制绑定）→ 发 token。
   * 旧 deviceId 匿名登录已下线；deviceId 字段仅保留给历史演示数据。
   */
  async register(input: { phone: string; code: string; password: string; nickname?: string }) {
    const entry = this.phoneCodes.get(input.phone);
    if (!entry || entry.code !== input.code || Date.now() > entry.expiresAt) {
      throw new BadRequestException('验证码错误或已过期');
    }
    const existing = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    if (existing) {
      throw new ConflictException('该手机号已注册，请直接登录');
    }
    const user = await this.prisma.user.create({
      data: {
        phone: input.phone,
        passwordHash: this.hashPassword(input.password),
        nickname: input.nickname || '观察者',
      },
    });
    this.phoneCodes.delete(input.phone); // 注册成功即失效，防重放
    return this.signSession(user);
  }

  /** 密码登录：手机号 + 密码换取 token */
  async loginByPassword(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('手机号或密码不正确');
    }
    return this.signSession(user);
  }

  /** 从 token 解析 uid（Guard 会调用；骨架期先暴露简单实现） */
  async verify(token: string): Promise<{ uid: string }> {
    try {
      return await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
  }

  /** P1：发送手机验证码（60s 防刷 + 5min 有效；演示环境验证码直接返回） */
  async sendPhoneCode(phone: string) {
    const now = Date.now();
    const prev = this.phoneCodes.get(phone);
    if (prev && now - prev.lastSentAt < 60_000) {
      throw new BadRequestException('发送太频繁，请 1 分钟后再试');
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.phoneCodes.set(phone, { code, expiresAt: now + 5 * 60_000, lastSentAt: now });
    return { code }; // 演示环境无短信通道，验证码随响应返回（上线时改接短信服务商）
  }

  /** P1：校验验证码并绑定手机号（uid 来自 JWT，需已登录） */
  async bindPhone(uid: string, phone: string, code: string) {
    const entry = this.phoneCodes.get(phone);
    if (!entry || entry.code !== code || Date.now() > entry.expiresAt) {
      throw new BadRequestException('验证码错误或已过期');
    }
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing && existing.id !== uid) {
      throw new ConflictException('该手机号已被其他账号绑定');
    }
    const user = await this.prisma.user.update({
      where: { id: uid },
      data: { phone },
      select: { id: true, nickname: true, phone: true, createdAt: true },
    });
    this.phoneCodes.delete(phone); // 绑定成功即失效，防重放
    return user;
  }
}

