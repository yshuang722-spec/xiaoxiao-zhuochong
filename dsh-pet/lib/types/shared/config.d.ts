import type { Pet, PetDisplay } from './types';
/** 显示位置白名单 */
export declare const PET_DISPLAYS: PetDisplay[];
/** 该宠物是否参与浏览器 overlay 渲染 */
export declare const isWebVisible: (display: PetDisplay) => boolean;
/** 该宠物是否参与桌面模式（Electron 透明窗）渲染 */
export declare const isDesktopVisible: (display: PetDisplay) => boolean;
/** 把 host 的成品聚合拍平成渲染用宠物列表：
 *  条目级字段（animations / animationWeights / eventsRefreshSec / physics / confineToScreen /
 *  workStatusTexts / whisperModel / chatModel——合并器已填好；其中 9 个「全局默认」字段的
 *  条目值来自用户层，见 types.ts / host/config.ts）吹进每只实例；
 *  assetRoot = 条目 key（= 素材根，多实例共享）；非 main 条目的实例打 extra 标记
 *  （文件宠物：设置页不可编辑、保存时排除）。 */
export declare function flattenConfigPets(merged: Record<string, Record<string, unknown>>): Pet[];
