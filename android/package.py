from pathlib import Path
import json,zipfile,shutil,hashlib
r=Path(__file__).resolve().parent;o=r.parent/'outputs/安卓手机版-v0.3.1';o.mkdir(parents=True,exist_ok=True)
c=json.loads((r/'assets/catalog.json').read_text(encoding='utf-8'));assert len(c)==6
apk=o/'xiaoxiao-zhuochong-android-v0.3.1.apk';shutil.copy2(r/'build/xiaoxiao-android-full.apk',apk)
with zipfile.ZipFile(apk) as z:
 names=z.namelist();assert len([n for n in names if n.endswith('.mp4')])==167
 assert not any(n.endswith(('.keystore','.exe','.py','.ps1')) for n in names)
guide=(r/'README.md').read_text(encoding='utf-8')
(o/'Android-installation-guide.md').write_text(guide,encoding='utf-8')
allowed={'src','assets','res','tests'};files={'README.md','BUILD.md','DESIGN.md','THIRD-PARTY-LICENSE.txt','AndroidManifest.xml','build.ps1','prepare.py','measure-bounds.py','package.py'}
with zipfile.ZipFile(o/'xiaoxiao-zhuochong-android-v0.3.1-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in r.rglob('*'):
  rel=p.relative_to(r)
  if p.is_file() and (rel.parts[0] in allowed or rel.as_posix() in files) and '__pycache__' not in rel.parts:z.write(p,'android/'+rel.as_posix())
(o/'SHA256SUMS.txt').write_text('\n'.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name for p in o.iterdir() if p.is_file() and p.name!='SHA256SUMS.txt')+'\n',encoding='utf-8')
print(str(o.resolve()))
