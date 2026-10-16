import { BASE_URL } from './config';
import { api } from './api';

/**
 * 会话工具（2026-10-06 密码账号体系）：
 * 登录/注册由 S0-登录/S0-注册 页显式完成（POST /auth/login、/auth/register），
 * 这里只负责取本地 token；无 token 不再静默匿名登录 —— 强制登录由
 * common/api.ts 的 401 分支 reLaunch 到登录页实现。
 */
export async function ensureLogin(): Promise<string> {
  const token = uni.getStorageSync('token');
  if (token) return token;
  throw new Error('未登录');
}

export function saveSession(data: { token: string; user: any }) {
  uni.setStorageSync('token', data.token);
  uni.setStorageSync('user', data.user);
}

export function isLoggedIn(): boolean {
  return !!uni.getStorageSync('token');
}

/**
 * 需要登录才能做的动作（申请加入小组 / 创建小组 / 关注 / 建档 / 打卡）统一走这里：
 * 已登录 → true，调用方继续；未登录 → 跳登录页并带上当前页（登录成功原样跳回），返回 false。
 *
 * 背景（2026-10-08 晚，游客模式）：无 token 的 401 不再由 api.ts 自动踢登录页，
 * 所以「写操作」必须自己显式引导登录，否则只会弹一句「未登录」。
 */
export function requireLogin(): boolean {
  if (isLoggedIn()) return true;
  const pages = getCurrentPages();
  const cur: any = pages[pages.length - 1];
  const path = (cur && cur.route) || '';
  const o = (cur && cur.options) || {};
  const qs = Object.entries(o)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join('&');
  const from = encodeURIComponent('/' + path + (qs ? '?' + qs : ''));
  uni.navigateTo({ url: `/pages/login/login?from=${from}` });
  return false;
}

/**
 * 面板「有没有后端」——游客态判定用（2026-10-08 晚）。
 *
 * 为什么不直接打鉴权接口看有没有 401：那样浏览器控制台每次都会甩一条红色 401，
 * 而我们所有屏幕的验收标准里都写着「控制台无错误」，等于自己污染自己。
 * 改打一个**公开**接口（小组列表）：通了 → 后端在线 → 游客看到的「没数据」是真的没数据；
 * 不通 → 离线 / 后端未启动 / 像素核对拦截 API → 页面保留设计稿演示数据撑版面。
 */
export async function probePublic(): Promise<boolean> {
  try {
    await api.get('/spaces/search', {}, { silent: true });
    return true;
  } catch {
    return false;
  }
}

/** 账号接口的裸请求（登录/注册/验证码发生在拿到 token 之前，不能走 api.ts —— 会触发 401 踢回登录页） */
export function authRequest<T = any>(method: 'POST', url: string, data?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        const body = res.data as { code: number; msg?: string; message?: string; data: T };
        // 注意：NestJS 的 POST 默认返回 201 Created，判 2xx 而非只判 200
        if (res.statusCode >= 200 && res.statusCode < 300 && body.code === 0) {
          resolve(body.data);
        } else {
          reject(new Error(body?.msg || body?.message || `请求失败(${res.statusCode})`));
        }
      },
      fail: (e) => reject(new Error(e.errMsg)),
    });
  });
}

/** 坐标模糊化（PRD 6.4）：抖动到 BLUR_RADIUS_M 内，只保留街区级精度 */
export function blurCoordinate(lat: number, lng: number, radiusM = 300) {
  // 1 度纬度 ≈ 111km；用固定网格吸附实现"同街区同结果"
  const grid = radiusM / 111000;
  return {
    lat: Math.round(lat / grid) * grid,
    lng: Math.round(lng / (grid / Math.cos((lat * Math.PI) / 180))) * (grid / Math.cos((lat * Math.PI) / 180)),
  };
}
