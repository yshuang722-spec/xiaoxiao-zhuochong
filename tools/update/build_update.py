"""Build an offline 1.0.2 -> 1.0.3 update from the selectively prepared repository."""
from pathlib import Path
import argparse,json,subprocess,hashlib,shutil,zipfile
ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--base-ref',default='0187bb657d4b67f869239c784be651fc2dda4d07')
args=parser.parse_args()
OUT=args.output.resolve();OUT.mkdir(parents=True,exist_ok=True)
PACKAGE=OUT/'xiaoxiao-zhuochong-1.0.3-update';PACKAGE.mkdir(exist_ok=True)
def baseline(path):return subprocess.check_output(['git','show',args.base_ref+':'+path],cwd=ROOT,stderr=subprocess.DEVNULL)
def sha(data):return hashlib.sha256(data).hexdigest()
def old_hashes(path):
 data=baseline(path);lf=data.replace(b'\r\n',b'\n')
 return sorted(set([sha(data),sha(lf),sha(lf.replace(b'\n',b'\r\n'))]))
files=[]
def add(source,path,scope,before=None):
 data=source.read_bytes();relative='payload/'+scope+'/'+path
 dest=PACKAGE/relative;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
 files.append({'source':relative,'scope':scope,'path':path,'sha256':sha(data),'before':before or []})
runtime=['main.js','preload.js','sprite.js','index.html','canvas-layout.js','collision-link.cjs','playback-guard.js']
for name in runtime:
 rel='dsh-pet/runtime/electron-helper/'+name
 try:old=old_hashes(rel)
 except subprocess.CalledProcessError:old=[]
 add(ROOT/rel,'resources/engine/runtime/electron-helper/'+name,'program',old)
add(ROOT/'client/main.cjs','resources/app/client/main.cjs','program',old_hashes('client/main.cjs'))
metadata={'name':'xiaoxiao-zhuochong','productName':'小小桌宠','version':'1.0.3','main':'bootstrap.cjs'}
generated=OUT/'app-package-1.0.3.json';generated.write_bytes(json.dumps(metadata,ensure_ascii=False).encode('utf-8'))
metadata['version']='1.0.2';previous=json.dumps(metadata,ensure_ascii=False).encode('utf-8')
add(generated,'resources/app/package.json','program',[sha(previous)])
baseConfigs={}
for role in ['ojousama','character3','character4']:
 rel='characters/'+role+'/config.json'
 if role=='character4':rel='characters/'+role+'/config.template.json'
 baseConfigs[role]=json.loads(baseline(rel).decode('utf-8-sig'))
 folder=ROOT/'characters'/role
 for source in sorted(folder.rglob('*')):
  if source.is_file() and (source.name=='config.json' or source.suffix=='.webm'):
   add(source,role+'/'+source.relative_to(folder).as_posix(),'character')
manifest={'version':'1.0.3','from':['1.0.2','1.0.3'],'baseCommit':args.base_ref,'roles':['ojousama','character3','character4'],'excludedRole':'character5','baselineConfigs':baseConfigs,'files':files}
(PACKAGE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
# Windows PowerShell 5.1 needs a BOM for Chinese source strings.
(PACKAGE/'update.ps1').write_text(Path(__file__).with_name('update.ps1').read_text(encoding='utf-8-sig'),encoding='utf-8-sig')
(PACKAGE/'update.cmd').write_bytes(b'@echo off\r\npowershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1"\r\nset "UPDATE_RESULT=%ERRORLEVEL%"\r\npause\r\nexit /b %UPDATE_RESULT%\r\n')
readme=Path(__file__).with_name('README-update.txt').read_text(encoding='utf-8')
(PACKAGE/'使用说明.txt').write_text(readme,encoding='utf-8-sig')
archive=OUT/'xiaoxiao-zhuochong-1.0.3-update-from-1.0.2.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=5) as z:
 allowed=[PACKAGE/f['source'] for f in files]+[PACKAGE/n for n in ['manifest.json','update.ps1','update.cmd','使用说明.txt']]
 for path in sorted(allowed):z.write(path,PACKAGE.name+'/'+path.relative_to(PACKAGE).as_posix())
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
(OUT/'SHA256.txt').write_text(sha(archive.read_bytes())+'  '+archive.name+'\n',encoding='ascii')
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'payloadFiles':len(files)},ensure_ascii=False))
