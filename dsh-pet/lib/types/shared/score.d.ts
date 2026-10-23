/** 达标速度阈值（px/s）：飞行中被点击时低于它不给分（低速点击维持普通点击动画） */
export declare const SCORE_MIN_SPEED = 400;
/**
 * 点击积分：score = round(speed/100 × 462/size)，至少 1 分。
 * 小宠物（目标小、飞行中更难命中）反而分高；speed ≤ 0 / size ≤ 0 返回 0
 * （调用方按 0 不触发）。达标判定用 SCORE_MIN_SPEED 由调用方做。
 */
export declare const clickScore: (speed: number, size: number) => number;
