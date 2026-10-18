const api=window.petClient,container=document.querySelector('#characters'),feedback=document.querySelector('#feedback');
let roles=[],busy=false;const expanded=new Set();
function message(text,error=false){feedback.textContent=text;feedback.className=error?'error':'';}
function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
async function run(task,success){if(busy)return;busy=true;document.querySelectorAll('button,select').forEach(b=>b.disabled=true);try{await task();if(success)message(success);}catch(e){message(e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/,''),true);}finally{busy=false;render();}}
function render(){
 container.replaceChildren();document.querySelectorAll('header button,.toolbar button,footer button').forEach(b=>b.disabled=busy);
 document.querySelector('#summary').textContent=`${roles.length} 位角色 · ${roles.filter(r=>r.visible).length} 位正在桌面陪伴`;
 for(const role of roles){
  const card=el('article','character');card.dataset.id=role.id;
  const portrait=el('div','portrait');
  if(role.preview){const video=el('video');video.src=role.preview;video.muted=true;video.loop=true;video.autoplay=true;video.playsInline=true;if(role.poster)video.poster=role.poster;portrait.append(video);}
  else if(role.poster){const image=el('img');image.src=role.poster;image.alt=role.name;portrait.append(image);}else portrait.append(el('span','fallback',role.name.slice(0,1)));
  portrait.append(el('span',role.visible?'state visible':'state',role.visible?'桌面显示中':'已隐藏'));
  const content=el('div','character-content'),row=el('div','title-row');row.append(el('h2','',role.name));
  const toggle=el('button','switch');toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked',String(role.visible));toggle.setAttribute('aria-label',`${role.visible?'隐藏':'显示'}${role.name}`);toggle.disabled=busy;
  toggle.onclick=()=>run(async()=>{roles=await api.toggle(role.id,!role.visible);},`${role.name}${role.visible?'已隐藏':'已显示在桌面'}`);row.append(toggle);content.append(row,el('p','role-count',`${role.actions.length} 个动作 · 独立角色项目`));
  const actions=el('div','character-actions'),detailsButton=el('button','quiet',expanded.has(role.id)?'收起动作':'查看动作'),folder=el('button','quiet','角色文件夹');
  detailsButton.setAttribute('aria-expanded',String(expanded.has(role.id)));detailsButton.onclick=()=>{expanded.has(role.id)?expanded.delete(role.id):expanded.add(role.id);render();};folder.onclick=()=>run(()=>api.folder(role.id));actions.append(detailsButton,folder);content.append(actions);
  const details=el('div','details');details.hidden=!expanded.has(role.id);const label=el('label','',role.visible?'选择一个动作，在桌面播放':'先开启桌面显示，再点播动作');
  const playRow=el('div','play-row'),select=el('select');select.id='action-'+role.id;label.htmlFor=select.id;select.setAttribute('aria-label',role.name+'的动作');
  for(const name of role.actions){const option=el('option','',name);option.value=name;select.append(option);}
  const play=el('button','','播放');play.disabled=busy||!role.visible;play.onclick=()=>run(()=>api.play(role.id,select.value),'正在播放：'+select.value);playRow.append(select,play);details.append(label,playRow);card.append(portrait,content,details);container.append(card);
 }
 if(!roles.length)container.append(el('p','loading','还没有角色，点击“添加角色”导入你的第一个角色项目。'));
}
document.querySelector('#refresh').onclick=()=>run(async()=>{roles=await api.list();document.querySelector('#connection').textContent='本地服务已连接';},'角色列表已更新');
document.querySelector('#hide-all').onclick=()=>run(async()=>{roles=await api.hideAll();},'所有角色已隐藏');
document.querySelector('#show-all').onclick=()=>run(async()=>{roles=await api.showAll();},'所有角色已开启');
document.querySelector('#import').onclick=()=>run(async()=>{const result=await api.import();if(result){roles=result;message('角色已导入，可开启桌面显示');}});
document.querySelector('#quit').onclick=()=>run(()=>api.quit());
api.onChanged(updated=>{roles=updated;if(!busy)render();});
run(async()=>{roles=await api.list();document.querySelector('#connection').textContent='本地服务已连接';});
