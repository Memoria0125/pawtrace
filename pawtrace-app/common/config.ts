/**
 * 环境配置：开发期本地后端，上线改这里。
 *
 * H5 下按「当前页面的 host」推导后端地址，否则手机扫码/局域网预览会全挂：
 *   - 桌面浏览器 http://localhost:5173      → http://localhost:3000/api
 *   - 手机/局域网 http://192.168.x.x:5173   → http://192.168.x.x:3000/api
 * 若写死 localhost，手机上的请求会打到「手机自己的」localhost:3000 → 全部连接失败。
 * （后端已 enableCors() 全开 + listen(3000) 监听所有网卡，改 host 即可直连，无需额外配置。）
 * 小程序/App 端拿到的是 'localhost'，出真机包前需换成局域网 IP 或线上域名。
 */
/**
 * 小程序/App 端没有 window，拿不到页面 host —— 用电脑的局域网 IP 直连本机后端。
 * ⚠️ 换了 Wi-Fi / IP 变了（校园网 DHCP）要同步改这里；上线改成 https 域名。
 */
const MP_DEV_HOST = '10.100.208.62';
const DEV_HOST =
  typeof window !== 'undefined' && window.location ? window.location.hostname : MP_DEV_HOST;
export const BASE_URL = `http://${DEV_HOST}:3000/api`;

/** 街区级模糊半径（米）——PRD 6.4 位置隐私：上报前先把坐标抖到街区级 */
export const BLUR_RADIUS_M = 300;
