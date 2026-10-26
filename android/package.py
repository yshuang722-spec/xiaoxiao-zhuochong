from pathlib import Path
import zipfile,json,hashlib,shutil
root=Path(__file__).parent;out=root.parent/'outputs/安卓完整版';out.mkdir(parents=True,exist_ok=True)
source=root/'build/xiaoxiao-android-full.apk'
with zipfile.ZipFile(source) as z:
 files=z.namelist();bad=[n for n in files if n.lower().endswith(('.py','.ps1','.exe','.bat','.keystore')) or any(w in n.lower() for w in ('ffmpeg','ffprobe','gradle'))]
 assert not bad,bad
 video=[n for n in files if n.endswith('.mp4')];assert len(video)==143,len(video)
 assert not any(n.startswith('assets/character6/') for n in files)
catalog=json.loads((root/'assets/catalog.json').read_text(encoding='utf-8'))
for r in catalog:
 for name,f in r['files'].items():assert (root/'assets'/f).exists(),(r['id'],name)
apk=out/'小小桌宠-安卓完整版.apk';shutil.copy2(source,apk)
shutil.copy2(root/'README.md',out/'使用说明.md')
for name,target in [('theme-day-home.png','日间模式.png'),('theme-night-home.png','夜间模式.png')]:
 if (root/'build'/name).exists():shutil.copy2(root/'build'/name,out/target)
for name,target in [('compact-composer-idle.png','紧凑对话框.png'),('compact-lower-pet-menu.png','紧凑动作菜单.png')]:
 if (root/'build'/name).exists():shutil.copy2(root/'build'/name,out/target)
for name,target in [('compact-final-grouped-settings.png','新版设置.png'),('compact-final-quick-menu.png','角色旁快捷菜单.png'),('compact-final-size-panel.png','实时大小调整.png')]:
 if (root/'build'/name).exists():shutil.copy2(root/'build'/name,out/target)
for name,target in [('compact-glass-settings-on.png','毛玻璃设置.png'),('compact-glass-settings-off.png','实色设置.png'),('compact-glass-motion-final.png','统一运动开关.png')]:
 if (root/'build'/name).exists():shutil.copy2(root/'build'/name,out/target)
for name,target in [('whole-glass-home-day','日间模式.png'),('whole-glass-home-night','夜间模式.png'),('whole-glass-settings-day','毛玻璃设置.png'),('whole-glass-motion','统一运动开关.png'),('whole-glass-rounded-menu','角色旁快捷菜单.png')]:
 if (root/'build'/('compact-'+name+'.png')).exists():shutil.copy2(root/'build'/('compact-'+name+'.png'),out/target)
for name,target in [('thin-glass-home-day','日间模式.png'),('thin-glass-settings-day','毛玻璃设置.png'),('thin-glass-pet-menu','角色旁快捷菜单.png')]:
 if (root/'build'/('compact-'+name+'.png')).exists():shutil.copy2(root/'build'/('compact-'+name+'.png'),out/target)
for name,target in [('compact-clear-home.png','日间模式.png'),('compact-clear-settings.png','毛玻璃设置.png'),('panel-motion.mp4','面板过渡演示.mp4')]:
 if (root/'build'/name).exists():shutil.copy2(root/'build'/name,out/target)
preview=root/'build/compact-clear-home.png'
if not preview.exists():preview=root/'build/apple-home-final.png'
if preview.exists():shutil.copy2(preview,out/'苹果风首页.png')
checks={p.stem:json.loads(p.read_text(encoding='utf-8')) for p in root.joinpath('build').glob('*check.json')}
for name in ('controls-baseline','controls-verified','fling-stress','user-fling-baseline-summary'):
 p=root/'build'/(name+'.json')
 if p.exists():checks[name]=json.loads(p.read_text(encoding='utf-8'))
if 'placement-check' in checks:checks['placement-check'].pop('fastWithDefaultSetting',None)
report='''# 本次交付验证

设备：2211133C，Android API36，1080×2400；日期：2026-10-23。

## 已通过

- 当前菜单、分身、物理、范围修复见“操作与碰撞修复记录.md”。

- 143段手机格式视频在素材准备时完整解码；目录文件引用完整。
- 安装包签名校验；手机覆盖安装成功；包内没有抠图、FFmpeg、Python、SDK、签名密钥或编译工具。
- 五角色同时透明显示；动作点播与自动轮播；送情书动作点播；多段动作结束回待机日志。
- 分身逐个添加、隐藏、管理；第九次添加不生成新分身；测试分身均已删除。
- 手机拖动碰撞，日志记录碰撞，窗口坐标分离。
- 息屏时五个媒体播放器均为 paused(1)，亮屏后恢复。
- 慢拖放置与重开后位置恢复；快速甩动的验证结果见fling-check.json。
- 持续聊天窗口、右上角关闭按钮、未配置API时提示且窗口不关闭。
- 苹果风首页、二级设置、角色管理与聊天界面可打开；制作信息移入关于。
- 系统崩溃日志未见本次应用相关崩溃。

## 尚未完成实测

- 付费模型的真实接口回复、实际聊天气泡和模型触发动画，需要用户填写接口后联测。代码已经接入，但不以静态检查代替成功联网。
- 大量分身同时运行、所有机型、长时后台与耗电、十天真实时间跨度。日志清理为已有代码，临时仪器测试组件安装被手机拒绝，因此没有把其断言当作通过证据。
- 大小保存已有代码，但独立UI自动化在查找滚动页面上的按钮时中断，未据此宣称大小重启恢复已通过；位置恢复已由独立回归通过。

## 修复记录

拖动松手每次都启动重力，是角色无法悬停放置的原因。现改成默认固定放置；快速甩动时弹动默认开启，达到松手速度阈值才投掷；慢拖固定放置。碰撞推开使用衰减位移，不把普通放置的角色转为重力下落。

画布透明空白原本会拦截触摸；现按每段动画全帧可见区域计算窗口范围，保持原画布逻辑位置，在大动作时扩展显示范围。未缩裁原始动画或删除信封特写。

新增运行日志按角色记录、每日日志1MB上限、自动清理超过十天旧日志；API Key使用AndroidKeyStore加密，日志不记录Key或聊天正文。

控制方式：SDK命令行编译、ADB安装和系统检查；UI通过ADB读取节点、点按、拖动和截图。未使用Windows GUI；完整分身回归60余次界面操作，其余记录见开发目录build/ui-check-*.json。ADB操作只用于必要权限和真实界面/播放/手势验证。

原Windows程序和素材未覆盖；没有上传GitHub。自动更新、奶茶千金不在本次范围。
'''
if checks.get('theme-check',{}).get('completed'):
 report+='''
## 2026-10-24 外观、权限与设置补充实测

- 日间、夜间和跟随系统三项均可选择，手动模式保持自己的配色，跟随系统能随手机深色模式变化。
- Logo 在设置左侧，实测116×116像素，设置按钮也为116像素高，间距28像素（本机密度下对应42dp和10dp）。两套Logo分别来自用户提供的白底和深底原图。
- 打开的权限弹窗随系统主题原位更新，进程未重启；聊天草稿切换主题后仍保留。
- 悬浮显示、运行通知、电池优化开关分别跳转Android设置，返回后读取真实状态。测试未更改用户授权或电池优化策略；系统主题已恢复。
- 设置主列表中的两个运动开关已合并为“弹动与碰撞”按钮。子菜单两个选项分别开关、保存、重开读取均通过，测试后恢复原选择。
- 签名校验、覆盖安装成功。真机验证为小米2211133C / Android API36，其他厂商系统入口需继续兼容性验证。

辅助验证曾在一次点按后未命中设置按钮，中断于查找“外观”选项；补充状态等待和有界重试后继续验证。构建工具aapt在受限环境异常退出，在获准的本地SDK环境中重跑成功。Java源级别与旧API提示不影响编译和签名结果。
'''
if checks.get('bubble-ui-check',{}).get('completed'):
 report=report.replace('- 付费模型的真实接口回复、实际聊天气泡和模型触发动画，需要用户填写接口后联测。代码已经接入，但不以静态检查代替成功联网。','- API连通性由用户实测确认；本次使用本地提示气泡做离线布局与交互核验，没有重复发起模型请求。')
 report+='''
## 2026-10-24 桌面输入栏、角色气泡与紧凑排版

- 桌面角色旁取消聊天记录大框，只保留小输入栏、角色名和关闭键；当前问题在输入栏中显示，回复通过该角色气泡展示。键盘展开时仍维持小尺寸。
- 实测输入栏约占手机屏高14%，动作菜单约占屏高34%。测试角色与面板、提示气泡的窗口交叠面积为0。
- 气泡最多四行，按实际测量高度放在角色上方或下方。当前对话打开时保留，下一句替换，关闭对话时清除。
- 客户端的“管理→对话”保留滚动记录界面；目前保留每角色最近100条消息。
- 记录页取消额外行距，消息间仅一个换行，显示时合并正文连续空行，原始消息存储不变。
- 最终覆盖安装后，已有真实聊天记录的抬头、单换行和桌面小输入栏已离线复核通过（spacing-check.json）。辅助脚本曾因系统以包名标记悬浮窗口而查找失败，按既有窗口识别方式修正后重跑通过，尺寸标准未改变。
- 日夜模式Logo按钮、通用API文案和测试连接按钮、制作署名已一并安装；署名位于原项目上方。
- 本次不点击发送或测试连接。用户已确认API可以正常连接；自动审批拦截了拟议的重复联网回归测试，随后采用不联网的本地气泡与界面验证。

控制方式：已有SDK编译、ADB安装、节点/窗口边界读取与截图。验证脚本为bubble-ui-check.py，检查结果为build/bubble-ui-check.json；没有安装额外手机测试工具。测试后还原角色位置、字号和外观。
'''
 report+='\n本次离线确认的设备UI输入调用：'+str(checks['bubble-ui-check'].get('adbInputCalls',0))+' 次（ADB脚本）。\n'
elif checks.get('compact-panel-check',{}).get('completed'):
 report+='''
## 2026-10-24 紧凑悬浮面板与入口补充

- 对话和动作面板改为约三分之一屏高，聊天记录和动作列表内部滚动；移除多余系统标题，输入与发送并排。
- 以蓝毛小女仆位于屏幕上方／下方两种场景核验，面板优先放在另一侧，检查窗口交叠面积为0；分类导航及列表滚动不改变面板位置。
- 键盘输入、发送按钮可见；夜间模式与1.3倍系统字号下控制项可见。测试后还原原字号、外观选择和测试角色位置。
- Logo 已改成可直接切换日间／夜间的按钮，两次切换均通过。
- 关于页已在原项目之前显示“由阿尔忒弥斯计划🌙制作”。AI 设置不再显示专用模型名，增加测试连接及未填配置时的提示。
- 用户选择暂缓真实接口测试；没有发起付费或其他真实模型请求，不把配置提示验证当作联网成功。

控制方式：既有SDK命令行编译、ADB安装与UI节点／窗口边界读取、必要的点按和拖动验证。截图位于开发目录build/compact-*.png；机器检查为compact-panel-check.json。测试辅助脚本曾因输出目录和窗口标题匹配失败，修正路径与匹配后继续同一步，没有放宽面积或遮挡判断。
'''
if not checks.get('client-profile-check',{}).get('completed'):
 report+='''
## 当前源码改动与剩余核验

当前实现：首页“显示/隐藏、对话、管理”，“角色资料”在管理内；应用内大聊天页，外部仍为小输入栏；可编辑并按固定角色ID保存名字与人设，发送时读取对应角色资料；气泡保持上方优先、空间不足时下移。
大聊天页与键盘布局已在本次较早构建真机观察。最终入口变更后的完整回归、角色资料保存与重启核验尚未完成，原因是手机重新锁屏，系统锁屏10秒超时打断界面定位；待用户解锁后继续。临时调整的屏幕超时已恢复原值。本次不发送模型请求。
'''
if checks.get('client-profile-check',{}).get('completed'):
 report+='''
## 2026-10-24 应用内大聊天页与角色资料（当前交付）

- 首页入口现为“显示/隐藏、对话、管理”。“角色资料”移入管理；应用内及分身列表不再提供动作点播。应用外长按角色的动作入口保留。
- 应用内聊天改为大页面：本机记录区约占屏高78%，键盘展开后仍保留较大阅读区域，输入和发送可见。紧凑行距不变，应用外小输入栏不变。
- 角色资料支持编辑名字和人设，按固定角色ID独立保存，同角色分身共用。资料保存与重启恢复、自定义聊天标题、其他角色隔离已做离线验证；测试后恢复原资料。
- 消息请求使用Data.chatPrompt读取已保存人设与名字；本次没有发送真实模型请求，不将离线检查当作模型行为测试。
- 气泡保留用户最终确认的逻辑：上方空间充足时在头顶，空间不足时移到下方。
- 辅助检查首次因手机息屏未找到首页；唤醒后重跑通过。资料检查曾因编辑长人设后名字滚出可见区域而中断，补充滚回顶部的定位后继续同一步。后续检查还遇到手机自动息屏，中途定位失败；临时延长测试亮屏时间，结束后恢复原值。
- 构建使用已有SDK和原签名，支持显式传入SDK/JDK/签名文件路径，详见源码BUILD.md。源码ZIP包含应用代码、资源和成品动画，不含开发工具、密钥或手机数据。没有上传仓库。

控制方式：命令行构建、ADB覆盖安装、读取节点与截图、临时追加资料测试标记并恢复；未发送聊天消息。本次界面核验以client-profile-check.json为准，之前的小型客户端记录面板核验仅为历史记录。
'''
if checks.get('refinement-check',{}).get('completed'):
 report+='''
## 2026-10-24 分组界面与角色旁快捷菜单（最新）

- 设置与管理改为左对齐分组列表，使用细分割线和导航箭头；清空记录使用警示色并保留确认，测试只点取消。
- 设置内直接选择跟随系统、日间、夜间，不再经过单选弹层；三项状态和日夜界面均已核验。
- 长按角色显示对话、动作、大小、隐藏四项菜单，按屏幕空间放在角色附近。本机检查菜单与所属角色交叠面积为0，点外部关闭成功。
- 详细动作仍在可滚动面板内，保留分类、动作点播、恢复待机和轮播控制。
- 角色大小滑动条实时预览；完成才保存，取消恢复原大小和位置。应用内及悬浮状态都验证了预览与取消，测试结束恢复原角色状态。
- 补查原物理自动保存可能写入预览值的情况：预览期间序列化使用原尺寸和位置，完成后才提交新值；关闭或移除角色时同时清理预览窗口。中途重启的核验结果见previewInterruptedDoesNotSave。
- 按钮增加轻量按压回弹，弹层短促淡入退出，气泡淡入；遵循Android系统动画开关。没有改动碰撞求解和拖拽物理逻辑。
- 桌面聊天请求期间加入动态回复提示，仍保留小输入栏；成功替换为回复，失败和关闭时清理动画回调。此项为代码接入，本轮未重复发起模型请求，联网等待效果仍需用户实际聊天验收。
- 首轮实测后补充分段按钮48dp触摸高度、普通隐藏项使用中性色，并保留详细动作控制；另修复了尺寸预览被物理自动保存带入的边界，以及重启恢复角色后首页状态刷新过早的问题。界面检测未报告未解释的问题。验证脚本：refinement-check.py。

控制方式：原有SDK命令行构建、ADB覆盖安装与界面核验。未安装辅助手机工具、未上传仓库；原生GUI控制工具调用0次，ADB操作见验证脚本。日夜选择及测试角色位置、大小、可见性在测试后恢复。
'''
if checks.get('glass-switch-check',{}).get('completed') and not checks.get('whole-glass-check',{}).get('completed'):
 report+='''
## 2026-10-24 运动开关统一与毛玻璃试用（最新）

- 两项运动选项从多选列表改为原生Switch开关卡片，与手机权限共用SwitchRow组件：标题、说明、14dp内边距和48dp开关触摸高度一致。本机两处开关触摸高度均132像素。
- 两项分别切换、关闭后重开读取已通过；测试后恢复原选项，未更改手机权限。
- 设置增加毛玻璃试用开关，作用于设置与运动设置弹层。开、关及日夜外观均已观察；文字、控件和开关卡片保留清晰背景，不对前景文字使用模糊。
- 本机系统查询支持并启用窗口模糊，运行日志确认使用system-window后端，截图可见真实背景柔化与透色。系统模糊关闭或不可用时的应用内背景回退，以及旧机型实色回退，是代码兼容路径，本轮没有把它们当作已实测。
- 窗口关闭时移除模糊能力监听，并清理应用内背景效果引用；没有改动系统模糊开关或全局权限。
- 验证脚本glass-switch-check.py；截图compact-glass-*.png。控制方式为SDK构建、ADB安装和界面节点/截图检查，无模型调用、无仓库上传。原生GUI工具调用0次。
'''
if checks.get('whole-glass-check',{}).get('completed'):
 report+='''
## 2026-10-24 全应用玻璃材质（当前交付，取代上文设置局部试用）

- 模糊加强、底色略微透明；覆盖首页、设置、管理、角色资料、客户端聊天、外部菜单、动作面板、输入栏及头顶气泡。
- API31及以上系统窗口模糊可用时启用；禁用总开关或能力不可用时回退实色。没有改手机系统模糊设置。前景文字与视频不模糊。
- 该机完成日夜界面、全局开关、权限和运动开关布局、角色资料、客户端记录页、角色附近菜单、动作面板、离线提示气泡的核验。气泡仍为头顶优先。没有发送模型请求。
- 长按四项菜单选项使用独立圆角，动作分类保留圆角按钮；键盘展开时输入和发送仍可见。
- 未执行其他机型、长期耗电或大量同时浮层压力测试；老系统的兼容路径属于代码覆盖。源码及APK为本地交付，没有上传仓库。
'''
if checks.get('spring-scroll-check',{}).get('completed'):
 report+='''
## 统一滚动与边界回弹

- 各滚动页面共用SpringScrollView，保留系统惯性，增加受限阻尼拖动与弹簧复位；关闭系统动画时回退普通滚动。
- 本机顶部/底部回弹均完成归零，滚动后菜单点击有效。回弹日志只记录开始与结束，不逐帧写入。
- 长按角色四项已改成独立圆角；没有改角色碰撞物理算法。
'''
if checks.get('thin-glass-check',{}).get('completed'):
 report+='''
## 薄玻璃与启动状态修正（当前交付）

- 按用户参考图降低底色厚重感，增加细边缘高光；日夜模式均检查，文字保持清晰。不是完整复刻苹果折射效果。
- 冷启动录屏复现了角色先未开启再切陪伴中的变化；移除300ms整页重建，先读取保存状态，服务恢复后只校准状态控件。相同视频检测修复前失败、修复后通过。没有把单次录屏当作所有手机均无闪烁的保证。
- 动作点播后取消底部成功Toast；本机点选动作并通过运行日志确认播放触发。未进行API请求。
- APK与手机安装版本、源码文件均经校验，没有上传仓库。
'''
if checks.get('panel-motion-check',{}).get('completed'):
 report+='''
## 主页透色与窗口过渡（当前交付）

- 外观三个选项不再套额外外围轨道，未选中项没有单独边框，选中项保留底色。
- 统一窗口过渡在show前设置，作用于玻璃背景与前景整体：260ms淡入/轻微放大归位，200ms淡出/轻微收缩。系统动画关闭时不强制播放。
- 设置开关录屏中，进入有4个、退出有3个可辨识的中间帧（30fps采样），不是只有最终截图。其他窗口复用同一设置入口，未逐一录制。
- 主页背景不透明度单独降到日间132/255、夜间156/255；同机同壁纸截图边缘背景饱和度从约0.132升到0.188，视觉检查确认壁纸透色增强。未改变手机壁纸与系统动画设置。
- 无模型请求，无仓库上传；最新APK与源码同时本地交付。
'''
if checks.get('action-position-check',{}).get('completed') and checks.get('all-role-return-check',{}).get('completed'):
 report+='''
## 动作结束偏移与偶发抖动（当前交付）

- 原机录屏复现了动作结束处一帧缩小/偏移、下一帧恢复的问题，窗口逻辑位置前后并未改变。
- 固定视频完整画布，使用TextureView/EGL合成，界面裁切不再缩放旧视频帧；统一整数像素偏移并清除旧裁切请求。API34+关闭角色与气泡窗口的系统位移动画，保留用户设置的物理运动及菜单过渡。
- 同一段蓝毛动作的逐帧检查：旧版检测失败，当前版通过；半分辨率录屏的瞬时偏移指标由约23像素降至约1像素，指标包含素材呼吸/编码噪声，仅用于本次对照。
- 五角色代表动作（悠闲哼歌、送情书、小汽车、喷火冒烟、追蝴蝶）已核验实际触发并返回待机，窗口位置与测试前一致。白毛首轮起点被自动轮播插入，等待回待机后重新核验通过；没有将该次无效比较认定为修复通过。
- 测试结束恢复原可见角色。没有改变素材、用户聊天/API配置、系统动画设置；没有上传仓库。
- 当前设备Android API36；API26-33无公开位置动画开关的兼容路径、其他GPU/旧机型和长期运行尚未真机验证。最终版本不使用临时截图窗口。
'''
(out/'验证记录.md').write_text(report,encoding='utf-8')
(out/'校验与实测.json').write_text(json.dumps({'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'videos':len(video),'roles':{r['id']:len(r['files']) for r in catalog},'checks':checks},ensure_ascii=False,indent=2),encoding='utf-8')
with zipfile.ZipFile(out/'小小桌宠-安卓完整版-源码与安装包.zip','w',zipfile.ZIP_DEFLATED) as z:
 allowed_dirs={'src','assets','res','tests'}
 allowed_files={'README.md','BUILD.md','DESIGN.md','THIRD-PARTY-LICENSE.txt','AndroidManifest.xml','build.ps1','prepare.py','measure-bounds.py','package.py'}
 for p in root.rglob('*'):
  if not p.is_file():continue
  rel=p.relative_to(root)
  if rel.parts[0] not in allowed_dirs and rel.as_posix() not in allowed_files:continue
  if any(part in ('build','backups','backup-before-apple-ui','__pycache__') for part in rel.parts):continue
  if rel.parts[0]=='qa':continue
  z.write(p,'源码/'+rel.as_posix())
 for p in (apk,out/'使用说明.md',out/'验证记录.md',out/'校验与实测.json'):z.write(p,p.name)
 extra=root/'CONTROLS-FIX.md'
 if extra.exists():shutil.copy2(extra,out/'操作与碰撞修复记录.md');z.write(extra,'操作与碰撞修复记录.md')
source_zip=out/'小小桌宠-Android源码.zip'
with zipfile.ZipFile(out/'小小桌宠-安卓完整版-源码与安装包.zip') as bundle,zipfile.ZipFile(source_zip,'w',zipfile.ZIP_DEFLATED) as source_only:
 for entry in bundle.infolist():
  if not entry.filename.startswith('源码/'):continue
  with bundle.open(entry) as src,source_only.open(entry.filename,'w') as dst:shutil.copyfileobj(src,dst)
print(json.dumps({'apk':str(apk),'bytes':apk.stat().st_size,'videos':len(video),'forbiddenTools':bad},ensure_ascii=True),flush=True)
