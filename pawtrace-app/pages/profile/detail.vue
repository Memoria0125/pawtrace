<template>
  <!--
    S4 个体档案详情（PRD F1.2）
    设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p6，逐像素实测（375×812 @2.957x）
    结构：自绘导航（返回 / 个体档案 / 编辑）→ 档案卡（头像框 + 名称 + ID + 双胶囊）
          → 统计三卡（观测天数 / 痕迹记录 / 出没点位）→ 外貌与状态卡（三胶囊 + 双圆环徽章 + 初遇行）
          → 出没点位卡（主/次点位胶囊 → 点它跳地图页聚焦到这只猫，2026-10-10）
          → 底部三按钮（时间轴 / 新增记录 / 分享档案卡）
    两处刻意处理（非漏做）：
      1. 导航栏用自绘（navigationStyle: custom）：设计稿要「返回 + 居中大标题 + 右侧编辑」三栏；
      2. 文案里的全角空格/间隔按设计稿原样渲染（「毛色 三花」「初遇 2026-07-08 · 建档人：林晚」），
         不同端断行点会漂移，短文案均单行 nowrap。
    数据（2026-10-06）：带 ?id= 时全卡接真实档案（建档人 = creator.nickname、统计 = 痕迹数/点位数
    聚合、外貌/徽章/点位 = 档案字段）；无 id 或请求失败 → DEMO 演示帧（交付图口径依赖此兜底）。
    2026-10-09：① 「编辑」实装 → pages/profile/edit（原先只有一句 toast）；
                ② 真实档案态字段缺失不再用 DEMO 顶替（毛色/体型/特征 → 「未记录」，
                   健康 → 「状态待观察」），演示值只在**没有 id 的纯演示帧**里出现。
  -->
  <view class="paw-page s4">
    <!-- ============ 自绘导航（paw-navbar 共享组件） ============
         p6 实测：标题「个体档案」墨迹 145.40~240.76pt，中心 193.08pt（≠ 页中 187.5）
         → 靠左右块宽差把 flex:1 标题推到位。规格：中心 = 40 + (670 + L − R)/2（rpx）
         L=200、R=177.7 → 386.16rpx = 193.08pt ✓
         右块 rightPad=0：p6「编辑」墨迹右端 354.72pt，正好顶到 .paw-page 的 355pt 内沿 -->
    <paw-navbar title="个体档案" :left-w="200" :right-w="177.7" :right-pad="0">
      <template #right>
        <text class="paw-nav-act paw-nav-act--md" @tap="onEdit">编辑</text>
      </template>
    </paw-navbar>

    <!-- ============ 档案卡 ============ -->
    <view class="paw-card idcard">
      <!-- 头像框（淡紫底 + 档案照占位文案，照片上传后替换） -->
      <view class="avatar">
        <image v-if="p.avatarUrl" class="avatar-img" :src="p.avatarUrl" mode="aspectFill" />
        <text v-else class="avatar-txt">{{ p.photoLabel }}</text>
      </view>
      <!-- 名称 / 档案ID / 状态胶囊：坐标全部按设计稿实测绝对定位 -->
      <text class="name">{{ p.name }}</text>
      <text class="idline">{{ p.idText }}</text>
      <view class="idpills">
        <!-- 关注切换（2026-10-07）：真实数据态——未关注显示「+ 关注」，已关注保持绿胶囊（点击弹确认取关）；
             自己建的档案（mine）不可切换；DEMO 兜底 observed=true → 不渲染新元素 → 像素基线零改动 -->
        <view
          v-if="p.observed"
          class="pill pill--green"
          :class="{ 'pill--tap': followable }"
          @tap="toggleFollow"
        >{{ p.observeTag }}</view>
        <view
          v-else-if="followable"
          class="pill pill--follow"
          @tap="toggleFollow"
        >+ 关注</view>
        <view class="pill pill--cream">{{ p.neuteredTag }}</view>
      </view>
    </view>

    <!-- ============ 统计三卡 ============ -->
    <view class="stats">
      <view v-for="s in p.stats" :key="s.label" class="stat">
        <text class="stat-num">{{ s.n }}</text>
        <text class="stat-label">{{ s.label }}</text>
      </view>
    </view>

    <!-- ============ 外貌与状态卡 ============ -->
    <view class="paw-card lookcard">
      <text class="lk-title">外貌与状态</text>
      <view class="lk-pills">
        <view v-for="a in p.attrs" :key="a" class="lk-pill">{{ a }}</view>
      </view>
      <!-- 双圆环徽章 + 初遇行（初遇行右对齐卡片内边距，与设计稿一致） -->
      <view class="lk-rings">
        <view v-for="r in p.rings" :key="r.text" class="ring" :class="r.tone === 'orange' ? 'ring--orange' : ''">
          <text class="ring-txt">{{ r.text }}</text>
        </view>
      </view>
      <text class="firstmeet">{{ p.firstMeet }}</text>
    </view>

    <!-- ============ 出没点位卡 ============
         点胶囊 → 跳地图页（tab 页，switchTab 不带参）并把「这只猫」一次性交给它聚焦。 -->
    <view class="paw-card spotcard">
      <text class="sp-title">出没点位</text>
      <view class="sp-pills">
        <view
          v-for="s in p.spots"
          :key="s.text"
          class="sp-pill"
          :class="[s.main ? 'sp-pill--main' : 'sp-pill--sub', s.none ? 'sp-pill--none' : '']"
          @tap="onSpot(s)"
        >
          {{ s.text }}
        </view>
      </view>
    </view>

    <!-- ============ 底部三按钮 ============ -->
    <view class="acts">
      <view class="act act--dark" @tap="goTimeline">
        <text class="act-main">时间轴</text>
        <text class="act-sub">它来过、它变了</text>
      </view>
      <view class="act act--green" @tap="goRecord">
        <text class="act-main">新增记录</text>
        <text class="act-sub">投喂／健康／季节</text>
      </view>
      <view class="act act--paper" @tap="onShareCard">
        <text class="act-paper-txt">分享档案卡</text>
      </view>
    </view>

    <!-- 分享档案卡浮层（2026-10-08 晚新增）
         把这只猫的档案导出成一张手账风卡片：预览的就是能保存下来的那张图，
         支持「复制档案文案」与「下载卡片 / 保存到相册」。
         替代原「生成壁纸」——那个按钮点了只弹一句 toast，没有任何真实出口。 -->
    <paw-sharecard :show="shareOn" :data="shareData" @close="shareOn = false" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { assetUrl } from '../../common/uploader';
import { type ShareCardData } from '../../common/sharecard';

/**
 * 演示数据兜底：与设计稿 p6 完全同款。
 * 后端未启动 / 离线 / 字段缺失时撑起版面（交付图走 DEMO_FALLBACK 拦截，像素基线由它保证）。
 */
const DEMO = {
  name: '三花 · 0824',
  idText: '档案ID：PT-20260824-017·猫',
  photoLabel: '三花猫档案照',
  avatarUrl: '',
  observed: true,
  observeTag: '我的观测对象',
  neuteredTag: '已绝育',
  stats: [
    { n: 47, label: '观测天数' },
    { n: 12, label: '痕迹记录' },
    { n: 2, label: '出没点位' },
  ],
  attrs: ['毛色 三花', '体型 中等', '左耳剪耳'],
  rings: [
    { text: '已绝育', tone: 'green' },
    { text: '健康', tone: 'orange' },
  ],
  firstMeet: '初遇 2026-07-08 · 建档人：林晚',
  spots: [
    { text: '楼下花坛 · 主点位', main: true },
    { text: '车棚 · 冬季常驻', main: false },
  ],
};

/** 枚举 → 中文（与后端 schema 一致） */
const ANIMAL: Record<string, string> = { CAT: '猫', DOG: '狗' };
const NEUTER: Record<string, string> = {
  STERILIZED: '已绝育',
  NOT_STERILIZED: '未绝育',
  UNKNOWN: '绝育未确认',
};
const HEALTH: Record<string, string> = {
  HEALTHY: '健康',
  THIN: '偏瘦',
  INJURED: '受伤',
  SICK: '疑似生病',
  DECEASED: '已离世',
};

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 档案编号：PT-建档日期-编号后 3 位（设计稿形态 PT-20260824-017） */
function codeOf(id: string, createdAt?: string) {
  const d = createdAt ? new Date(createdAt) : new Date();
  const tail = (id || '').replace(/\W/g, '').slice(-3).toUpperCase().padStart(3, '0');
  return `PT-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${tail}`;
}

const p = ref<any>({ ...DEMO });
const id = ref('');
/** 真实数据态才允许关注切换（DEMO 兜底保持纯展示，保像素基线） */
const followable = ref(false);
/** 我自己建的档案：永远在观测对象里（后端过滤 OR creatorId），不做关注/取关 */
const mine = ref(false);
/** 是否已成功读到真实档案（编辑返回后刷新用；演示帧不触发） */
const loaded = ref(false);

onLoad(async (q) => {
  id.value = q?.id || '';
  await load();
});

/** 从编辑页返回后重新拉一次（昵称/毛色/特征/点位可能已改） */
onShow(() => {
  if (id.value && loaded.value) void load();
});

async function load() {
  if (!id.value) return; // 无 id：保持演示数据撑版面
  try {
    const d: any = await api.get(`/profiles/${id.value}`);
    followable.value = true;
    loaded.value = true;
    mine.value = !!d.mine;

    // —— 真实字段逐个回填；缺失的字段直接说「未记录」，不用设计稿演示值顶替 ——
    // （2026-10-09 修：原先毛色/体型/特征/健康缺失时回落 DEMO 的「三花 / 中等 / 健康」，
    //   于是新档的橘猫档案卡上赫然写着「毛色 三花」——演示值顶替真值）
    const attrs = [
      `毛色 ${d.coatColor || '未记录'}`,
      `体型 ${d.bodySize || '未记录'}`,
      d.specialMarks || '特征未记录',
    ];

    // 出没点位：记录去重的点位名（首项为主点位）；无记录回落档案自身的最近出没描述
    // 2026-10-10：点位带坐标（点它跳地图页聚焦到这只猫）。坐标 = 该点位最近一条记录的坐标
    //              ?? 档案自身的 lastSeen 坐标（老记录没存坐标时用后者兜底）。
    const rawSpots: any[] = Array.isArray(d.spots) && d.spots.length
      ? d.spots
      : (Array.isArray(d.spotNames) ? d.spotNames : []).map((t: string) => ({ name: t }));
    if (!rawSpots.length && d.lastSeenDesc) rawSpots.push({ name: d.lastSeenDesc });
    const fallLat = typeof d.lastSeenLat === 'number' ? d.lastSeenLat : null;
    const fallLng = typeof d.lastSeenLng === 'number' ? d.lastSeenLng : null;
    const spots = rawSpots.slice(0, 2).map((s: any, i: number) => ({
      text: i === 0 ? `${s.name} · 主点位` : s.name,
      main: i === 0,
      name: s.name,
      lat: typeof s.lat === 'number' ? s.lat : fallLat,
      lng: typeof s.lng === 'number' ? s.lng : fallLng,
    }));

    // 观测天数：初遇（最早记录 / 建档时间）当天记第 1 天
    const since = d.firstSeenAt ? new Date(d.firstSeenAt).getTime() : NaN;
    const days = isNaN(since) ? DEMO.stats[0].n : Math.floor((Date.now() - since) / 86400000) + 1;

    p.value = {
      ...DEMO,
      name: d.name || DEMO.name,
      avatarUrl: assetUrl(d.avatarPhoto?.url),
      photoLabel: d.name ? `${d.name}档案照` : DEMO.photoLabel,
      idText: d.name
        ? `档案ID：${codeOf(d.id, d.createdAt)}·${ANIMAL[d.animalType] || '猫'}`
        : DEMO.idText,
      observed: !!d.myObservation,
      neuteredTag: NEUTER[d.sterilizationStatus] || '绝育未确认',
      stats: [
        { n: days, label: '观测天数' },
        { n: d._count?.records ?? 0, label: '痕迹记录' },
        { n: spots.length, label: '出没点位' },
      ],
      attrs,
      rings: [
        { text: NEUTER[d.sterilizationStatus] || '绝育未确认', tone: 'green' },
        { text: HEALTH[d.healthStatus] || '状态待观察', tone: 'orange' },
      ],
      firstMeet: `初遇 ${ymd(new Date(d.firstSeenAt || d.createdAt))} · 建档人：${d.creatorNickname || '—'}`,
      spots: spots.length ? spots : [{ text: '还没有点位记录', main: false, none: true }],
      // 点位跳地图页聚焦用（2026-10-10）：档案页点「出没点位」→ 把这些真值一次性交给地图页
      profileId: id.value,
      animalType: d.animalType || 'CAT',
      lastSeenAt: d.lastSeenAt || null,
      lastSeenLat: fallLat,
      lastSeenLng: fallLng,
      /** 头像原始相对路径（地图页自己 assetUrl；这里存已拼过的绝对地址会被二次处理） */
      avatarRaw: d.avatarPhoto?.url || '',
    };
  } catch { /* 离线：保持演示数据 */ }
}

/** 关注/取关切换（2026-10-07）：POST/DELETE /profiles/:id/observe；自己建的档案不响应 */
async function toggleFollow() {
  if (!followable.value) return; // DEMO 兜底：纯展示
  if (mine.value) {
    uni.showToast({ title: '自己建的档案一直在观测对象里', icon: 'none' });
    return;
  }
  try {
    if (p.value.observed) {
      const confirmed = await new Promise<boolean>((resolve) => {
        uni.showModal({
          title: '取消关注',
          content: '不再关注这只猫了吗？已写的记录会保留在观察史里。',
          confirmText: '取消关注',
          cancelText: '再想想',
          success: (r) => resolve(r.confirm),
          fail: () => resolve(false),
        });
      });
      if (!confirmed) return;
      await api.delete(`/profiles/${id.value}/observe`);
      p.value = { ...p.value, observed: false };
      uni.showToast({ title: '已取消关注', icon: 'none' });
    } else {
      await api.post(`/profiles/${id.value}/observe`);
      p.value = { ...p.value, observed: true };
      uni.showToast({ title: '已加入我的观察', icon: 'none' });
    }
  } catch { /* api.ts 非 2xx 已统一 toast */ }
}

/** 返回由 <paw-navbar> 内部处理（common/nav 的 goBack，兜底 = 首页 Tab） */

const goTimeline = () => uni.navigateTo({
  url: `/pages/profile/timeline?id=${id.value || 'demo-profile-0824'}`,
});

const goRecord = () => uni.navigateTo({
  url: `/pages/record/create?profileId=${id.value || 'demo-profile-0824'}`,
});

/**
 * 编辑档案（2026-10-09 实装）：原先只弹一句「编辑档案（阶段3）」toast，点了没反应。
 * 只有建档人本人能改（后端 PATCH 有归属校验）；演示档案 / 别人的档案给出明确提示。
 */
const onEdit = () => {
  if (!id.value) {
    uni.showToast({ title: '演示档案不可编辑', icon: 'none' });
    return;
  }
  if (!mine.value) {
    uni.showToast({ title: '只能编辑自己建的档案', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/profile/edit?id=${id.value}` });
};

/* ============ 出没点位 → 地图页并聚焦（2026-10-10 用户指定） ============
   「点击这些地点的时候可以跳转地图页这个猫所在位置」。
   ⚠️ 地图页 pages/map/nearby 是 tabBar 页，`uni.switchTab` **不支持 query 参数**
      → 目标数据走一次性 storage 中转（键 paw_map_focus，地图页 onShow 读取后立即清除）。
      传的不是一个 id，而是一份「展示所需真值」（名字 / 点位 / 头像 / 记录数 / 坐标）：
      地图页据此把这只猫并入列表并选中 —— 即使它不在 /profiles/nearby 的半径结果里
      （没授权定位、或距离超 5km）也能聚焦，且全程零新请求。
   传参口径：坐标 = 该点位最近一条记录的坐标；老记录没存坐标时回落档案 lastSeen 坐标（load 里已算好）。 */
const MAP_FOCUS_KEY = 'paw_map_focus';

function onSpot(s?: any) {
  if (s && s.none) {
    uni.showToast({ title: '这只猫还没有点位记录', icon: 'none' });
    return;
  }
  const lat = typeof s?.lat === 'number' ? s.lat : null;
  const lng = typeof s?.lng === 'number' ? s.lng : null;

  if (id.value && lat !== null && lng !== null) {
    uni.setStorageSync(MAP_FOCUS_KEY, {
      profileId: id.value,
      name: p.value.name,
      desc: s?.name || '',
      avatarUrl: p.value.avatarRaw || '',
      animalType: p.value.animalType || 'CAT',
      lastSeenAt: p.value.lastSeenAt || null,
      records: p.value.stats?.[1]?.n ?? 0,
      lat,
      lng,
      ts: Date.now(),
    });
  } else {
    // 演示档案 / 老记录没存坐标：照样给出口（到地图看附近真实点位），但不谎称「定位到了它」
    uni.showToast({
      title: id.value ? '这个点位还没有定位，先看看附近' : '演示档案没有真实定位，已打开附近点位',
      icon: 'none',
      duration: 2200,
    });
  }
  uni.switchTab({ url: '/pages/map/nearby' });
}

/* ============ 分享档案卡（2026-10-08 晚，替换原「生成壁纸」） ============
   原按钮只弹一句 toast，对观测手账没有任何真实出口 → 改成「把这只猫带出去」：
   导出成一张卡片图（存下来 / 发给邻居），或者把档案文案复制到群里。
   数据全部取自本页已有的 p：带 ?id= 时是真值，演示态（无 id / 离线）用 DEMO 帧，
   两态都能出卡。浮层里 canvas 导出的图就是预览图，所见即所得。 */
const shareOn = ref(false);

const shareData = computed<ShareCardData>(() => {
  const v = p.value;
  // 外貌项（「毛色 三花」）拆成键值对；没有空格的（「左耳剪耳」）归到「特征」
  const rows: { k: string; v: string }[] = (v.attrs || []).map((a: string) => {
    const i = a.indexOf(' ');
    return i > 0 ? { k: a.slice(0, i), v: a.slice(i + 1) } : { k: '特征', v: a };
  });
  // 主点位去掉「· 主点位」后缀：卡片上「出没点位」已经是键，值不必再带一遍
  const spot = String(v.spots?.[0]?.text || '').replace(' · 主点位', '');
  if (spot) rows.push({ k: '出没点位', v: spot });

  // 状态胶囊 = 绝育 + 健康（去重，避免同一句出现两次）
  const pills = Array.from(new Set([v.neuteredTag, v.rings?.[1]?.text].filter(Boolean) as string[]));

  return {
    name: v.name,
    idText: v.idText,
    avatarUrl: v.avatarUrl,
    pills,
    rows: rows.slice(0, 4),
    slogan: '在 PawTrace 爪迹，记录它的生命痕迹',
    dateText: `生成于 ${ymd(new Date())}`,
  };
});

const onShareCard = () => {
  shareOn.value = true;
};
</script>

<style scoped>
/* 页面底色 = 米底令牌；本页非 Tab 页，底部只留常规余量 */
.s4 {
  min-height: 100vh;
  background: #f0ebdf;
  padding-bottom: 60rpx;
  box-sizing: border-box;
}

/* ============ 自绘导航 ============
   已抽成共享组件 components/paw-navbar（返回 / 箭头 / 标题的统一真值都在那里）。
   本页原先是手抄的一份 CSS，把「返回」写成 28rpx（真值 30rpx）、箭头写成
   14rpx 旋转方块（真值 3.04×6.42pt 细尖角）、padding-top 写成 136rpx（真值 133.3rpx）
   —— 就是这三处让本页导航整体比别的页小一圈。改组件后不再保留本页副本。 */

/* ============ 档案卡 ============
   ⚠️ 高度修正（2026-09-23）：旧注释「实测 125.45pt」是**在固定 x 列采填充色**量的，
   圆角弧线在卡片最上/最下若干行不覆盖该列 → 每张卡被系统性少算约 2.3pt。
   改用「整窗墨迹带」重测：设计稿 122.07–249.55 = 127.48pt → 254.96rpx。
   */
.idcard {
  position: relative;
  height: 255rpx;
  /* 24.7 → 23.3rpx：实测卡顶 122.75pt 比设计 122.07pt 低 0.68pt，收回 1.36rpx */
  margin-top: 23.3rpx;
  padding: 0;
  overflow: hidden;
}
/* 头像框：200rpx 方、淡紫底、圆角 32rpx，左 28 / 上 26（实测 34.15,135.93 相对卡面） */
.avatar {
  position: absolute;
  left: 28rpx;
  top: 26rpx;
  width: 200rpx;
  height: 200rpx;
  background: #e6e7eb;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.avatar-img {
  width: 100%;
  height: 100%;
}
.avatar-txt {
  /* 实测 6 簇步进 13.98pt → 28rpx，色 (109,113,121) */
  font-size: 28rpx;
  color: #757980;
  line-height: 1.15;
  white-space: nowrap;
}
/* 名称：40rpx 粗体墨色，左 258 / 上 60（实测墨迹顶 152.84） */
.name {
  position: absolute;
  left: 258rpx;
  top: 60rpx;
  font-size: 40rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1.05;
  white-space: nowrap;
}
/* 档案ID：22rpx 图标灰（实测墨迹顶 182.6 → 卡内 119rpx） */
.idline {
  position: absolute;
  left: 258rpx;
  top: 119rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
  white-space: nowrap;
}
/* 状态胶囊行：44rpx 高，左 256 / 上 154（实测 148.11,199.84） */
.idpills {
  position: absolute;
  left: 256rpx;
  top: 154rpx;
  display: flex;
}
.pill {
  height: 44rpx;
  padding: 0 20rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  font-size: 20rpx;
  line-height: 1;
  white-space: nowrap;
}
/* 苔绿底白字（实测 x148.11–227.9） */
.pill--green {
  background: #8fa08b;
  color: #faf7f1;
}
/* 米黄底（#ECE3C7）暗芥末字（实测 x233.3–284.04） */
.pill--cream {
  margin-left: 11rpx;
  background: #ece3c7;
  color: #928461;
}
/* 「+ 关注」胶囊（2026-10-07）：纸白底 + 发丝描边 + 深绿字，与「次点位」胶囊同一套语言 */
.pill--follow {
  background: #faf7f1;
  border: 1rpx solid #cfd8c8;
  color: #56674e;
}
/* 可点击的绿胶囊给一点按压反馈 */
.pill--tap:active {
  opacity: 0.82;
}

/* ============ 统计三卡（设计稿整带高 61.54pt = 123.08rpx） ============ */
.stats {
  /* 33 → 27.6rpx：卡间隙设计 14.54pt，原 33rpx 排出 17.25pt */
  margin-top: 27.6rpx;
  display: flex;
  gap: 25rpx;
}
.stat {
  flex: 1;
  height: 123rpx;
  background: #faf7f1;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
/* 数字：38rpx 深绿（实测墨迹顶距卡顶 16.57pt） */
.stat-num {
  margin-top: 26rpx;
  font-size: 38rpx;
  font-weight: 700;
  color: #56674e;
  line-height: 44rpx;
}
.stat-label {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #8b8779;
  line-height: 24rpx;
}

/* ============ 外貌与状态卡（设计稿整带高 131.87pt = 263.74rpx） ============ */
.lookcard {
  position: relative;
  height: 264rpx;
  /* 33 → 27.6rpx：卡间隙设计 14.21pt */
  margin-top: 27.6rpx;
  padding: 0 27rpx;
  overflow: hidden;
}
/* 标题：28rpx（步进 14.03pt），墨迹顶距卡顶 14.88pt；行高 28rpx 贴墨迹，
   保证下方胶囊顶部落在实测 378.72pt */
.lk-title {
  display: block;
  padding-top: 30rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 28rpx;
}
/* 三胶囊：56rpx 高、米底（页面同色）、墨绿灰字 22rpx（实测步进 10.82–11.16pt），间隙 16rpx */
.lk-pills {
  display: flex;
  gap: 15rpx;
  margin-top: 20rpx;
}
.lk-pill {
  height: 56rpx;
  padding: 0 25rpx;
  border-radius: 28rpx;
  background: #f0ebdf;
  color: #6e6f58;
  font-size: 22rpx;
  line-height: 1;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
/* 双圆环徽章：外径 104rpx、壁 5rpx，左 28 / 上 148（实测环区 414.9–466.3） */
.lk-rings {
  position: absolute;
  left: 27rpx;
  top: 148rpx;
  display: flex;
}
.ring {
  width: 104rpx;
  height: 104rpx;
  box-sizing: border-box;
  border: 5rpx solid #8fa08b;
  border-radius: 50%;
  background: #faf7f1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ring + .ring {
  margin-left: 16rpx;
}
.ring-txt {
  font-size: 20rpx;
  color: #56674e;
  line-height: 1;
  white-space: nowrap;
}
.ring--orange {
  border-color: #c68b6f;
}
.ring--orange .ring-txt {
  color: #c68b6f;
}
/* 初遇行：20rpx 灰，右对齐卡内边距（实测右端 340.5 = 卡右 -13.5pt） */
.firstmeet {
  position: absolute;
  right: 27rpx;
  top: 151rpx;
  font-size: 20rpx;
  color: #a29e8f;
  line-height: 1;
  white-space: nowrap;
}

/* ============ 出没点位卡（设计稿整带高 83.86pt = 167.72rpx） ============ */
.spotcard {
  height: 168rpx;
  /* 33 → 28.3rpx：卡间隙设计 14.20pt */
  margin-top: 28.3rpx;
  padding: 0 25rpx;
  overflow: hidden;
}
/* 标题 26rpx（步进 12.74pt，与外貌卡 28rpx 不同——两处独立实测）；
   行高 26rpx 贴墨迹，保证下方胶囊顶部落在实测 521.75pt */
.sp-title {
  display: block;
  padding-top: 24rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 26rpx;
}
.sp-pills {
  display: flex;
  gap: 17rpx;
  margin-top: 20rpx;
}
.sp-pill {
  height: 52rpx;
  box-sizing: border-box;
  padding: 0 20rpx;
  border-radius: 26rpx;
  font-size: 22rpx;
  line-height: 1;
  display: flex;
  align-items: center;
  white-space: nowrap;
}
/* 主点位：米底 + 深绿字 */
.sp-pill--main {
  background: #f0ebdf;
  color: #56674e;
}
/* 次点位：纸白底 + 发丝描边（设计稿实测仅 ~1px 细线）+ 墨绿灰字 */
.sp-pill--sub {
  background: #faf7f1;
  border: 1rpx solid #e4dfd0;
  color: #6e6f58;
}
/* 可点（跳地图页聚焦）→ 按压反馈；占位胶囊（还没有点位记录）不给反馈 */
.sp-pill--main:active,
.sp-pill--sub:active {
  opacity: 0.82;
}
/* 还没有点位记录时占位（不冒充设计稿演示点位） */
.sp-pill--none {
  background: #f4f1e8;
  color: #a29e8f;
  border: 1rpx solid #e4dfd0;
}

/* ============ 底部三按钮（设计稿整带高 55.79pt = 111.58rpx；218 / 218 / 192rpx 宽） ============ */
.acts {
  /* 31 → 28.3rpx：卡间隙设计 14.20pt */
  margin-top: 28.3rpx;
  display: flex;
}
.act {
  height: 112rpx;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.act:active {
  opacity: 0.86;
}
.act--dark {
  width: 218rpx;
  background: #55684f;
}
.act--green {
  width: 218rpx;
  margin-left: 22rpx;
  background: #8fa08b;
}
/* 生成壁纸：白底圆角更大（实测 R≈19pt → 38rpx）、深绿字 24rpx 单行 */
.act--paper {
  width: 192rpx;
  margin-left: 20rpx;
  border-radius: 38rpx;
  background: #faf7f1;
}
.act-main {
  font-size: 28rpx;
  font-weight: 600;
  color: #faf7f1;
  line-height: 34rpx;
}
/* 副标：白字 ~78% 透明度（实测 btn1 (204,216,198) / btn2 (227,233,222) 反推） */
.act-sub {
  margin-top: 4rpx;
  font-size: 18rpx;
  color: rgba(250, 247, 241, 0.78);
  line-height: 24rpx;
}
.act-paper-txt {
  font-size: 24rpx;
  font-weight: 600;
  color: #56674e;
  line-height: 30rpx;
}
</style>
