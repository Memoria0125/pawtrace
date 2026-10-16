<template>
  <!--
    S7 我的（PRD F5 个人中心）
    设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p9，逐像素实测（375×812 @2.9573x）
    结构：标题(+齿轮) → 用户卡（头像字+昵称+简介+等级胶囊）→ 三宫格统计 → 我的足迹（3 行卡）→ 设置（4 行卡）→ 自绘 TabBar
    实测值（pt → rpx = pt×2；卡左右边界用「卡竖直中线的单列横扫」量，避免圆肩弧线/描边抖动污染）：
      所有卡左右 x20–354.4 → 页面留白 40rpx（`.paw-page` 提供）
      标题 25pt/50rpx #3C4036（ink 79–101）· 同 S6：H5 默认导航栏占位 → padding-top 67rpx
        标题行右侧齿轮图标 18×18pt/36rpx，右缘 354.4（= 内容右边界），垂直中心 87.75pt
        （设计稿此处是一枚 3D 银色 emoji ⚙️（PDF 内唯一内嵌位图 xref73，160×160 源图），
          按设计系统扁平化为 CSS 手绘齿轮，颜色取次级图标灰 #8B8779）
      用户卡 y123–231 高 108pt/216rpx / R32rpx / 描边 2rpx #E2DCCA / 内容纵向居中（align-items:center）
        头像 苔绿圆 d71.3pt/142rpx x36.2 起 y141–212.7（圆内居中）
          圆内为昵称首字「林」白色字：ink 24.4×24pt、竖笔 3.04pt（≈0.115em → 600 字重）
          → font-size 52rpx / #FAF7F1 / 居中
        右侧列 margin-left 28rpx（头像右 108 → 昵称 ink 左 122.4）
          昵称 ink 144.7–161.3 → 19pt/38rpx #3C4036
          简介 ink 171.8–181.6 → 11pt/22rpx #8B8779（昵称框底→简介框 8.7pt/18rpx）
          等级胶囊 x123.1–231.9（宽 108.8pt/218rpx）y189–212.7 高 23.7pt/48rpx 全圆 #EEE5CC
            文字 ink 132.4–218 ≈ 10pt/20rpx #6E5D37：温/柔/观/测 步进 9.8/10.1/9.8
            胶囊上距简介框底 6.8pt/14rpx；左右 padding 9.3pt/18rpx
      三宫格 y247–310 高 63pt/126rpx · 卡宽 105pt，间距 10pt/20rpx（实测竖边 20–125 / 135–240 / 250–355）
        数值 6 / 128 / 2（实测 OCR+像素双重确认；与足迹行「6只」一致）
        文字块纵向居中：数字 ink 264.8–278.0 → 18pt/36rpx/600 #56674E
        标签 ink 285.4–294.5 → 10.2pt/20rpx #8B8779（数字框底→标签框 4.45pt/8rpx）
      分节标题 13pt/26rpx #8B8779（我的足迹 ink 326–338；设置 ink 499–509）
        统计卡底 310 → 足迹标题框 325.2 = 30rpx；设置标题框 498.2 ← 行卡底 489 = 18rpx
      行卡 高 43pt/86rpx 间距 7pt/14rpx（实测卡顶 346/396/447 与设置 519/569/619/669，阶梯 50pt）
        padding 0 33rpx（左文字 ink 36.5、右内容右缘 338.5 → 与设计 36.5 / 337.8 双向吻合）
        行文字 28rpx（步进 13.9-14.2）；右侧值 12pt/24rpx #8B8779（右缘 ≈337.8）
        行尾箭头「→」x328.7–337.5 / y365.2–372.6 = 8.5×7.4pt/17×15rpx（杆 1pt + 实心三角头 4.4×7.4pt） #8B8779
          与值文字间距 5.4pt/11rpx；箭头右缘 337.5 → margin-right 2rpx
        开关 x294.9–338.8（43.9pt/88rpx）× y526.8–552.9（26.1pt/52rpx）苔绿胶囊（ON 态）+ 白钮
          d19.6pt/40rpx，钮左起 21.1pt（= 88−40−6.4），右距 3.2pt/6rpx
    刻意处理（非漏做）：
      1. 足迹行「我的观测对象 / 我的记录 / 协作空间」设计稿为**纯文字行、无前置图标**
         （实测行内第一段墨迹 x36.5 即首字「我」）→ 本页不做图标；
      2. 标题行右侧齿轮为设计稿 emoji 占位的扁平化重绘（见上），暂不接业务（视觉位）；
      3. Tab 页 → 默认导航栏占位（同 S1/S6），不自绘状态栏；
      4. ~~「大字体模式」开关~~ **2026-10-08 晚按用户要求整行删除**（设计稿 p9 有此行，
         属**用户指定刻意偏离**）：该开关本期只记本地偏好、不做全局字号放大，
         留着是个点不动预期的东西；删后设置区 = 位置隐私 / 绑定手机号 / 离线草稿 / 关于 四行。
      5. **2026-10-08 晚新增「退出登录」**（设计稿 p9 无此行）：独立于设置卡的单行按钮，
         居中陶土色文字，仅登录态渲染（游客看不到）。
      6. 后端未启动/空库时用设计稿 p9 同款演示数据撑版面（DEMO_FALLBACK），阶段 3 联调后关闭。
         游客态（无 token 且接口回 401）例外：显式清空成 0 / 未加入，不显示别人的演示数据。
  -->
  <view class="paw-page paw-page--tabbed s7">
    <!-- ============ 标题 + 齿轮 ============ -->
    <view class="head">
      <text class="head-title">我的</text>
      <view class="gear">
        <view class="gear-hole" />
      </view>
    </view>

    <!-- ============ 用户卡（观察者显示框：未登录 → 点击跳 S0 登录） ============ -->
    <view class="ucard" @tap="onObserverCard">
      <view class="avatar" :class="{ 'avatar--guest': guest }">
        <text class="avatar-txt">{{ avatarChar }}</text>
      </view>
      <view class="uinfo">
        <text class="uname">{{ guest ? '未登录' : user?.nickname || '林晚' }}</text>
        <text class="ubio">{{ guest ? '登录后开始记录你的观察' : '匿名观测者' }}</text>
        <view v-if="!guest" class="ulevel">
          <text class="ulevel-txt">温柔观测者 · {{ levelDays }} 天</text>
        </view>
      </view>
    </view>

    <!-- ============ 三宫格统计 ============ -->
    <view class="stats">
      <view class="stat" v-for="s in stats" :key="s.label">
        <text class="stat-num">{{ s.value }}</text>
        <text class="stat-label">{{ s.label }}</text>
      </view>
    </view>

    <!-- ============ 我的足迹 ============ -->
    <text class="sec">我的足迹</text>
    <view class="rows">
      <view class="row" @tap="go('home')">
        <text class="row-txt">我的观测对象</text>
        <view class="row-right">
          <text class="row-val">{{ footProfiles }} 只</text>
          <view class="arrow" />
        </view>
      </view>
      <view class="row" @tap="go('history')">
        <text class="row-txt">我的记录</text>
        <view class="row-right">
          <text class="row-val">{{ footRecords }} 条</text>
          <view class="arrow" />
        </view>
      </view>
      <view class="row" @tap="go('space')">
        <text class="row-txt">协作空间</text>
        <view class="row-right">
          <text class="row-val">{{ footSpace }}</text>
          <view class="arrow" />
        </view>
      </view>
    </view>

    <!-- ============ 设置 ============ -->
    <text class="sec sec2">设置</text>
    <view class="rows rows2">
      <view class="row">
        <text class="row-txt">位置隐私·模糊化</text>
        <view class="row-right">
          <text class="row-val">已开启</text>
        </view>
      </view>
      <!-- 阶段3 功能增补（第 5 行）：手机号绑定入口（p9 设计稿无此行，功能性偏离） -->
      <view class="row" @tap="goPhone">
        <text class="row-txt">绑定手机号</text>
        <view class="row-right">
          <text class="row-val">{{ phoneText }}</text>
          <view class="arrow" />
        </view>
      </view>
      <view class="row" @tap="syncDrafts">
        <text class="row-txt">离线草稿·联网同步</text>
        <view class="row-right">
          <text class="row-val">{{ drafts }} 条草稿</text>
          <view class="arrow" />
        </view>
      </view>
      <view class="row" @tap="about">
        <text class="row-txt">关于 PawTrace ·v1.0</text>
        <view class="row-right">
          <view class="arrow" />
        </view>
      </view>
    </view>

    <!-- ============ 退出登录（2026-10-08 晚新增；仅登录态渲染） ============ -->
    <view v-if="!guest && user" class="rows rows3">
      <view class="row row--logout" hover-class="row--logout-hover" hover-stay-time="60" @tap="logout">
        <text class="row-txt row-txt--logout">退出登录</text>
      </view>
    </view>

    <text v-if="guest" class="guest-note">当前未登录，协作空间与猫咪档案仍可浏览；记录自己的观察需要先登录</text>

    <!-- 自绘对话框（2026-10-08 晚：原 uni.showModal 是系统白卡，与手账风脱节） -->
    <paw-dialog
      :show="confirming"
      title="退出登录"
      content="退出后仍可浏览协作空间与猫咪档案；记录自己的观察需要重新登录。"
      cancel-text="取消"
      confirm-text="退出"
      tone="danger"
      @cancel="confirming = false"
      @confirm="doLogout"
    />
    <paw-dialog
      :show="aboutOn"
      title="关于爪迹"
      content="爪迹只保存街区级模糊位置，照片坐标在拍照时已剥离。你的观察，不会变成它们的危险。"
      confirm-text="知道了"
      tone="plain"
      :show-cancel="false"
      @cancel="aboutOn = false"
      @confirm="aboutOn = false"
    />

    <!-- 自绘 TabBar（原生条已隐藏，见 components/paw-tabbar） -->
    <paw-tabbar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { isLoggedIn, probePublic } from '../../common/auth';
import { flushDrafts, getDrafts } from '../../common/drafts';
import PawTabbar from '../../components/paw-tabbar/paw-tabbar.vue';

/** 演示数据兜底：后端未启动 / 空数据时，用设计稿 p9 同款内容撑版面 */
const DEMO_FALLBACK = true;

/** 设计稿 p9 三宫格数值：6 / 128 / 2（与足迹行「6只」一致） */
const DEMO_STATS = [
  { value: 6, label: '观测对象' },
  { value: 128, label: '我的记录' },
  { value: 2, label: '协作空间' },
];

const user = ref<any>(null);
/**
 * 游客态（2026-10-08 晚）：无 token 且后端可达（鉴权接口回 401）→ 清空成空态，
 * 不再显示设计稿的演示统计与「林晚」。
 * ⚠️ 与「网络失败」严格区分：离线 / 后端未启动 / 像素核对拦截 API 时**保持**演示数据撑版面
 * ——S7 的像素验收图正是在拦截态拍的，不能因为游客态改造而改变兜底帧。
 */
const guest = ref(false);
/** 等级胶囊天数：默认 64 = 设计稿演示帧（未登录/无 createdAt 的旧会话保持像素基线）；
 *  登录后接真实注册天数（注册当天 = 第 1 天，向上取整跨天） */
const levelDays = ref(64);
const stats = ref([...DEMO_STATS]);
const footProfiles = ref(6);
const footRecords = ref(128);
const footSpace = ref('校猫协会');
const drafts = ref(getDrafts().length);

/** 头像字：昵称首字（设计稿头像圆内为「林」）；游客显示「未」 */
const avatarChar = computed(() => {
  if (guest.value) return '未';
  const n = user.value?.nickname || '林晚';
  return String(n).trim().charAt(0);
});

onShow(load);

/** 游客渲染：三宫格与足迹三行全部归零（没有我建档/打卡的数据） */
function applyGuest() {
  stats.value = [
    { value: 0, label: '观测对象' },
    { value: 0, label: '我的记录' },
    { value: 0, label: '协作空间' },
  ];
  footProfiles.value = 0;
  footRecords.value = 0;
  footSpace.value = '未加入';
}

async function load() {
  user.value = uni.getStorageSync('user') || null;
  const uid = user.value?.id ?? '';
  if (user.value?.createdAt) {
    const diff = Date.now() - new Date(user.value.createdAt).getTime();
    // 注册当天 = 第 1 天：满 24h 才 +1
    if (!isNaN(diff)) levelDays.value = Math.max(1, Math.floor(diff / 86400000) + 1);
  }
  drafts.value = getDrafts().length;

  // ── 未登录（无 token）──
  // 先探活一个**公开**接口：通了说明后端在线 → 按游客渲染空态；
  // 不通（离线 / 后端未启动 / 截图拦截）→ 保留设计稿演示数据撑版面。
  // 不用「打鉴权接口看 401」判断，是为了不给控制台甩红色 401（验收要求「控制台无错误」）。
  if (!uid) {
    const online = await probePublic();
    if (online) {
      guest.value = true;
      applyGuest();
    }
    return;
  }
  guest.value = false;
  try {
    // 三个请求各自兜底（silent + catch）：任一失败都不影响另外两个，
    // 也不会因为「协作空间」模块尚未上线就把整页统计退回演示数据。
    // 注：协作空间用 /spaces/mine —— 后端 SpacesController 没有裸 GET /spaces，
    //     之前写 /spaces 会拿 404 并在顶部弹「请求失败(404)」（2026-09-15 修）。
    const [profiles, records, spaces] = await Promise.all([
      api.get<any[]>('/profiles', undefined, { silent: true }).catch(() => [] as any[]),
      uid
        ? api.get<any[]>('/records', undefined, { silent: true }).catch(() => [] as any[])
        : Promise.resolve([] as any[]),
      uid
        ? api.get<any[]>('/spaces/mine', undefined, { silent: true }).catch(() => [] as any[])
        : Promise.resolve([] as any[]),
    ]);
    if (!Array.isArray(profiles) || !profiles.length) return; // 空库：保留演示数据

    const recordCount = Array.isArray(records) ? records.length : 0;
    const spaceCount = Array.isArray(spaces) ? spaces.length : 0;
    stats.value = [
      { value: profiles.length, label: '观测对象' },
      { value: recordCount, label: '我的记录' },
      { value: spaceCount, label: '协作空间' },
    ];
    footProfiles.value = profiles.length;
    footRecords.value = recordCount;
    // /spaces/mine 返回的是 SpaceMember[]（小组信息挂在 space 字段下），不是 Space[]
    // 没有小组时必须清掉演示值「校猫协会」，否则统计卡显示 0、下面那行却写着组名，自相矛盾
    const firstSpace = spaces[0]?.space;
    footSpace.value = spaceCount ? firstSpace?.name || `${spaceCount} 个小组` : '未加入';
  } catch {
    /* 离线：保留演示数据 */
  }
}

/**
 * 观察者显示框（用户卡）：未登录 → 先跳 S0 登录页（登录成功回跳本页）；
 * 已登录 → 阶段 3 接「个人资料」页前先给轻提示。
 */
function onObserverCard() {
  if (!isLoggedIn()) {
    uni.navigateTo({ url: '/pages/login/login?from=my' });
    return;
  }
  uni.showToast({ title: '已登录 · 个人资料阶段 3 开放', icon: 'none' });
}

/** 足迹行跳转：观测对象 → 首页（Tab）；记录 → 观察史（Tab）；协作空间 → 协作空间页（栈） */
function go(target: 'home' | 'history' | 'space') {
  if (target === 'space') {
    uni.navigateTo({ url: '/pages/space/index' });
    return;
  }
  uni.switchTab({ url: `/pages/${target}/index` });
}

/** 阶段3：手机号绑定入口（未登录先去登录页，回来还在「我的」Tab） */
function goPhone() {
  if (!isLoggedIn()) {
    uni.navigateTo({ url: '/pages/login/login?from=my' });
    return;
  }
  uni.navigateTo({ url: '/pages/my/phone' });
}

/** 绑定手机号显示：138****2222 / 未绑定 */
const phoneText = computed(() => {
  const p = user.value?.phone;
  return p && /^1\d{10}$/.test(p) ? String(p).slice(0, 3) + '****' + String(p).slice(7) : '未绑定';
});

/** 阶段3：离线草稿手动同步（App 启动/网络恢复时已自动补传过一次） */
async function syncDrafts() {
  const queued = getDrafts().length;
  if (!queued) {
    drafts.value = 0; // 队列已空（可能刚被自动补传清掉），把演示值也归零
    uni.showToast({ title: '没有待同步的草稿', icon: 'none' });
    return;
  }
  uni.showLoading({ title: '同步中…' });
  const r = await flushDrafts();
  uni.hideLoading();
  drafts.value = r.remaining;
  uni.showToast({
    title: r.sent ? `已补传 ${r.sent} 条草稿` : '同步失败，联网后自动重试',
    icon: 'none',
  });
}

/** 大字体模式：2026-10-08 晚整行删除（见模板注释），本地偏好键 prefs_bigfont 一并废弃 */

/**
 * 退出登录（2026-10-08 晚新增；当晚二次调整：原生 showModal → 自绘 paw-dialog）：
 * 清 token + user 后**留在本页**直接切游客渲染（不 reLaunch，避免把用户弹走）；
 * 协作空间 / 猫咪档案这些公开数据不受影响，仍可浏览。
 * 离线草稿队列（offline_drafts）刻意**不清**——那是用户没传上去的记录，清掉等于丢数据。
 */
const confirming = ref(false);
const aboutOn = ref(false);

function logout() {
  confirming.value = true;
}

function doLogout() {
  confirming.value = false;
  uni.removeStorageSync('token');
  uni.removeStorageSync('user');
  user.value = null;
  guest.value = true;
  applyGuest();
  uni.showToast({ title: '已退出登录', icon: 'none' });
}

function about() {
  aboutOn.value = true;
}
</script>

<style scoped>
/* ============ 标题 + 齿轮（实测：ink 79–101，H5 导航栏占位 → padding-top 67rpx） ============ */
.head {
  position: relative;
  padding-top: 67rpx;
}
.head-title {
  font-size: 50rpx;
  font-weight: 700;
  line-height: 1;
  color: #3c4036;
}
/* 齿轮：18×18pt/36rpx，右缘 354.4（= 内容右边界），顶 78.8pt（绝对定位，避免影响已标定的 head 块高） */
.gear {
  position: absolute;
  right: 0;
  top: 70rpx;
  width: 36rpx;
  height: 36rpx;
}
/* 齿盘：大小相同的两个圆角方块错位 45° 叠出 8 齿 */
.gear::before,
.gear::after {
  content: '';
  position: absolute;
  left: 5rpx;
  top: 5rpx;
  width: 26rpx;
  height: 26rpx;
  border-radius: 6rpx;
  background: #8b8779;
}
.gear::after {
  transform: rotate(45deg);
}
.gear-hole {
  position: absolute;
  z-index: 1;
  left: 11rpx;
  top: 11rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #f0ebdf;
}

/* ============ 用户卡（实测：y123–231 / 高 108pt = 216rpx / R32rpx / 描边 #E2DCCA / 纵向居中） ============ */
.ucard {
  display: flex;
  align-items: center;
  margin-top: 36rpx;
  height: 216rpx;
  box-sizing: border-box;
  padding: 0 0 0 31rpx;
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
  border-radius: 32rpx;
}
/* 头像：苔绿圆 142rpx（实测 x36.2–107.5 / y141–212.7，即卡内居中）；圆内为昵称首字 */
.avatar {
  position: relative;
  width: 142rpx;
  height: 142rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: #8fa08b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-txt {
  font-size: 52rpx;
  font-weight: 600;
  line-height: 1;
  color: #faf7f1;
}
/* 右侧信息列：头像右缘 108 → 昵称 ink 左 122.4 = margin-left 28rpx（列整体纵向居中） */
.uinfo {
  margin-left: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.uname {
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1;
  color: #3c4036;
}
/* 昵称框底 162.5 → 简介框 171.2 = 18rpx */
.ubio {
  margin-top: 18rpx;
  font-size: 22rpx;
  line-height: 1;
  color: #8b8779;
}
/* 等级胶囊：218×48rpx（实测 108.8×23.7pt）全圆 #EEE5CC，文字 20rpx 深芥末 */
.ulevel {
  margin-top: 14rpx;
  height: 48rpx;
  padding: 0 21rpx;
  border-radius: 24rpx;
  background: #eee5cc;
  display: flex;
  align-items: center;
}
.ulevel-txt {
  font-size: 20rpx;
  line-height: 1;
  color: #6e5d37;
}

/* ============ 三宫格（实测：高 63pt/126rpx，卡宽 105pt，间距 10pt/20rpx，文字块纵向居中） ============ */
.stats {
  display: flex;
  margin-top: 32rpx;
}
.stat {
  flex: 1;
  height: 126rpx;
  box-sizing: border-box;
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.stat + .stat {
  margin-left: 20rpx;
}
.stat-num {
  font-size: 36rpx;
  font-weight: 600;
  line-height: 1;
  color: #56674e;
}
.stat-label {
  margin-top: 8rpx;
  font-size: 20rpx;
  line-height: 1;
  color: #8b8779;
}

/* ============ 分节标题（实测：足迹 ink 326–338 / 设置 ink 499–509，均 13pt = 26rpx） ============ */
.sec {
  display: block;
  margin-top: 30rpx;
  font-size: 26rpx;
  line-height: 1;
  color: #8b8779;
}
.sec2 {
  margin-top: 18rpx;
}
.rows {
  margin-top: 16rpx;
}
.rows2 {
  margin-top: 16rpx;
}

/* ============ 行卡（实测：高 43pt/86rpx 间距 7pt/14rpx，阶梯 50pt） ============ */
.row {
  display: flex;
  align-items: center;
  height: 86rpx;
  padding: 0 31rpx;
  box-sizing: border-box;
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
  border-radius: 32rpx;
}
.rows .row + .row {
  margin-top: 14rpx;
}
/* 行文字 28rpx（实测步进 13.9–14.2pt）；左缘落在 x36.5（= 卡左 20 + padding 16.5pt） */
.row-txt {
  font-size: 28rpx;
  line-height: 1;
  color: #3c4036;
}
.row-right {
  margin-left: auto;
  display: flex;
  align-items: center;
}
/* 右侧值 12pt/24rpx #8B8779（右缘 ≈337.8 = 内容右缘 338.5 − 0.7pt） */
.row-val {
  font-size: 24rpx;
  line-height: 1;
  color: #8b8779;
}
/* 行尾箭头「→」：17×15rpx（实测 8.5×7.4pt）= 1pt 横杆 + 实心三角头（4.4×7.4pt）#8B8779 */
.arrow {
  position: relative;
  width: 17rpx;
  height: 15rpx;
  margin-left: 11rpx;
  margin-right: 2rpx;
  flex-shrink: 0;
}
.arrow::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6.5rpx;
  width: 9rpx;
  height: 2rpx;
  background: #8b8779;
}
.arrow::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 0;
  height: 0;
  border-left: 9rpx solid #8b8779;
  border-top: 7.5rpx solid transparent;
  border-bottom: 7.5rpx solid transparent;
}

/* ============ 开关（实测：88×52rpx 苔绿胶囊 + 白钮 40rpx，钮右距 6rpx） ============
   2026-10-08 晚：「大字体模式」整行删除，本组样式暂无使用方；
   保留是有意的 —— 将来若在别的设置项上加开关，直接复用这套已标定的几何。 */
.switch {
  position: relative;
  width: 88rpx;
  height: 52rpx;
  border-radius: 26rpx;
  background: #e2dcca;
}
.switch.on {
  background: #8fa08b;
}
.knob {
  position: absolute;
  left: 6rpx;
  top: 6rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}
.switch.on .knob {
  transform: translateX(36rpx);
}

/* ============ 游客态（2026-10-08 晚） ============ */
/* 头像：登录态是苔绿圆；游客换成浅驼灰，一眼区分「这不是我」 */
.avatar--guest {
  background: #d8d2c4;
}
.avatar--guest .avatar-txt {
  color: #8b8779;
}
/* 游客提示行：与设置卡同族的一行，只读、无箭头 */
.guest-note {
  display: block;
  margin-top: 26rpx;
  padding-bottom: 8rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: #a69e8c;
}

/* ============ 退出登录（2026-10-08 晚新增） ============
   独立于设置卡的一行（间距比卡内行距大一档，视觉上与设置区断开）；
   居中陶土色文字 = 「破坏性操作」的常规表达，与其余设置行的左对齐文字区分。 */
.rows3 {
  margin-top: 26rpx;
}
.row--logout {
  justify-content: center;
}
.row--logout-hover {
  background: #f5efe2;
}
.row-txt--logout {
  color: #c68b6f;
}
</style>
