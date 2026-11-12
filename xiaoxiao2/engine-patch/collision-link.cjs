'use strict';
const net=require('node:net'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
function pipeName(home=process.env.DSH_HOME||path.join(os.homedir(),'.dsh')) {
  const key=crypto.createHash('sha256').update(path.resolve(home).toLowerCase()).digest('hex').slice(0,20);
  return process.platform==='win32'?`\\\\.\\pipe\\xiaoxiao-pet-collision-${key}`:path.join(os.tmpdir(),`xiaoxiao-pet-collision-${key}.sock`);
}
// Decode only when the video frame or its layout changes. Coordinates are
// physical pixels relative to the sprite anchor, just like the motion packets.
function decodeShape(frame) {
  if (!frame || ![frame.x, frame.y, frame.w, frame.h].every(n => Number.isFinite(n) && Math.abs(n) <= 100000) ||
      frame.w <= 0 || frame.h <= 0 || ![frame.cols, frame.rows].every(n => Number.isInteger(n) && n > 0 && n <= 160) ||
      typeof frame.runs !== 'string' || !frame.runs.length || frame.runs.length > 51200) return null;
  const bytes = Buffer.from(frame.runs, 'base64');
  if (!bytes.length || bytes.length % 3) return null;
  const strips = [], rows = Array.from({ length: frame.rows }, () => []);
  const bounds = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity };
  const cw = frame.w / frame.cols, ch = frame.h / frame.rows;
  for (let i = 0; i < bytes.length; i += 3) {
    const row = bytes[i], left = bytes[i + 1], right = bytes[i + 2];
    if (row >= frame.rows || right > frame.cols || left >= right) return null;
    const l = frame.x + (frame.flip ? frame.cols - right : left) * cw;
    const r = frame.x + (frame.flip ? frame.cols - left : right) * cw;
    const t = frame.y + row * ch, b = frame.y + (row + 1) * ch;
    const strip = { l, r, t, b };
    strips.push(strip);
    rows[row].push(strip);
    bounds.l = Math.min(bounds.l, l); bounds.r = Math.max(bounds.r, r);
    bounds.t = Math.min(bounds.t, t); bounds.b = Math.max(bounds.b, b);
  }
  return { bounds, strips, rows, top: frame.y, rowHeight: ch };
}

function overlaps(a, b, x, y) {
  return a.r + x > b.l && a.l + x < b.r && a.b + y > b.t && a.t + y < b.b;
}

// Only visit rows crossed by the moving strip, including exact endpoint contacts.
function visitStrips(a, b, x, y, dx, dy, visit) {
  const left = x + Math.min(0, dx), right = x + Math.max(0, dx);
  const top = y + Math.min(0, dy) - b.top, bottom = y + Math.max(0, dy) - b.top;
  for (const strip of a.strips) {
    const first = Math.max(0, Math.ceil((strip.t + top) / b.rowHeight) - 1);
    const last = Math.min(b.rows.length - 1, Math.floor((strip.b + bottom) / b.rowHeight));
    for (let i = first; i <= last; i++) {
      for (const other of b.rows[i]) {
        if (strip.r + right >= other.l && strip.l + left <= other.r && visit(strip, other)) return true;
      }
    }
  }
  return false;
}

function shapesOverlap(a, b, x, y) {
  return overlaps(a.bounds, b.bounds, x, y) &&
    visitStrips(a, b, x, y, 0, 0, (s, t) => overlaps(s, t, x, y));
}

// The gradient of local overlap area points into the contacted surface. Sampling
// over a few mask cells smooths the staircase normals of an angled silhouette.
function surfaceNormal(a, b, x, y, contact) {
  const radius = Math.min(12, Math.max(2, 3 * Math.min(a.rowHeight, b.rowHeight)));
  function area(ox, oy) {
    let total = 0;
    visitStrips(a, b, ox, oy, 0, 0, (s, t) => {
      const w = Math.min(s.r + ox, t.r) - Math.max(s.l + ox, t.l);
      const h = Math.min(s.b + oy, t.b) - Math.max(s.t + oy, t.t);
      if (w > 0 && h > 0) total += w * h;
    });
    return total;
  }
  let gx = 0, gy = 0;
  for (const offset of [-radius, 0, radius]) {
    const weight = offset === 0 ? 2 : 1;
    gx += weight * (area(x + radius, y + offset) - area(x - radius, y + offset));
    gy += weight * (area(x + offset, y + radius) - area(x + offset, y - radius));
  }
  const length = Math.hypot(gx, gy);
  return length > 1e-6 && gx * contact.nx + gy * contact.ny > 0
    ? { nx: gx / length, ny: gy / length } : contact;
}

// Entry time of two rectangles along this frame's actual displacement.
// A stationary axis must overlap. Merely sliding along an edge is a miss.
function sweep(a, b, x, y, dx, dy) {
  if (!dx && (a.r + x <= b.l || a.l + x >= b.r)) return null;
  if (!dy && (a.b + y <= b.t || a.t + y >= b.b)) return null;
  const left = (b.l - (a.r + x)) / dx, right = (b.r - (a.l + x)) / dx;
  const top = (b.t - (a.b + y)) / dy, bottom = (b.b - (a.t + y)) / dy;
  const tx = dx ? Math.min(left, right) : -Infinity;
  const ty = dy ? Math.min(top, bottom) : -Infinity;
  const entry = Math.max(tx, ty);
  const exit = Math.min(dx ? Math.max(left, right) : Infinity, dy ? Math.max(top, bottom) : Infinity);
  if (entry > 1 || exit <= Math.max(0, entry)) return null;
  return { time: entry, nx: tx >= ty ? Math.sign(dx) : 0, ny: ty > tx ? Math.sign(dy) : 0 };
}

// A changed animation can start a step already touching. Find a separating
// distance on the actual silhouette, so a grazing hand isn't pushed back by
// the penetration of the two whole bounding boxes.
function overlapContact(a, b, x, y) {
  if (!shapesOverlap(a, b, x, y)) return null;
  const A = a.bounds, B = b.bounds;
  const nx = A.l + A.r + 2 * x < B.l + B.r ? 1 : -1;
  const ny = A.t + A.b + 2 * y < B.t + B.b ? 1 : -1;
  function separation(sx, sy, hi) {
    let lo = 0;
    while (hi - lo > 0.25) {
      const mid = (lo + hi) / 2;
      if (shapesOverlap(a, b, x - sx * mid, y - sy * mid)) lo = mid;
      else hi = mid;
    }
    return hi;
  }
  const depthX = separation(nx, 0, nx > 0 ? A.r + x - B.l : B.r - A.l - x);
  const depthY = separation(0, ny, ny > 0 ? A.b + y - B.t : B.b - A.t - y);
  return depthX < depthY ? { time: 1, nx, ny: 0, depth: depthX } : { time: 1, nx: 0, ny, depth: depthY };
}

function solveMotion(previous, a, b) {
  if (!a.enabled || !b.enabled || a.held || b.held || (!a.flying && !b.flying) || !a.shape || !b.shape) return null;
  const canSweep = previous && previous.shape && previous.enabled && !previous.held && a.flying && previous.size === a.size;
  const dx = canSweep ? a.x - previous.x : 0, dy = canSweep ? a.y - previous.y : 0;
  const x = a.x - dx - b.x, y = a.y - dy - b.y;
  let contact = null;
  if (dx || dy) {
    if (!sweep(a.shape.bounds, b.shape.bounds, x, y, dx, dy)) return null;
    if (!shapesOverlap(a.shape, b.shape, x, y)) {
      visitStrips(a.shape, b.shape, x, y, dx, dy, (strip, other) => {
        const hit = sweep(strip, other, x, y, dx, dy);
        if (hit && hit.time >= 0 && (!contact || hit.time < contact.time)) contact = hit;
      });
    }
  }
  contact ??= overlapContact(a.shape, b.shape, a.x - b.x, a.y - b.y);
  if (!contact) return null;
  const { time, depth = 0 } = contact;
  const { nx, ny } = surfaceNormal(a.shape, b.shape, x + time * dx, y + time * dy, contact);
  const relative = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (relative < 20) return null;
  const m1 = a.size * a.size, m2 = b.size * b.size;
  const impulse = 1.78 * relative / (1 / m1 + 1 / m2);
  const moveA = depth * m2 / (m1 + m2), moveB = depth * m1 / (m1 + m2);
  return { time,
    a: { vx: a.vx - impulse / m1 * nx, vy: a.vy - impulse / m1 * ny,
      dx: dx * (time - 1) - contact.nx * moveA, dy: dy * (time - 1) - contact.ny * moveA },
    b: { vx: b.vx + impulse / m2 * nx, vy: b.vy + impulse / m2 * ny, dx: contact.nx * moveB, dy: contact.ny * moveB },
  };
}

function framed(socket, onMessage) {
  let buffer = '';
  socket.setEncoding('utf8');
  socket.on('data', chunk => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf('\n')) >= 0) {
      if (end > 65536) return socket.destroy();
      const row = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      try { onMessage(JSON.parse(row)); } catch {}
    }
    if (buffer.length > 65536) socket.destroy();
  });
}
function startBroker({home,onCollision=()=>{}}={}) {
  let retry,closing=false;
  const states=new Map(),owners=new Map(),clients=new Set();
  let nextImpact = Date.now() * 1000;
  const send=(socket,data)=>{if(socket&&!socket.destroyed&&socket.writable)socket.write(JSON.stringify(data)+'\n');};
  const server=net.createServer(socket=>{
    clients.add(socket);let id='';socket.on('error',()=>{});
    framed(socket,msg=>{
      if(msg.type==='hello'&&typeof msg.id==='string'&&/^[\p{L}\p{N}_.-]{1,80}$/u.test(msg.id)){
        if(owners.has(msg.id)&&owners.get(msg.id)!==socket){socket.destroy();return;}id=msg.id;owners.set(id,socket);send(socket,{type:'ready'});return;
      }
      if(!id||msg.type!=='state')return;
      const s=msg.state;
      if(!s||!['x','y','vx','vy','size','bottomPad'].every(k=>Number.isFinite(s[k]))||s.size<1||s.size>10000||Math.abs(s.x)>100000||Math.abs(s.y)>100000||Math.abs(s.vx)>20000||Math.abs(s.vy)>20000)return;
      const now=Date.now(),previous=states.get(id);
      const shape=Object.hasOwn(s,'shape')?decodeShape(s.shape):previous?.shape;
      // An in-flight report can arrive after the broker has resolved a hit
      // but before the renderer has received it. Only accept acknowledged motion.
      const impact = s.impact || 0;
      if (previous && impact !== previous.impact) {
        previous.shape = shape;
        return;
      }
      const a={...s,impact,shape,at:now};states.set(id,a);
      let first=null;
      for(const [other,b]of states){
        if(other===id||b.pending||now-b.at>5000)continue;
        const hit=solveMotion(previous,a,b);if(!hit)continue;
        if(!first||hit.time<first.hit.time)first={other,b,hit};
      }
      if(!first)return;
      const {other,b,hit}=first;
      const newImpact = ++nextImpact;
      for(const [pid,old,result,peer]of [[id,a,hit.a,other],[other,b,hit.b,id]]){
        const x=old.x+result.dx,y=old.y+result.dy;
        states.set(pid,{...old,x,y,vx:result.vx,vy:result.vy,flying:true,at:now,impact:newImpact,pending:true});
        send(owners.get(pid),{type:'hit',peer,...result,x,y,impact:newImpact});
      }
      onCollision({pair:[id,other],hit});
    });
    socket.on('close',()=>{clients.delete(socket);if(id&&owners.get(id)===socket){owners.delete(id);states.delete(id);}});
  });
  const ready=new Promise((resolve,reject)=>{
    const listen=()=>{if(!closing)server.listen(pipeName(home),resolve);};
    server.on('error',error=>{if(error.code==='EADDRINUSE'&&!closing){retry=setTimeout(listen,1000);retry.unref?.();}else reject(error);});listen();
  });
  return {ready,close(){closing=true;clearTimeout(retry);for(const s of clients)s.destroy();return new Promise(r=>server.listening?server.close(r):r());},states};
}
function connectRole({id,home,onHit=()=>{},onStatus=()=>{}}) {
  let socket,timer,heartbeat,closed=false,latest=null,latestAt=0,connected=false;
  let sentShape;
  const send=()=>{
    if(!connected||!latest||!socket?.writable||socket.writableLength>=65536)return;
    const {shape,...state}=latest;
    if(shape!==sentShape){state.shape=shape;sentShape=shape;}
    if(Date.now()-latestAt>500&&state.flying)Object.assign(state,{flying:false,vx:0,vy:0});
    socket.write(JSON.stringify({type:'state',state})+'\n');
  };
  function open(){
    if(closed)return;socket=net.createConnection(pipeName(home));socket.on('error',()=>{});
    socket.on('connect',()=>socket.write(JSON.stringify({type:'hello',id})+'\n'));
    framed(socket,msg=>{if(msg.type==='ready'){connected=true;sentShape=undefined;onStatus(true);send();}else if(msg.type==='hit')onHit(msg);});
    socket.on('close',()=>{connected=false;onStatus(false);if(!closed)timer=setTimeout(open,1000);});
  }
  heartbeat=setInterval(send,1000);heartbeat.unref?.();open();
  return {publish(state){latest=state;latestAt=Date.now();send();},close(){closed=true;clearTimeout(timer);clearInterval(heartbeat);socket?.destroy();},get connected(){return connected;}};
}
function body(s) {
  if (!s.shape) return null;
  const { l, r, t, b } = s.shape.bounds;
  return { l: s.x + l, r: s.x + r, t: s.y + t, b: s.y + b };
}

module.exports = { pipeName, body, solve: (a, b) => solveMotion(null, a, b), solveMotion, decodeShape, startBroker, connectRole };
