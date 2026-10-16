<template>
  <!--
    爪印图形（CSS 手绘，不依赖图片/字体 emoji）
    设计稿用途：首页「今日相遇」盲盒卡片中央
    为什么不用 🐾 emoji：iOS/Android/微信/浏览器四端 emoji 字形与颜色都不一样，压不住设计
    颜色用内联 style 下发（不用 currentColor / CSS 变量，避免小程序端兼容问题）
  -->
  <view class="paw-print" :style="wrapStyle">
    <view class="paw paw--back">
      <view class="toe t1" :style="inkStyle"></view>
      <view class="toe t2" :style="inkStyle"></view>
      <view class="toe t3" :style="inkStyle"></view>
      <view class="toe t4" :style="inkStyle"></view>
      <view class="pad" :style="inkStyle"></view>
    </view>
    <view class="paw paw--front">
      <view class="toe t1" :style="inkStyle"></view>
      <view class="toe t2" :style="inkStyle"></view>
      <view class="toe t3" :style="inkStyle"></view>
      <view class="toe t4" :style="inkStyle"></view>
      <view class="pad" :style="inkStyle"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 图形整体宽度（rpx），高度按设计比例 56:50 自动换算 */
    size?: number;
    color?: string;
  }>(),
  { size: 56, color: '#3c4036' },
);

/** 基准尺寸 56×50rpx（S1 实测），整体缩放到目标宽度 */
const wrapStyle = computed(() => {
  const s = props.size / 56;
  const h = Math.round((props.size / 56) * 50);
  return `width:${props.size}rpx;height:${h}rpx;transform:scale(${s});transform-origin:center center;`;
});

const inkStyle = computed(() => `background:${props.color};`);
</script>

<style scoped>
.paw-print {
  position: relative;
}

.paw {
  position: absolute;
  width: 34rpx;
  height: 38rpx;
  transform-origin: left top;
}
/* 后方小爪（左上），缩小 0.8 后与前方大爪自然贴合 */
.paw--back {
  left: 0;
  top: 0;
  transform: scale(0.8);
}
/* 前方大爪（右下） */
.paw--front {
  left: 22rpx;
  top: 12rpx;
}

.toe {
  position: absolute;
  width: 9rpx;
  height: 10rpx;
  border-radius: 50%;
}
.t1 {
  left: 0;
  top: 11rpx;
}
.t2 {
  left: 7rpx;
  top: 3rpx;
}
.t3 {
  left: 17rpx;
  top: 3rpx;
}
.t4 {
  left: 24.5rpx;
  top: 11rpx;
}

.pad {
  position: absolute;
  left: 4rpx;
  top: 20rpx;
  width: 26rpx;
  height: 17rpx;
  border-radius: 52% 52% 46% 46%;
}
</style>
