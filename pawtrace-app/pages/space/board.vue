<!--
  S10 协作空间看板（PDF p12，PRD F5.1）
  设计基线：375×812 @2.9573x —— 本页所有数值均由设计稿实测（1 设计 pt = 2rpx）
  数据：后端无小组时回退设计稿同款 DEMO_FALLBACK 演示数据撑版
        （shot_re.js 第 6 参拦截 *localhost:3000/api/spaces* 强制走兜底分支）

  ── 逐项实测记录（设计 y 区间 → rpx）────────────────────────────
  ⚠️ 高度一律用「细阈值边缘法」定标（x=330pt 无内容列，Δ>3 判边）。
     原因：cmp_bands 默认阈值 18 对**低对比度卡**（纸白卡 #FAF7F1 压在米底
     #F0EBDF 上，Δmax≈18）会吞掉上下各 ~1px 反锯齿行 → 卡高系统性少算 ~0.68pt。
     本轮头卡/三宫格就是照 cmp_bands 的 h 建的，结果每张矮 0.68pt，
     4 张卡累计把 CTA 顶推到 −1.35pt。改用细阈值后 6 段全部归零。
  ⚠️ **cmp_bands 只量「整窗墨迹带范围」，抓不到带内重排**。本页三处重大错漏
     都是带残差 0.00 的情况下靠「分段裁剪 + 局部 A/B 目视」才发现的：
       ① 三宫格本是 **3 张独立卡**（缝 9.81pt），被误做成「一张卡 + space-between」；
       ② 最近协作的时间是**行内跟 · 之后**，被误做成 space-between 右对齐；
       ③ 头卡/进度卡/最近卡都带 **1pt #D7D2C2 描边**，实现里完全漏掉。
     → 收尾必须逐带裁剪目视，不能只看 cmp_bands 的"通过"。
  ── 卡几何（细阈值，设计 vs 实现 逐点）──
  头卡   121.73–250.23 (128.50pt)  → height 256.32rpx（=128.16pt，比读数少 0.34 AA 偏置）
  三宫格 263.75–340.18 ( 76.42pt)  → 3 张卡各 height 152.16rpx（=76.08pt）
  进度卡 354.04–450.07 ( 96.03pt)  → height 191.38rpx（=95.69pt）✓
  最近协作 463.94–614.07 (150.14pt) → height 299.60rpx（=149.80pt）✓
  CTA   627.94–678.32 ( 50.38pt)   → height 99.42rpx（=49.71pt）✓
  卡间间隙（细阈值实测，设计/实现一致）：13.52 / 13.86 / 13.87 / 13.87pt
       → CSS margin-top 一律 28.4rpx（=14.2pt，含两侧各 0.17pt AA 偏置）✓
  描边   头卡/进度卡/最近卡 = 2rpx **#D7D2C2**（实测 215,210,194）；
         **三宫格 3 张卡没有描边**（y=263.75/x=187 处 241,236,222 → 250,247,241 直落）。
         ⚠️ 设计稿自身不统一：p3(S1)/p6(S4) 的描边是 #E2DCCA(226,220,202)，
         p11(S9)/p12(S10) 才是 #D7D2C2 —— **按页实测，勿全局统一**。
         ⚠️ 加描边后必须把 padding 各方向 −2rpx，否则内容整体下移 1pt。
  ── 卡内元素 ──
  头卡   标题 34rpx（CJK 起点距 17.25pt，ink 高 15.89pt）色 #3C4036
          副行 24rpx（起点距 11.84–12.17pt）色 #6E6F58，margin-top 23.84rpx
          头像行 ink 188.28–216.00，圆直径 27.39pt = 55rpx，
          相邻圆心距 27.9pt → 间隙仅 0.5pt（≈1rpx，**不叠压**）
          头像字 **24rpx**（设计「林」墨迹 11.16×11.16pt ÷ 0.927 墨迹比 ≈ 12.04pt；
                      曾误设 35rpx → 墨迹 16.23pt，肉眼圆内字明显偏大）
          胶囊 96.37×25.7pt（120.00→216.40pt），紧接头像（间隙 ≈0.4pt）
               2rpx #C68B6F 描边 + 透明底 + **21rpx** 陶土字
               （设计「公」「开」起点距 10.49pt；曾误设 30rpx → 胶囊 116pt，宽 +20pt）
               行内对齐 **align-items: flex-start**（设计胶囊顶 188.03 ≈ 头像顶 188.28，
               是顶对齐不是垂直居中）
  三宫格 卡宽 105.16pt（210.32rpx）、间隙 9.81pt（19.62rpx）
         实测 y=300 底色分段：19.95–125.11 | 134.92–240.08 | 249.89–355.05
         数字 40rpx #3C4036（设计数字步进 11.83pt ÷ 0.575 拉丁步进比 ≈ 20.6pt）
         标签 22rpx #8B8779（起点距 10.82pt ✓）；padding-top 41.2rpx
  进度卡 标签 26rpx #3C4036（起点距 12.85–13.19pt ✓）
         百分比 36rpx **#C68B6F**（与标签**墨迹顶对齐**：36rpx 行盒偏移比 26rpx 小
         1.56pt → margin-top −3.12rpx 推平）
         进度条：x 34.0→341.0（满内容宽）、高 9.81pt = 20rpx
         填充 **#C68B6F**（205/307 = 66.8% ≈ 67%）；轨道 **#E7DFD4**（采样 231,226,209）
         ⚠️ 条顶 margin-top 只有 **22.0rpx**：.prog-h 是 flex 行，高度被 36rpx 数字
         行盒撑到 16.44pt（不是标签的 13pt），照标签高度算会多出 3.04pt
  最近协作 标题 26rpx #3C4036；行 24rpx #6E6F58（时间同色，
          实测两侧最暗 10 像素都是 106,106,92）
          行高 50rpx（设计行距 25.02pt）；**行间没有分隔线**（y521 整行纯纸白）
          ⚠️ 时间**不是**右对齐：设计是「姓名 空格 动作 · 时间」一整条左对齐文本流
             （行 1 墨迹 34.88→223.56pt，右侧留白 130pt）。数据里已带姓名后的空格
   CTA   底色 **#8FA08B 苔绿**（采样 143,160,139）非深橄榄
        文字 32rpx 纸白（CJK 起点距 15.89–16.57pt）
        ⚠️ 文案是「**＋ 发布我的痕迹**」，＋ 后有空格（设计 ＋→发 间距 18.60pt
        vs 正常字距 15.96pt）
        ⚠️ .cta-t 加 `position:relative; top:-2rpx`：白底按钮里 H5 字体的墨迹中心
        比设计字体低 1pt（同为 32rpx、墨迹高都是 14.88pt），别改 line-height 硬凑
  底栏   693.88–704.70 (10.82pt) 24rpx（起点距 11.84pt）色 #A5A293（采样 165,162,147，
        比三宫格标签的 #8B8779 明显更浅 → 设计里是更弱的一档）
        卡顶 margin-top 29.78rpx（非 31.12：上面的高度补正把 CTA 下移了 0.67pt）

  ⚠️ 卡容器一律 `box-sizing: border-box`：本页 5 个块都是"固定高度 + 内边距"，
  默认 content-box 会让 padding 外挂在高度之外（实测每张卡整体高 23pt）。
  ⚠️ 行内 <text> 一律 lh:1 + 显式 margin 控距（避免块容器 strut 行高把行盒撑高）
  ── 验收（2026-09-30）──
  cmp_bands --win 20,355 --tol 2：7 段残差 0.00/0.00/0.00/0.00/0.00/0.00 + 导航行 +0.34
  （导航行 +0.34 = 1 设备像素，属全局 paw-navbar topPad 的 AA 偏置，S1–S9 同值，勿单页改）
  卡内 10 个子元素行段实测：Δtop 全部 ≤0.68pt、Δbot 全部 ≤0.68pt（见图 ab2_*.png）
-->
<template>
  <view class="paw-page paw-page--tabbed">
    <paw-navbar
      title="协作空间"
      :left-w="200"
      :right-w="209"
      :right-pad="8.1"
      back-url="/pages/my/index"
      :back-tab="true"
    >
      <template #right>
        <text class="paw-nav-act paw-nav-act--muted">邀请</text>
      </template>
    </paw-navbar>

    <!-- ============ 头卡 ============ -->
    <view class="head">
      <text class="head-t">{{ space.name }}</text>
      <text class="head-sub">{{ space.subtitle }}</text>
      <view class="avatars">
        <view v-for="(m, i) in members" :key="i" class="av" :class="'av--' + m.color">
          <text class="av-t">{{ m.initial }}</text>
        </view>
        <view class="pill">
          <text class="pill-t">{{ space.privacy }} · {{ space.memberCount }} 人</text>
        </view>
      </view>
    </view>

    <!-- ============ 三宫格 ============ -->
    <view class="stats">
      <view class="stat" v-for="s in stats" :key="s.label">
        <text class="stat-n">{{ s.n }}</text>
        <text class="stat-l">{{ s.label }}</text>
      </view>
    </view>

    <!-- ============ 进度卡 ============ -->
    <view class="prog">
      <view class="prog-h">
        <text class="prog-lbl">绝育覆盖率</text>
        <text class="prog-pct">{{ coveragePct }}%</text>
      </view>
      <view class="prog-bar">
        <view class="prog-fill" :style="{ width: coveragePct + '%' }"></view>
      </view>
      <text class="prog-sub">{{ coverageTip }}</text>
    </view>

    <!-- ============ 最近协作 ============ -->
    <view class="recent">
      <text class="recent-h">最近协作</text>
      <view class="recent-list">
        <view v-for="(r, i) in recents" :key="i" class="recent-r">
          <text class="recent-t">{{ r.text }} · {{ r.time }}</text>
        </view>
      </view>
    </view>

    <!-- ============ CTA ============ -->
    <view class="cta" @tap="onPublish">
      <text class="cta-t">＋ 发布我的痕迹</text>
    </view>

    <!-- ============ 底栏文案 ============ -->
    <view class="tail">
      <text class="tail-t">善意会接力。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { api } from '../../common/api';

/** 演示数据（与设计稿 p12 逐字对齐）—— 接口失败/非成员/未加组时兜底撑版 */
const DEMO = {
  name: '城西社区 · TNR 互助小组',
  subtitle: '12 位邻居一起守护 · 你已加入，权限已解锁',
  privacy: '公开',
  memberCount: 12,
  members: [
    { initial: '陈', color: 'green' },
    { initial: '王', color: 'clay' },
    { initial: '林', color: 'mustard' },
  ] as Array<{ initial: string; color: string }>,
  stats: [
    { n: '24', label: '猫口总数' },
    { n: '16', label: '已绝育' },
    { n: '89', label: '本月记录' },
  ],
  coverage: 67,
  coverageGoal: 80,
  coverageGap: 4,
  recents: [
    { text: '陈同学 带「大橘」完成绝育', time: '昨天' },
    { text: '王阿姨 补录 6 条投喂记录', time: '2 天前' },
    { text: '林晚 上传「三花」近照', time: '3 天前' },
  ],
};

const space = ref({
  name: DEMO.name,
  subtitle: DEMO.subtitle,
  privacy: DEMO.privacy,
  memberCount: DEMO.memberCount,
});
const members = ref(DEMO.members);
const stats = ref(DEMO.stats);
const coveragePct = ref(DEMO.coverage);
const coverageTip = ref(
  `距离 ${DEMO.coverageGoal}% 目标还差 ${DEMO.coverageGap} 只 · 继续加油`,
);
const recents = ref(DEMO.recents);

/** 详情页跳入时指定的小组（优先选中；缺省取第一个） */
const wantSpaceId = ref('');

onLoad((q: any) => {
  wantSpaceId.value = q?.spaceId ?? '';
});

/** 相对时间：今天 / 昨天 / N 天前 */
function relTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const day = 86400000;
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((n0 - d0) / day);
  if (diff <= 0) return '今天';
  if (diff === 1) return '昨天';
  return `${diff} 天前`;
}

onShow(async () => {
  try {
    // 小组 id：详情页带参优先；缺省取我加入的第一个小组
    let sid = wantSpaceId.value;
    if (!sid) {
      const mine: any = await api.get('/spaces/mine', undefined, { silent: true });
      sid = Array.isArray(mine) && mine.length > 0 ? mine[0]?.space?.id : '';
    }
    if (!sid) return; // 未加组 → 保留演示数据撑版

    // 成员专属接口；非成员（403）/离线 → catch 兜底走 DEMO
    const b: any = await api.get(`/spaces/${sid}/board`, undefined, { silent: true });
    if (b && b.id) {
      space.value = {
        name: b.name || DEMO.name,
        subtitle: `${b.memberCount ?? 1} 位邻居一起守护 · 你已加入，权限已解锁`,
        // Space 模型无公开/私密字段，胶囊文案按设计稿固定
        privacy: DEMO.privacy,
        memberCount: b.memberCount ?? DEMO.memberCount,
      };
      members.value = (b.members ?? []).slice(0, 3).map((m: any, i: number) => ({
        initial: m.initial || '友',
        color: ['green', 'clay', 'mustard'][i % 3],
      }));
      stats.value = [
        { n: String(b.catCount ?? 0), label: '猫口总数' },
        { n: String(b.sterilized ?? 0), label: '已绝育' },
        { n: String(b.monthRecords ?? 0), label: '本月记录' },
      ];
      coveragePct.value = b.coverage ?? 0;
      const cat = b.catCount ?? 0;
      const ster = b.sterilized ?? 0;
      if (cat === 0) {
        coverageTip.value = '暂无猫咪档案 · 把小区的猫加进来吧';
      } else if (coveragePct.value >= 80) {
        coverageTip.value = '已达成 80% 绝育目标 · 真棒';
      } else {
        const gap = Math.max(1, Math.ceil(cat * 0.8) - ster);
        coverageTip.value = `距离 80% 目标还差 ${gap} 只 · 继续加油`;
      }
      const r = (b.recents ?? []).map((x: any) => ({
        text: x.text,
        time: relTime(x.occurredAt),
      }));
      if (r.length > 0) recents.value = r;
      else recents.value = [{ text: '暂无协作记录', time: '发布第一条痕迹吧' }];
    }
  } catch {
    /* 离线 / 非成员 / 未加组 → 保留演示数据撑版 */
  }
});

function onPublish() {
  uni.navigateTo({ url: '/pages/record/create' });
}
</script>

<style scoped>
/* ============ 头卡：128.16pt = 256.32rpx ============ */
.head {
  margin-top: 22.08rpx;
  height: 256.32rpx;
  box-sizing: border-box;
  /* 1pt #D7D2C2 描边（实测 215,210,194）。S10 用 #D7D2C2，而 S1/S4 的 p3/p6 是
     #E2DCCA（226,220,202）—— 设计稿自身不统一，按页实测，勿全局统一 */
  border: 2rpx solid #D7D2C2;
  padding: 29.6rpx 30rpx 28rpx 30rpx;   /* 各方向已扣掉 2rpx 描边，保证内容位置不变 */
  background: #faf7f1;
  border-radius: 32rpx;
}
.head-t {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #3C4036;
  line-height: 1;
}
.head-sub {
  display: block;
  margin-top: 23.84rpx;
  font-size: 24rpx;
  color: #6E6F58;
  line-height: 1;
}
.avatars {
  display: flex;
  /* flex-start：设计里胶囊顶 ≈ 头像顶（188.03 / 188.28pt），不是垂直居中 */
  align-items: flex-start;
  margin-top: 19.76rpx;
}
.av {
  width: 55rpx;
  height: 55rpx;
  border-radius: 50%;
  margin-right: 1rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.av-t {
  /* 24rpx：设计「林」墨迹 11.16×11.16pt，按 0.927 的墨迹/字号比反推 ≈12.04pt */
  font-size: 24rpx;
  line-height: 1;
  color: #FAF7F1;
}
.av--green { background: #8FA08B; }
.av--clay { background: #C68B6F; }
.av--mustard { background: #D9C389; }
.av--mustard .av-t { color: #3C4036; }
.pill {
  margin-left: 1rpx;
  height: 51.4rpx;
  box-sizing: border-box;
  padding: 0 34rpx;
  border: 2rpx solid #C68B6F;
  border-radius: 25.7rpx;
  display: flex;
  align-items: center;
}
.pill-t {
  /* 21rpx：设计「公」「开」起点距 10.49pt（CJK 步进 = 字号）；曾误设 30rpx，
     结果胶囊整体宽 116pt vs 设计 96.19pt（+20pt） */
  font-size: 21rpx;
  color: #C68B6F;
  line-height: 1;
  white-space: nowrap;
}

/* ============ 三宫格：3 张独立卡 105.16×76.08pt ============ */
.stats {
  margin-top: 28.4rpx;
  height: 152.16rpx;
  display: flex;
  gap: 19.62rpx;
}
/* 实测设计 y=300 行底色分段：19.95–125.11 | 134.92–240.08 | 249.89–355.05
   → 卡宽 105.16pt、间隙 9.81pt（曾误做成「一张卡 + space-between」，
   3 张卡的缝被 cmp_bands 的整窗墨迹带吞掉，只在局部裁剪里看得见） */
.stat {
  width: 210.32rpx;
  height: 152.16rpx;
  box-sizing: border-box;
  padding-top: 41.2rpx;
  background: #faf7f1;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-n {
  font-size: 40rpx;
  font-weight: 600;
  color: #3C4036;
  line-height: 1;
}
.stat-l {
  margin-top: 11.1rpx;
  font-size: 22rpx;
  color: #8B8779;
  line-height: 1;
}

/* ============ 进度卡：95.69pt = 191.38rpx ============ */
.prog {
  margin-top: 28.4rpx;
  height: 191.38rpx;
  box-sizing: border-box;
  border: 2rpx solid #D7D2C2;
  padding: 36.12rpx 26.8rpx 0 26.8rpx;
  background: #faf7f1;
  border-radius: 32rpx;
}
.prog-h {
  display: flex;
  align-items: flex-start;
}
.prog-lbl {
  font-size: 26rpx;
  color: #3C4036;
  line-height: 1;
}
.prog-pct {
  /* -3.12rpx：设计稿里标签与百分比是「墨迹顶对齐」（同为 373.78/373.79pt），
     但 36rpx 数字的行盒偏移比 26rpx 中文小 1.56pt，故用负 margin 把墨迹顶推平 */
  margin-top: -3.12rpx;
  margin-left: 15.6rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #C68B6F;
  line-height: 1;
}
.prog-bar {
  /* 设计：标签墨迹顶→条顶 = 26.04pt；标签与百分比是 flex 同级，
     .prog-h 高度受 36rpx 数字行盒撑到 16.44pt（不是标签的 13pt），
     故 margin 只有 22.0rpx（曾误用 28.08rpx，条整体低 3.04pt） */
  margin-top: 22.0rpx;
  width: 100%;
  height: 20rpx;
  background: #E7DFD4;
  border-radius: 10rpx;
  overflow: hidden;
}
.prog-fill {
  height: 100%;
  background: #C68B6F;
  border-radius: 10rpx;
  min-width: 4rpx;
}
.prog-sub {
  display: block;
  margin-top: 17.10rpx;
  font-size: 22rpx;
  color: #8B8779;
  line-height: 1;
}

/* ============ 最近协作：149.80pt = 299.60rpx ============ */
.recent {
  margin-top: 28.4rpx;
  height: 299.60rpx;
  box-sizing: border-box;
  border: 2rpx solid #D7D2C2;
  padding: 29rpx 26.8rpx 0 26.8rpx;
  background: #faf7f1;
  border-radius: 32rpx;
}
.recent-h {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #3C4036;
  line-height: 1;
}
/* 设计稿行间**没有**分隔线（y=521 整行纯纸白），用等高行 + 居中排版控节奏
   ⚠️ 时间**不是**右对齐：设计是「姓名 动作 · 时间」一整条左对齐文本流，
      时间紧跟在 · 之后（实测行 1 墨迹 34.88→223.56pt，右侧留白 130pt）。
      曾误做成 space-between 右对齐 —— cmp_bands 只量带范围，抓不到这类
      「带内文字重排」的差异，必须靠局部裁剪目视复核。 */
.recent-list {
  margin-top: 11.70rpx;
}
.recent-r {
  height: 50rpx;
  display: flex;
  align-items: center;
}
.recent-t {
  font-size: 24rpx;
  color: #6E6F58;
  line-height: 1;
  white-space: nowrap;
}

/* ============ CTA：49.71pt = 99.42rpx ============ */
.cta {
  margin-top: 28.4rpx;
  height: 99.42rpx;
  background: #8FA08B;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cta-t {
  /* top:-2rpx：H5 字体在白底按钮里的墨迹中心比设计字体低 1pt（同为 32rpx、
     墨迹高都是 14.88pt），用相对位移纠偏，别改 line-height */
  position: relative;
  top: -2rpx;
  font-size: 32rpx;
  color: #FAF7F1;
  line-height: 1;
}

/* ============ 底栏：10.82pt = 21.64rpx ============ */
.tail {
  margin-top: 29.78rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tail-t {
  font-size: 24rpx;
  color: #A5A293;
  line-height: 1;
}
</style>