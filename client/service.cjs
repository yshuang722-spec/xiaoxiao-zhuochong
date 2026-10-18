const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { spawn } = require('node:child_process');
const bundled = path.resolve(__dirname, '../../engine');
const packaged = fs.existsSync(path.join(bundled, 'lib/standalone.js'));
const sourcePackage = fs.existsSync(path.resolve(__dirname, '../dsh-pet/package.json')) ? '../dsh-pet' : '../dsh-pet/dsh-pet';
const PACKAGE = packaged ? bundled : path.resolve(__dirname, sourcePackage);
const HOME = process.env.DSH_HOME || path.join(process.env.USERPROFILE, '.dsh');
const ROOT = path.join(HOME, 'dsh-pet/characters');
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
    const req = http.request({hostname:'127.0.0.1', port:3081, path:route, method,
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
  try {const health=await request('/health');if(path.resolve(health.plugin.root)!==PACKAGE)throw Error('3081 端口正在被另一个版本使用');return;} catch(e){if(!['ECONNREFUSED','ECONNRESET'].includes(e.code))throw e;}
  const logDir=path.join(HOME,'pet-control-client/logs');fs.mkdirSync(logDir,{recursive:true});
  const out=fs.openSync(path.join(logDir,'server.stdout.log'),'a'),err=fs.openSync(path.join(logDir,'server.stderr.log'),'a');
  const env={...process.env,DSH_HOME:HOME,LOCALAPPDATA:HOME};delete env.ELECTRON_RUN_AS_NODE;if(packaged)env.DSH_PET_ELECTRON_PATH=process.execPath;
  const child=spawn(packaged ? path.resolve(__dirname,'../../../runtimes/node.exe') : path.join(process.env.ProgramFiles,'nodejs/node.exe'),[path.join(PACKAGE,'lib/standalone.js'),'--port','3081'],{cwd:PACKAGE,env,detached:true,windowsHide:true,stdio:['ignore',out,err]});
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
    roles.push({id:pet.id,entry,name:pet.name||pet.id,visible:['desktop','both'].includes(pet.display),size:pet.size,actions:animationNames(cfg.animations),idle:preview,poster,project:entry==='main'&&!fs.existsSync(projectDir(entry))?path.join(HOME,'dsh-pet'):projectDir(entry),preview:fs.existsSync(file)?require('node:url').pathToFileURL(file).href:''});
  }
  return roles;
}
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
  const names=animationNames(cfg.animations);for(const name of names){if(typeof name!=='string'||/[\\/:]/.test(name)||name.includes('..'))throw Error('动作文件名不合法');const stat=fs.lstatSync(path.join(assets,name+'.webm'));if(!stat.isFile()||stat.isSymbolicLink())throw Error('动画必须是普通 WebM 文件：'+name);}
  // Stage outside the scanned character root; a partial import never becomes live.
  fs.mkdirSync(ROOT,{recursive:true});
  const temp=fs.mkdtempSync(path.join(HOME,'dsh-pet','.import-'));fs.mkdirSync(path.join(temp,'animations'),{recursive:true});
  try {cfg.pets[0].display='none';cfg.pets[0].balanceEnabled=false;fs.writeFileSync(path.join(temp,'config.json'),JSON.stringify(cfg,null,2));for(const name of names)fs.copyFileSync(path.join(assets,name+'.webm'),path.join(temp,'animations',name+'.webm'));fs.renameSync(temp,projectDir(id));}
  catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e;}
  return list();
}
module.exports={PACKAGE,HOME,ROOT,request,ensureServer,list,find,toggle,play,importProject,projectDir};
