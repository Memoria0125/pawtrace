// 统一响应结构 —— 与 shared/types.ts 中的 ApiResp<T> 保持一致
export interface ApiResp<T = unknown> {
  code: number; // 0 成功；非 0 失败
  msg: string;
  data: T;
}

export function ok<T>(data: T, msg = 'ok'): ApiResp<T> {
  return { code: 0, msg, data };
}

export function fail(msg: string, code = 1): ApiResp<null> {
  return { code, msg, data: null };
}

// 分页参数
export class PagerDto {
  page = 1;
  pageSize = 20;
}
