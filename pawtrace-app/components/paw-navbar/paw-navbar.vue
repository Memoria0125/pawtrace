<template>
  <!--
    自绘导航（全局唯一顶部导航）
    为什么抽成组件：设计稿里「返回」块在 p5/p6/p7/p10/p11 五页上**逐像素完全一致**
    （chevron 墨迹 x 20.63~23.67 / y 87.58~94.00；「返回」墨迹 x 29.08~57.48 /
     y 82.51~96.37，两字起点步进 15.89pt），说明设计用的是同一个组件。
    此前五页各自手抄一份 CSS，逐页单独测量时把噪声当成差异 → 变成 28/30/32rpx 三个字号、
    三种箭头尺寸，肉眼可见不齐。收进组件后只存在一份真值。

    用法：
      <paw-navbar title="个体档案" :right-w="216">
        <template #right>
          <text class="paw-nav-act paw-nav-act--md">编辑</text>
        </template>
      </paw-navbar>

    右侧动作文字统一走 App.vue 的全局类 .paw-nav-act（禁止页面里另起字号/颜色）：
      .paw-nav-act           26rpx #56674E  —— p5「1/2 拍照」
      .paw-nav-act--md       28rpx          —— p6「编辑」/ p7「导出」
      .paw-nav-act--muted    #8FA08B        —— p10「稍后再说」/ p11「存草稿」
    这两档字号与两种颜色是设计稿本来的写法（实测：编辑/导出 步进 14.20/14.54pt，
    稍后再说/存草稿/拍照 步进 13.04/12.85/13.18pt），不是实现漂移，故保留。
  -->
  <view class="paw-nav" :style="{ paddingTop: topPad + 'rpx' }">
    <!-- 左块：chevron + 返回。宽度可调 —— 设计稿各页标题中心并不一致（p6/p7 193.08pt、
         p10/p11 ≈185pt、p5 183.11pt），要靠左右块宽差把 flex:1 的标题推到设计位置 -->
    <view v-if="showBack" class="paw-nav-back" :style="{ width: leftW + 'rpx' }" @tap="onBack">
      <view class="paw-chev">
        <view class="paw-chev-a"></view>
        <view class="paw-chev-b"></view>
      </view>
      <text class="paw-nav-back-txt">返回</text>
    </view>
    <view v-else class="paw-nav-back" :style="{ width: leftW + 'rpx' }"></view>

    <text class="paw-nav-title" :style="{ left: titleShift + 'rpx' }">{{ title }}</text>

    <view
      class="paw-nav-right"
      :style="{ width: rightW + 'rpx', paddingRight: rightPad + 'rpx' }"
    >
      <slot name="right" />
    </view>
  </view>
</template>

<script setup lang="ts">
// ⚠️ 用相对路径，不要写 '@/common/nav'：本项目是 HBuilderX 工程（无 vite.config），
//    `@` 别名只在 dev server 下被 DCloud 运行时兜住，云端打包/CLI 构建不保证存在。
//    全仓库其它文件一律用相对路径，这里保持一致。
import { goBack } from '../../common/nav';

const props = withDefaults(
  defineProps<{
    /** 居中大标题 */
    title?: string;
    /** 左块宽度（rpx），决定标题被推到的水平位置 */
    leftW?: number;
    /** 右块宽度（rpx），同上 */
    rightW?: number;
    /** 右块右内边距（rpx）——各页右动作墨迹右端不同（p6 354.72 / p5 354.38 /
     *  p7 353.70 / p11 349.64 / p10 348.63pt），故做成参数 */
    rightPad?: number;
    /** 标题水平微调（rpx，正=右） */
    titleShift?: number;
    /** 导航行距页面顶部的距离（rpx）。设计稿五页「返回」墨迹 y 一致 → 默认值全站统一 */
    topPad?: number;
    /** 是否显示返回 */
    showBack?: boolean;
    /** 栈深不足时的兜底目标 */
    backUrl?: string;
    /** 附在 backUrl 后的查询串（如 `?id=xxx`）—— 目标页需要参数时用它，页面侧不必拼 URL
     *  ⚠️ 2026-10-10 前此参数**根本没有声明**，页面上写的 `:back-q` 被静默丢弃
     *  （表现为「能跳过去但目标页参数全丢」），排查时极难看出 */
    backQ?: string;
    /** 兜底目标是否为 Tab 页（true 走 switchTab）。⚠️ 已不参与决策：
     *  跳法由 common/nav 依据 backUrl 推导，此参数仅为兼容保留 */
    backTab?: boolean;
  }>(),
  {
    title: '',
    leftW: 200,
    rightW: 209,
    rightPad: 8.1,
    titleShift: 0,
    topPad: 133.3,
    showBack: true,
    backUrl: '/pages/home/index',
    backQ: '',
    backTab: true,
  },
);

const emit = defineEmits<{ (e: 'back'): void }>();

/**
 * 返回：必须走 common/nav 的 goBack —— 栈深只有 1 层时 uni.navigateBack
 * 在 H5 会「假装成功」（success 触发、fail 不触发、页面不动），fail 兜底是死代码。
 * backUrl（+backQ）描述「栈深不足时去哪」：本页唯一入口的上一级，或首页 Tab。
 */
function onBack() {
  emit('back');
  goBack({ url: props.backUrl + (props.backQ || ''), tab: props.backTab });
}
</script>

<style scoped>
/*
  导航行：高 88rpx，box-sizing: content-box，故 padding-top 就是内容行的起点。
  真值来自 p5/p6/p7/p10/p11 五页实测：五页「返回」墨迹都在 y 82.51~96.37pt，
  对应 H5 padding-top = 133.3rpx（内容行中心 88.65pt，文字墨迹中心落在 89.44pt）。
  ⚠️ 不要再逐页改动这个值 —— 五页设计稿在这里是完全一致的。
*/
.paw-nav {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding-top: calc(var(--status-bar-height) + 44.6rpx);
  box-sizing: content-box;
}
/* #ifdef H5 */
.paw-nav {
  padding-top: 133.3rpx;
}
/* #endif */

.paw-nav-back {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/*
  返回箭头：设计稿实测墨迹 3.04×6.42pt（x 20.63~23.67 / y 87.58~94.00，五页一致），
  是一枚**细长尖括号**。用「旋转方形描边」做出来是等宽方块（最小也有 ~10pt），
  横向会超 3pt 以上；故用两根 2×8rpx 细棒以 ±45° 拼出尖角。
  ⚠️ 方向：尖角朝左（'<'）。上棒绕其**下端点**顺时针转到右上，下棒绕其**上端点**
     逆时针转到右下 → 两棒在同一条左侧竖线处汇合。（写成 -45/45 会渲染成 '>'。）
  left / top 偏移：翻转后墨迹相对盒中心有位移，用 position:relative 拉回设计位置，
  且不占布局流、不影响右侧「返回」文字。
*/
.paw-chev {
  position: relative;
  left: -3.6rpx;
  top: 3.7rpx;
  width: 8rpx;
  height: 14rpx;
  margin: 0 8rpx 0 1rpx;
  flex-shrink: 0;
}
.paw-chev-a,
.paw-chev-b {
  position: absolute;
  left: 2rpx;
  width: 2rpx;
  height: 8rpx;
  background: #8b8779;
  border-radius: 1rpx;
}
.paw-chev-a {
  top: 0;
  transform-origin: 50% 100%;
  transform: rotate(45deg);
}
.paw-chev-b {
  top: 8rpx;
  transform-origin: 50% 0%;
  transform: rotate(-45deg);
}

/* 返回文字：实测两字起点步进 15.89pt → 30rpx（不是 28 / 32）。五页一致。 */
.paw-nav-back-txt {
  font-size: 30rpx;
  color: #8b8779;
  line-height: 1;
}

/* 标题：墨迹高 22.66pt / 字步进 23.5pt → 48rpx。
   top 偏移：设计稿标题墨迹中心比「返回」高 0.17pt，当前渲染低 0.5pt → 补 0.67pt。 */
.paw-nav-title {
  flex: 1;
  position: relative;
  top: -1.35rpx;
  text-align: center;
  font-size: 48rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}

.paw-nav-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  box-sizing: border-box;
}
</style>
