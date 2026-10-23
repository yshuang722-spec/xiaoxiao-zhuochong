// Live-session bridge: the next client launch owns its own audit timer.
const { startRoleAudit } = require('./role-log.js');
const path = require('node:path');
const parentPid = Number(process.argv[2]);
if (!Number.isSafeInteger(parentPid) || parentPid < 1) throw Error('Parent PID required');
const root = path.join(process.env.DSH_HOME || path.join(require('node:os').homedir(), '.dsh'), 'dsh-pet/characters');
const stop = startRoleAudit({ root });
setInterval(() => { try { process.kill(parentPid, 0); } catch { stop(); process.exit(0); } }, 5000);
