<template>
  <!--
    S9 痕迹记录录入（PRD F2.2 记录）
    设计基准：「PawTrace 爪迹 - 线框与交互原型.pdf」p11，逐像素实测（375×812 @2.9573x，1 设计 px = 2rpx）
    结构（自上而下）：
      自绘导航（返回 + 居中「记录痕迹」+ AI 辅助胶囊 + 「存草稿」）
      → 「这次做了什么?」sec 标题 + 5 类型胶囊（投喂选中；第 5 枚「季节」为 2026-10-10
        用户指定增补 —— 设计稿只画了 4 枚，选中态几何沿稿、行内等分填充，明细见核对文档第廿七章）
      → 档案卡（头像 + 三花·小花 + 档案#12 浅米徽章 + 右箭头）
      → 拍照行（相机图标 + 拍照上传 · AI 自动识别 + 右侧 AI 已识别胶囊）
      → 3 照片块（前两块已填「记录照片」，第 3 块 + 照片）
      → AI 卡（机器人图标 + AI 识别结果 + 预填·可修改胶囊 + 6 tag + ✏ 铅笔提示）
      → 大卡（时间行 / 位置行 / 分隔线 / 喂了什么 / 喂了多少 / AI 草稿标题 + 正文块）
      → 主按钮「确认无误，保存记录」
    三处刻意处理（非漏做）：
      1. 导航标题偏右（实测 137.62-231.97pt，中心 184.8pt）—— 因右侧 AI 辅助胶囊紧跟标题右沿无间隔（设计稿原样）
      2. 档案徽章「档案 #12」= 浅米 #EFE8D8 底 + 灰字 #8B8779，不是深绿
      3. 6 个 AI 标签中只有「体型偏瘦」是警示粉（文字 #BF8767 + 底 #F2E1D6），其余 5 个都是浅绿 #E9F0E6
    2026-10-11 增补（用户诉求）：
      1. 真实照片块右上角加「×」删除按钮（设计稿没有；只在有照片时出现 → 默认态零影响）
      2. 修「照片残留」bug：pending_photo 改一次性消费（onShow 读完即删 + onUnload 兜底清理），
         此前只读不删 → 未保存退出重进 / 换档案再记时，上次选的照片会复现
  -->
  <view class="paw-page s9">
    <!-- ============ 自绘导航（paw-navbar 共享组件） ============
         p11 实测：标题「记录痕迹」墨迹 137.63~232.64pt，中心 185.14pt
         右块：AI 胶囊实体 48.69×19.61pt = 97.4×39.2rpx（x 250.23~298.92），
               「存草稿」墨迹 311.43~349.64（26rpx #8FA08B）
         rightW 取 215（比标题所需的 209.44 略宽）是为了给「胶囊 + 存草稿」留出不换行的余量，
         标题中心改为用 title-shift 单独校正 —— 两者解耦，避免重演「存草稿被挤成两行」 -->
    <paw-navbar
      title="记录痕迹"
      :left-w="200"
      :right-w="215"
      :right-pad="10.72"
      :title-shift="2.78"
    >
      <template #right>
        <view class="nav-ai" @tap="goAi">
          <text class="nav-ai-txt">AI 辅助</text>
        </view>
        <text class="paw-nav-act paw-nav-act--muted" @tap="onDraft">存草稿</text>
      </template>
    </paw-navbar>

    <!-- ============ 这次做了什么? ============ -->
    <view class="sec">
      <text class="sec-t">这次做了什么?</text>
    </view>

    <!-- ============ 5 类型胶囊（多选；「季节」为 2026-10-10 用户指定增补） ============
         2026-10-10 用户诉求「一次记两件事」（投喂 + 点位变化）→ 单选改多选：
         首个所选 = 主类型（form.type），其余 = 附加标签（form.subTypes 落库）；
         至少保留 1 个（点唯一选中的胶囊不响应）。演示态默认单选 FEEDING → 基线不变。 -->
    <view class="types">
      <view
        v-for="t in types" :key="t.value"
        class="tchip" :class="{ 'tchip--on': hasType(t.value) }"
        @tap="toggleType(t.value)"
      >
        <text class="tchip-t">{{ t.label }}</text>
      </view>
    </view>

    <!-- ============ 档案卡（阶段3：点选真实档案；未选时为设计稿演示态） ============ -->
    <view class="pf" @tap="onPickProfile">
      <view class="pf-av">
        <text class="pf-av-t">{{ profileChar }}</text>
      </view>
      <text class="pf-name">{{ profileName }}</text>
      <view class="pf-id">
        <text class="pf-id-t">{{ profileBadge }}</text>
      </view>
      <view class="pf-chev">
        <view class="pf-chev-a"></view>
        <view class="pf-chev-b"></view>
      </view>
    </view>

    <!-- ============ 拍照行 + 照片块（右侧 AI 已识别胶囊） ============ -->
    <view class="cam">
      <view class="cam-ico">
        <view class="cam-body"></view>
        <view class="cam-lens"></view>
        <view class="cam-flash"></view>
      </view>
      <text class="cam-t">拍照上传</text>
      <text class="cam-dot">·</text>
      <text class="cam-ai">AI</text>
      <text class="cam-auto">自动识别</text>
    </view>

    <view class="photos">
      <view
        v-for="(p, i) in photos" :key="i" class="ph" :class="p.cls"
        :style="p.bg ? { backgroundImage: 'url(' + p.bg + ')', backgroundSize: 'cover', backgroundPosition: 'center' } : ''"
        @tap="onPhotoTap(i)"
      >
        <view v-if="p.plus" class="ph-plus">
          <view class="ph-pa"></view>
          <view class="ph-pb"></view>
        </view>
        <text v-if="p.plus" class="ph-t">照片</text>
        <!-- 删除按钮（2026-10-11 用户诉求「图片右上角有叉叉」）：仅真实照片块有
             @tap.stop 拦掉冒泡 → 点 × 只删这张，不会连带触发外层「点照片看大图」 -->
        <view v-if="!p.plus" class="ph-x" @tap.stop="onPhotoDel(i)">
          <view class="ph-x-a"></view>
          <view class="ph-x-b"></view>
        </view>
      </view>
      <view v-if="aiApplied" class="cam-ok">
        <view class="cam-ok-v"></view>
        <text class="cam-ok-t">AI 已识别</text>
      </view>
    </view>

    <!-- ============ AI 卡（识别结果 + 6 tag + 铅笔提示） ============ -->
    <view class="ai">
      <view class="ai-h">
        <view class="ai-ico">
          <view class="ai-bot-ant"></view>
          <view class="ai-bot"></view>
        </view>
        <text class="ai-ai">AI</text>
        <text class="ai-t">识别结果</text>
        <view class="ai-pre">
          <text class="ai-pre-t">预填·可修改</text>
        </view>
      </view>

      <view class="tags">
        <view
          v-for="(g, i) in aiTags" :key="i"
          class="tag" :class="'tag--' + g.cls"
          hover-class="tag--hover"
          hover-stay-time="60"
          @tap="onTagTap(i)"
        >
          <text class="tag-t">{{ g.text }}</text>
        </view>
        <!-- 「＋ 添加标签」：仅真实档案态出现 —— 演示态保持设计稿 6 tag 原样（像素基线不变） -->
        <view
          v-if="form.profileId"
          class="tag tag--add"
          hover-class="tag--hover"
          hover-stay-time="60"
          @tap="onTagAdd"
        >
          <view class="tag-add-a"></view>
          <view class="tag-add-b"></view>
        </view>
      </view>

      <view class="ai-note">
        <view class="ai-pencil"></view>
        <text class="ai-note-t">点按任意标签即可修改 · 未确认不会入库</text>
      </view>
    </view>

    <!-- ============ 大卡（时间/地点/喂食/草稿） ============ -->
    <view class="big">
      <!-- 时间行：时间 + 值 + dot + 自动记录 + [自动] 内联胶囊
           演示态保持设计稿原文「今天 08:24」；已选真实档案时显示真实当前时刻
           （该行标注「自动记录」，写死演示值会让 21:00 保存的记录显示 08:24） -->
      <view class="t-row">
        <text class="t-lbl">时间</text>
        <text class="t-val">{{ timeText }}</text>
        <text class="t-dot">·</text>
        <text class="t-rec">自动记录</text>
        <view class="t-cap">
          <text class="t-cap-t">自动</text>
        </view>
      </view>

      <!-- 位置行：位置 + 值 + dot + 楼栋 + [仅小区级] 内联胶囊（橙字）
           定位链路（2026-10-07）：取到定位显示「点位名 · 自动定位」（点位名默认取所选档案的常驻点），
           未取到保持设计稿原文（像素基线依赖此兜底）。
           2026-10-08 晚：点位名可能很长（如阿黑「翰墨香林苑与浪漫和山花园之间小路」17 字）——
           原 `height:40rpx` 固定单行会把 label 挤成竖排、值溢出压到下一行；改为
           ① min-height:40rpx（演示态单行渲染与 height:40rpx 完全等价 → 基线不变）
           ② 名字过长（>9 字）时切 `.l-row--wrap`：「· 自动定位 [仅小区级]」整组折到第二行
           ③ label 加 flex-shrink:0，任何情况都不再被压扁
           2026-10-10：右侧加「微调」入口（**仅真实定位态**，见下方 v-if）——用户诉求
           「点位更新后的当前街区，能不能自己改得更精细」（如「图书馆东门花坛」）。 -->
      <view class="l-row" :class="{ 'l-row--wrap': locLong }">
        <text class="l-lbl">位置</text>
        <view class="l-main">
          <text class="l-val">{{ locName }}</text>
          <view class="l-meta">
            <text class="l-dot">·</text>
            <text class="l-bld">{{ locSub }}</text>
            <view class="l-cap">
              <text class="l-cap-t">仅小区级</text>
            </view>
          </view>
        </view>
        <!-- 微调入口：只在拿到真实定位时出现 —— 没定位时位置行是设计稿兜底帧
             （「静安小区 · 3 号楼旁」），给它配编辑口等于让演示值冒充真实位置；
             同时 v-if 不产 DOM → S9 像素基线零影响 -->
        <text v-if="loc" class="l-edit" @tap="openLocSheet">微调</text>
      </view>

      <!-- 分隔线（实测 1pt #E2DCCA） -->
      <view class="sep"></view>

      <!-- ============ 类型分表单（2026-10-08 晚三；10-10 加第 5 类 + 多选叠加） ============
           胶囊多选后按所选类型**叠加渲染**（选「投喂+相遇」两块都出现，一次打卡记多件事）：
           · 投喂 → 喂了什么 / 喂了多少（设计稿原样，演示态默认 = 基线逐像素一致）
           · 健康 → 健康状况单选（Record 无独立健康列，所选状态保存时拼进 content）
           · 外貌 → 常见变化快捷词（点按写进描述，仅真实态渲染）
           · 相遇 → 相遇点位选择（常驻点 / 当前定位，写入 locDesc）
           · 季节 → 季节单选（写入 Record.season 列，与 seed 的季节记录同口径） -->
      <template v-if="hasType('FEEDING')">
        <!-- 喂了什么 -->
        <text class="f1-lbl">喂了什么</text>
        <view class="f1-row">
          <view
            v-for="f in feedWhat" :key="f.value"
            class="fchip" :class="{ 'fchip--on': form.feedWhat === f.value }"
            @tap="form.feedWhat = f.value"
          >
            <text class="fchip-t">{{ f.label }}</text>
          </view>
        </view>

        <!-- 喂了多少 -->
        <text class="f2-lbl">喂了多少</text>
        <view class="f2-row">
          <view
            v-for="f in feedHowmuch" :key="f.value"
            class="fchip" :class="{ 'fchip--on': form.feedHowmuch === f.value }"
            @tap="form.feedHowmuch = f.value"
          >
            <text class="fchip-t">{{ f.label }}</text>
          </view>
        </view>
      </template>

      <!-- 健康：状态单选（口径与档案页 HEALTH_TEXT 一致，不含「已离世」——
           纪念态属于档案层操作，不该出现在随手记录里） -->
      <template v-if="hasType('HEALTH')">
        <text class="f1-lbl">健康状况</text>
        <view class="f1-row">
          <view
            v-for="h in healthOpts" :key="h.value"
            class="fchip" :class="{ 'fchip--on': form.healthStatus === h.value }"
            @tap="form.healthStatus = h.value"
          >
            <text class="fchip-t">{{ h.label }}</text>
          </view>
        </view>
        <text class="f-hint">在下方备注里补充你看到的情况</text>
      </template>

      <!-- 外貌：常见变化快捷词（点按写进描述，再点一次撤销；演示态不渲染 → 不碰演示文案） -->
      <template v-if="hasType('APPEARANCE')">
        <template v-if="form.profileId">
          <text class="f1-lbl">常见变化 · 点按写进描述</text>
          <view class="f1-row f1-row--wrap">
            <view
              v-for="a in appearOpts" :key="a"
              class="fchip" :class="{ 'fchip--on': (form.content || '').includes(a) }"
              @tap="tapAppear(a)"
            >
              <text class="fchip-t">{{ a }}</text>
            </view>
          </view>
        </template>
        <text v-else class="f1-lbl">拍下照片，描述这次看到的变化</text>
      </template>

      <!-- 相遇：点位选择（常驻点 / 当前定位；写入 locDesc，落库为 LOCATION 记录） -->
      <template v-if="hasType('LOCATION')">
        <text class="f1-lbl">相遇点位</text>
        <view v-if="meetOpts.length" class="f1-row f1-row--wrap">
          <view
            v-for="o in meetOpts" :key="o.value"
            class="fchip fchip--auto" :class="{ 'fchip--on': meetPick === o.value }"
            @tap="pickMeet(o)"
          >
            <text class="fchip-t">{{ o.label }}</text>
          </view>
        </view>
        <text v-else class="f-hint">拿到定位或选择档案后，这里可以标记相遇点位</text>
        <text v-if="meetOpts.length" class="f-hint">这只猫这次在哪里被遇见</text>
      </template>

      <!-- 季节：季节单选（落库写 Record.season 列 —— 与 seed 的季节记录同口径，
           PRD 五类中的「季节变化」正式开放录入入口。2026-10-10 用户指定） -->
      <template v-if="hasType('SEASON')">
        <text class="f1-lbl">当前季节</text>
        <view class="f1-row">
          <view
            v-for="s in seasonOpts" :key="s.value"
            class="fchip" :class="{ 'fchip--on': form.season === s.value }"
            @tap="form.season = s.value"
          >
            <text class="fchip-t">{{ s.label }}</text>
          </view>
        </view>
        <text class="f-hint">季节变化对流浪猫的作息影响最大——写一句你观察到的变化</text>
      </template>

      <!-- AI 草稿（阶段3：绑定 form.content，AI 识别回填后自动更新；
           2026-10-08 晚：选中真实档案后转为可编辑 textarea —— 设计稿标注的「可修改」
           此前没有输入口，导致未跑 AI 时只能带着演示稿文案（三花…）入库；
           2026-10-08 晚三：标题随记录类型切换（投喂 = 设计稿原文，其余类型语义化） -->
      <text class="d-lbl">{{ draftLabel }}</text>
      <view class="d-body">
        <textarea
          v-if="draftEditable"
          class="d-body-ta"
          v-model="form.content"
          placeholder="写一句你看到的变化；或先拍照上传让 AI 生成草稿"
          placeholder-class="d-ph"
          maxlength="200"
          auto-height
        />
        <text v-else class="d-body-t">{{ form.content }}</text>
      </view>
    </view>

    <!-- ============ 主按钮 ============ -->
    <view class="cta" @tap="onSave">
      <text class="cta-t">确认无误，保存记录</text>
    </view>

    <!-- ============ 档案选择弹层（2026-10-08 晚：替换原生 showActionSheet） ============
         原生 ActionSheet 是系统灰白卡、无搜索、最多 6 项；改为手账风底部弹层（与 S10-2
         申请弹层同形制：paw-scrim + paw-sheet）并加搜索框（名字 / 花色 / 体型 / 点位）。 -->
    <view v-if="pkOn" class="paw-scrim" @tap="pkOn = false"></view>
    <view v-if="pkOn" class="paw-sheet pk">
      <view class="pk-handle"></view>
      <text class="pk-title">选择观察对象</text>
      <text class="pk-sub">共 {{ pkList.length }} 只 · 你建档的与正在观测的</text>

      <view class="pk-search">
        <view class="pk-ico">
          <view class="pk-ico-r"></view>
          <view class="pk-ico-h"></view>
        </view>
        <input
          class="pk-input"
          v-model="pkKeyword"
          placeholder="搜索名字 / 花色 / 体型 / 点位"
          placeholder-class="pk-ph"
          confirm-type="search"
        />
        <view v-if="pkKeyword" class="pk-clear" @tap="pkKeyword = ''">
          <view class="pk-x-a"></view>
          <view class="pk-x-b"></view>
        </view>
      </view>

      <scroll-view class="pk-list" scroll-y>
        <view
          v-for="p in pkFiltered"
          :key="p.id"
          class="pk-item"
          :class="{ 'pk-item--on': p.id === form.profileId }"
          hover-class="pk-item--hover"
          hover-stay-time="60"
          @tap="chooseProfile(p)"
        >
          <view class="pk-av" :class="'pk-av--' + toneOf(p.id)">
            <text class="pk-av-t">{{ String(p.name || '猫').trim().charAt(0) }}</text>
          </view>
          <view class="pk-info">
            <text class="pk-name">{{ p.name || '未命名' }}</text>
            <text class="pk-meta">{{ metaOf(p) }}</text>
          </view>
          <view v-if="p.id === form.profileId" class="pk-check">
            <view class="pk-check-a"></view>
          </view>
        </view>
        <text v-if="!pkFiltered.length" class="pk-empty">没有匹配的猫咪，换个关键词试试</text>
      </scroll-view>

      <view class="pk-foot">
        <text class="pk-foot-t">选定后，位置行默认填这只猫的常驻点位</text>
      </view>
    </view>

    <!-- ==========================================================================
         点位微调弹层（2026-10-10 新增，与 S3 建档页同款形制）
         用户诉求：位置行写着「当前街区 · 自动定位」，想自己写更精细的地址。
         弹层里先看地图上我的位置（街区级模糊坐标），再自由填点位名 → 写入 locDesc：
           · 位置行立刻跟随显示（副文案转「手动标注」，不再冒充「自动定位」）
           · 随记录落库（后端 touchProfileSpot 会把它同步成这只猫的最近点位 → S2 地图跟随）
         ⚠️ 入口门控 v-if="loc"，整层 v-if 无 DOM 常驻 → 兜底帧与像素基线不受影响。
         隐私口径：地图与坐标一律街区级模糊（PRD 6.4），只到街区、不记录门牌号。
         ========================================================================== -->
    <view v-if="locSheetOn" class="sp-mask" @tap="closeLocSheet">
      <view class="spsheet" @tap.stop>
        <view class="sp-head">
          <text class="sp-title">微调本次点位</text>
          <view class="sp-close" @tap="closeLocSheet">
            <view class="sp-close-x"></view>
          </view>
        </view>

        <!-- 地图：蓝点 = 我的当前位置（已模糊到街区级） -->
        <view class="sp-mapwrap">
          <map
            v-if="loc && MAP_ENABLED"
            class="sp-map"
            :latitude="loc.lat"
            :longitude="loc.lng"
            :scale="16"
            :markers="locMarkers"
          />
          <view v-else class="sp-map sp-map--none">
            <text class="sp-map-txt">还没拿到定位</text>
          </view>
        </view>

        <text class="sp-hint">{{ locHint }}</text>

        <view class="sp-row">
          <view class="sp-use" :class="{ 'sp-use--off': !loc }" @tap="useCurrentLoc">用当前位置</view>
          <text class="sp-tip">只到街区级，不记录门牌号</text>
        </view>

        <text class="sp-label">点位名（可以自己写得更精细）</text>
        <input
          class="sp-input"
          v-model="locAddr"
          placeholder="如：图书馆东门花坛 / 3 号楼后车棚"
          placeholder-class="sp-ph"
          maxlength="20"
        />
        <text class="sp-hint">保存后这条记录会带上它，这只猫的最近点位也会跟着更新</text>

        <view class="sp-btns">
          <view class="sp-btn sp-btn--main" @tap="confirmLoc">保存点位</view>
          <view class="sp-btn sp-btn--ghost" @tap="closeLocSheet">取消</view>
        </view>
      </view>
    </view>

    <!-- ============ 标签编辑弹窗（2026-10-08 晚） ============
         提示行写着「点按任意标签即可修改」，但标签此前是纯 <text>（没有 @tap），点了没反应。
         复用 paw-dialog 手账风壳（新增默认插槽放输入框）：改文字 / 新增 / 删除。
         ⚠️ 标签是 AI 建议位，后端 Record 无 tags 字段 → 只影响界面（正合「未确认不会入库」）。 -->
    <paw-dialog
      :show="tagEditOn"
      :title="tagIndex < 0 ? '添加标签' : '修改标签'"
      confirm-text="保存"
      tone="plain"
      @cancel="tagEditOn = false"
      @confirm="onTagSave"
    >
      <input
        class="tag-in"
        v-model="tagDraft"
        placeholder="写一个你看到的特征，比如「左耳有个小缺口」"
        placeholder-class="tag-in-ph"
        confirm-type="done"
        :focus="tagEditOn"
        @confirm="onTagSave"
      />
      <view
        v-if="tagIndex >= 0"
        class="tag-del"
        hover-class="tag-del--hover"
        hover-stay-time="60"
        @tap="onTagDelete"
      >
        <text class="tag-del-t">删除这个标签</text>
      </view>
    </paw-dialog>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { api } from '../../common/api';
import { enqueueDraft, genDraftId, draftCount } from '../../common/drafts';
import { uploadImage } from '../../common/uploader';
import { getLocationBlurred } from '../../common/location';
import { MAP_ENABLED, MK_ICON } from '../../common/map';

/**
 * 演示数据兜底：与设计稿 p11 完全同款。
 * 后端未启动 / 离线时撑起版面；已选档案 / AI 回填后由真实数据覆盖。
 * DEMO_CONTENT 初值 = 设计稿草稿正文 → 绑定后默认态像素零回归。
 */
const DEMO_CONTENT = '三花母猫，右耳缺角（疑似 TNR 标记），体型偏瘦但毛色尚可，主动靠近觅食，精神状态良好。';

const types = [
  { label: '投喂', value: 'FEEDING' },
  // 「相遇」按点位更新落库（后端 RecordType 无 ENCOUNTER 枚举，直接传会 400 被误报为离线草稿）
  { label: '相遇', value: 'LOCATION' },
  { label: '健康', value: 'HEALTH' },
  { label: '外貌', value: 'APPEARANCE' },
  // 2026-10-10 用户指定增补：设计稿只画了 4 枚，但 PRD 五类里「季节变化」一直存在、
  // 只有 seed 演示数据用到（用户发现「我没设过季节 tag，怎么有季节记录」）→ 正式开放录入
  { label: '季节', value: 'SEASON' },
];

const TYPE_LABEL: Record<string, string> = {
  APPEARANCE: '外貌记录',
  LOCATION: '位置记录',
  HEALTH: '健康记录',
  FEEDING: '投喂记录',
  SEASON: '季节记录',
  DEVICE: '设备记录',
};

const form = ref({
  type: 'FEEDING', // 主类型 = 首个所选
  subTypes: [] as string[], // 附加类型标签（多选；2026-10-10「一次打卡记多件事」）
  profileId: '',
  feedWhat: 'DRY_FOOD',
  feedHowmuch: 'A_HAND',
  healthStatus: '',
  season: '',
  content: DEMO_CONTENT,
});

/** 该类型是否在选（主类型或附加标签） */
function hasType(v: string) {
  return form.value.type === v || form.value.subTypes.includes(v);
}

/** 胶囊多选切换（2026-10-10）：首个所选为主类型；至少保留 1 个（点唯一选中的不响应） */
function toggleType(v: string) {
  if (form.value.type === v) {
    if (!form.value.subTypes.length) return; // 唯一选中 → 保持
    form.value.type = form.value.subTypes.shift()!; // 附加首位提为主
    return;
  }
  const i = form.value.subTypes.indexOf(v);
  if (i >= 0) form.value.subTypes.splice(i, 1);
  else form.value.subTypes.push(v);
}

/** 档案卡展示（未选档案时 = 设计稿演示态，保证像素基线不变） */
const profileName = ref('三花·小花');
const profileChar = ref('花');
const profileBadge = ref('档案 #12');

/**
 * 草稿区是否可编辑（2026-10-08 晚）：只在「已选真实档案」后开启，
 * 未选档案的纯演示态仍渲染 `<text>`（与设计稿逐像素一致）。
 */
const draftEditable = ref(false);

/** AI 是否已回填过（回填后不再用档案属性覆盖标签；「AI 已识别」胶囊随之出现） */
const aiApplied = ref(false);

/** 档案枚举 → 中文（口径与档案详情页一致） */
const NEUTER_TEXT: Record<string, string> = {
  STERILIZED: '已绝育',
  NOT_STERILIZED: '未绝育',
  UNKNOWN: '绝育未确认',
};
const HEALTH_TEXT: Record<string, string> = {
  HEALTHY: '健康',
  THIN: '偏瘦',
  INJURED: '受伤',
  SICK: '疑似生病',
};

/** 标签里的「警示词」→ 用粉底 tag--t5（AI 回填与手工改标签共用同一套判定） */
const TAG_NEG = /偏瘦|过胖|受伤|病|异常|虚弱/;

/** 已上传照片的 photoId（key = 本地临时路径；选图后后台上传，保存时按当前照片区取用）。
    用「路径 → id」映射而不是无键数组：删掉某张照片后它的 photoId 不会再进 payload
    （2026-10-11 加删除按钮时的同步处理；原为数组，删图会留下悬空的照片关联） */
const photoIdMap = ref<Record<string, string>>({});

/* ============ 定位链路（2026-10-07） ============
 * 进页取街区级模糊坐标（失败不发，保持设计稿演示位置行）；
 * 点位名默认取所选档案的常驻点位（lastSeenDesc），「城市点位」统计由此去重。 */
const loc = ref<{ lat: number; lng: number } | null>(null);
const locDesc = ref('');

onLoad(async () => {
  loc.value = await getLocationBlurred();
});

const locName = computed(() => (loc.value ? (locDesc.value || '当前街区') : '静安小区'));
const locSub = computed(() =>
  loc.value ? (locManual.value ? '手动标注' : '自动定位') : '3 号楼旁',
);

/** 位置行是否要换行布局：点位名 > 9 字时单行放不下（演示态「静安小区」4 字 → 恒 false，基线不变） */
const locLong = computed(() => locName.value.length > 9);

/** 用户是否手写过点位名（微调弹层保存过），决定副文案「手动标注 / 自动定位」 */
const locManual = ref(false);

/* ============ 点位微调弹层（2026-10-10：把 S3 建档页的能力搬到记录页） ============
   用户诉求：位置行写着「当前街区 · 自动定位」，想自己写更精细的地址（如「图书馆东门花坛」）。
   写入 locDesc：位置行立即跟随；随记录落库后，后端 touchProfileSpot 会同步成这只猫的
   最近点位（S2 地图 marker 跟着走）。入口 v-if="loc" 门控 + 整层 v-if → 基线零影响。 */
const locSheetOn = ref(false);
const locAddr = ref('');
/** 弹层地图上的蓝点 = 我的当前位置（与 S2 同款 mk-me.png；不用 show-location，坐标系未换算） */
const locMarkers = computed(() =>
  loc.value
    ? [
        {
          id: 0,
          latitude: loc.value.lat,
          longitude: loc.value.lng,
          iconPath: MK_ICON.me,
          width: 26,
          height: 26,
        },
      ]
    : [],
);

function openLocSheet() {
  locAddr.value = locDesc.value;
  locSheetOn.value = true;
}

/** 用当前位置：先填「当前位置附近」，用户可在此基础上改得更精确 */
function useCurrentLoc() {
  if (!loc.value) {
    uni.showToast({ title: '还没拿到定位，可直接自己填写点位名', icon: 'none' });
    return;
  }
  locAddr.value = '当前位置附近';
  uni.showToast({ title: '已填入「当前位置附近」，可改成更具体的', icon: 'none' });
}

/** 保存点位名：空值 = 清除（位置行回落到「当前街区 · 自动定位」） */
function confirmLoc() {
  const name = locAddr.value.trim();
  locDesc.value = name;
  locManual.value = !!name;
  // 同步「相遇点位」胶囊：手写的名字本身就是更精细的点位选项（meetOpts 里的 'manual'），
  // 保存后高亮跟着走 —— 否则胶囊写着「当前街区」、落库名却是手写值（两处说法不一致）。
  // 清空名字 = 回「当前街区 · 自动定位」，所以清空时高亮落回 'here'（不是常驻点）。
  meetPick.value = name ? 'manual' : loc.value ? 'here' : profileSpot.value ? 'spot' : '';
  locSheetOn.value = false;
  uni.showToast({ title: name ? `点位已记为「${name}」` : '已清除点位名', icon: 'none' });
}

function closeLocSheet() {
  locSheetOn.value = false;
}

/** 弹层里那行位置说明（有定位给模糊坐标，没定位给明确指引） */
const locHint = computed(() =>
  loc.value
    ? `地图上的位置：${loc.value.lat.toFixed(4)}, ${loc.value.lng.toFixed(4)}（已模糊到街区级）`
    : '未能获取定位，直接在下面自己写点位名也可以',
);

/** 时间行：未选档案 = 设计稿演示值；已选真实档案 = 当前时刻 */
const timeText = computed(() => {
  if (!form.value.profileId) return '今天 08:24';
  const d = new Date();
  return `今天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
});

/** 照片区最多张数 */
const MAX_PHOTO = 3;
/** 照片块：真实照片驱动 —— 设计稿画的两块灰块是「已有 2 张照片」的示例态，
    不是两张常驻占位；未上传时只留「+ 照片」入口（2026-10-08 晚四修正） */
const photos = ref<any[]>([{ cls: 'ph--plus', plus: true }]);

/** 当前照片区对应的 photoId 列表（顺序同照片；未上传成功 / 已删的自动跳过）——
    存草稿与直存共用 buildPayload，这里是 photoIds 的唯一真值来源 */
const photoIds = computed(() =>
  photos.value
    .filter((p: any) => p.bg)
    .map((p: any) => photoIdMap.value[p.bg])
    .filter(Boolean),
);

/** AI 标签（默认 = 设计稿 6 tag；AI 识别回填后覆盖） */
const aiTags = ref([
  { text: '猫·三花',       cls: 't1' },
  { text: '橘白黑花纹',    cls: 't2' },
  { text: '右耳缺角',      cls: 't3' },
  { text: '佩戴项圈',      cls: 't4' },
  { text: '体型偏瘦',      cls: 't5' },
  { text: '精神尚可',      cls: 't6' },
]);

const feedWhat = [
  { label: '猫粮',   value: 'DRY_FOOD' },
  { label: '罐头',   value: 'WET_FOOD' },
  { label: '饮用水', value: 'WATER' },
  { label: '小零食', value: 'SNACK' },
];

const feedHowmuch = [
  { label: '一小把', value: 'A_HAND' },
  { label: '半碗',   value: 'HALF_BOWL' },
  { label: '一碗',   value: 'ONE_BOWL' },
];

/** 选项值 → 展示名（保存时把「喂了什么/喂了多少」写进正文；找不到回落原值） */
function optLabel(list: { label: string; value: string }[], v: string) {
  return list.find((o) => o.value === v)?.label || v;
}

/* ============ 类型分表单（2026-10-08 晚三） ============ */
/** 健康状况单选（不含 DECEASED 已离世——纪念态属档案层操作） */
const healthOpts = [
  { label: '健康',     value: 'HEALTHY' },
  { label: '偏瘦',     value: 'THIN' },
  { label: '受伤',     value: 'INJURED' },
  { label: '疑似生病', value: 'SICK' },
];

/** 季节单选（写入 Record.season；枚举口径 = prisma Season） */
const seasonOpts = [
  { label: '春', value: 'SPRING' },
  { label: '夏', value: 'SUMMER' },
  { label: '秋', value: 'AUTUMN' },
  { label: '冬', value: 'WINTER' },
];

/** 外貌常见变化快捷词（点按写进描述、再点撤销） */
const appearOpts = ['换毛期', '变瘦了', '变胖了', '毛色变亮', '受伤恢复中'];

/** 相遇点位选项：档案常驻点（lastSeenDesc）+ 当前定位（拿到 GPS 才有）+ 手写点位名 */
const profileSpot = ref('');
const meetPick = ref('');
const meetOpts = computed(() => {
  const o: { label: string; value: string }[] = [];
  if (profileSpot.value) o.push({ label: profileSpot.value, value: 'spot' });
  if (loc.value) o.push({ label: '当前街区', value: 'here' });
  // 微调弹层手写过点位名 → 作为第三个选项出现（否则胶囊高亮与落库的 locDesc 对不上）
  if (locManual.value && locDesc.value) o.push({ label: locDesc.value, value: 'manual' });
  return o;
});
function pickMeet(o: { label: string; value: string }) {
  meetPick.value = o.value;
  // 「当前街区」= 清掉 locDesc，位置行回落到定位链路的「当前街区 · 自动定位」
  if (o.value === 'spot') {
    locDesc.value = profileSpot.value;
    locManual.value = false;
  } else if (o.value === 'here') {
    locDesc.value = '';
    locManual.value = false;
  }
  // 'manual' → 保留手写名（不动 locDesc/locManual）
}

/** 外貌快捷词：写进 / 撤销于草稿正文（真实态才生效，不碰演示文案） */
function tapAppear(a: string) {
  if (!form.value.profileId) return;
  const c = form.value.content || '';
  if (c.includes(a)) {
    form.value.content = c.split('，').filter((s) => s.trim() !== a).join('，');
    return;
  }
  form.value.content = c ? `${c}，${a}` : a;
}

/** 多类型时的存档标签（如「投喂记录 + 位置记录」；单选 = 原样） */
const typeLabelText = computed(() => {
  const l = TYPE_LABEL[form.value.type] ?? '记录';
  const rest = form.value.subTypes.map((t) => TYPE_LABEL[t]).filter(Boolean);
  return rest.length ? `${l} + ${rest.join(' + ')}` : l;
});

/** 草稿标题随类型切换：投喂 = 设计稿原文（基线），其余类型语义化；多选时拼「投喂 + 相遇」 */
const draftLabel = computed(() => {
  const m: Record<string, string> = {
    FEEDING: 'AI 观测草稿 · 可修改',
    HEALTH: '健康备注 · 可修改',
    APPEARANCE: '外貌变化描述 · 可修改',
    LOCATION: '相遇备注 · 可修改',
    SEASON: '季节变化描述 · 可修改',
  };
  const main = m[form.value.type] || 'AI 观测草稿 · 可修改';
  if (!form.value.subTypes.length) return main;
  const rest = form.value.subTypes.map((t) => (m[t] || '').split(' ·')[0]).filter(Boolean);
  return rest.length ? `${main.split(' ·')[0]} + ${rest.join(' + ')} · 可修改` : main;
});

onLoad((q?: any) => {
  // 从档案详情 / 时间轴带 profileId 进来 → 回填该猫真名（2026-10-08 晚修 bug：
  // 此前只存了 id 不回填名字，导致「不管从哪只猫点进来，上面写的都是三花·小花」）
  if (q?.profileId) resolveProfile(String(q.profileId));
});

/** 拉档案真值回填档案卡（公开接口，别人的档案也能读；离线失败保持演示态） */
async function resolveProfile(pid: string) {
  try {
    const d: any = await api.get(`/profiles/${pid}`, undefined, { silent: true });
    if (d && d.id) applyProfile(d);
  } catch {
    /* 离线 / 档案不存在 → 保持演示态，不阻塞记录流程 */
  }
}

/** 把档案真值写进档案卡 + 位置行默认点位 + 标签区 + 开启草稿编辑 */
function applyProfile(p: any) {
  form.value.profileId = p.id;
  profileName.value = p.name || '未命名';
  profileChar.value = String(p.name || '猫').trim().charAt(0);
  // 徽章：设计稿是「档案 #12」这类浅米小标签，真实数据用花色（短、可读），无花色则回落文案
  profileBadge.value = p.coatColor ? String(p.coatColor) : '已选档案';
  locDesc.value = String(p.lastSeenDesc || ''); // 记录点位默认 = 该猫常驻点
  locManual.value = false; // 换猫 → 手写点位名作废（副文案回到「自动定位」）
  profileSpot.value = String(p.lastSeenDesc || ''); // 相遇点位选项 · 常驻点
  if (profileSpot.value) meetPick.value = 'spot'; // 默认选中常驻点（与位置行口径一致）
  // 演示稿内容只在「未选档案」的演示态保留：选中真实猫后清空，避免把「三花母猫…」
  // 写进别的猫的记录（用户实际遇到的问题：年糕的记录里存着三花的描述）
  if (form.value.content === DEMO_CONTENT) form.value.content = '';
  if (!aiApplied.value) aiTags.value = tagsOf(p); // 未跑 AI 前用档案里已有的属性预填
  draftEditable.value = true;
}

/** 档案属性 → 标签区预填（花色 / 体型 / 特征 / 健康 / 绝育；未跑 AI 时不让演示标签残留） */
function tagsOf(p: any): { text: string; cls: string }[] {
  const out: { text: string; cls: string }[] = [];
  const push = (t?: string, neg = false) => {
    const s = String(t || '').trim();
    if (!s) return;
    // 2026-10-10 修「按位置配色」：原 `'t' + ((out.length % 5) + 1)` 让**第 5 个标签无条件变粉**
    //（粉底 t5 是警示色，设计稿演示态里正好落在「体型偏瘦」上 → 位置的巧合被当成了语义）。
    // 真实档案第 5 个属性（如「已绝育」）因此被误标成警示色 —— 改为按内容判定（TAG_NEG）。
    const isNeg = neg || TAG_NEG.test(s);
    out.push({ text: s, cls: isNeg ? 't5' : 't' + ((out.length % 4) + 1) });
  };
  push(p.coatColor ? `猫·${p.coatColor}` : '猫');
  push(p.bodySize ? `体型${p.bodySize}` : '');
  String(p.specialMarks || '')
    .split(/[·,，、]/)
    .map((s: string) => s.trim())
    .filter(Boolean)
    .forEach((s: string) => push(s));
  push(HEALTH_TEXT[p.healthStatus] || '');
  push(NEUTER_TEXT[p.sterilizationStatus] || '');
  return out.slice(0, 6);
}

onShow(() => {
  // AI 解析页带回的识别结果：标签 + 观测草稿回填
  const ai = uni.getStorageSync('ai_result');
  if (ai && typeof ai === 'object') {
    applyAiResult(ai as any);
    uni.removeStorageSync('ai_result');
  }
  // 选中的照片追加到照片区（真实张数驱动；最多 MAX_PHOTO 张）
  // ⚠️ 2026-10-11 报障修复：原先只读不删，这条「一次性」的临时路径会永久留在本地存储里
  //    → 用户没保存退出后再进、甚至换另一只猫点「记录」时，上次选的照片会莫名复现。
  //    对齐 ai_result 的做法：读完立刻消费掉（AI 解析页在跳转前已先用它跑完识别）。
  const pending = uni.getStorageSync('pending_photo');
  if (pending && typeof pending === 'string') {
    uni.removeStorageSync('pending_photo');
    const reals = photos.value.filter((p: any) => p.bg);
    if (!reals.some((p: any) => p.bg === pending)) {
      reals.push({ cls: 'ph--real', bg: pending });
      photos.value = [...reals.slice(-MAX_PHOTO), { cls: 'ph--plus', plus: true }];
    }
  }
});

onUnload(() => {
  // 兜底：没保存/没返回就离开本页（返回、redirectTo、reLaunch）→ 清掉本次会话的选图暂存，
  // 防止它漂流到下一次进入（含「换档案再记」）。此时照片区已随页面实例一起销毁。
  uni.removeStorageSync('pending_photo');
});

onLoad(() => {
  // 再兜一层：进页面还能读到 pending_photo = 上次会话的残留（例如直接关掉浏览器 /
  // 小程序被系统回收，这两种情况 onUnload 都不保证触发）→ 清掉，
  // 避免「一进记录页就冒出上次没保存的照片」。
  // pending_photo 的语义 = 「选图 → AI 解析 → 回到本页」这一次往返的一次性信物，别无它用。
  uni.removeStorageSync('pending_photo');
});

/** AI 识别结果 → 6 个标签（警示词用 t5 粉底）+ 草稿正文 */
function applyAiResult(r: any) {
  const parts: string[] = [];
  if (r.species || r.coat) parts.push(`${r.species ?? '猫'}·${r.coat ?? '未知'}`);
  if (r.coat) parts.push(String(r.coat) + '花纹');
  String(r.features ?? '')
    .split('·')
    .map((s: string) => s.trim())
    .filter(Boolean)
    .forEach((s: string) => parts.push(s));
  String(r.body ?? '')
    .split(/[,，、]/)
    .map((s: string) => s.trim())
    .filter(Boolean)
    .forEach((s: string) => parts.push(s));
  const NEG = TAG_NEG;
  aiTags.value = parts.slice(0, 6).map((text, i) => ({
    text,
    cls: NEG.test(text) ? 't5' : 't' + ((i % 5) + 1),
  }));
  if (r.draft) form.value.content = String(r.draft);
  aiApplied.value = true;
  // AI 回填后草稿同样可继续手改（「可修改」在设计稿里本就标注了）
  draftEditable.value = true;
}

/** 返回由 <paw-navbar> 内部处理（common/nav.goBack，栈深不足回首页 Tab）。 */

/**
 * 记录载荷组装（onSave 与 onDraft 共用 —— 2026-10-10 重构）
 * 此前两条路径各写各的：直存发全套字段，存草稿只发 4 个 → 草稿里的季节/点位/照片/坐标
 * 在补传时被静默丢掉。现在统一由这里产出，保证「存草稿 → 联网补传」落库内容与直存一致。
 * @param requireContent 直存要求正文非空；存草稿允许半成品（只要求已选档案）
 * @returns payload；校验不过返回 null（toast 已在内部提示）
 */
function buildPayload(requireContent: boolean) {
  if (!form.value.profileId) {
    uni.showToast({ title: '先点上方档案卡选择观察对象', icon: 'none' });
    return null;
  }
  if (requireContent && !form.value.content.trim()) {
    uni.showToast({ title: '先写下观察内容，或拍照让 AI 生成草稿', icon: 'none' });
    return null;
  }
  // 健康在选：状态单选必填（Record 无独立健康列，所选状态拼进 content 落库）
  if (requireContent && hasType('HEALTH') && !form.value.healthStatus) {
    uni.showToast({ title: '先选一个健康状况', icon: 'none' });
    return null;
  }
  // 季节在选：季节单选必填（Record 有 season 列 → 直接落该列，不拼进 content）
  if (requireContent && hasType('SEASON') && !form.value.season) {
    uni.showToast({ title: '先选一个季节', icon: 'none' });
    return null;
  }
  // 「选了要有下文」：投喂与健康的选项 Record 里没有对应列（只有 season 是有列的），
  // 统一以「字段名：值」前缀写进 content —— 否则这些胶囊选了等于没选（2026-10-10 补）
  const prefix: string[] = [];
  if (hasType('HEALTH') && form.value.healthStatus) {
    prefix.push(`健康状态：${HEALTH_TEXT[form.value.healthStatus]}`);
  }
  if (hasType('FEEDING')) {
    prefix.push(`投喂：${optLabel(feedWhat, form.value.feedWhat)} · ${optLabel(feedHowmuch, form.value.feedHowmuch)}`);
  }
  const body = form.value.content.trim();
  const content = prefix.length ? `${prefix.join('。')}。${body}` : body;
  return {
    type: form.value.type,
    // 多类型标签（2026-10-10）：附加所选（不含主 type，后端还会去重）
    subTypes: form.value.subTypes.length ? [...form.value.subTypes] : undefined,
    content,
    profileId: form.value.profileId,
    occurredAt: new Date().toISOString(),
    // 季节在选 → 落 Record.season 列（枚举口径 = prisma Season，后端 DTO 已支持）
    season: hasType('SEASON') ? form.value.season : undefined,
    // 定位链路（2026-10-07）：街区级模糊坐标 + 点位名（取不到定位时不发）
    lat: loc.value?.lat,
    lng: loc.value?.lng,
    // 相遇在选且手动选了点位（meetPick）时，即使没有 GPS 也发点位名；
    // 其余类型维持原口径：拿到定位且有点位名才发（投喂行为不受影响）。
    // 点位名来源有三：档案常驻点 / 相遇胶囊选择 / 位置行「微调」手写（2026-10-10）——
    // 三者都写进 locDesc，同一个出口。
    locDesc:
      (loc.value || (hasType('LOCATION') && meetPick.value)) && locDesc.value
        ? locDesc.value
        : undefined,
    // 已上传照片（选图后后台上传拿到的 photoId；离线时无）。按**当前照片区**取 →
    // 用户删掉的那张不会再把 photoId 带进 payload（2026-10-11）
    photoIds: photoIds.value.length ? photoIds.value : undefined,
  };
}

/** 存草稿：入离线草稿队列（联网后 App 启动/网络恢复时自动补传） */
function onDraft() {
  const payload = buildPayload(false);
  if (!payload) return;
  const n = enqueueDraft({
    id: genDraftId(),
    ...payload,
    label: `${TYPE_LABEL[form.value.type] ?? '记录'} · ${profileName.value}`,
  });
  uni.showToast({ title: `已存草稿（共 ${n} 条待补传）`, icon: 'none' });
}

/* ============ 档案选择弹层（2026-10-08 晚：原生 ActionSheet → 手账风弹层 + 搜索） ============ */
const pkOn = ref(false);
const pkList = ref<any[]>([]);
const pkKeyword = ref('');

/** 搜索过滤：名字 / 花色 / 体型 / 特征 / 常驻点位 */
const pkFiltered = computed(() => {
  const k = pkKeyword.value.trim().toLowerCase();
  if (!k) return pkList.value;
  return pkList.value.filter((p) =>
    [p.name, p.coatColor, p.bodySize, p.specialMarks, p.lastSeenDesc]
      .filter(Boolean)
      .some((v: string) => String(v).toLowerCase().indexOf(k) >= 0),
  );
});

/** 列表副行：花色 · 体型 · 常驻点位（缺项自动跳过） */
function metaOf(p: any): string {
  const s = [p.coatColor, p.bodySize].filter(Boolean).join(' · ');
  return [s, p.lastSeenDesc].filter(Boolean).join(' · ') || '还没有点位信息';
}

/** 头像色调：按 id 哈希固定三色（与详情页同款色板，避免每次进页面变来变去） */
const PK_TONES = ['deep', 'sage', 'clay'];
function toneOf(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PK_TONES[Math.abs(h) % 3];
}

/** 选择档案：拉「我的观测对象」列表 → 开弹层（离线提示） */
async function onPickProfile() {
  let list: any[] = [];
  try {
    list = await api.get<any[]>('/profiles', undefined, { silent: true });
  } catch {
    /* 离线 → 走下面的提示 */
  }
  if (!Array.isArray(list) || !list.length) {
    uni.showToast({ title: '暂无可选档案，联网后再试', icon: 'none' });
    return;
  }
  pkList.value = list;
  pkKeyword.value = '';
  pkOn.value = true;
}

function chooseProfile(p: any) {
  applyProfile(p);
  pkOn.value = false;
  uni.showToast({ title: `已选「${profileName.value}」`, icon: 'none' });
}

/* ============ 标签编辑（2026-10-08 晚：让「点按任意标签即可修改」真的能点） ============
 * 提示行早就写着可修改，但标签一直是纯 <text>（无 @tap）→ 用户点了没反应。
 * 这里给每个标签加 tap：开 paw-dialog 手账风弹窗改文字，另支持新增 / 删除。
 * 标签只是 AI 建议位（Record 无 tags 字段），改动不影响入库内容 —— 与「未确认不会入库」一致。 */
const tagEditOn = ref(false);
const tagIndex = ref(-1); // -1 = 新增
const tagDraft = ref('');

function onTagTap(i: number) {
  tagIndex.value = i;
  tagDraft.value = aiTags.value[i]?.text || '';
  tagEditOn.value = true;
}

function onTagAdd() {
  tagIndex.value = -1;
  tagDraft.value = '';
  tagEditOn.value = true;
}

function onTagSave() {
  const t = tagDraft.value.trim();
  if (!t) {
    uni.showToast({ title: '先写点内容再保存', icon: 'none' });
    return;
  }
  if (tagIndex.value < 0) {
    aiTags.value = [...aiTags.value, { text: t, cls: TAG_NEG.test(t) ? 't5' : 't2' }];
  } else {
    aiTags.value = aiTags.value.map((g, i) =>
      i === tagIndex.value ? { text: t, cls: TAG_NEG.test(t) ? 't5' : g.cls } : g,
    );
  }
  tagEditOn.value = false;
}

function onTagDelete() {
  const i = tagIndex.value;
  if (i >= 0) aiTags.value = aiTags.value.filter((_, k) => k !== i);
  tagEditOn.value = false;
}

/** 照片块点击：真实照片块 → 全屏预览；「+ 照片」→ 选图（最多 MAX_PHOTO 张）→ 后台上传拿
    photoId（存草稿/保存时关联）→ 存 pending_photo → 跳 AI 解析页 */
function onPhotoTap(i: number) {
  const p: any = photos.value[i];
  if (p && p.bg) {
    uni.previewImage({ urls: photos.value.filter((x: any) => x.bg).map((x: any) => x.bg) });
    return;
  }
  if (p && p.plus) {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: (res) => {
        const path = res.tempFilePaths && res.tempFilePaths[0];
        if (!path) return;
        uni.setStorageSync('pending_photo', path);
        // 后台上传（服务端剥 EXIF/GPS 落盘）；离线失败只丢照片关联，不阻塞记录流程。
        // 以**本地路径为键**记下 photoId —— 删除按钮按路径同步摘除关联（2026-10-11）
        uploadImage(path)
          .then((up) => { photoIdMap.value = { ...photoIdMap.value, [path]: up.id }; })
          .catch(() => {});
        uni.navigateTo({
          url: '/pages/record/ai-parse?from=' + encodeURIComponent('/pages/record/create'),
        });
      },
    });
  }
}

/** 照片右上角 ×：只从**这次记录**里摘掉这张（不删服务端文件，也不动已生成的 AI 标签） */
function onPhotoDel(i: number) {
  const p: any = photos.value[i];
  if (!p || !p.bg) return;
  const reals = photos.value.filter((x: any) => x.bg && x.bg !== p.bg);
  photos.value = reals.length
    ? [...reals.slice(-MAX_PHOTO), { cls: 'ph--plus', plus: true }]
    : [{ cls: 'ph--plus', plus: true }];
  // 同步摘掉它的 photoId 关联（photoIds 按当前照片区推导，本就不再进 payload；这里顺手清理映射）
  if (photoIdMap.value[p.bg]) {
    const next = { ...photoIdMap.value };
    delete next[p.bg];
    photoIdMap.value = next;
  }
}

/** 导航「AI 辅助」胶囊 → AI 解析页（有 pending_photo 就带上） */
function goAi() {
  uni.navigateTo({
    url: '/pages/record/ai-parse?from=' + encodeURIComponent('/pages/record/create'),
  });
}

/** 确认无误，保存记录：在线直存；失败 → 入离线草稿队列联网补传 */
async function onSave() {
  const payload = buildPayload(true);
  if (!payload) return;
  try {
    await api.post('/records', payload);
    uni.showToast({ title: '已存入 🐾', icon: 'none' });
  } catch {
    enqueueDraft({
      id: genDraftId(),
      ...payload,
      label: `${typeLabelText.value} · ${profileName.value}`,
    });
    uni.showToast({ title: '当前离线，已存草稿联网后补传', icon: 'none' });
  }
}
</script>

<style scoped>
/* ==========================================================================
   页面基座
   ========================================================================== */
.s9 {
  /* 与 S8 一致：规避 H5 默认导航引发的 100vh 漂移 */
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  background: #f0ebdf;
  box-sizing: border-box;
  padding-bottom: 0;
}

/* ==========================================================================
   自绘导航
   已抽成共享组件 components/paw-navbar（返回 30rpx / 箭头 3.04×6.42pt /
   导航行 padding-top 133.3rpx 的真值都在那里）。本页只保留 S9 独有的 AI 胶囊。
   ========================================================================== */
.nav-ai {
  display: flex;
  align-items: center;
  justify-content: center;
  /* p11 实测胶囊实体 48.69×19.61pt */
  width: 97.4rpx;
  height: 39.2rpx;
  border-radius: 19.6rpx;
  background: #8fa08b;
  /* 胶囊右沿 298.92pt → 「存草稿」文字盒左沿 ≈310.4pt，间隔 22.96rpx（原写 25.7 偏大） */
  margin-right: 22.96rpx;
  flex-shrink: 0;
}
.nav-ai-txt {
  font-size: 20rpx;
  color: #faf7f1;
  line-height: 1;
  font-weight: 500;
  white-space: nowrap;
}

/* ==========================================================================
   sec「这次做了什么?」（实测：墨迹 y 123.76–135.93 = 12.17pt → 26rpx）
   ========================================================================== */
.sec {
  margin-top: 25.4rpx;
  padding: 0;
}
.sec-t {
  /* ⚠️ 必须 block：`.sec` 自身 font-size 28rpx + line-height normal(≈40.6rpx)，
     若 .sec-t 是 inline，行盒高取 strut(40.6rpx) 与子行高(26rpx) 的较大值 →
     标题墨迹被压到行盒中部（下移 ~3.65pt），且 `.sec` 盒子虚高 14.6rpx 把下方整链推下去。
     改成 block 后容器内无 inline 内容 → 不生成 strut，盒高 = 26rpx。 */
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 1;
}

/* ==========================================================================
   4 类型胶囊（投喂选中）
   实测：y 145.74–179.55 = 33.81pt 高 → 67.6rpx；宽 75.76pt = 151.5rpx；间距 8.46pt = 16.9rpx
   ========================================================================== */
.types {
  display: flex;
  margin-top: 19.4rpx;
  gap: 16.9rpx;
}
/* 胶囊宽度：设计稿 4 枚时固定 151.5rpx；2026-10-10 加第 5 枚「季节」后改为
   **等分填充**（flex:1，5 枚各约 123.7rpx），高度 67rpx / 间距 16.9rpx / 描边 / 圆角
   全部沿设计稿不变 —— 登记为「用户指定刻意偏离」，详见核对文档第廿七章。
   ⚠️ min-width:0 必须留：否则 flex 项按内容取最小宽度，「外貌」等会撑破行。 */
.tchip {
  flex: 1 1 0;
  min-width: 0;
  height: 67rpx;
  border-radius: 33.5rpx;
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.tchip--on {
  background: #56674e;
  border-color: #56674e;
}
.tchip-t {
  font-size: 26rpx;
  color: #3c4036;
  line-height: 1;
}
.tchip--on .tchip-t {
  color: #faf7f1;
  font-weight: 500;
}

/* ==========================================================================
   档案卡（实测：高 49.7pt = 99.4rpx；1pt #E2DCCA 描边）
   ========================================================================== */
.pf {
  position: relative;
  display: flex;
  align-items: center;
  height: 98.7rpx;
  margin-top: 16.9rpx;
  padding: 0 22rpx;
  box-sizing: border-box;
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
  border-radius: 32rpx;
}
/* 头像：墨绿 #8FA08B 底 + 白字「花」 */
.pf-av {
  width: 71.7rpx;
  height: 71.7rpx;
  border-radius: 50%;
  background: #8fa08b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pf-av-t {
  font-size: 26rpx;
  color: #faf7f1;
  line-height: 1;
  font-weight: 500;
}
/* 名字：实测步进 14.88pt → 30rpx；不取 flex:1（让 pill 紧跟其后） */
.pf-name {
  margin-left: 22.3rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 1;
}
/* 档案#12 徽章：实测 63.57×24.01pt = 127.1×48rpx
   ★ 修正：浅米 #EFE8D8 底 + 灰字 #8B8779（不是深绿！） */
.pf-id {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48rpx;
  padding: 0 21rpx;
  border-radius: 24rpx;
  background: #efe8d8;
  margin-left: 23rpx;
  margin-right: auto;
}
.pf-id-t {
  font-size: 28rpx;
  color: #8b8779;
  line-height: 1;
  font-weight: 400;
}
/* 右箭头 chev（朝右） */
.pf-chev {
  position: relative;
  width: 8rpx;
  height: 14rpx;
  flex-shrink: 0;
}
.pf-chev-a,
.pf-chev-b {
  position: absolute;
  right: 2rpx;
  width: 2rpx;
  height: 8rpx;
  background: #8b8779;
  border-radius: 1rpx;
}
.pf-chev-a {
  top: 0;
  transform-origin: 50% 100%;
  transform: rotate(-45deg);
}
.pf-chev-b {
  top: 8rpx;
  transform-origin: 50% 0%;
  transform: rotate(45deg);
}

/* ==========================================================================
   拍照行（文字；AI 已识别胶囊在 photos 行内）
   ========================================================================== */
.cam {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 0;
}
/* 相机图标：CSS 手绘（机身+镜头+闪光灯） */
.cam-ico {
  position: relative;
  width: 30rpx;
  height: 22rpx;
  margin-right: 4rpx;
  flex-shrink: 0;
}
.cam-body {
  position: absolute;
  left: 0;
  top: 3rpx;
  width: 30rpx;
  height: 19rpx;
  background: #8fa08b;
  border-radius: 3rpx;
}
.cam-lens {
  position: absolute;
  left: 11rpx;
  top: 8rpx;
  width: 8rpx;
  height: 8rpx;
  background: #f0ebdf;
  border-radius: 50%;
  border: 1rpx solid #faf7f1;
  box-sizing: border-box;
}
.cam-flash {
  position: absolute;
  right: 3rpx;
  top: 6rpx;
  width: 3rpx;
  height: 3rpx;
  background: #faf7f1;
  border-radius: 50%;
}
.cam-t {
  font-size: 26rpx;
  color: #3c4036;
  line-height: 1;
}
.cam-dot {
  font-size: 26rpx;
  color: #8b8779;
  line-height: 1;
  margin: 0 8rpx;
}
.cam-ai {
  font-size: 24rpx;
  color: #3c4036;
  font-weight: 600;
  line-height: 1;
}
.cam-auto {
  font-size: 24rpx;
  color: #3c4036;
  line-height: 1;
  margin-left: 4rpx;
}
/* AI 已识别胶囊：实测 79.80×21.98pt = 159.6×44rpx，墨绿底白字 + ✓ 勾
   ✓ 用 CSS 手绘（两条线段叠加：短横 + 长横） */
.cam-ok {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44rpx;
  padding: 0 22rpx;
  border-radius: 22rpx;
  background: #8fa08b;
  flex-shrink: 0;
  align-self: flex-start;
}
.cam-ok-v {
  position: relative;
  width: 14rpx;
  height: 10rpx;
  flex-shrink: 0;
  margin-right: 6rpx;
}
.cam-ok-v::before,
.cam-ok-v::after {
  content: '';
  position: absolute;
  background: #faf7f1;
  border-radius: 1rpx;
}
.cam-ok-v::before {
  /* 短横：左下到中下 */
  left: 0;
  bottom: 1rpx;
  width: 5rpx;
  height: 2rpx;
  transform: rotate(45deg);
  transform-origin: 0% 100%;
}
.cam-ok-v::after {
  /* 长横：中下到右上 */
  right: 0;
  bottom: 1rpx;
  width: 11rpx;
  height: 2rpx;
  transform: rotate(-45deg);
  transform-origin: 100% 100%;
}
.cam-ok-t {
  font-size: 22rpx;
  color: #faf7f1;
  line-height: 1;
  font-weight: 500;
}

/* ==========================================================================
   3 照片块（实测：55.79×56.13pt = 111.6×112.3rpx；间距 8.43pt = 16.9rpx）
   ★ 修正：第 3 块是「+ 照片」用纸白 #FAF7F1 底 + 描边（不同于前两块灰 #E6E7EB）
   ========================================================================== */
.photos {
  display: flex;
  margin-top: 19rpx;
  gap: 16.9rpx;
}
.ph {
  width: 112rpx;
  height: 111.5rpx;
  /* 入口块带 2rpx 描边，须按 border-box 计宽，否则比真实照片块大 1.3pt（2026-10-08 晚四修正） */
  box-sizing: border-box;
  border-radius: 16rpx;
  background: #e6e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
/* 第 3 块特殊态：纸白底 + 描边 + 黑十字 + 「照片」小字 */
.ph--plus {
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
}
.ph-t {
  font-size: 20rpx;
  color: #8b8779;
  line-height: 1;
}
.ph-plus {
  position: relative;
  width: 30rpx;
  height: 30rpx;
  margin-bottom: 18rpx;
}
.ph-pa {
  position: absolute;
  left: 50%;
  top: 0;
  width: 2rpx;
  height: 30rpx;
  background: #8b8779;
  transform: translateX(-50%);
}
.ph-pb {
  position: absolute;
  left: 0;
  top: 50%;
  width: 30rpx;
  height: 2rpx;
  background: #8b8779;
  transform: translateY(-50%);
}
/* 第 3 块的「照片」文字（在 + 号下方） */
.ph--plus .ph-t {
  position: absolute;
  bottom: 14rpx;
  left: 0;
  right: 0;
  text-align: center;
}

/* 照片右上角删除按钮（2026-10-11 用户诉求「图片右上角有叉叉」）
   只出现在真实照片块上（「+ 照片」入口不显示）；圆形角标贴右上角内收 6rpx，
   与项目里胶囊/圆点的手账语言一致；整个 40rpx 圆都是点击热区（20×20pt） */
.ph-x {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(60, 64, 54, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 叉号用两笔 45° 短横自绘（与「+」同款做法，避免依赖字体里的 × 字形） */
.ph-x-a,
.ph-x-b {
  position: absolute;
  width: 18rpx;
  height: 2.4rpx;
  border-radius: 2rpx;
  background: #faf7f1;
}
.ph-x-a {
  transform: rotate(45deg);
}
.ph-x-b {
  transform: rotate(-45deg);
}

/* ==========================================================================
   AI 卡（实测：1pt #E2DCCA 描边）
   ========================================================================== */
.ai {
  margin-top: 16.3rpx;
  /* 实测对账：卡顶→头部行墨迹 设计 9.13pt / 实现 12.51pt → padding-top -6.76rpx；
     卡底→提示行墨迹 设计 10.15pt / 实现 8.79pt → padding-bottom +2.72rpx */
  padding: 17.9rpx 22rpx 19.7rpx 22rpx;
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
  border-radius: 32rpx;
  box-sizing: border-box;
}

/* 头部：机器人图标 + AI 字 + 识别结果 + 右侧预填胶囊 */
.ai-h {
  display: flex;
  align-items: center;
}
/* ★ 修正：AI 图标 = 机器人（不是 sparkle）
   设计稿实测：深色描边 #213841 + 灰色机身 #D5DADE，22rpx 见方盒内 18×14 头 + 5rpx 天线 */
.ai-ico {
  position: relative;
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
}
.ai-bot {
  position: absolute;
  left: 2rpx;
  top: 5rpx;
  width: 18rpx;
  height: 14rpx;
  border: 1.5rpx solid #213841;
  border-radius: 4rpx;
  background: #d5dade;
}
.ai-bot::before,
.ai-bot::after {
  content: '';
  position: absolute;
  top: 4rpx;
  width: 3rpx;
  height: 3rpx;
  background: #213841;
  border-radius: 50%;
}
.ai-bot::before { left: 4rpx; }
.ai-bot::after  { right: 4rpx; }
.ai-bot-ant {
  position: absolute;
  left: 9.5rpx;
  top: 1rpx;
  width: 3rpx;
  height: 5rpx;
  background: #213841;
}
.ai-ai {
  font-size: 24rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 1;
  margin-left: 6rpx;
}
.ai-t {
  font-size: 26rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 1;
  margin-left: 4rpx;
}
/* 预填·可修改胶囊：实测 82.17×20.29pt = 164.3×40.6rpx
   胶带 #DDCC99 底 + 深橄榄字 #7D724C */
.ai-pre {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40.6rpx;
  padding: 0 22rpx;
  border-radius: 6rpx;
  background: #ddcc99;
  margin-left: auto;
}
.ai-pre-t {
  font-size: 22rpx;
  color: #7d724c;
  line-height: 1;
  font-weight: 500;
}

/* 6 个 tag（实测：高 24pt = 48rpx；间距 6.10pt 行间 = 12.2rpx，列间距同 16.9rpx）
   ★ 修正：5 个浅绿 #E9F0E6（绿字 #56674E），仅「体型偏瘦」= 警示粉 #F2E1D6（橙字 #BF8767） */
.tags {
  display: flex;
  flex-wrap: wrap;
  /* 实测：头部行底 → 第 1 行 tag 顶，设计 6.09pt / 实现 9.81pt → -7.44rpx */
  gap: 12.2rpx 16.9rpx;
  margin-top: 10.9rpx;
}
.tag {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48rpx;
  padding: 0 20rpx;
  border-radius: 24rpx;
  background: #e9f0e6;
  flex-shrink: 0;
}
.tag--t5 {
  background: #f2e1d6;
}
.tag-t {
  font-size: 24rpx;
  color: #56674e;
  line-height: 1;
}
.tag--t5 .tag-t {
  color: #bf8767;
}
/* 可点态反馈（2026-10-08 晚：标签改为可点改） */
.tag--hover {
  opacity: 0.66;
}
/* 「＋ 添加标签」：与普通 tag 同高、虚线描边、无底色 —— 仅真实档案态出现（演示态不渲染） */
.tag--add {
  width: 48rpx;
  padding: 0;
  background: transparent;
  border: 2rpx dashed #cfc7b4;
  box-sizing: border-box;
  position: relative;
}
.tag-add-a,
.tag-add-b {
  position: absolute;
  left: 50%;
  top: 50%;
  background: #8fa08b;
  border-radius: 2rpx;
}
.tag-add-a {
  width: 22rpx;
  height: 3rpx;
  margin: -1.5rpx 0 0 -11rpx;
}
.tag-add-b {
  width: 3rpx;
  height: 22rpx;
  margin: -11rpx 0 0 -1.5rpx;
}

/* 铅笔提示行：实测 y 432.15–441.28，墨迹高 9.13pt → 22rpx
   ★ 修正：加 ✏ 铅笔图标（CSS 手绘）+ 新文案 */
.ai-note {
  display: flex;
  align-items: center;
  margin-top: 17.1rpx;
}
.ai-pencil {
  position: relative;
  width: 18rpx;
  height: 18rpx;
  flex-shrink: 0;
  margin-right: 8rpx;
}
/* 笔身：倾斜的细长条 */
.ai-pencil::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4rpx;
  width: 14rpx;
  height: 4rpx;
  background: #8b8779;
  border-radius: 1rpx;
  transform: rotate(-45deg);
  transform-origin: 0% 50%;
}
/* 笔尖（深色三角） */
.ai-pencil::after {
  content: '';
  position: absolute;
  left: 0;
  top: 4rpx;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 3rpx 4rpx 3rpx 0;
  border-color: transparent #3c4036 transparent transparent;
  transform: rotate(-45deg) translate(-2rpx, -2rpx);
  transform-origin: 0% 50%;
}
.ai-note-t {
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
  font-weight: 400;
}

/* ==========================================================================
   大卡（实测：1pt #E2DCCA 描边）
   ========================================================================== */
.big {
  margin-top: 15.6rpx;
  padding: 21.6rpx 26rpx 17rpx 26rpx;
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
  border-radius: 32rpx;
  box-sizing: border-box;
}

/* 时间行 / 位置行：实测 39.2rpx 高胶囊行（行高 40rpx）
   ★ 2026-10-08 晚：位置行改 `min-height`（单行时 flex 居中结果仍是 40rpx，与 height:40rpx 等价，
     演示态基线不变），并加 `.l-main/.l-meta` 两层包裹 —— 点位名过长时整组折行不压坏行高 */
.t-row {
  display: flex;
  align-items: center;
  height: 40rpx;
}
.l-row {
  display: flex;
  align-items: center;
  min-height: 40rpx;
}
/* ★ 修正：标签 = 灰 #8B8779，值 = 墨 #3C4036；★ 标签永不压缩（曾被长值挤成竖排） */
.t-lbl,
.l-lbl {
  font-size: 26rpx;
  font-weight: 600;
  color: #8b8779;
  line-height: 1;
  flex-shrink: 0;
}
.t-val,
.l-val {
  margin-left: 14rpx;
  font-size: 26rpx;
  color: #3c4036;
  line-height: 1;
}
/* 位置行右半区（值 + 「· 自动定位 [仅小区级]」）：可整体折行 */
.l-main {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.l-meta {
  display: flex;
  align-items: center;
}
/* 长点位名（>9 字）：名字一行、元信息一组折到第二行；label 与首行对齐 */
.l-row--wrap {
  align-items: flex-start;
}
.l-row--wrap .l-main {
  flex-wrap: wrap;
}
.l-row--wrap .l-lbl {
  line-height: 36rpx;
}
.l-row--wrap .l-val {
  line-height: 36rpx;
  word-break: break-all;
}
.l-row--wrap .l-meta {
  margin-top: 2rpx;
}
/* 折行后「·」会孤零零落在第二行行首（它在一行态只是分隔符）→ 折行态隐去 */
.l-row--wrap .l-dot {
  display: none;
}
.t-dot,
.l-dot {
  margin: 0 8rpx;
  font-size: 26rpx;
  color: #8b8779;
  line-height: 1;
}
.t-rec,
.l-bld {
  font-size: 26rpx;
  color: #3c4036;
  line-height: 1;
}

/* ★ 修正：胶囊内联在文本后（margin-left 31rpx），不是右对齐！
   自动 = 浅绿 #E3E8DB 底墨色字；仅小区级 = 警示粉 #F1E2D9 底 + 橙字 #C68B6F */
.t-cap {
  margin-left: 31rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 39.2rpx;
  padding: 0 20rpx;
  border-radius: 19.6rpx;
  background: #e3e8db;
  line-height: 1;
}
.l-cap {
  margin-left: 31rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 39.2rpx;
  padding: 0 20rpx;
  border-radius: 19.6rpx;
  background: #f1e2d9;
  line-height: 1;
}
.t-cap-t {
  font-size: 20rpx;
  color: #3c4036;
  line-height: 1;
}
.l-cap-t {
  font-size: 20rpx;
  color: #c68b6f;
  line-height: 1;
}
/* 「微调」入口（2026-10-10）：只在真实定位态渲染；深绿细字，与 S3 建档页同款
   （.loc-edit 24rpx #56674E）。flush 右对齐：.l-main flex:1 已把剩余空间吃满，
   这里只需留出与胶囊的最小间距，且永不压缩。 */
.l-edit {
  flex-shrink: 0;
  margin-left: 16rpx;
  font-size: 24rpx;
  color: #56674e;
  line-height: 1;
}

/* 位置行 margin-top：实测 时间行底→位置行顶 设计 10.14pt / 实现 10.82pt */
.l-row {
  margin-top: 19.6rpx;
}

/* 分隔线：实测 1pt #E2DCCA 居中。位置行底→分隔线 设计 8.12pt / 实现 7.44pt */
.sep {
  margin-top: 15.4rpx;
  height: 2rpx;
  background: #e2dcca;
}

/* 喂了什么 / 喂了多少 / 草稿 标题
   ⚠️ display:block 必需：三个都是 `<text>`，若为 inline 会被 `.big` 的 strut（28rpx×normal
   ≈40.6rpx）撑高行盒 → 墨迹下移、盒子虚高。改 block 后盒高紧贴 26rpx。
   实测（设计/实现 墨迹间距，pt）：分隔线→喂了什么 8.12/9.81；
   喂了多少 8.11/9.47；AI 草稿 8.11/9.81 → 各减去对应差额 */
.f1-lbl,
.f2-lbl,
.d-lbl {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 1;
}
.f1-lbl { margin-top: 14.6rpx; }
.f2-lbl { margin-top: 14.3rpx; }
.d-lbl   { margin-top: 13.6rpx; }

/* 喂食 chips（实测：64.25×30.09pt = 128.5×60.2rpx；间距 8.10pt = 16.2rpx）
   标签→chips 行 设计 8.12/7.78pt、实现 6.77/6.77pt → 各加回差额 */
.f1-row,
.f2-row {
  display: flex;
  gap: 16.2rpx;
}
.f1-row { margin-top: 16.7rpx; }
.f2-row { margin-top: 16rpx; }
/* 类型分表单（2026-10-08 晚三）：外貌 5 个快捷词 / 相遇的长点位名会超一行 → 允许折行；
   相遇点位胶囊改为自适应宽（常驻点名长短不一，如阿黑 17 字） */
.f1-row--wrap {
  flex-wrap: wrap;
  row-gap: 16rpx;
}
/* ⚠️ 必须带 .f1-row 前缀：`.fchip` 的固定 width 定义在本规则之后，
   同权重下会被它覆盖（首次出图时胶囊里文字被挤成两行） */
.f1-row .fchip--auto {
  width: auto;
  min-width: 128.5rpx;
  padding: 0 26rpx;
}
/* 类型分表单的轻提示行（比 f2-lbl 弱一档，避免在同一张卡里出现两个「标题」） */
.f-hint {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #a8a396;
  line-height: 1.4;
}
.fchip {
  width: 128.5rpx;
  height: 60rpx;
  border-radius: 30rpx;
  background: #faf7f1;
  border: 2rpx solid #e2dcca;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex-shrink: 0;
}
.fchip--on {
  background: #56674e;
  border-color: #56674e;
}
.fchip-t {
  font-size: 24rpx;
  color: #8b8779;
  line-height: 1;
}
.fchip--on .fchip-t {
  color: #faf7f1;
  font-weight: 500;
}

/* AI 草稿正文块：实测 x 35.17–339.16（w 304pt = 608rpx），y 675.5–723.5（h 48pt = 96rpx）
   ★ 修正：在卡内容区内（不取负 margin），padding 16/22，bg #F6F2E7 */
.d-body {
  margin-top: 16rpx;
  padding: 16rpx 22rpx;
  background: #f6f2e7;
  border-radius: 16rpx;
  box-sizing: border-box;
}
.d-body-t {
  /* ⚠️ 必须 block：`.d-body` 自身 font-size 28rpx + line-height normal(≈40.6rpx)，
     若保持 inline，行盒被 strut 撑到 40.6rpx（实测 41.94rpx），两行正文块高 55.79pt
     而设计稿是 47.68pt（= padding 16rpx×2 + 2 行×32rpx）。改 block 后行距才真取 32rpx。 */
  display: block;
  font-size: 24rpx;
  color: #56674e;
  line-height: 32rpx;
  font-weight: 400;
}
/* 可编辑草稿（2026-10-08 晚）：字号/行高/配色与上面 <text> 完全一致，
   只把 textarea 的原生边框、内距、背景清零，保证「选中档案后」的观感与设计稿同款。
   min-height 两行：空草稿时正文块不塌陷。 */
.d-body-ta {
  display: block;
  width: 100%;
  min-height: 64rpx;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  font-size: 24rpx;
  color: #56674e;
  line-height: 32rpx;
}

/* ==========================================================================
   档案选择弹层（2026-10-08 晚新增）
   形制对齐 S10-2 申请弹层：米底 #F0EBDF + 2rpx #D7CEC2 描边 + 上圆角 44rpx；
   外层 `.paw-sheet` 已在 App.vue 手机壳清单里登记（桌面浏览器不会飞出手机框）。
   ========================================================================== */
.pk {
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.pk-handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: #d8cec2;
  margin: 0 auto;
}
.pk-title {
  display: block;
  margin-top: 25rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #3c4036;
  line-height: 1;
}
.pk-sub {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
}
/* 搜索框：纸白底 + 无描边 + 手绘放大镜（项目约定：图标一律手绘，不用 emoji） */
.pk-search {
  position: relative;
  display: flex;
  align-items: center;
  height: 76rpx;
  margin-top: 22rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background: #faf7f1;
  border-radius: 24rpx;
}
.pk-ico {
  position: relative;
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
}
/* 镜圈 */
.pk-ico-r {
  position: absolute;
  left: 0;
  top: 0;
  width: 20rpx;
  height: 20rpx;
  box-sizing: border-box;
  border: 3rpx solid #a69e8c;
  border-radius: 50%;
}
/* 镜柄 */
.pk-ico-h {
  position: absolute;
  right: 5rpx;
  bottom: 3rpx;
  width: 10rpx;
  height: 3rpx;
  border-radius: 2rpx;
  background: #a69e8c;
  transform: rotate(45deg);
}
.pk-input {
  flex: 1;
  margin-left: 16rpx;
  min-width: 0;
  font-size: 26rpx;
  color: #3c4036;
  line-height: 1;
}
/* 清除键：X 由两个细方块旋转叠出 */
.pk-clear {
  position: relative;
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  margin-left: 12rpx;
}
.pk-x-a,
.pk-x-b {
  position: absolute;
  left: 4rpx;
  top: 15rpx;
  width: 24rpx;
  height: 3rpx;
  border-radius: 2rpx;
  background: #b4b0a2;
}
.pk-x-a { transform: rotate(45deg); }
.pk-x-b { transform: rotate(-45deg); }

/* 列表：滚动区，最多约 6 行高 */
.pk-list {
  margin-top: 14rpx;
  max-height: 560rpx;
}
.pk-item {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding: 18rpx 20rpx;
  background: #faf7f1;
  border-radius: 28rpx;
}
.pk-item + .pk-item {
  margin-top: 12rpx;
}
.pk-item--hover {
  background: #f5efe2;
}
/* 已选中项：苔绿极浅底 + 右侧对勾 */
.pk-item--on {
  background: #eef2ec;
}
.pk-av {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pk-av--deep { background: #56674e; }
.pk-av--sage { background: #8fa08b; }
.pk-av--clay { background: #c68b6f; }
.pk-av-t {
  font-size: 28rpx;
  color: #faf7f1;
  line-height: 1;
}
.pk-info {
  margin-left: 20rpx;
  flex: 1;
  min-width: 0;
}
.pk-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 1;
}
.pk-meta {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8b8779;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 对勾：一段折线（左短右长） */
.pk-check {
  position: relative;
  width: 34rpx;
  height: 34rpx;
  flex-shrink: 0;
  margin-left: 12rpx;
}
.pk-check-a {
  position: absolute;
  left: 7rpx;
  top: 14rpx;
  width: 24rpx;
  height: 4rpx;
  background: #8fa08b;
  border-radius: 2rpx;
  transform: rotate(-45deg);
}
.pk-check-a::after {
  content: '';
  position: absolute;
  left: 6rpx;
  top: -8rpx;
  width: 14rpx;
  height: 4rpx;
  background: #8fa08b;
  border-radius: 2rpx;
  transform-origin: 0 50%;
  transform: rotate(90deg);
}
.pk-empty {
  display: block;
  padding: 46rpx 0 40rpx;
  text-align: center;
  font-size: 24rpx;
  color: #a69e8c;
  line-height: 1;
}
.pk-foot {
  margin-top: 20rpx;
  padding: 18rpx 22rpx;
  background: #f5f1e6;
  border-radius: 20rpx;
}
.pk-foot-t {
  font-size: 20rpx;
  color: #a69e8c;
  line-height: 1;
}

/* ==========================================================================
   主按钮（实测：100rpx 高，绿底白字，CTA 字号 32rpx）
   ========================================================================== */
.cta {
  height: 100rpx;
  margin-top: 15.6rpx;
  margin-bottom: 40rpx;
  border-radius: 50rpx;
  background: #8fa08b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cta:active {
  opacity: 0.86;
}
.cta-t {
  position: relative;
  top: -2rpx;
  font-size: 32rpx;
  font-weight: 500;
  color: #faf7f1;
  line-height: 1;
  letter-spacing: 0;
}

/* ==========================================================================
   档案弹层的遮罩与底部面板
   与 S10-2 申请弹层同款（页面级 scoped 定义；App.vue 只负责桌面手机壳的定位收窄）
   ========================================================================== */
.paw-scrim {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 10;
  background: rgba(60, 64, 54, 0.245);
}
.paw-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 11;
  box-sizing: border-box;
  padding: 29rpx 34rpx 0;
  background: #f0ebdf;
  border: 2rpx solid #d7cec2;
  border-radius: 44rpx 44rpx 0 0;
}

/* ==========================================================================
   点位微调弹层（2026-10-10，与 S3 建档页同款形制 —— 底部抽屉 + 地图 + 自由填名）
   只在下拉打开时渲染（v-if），无 DOM 常驻 → 兜底帧与像素基线不受影响。
   ⚠️ `.sp-mask` 是铺满视口的 fixed 浮层 → 已在 App.vue 的桌面手机壳清单里
   （2026-10-09 建档页加过，同名类复用，无需重复登记）。
   ========================================================================== */
.sp-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 110;
  background: rgba(60, 64, 54, 0.56);
  display: flex;
  align-items: flex-end;
}
.spsheet {
  width: 100%;
  box-sizing: border-box;
  background: #faf7f1;
  border-radius: 38rpx 38rpx 0 0;
  padding: 32rpx 40rpx;
  padding-bottom: calc(40rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}
.sp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sp-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #3c4036;
  line-height: 1.2;
}
.sp-close {
  position: relative;
  width: 44rpx;
  height: 44rpx;
}
.sp-close-x::before,
.sp-close-x::after {
  content: '';
  position: absolute;
  left: 10rpx;
  top: 21rpx;
  width: 24rpx;
  height: 2rpx;
  background: #8b8a7c;
}
.sp-close-x::before {
  transform: rotate(45deg);
}
.sp-close-x::after {
  transform: rotate(-45deg);
}
/* 地图（真实底图；MAP_ENABLED=false 时退化成提示块，不会白屏） */
.sp-mapwrap {
  margin-top: 22rpx;
  border-radius: 22rpx;
  overflow: hidden;
  background: #ece7db;
}
.sp-map {
  width: 100%;
  height: 280rpx;
  display: block;
}
.sp-map--none {
  display: flex;
  align-items: center;
  justify-content: center;
}
.sp-map-txt {
  font-size: 24rpx;
  color: #8b8a7c;
}
.sp-hint {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #8b8a7c;
  line-height: 1.4;
}
.sp-row {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
}
.sp-use {
  flex-shrink: 0;
  height: 60rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #8fa08b;
  color: #faf7f1;
  font-size: 24rpx;
  display: flex;
  align-items: center;
}
.sp-use--off {
  background: #c6c3b6;
}
.sp-tip {
  margin-left: 16rpx;
  font-size: 22rpx;
  color: #a29e8f;
  line-height: 1.2;
}
.sp-label {
  display: block;
  margin-top: 26rpx;
  font-size: 26rpx;
  color: #56674e;
  line-height: 1.2;
}
/* 输入框：本页没有 S3 的 .input 基座类 → 数量全写在这里（与 .tag-in 同族的手账口径） */
.sp-input {
  margin-top: 16rpx;
  width: 100%;
  height: 88rpx;
  box-sizing: border-box;
  padding: 0 24rpx;
  background: #f6f2e7;
  border-radius: 18rpx;
  font-size: 26rpx;
  color: #3c4036;
}
.sp-btns {
  margin-top: 30rpx;
  display: flex;
}
.sp-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sp-btn--main {
  background: #8fa08b;
  color: #faf7f1;
}
.sp-btn--ghost {
  margin-left: 20rpx;
  background: #ece7db;
  color: #56674e;
}
.sp-btn:active {
  opacity: 0.86;
}

/* ==========================================================================
   标签编辑弹窗（2026-10-08 晚，复用 paw-dialog 的壳 + 默认插槽）
   ========================================================================== */
/* 输入框：手账口径 = 浅米底 + 无描边 + 圆角，与 AI 草稿块 #F6F2E7 同族 */
.tag-in {
  width: 100%;
  height: 76rpx;
  margin-top: 32rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background: #f6f2e7;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #3c4036;
}
/* 删除入口：居中陶土小字（与「确认」按钮同语义色，但弱一档） */
.tag-del {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 72rpx;
  margin-top: 8rpx;
}
.tag-del-t {
  font-size: 24rpx;
  color: #c68b6f;
  line-height: 1;
}
.tag-del--hover {
  opacity: 0.6;
}
</style>

<style>
/* uni-input / uni-textarea 的 placeholder 不在 scoped 作用域（同 S10-2 的 .spdet-ph），
   非 scoped 块下发；d-/pk-/tag-/sp- 前缀限本页。 */
.d-ph,
.pk-ph,
.tag-in-ph,
.sp-ph {
  color: #b4b0a2;
  font-size: 24rpx;
  line-height: 32rpx;
}
.pk-ph {
  font-size: 26rpx;
  line-height: 1;
}
.tag-in-ph {
  font-size: 24rpx;
  line-height: 1;
}
</style>
