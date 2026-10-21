"""Compose the full v1.0.3 client from the verified v1.0.2 runtime and selective update."""
from pathlib import Path
import argparse,shutil,json,hashlib,zipfile
p=argparse.ArgumentParser();p.add_argument('--base',type=Path,required=True);p.add_argument('--update',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--archive',type=Path,required=True)
a=p.parse_args();base=a.base.resolve();update=a.update.resolve();output=a.output.resolve()
if output.exists():raise RuntimeError('Use a new output directory; existing clients are never overwritten')
if not (base/'小小桌宠.exe').is_file():raise RuntimeError('Missing base executable')
m=json.loads((update/'manifest.json').read_text(encoding='utf-8'))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
for f in m['files']:
 if sha(update/f['source'])!=f['sha256']:raise RuntimeError('Payload hash mismatch: '+f['source'])
 if f['scope']=='program' and f['before'] and sha(base/f['path']) not in f['before']:raise RuntimeError('Unrecognized base client: '+f['path'])
shutil.copytree(base,output)
for f in m['files']:
 dest=output/(f['path'] if f['scope']=='program' else 'resources/characters/'+f['path'])
 dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(update/f['source'],dest)
 assert sha(dest)==f['sha256']
for role in ['ojousama','character3','character4']:
 template=output/'resources/characters'/role/'config.template.json'
 if template.exists():template.unlink()
assert not (output/'resources/characters/character5').exists()
(output/'小小桌宠更新版本.txt').write_bytes('1.0.3\n三角色动画、角色碰撞与播放恢复\n'.encode('utf-8'))
(output/'使用说明.txt').write_text('''小小桌宠 v1.0.3 完整版（Windows 64位）

新用户：完整解压后，打开“小小桌宠”文件夹，双击“小小桌宠.exe”即可。不要只取出一个EXE。
在控制页开启想显示的角色；关闭控制页后角色继续运行，点击托盘图标重新打开。
完全退出：托盘菜单选择“退出全部桌宠”。

包含蓝毛小女仆、橙毛大小姐、黄毛该溜子、白毛小龙娘；黑毛小狐狸暂不发布。
完整包含Electron、Node与角色素材，不用另装Python、npm或运行环境。

以前使用过v1.0.2的用户：建议使用另外提供的更新包，按照其中使用说明升级现有角色数据。
本程序不会直接用初始包覆盖你已有的个人角色目录。
角色数据：%USERPROFILE%\\.dsh\\dsh-pet\\characters。

原作者：PC2005-cloud；原仓库：https://github.com/PC2005-cloud/dsh-pet
原MIT许可保留。项目：https://github.com/yshuang722-spec/xiaoxiao-zhuochong
''',encoding='utf-8-sig')
files={f.relative_to(output).as_posix():sha(f) for f in output.rglob('*') if f.is_file()}
a.archive.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(a.archive,'w',zipfile.ZIP_DEFLATED,compresslevel=5,allowZip64=True) as z:
 for relative in sorted(files):z.write(output/relative,'小小桌宠/'+relative)
with zipfile.ZipFile(a.archive) as z:
 assert z.testzip() is None
 for relative,digest in files.items():assert hashlib.sha256(z.read('小小桌宠/'+relative)).hexdigest()==digest
(a.archive.parent/'portable-file-manifest.json').write_text(json.dumps(files,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'archive':str(a.archive.resolve()),'bytes':a.archive.stat().st_size,'files':len(files),'version':json.loads((output/'resources/app/package.json').read_text(encoding='utf-8'))['version']}))
