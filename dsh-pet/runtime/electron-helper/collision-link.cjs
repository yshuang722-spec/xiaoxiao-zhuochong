'use strict';
const net=require('node:net'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
function pipeName(home=process.env.DSH_HOME||path.join(os.homedir(),'.dsh')) {
  const key=crypto.createHash('sha256').update(path.resolve(home).toLowerCase()).digest('hex').slice(0,20);
  return process.platform==='win32'?`\\\\.\\pipe\\xiaoxiao-pet-collision-${key}`:path.join(os.tmpdir(),`xiaoxiao-pet-collision-${key}.sock`);
}
function body(s){return {l:s.x+s.size*200/640,r:s.x+s.size*440/640,t:s.y+s.bottomPad+s.size*9/16*50/360,b:s.y+s.bottomPad+s.size*9/16*335/360};}
function solve(a,b) {
  if(!a.enabled||!b.enabled||a.held||b.held||(!a.flying&&!b.flying))return null;
  const A=body(a),B=body(b),ox=Math.min(A.r,B.r)-Math.max(A.l,B.l),oy=Math.min(A.b,B.b)-Math.max(A.t,B.t);
  if(ox<=0||oy<=0)return null;
  let nx=0,ny=0,depth;
  if(ox<oy){nx=(A.l+A.r)<(B.l+B.r)?1:-1;depth=ox;}else{ny=(A.t+A.b)<(B.t+B.b)?1:-1;depth=oy;}
  const relative=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
  if(relative<20)return null; // separating and resting contacts never retrigger
  const m1=a.size*a.size,m2=b.size*b.size,impulse=1.78*relative/(1/m1+1/m2);
  const d=depth+2,wa=m2/(m1+m2),wb=m1/(m1+m2);
  return {a:{vx:a.vx-impulse/m1*nx,vy:a.vy-impulse/m1*ny,dx:-nx*d*wa,dy:-ny*d*wa},b:{vx:b.vx+impulse/m2*nx,vy:b.vy+impulse/m2*ny,dx:nx*d*wb,dy:ny*d*wb}};
}
function solveMotion(previous,a,b){
  if(previous&&!previous.held&&a.flying){
    const steps=Math.min(32,Math.ceil(Math.hypot(a.x-previous.x,a.y-previous.y)/Math.max(10,a.size*.12)));
    for(let i=1;i<steps;i++){
      const t=i/steps,step={...a,x:previous.x+(a.x-previous.x)*t,y:previous.y+(a.y-previous.y)*t};
      const hit=solve(step,b);if(hit){hit.a.dx+=step.x-a.x;hit.a.dy+=step.y-a.y;return hit;}
    }
  }
  return solve(a,b);
}
function framed(socket,onMessage){let buffer='';socket.on('data',chunk=>{buffer+=chunk.toString();if(buffer.length>65536){socket.destroy();return;}let n;while((n=buffer.indexOf('\n'))>=0){const row=buffer.slice(0,n);buffer=buffer.slice(n+1);try{onMessage(JSON.parse(row));}catch{}}});}
function startBroker({home,onCollision=()=>{}}={}) {
  let retry,closing=false;
  const states=new Map(),owners=new Map(),clients=new Set(),cooldowns=new Map();
  const send=(socket,data)=>{if(socket&&!socket.destroyed&&socket.writableLength<65536)socket.write(JSON.stringify(data)+'\n');};
  const server=net.createServer(socket=>{
    clients.add(socket);let id='';socket.on('error',()=>{});
    framed(socket,msg=>{
      if(msg.type==='hello'&&typeof msg.id==='string'&&/^[\p{L}\p{N}_.-]{1,80}$/u.test(msg.id)){
        if(owners.has(msg.id)&&owners.get(msg.id)!==socket){socket.destroy();return;}id=msg.id;owners.set(id,socket);send(socket,{type:'ready'});return;
      }
      if(!id||msg.type!=='state')return;
      const s=msg.state;
      if(!s||!['x','y','vx','vy','size','bottomPad'].every(k=>Number.isFinite(s[k]))||s.size<1||s.size>10000||Math.abs(s.x)>100000||Math.abs(s.y)>100000||Math.abs(s.vx)>20000||Math.abs(s.vy)>20000)return;
      const now=Date.now(),previous=states.get(id),a={...s,at:now};states.set(id,a);
      for(const [other,b]of states){
        if(other===id||now-b.at>5000)continue;
        const pair=[id,other].sort().join('|');if(now-(cooldowns.get(pair)||0)<180)continue;
        const hit=solveMotion(previous,a,b);if(!hit)continue;
        cooldowns.set(pair,now);
        for(const [pid,old,result,peer]of [[id,a,hit.a,other],[other,b,hit.b,id]]){
          states.set(pid,{...old,x:old.x+result.dx,y:old.y+result.dy,vx:result.vx,vy:result.vy,flying:true,at:now});
          send(owners.get(pid),{type:'hit',peer,...result});
        }
        onCollision({pair:[id,other],hit});break;
      }
    });
    socket.on('close',()=>{clients.delete(socket);if(id&&owners.get(id)===socket){owners.delete(id);states.delete(id);for(const pair of cooldowns.keys())if(pair.split('|').includes(id))cooldowns.delete(pair);}});
  });
  const ready=new Promise((resolve,reject)=>{
    const listen=()=>{if(!closing)server.listen(pipeName(home),resolve);};
    server.on('error',error=>{if(error.code==='EADDRINUSE'&&!closing){retry=setTimeout(listen,1000);retry.unref?.();}else reject(error);});listen();
  });
  return {ready,close(){closing=true;clearTimeout(retry);for(const s of clients)s.destroy();return new Promise(r=>server.listening?server.close(r):r());},states};
}
function connectRole({id,home,onHit=()=>{},onStatus=()=>{}}) {
  let socket,timer,heartbeat,closed=false,latest=null,latestAt=0,connected=false;
  const send=()=>{if(connected&&latest&&socket?.writable&&socket.writableLength<65536){const state=Date.now()-latestAt>500&&latest.flying?{...latest,flying:false,vx:0,vy:0}:latest;socket.write(JSON.stringify({type:'state',state})+'\n');}};
  function open(){
    if(closed)return;socket=net.createConnection(pipeName(home));socket.on('error',()=>{});
    socket.on('connect',()=>socket.write(JSON.stringify({type:'hello',id})+'\n'));
    framed(socket,msg=>{if(msg.type==='ready'){connected=true;onStatus(true);send();}else if(msg.type==='hit')onHit(msg);});
    socket.on('close',()=>{connected=false;onStatus(false);if(!closed)timer=setTimeout(open,1000);});
  }
  heartbeat=setInterval(send,1000);heartbeat.unref?.();open();
  return {publish(state){latest=state;latestAt=Date.now();send();},close(){closed=true;clearTimeout(timer);clearInterval(heartbeat);socket?.destroy();},get connected(){return connected;}};
}
module.exports={pipeName,body,solve,solveMotion,startBroker,connectRole};
