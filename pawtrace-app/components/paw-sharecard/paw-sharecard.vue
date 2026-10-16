<!--
  分享档案卡浮层（2026-10-08 晚新增）
  用途：档案页（S4）底部第三个按钮「分享档案卡」的出口——原「生成壁纸」点了只弹一句 toast。
  形制：与 paw-dialog / S10-2 申请弹层同一套手账语言：
        遮罩 `paw-scrim` + 居中纸白卡（#faf7f1 / 36rpx 圆角 / 顶部芥末胶带）+ 卡内滚动预览。
  内容：canvas 导出的卡片图（所见即所得——预览的就是能保存下来的那一张）+ 两个真实动作：
        「复制档案文案」（真写剪贴板）/「下载卡片 · 保存到相册」（H5 下载 / 小程序存相册）。
  ⚠️ 桌面浏览器手机壳适配：外层 `.paw-modal` / `.paw-scrim` 已在 App.vue 的 fixed 浮层清单登记。
-->
<template>
  <view v-if="show" class="paw-scrim" @tap="onClose" />
  <view v-if="show" class="paw-modal" @tap="onClose">
    <view class="sc-card" @tap.stop>
      <view class="sc-tape"></view>

      <view class="sc-head">
        <text class="sc-title">分享档案卡</text>
        <view class="sc-x" hover-class="sc-x--hover" hover-stay-time="60" @tap="onClose">
          <text class="sc-x-t">✕</text>
        </view>
      </view>

      <view class="sc-stage">
        <image v-if="dataUrl" class="sc-img" :src="dataUrl" mode="widthFix" />
        <view v-else class="sc-loading">
          <text class="sc-loading-t">正在生成卡片…</text>
        </view>
      </view>

      <text class="sc-tip">存图或复制文案发给邻居，让更多人一起留意它</text>

      <view class="sc-btns">
        <view class="sc-btn sc-btn--ghost" hover-class="sc-btn--hover" hover-stay-time="60" @tap="onCopy">
          <text class="sc-btn-t sc-btn-t--ghost">复制档案文案</text>
        </view>
        <view class="sc-btn sc-btn--main" hover-class="sc-btn--hover" hover-stay-time="60" @tap="onSave">
          <text class="sc-btn-t sc-btn-t--main">{{ saveText }}</text>
        </view>
      </view>

      <!-- 小程序端绘制载体（离屏放在视口左外侧；node.width/height 由脚本设定） -->
      <!-- #ifdef MP-WEIXIN -->
      <canvas type="2d" id="pawShareCanvas" class="sc-canvas" />
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, getCurrentInstance } from 'vue';
import {
  CARD_W,
  CARD_H,
  drawShareCard,
  buildShareText,
  exportShareCardH5,
  type ShareCardData,
} from '../../common/sharecard';

const props = defineProps<{ show: boolean; data: ShareCardData }>();
const emit = defineEmits<{ (e: 'close'): void }>();

/** 导出后的图片（H5 = dataURL / 小程序 = 临时文件路径）；预览与保存共用同一张 */
const dataUrl = ref('');

/** 保存按钮文案按平台分流（H5 是浏览器下载，小程序才是相册） */
let saveText = '保存到相册';
// #ifdef H5
saveText = '下载卡片';
// #endif

/* ---------------- H5：离屏 canvas 直接导出 ---------------- */
// #ifdef H5
async function renderCard(d: ShareCardData) {
  dataUrl.value = await exportShareCardH5(d);
}
// #endif

/* ---------------- 微信小程序：页面 canvas 2d → canvasToTempFilePath ---------------- */
// #ifdef MP-WEIXIN
function loadAvatarMp(url?: string): Promise<any> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    uni.getImageInfo({ src: url, success: (r) => resolve(r.path), fail: () => resolve(null) });
  });
}

function renderCard(d: ShareCardData) {
  return new Promise<void>((resolve) => {
    const inst = getCurrentInstance();
    uni.createSelectorQuery()
      .in(inst)
      .select('#pawShareCanvas')
      .fields({ node: true, size: true })
      .exec(async (res: any) => {
        const node = res?.[0]?.node;
        if (!node) return resolve();
        const ctx = node.getContext('2d');
        node.width = CARD_W;
        node.height = CARD_H;
        const avatar = await loadAvatarMp(d.avatarUrl);
        drawShareCard(ctx, d, avatar);
        uni.canvasToTempFilePath(
          {
            canvas: node,
            x: 0,
            y: 0,
            width: CARD_W,
            height: CARD_H,
            destWidth: CARD_W,
            destHeight: CARD_H,
            success: (r) => {
              dataUrl.value = r.tempFilePath;
              resolve();
            },
            fail: () => resolve(),
          },
          inst,
        );
      });
  });
}
// #endif

/** 每次打开都重新生成（档案数据可能已变） */
watch(
  () => props.show,
  (v) => {
    if (!v) return;
    dataUrl.value = '';
    renderCard(props.data).catch(() => {
      uni.showToast({ title: '卡片生成失败', icon: 'none' });
    });
  },
);

const onClose = () => emit('close');

/** 复制档案文案：真写剪贴板（成功提示由平台自带，失败才额外提示） */
const onCopy = () => {
  uni.setClipboardData({
    data: buildShareText(props.data),
    fail: () => uni.showToast({ title: '复制失败，请手动选择文字', icon: 'none' }),
  });
};

/** 保存卡片：H5 触发下载 / 小程序存相册 */
const onSave = async () => {
  if (!dataUrl.value) {
    uni.showToast({ title: '卡片还在生成，稍等一下', icon: 'none' });
    return;
  }
  // #ifdef H5
  // ⚠️ 不能直接给 <a href="data:image/png;...">：较新版 Chrome 会拦截 data: URL 的下载。
  //    先转成 blob URL（同源、不依赖用户手势）再触发，实测可稳定落盘。
  //    档案名来自用户输入，可能含 / : 等文件名非法字符，统一替换。
  const safe = String(props.data.name || '猫').replace(/[\\/:*?"<>|]/g, '_');
  try {
    const blob = await (await fetch(dataUrl.value)).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PawTrace-${safe}-档案卡.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    uni.showToast({ title: '卡片已下载', icon: 'none' });
  } catch {
    uni.showToast({ title: '下载失败，请长按卡片保存', icon: 'none' });
  }
  return;
  // #endif
  // #ifdef MP-WEIXIN
  uni.saveImageToPhotosAlbum({
    filePath: dataUrl.value,
    success: () => uni.showToast({ title: '已保存到相册', icon: 'none' }),
    fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' }),
  });
  // #endif
};
</script>

<style scoped>
/* 外层 fixed 全屏（.paw-modal 已登记）：只负责居中 */
.paw-modal {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 14;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 80rpx;
  box-sizing: border-box;
}

.sc-card {
  position: relative;
  width: 100%;
  max-width: 590rpx;
  box-sizing: border-box;
  padding: 44rpx 36rpx 36rpx;
  background: #faf7f1;
  border-radius: 36rpx;
  box-shadow: 0 12rpx 40rpx rgba(60, 64, 54, 0.2);
}
/* 顶部芥末胶带（与 paw-dialog 同规格） */
.sc-tape {
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

.sc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sc-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.sc-x {
  width: 48rpx;
  height: 48rpx;
  margin-right: -8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sc-x--hover {
  opacity: 0.6;
}
.sc-x-t {
  font-size: 26rpx;
  color: #8b8779;
  line-height: 1;
}

/* 预览区：卡片图按容器宽等比缩放，圆角裁切 */
.sc-stage {
  margin-top: 26rpx;
  min-height: 320rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #f0ebdf;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sc-img {
  display: block;
  width: 100%;
}
.sc-loading-t {
  font-size: 26rpx;
  color: #8a8a7e;
  line-height: 1;
}

.sc-tip {
  display: block;
  margin-top: 22rpx;
  font-size: 22rpx;
  color: #8a8a7e;
  line-height: 32rpx;
  text-align: center;
}

.sc-btns {
  display: flex;
  margin-top: 26rpx;
}
.sc-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sc-btn--ghost {
  background: #f0ebdf;
}
.sc-btn--main {
  margin-left: 20rpx;
  background: #8fa08b;
}
.sc-btn--hover {
  opacity: 0.86;
}
.sc-btn-t {
  font-size: 26rpx;
  line-height: 1;
}
.sc-btn-t--ghost {
  color: #6e6f58;
}
.sc-btn-t--main {
  color: #faf7f1;
  font-weight: 600;
}

/* 小程序绘制画布：移出视口，不影响布局 */
.sc-canvas {
  position: fixed;
  left: -2000rpx;
  top: 0;
  width: 750px;
  height: 1120px;
}
</style>
