/**
 * PawTrace 演示数据种子（幂等，可重复执行；每次执行会把相对时间刷新到"现在"）
 *
 * 2026-10-06 起：手机号+密码账号体系（注册即强制绑定手机号），deviceId 匿名登录已下线。
 * 演示账号（登录页输入手机号 + 密码即可）：
 *   小鹿   13866667777 / 12345678  ← 主账号（观察史/我的小组/我的申请都有数据）
 *   阿茶   13800000002 / 12345678  ← 会长视角（浙江科技大学校猫协会，可演示 S10-3 审批）
 *   南山南 13800000003 / 12345678  ← 申请加入小区小组（审核中）
 *   林阿姨 13800000004 / 12345678  ←「翰墨香林苑邻里猫友会」组长
 *   陈同学 13800000005 / 12345678  ← 浙江外国语学院校猫协会 会长
 *   周阿姨 13800000006 / 12345678  ←「浪漫和山花园邻里猫友会」组长
 *
 * 2026-10-08：去掉了「图书馆猫猫观测小队」；改成三个真实小组 —— 协会（CAT666）/ 翰墨香林苑（HMLV202）/
 *             浙江外国语学院校猫协会（ZYW202）。
 * 2026-10-08 二次：用户要求把「翰墨香林苑·浪漫和山花园邻里猫友会」**拆成两个独立小组**
 *             （两个小区各自建组）→ s3 收窄为翰墨香林苑（林阿姨），新增 s5 浪漫和山花园（周阿姨）；
 *             同时把两个小区的坐标从「拍脑袋的质心」换成腾讯地图 POI 真值：
 *               翰墨香林苑 30.210613/120.017212（留和路 568 号）｜浪漫和山花园 30.212622/120.012772（留和路 318 号）
 *             呈现效果：小鹿视角下 4 个组 = 协会「已加入」/ 翰墨「审核中」/ 浪漫和山 + 浙外「未加入」。
 *
 * 数据可见性说明（重要）：
 * - 首页/地图的档案列表只返回「我创建的 + 我关注的」→ 其他账号登录看到的是空列表回落演示数据；
 * - 切换演示身份：登录页退出重登，或在预览页控制台执行
 *     localStorage.clear(); location.reload();
 *   然后走登录页输入对应账号。
 * - 重复执行会重置：档案最新出现时间、记录时间、审批状态（PENDING）。
 */
const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('crypto');

const prisma = new PrismaClient();
const MAIN_DEVICE = process.argv[2] || 'pawtrace-demo-001';
const DEMO_PWD = '12345678'; // 与登录页 8 位圆点演示帧一致

const hashPassword = (password) => {
  const salt = randomBytes(8).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
};

const DAY = 86400000;
const ago = (days, hours = 10) => new Date(Date.now() - days * DAY - hours * 3600000);

async function main() {
  // ---------- 用户（密码账号体系：手机号 + scrypt 密码） ----------
  // 小鹿注册时间回拨 63 天：页面按「注册当天=第1天」计，显示「温柔观测者 · 64 天」与 p9 设计帧一致
  //（每次 seed 刷新）
  const u1 = await prisma.user.upsert({
    where: { id: 'seed-user-01' },
    update: { deviceId: MAIN_DEVICE, nickname: '小鹿', phone: '13866667777', passwordHash: hashPassword(DEMO_PWD), createdAt: ago(63, 0) },
    create: { id: 'seed-user-01', deviceId: MAIN_DEVICE, nickname: '小鹿', phone: '13866667777', passwordHash: hashPassword(DEMO_PWD), createdAt: ago(63, 0) },
  });
  const u2 = await prisma.user.upsert({
    where: { id: 'seed-user-02' },
    update: { nickname: '阿茶', phone: '13800000002', passwordHash: hashPassword(DEMO_PWD) },
    create: { id: 'seed-user-02', deviceId: 'seed-device-02', nickname: '阿茶', phone: '13800000002', passwordHash: hashPassword(DEMO_PWD) },
  });
  const u3 = await prisma.user.upsert({
    where: { id: 'seed-user-03' },
    update: { nickname: '南山南', phone: '13800000003', passwordHash: hashPassword(DEMO_PWD) },
    create: { id: 'seed-user-03', deviceId: 'seed-device-03', nickname: '南山南', phone: '13800000003', passwordHash: hashPassword(DEMO_PWD) },
  });
  // 2026-10-08：新增两个真实小组的组长（林阿姨·小区组 / 陈同学·浙外）
  const u4 = await prisma.user.upsert({
    where: { id: 'seed-user-04' },
    update: { nickname: '林阿姨', phone: '13800000004', passwordHash: hashPassword(DEMO_PWD) },
    create: { id: 'seed-user-04', deviceId: 'seed-device-04', nickname: '林阿姨', phone: '13800000004', passwordHash: hashPassword(DEMO_PWD) },
  });
  const u5 = await prisma.user.upsert({
    where: { id: 'seed-user-05' },
    update: { nickname: '陈同学', phone: '13800000005', passwordHash: hashPassword(DEMO_PWD) },
    create: { id: 'seed-user-05', deviceId: 'seed-device-05', nickname: '陈同学', phone: '13800000005', passwordHash: hashPassword(DEMO_PWD) },
  });
  // 2026-10-08 二次：拆组后「浪漫和山花园」需要自己的组长（与翰墨香林苑的邻居是两拨人）
  const u6 = await prisma.user.upsert({
    where: { id: 'seed-user-06' },
    update: { nickname: '周阿姨', phone: '13800000006', passwordHash: hashPassword(DEMO_PWD) },
    create: { id: 'seed-user-06', deviceId: 'seed-device-06', nickname: '周阿姨', phone: '13800000006', passwordHash: hashPassword(DEMO_PWD) },
  });
  console.log(`用户 ×6（密码账号体系，演示密码 ${DEMO_PWD}）`);

  // ---------- 档案（坐标 = 浙江科技大学小和山校区真实地物，均取腾讯地图 POI 真值 GCJ02，
  // 与 S2 真实底图同一坐标系；每条都落在它「点位名」说的那个地方） ----------
  //   图书馆(图书信息中心) 30.219436/120.027353 ｜ 田径场 30.217433/120.020686
  //   西和公寓(宿舍区)     30.215600/120.022300 ｜ 东和食堂 30.218056/120.030671
  //   东和公寓东门(快递点) 30.218504/120.032088
  //   浙外(小和山校区)真值（2026-10-10 晚补，腾讯 POI）：
  //   校园 POI 中心 30.220692/120.038657（留和路 299 号 · 屏峰地铁站 D 口）
  //   弘文图书馆 30.220315/120.038283 ｜ 和香园食堂 30.220134/120.039749
  //   和畅园食堂 30.217801/120.037391（南侧）
  //   ⚠️ 2026-10-08 小区组/浙外 5 只猫曾「刻意不写 lastSeenLat/Lng」，10-10 用户报障
  //      「地图上没显示」后已全部补上坐标（见下）；已冻结的 S2 像素验收基线不受影响
  //      （基线不重出，真实态不参与 A/B）。
  const profileRows = [
    {
      id: 'seed-profile-01', name: '小橘', animalType: 'CAT',
      coatColor: '橘白', bodySize: '中等', specialMarks: '右耳缺角（TNR 标记）',
      sterilizationStatus: 'STERILIZED', healthStatus: 'HEALTHY',
      lastSeenAt: ago(1), lastSeenLat: 30.219436, lastSeenLng: 120.027353,
      lastSeenDesc: '图书馆东门花坛', season: 'AUTUMN', creatorId: u1.id,
    },
    {
      id: 'seed-profile-02', name: '花臂', animalType: 'CAT',
      coatColor: '玳瑁', bodySize: '偏瘦', specialMarks: '左后腿旧疤，背纹像花臂',
      sterilizationStatus: 'NOT_STERILIZED', healthStatus: 'THIN',
      lastSeenAt: ago(2), lastSeenLat: 30.215600, lastSeenLng: 120.022300,
      lastSeenDesc: '宿舍区自行车棚', season: 'AUTUMN', creatorId: u1.id,
    },
    {
      id: 'seed-profile-03', name: '煤球', animalType: 'CAT',
      coatColor: '纯黑', bodySize: '大型', specialMarks: '脖子上有蓝色项圈（疑似教职工家散养）',
      sterilizationStatus: 'UNKNOWN', healthStatus: 'HEALTHY',
      lastSeenAt: ago(3), lastSeenLat: 30.218056, lastSeenLng: 120.030671,
      lastSeenDesc: '食堂后门小巷', season: 'AUTUMN', creatorId: u1.id,
    },
    {
      id: 'seed-profile-04', name: '年糕', animalType: 'CAT',
      coatColor: '奶牛', bodySize: '小型', specialMarks: '尾尖一撮白毛',
      sterilizationStatus: 'STERILIZED', healthStatus: 'HEALTHY',
      lastSeenAt: ago(1), lastSeenLat: 30.217433, lastSeenLng: 120.020686,
      lastSeenDesc: '田径场看台下', season: 'AUTUMN', creatorId: u2.id,
    },
    {
      id: 'seed-profile-05', name: '大黄', animalType: 'CAT',
      coatColor: '黄色', bodySize: '中等', specialMarks: '胸前白毛，性格温顺',
      sterilizationStatus: 'STERILIZED', healthStatus: 'INJURED',
      lastSeenAt: ago(2), lastSeenLat: 30.218504, lastSeenLng: 120.032088,
      lastSeenDesc: '东和公寓东门', season: 'AUTUMN', creatorId: u2.id,
    },
    // 2026-10-08：小区组 3 只猫（林阿姨 u4 创建）——拆组后 大胖/阿黑 归翰墨香林苑、小白 归浪漫和山花园
    // 2026-10-10 晚补坐标（用户报障「我写了其他三个协会的猫咪，地图上没显示」）：
    // 这 5 只（06–10）此前只有文字点位、lastSeenLat/Lng 全为 null → /profiles/nearby
    // 的 `where lastSeenLat not null` 把它们整只滤掉，永远不上 S2 地图。
    // 坐标口径与其余 seed 猫一致：**街区级（小区/校区内点位级）**，非精确坐标（PRD 6.4 隐私）。
    // 每只取各自「出没点位」文字对应的真实地物位置（同组两只不再重叠成一个点）：
    //   大胖 翰墨香林苑 7 号楼下（组中心 30.210613/120.017212 偏东南 7 号楼）
    //   阿黑 两小区之间小路（翰墨 / 浪漫和山 的中点）
    //   小白 浪漫和山花园北门草坪（组中心 30.212622/120.012772 北门侧）
    //   团子 浙外弘文图书馆旁长椅（POI 真值 30.220315/120.038283）
    //   布丁 浙外和香园食堂后门（POI 真值 30.220134/120.039749）
    //   ⚠️ 2026-10-10 晚勘误（用户报障「团子跟布丁的位置都不对」）：此前团子/布丁的坐标
    //      是以「浙外小组中心 30.215/120.029」为基准硬推的——那个组中心本身就是拍脑袋值、
    //      从未核实过，落在林科院/小和山新苑一带（偏西南约 1.1km）。本次按腾讯 POI 真值
    //      全部修正（团子→弘文图书馆、布丁→和香园食堂，「二食堂」是编的名字一并改为
    //      真实食堂名和香园），小组中心也同步校正到校园 POI 真值。
    {
      id: 'seed-profile-06', name: '大胖', animalType: 'CAT',
      coatColor: '橘白', bodySize: '偏胖', specialMarks: '左耳剪耳（已 TNR），额头有 M 纹',
      sterilizationStatus: 'STERILIZED', healthStatus: 'HEALTHY',
      lastSeenAt: ago(1), lastSeenLat: 30.2109, lastSeenLng: 120.01705,
      lastSeenDesc: '翰墨香林苑 7 号楼下', season: 'AUTUMN', creatorId: u4.id,
    },
    {
      id: 'seed-profile-07', name: '小白', animalType: 'CAT',
      coatColor: '纯白', bodySize: '小型', specialMarks: '异色瞳（一蓝一黄），右前掌有旧伤',
      sterilizationStatus: 'STERILIZED', healthStatus: 'HEALTHY',
      lastSeenAt: ago(2), lastSeenLat: 30.2129, lastSeenLng: 120.0127,
      lastSeenDesc: '浪漫和山花园北门草坪', season: 'AUTUMN', creatorId: u6.id,
    },
    {
      id: 'seed-profile-08', name: '阿黑', animalType: 'CAT',
      coatColor: '纯黑', bodySize: '中等', specialMarks: '尾巴尖白一撮，怕人但每晚准时来吃',
      sterilizationStatus: 'UNKNOWN', healthStatus: 'HEALTHY',
      lastSeenAt: ago(3), lastSeenLat: 30.21152, lastSeenLng: 120.01507,
      lastSeenDesc: '翰墨香林苑与浪漫和山花园之间小路', season: 'AUTUMN', creatorId: u4.id,
    },
    // 2026-10-08：浙外校猫协会 2 只猫（陈同学 u5 创建）
    {
      id: 'seed-profile-09', name: '团子', animalType: 'CAT',
      coatColor: '橘白', bodySize: '中等', specialMarks: '正面看像肉包子，性格亲人',
      sterilizationStatus: 'STERILIZED', healthStatus: 'HEALTHY',
      lastSeenAt: ago(1), lastSeenLat: 30.220315, lastSeenLng: 120.038283,
      lastSeenDesc: '浙外弘文图书馆旁长椅', season: 'AUTUMN', creatorId: u5.id,
    },
    {
      id: 'seed-profile-10', name: '布丁', animalType: 'CAT',
      coatColor: '三花', bodySize: '小型', specialMarks: '后背有块黑斑像地图，常在食堂后门蹲守',
      sterilizationStatus: 'STERILIZED', healthStatus: 'HEALTHY',
      lastSeenAt: ago(2), lastSeenLat: 30.220134, lastSeenLng: 120.039749,
      lastSeenDesc: '浙外和香园食堂后门', season: 'AUTUMN', creatorId: u5.id,
    },
  ];
  for (const p of profileRows) {
    await prisma.profile.upsert({ where: { id: p.id }, update: p, create: p });
  }
  console.log(`档案 ×${profileRows.length}（校猫协会 5 只 + 翰墨香林苑 2 + 浪漫和山花园 1 + 浙外 2，均带街区级坐标）`);

  // ---------- 痕迹记录 ----------
  const recordRows = [
    { id: 'seed-record-01', profileId: 'seed-profile-01', authorId: u1.id, type: 'FEEDING', content: '傍晚定点投喂猫粮约 30g，小橘吃完在花坛边晒了会儿太阳才走。', occurredAt: ago(1), locDesc: '图书馆东门花坛' },
    { id: 'seed-record-02', profileId: 'seed-profile-01', authorId: u1.id, type: 'APPEARANCE', content: '换毛后毛色亮了不少，右耳缺角依旧清晰可辨。', occurredAt: ago(4), locDesc: '图书馆东门花坛' },
    { id: 'seed-record-03', profileId: 'seed-profile-01', authorId: u1.id, type: 'SEASON', content: '入秋后活动时间提前，天没黑就到花坛等着开饭了。', season: 'AUTUMN', occurredAt: ago(8), locDesc: '图书馆东门花坛' },
    { id: 'seed-record-04', profileId: 'seed-profile-02', authorId: u1.id, type: 'HEALTH', content: '左后腿旧疤愈合良好，走路已经看不出跛行。', occurredAt: ago(2), locDesc: '宿舍区自行车棚' },
    { id: 'seed-record-05', profileId: 'seed-profile-02', authorId: u1.id, type: 'FEEDING', content: '加了半个罐头，吃得很快，食欲不错。', occurredAt: ago(6), locDesc: '宿舍区自行车棚' },
    { id: 'seed-record-06', profileId: 'seed-profile-02', authorId: u1.id, type: 'LOCATION', content: '点位从车棚挪到了晾晒棚下方，最近总下雨，躲雨去了。', occurredAt: ago(9), locDesc: '宿舍区晾晒棚下' },
    { id: 'seed-record-07', profileId: 'seed-profile-03', authorId: u1.id, type: 'APPEARANCE', content: '蓝项圈还在，应该是教职工家散养的，只做记录不打扰。', occurredAt: ago(3), locDesc: '食堂后门小巷' },
    { id: 'seed-record-08', profileId: 'seed-profile-03', authorId: u1.id, type: 'HEALTH', content: '体态圆润，精神状态好，眼睛明亮，食堂后门伙食显然不错。', occurredAt: ago(7), locDesc: '食堂后门小巷' },
    { id: 'seed-record-09', profileId: 'seed-profile-04', authorId: u2.id, type: 'FEEDING', content: '定量猫粮 20g，另配了一碗清水。', occurredAt: ago(1), locDesc: '田径场看台下' },
    { id: 'seed-record-10', profileId: 'seed-profile-04', authorId: u2.id, type: 'LOCATION', content: '常驻看台下器材室旁，怕人，但会远远跟着夜跑的同学走一段。', occurredAt: ago(5), locDesc: '田径场看台下' },
    { id: 'seed-record-11', profileId: 'seed-profile-05', authorId: u2.id, type: 'HEALTH', content: '右前掌轻微擦伤，持续观察中，暂不干涉。', occurredAt: ago(2), locDesc: '东和公寓东门' },
    { id: 'seed-record-12', profileId: 'seed-profile-05', authorId: u2.id, type: 'SEASON', content: '秋凉后大黄总在东和公寓东门的台阶上摊成一片，晒到太阳落山才挪窝。', season: 'AUTUMN', occurredAt: ago(6), locDesc: '东和公寓东门' },
    // 2026-10-08：小区组 4 条（林阿姨 u4 记录）
    { id: 'seed-record-13', profileId: 'seed-profile-06', authorId: u4.id, type: 'FEEDING', content: '傍晚在 7 号楼花坛边放了猫粮 30g，大胖吃完在台阶上睡了半小时才走。', occurredAt: ago(1), locDesc: '翰墨香林苑 7 号楼下' },
    { id: 'seed-record-14', profileId: 'seed-profile-07', authorId: u6.id, type: 'APPEARANCE', content: '小白异色瞳看得越来越清，右前掌旧伤已经长好，不影响跑跳。', occurredAt: ago(3), locDesc: '浪漫和山花园北门草坪' },
    { id: 'seed-record-15', profileId: 'seed-profile-07', authorId: u6.id, type: 'LOCATION', content: '最近常在北门草坪晒太阳，比以前愿意让人靠近了。', occurredAt: ago(7), locDesc: '浪漫和山花园北门草坪' },
    { id: 'seed-record-16', profileId: 'seed-profile-08', authorId: u4.id, type: 'HEALTH', content: '阿黑夜里准时来吃猫粮，毛色比上月有光泽，疑似有人也在投喂。', occurredAt: ago(2), locDesc: '翰墨香林苑与浪漫和山花园之间小路' },
    // 2026-10-08：浙外 3 条（陈同学 u5 记录）
    { id: 'seed-record-17', profileId: 'seed-profile-09', authorId: u5.id, type: 'FEEDING', content: '图书馆旁长椅下面定点放猫粮 20g，团子吃完在椅子上翻肚皮。', occurredAt: ago(1), locDesc: '浙外弘文图书馆旁长椅' },
    { id: 'seed-record-18', profileId: 'seed-profile-09', authorId: u5.id, type: 'SEASON', content: '入秋后团子活动时间提前到下午四点，估计是图书馆暖气管的功劳。', season: 'AUTUMN', occurredAt: ago(5), locDesc: '浙外弘文图书馆旁长椅' },
    { id: 'seed-record-19', profileId: 'seed-profile-10', authorId: u5.id, type: 'LOCATION', content: '布丁常在和香园食堂后门蹲守，到饭点就在脚边蹭腿要东西吃。', occurredAt: ago(2), locDesc: '浙外和香园食堂后门' },
  ];
  for (const r of recordRows) {
    await prisma.record.upsert({ where: { id: r.id }, update: r, create: r });
  }
  console.log(`痕迹记录 ×${recordRows.length}`);

  // ---------- 关注关系（「我关注的」，阶段3 过滤的数据源） ----------
  const obsRows = [
    { userId: u1.id, profileId: 'seed-profile-01' },
    { userId: u1.id, profileId: 'seed-profile-02' },
    { userId: u1.id, profileId: 'seed-profile-03' },
    { userId: u1.id, profileId: 'seed-profile-04' },
    { userId: u2.id, profileId: 'seed-profile-04' },
    { userId: u2.id, profileId: 'seed-profile-05' },
    { userId: u3.id, profileId: 'seed-profile-01' },
  ];
  for (const o of obsRows) {
    await prisma.observation.upsert({
      where: { userId_profileId: o }, update: {}, create: o,
    });
  }
  console.log(`关注关系 ×${obsRows.length}`);

  // ---------- 协作空间（2026-10-08 调整：去掉离 8km 的「图书馆猫猫观测小队」，
  // 改成两个真实近邻小区组：翰墨+浪漫邻里组 / 浙外校猫协会） ----------
  // 先把旧的 seed-space-01 整组删掉（cascade 会清掉它的 members / profiles / join requests），
  // 然后把 s2 协会保留（阿茶 会长），再新建 s3（小区组，林阿姨组长）+ s4（浙外，陈同学组长）。
  await prisma.space.delete({ where: { id: 'seed-space-01' } }).catch(() => {/* 首次跑可能没这条 */});

  // s2 协会：保留不动（小鹿 申请加入，审核中）
  // ⚠️ 2026-10-08 晚：community 由「小和山校区」改为「浙江科技大学小和山校区」，
  //    与浙外（浙江外国语学院小和山校区）写法对齐 —— 汇报/地图上"只写小和山校区"看不出是哪所学校。
  const s2 = await prisma.space.upsert({
    where: { id: 'seed-space-02' },
    update: { name: '浙江科技大学校猫协会', description: '浙江科技大学小和山校区校猫协会：全校区流浪猫档案共建、TNR 绝育跟踪与医疗互助。协会有共享诱捕笼两套，紧急伤病可呼叫互助，新学期招新进行中。', tags: 'TNR · 术后放归 · 医疗互助', inviteCode: 'CAT666', ownerId: u2.id, community: '浙江科技大学小和山校区', lat: 30.2178, lng: 120.0266 },
    create: { id: 'seed-space-02', name: '浙江科技大学校猫协会', description: '浙江科技大学小和山校区校猫协会：全校区流浪猫档案共建、TNR 绝育跟踪与医疗互助。协会有共享诱捕笼两套，紧急伤病可呼叫互助，新学期招新进行中。', tags: 'TNR · 术后放归 · 医疗互助', inviteCode: 'CAT666', ownerId: u2.id, community: '浙江科技大学小和山校区', lat: 30.2178, lng: 120.0266 },
  });

  // s3 小区组：翰墨香林苑邻里猫友会（林阿姨 u4 当组长）
  // ⚠️ 2026-10-08 二次：原为「翰墨香林苑·浪漫和山花园」合并组，按用户要求拆成两个独立组；
  //    s3 收窄为翰墨香林苑单小区；坐标同步换成腾讯 POI 真值（留和路 568 号），
  //    原先的 30.2235/120.0220 是"两个小区质心"的拍脑袋值，实际落点在浙科大北侧、离小区 1.4km。
  const s3 = await prisma.space.upsert({
    where: { id: 'seed-space-03' },
    update: { name: '翰墨香林苑邻里猫友会', description: '翰墨香林苑小区的邻居自助组。固定夜班投喂 + 群内通报动态 + 异常猫咪拍照发群。组里有兽医背景的邻居可远程初诊，新人凭房号入群即可加入。', tags: '邻里接力 · 夜班投喂 · 异常通报', inviteCode: 'HMLV202', ownerId: u4.id, community: '翰墨香林苑', lat: 30.210613, lng: 120.017212 },
    create: { id: 'seed-space-03', name: '翰墨香林苑邻里猫友会', description: '翰墨香林苑小区的邻居自助组。固定夜班投喂 + 群内通报动态 + 异常猫咪拍照发群。组里有兽医背景的邻居可远程初诊，新人凭房号入群即可加入。', tags: '邻里接力 · 夜班投喂 · 异常通报', inviteCode: 'HMLV202', ownerId: u4.id, community: '翰墨香林苑', lat: 30.210613, lng: 120.017212 },
  });

  // s5 小区组：浪漫和山花园邻里猫友会（周阿姨 u6 当组长）—— 与翰墨香林苑相邻的另一小区，独立成组
  const s5 = await prisma.space.upsert({
    where: { id: 'seed-space-05' },
    update: { name: '浪漫和山花园邻里猫友会', description: '浪漫和山花园小区的邻居互助组。别墅区绿化多、流浪猫分散，靠北门草坪定点投喂 + 每晚巡更顺路看一眼。新手可先跟着老邻居走两晚熟悉点位。', tags: '邻里互助 · 定点投喂 · 巡更顺路', inviteCode: 'LMSH202', ownerId: u6.id, community: '浪漫和山花园', lat: 30.212622, lng: 120.012772 },
    create: { id: 'seed-space-05', name: '浪漫和山花园邻里猫友会', description: '浪漫和山花园小区的邻居互助组。别墅区绿化多、流浪猫分散，靠北门草坪定点投喂 + 每晚巡更顺路看一眼。新手可先跟着老邻居走两晚熟悉点位。', tags: '邻里互助 · 定点投喂 · 巡更顺路', inviteCode: 'LMSH202', ownerId: u6.id, community: '浪漫和山花园', lat: 30.212622, lng: 120.012772 },
  });

  // s4 浙外校猫协会：陈同学 u5 当组长（浙外小和山校区独立于浙科大，校园猫只在本校流转）
  const s4 = await prisma.space.upsert({
    where: { id: 'seed-space-04' },
    update: { name: '浙江外国语学院校猫协会', description: '浙江外国语学院小和山校区校园猫档案库。校园猫均已建档 TNR，由校社团运营：日常投喂、寒暑假留守方案、新生入学导览。', tags: '校园社团 · TNR · 寒暑假留守', inviteCode: 'ZYW202', ownerId: u5.id, community: '浙江外国语学院小和山校区', lat: 30.220692, lng: 120.038657 },
    create: { id: 'seed-space-04', name: '浙江外国语学院校猫协会', description: '浙江外国语学院小和山校区校园猫档案库。校园猫均已建档 TNR，由校社团运营：日常投喂、寒暑假留守方案、新生入学导览。', tags: '校园社团 · TNR · 寒暑假留守', inviteCode: 'ZYW202', ownerId: u5.id, community: '浙江外国语学院小和山校区', lat: 30.220692, lng: 120.038657 },
  });

  const memberRows = [
    // s2 协会：阿茶会长 + 小鹿成员 + 南山南成员（小鹿 通过审批，正式加入协会，
    // 方便 S7「我的小组」与 S10 看板演示有数据可看）
    { spaceId: s2.id, userId: u2.id, role: 'OWNER' },
    { spaceId: s2.id, userId: u1.id, role: 'MEMBER' },
    { spaceId: s2.id, userId: u3.id, role: 'MEMBER' },
    // s3 翰墨香林苑：林阿姨会长（仅 1 位成员；小鹿 是 PENDING 申请者，不是 member）
    { spaceId: s3.id, userId: u4.id, role: 'OWNER' },
    // s5 浪漫和山花园：周阿姨会长（仅 1 位成员；目前无人申请 → 对小鹿是「未加入」态）
    { spaceId: s5.id, userId: u6.id, role: 'OWNER' },
    // s4 浙外：陈同学会长（仅 1 位成员）
    { spaceId: s4.id, userId: u5.id, role: 'OWNER' },
  ];
  for (const m of memberRows) {
    await prisma.spaceMember.upsert({
      where: { spaceId_userId: { spaceId: m.spaceId, userId: m.userId } },
      update: { role: m.role },
      create: m,
    });
  }
  // ⚠️ 拆组后先清掉这两个小区组的所有点位绑定再重建：否则小白（profile-07）会留着 s3 的旧绑定，
  //    同时出现在翰墨香林苑和浪漫和山花园两个组的猫咪列表里。
  await prisma.spaceProfile.deleteMany({
    where: { spaceId: { in: [s3.id, s5.id] } },
  });
  const spRows = [
    // s2 协会：花臂 / 煤球 / 大黄（不变）
    { spaceId: s2.id, profileId: 'seed-profile-02' },
    { spaceId: s2.id, profileId: 'seed-profile-03' },
    { spaceId: s2.id, profileId: 'seed-profile-05' },
    // s3 翰墨香林苑：大胖 / 阿黑（阿黑的常驻点在两个小区之间的小路，归活动更频繁的翰墨组）
    { spaceId: s3.id, profileId: 'seed-profile-06' },
    { spaceId: s3.id, profileId: 'seed-profile-08' },
    // s5 浪漫和山花园：小白（常驻北门草坪，2 条记录都在那边）
    { spaceId: s5.id, profileId: 'seed-profile-07' },
    // s4 浙外：团子 / 布丁
    { spaceId: s4.id, profileId: 'seed-profile-09' },
    { spaceId: s4.id, profileId: 'seed-profile-10' },
  ];
  for (const b of spRows) {
    await prisma.spaceProfile.upsert({
      where: { spaceId_profileId: { spaceId: b.spaceId, profileId: b.profileId } },
      update: {},
      create: b,
    });
  }
  console.log(`协作空间 ×4（协会 CAT666 / 翰墨香林苑 HMLV202 / 浪漫和山花园 LMSH202 / 浙外 ZYW202）+ 成员 ×${memberRows.length} + 点位绑定 ×${spRows.length}`);

  // ---------- 入组申请（重跑会重置为 PENDING，方便反复演示审批流） ----------
  // 协会：seed-join-02 小鹿 → 已通过（变成 member，便于 S7/S10 看板演示；阿茶会长侧不再有这条 pending）
  // 翰墨香林苑：seed-join-04 小鹿 → 申请中（"附近的一个小区（审核中）"）
  // 翰墨香林苑：seed-join-03 南山南 → 申请中（林阿姨 组长演示 S10-3 审批）
  // 浪漫和山花园 / 浙外：小鹿**都没有申请** → 列表页这两张卡呈「未加入」态（卡片右下显示「申请加入」按钮）
  const reqRows = [
    { id: 'seed-join-02', spaceId: s2.id, userId: u1.id, message: '花臂的旧疤是我先记录的，想正式加入协会，一起照顾宿舍区这边的猫。', status: 'APPROVED' },
    { id: 'seed-join-03', spaceId: s3.id, userId: u3.id, message: '住在翰墨香林苑 5 号楼，每晚都看见大胖下楼遛弯，想加入一起投喂。', status: 'PENDING' },
    { id: 'seed-join-04', spaceId: s3.id, userId: u1.id, message: '我住在小和山这边，平时在浙科大观察花臂它们；想加入邻里组一起照顾翰墨香林苑这边的社区猫。', status: 'PENDING' },
  ];
  // 顺手把旧 seed-join-01（绑定 s1）清掉，避免孤儿外键
  await prisma.spaceJoinRequest.delete({ where: { id: 'seed-join-01' } }).catch(() => {});
  for (const j of reqRows) {
    await prisma.spaceJoinRequest.upsert({ where: { id: j.id }, update: j, create: j });
  }
  console.log(`入组申请 ×${reqRows.length}（含 ${reqRows.filter(r => r.status === 'PENDING').length} 条待审批）`);

  console.log('\n✔ seed 完成。登录页输入 13866667777 / ' + DEMO_PWD + ' 即可以主账号「小鹿」完整浏览；');
  console.log('   切换演示身份：控制台 localStorage.clear(); location.reload(); 后用对应账号重新登录。');
  console.log('   演示审批：用 13800000004（林阿姨，翰墨香林苑组长）登录 → S7 协作空间 → 翰墨组「去处理」审批 南山南。');
}

main()
  .catch((e) => {
    console.error('seed 失败:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
