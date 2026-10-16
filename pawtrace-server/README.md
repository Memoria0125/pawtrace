# pawtrace-server

PawTrace 爪迹后端 — NestJS + TypeScript + Prisma + MySQL

## 首次启动

```bash
cd M:\pawtrace\pawtrace-server
npm install
copy .env.example .env   # 填入数据库密码等
npx prisma migrate dev --name init   # 建库建表
npm run start:dev        # http://localhost:3000/api
```

## 模块地图

| 模块 | 路由前缀 | 职责 | 对应线框屏 |
|---|---|---|---|
| auth | /api/auth | deviceId 匿名登录 + JWT | S1/S2 |
| profiles | /api/profiles | 档案 CRUD + 时间轴 + 认领 | S3/S5/S6/S7/S8 |
| records | /api/records | 痕迹记录 + 今日投喂 + 批量补传 | S9/S10/S13 |
| upload | /api/upload | COS 预签名直传 + 审核确认 | 全局拍照 |
| sync | /api/sync | 离线增量拉取/推送（last-write-wins） | 离线场景 |
| spaces | /api/spaces | 协作小组 + 邀请码 + 审批 | S12/S15/S16/S17 |
| ai | /api/ai | AI 识别代理（缓存 + 限流，密钥不出后端） | S6/S11/S12 |

## 阶段标记说明

代码中的 `TODO(阶段2)` = 路线图 W3–W5 要补的实现（JWT Guard 接入后删除 DTO 中的 uid/creatorId 透传字段）。
`TODO(阶段4)` = W9–W12 亮点功能（COS 真实预签名、AI 真实 API、内容安全审核）。

## 红线提醒

- `.env` 永远不进 git（已在 .gitignore 计划内）
- AI 密钥、COS 密钥只允许出现在 `.env`
- 客户端传来的坐标必须是街区级模糊坐标（PRD 6.4）
