/** thumb 画布高度 */
export declare const CANVAS_H = 360;
/** thumb 画布上「脚底」的 y 坐标（人物站在 y=330 线上） */
export declare const FEET_Y = 330;
/** 点击/拖拽命中矩形（thumb 640×360 像素坐标） */
export declare const HIT_BOX: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
};
/** 拖拽判定阈值（px） */
export declare const DRAG_THRESHOLD = 5;
/** 移动距离缩放基准（px）：config.jsonc 的 moves.minDist/maxDist 是「基准宠物宽 462px」下的绝对像素，
 *  运行时乘以 实际size/基准 等比缩放 —— 任何缩放下，行进距离与人物自身大小成比例（小宠物挪小步、大宠物挪大步） */
export declare const PET_REF_WIDTH = 462;
/** 播放动画扩展名（集中开关，浏览器与桌面共用同一常量）：
 *  - 默认 '.webm'（VP9-alpha，发布格式）：Chrome/Edge/Firefox 与桌面模式（Electron=Chromium）直接透明播放；
 *  - macOS 的 Safari/WKWebView 不认 webm alpha（渲染黑底），需改为 '.mov'（HEVC-with-Alpha）——
 *    素材从仓库 GitHub Release（固定 tag assets-mov）下载放入 main-animation/mov/，
 *    并把本常量改为 '.mov' 后重新构建（自构建用户改这里；npm 包用户改产物 lib/client.js 中同名常量）。 */
export declare const ANIMATION_EXT = ".webm";
