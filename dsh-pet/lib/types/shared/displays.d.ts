import type { Rect } from './types';
/** 矩形右缘（不含） */
export declare const rectRight: (r: Rect) => number;
/** 矩形下缘（不含） */
export declare const rectBottom: (r: Rect) => number;
/** 外接矩形：视口 VIEW 仍取它（作为坐标系原点与比例换算基准），但**边界判定一律走并集**。
 *  空列表返回 0×0（调用方兜底）。 */
export declare const boundingRect: (rects: Rect[]) => Rect;
/** 点是否落在矩形内（右/下缘不含，与 workArea 拼接语义一致：相邻两屏缝隙为 0 时点归左/上那块） */
export declare const pointInRect: (r: Rect, x: number, y: number) => boolean;
/** 点被哪块屏覆盖；无则 null。重叠时取列表中第一块（与 Chromium「先发现者优先」一致） */
export declare const rectAtPoint: (rects: Rect[], x: number, y: number) => Rect | null;
/** 同上，返回下标（−1 = 无覆盖）：抛掷需要用下标记住「当前所在屏」 */
export declare const indexAtPoint: (rects: Rect[], x: number, y: number) => number;
/** 点到矩形的最短距离平方（点在矩形内为 0） */
export declare const distToRectSq: (r: Rect, x: number, y: number) => number;
/** 离点最近的屏下标（并集非空时恒有解；空列表返回 −1）。用于宠物落在空洞/屏幕被拔掉后归位 */
export declare const nearestIndex: (rects: Rect[], x: number, y: number) => number;
/** 点所在屏；不在任何屏上时取最近的那块（恒非 null，除非列表为空） */
export declare const resolveRect: (rects: Rect[], x: number, y: number) => Rect | null;
/** 把点夹进指定矩形（右/下缘留 1px，保证夹取结果仍满足 pointInRect） */
export declare const clampPointInRect: (r: Rect, x: number, y: number) => {
    x: number;
    y: number;
};
/** 把点夹进并集：已在并集内原样返回，否则夹进最近的那块屏。
 *  用于显示器拔插/改分辨率后把落在空洞里的宠物拉回可见区。 */
export declare const clampPointToRegion: (rects: Rect[], x: number, y: number) => {
    x: number;
    y: number;
};
/** 并集面积（各屏不重叠时 = 面积和；重叠会重复计，仅作诊断用） */
export declare const regionArea: (rects: Rect[]) => number;
/** 外接矩形中不属于任何显示器的面积占比 0~1（诊断/日志用；矩形不重叠时精确） */
export declare const regionHoleRatio: (rects: Rect[]) => number;
/** 把一组矩形整体平移（屏幕坐标 → 视口相对坐标：减去 VIEW 原点） */
export declare const translateRects: (rects: Rect[], dx: number, dy: number) => Rect[];
