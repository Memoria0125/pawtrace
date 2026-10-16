/**
 * pages.json 里 tabBar.list 的页面路径 —— 「跳转方式」判定的唯一真值来源。
 * ⚠️ 改动 pages.json 的 tabBar 时这里必须同步，否则返回按钮会静默失灵。
 */
const TAB_PAGES = new Set<string>([
  '/pages/home/index',
  '/pages/map/nearby',
  '/pages/history/index',
  '/pages/my/index',
]);

/** 目标 url 是否为 tabBar 页面（忽略查询串与首部斜杠差异） */
export function isTabPage(url: string): boolean {
  const p = String(url || '').split('?')[0];
  return TAB_PAGES.has(p.startsWith('/') ? p : '/' + p);
}

/**
 * 统一「返回」入口（S3 新建档案 / S4 个体档案 / S5 时间轴的自绘导航共用）。
 *
 * 为什么不能直接用 `uni.navigateBack`：
 *   当页面栈只有 1 层时（H5 直接访问子页面后刷新、vite 全量刷新把页面栈重置、
 *   小程序/App 从分享或扫码直接进子页面），`uni.navigateBack` 在 H5 会「假装成功」——
 *   success 回调照常触发、**fail 回调不触发**，但页面纹丝不动。
 *   实测（H5 375px，栈深 = 1）：`uni.navigateBack({success,fail})` → SUCCESS，
 *   `location.hash` 不变，fail 未被调用。
 *   所以 `fail: () => uni.switchTab(...)` 这种写法是**死代码**，兜底永远不会执行，
 *   用户看到的现象就是「点返回没反应」。
 *
 * 正确做法：自己判栈深，栈深不足时主动跳到兜底页。
 *
 * ⚠️ 兜底跳法由**目标 url 是不是 tabBar 页**推导，不由调用方传的 `tab` 标志决定
 * （2026-10-10 修）：switchTab 只能打开 tabBar 页，传其它 url 在 H5 是**静默失败**
 * —— 现象同样是「点返回没反应」；反过来 redirectTo 打不开 tabBar 页。
 * 「目标不是 tab 页却漏传 tab:false」曾让 /pages/space/detail 与 /pages/space/lists
 * 的返回在栈深 1 时完全失灵（从上一页点进来时栈深 2 走 navigateBack，把 bug 藏住了）。
 * `tab` 参数保留仅为向后兼容，已不参与决策。
 *
 * @param fallback 栈深不足时的兜底目标。不传 = 回首页 Tab。
 *                 url 可含查询串（如 `/pages/space/detail?id=xxx`）。
 */
export function goBack(fallback?: { url: string; tab?: boolean }): void {
  const g = globalThis as any;
  const pages = typeof g.getCurrentPages === 'function' ? g.getCurrentPages() : null;

  // 栈深 > 1 才真的能返回；判空时按「不能返回」处理，走兜底更稳
  if (Array.isArray(pages) && pages.length > 1) {
    uni.navigateBack({ delta: 1 });
    return;
  }

  const target = fallback ?? { url: '/pages/home/index', tab: true };
  if (isTabPage(target.url)) {
    uni.switchTab({ url: target.url });
  } else {
    uni.redirectTo({ url: target.url });
  }
}

/** 页面栈深度（调试/自测用） */
export function pageStackDepth(): number {
  const g = globalThis as any;
  const pages = typeof g.getCurrentPages === 'function' ? g.getCurrentPages() : null;
  return Array.isArray(pages) ? pages.length : 0;
}
