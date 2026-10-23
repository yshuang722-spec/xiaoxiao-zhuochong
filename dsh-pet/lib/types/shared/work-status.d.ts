/** 工作状态档位（对应 animations.events.workStatus 数组索引，顺序即档位，勿在中间插入新档） */
export declare const WORK_STATUS_STATES: readonly ["thinking", "working", "result", "waiting", "success", "error"];
export type WorkStatusState = (typeof WORK_STATUS_STATES)[number];
/** 档位 → workStatus 数组索引（与 events.workStatus 数组顺序严格一致） */
export declare const WORK_STATUS_INDEX: Record<WorkStatusState, number>;
/** 工作状态快照（= /state 里 sections.workStatus 的 data，与 host 的 WorkStatusSnapshot 同构）。
 *  没有 ts：「变了没有」由叶子的 counter 承担（ts 是改造前的第二信号，已删）。
 *  text 不在此：气泡文案由客户端读配置 events.workStatusTexts，host 不生成。 */
export interface WorkStatusSnapshot {
    state: WorkStatusState | null;
    task: string | null;
}
/** 快照解析：档位不认识 → 归一成 null（空闲）；形状非法 → null（消费端跳过这一拍，不抛） */
export declare function toWorkStatus(raw: unknown): WorkStatusSnapshot | null;
