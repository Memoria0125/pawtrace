/**
 * 定位工具（PRD 6.4 位置隐私）
 *
 * 坐标系（关键！2026-10-08 修复）：
 *   项目里所有「点位坐标」（seed 档案坐标、腾讯地图底图、后端 distanceM 计算）统一是 **GCJ02（国标火星坐标）**。
 *   而 H5 浏览器 Geolocation 返回的是 **WGS84**，两者在杭州相差约 528m
 *   （Δlat −0.00237 / Δlng +0.00476）——直接拿 WGS84 数值画在腾讯底图上，
 *   「我的位置」会整体偏到校区外（曾把东和公寓的定位画到校区中北部）。
 *   实测确认：uni-app H5 的 `uni.getLocation({type:'gcj02'})` **不会**替你换算，
 *   返回值与 wgs84 完全一致 → 必须自行换算（wgs84ToGcj02）。
 *
 *   小程序 / App 端 `uni.getLocation({type:'gcj02'})` 返回的本身就是 GCJ02，无需换算。
 *
 * 街区级模糊：坐标吸附到 ~220m 网格（0.002°），只保留「小区/街区」精度，
 *   不暴露精确位置；与 PRD「点位精度降至小区/街区级」口径一致。
 *   ⚠️ 模糊只作用于**上传/查询**用的坐标；「我的位置」蓝点是本机自己显示的，
 *   用未模糊的真实（GCJ02）坐标，才能落在自己脚下。
 *
 * 会话级缓存（10 分钟）：避免每次进页都触发系统定位弹窗。
 * 任何失败（拒绝授权 / 超时 / 不支持）都返回 null，调用方保持设计稿兜底态。
 *
 * 精度可见化（2026-10-10 晚，用户报障「蓝点定位不太对」）：
 *   桌面浏览器没有 GPS，浏览器给的是 **WiFi / 网络定位**（实测自报 accuracy 94~108m，
 *   而 12 分钟内读数还跳了 ~0.5km）。只画一个点会让人以为「很准」——getMyPosition 因此
 *   一并返回 accuracy（米），S2 用它画精度圈 + 粗定位提示；取不到就是 undefined（不假装）。
 */

const GRID = 0.002;                    // ≈ 220m 网格（北纬 30° 处经度方向约 192m）
const RAW_KEY = 'loc_raw';             // 未模糊的真实位置（GCJ02，含 accuracy）
const BLUR_KEY = 'loc_blur';           // 街区级模糊位置（上传/查询用）
const CACHE_TTL = 10 * 60 * 1000;
/** 「我的位置」的进页刷新节流：最多 1 分钟重新定位一次（见 S2 onShow） */
export const MY_POS_MIN_INTERVAL = 60 * 1000;

export interface BlurredLoc {
  lat: number;
  lng: number;
}

/** 未模糊的真实位置（本机显示用）；accuracy = 定位精度半径（米），未知则 undefined */
export interface MyPos extends BlurredLoc {
  accuracy?: number;
}

/** 坐标吸附到街区级网格（四舍五入到 0.002°） */
export function blurToBlock(lat: number, lng: number): BlurredLoc {
  return {
    lat: Math.round(lat / GRID) * GRID,
    lng: Math.round(lng / GRID) * GRID,
  };
}

/** 距离格式化：<1km 显米，≥1km 显一位小数公里 */
export function fmtDist(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

/**
 * WGS84 → GCJ02（火星坐标）标准算法。
 * 纯数学，不依赖任何地图 SDK —— 避免「SDK 没加载 / 没配 key 就不换算」的隐性失败。
 */
export function wgs84ToGcj02(lat: number, lng: number): BlurredLoc {
  const outOfChina = lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  if (outOfChina) return { lat, lng };

  const tLat = (x: number, y: number) => {
    let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    r += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
    r += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
    return r;
  };
  const tLng = (x: number, y: number) => {
    let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    r += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
    r += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
    return r;
  };

  const a = 6378245.0, ee = 0.00669342162296594323;
  let dLat = tLat(lng - 105, lat - 35);
  let dLng = tLng(lng - 105, lat - 35);
  const radLat = lat / 180 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
  dLng = (dLng * 180) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
  return { lat: lat + dLat, lng: lng + dLng };
}

function readCache(key: string, maxAge: number = CACHE_TTL): (MyPos & { ts: number }) | null {
  try {
    const c = uni.getStorageSync(key);
    if (c && c.ts && Date.now() - c.ts < maxAge && typeof c.lat === 'number') return c;
  } catch { /* storage 不可用则忽略 */ }
  return null;
}

/**
 * 同步读一次缓存里的「我的位置」（不触发任何定位）—— 供页面「先上屏、再刷新」用。
 * maxAge 默认同 CACHE_TTL；过期即返回 null。
 */
export function peekMyPosition(maxAge: number = CACHE_TTL): MyPos | null {
  const c = readCache(RAW_KEY, maxAge);
  return c ? { lat: c.lat, lng: c.lng, accuracy: c.accuracy } : null;
}

/**
 * 取当前真实位置（**未模糊**，GCJ02）—— 供地图「我的位置」蓝点使用。
 * H5：浏览器给 WGS84 → 自行换算；小程序 / App：直接取 gcj02。
 * 拿不到（拒绝/超时/离线）→ null，不抛错。
 *
 * @param opts.maxAge 缓存新鲜度上限（默认 10 分钟）。传更小的值 = 更积极刷新：
 *   S2 每次 onShow 传 MY_POS_MIN_INTERVAL（1 分钟）→ 人走了点也跟着走；
 *   同时节流，避免来回切 tab 反复触发定位。
 */
export function getMyPosition(opts: { maxAge?: number } = {}): Promise<MyPos | null> {
  const c = readCache(RAW_KEY, opts.maxAge ?? CACHE_TTL);
  if (c) return Promise.resolve({ lat: c.lat, lng: c.lng, accuracy: c.accuracy });

  return new Promise((resolve) => {
    let settled = false;
    const done = (v: MyPos | null) => {
      if (settled) return;
      settled = true;
      if (v) {
        try { uni.setStorageSync(RAW_KEY, { ...v, ts: Date.now() }); } catch { /* 忽略 */ }
      }
      resolve(v);
    };

    // 浏览器定位在无 GPS 的桌面端可能挂很久，6s 兜底放弃（页面继续用演示态）
    const timer = setTimeout(() => done(null), 6000);

    uni.getLocation({
      // H5 浏览器原生定位 = WGS84；GCJ02 由上面的 wgs84ToGcj02 自己换算
      // （uni 在 H5 端不做换算，实测 wgs84/gcj02 返回值完全相同）
      // #ifdef H5
      type: 'wgs84',
      // #endif
      // #ifndef H5
      type: 'gcj02',
      // #endif
      success: (res: any) => {
        clearTimeout(timer);
        if (typeof res.latitude !== 'number' || typeof res.longitude !== 'number') {
          done(null);
          return;
        }
        // accuracy：H5 是 accuracy，小程序给 horizontalAccuracy，取到哪个算哪个
        const acc = typeof res.accuracy === 'number' && res.accuracy > 0
          ? res.accuracy
          : (typeof res.horizontalAccuracy === 'number' && res.horizontalAccuracy > 0 ? res.horizontalAccuracy : undefined);
        // #ifdef H5
        done({ ...wgs84ToGcj02(res.latitude, res.longitude), accuracy: acc });
        // #endif
        // #ifndef H5
        done({ lat: res.latitude, lng: res.longitude, accuracy: acc });
        // #endif
      },
      fail: () => {
        clearTimeout(timer);
        done(null);
      },
    });
  });
}

/**
 * 用一次新读数同步「街区级模糊位置」缓存（2026-10-10 晚）。
 * 为什么需要：S2 的蓝点走未模糊读数、点位卡「距你约 X m」走后端按**模糊**坐标算的距离 ——
 * 若蓝点刷新了、模糊缓存还是 10 分钟前的，同一屏里两个数字会互相矛盾（最容易被读成「定位不对」）。
 * 进页拿到新读数时同步一次，两边同源。
 */
export function syncBlurredCache(pos: BlurredLoc): BlurredLoc {
  const b = blurToBlock(pos.lat, pos.lng);
  try { uni.setStorageSync(BLUR_KEY, { ...b, ts: Date.now() }); } catch { /* 忽略 */ }
  return b;
}

/**
 * 取「已模糊到街区级」的当前位置（GCJ02，与后端/底图同坐标系）。
 * 用于上报与查询（S5 建档 / S9 记录 / S2 nearby 距离排序）。
 */
export async function getLocationBlurred(): Promise<BlurredLoc | null> {
  const c = readCache(BLUR_KEY);
  if (c) return { lat: c.lat, lng: c.lng };

  const raw = await getMyPosition();
  if (!raw) return null;
  const b = blurToBlock(raw.lat, raw.lng);
  try { uni.setStorageSync(BLUR_KEY, { ...b, ts: Date.now() }); } catch { /* 忽略 */ }
  return b;
}
