from pathlib import Path
import json,zipfile,shutil,hashlib
r=Path(__file__).resolve().parent;o=r.parent/'outputs/安卓手机版-v0.3.0';o.mkdir(parents=True,exist_ok=True)
c=json.loads((r/'assets/catalog.json').read_text(encoding='utf-8'));assert len(c)==6
apk=o/'xiaoxiao-zhuochong-android-v0.3.0.apk';shutil.copy2(r/'build/xiaoxiao-android-full.apk',apk)
with zipfile.ZipFile(apk) as z:
 names=z.namelist();assert len([n for n in names if n.endswith('.mp4')])==167
 assert not any(n.endswith(('.keystore','.exe','.py','.ps1')) for n in names)
guide='''# 小小桌宠 安卓手机版 v0.3.0

## 安装与使用
1. 下载 APK，打开后按手机提示安装。已有版本直接覆盖安装，不要先卸载。
2. 打开应用，在设置→手机权限中允许悬浮显示；按需要允许通知和后台运行。
3. 点击角色的显示，返回手机桌面查看角色。慢拖改变位置，快速甩动可以弹跳；设置→弹动与碰撞可分别开关。
4. 长按桌面角色可选择对话、动作、大小或隐藏。应用内点击对话查看聊天记录；管理→角色资料可修改名字和人设。
5. 设置→AI接口设置填写服务地址、模型和密钥。各角色共用接口，分别保留聊天记录和人设。
6. 外观支持日间、夜间和跟随系统。点击首页Logo可快捷切换。

## 本版内容
包含蓝毛小女仆、橙毛大小姐、黄毛该溜子、白毛小龙娘、黑毛小狐狸、奶茶千金六个角色，共167段视频。补齐新增动作，更新奶茶千金温柔富有的大姐姐人设；桌面对话角色名顶部居中，当前问题移到输入框上方。

## 常见问题
- 角色不出现：检查悬浮权限并离开应用主页；主页前台时暂时收起桌面角色。
- 后台停止：在手机系统设置允许后台运行；不同手机入口有所区别。
- 覆盖安装失败：确认是同一应用来源和签名，不要为安装而卸载旧版，以免丢失记录。
- AI无法回复：检查地址、模型、密钥和网络；接口费用由服务商决定。

基于 dsh-pet 开源项目改造，原作者及项目许可见源码中的 THIRD-PARTY-LICENSE.txt。
'''
(r/'README.md').write_text(guide,encoding='utf-8');(o/'Android-installation-guide.md').write_text(guide,encoding='utf-8')
allowed={'src','assets','res','tests'};files={'README.md','BUILD.md','DESIGN.md','THIRD-PARTY-LICENSE.txt','AndroidManifest.xml','build.ps1','prepare.py','measure-bounds.py','package.py'}
with zipfile.ZipFile(o/'xiaoxiao-zhuochong-android-v0.3.0-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in r.rglob('*'):
  rel=p.relative_to(r)
  if p.is_file() and (rel.parts[0] in allowed or rel.as_posix() in files) and '__pycache__' not in rel.parts:z.write(p,'android/'+rel.as_posix())
(o/'SHA256SUMS.txt').write_text('\n'.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name for p in o.iterdir() if p.is_file() and p.name!='SHA256SUMS.txt')+'\n',encoding='utf-8')
print(str(o.resolve()))
