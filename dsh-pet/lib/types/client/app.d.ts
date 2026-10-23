/**
 * 返回 DSH 插件 factory：`(require) => module`。
 * 插件三件套（name / inject / apply）都在其返回的 module 上。
 */
export declare function makeFactory(): (require: (mod: string) => any) => any;
