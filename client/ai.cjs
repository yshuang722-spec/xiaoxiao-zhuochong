const fs = require('node:fs');
const path = require('node:path');

// Credentials stay in Electron's main process. No raw credentials enter the renderer.
function createAI({service, safeStorage, fetchImpl = globalThis.fetch, onChanged = () => {}}) {
  const settingsFile = path.join(service.HOME, 'pet-control-client', 'ai-settings.json');
  const pending = new Set();
  function read(file, fallback) {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  }
  function write(file, value) {
    fs.mkdirSync(path.dirname(file), {recursive: true});
    const temp = file + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), {mode: 0o600});
    fs.renameSync(temp, file);
  }
  function endpoint(value) {
    let url;
    try { url = new URL(value); } catch { throw Error('请输入完整的 API 地址'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw Error('API 地址必须使用 HTTPS，且不能包含账号、查询参数或锚点');
    }
    url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/chat\/completions$/, '') + '/chat/completions';
    return url.href;
  }
  function load() {
    return read(settingsFile, {baseUrl: 'https://api.xiaomimimo.com/v1', model: 'mimo-v2.6-flash', auth: 'api-key', rounds: 5});
  }
  function publicSettings() {
    const s = load();
    return {baseUrl: s.baseUrl, model: s.model, auth: s.auth, rounds: s.rounds, hasKey: !!s.encryptedKey,
      secureStorage: safeStorage.isEncryptionAvailable()};
  }
  function save(input) {
    if (!input || typeof input !== 'object') throw Error('设置格式无效');
    endpoint(input.baseUrl);
    if (typeof input.model !== 'string' || !input.model.trim() || input.model.length > 150) throw Error('请填写有效的模型名称');
    if (!['api-key', 'bearer'].includes(input.auth)) throw Error('认证方式无效');
    if (!Number.isInteger(input.rounds) || input.rounds < 0 || input.rounds > 20) throw Error('记忆轮数应为 0–20 的整数');
    const old = load();
    let encryptedKey = old.encryptedKey;
    if (typeof input.key !== 'string' || input.key.length > 4096 || /[\r\n]/.test(input.key)) throw Error('密钥格式无效');
    if (input.clearKey === true) encryptedKey = undefined;
    else if (input.key.trim()) {
      if (!safeStorage.isEncryptionAvailable()) throw Error('系统加密存储不可用，无法保存密钥');
      encryptedKey = safeStorage.encryptString(input.key.trim()).toString('base64');
    }
    // A saved key must never silently be forwarded to a newly entered host.
    if (encryptedKey && !input.key.trim() && input.clearKey !== true && new URL(old.baseUrl).origin !== new URL(input.baseUrl).origin) {
      throw Error('更换 API 服务地址时，请重新填写该服务的密钥');
    }
    write(settingsFile, {baseUrl: input.baseUrl.trim(), model: input.model.trim(), auth: input.auth, rounds: input.rounds, encryptedKey});
    return publicSettings();
  }
  async function complete(messages) {
    const s = load();
    if (!s.encryptedKey) throw Error('请先在 API 设置中保存密钥');
    if (!safeStorage.isEncryptionAvailable()) throw Error('系统加密存储不可用');
    let key;
    try { key = safeStorage.decryptString(Buffer.from(s.encryptedKey, 'base64')); }
    catch { throw Error('无法解密密钥，请在设置中重新填写'); }
    const headers = {'Content-Type': 'application/json'};
    headers[s.auth === 'api-key' ? 'api-key' : 'Authorization'] = s.auth === 'api-key' ? key : 'Bearer ' + key;
    const body = {model: s.model, messages, stream: false, max_completion_tokens: 1024};
    if (new URL(s.baseUrl).hostname === 'api.xiaomimimo.com') body.thinking = {type: 'disabled'};
    let response;
    try {
      response = await fetchImpl(endpoint(s.baseUrl), {method: 'POST', headers, body: JSON.stringify(body),
        redirect: 'error', signal: AbortSignal.timeout(60000)});
    } catch { throw Error('API 连接失败或超过 60 秒，请检查地址和网络'); }
    if (!response.ok) {
      const explanation = {401: '密钥无效或已过期', 403: '没有该模型的访问权限', 429: '额度不足或请求过于频繁'}[response.status];
      throw Error(explanation || `模型服务返回 HTTP ${response.status}，请检查地址和模型名称`);
    }
    const raw = await response.text();
    if (raw.length > 2_000_000) throw Error('模型响应过大');
    let data;
    try { data = JSON.parse(raw); } catch { throw Error('模型返回了无法解析的响应'); }
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) throw Error('模型没有返回可显示的文字');
    // Never persist or display the secret even if a service echoes it back.
    return text.replaceAll(key, '[密钥已隐藏]').trim().slice(0, 12000);
  }
  async function roleData(id) {
    const role = await service.find(id);
    if (!/^[a-zA-Z0-9_-]+$/.test(role.id)) throw Error('角色 ID 无效');
    const personaFile = path.join(role.project, '人设.json');
    let persona = read(personaFile, null);
    if (persona && persona.characterId !== role.entry) throw Error('人设文件与角色目录不匹配，请检查角色 ID');
    if (!persona) {
      const local = read(path.join(role.project, 'config.json'), {});
      persona = {whisperPrompt: local.whisperPrompt || (role.entry === 'main'
        ? '你是主人桌面上的Q版蓝发小女仆，会时不时碎碎念一句。说话要自然随意、短短一句（20字以内），温柔乖巧带点俏皮，说人话不啰嗦，不要解释你自己，不要提你是AI。'
        : `你是主人桌面上的Q版${role.name}。说话自然随意、简短，不要解释你自己，不要提你是AI。`)};
    }
    const prompt = persona.whisperPrompt;
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 10000) throw Error('角色人设为空或过长');
    const historyFile = path.join(role.project, '对话记录', role.id + '.json');
    const messages = read(historyFile, []);
    if (!Array.isArray(messages) || messages.some(m => !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string')) throw Error('角色聊天记录损坏，请备份后检查');
    return {role, personaFile, prompt, historyFile, messages};
  }
  async function history(id) {
    const d = await roleData(id);
    return {name: d.role.name, prompt: d.prompt, messages: d.messages.slice(-40)};
  }
  async function send(id, text) {
    if (typeof text !== 'string' || !text.trim() || text.length > 4000) throw Error('请输入 1–4000 字的消息');
    if (pending.has(id)) throw Error('这个角色正在回复，请稍候');
    pending.add(id);
    try {
      const d = await roleData(id), rounds = load().rounds;
      const recent = rounds ? d.messages.slice(-rounds * 2).map(({role, content}) => ({role, content})) : [];
      const answer = await complete([{role: 'system', content: d.prompt + '\n你的名字是' + d.role.name + '。'}, ...recent, {role: 'user', content: text.trim()}]);
      const now = new Date().toISOString();
      d.messages.push({role: 'user', content: text.trim(), ts: now}, {role: 'assistant', content: answer, ts: now});
      write(d.historyFile, d.messages.slice(-1000));
      onChanged(id);
      let bubbleDelivered = false;
      if (d.role.visible) {
        try { const result = await service.request('/dsh-pet-7340/broadcast?pet=' + encodeURIComponent(id), 'POST', {text: answer}); bubbleDelivered = result.ok !== false; } catch {}
      }
      return {id, answer, bubbleDelivered};
    } finally { pending.delete(id); }
  }
  return {settings: publicSettings, save, history, send, test: async () => {
    await complete([{role: 'user', content: '请只回复：连接成功'}]);
    return {ok: true};
  }};
}
module.exports = {createAI};
