// Opt-in integration check: --verify-client. Uses real UI and tray handlers.
const {app,BrowserWindow,nativeImage}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const service=require('./service.cjs'),controller=require('./main.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn){for(let i=0;i<100;i++){if(await fn())return;await sleep(150);}throw Error('等待窗口或界面状态超时');}
function windows(){
 const out=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"[Console]::OutputEncoding=[Text.Encoding]::UTF8; @(Get-Process | Where-Object {$_.MainWindowTitle -like '桌宠角色 · *'} | Select-Object Id,MainWindowTitle,@{n='Handle';e={$_.MainWindowHandle.ToInt64()}}) | ConvertTo-Json -Compress"],{encoding:'utf8',windowsHide:true});
 const rows=out.trim()?JSON.parse(out):[];return Array.isArray(rows)?rows:[rows];
}
app.whenReady().then(async()=>{
 const dir=path.join(service.HOME,'pet-control-client/logs');fs.mkdirSync(dir,{recursive:true});let before;
 try{
  await wait(async()=>{try{await service.request('/health');return true;}catch(e){if(['ECONNREFUSED','ECONNRESET'].includes(e.code))return false;throw e;}});
  before=(await service.list()).map(r=>({id:r.id,visible:r.visible}));
  await wait(async()=>{const w=BrowserWindow.getAllWindows()[0];return w&&!w.webContents.isLoading()&&await w.webContents.executeJavaScript(`document.querySelectorAll('.character').length===${before.length}`);});
  const win=BrowserWindow.getAllWindows()[0],js=s=>win.webContents.executeJavaScript(s);
  assert.equal(await js('document.title'),'小小桌宠');assert.ok(!nativeImage.createFromPath(path.join(__dirname,'assets/app.ico')).isEmpty());
  await wait(async()=>await js(`Array.from(document.querySelectorAll('.portrait video')).every(v=>v.readyState>=2&&!v.error)`));
  await controller.showAll();await wait(()=>windows().length===before.length);
  await wait(async()=>await js(`document.querySelectorAll('.switch[aria-checked=true]').length===${before.length}`));
  const first=windows(),target=before[0].id,others=first.filter(w=>!w.MainWindowTitle.endsWith(' '+target));
  await js(`document.querySelector('[data-id="${target}"] .switch').click();void 0`);
  await wait(()=>windows().length===before.length-1);
  for(const other of others){const current=windows().find(w=>w.MainWindowTitle===other.MainWindowTitle);assert.equal(current?.Id,other.Id);assert.equal(current?.Handle,other.Handle);}
  await controller.hideAll();await wait(()=>windows().length===0);
  await wait(async()=>await js(`document.querySelectorAll('.switch[aria-checked=true]').length===0`));
  await controller.showAll();await wait(()=>windows().length===before.length);
  for(const role of await service.list())await service.play(role.id,role.idle);
  for(const role of before)await service.toggle(role.id,role.visible);
  await wait(()=>windows().length===before.filter(r=>r.visible).length);
  win.hide();win.show();await sleep(300);
  const survivors=windows();win.close();await sleep(400);assert.equal(win.isVisible(),false);
  await service.request('/health');assert.deepEqual(windows(),survivors);
  win.show();await sleep(300);fs.writeFileSync(path.join(dir,'小小桌宠控制页.png'),(await win.webContents.capturePage()).toPNG());
  const result={passed:true,roles:before,roleCount:before.length,previewDecodes:true,showAll:true,hideAll:true,trayStateUpdatesUI:true,independentProcessAndWindow:true,actionPlayback:true,closeKeepsPets:true,quitRequested:process.argv.includes('--verify-exit')};
  fs.writeFileSync(path.join(dir,'client-verification.json'),JSON.stringify(result,null,2));
  if(result.quitRequested)await controller.quitAll();
 }catch(e){
  if(before)for(const role of before)await service.toggle(role.id,role.visible).catch(()=>{});
  fs.writeFileSync(path.join(dir,'client-verification.json'),JSON.stringify({passed:false,error:String(e.stack)},null,2));
 }
});
