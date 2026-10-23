/** 图标 URL 表（设置页「获取权限」成功确认的测试通知也用）——文件名单一来源在 shared */
export declare const NOTIFY_ICONS: {
    readonly done: string;
    readonly error: string;
    readonly truncated: string;
    readonly approval: string;
    readonly question: string;
    readonly test: string;
};
/** 申请浏览器通知权限的结果：ok=true 已授予；ok=false 带失败原因（供设置页红字展示） */
export type PermissionResult = {
    ok: true;
} | {
    ok: false;
    reason: 'unsupported' | 'denied' | 'rejected' | 'error';
    message?: string;
};
/** 申请浏览器通知权限。务必在用户手势（点击）下调用——无手势的自动申请可能被浏览器静默压制；
 * 失败时区分原因：unsupported=环境无 Notification、denied=浏览器已标记阻止、
 * rejected=用户在询问弹窗里选了阻止、error=申请过程异常/弹窗被跳过。 */
export declare function requestNotificationPermission(): Promise<PermissionResult>;
/** 重读总开关（设置页保存开关后调用）；之后新触发的通知按新值执行，无需刷新页面 */
export declare function reloadNotifications(): Promise<void>;
/**
 * 一帧通知 → toast（帧映射来自 shared；未知帧静默跳过）。
 * 由容器统一轮询 /state 后、发现 sections.notify 的 counter 变化时调用——
 * 通知不再有独立的 1s 轮询循环（改造前是 /notify?since=<seq> 拉增量帧数组）。
 */
export declare function notifyFromFrame(frame: unknown): void;
/**
 * 初始化系统通知引擎（**不做轮询**）：读总开关 + 兜底申请权限 + 跟踪页面聚焦。
 * 帧的消费改为容器统一轮询 /state 后调 notifyFromFrame（见 pet.ts 的分发）。
 * 返回释放函数（摘掉聚焦监听），由 ctx.effect 在插件卸载时调用。
 */
export declare function initNotify(): () => void;
