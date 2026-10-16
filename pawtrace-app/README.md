# pawtrace-app

PawTrace 爪迹前端 — Vue3 + uni-app（HBuilderX 项目，无需 npm install）

## 用 HBuilderX 打开本目录即可运行

1. HBuilderX → 文件 → 打开目录 → 选 `M:\pawtrace\pawtrace-app`
2. 运行 → 运行到浏览器（先看排版）/ 运行到手机或模拟器（真机调试）
3. 后端跑起来后，改 `common/config.ts` 里的 `BASE_URL`（模拟器里 localhost 要换成局域网 IP）

## 设计基准

- 线框原型：`M:\项目案例\liulangmao\Page 1.png`（18 屏，2026-09-12 版，与 PDF 等价）
- 设计令牌在 `uni.scss`：米绿纸底 `#F1ECDF` / 苔绿 `#8FA08B` / 陶土棕 `#C68B6F`
- 手账风元素：`.paw-card`（卡片+投影）`.paw-tape`（胶带贴角）`.paw-stamp`（印章描边）定义在 `App.vue`

## 页面清单（对照 Page 1 的 18 屏）

| 屏 | 文件 | 说明 |
|---|---|---|
| S1 | pages/login/login.vue | 登录（deviceId 匿名） |
| S2 | pages/login/register.vue | 注册（设昵称） |
| S3 | pages/home/index.vue | 观测台首页（Tab1） |
| S4 | pages/map/nearby.vue | 附近点位地图（Tab2） |
| S5+S6 | pages/profile/create.vue | 新增档案 + AI 识别弹窗 |
| S7 | pages/profile/detail.vue | 个体档案详情 |
| S8 | pages/profile/timeline.vue | 时间轴（成长史） |
| S9 | pages/record/create.vue | 记录痕迹（Tab3 中间键） |
| S10 | pages/record/feeding.vue | 今日投喂 |
| S11 | pages/record/ai-parse.vue | AI 图像解析结果 |
| S12 | components/paw-sci-card/paw-sci-card.vue | AI 科普小知识卡（**浮层组件**；页壳 pages/record/sci-card.vue 仅供深链兜底）|
| S13 | pages/history/index.vue | 观察史 |
| S14 | pages/my/index.vue | 我的（Tab5） |
| S15 | pages/space/index.vue | 协作小组列表（Tab4） |
| S16 | pages/space/join.vue | 申请协作 |
| S17 | pages/space/approve.vue | 协作申请审批 |
| S18 | —（跳过） | 原型中的灰色占位屏，无功能 |

## 阶段标记

- `TODO(阶段3)`：W5–W8 前端核心闭环（EXIF 剥离、COS 直传、离线草稿队列 sqlite）
- `TODO(阶段4)`：W9–W12（地图 SDK key、建组弹层、小组详情页）

## 隐私红线（PRD 6.4）

- 照片上传前必须剥离 EXIF/GPS（阶段3在 `takePhoto` 处接入）
- 定位上报前必须 `blurCoordinate()` 模糊到街区级（`common/auth.ts` 已实现）
