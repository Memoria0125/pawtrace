<template>
  <!--
    S2 附近点位（地图 / Tab2）｜设计基准：线框 PDF p4，逐像素实测（375×812 @2.957x）
    结构：自绘导航(附近点位+记录条数图例) → CSS 手绘底图(6 街区+3 道路+9 爪印标记+记录条数图例)
         → 选中点位卡(三花·0824) → 记录条数档位胶囊×4 → 自绘 TabBar
    2026-10-10：本页是 tabBar 页（switchTab 不能带参）→ 从 S4 个体档案点「出没点位」跳来时，
    目标经一次性 storage（paw_map_focus）带入：中心聚焦到那只猫、自动选中它（详见 MAP_FOCUS_KEY 段）。
    2026-10-10 晚：marker 落点改用后端 `displayLat/displayLng`（坐标多级兜底：档案 → 最近带
    坐标的记录 → 所属小组活动中心「小区级」）—— 原先直接读 lastSeenLat，**只写了文字点位、
    没存坐标的猫会被后端整只滤掉、在地图上凭空消失**（用户报障「写了其他三个协会的猫咪地图上
    没显示」）。小区级坐标在点位卡上如实标注「小区级 ·」，不假装精确。
    阶段4 TODO：底图换腾讯地图 SDK（保留点位坐标映射），COS 街区级模糊坐标。
  -->
  <view class="s2">
    <!-- ============ 自绘导航 ============ -->
    <view class="nav">
      <text class="nav-title">附近点位</text>
      <!--
        右上角图例标签（2026-10-09 两改）：「热力图」→「记录密度」→「记录条数」。
        · 一改（热力图→记录密度）：热力图图层从未实装（toggleHeat 是空函数），词与画面不符；
        · 二改（记录密度→记录条数）：用户追问「你记录了啥密度」—— marker 颜色编码的是
          **每只猫名下的观测记录条数**（densityColor：≥5 深红 / ≥3 陶土 / <3 芥末），
          不是任何空间密度，「密度」同样不准确。「条数」才是这个数据的事实名称。
        点胶囊弹档位说明（真实交互）：芥末 <3 条 · 陶土 ≥3 条 · 深红 ≥5 条。
        若阶段4 真做热力图图层，再改回开关。陶土色方块：设计稿原样，未动。 -->
      <view class="heat-btn" @tap="showLegend">
        <view class="heat-ico"></view>
        <text class="heat-txt">记录条数</text>
      </view>
    </view>

    <!-- ============ 底图：真实地图（配 key 后启用）/ 手绘（默认兜底） ============ -->
    <!-- 真实地图 = 腾讯位置服务（合规白名单），marker 沿用「记录条数三色」；
         MAP_ENABLED=false（未配 key）时整块走设计稿手绘底图 → 像素验收基线零影响。
         「我的位置」用自绘蓝点 marker（见 markers），不用 :show-location ——
         后者走的是未做 WGS84→GCJ02 换算的坐标，会整体偏约 528m（2026-10-08 实测）。
         地图中心跟随「我的位置」（2026-10-10）：人在哪地图定在哪；5km 内无猫时
         不画任何演示点位（真实空态），取不到定位才回设计稿兜底帧。 -->
    <view class="map-frame">
      <map v-if="MAP_ENABLED" class="map map--real"
           :latitude="viewCenter.lat" :longitude="viewCenter.lng" :scale="MAP_SCALE"
           :markers="markers" @markertap="onMarkerTap"></map>
      <view v-else class="map">
        <view class="blk" v-for="b in blocks" :key="b.k"
              :style="{ left: b.x + 'rpx', top: b.y + 'rpx', width: b.w + 'rpx', height: b.h + 'rpx' }"></view>
        <view class="road road--v"></view>
        <view class="road road--h1"></view>
        <view class="road road--h2"></view>

        <view class="mk" v-for="(m, i) in points" :key="i" :class="{ 'mk--on': m.on }"
              :style="{ left: m.x + 'rpx', top: m.y + 'rpx', background: m.c }"
              @tap="selectPoint(i)"></view>

        <view class="legend">
          <view class="lg-dot" style="background:#d9c488"></view>
          <view class="lg-dot" style="background:#c58a6e"></view>
          <view class="lg-dot" style="background:#d9694f"></view>
          <text class="lg-txt">记录条数</text>
        </view>
      </view>
      <!--
        定位相关控件（2026-10-10 晚，用户报障「蓝点定位不太对」后加；10-10 深夜按用户定案收敛）：
        · 保留「回到我的位置」：H5/小程序地图吃手势缩放平移（实测滚轮即缩放），
          位置一偏用户就找不到自己 → 点它（或点蓝点）把地图拉回脚下；
        · 已移除精度圈 + 「网络定位」提示条：用户说明实际用手机操作、有 GPS，
          精度可达米级，桌面 WiFi 定位的 ±100m 圈与提示在真机上无意义（2026-10-10 定案）。
        控件只在「真实地图 + 拿到定位」时出现 → 设计稿兜底帧（无定位）逐像素不变。
      -->
      <view v-if="MAP_ENABLED && mePos" class="map-ctrl">
        <view class="map-ctrl-btn" @tap="recenterMe">
          <text class="map-ctrl-ico">◎</text>
          <text class="map-ctrl-txt">回到我的位置</text>
        </view>
      </view>
      <!-- 手账胶带（两态通用，2026-10-08 用户指定加的装饰）：4 角各一条，横贴骑跨虚线框。
           下边缘两条整体压在框外侧（只骑跨 2rpx）——底部内侧横向被「记录条数图例」
           与「腾讯 logo + 审图号」占满，骑跨多了会压住设计元素与地图合规署名。 -->
      <view class="map-tape map-tape--tl"></view>
      <view class="map-tape map-tape--tr"></view>
      <view class="map-tape map-tape--bl"></view>
      <view class="map-tape map-tape--br"></view>
    </view>

    <!-- ============ 选中点位卡 ============ -->
    <view class="point-card">
      <view class="photo">
        <image v-if="cur.avatar" class="photo-img" :src="cur.avatar" mode="aspectFill" />
        <text v-else class="photo-txt">{{ cur.photo }}</text>
      </view>
      <view class="col">
        <text class="card-title">{{ cur.name }}</text>
        <text class="meta">{{ cur.meta }}</text>
        <text v-if="cur.loc" class="sub"><text class="sub-loc">{{ cur.loc }}</text> · {{ cur.dist }}</text>
        <view v-if="!cur.empty" class="btn" @tap="openProfile"><text class="btn-txt">查看档案</text></view>
      </view>
    </view>

    <!-- ============ 记录条数档位筛选 ============ -->
    <!--
      2026-10-09 用户指定改动（取代设计稿的地名胶囊「全部/小区/校园/车棚」）：
      地名筛选跟着 lastSeenDesc 前缀走，换一个地方就得重编、别处毫无通用性 →
      直接改成地图 marker 本来就在编码的三色档位（与 densityColor / 图例 / 右上角 toast 同一套阈值）。
      · 几何沿用设计稿（103×63rpx ×4，间距 16rpx）——只换了胶囊内的语义，没动版式；
      · 某档位在当前数据里 0 只 → 置灰不可点（「选了要有下文」，不给点了没下文的选项）。
    -->
    <view class="chips">
      <view class="chip" v-for="(c, i) in chips" :key="c.label"
            :class="{ 'chip--on': chipIdx === i, 'chip--off': !c.ok }"
            @tap="pickChip(i)">
        <view v-if="c.dot" class="chip-dot" :style="{ background: c.dot }"></view>
        <text>{{ c.label }}</text>
      </view>
    </view>

    <paw-tabbar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { assetUrl } from '../../common/uploader';
import {
  getLocationBlurred, getMyPosition, peekMyPosition, syncBlurredCache,
  MY_POS_MIN_INTERVAL, fmtDist,
} from '../../common/location';
import { MAP_ENABLED, MAP_CENTER, MAP_SCALE, densityIcon, MK_ICON } from '../../common/map';
import PawTabbar from '../../components/paw-tabbar/paw-tabbar.vue';

/* ---- 手绘底图：6 个街区（设计稿实测 rpx） ---- */
const blocks = [
  { k: 'b1', x: 39,  y: 59,  w: 263, h: 201 },
  { k: 'b2', x: 344, y: 59,  w: 250, h: 201 },
  { k: 'b3', x: 39,  y: 300, w: 227, h: 270 },
  { k: 'b4', x: 344, y: 357, w: 282, h: 212 },
  { k: 'b5', x: 39,  y: 601, w: 263, h: 178 },
  { k: 'b6', x: 391, y: 645, w: 249, h: 190 },
];

/**
 * 设计稿 p4 原始点位（9 枚，最后一枚选中）。
 * DEMO 兜底态必须逐像素复现它（颜色/坐标/选中态都不许动）→ S2 像素基线依赖此数组。
 */
const C = { terra: '#c58a6e', mustard: '#d9c488', sage: '#8f9f8a', ink: '#3c4036', grey: '#8b8779', deep: '#d9694f' };
const DEMO_POINTS = [
  { x: 252, y: 132, c: C.terra },
  { x: 504, y: 202, c: C.mustard },
  { x: 140, y: 186, c: C.terra },
  { x: 136, y: 272, c: C.terra },
  { x: 92,  y: 422, c: C.sage },
  { x: 472, y: 452, c: C.ink },
  { x: 364, y: 514, c: C.sage },
  { x: 212, y: 671, c: C.grey },
  { x: 592, y: 671, c: C.sage },
];
/**
 * 记录条数档位胶囊（2026-10-09 用户指定：取代设计稿的地名筛选「全部/小区/校园/车棚」——
 * 地名换地方就失效；三色档位与地图 marker 编码同源，任何地方都成立）。
 * 阈值必须与 densityColor() 严格一致（芥末 <3 / 陶土 3-4 / 深红 ≥5）。
 */
const TIER_CHIPS: { label: string; dot?: string; min?: number; max?: number }[] = [
  { label: '全部' },
  { label: '<3条', dot: C.mustard, min: 0, max: 2 },
  { label: '3-4条', dot: C.terra, min: 3, max: 4 },
  { label: '≥5条', dot: C.deep, min: 5, max: Infinity },
];
const DEMO_CUR = {
  photo: '三花猫照片', avatar: '', id: '',
  name: '三花 · 0824', meta: '猫 · 最近记录 今天 18:32', loc: '楼下花坛', dist: '距你 120m',
};
const DEMO_SEL = 8; // 设计稿选中最后一枚（仅演示帧；真实数据态在 onShow 里默认选中最近一只）

/* ============ 真实数据态（2026-10-07）：GET /profiles/nearby ============ */
const realCats = ref<any[]>([]);
const chipIdx = ref(0);
const selIdx = ref(DEMO_SEL);

/* ============ 档案页带来的「聚焦目标」（2026-10-10） ============
   S4 个体档案点「出没点位」→ 跳本页并聚焦到那只猫。
   本页是 tabBar 页，`uni.switchTab` 不支持 query → 目标走一次性 storage 中转：
   写入方 pages/profile/detail.vue「onSpot」，本页 onShow 读取后**立即清除**（不残留、不粘滞）。
   存的是展示所需真值（名字/点位/头像/记录数/坐标），不是 id —— 这样即使这只猫
   不在 /profiles/nearby 的半径结果里（未授权定位、距离超 5km）也能聚焦，且零新请求。 */
const MAP_FOCUS_KEY = 'paw_map_focus';
const focus = ref<any | null>(null);

/** 展示用猫列表 = nearby 结果 ∪ 聚焦目标（按 id 去重；目标已在结果里就用结果里那条） */
const listCats = computed(() => {
  const base = realCats.value;
  const f = focus.value;
  if (!f || !f.profileId) return base;
  if (base.some((c) => c.id === f.profileId)) return base;
  return [{
    id: f.profileId,
    name: f.name || '这只猫',
    animalType: f.animalType || 'CAT',
    lastSeenDesc: f.desc || '',
    lastSeenAt: f.lastSeenAt || null,
    lastSeenLat: typeof f.lat === 'number' ? f.lat : null,
    lastSeenLng: typeof f.lng === 'number' ? f.lng : null,
    avatarPhoto: f.avatarUrl ? { url: f.avatarUrl } : null,
    _count: { records: f.records ?? 0 },
  }, ...base];
});

/* 有真实数据（或带着聚焦目标进来）就绝不回设计稿演示点位（筛选出空集时地图留空，不冒充有猫） */
const hasReal = computed(() => realCats.value.length > 0 || !!focus.value);

/**
 * 真实空态（2026-10-10 用户实测抓到）：取到定位、后端正常应答、但 5km 内没有猫 ——
 * 此前 `!list.length → return` 会整页回浙科假演示帧，人在城西也谎称浙科有 5 只猫。
 * 现在此态：地图中心跟「我的位置」走、不画任何演示点位、点位卡说真话、档位胶囊全置灰。
 * 注意与「取不到定位/游客/离线」区分——后者仍走设计稿兜底帧（像素基线口径，不许动）。
 */
const noNearby = ref(false);

/** 猫名下观测记录数（与 marker 颜色同源的真值） */
const recCount = (c: any) => c._count?.records ?? 0;

/**
 * 地图落点坐标（2026-10-10 晚）：后端给了**多级兜底**后的 `displayLat/displayLng`
 * （档案坐标 → 最近带坐标的记录 → 所属小组活动中心），后端老版本/聚焦目标没有这两个字段时
 * 回落档案自身的 lastSeenLat/Lng。前端只认这一个取坐标入口，别在各处直接读 lastSeenLat。
 */
const cLat = (c: any): number | null => {
  const v = typeof c?.displayLat === 'number' ? c.displayLat : c?.lastSeenLat;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};
const cLng = (c: any): number | null => {
  const v = typeof c?.displayLng === 'number' ? c.displayLng : c?.lastSeenLng;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

/** 坐标只到「小区级」（兜底 ③ 小组活动中心）时，点位卡如实标注，不假装精确 */
const COORD_SRC_LABEL: Record<string, string> = { space: '小区级 · ' };

/** 手绘底图名义画布（rpx）；高度与 .map 的 CSS 高度严格一致（2026-10-11：941 → 847） */
const MAP_W = 750, MAP_H = 847;
const ANIMAL: Record<string, string> = { CAT: '猫', DOG: '狗' };

/** 街区级坐标线性投影进手绘底图（阶段4 换地图 SDK 时替换；坐标本身已是模糊值） */
function project(cats: any[]) {
  // 只有一只猫（从档案页聚焦过来、手绘底图态）→ 摆在正中；否则线性投影会把它丢到左上角
  if (cats.length === 1) return [{ x: Math.round(MAP_W / 2), y: Math.round(MAP_H / 2) }];
  const lats = cats.map(cLat), lngs = cats.map(cLng);
  const minLat = Math.min(...(lats as number[])), maxLat = Math.max(...(lats as number[]));
  const minLng = Math.min(...(lngs as number[])), maxLng = Math.max(...(lngs as number[]));
  const spanLat = Math.max(maxLat - minLat, 1e-4), spanLng = Math.max(maxLng - minLng, 1e-4);
  const padX = 90, padY = 130;
  return cats.map((c) => ({
    x: Math.round(padX + (((cLng(c) as number) - minLng) / spanLng) * (MAP_W - padX * 2)),
    y: Math.round(padY + (1 - ((cLat(c) as number) - minLat) / spanLat) * (MAP_H - padY * 2)),
  }));
}

/** 每只猫的记录条数 → 三色（芥末 <3 / 陶土 ≥3 / 深红 ≥5，2026-10-09 由「记录密度」正名为「记录条数」） */
const densityColor = (n: number) => (n >= 5 ? '#d9694f' : n >= 3 ? C.terra : C.mustard);

/** 点右上角图例胶囊 → 弹档位说明（真实交互；取代原先点了没反应的空开关） */
function showLegend() {
  uni.showToast({ title: '颜色 = 记录条数：芥末 <3 · 陶土 ≥3 · 深红 ≥5', icon: 'none', duration: 2500 });
}

/** 档位胶囊：某档在当前数据里 0 只 → ok=false（置灰不可点）；DEMO 态无数据可依 → 全亮 */
const chips = computed(() => TIER_CHIPS.map((t) => ({
  ...t,
  ok: noNearby.value
    ? false // 真实空态：一只猫都没有，全部档位（含「全部」）都没有下文 → 整排置灰
    : hasReal.value && t.min !== undefined
      ? listCats.value.some((c) => { const n = recCount(c); return n >= t.min && n <= t.max; })
      : true,
})));

/** 点胶囊选档位（空档直接拦下） */
function pickChip(i: number) {
  if (!chips.value[i]?.ok) return;
  chipIdx.value = i;
  if (selIdx.value >= shownCats.value.length) selIdx.value = 0;
}

/** 筛选后的猫（真实态）：按记录条数档位；DEMO 态为空 → 走设计稿点位 */
const shownCats = computed(() => {
  if (!hasReal.value) return [];
  const t = TIER_CHIPS[chipIdx.value];
  if (!t || t.min === undefined) return listCats.value;
  return listCats.value.filter((c) => { const n = recCount(c); return n >= t.min && n <= t.max; });
});

const points = computed(() => {
  if (noNearby.value) return []; // 真实空态：5km 内无猫，一个演示点位都不画
  if (!hasReal.value) return DEMO_POINTS.map((p, i) => ({ ...p, on: i === selIdx.value }));
  const cats = shownCats.value;
  if (!cats.length) return []; // 真实态空集：留空，不回设计稿演示点位
  const pos = project(cats);
  return cats.map((c, i) => ({ ...pos[i], c: densityColor(c._count?.records ?? 0), on: i === selIdx.value }));
});

/* ============ 真实地图态（MAP_ENABLED=true 时启用） ============ */
/**
 * 离线/空库兜底点位：seed 五只猫的真实校园坐标静态副本（腾讯 POI GCJ02），
 * 保证真实地图模式下（后端不可用）也有可看的演示点位。
 */
const DEMO_MAP_CATS = [
  { name: '小橘', desc: '图书馆东门花坛', lat: 30.219436, lng: 120.027353, records: 3 },
  { name: '花臂', desc: '宿舍区自行车棚', lat: 30.2156, lng: 120.0223, records: 3 },
  { name: '煤球', desc: '食堂后门小巷', lat: 30.218056, lng: 120.030671, records: 2 },
  { name: '年糕', desc: '田径场看台下', lat: 30.217433, lng: 120.020686, records: 2 },
  { name: '大黄', desc: '东和公寓东门', lat: 30.218504, lng: 120.032088, records: 2 },
];

/** 我的位置（未模糊的真实 GCJ02 坐标；取不到 → null，则不画蓝点。accuracy 精度圈已按 10-10 用户定案移除：真机有 GPS） */
const mePos = ref<{ lat: number; lng: number } | null>(null);

/**
 * 地图中心（2026-10-10 用户实测改）：优先「我的位置」——「附近」本就是以我为圆心的视图，
 * 人在哪地图就定在哪（用户定位不在浙科时，此前地图仍定在浙科点位质心 → 牛头不对马嘴）。
 * 取不到定位（游客/未授权/离线）才回点位质心 → 校园中心（设计稿兜底帧口径不变）。
 * 5km 内有猫时猫都在我一屏之内（MAP_SCALE=15 视野约 1.55km 宽、nearby 半径内的猫
 * 距我 ≤5km，超出一屏的本来就不是「附近点位」该优先展示的）。
 */
const center = computed(() => {
  // 档案页带来的聚焦目标最优先（2026-10-10）：用户明确说「看这只猫在哪」，
  // 地图就定在它身上 —— 哪怕它在 5km 外、比「我的位置」更远。
  const f = focus.value;
  if (f && typeof f.lat === 'number' && typeof f.lng === 'number') {
    return { lat: f.lat, lng: f.lng };
  }
  const me = mePos.value;
  if (me && typeof me.lat === 'number' && typeof me.lng === 'number') {
    return { lat: me.lat, lng: me.lng };
  }
  const pts = shownCats.value.length
    ? shownCats.value.map((c) => ({ lat: cLat(c), lng: cLng(c) }))
    : DEMO_MAP_CATS.map((c) => ({ lat: c.lat, lng: c.lng }));
  const valid = pts.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number');
  if (!valid.length) return MAP_CENTER;
  return {
    lat: valid.reduce((s, p) => s + p.lat, 0) / valid.length,
    lng: valid.reduce((s, p) => s + p.lng, 0) / valid.length,
  };
});

/** 「我的位置」marker 的保留 id（猫 marker 用数组下标，故取一个不可能撞上的值） */
const ME_ID = 9999;

/**
 * marker 层级（2026-10-11，用户报障「蓝点被猫点位盖住一角」）：
 * ⚠️ 分端结论（别把两端混为一谈，实测 + 官方文档双向确认）：
 *   · 微信小程序 / App 原生地图：marker **支持** `zIndex`（微信基础库 2.3.0+，
 *     3.4.3 起还兼作碰撞优先级）→ 用下面这两个常量声明即生效；
 *   · H5：uni-app 的 marker 属性表里**根本没有 zIndex**，实测传了也不生效 ——
 *     腾讯 JSAPI v2 给每个 marker 的 wrapper 写死 `z-index:0`，
 *     谁压谁由 SDK 内部渲染顺序决定（「数组里 append 到最后」≠ DOM 最后，
 *     实测蓝点排在第 6 位）→ H5 端改在下面的 H5 专属块里补一条 CSS 抬层。
 * 蓝点给大值永远置顶；猫点位显式给 1（与三色档位同为「数据点位」层）。
 */
const Z_CAT = 1;
const Z_ME = 999;

/**
 * 地图受控中心（2026-10-10 晚，用户报障「蓝点不在正中」后加）：
 * H5/小程序地图**吃手势**（实测滚轮即缩放、拖动即平移），这时地图内部视野变了、
 * 但 `center`（由 mePos 推）没变 → 直接再赋同一个值不会触发重定位，蓝点就永远飘在一角。
 * 故另起一个受控值 viewCenter：跟随 center 走（保持「人在哪地图定在哪」），
 * 「回到我的位置」时先偏 2m 再回位 —— 两次 props 变更必然触发重定位（2m 肉眼不可见）。
 */
const viewCenter = ref({ lat: center.value.lat, lng: center.value.lng });
watch(center, (c) => { viewCenter.value = { lat: c.lat, lng: c.lng }; });
let nudgeTimer: ReturnType<typeof setTimeout> | null = null;
function recenterMe() {
  const me = mePos.value;
  if (!me) return;
  if (nudgeTimer) clearTimeout(nudgeTimer);
  viewCenter.value = { lat: me.lat + 0.00002, lng: me.lng }; // ≈2m 偏移：制造一次 props 变更
  nudgeTimer = setTimeout(() => {
    viewCenter.value = { lat: me.lat, lng: me.lng };
    nudgeTimer = null;
  }, 80);
}

/**
 * H5 桌面「滚轮仲裁」（2026-10-11，用户报障「窗口一变矮就看不到底部数据、又滚不动」）：
 * H5 腾讯地图组件会**吃掉滚轮**做缩放（实测：鼠标停在地图上滚，页面 scrollY 恒为 0），
 * 而地图占了大半屏 → 用鼠标滚页面等于滚不动。页面本就能滚，只是被地图截了。
 * 规则：**页面还能往那个方向滚 → 截走滚轮**（capture 阶段 stopPropagation，阻止地图 SDK
 * 收到事件；浏览器「滚动页面」的默认行为不受影响）→ 页面滚到边界后，交回地图做缩放。
 * 只在 H5 生效（小程序 / App 端没有滚轮事件，命中不了）；真实地图未启用时也不挂。
 */
// #ifdef H5
/**
 * 蓝点置顶（2026-10-11，用户报障「我的蓝点被猫点位盖住一角」）：
 * H5 端 uni-app 的 marker 不吃 `zIndex`（见上面 Z_CAT/Z_ME 的分端结论），
 * 腾讯 JSAPI v2 把所有 marker 的 wrapper 都固定成 `z-index:0` 平铺在同一 marker pane 里，
 * 谁压谁只看 SDK 内部渲染顺序 → 只能从 CSS 这一层把它抬起来。
 * 选择器：`div:has(> img[src$="mk-me.png"])` = 包着蓝点图标的那个 wrapper
 *（实测 DOM 结构：`div[wrapper,z-index:0] > img.csssprite[src=…/mk-me.png]`）。
 * 用 document.head 注入而不是写在 <style> 里：地图 DOM 由第三方 SDK 生成、
 * 不带 uni-app 的 scope 属性，页面 scoped 样式命中不了；用 !important 也是为了
 * 压过 SDK 写在 wrapper 上的内联 `z-index:0`（内联非 important 打不过作者样式 important）。
 */
const ME_TOP_CSS = 'uni-map div:has(> img[src$="mk-me.png"]){z-index:9999 !important}';
function injectMapLayerCss() {
  if (document.getElementById('paw-map-layer')) return;
  const s = document.createElement('style');
  s.id = 'paw-map-layer';
  s.textContent = ME_TOP_CSS;
  document.head.appendChild(s);
}
injectMapLayerCss();
// #endif

// #ifdef H5
onMounted(() => {
  if (!MAP_ENABLED) return;
  const frame = document.querySelector('.map-frame') as HTMLElement | null;
  if (!frame) return;
  frame.addEventListener('wheel', (e: WheelEvent) => {
    const de = document.documentElement;
    const max = de.scrollHeight - window.innerHeight;
    const down = (e.deltaY || 0) > 0;
    const canScroll = down ? window.scrollY < max - 1 : window.scrollY > 1;
    if (canScroll) e.stopPropagation(); // 页面还能滚 → 滚轮归页面
  }, true);
});
// #endif

/**
 * 定位精度圈已移除（2026-10-10 深夜用户定案：实际用手机操作、有 GPS，精度可达米级，
 * 桌面 WiFi 定位的 ±100m 圈在真机上无意义）。此前的 circles computed 整段删除，
 * <map> 也不再绑 :circles。若将来要恢复，参考 REFERENCE §F「蓝点定位不太对」一节的存档。
 */

/**
 * markers：真实档案（坐标已是街区级模糊值）→ 记录条数三色图标，选中换墨绿大图标 + 常显名字；
 * 末尾追加「我的位置」蓝点（点它不切换选中档案）。
 */
const markers = computed(() => {
  const cats = shownCats.value;
  const list = noNearby.value
    ? [] // 真实空态（定位在他处、5km 无猫）：不画任何演示猫 marker，只留「我的位置」蓝点
    : hasReal.value
      ? cats.map((c) => ({
          name: c.name,
          desc: c.lastSeenDesc || '',
          lat: cLat(c),
          lng: cLng(c),
          records: c._count?.records ?? 0,
        }))
      : DEMO_MAP_CATS;
  const out = list
    .filter((c) => typeof c.lat === 'number' && typeof c.lng === 'number')
    .map((c, i) => {
      const on = i === selIdx.value;
      const m: any = {
        id: i, // H5 / App 端点击回调依赖此 id
        latitude: c.lat,
        longitude: c.lng,
        iconPath: on ? MK_ICON.on : densityIcon(c.records),
        width: on ? 34 : 26,
        height: on ? 34 : 26,
        anchor: { x: 0.5, y: 0.5 },
        zIndex: Z_CAT, // 猫点位固定在下层，别和蓝点抢默认 0（见 Z_CAT 注释）
      };
      // 只有选中项挂名字气泡：未选中项都带 callout 会触发腾讯 GL 的碰撞避让，
      // 点位靠得近时会被自动隐藏（实测会掉点）。气泡只标名称（与设计稿/手绘底图的标签口径一致；
      // 点位名与距离在下方点位卡里）。⚠️ 别在气泡里拼 `名称 · 点位`：东侧点位会溢出地图右边界被裁掉，
      // 且 H5 渲染层不吃 callout.anchorX（2026-10-08 实测无效）。
      if (on) {
        m.callout = {
          content: c.name,
          display: 'ALWAYS',
          color: '#3c4036',
          bgColor: '#faf8f1',
          fontSize: 12,
          borderRadius: 8,
          padding: 6,
        };
      }
      return m;
    });

  if (mePos.value) {
    out.push({
      id: ME_ID,
      latitude: mePos.value.lat,
      longitude: mePos.value.lng,
      iconPath: MK_ICON.me,
      width: 30,
      height: 30,
      anchor: { x: 0.5, y: 0.5 },
      zIndex: Z_ME, // 我的位置永远置顶（不被任何猫点位遮住）
      callout: {
        content: '我的位置',
        display: 'BYCLICK', // 常显气泡会参与腾讯 GL 的碰撞避让，点到再显最稳
        color: '#3c4036',
        bgColor: '#faf8f1',
        fontSize: 12,
        borderRadius: 8,
        padding: 6,
      },
    });
  }
  return out;
});

/** 点 marker 选中（e.detail.markerId = markers 数组下标；点「我的位置」= 回到我的位置） */
function onMarkerTap(e: any) {
  const id = Number(e?.detail?.markerId);
  if (Number.isNaN(id) || id < 0) return;
  if (id === ME_ID) { recenterMe(); return; }
  const total = shownCats.value.length || DEMO_MAP_CATS.length;
  if (id < total) selIdx.value = id;
}
// 2026-10-09：底部筛选从「地名胶囊」改为「记录条数三色档位」（见模板注释）；
// buildChips()（lastSeenDesc 前两字取 top3 地名）随之删除 —— 地名筛选换个地方就失效。

const cur = computed(() => {
  // 真实空态（人在别处、5km 内无猫）：说真话，不拿设计稿假卡「三花·0824 · 距你 120m」冒充
  if (noNearby.value) {
    return { empty: true, id: '', photo: '', avatar: '',
      name: '附近暂无猫咪记录', meta: '定位周边 5 公里内还没有观测点位', loc: '', dist: '' };
  }
  if (!hasReal.value) return DEMO_CUR;
  const cats = shownCats.value;
  // 防御性空态：正常路径到不了这里（空档胶囊已置灰拦下），数据瞬变时兜一句真话
  if (!cats.length) {
    return { empty: true, id: '', photo: '', avatar: '',
      name: '该档位暂无点位', meta: '换一个档位或等新记录', loc: '', dist: '' };
  }
  const c = cats[selIdx.value] || cats[0];
  return {
    id: c.id,
    photo: c.name ? `${c.name}照片` : '猫照片',
    avatar: assetUrl(c.avatarPhoto?.url),
    name: c.name,
    meta: `${ANIMAL[c.animalType] || '猫'} · 最近记录 ${friendlyTime(c.lastSeenAt)}`,
    loc: c.lastSeenDesc || '点位待记录',
    // 未接真实定位前不编「距你」：有坐标距离才显示，否则用真实记录数。
    // 坐标只到小区级（兜底用了小组活动中心）时如实说明，不假装精确（2026-10-10 晚）。
    dist: c.distanceM != null
      ? `${COORD_SRC_LABEL[c.coordSource] || ''}距你约 ${fmtDist(c.distanceM)}`
      : `累计 ${c._count?.records ?? 0} 条记录`,
  };
});

/** ISO → 「今天 12:05 / 昨天 18:42 / 9月10日」 */
function friendlyTime(iso?: string | null): string {
  if (!iso) return '待记录';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '待记录';
  const now = new Date();
  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const d0 = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  const diff = Math.floor((day0 - d0) / 86400000);
  const hm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  if (diff === 0) return `今天 ${hm}`;
  if (diff === 1) return `昨天 ${hm}`;
  return `${t.getMonth() + 1}月${t.getDate()}日`;
}

onShow(async () => {
  // ① 先消费档案页带来的聚焦目标（放在登录判断之前：档案详情是 @Public 接口，
  //    游客从档案页点「出没点位」同样要能落到那只猫身上）。一次性，读后即清。
  try {
    const raw = uni.getStorageSync(MAP_FOCUS_KEY);
    if (raw) {
      uni.removeStorageSync(MAP_FOCUS_KEY);
      const f = typeof raw === 'string' ? JSON.parse(raw) : raw;
      focus.value = f && f.profileId ? f : null;
    } else {
      focus.value = null; // 常规切 tab 进来 → 无聚焦目标（默认路径与像素基线口径不变）
    }
  } catch { focus.value = null; }
  // 立刻先选中聚焦目标（此时列表里只有它）：别等 /profiles/nearby 回来才高亮 ——
  // 请求慢时用户会看到「地图已经飞过去、但选中的却是别人/没人选中」。请求回来后再校正一次下标。
  applyFocusSelection();

  // ② 未登录（游客）—— 2026-10-11 改口径（用户报障「未登录时这一屏只有演示卡三花·0824、
  //    点地图上的猫点点不出档案」）：**游客同样走真实数据链路**，不再提前 return 演示帧。
  //    原逻辑（2026-10-08 晚）是「附近点位」按私有视图处理、不打 /profiles/nearby（那时它要鉴权、
  //    打过去只会甩一条 401 红字）。但 10-11 已把该接口转为 @Public（与其他浏览接口同口径），
  //    且演示帧下的点位卡是**常量**（cur 在 DEMO 态恒等于 DEMO_CUR）→ 点哪一枚 marker 卡片都不变，
  //    点「查看档案」还因 id 为空而拿不到真档案 —— 整条浏览链路对游客是死的。
  //    现在：游客 = 与登录态一致的只读体验（蓝点/回中/距离/点选/跳档案）；写操作仍各自引导登录。
  //    ⚠️ DEMO 兜底帧仍在，但只作为「后端连不上 / 无定位且空结果」的离线兜底（像素基线复现路径见
  //    核对文档第四十五章：以拦截 API 的方式复现，与 S1/S7 的基线口径统一）。

  // 「我的位置」蓝点：取未模糊的真实位置（本机显示用，不上传；与底图同为 GCJ02）
  // 2026-10-10 晚二改（用户报障「定位不太对」）：
  //   ① 同步读缓存先上屏（不闪、不阻塞）；② 再要一次**新读数**（节流 1 分钟/次）——
  //   原先进页只读缓存、10 分钟 TTL 内不刷新，人走了蓝点还钉在旧位置。
  //   新读数同时 syncBlurredCache：蓝点（未模糊）与点位卡距离（后端按模糊坐标算）同源，
  //   否则同屏两个数字互相矛盾，最容易被读成「定位不对」。
  const peek = peekMyPosition();
  if (peek) mePos.value = peek;
  const fresh = getMyPosition({ maxAge: MY_POS_MIN_INTERVAL });
  fresh.then((p) => {
    if (p) { mePos.value = p; syncBlurredCache(p); }
  }).catch(() => { /* 取不到就沿用缓存值 */ });
  // 定位快（WiFi/网络定位通常几百 ms）就等它，列表距离与蓝点口径一致；慢就先出列表
  await Promise.race([fresh, new Promise<void>((r) => { setTimeout(r, 1200); })]);
  try {
    // 定位链路（2026-10-07）：取街区级模糊定位 → 后端按距离排序 + 返回 distanceM，
    // 点位卡显示真实「距你约 X m」；未取到定位不带参数 → 显示「累计 N 条记录」（原口径）
    const loc = await getLocationBlurred();
    const list = await api.get<any[]>(
      '/profiles/nearby',
      loc ? { lat: loc.lat, lng: loc.lng } : undefined,
    );
    if (!Array.isArray(list)) { applyFocusSelection(); return; } // 离线/异常：保持设计稿演示帧
    if (!list.length) {
      // 空结果分两种（2026-10-10）：有定位 = 真的就附近没猫 → 真实空态（地图跟人走）；
      // 没定位 = 空库/未授权查不出远近 → 维持设计稿演示帧（像素基线口径）。
      // 例外（2026-10-10 新增）：带着聚焦目标进来时不算空态 —— 目标猫单独入列，仍要看得到。
      noNearby.value = !!loc && !focus.value;
      if (noNearby.value) { realCats.value = []; chipIdx.value = 0; selIdx.value = 0; }
      applyFocusSelection();
      return;
    }
    realCats.value = list;
    noNearby.value = false;
    // 选中档位在最新数据里已无点位（别处刚删/新增记录）→ 回「全部」
    if (!chips.value[chipIdx.value]?.ok) chipIdx.value = 0;
    // 真实数据态默认选中**最近的一只**（列表按距离升序）——DEMO_SEL=8「设计稿选中
    // 最后一枚」只服务演示帧：真实态沿用会把底卡停在「第 9 近」的猫上，选中 marker
    // 还常在屏外，卡片和图对不上（2026-10-10 晚）。带聚焦目标时下面 applyFocusSelection 会覆盖。
    selIdx.value = 0;
  } catch { /* 离线：演示点位（有聚焦目标时仍能在地图上看到那一只） */ }
  applyFocusSelection();
});

/**
 * 聚焦目标自动选中（2026-10-10）：档位拉回「全部」（否则目标可能被档位筛掉、看不见），
 * 再在当前列表里按 id 定位下标（找不到就取首项 —— 目标已并入列表首位）。
 */
function applyFocusSelection() {
  const f = focus.value;
  if (!f?.profileId) return;
  chipIdx.value = 0;
  const i = shownCats.value.findIndex((c) => c.id === f.profileId);
  selIdx.value = i >= 0 ? i : 0;
}

function selectPoint(i: number) {
  selIdx.value = i;
}
function openProfile() {
  const id = cur.value.id;
  if (id) uni.navigateTo({ url: `/pages/profile/detail?id=${id}` });
  else uni.navigateTo({ url: '/pages/profile/detail' });
}
/* 2026-10-09 删除空的 toggleHeat()：热力图图层未实装，留一个点不动的假开关不如不留。
   右上角胶囊已改为图例标签「记录条数」，点击弹档位说明。 */
</script>

<style scoped>
.s2 {
  min-height: 100vh;
  background: #f0ebdf;
  /*
   * 底部留空（2026-10-11 用户报障「窗口一变矮，底部数据就看不见」）：
   * 自绘 TabBar 是 fixed 浮层（高 128rpx），而本页原先没有任何底部内边距 →
   * 档位胶囊正好落在它身下，**滚到底也还是被盖住**（实测：胶囊 top 589/bottom 620，
   * TabBar 占 556–620 → 四颗胶囊整条不可见）。这里按首页 `.paw-page--tabbed`
   * 的同一口径补 200rpx：胶囊完整露出，且与 TabBar 之间留 ~72rpx 手账空隙。
   * ⚠️ 必须配 `box-sizing: border-box`：默认 content-box 下 `min-height:100vh`
   * 只约束内容盒、padding 再额外加高 200rpx → 短窗口里页面底部凭空多出一段
   * 空白色（实测滚到底后胶囊距 TabBar 145px，而非预期的 36px）。
   */
  box-sizing: border-box;
  padding-bottom: 200rpx;
}

/* ============ 自绘导航 ============ */
.nav {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding-top: calc(var(--status-bar-height) + 48rpx);
  box-sizing: content-box;
  position: relative;
}
/* #ifdef H5 */
.nav {
  padding-top: 134rpx;
}
/* #endif */
.nav-title {
  margin-left: 40rpx;
  font-size: 48rpx;
  font-weight: 700;
  color: #3c4036;
}
.heat-btn {
  position: absolute;
  right: 50rpx;
  /* 设计稿：按钮顶边 144rpx（72pt），与标题文字盒顶边对齐 */
  top: calc(var(--status-bar-height) + 144rpx);
  width: 215rpx;
  height: 72rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  background: #faf8f1;
  border: 1px solid #e2dcca;
  border-radius: 36rpx;
}
.heat-ico {
  width: 41rpx;
  height: 47rpx;
  margin-left: 10rpx;
  background: #c58a6e;
  border-radius: 12rpx;
  flex-shrink: 0;
}
.heat-txt {
  margin-left: 12rpx;
  font-size: 24rpx;
  color: #56674e;
}

/* ============ 手绘底图 ============ */
/* 地图高度 941rpx → 847rpx（2026-10-11 用户指定刻意偏离：设计稿 p4 实测高度 941rpx
   〔≈470.5 CSS px〕，用户反馈「地图长度占比过大，减少 10%」→ 941×0.9 ≈ 847rpx。
   两态一致：真实地图与手绘兜底帧同高，屏内比例不因底图来源而变。
   ⚠️ 由此 S2 屏不再严格等于设计稿比例 → 已在核对文档登记为「用户指定刻意偏离」
   （同类：底导 2pt / S7 文案 / S3 去狗 / S2 胶囊与三色档位）。
   手绘底图内部元素全部「顶边锚定」，最高到 835rpx（b6 街区底边）→ 847 内仍完整；
   唯一溢出的是贴底的「记录条数图例」（原 top 876rpx），已同步上移到 782rpx
   （保持原来的 5rpx 底距）——见 .legend。 */
.map {
  position: relative;
  height: 847rpx;
  background: #e6e0d2;
  overflow: hidden;
}
/* 真实地图：容器宽高必须写直接量（勿用百分比，否则地图不渲染）；
   轻微降饱和 + 暖色滤镜，让腾讯矢量底图与「米绿手账」风融合 */
.map--real {
  width: 750rpx;
  height: 847rpx;
  filter: saturate(0.72) sepia(0.14) brightness(1.02);
}

/* 地图外框 + 4 角胶带（两态通用，2026-10-08 用户指定加的装饰）：
   - .map-frame 承担原 .map 的 margin-top，并提供定位上下文
   - ::before 在地图元素之上画一圈「苔绿虚线」手账描边
   - 4 个 .map-tape 斜贴 4 角 —— 半透明暖色胶带（复用 .paw-tape 的 #dfcf9f 系），
     留 22% 透光：既像真胶带，也保证左下角的腾讯 logo / 审图号透出来仍可辨（地图合规） */
.map-frame {
  position: relative;
  margin-top: 14rpx;
}
.map-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 2rpx dashed #5e6e5c;
  border-radius: 8rpx;
  pointer-events: none;
  z-index: 10;
}
.map-frame .map {
  box-shadow: 0 2rpx 8rpx rgba(60, 64, 54, 0.1);
}
.map-tape {
  position: absolute;
  width: 128rpx;
  height: 24rpx;
  border-radius: 2rpx;
  /* 半透明胶带：底色 + 极淡竖向丝纹，模拟和纸胶带的纤维感 */
  background:
    repeating-linear-gradient(90deg, rgba(255, 253, 244, 0.1) 0 8rpx, rgba(255, 253, 244, 0) 8rpx 15rpx),
    linear-gradient(180deg, rgba(236, 226, 194, 0.8) 0%, rgba(222, 205, 158, 0.8) 55%, rgba(205, 185, 134, 0.8) 100%);
  box-shadow: 0 1rpx 3rpx rgba(60, 64, 54, 0.16);
  pointer-events: none;
  z-index: 11;
}
/* 上边缘两条：横贴，骑跨顶部虚线框 */
.map-tape--tl { top: -10rpx; left:  56rpx; transform: rotate(-4deg); }
.map-tape--tr { top: -10rpx; right: 56rpx; transform: rotate( 3deg); }
/* 下边缘两条：同样横贴，但整体压在底部虚线框「外侧」（只骑跨 ~2rpx）。
   原因：底部内侧横向被「记录条数图例」（x 235–354，底边 y 586）与「腾讯 logo + 审图号」
   （x 8–262、底边 y 586）占满，骑跨多了会压住设计元素与地图合规署名（实测骑跨 7rpx 时图例圆角被切）。 */
.map-tape--bl { bottom: -16rpx; left:  56rpx; transform: rotate( 4deg); }
.map-tape--br { bottom: -16rpx; right: 56rpx; transform: rotate(-3deg); }
/* 定位可信度控件（2026-10-10 晚）：贴在真实地图右上角。
   选右上：底部内侧已被「腾讯 logo + 审图号」（横向占掉左侧大半）与虚线框占用，
   右上只有角上的胶带（骑跨 2rpx），24rpx 内缩即无冲突；
   演示帧（无定位）整块 v-if 不渲染 → 像素基线与手绘底图零影响。 */
.map-ctrl {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  z-index: 12;              /* 盖过虚线框(10)与胶带(11) */
}
.map-ctrl-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 44rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: rgba(250, 248, 241, 0.94);
  border: 2rpx solid rgba(143, 160, 139, 0.75);
  box-shadow: 0 2rpx 6rpx rgba(60, 64, 54, 0.18);
}
.map-ctrl-ico {
  font-size: 24rpx;
  line-height: 1;
  color: #4a6ea8;
  margin-right: 8rpx;
}
.map-ctrl-txt {
  font-size: 20rpx;
  line-height: 1;
  color: #3c4036;
}
.blk {
  position: absolute;
  background: #dfe2d2;
  border-radius: 24rpx;
}
.road {
  position: absolute;
}
.road--v {
  left: 310rpx; top: 0; width: 32rpx; height: 100%;
  background: #f4efe4;
}
.road--h1 {
  left: 0; right: 0; top: 260rpx; height: 36rpx;
  background: #f6f1e7;
}
.road--h2 {
  left: 0; right: 0; top: 569rpx; height: 32rpx;
  background: #f4f0e5;
}
.mk {
  position: absolute;
  width: 15rpx;
  height: 15rpx;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 4rpx #faf8f1;
}
.mk--on {
  width: 24rpx;
  height: 24rpx;
  background: #55684f;
}

/* 记录条数图例 */
.legend {
  position: absolute;
  right: 42rpx;
  /* 876rpx → 782rpx（2026-10-11）：地图高度减到 847rpx 后，原「贴底 5rpx」会溢出被裁，
     这里整体上移 94rpx，保持与设计稿同样的「距地图底边 5rpx」关系。 */
  top: 782rpx;
  width: 238rpx;
  height: 60rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  background: #f7f5ed;
  border-radius: 16rpx;
}
.lg-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  margin-left: 16rpx;
  flex-shrink: 0;
}
.lg-dot:first-child {
  margin-left: 10rpx;
}
.lg-txt {
  margin-left: 16rpx;
  font-size: 20rpx;
  color: #8b8779;
}

/* ============ 选中点位卡 ============ */
/*
 * 顶部留空（2026-10-11 用户诉求「这一部分（点位卡 + 档位胶囊）可以稍微移下来一点，
 * 跟地图之间有一点空隙就行」）：原 `margin:0 42rpx` 顶部为 0 → 卡片紧贴地图底边，
 * 视觉上像被地图压着。补 40rpx（=20 CSS px，与卡片左右 42rpx 内缩同量级）后，
 * 卡片与地图之间留出手账空隙；底部两条胶带（.map-tape--bl/br，bottom:-16rpx）
 * 正好落在空隙里，不会被卡片压住。
 * ⚠️ 这是又一处「用户指定刻意偏离」（S2 屏整体高度 +40rpx）→ 已在核对文档第四十二章登记，
 * 与地图高 941→847rpx 同类；S2 像素基线本就不再作验收依据（走 DOM 断言）。
 */
.point-card {
  position: relative;
  margin: 40rpx 42rpx 0;
  height: 256rpx;
  background: #faf8f1;
  border-radius: 32rpx;
}
.photo {
  position: absolute;
  left: 26rpx;
  top: 56rpx;
  width: 143rpx;
  height: 143rpx;
  border-radius: 20rpx;
  background: #e6e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}
.photo-txt {
  font-size: 24rpx;
  color: #73767e;
}
/* 真实档案照（2026-10-07）：无照片时保持设计稿的占位文案块 */
.photo-img {
  width: 100%;
  height: 100%;
  border-radius: 20rpx;
}
.col {
  position: absolute;
  left: 194rpx;
  top: 0;
  right: 0;
}
.card-title {
  display: block;
  margin-top: 28rpx;
  font-size: 30rpx;
  line-height: 42rpx;
  font-weight: 600;
  color: #3c4036;
}
.meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 30rpx;
  color: #8b8779;
}
.sub {
  display: block;
  margin-top: 7rpx;
  font-size: 22rpx;
  line-height: 30rpx;
  color: #6e6f58;
}
.sub-loc {
  color: #786552;
}
.btn {
  margin-top: 13rpx;
  width: 239rpx;
  height: 64rpx;
  border-radius: 32rpx;
  background: #55684f;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-txt {
  font-size: 24rpx;
  color: #fff;
}

/* ============ 筛选胶囊 ============ */
.chips {
  display: flex;
  margin: 3rpx 0 0 40rpx;
}
.chip {
  width: 103rpx;
  height: 63rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #faf8f1;
  border: 1px solid #e2dcca;
  box-sizing: border-box;
  font-size: 24rpx;
  color: #6e6f58;
}
.chip--on {
  background: #55684f;
  border-color: #55684f;
  color: #fff;
}
/* 档位色点（与 marker 颜色同源；选中态墨绿底上依然可辨） */
.chip-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  margin-right: 8rpx;
  flex-shrink: 0;
}
/* 该档位 0 只 → 置灰不可点 */
.chip--off {
  opacity: 0.4;
}
</style>
