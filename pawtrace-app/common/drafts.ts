import { api } from './api';

/**
 * 离线草稿队列（阶段3）
 *
 * 语义：记录在离线/请求失败时以「带本地 id 的完整 DTO」暂存本地，
 * 恢复联网后整批 POST /records/batch 幂等补传（服务端按 id upsert，
 * 重复提交不会产生重复记录 —— 2026-10-05 curl 实测两次同 id 只落一条）。
 *
 * 存储键 offline_drafts 与「我的」页「离线草稿·联网同步」行共用，勿改名。
 */

const KEY = 'offline_drafts';

/** 与 CreateRecordDto 对齐的草稿载荷（id 为本地生成，补传幂等依据） */
export interface DraftPayload {
  id: string;
  type: string;
  content: string;
  profileId: string;
  occurredAt?: string;
  /* ⚠️ 2026-10-10 修：此前只声明/补传了上面 5 个字段 → 离线记的「点位、坐标、照片、季节」
     在联网补传时被静默丢掉（草稿里有、库里没有）。凡 CreateRecordDto 的业务字段，
     入队与补传必须成对带上，否则「离线草稿」等于半个记录。 */
  lat?: number;
  lng?: number;
  locDesc?: string;
  photoIds?: string[];
  season?: string;
  /** 附加类型标签（2026-10-10 多选胶囊；不含主 type） */
  subTypes?: string[];
  /** 展示用元信息（不提交） */
  label: string;
  savedAt: number;
}

/** 本地草稿 id：防与 cuid 撞形，带 draft- 前缀 + 时间基36 + 随机尾 */
export function genDraftId(): string {
  return 'draft-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function getDrafts(): DraftPayload[] {
  const d = uni.getStorageSync(KEY);
  return Array.isArray(d) ? (d as DraftPayload[]) : [];
}

export function draftCount(): number {
  return getDrafts().length;
}

/** 入队（同 id 去重 —— 同一份草稿重复「存草稿」不翻倍） */
export function enqueueDraft(d: Omit<DraftPayload, 'savedAt'> & { savedAt?: number }): number {
  const list = getDrafts().filter((x) => x.id !== d.id);
  list.push({ ...d, savedAt: d.savedAt ?? Date.now() });
  uni.setStorageSync(KEY, list);
  return list.length;
}

export function removeDraft(id: string): void {
  uni.setStorageSync(KEY, getDrafts().filter((x) => x.id !== id));
}

/** 清空已成功补传的草稿 */
function clearDrafts(ids: string[]): void {
  const set = new Set(ids);
  uni.setStorageSync(KEY, getDrafts().filter((x) => !set.has(x.id)));
}

/** 摘要显示：最近一条草稿的描述（「我的」页等可选用） */
export function lastDraftLabel(): string {
  const list = getDrafts();
  return list.length ? list[list.length - 1].label : '';
}

/**
 * 补传：把队列整批提交，成功者出队。
 * 任一失败（离线/后端不可用）→ 全部保留，下次再试（batch 是事务性语义：
 * 非业务的失败不会部分入库；即便部分成功，幂等 id 也保证重传无副作用）。
 */
export async function flushDrafts(): Promise<{ sent: number; remaining: number }> {
  const list = getDrafts();
  if (!list.length) return { sent: 0, remaining: 0 };
  try {
    await api.post(
      '/records/batch',
      list.map((d) => ({
        id: d.id,
        type: d.type,
        content: d.content,
        profileId: d.profileId,
        occurredAt: d.occurredAt,
        // 2026-10-10 补齐：草稿里有的业务字段必须一起补传（漏一个 = 静默丢数据）
        lat: d.lat,
        lng: d.lng,
        locDesc: d.locDesc,
        photoIds: d.photoIds,
        season: d.season,
        subTypes: d.subTypes,
      })),
      { silent: true },
    );
    clearDrafts(list.map((d) => d.id));
    return { sent: list.length, remaining: 0 };
  } catch {
    return { sent: 0, remaining: list.length };
  }
}
