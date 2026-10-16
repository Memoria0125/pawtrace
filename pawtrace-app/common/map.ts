/**
 * 真实地图配置（S2 附近点位底图）
 *
 * 合规说明：境内地图只能使用腾讯 / 高德 / 百度 / 天地图；本项目统一走【腾讯位置服务】。
 *   - 微信小程序端：微信内置腾讯底图，**无需 key**，开箱即用
 *   - H5 端：需要腾讯位置服务「JavaScript API」的 key（免费申请），
 *            写在 manifest.json → h5 → sdkConfigs → maps → qqmap → key
 *   - App 端：需在打包时配置对应平台 key（毕设演示不涉及，暂不启用）
 *
 * 启用步骤（两步，改完重启 H5 dev server）：
 *   ① manifest.json 里把 qqmap.key 的占位串换成你申请到的 key
 *   ② 把下面的 MAP_ENABLED 改成 true
 * 未启用（默认）时 S2 自动回退「手绘底图」——与设计稿 / 像素验收基线逐像素一致，不会白屏。
 *
 * key 申请入口：https://lbs.qq.com/ → 登录 → 控制台 → 应用管理 → 我的应用 → 创建应用
 *   · 应用类型选「Web 端 (JavaScript API)」
 *   · key 管理里勾选「JavaScript API GL」（用不到路线/搜索可不勾 WebService）
 *   · 域名白名单：本地 localhost 调试可留空；上线后填实际域名（防 key 被盗用）
 */

import type { BlurredLoc } from './location';

/** 真实地图总开关：key 已配置（2026-10-08，见 manifest.json），正式启用 */
export const MAP_ENABLED: boolean = true;

/** 地图默认中心：浙江科技大学小和山校区五个演示点位（GCJ02）的质心 */
export const MAP_CENTER: BlurredLoc = { lat: 30.2178, lng: 120.0266 };

/**
 * 默认缩放级别：15 ≈ 4.13 m/px，一屏约 1.55km × 1.94km。
 * 校区东西跨度约 1.1km（田径场 120.0207 ↔ 东和公寓东门 120.0321），
 * 16 级只有 ~770m 宽会切掉两端，故用 15。
 */
export const MAP_SCALE = 15;

/** marker 图标（本地 PNG，跨端通用；小程序 iconPath 不认 SVG data URI） */
export const MK_ICON = {
  /** 记录 < 3 条 */
  low: '/static/map/mk-mustard.png',
  /** 记录 >= 3 条 */
  mid: '/static/map/mk-terra.png',
  /** 记录 >= 5 条 */
  high: '/static/map/mk-deep.png',
  /** 选中态（墨绿，略大） */
  on: '/static/map/mk-on.png',
  /** 我的位置（蓝点；不用 <map> 的 show-location —— 它走未换算的坐标系） */
  me: '/static/map/mk-me.png',
};

/** 记录密度 → marker 图标（与手绘底图的图例三色同源） */
export function densityIcon(records: number): string {
  return records >= 5 ? MK_ICON.high : records >= 3 ? MK_ICON.mid : MK_ICON.low;
}
