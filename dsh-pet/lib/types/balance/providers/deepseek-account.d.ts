import type { AccountBalanceSnapshot, BalanceProvider, BalanceSuccess } from '../types';
/**
 * 账号余额快照 → 成功结果（纯函数，便于测试直接喂真实结构）。
 *
 * 失败口径：没有可用的充值钱包（未登录 / 查询失败 / 空数组）→ 抛错，由调用方落成 `fetch-error`；
 * 金额非法同理 —— **绝不伪造 0 余额**。
 *
 * 币种：钱包自带 `CNY`/`USD`，这里一并带出去，展示层据此选符号（CNY → ¥）。
 */
export declare function parseAccountBalance(snapshot: AccountBalanceSnapshot | null | undefined, provider: string): BalanceSuccess;
export declare const deepseekAccount: BalanceProvider;
