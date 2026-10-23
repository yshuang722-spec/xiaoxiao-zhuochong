/**
 * 对话生成（host 半侧）：用 DSH 的 LLM 统一抽象层（ctx.llm）按条目配置的 chatModel
 * （留空 = 当前对话用的 provider/model）生成一句回复。与碎碎念（generateWhisper）同构，区别是：
 *  - 输入带历史对话（memory.json 截取的最近 N 轮），历史以 user/assistant 消息进入请求；
 *  - user 消息 = 用户刚输入的话（不是"随便叨叨"指令）；
 *  - 回复放宽到 256 token（对话比碎碎念可说得稍多），超时放宽到 60s。
 *
 * 设计：
 *  - provider/model：条目配置的 chatModel 优先（留空 = 不指定），失败回落到
 *    agentDefaultModel.currentSelection()（当前对话的模型，与余额/碎碎念同源）重试一次——
 *    候选链见 model-selection.ts；
 *  - system = 用户配置的 whisperPrompt（人设：碎碎念与对话共用同一人设）；
 *  - reasoningEffort: 'off' —— 仅当模型声明支持 reasoning effort（含 "off"）时传，
 *    关闭深度思考：闲聊对话不需要推理。无 reasoning 元数据的模型（如
 *    reasoningEfforts: false）显式传 off 会被 dsh-llm 判为 UNSUPPORTED_REASONING_EFFORT
 *    并折叠成空流（表现为"模型未返回文本"），因此这类模型省略该字段（语义等价于不传）；
 *  - sessionId: PET_CALL_IDENTITY —— 调用身份（见 llm-call.ts）；
 *  - 无正文时读 BlockAssembler.finish 报真实失败原因（dsh-llm 把适配器抛错折进终止块）；
 *  - 历史 assistant 消息用 createAssistantMessage 构造（provider/model 记当前选择，
 *    仅作消息角色载体，不涉及适配器回放）；
 *  - 流式收集 + BlockAssembler 拼装文本；生成失败显式返回结构化原因，不伪造文案。
 *
 * 配图（可选，pool 非空时）：与碎碎念「随机抽」不同——对话有真实上下文（用户输入 + 历史），
 * 故把整张表情包清单交给模型由它**按语境选**一张；模型在末尾附标记 [图:名称]，
 * host 解析并**只在池内命中时**采纳（防幻觉出池外名称），未选/选错则不配图
 * （对话配图是点缀，不强制每句都带）。
 */
import { type MemeEntry } from './memes';
import { type ModelRef } from './model-selection';
/** 生成失败原因（与 shared/whisper.ts 的 WhisperState 失败分支同构） */
export type ChatGenerateResult = {
    ok: true;
    text: string;
    image?: string;
} | {
    ok: false;
    reason: 'provider-missing' | 'generate-error';
    message?: string;
};
/** 记忆中的一条消息（与 shared/chat.ts 的 ChatMessage 同构） */
export interface ChatMemoryMessage {
    role: 'user' | 'assistant';
    content: string;
    ts: number;
}
/**
 * 生成一句对话回复。
 * @param ctx 宿主上下文（注入 agentDefaultModel / llm）
 * @param system 人设提示词（whisperPrompt）
 * @param history 最近记忆（按时间正序；user/assistant 交替）
 * @param userText 用户刚输入的话
 * @param pool 表情包候选池（开启对话配图时传入；空/缺省 = 纯文本，指令与解析都不介入）
 * @param preferred 条目配置单独指定的模型（chatModel）；缺省 / 留空 = 只用当前对话的模型
 * @returns 回复文本（+ 命中池内的配图名），或结构化失败（provider 缺失 / 生成错误）
 */
export declare function generateChat(ctx: {
    agentDefaultModel: {
        currentSelection(): {
            provider: string;
            model: string;
        };
    };
    llm?: unknown;
}, system: string, history: ChatMemoryMessage[], userText: string, pool?: MemeEntry[], preferred?: ModelRef): Promise<ChatGenerateResult>;
