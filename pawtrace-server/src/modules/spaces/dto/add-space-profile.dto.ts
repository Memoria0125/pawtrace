import { IsString, Length } from 'class-validator';

/** 组员把猫拉进小组（2026-10-10：所有成员可添加，组长独占移除） */
export class AddSpaceProfileDto {
  /** 要加入小组的档案 id */
  @IsString()
  @Length(1, 64)
  profileId!: string;
}
