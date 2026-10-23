/** 提示框 class（两端共用） */
export declare const TOOLTIP_CLASS = "pet-tooltip";
/** 光标与提示框之间的间隙（占宠物宽度比例）：462px 的宠物下约 10px，与原生提示的偏移观感接近 */
export declare const TOOLTIP_GAP_RATIO = 0.022;
/** 一个点（视口坐标） */
export type TipPoint = {
    x: number;
    y: number;
};
/** 矩形（与 {@link TipPoint} 同坐标系） */
export type TipRect = {
    x: number;
    y: number;
    w: number;
    h: number;
};
/**
 * 光标位置 + 提示框实测尺寸 + 允许显示范围 → 提示框左上角坐标。
 *
 * 摆法与原生提示一致：优先放光标**右下**；右边装不下翻到光标左侧，下边装不下翻到光标上方；
 * 翻完仍越界就夹回范围内（提示框比允许范围还宽时，至少保证左上角不越界）。两端共用同一份，
 * 避免出现「网页翻左、桌面翻右」这种不一致。
 *
 * 为什么尺寸要调用方实测（offsetWidth/offsetHeight）而不是按宠物宽度估算：翻边判据依赖真实宽高，
 * 估算偏大会贴着边就翻、偏小会越界被裁；提示框常驻 DOM（opacity:0 也有布局），实测不额外花代价。
 *
 * @param cursor 光标位置
 * @param tip 提示框实测尺寸（px）——调用方传 offsetWidth/offsetHeight
 * @param bounds 允许显示的范围：桌面端是「窗口 ∩ 光标所在屏的工作区」，浏览器端是整个视口
 * @param gap 光标与提示框的间隙（px）
 */
export declare function tooltipPlacement(cursor: TipPoint, tip: {
    w: number;
    h: number;
}, bounds: TipRect, gap: number): TipPoint;
/** 提示框样式 —— 两端注入同一份（客户端进 pet.ts 的 css 数组，桌面由 renderer.js 建 style 标签） */
export declare const TOOLTIP_CSS: string;
