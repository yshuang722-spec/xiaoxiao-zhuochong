const {app,BrowserWindow,ipcMain,Tray,Menu,nativeImage,dialog,shell,safeStorage}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const service=require('./service.cjs');
app.setName('小小桌宠2');fs.mkdirSync(path.join(service.HOME,'pet-control-client'),{recursive:true});app.setPath('userData',path.join(service.HOME,'pet-control-client'));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
let window,tray,quitting=false;
// UI preferences kept by the control client (not part of the pet engine config).
const PREFS_FILE=path.join(service.HOME,'pet-control-client','ui-prefs.json');
const PREFS_DEFAULT={autoAway:true};
function readPrefs(){try{return {...PREFS_DEFAULT,...JSON.parse(fs.readFileSync(PREFS_FILE,'utf8'))};}catch(e){return {...PREFS_DEFAULT};}}
function writePrefs(next){fs.writeFileSync(PREFS_FILE,JSON.stringify(next,null,2));return next;}
// Full-screen apps (games, video): hide the pets that are showing, bring the same ones back afterwards.
let awayIds=[],awayBusy=Promise.resolve();
function onFullscreen(full){awayBusy=awayBusy.then(async()=>{
 if(full){if(!readPrefs().autoAway||awayIds.length)return;const roles=await service.list();awayIds=roles.filter(r=>r.visible).map(r=>r.id);for(const id of awayIds)await service.toggle(id,false);}
 else{if(!awayIds.length)return;const ids=awayIds;awayIds=[];for(const id of ids)await service.toggle(id,true).catch(()=>{});}
 publishRoles(await service.list());
}).catch(e=>console.error('[auto-away]',e.message));}
if(!app.requestSingleInstanceLock()){app.quit();}else if(process.argv.includes('--quit')){app.quit();}else{
 app.on('second-instance',(_event,argv)=>{if(argv.includes('--quit')){void quitAll();return;}if(window){window.show();if(window.isMinimized())window.restore();window.focus();}});
 app.whenReady().then(async()=>{
  const ai=require('./ai.cjs').createAI({service,safeStorage,onChanged:id=>{if(window&&!window.isDestroyed())window.webContents.send('ai:changed',id);}});
  const chatBridge=await require('./chat-bridge.cjs').startChatBridge({ai});
  service.setChatBridge(chatBridge.env);app.once('before-quit',()=>chatBridge.close());
  try{await service.ensureServer();}catch(e){dialog.showErrorBox('桌宠启动失败',e.message);app.quit();return;}
  try{const {startRoleAudit}=require(path.join(service.PACKAGE,'runtime/electron-helper/role-log.js'));const stopAudit=startRoleAudit({root:service.ROOT});app.once('before-quit',stopAudit);}catch(e){console.error('[pet-log] audit start failed:',e.message);}
  try{const broker=require(path.join(service.PACKAGE,'runtime/electron-helper/collision-link.cjs')).startBroker({home:service.HOME});broker.ready.catch(e=>console.error('[collision]',e.message));app.once('before-quit',()=>{void broker.close();});}catch(e){console.error('[collision] start failed:',e.message);}
  const stopWatch=require('./fullscreen-watch.cjs').watchFullscreen(onFullscreen);app.once('before-quit',stopWatch);
  window=new BrowserWindow({width:1100,height:780,minWidth:800,minHeight:620,title:'小小桌宠2',backgroundColor:'#fbf7f1',autoHideMenuBar:true,show:false,icon:path.join(__dirname,'assets/app.ico'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.setMenu(null);window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  // Installer/uninstaller requests a normal shutdown before replacing program files.
  if(process.platform==='win32')window.hookWindowMessage(0x8042,()=>{void quitAll();});
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.on('close',event=>{if(!quitting){event.preventDefault();window.hide();}});
  window.on('show',()=>service.list().then(publishRoles).catch(()=>{}));
  window.once('ready-to-show',()=>window.show());
  const image=nativeImage.createFromPath(path.join(__dirname,'assets/app.ico')).resize({width:24,height:24});
  tray=new Tray(image);tray.setToolTip('小小桌宠2 · 宠物在后台陪伴');
  const show=()=>{window.show();window.focus();};
  tray.on('click',show);tray.on('double-click',show);
  tray.setContextMenu(Menu.buildFromTemplate([{label:'打开角色控制台',click:show},{label:'全部开启',click:()=>showAll().catch(e=>dialog.showErrorBox('开启失败',e.message))},{label:'隐藏全部角色',click:()=>hideAll().catch(e=>dialog.showErrorBox('隐藏失败',e.message))},{type:'separator'},{label:'退出全部桌宠',click:()=>quitAll()}]));
  const handle=(name,fn)=>ipcMain.handle(name,async(event,...args)=>{if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw Error('无效的窗口');return fn(...args);});
  handle('ai:settings',()=>ai.settings());
  handle('ai:save',input=>ai.save(input));
  handle('ai:test',()=>ai.test());
  handle('ai:history',id=>ai.history(id));
  handle('ai:send',(id,text)=>ai.send(id,text));
  handle('characters:list',()=>service.list());
  handle('characters:resize',(id,size)=>service.resize(id,size).then(publishRoles));
  handle('characters:clone',id=>service.clone(id).then(publishRoles));
  handle('characters:remove-clone',id=>service.clone(id,true).then(publishRoles));
  handle('characters:collision',()=>service.collision());
  handle('characters:set-collision',on=>service.setCollision(on));
  handle('characters:reorder',entries=>service.reorder(entries).then(publishRoles));
  handle('characters:toggle',(id,visible)=>service.toggle(id,visible));
  handle('groups:get',entry=>service.groups(entry));
  handle('groups:set',(entry,input)=>service.setGroups(entry,input));
  handle('playlist:get',entry=>service.playlist(entry));
  handle('playlist:set',(entry,input)=>service.setPlaylist(entry,input));
  handle('characters:play',(id,name)=>service.play(id,name));
  handle('characters:profile',async id=>{const h=await ai.history(id);return {name:h.name,prompt:h.prompt};});
  handle('characters:profile-save',async(id,input)=>{await service.find(id);if(!input||typeof input!=="object")throw Error('资料格式无效');await service.request('/dsh-pet-7340/pet-profile','POST',{id,name:input.name,prompt:input.prompt});return publishRoles(await service.list());});
  handle('characters:hide-all',()=>hideAll());
  handle('characters:show-all',()=>showAll());
  handle('characters:import',async()=>{const result=await dialog.showOpenDialog(window,{title:'选择角色项目（包含 config.json 和 animations 文件夹）',properties:['openDirectory']});if(result.canceled)return null;return service.importProject(result.filePaths[0]);});
  handle('client:quit',()=>quitAll());
  handle('prefs:get',()=>readPrefs());
  handle('prefs:set',(key,value)=>{if(!(key in PREFS_DEFAULT)||typeof value!==typeof PREFS_DEFAULT[key])throw Error('设置项无效');const next=writePrefs({...readPrefs(),[key]:value});if(key==='autoAway'&&!value&&awayIds.length)onFullscreen(false);return next;});
  await window.loadFile(path.join(__dirname,'index.html'));
  if(process.argv.includes('--verify-ai'))void require('./verify-ai.cjs').verifyAI(window,ai,service);
 }).catch(e=>{dialog.showErrorBox('控制台出错',e.message);app.quit();});
}
function publishRoles(roles){if(window&&!window.isDestroyed())window.webContents.send('characters:changed',roles);return roles;}
async function hideAll(){for(const role of await service.list())if(role.visible)await service.toggle(role.id,false);return publishRoles(await service.list());}
async function showAll(){for(const role of await service.list())if(!role.visible)await service.toggle(role.id,true);return publishRoles(await service.list());}
async function quitAll(){try{await service.request('/shutdown','POST');quitting=true;app.quit();}catch(e){if(['ECONNREFUSED','ECONNRESET'].includes(e.code)){quitting=true;app.quit();}else dialog.showErrorBox('退出失败',e.message);}}
app.on('window-all-closed',()=>{});
module.exports={hideAll,showAll,quitAll};
