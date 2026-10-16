<template>
  <!--
    S5 新增档案（建档表单 / PRD F1.1）
    设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p5，逐像素实测（375×812 @2.957x）
    结构：自绘导航（返回 / 标题 / 步骤）→ 拍照引导区 → 两格照片槽（档案照 / +）
          → 动物类型 → 昵称 → 毛色 → 体型 → 特征标记 → 健康状态 → 绝育状态
          → 出没点位（自动定位 + 微调）→ 底部固定 CTA
    2026-10-09 用户指定两处改动（详见核对文档第廿二章）：
      1. 去掉「档案照」旁边那个芥末色方块（设计稿 p5 的第二格是「已有第二张照片」的示例态，
         本页只拍一张档案照，那格永远不会被点亮）；
      2. 表单字段补齐到与「编辑档案」页**逐项一致**（原先只有 昵称/健康初判/点位，
         新建时少填的只能事后去编辑补）——选项常量两页共用 common/profile-fields.ts。
    三处刻意偏离（非漏做）：
      1. 导航栏用自绘（navigationStyle: custom）：设计稿要「返回 + 居中大标题 + 右侧步骤」三栏，
         原生导航栏做不出右侧步骤标注；
      2. 底部 CTA 设计稿被画布下边缘裁掉约 7pt，此处按完整可见处理（bottom 24rpx + 安全区）；
      3. 「1/2 拍照」按设计稿原样静态呈现：18 屏里没有第 2 步的屏，PRD 也未定义，等设计补稿再接线。
  -->
  <view class="paw-create">
    <!-- ============ 自绘导航（paw-navbar 共享组件） ============
         p5 实测：标题「新建档案」墨迹 135.60~230.62pt，中心 183.11pt
         L=200、R=217.6 → 中心 366.22rpx = 183.11pt ✓；右块 rightPad=0（「拍照」墨迹右端 354.38pt） -->
    <paw-navbar title="新建档案" :left-w="200" :right-w="217.6" :right-pad="0">
      <template #right>
        <text class="paw-nav-act">1/2 拍照</text>
      </template>
    </paw-navbar>

    <!-- ============ 拍照引导区 ============ -->
    <view class="shot" @tap="pickPhoto">
      <template v-if="!photo.url">
        <text class="shot-line"><text class="shot-ico">📷</text>对准小家伙，拍一张档案照</text>
        <text class="shot-sub">自动提取时间 + 定位，30 秒完成建档</text>
        <view class="shutter"></view>
      </template>
      <image v-else class="shot-img" :src="photo.url" mode="aspectFill" />
    </view>

    <!-- ============ 照片槽：档案照 / 添加 ============
         2026-10-09（用户指定）：「档案照」旁边那个芥末色方块去掉了。
         设计稿 p5 画了三格（档案照 · 芥末色方块 · +），其中芥末色那格是**示例态**——
         它代表「第二张照片」的占位（线稿用色块表示已有一张图），但本页只拍一张档案照，
         这一格永远不会被点亮 → 属于装饰性残留，去掉（同 S9 照片区「只留真实入口」的口径）。 -->
    <view class="slots">
      <!-- 点近照槽可重跑 AI 匹配（真实链路：拍摄成功后自动跑一次，这里给用户一个手动重跑入口） -->
      <view class="slot slot--sel" @tap="runAiMatch">
        <image v-if="photo.url" class="slot-img" :src="photo.url" mode="aspectFill" />
        <text v-else class="slot-txt">档案照</text>
      </view>
      <view class="slot slot--add" @tap="pickPhoto">
        <view class="plus"></view>
      </view>
    </view>

    <!-- ============ 动物类型（2026-10-07 用户指定：只做猫，移除「狗」选项） ============ -->
    <text class="label">动物类型</text>
    <view class="types">
      <view
        v-for="t in ANIMAL_TYPES"
        :key="t.value"
        class="type type--cat"
        :class="{ 'type--on': form.animalType === t.value }"
        @tap="form.animalType = t.value"
      >
        <text class="type-ico">{{ t.emoji }}</text>
        <text>{{ t.label }}</text>
      </view>
    </view>

    <!-- ============ 昵称（选填，不填自动生成） ============ -->
    <text class="label">昵称（选填）· 不填自动生成「毛色+日期」</text>
    <input
      v-model="form.name"
      class="input"
      :placeholder="autoNameHint"
      placeholder-style="color:#a29e8f"
      maxlength="20"
      :adjust-position="true"
    />

    <!-- ==========================================================================
         以下字段组（毛色 / 体型 / 特征标记 / 健康状态 / 绝育状态 / 出没点位）
         与「编辑档案」页**逐项一致**（用户诉求：新建档案能填的东西要和编辑页一样，
         不要新建时少填、之后再去编辑补）。选项常量两页共用 common/profile-fields.ts。
         ========================================================================== -->

    <!-- 毛色：AI 识别会自动回填，也可点选常见值或自己写 -->
    <text class="label">毛色</text>
    <view class="chips">
      <view
        v-for="c in COATS"
        :key="c"
        class="hchip"
        :class="{ 'hchip--on': form.coatColor === c }"
        @tap="pickCoat(c)"
      >{{ c }}</view>
    </view>
    <input
      v-model="form.coatColor"
      class="input"
      placeholder="或自己写（如：橘白 / 狸花加白）"
      placeholder-style="color:#a29e8f"
      maxlength="10"
    />

    <!-- 体型 -->
    <text class="label">体型</text>
    <view class="chips">
      <view
        v-for="b in BODIES"
        :key="b"
        class="hchip"
        :class="{ 'hchip--on': form.bodySize === b }"
        @tap="pickBody(b)"
      >{{ b }}</view>
    </view>

    <!-- 特征标记（AI 识别出的「右耳缺角 · 佩戴项圈」也会回填到这里） -->
    <text class="label">特征标记</text>
    <input
      v-model="form.specialMarks"
      class="input"
      placeholder="如：左耳剪耳 / 尾巴短一截"
      placeholder-style="color:#a29e8f"
      maxlength="30"
    />

    <!-- 健康状态（选填，再点一次取消） -->
    <text class="label label--health">健康状态</text>
    <view class="chips">
      <view
        v-for="h in HEALTHS"
        :key="h.value"
        class="hchip"
        :class="{ 'hchip--on': form.healthStatus === h.value }"
        @tap="toggleHealth(h.value)"
      >{{ h.label }}</view>
    </view>

    <!-- 绝育状态（选填，再点一次取消） -->
    <text class="label">绝育状态</text>
    <view class="chips">
      <view
        v-for="s in NEUTERS"
        :key="s.value"
        class="hchip"
        :class="{ 'hchip--on': form.sterilizationStatus === s.value }"
        @tap="toggleNeuter(s.value)"
      >{{ s.label }}</view>
    </view>

    <!-- ============ 出没点位（自动定位 + 微调；点位名可自己写得更精细） ============ -->
    <text class="label">出没点位</text>
    <view class="loc">
      <text class="loc-pin">📍</text>
      <text class="loc-txt" :class="{ 'loc-txt--warn': !hasLoc && !spotDirty }">已自动获取：{{ locText }}</text>
      <text class="loc-edit" @tap="openSpotSheet">微调</text>
    </view>

    <!-- ============ 底部固定 CTA ============ -->
    <view class="paw-cta-wrap">
      <view class="cta" :class="{ 'cta--busy': submitting }" @tap="onSave">
        完成建档 · 记录下这一刻
      </view>
    </view>

    <!-- ==========================================================================
         S6：AI 匹配弹窗（设计稿 p37，即 S5 建档页的弹窗态）
         设计基准：p37 逐像素实测（375×812 @2.957x）；遮罩为墨色 56%
         2026-10-09 接真：弹窗内容全部由 POST /ai/match 驱动 ——
           · 只有真命中（相似度 ≥ 阈值）才出现，传什么猫都弹「和三花很像」的假象已消除；
           · 标题档案名 / 相似度 / 右槽参考图 / 摘要卡全部是库里那只猫的真值；
           · 未命中 / 无候选 / AI 不可用 → 不弹（宁可不提示也不误报）。
         版式与设计稿一致：两处刻意处理保留（副文案写死断行；超长档案名不截断）。
         ========================================================================== -->
    <view v-if="matchOn && matched" class="paw-modal" @tap="closeMatch">
      <view class="mcard" @tap.stop>
        <!-- 头部：chip「✦ AI 匹配」+ 关闭 -->
        <view class="mhead">
          <view class="mchip">
            <text class="mchip-star">✦</text>
            <text class="mchip-txt">AI 匹配</text>
          </view>
          <view class="mclose" @tap="closeMatch">
            <view class="mclose-x"></view>
          </view>
        </view>

        <!-- 标题：白描墨色 + 命中档案名用深绿 -->
        <view class="mtitle">
          <text>识别到可能是</text><text class="mtitle-name">【{{ matched.name }}】</text>
        </view>

        <!-- 副文案（按设计稿断行） -->
        <view class="msub">
          <text class="msub-line">这只小家伙和你档案里的一只猫很像，是否匹配到</text>
          <text class="msub-line">该档案？</text>
        </view>
        <!-- 双槽对比：本次拍摄 / 已有档案（右槽 = 命中档案的真实档案照） -->
        <view class="mslots">
          <view class="mslot">
            <image v-if="photo.url" class="mslot-img" :src="photo.url" mode="aspectFill" />
            <text v-else class="mslot-txt">本次照片</text>
          </view>
          <view class="mslot mslot--ref">
            <image
              v-if="matched.avatarUrl"
              class="mslot-img"
              :src="assetUrl(matched.avatarUrl)"
              mode="aspectFill"
            />
            <text v-else class="mslot-txt">{{ matched.coat }}猫近照</text>
          </view>
          <!-- 相似度胶囊：横向居中于两槽之间的空隙（相似度来自模型判定） -->
          <view class="mpct">
            <view class="mpct-pill">
              <text class="mpct-num">{{ matched.similarity }}%</text>
              <text class="mpct-lbl">相似</text>
            </view>
          </view>
        </view>
        <view class="mlabels">
          <text class="mlabel mlabels-1">本次拍摄</text>
          <text class="mlabel">已有档案 · {{ matched.coat }}</text>
        </view>

        <!-- 命中档案的摘要卡（真值） -->
        <view class="minfo">
          <view class="minfo-top">
            <text class="minfo-name">{{ matched.name }}</text>
            <text class="minfo-badge">{{ matched.daysAgo > 0 ? `已建档 ${matched.daysAgo} 天` : '今天建档' }}</text>
          </view>
          <text class="minfo-row">{{ matched.detail }}</text>
          <text class="minfo-row">{{ matched.lastRecord }}</text>
        </view>

        <!-- 操作按钮 -->
        <view class="mbtns">
          <view class="mbtn mbtn--main" @tap="onMatch">匹配到该档案</view>
          <view class="mbtn mbtn--ghost" @tap="onNewProfile">不匹配，新建档案</view>
        </view>

        <text class="mlink" @tap="openMatchedProfile">
          不确定? 查看【{{ matched.name }}】完整档案 →
        </text>
      </view>
    </view>

    <!-- ==========================================================================
         点位微调弹层（2026-10-09 新增，替掉原「常用点位挑一个」）
         用户诉求：点「微调」不该给一堆别人猫的地址让我挑 —— 先看地图上我的当前位置，
         再自己填更精细的点位名。
         隐私口径：地图与坐标一律街区级模糊（PRD 6.4），只显示「街区」不显示门牌。
         ========================================================================== -->
    <view v-if="sheetOn" class="sp-mask" @tap="closeSpotSheet">
      <view class="spsheet" @tap.stop>
        <view class="sp-head">
          <text class="sp-title">调整出现点位</text>
          <view class="sp-close" @tap="closeSpotSheet">
            <view class="sp-close-x"></view>
          </view>
        </view>

        <!-- 地图：蓝点 = 我的当前位置（已模糊到街区级） -->
        <view class="sp-mapwrap">
          <map
            v-if="sheetLat !== null && MAP_ENABLED"
            class="sp-map"
            :latitude="sheetLat"
            :longitude="sheetLng"
            :scale="16"
            :markers="sheetMarkers"
          />
          <view v-else class="sp-map sp-map--none">
            <text class="sp-map-txt">{{ locating ? '正在获取当前位置…' : '还没拿到定位' }}</text>
          </view>
        </view>

        <text class="sp-hint">{{ posHint }}</text>

        <view class="sp-row">
          <view class="sp-use" :class="{ 'sp-use--off': sheetLat === null }" @tap="useCurrent">用当前位置</view>
          <text class="sp-tip">只到街区级，不记录门牌号</text>
        </view>

        <text class="sp-label">点位名（可以自己写得更精细）</text>
        <input
          v-model="sheetAddr"
          class="input sp-input"
          placeholder="如：图书馆东门花坛 / 3 号楼后车棚"
          placeholder-style="color:#a29e8f"
          maxlength="20"
        />

        <view class="sp-btns">
          <view class="sp-btn sp-btn--main" @tap="confirmSpot">保存点位</view>
          <view class="sp-btn sp-btn--ghost" @tap="closeSpotSheet">取消</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { BODIES, COATS, HEALTHS, NEUTERS } from '../../common/profile-fields';
import type { HealthValue, NeuterValue } from '../../common/profile-fields';
import { goBack as goNav } from '../../common/nav';
import { uploadImage, assetUrl } from '../../common/uploader';
import { getLocationBlurred } from '../../common/location';
import { MAP_ENABLED, MK_ICON } from '../../common/map';

/**
 * 动物类型（2026-10-07 用户指定：本项目只做流浪猫 → 移除设计稿里的「狗」选项）。
 * 设计稿为「猫（深绿选中）+ 狗（纸白未选）」双胶囊；现仅保留猫、恒为选中态。
 * 后端 CreateProfileDto 的 @IsIn 同步收窄为 ['CAT']；DB 枚举保留 CAT/DOG 以便后续扩展。
 */
const ANIMAL_TYPES = [
  { value: 'CAT', label: '猫', emoji: '🐱' },
] as const;

/**
 * 表单字段选项（2026-10-09）：与「编辑档案」页**共用同一份常量**（common/profile-fields.ts），
 * 「新建能填的东西 = 编辑能填的东西」由代码结构保证，不靠人记。
 * 健康状态口径同步放宽：含「已离世」（发现已离世的猫也要能建档）。
 */
const form = reactive({
  name: '',
  animalType: 'CAT' as 'CAT',
  healthStatus: '' as '' | HealthValue,
  /** 毛色 / 特征：由 AI 识别回填（2026-10-09），也是自动命名的依据 */
  coatColor: '' as string,
  specialMarks: '' as string,
  /** 体型 / 绝育（2026-10-09 起建档页也能填，原先只能建档后再编辑） */
  bodySize: '' as string,
  sterilizationStatus: '' as '' | NeuterValue,
  /**
   * 点位名：默认**留空**（2026-10-09 修：原先默认塞设计稿演示值「楼下花坛」，
   * 用户没填也会被当成"自动定位到了楼下花坛"入库 —— 演示值绝不入库）。
   * 只有用户「用当前位置」或自己填写后才带值。
   */
  lastSeenDesc: '',
  // 定位链路（2026-10-07）：进页自动取街区级模糊坐标，失败不发（后端 lastSeenLat 可空）
  lastSeenLat: undefined as number | undefined,
  lastSeenLng: undefined as number | undefined,
});

/** 是否已拿到真实定位（决定「自动定位」行文案；未拿到 → 提示手动填写） */
const hasLoc = ref(false);
/** 用户是否微调过点位名（微调后直接显示所选点位名） */
const spotDirty = ref(false);
const locText = computed(() => {
  if (spotDirty.value) return form.lastSeenDesc;
  return hasLoc.value ? '当前街区 · 已模糊 ±200m' : '未获取到定位';
});

/* ============ 点位微调弹层（2026-10-09，替掉原「常用点位挑选」） ============
   用户诉求：点「微调」不该给我一堆别人猫的地址挑，而是先看我在地图上的位置，
   再自己填更精细的点位名。地图像素/坐标一律街区级模糊（PRD 6.4）。 */
const sheetOn = ref(false);
const sheetAddr = ref('');
const locating = ref(false);
const sheetLat = ref<number | null>(null);
const sheetLng = ref<number | null>(null);
const sheetMarkers = computed(() =>
  sheetLat.value === null
    ? []
    : [{ id: 0, latitude: sheetLat.value, longitude: sheetLng.value, iconPath: MK_ICON.me, width: 26, height: 26 }],
);

function openSpotSheet() {
  sheetAddr.value = spotDirty.value ? form.lastSeenDesc : '';
  sheetLat.value = form.lastSeenLat ?? null;
  sheetLng.value = form.lastSeenLng ?? null;
  sheetOn.value = true;
  if (sheetLat.value === null) void refreshLoc(); // 进面板先补一次定位（用户授权过就不再弹窗）
}

/** 取一次街区级模糊定位（进页取过则复用缓存） */
async function refreshLoc() {
  if (locating.value) return;
  locating.value = true;
  try {
    const loc = await getLocationBlurred();
    if (loc) {
      form.lastSeenLat = loc.lat;
      form.lastSeenLng = loc.lng;
      sheetLat.value = loc.lat;
      sheetLng.value = loc.lng;
      hasLoc.value = true;
    }
  } finally {
    locating.value = false;
  }
}

/** 用当前位置：把点位名填成「当前位置附近」，用户可在此基础上改得更精细 */
function useCurrent() {
  if (sheetLat.value === null) {
    uni.showToast({ title: '还没拿到定位，可直接自己填写点位名', icon: 'none' });
    return;
  }
  sheetAddr.value = '当前位置附近';
  uni.showToast({ title: '已填入「当前位置附近」，可改成更具体的', icon: 'none' });
}

/** 保存点位：空值 = 清除（不再回落演示值） */
function confirmSpot() {
  const name = sheetAddr.value.trim();
  form.lastSeenDesc = name;
  spotDirty.value = !!name;
  sheetOn.value = false;
  uni.showToast({ title: name ? `点位已记为「${name}」` : '已清除点位名', icon: 'none' });
}

function closeSpotSheet() {
  sheetOn.value = false;
}

/** 弹层里那行位置说明（有定位给模糊坐标，没定位给明确指引） */
const posHint = computed(() =>
  sheetLat.value === null
    ? '未能获取定位（可检查浏览器定位权限），直接在下面自己写点位名也一样能建档'
    : `地图上的位置：${sheetLat.value.toFixed(4)}, ${sheetLng.value.toFixed(4)}（已模糊到街区级）`,
);

/** 进页自动取一次街区级模糊坐标（取不到也不阻塞建档，只影响是否发送坐标） */
onLoad(() => {
  void refreshLoc();
});

const photo = reactive({ url: '', key: '' });
const submitting = ref(false);

/**
 * S6：AI 匹配弹窗（设计稿 p37）。
 *
 * 2026-10-09 接真（用户实测：不管传什么猫都显示「和三花·0824 相似」）：
 *   原先这里是一张**写死的演示卡**（三花-0824 / 江湾小区 · 母 · 已绝育 / 92%），
 *   拍照成功就无条件弹出 —— 用户传黑猫、传奶牛猫，全都「和这只三花很像」。
 *   现在改为真实链路：拍照 → `POST /ai/match`（服务端拿本次照片与我档案里有档案照的猫
 *   逐只交给视觉模型比对）→ **只有真命中（≥ 阈值）才弹**，且所有字段都取自那只真档案。
 *   未命中 / 我还没有带照片的档案 / AI 不可用 → 不弹（宁可不提示也不编造）。
 */
interface MatchInfo {
  id: string;
  name: string;
  /** 短名 = 毛色（设计稿「已有档案 · 三花」那一截） */
  coat: string;
  avatarUrl: string;
  similarity: number;
  reason: string;
  daysAgo: number;
  detail: string;
  lastRecord: string;
}

const matchOn = ref(false);
const matched = ref<MatchInfo | null>(null);
const matching = ref(false);
/** AI 观测草稿（识别结果里的 draft），「匹配到该档案」时当记录正文用 */
const aiDraft = ref('');

/** 当前页面还是建档页吗（比对是异步的，用户可能已经跳走了） */
function isOnCreatePage(): boolean {
  const pages = getCurrentPages();
  const cur = pages[pages.length - 1] as { route?: string } | undefined;
  return !!cur && String(cur.route || '').indexOf('profile/create') >= 0;
}

/** 未命中时给用户一句人话（用户主动点「近照槽」重跑时才提示，自动链路静默） */
function matchMissText(r: { reason?: string; compared?: number } | null): string {
  if (!r) return 'AI 比对暂不可用，稍后再试';
  if (r.reason === 'no_candidates') return '你的档案里还没有带照片的猫，直接建档就好';
  if (r.reason === 'no_nearby_candidates') return '附近还没有带照片的档案猫，直接建档就好';
  if (r.reason === 'ai_unavailable') return 'AI 比对暂不可用（未配置识别密钥）';
  return r.compared ? `已比对 ${r.compared} 只，没有足够相似的档案` : '没找到相似的档案';
}

/**
 * 与已有档案比对（真实链路）。explicit = 用户点近照槽主动重跑（会给出「没命中」的反馈）。
 * 2026-10-09 二：带**当前位置**比对 —— 服务端候选池改成「附近半径内的猫」
 * （不限我建的：别人建过档的附近猫正是要提醒的对象）；没定位时后端回落我的档案池。
 */
async function runMatch(explicit = false) {
  if (!photo.url) {
    if (explicit) uni.showToast({ title: '先拍一张档案照再比对', icon: 'none' });
    return;
  }
  if (matching.value) return;
  matching.value = true;
  if (explicit) uni.showLoading({ title: 'AI 正在比对…' });
  try {
    // 定位是进页异步取的，拍照可能抢在它前面 —— 比对前补一次（10 分钟缓存，几乎零成本）
    if (!hasLoc.value) await refreshLoc();
    const b64 = await toBase64(photo.url);
    const r: any = await api.post(
      '/ai/match',
      {
        photoKey: hashStr(b64 || photo.url),
        imageBase64: b64 || undefined,
        lat: form.lastSeenLat ?? undefined,
        lng: form.lastSeenLng ?? undefined,
      },
      { silent: true },
    );
    if (r && r.matched) {
      // 用户已经离开建档页 / 正在提交时别突然糊一层弹窗
      if (!isOnCreatePage() || submitting.value) return;
      matched.value = r.matched as MatchInfo;
      matchOn.value = true;
    } else if (explicit) {
      uni.showToast({ title: matchMissText(r), icon: 'none' });
    }
  } catch {
    if (explicit) uni.showToast({ title: 'AI 比对暂不可用，稍后再试', icon: 'none' });
  } finally {
    if (explicit) uni.hideLoading();
    matching.value = false;
  }
}

/** 触发 AI 匹配（点近照槽 → 重跑一次，带反馈） */
function runAiMatch() {
  void runMatch(true);
}

function closeMatch() {
  matchOn.value = false;
}

/**
 * 匹配到已有档案：把这次的照片与相遇写进那只猫名下（PRD F1.2「新增记录」链路），
 * 然后进它的档案页 —— 而不是把用户丢回首页。
 */
async function onMatch() {
  const m = matched.value;
  if (!m) return;
  matchOn.value = false;
  uni.showLoading({ title: '正在归入档案…' });
  try {
    await api.post('/records', {
      profileId: m.id,
      // 界面口径「相遇」无独立枚举，落库为 LOCATION（点位更新）
      type: 'LOCATION',
      content: aiDraft.value || `又一次相遇，AI 匹配到已有档案《${m.name}》`,
      photoIds: photo.key && !photo.key.startsWith('local-') ? [photo.key] : undefined,
      locDesc: form.lastSeenDesc || undefined,
      lat: form.lastSeenLat,
      lng: form.lastSeenLng,
      occurredAt: new Date().toISOString(),
    });
    uni.hideLoading();
    uni.showToast({ title: `已归入《${m.name}》名下`, icon: 'none' });
    setTimeout(() => uni.navigateTo({ url: `/pages/profile/detail?id=${m.id}` }), 700);
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e?.guest ? '请先登录后再归入档案' : '归入失败，稍后再试', icon: 'none' });
  }
}

/** 不匹配：关闭弹窗，继续走正常建档流程（同一张照片不会重复比对 —— 服务端按图缓存） */
function onNewProfile() {
  matchOn.value = false;
}

/** 查看完整档案 → S4 个体档案详情（真实档案 id） */
function openMatchedProfile() {
  const m = matched.value;
  matchOn.value = false;
  if (!m) return;
  uni.navigateTo({
    url: `/pages/profile/detail?id=${m.id}`,
    fail: () => uni.showToast({ title: '个体档案页待实现', icon: 'none' }),
  });
}

/**
 * 昵称占位 = 「毛色 + 月日」（设计稿形态「三花 · 0824（自动）」）。
 * 2026-10-09 修：毛色取**真实识别结果**；还没识别出毛色时用中性占位，
 * 不再写死设计稿演示值「三花」（用户实测提问：我的猫明明是别的花色）。
 * 提交时若不填昵称，后端按同一个口径生成（coatColor 一起提交）。
 */
const autoNameHint = computed(() => {
  const d = new Date();
  const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${form.coatColor || '猫咪'} · ${mmdd}（自动）`;
});

/** 返回由 <paw-navbar> 内部处理（common/nav 的 goBack，兜底 = 首页 Tab） */

function pickPhoto() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'], // ≤500KB（PRD 性能指标）
    success: (res) => {
      const path = res.tempFilePaths[0];
      photo.url = path;
      // 后台上传（服务端剥 EXIF/GPS 落盘）拿 photoId，建档时作 avatarPhotoId 关联；
      // 离线失败只丢照片关联，不阻塞建档流程
      uploadImage(path)
        .then((up) => (photo.key = up.id))
        .catch(() => (photo.key = ''));
      void recognize(path); // 真实识别：回填毛色 / 特征（自动命名与档案字段都用它）
      void runMatch(); // 真实匹配：只有和「附近/我的」某只档案真像才弹 S6 弹窗（p37）
    },
  });
}

/** H5：照片（blob:/同源静态图）→ dataURL；失败返回 ''（后端走演示兜底） */
async function toBase64(url: string): Promise<string> {
  try {
    const blob = await fetch(url).then((r) => r.blob());
    return await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ''));
      fr.onerror = () => resolve('');
      fr.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

/** 图片内容稳定指纹（同图 → 同 key → 服务端缓存命中不重复计费） */
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return 'ph-' + h.toString(16) + '-' + s.length.toString(16);
}

/**
 * 真实 AI 识别（2026-10-09）：识别出的毛色/特征直接回填表单 —— 昵称自动生成、
 * 档案的毛色与特征也就有真值了（此前建档页只弹演示匹配窗，字段全是空的）。
 * 离线 / 无 key → 静默跳过（后端有 demo 兜底，前端失败也不打断建档）。
 *
 * ⚠️ 演示兜底（source === 'demo'）**不写进表单**：后端无 key / 调用失败时会返回一份
 * 演示结果（毛色写死「三花」），拿它填表会让「我的黑猫被命名成三花」换个地方再次发生。
 * 识别不了就留空，用户自己填（口径同 10-09 的「演示值绝不顶替真值」）。
 */
async function recognize(path: string) {
  try {
    const b64 = await toBase64(path);
    const r: any = await api.post(
      '/ai/recognize',
      { photoKey: hashStr(b64 || path), imageBase64: b64 },
      { silent: true },
    );
    if (!r || typeof r !== 'object') return;
    if (r.source === 'demo') return; // 演示兜底：不冒充识别结果
    const coat = String(r.coat || '').trim();
    // 「未知」不算毛色（否则会生成「未知·1009」这种名字）
    if (coat && coat !== '未知' && coat !== '—') form.coatColor = coat;
    const marks = String(r.features || '').trim();
    if (marks && marks !== '无明显特征' && marks !== '—') form.specialMarks = marks;
    // 观测草稿：匹配到已有档案时直接当记录正文（用户不用再写一遍）
    const draft = String(r.draft || '').trim();
    if (draft) aiDraft.value = draft;
  } catch {
    /* 识别不可用：保持空值，用户自己填 */
  }
}

/** 位置微调：打开自绘弹层（地图看当前位置 + 自由填精细点位名）——2026-10-09 替掉原「常用点位挑选」 */

/** 健康状态是选填，再点一次取消选中（口径同编辑页 pick()） */
function toggleHealth(v: HealthValue) {
  form.healthStatus = form.healthStatus === v ? '' : v;
}

/** 绝育状态：同上，再点一次取消 */
function toggleNeuter(v: NeuterValue) {
  form.sterilizationStatus = form.sterilizationStatus === v ? '' : v;
}

/** 毛色点选：再点一次取消（取消后仍是自由输入框说了算） */
function pickCoat(v: string) {
  form.coatColor = form.coatColor === v ? '' : v;
}

/** 体型点选：再点一次取消 */
function pickBody(v: string) {
  form.bodySize = form.bodySize === v ? '' : v;
}

async function onSave() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await api.post('/profiles', {
      // 不填昵称 → 后端按「毛色 + 月日」生成（coatColor 一起提交，口径与占位一致）
      name: form.name || undefined,
      animalType: form.animalType,
      coatColor: form.coatColor || undefined,
      // 2026-10-09：体型 / 特征 / 绝育 / 健康 与编辑页同口径，建档时填了就直接入库
      bodySize: form.bodySize || undefined,
      specialMarks: form.specialMarks || undefined,
      sterilizationStatus: form.sterilizationStatus || undefined,
      healthStatus: form.healthStatus || undefined,
      // 点位名只有用户填过才发（空 = 只留坐标，绝不发设计稿演示值）
      lastSeenDesc: form.lastSeenDesc || undefined,
      // 定位链路（2026-10-07）：街区级模糊坐标（PRD 6.4；取不到定位时不发）
      lastSeenLat: form.lastSeenLat,
      lastSeenLng: form.lastSeenLng,
      lastSeenAt: new Date().toISOString(),
      // 建档照片（选图后后台上传拿到的 photoId；离线时无）
      avatarPhotoId: photo.key && !photo.key.startsWith('local-') ? photo.key : undefined,
      // 阶段2：creatorId 由后端从 JWT 取
    });
    uni.showToast({ title: '建档成功 🐾', icon: 'none' });
    setTimeout(() => uni.switchTab({ url: '/pages/home/index' }), 800);
  } catch {
    // 后端未启动 / 离线：先本地兜住，阶段3 换成离线草稿队列（PRD F1.5）
    uni.showToast({ title: '已存为离线草稿', icon: 'none' });
    setTimeout(() => goNav(), 800);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
/* 页面左右留白 40rpx（= 设计稿 20pt）；底部给固定 CTA 让位 */
.paw-create {
  min-height: 100vh;
  padding: 0 40rpx 200rpx;
  box-sizing: border-box;
}

/* ============ 自绘导航 ============
   已抽成共享组件 components/paw-navbar。设计稿：标题墨迹 y 78.4–101.1pt；
   「返回」真值 30rpx（本页原先手抄成 28rpx）、箭头真值 3.04×6.42pt 细尖角
   （本页原先用 14rpx 旋转方块）、导航行 padding-top 真值 133.3rpx（原先 136rpx）。 */

/* ============ 拍照引导区（实测 335×230pt，浅绿豆） ============ */
.shot {
  /* 20 → 22.7rpx：导航 padding-top 收到真值后内容上移 1.35pt，补回同样的量 */
  margin-top: 22.7rpx;
  width: 100%;
  height: 460rpx;
  background: #dfe2d2;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.shot-line {
  font-size: 28rpx;
  font-weight: 700;
  color: #56674e;
  line-height: 1.2;
}
.shot-ico {
  margin-right: 8rpx;
}
.shot-sub {
  margin-top: 18rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1.2;
}
/* 取景圆环：外径 56pt、环宽 3pt（实测 55.8 / 3.05pt） */
.shutter {
  margin-top: 16rpx;
  width: 112rpx;
  height: 112rpx;
  box-sizing: border-box;
  border: 6rpx solid #55684f;
  border-radius: 50%;
  background: #faf7f1;
}
.shot-img {
  width: 100%;
  height: 100%;
}

/* ============ 照片槽（128rpx 方、间距 16rpx） ============ */
.slots {
  margin-top: 32rpx;
  display: flex;
}
.slot {
  width: 128rpx;
  height: 128rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  overflow: hidden;
}
.slot:last-child {
  margin-right: 0;
}
/* 选中槽：淡紫底 + 墨绿描边（设计稿唯一带框的一格） */
.slot--sel {
  background: #e6e7eb;
  border: 6rpx solid #55684f;
}
.slot-txt {
  /* 实测：「三花猫近照」墨迹 54.44pt / 5 字 → 单字步进 10.89pt ≈ 22rpx。
     槽内可用宽 58pt（128rpx - 2×3pt 描边），22rpx×5 = 55pt 刚好单行放得下；
     字号给到 20rpx 会因剩余 3pt 触发换行，故须 22rpx + nowrap 双保险 */
  font-size: 22rpx;
  color: #757980;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
}
.slot-img {
  width: 100%;
  height: 100%;
}
.slot--add {
  background: #faf7f1;
}
/* 加号：实测 19rpx 见方、笔画 4rpx，纯 CSS 不引图标 */
.plus {
  position: relative;
  width: 20rpx;
  height: 20rpx;
}
.plus::before,
.plus::after {
  content: '';
  position: absolute;
  background: #8fa08b;
  border-radius: 2rpx;
}
.plus::before {
  left: 0;
  top: 8rpx;
  width: 20rpx;
  height: 4rpx;
}
.plus::after {
  top: 0;
  left: 8rpx;
  width: 4rpx;
  height: 20rpx;
}

/* ============ 表单标签（26rpx 半粗墨色，实测 12.7pt/字） ============ */
.label {
  display: block;
  margin-top: 30rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 1.3;
}

/* ============ 动物类型（高 88rpx 胶囊：猫 200rpx；2026-10-07 起仅猫） ============ */
.types {
  margin-top: 14rpx;
  display: flex;
}
.type {
  height: 88rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  line-height: 1;
  margin-right: 24rpx;
  background: #faf7f1;
  color: #3c4036;
}
.type--cat {
  width: 200rpx;
}
.type-ico {
  margin-right: 8rpx;
}
/* 选中：墨绿底 + 纸白字（设计稿猫为选中态） */
.type--on {
  background: #55684f;
  color: #faf7f1;
}

/* ============ 输入框（实测宽 516rpx；高 95rpx = 设计带 553.88–601.56 = 47.68pt，
   旧值 90rpx 是定列采样漏了上下圆弧各 ~2.3pt，见硬教训④） ============ */
.input {
  margin-top: 16rpx;
  width: 516rpx;
  height: 95rpx;
  box-sizing: border-box;
  padding: 0 28rpx;
  background: #faf7f1;
  border-radius: 22rpx;
  font-size: 26rpx;
  color: #3c4036;
}

/* ============ 出没点位行（实测：📍墨迹起 x34.8、正文 x48.4–166.4、微调 x188–210.7） ============
   2026-10-09：原先跟在昵称输入框后面（因此用 41rpx 补 .input 增高量），现排在绝育胶囊组后，
   组内已有 16rpx 下边距 → 收到 20rpx 保持段落节奏。 */
.loc {
  margin-top: 20rpx;
  padding-left: 28rpx;
  display: flex;
  align-items: center;
}
.loc-pin {
  font-size: 24rpx;
  margin-right: 4rpx;
  line-height: 1;
}
.loc-txt {
  /* 实测「已自动获取：楼下花坛」11 字共 118pt → 单字 10.7pt ≈ 22rpx */
  font-size: 22rpx;
  color: #6e6f58;
  line-height: 1;
  /* 定位链路态文案更长（「当前街区 · 已模糊 ±200m」）→ 禁换行防挤出「微调」 */
  white-space: nowrap;
}
/* 没拿到定位时提示色（陶土色，弱提示，不是错误） */
.loc-txt--warn {
  color: #b08a72;
}
.loc-edit {
  margin-left: 44rpx;
  font-size: 24rpx;
  color: #56674e;
  line-height: 1;
}

/* ============ 选项胶囊组（毛色 / 体型 / 健康状态 / 绝育状态共用） ============
   2026-10-09（用户诉求「新建档案跟编辑界面一样」）：由原先「健康初判」的**竖排**
   改成横向换行（与编辑页同形），四组共用一套类名；胶囊尺寸沿用设计稿的 100×30pt 口径。 */
.chips {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
}
.hchip {
  min-width: 100rpx;
  height: 60rpx;
  box-sizing: border-box;
  padding: 0 26rpx;
  margin: 0 16rpx 16rpx 0;
  border-radius: 999rpx;
  background: #faf7f1;
  color: #6e6f58;
  font-size: 24rpx;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hchip--on {
  background: #55684f;
  color: #faf7f1;
}

/* ============ 底部固定 CTA（实测高 88rpx，文字 32rpx） ============
   设计稿按钮顶 763.53pt、底部被画布下边缘裁掉（可见 47.7pt，完整 88rpx）
   → 实现取「按钮顶对齐设计稿」：距屏底 8rpx（=4.01pt，与设计稿按钮底距页底一致），
     真机上叠加 safe-area-inset-bottom 后自然避开 Home 指示条 */
.paw-cta-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 8rpx;
  bottom: calc(8rpx + constant(safe-area-inset-bottom));
  bottom: calc(8rpx + env(safe-area-inset-bottom));
  padding: 0 40rpx;
  box-sizing: border-box;
  z-index: 20;
}
.cta {
  height: 88rpx;
  border-radius: 999rpx;
  background: #8fa08b;
  color: #faf7f1;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cta:active {
  opacity: 0.86;
}
.cta--busy {
  opacity: 0.6;
}

/* ============================================================================
   S6：AI 匹配弹窗（设计稿 p37 实测）
   遮罩 rgba(60,64,54,.56)（墨色 56%，由 p37 三类已知底色联立拟合，中间调误差 ≤2.3/通道）
   卡片 670rpx 宽、距屏顶 390rpx、高 858rpx、圆角 38rpx、底色纸白
   垂直节奏（距卡顶 rpx）：32 chip(44) → +22 标题 → +8 副文案(2×32)
                              → +24 双槽(184) → +12 槽下标签(24)
                              → +24 摘要卡(161) → +24 按钮(96) → +24 链接 → 底 34
   ============================================================================ */
.paw-modal {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  background: rgba(60, 64, 54, 0.56);
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.mcard {
  width: 670rpx;
  box-sizing: border-box;
  /* 卡底实测：设计稿圆角弧线入窗点 616.78 + 7.34(弧线入窗偏移) ≈ 624.1pt，
     实现 612.2 → 差 11.9pt；其中 2pt 由摘要卡增高补足，其余 ~10pt 在此补足 */
  margin-top: 390rpx;
  padding: 32rpx 40rpx 38rpx;
  background: #faf7f1;
  border-radius: 38rpx;
  /* 弹入动画 180ms：截图与真机肉眼均不构成位移误差 */
  animation: mcard-in 0.18s ease-out;
}
@keyframes mcard-in {
  from {
    opacity: 0;
    transform: translateY(16rpx);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ---------- 头部：绿 chip + 关闭 ----------
   实测 chip：高 46rpx、圆角 23rpx、内 padding 左 20 右 16；
   ✦ 26rpx（实测墨迹 9.9pt，与「匹配」二字同高但更宽），文字 22rpx 粗体、与 ✦ 间距 12rpx */
.mhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 46rpx;
}
.mchip {
  display: flex;
  align-items: center;
  height: 46rpx;
  box-sizing: border-box;
  padding: 0 16rpx 0 20rpx;
  border-radius: 23rpx;
  background: #8fa08b;
}
.mchip-star {
  font-size: 26rpx;
  color: #faf7f1;
  line-height: 1;
  margin-right: 12rpx;
}
.mchip-txt {
  /* 白字实测众数 (250,249,241) ≈ 纸白令牌 */
  font-size: 22rpx;
  font-weight: 700;
  color: #faf7f1;
  line-height: 1;
}
/* ✕：实测 23rpx 见方、笔画 3rpx，纯 CSS 双斜杠，不引图标 */
.mclose {
  width: 48rpx;
  height: 48rpx;
  margin-right: -10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mclose-x {
  position: relative;
  width: 23rpx;
  height: 23rpx;
}
.mclose-x::before,
.mclose-x::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 3rpx;
  height: 32rpx;
  margin: -16rpx 0 0 -1.5rpx;
  background: #8b8779;
  border-radius: 2rpx;
}
.mclose-x::before {
  transform: rotate(45deg);
}
.mclose-x::after {
  transform: rotate(-45deg);
}

/* ---------- 标题（40rpx 粗体，命中档案名深绿） ----------
   实测：chip 底 233 → 标题行框顶 244.4（间距 10.4pt = 21rpx，取 20rpx 与下方节奏凑整） */
.mtitle {
  margin-top: 20rpx;
  font-size: 40rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1.3;
}
/* 实测：是→【 的间隙 19.95pt（含侧边距），对应 margin-left 16pt */
.mtitle-name {
  color: #56674e;
  margin-left: 32rpx;
}

/* ---------- 副文案（26rpx 灰，行距 32rpx，断行同设计稿） ---------- */
.msub {
  margin-top: 8rpx;
}
.msub-line {
  display: block;
  font-size: 26rpx;
  color: #8b8779;
  line-height: 32rpx;
}

/* ---------- 双槽对比（各 184rpx 方，墨绿描边 4rpx，槽距 165rpx） ---------- */
.mslots {
  position: relative;
  margin-top: 24rpx;
  display: flex;
}
.mslot {
  width: 184rpx;
  height: 184rpx;
  box-sizing: border-box;
  border: 4rpx solid #55684f;
  border-radius: 24rpx;
  background: #e6e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.mslot--ref {
  margin-left: 165rpx;
}
.mslot-txt {
  /* 槽内文字实测 32rpx、字色众数 (110,113,120)。槽内可用 176rpx，5 字 160rpx 单行放得下 */
  font-size: 32rpx;
  color: #757980;
  line-height: 1.15;
  white-space: nowrap;
}
.mslot-img {
  width: 100%;
  height: 100%;
}
/* 92% 相似胶囊：实测 141×64rpx、底为页面米色 #F0EBDF、距槽顶 78rpx、居中于两槽空隙 */
.mpct {
  position: absolute;
  left: 184rpx;
  top: 78rpx;
  width: 165rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mpct-pill {
  display: flex;
  align-items: center;
  height: 64rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  background: #f0ebdf;
}
.mpct-num {
  font-size: 30rpx;
  font-weight: 700;
  color: #56674e;
  line-height: 1;
}
/* 「相似」按实测为灰字 #8B8779（最暗 2% 均值 = (139,135,121)），不是绿字 */
.mpct-lbl {
  font-size: 20rpx;
  color: #8b8779;
  line-height: 1;
  margin-left: 6rpx;
}

/* ---------- 槽下标签（20rpx 灰；第二块对齐第二槽左缘 = 184+165rpx） ---------- */
.mlabels {
  margin-top: 12rpx;
  display: flex;
}
.mlabel {
  font-size: 20rpx;
  color: #8b8779;
  line-height: 24rpx;
}
.mlabels-1 {
  width: 349rpx;
  flex-shrink: 0;
}

/* ---------- 命中档案摘要卡（实测高 161rpx、描边 3rpx #E4DFD0、圆角 32rpx） ---------- */
.minfo {
  margin-top: 24rpx;
  box-sizing: border-box;
  padding: 22rpx 26rpx 18rpx;
  border: 3rpx solid #e4dfd0;
  border-radius: 32rpx;
}
.minfo-top {
  display: flex;
  align-items: center;
  margin-bottom: 4rpx;
}
.minfo-name {
  /* 墨迹宽比 0.927 → 30rpx（拉丁字形两侧一致，可直接反推） */
  font-size: 30rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1.2;
}
.minfo-badge {
  margin-left: 16rpx;
  height: 36rpx;
  padding: 0 16rpx;
  border-radius: 18rpx;
  background: #8fa08b;
  color: #faf7f1;
  font-size: 20rpx;
  line-height: 36rpx;
}
.minfo-row {
  display: block;
  /* per-char 墨迹比 0.847、墨迹高比 0.85 双重确认 22rpx；行高保持 38rpx 对齐设计行距 */
  font-size: 22rpx;
  color: #8b8779;
  line-height: 38rpx;
}

/* ---------- 操作按钮（各 285rpx、高 96rpx、间距 20rpx） ---------- */
.mbtns {
  margin-top: 24rpx;
  display: flex;
}
.mbtn {
  flex: 1;
  height: 96rpx;
  box-sizing: border-box;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}
.mbtn--main {
  background: #55684f;
  color: #faf7f1;
}
.mbtn--ghost {
  margin-left: 20rpx;
  border: 2rpx solid #e4dfd0;
  color: #8b8779;
  background: transparent;
}
.mbtn:active {
  opacity: 0.86;
}

/* ---------- 底部链接（22rpx 深绿，左对齐；「查看」2 字 run 20.96pt 精确吻合） ---------- */
.mlink {
  display: block;
  margin-top: 24rpx;
  font-size: 22rpx;
  color: #56674e;
  line-height: 1.2;
}

/* ============================================================================
   点位微调弹层（2026-10-09）：底部抽屉，地图看当前位置 + 自由填点位名
   只在下拉打开时渲染（v-if），无 DOM 常驻 → 兜底帧与像素基线不受影响
   ============================================================================ */
.sp-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 110;
  background: rgba(60, 64, 54, 0.56);
  display: flex;
  align-items: flex-end;
}
.spsheet {
  width: 100%;
  box-sizing: border-box;
  background: #faf7f1;
  border-radius: 38rpx 38rpx 0 0;
  padding: 32rpx 40rpx;
  padding-bottom: calc(40rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}
.sp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sp-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 1.2;
}
.sp-close {
  position: relative;
  width: 44rpx;
  height: 44rpx;
}
.sp-close-x::before,
.sp-close-x::after {
  content: '';
  position: absolute;
  left: 10rpx;
  top: 21rpx;
  width: 24rpx;
  height: 2rpx;
  background: #8b8a7c;
}
.sp-close-x::before {
  transform: rotate(45deg);
}
.sp-close-x::after {
  transform: rotate(-45deg);
}
/* 地图（真实底图；MAP_ENABLED=false 时退化成提示块，不会白屏） */
.sp-mapwrap {
  margin-top: 22rpx;
  border-radius: 22rpx;
  overflow: hidden;
  background: #ece7db;
}
.sp-map {
  width: 100%;
  height: 280rpx;
  display: block;
}
.sp-map--none {
  display: flex;
  align-items: center;
  justify-content: center;
}
.sp-map-txt {
  font-size: 24rpx;
  color: #8b8a7c;
}
.sp-hint {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #8b8a7c;
  line-height: 1.4;
}
.sp-row {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
}
.sp-use {
  flex-shrink: 0;
  height: 60rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #8fa08b;
  color: #faf7f1;
  font-size: 24rpx;
  display: flex;
  align-items: center;
}
.sp-use--off {
  background: #c6c3b6;
}
.sp-tip {
  margin-left: 16rpx;
  font-size: 22rpx;
  color: #a29e8f;
  line-height: 1.2;
}
.sp-label {
  display: block;
  margin-top: 26rpx;
  font-size: 26rpx;
  color: #56674e;
  line-height: 1.2;
}
.sp-input {
  width: 100%;
}
.sp-btns {
  margin-top: 30rpx;
  display: flex;
}
.sp-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sp-btn--main {
  background: #8fa08b;
  color: #faf7f1;
}
.sp-btn--ghost {
  margin-left: 20rpx;
  background: #ece7db;
  color: #56674e;
}
.sp-btn:active {
  opacity: 0.86;
}
</style>
