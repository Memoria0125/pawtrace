<template>
  <!--
    小组详情页（阶段3 新增，设计稿无对应屏 —— 在线框 p31/p32 风格基础上按 paw- 体系扩展）
    入口：S10-1 列表卡片 / 「我的申请」条；承载申请入口（列表页不放申请按钮）。
    按钮四态（核心）：
      none    → 【申请加入小组】（陶土主按钮）→ 弹申请弹窗
      pending → 【申请审核中】置灰 + 【撤销申请】描边小按钮
      member  → 【进入协作看板】（苔绿）→ /pages/space/board
      rejected→ 恢复【申请加入小组】（可重申，join upsert 翻回 PENDING）
  -->
  <view class="wrap">
    <paw-navbar title="小组详情" back-url="/pages/space/index" :back-tab="false" />

    <!-- 头卡：头像 + 名称 + 小区 + 组长 -->
    <view class="head">
      <view class="av" :class="'av--' + tone">
        <text class="av-t">{{ space.initial }}</text>
      </view>
      <view class="head-body">
        <text class="h-name">{{ space.name }}</text>
        <view class="h-rows">
          <view class="pin"></view>
          <text class="h-community">{{ space.community || '未标注小区' }}</text>
        </view>
        <text class="h-owner">组长：{{ space.ownerName }}</text>
      </view>
    </view>

    <!-- 统计：成员 / 猫咪 / 打卡总数 / 小区（2026-10-08 增强：前三宫格整卡可点 → /pages/space/lists） -->
    <view class="stats">
      <view class="st" hover-class="st--hover" hover-stay-time="60" @tap="goList('members')">
        <text class="st-n">{{ space.memberCount }}</text>
        <text class="st-l">位成员</text>
        <view class="st-arrow"></view>
      </view>
      <view class="st" hover-class="st--hover" hover-stay-time="60" @tap="goList('profiles')">
        <text class="st-n">{{ space.catCount }}</text>
        <text class="st-l">只猫咪</text>
        <view class="st-arrow"></view>
      </view>
      <view class="st" hover-class="st--hover" hover-stay-time="60" @tap="goList('records')">
        <text class="st-n">{{ space.checkins }}</text>
        <text class="st-l">次打卡</text>
        <view class="st-arrow"></view>
      </view>
      <view class="st st--txt" hover-class="st--txt--hover" hover-stay-time="60" @tap="tipCommunity">
        <text class="st-community">{{ space.community || '—' }}</text>
        <text class="st-l">所属小区</text>
        <!-- 小区全称提示（2026-10-08 晚）：H5 鼠标悬浮 / 触屏轻点显示，格内截断时看全称 -->
        <view class="st-tip" :class="{ 'st-tip--on': tipOn }">
          <text class="st-tip-t">小区全称：{{ space.community || '未标注' }}</text>
        </view>
      </view>
    </view>

    <!-- 完整简介 -->
    <view class="block">
      <text class="b-t">小组简介</text>
      <text class="b-body">{{ space.description || '组长还没有写下简介。' }}</text>
      <text class="b-tags">{{ space.tags }}</text>
    </view>

    <!-- 看板公开摘要（未加入只能看摘要） -->
    <view class="block">
      <view class="b-head-row">
        <text class="b-t">小组看板 · 公开摘要</text>
        <text v-if="space.myState === 'member'" class="b-badge">已加入</text>
      </view>
      <view v-if="records.length" class="rec-list">
        <view v-for="r in records" :key="r.id" class="rec">
          <text class="rec-cat">{{ r.cat }}</text>
          <view class="rec-body">
            <text class="rec-content">{{ r.content }}</text>
            <text class="rec-meta">{{ r.typeText }} · {{ r.dateText }}</text>
          </view>
        </view>
      </view>
      <text v-else class="rec-empty">小组还没有打卡记录</text>
      <text v-if="space.myState !== 'member'" class="b-foot">加入小组后可查看完整看板、参与接力投喂</text>
    </view>

    <!-- 组长入口：待审批申请（仅组长 + 已加入 + 确有 pending 时出现） -->
    <view v-if="pendingCount > 0" class="apr" @tap="goApprove">
      <view class="apr-l">
        <text class="apr-t">待审批申请</text>
        <text class="apr-s">有 {{ pendingCount }} 位邻居想加入小组</text>
      </view>
      <text class="apr-go">去处理 ›</text>
    </view>

    <!-- 被拒提示 -->
    <view v-if="space.myState === 'rejected'" class="rej-tip">
      <text class="rej-t">上次申请未通过，可以调整留言后再次提交</text>
    </view>

    <view class="pad-bottom"></view>

    <!-- 底部操作栏（fixed，paw- 前缀已登记 App.vue 媒体查询） -->
    <view class="paw-detbar">
      <!-- pending：置灰主按钮 + 撤销 -->
      <template v-if="space.myState === 'pending'">
        <view class="bar-main bar-main--dis">
          <text class="bar-main-t">申请审核中</text>
        </view>
        <view class="bar-side" @tap="onCancel">
          <text class="bar-side-t">撤销申请</text>
        </view>
      </template>
      <!-- member：进入看板 -->
      <view v-else-if="space.myState === 'member'" class="bar-main bar-main--green" @tap="goBoard">
        <text class="bar-main-t">进入协作看板</text>
      </view>
      <!-- none / rejected：申请 -->
      <view v-else class="bar-main" @tap="openApply">
        <text class="bar-main-t">申请加入小组</text>
      </view>
    </view>

    <!-- 申请弹窗（底部弹层 + 遮罩） -->
    <view v-if="applying" class="paw-scrim" @tap="applying = false"></view>
    <view v-if="applying" class="paw-sheet">
      <view class="ap-handle"></view>
      <text class="ap-title">申请加入「{{ space.name }}」</text>
      <text class="ap-sub">组长审批通过后即可进入协作看板</text>
      <textarea
        class="ap-ta"
        v-model="applyMsg"
        placeholder="简单介绍你自己和你关注的猫咪，让组长更快通过～"
        placeholder-class="spdet-ph"
        maxlength="100"
      />
      <text class="ap-count">{{ applyMsg.length }}/100</text>
      <view class="ap-btn" :class="{ 'ap-btn--dis': submitting }" @tap="submitApply">
        <text class="ap-btn-t">{{ submitting ? '提交中…' : '提交申请' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { requireLogin } from '../../common/auth';

/** 痕迹类型 → 中文（与观察史页口径一致） */
const TYPE_TEXT: Record<string, string> = {
  FEEDING: '投喂',
  APPEARANCE: '外貌',
  LOCATION: '点位',
  HEALTH: '健康',
  SEASON: '季节',
  DEVICE: '感应',
};
const TONES = ['deep', 'sage', 'clay'];

const spaceId = ref('');
const tone = ref('deep');
const submitting = ref(false);
const applying = ref(false);
const applyMsg = ref('');

const space = ref<any>({
  initial: '?',
  name: '',
  community: '',
  ownerName: '—',
  memberCount: 0,
  catCount: 0,
  checkins: 0,
  description: '',
  tags: '',
  myState: 'none',
  myRequestId: null,
});
const records = ref<any[]>([]);
/** 待审批申请数（组长专属入口；非组长/无申请保持 0 → 整块不渲染） */
const pendingCount = ref(0);
const isOwner = ref(false);
/** 所属小区全称提示：触屏轻点显示 2.6s（H5 桌面另有 CSS :hover 悬浮显示） */
const tipOn = ref(false);
let tipTimer: ReturnType<typeof setTimeout> | null = null;

function tipCommunity() {
  if (!space.value.community) return;
  tipOn.value = true;
  if (tipTimer) clearTimeout(tipTimer);
  tipTimer = setTimeout(() => (tipOn.value = false), 2600);
}

async function load() {
  if (!spaceId.value) return;
  try {
    const d: any = await api.get(`/spaces/${spaceId.value}`);
    space.value = {
      id: d.id,
      initial: (d.name || '?').slice(0, 1),
      name: d.name || '',
      community: d.community || '',
      ownerName: d.owner?.nickname ?? '—',
      memberCount: d._count?.members ?? 0,
      catCount: d._count?.profiles ?? 0,
      checkins: d.checkins ?? 0,
      description: d.description || '',
      tags: d.tags || '',
      myState: d.myState ?? 'none',
      myRequestId: d.myRequestId ?? null,
    };
    tone.value = TONES[Math.abs(hash(d.id ?? '')) % 3];
    records.value = (d.recentRecords ?? []).map((r: any) => ({
      id: r.id,
      cat: r.profile?.name ?? '',
      content: r.content ?? '',
      // 多类型标签：后端 subTypes 是逗号串（不是数组）
      typeText: [r.type, ...String(r.subTypes || '').split(',').filter(Boolean)]
        .map((t) => TYPE_TEXT[t] || '')
        .filter(Boolean)
        .join(' + ') || '记录',
      dateText: fmtDate(r.occurredAt),
    }));
    // 组长且有成员身份 → 拉待审批数（接口自身校验组长，非组长 403 → 静默保持 0）
    const myUid = (uni.getStorageSync('user') || {}).id ?? '';
    isOwner.value = !!myUid && d.owner?.id === myUid;
    if (isOwner.value && space.value.myState === 'member') {
      const res: any = await api.get(`/spaces/${spaceId.value}/join-requests`, undefined, {
        silent: true,
      });
      const pending = Array.isArray(res) ? res : res?.pending ?? [];
      pendingCount.value = pending.length;
    } else {
      pendingCount.value = 0;
    }
  } catch {
    uni.showToast({ title: '小组信息加载失败', icon: 'none' });
  }
}

/** 简单字符哈希：让同名页面刷新后 tone 稳定 */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

onLoad((q: any) => {
  spaceId.value = q?.id ?? '';
});

// 首次进入与从审批页返回都走这里（待审批数 / 我的状态可能已变）
onShow(() => {
  if (spaceId.value) load();
});

/* ── 申请（none / rejected → 弹窗 → POST join；upsert 保证被拒后可重申） ── */
function openApply() {
  // 游客模式（2026-10-08 晚）：申请加入必须登录。小组详情本身是公开页，
  // 未登录也能看简介/成员/猫咪/打卡摘要，但这里先引导登录再开申请弹窗。
  if (!requireLogin()) return;
  applyMsg.value = '';
  applying.value = true;
}

async function submitApply() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await api.post(`/spaces/${spaceId.value}/join`, {
      message: applyMsg.value.trim() || undefined,
    });
    applying.value = false;
    uni.showToast({ title: '申请已提交', icon: 'success' });
    load();
  } catch {
    /* api.ts 已统一 toast */
  } finally {
    submitting.value = false;
  }
}

/* ── 撤销申请（DELETE join-requests/:id，仅 PENDING 可撤） ── */
async function onCancel() {
  const reqId = space.value.myRequestId;
  if (!reqId) return;
  uni.showModal({
    title: '撤销申请',
    content: '撤销后可随时重新申请，确定撤销吗？',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await api.delete(`/spaces/join-requests/${reqId}`);
        uni.showToast({ title: '已撤销', icon: 'success' });
        load();
      } catch {
        /* api.ts 已统一 toast */
      }
    },
  });
}

/* ── 已加入 → 协作看板（board 按 spaceId 匹配我的小组） ── */
function goBoard() {
  uni.navigateTo({ url: `/pages/space/board?spaceId=${spaceId.value}` });
}

/* ── 组长 → 审批页（S10-3，带 spaceId 走真实待审批列表） ── */
function goApprove() {
  uni.navigateTo({ url: `/pages/space/approve?spaceId=${spaceId.value}` });
}

/* ── stat 三宫格 → 二级列表（2026-10-08 新增） ── */
function goList(kind: 'members' | 'profiles' | 'records') {
  if (!spaceId.value) return;
  uni.navigateTo({ url: `/pages/space/lists?spaceId=${spaceId.value}&tab=${kind}` });
}
</script>

<style scoped>
.wrap {
  min-height: calc(100vh - var(--window-top, 0px) - var(--window-bottom, 0px));
  padding: 0 48rpx;
  box-sizing: border-box;
}

/* ── 头卡 ── */
.head {
  margin-top: 24rpx;
  box-sizing: border-box;
  padding: 30rpx 28rpx;
  background: #faf7f1;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
}
.av {
  width: 112rpx;
  height: 112rpx;
  border-radius: 32rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.av-t {
  font-size: 44rpx;
  color: #faf7f1;
  line-height: 1;
}
.av--deep { background: #56674e; }
.av--sage { background: #8fa08b; }
.av--clay { background: #c68b6f; }

.head-body {
  margin-left: 26rpx;
  flex: 1;
  min-width: 0;
}
.h-name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.h-rows {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
}
/* 定位圆钉：CSS 手绘（项目约定：图标一律手绘，不用 emoji/位图） */
.pin {
  position: relative;
  width: 20rpx;
  height: 20rpx;
  flex-shrink: 0;
}
.pin::before {
  content: '';
  position: absolute;
  left: 2rpx;
  top: 0;
  width: 16rpx;
  height: 16rpx;
  box-sizing: border-box;
  border: 3rpx solid #c68b6f;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
}
.pin::after {
  content: '';
  position: absolute;
  left: 7.5rpx;
  top: 5.5rpx;
  width: 5rpx;
  height: 5rpx;
  border-radius: 50%;
  background: #f0ebdf;
}
.h-community {
  margin-left: 8rpx;
  font-size: 24rpx;
  color: #c68b6f;
  line-height: 1;
}
.h-owner {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}

/* ── 统计四宫格（借 S10 看板三宫格形制：纸白卡、无描边、数字 40rpx #3C4036 / 标签 22rpx #8B8779） ── */
.stats {
  margin-top: 28rpx;
  display: flex;
  gap: 19.62rpx;
}
.st {
  position: relative; /* 2026-10-08：可点宫格右下角放小箭头，定位锚点 */
  flex: 1;
  box-sizing: border-box;
  height: 152rpx;
  padding-top: 34rpx;
  background: #faf7f1;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
/* 可点宫格才有箭头与按压效果；文字宫格（小区）无 */
.st--hover {
  background: #f5efe2;
  transform: scale(0.98);
}
/* 右下角小箭头：表示「可点进二级页」—— 6rpx 见方 + 1.5pt 上右描边 */
.st-arrow {
  position: absolute;
  right: 14rpx;
  bottom: 14rpx;
  width: 12rpx;
  height: 12rpx;
  border-top: 3rpx solid #c68b6f;
  border-right: 3rpx solid #c68b6f;
  transform: rotate(45deg);
  opacity: 0.55;
}
.st-n {
  font-size: 40rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.st-l {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}
.st--txt {
  justify-content: center;
  padding-top: 0;
}
.st--txt--hover {
  background: #f5efe2;
}
/* ── 小区全称提示（2026-10-08 晚）：悬浮 / 点按弹出，静止截图不渲染 → 不影响基线 ──
   本格在最右列，**右对齐锚定向左展开**，否则居中锚定会向右溢出手机框。 */
.st-tip {
  position: absolute;
  right: 0;
  bottom: calc(100% + 16rpx);
  transform: translateY(6rpx) scale(0.94);
  transform-origin: bottom right;
  box-sizing: border-box;
  max-width: 600rpx; /* 上限 300px，避免超长小区名顶出屏幕左缘 */
  padding: 14rpx 20rpx;
  background: #faf7f1;
  border: 2rpx solid #d7cec2;
  border-radius: 14rpx;
  box-shadow: 0 4rpx 14rpx rgba(60, 64, 54, 0.14);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.16s ease, transform 0.16s ease;
  z-index: 5;
}
.st-tip::after {
  content: '';
  position: absolute;
  right: 44rpx; /* 小尾巴对准格卡（右对齐后靠右 1/4 处） */
  top: 100%;
  width: 0;
  height: 0;
  border: 8rpx solid transparent;
  border-top-color: #d7cec2;
}
.st-tip--on,
.st--txt:hover .st-tip {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}
.st-tip-t {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 22rpx;
  color: #3c4036;
  line-height: 1;
}
.st-community {
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 26rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}

/* ── 简介块 ── */
.block {
  margin-top: 28rpx;
  box-sizing: border-box;
  padding: 28rpx 28rpx 26rpx;
  background: #faf7f1;
  border-radius: 32rpx;
}
.b-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.b-t {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.b-badge {
  font-size: 20rpx;
  color: #56674e;
  border: 2rpx solid #8fa08b;
  border-radius: 18rpx;
  padding: 4rpx 14rpx;
  line-height: 1;
}
.b-body {
  display: block;
  margin-top: 18rpx;
  font-size: 24rpx;
  color: #6e6f58;
  line-height: 40rpx;
}
.b-tags {
  display: block;
  margin-top: 16rpx;
  font-size: 20rpx;
  color: #a69e8c;
  line-height: 1;
}
.b-foot {
  display: block;
  margin-top: 20rpx;
  font-size: 20rpx;
  color: #a69e8c;
  line-height: 1;
}

/* ── 看板摘要行 ── */
.rec-list {
  margin-top: 18rpx;
}
.rec {
  display: flex;
  align-items: flex-start;
  padding: 16rpx 0;
}
.rec + .rec {
  border-top: 2rpx solid #f0ebdf;
}
.rec-cat {
  flex-shrink: 0;
  margin-top: 4rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: #56674e;
  line-height: 1;
}
.rec-body {
  margin-left: 16rpx;
  flex: 1;
  min-width: 0;
}
.rec-content {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 24rpx;
  color: #6e6f58;
  line-height: 1;
}
.rec-meta {
  display: block;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #a69e8c;
  line-height: 1;
}
.rec-empty {
  display: block;
  margin-top: 18rpx;
  font-size: 24rpx;
  color: #a69e8c;
  line-height: 1;
}

/* ── 被拒提示条 ── */
.rej-tip {
  margin-top: 24rpx;
  box-sizing: border-box;
  padding: 20rpx 28rpx;
  background: #f5f1e6;
  border-radius: 24rpx;
}
.rej-t {
  font-size: 22rpx;
  color: #c68b6f;
  line-height: 1;
}

/* ── 组长审批入口（与板块同族：纸白卡、圆角 32rpx、无描边） ── */
.apr {
  margin-top: 24rpx;
  box-sizing: border-box;
  padding: 26rpx 28rpx;
  background: #faf7f1;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.apr-l {
  display: flex;
  flex-direction: column;
}
.apr-t {
  font-size: 26rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.apr-s {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}
.apr-go {
  font-size: 24rpx;
  color: #c68b6f;
  line-height: 1;
  flex-shrink: 0;
  margin-left: 16rpx;
}

/* 底部留白：给 fixed 操作栏让位 */
.pad-bottom {
  height: 220rpx;
}

/* ── 底部操作栏（fixed 全宽 → paw- 前缀 + App.vue 媒体查询登记） ── */
.paw-detbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9;
  box-sizing: border-box;
  padding: 20rpx 48rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(240, 235, 223, 0.96);
  border-top: 2rpx solid #e2dcca;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.bar-main {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  background: #c68b6f;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bar-main--dis {
  background: #ded8c9;
}
.bar-main--green {
  background: #8fa08b;
}
.bar-main-t {
  font-size: 28rpx;
  color: #faf7f1;
  line-height: 1;
}
.bar-side {
  flex-shrink: 0;
  width: 200rpx;
  height: 88rpx;
  border-radius: 44rpx;
  box-sizing: border-box;
  border: 2rpx solid #c68b6f;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bar-side-t {
  font-size: 26rpx;
  color: #c68b6f;
  line-height: 1;
}

/* ── 申请弹窗（S9-2 底部弹层同款形制） ── */
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
  box-sizing: border-box;
  padding: 29rpx 34rpx 0;
  background: #f0ebdf;
  border: 2rpx solid #d7cec2;
  border-radius: 44rpx 44rpx 0 0;
}
.ap-handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: #d8cec2;
  margin: 0 auto;
}
.ap-title {
  display: block;
  margin-top: 25rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ap-sub {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}
.ap-ta {
  margin-top: 22rpx;
  width: 100%;
  height: 200rpx;
  box-sizing: border-box;
  padding: 20rpx 24rpx;
  background: #faf7f1;
  border-radius: 24rpx;
  font-size: 26rpx;
  line-height: 36rpx;
  color: #3c4036;
}
.ap-count {
  display: block;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #a69e8c;
  line-height: 1;
  text-align: right;
}
.ap-btn {
  margin: 22rpx 0 30rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background: #8fa08b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ap-btn--dis {
  opacity: 0.6;
}
.ap-btn-t {
  font-size: 28rpx;
  color: #faf7f1;
  line-height: 1;
}
</style>

<style>
/* uni-textarea 的 placeholder 不在 scoped 作用域（与 S10-2 同理），非 scoped 块下发；
   spdet 前缀限本页。 */
.spdet-ph {
  color: #b4b0a2;
  font-size: 24rpx;
  line-height: 36rpx;
}
</style>
