/** 余额叶子里的原始响应（与 host/balance/ 的 BalanceResult 同构；两端按此结构校验） */
export interface RawBalanceResult {
    ok: boolean;
    provider?: string;
    /** 展示形态（host 写叶子时带上）：windows = 三窗口用量，money = 账户金额 */
    shape?: 'windows' | 'money';
    reason?: string;
    message?: string;
    data?: {
        rolling?: unknown;
        weekly?: unknown;
        monthly?: unknown;
        rollingResetsAt?: unknown;
        weeklyResetsAt?: unknown;
        monthlyResetsAt?: unknown;
        rollingCapUsd?: unknown;
        weeklyCapUsd?: unknown;
        monthlyCapUsd?: unknown;
        rollingLabel?: unknown;
        currency?: unknown;
        total?: unknown;
        granted?: unknown;
        toppedUp?: unknown;
        fullBalance?: unknown;
        tier?: unknown;
    };
}
/** 计价档位装饰（气泡上的「峰/谷」）：由服务商算好后随数据带出，展示层原样渲染 */
export type PricingTier = 'peak' | 'idle';
/** 已解析的余额视图（展示 + 档位计算用） */
export interface BalanceView {
    provider: string;
    shape: 'windows' | 'money';
    ok: true;
    /**
     * 三窗口已用百分比（0-100 数字）+ 各自的重置时间。
     * `monthly` 必有（月度窗口是数据的底线）；`rolling` / `weekly` 可缺省 = 该服务商没有这个窗口。
     */
    rolling?: number;
    weekly?: number;
    monthly?: number;
    rollingResetsAt?: string;
    weeklyResetsAt?: string;
    monthlyResetsAt?: string;
    /**
     * 各窗口满额度（USD），由服务商随数据带出（opencode 是业务常量、commandcode 是接口回报）。
     * 用于「最紧迫窗口」的绝对口径；缺省 → 退化为百分比口径。展示层不再写死任何服务商的额度。
     */
    rollingCapUsd?: number;
    weeklyCapUsd?: number;
    monthlyCapUsd?: number;
    /** 滚动窗展示名（服务商自报，如 `5h`）；缺省回落 DEFAULT_ROLLING_LABEL */
    rollingLabel?: string;
    /** money：余额金额（字符串，与接口一致） */
    currency?: string;
    total?: string;
    granted?: string;
    toppedUp?: string;
    /**
     * money：档位基准（同 currency 单位）。余额 ≥ 该值视为未消耗。
     * 缺省 = 该服务商不给基准 → 不折算百分比、不播档位动画（不替它猜一个基准）。
     */
    fullBalance?: string;
    /** money：计价档位装饰；缺省 = 渲染成不带峰谷的「余额 ¥x.xx」 */
    tier?: PricingTier;
}
/** 无效（不支持/缺凭证/抓取失败）：显式标记，不静默 */
export interface BalanceUnavailable {
    provider: string;
    ok: false;
    reason: 'unsupported' | 'credential-missing' | 'fetch-error';
    message?: string;
}
export type BalanceState = BalanceView | BalanceUnavailable;
/**
 * host 的余额原始响应（`BalanceResult`，经 `/state` 的 `sections.balance` 叶子送达）→ 客户端视图。
 *
 * 形状非法 / shape 不认识 → **null**（消费端跳过这一拍）——注意这里**不抛**：它跑在 1s 轮询里，
 * 抛异常会把整拍打断（其余叶子也跟着不渲染）。取数失败（HTTP/网络）不在这里发生：取数在 host，
 * 失败会以 `ok:false` 写进 S，由这里正常映射成"不可用"状态。
 */
export declare function toBalanceState(raw: unknown): BalanceState | null;
/**
 * 事件档位百分比（已用百分比语义：0 = 未消耗，100 = 耗尽）：
 * - windows：取三窗口最大（风险最高者为准）
 * - money：余额按**数据自带的基准**（`fullBalance`）折算（基准 20 → 余额 20 元 → 0%，10 元 → 50%，
 *   0 元 → 100%）。没有基准 → undefined（不播档位动画，不替服务商猜一个）
 */
export declare function balancePercent(v: BalanceView): number | undefined;
/**
 * 余额事件档位索引（与 assets/config.jsonc 注释一致）：
 * index = p === 100 ? 5 : Math.floor(p / 20)
 */
export declare function balanceEventIndex(p: number): number;
/** 窗口键（三种窗口类别，与服务商无关） */
export type WindowKey = 'rolling' | 'weekly' | 'monthly';
/**
 * 窗口展示名（联想框文案用）：周、月。
 * 滚动窗的时长是**服务商自己的业务事实**（如 5 小时），不走这张表，见 DEFAULT_ROLLING_LABEL。
 */
export declare const WINDOW_LABELS: {
    readonly weekly: "周";
    readonly monthly: "月";
};
/**
 * 滚动窗展示名的兜底：服务商应随数据带 `rollingLabel`，缺省时才用它。
 * 之所以要有兜底：缺一个标签会让气泡出现空档，而 5h 是当前两个滚动窗口服务商的共同取值。
 */
export declare const DEFAULT_ROLLING_LABEL = "5h";
/** 一个窗口的额度概况（用于联想框一句话判定） */
export interface WindowUsage {
    label: string;
    percent: number;
    /** 满额度（USD），由服务商随数据带出；算不出时缺省 */
    quotaUsd?: number;
    /** 剩余额度（USD）= 满额度 × (100 − percent) / 100；满额度未知时缺省 */
    remainingUsd?: number;
    resetsAt?: string;
}
/**
 * 取最先告急的一个窗口（所有 windows 形态的服务商共用同一套，无服务商判断）：
 * - 满额度齐全 → 绝对口径：剩余额度（USD）最少者；
 * - 有窗口给不出满额度 → 退化为相对口径：已用百分比最大者
 *   （两窗额度量级不同，缺一个还硬比绝对剩余会反直觉）。
 * 不存在的窗口直接跳过，不补 0。
 *
 * 绝对口径的副作用（刻意保留）：滚动窗额度最小，通常先报它；两端一致，完整读数见 tools/api-tester.html。
 */
export declare function urgentWindow(v: BalanceView): WindowUsage | undefined;
/**
 * 重置时间 → 相对文案（保留 1 位小数）：
 * - 距重置 ≥ 4 天 → 「N.x 天」
 * - 距重置 < 4 天 → 「N.x 小时」
 * - 已过重置点 → 「已重置」；未知时间 → 空串
 */
export declare function resetInText(iso?: string): string;
/** 气泡行数据：role 决定两端的样式类（浏览器 React span；桌面 DOM div）；tier 用于峰谷着色 */
export type BalanceBubbleRow = {
    role: 'label';
    text: string;
} | {
    role: 'sub';
    text: string;
} | {
    role: 'error';
    text: string;
} | {
    role: 'tier';
    tier: PricingTier;
    text: string;
};
/**
 * 把 BalanceState 渲染成气泡行数据（纯函数，不碰 DOM/React）：
 * - windows：两行 —— 「X额度已用 N%」+ 重置倒计时
 * - money：一行 —— 「余额（峰/谷）¥x.xx」（峰红/谷绿由 role:'tier' 表达）；
 *   服务商没给档位装饰时退化成「余额 ¥x.xx」，不替它编一个峰谷
 * - 无效：显式展示不可用原因（见 unavailableRows），绝不伪造数字
 */
export declare function balanceBubbleView(state: BalanceState): BalanceBubbleRow[];
/** 非 ok 状态「弹不弹文字说明气泡」的判定结果 */
export interface BalanceNoticeDecision {
    /** true = 本次应弹气泡（文字说明）；false = 静默（同一原因已提示过，且非显式请求） */
    show: boolean;
    /** 本次提示的原因标识（形如 `unsupported:unregistered-provider`；ok 状态为 null）：调用方存下，供下次比较 */
    key: string | null;
}
/**
 * 余额不可用时是否弹气泡（浏览器 overlay 与桌面外壳共用同一份判定——两端各写一份必然漂移）：
 * - 显式请求（`/balance` 命令、桌面「查看余额」菜单）：一律弹——用户问了就该有答复，包括"不支持"这件事；
 * - 自动轮询：只在原因（含服务商）**变化**时弹一次（首次检测到也算变化），避免每 30 分钟反复刷同一句话。
 * 判定纯粹基于传入的 lastKey，不持有状态；调用方负责保存返回值里的 key。
 */
export declare function decideBalanceNotice(state: BalanceState, lastKey: string | null, explicit: boolean): BalanceNoticeDecision;
