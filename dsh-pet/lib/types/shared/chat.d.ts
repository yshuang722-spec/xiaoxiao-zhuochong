/** POST /dsh-pet-7340/chat?pet=<id> {text}：只回是否受理（回复走 /state 的 pets.<id>.say） */
export type ChatSendState = {
    ok: true;
} | {
    ok: false;
    reason: 'provider-missing' | 'generate-error' | 'config-error' | 'bad-request';
    message?: string;
};
/** 发送一句对话（携带记忆去 host 生成回复并写入记忆）。
 *  网络/解析失败显式抛错（调用方决定报错方式，绝不静默伪造）。 */
export declare function sendChat(baseUrl: string, text: string): Promise<ChatSendState>;
/** 弹窗样式 —— 两端注入同一份（与菜单 MENU_CSS 同理；视觉对齐浏览器/桌面）。
 *  最简形态：一条自适应输入框（无标题/无按钮）——初始小宽度（160px），
 *  随输入自动增宽（封顶 340px），到上限后自动折行增高；回车发送，Esc 或点外关闭。
 *  宽度由 JS 按文本测量覆盖根元素宽度。 */
export declare const CHAT_CSS: string;
/** mountChatDialog 返回值 */
export interface ChatDialogMount {
    /** 根元素（document.body 下） */
    el: HTMLElement;
    /** 关闭并清理（幂等） */
    close: () => void;
}
/** 挂载一个对话输入弹窗（两端共用；位置为视口坐标，超出 clamp 矩形自动夹回）。
 *  最简形态：只有一条输入框（无标题/无按钮），回车即发送 → 弹窗关闭 →
 *  onSent() 交给调用方叫醒一拍 /state（回复写进了 pets.<id>.say，气泡随下一拍出现）；
 *  Esc / 点弹窗外关闭；生成失败则留在弹窗内显式提示，不伪造回复。
 *
 *  clamp（可选，#41）：弹窗允许占用的矩形（视口局部坐标，默认整个视口）。
 *  桌面模式传「窗口 ∩ 工作区」——宠物贴屏幕底/右时窗口外扩余量伸出屏幕，
 *  约束到该矩形内即可完整显示，**窗口/宠物零移动零闪帧**。 */
export declare function mountChatDialog(opts: {
    petId: string;
    /** 端点基址：浏览器默认相对 /dsh-pet-7340/chat；桌面传绝对 URL（file:// 页面需绝对） */
    baseUrl?: string;
    x: number;
    y: number;
    /** 发送成功后调用（弹窗此时已关闭）：调用方叫醒一拍 /state 让回复 0 延迟出现。
     *  回复本身不从这里回传——它走 S（动作端点不回数据，数据只有一个出口）。 */
    onSent?: () => void;
    onClose?: () => void;
    /** 弹窗允许占用的矩形（视口局部坐标）；缺省 = 整个视口 */
    clamp?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
}): ChatDialogMount;
