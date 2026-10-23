(() => {
  const api = window.petClient;
  const nav = document.querySelector('nav'), home = document.querySelector('main');
  const section = document.createElement('main');
  section.hidden = true;
  section.id = 'settings-page';
  // Static markup only; all model and user content below is rendered with textContent.
  section.innerHTML = `
    <header><div><h1>API 与角色对话</h1><p>共用模型连接，每个角色保留独立人设和聊天记录。</p></div><button id="settings-back" class="quiet">返回我的角色</button></header>
    <p id="ai-feedback" role="status" aria-live="polite"></p>
    <section class="ai-section" aria-labelledby="connection-title"><h2 id="connection-title">模型连接</h2>
    <form id="ai-form" class="ai-form">
    <label for="ai-url">API 地址<input id="ai-url" type="url" required autocomplete="off" placeholder="https://api.xiaomimimo.com/v1"></label>
    <label for="ai-model">模型名称<input id="ai-model" required maxlength="150" placeholder="填写服务商提供的模型 ID"></label>
    <label for="ai-auth">认证方式<select id="ai-auth"><option value="api-key">MiMo（api-key）</option><option value="bearer">Bearer</option></select></label>
    <label for="ai-rounds">每次携带的历史轮数<input id="ai-rounds" type="number" min="0" max="20" step="1" required></label>
    <label for="ai-key" class="ai-wide">API Key<input id="ai-key" type="password" autocomplete="new-password" spellcheck="false" maxlength="4096"><span id="ai-key-state" class="ai-hint"></span></label>
    <div class="ai-wide ai-buttons"><button type="submit" class="primary">保存设置</button><button type="button" id="ai-test" class="quiet">测试已保存的连接</button><button type="button" id="ai-remove" class="quiet">移除已保存的密钥</button></div>
    </form><p class="ai-hint">密钥使用 Windows 系统加密保存在本机。测试连接会发送一次简短请求，可能产生 API 费用。更改后请先保存。</p></section>
    <section class="ai-section" aria-labelledby="conversation-title"><h2 id="conversation-title">角色对话</h2>
    <label for="ai-role">选择聊天角色</label><select id="ai-role"></select>
    <details class="ai-persona"><summary>查看当前角色人设</summary><p id="ai-persona"></p></details>
    <div id="ai-messages" class="ai-messages" role="log" aria-label="当前角色聊天记录" aria-live="polite"></div>
    <form id="ai-chat"><label for="ai-text">对它说些什么</label><textarea id="ai-text" maxlength="4000" rows="3" required placeholder="输入消息…"></textarea><button class="primary" type="submit">发送</button><span id="ai-chat-state" role="status"></span></form>
    <p class="ai-hint">每个实例独立保存最近 500 轮对话，每次按上方轮数发送给模型；桌面显示中的角色会用气泡展示回复。此页不会自动开启碎碎念。</p></section>`;
  document.body.append(section);
  const menu = document.createElement('details');
  menu.className = 'settings-nav';
  menu.innerHTML = '<summary>设置</summary><button id="open-ai">API 与角色对话</button>';
  nav.append(menu);
  const $ = id => document.getElementById(id);
  let currentRole = '', roleName = '', historyTicket = 0, sending = false, working = false;
  function feedback(text, error = false) { $('ai-feedback').textContent = text; $('ai-feedback').className = error ? 'error' : ''; }
  function clean(error) { return error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, ''); }
  function addMessage(role, text) {
    const row = document.createElement('div'); row.className = 'ai-message';
    const title = document.createElement('strong'); title.textContent = role === 'user' ? '你' : roleName;
    const content = document.createElement('p'); content.textContent = text;
    row.append(title, content); $('ai-messages').append(row);
  }
  function fillSettings(s) {
    $('ai-url').value = s.baseUrl; $('ai-model').value = s.model;
    $('ai-auth').value = s.auth; $('ai-rounds').value = s.rounds;
    $('ai-key').value = '';
    $('ai-key-state').textContent = s.hasKey ? '已保存密钥；留空保留原密钥。' : '尚未保存密钥。';
    if (!s.secureStorage) feedback('系统加密存储不可用，当前无法保存密钥。', true);
  }
  function input() { return {baseUrl: $('ai-url').value.trim(), model: $('ai-model').value.trim(), auth: $('ai-auth').value, rounds: Number($('ai-rounds').value), key: $('ai-key').value}; }
  async function task(fn) {
    if (working) return;
    working = true;
    $('ai-form').querySelectorAll('button').forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { feedback(clean(e), true); }
    finally { working = false; $('ai-form').querySelectorAll('button').forEach(b => b.disabled = false); }
  }
  async function loadHistory() {
    const id = $('ai-role').value, ticket = ++historyTicket;
    currentRole = id; $('ai-messages').replaceChildren(); $('ai-persona').textContent = '';
    if (!id) { $('ai-chat').querySelector('button').disabled = true; return; }
    try {
      const h = await api.aiHistory(id);
      if (ticket !== historyTicket) return;
      roleName = h.name; $('ai-persona').textContent = h.prompt;
      for (const m of h.messages) addMessage(m.role, m.content);
      if (!h.messages.length) $('ai-messages').textContent = '还没有聊天记录，和这个角色打个招呼吧。';
      $('ai-chat').querySelector('button').disabled = sending;
    } catch (e) { feedback(clean(e), true); $('ai-chat').querySelector('button').disabled = true; }
  }
  async function open() {
    home.hidden = true; section.hidden = false;
    nav.querySelector('button').removeAttribute('aria-current'); $('open-ai').setAttribute('aria-current', 'page');
    try {
      const [s, list] = await Promise.all([api.aiSettings(), api.list()]);
      fillSettings(s); $('ai-role').replaceChildren();
      for (const r of list) { const o = document.createElement('option'); o.value = r.id; o.textContent = r.name; $('ai-role').append(o); }
      if ([...$('ai-role').options].some(o => o.value === currentRole)) $('ai-role').value = currentRole;
      await loadHistory(); $('ai-url').focus();
    } catch (e) { feedback(clean(e), true); }
  }
  function close() { section.hidden = true; home.hidden = false; nav.querySelector('button').setAttribute('aria-current', 'page'); $('open-ai').removeAttribute('aria-current'); }
  $('open-ai').onclick = open; $('settings-back').onclick = close; nav.querySelector('button').onclick = close;
  $('ai-role').onchange = loadHistory;
  api.onAIChanged(id => {if (id === currentRole && !sending && !section.hidden) void loadHistory();});
  $('ai-form').onsubmit = e => { e.preventDefault(); void task(async () => { fillSettings(await api.aiSave(input())); feedback('模型设置已保存，所有角色共用此连接。'); }); };
  $('ai-test').onclick = () => task(async () => { feedback('正在测试连接…'); await api.aiTest(); feedback('连接成功，模型已返回文字。'); });
  $('ai-remove').onclick = () => task(async () => { const s = await api.aiSettings(); fillSettings(await api.aiSave({...s, key: '', clearKey: true})); feedback('已移除密钥。'); });
  $('ai-chat').onsubmit = async e => {
    e.preventDefault(); if (sending || !currentRole) return;
    const id = currentRole, text = $('ai-text').value.trim(); if (!text) return;
    sending = true; $('ai-role').disabled = true; $('ai-chat').querySelector('button').disabled = true;
    $('ai-chat-state').textContent = '正在回复…';
    try {
      const reply = await api.aiSend(id, text);
      $('ai-text').value = '';
      await loadHistory();
      $('ai-chat-state').textContent = reply.bubbleDelivered ? '已回复并显示桌面气泡' : '已回复';
      $('ai-messages').scrollTop = $('ai-messages').scrollHeight;
    } catch (error) { $('ai-chat-state').textContent = '发送失败，输入已保留'; feedback(clean(error), true); }
    finally { sending = false; $('ai-role').disabled = false; $('ai-chat').querySelector('button').disabled = !currentRole; }
  };
})();
