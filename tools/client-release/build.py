from pathlib import Path
import argparse,shutil,json,subprocess,os
root=Path(__file__).resolve().parents[2]
client=root/'client'
parser=argparse.ArgumentParser(description='Build 小小桌宠 from existing local runtimes; never rewrites source files.')
parser.add_argument('--output',type=Path,default=root/'outputs/小小桌宠')
parser.add_argument('--electron-dir',type=Path,default=Path.home()/'.dsh/electron')
parser.add_argument('--node',type=Path,default=Path(os.environ.get('ProgramFiles','C:/Program Files'))/'nodejs/node.exe')
args=parser.parse_args()
out=args.output.resolve();runtime=args.electron_dir.resolve()
if not (runtime/'electron.exe').is_file() or not args.node.is_file():parser.error('Electron or Node runtime missing')
if (out/'小小桌宠.exe').exists():parser.error('Use a new output directory, so a running release is never overwritten')
out.mkdir(parents=True,exist_ok=True)
for f in runtime.iterdir():
 if f.name in ['Cache','resources']:continue
 dest=out/('小小桌宠.exe' if f.name=='electron.exe' else f.name)
 if f.is_dir():shutil.copytree(f,dest,dirs_exist_ok=True)
 else:shutil.copy2(f,dest)
app=out/'resources/app';app.mkdir(parents=True,exist_ok=True)
shutil.copytree(client,app/'client',dirs_exist_ok=True,ignore=shutil.ignore_patterns('start-client.vbs','*.test.cjs','shortcut-*.ico'))
for name in ['README.md','PRODUCT.md','DESIGN.md']:
 (app/'client'/name).write_text('小小桌宠客户端。使用说明见程序根目录的使用说明.txt。角色数据独立保存于用户目录 .dsh/dsh-pet/characters。\n','utf-8')
(app/'package.json').write_text(json.dumps(dict(name='xiaoxiao-zhuochong',productName='小小桌宠',version='1.0.3',main='bootstrap.cjs'),ensure_ascii=False),'utf-8')
(app/'bootstrap.cjs').write_text("const path=require('node:path');\nif(process.env.DSH_PET_HOST_PID){require(path.resolve(__dirname,'../engine/runtime/electron-helper/main.js'));}else{require('./client/main.cjs');if(process.argv.includes('--verify-client'))require('./client/verify.cjs');}\n",'utf-8')
pkg=root/'dsh-pet' if (root/'dsh-pet/package.json').exists() else root/'dsh-pet/dsh-pet';engine=out/'resources/engine';engine.mkdir(exist_ok=True)
for name in ['lib','runtime','assets']:
 shutil.copytree(pkg/name,engine/name,dirs_exist_ok=True)
for name in ['package.json','LICENSE']:shutil.copy2(pkg/name,engine/name)
if (root/'characters').is_dir():shutil.copytree(root/'characters',out/'resources/characters',dirs_exist_ok=True)
seen=set()
def dependency(name,base):
 search=base
 while not (search/'node_modules'/name/'package.json').exists():
  if search.parent==search:raise RuntimeError('Missing dependency '+name)
  search=search.parent
 src=search/'node_modules'/name
 if name in seen:return
 seen.add(name);shutil.copytree(src,engine/'node_modules'/name,dirs_exist_ok=True)
 for child in json.loads((src/'package.json').read_text('utf-8')).get('dependencies',{}):dependency(child,src)
for name in json.loads((pkg/'package.json').read_text('utf-8'))['dependencies']:dependency(name,pkg)
(out/'runtimes').mkdir(exist_ok=True);shutil.copy2(args.node,out/'runtimes/node.exe')
shutil.copy2(Path(__file__).with_name('NODE-LICENSE.txt'),out/'runtimes/NODE-LICENSE.txt')
shutil.copy2(pkg/'LICENSE',out/'DSH-PET-LICENSE.txt')
(out/'README.md').write_text('# 小小桌宠\n\n基于 **PC2005-cloud** 的 [dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 改造，感谢原作者提供桌宠引擎。原项目 MIT 许可证见 DSH-PET-LICENSE.txt。新增角色、动画和图标由本项目作者创作。\n\n双击小小桌宠.exe 启动；关闭控制页后宠物继续运行。\n','utf-8')
subprocess.run([shutil.which('pwsh') or 'powershell.exe','-NoProfile','-NonInteractive','-File',str(Path(__file__).with_name('set-icon.ps1')),'-Release',str(out)],check=True)
(out/'使用说明.txt').write_text('小小桌宠 1.0.3\n双击“小小桌宠.exe”或桌面“小小桌宠”快捷方式启动。请保留整个客户端目录。\n关闭控制页后，角色继续运行；点击托盘图标重新打开。托盘菜单可全部开启、全部隐藏或退出。\n角色独立保存于 %USERPROFILE%\\.dsh\\dsh-pet\\characters；已有动画和配置沿用。白毛小龙娘已可使用；黑毛小狐狸不包含在本版本。\n打开网站、查看余额功能保持可见，沿用原功能的连接要求。\n本包包含 Electron 与 Node 运行环境，不需要终端、全局 npm 或另行安装运行时。\n','utf-8')
print(json.dumps({'output':str(out),'dependencies':sorted(seen),'icon':str(client/'assets/app.png')},ensure_ascii=False))
