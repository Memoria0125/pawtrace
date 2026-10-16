/**
 * 城市归属判定（2026-10-11）
 *
 * 背景：首页三宫格第三格「城市点位」原先统计的是**我记录里去重的点位名数**
 * （PRD F3.1「城市点位地图」的字面义），容易被读成「城市数」。用户 2026-10-11 定案
 * 改为**覆盖城市数**：我记录过的点位分布在几个城市。
 *
 * 难点：Record/Profile 上都只有坐标与点位名，**库里没有城市字段**。
 * 因此这里用「坐标 → 最近城市中心」判定，坐标来源优先级见 records.service 的 myStats：
 *   Record.lat/lng（记录自身定位）
 *   → Profile.lastSeenLat/Lng（该猫的常驻点，记录未带坐标时用）
 *
 * ⚠️ 坐标是 GCJ02（客户端定位已统一到 GCJ02）。本项目坐标域全部落在杭州市小和山，
 * 城市表按「最近邻 + 距离上限」匹配，将来数据跨城时自动区分，不需要改代码。
 */

export interface CityCenter {
  name: string;
  lat: number;
  lng: number;
}

/** 内置城市中心表（GCJ02，少量城市足够本项目使用；跨城时在这里加行即可） */
export const CITY_CENTERS: CityCenter[] = [
  { name: '杭州市', lat: 30.2741, lng: 120.1551 },
  { name: '湖州市', lat: 30.8930, lng: 120.0880 },
  { name: '嘉兴市', lat: 30.7522, lng: 120.7500 },
  { name: '绍兴市', lat: 30.0023, lng: 120.5810 },
  { name: '金华市', lat: 29.0784, lng: 119.6474 },
  { name: '衢州市', lat: 28.9700, lng: 118.8590 },
  { name: '上海市', lat: 31.2304, lng: 121.4737 },
];

/** 距离上限：超过则视为「不在城市表覆盖范围内」，不计入城市数（宁缺勿错） */
const CITY_MAX_KM = 90;

/** 两点球面距离（km） */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 坐标 → 城市名；坐标缺失或超出城市表范围返回 null（不计） */
export function cityOf(lat?: number | null, lng?: number | null): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best: { name: string; km: number } | null = null;
  for (const c of CITY_CENTERS) {
    const km = haversineKm(lat, lng, c.lat, c.lng);
    if (!best || km < best.km) best = { name: c.name, km };
  }
  if (!best || best.km > CITY_MAX_KM) return null;
  return best.name;
}
