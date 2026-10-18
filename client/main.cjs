const {app,BrowserWindow,ipcMain,Tray,Menu,nativeImage,dialog,shell}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const service=require('./service.cjs');
app.setName('小小桌宠');fs.mkdirSync(path.join(service.HOME,'pet-control-client'),{recursive:true});app.setPath('userData',path.join(service.HOME,'pet-control-client'));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
let window,tray,quitting=false;
if(!app.requestSingleInstanceLock()){app.quit();}else if(process.argv.includes('--quit')){app.quit();}else{
 app.on('second-instance',(_event,argv)=>{if(argv.includes('--quit')){void quitAll();return;}if(window){window.show();if(window.isMinimized())window.restore();window.focus();}});
 app.whenReady().then(async()=>{
  try{await service.ensureServer();}catch(e){dialog.showErrorBox('桌宠启动失败',e.message);app.quit();return;}
  window=new BrowserWindow({width:1100,height:780,minWidth:800,minHeight:620,title:'小小桌宠',backgroundColor:'#faf8f4',autoHideMenuBar:true,show:false,icon:path.join(__dirname,'assets/app.ico'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.setMenu(null);window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  // Installer/uninstaller requests a normal shutdown before replacing program files.
  if(process.platform==='win32')window.hookWindowMessage(0x8042,()=>{void quitAll();});
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.on('close',event=>{if(!quitting){event.preventDefault();window.hide();}});
  window.on('show',()=>service.list().then(publishRoles).catch(()=>{}));
  window.once('ready-to-show',()=>window.show());
  const image=nativeImage.createFromPath(path.join(__dirname,'assets/app.ico')).resize({width:24,height:24});
  tray=new Tray(image);tray.setToolTip('小小桌宠 · 宠物在后台陪伴');
  const show=()=>{window.show();window.focus();};
  tray.on('click',show);tray.on('double-click',show);
  tray.setContextMenu(Menu.buildFromTemplate([{label:'打开角色控制台',click:show},{label:'全部开启',click:()=>showAll().catch(e=>dialog.showErrorBox('开启失败',e.message))},{label:'隐藏全部角色',click:()=>hideAll().catch(e=>dialog.showErrorBox('隐藏失败',e.message))},{type:'separator'},{label:'退出全部桌宠',click:()=>quitAll()}]));
  const handle=(name,fn)=>ipcMain.handle(name,async(event,...args)=>{if(event.sender!==window.webContents)throw Error('无效的窗口');return fn(...args);});
  handle('characters:list',()=>service.list());
  handle('characters:toggle',(id,visible)=>service.toggle(id,visible));
  handle('characters:play',(id,name)=>service.play(id,name));
  handle('characters:folder',async id=>{const role=await service.find(id);const result=await shell.openPath(role.project);if(result)throw Error(result);return true;});
  handle('characters:hide-all',()=>hideAll());
  handle('characters:show-all',()=>showAll());
  handle('characters:import',async()=>{const result=await dialog.showOpenDialog(window,{title:'选择角色项目（包含 config.json 和 animations 文件夹）',properties:['openDirectory']});if(result.canceled)return null;return service.importProject(result.filePaths[0]);});
  handle('client:quit',()=>quitAll());
  await window.loadFile(path.join(__dirname,'index.html'));
 }).catch(e=>{dialog.showErrorBox('控制台出错',e.message);app.quit();});
}
function publishRoles(roles){if(window&&!window.isDestroyed())window.webContents.send('characters:changed',roles);return roles;}
async function hideAll(){for(const role of await service.list())if(role.visible)await service.toggle(role.id,false);return publishRoles(await service.list());}
async function showAll(){for(const role of await service.list())if(!role.visible)await service.toggle(role.id,true);return publishRoles(await service.list());}
async function quitAll(){try{await service.request('/shutdown','POST');quitting=true;app.quit();}catch(e){if(['ECONNREFUSED','ECONNRESET'].includes(e.code)){quitting=true;app.quit();}else dialog.showErrorBox('退出失败',e.message);}}
app.on('window-all-closed',()=>{});
module.exports={hideAll,showAll,quitAll};
