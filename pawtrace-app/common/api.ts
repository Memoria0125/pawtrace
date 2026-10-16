import { BASE_URL } from './config';

/** 统一响应结构（与后端 common/api.ts 对齐，契约见 shared/types.ts） */
export interface ApiResp<T = any> {
  code: number;
  msg: string;
  data: T;
}

function getToken(): string {
  return uni.getStorageSync('token') || '';
}

export interface RequestOpts {
  /**
   * 静默模式：失败时不弹全局 toast，由调用方自行兜底。
   * 用于「可选的统计/探测」类请求——这类请求失败不该打断用户，
   * 更不该因为后端某个模块尚未上线就把整页顶部糊一个错误提示。
   */
  silent?: boolean;
}

/**
 * 基础请求封装：带 token、统一错误提示、离线不崩
 *
 * 401 两种语义（2026-10-08 晚，游客模式）：
 *  - **带着 token 被 401** → token 失效/伪造：清 token + reLaunch 登录页（原行为，强制登录）
 *  - **本来就没 token 被 401** → 游客访问了需登录的接口：**不再踢登录页**，
 *    reject 一个带 `status: 401` 的错误，由页面自己决定「渲染空态 / 引导登录」。
 *    理由：退出登录后要能继续浏览公开数据（协作空间 / 猫咪档案），
 *    不能一进首页就被弹去登录页。写操作（申请加入 / 建组 / 打卡）在页面里显式跳登录。
 */
export function request<T = any>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  opts: RequestOpts = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    // 竞态修复（2026-10-02 真联调发现）：App onLaunch 的 ensureLogin 与
    // 页面 onShow 的首请求并发，冷启动时请求可能抢在 token 就绪前发出 → 401。
    // 这里保证「无 token 先登录再发」；ensureLogin 幂等（有 token 直接返回）。
    const sentToken = getToken(); // 发送瞬间的 token：用来区分「token 失效」与「游客」
    const go = () => {
      uni.request({
        url: BASE_URL + url,
        method,
        data,
        header: { Authorization: `Bearer ${sentToken}` },
        success: async (res) => {
          const body = res.data as ApiResp<T> & { message?: string };
          if (res.statusCode === 401) {
            if (sentToken) {
              // token 失效/伪造：密码账号体系下无法无感重登，直接清 token 踢回登录页
              // （登录页带 from，登录成功后回原页；登录页自身有 curPath 守卫避免 reLaunch 循环）
              uni.removeStorageSync('token');
              const pages = getCurrentPages();
              const cur = pages[pages.length - 1];
              const curPath = (cur && (cur as any).route) || '';
              if (!curPath.startsWith('pages/login/')) {
                // H5 直接取 hash（避免 options 值二次编码）；非 H5 用 route+options 原值拼
                // #ifdef H5
                const from = encodeURIComponent(location.hash.replace(/^#/, ''));
                // #endif
                // #ifndef H5
                const o = (cur && (cur as any).options) || {};
                const qs = Object.entries(o)
                  .map(([k, v]) => `${k}=${String(v)}`)
                  .join('&');
                const from = encodeURIComponent('/' + curPath + (qs ? '?' + qs : ''));
                // #endif
                uni.reLaunch({ url: `/pages/login/login?from=${from}` });
              }
            }
            // 游客（无 token）→ 只 reject，带 status 标记让页面区分「未登录」与「网络失败」
            const err: any = new Error('未登录');
            err.status = 401;
            err.guest = !sentToken;
            return reject(err);
          }
          if (res.statusCode >= 200 && res.statusCode < 300 && body.code === 0) {
            resolve(body.data);
          } else {
            // Nest 原生错误（如 404 Not Found）返回的是 message 而非 msg，两者都兼容
            const msg = body?.msg || body?.message || `请求失败(${res.statusCode})`;
            if (!opts.silent) {
              uni.showToast({ title: msg, icon: 'none' });
            }
            reject(new Error(msg));
          }
        },
        fail: (err) => {
          // 离线/断网：提示但不抛 toast 轰炸，由调用方决定是否入草稿队列
          reject(new Error(err.errMsg));
        },
      });
    };

    // 无 token 也照样发：公开接口（协作空间 / 档案详情）能正常返回，
    // 需登录的接口回 401 → 上面分支按「游客」处理（不踢登录页）。
    // 「页面先用演示帧渲染、请求失败各自兜底」的离线/演示行为因此得以保留。
    go();
  });
}

export const api = {
  get: <T = any>(url: string, params?: any, opts?: RequestOpts) => {
    // GET 参数拼 query string
    if (params) {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&');
      return request<T>('GET', url + (qs ? '?' + qs : ''), undefined, opts);
    }
    return request<T>('GET', url, undefined, opts);
  },
  post: <T = any>(url: string, data?: any, opts?: RequestOpts) =>
    request<T>('POST', url, data, opts),
  patch: <T = any>(url: string, data?: any, opts?: RequestOpts) =>
    request<T>('PATCH', url, data, opts),
  delete: <T = any>(url: string, opts?: RequestOpts) =>
    request<T>('DELETE', url, undefined, opts),
};
