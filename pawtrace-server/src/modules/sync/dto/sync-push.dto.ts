import { IsArray, IsOptional } from 'class-validator';

/** 离线草稿/变更批量推送（骨架期宽松校验，字段与 profiles/records DTO 一致） */
export class SyncPushDto {
  @IsOptional()
  @IsArray()
  profiles?: any[];

  @IsOptional()
  @IsArray()
  records?: any[];
}
