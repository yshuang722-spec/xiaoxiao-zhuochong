from pathlib import Path
import json,subprocess,numpy as np
root=Path(__file__).parent
ff=root.parent/'ojousama/dsh-pet/.tools/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe'
catalog=json.loads((root/'assets/catalog.json').read_text(encoding='utf-8'))
for role in catalog:
 bounds={}
 for name,file in role['files'].items():
  raw=subprocess.check_output([str(ff),'-v','error','-i',str(root/'assets'/file),'-vf','crop=640:480:640:0,scale=160:120,format=gray','-f','rawvideo','-'])
  frames=np.frombuffer(raw,np.uint8).reshape(-1,120,160)
  ys,xs=np.where(np.any(frames>8,axis=0))
  if not len(xs):raise ValueError('Invisible '+name)
  bounds[name]=[max(0,(int(xs.min())-3)/160),max(0,(int(ys.min())-3)/120),min(1,(int(xs.max())+4)/160),min(1,(int(ys.max())+4)/120)]
 role['bounds']=bounds
 print(role['id'],len(bounds),flush=True)
(root/'assets/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False),encoding='utf-8')
