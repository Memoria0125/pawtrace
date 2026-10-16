<template>
  <!--
    S0 登录（p28）｜PDF 第 28 屏｜PRD 用户登录
    设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p28，逐像素实测（375×812 @2.9573x）
    几何取自 PDF **矢量图元**（page.get_drawings()，比像素更准）+ 圆角/字距像素回归；
    1 design px = 2rpx（pt 直接 ×2）。

    纵向锚点（pt，均为矢量实测）：
      状态栏 24.9–37.2（H5 不绘制，同 S1/S6/S10-x 惯例）
      logo 方块 106–180（74×74）· 「爪迹」墨迹 188.0–214.6 · PAWTRACE 226.6–234.1
      副标题 243.1–256.5 · 卡片描边外框 304–559 · 主按钮 573–625
      分隔行 646–647 · 微信圆 667–713 · 底部注册行 728.1–740.2
    横向：内容区 24–351（页面留白 48rpx）；卡内 44–331（卡内边距 40rpx）；
      输入框 287×46 R24rpx；主按钮 327×52 **全圆 52rpx**；微信圆外径 46 R23pt。

    刻意处理（非漏做）：
      1. 2026-10-06 密码账号体系上线：「登录」按钮真实调用 POST /auth/login
         （手机号 + 密码），成功存 token/user 后按 from 回跳；错误凭据 toast 后端信息。
      2. 密码框圆点：**2026-10-11 用户指定改用「原生圆点」**（与 S0-注册 页保持一致）。
         原为实现设计稿 p28 的圆点形状（⌀4.38pt / 步进 7.44pt）做过「隐藏原生圆点 + 自绘 .pwd-dots」，
         用户拿登录页与注册页对比后要求统一走原生渲染 ⇒ 移除 `.pwd-dots` / `.inp-blind`
         （透明文字那套同时也不用再补 `caret-color`：文字颜色恢复正常，原生圆点与光标都自然可见）。
         ⚠️ 原生圆点的形状/大小与设计稿画的不完全一致 ⇒ 并入本页「用户指定刻意偏离」。
      3. **胶带装饰已按用户要求改为卡片右上角斜贴**（2026-10-01，刻意偏离 PDF）：原 p28 为
         卡片底部 192×36rpx 4rpx 圆角色块，现改为 .tape-tr（108×28rpx、rotate(45deg) 包角）。
      4. 「或」分隔线：两段 120pt 线 + 中间 36pt 槽给「或」居中，整行 276pt 居中。
      5. **2026-10-11 用户指定：密码框补占位提示**「请输入密码」（与手机号「请输入手机号」同款）。
         原为 `:placeholder="''"`（刻意留空——设计稿 p28 该框画的是「已输入 8 颗圆点」态，
         填了值就看不到占位；移除预填后空态成为常态，留空会让这个框看起来「什么都没有」）。
         占位色沿用 `.lp-ph`（#B5B0A2，与手机号一致），属同一条「用户指定刻意偏离」的一部分。
  -->
  <view class="login-page">
    <!-- ============ 品牌区 ============ -->
    <!-- 品牌标识：2026-10-11 抽为 components/paw-logo（登录页 :size=148 与设计稿 1:1；
         启动页复用同一份资产放大到 200rpx，避免两页手抄爪印坐标） -->
    <paw-logo class="logo" :size="148" />
    <text class="brand">爪迹</text>
    <text class="brand-en">PAWTRACE</text>
    <text class="slogan">欢迎回来，继续记录它们的足迹</text>

    <!-- ============ 登录卡 ============ -->
    <view class="card">
      <!-- 右上角斜贴胶带（用户自定义装饰，替代原 PDF 卡底胶带） -->
      <view class="tape-tr" />
      <text class="lbl">手机号</text>
      <input
        v-model="phone"
        class="inp"
        type="number"
        maxlength="11"
        placeholder="请输入手机号"
        placeholder-class="lp-ph"
      />

      <text class="lbl lbl2">密码</text>
      <view class="pwd-wrap">
        <!-- 2026-10-11 用户指定：圆点改走**原生渲染**（与注册页一致），
             自绘 .pwd-dots 与隐藏原生圆点的 .inp-blind 一并移除 -->
        <input
          v-model="pwd"
          class="inp inp-pwd"
          :password="!showPwd"
          placeholder="请输入密码"
          placeholder-class="lp-ph"
        />
        <view class="eye" @tap="showPwd = !showPwd">
          <view class="eye-p" />
        </view>
      </view>

      <text class="forgot" @tap="onForgot">忘记密码?</text>
    </view>

    <!-- ============ 主按钮 ============ -->
    <view class="btn-login" @tap="onLogin">
      <text class="btn-txt">登</text>
      <text class="btn-txt btn-txt2">录</text>
    </view>

    <!-- ============ 或 ============ -->
    <view class="or-row">
      <view class="or-line" />
      <text class="or-txt">或</text>
      <view class="or-line" />
    </view>

    <!-- ============ 微信 ============ -->
    <view class="wx" @tap="onWx">
      <text class="wx-txt">微</text>
    </view>

    <!-- ============ 注册入口 ============ -->
    <view class="reg-row">
      <text class="reg-q">还没有账号？</text>
      <text class="reg-a" @tap="onRegister">立即注册</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { authRequest, saveSession } from '../../common/auth';

/** 密码初值恒为空（2026-10-11 用户指定移除原 DEMO 预填 12345678，见文件头「刻意处理」2） */
const phone = ref('');
const pwd = ref('');
const showPwd = ref(false);
/** 登录请求进行中（防双击） */
const busy = ref(false);
/** 来源页：从「我的」的观察者卡进来时（from=my）登录成功后回跳原页 */
const from = ref('');

onLoad((q: any) => {
  from.value = q?.from || '';
});

// #ifdef H5
/**
 * 抑制 Chrome 对密码框的自动填充（2026-10-11，用户报障「两种占位咋不一样」）。
 *
 * 背景：uni-app H5 的底层 `<input>` 固定写 `autocomplete="off"`（模板上写 autocomplete 也会被它覆盖），
 * 而 **Chrome 对密码框忽略 `off`** —— 仍会弹「已保存的密码」并自动填入，
 * 表现成密码框里一片浅蓝底 + 圆点，与手机号的灰色占位提示完全不像。
 * 解法：渲染完成后把底层节点换成 Chrome 唯一认的抑制值 `new-password`（模板属性写法无效，只能改 DOM）。
 * ⚠️ 仅 H5 需要（App / 小程序走原生控件，无此机制）。
 */
onMounted(() => {
  const el = document.querySelector('.login-page .inp-pwd input') as HTMLInputElement | null;
  if (el) el.setAttribute('autocomplete', 'new-password');
});
// #endif

async function onLogin() {
  if (busy.value) return;
  if (!/^1[3-9]\d{9}$/.test(phone.value.trim())) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  if (!pwd.value) {
    uni.showToast({ title: '请输入密码', icon: 'none' });
    return;
  }
  busy.value = true;
  try {
    // 真实登录：手机号 + 密码（authRequest 走裸 uni.request，避免 api.ts 的 401 踢回）
    const data = await authRequest<{ token: string; user: any }>('POST', '/auth/login', {
      phone: phone.value.trim(),
      password: pwd.value,
    });
    saveSession(data);
    uni.showToast({ title: '登录成功', icon: 'none' });
    setTimeout(done, 600);
  } catch (e: any) {
    // 凭据错误（后端 msg）或网络失败（errMsg），都留在登录页重试
    uni.showToast({ title: e?.message || '登录失败，请重试', icon: 'none' });
  } finally {
    busy.value = false;
  }
}

/** 登录后去向：按 from 回原页（401 场景 reLaunch 进来栈深为 1，统一用跳转而非返回）
 *  - from 为 tabBar 页 → switchTab（tab 页只能 switchTab）
 *  - from 为普通页（如观察史、申请协作）→ redirectTo 回去
 *  - 无 from → 首页
 *  兼容旧约定 from=my（「我的」观察者卡跳入）
 */
const TAB_PAGES = ['pages/home/index', 'pages/map/nearby', 'pages/history/index', 'pages/my/index'];

function done() {
  let target = '';
  if (from.value === 'my') {
    target = '/pages/my/index';
  } else if (from.value) {
    try {
      target = decodeURIComponent(from.value);
    } catch {
      target = from.value;
    }
  }
  if (!target) {
    uni.switchTab({ url: '/pages/home/index' });
    return;
  }
  const path = target.split('?')[0].replace(/^\//, '');
  if (TAB_PAGES.includes(path)) {
    uni.switchTab({ url: '/' + path });
  } else {
    // 栈里上一页就是目标页（用户从该页点「去登录」navigateTo 进来的）
    // → 直接回退，否则 redirectTo 会在栈里留下两个同一页
    const pages = getCurrentPages();
    const prev: any = pages[pages.length - 2];
    if (prev && (prev.route || '') === path) {
      uni.navigateBack();
      return;
    }
    uni.redirectTo({ url: target });
  }
}

function onForgot() {
  uni.showToast({ title: '阶段3接入短信找回', icon: 'none' });
}

function onWx() {
  uni.showToast({ title: '阶段3接入微信登录', icon: 'none' });
}

function onRegister() {
  uni.navigateTo({ url: '/pages/login/register' });
}
</script>

<style scoped>
/* ============ 页面 ============ */
/* 顶部留白放在页面 padding-top（原为 .logo margin-top，会与页面发生外边距塌陷：
   页面被推到 y=106、高 100vh → 文档高 918 溢出视口，右侧出现滚动条并挤窄内容区，
   同 App.vue `.paw-page` 注释里记录的坑）。改为显式 padding 后 y 坐标完全不变。 */
.login-page {
  min-height: calc(100vh - var(--window-top, 0px) - var(--window-bottom, 0px));
  box-sizing: border-box;
  padding: 212rpx 48rpx 0;
  background: #f0ebdf;
}

/* ============ 品牌区 ============ */
/* logo 方块（74×74pt = 148rpx，R38rpx，深苔绿 #56674E）与其中的白色爪印（3 趾 8.4×10.4pt
   + 掌垫 20×17pt），自 2026-10-11 起统一由 components/paw-logo 承载（:size="148" 即设计稿 1:1）。
   这里只留居中兜底：scoped 样式在 H5 能命中组件根、小程序端则靠组件自带的 margin:0 auto。 */
.logo {
  margin: 0 auto;
}

/* 「爪迹」28pt/56rpx 700 墨绿黑（logo 底→字顶 7.44pt） */
.brand {
  display: block;
  margin-top: 11.5rpx;
  font-size: 56rpx;
  font-weight: 700;
  line-height: 1;
  color: #3c4036;
  text-align: center;
}
/* PAWTRACE 10pt/20rpx 图标灰，字距 1.35rpx（实测总宽 54.44pt） */
.brand-en {
  display: block;
  margin-top: 21.3rpx;
  font-size: 20rpx;
  letter-spacing: 1.35rpx;
  text-indent: 1.35rpx; /* 抵消末字右侧多出的一份字距 */
  line-height: 1;
  color: #8b877a;
  text-align: center;
}
/* 副标题 14pt/28rpx */
.slogan {
  display: block;
  margin-top: 16.18rpx;
  font-size: 28rpx;
  line-height: 1;
  color: #8b877a;
  text-align: center;
}

/* ============ 登录卡（327×255pt，描边 1pt #E5DFD0，R32rpx） ============ */
.card {
  position: relative; /* 角贴胶带的定位基准 */
  margin-top: 94.16rpx;
  padding: 40rpx 40rpx 38rpx;
  background: #faf8f1;
  border: 2rpx solid #e5dfd0;
  border-radius: 32rpx;
  box-sizing: border-box;
}
/* 标签 12pt/24rpx 图标灰 */
.lbl {
  display: block;
  font-size: 24rpx;
  line-height: 1;
  color: #8b877a;
}
.lbl2 {
  margin-top: 25.12rpx;
}
/* 输入框 287×46pt → 574×92rpx，底 = 页面米底，R24rpx */
.inp {
  display: block;
  width: 100%;
  height: 92rpx;
  margin-top: 30rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: #f0ebdf;
  font-size: 28rpx;
  line-height: 92rpx;
  color: #3c4036;
}
/* 密码行：输入框 + 右侧眼睛 */
.pwd-wrap {
  position: relative;
  margin-top: 30.24rpx;
}
.inp-pwd {
  margin-top: 0;
}
/* 眼睛：外轮廓 28.94×20.6rpx（描边 2.7rpx）+ 瞳孔环 ⌀11.8rpx */
.eye {
  position: absolute;
  right: 29.52rpx;
  top: 34.7rpx;
  width: 28.94rpx;
  height: 20.6rpx;
}
.eye::before,
.eye::after {
  content: '';
  position: absolute;
  left: 0;
  width: 28.94rpx;
  height: 10.3rpx;
  box-sizing: border-box;
}
.eye::before {
  top: 0;
  border-top: 2.7rpx solid #b5b0a2;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
}
.eye::after {
  bottom: 0;
  border-bottom: 2.7rpx solid #b5b0a2;
  border-radius: 0 0 50% 50% / 0 0 100% 100%;
}
.eye .eye-p {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 11.8rpx;
  height: 11.8rpx;
  margin: -5.9rpx 0 0 -5.9rpx;
  box-sizing: border-box;
  border: 2.7rpx solid #b5b0a2;
  border-radius: 50%;
}
/* 忘记密码? 12pt/24rpx 深苔绿，右对齐（右缘距内容右 7.15pt） */
.forgot {
  display: block;
  margin-top: 23.62rpx;
  margin-right: 11.3rpx;
  font-size: 24rpx;
  line-height: 1;
  color: #56674e;
  text-align: right;
}
/* 右上角斜贴胶带（用户自定义装饰，2026-10-01）：108×28rpx，45° 包角，
   中心压在卡片右上角（仅沿对角内移 4rpx：top:-10rpx + right:-50rpx），两端各探出卡缘 ~34rpx；
   旋转后最右沿 744.1rpx < 750 不出视口 */
.tape-tr {
  position: absolute;
  top: -10rpx;
  right: -50rpx;
  width: 108rpx;
  height: 28rpx;
  transform: rotate(45deg);
  background: #dfcf9f;
}

/* ============ 主按钮（327×52pt，全圆 52rpx，深苔绿） ============ */
.btn-login {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 28.66rpx;
  height: 104rpx;
  border-radius: 52rpx;
  background: #56674e;
}
.btn-login:active {
  opacity: 0.88;
}
.btn-txt {
  font-size: 32rpx;
  line-height: 1;
  color: #faf7f1;
}
/* 设计「登 录」两字起点距（实测字起点差 23.98pt，录右缘 205.93pt） */
.btn-txt2 {
  margin-left: 14.66rpx;
}

/* ============ 或分隔行（276pt 居中：120 线 + 36 槽 + 120 线） ============ */
.or-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 29.1rpx;
  height: 24rpx;
}
.or-line {
  width: 240rpx;
  height: 2rpx;
  background: #e5dfd0;
}
.or-txt {
  width: 72rpx;
  font-size: 24rpx;
  line-height: 1;
  color: #b5b0a2;
  text-align: center;
}

/* ============ 微信圆（外径 43.5pt = 87rpx 实测墨迹，纸白 + 1pt 描边） ============ */
.wx {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 33.66rpx auto 0;
  width: 87rpx;
  height: 87rpx;
  box-sizing: border-box;
  border: 2rpx solid #e5dfd0;
  border-radius: 50%;
  background: #faf8f1;
}
.wx:active {
  opacity: 0.86;
}
.wx-txt {
  margin-left: 2.02rpx; /* 「微」字在圆内居中后墨迹整体左偏 1.01pt（字面度量）*/
  font-size: 34rpx;
  line-height: 1;
  color: #56674e;
}

/* ============ 底部注册行 ============ */
.reg-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 29.42rpx;
  padding-bottom: 60rpx;
}
.reg-q {
  font-size: 26rpx;
  line-height: 1;
  color: #8b877a;
}
.reg-a {
  margin-left: 8.6rpx;
  font-size: 26rpx;
  line-height: 1;
  color: #56674e;
}
</style>

<!-- 非 scoped：uni-app 的 input 内部节点（.uni-input-placeholder）不在 scoped 作用域内
     （同 S9-2 textarea、S10-1 搜索框的教训），placeholder 样式必须写在这里 -->
<style>
.lp-ph {
  font-size: 28rpx;
  line-height: 1;
  color: #b5b0a2;
}
</style>
