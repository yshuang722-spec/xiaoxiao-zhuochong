/**
 * host 侧系统通知帧生成（自包含，不 import src/shared —— DSH 单文件加载约束）。
 *
 * 背景：DSH 0.1.5 删除了浏览器侧 `api.events.mux / events.host` 两条 SSE 事件流
 * （0.1.1 时代的契约，dsh-pet 的 shared/notify.ts 帧映射正是按它写的），改用
 * `ctx.remote.$on('approval/request')` 等回调订阅——事件名与帧形状都变了。
 * 为不依赖 DSH 版本间变化的事件 API，这里改为 host 侧直接监听 DSH 宿主事件，
 * 生成**与 shared/notify.ts 完全同契约**的通知帧（帧形状零改动），写进 S 的
 * sections.notify，浏览器统一轮询 /state 后弹 toast（与其余叶子同族；单槽，后到覆盖先到）。
 *
 * 事件源（全部来自 `session/event` 宿主事件 + `agent/error` 宿主事件）：
 *   - turn/end（completed → 对话完成 / error → 生成失败 / max-tokens → 输出截断；
 *     aborted 等不弹，与 shared 的过滤语义一致）
 *   - approval/asked（权限申请：toolName / reason）
 *   - tool/call（ask_user_question 工具：解析 arguments 里的 questions → 用户选择）
 *   - agent/error（无回合位置的生成失败，0.1.5 新增；旧版无此事件 = 少一条通知，不报错）
 *
 * 会话门（issue #82）：`session/event` 的四类事件先过 shouldNotifySession——
 * 子代理 / 委派会话（origin=subagent、delegationDepth>0）不发，否则每路子代理跑完都弹一条。
 * 注意 `agent/error` **过不了这道门**：它的载荷只有 { turn, step, error }，不带任何会话标识，
 * 宿主的 throwError 也没有传会话进来（dsh-agent-loop）。子代理的生成失败若走这条路径仍会弹，
 * 要根治得让宿主把会话带进载荷。
 */
/** 通知帧（与 shared/notify.ts 的 NotifyFrame 同形状；host 侧自包含定义，避免跨端 import） */
export interface HostNotifyFrame {
    type: string;
    [key: string]: unknown;
}
/**
 * 这条会话的事件该不该变成通知。
 *
 * 子代理（`origin === 'subagent'`）与更深层委派（`delegationDepth > 0`）一律不发：
 * 你等的是父对话，不是某一路子代理跑完。实测 3 个子代理会连弹 3 条「对话完成」，
 * 而宿主的 298 条会话里 198 条是子代理——通知直接变刷屏（issue #82）。
 *
 * **判据必须是 `origin`，绝不能用 `parentSession`。** 宿主 `parentSession` 的语义是
 * "fork 自哪条会话"（SessionHeader 注释原文：*the session this one was forked from*），
 * 普通 fork 也带它——本机实测正在对话的那条主会话就是 fork，`parentSession` 有值而
 * `origin` 为空。用它判子代理会把主对话一起静音。官方 dsh-subagent 的归档准入是同一套判据：
 * *"A fork shares the lineage field without the origin"*（archive-admission.js）。
 *
 * 判据不可用（session / header 缺失或形状不对）→ **放行**：宁可多弹一条，
 * 也不能因为宿主换了字段形状就让通知整体失效。
 */
export declare function shouldNotifySession(session: unknown): boolean;
/** turn/end reason.kind → 通知类别；不弹的分支返回 null（与 shared/notify.ts 过滤一致） */
export declare function turnEndNotifyKind(kind: string | undefined): 'completed' | 'error' | 'max-tokens' | null;
/** 解析 tool/call 的 arguments（JSON 字符串）→ questions 数组；解析失败/非数组 → null */
export declare function parseToolQuestions(args: unknown): Array<{
    question?: string;
}> | null;
/**
 * 把一条 session/event 子事件压缩成通知帧；不关心/过滤型事件返回 null。
 * 帧形状与 shared/notify.ts 的 frameToToast 期望完全一致（浏览器侧映射零改动）。
 * data 按宽松 Record 接收（approval/asked 的 reason 是字符串、turn/end 的是对象），内部各自安全取值。
 */
export declare function reduceNotifyFrame(event: {
    type?: string;
    data?: Record<string, unknown>;
}): HostNotifyFrame | null;
/** agent/error（无回合位置的失败）→ host/agent-error 帧（与 shared 期望的 message 字段一致） */
export declare function agentErrorFrame(error: unknown): HostNotifyFrame;
