<template>
  <!--
    S9-2 AI 科普小知识卡｜**独立页壳**（PRD F2.4）
    设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p23，逐像素实测（375×812 @2.9573x，1pt = 2rpx）
    ⚠️ 2026-10-11 用户诉求「科普小知识不要跳转到别的界面，而是在原来的界面上覆盖弹出」
       ⇒ 卡片本体抽成 `components/paw-sci-card`（唯一形制），本页退化为**薄壳**：
          只负责「米底画布 + 深链参数解析 + 关闭后的去向」，浮层本体由组件渲染。
       ⇒ 像素与视觉与改造前**逐像素一致**（遮罩 rgba(60,64,54,.245) 叠本页米底 #F0EBDF
          = 设计稿灰块 #C4C2B5）；`S9-2-科普卡-*` 两张交付图**不受影响、不重出**。
       ⇒ 本页仍保留的直接理由：深链/兜底可直达（`goBack` 的兜底目标、历史截图存档）。
          正常运行路径（AI 解析页点「看科普小知识」）**已不再跳本页**，见 pages/record/ai-parse.vue。
  -->
  <view class="paw-page sci">
    <paw-sci-card :show="true" :title="sciTitle" :content="sciBody" @close="close" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { goBack } from '../../common/nav';

/** 关闭后的兜底去向（栈深不足时用；跳法由 common/nav 按目标页是否为 tabBar 页推导） */
const backUrl = ref('/pages/record/create');

/** 科普卡内容（默认 = 设计稿 p23 演示文案，保证像素基线；
    AI 解析页跳入时带 title/content 覆盖为真实生成内容） */
const sciTitle = ref('右耳缺角 = TNR 标记');
const sciBody = ref('缺角代表它已接受「诱捕-绝育-放归」 ，性格稳定、不会再繁殖，是社区里的老居民啦。');

/**
 * 安全 decode：uni-app H5 的 onLoad query 已由路由解码过一次，这里再解一次是为了
 * 对应 navigateTo 的 encodeURIComponent。但二次 decode 遇到正文里合法的 `%`
 * （如「约 80% 的橘猫是公猫」）会抛 URIError → 改为失败时原样返回。
 */
function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** × 与「知道了，继续记录」都只是关闭弹层 → 回来源页（兜底 common/nav 推导） */
function close() {
  goBack({ url: backUrl.value });
}

onLoad((q) => {
  if (q?.from) backUrl.value = safeDecode(q.from);
  if (q?.title) sciTitle.value = safeDecode(q.title);
  if (q?.content) sciBody.value = safeDecode(q.content);
});
</script>

<style scoped>
.sci {
  background: #f0ebdf;
}
</style>
