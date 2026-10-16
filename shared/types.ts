/**
 * PawTrace 前后端共享类型 —— 唯一事实来源
 * 后端 src 引用这里保持响应结构一致；前端 import 后缀 .ts 需编译支持（阶段2可先手动同步）
 */

/** 统一响应包裹 */
export interface ApiResp<T = unknown> {
  code: number; // 0 成功
  msg: string;
  data: T;
}

export type AnimalType = 'CAT' | 'DOG';
export type SterilizationStatus = 'UNKNOWN' | 'STERILIZED' | 'NOT_STERILIZED';
export type HealthStatus = 'HEALTHY' | 'THIN' | 'INJURED' | 'SICK' | 'DECEASED';
export type RecordType =
  | 'APPEARANCE' | 'LOCATION' | 'HEALTH' | 'FEEDING' | 'SEASON' | 'DEVICE';
export type Season = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
export type SpaceRole = 'OWNER' | 'MEMBER';
export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
}

export interface Photo {
  id: string;
  url: string;
  size: number;
  moderated: boolean;
}

export interface Profile {
  id: string;
  name: string;
  animalType: AnimalType;
  coatColor?: string | null;
  bodySize?: string | null;
  specialMarks?: string | null;
  sterilizationStatus: SterilizationStatus;
  healthStatus: HealthStatus;
  lastSeenAt?: string | null;
  lastSeenLat?: number | null; // 街区级模糊坐标
  lastSeenLng?: number | null;
  lastSeenDesc?: string | null;
  creatorId: string;
  avatarPhoto?: Photo | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Record {
  id: string;
  type: RecordType;
  content: string;
  season?: Season | null;
  lat?: number | null;
  lng?: number | null;
  locDesc?: string | null;
  occurredAt: string;
  isDraft: boolean;
  authorId: string;
  profileId: string;
  photos: Photo[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Space {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
}

export interface AiRecognizeResult {
  cached: boolean;
  breed: string;
  coatColor: string;
  bodySize: string;
  healthHint: string;
  confidence: number;
  sciCard: { title: string; content: string };
}

/** 离线同步 */
export interface SyncPullResp {
  serverTime: string; // 客户端存为下次 lastSyncAt
  profiles: Profile[];
  records: Record[];
}

export interface SyncPushResp {
  accepted: { profiles: number; records: number };
  conflicts: string[]; // 冲突项 id，客户端放弃本地版改用服务端版
  serverTime: string;
}
