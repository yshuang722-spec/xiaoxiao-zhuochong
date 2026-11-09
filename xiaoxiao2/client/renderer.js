const api=window.petClient,container=document.querySelector('#characters'),feedback=document.querySelector('#feedback');
let roles=[],busy=false,editing=false,firstRender=false,toastTimer=0,hopId=null;const expanded=new Set(),cloneExpanded=new Set();
function message(text,error=false,action=null){
 if(text&&typeof text==='object'){action=text.action;text=text.text;}
 clearTimeout(toastTimer);feedback.replaceChildren(el('span','',text));
 if(action){const undo=el('button','toast-action',action.label);undo.onclick=()=>{clearTimeout(toastTimer);feedback.className='toast';action.run();};feedback.append(undo);}
 feedback.className='toast show'+(error?' error':'');toastTimer=setTimeout(()=>{feedback.className='toast'+(error?' error':'');},error?5000:action?5000:2400);}
const clean=e=>e.message.replace(/^Error invoking remote method '[^']+': (Error: )?/,'');
function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
async function run(task,success){if(busy)return;busy=true;document.querySelector('main').querySelectorAll('button,select,input').forEach(b=>b.disabled=true);try{await task();if(success)message(typeof success==='function'?success():success);}catch(e){message(clean(e),true);}finally{busy=false;render();}}
// 贴纸风下拉：替代系统原生 select（弹出层是白底黑字的系统样式，与整体不统一）。返回的按钮带 .value 与 .id 可当 select 用。
let openPicker=null;
function closePicker(){if(openPicker){openPicker.close();openPicker=null;}}
document.addEventListener('pointerdown',e=>{if(openPicker&&!openPicker.pop.contains(e.target)&&e.target!==openPicker.btn&&!openPicker.btn.contains(e.target))closePicker();},true);
window.addEventListener('blur',closePicker);window.addEventListener('resize',closePicker);document.addEventListener('scroll',closePicker,true);
function playNow(id,name){return api.play(id,name).then(()=>message('正在播放：'+name)).catch(e=>message(clean(e),true));}
function actionPicker(actions,labelText,onPick){
 const btn=el('button','picker-btn');btn.type='button';btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label',labelText);
 const text=el('span','picker-text',actions[0]||'');btn.append(text,el('span','picker-caret','▾'));btn.value=actions[0]||'';
 function choose(v){btn.value=v;text.textContent=v;}
 function open(){
  closePicker();const pop=el('div','picker-pop');pop.setAttribute('role','listbox');pop.setAttribute('aria-label',labelText);
  actions.forEach((a,i)=>{const o=el('button','picker-opt');o.type='button';o.setAttribute('role','option');const mark=el('span','picker-mark',a===btn.value?'✓':'');o.append(mark,el('span','picker-opt-text',a));if(a===btn.value)o.classList.add('current');o.onclick=()=>{choose(a);closePicker();btn.focus();if(onPick)onPick(a);};pop.append(o);});
  document.body.append(pop);const r=btn.getBoundingClientRect();pop.style.minWidth=r.width+'px';
  const h=Math.min(pop.scrollHeight,Math.floor(window.innerHeight*.62));pop.style.maxHeight=h+'px';
  const below=window.innerHeight-r.bottom-12,up=r.top-12;const down=below>=h||below>=up;
  pop.style.left=Math.max(8,Math.min(r.left,window.innerWidth-pop.offsetWidth-8))+'px';
  pop.style.top=(down?r.bottom+6:Math.max(8,r.top-6-h))+'px';
  btn.setAttribute('aria-expanded','true');requestAnimationFrame(()=>{pop.classList.add('show');pop.querySelector('.current')?.scrollIntoView({block:'nearest'});});
  openPicker={pop,btn,close(){btn.setAttribute('aria-expanded','false');pop.remove();}};
  pop.addEventListener('keydown',e=>{const items=[...pop.querySelectorAll('.picker-opt')],i=items.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();items[Math.min(items.length-1,i+1)].focus();}else if(e.key==='ArrowUp'){e.preventDefault();items[Math.max(0,i-1)].focus();}else if(e.key==='Escape'){e.preventDefault();closePicker();btn.focus();}});
  (pop.querySelector('.current')||pop.querySelector('.picker-opt'))?.focus({preventScroll:true});
 }
 btn.onclick=()=>{if(openPicker&&openPicker.btn===btn)closePicker();else open();};
 btn.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!openPicker||openPicker.btn!==btn)open();}});
 return btn;
}
// Each role's 100% is its aligned default size, so every role looks about the same at 100%.
const DEFAULT_SIZE={character11:600,character12:590,character13:590};
const defaultSize=role=>DEFAULT_SIZE[role.roleId||role.entry]||500;
let sliding=false;
function sizeControl(role){
 const base=defaultSize(role),box=el('div','size-control');box.dataset.sizeFor=role.id;
 const label=el('span','size-label','大小'),range=el('input','size-range'),value=el('output','size-value');
 range.type='range';range.min='50';range.max='150';range.step='1';range.value=String(Math.round(role.size/base*100));range.disabled=busy;range.setAttribute('aria-label',role.name+'的大小');
 const show=()=>{value.textContent=range.value+'%';range.style.setProperty('--fill',(range.value-50)+'%');value.classList.toggle('is-default',range.value==='100');};show();
 let timer=0;const send=()=>api.resize(role.id,Math.max(120,Math.round(base*range.value/100))).then(r=>{roles=r;}).catch(e=>message(clean(e),true));
 range.onpointerdown=()=>{sliding=true;};
 range.oninput=()=>{const v=Number(range.value);if(v!==100&&Math.abs(v-100)<=3){range.value='100';box.classList.remove('snap');void box.offsetWidth;box.classList.add('snap');}show();clearTimeout(timer);timer=setTimeout(send,220);};
 range.onchange=()=>{clearTimeout(timer);sliding=false;send().then(()=>{message(role.name+'的大小：'+range.value+'%');render();});};
 const reset=el('button','quiet small','恢复 100%');reset.disabled=busy||range.value==='100';reset.onclick=()=>{range.value='100';show();send().then(()=>{message(role.name+'已恢复默认大小');render();});};
 box.append(label,range,value,reset);return box;
}
function render(){closePicker();
 container.replaceChildren();container.classList.toggle('editing',editing);document.querySelectorAll('header button,.toolbar button,#prefs-page button').forEach(b=>b.disabled=busy);
 const originals=roles.filter(r=>!r.isClone),clones=roles.filter(r=>r.isClone);
 const onDesk=roles.filter(r=>r.visible).length,summary=document.querySelector('#summary');summary.replaceChildren(el('span','chip',originals.length+' 位角色'),el('span','chip'+(onDesk?' on':''),onDesk?onDesk+' 位在桌面上':'都在休息'));if(clones.length)summary.append(el('span','chip',clones.length+' 个分身'));
 for(const role of originals){
  const card=el('article','character'+(firstRender?' enter':''));card.dataset.id=role.id;card.dataset.entry=role.entry;card.style.setProperty('--i',String(originals.indexOf(role)));
  const portrait=el('div','portrait');
  if(role.poster){const image=el('img','poster');image.src=role.poster;image.alt=role.name;portrait.append(image);tintCard(card,role,image);}
  if(role.poster&&role.preview){const v=attachIdle(portrait,role);card.addEventListener('pointerenter',()=>startIdle(v));card.addEventListener('pointerleave',()=>stopIdle(v));card.addEventListener('focusin',()=>startIdle(v));card.addEventListener('focusout',e=>{if(!card.contains(e.relatedTarget))stopIdle(v);});}
  else if(role.preview){const video=el('video');video.src=role.preview;video.muted=true;video.preload='auto';video.playsInline=true;video.addEventListener('loadeddata',()=>video.pause(),{once:true});portrait.append(video);}else portrait.append(el('span','fallback',role.name.slice(0,1)));

  portrait.append(el('span',role.visible?'state visible':'state',role.visible?'在桌面上':'休息中'));
  if(hopId===role.id){card.classList.add('hop');hopId=null;}
  const content=el('div','character-content'),row=el('div','title-row');
  const order=originals.map(r=>r.entry),at=order.indexOf(role.entry);
  const moveTo=(from,to)=>{if(from===to||from<0||to<0)return;const next=order.slice();const [m]=next.splice(from,1);next.splice(to,0,m);run(async()=>{roles=await api.reorder(next);},'角色顺序已更新');};
  const grip=el('span','grip','⠿');grip.draggable=editing;grip.title='按住拖动，调整角色位置';grip.setAttribute('aria-label',role.name+'拖动排序');
  grip.ondragstart=e=>{e.dataTransfer.setData('text/plain',role.entry);e.dataTransfer.effectAllowed='move';e.dataTransfer.setDragImage(card,24,24);card.classList.add('dragging');};
  grip.ondragend=()=>card.classList.remove('dragging');
  card.ondragover=e=>{if(!editing)return;e.preventDefault();e.dataTransfer.dropEffect='move';card.classList.add('drop-target');};card.ondragleave=()=>card.classList.remove('drop-target');
  card.ondrop=e=>{if(!editing)return;e.preventDefault();card.classList.remove('drop-target');moveTo(order.indexOf(e.dataTransfer.getData('text/plain')),at);};
  const up=el('button','quiet reorder','↑'),down=el('button','quiet reorder','↓');up.title='前移一位';down.title='后移一位';up.disabled=busy||at<=0;down.disabled=busy||at>=order.length-1;up.setAttribute('aria-label',role.name+'前移');down.setAttribute('aria-label',role.name+'后移');up.onclick=()=>moveTo(at,at-1);down.onclick=()=>moveTo(at,at+1);
  const mover=el('span','mover');mover.hidden=!editing;mover.append(grip,up,down);row.append(el('h2','',role.name));
  const toggle=el('button','switch');toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked',String(role.visible));toggle.setAttribute('aria-label',`${role.visible?'隐藏':'显示'}${role.name}`);toggle.disabled=busy;
  toggle.onclick=()=>{const was=role.visible;if(!was)hopId=role.id;run(async()=>{roles=await api.toggle(role.id,!was);},()=>was?{text:role.name+'已隐藏',action:{label:'撤销',run:()=>run(async()=>{roles=await api.toggle(role.id,true);},role.name+'回来了')}}:role.name+'已显示在桌面');};row.append(toggle);content.append(row,el('p','role-count',`${role.actions.length} 个动作`));
  const actions=el('div','character-actions'),detailsButton=el('button','quiet',expanded.has(role.id)?'收起动作':'查看动作'),folder=el('button','quiet','角色编辑');
  detailsButton.setAttribute('aria-expanded',String(expanded.has(role.id)));detailsButton.onclick=()=>{expanded.has(role.id)?expanded.delete(role.id):expanded.add(role.id);render();};folder.onclick=()=>window.openRoleEditor(role.id);const plButton=el('button','quiet','轮播编排');plButton.onclick=()=>window.openPlaylist(role);const gpButton=el('button','quiet','动作分类');gpButton.onclick=()=>window.openGroups(role);actions.append(detailsButton,gpButton,plButton,folder);
  const clone=el('button','quiet',`添加分身（${role.cloneCount||0}/8）`);clone.disabled=busy||role.cloneCount>=8;clone.title='每个角色最多添加8个分身，本体不计入上限';clone.onclick=()=>run(async()=>{roles=await api.clone(role.id);cloneExpanded.add(role.entry);},'分身已添加并显示在桌面');actions.append(clone);
  const children=clones.filter(c=>c.entry===role.entry);
  const manage=el('button','quiet',`${cloneExpanded.has(role.entry)?'收起分身':'分身管理'}（${children.length}/8）`);manage.disabled=busy;manage.setAttribute('aria-expanded',String(cloneExpanded.has(role.entry)));manage.setAttribute('aria-controls','clones-'+role.id);manage.onclick=()=>{cloneExpanded.has(role.entry)?cloneExpanded.delete(role.entry):cloneExpanded.add(role.entry);render();};actions.append(manage);
  const panel=el('section','clone-panel');panel.id='clones-'+role.id;panel.hidden=!cloneExpanded.has(role.entry);panel.setAttribute('aria-label',role.name+'的分身管理');
  panel.append(el('p','clone-heading',role.name+'的分身（'+children.length+'/8）'));
  if(!children.length)panel.append(el('p','clone-empty','还没有分身，点击“添加分身”创建。'));
  for(const child of children){
    const item=el('div','clone-item');item.dataset.cloneId=child.id;
    const line=el('div','clone-line'),name=el('span','clone-name',child.name),state=el('span','clone-status',child.visible?'在桌面上':'休息中');line.append(name,state);
    const toggle=el('button','quiet',child.visible?'隐藏':'显示');toggle.disabled=busy;toggle.setAttribute('aria-label',(child.visible?'隐藏':'显示')+child.name);toggle.onclick=()=>run(async()=>{roles=await api.toggle(child.id,!child.visible);});
    const remove=el('button','quiet','移除分身');remove.disabled=busy;remove.onclick=()=>run(async()=>{roles=await api.removeClone(child.id);},'分身已移除');line.append(toggle,remove);item.append(line,sizeControl(child));
    const chooser=el('details','clone-action-details'),summary=el('summary','', '动作点播');chooser.append(summary);const row=el('div','play-row'),select=actionPicker(child.actions,child.name+'的动作',a=>child.visible?playNow(child.id,a):message('先显示这个分身，再点播动作',true));
    const play=el('button','','播放');play.disabled=busy||!child.visible;play.onclick=()=>run(()=>api.play(child.id,select.value),'正在播放：'+select.value);row.append(select,play);chooser.append(row);item.append(chooser);panel.append(item);
  }

  content.append(actions,sizeControl(role));
  const details=el('div','details');details.hidden=!expanded.has(role.id);const label=el('label','',role.visible?'点选一个动作，桌面上的角色立刻演给你看':'先开启桌面显示，再点播动作');
  const playRow=el('div','play-row'),select=actionPicker(role.actions,role.name+'的动作',a=>role.visible?playNow(role.id,a):message('先开启桌面显示，再点播动作',true));select.id='action-'+role.id;label.htmlFor=select.id;
  const play=el('button','','播放');play.disabled=busy||!role.visible;play.onclick=()=>run(()=>api.play(role.id,select.value),'正在播放：'+select.value);playRow.append(select,play);details.append(label,playRow);card.append(portrait,content,details,panel);container.append(card);
 }
 if(!roles.length)container.append(el('p','loading empty','还没有角色呢。点右上角「添加角色」，把第一位伙伴请进来吧。'));
 if(roles.length)firstRender=false;
}
document.querySelector('#refresh').onclick=()=>run(async()=>{roles=await api.list();document.querySelector('#connection').textContent='本地服务已连接';},'角色列表已更新');
document.querySelector('#hide-all').onclick=()=>{const was=roles.filter(r=>r.visible).map(r=>r.id);if(!was.length){message('桌面上已经没有角色了');return;}run(async()=>{roles=await api.hideAll();},()=>({text:'所有角色已隐藏',action:{label:'撤销',run:()=>run(async()=>{for(const id of was)roles=await api.toggle(id,true);},'角色们回来了')}}));};
const collisionButton=document.querySelector('#collision');
function showCollision(on){collisionButton.setAttribute('aria-checked',String(on));}
api.collision().then(showCollision).catch(()=>{});
collisionButton.onclick=()=>{const next=collisionButton.getAttribute('aria-checked')!=='true';showCollision(next);run(async()=>{showCollision(await api.setCollision(next));},next?'角色碰撞已开启：把角色甩向另一个角色试试':'角色碰撞已关闭');};
const editButton=document.querySelector('#edit-order');
window.cardReorder=next=>{if(busy)return;run(async()=>{roles=await api.reorder(next);},'角色顺序已更新');};
if(editButton)editButton.onclick=()=>{editing=!editing;editButton.textContent=editing?'完成':'编辑顺序';editButton.setAttribute('aria-pressed',String(editing));editButton.classList.toggle('active',editing);document.querySelector('#edit-hint').hidden=!editing;render();};
const pages={home:document.querySelector('#home'),prefs:document.querySelector('#prefs-page')};
document.querySelector('nav').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const page=b.dataset.page;
 if(!page){pages.prefs.hidden=true;document.querySelector('#open-prefs').removeAttribute('aria-current');return;}
 const ai=document.querySelector('#settings-page');if(ai)ai.hidden=true;document.querySelector('#open-ai')?.removeAttribute('aria-current');
 for(const [name,node] of Object.entries(pages)){node.hidden=name!==page;node.classList.toggle('page-in',name===page);}
 document.querySelectorAll('nav [data-page]').forEach(n=>n.toggleAttribute('aria-current',n===b));if(page==='prefs')api.collision().then(showCollision).catch(()=>{});});
document.querySelector('#show-all').onclick=()=>{const was=roles.filter(r=>!r.visible).map(r=>r.id);if(!was.length){message('所有角色都已经在桌面上了');return;}run(async()=>{roles=await api.showAll();},()=>({text:'所有角色已开启',action:{label:'撤销',run:()=>run(async()=>{for(const id of was)roles=await api.toggle(id,false);},'已恢复原来的样子')}}));};
document.querySelector('#import').onclick=()=>window.openImportGuide(()=>run(async()=>{const result=await api.import();if(result){roles=result;message('角色已导入，可开启桌面显示');}}));
let quitArmed=0;const quitButton=document.querySelector('#quit'),quitNote=document.querySelector('#quit-note');
quitButton.onclick=()=>{if(!quitArmed){quitArmed=setTimeout(()=>{quitArmed=0;quitButton.classList.remove('armed');quitNote.textContent='桌面上的所有角色都会离开';},3000);quitButton.classList.add('armed');quitNote.textContent='再点一次确认退出';return;}clearTimeout(quitArmed);quitArmed=0;run(()=>api.quit());};
api.onChanged(updated=>{roles=updated;if(!busy&&!sliding)render();});
// Cards stay still on the poster; hovering (or keyboard focus) plays the role's idle animation.
// Video elements are kept across renders, and each clip is framed like the poster (figure 80% high, feet at 94%).
const idleVideos=new Map(),idleBoxes=new Map(Object.entries(window.IDLE_BOXES||{}));
function startIdle(v){v.dataset.hover='1';clearTimeout(v._rel);if(!v.getAttribute('src')&&v.dataset.src){v.src=v.dataset.src;}if(v.readyState>=2){fitIdle(v);v.parentElement?.classList.add('live');}v.play().catch(()=>{});}
function stopIdle(v){delete v.dataset.hover;v.pause();v.parentElement?.classList.remove('live');setTimeout(()=>{if(!v.dataset.hover)v.currentTime=0;},400);clearTimeout(v._rel);v._rel=setTimeout(()=>{if(!v.dataset.hover&&v.getAttribute('src')){v.removeAttribute('src');v.load();}},3000);}
function measureIdle(v,entry){
 if(idleBoxes.has(entry))return true;
 try{const s=Math.min(1,240/v.videoWidth),w=Math.round(v.videoWidth*s),h=Math.round(v.videoHeight*s),c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(v,0,0,w,h);const d=g.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>40){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<x0)return false;idleBoxes.set(entry,[x0/w,y0/h,(x1+1)/w,(y1+1)/h]);return true;}catch(e){return false;}
}
function fitIdle(v){
 const portrait=v.parentElement,box=idleBoxes.get(v.dataset.entry);if(!portrait)return;
 if(!box){v.classList.add('contain');return;}
 const W=portrait.clientWidth,H=portrait.clientHeight,w=v.videoWidth,h=v.videoHeight;if(!W||!H||!w||!h)return;
 const k=H*.84/((box[3]-box[1])*h);
 Object.assign(v.style,{width:w*k+'px',height:h*k+'px',left:(W/2-(box[0]+box[2])/2*w*k)+'px',top:(H*.93-box[3]*h*k)+'px'});
}
function attachIdle(portrait,role){
 let v=idleVideos.get(role.id);
 if(!v||v.dataset.src!==role.preview){
  v=document.createElement('video');v.className='idle';v.muted=true;v.loop=true;v.playsInline=true;v.preload='none';v.dataset.src=role.preview;v.dataset.entry=role.entry;v.setAttribute('aria-hidden','true');
  v.addEventListener('loadeddata',()=>{measureIdle(v,role.entry);fitIdle(v);});
  v.addEventListener('playing',()=>{fitIdle(v);if(v.dataset.hover)v.parentElement?.classList.add('live');else v.pause();});
  idleVideos.set(role.id,v);
 }
 portrait.append(v);if(v.readyState>=2)fitIdle(v);
 if(v.dataset.hover){portrait.classList.add('live');v.play().catch(()=>{});}
 return v;
}
window.addEventListener('resize',()=>{for(const v of idleVideos.values())if(v.isConnected)fitIdle(v);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const v of idleVideos.values())stopIdle(v);});
// Role theme colour: the most colourful average of the poster, cached per role.
const roleColors=new Map();
function tintCard(card,role,image){
 const apply=c=>{card.style.setProperty('--role',c);};
 if(roleColors.has(role.entry)){apply(roleColors.get(role.entry));return;}
 const pick=()=>{try{const c=document.createElement('canvas');c.width=c.height=48;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0,48,48);const d=g.getImageData(0,0,48,48).data;
  let r=0,gr=0,b=0,n=0;for(let i=0;i<d.length;i+=4){if(d[i+3]<200)continue;const mx=Math.max(d[i],d[i+1],d[i+2]),mn=Math.min(d[i],d[i+1],d[i+2]);if(mx-mn<60||mx<70)continue;r+=d[i];gr+=d[i+1];b+=d[i+2];n++;}
  if(n){const color=`rgb(${Math.round(r/n)},${Math.round(gr/n)},${Math.round(b/n)})`;roleColors.set(role.entry,color);apply(color);}}catch(e){}};
 image.complete?pick():image.addEventListener('load',pick,{once:true});
}
// Preferences: auto-away lives in the main process; appearance and text size belong to this window.
const autoAway=document.querySelector('#auto-away');
api.prefs().then(p=>autoAway.setAttribute('aria-checked',String(p.autoAway))).catch(()=>{});
autoAway.onclick=()=>{const next=autoAway.getAttribute('aria-checked')!=='true';autoAway.setAttribute('aria-checked',String(next));api.setPref('autoAway',next).then(()=>message(next?'全屏时角色会自动躲起来':'全屏时角色会留在桌面')).catch(e=>message(clean(e),true));};
const store={get:(k,d)=>{try{return localStorage.getItem(k)??d;}catch(e){return d;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}}};
const darkQuery=window.matchMedia('(prefers-color-scheme: dark)');
function applyLook(){const theme=store.get('theme','auto'),zoom=store.get('zoom','1');document.documentElement.dataset.mode=theme==='dark'||(theme==='auto'&&darkQuery.matches)?'dark':'light';document.body.style.zoom=zoom;
 for(const [id,val] of [['#theme-choice',theme],['#zoom-choice',zoom]])document.querySelectorAll(id+' button').forEach(b=>{const on=b.dataset.value===val;b.classList.toggle('selected',on);b.setAttribute('aria-checked',String(on));});}
darkQuery.addEventListener('change',applyLook);
document.querySelectorAll('#theme-choice button').forEach(b=>b.onclick=()=>{store.set('theme',b.dataset.value);applyLook();});
document.querySelectorAll('#zoom-choice button').forEach(b=>b.onclick=()=>{store.set('zoom',b.dataset.value);applyLook();});
applyLook();
// First-run guide.
const guide=document.querySelector('#guide'),steps=[...guide.querySelectorAll('.guide-step')],dots=[...guide.querySelectorAll('.guide-dots i')];let step=0;
function showStep(i){step=i;steps.forEach((s,k)=>{s.hidden=k!==i;});dots.forEach((d,k)=>d.classList.toggle('on',k===i));document.querySelector('#guide-next').textContent=i===steps.length-1?'开始使用':'下一步';}
function openGuide(){showStep(0);guide.showModal();}
function closeGuide(){guide.close();store.set('guide-v1','done');}
document.querySelector('#guide-next').onclick=()=>step<steps.length-1?showStep(step+1):closeGuide();
document.querySelector('#guide-skip').onclick=closeGuide;guide.addEventListener('cancel',()=>store.set('guide-v1','done'));
document.querySelector('#replay-guide').onclick=openGuide;
if(store.get('guide-v1','')!=='done')setTimeout(openGuide,600);
run(async()=>{roles=await api.list();document.querySelector('#connection').textContent='本地服务已连接';});

// Artemis logo: grows out of the sidebar tile into a large view; clicking the empty area shrinks it back.
const logoButton=document.querySelector('#logo-button'),logoView=document.querySelector('#logo-view'),logoBig=logoView.querySelector('img');
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
function logoFrom(){const a=logoButton.getBoundingClientRect(),b=logoBig.getBoundingClientRect();return `translate(${a.left+a.width/2-(b.left+b.width/2)}px,${a.top+a.height/2-(b.top+b.height/2)}px) scale(${a.width/b.width}) rotate(4deg)`;}
function openLogo(){
 logoBig.src=document.documentElement.dataset.mode==='dark'?'assets/logo-dark-sq.png':'assets/logo-light-sq.png';
 logoView.hidden=false;logoButton.style.visibility='hidden';
 if(reduceMotion.matches)return;
 logoBig.animate([{transform:logoFrom(),borderRadius:'26px'},{transform:'none',borderRadius:'56px'}],{duration:480,easing:'cubic-bezier(.34,1.3,.64,1)'});
 logoView.animate([{opacity:0},{opacity:1}],{duration:260,easing:'ease-out'});
}
function closeLogo(){
 if(logoView.hidden||logoView.dataset.closing)return;
 const done=()=>{logoView.hidden=true;delete logoView.dataset.closing;logoButton.style.visibility='';logoView.getAnimations().forEach(a=>a.cancel());};
 if(reduceMotion.matches){done();return;}
 logoView.dataset.closing='1';
 logoBig.animate([{transform:'none',borderRadius:'56px'},{transform:logoFrom(),borderRadius:'26px'}],{duration:360,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).finished.then(()=>{done();logoBig.getAnimations().forEach(a=>a.cancel());});
 logoView.animate([{opacity:1},{opacity:0}],{duration:360,easing:'ease-in',fill:'forwards'});
}
logoButton.onclick=openLogo;
logoView.addEventListener('click',e=>{if(e.target===logoView)closeLogo();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLogo();});
