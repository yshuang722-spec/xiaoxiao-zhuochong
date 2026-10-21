const assert=require('assert'),path=require('path');
const {solve,solveMotion,body,startBroker,connectRole}=require('../../../dsh-pet/runtime/electron-helper/collision-link.cjs');
const base={x:0,y:0,vx:800,vy:0,size:462,bottomPad:21,enabled:true,held:false,flying:true};
const target={...base,x:140,vx:0,flying:false};
const result=solve(base,target);assert(result&&result.b.vx>0&&result.a.vx<800,'moving pet transfers momentum');
const A=body({...base,x:base.x+result.a.dx}),B=body({...target,x:target.x+result.b.dx});assert(A.r<=B.l,'contact separates bodies');
const energy=s=>s.size*s.size*(s.vx*s.vx+s.vy*s.vy);
assert(energy({...base,...result.a})+energy({...target,...result.b})<=energy(base)+energy(target),'no energy explosion');
assert(!solve({...base,vx:0,flying:false},target),'resting contacts stay stable');
assert(!solve({...base,vx:-800},target),'separating bodies do not bounce twice');
assert(!solve(base,{...target,held:true}),'held pets are not pulled from cursor');
assert(!solve(base,{...target,enabled:false}),'per-role collision switch');
const headOn=solve({...base,vx:500},{...target,vx:-500,flying:true});assert(headOn.a.vx<0&&headOn.b.vx>0,'head-on rebounds');
assert(solveMotion({...base,x:-200},{...base,x:400},{...target,x:120}),'fast motion does not tunnel through target');
const wait=(fn,ms=3000)=>new Promise((resolve,reject)=>{const start=Date.now();const t=setInterval(()=>{if(fn()){clearInterval(t);resolve()}else if(Date.now()-start>ms){clearInterval(t);reject(Error('timeout'))}},10)});
(async()=>{
 const home=path.join(__dirname,'pipe-test-'+Date.now()),broker=startBroker({home});await broker.ready;
 let hitsA=[],hitsB=[];const a=connectRole({id:'a',home,onHit:h=>hitsA.push(h)}),b=connectRole({id:'b',home,onHit:h=>hitsB.push(h)});
 try{
  await wait(()=>a.connected&&b.connected);b.publish(target);await wait(()=>broker.states.has('b'));a.publish(base);await wait(()=>hitsA.length&&hitsB.length);
  assert.equal(hitsA[0].peer,'b');assert.equal(hitsB[0].peer,'a');
  a.publish(base);await new Promise(r=>setTimeout(r,50));assert.equal(hitsA.length,1,'pair cooldown avoids duplicate impulses');
  b.close();await wait(()=>!broker.states.has('b'));assert(a.connected,'closing one role preserves the other connection');
 }finally{a.close();b.close();await broker.close();}
 console.log('PASS: momentum, separation, head-on rebound, stable rest, drag protection, fast sweep, cross-process pipe routing, cooldown and independent close');
})().catch(e=>{console.error(e);process.exitCode=1});
