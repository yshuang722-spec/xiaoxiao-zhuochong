import { type BalanceState } from '../shared/balance';
import type { ReactNode } from 'react';
import type { jsx } from 'react/jsx-runtime';
/**
 * 制造余额气泡（工厂）。
 * 工厂内注入样式一次（与 pet.ts 的 injectCss 同模式）；组件为哑组件，props = { state, on }。
 * 内容来自 src/shared 的 balanceBubbleView（与桌面模式完全一致）。
 */
export declare function makeBalanceBubble(rt: {
    h: typeof jsx;
}): (props: {
    state: BalanceState;
    on: boolean;
}) => ReactNode;
/**
 * 制造碎碎念气泡（工厂）。
 * 与余额气泡共用同一套样式（dsh-pet-bubble）与行渲染（rowsToNodes）；
 * 内容来自 src/shared 的 whisperBubbleView（与桌面模式完全一致）。
 * image：配图名称（配置 memes 的键），有值则在文字上方渲染该表情包；
 *        图片样式取自 shared 的 MEME_BUBBLE_CSS（两端同一份，这里只声明式建节点）。
 * assetRoot：素材根（= 该宠物的条目 key），决定图片去哪个表情包目录链取
 *        （种类独占 pet/<名>-memes/ → 用户目录 → 包内），与动画素材同一套归属语义。
 */
export declare function makeWhisperBubble(rt: {
    h: typeof jsx;
}): (props: {
    text: string;
    image?: string;
    assetRoot?: string;
    on: boolean;
}) => ReactNode;
