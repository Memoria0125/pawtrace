<template>
  <!--
    S5 时间轴（PRD F2.1）
    设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p7，逐像素实测（375×812 @2.957x）
    结构：自绘导航（返回 / 时间轴 / 导出）→ 头部（头像 + 标题 + 副行）
          → 筛选胶囊（全部12 / 投喂6 / 健康3 / 季节2）
          → 季节分节（夏=芥末 / 秋=陶橙 短划线主题色）→ 记录卡三张（照片 + 类型彩色胶囊 + 标题/meta/正文）
          → 底部悬浮「＋ 记录」墨绿药丸
    刻意处理（非漏做）：
      1. 导航栏自绘（navigationStyle: custom），同 S3/S4 手法；
      2. 记录卡有 1px #E2DCCA 描边（本页设计稿与 S4 不同，S4 卡片是平的、本页带细描边）；
      3. 后端未启动时用设计稿同款演示数据撑版面（DEMO_FALLBACK），阶段 3 联调后关闭。
  -->
  <view class="paw-page s5">
    <!-- ============ 自绘导航（paw-navbar 共享组件） ============
         p7 实测：标题「时间轴」墨迹 158.59~227.57pt，中心 193.08pt（与 p6 同）
         L=200、R=177.7 → 中心 386.16rpx = 193.08pt ✓；右块 rightPad=0（导出墨迹右端 353.70pt） -->
    <paw-navbar
      title="时间轴"
      :left-w="200"
      :right-w="177.7"
      :right-pad="0"
      :back-url="id ? '/pages/profile/detail?id=' + id : '/pages/home/index'"
      :back-tab="!id"
    >
      <template #right>
        <text class="paw-nav-act paw-nav-act--md" @tap="onExport">导出</text>
      </template>
    </paw-navbar>

    <!-- ============ 头部：头像 + 标题 + 副行 ============ -->
    <view class="head">
      <view class="avatar">
        <image v-if="p.avatarUrl" class="avatar-img" :src="p.avatarUrl" mode="aspectFill" />
        <text v-else class="avatar-txt">{{ p.photoLabel }}</text>
      </view>
      <view class="head-info">
        <text class="head-title">{{ p.title }}</text>
        <text class="head-sub">{{ p.sub }}</text>
      </view>
    </view>

    <!-- ============ 筛选胶囊 ============ -->
    <view class="chips">
      <text
        v-for="f in filters" :key="f.value"
        class="chip" :class="{ on: active === f.value }"
        @tap="active = f.value"
      >{{ f.label }}{{ f.count }}</text>
    </view>

    <!-- ============ 季节分节 + 记录卡 ============ -->
    <view v-for="sec in sections" :key="sec.key" class="sec">
      <view class="sec-head" :class="'sec-head--' + sec.theme">
        <view class="sec-dash"></view>
        <text class="sec-title">{{ sec.title }}</text>
      </view>
      <view
        v-for="r in sec.items" :key="r.id"
        class="tl-card" hover-class="tl-card--hover" hover-stay-time="60"
        @tap="openDetail(r)"
      >
        <!-- 照片占位：112rpx 方、R20rpx、淡紫底 -->
        <view class="photo">
          <image v-if="r.photoUrl" class="photo-img" :src="r.photoUrl" mode="aspectFill" />
          <text v-else class="photo-txt">{{ r.photoLabel }}</text>
        </view>
        <view class="col">
          <view class="row1">
            <!-- 多类型标签（2026-10-10 胶囊多选）：主类型 + 附加标签依次排开 -->
            <template v-if="r.pills && r.pills.length">
              <text
                v-for="(p, pi) in r.pills" :key="pi"
                class="pill" :class="'pill--' + p.cls"
              >{{ p.t }}</text>
            </template>
            <text v-else class="pill" :class="'pill--' + r.pillClass">{{ r.pill }}</text>
            <text class="card-title">{{ r.title }}</text>
          </view>
          <text class="meta">{{ r.meta }}</text>
          <text class="body">{{ r.body }}</text>
        </view>
      </view>
    </view>

    <view class="empty-tip" v-if="!sections.length">它还在等你写下第一条痕迹</view>

    <!-- ============ 打卡记录详情浮层（2026-10-10 晚） ============
         卡片正文按设计稿只显示一行（nowrap + 省略号）→ 点卡片看全文。
         数据全部来自已渲染的列表项（timeline 接口本就返回 content 全文与 photos），
         打开详情不产生新请求；浮层 `v-if` 控制 → 关闭时零 DOM，兜底帧像素基线不受影响。 -->
    <paw-record-detail
      :show="!!detail"
      :pills="detailPills"
      :title="detailTitle"
      :meta="detailMeta"
      :body="detailBody"
      :photo-url="detailPhoto"
      :extras="detailExtras"
      @close="detail = null"
    />

    <!-- ============ 底部悬浮按钮 ============ -->
    <view class="paw-fab-wrap">
      <view class="fab" @tap="goCreate"><text class="fab-txt">＋ 记录</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { assetUrl } from '../../common/uploader';
// 显式引入（easycom 也能扫到，但新增组件目录时不依赖编译器的重新扫描）
import PawRecordDetail from '../../components/paw-record-detail/paw-record-detail.vue';

/** 演示数据兜底：后端未启动 / 空数据时，用设计稿 p7 同款内容撑版面 */
const DEMO_FALLBACK = true;

const id = ref('');
const active = ref('ALL');
const records = ref<any[]>([]);

/** 页面头部（演示态文案与设计稿一致；带 id 进来时由档案接口下发的真值覆盖） */
const p = ref<any>({
  avatarUrl: '',
  photoLabel: '三花猫小图',
  title: '三花·0824 的生命痕迹',
  sub: '初次相遇 2026-07-08 · 已记录 12 条 · 跨越夏秋两季',
});

/** 筛选计数（演示态 = 设计稿的 12/6/3/2；真实数据由记录真值重算） */
const DEMO_FILTERS = [
  { label: '全部', value: 'ALL', count: 12 },
  { label: '投喂', value: 'FEEDING', count: 6 },
  { label: '健康', value: 'HEALTH', count: 3 },
  { label: '季节', value: 'SEASON', count: 2 },
];
const filters = ref([...DEMO_FILTERS]);

const DEMO: any[] = [
  {
    id: 'd1', type: 'FIRST', pill: '初次相遇', pillClass: 'terra',
    seasonKey: '2026S', theme: 'summer', seasonTitle: '2026 夏·初次相遇',
    title: '建档·花坛边第一次见到它',
    meta: '2026-07-08 08:12 · 楼下花坛',
    body: '瘦瘦的三花，尾巴卷成问号，在花坛边晒太阳。',
    photoUrl: '', photoLabel: '三花猫照片',
  },
  {
    id: 'd2', type: 'FEEDING', pill: '投喂', pillClass: 'mustard',
    seasonKey: '2026A', theme: 'autumn', seasonTitle: '2026 秋·常来常往',
    title: '傍晚加餐·猫粮＋水',
    meta: '今天 18:32 · 楼下花坛',
    body: '吃得很香，主动蹭了蹭我的鞋。',
    photoUrl: '', photoLabel: '猫粮投喂',
  },
  {
    id: 'd3', type: 'HEALTH', pill: '健康', pillClass: 'olive',
    seasonKey: '2026A', theme: 'autumn', seasonTitle: '2026 秋·常来常往',
    title: '耳朵旧伤结痂，精神不错',
    meta: '昨天 09:14 · 车棚',
    body: '左耳伤口已结痂，恢复良好。',
    photoUrl: '', photoLabel: '三花猫耳朵',
  },
];

/** 按季节分节（保持记录顺序，同季归并） */
const sections = computed(() => {
  const groups: { key: string; theme: string; title: string; items: any[] }[] = [];
  for (const r of records.value) {
    const g = groups.find((x) => x.key === r.seasonKey);
    if (g) g.items.push(r);
    else groups.push({ key: r.seasonKey, theme: r.theme, title: r.seasonTitle, items: [r] });
  }
  return groups;
});

onLoad(async (q) => {
  id.value = q?.id || '';
  await load();
});

watch(active, load);

async function load() {
  try {
    // 并行拉「记录 + 档案本体」：此前只拉记录，头部三行（名字/初遇/条数）永远是
    // 设计稿演示值「三花·0824」——用户实测：从年糕的档案点进来，标题仍写三花。
    const [all, prof] = await Promise.all([
      api.get<any[]>(`/profiles/${id.value}/timeline`),
      api.get<any>(`/profiles/${id.value}`, undefined, { silent: true }).catch(() => null),
    ]);
    const src: any[] = Array.isArray(all) ? all : [];
    if (prof && prof.id) applyHead(prof, src);
    // 真实数据（含「空」）一律按真值渲染；只有请求本身失败才回落演示数据撑版面
    // —— 空时间轴走页面的 empty-tip「它还在等你写下第一条痕迹」，不能拿别人（三花）的记录充数
    // 筛选含附加类型（多选胶囊落库的一条记录可同时命中「投喂」「点位」等多个筛选）
    records.value = (active.value === 'ALL' ? src : src.filter((r) => isType(r, active.value))).map(decorate);
  } catch {
    records.value = DEMO_FALLBACK ? demoFiltered() : [];
  }
}

/** 档案真值 → 头部三行 + 筛选计数（名字 / 初遇日期 / 已记录条数 / 跨越季节数） */
function applyHead(prof: any, src: any[]) {
  const name: string = prof.name || '未命名';
  const d = prof.firstSeenAt ? new Date(prof.firstSeenAt) : null;
  const firstSeen = d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : '';
  const seasons = new Set(src.map((r) => seasonOf(r.occurredAt))).size;
  p.value = {
    avatarUrl: assetUrl(prof.avatarPhoto?.url),
    photoLabel: name.slice(0, 4),
    title: `${name} 的生命痕迹`,
    sub: [
      firstSeen ? `初次相遇 ${firstSeen}` : '',
      `已记录 ${prof._count?.records ?? src.length} 条`,
      seasons > 1 ? `跨越 ${seasons} 个季节` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  };
  // 筛选胶囊只保留真有记录的类型（演示态固定 4 枚，保持设计稿像素）
  const ORDER: [string, string][] = [
    ['投喂', 'FEEDING'],
    ['健康', 'HEALTH'],
    ['季节', 'SEASON'],
    ['外貌', 'APPEARANCE'],
    ['点位', 'LOCATION'],
  ];
  filters.value = [
    { label: '全部', value: 'ALL', count: src.length },
    ...ORDER.filter(([, v]) => src.some((r) => isType(r, v))).map(([label, value]) => ({
      label,
      value,
      count: src.filter((r) => isType(r, value)).length,
    })),
  ];
}

/** 演示数据也响应筛选，保证交互可自测 */
function demoFiltered() {
  return active.value === 'ALL' ? DEMO : DEMO.filter((r) => r.type === active.value);
}

/** 月份 → 季节（头部「跨越 N 个季节」与季节分节共用同一口径） */
function seasonOf(iso?: string): string {
  const m = iso ? new Date(iso).getMonth() + 1 : new Date().getMonth() + 1;
  return m >= 3 && m <= 5 ? '春' : m >= 6 && m <= 8 ? '夏' : m >= 9 && m <= 11 ? '秋' : '冬';
}

/** 该记录是否属于某类型（主类型或附加标签 —— 多选胶囊落库后一条记录可属多类）
 *  ⚠️ 后端 subTypes 是逗号串（"LOCATION" / "LOCATION,APPEARANCE"），前端草稿队列里可能是数组，
 *     两种形态都要认（曾只判 Array.isArray → 筛选计数漏掉附加类型） */
function isType(r: any, v: string) {
  if (r.type === v) return true;
  const s = r.subTypes;
  if (Array.isArray(s)) return s.includes(v);
  return String(s || '').split(',').includes(v);
}

/** API 记录 → 展示字段（类型胶囊文案 / 颜色 / 季节归组） */
function decorate(r: any) {
  const t = r.type as string;
  const pillMap: Record<string, [string, string]> = {
    FIRST: ['初次相遇', 'terra'],
    FEEDING: ['投喂', 'mustard'],
    HEALTH: ['健康', 'olive'],
    SEASON: ['季节', 'olive'],
    APPEARANCE: ['外貌', 'olive'],
    LOCATION: ['点位', 'olive'],
  };
  const [pill, pillClass] = pillMap[t] || ['记录', 'olive'];
  // 多类型标签（2026-10-10）：主类型 + 附加标签（subTypes 逗号串）逐个成胶囊
  const pills = [{ t: pill, cls: pillClass }];
  for (const st of String(r.subTypes || '').split(',').filter(Boolean)) {
    const m = pillMap[st];
    if (m) pills.push({ t: m[0], cls: m[1] });
  }
  const d = r.occurredAt ? new Date(r.occurredAt) : new Date();
  const season = seasonOf(r.occurredAt);
  const theme = season === '夏' ? 'summer' : season === '秋' ? 'autumn' : season === '春' ? 'spring' : 'winter';
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return {
    ...r,
    pill, pillClass,
    pills,
    seasonKey: `${d.getFullYear()}${season}`,
    theme,
    seasonTitle: `${d.getFullYear()} ${season}`,
    title: r.title || typeText(t),
    meta: `${(r.occurredAt || '').slice(0, 10)} ${hm} · ${r.locDesc || r.locationName || ''}`,
    body: r.content || '',
    // 照片 url 存的是相对路径，必须经 assetUrl 拼 origin（否则 H5 下按 :5173 解析 → 裂图）
    photoUrl: assetUrl(r.photos?.[0]?.url),
    photoLabel: '猫咪照片',
  };
}

const typeText = (t: string) =>
  ({ APPEARANCE: '外貌变化', LOCATION: '点位更新', HEALTH: '健康状态', FEEDING: '投喂', SEASON: '季节变化', FIRST: '初次相遇' })[t] || '新的记录';

/**
 * 返回由 <paw-navbar> 内部处理（common/nav 的 goBack）。
 * 兜底目标 = 本页唯一入口「个体档案详情」，带 id 可原地重建上一级；无 id 则回首页 Tab。
 */
const onExport = () => uni.showToast({ title: '导出时间轴（阶段3）', icon: 'none' });

// ---------------- 打卡记录详情（2026-10-10 晚） ----------------
// 列表卡正文按设计稿只显示一行，用户点卡片看全文。真实记录与演示数据（DEMO_FALLBACK）
// 字段形态不同，这里统一取一次，模板只读 computed。
const detail = ref<any>(null);
const openDetail = (r: any) => { detail.value = r; };

/** 胶囊：真实记录用 decorate 出的 pills，演示数据回落单枚 pill */
const detailPills = computed(() => {
  const r = detail.value;
  if (!r) return [];
  return r.pills?.length ? r.pills : [{ t: r.pill, cls: r.pillClass }];
});
const detailTitle = computed(() => detail.value?.title || '');
const detailMeta = computed(() => detail.value?.meta || '');
const detailBody = computed(() => detail.value?.body || '');
const detailPhoto = computed(() => detail.value?.photoUrl || '');
const detailExtras = computed(() => {
  const r = detail.value;
  if (!r) return [];
  const out: { k: string; v: string }[] = [];
  if (r.seasonTitle) out.push({ k: '所属季节', v: r.seasonTitle });
  // 定位：卡片 meta 行只放得下点位名，完整口径（街区级模糊坐标）在详情里说清楚
  if (r.lat != null && r.lng != null) {
    out.push({ k: '定位精度', v: `街区级模糊 · ${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)}` });
  } else {
    out.push({ k: '定位精度', v: '无坐标（仅文字点位）' });
  }
  if (r.locDesc) out.push({ k: '点位', v: r.locDesc });
  if (r.photoUrl) out.push({ k: '照片', v: '1 张' });
  return out;
});

const goCreate = () => uni.navigateTo({
  url: `/pages/record/create?profileId=${id.value || 'demo-profile-0824'}`,
});
</script>

<style scoped>
/* 页面底色 = 米底令牌；本页非 Tab 页 */
.s5 {
  min-height: 100vh;
  background: #f0ebdf;
  padding-bottom: 200rpx;
  box-sizing: border-box;
}

/* ============ 自绘导航 ============
   已抽成共享组件 components/paw-navbar。「返回」真值是 30rpx（本页原先手抄成 32rpx）、
   箭头真值是 3.04×6.42pt 细尖角（本页原先用 10rpx 旋转方块）、padding-top 真值 133.3rpx。 */

/* ============ 头部：头像 80rpx + 标题 30rpx + 副行 22rpx（实测 127.82pt 起） ============ */
.head {
  display: flex;
  align-items: flex-start;
  /* 34 → 34.7rpx：导航 padding-top 由 134 收到真值 133.3rpx（−0.7rpx），补回同样的量 */
  margin-top: 34.7rpx;
}
.avatar {
  width: 82rpx;
  height: 82rpx;
  border-radius: 24rpx;
  background: #e6e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.avatar-img { width: 100%; height: 100%; }
.avatar-txt {
  font-size: 18rpx;
  color: #73767e;
  line-height: 1.2;
  text-align: center;
}
.head-info {
  margin-left: 32rpx;
  min-width: 0;
}
.head-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 42rpx;
  margin-top: 6rpx;
  white-space: nowrap;
}
.head-sub {
  display: block;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 30rpx;
  margin-top: 4rpx;
  white-space: nowrap;
}

/* ============ 筛选胶囊（实测 y181.92-213.37pt → 高 63rpx，间隙 15rpx） ============ */
.chips {
  display: flex;
  margin-top: 26rpx;
}
.chip {
  height: 63rpx;
  padding: 0 30rpx;
  margin-right: 15rpx;
  border-radius: 999rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  font-size: 24rpx;
  line-height: 1;
  color: #6e6f58;
  background: #faf7f1;
  border: 1px solid #e2dcca;
}
.chip.on {
  color: #ffffff;
  background: #55684f;
  border: 1px solid #55684f;
}

/* ============ 季节分节（夏=芥末 / 秋=陶橙，短划线 52×4rpx + 24rpx 标题） ============ */
.sec {
  margin-top: 13rpx;
}
.sec-head {
  display: flex;
  align-items: center;
  margin-bottom: 14rpx;
}
.sec-dash {
  width: 52rpx;
  height: 4rpx;
  border-radius: 2rpx;
  flex-shrink: 0;
}
.sec-title {
  margin-left: 15rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  font-weight: 600;
}
.sec-head--summer .sec-dash { background: #d9c488; }
.sec-head--summer .sec-title { color: #6e5d37; }
.sec-head--autumn .sec-dash { background: #c58a6e; }
.sec-head--autumn .sec-title { color: #a2644a; }
.sec-head--spring .sec-dash { background: #8fa08b; }
.sec-head--spring .sec-title { color: #56674e; }
.sec-head--winter .sec-dash { background: #8b8779; }
.sec-head--winter .sec-title { color: #5c5e52; }

/* ============ 记录卡（纸白 + 1px #E2DCCA 描边，R32rpx；含描边总高实测 91.6pt） ============ */
.tl-card {
  position: relative;
  height: 183rpx;
  box-sizing: border-box;
  background: #faf7f1;
  border: 1px solid #e2dcca;
  border-radius: 32rpx;
}
.tl-card + .tl-card { margin-top: 3rpx; }
/* 按下反馈（2026-10-10 晚：卡片可点开记录详情）。仅按压期间生效 → 静态像素不变 */
.tl-card--hover { background: #f6f2e7; }

/* 照片：112rpx 方、R20rpx，距卡左 18rpx / 距卡顶 32rpx（实测 10.15/16.91pt） */
.photo {
  position: absolute;
  left: 18rpx;
  top: 32rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 20rpx;
  background: #e6e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.photo-img { width: 100%; height: 100%; }
.photo-txt {
  font-size: 20rpx;
  color: #73767e;
  line-height: 1;
  white-space: nowrap;
}

/* 文字列：左缘距卡 150rpx（实测 x96.03pt）；行1（胶囊+标题）中心距卡顶 58rpx */
.col {
  margin-left: 150rpx;
  padding-top: 38rpx;
}
.row1 {
  display: flex;
  align-items: center;
}
.pill {
  height: 38rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 38rpx;
  flex-shrink: 0;
}
.pill--terra { background: #c58a6e; color: #ffffff; }
.pill--mustard { background: #d9c488; color: #5c4e2e; }
.pill--olive { background: #8f9f8a; color: #ffffff; }
/* 多类型标签依次排开的间隔（2026-10-10） */
.pill + .pill { margin-left: 8rpx; }
.card-title {
  margin-left: 14rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 38rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* meta 中心距卡顶 89rpx / 正文中心距卡顶 131rpx（实测） */
.meta {
  display: block;
  font-size: 20rpx;
  color: #a29e8f;
  line-height: 24rpx;
  white-space: nowrap;
}
.body {
  display: block;
  font-size: 22rpx;
  color: #6e6f58;
  line-height: 30rpx;
  margin-top: 15rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-tip {
  text-align: center;
  color: #8b8779;
  font-size: 24rpx;
  padding: 80rpx 0;
}

/* ============ 底部悬浮按钮（墨绿药丸 181×104rpx，右 40 / 底 61） ============
   定位刻意拆成两层，与 .paw-cta-wrap / .paw-tabbar 同一套路：
   · 外层 .paw-fab-wrap = 铺满视口宽度的 fixed 浮层（零高，不遮内容、不吃手势），
     App.vue 的「桌面手机框」媒体查询按此名把它收窄居中成 375px；
   · 内层 .fab 用 absolute 贴在这层右下角。
   ⚠️ 不要把 fixed 直接写在 .fab 上：桌面浏览器里它的 right 会以「整个窗口」为基准，
      药丸会飞出手机框跑到窗口右下角（2026-09-15 用户报障）。
   ============================================================================ */
.paw-fab-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 61rpx;
  height: 0;
  z-index: 20;
}
.fab {
  position: absolute;
  right: 40rpx;
  bottom: 0;
  width: 181rpx;
  height: 104rpx;
  border-radius: 999rpx;
  background: #55684f;
  /* 设计稿实测：柔而淡的投影（下方延伸 ~15pt、上方 ~4pt，紧贴下沿 α≈0.23） */
  box-shadow: 0 11rpx 38rpx rgba(60, 64, 54, 0.24);
  display: flex;
  align-items: center;
  justify-content: center;
}
.fab:active { opacity: 0.88; }
.fab-txt {
  font-size: 32rpx;
  color: #ffffff;
  line-height: 1;
}
</style>
