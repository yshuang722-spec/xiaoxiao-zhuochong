import { type BalanceState } from './balance';
import { type WorkStatusSnapshot } from './work-status';
/** 一个叶子：计数器 + 载荷（data 为 null = 还没有数据，消费端跳过） */
export interface StateLeaf {
    counter: number;
    data: unknown;
}
/** S 的客户端视图（叶子已规范化：counter 必为数字） */
export interface PollState {
    sections: Record<string, StateLeaf>;
    pets: Record<string, Record<string, StateLeaf>>;
    /** 配置版本（host 顺带下发）：变了说明配置被别处改过（桌面端右键改 display / 另一个页面保存 /
     *  用户手工编辑配置文件），消费端据此重拉 /config。老版本 host 不带此字段 → undefined，
     *  消费端按「无从判断」处理，不会误触发重拉。 */
    configVersion?: string;
}
/** 一次变化的叶子（path 用于日志/调试，leaf 用于渲染） */
export interface StateChange {
    path: string;
    leaf: StateLeaf;
}
/**
 * 拉一次 /state。
 * 失败 / HTTP 非 2xx / 形状不对 → null（轮询侧静默重试，与其余轮询同一容错口径）。
 */
export declare function fetchState(baseUrl?: string): Promise<PollState | null>;
/** S → { 叶子路径: counter }：首拉基线用（新增的 section/宠物自动纳入，不用改这里） */
export declare function flattenCounters(s: PollState): Record<string, number>;
/**
 * 与基线比对，**就地推进基线**，返回本次变化的叶子。
 * 首拉不要调它（用 flattenCounters 记基线即可）——否则页面刷新会把旧数据重放一遍。
 */
export declare function takeChanged(s: PollState, baseline: Record<string, number>): StateChange[];
/**
 * 类型收窄：余额叶子 → `{ state, manual }`。
 * `manual` = 这次写入是**手动触发**的（`/balance` 命令、桌面「查看余额」菜单）——
 * 由 host 在写入时标记（`{...result, manual: true}`），因为只有 host 知道这次刷新是谁要的。
 * 消费端据此决定"余额不可用时要不要必弹文字说明"（decideBalanceNotice 的 explicit 参数）。
 * 形状非法 → null（消费端跳过这一拍，不抛）。
 */
export declare function readBalance(leaf: StateLeaf): {
    state: BalanceState;
    manual: boolean;
} | null;
/**
 * 类型收窄：宠物说话叶子 → `{ text, image? }`（形状非法 / 空文本 → null，消费端跳过这一拍）。
 * 碎碎念、命令气泡、对话回复共用这一个叶子——前端本来就是同一条展示链路
 * （同一个 triggerWhisper、同一个气泡槽、同一批 events.whisper 动画）。
 */
export declare function readSay(leaf: StateLeaf): {
    text: string;
    image?: string;
} | null;
/**
 * 类型收窄：工作状态叶子 → 快照（形状非法 → null，消费端跳过这一拍）。
 * 与余额不同，这里没有"手动"标记：工作状态永远由 DSH 事件驱动，没有用户主动要的那条路。
 */
export declare function readWorkStatus(leaf: StateLeaf): WorkStatusSnapshot | null;
/**
 * 类型收窄：点播动画叶子 → 动画名（形状非法 / 空名 → null，消费端跳过这一拍）。
 * **名字即文件名**：消费端拿到后交给菜单动作处理函数换源播放，所以这里只做形状校验；
 * "这个动画是否存在于该宠物"由宿主在写入前保证（播放端对不存在的名字没有兜底）。
 */
export declare function readAnim(leaf: StateLeaf): {
    name: string;
} | null;
/**
 * 动作端点：POST 一次，返回是否成功（`{ok:true}`）。
 * 动作**不返回数据**——数据只有一个出口（/state），调用方收到 ok 后立刻 `pollStateNow()`
 * 拉一拍即可 0 延迟看到结果（见 host 侧的路由说明）。
 */
export declare function postAction(baseUrl: string, body?: unknown): Promise<boolean>;
