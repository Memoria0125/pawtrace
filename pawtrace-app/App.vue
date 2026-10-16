<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { flushDrafts } from './common/drafts';

onLaunch(async () => {
  // 2026-10-06 密码账号体系：不再启动静默匿名登录，未登录由 api.ts 的
  // 401 分支踢回登录页（S0-登录）。这里只做离线草稿的启动补传。
  flushDrafts().catch(() => {});
  // 网络恢复时自动补传（uni.onNetworkStatusChange 全局只应注册一次，放 App 最稳）
  uni.onNetworkStatusChange((res) => {
    if (res.isConnected) flushDrafts().catch(() => {});
  });
});
</script>

<style>
/* ==========================================================================
   PawTrace 全局样式 —— 手账风基座
   数值来自设计稿 S1 屏实测（375×812 @2.957x）：见 uni.scss 注释
   ========================================================================== */

page {
  background-color: #f0ebdf;
  color: #3c4036;
  font-size: 28rpx;
  line-height: 1.45;
}

/* ---------- 版面 ---------- */
.paw-page {
  min-height: 100vh;
  padding: 0 40rpx;
  box-sizing: border-box;
}
/* #ifdef H5 */
/* H5 下 uni-page-head 是 44px 的静态高度（首页等「默认导航」页才有，背景透明所以肉眼看不见），
   而 100vh 已经包含了状态栏+导航条这块高度 → 文档总高恒为 100vh + 44px，必然溢出视口。
   后果：桌面浏览器里出现竖向滚动条，滚动条占掉 15px 宽度，
   使 #app 的 margin:0 auto 居中基准从「窗口宽」变成「窗口宽 − 15px」→ 整页比其它页左偏 7.5px
   （只有首页这类「满屏 + 默认导航」的页面会中招，地图/详情/时间轴是 custom 导航、无此头部）。
   这里把页面最小高度扣掉头部与原生 TabBar 的占位，保证不产生溢出滚动。
   注：--window-top / --window-bottom 由 uni-app 运行时下发，H5 首页实测 --window-top = calc(44px + 0px)。 */
.paw-page {
  min-height: calc(100vh - var(--window-top, 0px) - var(--window-bottom, 0px));
}
/* #endif */
/* 带自绘 TabBar 的页面：底部留出悬浮条的高度 */
.paw-page--tabbed {
  padding-bottom: 200rpx;
}

/* ---------- 纸片卡片：设计稿为平面纸白卡（无描边、无投影） ---------- */
.paw-card {
  background: #faf7f1;
  border-radius: 32rpx;
  padding: 36rpx 32rpx;
}
/* 需要“贴纸浮起”时的变体（手账装饰用，非设计稿默认态） */
.paw-card--float {
  box-shadow: 6rpx 8rpx 0 rgba(143, 160, 139, 0.16);
}

/* ---------- 文字层级 ---------- */
.paw-h1 {
  font-size: 60rpx;
  font-weight: 800;
  color: #3c4036;
  letter-spacing: 2rpx;
  line-height: 1.15;
}
.paw-h2 {
  font-size: 32rpx;
  font-weight: 700;
  color: #3c4036;
}
.paw-muted {
  color: #8a8a7e;
}

/* ---------- 芥末黄胶带（S1 实测 192×36rpx） ---------- */
.paw-tape {
  width: 192rpx;
  height: 36rpx;
  background: #dfcf9f;
  border-radius: 4rpx;
}

/* ---------- 胶囊标签（高 40rpx） ---------- */
.paw-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  line-height: 1;
}
.paw-pill--green {
  background: #8fa08b;
  color: #faf7f1;
}
.paw-pill--mustard {
  background: #d9c389;
  color: #5f4f26;
}

/* ---------- 自绘导航右侧动作文字（全站唯一来源，禁止页面里另起字号/颜色） ----------
   设计稿五页实测（步进 = 字号，1pt = 2rpx）：
     p5 「1/2 拍照」  13.18pt → 26rpx  #56674E
     p6 「编辑」      14.20pt → 28rpx  #56674E
     p7 「导出」      14.54pt → 28rpx  #56674E
     p10「稍后再说」  13.04pt → 26rpx  #8FA08B
     p11「存草稿」    12.85pt → 26rpx  #8FA08B
   这两档字号 / 两种颜色是设计稿本来的写法，不是实现漂移，故保留两档。
   （若将来要强行拉平成一档，只改这里，五个页面自动跟随。） */
.paw-nav-act {
  flex-shrink: 0;
  font-size: 26rpx;
  color: #56674e;
  line-height: 1;
}
.paw-nav-act--md {
  font-size: 28rpx;
}
.paw-nav-act--muted {
  color: #8fa08b;
}

/* ---------- 主按钮：绿胶囊（S1 实测高 88rpx） ---------- */
.paw-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 999rpx;
  background: #8fa08b;
  color: #faf7f1;
  font-size: 32rpx;
  letter-spacing: 2rpx;
}
.paw-btn--ghost {
  background: transparent;
  color: #55684f;
  border: 2rpx solid #c9d2c2;
}
.paw-btn:active {
  opacity: 0.86;
}

/* ---------- 印章（手账点缀，用于档案状态） ---------- */
.paw-stamp {
  display: inline-block;
  padding: 8rpx 20rpx;
  border: 3rpx dashed #c68b6f;
  border-radius: 12rpx;
  color: #c68b6f;
  font-size: 24rpx;
}

/* ==========================================================================
   自绘 TabBar（components/paw-tabbar）的 H5 兜底：
   原生 TabBar 必须整体隐藏，否则会出现两条导航
   ========================================================================== */
/* #ifdef H5 */
uni-tabbar,
.uni-tabbar,
.uni-tabbar-bottom {
  display: none !important;
}
/* #endif */

/* ==========================================================================
   桌面浏览器里显示成手机比例（仅 H5 编译期生效，App / 小程序不受影响）
   原理：H5 下 rpx 会被编译成 rem，html 的 font-size 由运行时按窗口宽度设置
        (formula: width / 23.4375)。窗口宽于 960px 时它会退回 375px 基准，
        但页面容器仍是 100% 窗口宽 —— 于是「字号是手机尺寸、排版却铺满整屏」。
        这里把 rem 基准钉死为 375px（16px 根字号 = 750rpx 对应 375px），
        再把根容器收成 375px 居中，显示比例就与真机一致。
   ========================================================================== */
/* #ifdef H5 */
@media screen and (min-width: 768px) {
  html {
    font-size: 16px !important;
    /* 始终在两侧预留同等宽度的滚动条槽：
       这样「页面是否出现竖向滚动条」不再改变 #app / fixed 元素的居中基准，
       长页面与短页面在手机框里都落在同一个横向位置（否则有滚动条的页面会左偏 7.5px）。
       放在 min-width:768px 内，375px 宽的截图通道不受影响。 */
    scrollbar-gutter: stable both-edges;
  }
  /* 手机框外的区域 */
  html,
  body {
    background: #ded8c9;
  }
  #app {
    width: 375px;
    min-height: 100vh;
    margin: 0 auto;
    background: #f0ebdf;
    box-shadow: 0 0 0 1px rgba(60, 64, 54, 0.1), 0 18px 48px rgba(60, 64, 54, 0.2);
  }
  /* 顶部导航条、底部 TabBar、悬浮主按钮、右下角悬浮按钮、全屏弹窗遮罩都是 fixed 定位，
     不跟随父容器，需单独收窄居中。
     ⚠️ 约定：凡是「铺满视口宽度的 fixed 浮层」（left/right 都归零、内部再自行定位的那种）
        一律取 paw- 前缀并登记到本清单，否则它的 right/bottom 会以整个窗口为基准、
        在桌面浏览器里飞出手机框（如 .paw-fab-wrap 的踩坑）。
        2026-10-02 新增：`.paw-scrim`（S9-2 科普卡遮罩）与 `.paw-sheet`（S9-2 底部面板）。
         （2026-10-11：这两个类名现由组件 components/paw-sci-card 承载，
           既用于 AI 解析页的页内弹出，也用于 sci-card 独立页 —— 都在本清单覆盖范围内。）
     2026-10-05 新增：`.paw-detbar`（小组详情页底部操作栏）。
     2026-10-09 新增：`.sp-mask`（建档页「调整出现点位」底部抽屉的遮罩 + 定位层）。
    2026-10-10 新增：`.paw-rd-mask`（打卡记录详情浮层，S5 时间轴 / S13 观察史 /
       S10-2 小组打卡列表三处共用组件 components/paw-record-detail）。
       漏登记的后果已被用户实测抓到：桌面浏览器里手机框只有 375px，
       而它按整个窗口铺开 → 抽屉横跨整块屏幕、按钮被拉得老长（截图反馈「宽度不适配」）。 */
  uni-page-head,
  .uni-page-head,
  .paw-tabbar,
  .paw-cta-wrap,
  .paw-fab-wrap,
  .paw-modal,
  .paw-scrim,
  .paw-sheet,
  .paw-detbar,
  .sp-mask,
  .paw-rd-mask {
    left: calc(50% - 187.5px) !important;
    right: auto !important;
    width: 375px !important;
  }
}
/* #endif */
</style>
