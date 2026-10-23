export declare const PET_DISPLAY_SET: ReadonlySet<string>;
/** id 禁用的字符（Windows 文件名保留符 + 控制字符，防配置值逃逸文件路径）。
 *  同时被 thumb 路由的 petId 校验复用：那里同样是"标识符不得当路径片段"。 */
export declare const ID_FORBIDDEN: RegExp;
/**
 * 读磁盘上的用户层原对象（JSONC 容忍——与读取路径 readAllConfig 共用同一份解析器）。
 *
 * 写路径必须用它：`PUT /config` 的「透传保留」要把用户手改的高级字段（physics /
 * whisperPrompt / animations / memes / ...）原样带回，而用户层可能是「同步」写入的
 * **带 // 注释的 config.jsonc 原文**。那里若用严格 `JSON.parse`，解析必然抛错、又被
 * catch 静默吞掉，existing 就成了 undefined —— 保存时白名单重建，高级字段全部丢失
 * （这正是「保存把用户精调配置抹掉」那次老 bug 的复发路径）。
 *
 * 文件不存在 / 损坏 → undefined（调用方按「无既有字段」处理，不阻塞保存）。
 */
export declare function readUserConfig(paths: ConfigPaths): Record<string, unknown> | undefined;
/**
 * 用户层**存在但解析不了**（真损坏：语法错误，连 JSONC 剥注释都救不回来）。
 *
 * 用途：`PUT /config`（保存）的损坏预检。保存是「白名单重建」，一旦 existing 读不出来，
 * 文件里原有的内容（用户手写的 animations / physics / memes / ...）就会被整份丢掉——
 * 而且全程静默。所以宿主这里**先不写盘**，回 409 让设置页弹窗（取消 = 不动文件；
 * 确认 = 强行重建），绝不静默丢配置。
 *
 * 文件不存在 → false（没有东西可丢，正常首次保存）。
 */
export declare function userConfigUnparsable(paths: ConfigPaths): boolean;
/** 配置路径集（宿主组装好后传入，单一事实来源） */
export interface ConfigPaths {
    /** 包内 assets/config.jsonc（内置默认，绝对正确） */
    defaultFile: string;
    /** ~/.dsh/dsh-pet/main-config.jsonc（用户主配置，可编辑层；JSONC——允许注释） */
    userFile: string;
    /** 旧版路径 ~/.dsh/dsh-pet/main-config.json：读取回落 + 启动时迁移（见 migrateUserConfig） */
    legacyUserFile?: string;
    /** ~/.dsh/dsh-pet/pet（文件宠物目录） */
    petDir: string;
}
/**
 * 老用户一次性迁移：`main-config.json` → `main-config.jsonc`（**重命名**，内容一字不动）。
 *
 * 为什么改扩展名：用户层从「同步」起就是带 `//` 注释的 JSONC 原文，挂在 `.json` 名下名不副实
 * （编辑器会当严格 JSON 报错）。改成 `.jsonc` 后与包内默认 `config.jsonc` 同名同格式。
 *
 * 语义：新文件已存在 → 什么都不做（绝不用旧文件覆盖新文件）；旧文件不存在 → 什么都不做；
 * 重命名失败（占用/权限）→ 静默放过，读取侧对旧路径有回落，功能不受影响。
 */
export declare function migrateUserConfig(paths: ConfigPaths, log?: (message: string) => void): boolean;
/**
 * 按条目 key（= 文件名前缀 = 素材根）定位**文件宠物**的实际文件与磁盘原对象。
 *
 * 用途：写路径（POST /pet-display）改某只文件宠物的 display 时，既要写回**它自己的**配置文件，
 * 也要拿该文件的 existing 去做「透传保留」——否则文件里用户手改的 whisperPrompt / animations /
 * memes 等非白名单字段会被 saveUserConfig 的白名单重建整份抹掉（与 main 层 readUserConfig
 * 同一套语义，见其注释里的老 bug 说明）。
 *
 * 文件名可能是 `<前缀>-config.json` 或 `.jsonc`（与 scanPetFiles 同一套规则，不在这里重复写死
 * 扩展名——写错扩展名就会新建一个空配置，用户那只宠物反而"没被改到"）。前缀不存在 → undefined。
 */
export declare function readPetConfigEntry(paths: ConfigPaths, entry: string): {
    path: string;
    raw: Record<string, unknown> | undefined;
} | undefined;
/**
 * 配置版本号（GET /state 顺带下发的「配置有没有变过」指纹）。
 *
 * 取「所有会被合并进来的配置文件」的 mtime 最大值：用户主配置（含旧路径回落）+ 全部文件宠物配置。
 * 为什么用文件时间戳而不是内存计数器：**用户手工编辑 main-config.jsonc / pet/*.json 也必须被感知**——
 * 那条路径不经过任何写接口，计数器永远不动。
 *
 * 消费端只比较「与上一拍是否相同」，不解析、不排序，所以直接给毫秒时间戳的字符串。
 * 文件都不存在（首次使用）→ "0"；首次写盘后 mtime 立刻变化，版本随之改变。
 */
export declare function configVersion(paths: ConfigPaths): string;
/**
 * 唯一读取函数：内置默认 + 用户主配置 + 文件宠物逐字段合并后的完成品聚合。
 * 返回 { main: {...}, test1: {...}, ... } —— 每个条目都是原文件结构且所有字段已填满，
 * 消费端直接读，不做任何校验/兜底。每次调用重新读文件：修改配置刷新/重启即生效。
 */
export declare function readAllConfig(paths: ConfigPaths): Record<string, Record<string, unknown>>;
/** 拍平全部条目的 pets 为单列表（host 消费端用：桌面宠物列表 / 命令 / 当前桌宠解析） */
export declare function flattenPetList(merged: Record<string, Record<string, unknown>>): Record<string, unknown>[];
/** 在完成品聚合里按实例 id 定位宠物及其所属条目（host 内部消费索引）：
 *  条目 key 即素材根（assetRoot）；条目级字段（whisperPrompt/chatMemoryRounds/animations）随条目取。 */
export declare function findPetInstance(merged: Record<string, Record<string, unknown>>, petId: string): {
    entry: string;
    conf: Record<string, unknown>;
    pet: Record<string, unknown>;
} | undefined;
/**
 * 保存用户层（PUT /config）：更新 main-config.jsonc，接受可编辑字段（pets + 全局开关：
 * notificationsEnabled / whisperImageEnabled / chatImageEnabled / confineToScreen + physics
 * + whisperModel / chatModel + chatMemoryRounds + chatImageLimit）。
 * 编辑语义：**非白名单顶层字段（whisperPrompt / eventsRefreshSec / memes 等）从
 * `existing`（当前磁盘上的用户文件原对象）原样透传保留**——
 * 用户手动编辑的精调配置不会被设置页保存抹掉（旧实现是纯白名单重建，会整体覆盖丢失）。
 * 白名单字段同理只在请求体**真的传了**时才算白名单：没传就走透传，不会被抹成默认值。
 * 非法 → 返回 null（宿主回 400）。与读取分离——文件宠物永不回写、不在本模式内。
 */
export declare function saveUserConfig(raw: unknown, existing?: Record<string, unknown>): {
    pets: unknown[];
    [key: string]: unknown;
} | null;
/**
 * 同步用户层（POST /config，设置页「同步」）：把内置默认配置**原文**写入用户主配置文件。
 *
 * 为什么是"复制原文"而不是"删除用户层"（旧实现）：删掉之后用户手上没有配置文件，
 * 想手改高级字段（physics / whisperPrompt / animations / memes / ...）就得自己从包内
 * assets/config.jsonc 复制一份——这一步是死的、每次都要做。这里直接把那份文件（含全部
 * 中文注释、全部字段）落到用户配置路径上：既等价于恢复默认（合并结果 = 内置默认），
 * 又让用户拿到一份开箱可编辑的完整配置。
 *
 * 注释无害：读取侧统一走 readJsonc（stripJsonc 剥注释），带注释写入照样能读。
 *
 * 注意（调用方要在 UI 上讲清楚）：文件一旦生成即成为**显式覆盖层**——用户层写了什么就
 * 覆盖内置默认的对应字段，所以插件升级改了内置默认后，这个文件里的旧值仍会继续生效。
 *
 * 默认文件缺失/目录不可写 → 直接抛（宿主回 500）：绝不静默留下半个配置文件。
 */
export declare function syncUserConfigFromDefault(paths: ConfigPaths): void;
/**
 * 对话记忆截取：从消息列表里取尾部 `rounds` 轮（1 轮 = 1 问 1 答 → 2 条）。
 *
 * 为什么单独抽一个函数：`rounds = 0` 表示「不带历史」。若直接写 `messages.slice(-rounds * 2)`，
 * 会踩 JS 的 `-0` 陷阱——`-0 === 0`，`slice(-0)` 返回**整个数组**而不是空数组，
 * 于是「关掉历史」反而变成「带全部历史」（用户实测：设 0 后问生日，10 秒后仍答得出）。
 * 这里显式分支：0 → 空列表；> 0 → 截尾部。`rounds` 由合并器保证为非负有限数，
 * 负数/NaN 兜底按 0 处理（不产出荒谬的 slice 行为）。
 */
export declare function sliceMemoryRounds<T>(messages: T[], rounds: number): T[];
