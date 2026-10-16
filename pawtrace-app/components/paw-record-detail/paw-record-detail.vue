<!--
  打卡记录详情浮层（2026-10-10 晚新增）
  用途：列表里的打卡记录卡为了版面只显示要点（正文一行 / 类型只摆一个色块），
       用户不知道后面还有什么 ——「这些打卡记录有些被隐藏，可否点进去可以查看详情」。
       本组件是**记录详情查看**的唯一形制：任何展示打卡记录的列表（S5 时间轴
       pages/profile/timeline、S13 观察史 pages/history、S10-2 小组打卡列表
       pages/space/lists 的打卡 tab）都复用它，禁各页另做一套。
  形制：遮罩 `paw-rd-mask`（rgba(60,64,54,.56)，同 S3/S9 抽屉）+ 底部抽屉纸白卡
       （#faf7f1 / 上圆角 38rpx / 顶部一小段芥末胶带，与 paw-dialog 的手账口径一致）。
  数据：**全部由调用页从已渲染的列表项传入**（列表接口本身就返回 content 全文 / photos）→
       打开详情不需要任何新请求，游客态也能看，且不依赖新增后端接口。
  滚动：正文可能很长 → 内容区用 scroll-view（max-height），关掉卡片本身不再截断。
  ⚠️ 桌面手机壳适配：`.paw-rd-mask` 是铺满视口的 fixed 浮层 → 已在 App.vue 的
     `@media (min-width: 768px)` 清单里登记（否则在桌面浏览器里会横跨整块屏幕）。
  用法：
    <paw-record-detail
      :show="!!detail" :pills="detail.pills" :title="detail.title" :meta="detail.meta"
      :body="detail.body" :photo-url="detail.photoUrl" :extras="detail.extras"
      @close="detail = null" />
-->
<template>
  <view v-if="show" class="paw-rd-mask" @tap="onClose">
    <view class="paw-rd-sheet" @tap.stop>
      <view class="rd-tape"></view>

      <!-- 头部：类型胶囊（主类型 + 附加标签）+ 关闭 -->
      <view class="rd-head">
        <view class="rd-pills">
          <text
            v-for="(p, i) in (pills || [])" :key="i"
            class="rd-pill" :class="'rd-pill--' + p.cls"
          >{{ p.t }}</text>
        </view>
        <view class="rd-close" @tap="onClose"><view class="rd-close-x"></view></view>
      </view>

      <text v-if="showTitle" class="rd-title">{{ title }}</text>
      <text v-if="meta" class="rd-meta">{{ meta }}</text>

      <scroll-view class="rd-scroll" scroll-y :show-scrollbar="false">
        <!-- 照片：有才显示（列表里没照片时，详情也不摆一块假占位） -->
        <image v-if="photoUrl" class="rd-photo" :src="photoUrl" mode="aspectFill" />
        <text class="rd-text" :class="{ 'rd-text--none': !body }">{{ body || '这条记录没有留下文字描述' }}</text>

        <!-- 附加字段（季节 / 点位精度 / 记录编号…由调用页给） -->
        <view v-if="extras && extras.length" class="rd-extras">
          <view class="rd-extra" v-for="(e, i) in extras" :key="i">
            <text class="rd-extra-k">{{ e.k }}</text>
            <text class="rd-extra-v">{{ e.v }}</text>
          </view>
        </view>
        <view class="rd-gap"></view>
      </scroll-view>

      <view class="rd-btn" hover-class="rd-btn--hover" hover-stay-time="60" @tap="onClose">
        <text class="rd-btn-t">关闭</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    show: boolean;
    /** 类型胶囊：主类型 + 附加标签（与列表卡上的胶囊同源，形如 [{ t:'投喂', cls:'mustard' }]） */
    pills?: { t: string; cls: string }[];
    title?: string;
    /** 时间 · 点位 */
    meta?: string;
    body?: string;
    photoUrl?: string;
    /** 附加信息行（季节 / 定位精度 …），没有就不显示 */
    extras?: { k: string; v: string }[];
  }>(),
  { pills: () => [], title: '', meta: '', body: '', photoUrl: '', extras: () => [] },
);

/** 标题与首枚胶囊同文时省略 —— 记录表没有 title 列，列表页只能用类型中文兜底，
 *  详情头部再写一遍「投喂」就是同一句话说两遍（胶囊已经说了）。有独立标题（如「三花 · 投喂」）才显示。 */
const showTitle = computed(() => {
  const t = (props.title || '').trim();
  if (!t) return false;
  const first = (props.pills || [])[0];
  return !(first && first.t === t);
});

const emit = defineEmits<{ (e: 'close'): void }>();
const onClose = () => emit('close');
</script>

<style scoped>
/* 遮罩：铺满视口的 fixed 浮层，底部对齐（抽屉从下往上） */
.paw-rd-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 120;
  background: rgba(60, 64, 54, 0.56);
  display: flex;
  align-items: flex-end;
}
.paw-rd-sheet {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  max-height: 84vh;
  background: #faf7f1;
  border-radius: 38rpx 38rpx 0 0;
  padding: 34rpx 40rpx;
  padding-bottom: calc(30rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}
/* 顶部芥末胶带（与 paw-dialog 的 .pm-tape 同款手账点缀） */
.rd-tape {
  position: absolute;
  left: 50%;
  top: 12rpx;
  margin-left: -34rpx;
  width: 68rpx;
  height: 10rpx;
  border-radius: 4rpx;
  background: #d9c488;
  opacity: 0.85;
}

.rd-head {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rd-pills {
  display: flex;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}
.rd-pill {
  height: 40rpx;
  padding: 0 18rpx;
  margin-right: 8rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  line-height: 40rpx;
  flex-shrink: 0;
}
.rd-pill--terra { background: #c58a6e; color: #ffffff; }
.rd-pill--mustard { background: #d9c488; color: #5c4e2e; }
.rd-pill--olive { background: #8f9f8a; color: #ffffff; }
.rd-close {
  position: relative;
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
  margin-left: 12rpx;
}
.rd-close-x::before,
.rd-close-x::after {
  content: '';
  position: absolute;
  left: 10rpx;
  top: 21rpx;
  width: 24rpx;
  height: 2rpx;
  background: #8b8a7c;
}
.rd-close-x::before { transform: rotate(45deg); }
.rd-close-x::after { transform: rotate(-45deg); }

.rd-title {
  display: block;
  margin-top: 18rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 1.35;
}
.rd-meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #a29e8f;
  line-height: 1.3;
}
/* 标题被省略时（标题 = 首枚胶囊），meta 紧跟胶囊行，间距补回来 */
.rd-head + .rd-meta { margin-top: 18rpx; }

/* 内容区：超出即滚动（正文不再截断） */
.rd-scroll {
  margin-top: 22rpx;
  max-height: 56vh;
}
.rd-photo {
  width: 100%;
  height: 380rpx;
  border-radius: 24rpx;
  background: #e6e7eb;
  display: block;
}
.rd-text {
  display: block;
  margin-top: 22rpx;
  font-size: 28rpx;
  color: #3c4036;
  line-height: 1.62;
  white-space: pre-wrap;
  word-break: break-word;
}
.rd-text--none {
  color: #a29e8f;
  font-size: 26rpx;
}

.rd-extras {
  margin-top: 26rpx;
  background: #f6f2e7;
  border-radius: 22rpx;
  padding: 20rpx 24rpx;
}
.rd-extra {
  display: flex;
  align-items: flex-start;
}
.rd-extra + .rd-extra { margin-top: 14rpx; }
.rd-extra-k {
  width: 150rpx;
  flex-shrink: 0;
  font-size: 22rpx;
  color: #8b8a7c;
  line-height: 34rpx;
}
.rd-extra-v {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: #56674e;
  line-height: 34rpx;
}
.rd-gap { height: 8rpx; }

.rd-btn {
  margin-top: 26rpx;
  height: 84rpx;
  border-radius: 999rpx;
  background: #8fa08b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rd-btn--hover { opacity: 0.86; }
.rd-btn-t {
  font-size: 28rpx;
  color: #faf7f1;
  line-height: 1;
}
</style>
