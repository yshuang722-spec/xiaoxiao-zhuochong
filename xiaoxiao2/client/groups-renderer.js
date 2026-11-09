(() => {
  const api = window.petClient;
  const dialog = document.createElement('dialog');
  dialog.className = 'pl-dialog';
  dialog.innerHTML = `
    <header class="pl-head"><div><h2 id="gp-title">动作分类</h2><p>把「小动作」等动作加进下面四个分类：点一下加入，再点一下移出。右键菜单和自动播放都会用到。</p></div><button id="gp-close" type="button" class="quiet">完成</button></header>
    <div class="pl-body" id="gp-body"></div>
    <footer class="pl-foot"><span id="gp-status" role="status" aria-live="polite"></span><button id="gp-reset" type="button" class="quiet">恢复默认分类</button></footer>`;
  document.body.append(dialog);
  const $ = id => dialog.querySelector('#' + id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const clean = e => String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  const SECTIONS = [['idle', '待机', '原地待着时循环的动作；原始待机动作固定保留'], ['turn', '转向', '左右转身时播放（随机选一个）'], ['drag', '拖拽', '被鼠标拖起来时播放'], ['clicks', '点击回应', '点它一下时播放（随机选一个）']];
  let entry = '', data = null, saveTimer = 0, statusTimer = 0, ticket = 0;
  function say(text, error = false) { const s = $('gp-status'); s.textContent = text; s.className = error ? 'pl-error' : ''; clearTimeout(statusTimer); if (text && !error) statusTimer = setTimeout(() => { s.textContent = ''; }, 2200); }
  function persist() {
    clearTimeout(saveTimer);
    const mine = ticket, e = entry, payload = JSON.parse(JSON.stringify(data.groups));
    saveTimer = setTimeout(async () => { try { await api.groupsSet(e, payload); if (mine === ticket) say('已保存，宠物菜单立即更新'); } catch (err) { say(clean(err), true); } }, 150);
  }
  function render() {
    const body = $('gp-body'); body.replaceChildren();
    for (const [key, label, note] of SECTIONS) {
      const h = el('h3', 'pl-sub', label); h.append(el('small', '', note + ' · 已选 ' + data.groups[key].length)); body.append(h);
      const box = el('div', 'pl-pool');
      for (const name of data.available) {
        const on = data.groups[key].includes(name), locked = key === 'idle' && name === data.locked;
        const b = el('button', 'pill pl-pool-chip' + (on ? ' used' : ''), (on ? '✓ ' : '') + name); b.type = 'button';
        if (locked) { b.disabled = true; b.title = '原始待机动作，必须保留'; }
        b.onclick = () => {
          const list = data.groups[key];
          if (on) { if (list.length <= 1) { say('每个分类至少要保留一个动作', true); return; } data.groups[key] = list.filter(n => n !== name); } else data.groups[key] = [...list, name];
          render(); persist();
        };
        box.append(b);
      }
      body.append(box);
    }
  }
  async function open(role) {
    entry = role.entry || 'main'; const mine = ++ticket; data = null;
    $('gp-title').textContent = '动作分类 · ' + (role.name || ''); $('gp-body').replaceChildren(); say('正在读取…');
    if (!dialog.open) dialog.showModal();
    try { const d = await api.groupsGet(entry); if (mine !== ticket) return; data = d; say(''); render(); } catch (e) { say(clean(e), true); }
  }
  window.openGroups = open;
  $('gp-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { ++ticket; });
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  $('gp-reset').onclick = async () => { clearTimeout(saveTimer); try { data = await api.groupsSet(entry, null); render(); say('已恢复默认分类'); } catch (e) { say(clean(e), true); } };
})();
