(() => {
  const api = window.petClient;
  const dialog = document.createElement('dialog');
  dialog.className = 'pl-dialog';
  // 静态结构；动作名一律用 textContent 渲染
  dialog.innerHTML = `
    <header class="pl-head"><div><h2 id="pl-title">轮播编排</h2><p>自己挑选哪些动作轮流播放，决定先后顺序，也能在任意位置插入。</p></div><button id="pl-close" type="button" class="quiet">完成</button></header>
    <div class="pl-body">
      <div class="pl-switch-row"><div class="row-text"><span class="row-label">自动轮播动作</span><span class="row-note">开启后按下面的顺序一个接一个播放，播完回到开头；「待机观望」也是一项，多放几次就能拉长待机。关闭时只待机。</span></div><button id="pl-enabled" class="switch" role="switch" aria-checked="false" aria-label="自动轮播动作"></button></div>
      <h3 class="pl-sub">轮播顺序 <small>按住条目直接拖动排序，也可点 ↑ ↓；「插入」在这一项后面加入动作</small></h3>
      <div id="pl-list" class="pl-list"></div>
      <h3 class="pl-sub">全部动作 <small>点一下加入末尾，同一动作可重复</small></h3>
      <div id="pl-pool" class="pl-pool"></div>
    </div>
    <footer class="pl-foot"><span id="pl-status" role="status" aria-live="polite"></span><button id="pl-reset" type="button" class="quiet">恢复默认顺序</button><button id="pl-clear" type="button" class="quiet">清空列表</button></footer>`;
  document.body.append(dialog);
  const $ = id => dialog.querySelector('#' + id);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const clean = e => String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPRING = 'cubic-bezier(.34,1.56,.64,1)', EASE = 'cubic-bezier(.2,.8,.2,1)';
  let entry = '', seq = 0, items = [], enabled = true, available = [], defaults = [], picker = -1, dragging = false, saveTimer = 0, statusTimer = 0, ticket = 0;
  const mk = name => ({ id: ++seq, name });
  const listEl = $('pl-list'), poolEl = $('pl-pool');

  function say(text, error = false) { const s = $('pl-status'); s.textContent = text; s.className = error ? 'pl-error' : ''; clearTimeout(statusTimer); if (text && !error) statusTimer = setTimeout(() => { s.textContent = ''; }, 2200); }
  // 改动先在界面上生效（带动画），随后 150ms 防抖写盘；轮播每秒读一次，无需通知宠物
  function persist() {
    clearTimeout(saveTimer);
    const mine = ticket, names = items.map(i => i.name), on = enabled, e = entry;
    saveTimer = setTimeout(async () => { try { await api.playlistSet(e, { enabled: on, list: names }); if (mine === ticket) say('已保存'); } catch (err) { say(clean(err), true); } }, 150);
  }

  // ---- FLIP：渲染前记下每行位置，渲染后让每行从旧位置滑到新位置；新行弹出 ----
  const snapshot = () => { const m = new Map(); listEl.querySelectorAll('.pl-item').forEach(n => m.set(n.dataset.id, n.getBoundingClientRect().top)); return m; };
  function flip(prev) {
    if (!prev || reduce()) return;
    listEl.querySelectorAll('.pl-item').forEach(n => {
      const old = prev.get(n.dataset.id), now = n.getBoundingClientRect().top;
      if (old === undefined) n.animate([{ opacity: 0, transform: 'scale(.9) translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: SPRING });
      else if (Math.abs(old - now) > 1) n.animate([{ transform: `translateY(${old - now}px)` }, { transform: 'none' }], { duration: 300, easing: EASE });
    });
  }
  function change(mutate) { const prev = snapshot(); mutate(); render(); flip(prev); persist(); }

  function render() {
    $('pl-enabled').setAttribute('aria-checked', String(enabled));
    listEl.replaceChildren();
    if (!items.length) listEl.append(el('p', 'pl-empty', '列表是空的：在下方「全部动作」点一下加入，或点「恢复默认顺序」。'));
    items.forEach((it, i) => {
      const wrap = el('div', 'pl-item'); wrap.dataset.id = it.id;
      const row = el('div', 'pl-row');
      const grip = el('span', 'pl-grip', '⠿'); grip.title = '按住拖动排序'; grip.setAttribute('aria-hidden', 'true');
      grip.addEventListener('pointerdown', e => startDrag(e, wrap, i, grip));
      // 直接按住整行（不用找 ⠿）拖动即可
      wrap.addEventListener('pointerdown', e => { if (e.target.closest('button') || e.target.closest('.pl-grip') || e.target.closest('.pl-picker')) return; longPress(e, wrap, i); });
      row.append(grip, el('span', 'pl-no', String(i + 1)), el('span', 'pl-name', it.name));
      const tools = el('span', 'pl-tools-inline');
      const btn = (label, title, fn, off) => { const b = el('button', 'pl-btn', label); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.disabled = !!off; b.onclick = fn; return b; };
      tools.append(
        btn('↑', '上移', () => { picker = -1; change(() => { [items[i - 1], items[i]] = [items[i], items[i - 1]]; }); }, i === 0),
        btn('↓', '下移', () => { picker = -1; change(() => { [items[i + 1], items[i]] = [items[i], items[i + 1]]; }); }, i === items.length - 1),
        btn('插入', '在此动作后面插入一个动作', () => { const prev = snapshot(); picker = picker === it.id ? -1 : it.id; render(); flip(prev); }),
        btn('✕', '移出轮播', () => removeItem(it.id, wrap))
      );
      row.append(tools); wrap.append(row);
      if (picker === it.id) {
        const box = el('div', 'pl-picker'); box.append(el('span', 'pl-picker-title', '选一个动作，插到第 ' + (i + 1) + ' 位后面：'));
        for (const a of available) { const c = el('button', 'pill pl-chip', a); c.type = 'button'; c.onclick = () => { const at = items.findIndex(x => x.id === it.id); picker = -1; change(() => { items.splice(at + 1, 0, mk(a)); }); }; box.append(c); }
        wrap.append(box);
        if (!reduce()) box.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: EASE });
      }
      listEl.append(wrap);
    });
    poolEl.replaceChildren();
    for (const name of available) {
      const count = items.filter(x => x.name === name).length;
      const b = el('button', 'pill pl-pool-chip' + (count ? ' used' : ''), name); b.type = 'button';
      if (count) b.append(el('em', '', '×' + count));
      b.onclick = () => change(() => { picker = -1; items.push(mk(name)); });
      poolEl.append(b);
    }
    $('pl-clear').disabled = !items.length;
  }

  function removeItem(id, node) {
    const finish = () => change(() => { const at = items.findIndex(x => x.id === id); if (at >= 0) items.splice(at, 1); if (picker === id) picker = -1; });
    if (reduce()) return finish();
    node.style.pointerEvents = 'none';
    node.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(28px) scale(.96)' }], { duration: 170, easing: 'ease-in', fill: 'forwards' }).onfinish = finish;
  }

  // ---- 按住 ⠿ 拖动排序：被拖行跟手，其余行让位滑动，松手后落入位置 ----
  // 直接按住条目就能拖：按下后只要移动超过 5px 立刻进入拖动（不用长按）；没移动就是普通点击
  function longPress(e, row, from) {
    if (dragging || e.button > 0) return;
    const id = e.pointerId, sx = e.clientX, sy = e.clientY;
    const cancel = () => { window.removeEventListener('pointermove', watch, true); window.removeEventListener('pointerup', cancel, true); window.removeEventListener('pointercancel', cancel, true); };
    const watch = ev => { if (ev.pointerId !== id) return; if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) { cancel(); startDrag({ clientY: sy, pointerId: id, button: 0, preventDefault() {} }, row, from, row, true); } };
    window.addEventListener('pointermove', watch, true); window.addEventListener('pointerup', cancel, true); window.addEventListener('pointercancel', cancel, true);
  }
  function startDrag(e, row, from, handle, lifted) {
    if (dragging || e.button > 0) return;
    e.preventDefault(); picker = -1;
    if (listEl.querySelector('.pl-picker')) { render(); row = listEl.querySelectorAll('.pl-item')[from]; if (lifted) handle = row; }
    dragging = true;
    const nodes = [...listEl.querySelectorAll('.pl-item')], rects = nodes.map(n => n.getBoundingClientRect());
    const h = rects[from].height, startY = e.clientY, minDy = rects[0].top - rects[from].top, maxDy = rects[rects.length - 1].top - rects[from].top;
    let to = from, dy = 0;
    const grip = handle || row.querySelector('.pl-grip'); try { grip.setPointerCapture(e.pointerId); } catch {}
    row.classList.add('dragging');
    nodes.forEach(n => { if (n !== row) n.style.transition = reduce() ? 'none' : `transform .22s ${EASE}`; });
    const place = () => nodes.forEach((n, k) => { if (n === row) return; n.style.transform = from < to && k > from && k <= to ? `translateY(${-h}px)` : from > to && k < from && k >= to ? `translateY(${h}px)` : ''; });
    const move = ev => {
      dy = Math.max(minDy, Math.min(maxDy, ev.clientY - startY));
      row.style.transform = `translateY(${dy}px) scale(1.02)`;
      const center = rects[from].top + dy + h / 2; let t = from;
      for (let k = 0; k < rects.length; k++) if (center > rects[k].top + rects[k].height / 2) t = k; else if (k === 0) t = 0;
      if (t !== to) { to = t; place(); }
    };
    const up = () => {
      grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
      const settle = rects[to].top - rects[from].top + (to > from ? rects[to].height - h : 0);
      row.style.transition = reduce() ? 'none' : `transform .24s ${SPRING}`; row.style.transform = `translateY(${settle}px)`;
      const done = () => {
        dragging = false;
        if (to !== from) { const [m] = items.splice(from, 1); items.splice(to, 0, m); persist(); }
        render();
      };
      if (reduce()) done(); else setTimeout(done, 250);
    };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
  }

  async function open(role) {
    entry = role.entry || 'main'; const mine = ++ticket;
    $('pl-title').textContent = '轮播编排 · ' + (role.name || '');
    items = []; available = []; picker = -1; enabled = true; render(); say('正在读取…');
    if (!dialog.open) dialog.showModal();
    try {
      const p = await api.playlistGet(entry); if (mine !== ticket) return;
      enabled = p.enabled; items = p.list.map(mk); available = p.available; defaults = p.defaults; say(''); render();
      listEl.querySelectorAll('.pl-item').forEach((n, k) => { if (!reduce()) n.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: Math.min(k, 8) * 30, easing: EASE, fill: 'backwards' }); });
    } catch (e) { say(clean(e), true); }
  }
  window.openPlaylist = open;
  $('pl-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { ++ticket; dragging = false; });
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  $('pl-enabled').onclick = () => { enabled = !enabled; render(); persist(); say(enabled ? '自动轮播已开启' : '自动轮播已关闭，只待机'); };
  $('pl-reset').onclick = () => { picker = -1; change(() => { items = defaults.map(mk); }); say('已恢复默认顺序'); };
  $('pl-clear').onclick = () => { picker = -1; change(() => { items = []; }); say('列表已清空；开启轮播时将只待机'); };
})();
