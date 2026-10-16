<template>
  <!--
    S1 爪迹观测台（首页 / Tab1）
    设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p3，逐像素实测（375×812 @2.957x）
    结构：日期+大标题+装饰圆+黄胶带 → 今日相遇盲盒 → 三宫格统计 → 最近踪迹列表 → 自绘 TabBar
    2026-10-11 增补：今日相遇盲盒的本地缓存按账号分区（key 带 uid + owner 校验 + onShow 无条件重算），
                    修「换个账号登录还是上一个账号拆开的盲盒」
  -->
  <view class="paw-page paw-page--tabbed">
    <!-- ============ 顶部标题区 ============ -->
    <view class="hero">
      <text class="hero-date">{{ dateLine }}</text>
      <text class="hero-title">爪迹观测台</text>
      <view class="hero-dot"></view>
      <view class="paw-tape hero-tape"></view>
    </view>

    <!-- ============ 今日相遇·治愈盲盒（F4.1） ============ -->
    <view class="paw-card meet">
      <view class="meet-head">
        <text class="meet-title">今日相遇</text>
        <view class="paw-pill paw-pill--mustard"><text class="pill-txt">{{ boxCat ? '今日已相遇' : '盲盒待拆' }}</text></view>
      </view>

      <!-- 已拆开：显示今天遇见的那只（当天固定，本地缓存） -->
      <view v-if="boxCat" class="meet-body" @tap="goBoxCat">
        <view class="meet-photo">
          <image v-if="boxCat.avatar" class="meet-photo-img" :src="boxCat.avatar" mode="aspectFill" />
          <text v-else class="meet-photo-txt">{{ boxCat.name }}</text>
        </view>
        <view class="meet-info">
          <text class="meet-cat">{{ boxCat.name }}</text>
          <text class="meet-meta">{{ boxCat.meta }}</text>
        </view>
      </view>
      <view v-else class="meet-body">
        <paw-print :size="56" />
        <text class="meet-tip">等待与第一只小家伙相遇…</text>
      </view>

      <view class="paw-btn" @tap="boxCat ? goBoxCat() : openBox()">{{ boxCat ? '查看它的档案' : '拆开今日盲盒' }}</view>
    </view>

    <!-- ============ 三宫格统计 ============ -->
    <view class="stats">
      <view class="stat" v-for="s in statList" :key="s.label">
        <text class="stat-num">{{ s.value }}</text>
        <text class="stat-label">{{ s.label }}</text>
      </view>
    </view>

    <!-- ============ 最近踪迹 ============ -->
    <view class="sec-head">
      <text class="sec-title">最近踪迹</text>
      <text class="sec-more" @tap="goHistory">查看全部 →</text>
    </view>

    <view
      class="paw-card trace"
      v-for="t in traces"
      :key="t.id"
      @tap="goProfile(t)"
    >
      <view class="trace-avatar">
        <image v-if="t.avatar" class="trace-photo" :src="t.avatar" mode="aspectFill" />
      </view>
      <view class="trace-main">
        <view class="trace-row1">
          <text class="trace-name">{{ t.name }}</text>
          <text class="trace-rel">· {{ t.rel }}</text>
          <view class="paw-pill" :class="t.filed ? 'paw-pill--green' : 'paw-pill--mustard'">
            <text class="pill-txt">{{ t.filed ? '已建档' : '待建档' }}</text>
          </view>
        </view>
        <text class="trace-sub">{{ t.place }} · {{ t.time }}</text>
      </view>
    </view>

    <!-- 空态（2026-10-08 晚）：游客 / 新注册账号还没有任何观察 → 不再显示设计稿演示卡。
         不可点（建档入口就是底部悬浮的「记录」按钮，这里只做说明，避免多一条歧义路径）。 -->
    <view v-if="!traces.length" class="paw-card trace-empty">
      <text class="trace-empty-t">还没有观察记录</text>
      <text class="trace-empty-s">{{ guest ? '登录后记录你遇见的每一只小家伙，这里会按时间列出最近踪迹' : '去「记录」建个档，这里会按时间列出最近踪迹' }}</text>
    </view>

    <!-- 自绘 TabBar（原生条已隐藏，见 components/paw-tabbar） -->
    <paw-tabbar />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { requireLogin, probePublic } from '../../common/auth';
import { assetUrl } from '../../common/uploader';
import PawPrint from '../../components/paw-print/paw-print.vue';
import PawTabbar from '../../components/paw-tabbar/paw-tabbar.vue';

/**
 * 演示数据开关：后端数据库为空时用设计稿同款数据撑住版面。
 * 阶段 3 前后端联调完成后改成 false（或在「我的-开发者选项」里做成开关）。
 */
const DEMO_FALLBACK = true;

interface TraceItem {
  id: string;
  name: string;
  rel: string;
  filed: boolean;
  place: string;
  time: string;
  avatar?: string;
}

/** 设计稿 p3 原始内容，用作空库时的兜底 */
const DEMO_TRACES: TraceItem[] = [
  { id: 'demo-1', name: '小橘', rel: '常驻点位', filed: true, place: '大悦城东门', time: '昨天 18:42' },
  { id: 'demo-2', name: '花臂', rel: '新面孔', filed: false, place: '三号院车棚', time: '今天 12:05' },
];

const traces = ref<TraceItem[]>(DEMO_TRACES);
/** 三宫格统计：已建档 / 今日记录 / 城市点位（2026-10-07 后两项接真，均为**本人口径**）
 *  ⚠️ 「城市点位」2026-10-11 用户定案改为**我去过的点位覆盖了几个城市**（`/records/stats` 的 cities）。
 *  此前读的是 spots（去重点位名数），用户报障「记录都在杭州市却显示 5」——读数来自点位个数，非城市数。
 *  DEMO 兜底帧的 12/3/8 是设计稿原值（像素基线依赖），**刻意不动**。 */
const statList = ref([
  { value: 12, label: '已建档' },
  { value: 3, label: '今日记录' },
  { value: 8, label: '城市点位' },
]);

/**
 * 游客 / 空数据态（2026-10-08 晚）：
 * - 接口**成功返回空**（新注册账号还没建档）→ 清掉演示数据，改渲染空态卡
 * - 接口回 **401**（游客，无 token 且后端可达）→ 同上
 * - 请求**网络层失败**（离线 / 后端未启动 / 像素核对拦截 API）→ 保留设计稿演示数据撑版面
 *   （S1 的像素验收图正是在拦截态拍的，兜底帧不能动）
 */
const guest = ref(false);

/**
 * 今日相遇盲盒结果（真实态；当天一只，存本地避免重复随机）。
 *
 * ⚠️ 2026-10-11 修「换了个账号登录，还是原先那个账号拆开的盲盒」：
 * 原 key 只按日期（`blindbox_2026-10-11`）、不含用户标识 ⇒ 同一浏览器换账号后
 * `onShow` 照样把它读回来。首页是 tabBar 页、切账号/登出不销毁实例，
 * 所以光换 key 还不够：**每次 onShow 都要按当前账号无条件重算**（见下）。
 */
const boxCat = ref<null | { id: string; name: string; meta: string; avatar: string; owner?: string }>(null);

/** 当前登录用户 id —— 盲盒缓存的**分区键**（游客为空串，天然与其他账号隔离） */
const currentUid = (): string => {
  const u = uni.getStorageSync('user');
  return u && u.id ? String(u.id) : '';
};

const boxKey = () => `blindbox_${currentUid()}_${new Date().toISOString().slice(0, 10)}`;

/** 清理旧格式键（`blindbox_YYYY-MM-DD`，没有 uid 分区）—— 它们正是跨账号串号的来源，遇到就清掉 */
function purgeLegacyBoxKeys() {
  try {
    const keys: string[] = (uni.getStorageInfoSync() as any)?.keys || [];
    keys.forEach((k: string) => {
      if (/^blindbox_\d{4}-\d{2}-\d{2}$/.test(k)) uni.removeStorageSync(k);
    });
  } catch {
    /* 拿不到键清单时静默跳过，不影响主流程 */
  }
}

/**
 * 顶栏日期行：设计稿为「8月24日 · 周一 · 晴」。
 * 天气走第三方接口（PRD 6.x，阶段 3 接），当前先用与设计稿一致的占位值撑住版面。
 */
const DEMO_WEATHER = '晴';

const dateLine = computed(() => {
  const d = new Date();
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  const parts = [`${d.getMonth() + 1}月${d.getDate()}日`, week];
  if (DEMO_WEATHER) parts.push(DEMO_WEATHER);
  return parts.join(' · ');
});

/** ISO 时间 → 「今天 12:05 / 昨天 18:42 / 9月10日」 */
function friendlyTime(iso?: string | null): string {
  if (!iso) return '时间待记录';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '时间待记录';
  const hm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  const now = new Date();
  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDay = Math.floor((day0 - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 86400000);
  if (diffDay === 0) return `今天 ${hm}`;
  if (diffDay === 1) return `昨天 ${hm}`;
  if (diffDay === 2) return `前天 ${hm}`;
  return `${t.getMonth() + 1}月${t.getDate()}日 ${hm}`;
}

onShow(async () => {
  // ── 今日相遇盲盒：**始终按当前账号重算**（2026-10-11 修跨账号串号）──
  // 只写「读到才覆盖」是不够的：首页是 tabBar 页，切账号 / 登出 / 切 Tab 都不会
  // 销毁实例，残留的 boxCat 会继续渲染上一个账号拆开的那只 ⇒ 必须无条件赋值。
  purgeLegacyBoxKeys();
  const uid = currentUid();
  const cached = uni.getStorageSync(boxKey());
  boxCat.value = cached && cached.id && cached.owner === uid ? cached : null;

  // ── 未登录（游客）──
  // 先探活一个公开接口：通了 → 后端在线、确实没有我的数据 → 空态；
  // 不通（离线 / 后端未启动 / 像素核对拦截 API）→ 保留设计稿演示数据撑版面。
  // ⚠️ 不能用「本地有没有 token」直接判游客：S1 的像素验收图正是在「无 token + 拦截 API」下拍的。
  if (!uni.getStorageSync('token')) {
    const online = await probePublic();
    if (online) {
      guest.value = true;
      traces.value = [];
      statList.value = [
        { value: 0, label: '已建档' },
        { value: 0, label: '今日记录' },
        { value: 0, label: '城市点位' },
      ];
    }
    return;
  }

  // ── 已登录 ──
  // real = 拿到了「真实（含空）结果」：新注册账号返回空数组时也要清掉演示数据
  let real = false;
  try {
    const profiles = await api.get<any[]>('/profiles');
    if (Array.isArray(profiles)) {
      real = true;
      traces.value = profiles.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name || '未命名',
        rel: p.lastSeenDesc ? '最近出现' : '待补充点位',
        filed: true, // 后端返回的都是已建档个体
        place: p.lastSeenDesc || '位置待记录',
        time: friendlyTime(p.lastSeenAt),
        avatar: assetUrl(p.avatarPhoto?.url),
      }));
      statList.value = [
        { value: profiles.length, label: '已建档' },
        { value: statList.value[1].value, label: '今日记录' },
        { value: statList.value[2].value, label: '城市点位' },
      ];
    }
  } catch {
    // 离线/后端未启动：保持演示数据，页面照常可看（阶段 3 接本地 sqlite 草稿队列）
  }

  // 本人口径统计（今日记录 / 我去过的点位）；失败则保持演示值
  try {
    const s: any = await api.get('/records/stats');
    if (s) {
      real = true;
      statList.value = [
        { value: statList.value[0].value, label: '已建档' },
        { value: s.today ?? 0, label: '今日记录' },
        { value: s.cities ?? 0, label: '城市点位' },
      ];
    }
  } catch { /* 离线：保持演示值 */ }
});

/** 拆盲盒（2026-10-07）：随机抽一只「别人建档 + 我还没关注」的猫；池空给明确文案 */
const openBox = async () => {
  // 游客：盲盒是「我的」功能，先去登录（同时避免一次无意义的 401）
  if (!requireLogin()) return;
  try {
    const r: any = await api.get('/profiles/blindbox', undefined, { silent: true });
    if (!r || !r.cat) {
      uni.showToast({ title: '附近的猫都进了你的观测对象', icon: 'none' });
      return;
    }
    const c = r.cat;
    const item = {
      id: c.id,
      name: c.name || '未命名',
      meta: `${c.lastSeenDesc || '点位待记录'} · 记录 ${c._count?.records ?? 0} 条`,
      avatar: assetUrl(c.avatarPhoto?.url),
      owner: currentUid(), // 归属标记（与 boxKey 双重校验，换账号即失效）
    };
    boxCat.value = item;
    uni.setStorageSync(boxKey(), item);
  } catch {
    // 离线兜底：保留设计稿那句提示
    uni.showToast({ title: '盲盒要等你遇见第一只小家伙', icon: 'none' });
  }
};

const goBoxCat = () => {
  if (!boxCat.value) return;
  uni.navigateTo({ url: `/pages/profile/detail?id=${boxCat.value.id}` });
};
const goHistory = () => uni.switchTab({ url: '/pages/history/index' });
const goProfile = (t: TraceItem) => {
  if (t.id.startsWith('demo-')) {
    uni.showToast({ title: '演示数据，先去「记录」建个档吧', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/profile/detail?id=${t.id}` });
};
</script>

<style scoped>
/* ============ 顶部标题区（S1 实测：日期 24rpx / 标题 60rpx / 胶带 192×36rpx） ============ */
.hero {
  position: relative;
  /* 实测：设计稿状态栏占位后标题行起点在 y≈96px(设计) → 页面顶留白 48rpx */
  padding-top: 48rpx;
}
.hero-date {
  font-size: 24rpx;
  line-height: 1.4;
  color: #8a8a7e;
}
.hero-title {
  display: block;
  margin-top: 6rpx;
  font-size: 56rpx;
  font-weight: 800;
  line-height: 1.2;
  color: #3c4036;
}
/* 右上角装饰圆（实测 83rpx，颜色比底色深一档） */
.hero-dot {
  position: absolute;
  right: 0;
  top: 22rpx;
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  background: #e7dfd4;
}
.hero-tape {
  margin-top: 40rpx;
}

/* ============ 今日相遇卡片 ============ */
.meet {
  margin-top: 32rpx;
}
.meet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.meet-title {
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.3;
  color: #3c4036;
}
.meet-body {
  padding: 26rpx 0 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.meet-tip {
  margin-top: 40rpx;
  font-size: 28rpx;
  line-height: 1.4;
  color: #8a8a7e;
}
/* ---- 盲盒已拆开（2026-10-07 真实数据态）----
   与未拆态同高（未拆：爪印 56 + tip；已拆：照片 120 一行），只替换卡片内部内容 */
.meet-body:active {
  opacity: 0.9;
}
.meet-photo {
  width: 120rpx;
  height: 120rpx;
  border-radius: 24rpx;
  background: #e6e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.meet-photo-img {
  width: 100%;
  height: 100%;
}
.meet-photo-txt {
  font-size: 22rpx;
  color: #757980;
  line-height: 1.15;
}
.meet-info {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.meet-cat {
  font-size: 32rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1.2;
}
.meet-meta {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8b8779;
  line-height: 1.3;
}

/* ============ 三宫格统计（卡高 139rpx，间距 20rpx） ============ */
.stats {
  display: flex;
  gap: 20rpx;
  margin-top: 38rpx;
}
.stat {
  flex: 1;
  height: 139rpx;
  background: #faf7f1;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.stat-num {
  font-size: 56rpx;
  font-weight: 700;
  line-height: 1.1;
  color: #56674e;
}
.stat-label {
  margin-top: 4rpx;
  font-size: 22rpx;
  line-height: 1.2;
  color: #8a8a7e;
}

/* ============ 最近踪迹 ============ */
.sec-head {
  display: flex;
  align-items: baseline;
  margin: 34rpx 0 32rpx;
}
.sec-title {
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.2;
  color: #3c4036;
}
/* 设计稿里「查看全部 →」紧跟标题左对齐，不是靠右 */
.sec-more {
  margin-left: 8rpx;
  font-size: 24rpx;
  line-height: 1.2;
  color: #8a8a7e;
}

/* ============ 踪迹列表卡（实测高 178rpx，头像圆 96rpx） ============ */
.trace {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  height: 178rpx;
  margin-bottom: 30rpx;
}
/* 空态卡（2026-10-08 晚）：和踪迹卡同宽同圆角，矮一些（没有头像行），只放两行说明 */
.trace-empty {
  margin-bottom: 30rpx;
  padding: 44rpx 32rpx 46rpx;
}
.trace-empty-t {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.trace-empty-s {
  display: block;
  margin-top: 20rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 34rpx;
}
.trace-avatar {
  flex: none;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #e7dfd4;
  overflow: hidden;
}
.trace-photo {
  width: 96rpx;
  height: 96rpx;
}
.trace-main {
  flex: 1;
  min-width: 0;
  margin-left: 32rpx;
}
.trace-row1 {
  display: flex;
  align-items: center;
}
.trace-name {
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.3;
  color: #3c4036;
}
.trace-rel {
  margin-left: 6rpx;
  margin-right: 12rpx;
  font-size: 26rpx;
  line-height: 1.3;
  color: #8a8a7e;
}
.trace-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.3;
  color: #8a8a7e;
}

/* 胶囊里的文字（小程序端 text 不能直接继承 flex 对齐，包一层 */
.pill-txt {
  font-size: 22rpx;
  line-height: 1;
}

/* 「别人建档、我在观测」的来源标（2026-10-06 加后又撤）：
   用户当晚决定不在首页标注建档来源，样式与模板一并移除。 */
</style>
