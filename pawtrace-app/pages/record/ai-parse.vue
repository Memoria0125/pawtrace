<template>
  <!--
    S9-1 AI 图片解析｜辅助屏（PRD F2.2 AI 识别）
    设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p22，逐像素实测（375×812 @2.9573x，1pt = 2rpx）
    结构：自绘导航（返回 / AI 图片解析 / AI 辅助胶囊）
          → 卡1（照片 + 陶土识别框 + 扫描线 + 「AI 正在解析这张照片…」）
          → 细进度条（62.6% 苔绿填充）
          → 卡2（识别维度：5 行「标签 + 右对齐胶囊」，✓ 已完成 / ◌ 进行中）
          → 两条脚注
    刻意处理（非漏做）：
      1. 导航栏自绘（navigationStyle: custom），复用全局 paw-navbar；
      2. 照片区：设计稿为内嵌位图（xref132，2304×1728 猫照），实现侧优先用路由带进来的
         photoUrl；无图时回落到 static/demo/ai-parse-cat.jpg（同一张图的 2x 版本，
         仅作演示撑版面，阶段 3 真机联调后由用户照片替换）；
      3. ✓ 勾与 ◌ 虚环一律 CSS 手绘（Unicode 字形跨端尺寸不可控，见 skill 第 37 条）；
      4. 扫描线默认缓慢往复（解析中观感），截图验收用 ?freeze=1 冻到设计稿位置。
      5. 2026-10-11：识别完成后的「看科普小知识」由**跳 S9-2 独立页**改为**本页覆盖弹出**
         （用户诉求「不要跳转到别的界面，而是在原来的界面上覆盖弹出」）——浮层本体 =
         components/paw-sci-card（唯一形制），关闭只收起浮层、留在本页。
  -->
  <view class="paw-page ai">
    <!-- ============ 自绘导航 ============
         p22 实测：标题「AI 图片解析」墨迹 110.57~235.35pt，中心 172.96pt；
         「返回」墨迹与 p5~p11 完全一致 → 直接复用组件真值。
         ⚠️ 导航在 .paw-page（左右各 40rpx）之内，可用宽 670rpx 而非 750rpx：
           标题中心(rpx) = 375 + (leftW − rightW)/2 → 需 rightW − leftW = 58.16；
           胶囊墨迹右端 612.7rpx 是页面绝对坐标 → rightPad = 710 − 612.7 ≈ 96.6rpx。
           （初版按 750rpx 基准取 137rpx，胶囊整体左偏 20.3pt，被 cmp_bands 抓到。）
         ⚠️ rightW 必须留出 ≥ 胶囊宽（97.4rpx）的槽内容宽（rightW − rightPad），
           否则「AI 辅助」会被挤成两行（初版 194−96.6=97.4rpx 只差 0.02rpx 就换行了）。 -->
    <paw-navbar
      title="AI 图片解析"
      :left-w="151.84"
      :right-w="210"
      :right-pad="96.6"
      :back-url="backUrl"
    >
      <template #right>
        <view class="ai-chip"><text class="ai-chip-txt">AI 辅助</text></view>
      </template>
    </paw-navbar>

    <!-- ============ 卡1：照片 + 识别框 + 扫描线 ============
         卡片 20~355 × 122~411.5pt（40~710rpx 宽 670rpx、高 579rpx），描边 1pt #D7CEC2、R32rpx。
         照片元素 678×480rpx（4:3 源图 aspectFill → 上下各裁 14rpx，与设计稿一致），
         距卡内缘 left/top 各 12rpx，右侧超界被卡片 overflow 裁掉（设计稿照片右缘是切边无圆角）。 -->
    <view class="shot-card">
      <view class="shot">
        <image class="shot-img" :src="photo" mode="aspectFill" />
        <!-- 陶土识别框：左线中心 x 36.5pt、上线中心 y 138.4pt、下线中心 y 337.9pt、
             宽 319pt → 右线落在卡内缘之外被裁掉（设计稿此处无右线） -->
        <view class="scan-box"></view>
        <!-- 扫描线：设计稿为 319×2pt 内嵌条带，中心 y 242.8pt → 相对照片顶 225.8rpx
             （默认可小幅往复充「解析中」观感；验收态 ?freeze=1 冻结在设计位置） -->
        <view class="scan-line" :class="{ 'scan-line--run': !frozen }"></view>
      </view>
      <text class="shot-cap">{{ done ? '解析完成 · 可回填到记录' : 'AI 正在解析这张照片…' }}</text>
    </view>

    <!-- ============ 进度条 ============
         轨道 y 424.35~427.95pt（8rpx）全宽 670rpx、#E7DFD4 全圆；填充 #8FA08B 至 62.6%（左圆头右方头）
         （阶段3：宽度绑定 progress，默认 0.626 = 设计稿帧；真实解析时按维度完成度推进） -->
    <view class="bar"><view class="bar-fill" :style="{ width: (progress * 100).toFixed(1) + '%' }"></view></view>

    <!-- ============ 卡2：识别维度 ============
         卡片 20~355 × 440~643.5pt（高 407rpx）；行距 64rpx（胶囊 44rpx + 间隔 20rpx） -->
    <view class="dims-card">
      <text class="dims-title">识别维度</text>
      <view v-for="r in rows" :key="r.label" class="dim-row">
        <text class="dim-label">{{ r.label }}</text>
        <view class="dim-pill" :class="r.state === 'done' ? 'is-done' : 'is-wait'">
          <!-- ✓：设计稿墨迹 7.1×6.09pt（14.2×12.2rpx），两段细棒拼角 -->
          <view v-if="r.state === 'done'" class="tick">
            <view class="tick-a"></view>
            <view class="tick-b"></view>
          </view>
          <!-- ◌：设计稿 ⌀9.81pt ≈ 19.6rpx 的虚线圆环，线宽 2rpx -->
          <view v-else class="ring"></view>
          <text class="dim-val" :class="{ 'dim-val--tight': r.tight }">{{ r.value }}</text>
        </view>
      </view>
    </view>

    <!-- ============ 脚注 ============ -->
    <!-- 阶段3：识别完成后出现操作区（默认/冻结态不渲染 → 像素基线不变） -->
    <view v-if="done" class="acts">
      <view class="act act--main" @tap="useResult">
        <text class="act-t">用于本次记录</text>
      </view>
      <view class="act act--ghost" @tap="goSci">
        <!-- 2026-10-11：本按钮**不再跳转**，改为在本页覆盖弹出科普卡浮层（用户诉求） -->
        <text class="act-t2">看科普小知识</text>
      </view>
    </view>
    <text class="foot foot--1">{{ source === 'demo' ? '演示识别结果 · 配置 AI_API_KEY 后由大模型生成' : '识别由多模态大模型完成 · 结果仅作预填建议' }}</text>
    <text class="foot foot--2">让 AI 帮你多看一眼它。</text>

    <!-- 科普卡浮层（2026-10-11）：**覆盖弹在本页上，不跳转**
         （用户诉求「科普小知识不要跳转到别的界面，而是在原来的界面上覆盖弹出」）；
         卡片本体 = components/paw-sci-card（唯一形制，独立页 sci-card 也复用它） -->
    <paw-sci-card
      :show="sciOpen"
      :title="sciTitle"
      :content="sciBody"
      @close="sciOpen = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { goBack } from '../../common/nav';

/** 设计稿冻结态：截图验收走 ?freeze=1（冻结扫描线 + 固定五行状态，且不发起识别请求） */
const frozen = ref(false);
/** 照片：路由带入的实拍图优先，缺失时用同款演示图撑版面 */
const photo = ref('/static/demo/ai-parse-cat.jpg');
/** 关闭/带回后的去向（栈深不足时的兜底目标；跳法由 common/nav 按目标页推导） */
const backUrl = ref('/pages/record/create');

/** 识别进度（0~1；默认 0.626 = 设计稿 62.6% 帧，保证默认态像素零回归） */
const progress = ref(0.626);
/** 识别完成态：操作区出现、扫描文案切换 */
const done = ref(false);
/** 结果来源：'ai' = 大模型生成 / 'demo' = 演示兜底（脚注据此提示） */
const source = ref('');
const result = ref<any>(null);

/**
 * 五行状态默认为设计稿 p22 的那一帧（第 1~3 行已识别、4~5 行进行中），
 * 真实识别返回后逐行刷新为真实值。
 */
const rows = ref([
  { label: '物种识别', value: '猫', state: 'done' },
  { label: '毛色花纹', value: '三花', state: 'done' },
  { label: '明显特征', value: '右耳缺角 · 项圈', state: 'done', tight: true },
  { label: '身体状态', value: '识别中…', state: 'wait' },
  { label: '观测草稿', value: '排队中', state: 'wait' },
]);

onLoad((q) => {
  frozen.value = q?.freeze === '1';
  // pending_photo：记录页选图后写入（优先于路由 ?photo=）
  const pending = uni.getStorageSync('pending_photo');
  if (pending && typeof pending === 'string') photo.value = pending;
  else if (q?.photo) photo.value = q.photo;
  if (q?.from) backUrl.value = q.from;
  // 冻结态（像素验收）不发起请求，保持设计稿那一帧
  if (!frozen.value) start();
});

/** H5：照片（blob:/同源静态图）→ dataURL；失败返回 ''（走后端演示兜底） */
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

/** 图片内容稳定指纹（同图 → 同 key → 服务端缓存命中不重复调用） */
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return 'ph-' + h.toString(16) + '-' + s.length.toString(16);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function start() {
  try {
    const b64 = await toBase64(photo.value);
    const res: any = await api.post(
      '/ai/recognize',
      { photoKey: hashStr(b64 || photo.value), imageBase64: b64 },
      { silent: true },
    );
    if (!res || typeof res !== 'object') return; // 异常响应 → 保留设计稿帧
    result.value = res;
    source.value = String(res.source ?? '');
    // 五个维度逐行点亮（保持「解析中」的观感节奏）
    const vals = [
      String(res.species ?? '猫'),
      String(res.coat ?? '—'),
      String(res.features ?? '—'),
      String(res.body ?? '—'),
      res.draft ? '已生成' : '—',
    ];
    for (let i = 0; i < rows.value.length; i++) {
      await sleep(res.cached ? 60 : 420); // 缓存命中时快进
      rows.value[i].value = vals[i];
      rows.value[i].state = 'done';
      progress.value = (i + 1) / rows.value.length;
    }
    done.value = true;
  } catch {
    // 离线 / 后端不可用 → 保留设计稿演示帧，不打断
    uni.showToast({ title: 'AI 暂不可用，展示演示结果', icon: 'none' });
  }
}

/** 把识别结果带回记录页（存 ai_result，create.onShow 回填标签 + 草稿） */
function useResult() {
  if (result.value) uni.setStorageSync('ai_result', result.value);
  goBack({ url: backUrl.value });
}

/** 科普卡：**页内覆盖弹出**（2026-10-11 改；原为 navigateTo 跳 S9-2 独立页）
    用户诉求：「科普小知识不要跳转到别的界面，而是在原来的界面上覆盖弹出」
    ⇒ 只置 sciOpen，卡片内容取识别结果里的 sciCard；
      ⚠️ 缺省一律传 `undefined`（**不在这里重抄演示文案**）→ 由组件的 prop 默认值兜底，
        保证「设计稿演示文案」只有 paw-sci-card 一处真值来源。 */
const sciOpen = ref(false);
const sciTitle = ref<string | undefined>();
const sciBody = ref<string | undefined>();

function goSci() {
  const sc = result.value?.sciCard ?? {};
  sciTitle.value = sc.title ? String(sc.title) : undefined;
  sciBody.value = sc.content ? String(sc.content) : undefined;
  sciOpen.value = true;
}
</script>

<style scoped>
.ai {
  background: #f0ebdf;
}

/* ---------- 导航右槽：苔绿胶囊（实测 48.35×19.27pt = 96.7×38.5rpx，文字 20rpx 纸白） ---------- */
.ai-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 39.4rpx;
  padding: 0 18rpx;
  border-radius: 19.7rpx;
  background: #8fa08b;
  /* 设计稿胶囊中心比导航行中心低 1.13pt（±2.26rpx） */
  position: relative;
  top: 2.3rpx;
}
.ai-chip-txt {
  font-size: 20rpx;
  line-height: 1;
  color: #faf7f1;
  /* 胶囊固定单行（槽内容宽若被压到临界，H5 会把「辅助」折到第二行） */
  white-space: nowrap;
}

/* ---------- 卡1：照片卡 ---------- */
.shot-card {
  /* 导航行底 221.3rpx → 卡顶 244.4rpx */
  margin-top: 23.1rpx;
  height: 579rpx;
  box-sizing: border-box;
  padding-top: 12rpx;
  background: #faf7f1;
  border: 2rpx solid #d7cec2;
  border-radius: 32rpx;
  /* 照片元素右侧超界 24rpx，靠这里裁切（设计稿照片右缘是切边） */
  overflow: hidden;
}
.shot {
  position: relative;
  /* +0.4pt：设计稿照片左缘 27.0pt、识别框左线中心 36.5pt（初版整体偏左 0.4pt） */
  margin-left: 12.8rpx;
  width: 654rpx;
  height: 480rpx;
}
.shot-img {
  display: block;
  width: 678rpx;
  height: 480rpx;
  border-radius: 24rpx;
}
/* 识别框：设计稿 319×199.5pt 是**中心距**，故 border-box 外框 = 641×402rpx；
   外框右沿 356.25pt 落在卡内缘（354pt）之外 → 设计稿「没有右线」是被卡片裁掉的，
   初版按 638rpx 写导致右线露出来 0.75pt。 */
.scan-box {
  position: absolute;
  left: 17.5rpx;
  top: 17.5rpx;
  width: 641rpx;
  height: 402rpx;
  box-sizing: border-box;
  border: 3rpx solid #c68b6f;
}
.scan-line {
  position: absolute;
  left: 0;
  top: 225.6rpx;
  width: 678rpx;
  height: 4.8rpx;
  background: rgba(198, 139, 111, 0.7);
}
/* 解析中观感：扫描线在照片内小幅往复；验收态不带这个类，位置即设计稿位置 */
.scan-line--run {
  animation: ai-scan 2.8s ease-in-out infinite;
}
@keyframes ai-scan {
  0%,
  100% {
    transform: translateY(-170rpx);
  }
  50% {
    transform: translateY(170rpx);
  }
}
.shot-cap {
  display: block;
  margin-top: 20rpx;
  font-size: 26rpx;
  line-height: 1;
  color: #56674e;
  /* 设计稿「AI 正在…」中间那个空格宽 0.4em 量级，H5 落到 0.26em → 补回来（实测差 1.35pt） */
  word-spacing: 2.8rpx;
}

/* ---------- 进度条 ---------- */
.bar {
  /* 卡1 底 823.4rpx → 轨道顶 848.4rpx；轨道高实测 3.7pt（初版 8rpx 偏高 0.34pt） */
  margin-top: 25rpx;
  height: 7.4rpx;
  background: #e7dfd4;
  border-radius: 3.7rpx;
  overflow: hidden;
}
.bar-fill {
  width: 62.6%;
  height: 100%;
  background: #8fa08b;
  /* 左圆头、右方头（设计稿填充右端是直角） */
  border-radius: 3.7rpx 0 0 3.7rpx;
}

/* ---------- 卡2：识别维度 ---------- */
.dims-card {
  /* 轨道底 855.8rpx → 卡顶 880.2rpx */
  margin-top: 24.4rpx;
  height: 407rpx;
  box-sizing: border-box;
  /* 左右内边距按实测不对称：标签墨迹左 34.49pt、胶囊右沿 340.51pt */
  padding: 28.8rpx 28rpx 25.4rpx 26rpx;
  background: #faf7f1;
  border: 2rpx solid #d7cec2;
  border-radius: 32rpx;
}
.dims-title {
  display: block;
  margin-bottom: 22.8rpx;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 1;
  color: #3c4036;
}
.dim-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44rpx;
}
.dim-row + .dim-row {
  margin-top: 20rpx;
}
.dim-label {
  font-size: 26rpx;
  line-height: 1;
  color: #3c4036;
}
/* 胶囊：设计稿高 43~44rpx、右缘齐 681rpx（卡内右缩进 27rpx）。
   左右内边距**逐行不同**（实测：勾行左 11.83pt/右 10.82pt；环行左 10.48pt/右 11.84pt），
   因为设计稿里 ✓ 与 ◌ 是字形（带 side bearing），实现侧是盒子（墨迹=盒），
   所以按「墨迹落位」反推内边距，而不是套一个统一值。 */
.dim-pill {
  display: flex;
  align-items: center;
  height: 44rpx;
  border-radius: 22rpx;
  /* 设计稿胶囊中心比「标签行盒中心」低 0.67pt（实测：胶囊整体比初版高 1.34rpx） */
  position: relative;
  top: 1.35rpx;
}
.is-done {
  background: #e9f0e6;
  padding: 0 20.4rpx 0 23.7rpx;
}
.is-wait {
  background: #f2e1d6;
  padding: 0 22.5rpx 0 21rpx;
}
.dim-val {
  font-size: 22rpx;
  line-height: 1;
}
.is-done .dim-val {
  color: #56674e;
}
/* 陶土胶囊里的「识别中…／排队中」在 H5 下比设计稿宽 0.7~1pt → 收一点字距 */
.is-wait .dim-val {
  color: #c68b6f;
  letter-spacing: -0.3rpx;
}
/* 含「·」分隔的行（仅行3）：设计稿分隔符两侧各留 3.5pt，H5 的 CJK 空格落到 5.9pt → 收回来 */
.dim-val--tight {
  word-spacing: -5.2rpx;
}

/* ✓ 勾（设计稿墨迹 7.10×5.75pt = 14.2×11.5rpx）：两段细棒拼角，左短臂 + 右长臂。
   容器就是墨迹盒，故两臂要铺满容器（否则图标与文字的间距会被容器空白撑大）。 */
.tick {
  position: relative;
  top: -1.94rpx;
  width: 14.2rpx;
  height: 12.2rpx;
  margin-right: 8rpx;
  flex-shrink: 0;
}
.tick-a,
.tick-b {
  position: absolute;
  height: 3.2rpx;
  background: #56674e;
  border-radius: 1.6rpx;
}
.tick-a {
  left: 0;
  top: 8.9rpx;
  width: 7.4rpx;
  transform-origin: 0 50%;
  transform: rotate(45deg);
}
.tick-b {
  left: 4.9rpx;
  top: 13rpx;
  width: 13rpx;
  transform-origin: 0 50%;
  transform: rotate(-45deg);
}

/* ◌ 虚线圆环 ⌀19.6rpx（设计稿里它也是字形，落位比胶囊中心低 0.84pt） */
.ring {
  box-sizing: border-box;
  width: 19.6rpx;
  height: 19.6rpx;
  margin-right: 8rpx;
  border: 2rpx dotted #c68b6f;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  top: 1.7rpx;
}

/* ---------- 脚注 ----------
   两条脚注里「·」两侧的空格在 H5 里都偏窄 1~2pt，用 word-spacing 补回设计稿的度量 */
.foot {
  display: block;
  line-height: 1;
  color: #8b8779;
  word-spacing: 1.4rpx;
}
.foot--1 {
  /* 卡2 底 → 脚注1 行盒 */
  margin-top: 25.7rpx;
  font-size: 22rpx;
}
.foot--2 {
  /* 脚注行距实测 25.03pt（50.06rpx）：行盒 22rpx + 间隔 27.4rpx */
  margin-top: 27.4rpx;
  font-size: 24rpx;
}

/* ---------- 阶段3：识别完成后的操作区（done 才渲染，默认态无此区块） ---------- */
.acts {
  margin-top: 27.4rpx;
}
.act {
  height: 104rpx;
  border-radius: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.act + .act {
  margin-top: 20rpx;
}
.act--main {
  background: #56674e;
}
.act-t {
  font-size: 32rpx;
  color: #faf7f1;
  line-height: 1;
}
.act--ghost {
  border: 2rpx solid #8fa08b;
  background: #faf7f1;
}
.act-t2 {
  font-size: 28rpx;
  color: #56674e;
  line-height: 1;
}
</style>
