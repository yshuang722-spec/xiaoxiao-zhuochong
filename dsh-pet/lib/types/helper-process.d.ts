/**
 * 桌面 Helper 进程管理器 —— 拉起/守护 Electron 透明窗口进程。
 *
 * 架构：Helper 与宿主之间除了日志，还有一条 **stdin/stdout JSON 行协议**（bridge）：
 *   - 渲染端不再直接访问 DSH WebServer（DSH Desktop 2.0.3+ 的浏览器访问闸门会给插件自拉的
 *     独立进程裸 HTTP 请求回 403），改走自定义 scheme `dsh-pet-bridge://` → Electron 主进程
 *     （main.js 的 protocol.handle）→ 本模块的管道 → 宿主 handlePetRoute（与 HTTP 路由同一份逻辑）。
 *   - 协议行统一前缀 `dsh-pet-bridge:`，与普通日志行区分（main.js 的 console 输出也走 stdout）。
 *   - 素材（webm/字体/光标）不把二进制过管道：宿主返回文件绝对路径，main.js 自行读盘应答。
 * 本文件负责解析 Electron 可执行文件、以子进程方式拉起 electron-helper/main.js、
 * 守护协议通道、并在异常退出时自动重启。
 */
export declare const packageRoot: string;
export declare const defaultHelperMain: string;
/** 协议行前缀：stdout/stdin 里以此开头的整行 JSON 属于 bridge 协议，其余为日志 */
export declare const BRIDGE_PREFIX = "dsh-pet-bridge:";
/** 渲染端（经 main.js 转发）的一次请求：URL 是 /dsh-pet-7340/... 路径 + 查询串；
 *  cb = main.js 本地回调服务器地址（宿主把应答 POST 回去；Electron 主进程读不到 piped stdin，
 *  故应答不走 0 号管道 —— electron#4218） */
export interface BridgeRequest {
    id: number;
    method: string;
    url: string;
    body?: string;
    cb?: string;
}
/** 宿主对一次请求的应答：json/text 走 body；素材走 file（文件绝对路径，main.js 自行读盘） */
export interface BridgeResponse {
    id: number;
    status: number;
    contentType?: string;
    body?: string;
    file?: string;
}
/** bridge 请求处理器（宿主侧与 handlePetRoute 对接；main.js 不在收到请求时带出宿主动作） */
export type BridgeHandler = (req: BridgeRequest) => Promise<BridgeResponse>;
interface HelperOptions {
    electronPath?: string;
    helperPath?: string;
    command?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string | undefined>;
    restartDelayMs?: number;
    /** bridge 协议处理器：renderer 的每条请求（配置/余额/碎碎念/素材等）都经它应答 */
    bridgeHandler?: BridgeHandler;
}
type Logger = {
    info?: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
    debug?: (...args: unknown[]) => void;
};
/**
 * 解析 Electron 可执行文件。
 * 优先级：
 *   1. 显式候选（用户配置）/ DSH_PET_ELECTRON_PATH 环境变量
 *   2. 本机已安装的 electron npm 包（require('electron') 返回二进制路径）
 *   3. $DSH_HOME/electron（默认 ~/.dsh/electron）—— ensureElectronDownload 的落地路径
 *   4. 都不存在时由 ensureElectronDownload() 进程内异步下载（不 spawn 子进程，
 *      避免 process.execPath 在 Electron 宿主（如 DSH Desktop）里指向宿主 exe 导致崩溃）
 */
export declare function resolveElectronPath(candidates?: Array<string | undefined>): string | undefined;
/** $DSH_HOME（默认 ~/.dsh），与 ensure-electron.mjs 的 HOME 计算一致。 */
/**
 * 判断当前环境能否真的跑起 Electron 图形窗口。
 *
 * 【为什么需要】Linux 无显示环境（服务器 / 容器 / 纯 CLI）下，Electron 能被成功
 * 下载并 spawn 拉起，但初始化图形栈时立刻崩溃。配合 Helper 的守护循环
 * （异常退出自动重启），结果是每秒反复「拉起→崩溃→重启」，每个 core dump
 * 约 14MB —— 实测几小时可堆到数十 GB 打满磁盘。必须在拉起之前判断。
 *
 * 判定口径（只拦「明确跑不起来」的情况）：
 *   - win32 / darwin：桌面系统，放行（macOS 无 DISPLAY 也走 WindowServer）；
 *   - linux：需要 DISPLAY 或 WAYLAND_DISPLAY 其一，都没有则判为无显示环境。
 *
 * 【逃生口】DSH_PET_DESKTOP_FORCE=1 强制跳过，供 Xvfb / 远程桌面等
 * 「环境变量没设但其实能显示」的场景使用。
 */
export declare function hasGraphicalDisplay(): boolean;
export declare function dshHomeDir(): string;
/**
 * Electron 运行时落地目录（$DSH_HOME/electron）—— 下载解压的目标，
 * 也是设置页「卸载与存储」里让用户清理的那个目录。
 *
 * 唯一定义处：解析（resolveElectronPath / defaultElectronExe）与下载
 * （ensureElectronDownload）全部走这里，避免同一个目录字面量在多个模块各写一遍，
 * 改了一处而另一处没改（设置页就会显示一个永远不存在的路径）。
 */
export declare function electronLandingDir(): string;
/** Electron 落地路径：$DSH_HOME/electron/<按平台的可执行文件>。 */
export declare function defaultElectronExe(): string;
export interface EnsureElectronOptions {
    /** Electron 版本号（默认 43.3.0，可被 DSH_PET_ELECTRON_VERSION 覆盖）。 */
    version?: string;
    /** 下载镜像（默认 npmmirror，可被 DSH_PET_ELECTRON_MIRROR 覆盖）。 */
    mirror?: string;
    /** 单次下载超时（默认 10 分钟）。 */
    timeoutMs?: number;
}
/**
 * 进程内下载并解压 Electron 到 $DSH_HOME/electron。
 * 不 spawn 子进程：在 CLI node 与 Electron 宿主（DSH Desktop）里都可用，
 * 修复原 ensure-electron.mjs 用 process.execPath 调脚本导致宿主重复拉起的问题。
 * 已存在则原样返回；失败返回 undefined（不影响 DSH 与浏览器 overlay）。
 */
export declare function ensureElectronDownload(options?: EnsureElectronOptions): Promise<string | undefined>;
export declare function defaultLaunch(options?: HelperOptions): {
    command: string;
    args: string[];
};
/** 停止 helper 的等待上限（ms）：超过就升级 SIGKILL（issue #64） */
export declare const HELPER_STOP_TIMEOUT_MS = 3000;
/** SIGKILL 之后还给进程多久退出（ms）；到点仍未退出就放弃等待，绝不无限挂住调用方 */
export declare const HELPER_STOP_GRACE_MS = 1000;
/**
 * spawn helper 用的环境变量（纯函数，可独立测试）。
 *
 * **必须删掉 `ELECTRON_RUN_AS_NODE`**（issue #63）：宿主自己可能就是个 Electron 应用（DSH Desktop），
 * 它的 `process.env` 里可能带着这个变量；原样透传会让我们 spawn 的 Electron 以**纯 Node 模式**启动——
 * 内置 `electron` 模块根本不注册，main.js 顶部 `require('electron')` 直接 MODULE_NOT_FOUND →
 * helper 崩 → 守护循环重启 → 12 次熔断 → 桌面模式彻底不再出现，且没有任何用户可见提示。
 *
 * 为什么是"删除"而不是设成空串：Electron 只看这个变量**存不存在**。实测 Electron 43.3.0（Windows，
 * 与插件用的是同一份二进制）：删除 → `process.type=browser`、`require('electron')` 正常拿到 app；
 * 设 `''` → 直接 abort（exit 134，`node::CreateEnvironment` 断言失败）；设 `'0'`/`'false'`/`'1'` →
 * 都进纯 Node 模式。运行期再 `delete process.env` 已经晚了（模块加载器在进程启动瞬间就定了）。
 */
export declare function helperSpawnEnv(hostPid: number, extra?: Record<string, string | undefined>): NodeJS.ProcessEnv;
export declare class HelperProcess {
    readonly options: HelperOptions;
    readonly logger: Logger;
    private child?;
    private stopping;
    private restartTimer?;
    /** 连续崩溃计数（稳定运行 ≥3 分钟清零；达上限触发熔断） */
    private restartFailures;
    /** 最近一次 start() 的时间戳（稳定性判定基准） */
    private lastStartAt;
    /** stdout 按行缓冲（协议行按 \n 切分）。用 declare + 构造器赋值，避免类字段降级出外部 helper */
    private stdoutBuffer;
    constructor(options?: HelperOptions, logger?: Logger);
    start(): import('node:child_process').ChildProcess | undefined;
    /** stdout 按行缓冲：`dsh-pet-bridge:` 前缀整行 = 协议请求，其余 = 日志行 */
    private onStdoutChunk;
    /** 处理一条协议请求：交给宿主 bridgeHandler，结果按 id POST 回 main.js 的回调服务器
     *  （cb 由请求行携带；不走 stdin —— Electron 主进程收不到 piped stdin） */
    private handleBridgeLine;
    /** 把应答发回 main.js：优先 POST 到请求行携带的 cb（本地回调服务器）；无 cb 时回写 stdin（低版本兼容） */
    private sendBridgeResponse;
    /** 停止 helper：发 SIGTERM 即返回，**不等它退出**。宿主退出/插件卸载路径用它——
     *  宿主马上就没了（Windows 有 job 对象、POSIX 有 helper 自己的 host-liveness 兜底，见 issue #56）。
     *  **停止后要立刻重启的场景必须用 stopAndWait()**，否则新旧进程会短暂重叠（issue #64）。 */
    stop(reason?: string): void;
    /**
     * 停止 helper 并**等它真正退出**（issue #64）：原实现只发一次 SIGTERM 就返回、紧接着 spawn 新进程，
     * 而 Electron 收到 SIGTERM 后关窗、销毁 GPU/动画合成器是异步的（几百 ms 起）——旧窗口（旧大小）
     * 还没消失、新窗口（新大小）已经画出来，桌面上就短暂出现"两只宠物"。
     *   ① 先置 `stopping`（由 stop() 完成）：守护逻辑不得把这次主动停止误判成崩溃去自动重启；
     *   ② 只等 `exit`，**不等 `close`**：stdio 管道关闭远早于进程真正退出（实测 SIGTERM 后 ~10ms 就触发）；
     *   ③ 超时（默认 3s）升级 SIGKILL；SIGKILL 后再给 1s 宽限，仍未退出就放弃等待——
     *      配置保存绝不能因为一个退不掉的子进程而被无限挂住。
     */
    stopAndWait(reason?: string, timeoutMs?: number): Promise<void>;
    private scheduleRestart;
    /** 退避基值：DSH_PET_RESTART_BASE_MS（ms，>0）可调，默认 750。 */
    private resolveRestartBaseMs;
    /** 熔断阈值：DSH_PET_RESTART_MAX_FAILURES（次，>0）可调，默认 12。 */
    private resolveMaxFailures;
}
/** 稳定运行判定阈值：Helper 连续无崩溃运行 ≥ 3 分钟后，重启失败计数清零。 */
export declare const HELPER_STABLE_MS: number;
/**
 * 指数退避：第 n 次（0 起）失败后等待 base × 2ⁿ，封顶 30s。
 * 默认 base 750ms 保持与旧版首延一致，序列：750 → 1500 → 3000 → … → 30000。
 */
export declare function restartBackoffDelayMs(consecutiveFailures: number, baseMs?: number): number;
/** 熔断判定：连续崩溃 ≥ limit（默认 12，按默认退避累计约 3 分钟）次后不再自动重启。 */
export declare function shouldCircuitBreak(consecutiveFailures: number, limit?: number): boolean;
/** 稳定运行判定：距上次拉起 ≥ HELPER_STABLE_MS 视为一次「成功运行」，可清零计数。 */
export declare function helperRunIsStable(elapsedMs: number): boolean;
export {};
