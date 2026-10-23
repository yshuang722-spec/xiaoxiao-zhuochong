'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function cleanupOldLogs(dir, now = new Date()) {
  const resolved = path.resolve(dir);
  if (path.basename(resolved) !== '日志' || fs.realpathSync(resolved).toLowerCase() !== resolved.toLowerCase()) throw Error('Unsafe log cleanup path');
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(now);
  const cutoff = Date.parse(today + 'T00:00:00Z') - 10 * 86400000;
  const removed = [];
  for (const name of fs.readdirSync(resolved)) {
    const match = /^(运行|调整)-(\d{4}-\d{2}-\d{2})(?:-\d+)?\.(txt|jsonl)$/.exec(name);
    if (!match) continue;
    const stamp = Date.parse(match[2] + 'T00:00:00Z');
    if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== match[2] || stamp >= cutoff) continue;
    const file = path.join(resolved, name);
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    fs.unlinkSync(file); removed.push(name);
  }
  return removed;
}
function createRoleLogger({ entry, petId, name, root, codeRoot = __dirname, watchChanges = true }) {
  if (!/^[\p{L}\p{N}_-]{1,80}$/u.test(entry)) throw Error('Invalid role log directory');
  root ||= path.join(process.env.DSH_HOME || path.join(os.homedir(), '.dsh'), 'dsh-pet', 'characters');
  // Helper launch metadata contains the pet id, which can differ from its folder.
  if (!fs.existsSync(path.join(root, entry)) && fs.existsSync(root)) {
    for (const candidate of fs.readdirSync(root, { withFileTypes: true })) {
      if (!candidate.isDirectory() || !/^[\p{L}\p{N}_-]{1,80}$/u.test(candidate.name)) continue;
      for (const file of ['config.json', 'config.jsonc']) {
        try { if (JSON.parse(fs.readFileSync(path.join(root, candidate.name, file), 'utf8').replace(/^\uFEFF/, '')).pets?.some(p => p.id === petId)) entry = candidate.name; } catch {}
      }
    }
  }
  const project = path.join(root, entry), dir = path.join(project, '日志');
  if (!name || name === petId) {
    for (const file of ['config.json', 'config.jsonc']) {
      try {
        name = JSON.parse(fs.readFileSync(path.join(project, file), 'utf8').replace(/^\uFEFF/, '')).pets?.[0]?.name || name;
        if (name && name !== petId) break;
      } catch {}
    }
  }
  fs.mkdirSync(dir, { recursive: true });
  const manifestPath = path.join(dir, '当前版本.json');
  let previous = {};
  try { previous = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch {}
  let timer, stopped = false, failed = false, nextCleanup = 0;
  const session = `${process.pid}-${Date.now()}`;
  function record(event, details = {}, adjustment = false) {
    if (failed) return;
    try {
      const now = new Date();
      const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(now);
      const stem = path.join(dir, `${adjustment ? '调整' : '运行'}-${day}`);
      let file = `${stem}.jsonl`, part = 0;
      while (fs.existsSync(file) && fs.statSync(file).size > 10 * 1024 * 1024) file = `${stem}-${++part}.jsonl`;
      const localTime = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
      fs.appendFileSync(file, JSON.stringify({ 时间: now.toISOString(), 本地时间: localTime, 角色: name, 角色ID: petId, 会话: session, 事件: event, 详情: details }) + '\n', 'utf8');
      fs.appendFileSync(file.replace(/\.jsonl$/, '.txt'), `[${localTime}] [${name}] ${event}\n${JSON.stringify(details, null, 2)}\n\n`, 'utf8');
    } catch (error) { failed = true; console.error('[pet-log] log write failed: ' + error.message); }
  }
  function scan() {
    if (stopped || failed) return;
    try {
      if (Date.now() >= nextCleanup) {
        const removed = cleanupOldLogs(dir);
        nextCleanup = Date.now() + 3600000;
        if (removed.length) record('旧日志自动清理', { 保留规则: '按北京时间日志日期计算，超过10天删除', 删除文件: removed });
      }
      const files = [];
      for (const name of ['config.json', 'config.jsonc']) {
        const file = path.join(project, name); if (fs.existsSync(file)) files.push([name, file, '配置']);
      }
      const animDir = path.join(project, 'animations');
      if (fs.existsSync(animDir)) for (const name of fs.readdirSync(animDir)) {
        if (name.endsWith('.webm')) files.push([`animations/${name}`, path.join(animDir, name), '素材']);
      }
      for (const name of ['main.js', 'preload.js', 'sprite.js', 'role-log.js', 'collision-link.cjs', 'role-audit-runner.cjs', 'canvas-layout.js', 'index.html']) {
        const file = path.join(codeRoot, name); if (fs.existsSync(file)) files.push([`程序/${name}`, file, '程序']);
      }
      const clientRoot = path.resolve(codeRoot, '../../../app/client');
      for (const name of ['main.cjs', 'service.cjs', 'preload.cjs']) {
        const file = path.join(clientRoot, name); if (fs.existsSync(file)) files.push([`客户端/${name}`, file, '程序']);
      }
      const next = {};
      for (const [key, file, kind] of files) {
        const stat = fs.statSync(file), old = previous[key];
        const hash = old && old.bytes === stat.size && old.mtime === stat.mtimeMs ? old.sha256 : sha(file);
        const item = { bytes: stat.size, mtime: stat.mtimeMs, sha256: hash };
        if (kind === '配置') {
          try {
            // Store only pet appearance/playback settings, never prompts, API keys or chat.
            const c = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
            item.settings = { pets: (c.pets || []).map(p => ({ id: p.id, name: p.name, size: p.size, display: p.display, position: p.position, fixedEnabled: p.fixedEnabled })), animations: c.animations, animationWeights: c.animationWeights };
          } catch { item.settings = 'JSONC配置仅记录文件校验值'; }
        }
        next[key] = item;
        if (!old || old.sha256 !== hash) record(old ? `${kind}修改` : `${kind}基线`, { 文件: key, 之前: old || null, 之后: item }, true);
      }
      for (const key of Object.keys(previous)) if (!next[key]) record('文件移除', { 文件: key, 之前: previous[key] }, true);
      if (JSON.stringify(previous) !== JSON.stringify(next)) {
        const temp = `${manifestPath}.${process.pid}.tmp`;
        fs.writeFileSync(temp, JSON.stringify(next, null, 2), 'utf8'); fs.renameSync(temp, manifestPath);
      }
      previous = next;
    } catch (error) { record('版本扫描失败', { 错误: error.message }); }
  }
  function start() {
    record('角色启动', { 程序PID: process.pid });
    if (watchChanges) { scan(); timer = setInterval(scan, 5000); timer.unref?.(); }
  }
  function stop() { if (stopped) return; record('角色关闭'); clearInterval(timer); stopped = true; }
  return { dir, record, scan, start, stop };
}
function startRoleAudit({ root, codeRoot = __dirname }) {
  const logs = new Map();
  const scan = () => {
    try {
      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory() || !/^[\p{L}\p{N}_-]{1,80}$/u.test(entry.name)) continue;
        let file = ['config.json', 'config.jsonc'].map(n => path.join(root, entry.name, n)).find(fs.existsSync);
        if (!file) continue;
        if (!logs.has(entry.name)) {
          let pet = {};
          try { pet = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')).pets?.[0] || {}; } catch {}
          const log = createRoleLogger({ entry: entry.name, petId: pet.id || entry.name, name: pet.name || entry.name, root, codeRoot });
          log.record('调整监测启用', { 检测间隔秒: 5 }, true); logs.set(entry.name, log);
        }
        logs.get(entry.name).scan();
      }
    } catch (error) { console.error('[pet-log] audit failed: ' + error.message); }
  };
  scan(); const timer = setInterval(scan, 5000); timer.unref?.();
  return () => clearInterval(timer);
}
module.exports = { createRoleLogger, startRoleAudit, cleanupOldLogs };
