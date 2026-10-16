<template>
  <!--
    手机号绑定｜阶段3 功能页（PRD P1「账号与安全」）
    设计说明：线框稿（p28/p29 同族辅助屏）没有这一屏 —— 表单结构对齐 p29 注册页的
    「卡片 + 输入框 + 主按钮」语言，米绿手账风；本页为功能性增补，无像素基线包袱。
  -->
  <view class="paw-page ph">
    <paw-navbar title="绑定手机号" :top-pad="119.1" back-url="/pages/my/index" :back-tab="true" />

    <!-- 当前状态卡 -->
    <view class="paw-card st">
      <text class="st-t">{{ bound ? '已绑定手机号' : '还未绑定手机号' }}</text>
      <text class="st-s">{{ bound ? masked + ' · 可更换绑定' : '手机号在注册时绑定 · 用于登录与找回观察记录' }}</text>
    </view>

    <!-- 表单卡 -->
    <view class="paw-card fm">
      <view class="f-field">
        <text class="f-label">手机号</text>
        <input
          class="f-ipt"
          type="number"
          maxlength="11"
          v-model="phone"
          placeholder="请输入 11 位手机号"
          placeholder-class="ph-placeholder"
        />
      </view>
      <view class="f-field">
        <text class="f-label">验证码</text>
        <view class="f-code-row">
          <input
            class="f-ipt f-ipt--code"
            type="number"
            maxlength="6"
            v-model="code"
            placeholder="6 位验证码"
            placeholder-class="ph-placeholder"
          />
          <view class="f-send" :class="{ 'f-send--dis': counting || sending }" @tap="sendCode">
            <text class="f-send-t">{{ counting ? `${left}s 后重发` : sending ? '发送中…' : '获取验证码' }}</text>
          </view>
        </view>
      </view>

      <view class="f-cta" :class="{ 'f-cta--dis': binding }" @tap="bind">
        <text class="f-cta-t">{{ binding ? '绑定中…' : bound ? '更换绑定' : '绑定手机号' }}</text>
      </view>

      <text class="f-note">演示环境无短信通道：验证码会直接弹窗展示，直接填入即可</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '../../common/api';

const phone = ref('');
const code = ref('');
const sending = ref(false);
const binding = ref(false);
const counting = ref(false);
const left = ref(0);

/** 当前已绑定的手机号（来自本地 user；绑定成功后同步更新） */
const boundPhone = ref('');

const bound = computed(() => /^1\d{10}$/.test(boundPhone.value));
const masked = computed(() =>
  boundPhone.value ? boundPhone.value.slice(0, 3) + '****' + boundPhone.value.slice(7) : '',
);

onShow(() => {
  const u = uni.getStorageSync('user');
  boundPhone.value = (u && u.phone) || '';
});

/** 获取验证码：60s 倒计时；演示环境后端直接返回 code，弹窗引导 */
async function sendCode() {
  if (counting.value || sending.value) return;
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    uni.showToast({ title: '先输入正确的手机号', icon: 'none' });
    return;
  }
  sending.value = true;
  try {
    const r: any = await api.post('/auth/phone-code', { phone: phone.value });
    counting.value = true;
    left.value = 60;
    const timer = setInterval(() => {
      left.value -= 1;
      if (left.value <= 0) {
        counting.value = false;
        clearInterval(timer);
      }
    }, 1000);
    if (r?.code) {
      uni.showModal({
        title: '演示验证码',
        content: `验证码 ${r.code}（已自动填入，5 分钟内有效）`,
        showCancel: false,
      });
      code.value = String(r.code);
    }
  } catch {
    /* api.ts 已统一 toast（如「发送太频繁」） */
  } finally {
    sending.value = false;
  }
}

/** 提交绑定：成功后更新本地 user 并返回「我的」 */
async function bind() {
  if (binding.value) return;
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    uni.showToast({ title: '先输入正确的手机号', icon: 'none' });
    return;
  }
  if (!/^\d{4,6}$/.test(code.value)) {
    uni.showToast({ title: '先输入验证码', icon: 'none' });
    return;
  }
  binding.value = true;
  try {
    const u: any = await api.post('/auth/bind-phone', { phone: phone.value, code: code.value });
    const local = uni.getStorageSync('user') || {};
    uni.setStorageSync('user', { ...local, ...(u || {}), phone: phone.value });
    boundPhone.value = phone.value;
    uni.showToast({ title: '绑定成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 700);
  } catch {
    /* api.ts 已统一 toast（验证码错误/手机号已被绑定等） */
  } finally {
    binding.value = false;
  }
}
</script>

<style scoped>
.ph {
  min-height: calc(100vh - var(--window-top, 0px) - var(--window-bottom, 0px));
  box-sizing: border-box;
}

/* 状态卡 */
.st {
  margin-top: 36rpx;
}
.st-t {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.st-s {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #8b8779;
  line-height: 1.5;
}

/* 表单卡 */
.fm {
  margin-top: 24rpx;
}
.f-field {
  margin-top: 26rpx;
}
.f-field:first-child {
  margin-top: 0;
}
.f-label {
  display: block;
  font-size: 22rpx;
  color: #6e6f58;
  line-height: 1;
}
.f-ipt {
  margin-top: 12rpx;
  height: 76rpx;
  box-sizing: border-box;
  padding: 0 24rpx;
  background: #f0ebdf;
  border-radius: 24rpx;
  font-size: 26rpx;
  line-height: 76rpx;
  color: #3c4036;
}
.f-code-row {
  display: flex;
  align-items: center;
}
.f-ipt--code {
  flex: 1;
  min-width: 0;
}
.f-send {
  flex-shrink: 0;
  margin-left: 16rpx;
  height: 76rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  border: 2rpx solid #8fa08b;
  border-radius: 24rpx;
  background: #faf7f1;
  display: flex;
  align-items: center;
}
.f-send--dis {
  opacity: 0.5;
}
.f-send-t {
  font-size: 24rpx;
  color: #56674e;
  line-height: 1;
  white-space: nowrap;
}

/* 主按钮（对齐 p29 注册页 CTA：实心深绿） */
.f-cta {
  margin-top: 36rpx;
  height: 104rpx;
  border-radius: 52rpx;
  background: #56674e;
  display: flex;
  align-items: center;
  justify-content: center;
}
.f-cta--dis {
  opacity: 0.6;
}
.f-cta-t {
  font-size: 32rpx;
  color: #faf7f1;
  line-height: 1;
}

.f-note {
  display: block;
  margin-top: 20rpx;
  font-size: 22rpx;
  color: #a69e8c;
  line-height: 1;
  text-align: center;
}
</style>

<style>
/* placeholder 不在 scoped 作用域（uni-input 内层节点），非 scoped 块下发；
   ph-placeholder 前缀限本页 */
.ph-placeholder {
  color: #b4b0a2;
  font-size: 26rpx;
  line-height: 26rpx;
  height: 26rpx;
}
</style>
