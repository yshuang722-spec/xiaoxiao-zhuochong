const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { spawn } = require('node:child_process');
const bundled = path.resolve(__dirname, '../../engine');
const packaged = fs.existsSync(path.join(bundled, 'lib/standalone.js'));
const sourcePackage = fs.existsSync(path.resolve(__dirname, '../dsh-pet/package.json')) ? '../dsh-pet' : '../dsh-pet/dsh-pet';
const PACKAGE = packaged ? bundled : path.resolve(__dirname, sourcePackage);
const HOME = process.env.DSH_HOME || path.join(process.env.USERPROFILE, '.xiaoxiao2');
const ROOT = path.join(HOME, 'dsh-pet/characters');
let chatBridgeEnvironment = null;
function setChatBridge(environment) {chatBridgeEnvironment = environment;}
function seedCharacters() {
  const seedRoot=path.resolve(__dirname,'../../characters');
  if(!packaged||!fs.existsSync(seedRoot))return;
  fs.mkdirSync(ROOT,{recursive:true});
  for(const entry of fs.readdirSync(seedRoot,{withFileTypes:true})){
    if(!entry.isDirectory()||!/^[a-zA-Z0-9_-]+$/.test(entry.name))continue;
    const dest=projectDir(entry.name);
    if(fs.existsSync(dest))continue;
    if(entry.name==='main'&&['main-config.jsonc','main-config.json'].some(n=>fs.existsSync(path.join(HOME,'dsh-pet',n))))continue;
    if(fs.existsSync(path.join(HOME,'dsh-pet/pet',entry.name+'-config.json')))continue;
    fs.cpSync(path.join(seedRoot,entry.name),dest,{recursive:true,errorOnExist:true,force:false});
  }
}
function request(route, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = http.request({hostname:'127.0.0.1', port:3096, path:route, method,
      headers:data ? {'Content-Type':'application/json','Content-Length':data.length} : {}}, res => {
      const chunks=[];res.on('data', c=>chunks.push(c));res.on('end',()=>{
        try {const parsed=JSON.parse(Buffer.concat(chunks));if(res.statusCode>=400)throw Error(parsed.error||`HTTP ${res.statusCode}`);resolve(parsed);}catch(e){reject(e);}
      });
    });
    req.setTimeout(10000,()=>req.destroy(Error('桌宠服务响应超时')));req.on('error',reject);if(data)req.write(data);req.end();
  });
}
async function ensureServer() {
  seedCharacters();
  try {
    const health=await request('/health');
    if(path.resolve(health.plugin.root)!==PACKAGE)throw Error('3096 端口正在被另一个版本使用');
    if(!chatBridgeEnvironment)return;
    // A host left behind after a client crash has an obsolete ephemeral bridge.
    await request('/shutdown','POST');
    let stopped=false;
    for(let i=0;i<80;i++) {
      await new Promise(r=>setTimeout(r,100));
      try {await request('/health');} catch(e){if(['ECONNREFUSED','ECONNRESET'].includes(e.code)){stopped=true;break;}throw e;}
    }
    if(!stopped)throw Error('旧桌宠服务未退出，无法更新对话连接');
  } catch(e){if(!['ECONNREFUSED','ECONNRESET'].includes(e.code))throw e;}
  const logDir=path.join(HOME,'pet-control-client/logs');fs.mkdirSync(logDir,{recursive:true});
  const out=fs.openSync(path.join(logDir,'server.stdout.log'),'a'),err=fs.openSync(path.join(logDir,'server.stderr.log'),'a');
  const env={...process.env,...chatBridgeEnvironment,DSH_HOME:HOME,LOCALAPPDATA:HOME};if(packaged){env.ELECTRON_RUN_AS_NODE='1';env.DSH_PET_ELECTRON_PATH=process.execPath;}else delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(packaged ? process.execPath : path.join(process.env.ProgramFiles,'nodejs/node.exe'),[path.join(PACKAGE,'lib/standalone.js'),'--port','3096'],{cwd:PACKAGE,env,detached:true,windowsHide:true,stdio:['ignore',out,err]});
  let spawnError;child.on('error',e=>spawnError=e);child.unref();fs.closeSync(out);fs.closeSync(err);
  for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,250));if(spawnError)throw spawnError;try{const h=await request('/health');if(path.resolve(h.plugin.root)===PACKAGE)return;throw Error('启动了不匹配的服务');}catch(e){if(!['ECONNREFUSED','ECONNRESET'].includes(e.code))throw e;}}
  throw Error('桌宠服务未能启动，请重试或查看客户端日志');
}
const base='/dsh-pet-7340';
function animationNames(a) {
  return [...new Set([...(a.idle||[]),...(a.turn||[]),...(a.drag||[]),...(a.clicks||[]),...(a.moves?.actions||[]).map(v=>v.name),...(a.categories||[]).flatMap(c=>c.actions),...Object.values(a.events||{}).flat(3).filter(n=>typeof n==='string')])];
}
function projectDir(entry) {if(!/^[a-zA-Z0-9_-]+$/.test(entry))throw Error('角色目录名无效');return path.join(ROOT,entry);}
async function list() {
  const config=await request(base+'/config');const roles=[];
  for(const [entry,cfg] of Object.entries(config))for(const pet of cfg.pets||[]){
    const preview=cfg.animations.idle[0];let file=path.join(projectDir(entry),'animations',preview+'.webm');
    if(entry==='main'&&!fs.existsSync(file)&&!fs.existsSync(path.join(projectDir(entry),'animations')))file=path.join(PACKAGE,'assets/webm',preview+'.webm');
    let poster='';const posterFile=path.join(__dirname,'assets',entry+'.png');if(fs.existsSync(posterFile))poster='data:image/png;base64,'+fs.readFileSync(posterFile).toString('base64');
    roles.push({cloneCount:Math.max(0,cfg.pets.length-1),cloneLimit:8,isClone:pet.id!==cfg.pets[0].id&&/__clone_[1-8]$/.test(pet.id),id:pet.id,entry,name:pet.name||pet.id,visible:['desktop','both'].includes(pet.display),size:pet.size,actions:animationNames(cfg.animations),idle:preview,poster,project:entry==='main'&&!fs.existsSync(projectDir(entry))?path.join(HOME,'dsh-pet'):projectDir(entry),preview:fs.existsSync(file)?require('node:url').pathToFileURL(file).href:''});
  }
  return sortRoles(roles);
}
const ORDER_FILE=path.join(HOME,'pet-control-client','role-order.json');
function readOrder(){try{const a=JSON.parse(fs.readFileSync(ORDER_FILE,'utf8'));return Array.isArray(a)?a.filter(x=>typeof x==='string'):[];}catch(e){return [];}}
function made(entry){try{return fs.statSync(projectDir(entry)).birthtimeMs;}catch(e){return Infinity;}}
function sortRoles(roles){const o=readOrder(),rank=r=>{const i=o.indexOf(r.entry);return i<0?1e6:i;};const born={};for(const r of roles)born[r.entry]??=made(r.entry);return roles.map((r,i)=>[r,i]).sort((a,b)=>rank(a[0])-rank(b[0])||born[a[0].entry]-born[b[0].entry]||a[1]-b[1]).map(x=>x[0]);}
async function reorder(entries){if(!Array.isArray(entries)||entries.some(x=>typeof x!=='string'||!/^[a-zA-Z0-9_-]+$/.test(x)))throw Error('排序数据无效');fs.mkdirSync(path.dirname(ORDER_FILE),{recursive:true});fs.writeFileSync(ORDER_FILE,JSON.stringify([...new Set(entries)]));return list();}
async function find(id){const item=(await list()).find(r=>r.id===id);if(!item)throw Error('找不到这个角色，请刷新列表');return item;}
let writes=Promise.resolve();
function toggle(id,visible){const operation=writes.then(async()=>{if(typeof visible!=='boolean')throw Error('显示状态无效');await find(id);await request(base+'/pet-display','POST',{id,display:visible?'desktop':'none'});return list();});writes=operation.catch(()=>{});return operation;}
async function play(id,name){const role=await find(id);if(!role.visible)throw Error('请先让这个角色显示在桌面');if(!role.actions.includes(name))throw Error('这个角色没有该动作');const r=await request(base+'/anim?pet='+encodeURIComponent(id),'POST',{name});if(!r.ok)throw Error(r.message||'动作点播失败');return true;}
async function importProject(folder) {
  const file=path.join(folder,'config.json'),assets=path.join(folder,'animations');
  const cfg=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
  if(!Array.isArray(cfg.pets)||cfg.pets.length!==1||!cfg.animations)throw Error('角色包需要 config.json、一个角色和 animations 文件夹');
  const id=cfg.pets[0].id;if(!/^[a-z][a-z0-9_-]{0,47}$/.test(id)||id==='main')throw Error('角色 id 请使用小写字母开头的英文、数字或短横线，且不能为 main');
  const existing=await list();if(existing.some(r=>r.id===id||r.entry===id)||fs.existsSync(projectDir(id)))throw Error('该角色已存在，请使用独立的角色 id');
  for(const key of ['idle','turn','drag','clicks'])if(!Array.isArray(cfg.animations[key])||!cfg.animations[key].length)throw Error('角色包缺少动作池：'+key);
  if(!Array.isArray(cfg.animations.moves?.actions)||!cfg.animations.events?.balance?.length||!Array.isArray(cfg.animations.categories))throw Error('角色包的 moves、categories 或 events 结构不完整');
  const personaFile=path.join(folder,'人设.json');let persona=null;
  if(fs.existsSync(personaFile)){persona=JSON.parse(fs.readFileSync(personaFile,'utf8').replace(/^\uFEFF/,''));if(persona.characterId!==id||typeof persona.whisperPrompt!=='string'||!persona.whisperPrompt.trim()||persona.whisperPrompt.length>10000)throw Error('人设文件无效或角色 ID 不匹配');}
  const names=animationNames(cfg.animations);for(const name of names){if(typeof name!=='string'||/[\\/:]/.test(name)||name.includes('..'))throw Error('动作文件名不合法');const stat=fs.lstatSync(path.join(assets,name+'.webm'));if(!stat.isFile()||stat.isSymbolicLink())throw Error('动画必须是普通 WebM 文件：'+name);}
  // Stage outside the scanned character root; a partial import never becomes live.
  fs.mkdirSync(ROOT,{recursive:true});
  const temp=fs.mkdtempSync(path.join(HOME,'dsh-pet','.import-'));fs.mkdirSync(path.join(temp,'animations'),{recursive:true});
  try {cfg.pets[0].display='none';cfg.pets[0].balanceEnabled=false;fs.writeFileSync(path.join(temp,'config.json'),JSON.stringify(cfg,null,2));if(persona)fs.writeFileSync(path.join(temp,'人设.json'),JSON.stringify(persona,null,2));for(const name of names)fs.copyFileSync(path.join(assets,name+'.webm'),path.join(temp,'animations',name+'.webm'));fs.renameSync(temp,projectDir(id));}
  catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e;}
  return list();
}
function clone(id,remove=false){const operation=writes.then(async()=>{await find(id);await request(base+(remove?'/pet-clone-remove':'/pet-clone'),'POST',{id});return list();});writes=operation.catch(()=>{});return operation;}
function resize(id,size){const operation=writes.then(async()=>{await find(id);await request(base+'/pet-size','POST',{id,size});return list();});writes=operation.catch(()=>{});return operation;}
const PHYSICS_DEFAULT={gravity:1400,restitution:0.78,groundFriction:2.5,ceilingBounce:true,throwPower:1.0,petCollision:false};
// Collision is per entry: the main config is the global default, any role config with its own physics block overrides it.
function physicsFiles(){const out=[];if(fs.existsSync(ROOT))for(const id of fs.readdirSync(ROOT))for(const name of ['config.json','config.jsonc']){const file=path.join(ROOT,id,name);if(fs.existsSync(file)){out.push({file,main:id==='main'});break;}}const pet=path.join(HOME,'dsh-pet','pet');if(fs.existsSync(pet))for(const name of fs.readdirSync(pet))if(name.endsWith('-config.json'))out.push({file:path.join(pet,name),main:false});return out;}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8').replace(/^﻿/,'').replace(/^\s*\/\/.*$/gm,''));}
function collision(){try{const files=physicsFiles();const main=files.find(f=>f.main);if(!main||readJson(main.file).physics?.petCollision!==true)return false;return files.every(f=>{const ph=readJson(f.file).physics;return !ph||ph.petCollision===true;});}catch(e){return false;}}
function setCollision(on){const operation=writes.then(async()=>{for(const f of physicsFiles()){let cfg;try{cfg=readJson(f.file);}catch(e){continue;}if(!f.main&&!cfg.physics)continue;cfg.physics={...PHYSICS_DEFAULT,...(cfg.physics||{}),petCollision:on===true};fs.writeFileSync(f.file,JSON.stringify(cfg,null,2));}await request(base+'/reload','POST',{});return collision();});writes=operation.catch(()=>{});return operation;}
module.exports={PACKAGE,HOME,ROOT,request,ensureServer,list,find,toggle,play,importProject,projectDir,setChatBridge,clone,resize,reorder,collision,setCollision};
