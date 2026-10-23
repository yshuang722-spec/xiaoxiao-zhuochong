/**
 * 播放动画（`POST /dsh-pet-7340/anim`）的**纯决策层**。
 *
 * 用途：宿主侧其他插件想让桌宠播一段动画（"点播"），效果与右键菜单里点「动作」树完全一致
 * ——两端都复用同一个菜单动作处理函数，本模块只负责**判定该不该播、播哪一个**。
 *
 * 为什么单独一层：契约就是"名字必须在菜单能点到的集合里"。播放端对不存在的动画没有兜底
 * （名字即文件名，404 → 加载失败 → 表现为"点了没反应"），所以名字校验是硬要求，且必须能
 * 脱离 HTTP 单测。本模块只依赖配置（动画池都在 animations 里，不碰文件系统），可完全离线测。
 *
 * 允许集合 = 右键菜单三级树叶里所有 `anim` 的并集。菜单树的唯一事实来源是
 * src/shared/menu.ts 的 buildMenuTree()，它取这 7 个池：idle / turn / drag / clicks /
 * moves.actions / categories / events。
 * **host 不 import src/shared**（DSH 单文件加载约束，见 index.ts 顶部说明），所以这里按同一
 * 口径自包含实现一份；两边的守卫测试会同时钉住这份口径，任一侧改了池子就会有一边失败。
 */
/** 点播失败的分类（路由原样透出给调用方） */
export type AnimFailure = 'bad-request' | 'unknown-pet' | 'unknown-animation';
/** 决策结论：通过则给出最终要写进 S 的内容，否则给出显式原因 */
export type AnimDecision = {
    ok: true;
    petId: string;
    name: string;
} | {
    ok: false;
    reason: AnimFailure;
    message: string;
};
/**
 * 该条目的 animations 配置 → 可点播的动画名（去重，保持首次出现顺序）。
 * 池子与顺序对齐 src/shared/menu.ts 的 buildMenuTree()：
 *   待机 → 转向 → 拖拽 → 点击回应 → 移动 → config 随机动作分类 → 事件（数组槽位展平）
 */
export declare function animationNames(animations: unknown): string[];
/**
 * 把外部给的点播请求与当前配置核对成一个结论。
 *
 * @param cfg readAllConfig 的合并成品（所有字段已填满，这里不做兜底解析）
 * @param requested `?pet=` 的原值（可为空串）
 * @param active `resolveActivePetId()` 的结果（可为空串；无宠物时为空）
 * @param name 外部给的动画名（未规范化）
 */
export declare function decideAnim(args: {
    cfg: Record<string, Record<string, unknown>>;
    requested: string;
    active: string;
    name: unknown;
}): AnimDecision;
