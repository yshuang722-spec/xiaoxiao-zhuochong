import type { Corner, Rect } from './types';
/** 一次移动的几何参数（比例坐标） */
export interface MovePlan {
    startRatio: number;
    startYRatio: number;
    targetRatio: number;
    totalRatio: number;
}
/** 计算一次移动的起点/终点比例坐标；目标越出视口边缘（含边距）时返回 null。
 *  sideAllow = 左右透明边余量（视频画布内宠物身体居中、两侧透明）：边界按"身体"贴边而不是
 *  按"整个视频盒"贴边——宠物能走到屏幕边缘，但身体永不越界（不会漫游到屏幕外丢失）。
 *
 *  areas 传入时（桌面多显示器）边界改判**工作区并集**而不是视口外接矩形：落点的身体两侧
 *  各留 margin 后仍须落在某块屏上。缝隙两侧都有屏 ⇒ 可自由走过去（允许骑缝）；外接矩形里的
 *  空洞没有屏 ⇒ 走不进去。不传时按 W/H 单矩形判定，浏览器 overlay 行为逐位不变。 */
export declare const planMove: (o: {
    cx: number;
    cy: number;
    W: number;
    H: number;
    dir: 1 | -1;
    minDist: number;
    maxDist: number;
    margin: number;
    halfW: number;
    /** 可选：身体相对视频盒左/右各留多少像素（默认 0 = 旧行为，按视频盒贴边） */
    sideAllow?: number;
    /** 可选：显示器工作区列表（与 cx/cy 同坐标系）。给了就按并集判定落点可达性 */
    areas?: Rect[];
}) => MovePlan | null;
/**
 * 角落 + 边距 → 宠物根节点左上角像素坐标。
 * 与浏览器 overlay 的 CSS 角落语义一致：
 *   top-left     = left:marginX, top:marginY
 *   top-right    = right:marginX, top:marginY
 *   bottom-left  = left:marginX, bottom:marginY
 *   bottom-right = right:marginX, bottom:marginY
 * 桌面模式用同一套几何摆放宠物（根节点 = 舞台）。
 *
 * area 传入时角落取**那块屏**而不是视口外接矩形。多显示器不规则布局下外接矩形的角落可能
 * 压根不属于任何显示器（实测右倒 T 型双屏：top-left 落在主屏上方的空洞里，配了该角落的宠物
 * 开机即隐身），所以桌面端必须传主屏工作区。不传时按 W/H，浏览器 overlay 行为不变。
 */
export declare const anchorPixel: (o: {
    corner: Corner;
    marginX: number;
    marginY: number;
    size: number;
    W: number;
    H: number;
    /** 可选：角落所属的工作区矩形（与调用方同坐标系）；缺省用 {0,0,W,H} */
    area?: Rect;
}) => {
    x: number;
    y: number;
};
