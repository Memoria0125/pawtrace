<template>
  <!-- S10-1 协作空间 · 小组列表（PDF p31）｜PRD F5.1｜入口：S7「我的」→ 协作空间 -->
  <view class="wrap">
    <!--
      ⚠️ 对设计稿的**唯一刻意增补**：p31 原图顶部是「状态栏 → 大标题」，
      它漏画了返回行 —— 同级辅助屏 p32/p33 都是「状态栏 → ‹返回 → 大标题」
      （实测返回墨迹 y 75.41–89.27、大标题在其下 11.16pt 处 y 100.43）。
      本屏入口是 S7「我的」Tab（见副行2 的设计注记），没有返回就没有回路，故补上。

      位置推导：设计稿状态栏墨迹止于 37.20pt、大标题起于 76.42pt，中间空档 39.22pt。
      取「返回 → 大标题」间距 = 11.16pt（= p32 实测），得返回墨迹 y 51.40–65.26。
      本组件 topPad→返回墨迹的换算是 ink_top = topPad/2 + 15.86pt（topPad 单位 rpx），
      故 topPad = 71.1rpx。大标题及以下的 11 段位置**一律未动**（见 .h1 的负 margin 说明）。
    -->
    <paw-navbar
      title=""
      :top-pad="71.1"
      back-url="/pages/my/index"
      :back-tab="true"
    />
    <text class="h1">协作空间</text>
    <text class="sub1">先选择一个小组，申请通过后才能进入协作看板</text>
    <text class="sub2">入口：S7「我的」→ 协作空间（不可一键直达小组）</text>

    <!-- 搜索框：真实输入框（占位样式经非 scoped 块下发，见样式区注释） -->
    <view class="search">
      <view class="ic-search"></view>
      <input
        class="search-ipt"
        placeholder-class="s101-ph"
        placeholder="搜索小区 / 小组名称"
        :value="keyword"
        confirm-type="search"
        @input="onKeyword"
      />
    </view>

    <!-- 我的申请（数据来自 /spaces/my-requests；无申请时整条隐藏 —— 刻意增补，
         设计稿 p31 恒显是因为画的是有申请的状态）。
         阶段3：点击跳该小组详情页 -->
    <view v-if="myReq" class="applybar" @tap="goDetailById(myReq.spaceId)">
      <text class="ab-l">我的申请：{{ myReq.spaceName }}</text>
      <view class="ab-r-wrap">
        <text class="ab-r">{{ myReq.statusText }}</text>
        <view class="ab-chev"></view>
      </view>
    </view>

    <!-- 推荐附近小组（阶段3 增补，设计稿 p31 无此栏；无坐标数据时整栏隐藏） -->
    <view v-if="nearby.length" class="nearby">
      <view class="sec-row">
        <text class="sec-t">推荐附近小组</text>
        <text class="sec-c">离你最近</text>
      </view>
      <scroll-view class="nb-scroll" scroll-x :show-scrollbar="false">
        <view class="nb-row">
          <view v-for="n in nearby" :key="n.id" class="nb-card" @tap="goDetailById(n.id)">
            <view class="av nb-av" :class="'av--' + n.tone">
              <text class="av-t">{{ n.initial }}</text>
            </view>
            <text class="nb-name">{{ n.name }}</text>
            <text class="nb-meta">{{ n.distText }} · {{ n.community || '附近' }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 分组标题行 -->
    <view class="sec-row">
      <text class="sec-t">公开的互助小组</text>
      <text class="sec-c">{{ spaces.length }} 个小组</text>
    </view>

    <!-- 搜索无匹配提示（仅搜索态出现，不影响默认版式） -->
    <view v-if="keyword.trim() && !spaces.length" class="empty">
      <text class="empty-t">没有匹配「{{ keyword.trim() }}」的小组</text>
    </view>

    <!-- 小组卡片（阶段3：整卡点击 → 小组详情页；列表不再放申请按钮，
         状态胶囊只标「已加入 / 审核中」两态）
         2026-10-08 二次：未加入（open）态显示实心陶土「申请加入」按钮 →
         与整卡点击同路径进入小组详情页（详情页底部才是真正的申请提交入口）。
         尺寸/位置与另两态胶囊完全一致，故版式零变化；`.stop` 必须加，
         否则子元素 tap 会冒泡到卡片 → navigateTo 连跳两级页面栈。 -->
    <view v-for="(s, i) in spaces" :key="i" class="card" @tap="goDetail(s)">
      <!-- 组长角标：有待审批申请时出现在卡右上（普通成员/无待审批不渲染，
           DEMO 兜底无此字段 → 拦截截图路径不渲染，像素基线不受影响） -->
      <view v-if="s.pending > 0" class="apr-badge">
        <text class="apr-badge-t">待审批 {{ s.pending }}</text>
      </view>
      <view class="av" :class="'av--' + s.tone">
        <text class="av-t">{{ s.initial }}</text>
      </view>
      <view class="cbody">
        <text class="c-name">{{ s.name }}</text>
        <text class="c-meta">{{ s.meta }}</text>
        <text class="c-tags">{{ s.tags }}</text>
      </view>
      <view
        v-if="s.state !== 'open'"
        class="pill"
        :class="{ 'pill--outline': s.state === 'pending', 'pill--joined': s.state === 'member' }"
      >
        <text class="pill-t">{{ PILL_TEXT[s.state] }}</text>
      </view>
      <view v-else class="pill pill--apply" hover-class="pill--apply-hover" hover-stay-time="60" @tap.stop="goDetail(s)">
        <text class="pill-t">申请加入</text>
      </view>
    </view>

    <!-- CTA（阶段3：真实建组弹窗，POST /spaces） -->
    <view class="cta" @tap="onCreate">
      <text class="cta-t">＋ 创建小组</text>
    </view>

    <text class="foot">未加入小组前，仅可浏览小组公开摘要</text>

    <!-- 创建小组弹窗（阶段3 增补）：底部弹层 + 遮罩，paw- 前缀已登记 App.vue 媒体查询 -->
    <view v-if="creating" class="paw-scrim" @tap="creating = false"></view>
    <view v-if="creating" class="paw-sheet">
      <view class="cs-handle"></view>
      <text class="cs-title">创建小组</text>
      <text class="cs-sub">创建后你即成为组长，可邀请邻居一起接力照顾</text>

      <view class="cs-field">
        <text class="cs-label">小组名称</text>
        <input class="cs-ipt" v-model="form.name" placeholder="如：图书馆观测小队" placeholder-class="s101-ph" maxlength="30" />
      </view>
      <view class="cs-field">
        <text class="cs-label">所属小区</text>
        <input class="cs-ipt" v-model="form.community" placeholder="如：小和山校区" placeholder-class="s101-ph" maxlength="30" />
      </view>
      <view class="cs-field">
        <text class="cs-label">小组标签</text>
        <input class="cs-ipt" v-model="form.tags" placeholder="如：接力投喂 · TNR" placeholder-class="s101-ph" maxlength="50" />
      </view>
      <view class="cs-field">
        <text class="cs-label">小组简介</text>
        <textarea class="cs-ta" v-model="form.description" placeholder="照顾哪些猫咪、活动时间、新手指南…" placeholder-class="s101-ph" maxlength="100" />
      </view>

      <view class="cs-btn" :class="{ 'cs-btn--dis': submitting }" @tap="submitCreate">
        <text class="cs-btn-t">{{ submitting ? '创建中…' : '创建小组' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { requireLogin } from '../../common/auth';

/** 兜底演示数据（与设计稿 p31 逐字对齐）。仅在 /spaces/search 请求失败时撑版：
    离线、后端未启动、以及像素核对拦截 API 的场景都需要它，勿删。
    lead：设计稿只标了江湾的组长（p32「组长：陈同学」），梧桐里/老城厢为演示值。 */
const DEMO = [
  {
    id: '', code: '',
    initial: '江', tone: 'deep', state: 'open',
    name: '江湾小区流浪猫观察队',
    meta: '32 位成员 · 47 只猫咪',
    tags: '投喂 · 绝育跟踪 · 档案共享',
    lead: '组长：陈同学',
  },
  {
    id: '', code: '',
    initial: '梧', tone: 'sage', state: 'pending',
    name: '梧桐里 TNR 互助组',
    meta: '18 位成员 · 23 只猫咪',
    tags: 'TNR · 术后放归 · 医疗互助',
    lead: '组长：周阿姨',
  },
  {
    id: '', code: '',
    initial: '老', tone: 'clay', state: 'open',
    name: '老城厢街猫守护队',
    meta: '56 位成员 · 80 只猫咪',
    tags: '日常投喂 · 冬季庇护',
    lead: '组长：吴老师',
  },
];

const TONES = ['deep', 'sage', 'clay'];
/** 胶囊两态文案（阶段3：列表不放申请按钮，胶囊只标状态；open 不显示胶囊） */
const PILL_TEXT: Record<string, string> = { open: '', pending: '审核中', member: '已加入' };
const REQ_TEXT: Record<string, string> = { PENDING: '审核中 ⋯', APPROVED: '已通过', REJECTED: '未通过' };

/** 全量列表（后端拉取成功即覆盖；仅在请求失败时用 DEMO 撑版，保证离线/截图拦截时可看） */
const allSpaces = ref<any[]>(DEMO);
const keyword = ref('');
/** 兜底申请条（与设计稿 p31 逐字对齐）：/spaces/my-requests 请求失败时保留，保证截图拦截/离线态版式不塌 */
const DEMO_REQ = { spaceId: '', spaceName: '梧桐里 TNR 互助组', statusText: '审核中 ⋯' };
/** 「我的申请」条：取最近一条申请；仅当请求**成功且无申请**时才置 null（隐藏整条） */
const myReq = ref<{ spaceId: string; spaceName: string; statusText: string } | null>(DEMO_REQ);
/** 推荐附近小组（阶段3 增补栏）：请求失败/无坐标 → 空数组整栏隐藏 */
const nearby = ref<any[]>([]);

/** 搜索：客户端过滤（后端支持 keyword，但本地过滤响应更快且离线可用）。
    匹配范围 = 名称 + 小区 + 标签 + 组长，大小写不敏感。 */
const spaces = computed(() => {
  const k = keyword.value.trim().toLowerCase();
  if (!k) return allSpaces.value;
  return allSpaces.value.filter((s: any) =>
    `${s.name} ${s.community || ''} ${s.tags} ${s.lead}`.toLowerCase().includes(k),
  );
});

function onKeyword(e: any) {
  keyword.value = e.detail?.value ?? '';
}

/** 距离格式化：<1000m 直接显示，否则换算 km */
function fmtDist(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

function goDetail(s: any) {
  // 演示数据（离线兜底）没有 id，进不了详情
  if (!s.id) {
    uni.showToast({ title: '离线演示数据，联网后可查看详情', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/space/detail?id=${s.id}` });
}

function goDetailById(id: string) {
  if (!id) return;
  uni.navigateTo({ url: `/pages/space/detail?id=${id}` });
}

onShow(async () => {
  // 公开小组列表：GET /spaces/search 不带 code → 返回全部公开小组（带组长/成员数/猫咪数/myState）
  try {
    const list: any = await api.get('/spaces/search', {});
    if (Array.isArray(list)) {
      allSpaces.value = list.map((sp: any, i: number) => ({
        id: sp.id ?? '',
        code: sp.inviteCode ?? '',
        initial: (sp.name || '?').slice(0, 1),
        tone: TONES[i % 3],
        state: sp.myState === 'member' ? 'member' : sp.myState === 'pending' ? 'pending' : 'open',
        pending: sp.pendingCount ?? 0,
        name: sp.name || '',
        community: sp.community || '',
        meta: `${sp._count?.members ?? 0} 位成员 · ${sp._count?.profiles ?? 0} 只猫咪`,
        tags: sp.tags || '',
        lead: `组长：${sp.owner?.nickname ?? '—'}`,
      }));
    }
  } catch {
    /* 离线 / 后端未启动 / 截图拦截 → 保留演示数据撑版 */
  }

  // 「我的申请」条：最近一条入组申请；未登录直接跳过（公开页不该为它打一次 401）
  if (!uni.getStorageSync('token')) {
    myReq.value = null;
  } else {
    try {
      const reqs: any = await api.get('/spaces/my-requests', undefined, { silent: true });
      const first = Array.isArray(reqs) ? reqs[0] : null;
      myReq.value = first
        ? { spaceId: first.space?.id ?? '', spaceName: first.space?.name ?? '未命名小组', statusText: REQ_TEXT[first.status] ?? '处理中' }
        : null; // 请求成功且确实没有申请 → 隐藏整条
    } catch {
      /* 请求失败（离线 / 后端未启动 / 截图拦截）→ 保留 DEMO_REQ 撑版 */
    }
  }

  // 推荐附近小组：失败/无坐标 → 隐藏整栏
  try {
    const nb: any = await api.get('/spaces/nearby', undefined, { silent: true });
    const items = Array.isArray(nb?.items) ? nb.items : [];
    nearby.value = items.map((n: any, i: number) => ({
      id: n.id,
      initial: (n.name || '?').slice(0, 1),
      tone: TONES[(i + 1) % 3],
      name: n.name,
      community: n.community || '',
      distText: fmtDist(n.distance ?? 0),
    }));
  } catch {
    nearby.value = [];
  }
});

/* ── 创建小组弹窗（阶段3） ── */
const creating = ref(false);
const submitting = ref(false);
const form = ref({ name: '', community: '', tags: '', description: '' });

function onCreate() {
  // 创建小组必须登录（游客模式：不再由 401 自动踢登录页，这里显式引导）
  if (!requireLogin()) return;
  form.value = { name: '', community: '', tags: '', description: '' };
  creating.value = true;
}

async function submitCreate() {
  const name = form.value.name.trim();
  if (!name) {
    uni.showToast({ title: '先给小组起个名字吧', icon: 'none' });
    return;
  }
  if (submitting.value) return;
  submitting.value = true;
  try {
    const created: any = await api.post('/spaces', {
      name,
      community: form.value.community.trim() || undefined,
      tags: form.value.tags.trim() || undefined,
      description: form.value.description.trim() || undefined,
    });
    creating.value = false;
    uni.showToast({ title: '小组已创建', icon: 'success' });
    // 建完直接进详情页（组长身份）
    if (created?.id) {
      setTimeout(() => uni.navigateTo({ url: `/pages/space/detail?id=${created.id}` }), 600);
    }
  } catch {
    /* api.ts 已统一 toast */
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
/* ── 页面容器：设计内容区 24.01–351.00pt → 左右各 24pt = 48rpx ── */
.wrap {
  min-height: calc(100vh - var(--window-top, 0px) - var(--window-bottom, 0px));
  padding: 0 48rpx;
  box-sizing: border-box;
}

/* ── 标题区 ── */
.h1 {
  display: block;
  /*
    148rpx = 大标题在设计稿里的位置（行盒顶 74pt / 墨迹顶 76.42pt）。
    上面多了一行 paw-navbar 后，本页顶部布局流变成：
      nav 行盒高 = topPad 71.1rpx + 行高 88rpx = 159.1rpx
    159.1 > 148，差值 11.1rpx —— 这 11.1rpx 是导航行的**下半空白**
    （返回墨迹止于 65.26pt，行盒底在 79.55pt，中间没有墨），
    故用负 margin 把大标题拉回设计位置，而不是改 topPad（改了会连带移动返回）。
    ⚠️ 这两个值是一对：改 topPad 必须同步改这里。
  */
  margin-top: -11.1rpx;
  font-size: 48rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.sub1 {
  display: block;
  margin-top: 21rpx;
  font-size: 24rpx;
  color: #8b8779;
  line-height: 1;
}
.sub2 {
  display: block;
  margin-top: 16.4rpx;
  font-size: 22rpx;
  color: #a69e8c;
  line-height: 1;
}

/* ── 搜索框：40.24pt 高 → 80rpx，圆角 32rpx ── */
.search {
  margin-top: 26.3rpx;
  height: 80rpx;
  box-sizing: border-box;
  padding: 0 24rpx;
  background: #faf7f1;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
}
/* 放大镜：26rpx 盒，圆 18rpx + 45° 手柄 */
.ic-search {
  position: relative;
  margin-left: 1.36rpx; /* 设计图标 36.52 vs 实现 35.84 → 右移 0.68pt */
  width: 26rpx;
  height: 26rpx;
  flex-shrink: 0;
}
.ic-search::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 18rpx;
  height: 18rpx;
  box-sizing: border-box;
  border: 2rpx solid #8b8779;
  border-radius: 50%;
}
.ic-search::after {
  content: '';
  position: absolute;
  right: 1rpx;
  bottom: 1rpx;
  width: 8rpx;
  height: 2rpx;
  background: #8b8779;
  transform: rotate(45deg);
  transform-origin: 100% 50%;
}
.search-ipt {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx; /* 图标盒右缘 49.52 + 9pt = 首字 58.50（设计实测） */
  height: 26rpx;
  font-size: 26rpx;
  line-height: 26rpx;
  color: #3c4036;
  background: transparent;
  padding: 0;
  border: 0;
}

/* ── 我的申请条：35.17pt 高 → 70rpx，底 #F5F1E6 ── */
.applybar {
  margin-top: 24rpx;
  height: 70rpx;
  box-sizing: border-box;
  padding: 0 28rpx;
  background: #f5f1e6;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ab-l {
  position: relative;
  top: -2.04rpx;
  font-size: 24rpx;
  color: #595c4f;
  line-height: 1;
}
.ab-r {
  position: relative;
  top: 1.36rpx;
  margin-right: 2.04rpx; /* 右缘 334.76(设计) vs 335.78(实现) → 左移 1.02pt */
  font-size: 22rpx;
  color: #c68b6f;
  line-height: 1;
}
/* 阶段3：申请条右侧箭头（表示可点进详情），与状态文字同行 */
.ab-r-wrap {
  display: flex;
  align-items: center;
}
.ab-chev {
  position: relative;
  top: 1.36rpx;
  margin-left: 10rpx;
  width: 10rpx;
  height: 10rpx;
  border-top: 2rpx solid #c68b6f;
  border-right: 2rpx solid #c68b6f;
  transform: rotate(45deg);
}

/* ── 推荐附近小组（阶段3 增补栏）── */
.nearby {
  margin-top: 25.6rpx;
}
.nearby .sec-row {
  margin-top: 0;
}
.nb-scroll {
  margin-top: 18rpx;
  width: 100%;
  white-space: nowrap;
}
.nb-row {
  display: inline-flex;
}
.nb-card {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 200rpx;
  box-sizing: border-box;
  padding: 24rpx 0 22rpx;
  margin-right: 20rpx;
  background: #faf7f1;
  border-radius: 24rpx;
}
.nb-av {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
}
.nb-name {
  max-width: 180rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 14rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.nb-meta {
  max-width: 180rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #8b8779;
  line-height: 1;
}

/* ── 分组标题行 ── */
.sec-row {
  margin-top: 25.6rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.sec-t {
  font-size: 26rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.sec-c {
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}

/* ── 小组卡片：78.11pt 高 → 156rpx，纸白、圆角 32rpx、无描边 ── */
.card {
  position: relative; /* 组长待审批角标挂卡右上 */
  margin-top: 29.36rpx;
  height: 156rpx;
  box-sizing: border-box;
  padding: 0 28rpx;
  background: #faf7f1;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
}
/* 组长待审批角标：陶土胶囊，绝对定位悬于卡右上（不参与 flex，不扰动版式）；
   卡高 156rpx、状态胶囊占 y50–106 → 角标置于 y12–48，恰好错开 */
.apr-badge {
  position: absolute;
  top: 12rpx;
  right: 28rpx; /* 与状态胶囊右缘对齐（卡 padding 28rpx） */
  height: 36rpx;
  box-sizing: border-box;
  padding: 0 14rpx;
  border-radius: 18rpx;
  background: #c68b6f;
  display: flex;
  align-items: center;
}
.apr-badge-t {
  font-size: 20rpx;
  color: #faf7f1;
  line-height: 1;
}
.card + .card {
  margin-top: 24rpx;
}
/* 头像方块：44pt = 88rpx，圆角 26rpx */
.av {
  width: 88rpx;
  height: 88rpx;
  border-radius: 26rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.av-t {
  font-size: 36rpx;
  color: #faf7f1;
  line-height: 1;
}
.av--deep { background: #56674e; }
.av--sage { background: #8fa08b; }
.av--clay { background: #c68b6f; }

.cbody {
  position: relative;
  top: -0.76rpx; /* 名称/元信息 +0.68pt → 上提 1.36rpx */
  margin-left: 24rpx;
  flex: 1;
  min-width: 0;
}
.c-name {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.c-meta {
  display: block;
  margin-top: 13.34rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}
.c-tags {
  display: block;
  margin-top: 12.38rpx; /* 设计 meta→tags 比实现多 0.68pt */
  font-size: 20rpx;
  color: #a69e8c;
  line-height: 1;
}

/* 胶囊：120×56rpx，右对齐（距卡右 28rpx） */
.pill {
  width: 120rpx;
  height: 56rpx;
  box-sizing: border-box;
  flex-shrink: 0;
  border-radius: 28rpx;
  background: #8fa08b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pill-t {
  font-size: 22rpx;
  color: #faf7f1;
  line-height: 1;
}
.pill--outline {
  background: transparent;
  border: 2rpx solid #c68b6f;
}
.pill--outline .pill-t {
  color: #c68b6f;
}
/* 已加入：苔绿描边（几何与 open/pending 完全一致，120×56rpx，不改变版式） */
.pill--joined {
  background: transparent;
  border: 2rpx solid #8fa08b;
}
.pill--joined .pill-t {
  color: #56674e;
}
/* 未加入：实心陶土「申请加入」按钮（2026-10-08 二次新增）
   与「已加入（苔绿描边）」「审核中（陶土描边）」形成三级视觉层次：
   实心 = 可操作 / 描边 = 状态。尺寸仍是 120×56rpx，不动版式。 */
.pill--apply {
  background: #c68b6f;
}
.pill--apply-hover {
  opacity: 0.86;
}

/* ── CTA：50.38pt 高 → 100rpx，纸白底 + 2rpx 苔绿描边胶囊 ── */
.cta {
  margin-top: 24rpx;
  height: 100rpx;
  box-sizing: border-box;
  border: 2rpx solid #8fa08b;
  border-radius: 50rpx;
  background: #faf7f1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cta-t {
  position: relative;
  top: -4.74rpx; /* 墨迹中心偏低 2.37pt（H5 字体） */
  font-size: 30rpx;
  color: #56674e;
  line-height: 1;
}

/* ── 底注 ── */
.foot {
  display: block;
  margin-top: 26.7rpx;
  padding-bottom: 40rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
  text-align: center;
}

/* ── 搜索无匹配提示 ── */
.empty {
  margin-top: 29.36rpx;
  display: flex;
  justify-content: center;
}
.empty-t {
  font-size: 24rpx;
  color: #a69e8c;
  line-height: 1;
}

/* ── 创建小组弹窗（阶段3 增补）：复用 S9-2 底部弹层形态（paw-scrim/paw-sheet 几何） ── */
.paw-scrim {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 10;
  background: rgba(60, 64, 54, 0.245);
}
.paw-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 11;
  height: 940rpx;
  box-sizing: border-box;
  padding: 29rpx 34rpx 0;
  background: #f0ebdf;
  border: 2rpx solid #d7cec2;
  border-radius: 44rpx 44rpx 0 0;
}
.cs-handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: #d8cec2;
  margin: 0 auto;
}
.cs-title {
  display: block;
  margin-top: 25rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.cs-sub {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}
.cs-field {
  margin-top: 26rpx;
}
.cs-label {
  display: block;
  font-size: 22rpx;
  color: #6e6f58;
  line-height: 1;
}
.cs-ipt {
  margin-top: 12rpx;
  height: 76rpx;
  box-sizing: border-box;
  padding: 0 24rpx;
  background: #faf7f1;
  border-radius: 24rpx;
  font-size: 26rpx;
  line-height: 76rpx;
  color: #3c4036;
}
.cs-ta {
  margin-top: 12rpx;
  width: 100%;
  height: 130rpx;
  box-sizing: border-box;
  padding: 18rpx 24rpx;
  background: #faf7f1;
  border-radius: 24rpx;
  font-size: 26rpx;
  line-height: 36rpx;
  color: #3c4036;
}
.cs-btn {
  margin-top: 30rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background: #8fa08b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cs-btn--dis {
  opacity: 0.6;
}
.cs-btn-t {
  font-size: 28rpx;
  color: #faf7f1;
  line-height: 1;
}
</style>

<style>
/* uni-input 的 placeholder/内层节点不在 scoped 作用域（与 S10-2 textarea 同理），
   占位样式经 placeholder-class 在非 scoped 块下发；s101 前缀限本页，避免污染全局。
   字号/行高与原静态占位文字（26rpx / line-height:1）一致，保证默认态像素零回归。 */
.s101-ph {
  color: #b4b0a2;
  font-size: 26rpx;
  line-height: 26rpx;
  height: 26rpx;
  overflow: visible;
}
</style>
