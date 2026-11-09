// 角色卡直接用鼠标抓取换位：按住卡片空白处拖动，其他卡片顺滑让位，松手后卡片落入新位置。
(() => {
  const box = document.querySelector('#characters');
  if (!box) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const SLIDE = 'transform .28s cubic-bezier(.2,.8,.2,1)';
  const SETTLE = 'transform .34s cubic-bezier(.34,1.3,.64,1), box-shadow .3s ease';
  const SKIP = 'button,a,input,select,textarea,label,video,[role=listbox],[role=option],.picker,[data-nodrag]';
  const cards = () => [...box.querySelectorAll(':scope > .character[data-entry]')];
  const scroller = (() => {
    for (let n = box.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY;
      if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) return n;
    }
    return null;
  })();
  const scrollTop = () => (scroller ? scroller.scrollTop : window.scrollY);
  const scrollLeft = () => (scroller ? scroller.scrollLeft : window.scrollX);
  let st = null, justDragged = false;

  const pageRect = el => { const r = el.getBoundingClientRect(); return { x: r.left + scrollLeft(), y: r.top + scrollTop(), w: r.width, h: r.height }; };
  const dur = (v) => (reduce.matches ? 'none' : v);

  function begin(e, card) {
    const list = cards();
    st = {
      card, id: e.pointerId, sx: e.clientX, sy: e.clientY, s0x: scrollLeft(), s0y: scrollTop(),
      list, from: list.indexOf(card), to: list.indexOf(card), rects: list.map(pageRect),
      px: e.clientX, py: e.clientY, active: false, raf: 0
    };
  }

  function lift() {
    const { card, list } = st;
    st.active = true;
    card.classList.remove('enter', 'hop');
    card.getAnimations?.().forEach(a => a.cancel());
    card.classList.add('lifted');
    card.style.zIndex = '30';
    card.style.transition = 'none';
    card.style.willChange = 'transform';
    list.forEach(c => { if (c !== card) { c.style.willChange = 'transform'; c.style.zIndex = '1'; } });
    document.body.classList.add('card-dragging');
    try { card.setPointerCapture(st.id); } catch {}
    tick();
  }

  // 目标位置：指针所在位置离哪个格子中心最近
  function slotAt(cx, cy) {
    let best = st.to, bd = Infinity;
    st.rects.forEach((r, i) => {
      const d = (cx - (r.x + r.w / 2)) ** 2 + (cy - (r.y + r.h / 2)) ** 2;
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function layout() {
    const { list, from, to, rects, card } = st;
    const next = list.filter(c => c !== card);
    next.splice(to, 0, card);
    next.forEach((c, k) => {
      if (c === card) return;
      const j = list.indexOf(c), a = rects[j], b = rects[k];
      c.style.transition = dur(SLIDE);
      c.style.transform = a === b ? '' : `translate(${b.x - a.x}px,${b.y - a.y}px)`;
    });
  }

  function follow() {
    const { card, rects, from } = st;
    const dx = st.px - st.sx + scrollLeft() - st.s0x, dy = st.py - st.sy + scrollTop() - st.s0y;
    card.style.transform = `translate(${dx}px,${dy}px) scale(1.03)`;
    const r = rects[from];
    const to = slotAt(r.x + r.w / 2 + dx, r.y + r.h / 2 + dy);
    if (to !== st.to) { st.to = to; layout(); }
  }

  function tick() {
    if (!st || !st.active) return;
    // 靠近可视区边缘时自动滚动
    const view = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: innerHeight };
    const edge = 56, speed = 14;
    let dy = 0;
    if (st.py < view.top + edge) dy = -speed * Math.min(1, (view.top + edge - st.py) / edge);
    else if (st.py > view.bottom - edge) dy = speed * Math.min(1, (st.py - (view.bottom - edge)) / edge);
    if (dy) { (scroller || window).scrollBy(0, dy); follow(); }
    st.raf = requestAnimationFrame(tick);
  }

  function clearStyles(c) {
    c.style.transform = ''; c.style.transition = ''; c.style.zIndex = ''; c.style.willChange = '';
  }

  function finish(commit) {
    if (!st) return;
    const s = st; st = null;
    cancelAnimationFrame(s.raf);
    document.body.classList.remove('card-dragging');
    try { s.card.releasePointerCapture(s.id); } catch {}
    if (!s.active) return;
    justDragged = true; setTimeout(() => { justDragged = false; }, 60);
    const to = commit ? s.to : s.from;
    const moved = to !== s.from;
    const dest = s.rects[to], me = s.rects[s.from];
    // 落位：被抓的卡片滑到目标格，阴影收回
    s.card.classList.remove('lifted');
    s.card.style.transition = dur(SETTLE);
    s.card.style.transform = `translate(${dest.x - me.x}px,${dest.y - me.y}px)`;
    if (!commit) { s.to = s.from; s.list.forEach(c => { if (c !== s.card) { c.style.transition = dur(SLIDE); c.style.transform = ''; } }); }
    let done = false;
    const end = () => {
      if (done) return; done = true;
      // 先在同一帧内把 DOM 顺序改成新顺序并清除位移，肉眼不会看到闪动
      s.list.forEach(clearStyles);
      if (moved) {
        const next = s.list.filter(c => c !== s.card); next.splice(to, 0, s.card);
        next.forEach(c => box.appendChild(c));
        const order = next.map(c => c.dataset.entry);
        if (window.cardReorder) window.cardReorder(order);
      }
    };
    s.card.addEventListener('transitionend', e => { if (e.target === s.card && e.propertyName === 'transform') end(); });
    setTimeout(end, reduce.matches ? 0 : 420);
  }

  box.addEventListener('pointerdown', e => {
    if (st || e.button !== 0 || e.pointerType === 'touch') return;
    if (e.target.closest(SKIP) || document.body.classList.contains('busy')) return;
    const card = e.target.closest('.character[data-entry]');
    if (!card || card.parentElement !== box || cards().length < 2) return;
    begin(e, card);
  });
  addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id) return;
    st.px = e.clientX; st.py = e.clientY;
    if (!st.active) {
      if (Math.hypot(e.clientX - st.sx, e.clientY - st.sy) < 6) return;
      lift();
    }
    e.preventDefault();
    follow();
  });
  addEventListener('pointerup', e => { if (st && e.pointerId === st.id) finish(true); });
  addEventListener('pointercancel', e => { if (st && e.pointerId === st.id) finish(false); });
  addEventListener('blur', () => finish(false));
  addEventListener('keydown', e => { if (st && st.active && e.key === 'Escape') { e.preventDefault(); finish(false); } });
  addEventListener('click', e => { if (justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);
  addEventListener('selectstart', e => { if (st && st.active) e.preventDefault(); });
})();
