<!--
  小组详情二级列表（成员 / 猫咪 / 打卡），2026-10-08 新增（设计稿无此页）
  入口：pages/space/detail.vue 的 stat 三宫格（位成员 / 只猫咪 / 次打卡）整卡可点
  路由：/pages/space/lists?spaceId=...&tab=members|profiles|records
  同一页用 tab 切换（避免做三张几乎一样的页面），点哪个 stat 进哪个 tab
  风格：复用 paw-page / paw-card 基座，米底 + 纸白卡 + 苔绿/陶土/驼色点缀
-->
<template>
  <view class="paw-page lists">
    <paw-navbar
      :title="navTitle"
      back-url="/pages/space/detail"
      :back-q="backQuery"
      :back-tab="false"
    />

    <!-- 头卡：小段位简介（不喧宾夺主，让 tab 列表是主角） -->
    <view v-if="space" class="head">
      <text class="head-t">{{ space.name }}</text>
      <view class="head-meta">
        <text class="head-meta-t">{{ space.community || '未标注小区' }}</text>
        <text class="head-meta-dot">·</text>
        <text class="head-meta-t">{{ space._count?.members ?? 0 }} 位成员</text>
        <text class="head-meta-dot">·</text>
        <text class="head-meta-t">{{ space._count?.profiles ?? 0 }} 只猫咪</text>
      </view>
    </view>

    <!-- tab 切换条：3 个均分胶囊（不带下划线，整块高亮更贴近手账） -->
    <view class="tabs">
      <view
        v-for="t in TAB_DEFS"
        :key="t.key"
        class="tab"
        :class="{ 'tab--on': tab === t.key }"
        @tap="setTab(t.key)"
      >
        <text class="tab-t">{{ t.label }} · {{ counts[t.key] }}</text>
      </view>
    </view>

    <!-- ====== 成员 ====== -->
    <view v-if="tab === 'members'" class="list">
      <view v-if="!members.length" class="empty">
        <text class="empty-t">小组还没有成员</text>
      </view>
      <view v-for="(m, mi) in members" :key="m.userId" class="card m-card">
        <view class="av" :class="'av--' + avatarTone(m.role, mi)">
          <text class="av-t">{{ (m.nickname || '?').slice(0, 1) }}</text>
        </view>
        <view class="m-body">
          <view class="m-row1">
            <text class="m-name">{{ m.nickname || '匿名' }}</text>
            <view v-if="m.role === 'OWNER'" class="role-tag">
              <text class="role-tag-t">组长</text>
            </view>
          </view>
          <text class="m-sub">本组投喂 {{ m.recordCount }} 条 · 建档 {{ m.profileCount }} 只 · 加入 {{ fmtJoin(m.joinedAt) }}</text>
        </view>
      </view>
    </view>

    <!-- ====== 猫咪 ====== -->
    <view v-if="tab === 'profiles'" class="list">
      <!-- 添加入口（2026-10-10：组员即可添加，组长也能；游客/未加入不可见） -->
      <view v-if="canAdd" class="card add-card" hover-class="add-card--hover" hover-stay-time="60" @tap="openAdd">
        <view class="add-ico"><text class="add-ico-t">＋</text></view>
        <view class="c-body">
          <text class="add-t">添加猫咪</text>
          <text class="add-sub">把我观测中的档案拉进小组</text>
        </view>
      </view>
      <view v-if="!cats.length" class="empty">
        <text class="empty-t">小组还没有档案</text>
      </view>
      <view v-for="c in cats" :key="c.id" class="card c-card" @tap="goProfile(c.id)">
        <view class="av" :class="'av--' + catTone(c.coatColor)">
          <text class="av-t">{{ (c.name || '?').slice(0, 1) }}</text>
        </view>
        <view class="c-body">
          <view class="m-row1">
            <text class="m-name">{{ c.name }}</text>
            <view v-if="c.healthStatus === 'INJURED'" class="status-tag status-tag--inj">
              <text class="status-tag-t">受伤</text>
            </view>
            <view v-else-if="c.sterilizationStatus === 'STERILIZED'" class="status-tag status-tag--ster">
              <text class="status-tag-t">已 TNR</text>
            </view>
            <!-- 移出（仅组长；@tap.stop 防止点它跳进档案页） -->
            <view v-if="canRemove" class="rm-tag" @tap.stop="askRemove(c)">
              <text class="rm-tag-t">移出</text>
            </view>
          </view>
          <text class="m-sub">{{ c.coatColor || '—' }} · {{ c.bodySize || '—' }} · 最近 {{ c.lastSeenDesc || '未出现' }}</text>
          <text v-if="c.specialMarks" class="m-mark">{{ c.specialMarks }}</text>
        </view>
      </view>
    </view>

    <!-- ====== 打卡 ====== -->
    <!-- 卡片可点开记录详情（2026-10-10 晚）：与 S5 时间轴 / S13 观察史同一形制 -->
    <view v-if="tab === 'records'" class="list">
      <view v-if="!records.length" class="empty">
        <text class="empty-t">小组还没有打卡记录</text>
      </view>
      <view
        v-for="r in records" :key="r.id"
        class="card r-card"
        hover-class="r-card--hover" hover-stay-time="60"
        @tap="openDetail(r)"
      >
        <view class="r-type" :class="'r-type--' + r.type">
          <text class="r-type-t">{{ typeTextOf(r) }}</text>
        </view>
        <view class="r-body">
          <view class="m-row1">
            <text class="m-name">{{ r.profile?.name || '未命名' }}</text>
            <text class="r-time">{{ fmtTime(r.occurredAt) }}</text>
          </view>
          <text class="r-content">{{ r.content }}</text>
          <text class="r-loc">📍 {{ r.locDesc || r.profile?.lastSeenDesc || '—' }} · 记录人 {{ r.author?.nickname || '匿名' }}</text>
        </view>
      </view>
    </view>

    <!-- 添加猫咪弹层：候选 = 我观测中的档案（GET /profiles）− 已在组的猫 -->
    <paw-dialog
      :show="showAdd"
      title="添加猫咪到小组"
      confirm-text="关闭"
      :show-cancel="false"
      @confirm="showAdd = false"
      @cancel="showAdd = false"
    >
      <view class="pick-list">
        <view v-if="!candidates.length" class="pick-empty">
          <text class="pick-empty-t">没有可添加的档案了：观测中的都已在组里，去首页再关注一只吧</text>
        </view>
        <view
          v-for="p in candidates"
          :key="p.id"
          class="pick-row"
          hover-class="pick-row--hover"
          hover-stay-time="60"
          @tap="addCat(p)"
        >
          <view class="av" :class="'av--' + catTone(p.coatColor)">
            <text class="av-t">{{ (p.name || '?').slice(0, 1) }}</text>
          </view>
          <view class="pick-body">
            <text class="pick-name">{{ p.name }}</text>
            <text class="pick-sub">{{ p.coatColor || '—' }} · 最近 {{ p.lastSeenDesc || '未出现' }}</text>
          </view>
          <text class="pick-add">＋ 加入</text>
        </view>
      </view>
    </paw-dialog>

    <!-- 移出确认（仅组长会走到这里；danger 陶土确认键） -->
    <paw-dialog
      :show="showRemove"
      title="移出猫咪"
      :content="removeText"
      confirm-text="移出"
      tone="danger"
      @confirm="doRemove"
      @cancel="showRemove = false"
    />

    <!-- 小组打卡 → 记录详情浮层（2026-10-10 晚新增）
         与 S5 时间轴 / S13 观察史共用 components/paw-record-detail，禁另做一套。
         数据全部来自已渲染的列表项（/spaces/:id/records 本就返回 content 全文 / 照片 / 多类型标签）
         → 点开详情零新请求；`v-if` 控制 → 关闭时零 DOM，不影响任何像素基线。 -->
    <paw-record-detail
      :show="!!recDetail"
      :pills="detailPills"
      :title="detailTitle"
      :meta="detailMeta"
      :body="detailBody"
      :photo-url="detailPhoto"
      :extras="detailExtras"
      @close="recDetail = null"
    />

    <view class="pad-bottom"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { assetUrl } from '../../common/uploader';
// 显式引入（easycom 也能扫到，但新增组件目录时不依赖编译器的重新扫描）
import PawRecordDetail from '../../components/paw-record-detail/paw-record-detail.vue';

/* ── tab 集合（顺序与导航文字固定，counts 动态） ── */
type Tab = 'members' | 'profiles' | 'records';
const TAB_DEFS: { key: Tab; label: string }[] = [
  { key: 'members', label: '成员' },
  { key: 'profiles', label: '猫咪' },
  { key: 'records', label: '打卡' },
];
/* 痕迹类型 → 中文（与观察史 / 小组详情页 口径一致） */
const TYPE_TEXT: Record<string, string> = {
  FEEDING: '投喂',
  APPEARANCE: '外貌',
  LOCATION: '点位',
  HEALTH: '健康',
  SEASON: '季节',
  DEVICE: '感应',
};
/** 类型 → 详情浮层胶囊配色（与 S5 时间轴 pill--terra/mustard/olive 同口径） */
const PILL_CLS: Record<string, string> = {
  FIRST: 'terra',
  FEEDING: 'mustard',
  HEALTH: 'olive',
  SEASON: 'olive',
  APPEARANCE: 'olive',
  LOCATION: 'olive',
  DEVICE: 'olive',
};
const SEASON_TEXT: Record<string, string> = { SPRING: '春', SUMMER: '夏', AUTUMN: '秋', WINTER: '冬' };

/** 多类型标签（2026-10-10 胶囊多选）：主类型 + 附加标签拼「投喂 + 点位」
 *  ⚠️ 后端 subTypes 是逗号串（不是数组） */
function typeTextOf(r: any) {
  const t = [r.type, ...String(r.subTypes || '').split(',').filter(Boolean)]
    .map((x) => TYPE_TEXT[x] || '')
    .filter(Boolean)
    .join(' + ');
  return t || '记录';
}

const spaceId = ref('');
const tab = ref<Tab>('members');
const space = ref<any>(null);
const members = ref<any[]>([]);
const cats = ref<any[]>([]);
const records = ref<any[]>([]);
const loading = ref(false);

/* ── 猫咪管理权限（2026-10-10 用户定案：组员可添加、组长独占移除）──
 *  myRole 来自 GET /spaces/:id（后端 myMember?.role ?? null）：
 *  OWNER=组长 / MEMBER=组员 / null=游客或未加入 → 不显示任何管理入口。
 *  权限的真正裁决在后端（403），前端只做展示门控。 */
const myRole = ref<string | null>(null);
const canAdd = computed(() => myRole.value === 'OWNER' || myRole.value === 'MEMBER');
const canRemove = computed(() => myRole.value === 'OWNER');

/* 添加弹层：候选 = 我观测中的档案（GET /profiles = 我建的 + 我关注的）− 已在组的 */
const showAdd = ref(false);
const candidates = ref<any[]>([]);
const addLoading = ref(false);

/* 移出确认弹层 */
const showRemove = ref(false);
const removeTarget = ref<any>(null);
const removeText = computed(() =>
  removeTarget.value
    ? `把「${removeTarget.value.name}」移出小组？组内将不再展示它的档案与打卡。`
    : '',
);

/** tab 标题：短标题固定（组名已在上方头卡，导航里再写会折行） */
const navTitle = computed(() => {
  const map: Record<Tab, string> = { members: '小组成员', profiles: '小组猫咪', records: '小组打卡' };
  return map[tab.value];
});
/* navbar 携带 spaceId 回退（detail 页支持 ?id=） */
const backQuery = computed(() => (spaceId.value ? `?id=${spaceId.value}` : ''));

const counts = computed(() => ({
  members: members.value.length,
  profiles: cats.value.length,
  records: records.value.length,
}));

/** 成员头像 tone：组长固定深苔绿，其余按名次轮换三色（保证一排不撞色） */
const TONES = ['deep', 'sage', 'clay'];
function avatarTone(role: string, idx: number): string {
  if (role === 'OWNER') return 'deep';
  return TONES[idx % 3 === 0 ? 1 : idx % 3];
}
/** 猫咪头像 tone：按毛色映射（与首页/地图 颜色语义一致） */
function catTone(coat?: string): string {
  if (!coat) return TONES[2];
  if (coat.includes('橘') || coat.includes('黄')) return TONES[2]; // clay 陶土
  if (coat.includes('黑')) return TONES[0]; // deep
  if (coat.includes('白')) return TONES[1]; // sage
  return TONES[(coat.charCodeAt(0) || 0) % 3];
}

function fmtJoin(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
function fmtTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
/** 详情浮层的绝对时间（列表里只写 月/日，详情要能看清是哪一年哪一刻） */
function fmtFull(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 多类型标签 → 详情浮层胶囊（主类型 + 附加标签，逐个成枚，去重）
 *  ⚠️ 后端 subTypes 是逗号串（"LOCATION,APPEARANCE"），前端草稿队列里可能是数组 → 两种形态都认 */
function pillsOf(r: any): { t: string; cls: string }[] {
  if (!r) return [];
  const raw = [r.type, ...String(r.subTypes || '').split(',').filter(Boolean)];
  const seen = new Set<string>();
  const out: { t: string; cls: string }[] = [];
  for (const x of raw) {
    if (!x || seen.has(x)) continue;
    seen.add(x);
    out.push({ t: TYPE_TEXT[x] || '记录', cls: PILL_CLS[x] || 'olive' });
  }
  return out;
}

function setTab(k: Tab) {
  if (tab.value === k) return;
  tab.value = k;
}

function goProfile(id: string) {
  uni.navigateTo({ url: `/pages/profile/detail?id=${id}` });
}

/* ── 添加猫咪 ── */
async function openAdd() {
  showAdd.value = true;
  try {
    const mine: any = await api.get('/profiles', undefined, { silent: true });
    const inGroup = new Set(cats.value.map((c: any) => c.id));
    candidates.value = (Array.isArray(mine) ? mine : []).filter((p: any) => !inGroup.has(p.id));
  } catch {
    /* 拉不到候选就给空态提示（api.ts 已 toast） */
    candidates.value = [];
  }
}

async function addCat(p: any) {
  if (addLoading.value) return;
  addLoading.value = true;
  try {
    await api.post(`/spaces/${spaceId.value}/profiles`, { profileId: p.id });
    uni.showToast({ title: `「${p.name}」已加入小组`, icon: 'none' });
    showAdd.value = false;
    await loadAll(spaceId.value); // 刷新猫列表 + 头卡计数 + tab 计数
  } catch {
    /* 403/404 等由 api.ts 统一 toast；弹层留着让用户看清楚 */
  } finally {
    addLoading.value = false;
  }
}

/* ── 移出猫咪（仅组长；入口本身 canRemove 门控） ── */
function askRemove(c: any) {
  removeTarget.value = c;
  showRemove.value = true;
}

async function doRemove() {
  const c = removeTarget.value;
  if (!c) return;
  try {
    await api.delete(`/spaces/${spaceId.value}/profiles/${c.id}`);
    uni.showToast({ title: `「${c.name}」已移出小组`, icon: 'none' });
    showRemove.value = false;
    removeTarget.value = null;
    await loadAll(spaceId.value);
  } catch {
    /* api.ts 统一 toast；弹层留着 */
  }
}

async function loadAll(sid: string) {
  if (!sid) return;
  loading.value = true;
  try {
    /* 头卡只关心 name/community/_count → 直接复用 detail 的 GET /spaces/:id */
    const [sp, ms, ps, rs] = await Promise.all([
      api.get(`/spaces/${sid}`, undefined, { silent: true }),
      api.get(`/spaces/${sid}/members`, undefined, { silent: true }),
      api.get(`/spaces/${sid}/profiles`, undefined, { silent: true }),
      api.get(`/spaces/${sid}/records`, undefined, { silent: true }),
    ]);
    space.value = sp;
    /* 权限门控取自小组详情（游客/未加入 → null，前端不显示管理入口） */
    myRole.value = sp?.myRole ?? null;
    members.value = Array.isArray(ms) ? ms : [];
    /* /profiles 返的是 SpaceProfile[]，profile 挂在 profile 字段下；压平到 cat 字段方便渲染 */
    cats.value = Array.isArray(ps) ? ps.map((b: any) => b.profile || b) : [];
    records.value = Array.isArray(rs) ? rs : [];
  } catch {
    /* api.ts 已统一 toast，这里保持空数组让各 tab 显「还没有」空态 */
  } finally {
    loading.value = false;
  }
}

/* ── 打卡记录详情浮层（2026-10-10 晚）──
 * 列表卡为了版面只摆要点（正文一行、类型只一个色块），完整内容（多类型标签 / 全文 /
 * 照片 / 记录人 / 季节）在详情里看。数据全部取自列表项本身 → 打开不产生新请求，
 * 游客态也能看（/spaces/:id/records 是公开接口）。 */
const recDetail = ref<any>(null);
const openDetail = (r: any) => { recDetail.value = r; };

const detailPills = computed(() => pillsOf(recDetail.value));
const detailTitle = computed(() => {
  const r = recDetail.value;
  if (!r) return '';
  return `${r.profile?.name || '未命名'} · ${typeTextOf(r)}`;
});
const detailMeta = computed(() => {
  const r = recDetail.value;
  if (!r) return '';
  const t = fmtFull(r.occurredAt);
  const loc = r.locDesc || r.profile?.lastSeenDesc || '未标注点位';
  return t ? `${t} · ${loc}` : loc;
});
const detailBody = computed(() => recDetail.value?.content || '');
/** 照片 url 存相对路径，必须经 assetUrl 拼 origin（否则 H5 下按 :5173 解析 → 裂图） */
const detailPhoto = computed(() => assetUrl(recDetail.value?.photos?.[0]?.url));
const detailExtras = computed(() => {
  const r = recDetail.value;
  if (!r) return [];
  const out: { k: string; v: string }[] = [];
  out.push({ k: '记录人', v: r.author?.nickname || '匿名' });
  if (r.season) out.push({ k: '所属季节', v: SEASON_TEXT[r.season] || '' });
  if (r.locDesc) out.push({ k: '点位', v: r.locDesc });
  const n = r.photos?.length || 0;
  out.push({ k: '照片', v: n ? `${n} 张` : '无（仅文字记录）' });
  return out;
});

onLoad((q: any) => {
  spaceId.value = q?.spaceId ?? '';
  const t = (q?.tab as Tab) || 'members';
  tab.value = ['members', 'profiles', 'records'].includes(t) ? t : 'members';
  loadAll(spaceId.value);
});
</script>

<style scoped>
/* 此页是 detail 的二级页（无底导），用 paw-page 基座 24pt 边距 */
.lists {
  padding: 0 40rpx;
  box-sizing: border-box;
}

/* ── 头卡（小组名 + 社区 + 三组统计） ── */
.head {
  margin-top: 24rpx;
  padding: 28rpx 32rpx;
  background: #faf7f1;
  border-radius: 32rpx;
}
.head-t {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.head-meta {
  display: flex;
  align-items: center;
  margin-top: 14rpx;
  flex-wrap: wrap;
  row-gap: 4rpx;
}
.head-meta-t {
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}
.head-meta-dot {
  margin: 0 8rpx;
  font-size: 22rpx;
  color: #c4beae;
  line-height: 1;
}

/* ── tab 切换条 ── */
.tabs {
  display: flex;
  margin-top: 24rpx;
  padding: 8rpx;
  background: #faf7f1;
  border-radius: 28rpx;
  box-sizing: border-box;
}
.tab {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22rpx;
}
.tab--on {
  background: #8fa08b;
}
.tab-t {
  font-size: 24rpx;
  color: #8b8779;
  line-height: 1;
}
.tab--on .tab-t {
  color: #faf7f1;
  font-weight: 700;
}

/* ── 列表卡片通用 ── */
.list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.card {
  position: relative;
  box-sizing: border-box;
  padding: 24rpx 28rpx;
  background: #faf7f1;
  border-radius: 28rpx;
  display: flex;
  align-items: flex-start;
}
.empty {
  margin-top: 24rpx;
  padding: 40rpx 0;
  text-align: center;
}
.empty-t {
  font-size: 24rpx;
  color: #a69e8c;
  line-height: 1;
}

.av {
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.av-t {
  font-size: 34rpx;
  color: #faf7f1;
  line-height: 1;
}
.av--deep { background: #56674e; }
.av--sage { background: #8fa08b; }
.av--clay { background: #c68b6f; }

.m-body, .c-body, .r-body {
  flex: 1;
  min-width: 0;
  margin-left: 20rpx;
}
.m-row1 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 6rpx;
}
.m-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.m-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1.4;
}
.m-mark {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #a69e8c;
  line-height: 1.4;
}

/* 角色 / 状态小胶囊 */
.role-tag {
  margin-left: 12rpx;
  height: 30rpx;
  box-sizing: border-box;
  padding: 0 12rpx;
  border: 2rpx solid #8fa08b;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
}
.role-tag-t {
  font-size: 20rpx;
  color: #56674e;
  line-height: 1;
}
.status-tag {
  margin-left: 12rpx;
  height: 30rpx;
  box-sizing: border-box;
  padding: 0 12rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
}
.status-tag--ster {
  background: #f0e6d0;
}
.status-tag--ster .status-tag-t {
  color: #8a6a2e;
  font-size: 20rpx;
  line-height: 1;
}
.status-tag--inj {
  background: #f5d4c2;
}
.status-tag--inj .status-tag-t {
  color: #a05030;
  font-size: 20rpx;
  line-height: 1;
}

/* 打卡卡：左侧类型小竖条（陶土/苔绿/驼色 三种） */
.r-card {
  align-items: stretch;
}
/* 按下反馈（2026-10-10 晚：卡片可点开记录详情）。仅按压期间生效 → 静态像素不变 */
.r-card--hover {
  background: #f6f2e7;
}
/* 类型色块：单类型时保持 88rpx 正方（与之前完全一致）；
   多类型时「投喂 + 点位」这种长文案允许长成胶囊，不再在 88rpx 里换行溢出 */
.r-type {
  flex-shrink: 0;
  min-width: 88rpx;
  max-width: 200rpx;
  height: 88rpx;
  box-sizing: border-box;
  padding: 0 10rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e2dcca;
}
.r-type--FEEDING { background: #d6c8a6; }
.r-type--APPEARANCE { background: #c9b48a; }
.r-type--LOCATION { background: #b3c0a6; }
.r-type--HEALTH { background: #f5d4c2; }
.r-type--SEASON { background: #d8c4a8; }
.r-type-t {
  display: block;
  max-width: 100%;
  font-size: 22rpx;
  color: #6e5a36;
  line-height: 1;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.r-time {
  margin-left: auto;
  font-size: 20rpx;
  color: #a69e8c;
  line-height: 1;
}
.r-content {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #6e6f58;
  line-height: 1.4;
}
.r-loc {
  display: block;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #a69e8c;
  line-height: 1.4;
}

/* ── 猫咪管理：添加卡（虚线描边 = 手账「待补充」语义，区别于实体猫卡） ── */
.add-card {
  border: 2rpx dashed #c4beae;
  background: #faf7f1;
  align-items: center;
}
.add-card--hover {
  background: #f6f2e7;
}
.add-ico {
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  background: #f0ebdf;
  display: flex;
  align-items: center;
  justify-content: center;
}
.add-ico-t {
  font-size: 40rpx;
  color: #8fa08b;
  line-height: 1;
}
.add-t {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #56674e;
  line-height: 1;
}
.add-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #a69e8c;
  line-height: 1;
}

/* 移出胶囊（组长专属；描边陶土 = 危险操作但不喧宾） */
.rm-tag {
  margin-left: auto;
  height: 30rpx;
  box-sizing: border-box;
  padding: 0 14rpx;
  border: 2rpx solid #c68b6f;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
}
.rm-tag-t {
  font-size: 20rpx;
  color: #c68b6f;
  line-height: 1;
}

/* 添加弹层候选列表（paw-dialog 插槽内） */
.pick-list {
  margin-top: 24rpx;
  max-height: 46vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  text-align: left;
}
.pick-row {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  background: #f6f2e7;
  border-radius: 20rpx;
}
.pick-row--hover {
  background: #efe9da;
}
.pick-row .av {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
}
.pick-row .av-t {
  font-size: 28rpx;
}
.pick-body {
  flex: 1;
  min-width: 0;
  margin-left: 16rpx;
}
.pick-name {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.pick-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #a69e8c;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pick-add {
  flex-shrink: 0;
  margin-left: 12rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: #8fa08b;
  line-height: 1;
}
.pick-empty {
  padding: 16rpx 8rpx 8rpx;
}
.pick-empty-t {
  font-size: 22rpx;
  color: #a69e8c;
  line-height: 1.5;
}

.pad-bottom {
  height: 60rpx;
}
</style>
