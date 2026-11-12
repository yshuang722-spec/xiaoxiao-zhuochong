'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const valid = p => p && Number.isFinite(p.cx) && Number.isFinite(p.cy) && Math.abs(p.cx) < 100000 && Math.abs(p.cy) < 100000;
function createPositionStore({home, delay = 200}) {
  const root = path.join(home, 'dsh-pet', 'desktop-positions');
  const pending = new Map(), latest = new Map();
  const file = id => path.join(root, crypto.createHash('sha256').update(id).digest('hex') + '.json');
  function flush(id) {
    const ids = id === undefined ? [...pending.keys()] : [id];
    for (const key of ids) {
      const entry = pending.get(key); if (!entry) continue;
      clearTimeout(entry.timer); pending.delete(key);
      try {
        fs.mkdirSync(root, {recursive: true});
        const destination = file(key), temp = destination + '.' + process.pid + '.tmp';
        fs.writeFileSync(temp, JSON.stringify({id:key, ...entry.position}));
        fs.renameSync(temp, destination);
      } catch (error) { console.error('[pet-position] save failed: ' + error.message); }
    }
  }
  return {
    load(id) {
      if (latest.has(id)) return {...latest.get(id)};
      try { const value = JSON.parse(fs.readFileSync(file(id), 'utf8')); return value.id === id && valid(value) ? {cx:value.cx,cy:value.cy} : null; } catch { return null; }
    },
    save(id, position, flying = false) {
      if (typeof id !== 'string' || !valid(position)) return;
      const previous = latest.get(id);
      const entry = pending.get(id);
      if (previous?.cx === position.cx && previous?.cy === position.cy && !(entry && !entry.timer && !flying)) return;
      latest.set(id, {...position});
      const next = entry || {timer:null};
      next.position = {...position};
      if (flying && next.timer) { clearTimeout(next.timer); next.timer = null; }
      if (!flying && !next.timer) {
        next.timer = setTimeout(() => flush(id), delay);
        next.timer.unref?.();
      }
      pending.set(id, next);
    },
    flush,
  };
}
module.exports = {createPositionStore};
