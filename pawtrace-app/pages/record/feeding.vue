<template>
  <!-- S10 今日投喂｜线框第2行第3屏｜PRD F2.3 投喂记录 -->
  <view>
    <view class="paw-card paw-tape summary">
      <text class="big-num">{{ summary.count }}</text>
      <text class="summary-text">今日投喂 {{ summary.profiles.length }} 只</text>
      <text class="names" v-if="summary.profiles.length">{{ summary.profiles.join('、') }}</text>
    </view>

    <view v-for="r in items" :key="r.id" class="paw-card feed-card">
      <view class="feed-info">
        <text class="feed-name">{{ r.profile?.name }}</text>
        <text class="feed-content">{{ r.content }}</text>
      </view>
      <text class="feed-time">{{ r.occurredAt?.slice(11, 16) }}</text>
    </view>

    <view class="empty-tip" v-if="!items.length">今天还没投喂记录</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '../../common/api';

const summary = ref<any>({ count: 0, profiles: [], items: [] });
const items = ref<any[]>([]);

onShow(async () => {
  try {
    summary.value = await api.get('/records/today-feeding');
    items.value = summary.value.items || [];
  } catch { /* 离线 */ }
});
</script>

<style scoped>
.summary { text-align: center; padding: 48rpx 24rpx; }
.big-num { font-size: 88rpx; font-weight: bold; color: #c68b6f; }
.summary-text { display: block; font-size: 28rpx; margin-top: 8rpx; }
.names { display: block; font-size: 24rpx; color: #8a8a7e; margin-top: 12rpx; }
.feed-card { display: flex; align-items: center; }
.feed-info { flex: 1; }
.feed-name { font-size: 30rpx; font-weight: bold; }
.feed-content { display: block; font-size: 26rpx; color: #8a8a7e; margin-top: 8rpx; }
.feed-time { font-size: 24rpx; color: #8a8a7e; }
.empty-tip { text-align: center; color: #8a8a7e; padding: 80rpx 0; }
</style>
