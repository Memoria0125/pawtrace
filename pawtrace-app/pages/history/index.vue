<template>
  <!--
    S6 观察史（PRD F1.4）
    设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p8，逐像素实测（375×812 @2.957x）
    结构：标题行（观察史 + Life List 副题）→ 三宫格统计 → 筛选行（全部 + 猫名搜索框）→ 观察记录卡 ×N → 自绘 TabBar
    实测值（pt → rpx = pt×2，均在元素垂直/水平中心线上扫，避开圆肩内缩假象）：
      标题 24pt/48rpx #3C4036（ink 顶 78.45pt） · 副题 12pt/24rpx #8B8779（右对齐 354pt）
      统计卡 全宽三等分（实测 102.46pt 宽 / 间距 12.5pt）高 65.27pt/130rpx R16pt/32rpx
             数字 21pt/42rpx #56674E · 标签 10pt/20rpx #8B8779
      胶囊 高 31.8pt/64rpx 全圆，宽 52pt/104rpx（padding 0 28rpx）、间距 8pt/16rpx，一屏只 3 个靠左
      记录卡 全宽×83.2pt/167rpx R32rpx，卡间距 11pt/22rpx，照片 56pt/112rpx 见方 R10pt/20rpx #E6E7EB
              卡内左内边距 12pt/24rpx；三行 26rpx #3C4036 / 22rpx #6E6F58 / 20rpx #A29E8F
    ⚠️ 本页卡片与「无选态胶囊」带 ~1pt 描边 #E2DCCA（首页 p3 的卡没有，设计稿自身不一致，勿合并 token）
    刻意处理（非漏做）：
      1. 本页是 Tab 页 → 用「默认导航栏」而非自绘（同 S1）：H5 下有一块 44px 透明 uni-page-head，
         正好占掉设计稿状态栏（9:41）的位置，故不再自绘状态栏；
      2. 记录卡标题「名 · 编号 · 类型」中的「编号」（设计稿 0824/0612/0415）后端暂无对应字段
         （profile 只有 id/name）→ 真实数据下自动省略该段；演示数据保留以对齐设计稿；
      3. 筛选胶囊设计稿只出现「全部 + 2 个个体」；
      4. 后端未启动 / 空数据时用设计稿 p8 同款演示数据撑版面（DEMO_FALLBACK），阶段 3 联调后关闭。
    ── 2026-10-11 用户指定改造（「用户指定刻意偏离」登记项）─────────────────
      用户定案：筛选栏「只留『全部』按钮 + 同行猫名搜索框」。细则：
        a. **去掉「全部 + 前 2 个个体」的个体胶囊**（源码原为 `.slice(0, 2)` 防溢出）——
           个体筛选交给搜索框，观测对象再多也不会撑破这一行；
        b. **搜索框与「全部」同行**（右侧 flex:1 占满剩余宽度），**只搜猫名**（大小写不敏感的子串匹配）；
        c. **「全部」= 清空搜索词并显示全部记录**（无搜索词时呈选中态），语义即「回到不筛选」；
        d. **容器 class 保留 `chips`**：既有探针按 `.chips .chip` 定位「全部」，改名会连带打断
           `probe_record_detail`（S13 段先点「全部」再开抽屉）；`chip` 自身样式与选中态不变；
        e. 放大镜图标**纯 CSS 画**（小程序端不依赖 SVG / 字体图标，与 marker 图标同一取舍）。
    ── 2026-10-06 用户指定新增：记录按「月份」分节 ────────────────────────────
      设计稿 p8 无分节，按用户要求（参考 S5 时间轴的季节分节视觉）增加月份分节头，
      沿用 S5 的 sec-head 手法：52×4rpx 短划线 + 24rpx/600 标题，苔绿主题色。
    ── 2026-10-11 用户指定调整（第二次）：分节头由「条件出现」改为「总是显示」─────
      起因：用户报「观察史原来的时间分割不见了」——原规则「仅跨 ≥2 个自然月才出现」
      在数据退化为单月后隐藏（seed 记录时间为 `ago(N)` 相对今天生成，现全落 2026.10）。
      用户定案：**只要列表有记录就显示该月分节头**。细则（勿当遗漏）：
        a. 删除「≥2 月」条件判断（原 `showMonthHead`），有卡片即渲染分节头；
        b. 分节头仍只写月份（`2026.10`），不写「· N 条」等计数，避免引入设计稿没有的信息层级；
        c. ⚠️ 设计稿 p8 本身**无**此线 ⇒ 属「用户指定刻意偏离」；连带：DEMO 兜底帧
           （三条同属 2026.10）现在也会显示「2026.10」分节头，故 S6 两张像素验收图
           （设计vs实现 / 实现截图）与设计不再逐像素对齐 —— 原图保留作设计基线存档，
           偏差登记见《线框原型版本核对》相应章节。
  -->
  <view class="paw-page paw-page--tabbed s6">
    <!-- ============ 标题行 ============ -->
    <view class="head">
      <text class="head-title">观察史</text>
      <text class="head-sub">Life List · 我的观察足迹</text>
    </view>

    <!-- ============ 三宫格统计 ============ -->
    <view class="stats">
      <view class="stat" v-for="s in stats" :key="s.label">
        <text class="stat-num">{{ s.value }}</text>
        <text class="stat-label">{{ s.label }}</text>
      </view>
    </view>

    <!-- ============ 筛选行（2026-10-11 用户指定：只留「全部」+ 同行猫名搜索框） ============ -->
    <view class="chips">
      <text class="chip" :class="{ on: allOn }" @tap="clearSearch">全部</text>
      <view class="search">
        <view class="s-icon"></view>
        <input
          class="s-ipt"
          v-model="keyword"
          type="text"
          confirm-type="search"
          placeholder="搜索猫咪名"
          placeholder-class="s-ph"
        />
      </view>
    </view>

    <!-- ============ 观察记录卡（按月分节，2026-10-11 起：有记录即显示分节头） ============ -->
    <view class="rlist">
      <view class="rsec" v-for="sec in sections" :key="sec.key">
        <view class="rsec-head">
          <view class="rsec-dash"></view>
          <text class="rsec-title">{{ sec.title }}</text>
        </view>
        <view
          class="rcard" v-for="r in sec.items" :key="r.id"
          hover-class="rcard--hover" hover-stay-time="60"
          @tap="openDetail(r)"
        >
          <view class="photo">
            <image v-if="r.photoUrl" class="photo-img" :src="r.photoUrl" mode="aspectFill" />
            <text v-else class="photo-txt">{{ r.photoLabel }}</text>
          </view>
          <view class="rmain">
            <text class="rtitle">{{ r.title }}</text>
            <text class="rbody">{{ r.body }}</text>
            <text class="rtime">{{ r.time }}</text>
          </view>
        </view>
      </view>
    </view>


    <view class="empty-tip" v-if="!shown.length">{{ emptyTip }}</view>

    <!-- 打卡记录详情浮层（2026-10-10 晚）：卡片正文只显示一行 → 点开看全文。
         与 S5 时间轴 / S10-2 小区详情共用 components/paw-record-detail，禁另做一套。 -->
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

    <!-- 自绘 TabBar（原生条已隐藏，见 components/paw-tabbar） -->
    <paw-tabbar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { probePublic } from '../../common/auth';
import { assetUrl } from '../../common/uploader';
import PawTabbar from '../../components/paw-tabbar/paw-tabbar.vue';
import PawRecordDetail from '../../components/paw-record-detail/paw-record-detail.vue';

/** 演示数据兜底：后端未启动 / 空数据时，用设计稿 p8 同款内容撑版面 */
const DEMO_FALLBACK = true;

/** 记录类型 → 中文（标题行第三段；与 S5 时间轴的胶囊文案对齐） */
const TYPE_TEXT: Record<string, string> = {
  APPEARANCE: '外貌',
  LOCATION: '点位',
  HEALTH: '健康',
  FEEDING: '投喂',
  SEASON: '季节',
  FIRST: '相遇',
};

/** 类型 → 胶囊配色（与 S5 时间轴 pill--terra/mustard/olive 同一口径） */
const PILL_CLS: Record<string, string> = {
  FIRST: 'terra',
  FEEDING: 'mustard',
};

interface Row {
  id: string;
  name: string;
  title: string;
  body: string;
  time: string;
  photoUrl: string;
  photoLabel: string;
  /** 类型胶囊（2026-10-10 晚）：主类型 + 附加标签，详情浮层里用；颜色口径同 S5 时间轴 */
  pills: { t: string; cls: string }[];
  /** 详情附加行用：所属季节 / 街区级模糊坐标 / 点位名 */
  seasonText: string;
  /** 详情浮层的 meta（绝对时间 · 点位名）—— 列表里是「今天/昨天」相对时间 */
  detailMeta: string;
  lat?: number | null;
  lng?: number | null;
  locDesc?: string;
  /** 所属自然月（`2026.10`）；无有效时间 → '未知时间'。仅用于分节，不直接渲染 */
  monthKey: string;
  /** 排序用时间戳（无有效时间 → 0，排在最后） */
  ts: number;
}

/** 设计稿 p8 原始内容 */
const DEMO: Row[] = [
  {
    id: 'demo-s6-1', name: '三花',
    title: '三花 · 0824 · 投喂', body: '傍晚花坛 · 猫粮 + 水，吃得很香',
    time: '今天 18:32', photoUrl: '', photoLabel: '观察照片',
    pills: [{ t: '投喂', cls: 'mustard' }], seasonText: '2026 秋', locDesc: '楼下花坛',
    detailMeta: '2026-10-10 18:32 · 楼下花坛',
    monthKey: '2026.10', ts: 0,
  },
  {
    id: 'demo-s6-2', name: '橘猫',
    title: '橘猫 · 0612 · 健康', body: '左耳旧伤结痂，恢复良好',
    time: '昨天 09:14', photoUrl: '', photoLabel: '观察照片',
    pills: [{ t: '健康', cls: 'olive' }], seasonText: '2026 秋', locDesc: '车棚',
    detailMeta: '2026-10-09 09:14 · 车棚',
    monthKey: '2026.10', ts: 0,
  },
  {
    id: 'demo-s6-3', name: '小白',
    title: '小白 · 0415 · 季节', body: '换毛期记录 · 冬季掉毛明显',
    time: '昨天 17:02', photoUrl: '', photoLabel: '观察照片',
    pills: [{ t: '季节', cls: 'olive' }], seasonText: '2026 秋',
    detailMeta: '2026-10-09 17:02',
    monthKey: '2026.10', ts: 0,
  },
];

/** 设计稿 p8 的三宫格数值（演示态） */
const DEMO_STATS = [
  { value: 6, label: '观测对象' },
  { value: 128, label: '总记录' },
  { value: 64, label: '记录天数' },
];

const rows = ref<Row[]>(DEMO_FALLBACK ? [...DEMO] : []);
const stats = ref([...DEMO_STATS]);

/**
 * 筛选行（2026-10-11 用户指定）：只留「全部」按钮 + 同行猫名搜索框。
 * - keyword 非空 → 按猫名模糊过滤（大小写不敏感）；点「全部」即清空关键词回到全列表。
 * - 原「全部 + 前 2 个个体」个体胶囊已移除（个体筛选交给搜索框），详见文件头「刻意偏离」登记。
 */
const keyword = ref('');
const clearSearch = () => { keyword.value = ''; };

/** 「全部」按钮的选中态 = 当前没有生效的搜索词 */
const allOn = computed(() => !keyword.value.trim());

const shown = computed(() => {
  const k = keyword.value.trim().toLowerCase();
  if (!k) return rows.value;
  return rows.value.filter((r) => r.name.toLowerCase().includes(k));
});

/** 空态文案：有搜索词 = 搜不到；无搜索词 = 记录本就为空（两种语义不同，勿合并） */
const emptyTip = computed(() =>
  keyword.value.trim() ? `没有找到「${keyword.value.trim()}」相关的记录` : '观察史还是空白的第一页',
);

/**
 * 按自然月分节（2026-10-06 用户指定；2026-10-11 起分节头「总是显示」）。
 * 时间倒序 → 同月归并；月份本身即分节键，故先按 ts 降序再顺序归并。
 * 说明：分节头已去掉「≥2 月」条件判断 —— 只要列表有卡片就显示该月标签
 *      （见文件头「2026-10-11 用户指定调整（第二次）」）。
 */
const sections = computed(() => {
  const sorted = [...shown.value].sort((a, b) => b.ts - a.ts);
  const groups: { key: string; title: string; items: Row[] }[] = [];
  for (const r of sorted) {
    const g = groups.find((x) => x.key === r.monthKey);
    if (g) g.items.push(r);
    else groups.push({ key: r.monthKey, title: r.monthKey, items: [r] });
  }
  return groups;
});

/** ISO 时间 → 所属月份键 `2026.10`；无效时间 → '未知时间'（与 friendlyTime 同口径） */
function monthKeyOf(iso?: string | null): { key: string; ts: number } {
  const t = iso ? new Date(iso) : null;
  if (!t || Number.isNaN(t.getTime())) return { key: '未知时间', ts: 0 };
  return {
    key: `${t.getFullYear()}.${String(t.getMonth() + 1).padStart(2, '0')}`,
    ts: t.getTime(),
  };
}

/** ISO 时间 → 「今天 18:32 / 昨天 09:14 / 9月10日 08:12」 */
function friendlyTime(iso?: string | null): string {
  if (!iso) return '时间待记录';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '时间待记录';
  const hm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  const now = new Date();
  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.floor((day0 - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 86400000);
  if (diff === 0) return `今天 ${hm}`;
  if (diff === 1) return `昨天 ${hm}`;
  if (diff === 2) return `前天 ${hm}`;
  return `${t.getMonth() + 1}月${t.getDate()}日 ${hm}`;
}

/** 详情浮层的 meta：绝对时间（列表里是「今天/昨天」相对时间，详情要能落到具体日期） */
function fullTimeOf(iso?: string | null): string {
  if (!iso) return '时间待记录';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '时间待记录';
  const hm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${hm}`;
}

/** 月份 → 季节（详情浮层的「所属季节」行） */
function seasonOf(iso?: string | null): string {
  const m = iso && !Number.isNaN(new Date(iso).getTime()) ? new Date(iso).getMonth() + 1 : new Date().getMonth() + 1;
  return m >= 3 && m <= 5 ? '春' : m >= 6 && m <= 8 ? '夏' : m >= 9 && m <= 11 ? '秋' : '冬';
}

onShow(load);

async function load() {
  // 与首页同一套口径（2026-10-08 晚）：拿到「真实（含空）结果」→ 用真数据（空就空）；
  // 未登录且后端在线 → 游客空态；只有网络层失败（离线/后端未启动/像素核对拦截 API）
  // 才保留设计稿演示数据撑版面。
  if (!uni.getStorageSync('token')) {
    const online = await probePublic();
    if (online) {
      rows.value = [];
      stats.value = [
        { value: 0, label: '观测对象' },
        { value: 0, label: '总记录' },
        { value: 0, label: '记录天数' },
      ];
    }
    return;
  }

  try {
    const [records, profiles] = await Promise.all([
      api.get<any[]>('/records'), // 阶段2：后端按 JWT 查当前用户记录，不再传 authorId
      api.get<any[]>('/profiles'),
    ]);
    if (Array.isArray(records)) {
      rows.value = records.map((r) => {
        const name = r.profile?.name || '未命名';
        // 多类型标签（2026-10-10 胶囊多选）：主类型 + 附加标签拼「投喂 + 点位」
        // ⚠️ 后端 subTypes 是逗号串（不是数组），用 split 解析
        const types = [r.type, ...String(r.subTypes || '').split(',').filter(Boolean)];
        const type = types
          .map((t) => TYPE_TEXT[t as string] || '')
          .filter(Boolean)
          .join(' + ') || '记录';
        // 编号段：后端暂无该字段（设计稿才有），有则带上、无则省略
        const code = r.profile?.code ? ` · ${r.profile.code}` : '';
        const mk = monthKeyOf(r.occurredAt);
        return {
          id: r.id,
          name,
          title: `${name}${code} · ${type}`,
          body: r.content || '',
          time: friendlyTime(r.occurredAt),
          photoUrl: assetUrl(r.photos?.[0]?.url),
          photoLabel: '观察照片',
          // 详情浮层用（2026-10-10 晚）：胶囊逐个成枚、绝对时间、季节、街区级坐标
          pills: types.map((t) => ({ t: TYPE_TEXT[t as string] || '记录', cls: PILL_CLS[t as string] || 'olive' })),
          seasonText: `${new Date(r.occurredAt).getFullYear()} ${seasonOf(r.occurredAt)}`,
          lat: r.lat, lng: r.lng, locDesc: r.locDesc,
          detailMeta: fullTimeOf(r.occurredAt) + (r.locDesc ? ` · ${r.locDesc}` : ''),
          monthKey: mk.key,
          ts: mk.ts,
        };
      });

      // 三宫格：观测对象 = 档案数；总记录 = 记录数；记录天数 = 记录覆盖的自然日数
      const days = new Set(records.map((r) => String(r.occurredAt || '').slice(0, 10)).filter(Boolean));
      stats.value = [
        { value: Array.isArray(profiles) ? profiles.length : 0, label: '观测对象' },
        { value: records.length, label: '总记录' },
        { value: days.size, label: '记录天数' },
      ];
    }
  } catch {
    /* 离线：保留演示数据 */
  }
}

// ---------------- 打卡记录详情（2026-10-10 晚） ----------------
// 卡片正文按设计稿只显示一行 → 点卡片看全文。数据都在已渲染的 rows 里，打开详情零请求。
const detail = ref<Row | null>(null);
const openDetail = (r: Row) => { detail.value = r; };
const detailPills = computed(() => detail.value?.pills || []);
const detailTitle = computed(() => detail.value?.title || '');
const detailMeta = computed(() => detail.value?.detailMeta || '');
const detailBody = computed(() => detail.value?.body || '');
const detailPhoto = computed(() => detail.value?.photoUrl || '');
const detailExtras = computed(() => {
  const r = detail.value;
  if (!r) return [];
  const out: { k: string; v: string }[] = [{ k: '所属季节', v: r.seasonText }];
  if (r.lat != null && r.lng != null) {
    out.push({ k: '定位精度', v: `街区级模糊 · ${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)}` });
  } else {
    out.push({ k: '定位精度', v: '无坐标（仅文字点位）' });
  }
  if (r.locDesc) out.push({ k: '点位', v: r.locDesc });
  if (r.photoUrl) out.push({ k: '照片', v: '1 张' });
  return out;
});
</script>

<style scoped>
/* ============ 标题行（实测：标题 ink 顶 78.45pt / 副题右对齐到 353.4pt） ============ */
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 实测：H5 默认导航栏占 44pt，标题 ink 顶 78.45pt → 内边距 67rpx */
  padding-top: 67rpx;
}
.head-title {
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1;
  color: #3c4036;
}
.head-sub {
  font-size: 24rpx;
  line-height: 1;
  color: #8b8779;
}

/* ============ 三宫格统计（实测：卡 102.46pt 宽 / 间距 12.5pt / 高 65.27pt） ============ */
.stats {
  display: flex;
  margin-top: 43rpx;
}
.stat {
  flex: 1;
  height: 131rpx;
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
  margin-left: 25rpx;
}
.stat-num {
  font-size: 42rpx;
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

/* ============ 筛选行（实测：胶囊高 32pt/64rpx 全圆、宽 52pt/104rpx、间距 8pt/16rpx）
   ★ 2026-10-11 用户指定：原「全部 + 2 个个体」胶囊 → 「全部」+ 同行猫名搜索框 ============ */
.chips {
  display: flex;
  align-items: center;
  margin-top: 31rpx;
}
.chip {
  flex-shrink: 0;
  height: 64rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  font-size: 24rpx;
  line-height: 1;
  color: #6e6f58;
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
}
/* 选中态：实测与常态等宽（同一 padding），只是填充换成墨绿、描边同色 */
.chip.on {
  color: #faf7f1;
  background: #55684f;
  border-color: #55684f;
}
/* 搜索框：与「全部」同高 / 同底色 / 同描边，右侧 flex:1 占满剩余宽度 */
.search {
  flex: 1;
  min-width: 0;
  margin-left: 16rpx;
  height: 64rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
  border-radius: 999rpx;
}
/* 放大镜：纯 CSS 画（圆环 + 斜柄）——小程序端不依赖 SVG / 字体图标 */
.s-icon {
  position: relative;
  flex-shrink: 0;
  width: 22rpx;
  height: 22rpx;
  box-sizing: border-box;
  border: 3rpx solid #a29e8f;
  border-radius: 50%;
}
.s-icon::after {
  content: '';
  position: absolute;
  right: -9rpx;
  bottom: -6rpx;
  width: 12rpx;
  height: 3rpx;
  border-radius: 2rpx;
  background: #a29e8f;
  transform: rotate(45deg);
}
.s-ipt {
  flex: 1;
  min-width: 0;
  height: 64rpx;
  margin-left: 16rpx;
  padding: 0;
  font-size: 24rpx;
  line-height: 64rpx;
  color: #3c4036;
  background: transparent;
}
/* placeholder 用 placeholder-class（小程序端 input 的 ::placeholder 常不生效） */
.s-ph {
  font-size: 24rpx;
  color: #a29e8f;
}

/* ============ 观察记录卡（实测：全宽×83.2pt/167rpx，卡间距 11pt → 用 pitch 94pt 反推 20rpx） ============ */
.rlist {
  margin-top: 28rpx;
}
/* 月份分节（2026-10-06 用户指定；2026-10-11 改为「总是显示」）：视觉沿用 S5 时间轴 sec-head
   —— 52×4rpx 短划线 + 24rpx/600 标题。分节包裹层 .rsec 无任何自身样式。 */
.rsec-head {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
/* 注：组与组之间的间距由「上一组末卡的 20rpx 下边距」提供（父子外边距塌陷 → 实际 20rpx），
   与卡间距一致，故不额外加 margin，避免出现两套呼吸节奏。 */
.rsec-dash {
  width: 52rpx;
  height: 4rpx;
  border-radius: 2rpx;
  flex-shrink: 0;
  background: #8fa08b;
}
.rsec-title {
  margin-left: 15rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  font-weight: 600;
  color: #56674e;
}
.rcard {
  display: flex;
  align-items: center;
  padding: 26rpx 22rpx;
  margin-bottom: 20rpx;
  box-sizing: border-box;
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
  border-radius: 32rpx;
}
/* 按下反馈（2026-10-10 晚：卡片可点开记录详情）。仅按压期间生效 → 静态像素不变 */
.rcard--hover { background: #f6f2e7; }
/* 照片占位：56pt/112rpx 见方、R10pt/20rpx、淡紫底（同 S5 记录卡） */
.photo {
  position: relative;
  width: 112rpx;
  height: 112rpx;
  flex-shrink: 0;
  border-radius: 20rpx;
  background: #e6e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.photo-img {
  width: 112rpx;
  height: 112rpx;
}
.photo-txt {
  font-size: 24rpx;
  line-height: 1;
  color: #757980;
}
.rmain {
  flex: 1;
  min-width: 0;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.rtitle {
  font-size: 26rpx;
  font-weight: 700;
  line-height: 1;
  color: #3c4036;
}
.rbody {
  margin-top: 14rpx;
  font-size: 22rpx;
  line-height: 1;
  color: #6e6f58;
}
.rtime {
  margin-top: 12rpx;
  font-size: 20rpx;
  line-height: 1;
  color: #a29e8f;
}

.empty-tip {
  text-align: center;
  color: #8a8a7e;
  padding: 80rpx 0;
  font-size: 26rpx;
}
</style>
