const api=window.petClient,container=document.querySelector('#characters'),feedback=document.querySelector('#feedback');
let roles=[],busy=false;const expanded=new Set(),cloneExpanded=new Set();
function message(text,error=false){feedback.textContent=text;feedback.className=error?'error':'';}
function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
async function run(task,success){if(busy)return;busy=true;document.querySelector('main').querySelectorAll('button,select,input').forEach(b=>b.disabled=true);try{await task();if(success)message(success);}catch(e){message(e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/,''),true);}finally{busy=false;render();}}
function sizeControl(role){
 const box=el('div','size-control');box.dataset.sizeFor=role.id;
 const label=el('label','size-label','显示大小'),range=el('input','size-range'),number=el('input','size-number');
 range.type='range';number.type='number';range.min=number.min='120';range.max=number.max='2000';range.step=number.step='1';range.value=number.value=String(role.size);range.disabled=number.disabled=busy;
 number.id='size-'+role.id;label.htmlFor=number.id;range.setAttribute('aria-label',role.name+'的大小滑块');number.setAttribute('aria-label',role.name+'的大小数值');
 range.oninput=()=>{number.value=range.value;};number.oninput=()=>{if(number.validity.valid)range.value=number.value;};
 const apply=el('button','quiet','应用'),reset=el('button','quiet','恢复默认');apply.disabled=reset.disabled=busy;
 apply.onclick=()=>{if(!number.reportValidity()||!number.value)return;run(async()=>{roles=await api.resize(role.id,Number(number.value));},role.name+'的大小已更新');};
 reset.onclick=()=>run(async()=>{roles=await api.resize(role.id,462);},role.name+'已恢复默认大小');
 box.append(label,range,number,apply,reset);return box;
}
function render(){
 container.replaceChildren();document.querySelectorAll('header button,.toolbar button,footer button').forEach(b=>b.disabled=busy);
 const originals=roles.filter(r=>!r.isClone),clones=roles.filter(r=>r.isClone);
 document.querySelector('#summary').textContent=`${originals.length} 位角色 · ${clones.length} 个分身 · ${roles.filter(r=>r.visible).length} 个实例正在桌面陪伴`;
 for(const role of originals){
  const card=el('article','character');card.dataset.id=role.id;
  const portrait=el('div','portrait');
  if(role.preview){const video=el('video');video.src=role.preview;video.muted=true;video.loop=true;video.autoplay=true;video.playsInline=true;if(role.poster)video.poster=role.poster;portrait.append(video);}
  else if(role.poster){const image=el('img');image.src=role.poster;image.alt=role.name;portrait.append(image);}else portrait.append(el('span','fallback',role.name.slice(0,1)));
  portrait.append(el('span',role.visible?'state visible':'state',role.visible?'桌面显示中':'已隐藏'));
  const content=el('div','character-content'),row=el('div','title-row');row.append(el('h2','',role.name));
  const toggle=el('button','switch');toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked',String(role.visible));toggle.setAttribute('aria-label',`${role.visible?'隐藏':'显示'}${role.name}`);toggle.disabled=busy;
  toggle.onclick=()=>run(async()=>{roles=await api.toggle(role.id,!role.visible);},`${role.name}${role.visible?'已隐藏':'已显示在桌面'}`);row.append(toggle);content.append(row,el('p','role-count',`${role.actions.length} 个动作 · 独立角色项目`));
  const actions=el('div','character-actions'),detailsButton=el('button','quiet',expanded.has(role.id)?'收起动作':'查看动作'),folder=el('button','quiet','角色文件夹');
  detailsButton.setAttribute('aria-expanded',String(expanded.has(role.id)));detailsButton.onclick=()=>{expanded.has(role.id)?expanded.delete(role.id):expanded.add(role.id);render();};folder.onclick=()=>run(()=>api.folder(role.id));actions.append(detailsButton,folder);
  const clone=el('button','quiet',`添加分身（${role.cloneCount||0}/8）`);clone.disabled=busy||role.cloneCount>=8;clone.title='每个角色最多添加8个分身，本体不计入上限';clone.onclick=()=>run(async()=>{roles=await api.clone(role.id);cloneExpanded.add(role.entry);},'分身已添加并显示在桌面');actions.append(clone);
  const children=clones.filter(c=>c.entry===role.entry);
  const manage=el('button','quiet',`${cloneExpanded.has(role.entry)?'收起分身':'分身管理'}（${children.length}/8）`);manage.disabled=busy;manage.setAttribute('aria-expanded',String(cloneExpanded.has(role.entry)));manage.setAttribute('aria-controls','clones-'+role.id);manage.onclick=()=>{cloneExpanded.has(role.entry)?cloneExpanded.delete(role.entry):cloneExpanded.add(role.entry);render();};actions.append(manage);
  const panel=el('section','clone-panel');panel.id='clones-'+role.id;panel.hidden=!cloneExpanded.has(role.entry);panel.setAttribute('aria-label',role.name+'的分身管理');
  panel.append(el('p','clone-heading',role.name+'的分身（'+children.length+'/8）'));
  if(!children.length)panel.append(el('p','clone-empty','还没有分身，点击“添加分身”创建。'));
  for(const child of children){
    const item=el('div','clone-item');item.dataset.cloneId=child.id;
    const line=el('div','clone-line'),name=el('span','clone-name',child.name),state=el('span','clone-status',child.visible?'桌面显示中':'已隐藏');line.append(name,state);
    const toggle=el('button','quiet',child.visible?'隐藏':'显示');toggle.disabled=busy;toggle.setAttribute('aria-label',(child.visible?'隐藏':'显示')+child.name);toggle.onclick=()=>run(async()=>{roles=await api.toggle(child.id,!child.visible);});
    const remove=el('button','quiet','移除分身');remove.disabled=busy;remove.onclick=()=>run(async()=>{roles=await api.removeClone(child.id);},'分身已移除');line.append(toggle,remove);item.append(line,sizeControl(child));
    const chooser=el('details','clone-action-details'),summary=el('summary','', '动作点播');chooser.append(summary);const row=el('div','play-row'),select=el('select');select.setAttribute('aria-label',child.name+'的动作');
    for(const action of child.actions){const option=el('option','',action);option.value=action;select.append(option);}
    const play=el('button','','播放');play.disabled=busy||!child.visible;play.onclick=()=>run(()=>api.play(child.id,select.value),'正在播放：'+select.value);row.append(select,play);chooser.append(row);item.append(chooser);panel.append(item);
  }

  content.append(actions,sizeControl(role));
  const details=el('div','details');details.hidden=!expanded.has(role.id);const label=el('label','',role.visible?'选择一个动作，在桌面播放':'先开启桌面显示，再点播动作');
  const playRow=el('div','play-row'),select=el('select');select.id='action-'+role.id;label.htmlFor=select.id;select.setAttribute('aria-label',role.name+'的动作');
  for(const name of role.actions){const option=el('option','',name);option.value=name;select.append(option);}
  const play=el('button','','播放');play.disabled=busy||!role.visible;play.onclick=()=>run(()=>api.play(role.id,select.value),'正在播放：'+select.value);playRow.append(select,play);details.append(label,playRow);card.append(portrait,content,details,panel);container.append(card);
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
