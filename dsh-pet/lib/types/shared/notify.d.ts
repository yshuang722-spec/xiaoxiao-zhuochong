/** 通知图标文件名（不含扩展名；浏览器半侧拼完整 URL：/dsh-pet-7340/pic/<name>.png） */
export declare const NOTIFY_ICONS: {
    readonly done: "notify-done";
    readonly error: "notify-error";
    readonly truncated: "notify-truncated";
    readonly approval: "notify-approval";
    readonly question: "notify-question";
    readonly test: "notify-test";
};
export declare const MAX_BODY = 80;
/** 文案截断（与弹窗一致：超长只留前 80 字符） */
export declare function truncate(text: string): string;
/** 通知帧（浏览器 mux/host 流的帧形状） */
export interface NotifyFrame {
    type: string;
    [key: string]: unknown;
}
/** 帧 → toast 文案；不认识的类型 / turn/end 的非弹分支（aborted 等）返回 null */
export declare function frameToToast(frame: NotifyFrame): {
    title: string;
    body: string;
    icon: string;
} | null;
