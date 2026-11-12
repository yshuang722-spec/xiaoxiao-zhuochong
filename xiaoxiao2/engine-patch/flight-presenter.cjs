'use strict';
const {spawn} = require('node:child_process');
const path = require('node:path');
const readline = require('node:readline');

function createFlightPresenter(win, restorePosition) {
  let initialized;
  const initializedPromise = new Promise(resolve => { initialized = resolve; });
  const bytes = win.getNativeWindowHandle();
  const hwnd = bytes.length === 8 ? bytes.readBigUInt64LE() : bytes.readUInt32LE();
  const child = spawn(path.join(__dirname,'flight-presenter.exe'),[String(hwnd),String(process.pid)],
    {windowsHide:true,stdio:['pipe','pipe','ignore']});
  let ready = false, moving = false, sequence = 0, closed = false;
  let segment = 0, lastImpact, lastPadX, lastPadY;
  function failed() {
    initialized();
    ready = false;
    if (moving && !closed) restorePosition();
    moving = false;
  }
  child.on('error',failed);
  child.on('exit',failed);
  child.stdin.on('error',failed);
  const lines=readline.createInterface({input:child.stdout});
  lines.on('line', line => {
    if (line === 'ready') { ready = true; initialized(); }
    if (line === 'raise' && !closed && !win.isDestroyed() && win.isVisible()) {
      win.setAlwaysOnTop(true, 'screen-saver');
    }
    if (!moving && !closed && line === 'idle ' + sequence) restorePosition();
  });
  return {
    initialized: initializedPromise,
    checkTopmost() {
      if (!ready || !child.stdin.writable) return false;
      child.stdin.write('Z\n');
      return true;
    },
    move(rect, bounds, centerX, centerY) {
      if (!ready || !child.stdin.writable) return false;
      const changed = !moving || bounds.ceilingContact || bounds.impact !== lastImpact || bounds.pad !== lastPadX || bounds.padY !== lastPadY;
      if (changed) {
        segment++;
        lastImpact = bounds.impact; lastPadX = bounds.pad; lastPadY = bounds.padY;
      }
      moving = true;
      if (changed || child.stdin.writableLength < 4096) child.stdin.write(['M',segment,bounds.frameTime,
        rect.x,rect.y,bounds.vx,bounds.vy,Math.round(centerX),Math.round(centerY)].join(' ')+'\n');
      return true;
    },
    stop() {
      if (!moving) return false;
      moving = false;
      if (ready && child.stdin.writable) child.stdin.write('P '+(++sequence)+'\n');
      return true;
    },
    close() { closed = true; moving = false; child.stdin.end(); }
  };
}
module.exports = {createFlightPresenter};
