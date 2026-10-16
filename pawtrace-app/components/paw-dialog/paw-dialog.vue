<!--
  手账风对话框（2026-10-08 晚新增）
  用途：替代原生的 uni.showModal —— 原生弹窗是系统白卡 + 系统蓝按钮，与米绿手账风完全脱节
       （用户反馈：「这个退出登录的卡片能不能风格跟 app 一致」）。
  形制：遮罩 `paw-scrim`（与 S9-2 科普卡 / S10-2 申请弹层同款 rgba(60,64,54,.245)）
       + 居中纸白卡（#faf7f1 / 32rpx 圆角 / 顶部一小段芥末胶带）
       + 标题 32rpx 700 / 正文 24rpx #6e6f58 行高 38rpx 居中
       + 底部双按钮行（1pt #F0EBDF 分隔）：取消 灰字 / 确认 陶土字（危险类语义色）
  ⚠️ 桌面浏览器手机壳适配：外层用 `.paw-modal`（已在 App.vue 的 fixed 浮层清单里登记，
     否则 fixed 层会以整个窗口为基准、飞出手机框）。
  用法：
    <paw-dialog :show="x" title="…" content="…" @cancel="x=false" @confirm="onOk" />
    单按钮（纯提示）：:show-cancel="false" confirm-text="知道了"
    带插槽（自定义内容，如输入框）：在标签之间放任意内容，会渲染在正文之下、按钮行之上
-->
<template>
  <view v-if="show" class="paw-scrim" @tap="onCancel" />
  <view v-if="show" class="paw-modal" @tap="onCancel">
    <view class="pm-card" @tap.stop>
      <view class="pm-tape"></view>
      <text class="pm-title">{{ title }}</text>
      <text v-if="content" class="pm-body">{{ content }}</text>
      <!-- 默认插槽（2026-10-08 晚新增）：给需要输入框的弹窗（如 S9 改标签）复用同一套壳 -->
      <slot />
      <view class="pm-btns" :class="{ 'pm-btns--single': !showCancel }">
        <view
          v-if="showCancel"
          class="pm-btn"
          hover-class="pm-btn--hover"
          hover-stay-time="60"
          @tap="onCancel"
        >
          <text class="pm-btn-t pm-btn-t--muted">{{ cancelText }}</text>
        </view>
        <view class="pm-btn" hover-class="pm-btn--hover" hover-stay-time="60" @tap="onConfirm">
          <text class="pm-btn-t" :class="confirmClass">{{ confirmText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    show: boolean;
    title: string;
    content?: string;
    cancelText?: string;
    confirmText?: string;
    /** danger → 确认按钮陶土色（退出登录 / 删除类）；plain → 苔绿（普通确认） */
    tone?: 'danger' | 'plain';
    /** 纯提示对话框（只有确认键） */
    showCancel?: boolean;
  }>(),
  {
    content: '',
    cancelText: '取消',
    confirmText: '确定',
    tone: 'danger',
    showCancel: true,
  },
);

const emit = defineEmits<{ (e: 'cancel'): void; (e: 'confirm'): void }>();

const confirmClass = computed(() => (props.tone === 'danger' ? 'pm-btn-t--danger' : 'pm-btn-t--plain'));

const onCancel = () => emit('cancel');
const onConfirm = () => emit('confirm');
</script>

<style scoped>
/* 外层 fixed 全屏（.paw-modal 已在 App.vue 手机壳清单中登记）：只负责居中 */
.paw-modal {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 80rpx;
  box-sizing: border-box;
}

/* 纸白卡：手账口径 = 无描边 + 圆角 + 柔和落影 */
.pm-card {
  position: relative;
  width: 100%;
  max-width: 590rpx;
  box-sizing: border-box;
  padding: 52rpx 40rpx 0;
  background: #faf7f1;
  border-radius: 36rpx;
  box-shadow: 0 12rpx 40rpx rgba(60, 64, 54, 0.2);
}
/* 顶部芥末胶带（手账装饰，居中；宽度收窄成小段，不用 192rpx 全宽） */
.pm-tape {
  position: absolute;
  left: 50%;
  top: -18rpx;
  width: 128rpx;
  height: 32rpx;
  margin-left: -64rpx;
  background: #dfcf9f;
  border-radius: 4rpx;
  opacity: 0.9;
}
.pm-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
  text-align: center;
}
.pm-body {
  display: block;
  margin-top: 28rpx;
  font-size: 24rpx;
  color: #6e6f58;
  line-height: 38rpx;
  text-align: center;
}

/* 按钮行：与卡片同宽、贴底，1pt 分隔线 */
.pm-btns {
  display: flex;
  margin-top: 40rpx;
  border-top: 2rpx solid #f0ebdf;
}
.pm-btn {
  flex: 1;
  height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pm-btn + .pm-btn {
  border-left: 2rpx solid #f0ebdf;
}
.pm-btn--hover {
  background: #f5efe2;
}
.pm-btn-t {
  font-size: 28rpx;
  line-height: 1;
}
.pm-btn-t--muted {
  color: #8b8779;
}
.pm-btn-t--danger {
  color: #c68b6f;
  font-weight: 700;
}
.pm-btn-t--plain {
  color: #56674e;
  font-weight: 700;
}
/* 圆角：按钮行的左右下角跟随卡片 */
.pm-btns--single .pm-btn {
  border-bottom-left-radius: 36rpx;
  border-bottom-right-radius: 36rpx;
}
.pm-btns .pm-btn:first-child {
  border-bottom-left-radius: 36rpx;
}
.pm-btns .pm-btn:last-child {
  border-bottom-right-radius: 36rpx;
}
</style>
