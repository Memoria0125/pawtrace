<template>
  <!--
    PawTrace 品牌标识（深苔绿圆角方块 + 白色爪印）
    真值来源：2026-09-12 从设计稿 p28（S0 登录）**矢量图元**实测 ——
      方块 74×74pt（148rpx）圆角 38rpx（18.7–19.1pt），色 #56674E；
      爪印 3 趾（8.4×10.4pt）+ 掌垫（20×17pt），坐标 = 设计矢量 bbox − 方块左上角。
    缩放方式：内部只保留一份「148rpx 基准画布」，任意 size 用 transform:scale 等比放大，
      不逐值乘算 —— 避免各页手抄爪印坐标、也避免尺寸改一处漏一处。
      S0 登录页（:size="148"，与设计稿 1:1）与启动页（:size="200"）共用同一份资产。
    为什么不用图片/SVG：与 paw-print 同理，位图在四端缩放会糊，CSS 画法任意尺寸都锐利。
  -->
  <view class="paw-logo" :style="wrapStyle">
    <view class="pl-canvas" :style="`transform:scale(${size / 148});`">
      <view class="toe t1" />
      <view class="toe t2" />
      <view class="toe t3" />
      <view class="pad" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 方块边长（rpx）。148rpx = 设计稿原尺寸（74pt） */
    size?: number;
  }>(),
  { size: 148 },
);

/** 根元素占位尺寸（缩放后视觉尺寸）；内部画布恒为 148rpx 基准、靠 transform 缩放 */
const wrapStyle = computed(() => `width:${props.size}rpx;height:${props.size}rpx;`);
</script>

<style scoped>
.paw-logo {
  position: relative;
  margin: 0 auto; /* 品牌标识在各页均为居中块 */
  flex-shrink: 0;
}
/* 148rpx 基准画布（登录页 1:1 用；启动页等由父级 style 的 scale 放大） */
.pl-canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 148rpx;
  height: 148rpx;
  border-radius: 38rpx;
  background: #56674e;
  transform-origin: left top;
}
/* 爪印：3 趾（8.4×10.4pt）+ 掌垫（20×17pt） */
.toe {
  position: absolute;
  width: 16.8rpx;
  height: 20.8rpx;
  border-radius: 50%;
  background: #fbf9f2;
}
.t1 {
  left: 47.6rpx;
  top: 51.6rpx;
}
.t2 {
  left: 65.6rpx;
  top: 42.6rpx;
}
.t3 {
  left: 83.6rpx;
  top: 51.6rpx;
}
.pad {
  position: absolute;
  left: 54rpx;
  top: 69rpx;
  width: 40rpx;
  height: 34rpx;
  border-radius: 50%;
  background: #fbf9f2;
}
</style>
