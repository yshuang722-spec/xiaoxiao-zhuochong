/** 容器注册的「立刻拉一拍 /state」钩子：前端动作（右键菜单 / 对话弹窗）完成后调用——
 *  数据只从 S 来（动作端点不回数据），但叫醒一拍就能 0 延迟看到结果，不用等下一个 1s。
 *  未注册（容器还没挂）时是空操作，调用方不需要判空。 */
export declare const statePoller: {
    now: () => void;
};
import type { Animations, Pet, PhysicsParams, Weights } from '../shared/types';
import type * as ReactNS from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { jsx } from 'react/jsx-runtime';
/** 运行期宠物：拍平后的成品实例——条目级字段（动画池/权重/刷新周期/物理参数）已吹入，必填 */
export type RuntimePet = Pet & {
    animations: Animations;
    animationWeights: Weights;
    eventsRefreshSec: Record<string, number>;
    physics: PhysicsParams;
};
/**
 * 制造宠物页面组件（工厂，与 makePetConfigSection 同理：react 由运行时注入）。
 * @param rt 运行时注入的 react 能力（h=jsx / useState / useEffect / useRef）
 * @returns PetMulti 多开容器组件（内部渲染多个 PetCard）
 */
export declare function makePetUI(rt: {
    h: typeof jsx;
    useState: <T>(init: T) => [T, Dispatch<SetStateAction<T>>];
    useEffect: (effect: ReactNS.EffectCallback, deps?: ReactNS.DependencyList) => void;
    useRef: <T>(initial: T) => ReactNS.MutableRefObject<T>;
}): () => ReactNode;
