/**
 * 档案字段选项（2026-10-09 新增）
 *
 * 起因（用户诉求）：「新建档案的界面那个填写内容少了很多，请跟编辑界面的填写内容一样」。
 * 建档页（pages/profile/create.vue）原先只有 昵称 / 健康初判 / 点位，而编辑页
 * （pages/profile/edit.vue）有 昵称 / 毛色 / 体型 / 特征标记 / 健康状态 / 绝育状态 / 出没点位 ——
 * 于是新建时少填的字段，之后只能靠编辑补。
 *
 * 做法：**两页共用这一份常量**（而不是各抄一遍），字段集合与选项顺序天然一致，
 * 以后加选项也只改一处 —— 「跟编辑界面一样」由代码结构保证，不靠人记。
 * 建档落库口径：POST /profiles 的 CreateProfileDto 本就接受
 * coatColor / bodySize / specialMarks / sterilizationStatus / healthStatus（无需后端改动）。
 */

/** 健康状态（建档、编辑共用同一套；含「已离世」—— 发现已离世的猫也要能建档/更正） */
export type HealthValue = 'HEALTHY' | 'THIN' | 'INJURED' | 'SICK' | 'DECEASED';

/** 绝育状态 */
export type NeuterValue = 'STERILIZED' | 'NOT_STERILIZED' | 'UNKNOWN';

/** 毛色常见值（也可自己手写，如「橘白 / 狸花加白」） */
export const COATS = ['三花', '橘白', '橘猫', '狸花', '玳瑁', '奶牛', '纯黑', '纯白'];

/** 体型 */
export const BODIES = ['偏瘦', '中等', '偏胖'];

/** 健康状态 */
export const HEALTHS: { value: HealthValue; label: string }[] = [
  { value: 'HEALTHY', label: '健康' },
  { value: 'THIN', label: '偏瘦' },
  { value: 'INJURED', label: '受伤' },
  { value: 'SICK', label: '疑似生病' },
  { value: 'DECEASED', label: '已离世' },
];

/** 绝育状态 */
export const NEUTERS: { value: NeuterValue; label: string }[] = [
  { value: 'STERILIZED', label: '已绝育' },
  { value: 'NOT_STERILIZED', label: '未绝育' },
  { value: 'UNKNOWN', label: '绝育未确认' },
];
