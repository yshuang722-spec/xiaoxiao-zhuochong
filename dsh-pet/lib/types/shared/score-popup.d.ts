import { clickScore, SCORE_MIN_SPEED } from './score';
/** 弹窗展示时长（ms）：积分反馈比气泡（10s）短，够读即可 */
export declare const SCORE_POPUP_DURATION_MS = 2200;
/** 弹窗样式 —— 两端注入同一份（与 MENU_CSS / CHAT_CSS 同理） */
export declare const SCORE_POPUP_CSS: string;
/**
 * 在 (x, y) 爆开一圈暖色粒子（视口坐标，两端一致）：随机方向初速 + 重力回落 + 淡出。
 * rAF 驱动、寿命结束整体清理；prefers-reduced-motion 时跳过（与 Q 弹同语义）。
 */
export declare function spawnScoreBurst(x: number, y: number): void;
/** mountScorePopup 返回值（与 mountChatDialog 同契约） */
export interface ScorePopupMount {
    /** 根元素（document.body 下） */
    el: HTMLElement;
    /** 关闭并清理（幂等） */
    close: () => void;
}
/**
 * 挂载点击积分弹窗（两端共用；位置为视口坐标，超出视口自动夹回）。
 * 内容：+N 分（主） + 速度/大小明细（副）；SCORE_POPUP_DURATION_MS 后自动消失，
 * 点外 / Esc 立即关闭。分数已由调用方用 clickScore 算好传入（本文件 import 仅为共用常量来源）。
 */
export declare function mountScorePopup(opts: {
    x: number;
    y: number;
    score: number;
    speed: number;
    size: number;
    /** 关闭后的通知（调用方复位自身状态） */
    onClose?: () => void;
}): ScorePopupMount;
export { clickScore, SCORE_MIN_SPEED };
