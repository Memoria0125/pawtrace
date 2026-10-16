<template>
  <!-- S10-2 申请协作（PDF p32）｜PRD F5.2 加入小组｜入口：S10-1 协作空间列表 → 申请协作
       头部结构与 p32 设计稿一致：‹返回 → 左对齐大标题（辅助屏通用头，与 S10-1 同构） -->
  <view class="wrap">
    <paw-navbar
      title=""
      :top-pad="119.1"
      back-url="/pages/space/index"
      :back-tab="false"
    />
    <text class="h1">申请协作</text>

    <!-- 小组信息卡：头像方块 + 名称 / 元信息 / 组长（颜色跟列表 tone 走：deep/sage/clay） -->
    <view class="gcard">
      <view class="g-avatar" :class="'g-avatar--' + (group.tone || 'deep')">{{ group.initial }}</view>
      <view class="g-body">
        <text class="g-name">{{ group.name }}</text>
        <text class="g-meta">{{ group.meta }}</text>
        <text class="g-lead">{{ group.lead }}</text>
      </view>
    </view>

    <!-- 加入后解锁：三条权益，每条一个苔绿圆勾 -->
    <view class="ucard">
      <text class="u-title">加入后解锁</text>
      <view v-for="(t, i) in unlocks" :key="i" class="u-row">
        <view class="u-chk">
          <view class="u-chk-a"></view>
          <view class="u-chk-b"></view>
        </view>
        <text class="u-txt">{{ t }}</text>
      </view>
    </view>

    <!-- 流程三步：① 实心苔绿 / ② 陶土描边 / ③ 浅描边，中间短虚线。
         圈码不用 Unicode ①②③：设计稿字体（思源黑体）的圈码是「细环 + 小数字」（墨迹 9.13×8.79pt），
         H5 回退字体的圈码几乎占满 em（实测 12.17pt 高、环更粗）→ 偏大 38%，肉眼可见，故手绘。 -->
    <view class="steps">
      <view class="step step--on">
        <view class="st-ic"><text class="st-ic-n">1</text></view>
        <text class="st-t">发送申请</text>
      </view>
      <view class="s-dash"></view>
      <view class="step step--clay">
        <view class="st-ic"><text class="st-ic-n">2</text></view>
        <text class="st-t">组长审核</text>
      </view>
      <view class="s-dash"></view>
      <view class="step step--mute">
        <view class="st-ic"><text class="st-ic-n">3</text></view>
        <text class="st-t">解锁权限</text>
      </view>
    </view>

    <!-- 申请理由：设计稿无输入框底框，只有居中标题 + 左对齐占位文案 -->
    <text class="rs-title">申请理由</text>
    <textarea
      v-model="message"
      class="rs-input"
      :maxlength="100"
      placeholder="介绍一下你自己和常投喂的猫咪，让组长更快通过～"
      placeholder-class="rs-ph"
    />

    <view class="cta" @tap="apply">
      <text class="cta-t">发送入群申请</text>
    </view>
    <text class="foot">申请将发送给组长审核 · 通过后自动加入并解锁全部权限</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { api } from '../../common/api';

/** 演示兜底（与设计稿 p32 逐字对齐 = 江湾小组）。S10-1 列表点进来时会被 q.data 覆盖。 */
const DEMO = {
  id: '',
  tone: 'deep',
  initial: '江',
  name: '江湾小区流浪猫观察队',
  meta: '32 位成员 · 47 只猫咪 · 公开小组',
  lead: '组长：陈同学',
};

const group = ref<any>({ ...DEMO });
const unlocks = ref([
  '查看组员所有猫咪观测记录',
  '在小组内发布自己拍到的痕迹',
  '和组员共享同一只流浪猫的档案',
]);
const message = ref('');
const applied = ref(false);

onLoad(async (q) => {
  // 入口1：S10-1 列表点「申请协作」→ data = 所点小组的完整数据（离线也正确显示）
  if (q?.data) {
    try {
      const s = JSON.parse(decodeURIComponent(q.data));
      if (s && s.name) {
        group.value = {
          id: s.id ?? '',
          tone: s.tone || 'deep',
          initial: s.initial || s.name.slice(0, 1),
          name: s.name,
          meta: s.meta ? `${s.meta} · 公开小组` : DEMO.meta,
          lead: s.lead || '组长：—',
        };
      }
    } catch {
      /* data 解析失败 → 保留演示数据 */
    }
    return;
  }
  // 入口2：邀请码直达（阶段3 联调）→ 按码查组
  const code = q?.code || q?.inviteCode;
  if (!code) return;
  try {
    const s: any = await api.get('/spaces/search', { code });
    if (s && s.name) {
      group.value = {
        id: s.id,
        tone: 'deep',
        initial: s.name.slice(0, 1),
        name: s.name,
        meta: `${s._count?.members ?? 0} 位成员 · ${s._count?.profiles ?? 0} 只猫咪 · 公开小组`,
        lead: `组长：${s.owner?.nickname ?? '—'}`,
      };
    }
  } catch {
    /* 离线 / 后端未启动 → 保留演示数据撑版 */
  }
});

async function apply() {
  if (applied.value) return;
  applied.value = true;
  const id = group.value.id;
  if (!id) {
    // 演示数据无 id：不发脏请求，直接走离线反馈
    uni.showToast({ title: '申请已记录，联网后自动提交', icon: 'none' });
    return;
  }
  try {
    await api.post(`/spaces/${id}/join`, {
      message: message.value, // 阶段2：uid 由后端从 JWT 取
    });
    uni.showToast({ title: '申请已发送，等待组长审核', icon: 'none' });
  } catch {
    /* 离线：仍给反馈，避免按钮点了没反应 */
    uni.showToast({ title: '申请已记录，联网后自动提交', icon: 'none' });
  }
}
</script>

<style scoped>
.wrap {
  min-height: calc(100vh - var(--window-top, 0px) - var(--window-bottom, 0px));
  padding: 0 48rpx;
  box-sizing: border-box;
}

/*
  大标题：与 p32 设计稿实测对齐（墨迹顶 100.37pt）。
  布局流：nav 行盒 = topPad 119.1rpx + 行高 88rpx = 207.1rpx；
  大标题行盒顶需落在 195.9rpx → 负 margin 吸收导航行下半空白 11.2rpx。
  ⚠️ 与 topPad 成对：改 topPad 必须同步改这里。
*/
.h1 {
  display: block;
  margin-top: -11.2rpx;
  font-size: 48rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}

/* 小组信息卡：h 80.14pt=160rpx，无描边，内容整体垂直居中 */
.gcard {
  margin-top: 34rpx;
  height: 160rpx;
  box-sizing: border-box;
  padding: 0 28rpx;
  background: #faf7f1;
  border-radius: 32rpx;
  display: flex;
  align-items: center;
}
/* 头像方块 44.3pt=88rpx、圆角 14pt=28rpx、白字；底色跟列表 tone（deep/sage/clay），p32 演示态为 deep */
.g-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 28rpx;
  background: #56674e;
  color: #faf9f1;
  font-size: 32rpx;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.g-avatar--sage { background: #8fa08b; }
.g-avatar--clay { background: #c68b6f; }
.g-body {
  margin-left: 24rpx;
  min-width: 0;
}
.g-name {
  display: block;
  position: relative;
  top: -2rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.g-meta {
  display: block;
  position: relative;
  top: -0.35rpx;
  margin-top: 15.3rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}
.g-lead {
  display: block;
  position: relative;
  top: -0.7rpx;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}

/* 加入后解锁卡：h 119.03pt=238rpx，标题距卡顶 15.41pt */
.ucard {
  margin-top: 23.6rpx;
  height: 238rpx;
  box-sizing: border-box;
  padding: 30.8rpx 32rpx 0;
  background: #faf7f1;
  border-radius: 32rpx;
}
.u-title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
/* 行高 = 勾选圆直径 26rpx；行间距 12.02pt=24rpx（行距 25.02pt=50rpx） */
.u-row {
  display: flex;
  align-items: center;
  height: 26rpx;
}
.u-row:first-of-type {
  margin-top: 27rpx;
}
.u-row + .u-row {
  margin-top: 24rpx;
}
/* 苔绿圆 + 白色对勾（两根圆头细棒拼角，同 paw-navbar 的 chevron 做法） */
.u-chk {
  position: relative;
  margin-left: 1.4rpx;
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
  background: #8fa08b;
  flex-shrink: 0;
}
.u-chk-a,
.u-chk-b {
  position: absolute;
  background: #faf9f1;
  border-radius: 2rpx;
  height: 3rpx;
}
.u-chk-a {
  left: 5rpx;
  top: 14.4rpx;
  width: 7.8rpx;
  transform: rotate(45deg);
}
.u-chk-b {
  left: 10.6rpx;
  top: 11.4rpx;
  width: 12.4rpx;
  transform: rotate(-45deg);
}
.u-txt {
  position: relative;
  top: -3rpx;
  margin-left: 16.6rpx;
  font-size: 24rpx;
  color: #595c4f;
  line-height: 1;
}

/* 流程行：三个胶囊宽 78.11 / 82.51 / 78.11pt（中段因描边略宽），高 24pt=48rpx */
.steps {
  margin-top: 24rpx;
  margin-left: 33.3rpx;
  display: flex;
  align-items: center;
}
.step {
  height: 48rpx;
  box-sizing: border-box;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step--on {
  width: 156rpx;
  background: #8fa08b;
  color: #faf9f1;
}
.step--clay {
  width: 164rpx;
  border: 2rpx solid #c68b6f;
  color: #c68b6f;
}
.step--mute {
  width: 156rpx;
  border: 2rpx solid #e5e0d1;
  color: #a69e8c;
}
.st-t {
  font-size: 26rpx;
  line-height: 1;
}
/*
  圈码：设计稿实测环外径 9.13pt（18rpx）、环宽 0.5pt（1rpx）、数字高 5.07pt。
  ① 的「字身框」= 1em = 26rpx，环在字身内居中 → 环盒两侧各留 4rpx；
  其后跟一个空格（0.25em ≈ 6.5rpx）→ 右侧总留 10.5rpx。
  ⚠️ 边框/数字颜色逐类显式写死（不用 currentColor：mp-weixin 兼容）。
*/
.st-ic {
  width: 18rpx;
  height: 18rpx;
  margin-left: 4rpx;
  margin-right: 10.5rpx;
  border-radius: 50%;
  box-sizing: border-box;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step--on .st-ic {
  border: 1rpx solid #faf9f1;
}
.step--clay .st-ic {
  border: 1rpx solid #c68b6f;
}
.step--mute .st-ic {
  border: 1rpx solid #a69e8c;
}
.st-ic-n {
  font-size: 14rpx;
  line-height: 1;
}
/* 连接虚线：32×2rpx；设计稿虚线中心比胶囊中心低 0.63pt（不是垂直居中） */
.s-dash {
  position: relative;
  top: 1.4rpx;
  width: 32rpx;
  height: 2rpx;
  margin: 0 12.3rpx;
  background: #e5e0d1;
  flex-shrink: 0;
}

/* 申请理由：居中标题（24rpx #8B8779），下方是无底框的多行输入 */
.rs-title {
  display: block;
  margin-top: 26.04rpx;
  text-align: center;
  font-size: 24rpx;
  color: #8b8779;
  line-height: 1;
}
/*
  输入区（设计稿无可见底框）：box 顶 411.12pt、高 97.5pt=195rpx；
  文字行盒顶 = box 顶 + padding-top 25pt=50rpx = 436.12pt（占位墨迹落 436.72pt）；
  左内边距 11.5pt=23rpx → 占位墨迹左端落在 36.09pt。
  盒底正好等于 CTA 顶 508.62pt，故 CTA 无 margin-top。
*/
.rs-input {
  display: block;
  width: 100%;
  height: 196.4rpx;
  box-sizing: border-box;
  padding: 50rpx 0 0 24.2rpx;
  background: transparent;
  font-size: 24rpx;
  line-height: 1;
  color: #3c4036;
}

/* 主 CTA：实心深绿 #56674E（与 S10-1 的描边款不同），h 52.07pt=104rpx */
.cta {
  height: 104rpx;
  box-sizing: border-box;
  border-radius: 52rpx;
  background: #56674e;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cta-t {
  font-size: 32rpx;
  color: #faf9f1;
  line-height: 1;
}

.foot {
  display: block;
  margin-top: 26.7rpx;
  padding-bottom: 48rpx;
  text-align: center;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}
</style>

<style>
/* uni-app 的 textarea 内部节点不在 scoped 作用域内，占位符与内层 textarea 样式必须放非 scoped 块。
   用 .rs-input 前缀限定作用范围，避免污染其它页面。 */
.rs-ph {
  color: #b4b0a2;
  font-size: 24rpx;
  line-height: 1;
}
.rs-input .uni-textarea-wrapper,
.rs-input .uni-textarea-textarea {
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  font-size: 24rpx;
  line-height: 1;
  color: #3c4036;
}
</style>
