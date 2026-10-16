import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiRecognizeDto } from './dto/ai-recognize.dto';
import { AiMatchDto } from './dto/ai-match.dto';
import { ok } from '../../common/api';
import { CurrentUid } from '../../common/current-uid.decorator';

/**
 * AI 识别模块 —— F2.2 AI 图像解析 / F2.4 科普小知识卡
 * 对应线框：S6 AI 识别弹窗、S11 AI 图像解析、S12 AI 科普卡
 * 安全红线：AI 密钥只存后端 .env；接口按用户限流；同图结果缓存
 * 阶段2（2026-10-02）：uid 取自 JWT（限流/缓存归属不再信任前端）
 */
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** S11：猫图识别 → 毛色/体型/健康初判 + F2.4 科普卡内容 */
  @Post('recognize')
  async recognize(@CurrentUid() uid: string, @Body() dto: AiRecognizeDto) {
    return ok(await this.ai.recognize({ ...dto, uid }));
  }

  /**
   * S6：建档照片 vs 已有档案 —— 判断这只猫是否已经建过档（F1.1 疑似重复提示）。
   * 命中才返回候选；未命中 / 无候选 / 无 key 一律 matched:null，前端不弹窗。
   */
  @Post('match')
  async match(@CurrentUid() uid: string, @Body() dto: AiMatchDto) {
    return ok(await this.ai.match({ ...dto, uid }));
  }
}
