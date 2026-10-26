"""Desktop-side asset preparation. Existing calibrated mobile videos stay stable.
New actions align their first-frame subject to that role's existing mobile idle.
This tool is not packaged inside the APK. Requires NumPy, Pillow and FFmpeg.
"""
from pathlib import Path
import json,hashlib,subprocess,shutil,os,re
import numpy as np
from PIL import Image,ImageFilter,ImageDraw
ROOT=Path(__file__).resolve().parent
BASE=Path(os.environ.get('XIAOXIAO_CHARACTER_ROOT',str(Path.home()/'.dsh/dsh-pet/characters')))
ENGINE=Path(os.environ.get('XIAOXIAO_ENGINE_ASSETS',str(Path.home()/'AppData/Local/Programs/XiaoXiaoZhuoChong/resources/engine/assets')))
FF=shutil.which('ffmpeg') or str(next((Path.home()/'AppData/Local/Microsoft/WinGet/Packages').glob('Gyan.FFmpeg*/ffmpeg-*/bin/ffmpeg.exe')))
FP=str(Path(FF).with_name('ffprobe.exe'))
ROLES=[('main','蓝毛小女仆','待机呼吸休闲'),('ojousama','橙毛大小姐','待机-翻书'),('character3','黄毛该溜子','左右观察'),('character4','白毛小龙娘','待机观望'),('character5','黑毛小狐狸','东张西望'),('character6','奶茶千金','待机观望')]

def load(p):
 s=p.read_text(encoding='utf-8-sig');s=re.sub(r'("(?:\\.|[^"\\])*"|//[^\n]*|/\*[\s\S]*?\*/)',lambda m:m[0] if m[0].startswith('"') else '',s);return json.loads(re.sub(r',\s*([}\]])',r'\1',s))
def run(args):return subprocess.check_output([str(x) for x in args])
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def probe(p):return json.loads(run([FP,'-v','error','-show_streams','-show_format','-of','json',p]))
def first(p,packed=False):
 if packed:
  filt='[0:v]split[c][a];[c]crop=640:480:0:0[c1];[a]crop=640:480:640:0,format=gray[a1];[c1][a1]alphamerge[v]'
  raw=run([FF,'-v','error','-i',p,'-filter_complex',filt,'-map','[v]','-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-']);return np.frombuffer(raw,np.uint8).reshape(480,640,4)
 info=next(s for s in probe(p)['streams'] if s['codec_type']=='video');raw=run([FF,'-v','error','-c:v','libvpx-vp9','-i',p,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-']);return np.frombuffer(raw,np.uint8).reshape(info['height'],info['width'],4)
def subject(a):
 mask=a[:,:,3]>32;ys,xs=np.where(mask);assert len(xs)>10
 # Join tiny gaps in clothing/feet, then select the component nearest the torso.
 im=Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7));dm=np.asarray(im);yy,xx=np.where(dm>0);score=(xx-a.shape[1]*.5)**2+(yy-a.shape[0]*.60)**2;seed=int(score.argmin());ImageDraw.floodfill(im,(int(xx[seed]),int(yy[seed])),128)
 ys,xs=np.where(mask & (np.asarray(im)==128));assert len(xs)>10
 return [int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
def flatten(x):return [x] if isinstance(x,str) else sum((flatten(v) for v in x),[]) if isinstance(x,list) else []
def source(role,name):
 p=BASE/role/'animations'/(name+'.webm')
 if not p.exists():p=ENGINE/'webm'/(name+'.webm')
 assert p.is_file(),p
 return p
old={r['id']:r for r in load(ROOT/'assets/catalog.json')};hp=ROOT/'build/mobile-source-hashes.json';hashes=load(hp) if hp.exists() else {};catalog=[];report=[]
for role,title,idle in ROLES:
 cfg=BASE/role/('config.jsonc' if role=='main' else 'config.json');cfg=load(cfg);cfg=cfg if 'animations' in cfg else {**load(ENGINE/'config.jsonc'),**cfg};anim=cfg['animations'];groups={c['id']:c.get('actions',[]) for c in anim.get('categories',[])}
 for k,label in [('idle','待机'),('clicks','点击回应'),('drag','拖动')]:groups[label]=anim.get(k,[])
 for k,v in anim.get('events',{}).items():groups['事件·'+k]=flatten(v)
 names=set(x for values in groups.values() for x in values);names.update(anim.get('turn',[]));names.update(x['name'] for x in anim.get('moves',{}).get('actions',[]));names.add(idle)
 prior=old.get(role,{});files={n:f for n,f in prior.get('files',{}).items() if n in names};duration={n:v for n,v in prior.get('durations',{}).items() if n in names};bounds={n:v for n,v in prior.get('bounds',{}).items() if n in names};folder=ROOT/'assets'/role;folder.mkdir(exist_ok=True);targetbox=None
 if idle in files:targetbox=subject(first(ROOT/'assets'/files[idle],True))
 for name in [idle]+sorted(names-{idle}):
  src=source(role,name);digest=sha(src);key=role+'/'+name
  if name in files and (key not in hashes or hashes[key]==digest):hashes[key]=digest;continue
  a=first(src);box=subject(a);h,w=a.shape[:2]
  if targetbox is None:
   scale=min(640/w,480/h);sw=round(w*scale);sh=round(h*scale);x=(640-sw)//2;y=(480-sh)//2
  else:
   scale=(targetbox[3]-targetbox[1])/(box[3]-box[1]);sw=max(2,round(w*scale));sh=max(2,round(h*scale));x=round((targetbox[0]+targetbox[2])/2-(box[0]+box[2])/2*scale);y=round(targetbox[3]-box[3]*scale)
  token=hashlib.sha256((key+digest).encode()).hexdigest()[:12];dest=folder/('a_'+token+'.mp4');rel=dest.relative_to(ROOT/'assets').as_posix()
  filt=f'[0:v]scale={sw}:{sh}:flags=lanczos,format=rgba[v];color=c=black@0:s=640x480:r=30,format=rgba[b];[b][v]overlay=x={x}:y={y}:shortest=1:format=auto,format=yuva420p,split[c][a];[a]alphaextract,format=yuv420p[a1];[c]format=yuv420p[c1];[c1][a1]hstack[out]'
  if not dest.exists():subprocess.run([FF,'-v','error','-n','-c:v','libvpx-vp9','-i',str(src),'-filter_complex',filt,'-map','[out]','-an','-r','30','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)],check=True)
  output=first(dest,True);ob=subject(output)
  if targetbox is None:targetbox=ob
  assert abs((ob[3]-ob[1])-(targetbox[3]-targetbox[1]))<=4,(role,name,'height',targetbox,ob)
  assert abs(ob[3]-targetbox[3])<=3 and abs((ob[0]+ob[2]-targetbox[0]-targetbox[2])/2)<=4,(role,name,'anchor',targetbox,ob)
  raw=run([FF,'-v','error','-i',dest,'-vf','crop=640:480:640:0,scale=160:120,format=gray','-f','rawvideo','-']);mask=np.frombuffer(raw,np.uint8).reshape(-1,120,160);ys,xs=np.where(np.any(mask>8,axis=0));assert len(xs)>0
  files[name]=rel;duration[name]=float(probe(dest)['format']['duration']);bounds[name]=[max(0,(int(xs.min())-3)/160),max(0,(int(ys.min())-3)/120),min(1,(int(xs.max())+4)/160),min(1,(int(ys.max())+4)/120)];hashes[key]=digest
  report.append({'role':role,'name':name,'sourceSubject':box,'targetSubject':targetbox,'outputSubject':ob,'transform':[sw,sh,x,y],'file':rel})
  print(json.dumps({'prepared':role+'/'+name,'target':targetbox,'output':ob},ensure_ascii=True),flush=True)
 portrait=folder/'portrait.png'
 if not portrait.exists():Image.fromarray(first(ROOT/'assets'/files[idle],True)).resize((320,240),Image.Resampling.LANCZOS).save(portrait)
 persona=load(BASE/role/'人设.json')['whisperPrompt'];catalog.append({'id':role,'name':title,'idle':idle,'groups':groups,'files':files,'durations':duration,'bounds':bounds,'prompt':persona,'portrait':role+'/portrait.png'})
assert sum(len(x['files']) for x in catalog)==167
(ROOT/'assets/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False),encoding='utf-8');hp.write_text(json.dumps(hashes,ensure_ascii=False),encoding='utf-8');(ROOT/'build/mobile03-conversion.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
assert all((ROOT/'assets'/p).is_file() for r in catalog for p in r['files'].values())
print(json.dumps({'roles':len(catalog),'videos':sum(len(r['files']) for r in catalog),'newlyPrepared':len(report)}),flush=True)
