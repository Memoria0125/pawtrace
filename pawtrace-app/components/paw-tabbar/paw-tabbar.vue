<template>
  <!--
    自绘 TabBar（全局唯一底部导航）
    为什么不用原生 tabBar：设计稿的「选中态墨绿胶囊」+「中央绿色圆形建档入口」原生做不到
    用法：Tab 页放 <paw-tabbar />，它自己读当前路由判断选中项，不需要父页面传参
    数据来源：底部导航 = 首页 | 地图 | 记录(＋) | 观察史 | 我的（PRD 7.1 / 设计稿实测）
  -->
  <view class="paw-tabbar">
    <view class="bar">
      <!-- 1 首页 -->
      <view class="slot" :class="{ 'slot--on': active === 0 }" @tap="goTab(0)">
        <view class="inner">
          <view class="ic ic-home">
            <view class="roof"></view>
            <view class="wall"></view>
          </view>
          <text class="lab">首页</text>
        </view>
      </view>

      <!-- 2 地图 -->
      <view class="slot" :class="{ 'slot--on': active === 1 }" @tap="goTab(1)">
        <view class="inner">
          <view class="ic ic-map">
            <view class="ring"></view>
            <view class="dot"></view>
          </view>
          <text class="lab">地图</text>
        </view>
      </view>

      <!-- 3 记录：首页态显示中央凸起圆（p3 设计），其余页是普通项（p4/p8/p9）
           图标 = 爪印，为「爪迹」品牌主动补的设计（设计稿三页此处均无图标，见核对文档豁免项） -->
      <view class="slot" @tap="goCreate">
        <view v-if="active === 0" class="cta">
          <view class="ic ic-record">
            <view class="toe t1"></view>
            <view class="toe t2"></view>
            <view class="toe t3"></view>
            <view class="toe t4"></view>
            <view class="pad"></view>
          </view>
          <text class="cta-lab">记录</text>
        </view>
        <view v-else class="inner">
          <view class="ic ic-record">
            <view class="toe t1"></view>
            <view class="toe t2"></view>
            <view class="toe t3"></view>
            <view class="toe t4"></view>
            <view class="pad"></view>
          </view>
          <text class="lab">记录</text>
        </view>
      </view>

      <!-- 4 观察史 -->
      <view class="slot" :class="{ 'slot--on': active === 3 }" @tap="goTab(3)">
        <view class="inner">
          <view class="ic ic-history">
            <view class="bar-line"></view>
            <view class="bar-line"></view>
            <view class="bar-line"></view>
          </view>
          <text class="lab">观察史</text>
        </view>
      </view>

      <!-- 5 我的 -->
      <view class="slot" :class="{ 'slot--on': active === 4 }" @tap="goTab(4)">
        <view class="inner">
          <view class="ic ic-my">
            <view class="dot-circle"></view>
          </view>
          <text class="lab">我的</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { requireLogin } from '../../common/auth';

/** 视觉槽位 → Tab 页路由（槽位 2 是中央 CTA，不在此表内） */
const TAB_ROUTES: Record<number, string> = {
  0: '/pages/home/index',
  1: '/pages/map/nearby',
  3: '/pages/history/index',
  4: '/pages/my/index',
};

const active = ref(0);

/** 由「当前页面路由」推导选中槽位：非 Tab 页（如协作空间）返回 -1，不点亮任何项 */
function syncActive() {
  const pages = getCurrentPages();
  const top = pages.length ? (pages[pages.length - 1] as any) : null;
  const route = top ? '/' + String(top.route || '').replace(/^\//, '') : '';
  const hit = Object.keys(TAB_ROUTES).find((k) => TAB_ROUTES[Number(k)] === route);
  active.value = hit === undefined ? -1 : Number(hit);
}

onShow(() => {
  syncActive();
  // 自绘条生效的前提：把原生 TabBar 收起来（H5 端 App.vue 另有 CSS 兜底）
  // @ts-ignore 参数 shape 在各端不完全一致
  uni.hideTabBar({ animation: false, fail: () => {} });
});

function goTab(i: number) {
  if (i === active.value) return;
  uni.switchTab({ url: TAB_ROUTES[i] });
}

/** 中央「记录」= 现场建档入口（PRD 7.3 悬浮入口）；游客先引导登录（2026-10-08 晚） */
function goCreate() {
  if (!requireLogin()) return;
  uni.navigateTo({ url: '/pages/profile/create' });
}
</script>

<style scoped>
/* 外层 fixed 容器：负责居中；H5 桌面预览下由 App.vue 收窄成 375px */
.paw-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  padding: 0 30rpx calc(env(safe-area-inset-bottom) + 4rpx);
  box-sizing: border-box;
}

/* 悬浮药丸条：内容高 120rpx（p3/p4/p9 三页实测一致）+ 1pt 描边 #E2DCCA
   （设计语言里纸白面一律走脆边描边，实测三页容器上下沿都取到 (226,220,202) 描边色，
     且外侧无投影渐变 → 用 border 而非 box-shadow；外高 124rpx）；
   条内再留 8rpx 内边距，使每槽 134.8rpx（对应设计稿槽心距 67.44pt） */
.bar {
  display: flex;
  align-items: center;
  width: 100%;
  height: 124rpx;
  padding: 0 8rpx;
  box-sizing: border-box;
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
  border-radius: 62rpx;
}

.slot {
  flex: 1;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 单项：p4 实测选中胶囊 131×107.5rpx，圆角 54rpx；
   文字统一贴底（p3/p4/p8 各页标签墨迹底都在 798.14pt），图标统一轴心居中 */
.inner {
  width: 131rpx;
  height: 108rpx;
  border-radius: 54rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 18rpx;
  box-sizing: border-box;
  transition: background-color 0.18s ease;
}
.slot--on .inner {
  background: #55684f;
}

.lab {
  font-size: 20rpx;
  line-height: 1;
  color: #8b8779;
}
.slot--on .lab {
  color: #faf7f1;
}

/* ---------- CSS 手绘图标（不引图片，App / 小程序 / H5 三端一致） ---------- */
/* 统一 28×28rpx 图标盒 + 14rpx 底距：各图标在此盒内居中，与设计稿轴心一致 */
.ic {
  position: relative;
  width: 28rpx;
  height: 28rpx;
  margin-bottom: 14rpx;
}

/* 首页：p4 实测整体 21.6×24.3rpx、线宽 2rpx。
   屋顶 = 13rpx 方块转 45°（外接 18.4rpx + 描边外扩 ≈21.2rpx），可见 Λ 占上半 10rpx；
   两侧墙自 Λ 两端垂下 14rpx，与屋顶最宽处同宽 */
.ic-home .roof {
  position: absolute;
  left: 50%;
  top: 3rpx;
  width: 13rpx;
  height: 13rpx;
  margin-left: -6.5rpx;
  border-left: 2rpx solid #8b8779;
  border-top: 2rpx solid #8b8779;
  transform: rotate(45deg);
}
.ic-home .wall {
  position: absolute;
  left: 50%;
  top: 13rpx;
  width: 21.2rpx;
  height: 12rpx;
  margin-left: -10.6rpx;
  border-left: 2rpx solid #8b8779;
  border-right: 2rpx solid #8b8779;
  border-bottom: 2rpx solid #8b8779;
  box-sizing: border-box;
}

/* 地图：p3/p4 实测 外径 28rpx / 描边 2.5rpx / 内点 20rpx */
.ic-map .ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 28rpx;
  height: 28rpx;
  margin: -14rpx 0 0 -14rpx;
  border: 2.5rpx solid #8b8779;
  border-radius: 50%;
  box-sizing: border-box;
}
.ic-map .dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 20rpx;
  height: 20rpx;
  margin: -10rpx 0 0 -10rpx;
  background: #8b8779;
  border-radius: 50%;
}

/* 观察史：p4 实测 三横线 16rpx 宽 / 2.5rpx 厚 / 线距 4rpx（整体 15rpx 高，轴心比其它图标低 1.5pt） */
.ic-history {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4rpx;
  padding-top: 6rpx;
  box-sizing: border-box;
}
.ic-history .bar-line {
  width: 16rpx;
  height: 2.5rpx;
  background: #8b8779;
  border-radius: 1.5rpx;
}

/* 我的：p4 实测为实心圆占位，直径 27rpx（设计稿此处没画人形） */
.ic-my .dot-circle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 27rpx;
  height: 27rpx;
  margin: -13.5rpx 0 0 -13.5rpx;
  background: #8b8779;
  border-radius: 50%;
}

/* 记录：爪印（4 趾垫 + 掌垫，实心）。28rpx 盒内居中：整体 24.6×20.45rpx，
   趾垫 d5.8rpx（中间两枚 d6.1rpx）、掌垫 14×10.6rpx 椭圆；几何按 4x 放大稿标定 */
.ic-record .toe {
  position: absolute;
  width: 5.8rpx;
  height: 5.8rpx;
  border-radius: 50%;
  background: #8b8779;
}
.ic-record .toe.t1 {
  left: 1.7rpx;
  top: 7.93rpx;
}
.ic-record .toe.t2 {
  left: 7.55rpx;
  top: 3.78rpx;
  width: 6.1rpx;
  height: 6.1rpx;
}
.ic-record .toe.t3 {
  left: 14.35rpx;
  top: 3.78rpx;
  width: 6.1rpx;
  height: 6.1rpx;
}
.ic-record .toe.t4 {
  left: 20.5rpx;
  top: 7.93rpx;
}
.ic-record .pad {
  position: absolute;
  left: 7rpx;
  top: 13.63rpx;
  width: 14rpx;
  height: 10.6rpx;
  border-radius: 50%;
  background: #8b8779;
}

/* 选中态：图标转纸白 */
.slot--on .ic-home .roof {
  border-left-color: #faf7f1;
  border-top-color: #faf7f1;
}
.slot--on .ic-home .wall {
  border-color: #faf7f1;
}
.slot--on .ic-map .ring {
  border-color: #faf7f1;
}
.slot--on .ic-map .dot,
.slot--on .ic-history .bar-line,
.slot--on .ic-my .dot-circle,
.slot--on .ic-record .toe,
.slot--on .ic-record .pad {
  background: #faf7f1;
}

/* ---------- 中央凸起圆（仅首页态出现，p3 实测 直径 111rpx，文字贴底）
   圆内 = 爪印 + 文字：图标与文字的间距沿用条内其它项的 14rpx；
   padding-bottom 18rpx：实测文字墨迹底距圆底 = 9.13pt（设计稿 p3 圆内白字墨迹底 799.38、圆底 808.51） ---------- */
.cta {
  width: 111rpx;
  height: 111rpx;
  border-radius: 50%;
  background: #8fa08b;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 18rpx;
  box-sizing: border-box;
}
.cta .ic-record .toe,
.cta .ic-record .pad {
  background: #faf7f1;
}
.cta .ic {
  margin-bottom: 14rpx;
}
.cta-lab {
  font-size: 20rpx;
  line-height: 1;
  color: #faf7f1;
}
.cta:active {
  background: #7f927b;
}
</style>
