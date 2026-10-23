/**
 * host 侧工作状态联动核心（自包含，不 import src/shared —— DSH 单文件加载约束）。
 *
 * 职责：监听 DSH `session/event`，把 6 类会话事件压缩成"当前活动工作状态"，由 index.ts
 * 写进 S 的 sections.workStatus，浏览器/桌面统一轮询 /state 后按 counter 变化渲染。
 * 只做聚合与去重：状态无变化不产生新输出（签名比对防刷屏）；不调用任何模型。
 *
 * 本文件同时承载**按会话聚合 + 展示快照**（WorkStatusStore）：state 与任务详情文案 task 都挂在
 * 会话条目上（issue #59 —— task 原本是全局单值，写过一次就跟着所有后续会话活动一直显示下去）。
 *
 * 档位与 animations.events.workStatus 数组索引严格一致（顺序勿在中间插入）：
 *   0 thinking / 1 working / 2 result / 3 waiting / 4 success / 5 error
 */
/** 工作状态档位（数组索引 = events.workStatus 档位） */
export type HostWorkStatusState = 'thinking' | 'working' | 'result' | 'waiting' | 'success' | 'error';
/** update_goal 工具名：目标工具，action=complete/blocked = 本轮是该目标任务的收尾轮 */
export declare const GOAL_UPDATE_TOOL = "update_goal";
/** 本 turn 的 turn 级标志（goal 续跑轮判定；不参与展示，由 index.ts 维护） */
export interface WorkStatusTurnContext {
    /** 本轮是否为自动目标续跑轮（user/message source.kind==='goal' 时置位，turn/start 清零） */
    goalRound?: boolean;
    /** 本轮是否调用过 update_goal 收尾（'complete' | 'blocked'；undefined/null = 未收尾） */
    closing?: 'complete' | 'blocked' | null;
}
/** 解析 update_goal 的 arguments（原始 JSON 字符串）→ 收尾动作；解析失败/非收尾动作 → null */
export declare function goalUpdateAction(args: string): 'complete' | 'blocked' | null;
/**
 * turn/end reason=completed 的终局判定：
 *   - 非 goal 轮（默认）→ success（原行为：一轮答完即成功）；
 *   - 自动续跑轮中间轮（goalRound && 未收尾）→ result：本轮完成 ≠ 整个任务完成，不庆祝；
 *   - 收尾轮 complete → success（整个目标达成，庆祝）；
 *   - 收尾轮 blocked → error（目标被阻塞结束，诚实地表沮丧而非庆祝）。
 */
export declare function completedState(turn: WorkStatusTurnContext | undefined): HostWorkStatusState;
/** 从会话事件压缩出工作状态；无变化/不关心返回 null。
 *  turn 为当前回合上下文（goal 续跑轮判定），只影响 turn/end completed 的终局语义。 */
export declare function reduceWorkStatus(event: {
    type?: string;
    data?: Record<string, unknown> & {
        reason?: {
            kind?: string;
        };
    };
}, turn?: WorkStatusTurnContext): HostWorkStatusState | null;
/**
 * 任务详情文案长度上限（按**码点**计，超出截断加省略号）：气泡最大宽度只有 0.5×宠物宽
 * （默认 size 462 时约 231px、字号 21px ≈ 一行 11 个汉字），而 todo 原文动辄几十字，不截断会把
 * 气泡撑成好几行、盖住宠物。截断放在 host 这一处，浏览器与桌面两端天然一致（issue #59）。
 */
export declare const TASK_TEXT_MAX = 40;
/**
 * todo/write 的 in_progress/pending 项文本 → 任务详情；null = 无（清单已全部完成）。
 *
 * 取**最后一个** in_progress（最近开始的那一步），而不是第一个：agent 常把新步骤标成 in_progress
 * 却忘了把上一步标 completed，取第一个就会永远停在最早那步——issue #59 场景 1（分阶段任务文案
 * 不随进度变化）的成因。没有进行中的项时回落到第一个 pending（= 下一步要做的）。
 */
export declare function currentTaskFromTodo(event: {
    data?: {
        todos?: Array<{
            status?: string;
            content?: string;
        }>;
    };
}): string | null;
/** 工作状态快照（/work-status 端点响应体）：state 为主状态；task 为 todo 详情（可 null） */
export interface WorkStatusSnapshot {
    state: HostWorkStatusState | null;
    task: string | null;
    ts: number;
}
/** 每会话聚合条目：state（档位）+ seq（该会话最近事件的序号，同档位按它取最近）+ task（任务详情文案） */
export interface SessionWorkEntry {
    state: HostWorkStatusState;
    seq: number;
    task: string | null;
}
/** 展示优先级：waiting > error > working > thinking > result > success
 *  （result 高于 success：任何会话的进行中过渡态都不被别处已完成态压过，防中途庆祝；同档按最近更新优先） */
export declare const WORK_STATUS_PRIORITY: Record<HostWorkStatusState, number>;
/** 展示用条目：所有会话里优先级最高者（同优先级取 seq 更大者）；无会话 → undefined */
export declare function pickDisplayed(entries: Iterable<SessionWorkEntry>): SessionWorkEntry | undefined;
/**
 * 工作状态聚合（纯逻辑，可单测）：按会话维护 state/task，对外只暴露一个展示快照。
 *
 * 为什么 task 必须挂在会话条目上（issue #59 的主因）：它原先是一个**全局单值**，只由 todo/write
 * 写入、没有任何独立于 todo/write 的生命周期，于是 agent 写过一次清单之后，这条文案就跟着此后
 * 所有会话活动一直显示——会话结束、开一段完全无关的新对话都不消失，配置里的 workStatusTexts
 * 档位文案也被永久屏蔽。挂进条目后文案与它的会话**同生共死**：
 *   - 条目被清（回合中断 / 终态过期）→ 文案随之消失；
 *   - 新一轮 turn/start → 由调用方清空（上一轮的详情不该在新一轮继续挂着）；
 *   - 清单里再无 in_progress/pending → 写成 null，回落档位文案。
 * 展示时 state 与 task 取自**同一个** best 会话，因此也不会再出现"A 会话的状态配 B 会话的文案"。
 */
export declare class WorkStatusStore {
    private readonly sessions;
    private readonly snap;
    constructor();
    /** 该会话当前是否有活动条目（决定 todo/write 是否还值得更新它的文案） */
    has(sessionId: string): boolean;
    /** 该会话当前档位（无条目 / 已清 → undefined） */
    stateOf(sessionId: string): HostWorkStatusState | undefined;
    /** 写会话状态（保留该会话已有的 task）；同状态且 seq 不更新 → 无变化返回 false（防刷屏） */
    setState(sessionId: string, state: HostWorkStatusState, seq?: number): boolean;
    /** 写该会话的任务详情（null = 清空）；会话无活动条目 → 不动（它不会被展示） */
    setTask(sessionId: string, task: string | null): boolean;
    /** 清掉某会话（回合结束 / 终态过期）：它的 task 一并消失，不会残留到后续活动里 */
    clear(sessionId: string): boolean;
    /** 展示快照（对象引用稳定，供 /work-status 直接序列化） */
    snapshot(): WorkStatusSnapshot;
    /** 重算展示：state 与 task **任一**变化才更新 ts（轮询侧据此触发，两端都靠它刷新） */
    private refresh;
}
