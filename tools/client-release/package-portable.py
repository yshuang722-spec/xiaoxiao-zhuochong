from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import shutil
root=Path(__file__).resolve().parents[2]
payload=root/'outputs/小小桌宠-1.0.3'
archive=root/'work/小小桌宠-UTF8.zip'
with ZipFile(archive,'w',compression=ZIP_DEFLATED,compresslevel=5,allowZip64=True) as z:
 for file in sorted(payload.rglob('*')):
  if file.is_file():z.write(file,'小小桌宠/'+file.relative_to(payload).as_posix())
with ZipFile(archive) as z:
 assert z.getinfo('小小桌宠/小小桌宠.exe').flag_bits & 0x800
 assert z.testzip() is None
 print('UTF-8 ZIP verified:',archive.stat().st_size)
dist=root/'outputs/Windows安装包';dist.mkdir(parents=True,exist_ok=True)
shutil.copy2(archive,dist/'小小桌宠-1.0.3-解压即用版.zip')
