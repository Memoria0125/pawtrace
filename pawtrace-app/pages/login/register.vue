<template>
  <!--
    S0 注册（p29）｜PDF 第 29 屏｜PRD 用户注册
    设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p29，逐像素实测（375×812 @2.9573x）
    几何取自 PDF **矢量图元**（page.get_drawings()）+ 圆角 50% 色阶拟合 + 列剖面字号标定；
    1 design px = 2rpx（pt 直接 ×2）。

    纵向锚点（pt，矢量/像素实测）：
      状态栏 24.9–37.2（H5 不绘制，同 S1/S6/S10-x 惯例）
      圆形返回 102.1–136.1（⌀34，1pt 环 #E5DFD0，内纸白，箭头墨迹 9.4×8.6 居中）
      「加入爪迹」墨迹 144.69–169.37（4 字步进 26.04pt → 26pt=52rpx 700）
      副标题墨迹 180.98–193.14（14 字步进 13.0pt → 13pt=26rpx）
      卡外框 240–637（327×397，1pt 描边 #E5DFD0 + 36rpx 圆角）
      四组「标签 12pt / 输入框 287×44 R24rpx」；验证码行内嵌 184×64rpx 苔绿胶囊
      协议行 574–590（勾选框 32×32rpx R10rpx）；~~胶带 600.2–618.12~~（已改角贴，见刻意处理 4）
      主按钮 650–702（327×52，全圆 52rpx）；底部行墨迹 718.08–730.10

    刻意处理（非漏做）：
      1. 2026-10-06 密码账号体系上线：「获取验证码」真实调用 POST /auth/phone-code
         （60s 倒计时；演示环境验证码随响应弹窗展示并自动填入）；「注册」真实调用
         POST /auth/register（手机号+验证码+密码+昵称），成功即登录进首页。
         注册即强制绑定手机号 —— 与「我的」页换绑入口共用验证码机制。
      2. 设计稿四个输入框均为**占位态**（无预填），勾选框为**已勾选** → 本页演示态天然与
         设计稿逐像素可比，不需要 DEMO 预填（与 p28 登录页不同）。倒计时中「获取验证码」
         按钮文字变为「Ns 后重发」属交互态，默认帧仍为设计稿文案。
      3. 密码框用原生 `password`（设计稿此屏无眼睛图标，且未画已输入圆点）。
      4. **胶带装饰已按用户要求改为卡片右上角斜贴**（2026-10-01，刻意偏离 PDF）：原 p29 为
         卡片底部 192×36rpx 直角色块，现改为 .tape-tr（108×28rpx、rotate(45deg) 包角、
         中心在右上圆角向内 12rpx 处），卡片相应少了一段卡底胶带高度。
  -->
  <view class="reg-page">
    <!-- ============ 圆形返回 ============ -->
    <view class="back" @tap="onBack">
      <view class="arw">
        <view class="a-shaft" />
        <view class="a-up" />
        <view class="a-dn" />
      </view>
    </view>

    <!-- ============ 标题区 ============ -->
    <text class="title">加入爪迹</text>
    <text class="subtitle">一起成为流浪动物的温柔守护者</text>

    <!-- ============ 表单卡 ============ -->
    <view class="card">
      <!-- 右上角斜贴胶带（用户自定义装饰，替代原 PDF 卡底胶带） -->
      <view class="tape-tr" />
      <text class="lbl">昵称</text>
      <input
        v-model="nickname"
        class="inp"
        maxlength="20"
        placeholder="给猫起名字的人"
        placeholder-class="rp-ph"
      />

      <text class="lbl lbl2">手机号</text>
      <input
        v-model="phone"
        class="inp"
        type="number"
        maxlength="11"
        placeholder="请输入手机号"
        placeholder-class="rp-ph"
      />

      <text class="lbl lbl3">验证码</text>
      <view class="code-wrap">
        <input
          v-model="code"
          class="inp inp-code"
          type="number"
          maxlength="6"
          placeholder="6 位验证码"
          placeholder-class="rp-ph"
        />
        <view class="code-btn" :class="{ 'code-btn--dis': counting || sending }" @tap="onSendCode">
          <text class="code-txt">{{ counting ? `${left}s 后重发` : sending ? '发送中…' : '获取验证码' }}</text>
        </view>
      </view>

      <text class="lbl lbl4">密码</text>
      <input
        v-model="pwd"
        class="inp"
        password
        maxlength="20"
        placeholder="至少 6 位，字母或数字"
        placeholder-class="rp-ph"
      />

      <!-- 协议行：勾选框 32×32rpx + 三色文字 -->
      <view class="agree" @tap="agree = !agree">
        <view class="ck" :class="{ 'ck-off': !agree }">
          <template v-if="agree">
            <view class="ck-a" />
            <view class="ck-b" />
          </template>
        </view>
        <text class="ag-t">我已阅读并同意</text>
        <text class="ag-link" @tap.stop="onDoc('用户协议')">《用户协议》</text>
        <text class="ag-t ag-and">和</text>
        <text class="ag-link" @tap.stop="onDoc('隐私政策')">《隐私政策》</text>
      </view>
    </view>

    <!-- ============ 主按钮 ============ -->
    <view class="btn-reg" @tap="onSubmit">
      <text class="btn-txt">注</text>
      <text class="btn-txt btn-txt2">册</text>
    </view>

    <!-- ============ 底部去登录 ============ -->
    <view class="login-row">
      <text class="lr-q">已有账号？</text>
      <text class="lr-a" @tap="onLogin">去登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { goBack } from '../../common/nav';
import { authRequest, saveSession } from '../../common/auth';

const nickname = ref('');
const phone = ref('');
const code = ref('');
const pwd = ref('');
/** 设计稿为「已勾选」态 → 默认 true（演示态与设计稿一致） */
const agree = ref(true);
/** 验证码按钮：发送中 / 60s 倒计时 */
const sending = ref(false);
const counting = ref(false);
const left = ref(0);
/** 注册请求进行中（防双击） */
const busy = ref(false);

/** 返回：栈深不足时回登录页（goBack 里判栈深，见 common/nav） */
function onBack() {
  goBack({ url: '/pages/login/login' });
}

// #ifdef H5
/**
 * 抑制 Chrome 对密码框的自动填充（2026-10-11，同 S0-登录 页）。
 * uni-app H5 底层 `<input>` 固定 `autocomplete="off"`，而 **Chrome 对密码框忽略 off**
 * → 会自动填入保存过的密码（用户实测：本页密码框出现 8 颗圆点、验证码框被塞进手机号前 6 位）。
 * 这里把密码框底层节点改成 Chrome 认的 `new-password`（模板属性写法会被 uni 覆盖，只能改 DOM）。
 * ⚠️ 仅 H5 需要。
 */
onMounted(() => {
  const all = Array.from(document.querySelectorAll('.reg-page .inp input')) as HTMLInputElement[];
  const pwdEl = all.find((el) => el.type === 'password');
  if (pwdEl) pwdEl.setAttribute('autocomplete', 'new-password');
});
// #endif

/** 获取验证码：60s 倒计时；演示环境后端直接返回 code，弹窗引导并自动填入 */
async function onSendCode() {
  if (counting.value || sending.value) return;
  if (!/^1[3-9]\d{9}$/.test(phone.value.trim())) {
    uni.showToast({ title: '请先填写正确的手机号', icon: 'none' });
    return;
  }
  sending.value = true;
  try {
    const r: any = await authRequest('POST', '/auth/phone-code', { phone: phone.value.trim() });
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
  } catch (e: any) {
    uni.showToast({ title: e?.message || '发送失败，请重试', icon: 'none' });
  } finally {
    sending.value = false;
  }
}

function onDoc(name: string) {
  uni.showToast({ title: `阶段3接入${name}`, icon: 'none' });
}

async function onSubmit() {
  if (busy.value) return;
  if (!nickname.value.trim()) {
    uni.showToast({ title: '请填写昵称', icon: 'none' });
    return;
  }
  if (!/^1[3-9]\d{9}$/.test(phone.value.trim())) {
    uni.showToast({ title: '请填写正确的手机号', icon: 'none' });
    return;
  }
  if (!code.value.trim()) {
    uni.showToast({ title: '请填写验证码', icon: 'none' });
    return;
  }
  if (pwd.value.length < 6) {
    uni.showToast({ title: '密码至少 6 位', icon: 'none' });
    return;
  }
  if (!agree.value) {
    uni.showToast({ title: '请先同意用户协议', icon: 'none' });
    return;
  }
  busy.value = true;
  try {
    // 注册即登录：成功直接发 token（手机号此时已强制绑定到新账号）
    const data = await authRequest<{ token: string; user: any }>('POST', '/auth/register', {
      phone: phone.value.trim(),
      code: code.value.trim(),
      password: pwd.value,
      nickname: nickname.value.trim(),
    });
    saveSession(data);
    uni.showToast({ title: '注册成功，已登录', icon: 'none' });
    setTimeout(() => uni.switchTab({ url: '/pages/home/index' }), 600);
  } catch (e: any) {
    // 已注册（409 该手机号已注册）/ 验证码错误（400）等 → 留在本页修正
    uni.showToast({ title: e?.message || '注册失败，请重试', icon: 'none' });
  } finally {
    busy.value = false;
  }
}

function onLogin() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
    return;
  }
  uni.redirectTo({ url: '/pages/login/login' });
}
</script>

<style scoped>
/* ============ 页面 ============ */
/* 顶部留白放在页面 padding-top：首元素 margin-top 会与页面外边距塌陷 → 文档溢出出滚动条
   （p28 实录，见 skill 第 43 条）。 */
.reg-page {
  min-height: calc(100vh - var(--window-top, 0px) - var(--window-bottom, 0px));
  box-sizing: border-box;
  padding: 204.2rpx 48rpx 60rpx;
  background: #f0ebdf;
}

/* ============ 圆形返回 ⌀34pt=68rpx，1pt 环，箭头墨迹 9.4×8.6pt 居中 ============ */
.back {
  position: relative;
  margin: 0 auto;
  width: 68rpx;
  height: 68rpx;
  box-sizing: border-box;
  border: 2rpx solid #e5dfd0;
  border-radius: 50%;
  background: #faf8f1;
}
.back:active {
  opacity: 0.85;
}
/* 箭头局部盒：原点 = 圆内边（绝对定位的包含块是 padding box）→ 再减去 2rpx 描边 */
.arw {
  position: absolute;
  left: 24.04rpx;
  top: 24.24rpx;
  width: 19rpx;
  height: 17.6rpx;
}
/* 横杆：厚 1pt=2rpx，墨迹 y 中心 4.21pt=8.42rpx */
.a-shaft {
  position: absolute;
  left: 6.24rpx;
  top: 7.08rpx;
  width: 13.74rpx;
  height: 2rpx;
  background: #56674e; /* 直角端：设计稿横杆末端是平头（加圆角会被 AA 吃掉 ~0.66pt） */
}
/* 两臂：长 6.24pt=12.48rpx、厚 1.33pt=2.66rpx，绕「尖端」各转 ±41°
   （上臂绕下端点顺时针、下臂绕上端点逆时针 → 汇合在左侧尖端） */
.a-up,
.a-dn {
  position: absolute;
  left: -0.54rpx;
  width: 2.66rpx;
  height: 12rpx;
  border-radius: 1.33rpx;
  background: #56674e;
}
.a-up {
  top: -2.9rpx;
  transform-origin: 50% 100%;
  transform: rotate(49deg);
}
.a-dn {
  top: 9.1rpx;
  transform-origin: 50% 0%;
  transform: rotate(-49deg);
}

/* ============ 标题区 ============ */
/* 「加入爪迹」13pt 字步进 26.04pt → 52rpx 700 墨绿黑 */
.title {
  display: block;
  margin-top: 13.83rpx;
  font-size: 52rpx;
  font-weight: 700;
  line-height: 1;
  color: #3d4036;
  text-align: center;
}
/* 副标题 13pt → 26rpx，图标灰 */
.subtitle {
  display: block;
  margin-top: 21.73rpx;
  font-size: 26rpx;
  line-height: 1;
  color: #8b887a;
  text-align: center;
}

/* ============ 表单卡（327×397pt，描边 1pt #E5DFD0，R36rpx） ============ */
.card {
  position: relative; /* 角贴胶带的定位基准 */
  margin-top: 94.24rpx;
  padding: 36.91rpx 38.64rpx 33.04rpx;
  background: #faf8f1;
  border: 2rpx solid #e5dfd0;
  border-radius: 36rpx;
  box-sizing: border-box;
}
/* 标签 12pt → 24rpx 图标灰；字段间距按「差值」定位（见文件头锚点表） */
.lbl {
  display: block;
  font-size: 24rpx;
  line-height: 1;
  color: #8b887a;
}
.lbl2 {
  margin-top: 22.87rpx;
}
.lbl3 {
  margin-top: 20.69rpx;
}
.lbl4 {
  margin-top: 20.61rpx;
}
/* 输入框 287×44pt → 574×88rpx，底 = 页面米底，R24rpx */
.inp {
  display: block;
  width: 100%;
  height: 88rpx;
  margin-top: 23.09rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  background: #f0ebdf;
  font-size: 28rpx;
  line-height: 88rpx;
  color: #3c4036;
}
.lbl2 + .inp {
  margin-top: 25.15rpx;
}
.lbl3 + .inp {
  margin-top: 24.65rpx;
}
.lbl4 + .inp {
  margin-top: 25.39rpx;
}
/* 验证码行：输入框 + 右侧苔绿胶囊（184×64rpx，全圆 32rpx，右内缩 16rpx） */
.code-wrap {
  position: relative;
  margin-top: 24.65rpx;
}
.inp-code {
  margin-top: 0;
  padding-right: 208rpx; /* 184 + 16 + 8 余量，避免输入文字钻到胶囊下 */
}
.code-btn {
  position: absolute;
  right: 16rpx;
  top: 10.64rpx;
  width: 184rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 32rpx;
  background: #8fa08b;
}
.code-btn:active {
  opacity: 0.88;
}
/* 发送中 / 倒计时禁用态（交互态；默认帧仍为设计稿样式） */
.code-btn--dis {
  opacity: 0.55;
}
.code-txt {
  font-size: 24rpx;
  line-height: 1;
  color: #faf8f1;
}

/* ============ 协议行（勾选框 32×32rpx R10rpx / 文字 11pt=22rpx） ============ */
.agree {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
}
.ck {
  position: relative;
  width: 32rpx;
  height: 32rpx;
  border-radius: 10rpx;
  background: #8fa08b;
  flex-shrink: 0;
}
/* 未勾选：描边空框 */
.ck-off {
  box-sizing: border-box;
  background: transparent;
  border: 2rpx solid #b5b0a2;
}
/* 勾：两段 3rpx 细棒（墨迹 15.26×12.06rpx，中心比盒中心低 0.39rpx） */
.ck-a,
.ck-b {
  position: absolute;
  height: 3rpx;
  border-radius: 1.5rpx;
  background: #faf8f1;
}
.ck-a {
  left: 9.89rpx;
  top: 19.26rpx;
  width: 5.77rpx;
  transform: rotate(33.7deg);
}
.ck-b {
  left: 12.48rpx;
  top: 15.76rpx;
  width: 12.38rpx;
  transform: rotate(-55.6deg);
}
.ag-t {
  position: relative;
  top: 0.7rpx;
  margin-left: 12.4rpx;
  font-size: 22rpx;
  line-height: 1;
  color: #8b887a;
}
.ag-link {
  position: relative;
  top: 0.7rpx;
  margin-left: 12.46rpx;
  font-size: 22rpx;
  line-height: 1;
  color: #56674e;
}
.ag-and {
  margin-left: 12.06rpx;
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
  background: #e2d2a3;
}

/* ============ 主按钮（327×52pt，全圆 52rpx，深苔绿） ============ */
.btn-reg {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 28.72rpx;
  height: 104rpx;
  border-radius: 52rpx;
  background: #56674e;
}
.btn-reg:active {
  opacity: 0.88;
}
.btn-txt {
  font-size: 32rpx;
  line-height: 1;
  color: #faf8f1;
}
/* 设计「注 册」两字起点步进 24.01pt → 16 + 8.01pt 间隙 */
.btn-txt2 {
  margin-left: 16.02rpx;
}

/* ============ 底部去登录 ============ */
.login-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 29.96rpx;
  margin-left: 0.68rpx;
}
.lr-q {
  font-size: 26rpx;
  line-height: 1;
  color: #8b877a;
}
.lr-a {
  margin-left: 8.56rpx;
  font-size: 26rpx;
  line-height: 1;
  color: #56674e;
}
</style>

<!-- 非 scoped：uni-app 的 input 内部节点（.uni-input-placeholder）不在 scoped 作用域内
     （同 S9-2 textarea、S10-1 搜索框、p28 登录页的教训），placeholder 样式必须写在这里 -->
<style>
.rp-ph {
  font-size: 28rpx;
  line-height: 1;
  color: #b5b0a2;
}
</style>
