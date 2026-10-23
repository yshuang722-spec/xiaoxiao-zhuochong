import type { BalanceProvider, BalanceSuccess } from '../types';
/**
 * 解析三个接口的响应 → 成功结果（纯函数：网络与凭证都在外面，测试直接喂真实报文）。
 *
 * 失败口径：**必填字段缺失/非法一律抛错**（调用方落成 `fetch-error`，绝不伪造 0 余额）；
 * 可选信息（不限额窗口、`cap` 为 0、占位重置时间、订阅缺失）一律省略。
 */
export declare function parseCommandCode(creditsBody: unknown, subscriptionBody: unknown, summaryBody: unknown, provider: string): BalanceSuccess;
export declare const commandCode: BalanceProvider;
