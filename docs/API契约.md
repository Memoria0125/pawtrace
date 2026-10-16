# PawTrace API 契约 v0.1

> 基准：PRD v1.1 + 线框原型 18 屏（2026-09-12 版）
> 通用约定：
> - Base URL：`http://localhost:3000/api`
> - 认证：`Authorization: Bearer <token>`（除 auth 外全部接口）
> - 响应包裹：`{ code, msg, data }`，`code=0` 成功
> - 时间一律 ISO 8601 字符串；坐标一律**街区级模糊坐标**（PRD 6.4）

## 1. 认证 auth

| 方法 | 路径 | 说明 | 屏 |
|---|---|---|---|
| POST | /auth/device | deviceId 匿名登录（首次自动注册）。入参 `{deviceId, nickname?}` → `{token, user}` | S1/S2 |
| POST | /auth/bind-phone | 手机号绑定（P1 预留） | — |

## 2. 档案 profiles

| 方法 | 路径 | 说明 | 屏 |
|---|---|---|---|
| GET | /profiles?page=&pageSize= | 我关注/我创建的档案列表 | S3 |
| POST | /profiles | 建档（字段见 shared/types.ts Profile；name 缺省自动生成"橘猫·0824"式） | S5/S6 |
| GET | /profiles/:id | 档案详情 + 最近 5 条记录 | S7 |
| PATCH | /profiles/:id | 更新（version+1） | S7 |
| GET | /profiles/:id/timeline | 时间轴（occurredAt 倒序，cursor 分页） | S8 |
| POST | /profiles/:id/observe | 认领为"我的观测对象" | S3/S7 |

## 3. 记录 records

| 方法 | 路径 | 说明 | 屏 |
|---|---|---|---|
| POST | /records | 新增痕迹记录 | S9 |
| GET | /records?authorId=&profileId=&type=&page= | 记录列表（观察史） | S13 |
| GET | /records/today-feeding | 今日投喂汇总 `{count, profiles[], items[]}` | S10 |
| POST | /records/batch | 离线草稿批量补传（按 id upsert，幂等） | 离线 |
| PATCH | /records/:id | 更新记录 | S9 |

## 4. 上传 upload

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /upload/presign?ext=jpg | 拿 COS 预签名直传 URL `{uploadUrl, key, expiresIn}` |
| POST | /upload/confirm?key= | 直传完成确认 → Photo 记录 + 内容安全审核 |

> 客户端责任：压缩 ≤500KB、剥离 EXIF/GPS 后再直传。

## 5. 离线同步 sync

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /sync/pull?uid=&since= | 增量拉取 `{serverTime, profiles[], records[]}` |
| POST | /sync/push | 批量推送，冲突 last-write-wins，返回 `{accepted, conflicts[], serverTime}` |

## 6. 协作空间 spaces

| 方法 | 路径 | 说明 | 屏 |
|---|---|---|---|
| POST | /spaces | 建组（创建者即 OWNER） | S15 |
| GET | /spaces/mine?uid= | 我的小组列表 | S15 |
| GET | /spaces/search?code= | 邀请码搜组 | S16 |
| POST | /spaces/:id/join | 提交入组申请 `{uid, message?}` | S16 |
| PATCH | /spaces/join-requests/:reqId | 审批 `{approve: boolean}` | S17 |
| GET | /spaces/:id/join-requests | 待审批列表（OWNER） | S17 |
| GET | /spaces/:id/profiles | 小组共享档案 | S15 |

## 7. AI 识别 ai

| 方法 | 路径 | 说明 | 屏 |
|---|---|---|---|
| POST | /ai/recognize | `{photoKey, uid}` → 识别结果 + 科普卡（见 shared/types.ts AiRecognizeResult）。限流：每用户每日 50 次；同图缓存命中直接返回 | S6/S11/S12 |

> 密钥红线：AI key 只存后端 `.env`，任何响应不下发密钥。

## 错误码约定

| code | 含义 |
|---|---|
| 0 | 成功 |
| 1 | 业务失败（msg 里带原因） |
| 401 | 未登录/token 过期（前端统一 reLaunch 到登录页） |

## 骨架期说明

当前后端骨架的 DTO 里 `uid`/`creatorId` 由客户端透传，是**阶段2 接入 JWT Guard 前的过渡写法**，Guard 上线后从 token 取并删除这些字段——届时本契约同步更新，前端不需要改调用方式。

## 8. 图片上传 upload（2026-10-06 本地磁盘版）

| 方法 | 路径 | 说明 | 屏 |
|---|---|---|---|
| POST | /upload/image | `{imageBase64}`（dataURL 或裸 base64）→ `{id, url, width, height}`。需 JWT。服务端剥 EXIF/GPS/XMP/IPTC（PRD 6.4 位置隐私）；仅 JPEG/PNG；≤1MB；url 为相对路径 `/uploads/...`，前端 `assetUrl()` 拼后端 origin | S3/S9 |

业务关联：记录用 `POST /records` 的 `photoIds: string[]`；档案头像用 `POST /profiles` 的 `avatarPhotoId`。
静态服务：`GET /uploads/*`（`pawtrace-server/uploads/`，maxAge 30d；⚠️ `enableCors()` 必须先于静态中间件注册，否则 H5 前端 fetch 图片全挂 CORS）。
阶段4 接 COS 时：`uploadImage` 内换 SDK putObject，`Photo.cosKey` 语义不变。
