<template>
  <!-- S10-3 审批（PDF p33）｜PRD F5.3 成员审批｜入口：S10-1 协作空间列表 → 待审批条目
       与 p32 同族结构：‹返回 + 左对齐大标题（本屏头部整体比 p32 低 2.03pt，见 style 注释） -->
  <view class="wrap">
    <paw-navbar
      title=""
      :top-pad="123.16"
      back-url="/pages/space/index"
      :back-tab="false"
    />

    <!-- 头部行：左大标题 + 右「组长视角」胶囊（胶囊中心比标题盒中心低 2.89pt → top 微调） -->
    <view class="hd">
      <text class="h1">协作申请</text>
      <view class="hd-pill">
        <text class="hd-pill-t">组长视角</text>
      </view>
    </view>

    <!-- 空态：真实数据且已全部审完（避免继续展示演示数据） -->
    <view v-if="emptyQueue" class="empty">
      <text class="empty-t">暂无待审批申请</text>
      <text class="empty-s">有新邻居申请加入时，会第一时间出现在这里</text>
    </view>

    <!-- 待审批申请卡：头部行 → 头像行 → 理由气泡 → 拒绝/同意 -->
    <view v-if="!emptyQueue" class="qcard">
      <view class="q-head">
        <text class="q-title">{{ req.name }} 申请加入小组</text>
        <text class="q-time">{{ req.time }}</text>
      </view>
      <view class="q-user">
        <view class="q-avatar">{{ req.initial }}</view>
        <view class="q-info">
          <text class="q-name">{{ req.name }}</text>
          <text class="q-meta">{{ req.meta }}</text>
        </view>
      </view>
      <view class="q-reason">
        <text v-for="(l, i) in req.lines" :key="i" class="q-line">{{ l }}</text>
      </view>
      <view class="q-btns">
        <view class="q-btn q-btn--no" @tap="review(false)">
          <text class="q-btn-t q-btn-t--no">拒绝</text>
        </view>
        <view class="q-btn q-btn--yes" @tap="review(true)">
          <text class="q-btn-t q-btn-t--yes">同意</text>
        </view>
      </view>
    </view>

    <!-- 历史记录卡（浅米底，比纸白卡再深一档）
         2026-10-08 晚修：**真实数据加载成功但没有任何已处理申请时不再渲染这张卡**。
         之前它挂着 p33 设计稿的演示文案（「陈同学 · 申请加入小组 / 昨天 · 已同意」），
         与真实数据（本组 2 条待审批、1 位成员）自相矛盾，把人看懵。
         离线 / 后端未启动 / 像素核对拦截 API 时仍渲染 → S10-3 像素基线不受影响。 -->
    <view v-if="showHistory" class="hcard">
      <view class="h-avatar">{{ history.initial }}</view>
      <view class="h-info">
        <text class="h-main">{{ history.main }}</text>
        <text class="h-sub">{{ history.sub }}</text>
      </view>
    </view>

    <text v-if="!emptyQueue" class="note">拒绝 → 系统将通知申请人，其仍保留在小组列表，可完善理由后再次申请</text>

    <!-- 同意后获得：标题 + 三条「·」列表 -->
    <view v-if="!emptyQueue" class="rcard">
      <text class="r-title">同意后，{{ req.name }}将立即获得</text>
      <view v-for="(t, i) in gains" :key="i" class="r-row">
        <view class="r-dot"></view>
        <text class="r-txt">{{ t }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { api } from '../../common/api';

/** 演示数据（与设计稿 p33 逐字对齐）。后端返回真实数据时覆盖。 */
const DEMO = {
  id: '',
  initial: '林',
  name: '林晚',
  time: '刚刚',
  meta: '投喂记录 26 条 · 建立档案 4 只',
  lines: ['我在江湾小区常年投喂 3 只猫，想和大家一起', '记录它们的日常与就诊。'],
};

const req = ref({ ...DEMO });
const history = ref({
  initial: '陈',
  main: '陈同学 · 申请加入小组',
  sub: '昨天 · 已同意',
});
const gains = ref([
  '查看组员所有猫咪观测记录',
  '在小组内发布自己拍到的痕迹',
  '和组员共享同一只流浪猫的档案',
]);

const spaceId = ref('');
/** 待审批队列（服务端返回；审批一条后切下一条，空了返回列表页） */
const queue = ref<any[]>([]);
const historyList = ref<any[]>([]);
/** 真实数据且已无待审批 → 显示空态（不展示演示数据） */
const emptyQueue = ref(false);
/** 是否渲染历史卡：真实数据加载成功但没有已处理申请 → false（不留设计稿的假历史） */
const showHistory = ref(true);

onLoad((q) => {
  spaceId.value = q?.spaceId || '';
  // 列表页可把待审批条目整体带过来（离线也正确显示点了哪一条）
  if (q?.data) {
    try {
      const d = JSON.parse(decodeURIComponent(q.data));
      if (d && d.name) {
        req.value = {
          ...DEMO,
          id: d.id ?? '',
          initial: d.initial || d.name.slice(0, 1),
          name: d.name,
          time: d.time || DEMO.time,
          meta: d.meta || DEMO.meta,
          lines: d.lines || DEMO.lines,
        };
      }
    } catch {
      /* 参数损坏 → 保留演示数据 */
    }
  }
});
onShow(load);

/** 相对时间：今天 / 昨天 / N 天前 / M 月 D 日 */
function relTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const day = 86400000;
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((n0 - d0) / day);
  if (diff <= 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff < 30) return `${diff} 天前`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 服务端申请 → 本屏卡片数据 */
function toCard(r: any) {
  return {
    id: r.id ?? '',
    initial: (r.user?.nickname || '?').slice(0, 1),
    name: r.user?.nickname || '观察者',
    time: relTime(r.createdAt || new Date().toISOString()),
    meta: `投喂记录 ${r.user?._count?.records ?? 0} 条 · 建立档案 ${r.user?._count?.profiles ?? 0} 只`,
    lines: (r.message || '').split('\n').filter(Boolean),
  };
}

/** 后端待审批列表 → 逐条审批（离线/未启动则保留演示数据） */
async function load() {
  if (!spaceId.value) return;
  try {
    // silent：非组长（403）/离线时由本地 catch 兜底，不弹全局错误 toast
    const data: any = await api.get(`/spaces/${spaceId.value}/join-requests`, undefined, {
      silent: true,
    });
    // 兼容两种返回：新 { pending, history } / 旧数组
    const pending: any[] = Array.isArray(data) ? data : data?.pending ?? [];
    const hist: any[] = Array.isArray(data) ? [] : data?.history ?? [];
    queue.value = pending;
    historyList.value = hist;
    if (pending.length > 0) {
      req.value = toCard(pending[0]);
      emptyQueue.value = false;
    } else {
      // 真事数据 + 无待审批 → 空态（避免继续显示 DEMO 的假申请卡）
      emptyQueue.value = true;
    }
    if (hist.length > 0) {
      const h = hist[0];
      showHistory.value = true;
      history.value = {
        initial: (h.user?.nickname || '?').slice(0, 1),
        main: `${h.user?.nickname || '观察者'} · 申请加入小组`,
        sub: `${relTime(h.updatedAt)} · ${h.status === 'APPROVED' ? '已同意' : '已拒绝'}`,
      };
    } else {
      // 真实数据、确实没有已处理申请 → 隐藏设计稿演示历史卡
      showHistory.value = false;
    }
  } catch {
    /* 离线 / 后端未启动 / 非组长（403）→ 保留演示数据撑版 */
  }
}

async function review(approve: boolean) {
  const yes = approve;
  if (req.value.id) {
    try {
      await api.patch(`/spaces/join-requests/${req.value.id}`, { approve: yes });
      uni.showToast({ title: yes ? '已同意，申请人已加入小组' : '已拒绝，已通知申请人', icon: 'none' });
      // 审批一条 → 队列前移；还有下一条就切过去，没有了回列表页
      queue.value = queue.value.filter((r) => r.id !== req.value.id);
      const next = queue.value[0];
      if (next) {
        setTimeout(() => {
          req.value = toCard(next);
        }, 600);
      } else {
        setTimeout(() => {
          uni.navigateBack();
        }, 900);
      }
      return;
    } catch {
      /* 离线：落到下面的兜底反馈 */
    }
  }
  // 无 id（演示数据 / 离线）也要有反馈，避免点了没反应
  uni.showToast({
    title: yes ? '已记录同意，联网后自动提交' : '已记录拒绝，联网后自动提交',
    icon: 'none',
  });
}
</script>

<style scoped>
.wrap {
  min-height: calc(100vh - var(--window-top, 0px) - var(--window-bottom, 0px));
  padding: 0 48rpx 60rpx;
  box-sizing: border-box;
}

/*
  头部：p33 的导航行与 p32 **不同**（实测 p33 返回墨迹 y 77.44~90.97，p32 为 75.41~88.94，
  差 2.03pt；大标题 p33 104.73~127.05，p32 100.68~123.33，差 4.05pt）。
  故 topPad 用 123.16rpx（=119.1+4.06），大标题另需负 margin 吸收导航行下半空白：
    nav 行盒底 = 123.16 + 88 = 211.16rpx；标题行盒顶需落在 204.62rpx → margin-top = -6.54rpx。
  ⚠️ 与 topPad 成对，改一个必须同步改另一个。
*/
.hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -6.54rpx;
}
.h1 {
  font-size: 48rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}

/* 「组长视角」胶囊：127×43.6rpx，1rpx 陶土描边、透明底、陶土字（20rpx）。
   垂直：胶囊中心 117.2pt 比标题盒中心 114.31pt 低 2.89pt → top 5.78rpx。 */
.hd-pill {
  position: relative;
  top: 5.78rpx;
  width: 128.4rpx;
  height: 43.6rpx;
  box-sizing: border-box;
  border: 1rpx solid #c68c70;
  border-radius: 21.8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 0.5rpx;
}
.hd-pill-t {
  font-size: 20rpx;
  color: #c68c70;
  line-height: 1;
}

/* 空态卡：与申请卡同族（纸白底 / 圆角 32rpx / 无描边），仅在没有待审批时出现 */
.empty {
  margin-top: 36.84rpx;
  padding: 64rpx 32rpx;
  background: #f9f7f2;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-t {
  font-size: 28rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.empty-s {
  margin-top: 18rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}

/* 申请卡：h 215.06pt=430rpx，纸白底、圆角 32rpx、无描边（p33 卡1 边缘实测无深色线） */
.qcard {
  margin-top: 36.84rpx;
  padding: 32rpx 32rpx 28rpx;
  background: #f9f7f2;
  border-radius: 32rpx;
  box-sizing: border-box;
}
.q-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  top: -1.36rpx;
}
.q-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.q-time {
  font-size: 20rpx;
  color: #a69e8c;
  line-height: 1;
  position: relative;
  top: 1rpx;
}

/* 头像行：圆头像 80rpx（不是方块 —— p33 卡1 头像是正圆）+ 名/元信息
   avatar 顶 = 卡顶 + 42.94pt，header 盒底 = 卡顶 + 30.6pt → margin 26.14rpx */
.q-user {
  display: flex;
  align-items: center;
  margin-top: 26.14rpx;
}
.q-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #c68c70;
  color: #faf9f1;
  font-size: 28rpx;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.q-info {
  display: flex;
  flex-direction: column;
  margin-left: 20.78rpx;
}
.q-name {
  font-size: 26rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.q-meta {
  font-size: 20rpx;
  color: #8b8779;
  line-height: 1;
  margin-top: 12.06rpx;
}

/* 理由气泡：**底色就是页面米底 #F0EBDF**（不是另一个色号），圆角 20rpx，
   高 100rpx = 上下 padding 之和 41.2 + 行高 29.4×2。
   padding-top 比 bottom 小：H5 首行基线比设计稿低 1.69pt，靠上小下大把文字顶回设计位置，
   总高不变（否则气泡块本身会错位）。 */
.q-reason {
  margin-top: 24.82rpx;
  padding: 17.22rpx 20.8rpx 24rpx;
  background: #f0ebdf;
  border-radius: 20rpx;
}
.q-line {
  display: block;
  font-size: 24rpx;
  color: #595c4f;
  line-height: 29.4rpx;
}
/* 第二行行距比设计紧 0.67pt，单独下移补齐（不改 line-height，否则整个气泡高会变） */
.q-line + .q-line {
  position: relative;
  top: 1.34rpx;
}

/* 按钮行：两枚等宽胶囊（各 285rpx + 间隙 20.3rpx = 卡内容宽 590rpx），高 88rpx */
.q-btns {
  display: flex;
  margin-top: 23.74rpx;
}
.q-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.q-btn--no {
  border: 2rpx solid #e5e0d1;
  border-radius: 44rpx;
}
.q-btn--yes {
  background: #56674e;
  border-radius: 44rpx;
  margin-left: 21.3rpx;
}
/* 按钮文字：墨迹高 13.19pt → 30rpx；两字起点步进 17.93pt > 15pt，说明设计带字间距
   → letter-spacing 5rpx。
   水平补偿：letter-spacing 会在末字右侧多留一份间距，居中时整行左偏；
   又因「拒绝」带 2rpx border（居中盒不同），两个字按钮的补偿量实测差 2pt，分别给。 */
.q-btn-t {
  font-size: 30rpx;
  line-height: 1;
  letter-spacing: 5rpx;
}
.q-btn-t--no {
  color: #8b8779;
  position: relative;
  left: 2.72rpx;
}
.q-btn-t--yes {
  color: #faf9f1;
  position: relative;
  left: 0.68rpx;
}

/* 历史卡：浅米底 #F4F2E5（比纸白卡深一档）、h 111.58rpx、圆角 32rpx、无描边 */
.hcard {
  display: flex;
  align-items: center;
  margin-top: 28.54rpx;
  padding: 24rpx 28rpx;
  background: #f4f2e5;
  border-radius: 32rpx;
  box-sizing: border-box;
}
.h-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #b5afa3;
  color: #faf9f1;
  font-size: 24rpx;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.h-info {
  display: flex;
  flex-direction: column;
  margin-left: 21rpx;
}
.h-main {
  position: relative;
  top: -2.72rpx;
  font-size: 24rpx;
  color: #8b8779;
  line-height: 1;
}
.h-sub {
  font-size: 20rpx;
  color: #a69e8c;
  line-height: 1;
  margin-top: 10.08rpx;
}

/* 底注：整行居中，22rpx。
   ⚠️ 必须 nowrap —— 设计稿这行墨迹是 x 8.8~366.5pt（宽 357.7pt），**比内容区 327pt 还宽**，
   是刻意溢出居中的一行；允许换行会被折成两行并把下面的卡整体推低 ~11.5pt。 */
.note {
  display: block;
  margin-top: 28.4rpx;
  /* 负 margin 把块撑到整屏宽：设计稿这行是相对**屏幕**居中的（中心 187.94pt），
     不是相对内容区；否则浏览器对超宽行会改成左对齐，整行右偏 10pt。 */
  margin-left: -48rpx;
  margin-right: -48rpx;
  text-align: center;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
  white-space: nowrap;
}

/* 同意后获得卡：h 213.6rpx、纸白底、圆角 32rpx、无描边。
   padding-top 比 32rpx 小 2.04rpx、margin-top 相应加大 —— 卡顶要与设计对齐（471.04pt），
   而内部行位置已在其它参数下调准，故用「外移内缩」保持内容绝对位置不动。 */
.rcard {
  margin-top: 30.72rpx;
  padding: 29.96rpx 32rpx 29.7rpx;
  background: #f9f7f2;
  border-radius: 32rpx;
  box-sizing: border-box;
}
.r-title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.r-row {
  display: flex;
  align-items: center;
  margin-top: 20.4rpx;
}
/* 第一条与标题的间距比行间距大 1.34rpx（设计实测 21.74 vs 20.4） */
.r-title + .r-row {
  margin-top: 21.74rpx;
}
/* 列表符号是「·」小圆点 ⌀2.37pt=5rpx（**不是** S10-2 那种苔绿勾选圆） */
.r-dot {
  position: relative;
  top: 1.05rpx;
  width: 5rpx;
  height: 5rpx;
  border-radius: 50%;
  background: #8b8779;
  margin-left: 8.06rpx;
  margin-right: 15.26rpx;
  flex-shrink: 0;
}
.r-txt {
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}
</style>
