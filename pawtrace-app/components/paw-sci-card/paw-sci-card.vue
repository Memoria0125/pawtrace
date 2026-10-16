<!--
  S9-2 AI 科普小知识卡｜**页内浮层组件**（2026-10-11 组件化；原为独立页 pages/record/sci-card）
  设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p23，逐像素实测（375×812 @2.9573x，1pt = 2rpx）
  形态：底部弹层（bottom sheet）—— 遮罩 → 圆角面板：
        把手 → 标题行（灯泡 + AI科普小知识 + ×）→ 陶土标签胶囊
             → 科普卡1（苔绿底，右耳缺角=TNR标记）→ 科普卡2（陶土底，投喂注意事项）
             → 苔绿 CTA「知道了，继续记录」→ 底注
  ⚠️ 2026-10-11 用户诉求：「科普小知识不要跳转到别的界面，而是在原来的界面上覆盖弹出」
     ⇒ 抽成本组件，**唯一形制**：任何需要展示科普卡的页面（AI 解析页 pages/record/ai-parse、
        独立页 pages/record/sci-card）都复用它，禁各页另做一套。
     独立页保留 = 深链直达 + 像素基线存档（兜底画布仍是米底，遮罩叠出设计稿的灰块 #C4C2B5）。
  刻意处理（非漏做）：
    1. 遮罩层用**半透明墨色叠米底**：设计稿灰块实测 #C4C2B5，反解得
       rgba(60,64,54,.245) 叠 #F0EBDF（三通道解出 0.244/0.240/0.249，见下 .paw-scrim）；
       这样语义是「真遮罩」，渲染色又与设计稿一致（比写死不透明灰块更正确）。
       ⚠️ 在 AI 解析页上弹出时，遮罩下叠的是**真实页面内容**（不是灰块）—— 比设计稿的
         占位示意更正确，设计稿那块灰只是「被遮住」的示意。
    2. 三处 emoji 图标（💡 🐱 🍚，设计稿为 160×160 内嵌位图）按项目约定 CSS 手绘近似，
       尺寸取矢量 bbox（32rpx / 26rpx / 26rpx），登记为刻意偏离。
    3. 设计稿在灰块右下角有一行画布批注「识别到「偏瘦」状态时自动弹出」（xref142 位图），
       属设计说明而非界面内容，不实现（刻意偏离）。
    4. 面板左右 1pt 描边（#D7CEC2）为实做：border 2rpx + box-sizing，内部偏移已按 border 内沿减 2rpx。
    5. 2026-10-11 增强：点遮罩空白处也关闭（与 paw-dialog / paw-record-detail 同口径）；
       原独立页遮罩不可点（当时只有 × 与 CTA 能关）。
  ⚠️ `.paw-scrim` / `.paw-sheet` 是「铺满视口宽度的 fixed 浮层」→ 取 paw- 前缀并已登记到
     App.vue 的 H5 媒体查询清单，否则桌面浏览器里 right/bottom 以整个窗口为基准、会飞出手机框。
  用法：
    <paw-sci-card :show="sciOpen" :title="sciTitle" :content="sciBody" @close="sciOpen = false" />
-->
<template>
  <view v-if="show" class="paw-sci">
    <!-- 遮罩：0 ~ 789rpx（= 面板外沿 394.5pt），墨色 24.5% 叠页面底 -->
    <view class="paw-scrim" @tap="onClose"></view>

    <view class="paw-sheet">
      <!-- 把手：设计稿 36×4pt（y410~414，中心 412），色 #D8CEC2，全圆 -->
      <view class="handle"></view>

      <!-- 标题行：灯泡图标 18~34 × 429~445pt；标题墨迹 38.18~137.49 × 431.34~446.43；
           × 墨迹 345.04~353.82 × 435.38~444.16（8.78×8.78pt） -->
      <view class="head">
        <view class="ico ico--bulb">
          <view class="b-glass"></view>
          <view class="b-base"></view>
          <view class="b-tip"></view>
        </view>
        <text class="head-title">AI 科普小知识</text>
        <view class="close" @tap="onClose">
          <view class="x-a"></view>
          <view class="x-b"></view>
        </view>
      </view>

      <!-- 陶土标签：18~192 × 463~485pt（174×22pt），底 #F2E1D6 全圆，文字 22rpx #C68B6F -->
      <view class="tag"><text class="tag-txt">基于识别结果「体型偏瘦」推荐</text></view>

      <!-- 卡1：18~357 × 497~573pt（339×76pt），底 #E9F0E6、R24rpx -->
      <view class="tip tip--green">
        <view class="tip-head">
          <view class="ico ico--cat">
            <view class="c-ear c-ear--l"></view>
            <view class="c-ear c-ear--r"></view>
            <view class="c-head"></view>
            <view class="c-eye c-eye--l"></view>
            <view class="c-eye c-eye--r"></view>
            <view class="c-nose"></view>
          </view>
          <text class="tip-title">{{ title }}</text>
        </view>
          <!-- 「」」后带一个 ASCII 空格（runs 实测设计稿「」→,」墨迹间隔 9.81pt，实现无空格只 4.06pt，
               差 5.75pt 与卡2「）。」处的差值完全一致 → 设计稿右引号/右括号后各有一个空格，OCR 会吞掉 -->
          <text class="tip-body">{{ content }}</text>
      </view>

      <!-- 卡2：18~357 × 585~661pt，底 #F2E1D6 -->
      <view class="tip tip--clay">
        <view class="tip-head">
          <view class="ico ico--rice">
            <view class="r-mound"></view>
            <view class="r-bowl"></view>
          </view>
          <text class="tip-title">投喂注意事项</text>
        </view>
        <!-- 「）」后带一个 ASCII 空格（同上，设计稿「)→。」墨迹间隔 9.13pt vs 实现 3.38pt） -->
        <text class="tip-body">定点定量，避免残留招来虫鼠；备一碗清水；不投喂人类食物（尤其洋葱、巧克力） 。</text>
      </view>

      <!-- CTA：18~357 × 673~717pt（339×44pt），底 #8FA08B 全圆，文字 24rpx 纸白 -->
      <view class="cta" @tap="onClose">知道了，继续记录</view>

      <!-- 底注：墨迹 18.35~238.24 × 730.71~740.96，22rpx #8B8779 -->
      <text class="foot">知识卡片由 AI 依据识别状态生成 · 仅供参考</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 科普卡浮层：
 * - `show` 控制显隐（不产生 DOM，与页面实例无关）；
 * - `title` / `content` = 卡1 的标题与正文（AI 解析页传真实生成内容；缺省 = 设计稿 p23 演示文案）；
 * - × / 「知道了，继续记录」/ 遮罩空白处 → 只 emit `close`，**由调用页决定关掉之后做什么**
 *   （AI 解析页 = 收起浮层留在本页；独立页 = goBack 回去向页）。
 */
withDefaults(
  defineProps<{
    show: boolean;
    /** 卡1 标题（缺省 = 设计稿演示文案「右耳缺角 = TNR 标记」） */
    title?: string;
    /** 卡1 正文（缺省 = 设计稿演示文案） */
    content?: string;
  }>(),
  {
    title: '右耳缺角 = TNR 标记',
    content: '缺角代表它已接受「诱捕-绝育-放归」 ，性格稳定、不会再繁殖，是社区里的老居民啦。',
  },
);

const emit = defineEmits<{ (e: 'close'): void }>();
const onClose = () => emit('close');
</script>

<style scoped>
/* ==========================================================================
   遮罩：设计稿灰块实测 #C4C2B5 = rgba(60,64,54,.245) 叠 #F0EBDF（三通道反解 0.244/0.240/0.249）
   高度 789rpx = 面板外沿 394.5pt
   ========================================================================== */
.paw-scrim {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  height: 789rpx;
  background: rgba(60, 64, 54, 0.245);
  z-index: 10;
}

/* ==========================================================================
   面板：外沿顶 394.5pt（= 789rpx）、高 417.5pt（= 835rpx）、全宽、顶部圆角 44rpx（外沿实测 22.25pt）
   1pt 描边 #D7CEC2 → 内部偏移按 border 内沿减 2rpx（左右 padding 34rpx = 36−2）
   ========================================================================== */
.paw-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 835rpx;
  box-sizing: border-box;
  padding: 29rpx 34rpx 0;
  background: #faf7f1;
  border: 2rpx solid #d7cec2;
  border-radius: 44rpx 44rpx 0 0;
  z-index: 11;
}

/* ---------- 把手：36×4pt（72×8rpx），顶距面板外沿 15.5pt ---------- */
.handle {
  width: 72rpx;
  height: 8rpx;
  margin: 0 auto;
  border-radius: 4rpx;
  background: #d8cec2;
}

/* ---------- 标题行：图标顶 429pt（把手底 414 + 15pt） ---------- */
.head {
  display: flex;
  align-items: center;
  margin-top: 30rpx;
  height: 32rpx;
}
.head-title {
  /* 标题 16pt（32rpx）700；墨迹起点 38.18pt − 图标右缘 34pt = 4.18pt。
     设计稿文案是「AI 科普小知识」（带一个 ASCII 空格，实测宽 98.74pt，无空格时只有 94.00pt）。
     文字墨迹中心比图标盒中心低 1.69pt → 下移 3.38rpx。 */
  margin-left: 8.36rpx;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1;
  color: #3c4036;
  position: relative;
  top: 3.38rpx;
}
/* × 关闭：墨迹 8.79×8.79pt，右缘距内容右缘（357pt）3.18pt；
   设计墨迹中心比标题行中心低 3.4pt → top 6.8rpx */
.close {
  position: relative;
  top: 6.8rpx;
  width: 17.56rpx;
  height: 17.56rpx;
  margin-left: auto;
  margin-right: 6.36rpx;
  flex-shrink: 0;
}
/* 两根棒过盒中心旋转 ±45°：棒长 = 8.79×√2 = 12.43pt = 24.86rpx，
   但墨迹实测 8.79pt 见方（圆头端会溢出对角线）→ 棒长收到 22.26rpx；
   棒厚 3.4rpx（行剖面实测斜截面 2.36pt → 2.36/√2 = 1.67pt） */
.x-a,
.x-b {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 22.26rpx;
  height: 3.4rpx;
  margin-left: -11.13rpx;
  margin-top: -1.7rpx;
  border-radius: 1.7rpx;
  background: #8b8779;
  transform-origin: 50% 50%;
}
.x-a {
  transform: rotate(45deg);
}
.x-b {
  transform: rotate(-45deg);
}

/* ---------- 陶土标签胶囊：顶 463pt（标题行底 445 → +18pt） ---------- */
.tag {
  display: inline-flex;
  align-items: center;
  margin-top: 36rpx;
  height: 44rpx;
  padding: 0 21rpx;
  border-radius: 22rpx;
  background: #f2e1d6;
}
.tag-txt {
  font-size: 22rpx;
  line-height: 1;
  color: #c68b6f;
  /* 文字墨迹比胶囊中心高 1.01pt → 下移 2.02rpx */
  position: relative;
  top: 2.02rpx;
}

/* ---------- 科普卡：76pt 高（152rpx），左右内缩 12pt（24rpx） ---------- */
.tip {
  margin-top: 24rpx;
  height: 152rpx;
  box-sizing: border-box;
  /* ⚠️ padding-top 必须在这里（不能只写 .tip-head 的 margin-top）：
     父容器无垂直 padding/border 时，首子元素的 margin-top 会与父元素**边距塌陷**，
     整块内容被顶到卡顶、卡内节奏全乱（首版实测内容整体偏高 5pt+）。 */
  padding: 24rpx 24rpx 0;
  border-radius: 24rpx;
}
.tip--green {
  background: #e9f0e6;
}
.tip--clay {
  background: #f2e1d6;
}
/* 卡内首行（图标 + 标题）：由 .tip 的 padding-top 承担 12pt 上边距 */
.tip-head {
  display: flex;
  align-items: center;
  height: 26rpx;
}
.tip-title {
  /* 标题墨迹 46.63pt − 图标右缘 43pt = 3.63pt */
  margin-left: 7.26rpx;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 1;
  /* 卡1 标题带 3 个空格，H5 空格比设计稿窄（整行窄 2.37pt）→ word-spacing 补
     （卡2 标题无空格，不受影响） */
  word-spacing: 1.58rpx;
}
.tip--green .tip-title {
  color: #56674e;
}
.tip--clay .tip-title {
  color: #c68b6f;
}
/* 正文：12pt（24rpx）、行高 29.74rpx（实测行起点差 14.87pt）；
   行盒顶 = 墨迹顶 532.91 − (29.74−22.3)/2 → 距标题行底 8.53pt
   padding-right 让容器可用宽从 315pt 收到 ~312pt：设计稿卡1 行1 断「…不会再」（27 字）、
   卡2 行1 断「…人类食」（27 字）；容器的 315pt 会让卡1 多吞一个「繁」字。 */
.tip-body {
  display: block;
  margin-top: 18.64rpx;
  padding-right: 6rpx;
  font-size: 24rpx;
  line-height: 29.74rpx;
}
.tip--green .tip-body {
  color: #56674e;
}
.tip--clay .tip-body {
  color: #c68b6f;
  /* 卡2 正文唯一的空格（「） 。」）贡献 8.53pt，比该处设计差多 0.5pt → 收回
     （行1 无空格，word-spacing 不影响行1） */
  word-spacing: -1rpx;
}

/* ---------- CTA：44pt 高（88rpx）、全圆、距卡2 底 12pt ---------- */
.cta {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 24rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background: #8fa08b;
  /* 实测文字墨迹 110.57×13.19pt → 8 个全角字，字号 14pt（28rpx） */
  font-size: 28rpx;
  line-height: 1;
  color: #faf7f1;
}
.cta:active {
  opacity: 0.86;
}

/* ---------- 底注：行盒顶 = 730.04 − 0.35（墨迹在行盒内的居中偏移）→ 距 CTA 底 12.69pt ----------
   设计稿文案「知识卡片由 AI 依据识别状态生成 · 仅供参考」（3 个空格），
   H5 的 ASCII 空格比设计稿窄 → 用 word-spacing 补回来（无空格版本实测窄 13.53pt）。 */
.foot {
  display: block;
  margin-top: 25.38rpx;
  font-size: 22rpx;
  line-height: 1;
  color: #8b8779;
  position: relative;
  top: 2.02rpx;
  /* 设计稿文案「知识卡片由 AI 依据识别状态生成 · 仅供参考」带 3 个空格；
     H5 的 ASCII 空格实测比设计稿宽 1.35~1.92pt → 用 word-spacing 收回来 */
  word-spacing: 1rpx;
}

/* ==========================================================================
   三处 emoji 图标（设计稿为 160×160 内嵌位图）→ CSS 手绘近似
   ========================================================================== */
.ico {
  position: relative;
  flex-shrink: 0;
}

/* 💡：玻璃球 + 灰灯座（32rpx 盒；图形约 22rpx 宽） */
.ico--bulb {
  width: 32rpx;
  height: 32rpx;
}
.b-glass {
  position: absolute;
  left: 5rpx;
  top: 1rpx;
  width: 22rpx;
  height: 23rpx;
  border-radius: 50% 50% 44% 44%;
  background: radial-gradient(circle at 36% 28%, #fffdf0 0%, #ffe89b 40%, #f4c43c 100%);
}
.b-base {
  position: absolute;
  left: 10.5rpx;
  top: 22.5rpx;
  width: 11rpx;
  height: 6.5rpx;
  border-radius: 1rpx;
  background: #cdc9bf;
}
.b-tip {
  position: absolute;
  left: 12.5rpx;
  top: 28.5rpx;
  width: 7rpx;
  height: 2.6rpx;
  border-radius: 1rpx;
  background: #6f6b62;
}

/* 🐱：黄色猫头（26rpx 盒；头 20rpx，双耳用旋转方块） */
.ico--cat {
  width: 26rpx;
  height: 26rpx;
}
.c-head {
  position: absolute;
  left: 3rpx;
  top: 6rpx;
  width: 20rpx;
  height: 18rpx;
  border-radius: 46% 46% 50% 50%;
  background: linear-gradient(160deg, #fed977 0%, #f4b93c 70%, #e2a52b 100%);
}
.c-ear {
  position: absolute;
  top: 2rpx;
  width: 8rpx;
  height: 8rpx;
  border-radius: 1.5rpx;
  background: #f2b83a;
}
.c-ear--l {
  left: 3.4rpx;
  transform: rotate(24deg);
}
.c-ear--r {
  left: 14.6rpx;
  transform: rotate(-24deg);
}
.c-eye {
  position: absolute;
  top: 13rpx;
  width: 3.2rpx;
  height: 4rpx;
  border-radius: 50%;
  background: #3b3529;
}
.c-eye--l {
  left: 8rpx;
}
.c-eye--r {
  left: 15rpx;
}
.c-nose {
  position: absolute;
  left: 11.6rpx;
  top: 18.6rpx;
  width: 3rpx;
  height: 2rpx;
  border-radius: 50%;
  background: #d98f6a;
}

/* 🍚：白碗 + 米堆（26rpx 盒；碗底按设计位图墨迹 bbox 对齐：盒内 0~26 × 2.8~27.8rpx） */
.ico--rice {
  width: 26rpx;
  height: 26rpx;
}
.r-mound {
  position: absolute;
  left: 1rpx;
  top: 2.8rpx;
  width: 24rpx;
  height: 14rpx;
  border-radius: 50% 50% 30% 30%;
  background: linear-gradient(180deg, #ffffff 0%, #fbfaf7 70%, #efebe3 100%);
}
.r-bowl {
  position: absolute;
  left: 0;
  top: 15rpx;
  width: 26rpx;
  height: 12.8rpx;
  border-radius: 0 0 50% 50% / 0 0 74% 74%;
  background: linear-gradient(180deg, #ffffff 0%, #f5f2ec 45%, #e2ddd3 100%);
}
</style>
