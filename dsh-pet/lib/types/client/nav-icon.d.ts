/**
 * 设置面板导航图标补丁 —— 把「桌宠配置」那一行的兜底齿轮换成指定图标。
 *
 * ## 为什么需要它
 *
 * DSH 设置面板的导航图标是**按分区 id 硬编码的白名单 + 兜底齿轮**，没有任何给第三方
 * 分区配图标的入口：
 *
 *   · `dsh-client-ui-settings-general/lib/client.js` 的 `navIcon(id)`（:243-269）只认
 *     account / models / agent-presets / plugins / archived-sessions 五个 id，其余
 *     一律 `IconSettingsOutlineMedium` —— 源码注释原文就是 "unknown ids fall back
 *     to the settings gear"；
 *   · 导航行数据是 `ctx.slots.entries("settings.section")` 投影出来的
 *     `{ id, order, label }`（同文件 :1023-1028），**没有图标位**；
 *   · slot 契约里也没有：ui-slots 的 `KindOptions`（list 分支，:564-569）与
 *     `StoredEntry.options`（:621-627）都只有 id / order / label / priority，
 *     `settings.section` 的 owner props 只有 `{ close }`。
 *
 * `navIcon` 是 settings-general 模块内部的私有函数，外部拿不到引用，所以只能在
 * **DOM 层**做：盯住设置面板（shell 用 `createPortal(..., document.body)` 直接挂在
 * body 上）→ 按行标题认出我们那一行 → 打标记 → 用 CSS 盖住齿轮、画上我们的字形。
 *
 * ## 为什么是「打标记 + CSS」而不是「换掉那个 svg」
 *
 * 那个 `<svg>` 是 shell 的 React 节点。`replaceWith` 成自己的节点后，React 手里仍
 * 攥着已脱离文档的旧 svg，那一行卸载时 React 会对它 `removeChild` →
 * `NotFoundError` 直接崩。本模块**不动 DOM 结构**：只加一个 React 从不 diff 的
 * `data-*` 属性，字形交给 `::before` + `mask` 画，React 全程无感。
 *
 * ## 认行只能靠标题文本
 *
 * 行里只有 id / order / label 三个字段，而投影到 DOM 的只有 label —— `<button>` 上
 * 只有 class / aria-current / data-modal-autofocus，既没有 id 也没有 order。所以按标题
 * 文本认。不能用 `:nth-child`：`account` 行是**条件出现**的（凭据存储后才注册），
 * 位置会漂。
 *
 * ## 降级策略（保证绝不会把设置面板弄坏）
 *
 * 1. 环境缺 document / MutationObserver → 完全不装，只告警；
 * 2. 图标渲不成 SVG（react-dom 不可用等）→ 完全不装，只告警（齿轮照旧）；
 * 3. 认不出那一行 → 什么都不做（齿轮照旧），不报错；
 * 4. 面板反复开关 → 观察者重新打标记，幂等。
 *
 * 将来 DSH 给 `settings.section` 加上 icon 选项后，删掉本模块与调用点即可。
 */
/** 换图标的目标：一行导航的标题 + 该行要画上的字形。 */
export interface SectionNavIcon {
    /**
     * 目标行的标题，与注册 `settings.section` 时的 `label` thunk 同源。
     * 每次现取，语言切换后重扫能跟上。
     */
    label: () => string;
    /**
     * 把图标渲成**内联 SVG 源码**。由调用方注入（app.ts 用 react-dom 渲染
     * primitives 的图标组件），本模块因此不依赖 react / react-dom，测试可传替身。
     */
    renderSvg: () => string;
}
/**
 * 把内联 SVG 源码转成可作 CSS mask 的 data URI。
 *
 * 两处必须处理：
 *   · `xmlns` —— React 渲染出的 DOM `<svg>` 不带命名空间声明，而 data URI 里的 SVG 是
 *     按「独立图像文档」解析的，缺了它整张图不渲染（已有则不动）；
 *   · `currentColor` —— mask 只看 alpha，但 data URI 里 `currentColor` 会退化成 UA
 *     默认色，显式定成不透明黑最稳。
 *
 * @param svg - 内联 SVG 源码。
 * @returns `url("data:image/svg+xml,...")`；源码为空时返回空串。
 */
export declare function svgMaskUri(svg: string): string;
/**
 * 把设置面板导航里目标分区的兜底齿轮换成指定图标。
 *
 * @param target - 目标行标题 + 字形渲染器。
 * @returns disposer：断开观察者（已注入的样式与已打的标记留在原地，不影响正确性）。
 */
export declare function installSectionNavIcon(target: SectionNavIcon): () => void;
