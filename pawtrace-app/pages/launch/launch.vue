<template>
  <!--
    S-LAUNCH 启动页（2026-10-11 新增）
    用户诉求：「像小红书那种启动页，做一个符合我 app 风格的」
    设计基准：
      底色 = 米绿纸底 #F0EBDF（与全局 page 背景同色，与原生开屏图无缝衔接）；
      品牌标识 = components/paw-logo（与 S0 登录页同源资产，此处放大到 200rpx）；
      纵向节奏 = 登录页品牌区按 1.35× 放大后微调（多行 text 在 flex column 里排列）。
    交互定案（用户 2026-10-11 选定）：停留 1.5 秒自动进入首页、无跳过按钮；
      三端（App / 微信小程序 / H5）均显示。
    ⚠️ 本页是 pages.json 的**第一页**（应用入口）。H5 的深链（#/pages/xxx）仍直达目标页、
      不经过本页 —— 全部探针与出图脚本走的就是深链，故不受影响（已实测）。
    ⚠️ 动画用「下一帧再加 class」触发：同步加 class 会与初始渲染合并成同一个样式计算，
      过渡不会播放（元素直接出现在终态）。
  -->
  <view class="launch" :class="{ 'launch--out': leaving }">
    <view class="brand" :class="{ 'brand--in': entered }">
      <paw-logo :size="200" />
      <text class="brand-name">爪迹</text>
      <text class="brand-en">PAWTRACE</text>
      <text class="brand-slogan">每一次相遇，都值得被记住</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

/** 品牌展示时长（用户定案 1.5s） */
const HOLD_MS = 1500;
/** 淡出时长，与下方 .launch 的 transition 保持一致 */
const FADE_MS = 280;

const entered = ref(false);
const leaving = ref(false);
let tIn: ReturnType<typeof setTimeout> | null = null;
let tOut: ReturnType<typeof setTimeout> | null = null;
let tGo: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  // 下一帧再加 class：同步加会与首次渲染合并，transition 不播放
  tIn = setTimeout(() => (entered.value = true), 30);
  tOut = setTimeout(() => {
    leaving.value = true;
    tGo = setTimeout(enter, FADE_MS);
  }, HOLD_MS);
});

onUnmounted(() => {
  if (tIn) clearTimeout(tIn);
  if (tOut) clearTimeout(tOut);
  if (tGo) clearTimeout(tGo);
});

/**
 * 进入首页。用 reLaunch 而非 switchTab：reLaunch 会关闭所有页面再打开目标，
 * 栈里不留启动页（否则真机返回键会退回开屏）；fail 兜底 switchTab，
 * 因为个别端对「reLaunch 打开 tabBar 页」的支持有差异。
 */
function enter() {
  uni.reLaunch({
    url: '/pages/home/index',
    fail: () => uni.switchTab({ url: '/pages/home/index' }),
  });
}
</script>

<style scoped>
.launch {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  box-sizing: border-box;
  /* 视觉重心略偏上（居中会显得品牌块偏坠，小红书式开屏也是偏上） */
  padding-bottom: 140rpx;
  background: #f0ebdf;
  transition: opacity 0.28s ease;
}
.launch--out {
  opacity: 0;
}

/* 品牌区：入场淡入 + 轻微上浮 */
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0;
  transform: translateY(18rpx);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}
.brand--in {
  opacity: 1;
  transform: translateY(0);
}

/* 「爪迹」字标：登录页为 56rpx，此处放大到 80rpx（字体处理保持一致，无额外字距） */
.brand-name {
  margin-top: 24rpx;
  font-size: 80rpx;
  font-weight: 700;
  line-height: 1;
  color: #3c4036;
}
/* PAWTRACE：登录页 20rpx/字距 1.35rpx，等比放大 ≈ 1.8rpx */
.brand-en {
  margin-top: 30rpx;
  font-size: 26rpx;
  letter-spacing: 1.8rpx;
  text-indent: 1.8rpx; /* 抵消末字右侧多出的一份字距 */
  line-height: 1;
  color: #8b877a;
}
/* 标语（用户 2026-10-11 选定文案） */
.brand-slogan {
  margin-top: 28rpx;
  font-size: 30rpx;
  line-height: 1;
  color: #8b877a;
}
</style>
