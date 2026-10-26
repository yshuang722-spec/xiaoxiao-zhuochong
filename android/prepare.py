from pathlib import Path
import json,re,subprocess,hashlib,shutil
root=Path(__file__).resolve().parent;base=Path.home()/'.dsh/dsh-pet/characters'
ff=root.parent/'ojousama/dsh-pet/.tools/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe'
engine=Path.home()/'AppData/Local/Programs/XiaoXiaoZhuoChong/resources/engine/assets'
def load(p):
 s=p.read_text(encoding='utf-8-sig');s=re.sub(r'("(?:\\.|[^"\\])*"|//[^\n]*|/\*[\s\S]*?\*/)',lambda m:m[0] if m[0].startswith('"') else '',s);s=re.sub(r',\s*([}\]])',r'\1',s);return json.loads(s)
defaults=load(engine/'config.jsonc');catalog=[];report=[]
roles=[('main','蓝毛小女仆','待机呼吸休闲'),('ojousama','橙毛大小姐','待机-翻书'),('character3','黄毛该溜子','左右观察'),('character4','白毛小龙娘','待机观望'),('character5','黑毛小狐狸','东张西望')]
for role,title,idle in roles:
 cfg=load(base/role/'config.json') if (base/role/'config.json').exists() else defaults
 anim=cfg['animations'];folder=root/'assets'/role;folder.mkdir(parents=True,exist_ok=True)
 groups={};names=set()
 for cat in anim.get('categories',[]):groups[cat['id']]=cat.get('actions',[]);names.update(groups[cat['id']])
 for key,label in [('idle','待机'),('clicks','点击回应'),('drag','拖动')]:
  groups[label]=anim.get(key,[]);names.update(groups[label])
 for event,items in anim.get('events',{}).items():
  if isinstance(items,list):groups['事件·'+event]=[x for x in items if isinstance(x,str)];names.update(groups['事件·'+event])
 names.add(idle);names={n for n in names if isinstance(n,str)}
 files={};duration={}
 for n,name in enumerate(sorted(names)):
  src=base/role/'animations'/(name+'.webm')
  if not src.exists():src=engine/'webm'/(name+'.webm')
  if not src.exists():raise FileNotFoundError(src)
  target=folder/f'{n:03}.mp4';files[name]=role+'/'+target.name
  if not target.exists():
   filt='[0:v]scale=640:480:force_original_aspect_ratio=decrease,pad=640:480:(ow-iw)/2:(oh-ih)/2:color=black@0,format=yuva420p,split[c][a];[a]alphaextract,format=yuv420p[a1];[c]format=yuv420p[c1];[c1][a1]hstack[v]'
   subprocess.run([str(ff),'-v','error','-n','-c:v','libvpx-vp9','-i',str(src),'-filter_complex',filt,'-map','[v]','-an','-r','30','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(target)],check=True)
  subprocess.run([str(ff),'-v','error','-i',str(target),'-f','null','-'],check=True)
  meta=json.loads(subprocess.check_output([str(ff.with_name('ffprobe.exe')),'-v','error','-show_format','-of','json',str(target)]));duration[name]=float(meta['format']['duration'])
  report.append(dict(role=role,name=name,source=str(src),output=str(target),sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
  print(role,name,flush=True)
 # Preserve the ten already visually tested/aligned clips from the basic version.
 basic={'main':('待机呼吸休闲','被吓一跳'),'ojousama':('待机-翻书','优雅转圈'),'character3':('左右观察','打电话'),'character4':('待机观望','挥手打招呼'),'character5':('东张西望','追蝴蝶')}[role]
 for kind,name in zip(('idle','action'),basic):
  if name in files:shutil.copy2(root.parent/'android-lite/assets'/role/(kind+'.mp4'),root/'assets'/files[name])
 thumb=folder/'portrait.png'
 subprocess.run([str(ff),'-v','error','-y','-i',str(root/'assets'/files[idle]),'-filter_complex','[0:v]split[c][a];[c]crop=640:480:0:0[c1];[a]crop=640:480:640:0,format=gray[a1];[c1][a1]alphamerge,scale=320:240[v]','-map','[v]','-frames:v','1',str(thumb)],check=True)
 persona=load(base/role/'人设.json')
 catalog.append(dict(id=role,name=title,idle=idle,groups=groups,files=files,durations=duration,prompt=persona['whisperPrompt'],portrait=role+'/portrait.png'))
 (root/'assets/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False),encoding='utf-8')
 (root/'build/conversion-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('COMPLETE',len(report),flush=True)
