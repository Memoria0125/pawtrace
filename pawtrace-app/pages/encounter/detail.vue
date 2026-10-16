<template>
  <!--
    S8 今日相遇·盲盒详情（PRD F3.1「今日相遇」）
    设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p10，逐像素实测（375×812 @2.9573x，1 设计 px = 2rpx）
    结构：自绘导航（返回 / 今日相遇 / 稍后再说）→ 主档案卡（胶带 → 照片框 → 标签+已开启徽章
          → 标题两行 → 灰色副行 → 时间/地点双胶囊 → 遇见神态 → 位置模糊说明）
          → 主按钮「去看看它 →」→ 幽灵按钮「今天先不打扰」→ 手账寄语 → 推荐理由卡
    三处刻意处理（非漏做）：
      1. 导航栏自绘（navigationStyle: custom）：设计稿要「返回 + 居中大标题 + 右侧文字」三栏，
         且左右两块等宽（230rpx）才能让 flex:1 的标题真正落在页中（375rpx）；
      2. 标题第 2 行「你」与灰色副行「它在你常喂食…」在**设计稿本身就重叠 5.3pt**
         ——灰行 margin-top 为负值，属设计稿原样复制，不是布局塌陷；
      3. 底部推荐理由卡在设计稿里被视口裁断（延伸到 812pt 之外），故本页高度 > 视口、
         可滚动，卡片 padding-bottom 留足让下沿落在首屏之外。
  -->
  <view class="paw-page s8">
    <!-- ============ 自绘导航（paw-navbar 共享组件，详见 components/paw-navbar） ============
         p10 实测：标题「今日相遇」墨迹 137.63~232.31pt，中心 184.97pt
         L=200、R=210.1 → 中心 369.95rpx = 184.97pt ✓
         右块：稍后再说 26rpx #8FA08B（paw-nav-act--muted），墨迹右端 348.63pt
         rightPad=12.74：内沿 710rpx（页 padding 40rpx）− 墨迹 697.26rpx -->
    <paw-navbar
      title="今日相遇"
      :left-w="200"
      :right-w="210.1"
      :right-pad="12.74"
    >
      <template #right>
        <text class="paw-nav-act paw-nav-act--muted" @tap="onLater">稍后再说</text>
      </template>
    </paw-navbar>

    <!-- ============ 主档案卡 ============ -->
    <view class="card">
      <!-- 芥末黄胶带：压住卡片上沿、向上探出 8pt（半透，跨卡内外会呈现不同底色） -->
      <view class="tape"></view>

      <!-- 照片框（淡紫底 + 档案照占位文案，照片上传后替换） -->
      <view class="photo">
        <view class="tag">{{ d.tag }}</view>
        <view class="badge">
          <text class="badge-txt">{{ d.opened }}</text>
        </view>
        <text class="photo-ph">{{ d.photoLabel }}</text>
      </view>

      <!-- 标题（设计稿为固定断行：「…小区等」/「你」） -->
      <view class="headline">
        <text class="hl-line">今天，一只三花小猫在静安小区等</text>
        <text class="hl-line">你</text>
      </view>

      <!-- 灰色副行：设计稿与上一行「你」重叠，故 margin-top 为负 -->
      <text class="sub">它在你常喂食的花坛边，等了 12 分钟。</text>

      <!-- 时间 / 地点双胶囊（设计稿两胶囊内边距不同，按实测宽度定宽） -->
      <view class="pills">
        <view class="pill pill--time">{{ d.time }}</view>
        <view class="pill pill--spot">{{ d.spot }}</view>
      </view>

      <text class="see">看见它的时候：蹭蹭、打滚、等投喂</text>
      <text class="loc">位置已模糊到小区级 · 仅用于记录</text>
    </view>

    <!-- ============ 主按钮 ============ -->
    <view class="cta" @tap="onGo">
      <text class="cta-txt">去看看它</text>
      <text class="cta-arrow">→</text>
    </view>

    <!-- ============ 幽灵按钮 ============ -->
    <view class="ghost" @tap="onLater">
      <text class="ghost-txt">今天先不打扰</text>
    </view>

    <!-- ============ 手账寄语 ============ -->
    <text class="quote">观测是一种温柔的陪伴。</text>

    <!-- ============ 推荐理由卡（设计稿被视口裁断） ============ -->
    <view class="bcard">
      <text class="bcard-t">为什么推荐给你？</text>
      <text class="bcard-b">你在这个位置见过它 6 次，是最近最常出现的新面孔。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { goBack as goNav } from '../../common/nav';

/**
 * 演示数据兜底：与设计稿 p10 完全同款。
 * 后端未启动 / 离线时撑起版面；字段结构与「今日相遇」接口对齐，阶段 3 联调后由 API 回填。
 */
const DEMO = {
  id: '',
  tag: '今日新朋友',
  opened: '已开启',
  photoLabel: '三花档案照',
  photoUrl: '',
  title: '今天，一只三花小猫在静安小区等你',
  time: '今天 08:24',
  spot: '静安小区 · 3号楼旁',
  seen: '蹭蹭、打滚、等投喂',
  minutes: 12,
  profileId: '',
  reasons: '你在这个位置见过它 6 次，是最近最常出现的新面孔。',
};

const d = ref<any>({ ...DEMO });

onLoad(async (q) => {
  d.value.id = q?.id || '';
  if (!d.value.id) return; // 无 id：保持演示数据撑版面
  try {
    // silent：/encounters 模块属阶段 3 后端范畴，当前尚未上线（会 404）；
    // 拿不到就用演示数据撑版面，不要在顶部弹「请求失败」打断用户。
    const r = await api.get(`/encounters/${d.value.id}`, undefined, { silent: true });
    d.value = {
      ...DEMO,
      ...r,
      // TODO(阶段3)：photoLabel / title / minutes 由「相遇」记录聚合生成，reasons 由推荐算法回填
      photoLabel: r?.profileName ? `${r.profileName}档案照` : DEMO.photoLabel,
    };
  } catch { /* 离线：保持演示数据 */ }
});

/**
 * 「稍后再说」/「今天先不打扰」：同为「关闭今日相遇盲盒」 —— 与「返回」等效
 * （栈深不足时回首页 Tab）。交给 common/nav.goBack 与 <paw-navbar> 同源处理。
 */
const onLater = () => goNav();

/** 去看看它：跳到该个体档案详情（阶段 3 联调后再接定位导航） */
const onGo = () => {
  if (d.value.profileId) {
    uni.navigateTo({ url: `/pages/profile/detail?id=${d.value.profileId}` });
    return;
  }
  uni.showToast({ title: '查看档案（阶段3）', icon: 'none' });
};
</script>

<style scoped>
/* 页面底色 = 米底令牌；本页非 Tab 页，内容高于视口（设计稿底卡被裁断） */
.s8 {
  min-height: 100vh;
  background: #f0ebdf;
  box-sizing: border-box;
}

/* 自绘导航的几何来自 components/paw-navbar（统一真值：返回 30rpx、箭头 3×6.4pt）。
   本页只补：实测 .card 距导航行底 22.7rpx，与设计稿一致 */

/* ============ 主档案卡（实测 399.68pt 高 → 800rpx，描边 1pt #D7D2C2） ============ */
.card {
  position: relative;
  height: 800rpx;
  margin-top: 22.7rpx;
  box-sizing: border-box;
  padding: 30rpx 30rpx 0;
  background: #faf7f1;
  border: 2rpx solid #d7d2c2;
  border-radius: 44rpx;
}
/* 胶带实测 rgba(217,198,138,.75)（用「跨卡内外两处底色联立」解出 α=0.75、本色 #D9C68A）
   位置：card 内左 238rpx、向上探出 18rpx，220×44rpx */
.tape {
  position: absolute;
  left: 238rpx;
  top: -18rpx;
  width: 220rpx;
  height: 44rpx;
  background: rgba(217, 198, 138, 0.75);
  border-radius: 4rpx;
  z-index: 2;
}
/* 照片框：卡内左右各 30rpx 内边距 → 606rpx 宽 × 360rpx 高，淡紫底 #E6E7EB，圆角 24rpx
   （实测设计稿照片框 y 137.80–317.80 = 180.00pt = 360rpx；顶边与实现完全对齐）
   注意：不加 overflow:hidden —— 设计稿里「今日新朋友」与「已开启」徽章都压过圆角边线 */
.photo {
  position: relative;
  width: 100%;
  height: 360rpx;
  background: #e6e7eb;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 标签：实测 200×56rpx，紧贴照片框左上（上内缩 8rpx），墨绿底白字 22rpx */
.tag {
  position: absolute;
  left: 0;
  top: 8rpx;
  width: 200rpx;
  height: 56rpx;
  border-radius: 28rpx;
  background: #647260;
  color: #faf7f1;
  font-size: 22rpx;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 已开启徽章：实测外径 55.79pt → 112rpx，紧贴照片框右上角，环 2rpx #C68B6F */
.badge {
  position: absolute;
  top: 0;
  right: 0;
  width: 112rpx;
  height: 112rpx;
  box-sizing: border-box;
  border: 2rpx solid #c68b6f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.badge-txt {
  font-size: 22rpx;
  color: #c68b6f;
  line-height: 1;
  white-space: nowrap;
}
/* 档案照占位文案：实测步进 28.91pt → 58rpx，色 #686E78
   flex 居中后墨迹仍比设计稿低 1.61pt（字体基线度量），用 relative 上提而不动布局流 */
.photo-ph {
  position: relative;
  top: -3.2rpx;
  font-size: 58rpx;
  color: #686e78;
  line-height: 1;
}

/* ============ 标题两行（实测步进 17.1pt → 34rpx，行距 42rpx） ============ */
/* 设计稿是固定断行（第 1 行 15 字 + 第 2 行「你」），故拆两个 block 行，避免依赖容器宽度断行
   margin-top 23rpx：因上一块照片框修正为 360rpx（+1rpx），此处同步 −1rpx 保持下方内容不动 */
.headline {
  display: block;
  margin-top: 22rpx;
}
.hl-line {
  display: block;
  font-size: 34rpx;
  font-weight: 400;
  line-height: 42rpx;
  color: #3c4036;
}
/* 灰色副行：实测步进 14.1pt → 28rpx；与上一行「你」重叠 5.3pt（设计稿原样） */
.sub {
  display: block;
  margin-top: -20rpx;
  font-size: 28rpx;
  line-height: 36rpx;
  color: #57584d;
}

/* ============ 时间 / 地点胶囊（实测高 56rpx，底 #EFE8D8，字 24rpx #8B8779） ============ */
.pills {
  display: flex;
  margin-top: 34rpx;
}
/* 两胶囊实测内边距不同（29rpx vs 49rpx），故按设计稿实测宽度定宽而不是用 padding */
.pill {
  height: 56rpx;
  border-radius: 28rpx;
  background: #efe8d8;
  color: #8b8779;
  font-size: 24rpx;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.pill--time {
  width: 176rpx;
}
.pill--spot {
  width: 316rpx;
  margin-left: 16rpx;
}

/* 遇见神态：实测步进 13.05pt → 26rpx，字重 600（笔画比 1.01/13 偏粗）
   margin-top 53→55rpx：line-height 带来的基线偏移使墨迹比设计稿高 1.01pt，补间距 */
.see {
  display: block;
  margin-top: 55rpx;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 36rpx;
  color: #3c4036;
}
/* 位置说明：实测步进 11.16pt → 22rpx，色 #A5A293
   margin-top 25→23rpx：抵消上面 .see 的 +2rpx，让本行仍落在设计稿位置（实测 Δ≤0.34pt） */
.loc {
  display: block;
  margin-top: 23rpx;
  font-size: 22rpx;
  line-height: 31rpx;
  color: #a5a293;
}

/* ============ 主按钮「去看看它 →」（实测 670×99.4rpx，绿底白字 32rpx） ============ */
.cta {
  height: 100rpx;
  margin-top: 36rpx;
  border-radius: 50rpx;
  background: #8fa08b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cta:active {
  opacity: 0.86;
}
.cta-txt {
  position: relative;
  top: -2rpx; /* 实测 CJK 墨迹比设计稿低 1.01pt（字体基线度量），上提补偿 */
  font-size: 32rpx;
  color: #faf7f1;
  line-height: 1;
}
/* 箭头与文字间距实测 15.5rpx（flex 容器会吞掉标签间空白，间距只能靠 margin）
   箭头字形与设计稿长宽比不同（设计 11.16×10.14pt；H5 的「→」是 14.21×7.10pt 扁平款），
   故按实测比做非等比缩放：横向 ×0.785、纵向 ×1.43，transform 不影响布局流，
   墨迹起点仍落在设计稿的 216.07pt。 */
.cta-arrow {
  display: block;
  margin-left: 16rpx;
  transform: scale(0.785, 1.43);
  transform-origin: 0 50%;
  font-size: 32rpx;
  color: #faf7f1;
  line-height: 1;
}

/* ============ 幽灵按钮「今天先不打扰」（实测 99.4rpx，纸白底 + 2rpx #C7C2AF 描边） ============ */
.ghost {
  height: 100rpx;
  margin-top: 36rpx;
  box-sizing: border-box;
  border: 2rpx solid #c7c2af;
  border-radius: 50rpx;
  background: #faf7f1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ghost:active {
  opacity: 0.86;
}
.ghost-txt {
  position: relative;
  top: -2.7rpx; /* 实测墨迹比设计稿低 1.35pt（与 CTA 同源的字形度量差），上提补偿 */
  font-size: 30rpx;
  color: #8b8779;
  line-height: 1;
}

/* ============ 手账寄语（实测步进 12.03pt → 24rpx，居中，色 #A5A293） ============ */
.quote {
  display: block;
  margin-top: 32rpx;
  text-align: center;
  font-size: 24rpx;
  line-height: 34rpx;
  color: #a5a293;
}

/* ============ 推荐理由卡（设计稿被视口裁断 → 下沿留在首屏之外） ============ */
.bcard {
  margin-top: 36rpx;
  box-sizing: border-box;
  padding: 24.7rpx 28rpx 130rpx; /* 上内边距 23→24.7rpx：实测标题墨迹比设计稿高 0.845pt */
  background: #faf7f1;
  border: 2rpx solid #d7d2c2;
  border-radius: 36rpx;
}
.bcard-t {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 36rpx;
  color: #3c4036;
}
.bcard-b {
  display: block;
  margin-top: 6.3rpx; /* 8→6.3rpx：抵消上面 +1.7rpx，让正文仍落在设计稿位置 */
  font-size: 24rpx;
  line-height: 34rpx;
  color: #6a6a5c;
}
</style>
