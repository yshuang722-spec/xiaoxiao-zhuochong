/**
 * 余额查询的**内部工具**（host 侧）：网络策略 + 响应校验 + 金额处理。
 *
 * 只给 ./providers/* 用。所有服务商共用同一套口径：
 * - 网络：20s 超时 + 3 次重试（实测该环境对境外端点间歇性超时）；
 * - 校验：必填字段缺失/非法一律 `throw`，**绝不静默当 0**（失败要显式暴露成 fetch-error）；
 * - 可选字段：缺失就是缺失（`undefined`），不补默认值。
 */
/** fetch + 重试；全败抛最后错误 */
export declare function fetchWithRetry(url: string, key: string): Promise<Response>;
/** 数字兜底校验：数值化失败或非有限数 → throw（数据异常显式报错，不静默当 0） */
export declare function num(value: unknown, what: string): number;
/** 字符串兜底校验：非空字符串，否则 throw */
export declare function str(value: unknown, what: string): string;
/** 宽松数值（数字或数字字符串）：缺失/空/非法 → undefined（可选字段用；必填字段走 num() 抛错） */
export declare function looseNum(value: unknown): number | undefined;
/** 取对象：不是对象（含数组/null）→ undefined */
export declare function obj(value: unknown): Record<string, unknown> | undefined;
/** 一个限额窗口（`{used, cap, resetAt}`）→ 百分比 + 满额度 + 重置时间；形态不认识 → undefined（该窗口视为不存在） */
export declare function readWindow(value: unknown): {
    percent: number;
    capUsd: number;
    resetsAt?: string;
} | undefined;
/** 查询串：只带出现过的参数（`orgId` 取不到时不硬塞空值） */
export declare function queryString(params: Record<string, string | undefined>): string;
/**
 * 账号侧金额 → 两位小数字符串。
 *
 * 平台回传的是**保留服务端精度的原始串**（实测形如 `9.9902690000000000`，README 亦声明
 * 允许 `0E-16`、`5.0000000000000000` 这类写法），直接显示会变成 `¥9.9902690000000000`，
 * 与官方路由的 `¥8.79` 风格不一致 —— 故在这里收敛到两位小数。
 * 非法（非数字）仍抛错，绝不伪造 0。
 */
export declare function money(value: unknown, what: string): string;
/**
 * 两个金额串相加 → 两位小数。
 * 走整数分相加（先四舍五入到分），避免 0.1+0.2 这类二进制浮点误差在金额上显形。
 */
export declare function sumMoney(a: string, b: string): string;
