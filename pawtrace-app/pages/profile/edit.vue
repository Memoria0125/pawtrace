<template>
  <!--
    档案编辑页（2026-10-09 新增功能页，无设计稿）
    起因：S4 详情页右上角「编辑」原来只是一句 toast 占位，用户点了没反应。
    口径：
      · 头部沿用 S7-P1（绑定手机号）的既有做法：自绘导航 + 与详情页同一 topPad，
        标题「编辑档案」，右侧「保存」；
      · 表单样式全部复用建档页（pages/profile/create.vue）的令牌与类名，
        不引入新的视觉语言；
      · 只有建档人本人可编辑（后端 PATCH 已加归属校验，非本人 403）。
    可改字段：昵称 / 毛色 / 体型 / 特征标记 / 健康状态 / 绝育状态 / 出没点位名。
  -->
  <view class="paw-page edit">
    <paw-navbar title="编辑档案" :left-w="200" :right-w="200" :right-pad="0">
      <template #right>
        <text class="paw-nav-act" :class="{ 'paw-nav-act--busy': saving }" @tap="onSave">保存</text>
      </template>
    </paw-navbar>

    <view v-if="!loaded" class="loading">
      <text class="loading-txt">{{ err || '正在读取档案…' }}</text>
    </view>

    <template v-else>
      <text class="label">昵称</text>
      <input v-model="form.name" class="input" placeholder="给它起个名字" placeholder-style="color:#a29e8f" maxlength="20" />

      <text class="label">毛色</text>
      <view class="chips">
        <view
          v-for="c in COATS"
          :key="c"
          class="hchip"
          :class="{ 'hchip--on': form.coatColor === c }"
          @tap="pick('coatColor', c)"
        >{{ c }}</view>
      </view>
      <input v-model="form.coatColor" class="input" placeholder="或自己写（如：橘白 / 狸花加白）" placeholder-style="color:#a29e8f" maxlength="10" />

      <text class="label">体型</text>
      <view class="chips">
        <view
          v-for="b in BODIES"
          :key="b"
          class="hchip"
          :class="{ 'hchip--on': form.bodySize === b }"
          @tap="pick('bodySize', b)"
        >{{ b }}</view>
      </view>

      <text class="label">特征标记</text>
      <input v-model="form.specialMarks" class="input" placeholder="如：左耳剪耳 / 尾巴短一截" placeholder-style="color:#a29e8f" maxlength="30" />

      <text class="label">健康状态</text>
      <view class="chips">
        <view
          v-for="h in HEALTHS"
          :key="h.value"
          class="hchip"
          :class="{ 'hchip--on': form.healthStatus === h.value }"
          @tap="pick('healthStatus', h.value)"
        >{{ h.label }}</view>
      </view>

      <text class="label">绝育状态</text>
      <view class="chips">
        <view
          v-for="s in NEUTERS"
          :key="s.value"
          class="hchip"
          :class="{ 'hchip--on': form.sterilizationStatus === s.value }"
          @tap="pick('sterilizationStatus', s.value)"
        >{{ s.label }}</view>
      </view>

      <text class="label">出没点位</text>
      <input v-model="form.lastSeenDesc" class="input" placeholder="如：图书馆东门花坛" placeholder-style="color:#a29e8f" maxlength="20" />
      <text class="hint">点位名只有自己填过才有；坐标仍是建档时的街区级模糊位置。</text>

      <view class="paw-cta-wrap">
        <view class="cta" :class="{ 'cta--busy': saving }" @tap="onSave">保存修改</view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { BODIES, COATS, HEALTHS, NEUTERS } from '../../common/profile-fields';
import type { HealthValue, NeuterValue } from '../../common/profile-fields';

const id = ref('');
const loaded = ref(false);
const saving = ref(false);
const err = ref('');

const form = reactive({
  name: '',
  coatColor: '',
  bodySize: '',
  specialMarks: '',
  healthStatus: '',
  sterilizationStatus: '',
  lastSeenDesc: '',
});

onLoad(async (q) => {
  id.value = q?.id || '';
  if (!id.value) {
    err.value = '缺少档案 id';
    return;
  }
  try {
    const d: any = await api.get(`/profiles/${id.value}`);
    form.name = d.name || '';
    form.coatColor = d.coatColor || '';
    form.bodySize = d.bodySize || '';
    form.specialMarks = d.specialMarks || '';
    form.healthStatus = d.healthStatus || '';
    form.sterilizationStatus = d.sterilizationStatus || '';
    form.lastSeenDesc = d.lastSeenDesc || '';
    loaded.value = true;
  } catch {
    err.value = '档案读取失败，请稍后再试';
  }
});

/** 点选胶囊：再点一次取消（与建档页同口径；字段选项两页共用 common/profile-fields.ts） */
function pick(
  key: 'coatColor' | 'bodySize' | 'healthStatus' | 'sterilizationStatus',
  v: string | HealthValue | NeuterValue,
) {
  const cur = (form as any)[key];
  (form as any)[key] = cur === v ? '' : v;
}

async function onSave() {
  if (saving.value || !loaded.value) return;
  if (!form.name.trim()) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' });
    return;
  }
  saving.value = true;
  try {
    // 只发有值的字段：空字符串不上送（后端 undefined = 不改动）
    await api.patch(`/profiles/${id.value}`, {
      name: form.name.trim(),
      coatColor: form.coatColor || undefined,
      bodySize: form.bodySize || undefined,
      specialMarks: form.specialMarks || undefined,
      healthStatus: form.healthStatus || undefined,
      sterilizationStatus: form.sterilizationStatus || undefined,
      lastSeenDesc: form.lastSeenDesc || undefined,
    });
    uni.showToast({ title: '已保存', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 700);
  } catch {
    /* api.ts 非 2xx 已统一 toast（非本人会提示「只能编辑自己建的档案」） */
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.edit {
  padding: 0 40rpx 220rpx;
  box-sizing: border-box;
}
.loading {
  padding-top: 120rpx;
  text-align: center;
}
.loading-txt {
  font-size: 26rpx;
  color: #8b8a7c;
}
.label {
  display: block;
  margin-top: 40rpx;
  font-size: 28rpx;
  color: #56674e;
  line-height: 1.2;
}
.chips {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
}
.hchip {
  height: 60rpx;
  padding: 0 28rpx;
  margin: 0 16rpx 16rpx 0;
  border-radius: 999rpx;
  background: #ece7db;
  color: #56674e;
  font-size: 26rpx;
  display: flex;
  align-items: center;
}
.hchip--on {
  background: #55684f;
  color: #faf7f1;
}
.input {
  margin-top: 16rpx;
  width: 100%;
  height: 95rpx;
  box-sizing: border-box;
  padding: 0 28rpx;
  background: #faf7f1;
  border-radius: 22rpx;
  font-size: 26rpx;
  color: #3c4036;
}
.hint {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #a29e8f;
  line-height: 1.4;
}
.paw-cta-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 8rpx;
  bottom: calc(8rpx + constant(safe-area-inset-bottom));
  bottom: calc(8rpx + env(safe-area-inset-bottom));
  padding: 0 40rpx;
  box-sizing: border-box;
  z-index: 20;
}
.cta {
  height: 88rpx;
  border-radius: 999rpx;
  background: #8fa08b;
  color: #faf7f1;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cta:active {
  opacity: 0.86;
}
.cta--busy {
  opacity: 0.6;
}
</style>
