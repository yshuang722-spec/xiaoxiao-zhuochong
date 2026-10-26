# Android 源码构建步骤

1. 解压源码 ZIP，进入“源码”文件夹。`src/` 是完整应用代码，`res/` 是图标、Logo 与主题，`assets/` 已含五个角色的143段手机动画及默认人设，无需重新抠图或转换视频。
2. 准备 JDK 17、Android SDK Platform 34、Build Tools 36.0.0 和 PowerShell 7。应用不依赖 Gradle，也不会将这些电脑工具装入手机。
3. 本机原项目可直接运行 `pwsh -NoLogo -NoProfile -NonInteractive -File .\build.ps1`，沿用旁边 `android-lite\tools` 中的 JDK 和原签名。
4. 其他电脑可显式指定路径：

   ```powershell
   $env:XIAOXIAO_STORE_PASS = '你的签名密码'
   pwsh -NoLogo -NoProfile -NonInteractive -File .\build.ps1 -Sdk 'D:\Android\Sdk' -Jdk 'D:\Java\jdk-17' -KeyStore 'D:\Keys\xiaoxiao.keystore'
   ```

5. 成功后得到 `build\xiaoxiao-android-full.apk`。脚本会核验 APK 签名。

## 签名与安装

- 源码包不附带签名密钥、API Key、手机聊天记录或运行数据。保管好自己的签名密钥；后续覆盖安装须沿用同一密钥。
- 如果需要首次创建自己的签名，在 JDK 的 `bin` 目录使用 `keytool -genkeypair -keystore D:\Keys\xiaoxiao.keystore -alias xiaoxiao -keyalg RSA -keysize 2048 -validity 10000`，按提示输入密码和信息。目标目录需事先存在。
- 换密钥构建的 APK 不能覆盖现有签名不同的应用。用户当前手机安装包使用原本地签名，源码交付没有更换它。

## 本次修改位置

- `MainActivity.java`、`ClonePanel.java`：首页动作入口改为对话，角色资料放进管理。
- `ProfilePage.java`、`Data.java`：编辑、校验和保存各角色的名字与人设；按固定角色 ID 隔离，聊天记录归属不变。
- `ClientPage.java`、`Chat.java`：应用内大聊天页与键盘布局；应用外继续使用紧凑输入栏和气泡。发送消息时读取对应角色最新保存的人设与名字。
- `PetService.java`：气泡优先头顶，头部空间不足时才移到下方，保留用户确认的自动避让。

手机运行应用无需安装开发工具。自动更新和仓库发布不在本次范围。

交互精修代码：GroupedList.java（设置/管理分组）、PetMenu.java（角色旁快捷菜单）、SizePanel.java（实时预览与取消还原）、UiMotion.java及res/anim（轻量动效）；PetService.java将预览与持久化分开，避免拖动中反复写日志。

材质代码：SwitchRow.java统一权限和运动开关；FrostedPanel.java为应用窗口和浮层统一启用背景模糊，维护监听及实色回退。接口依据：[Android Window.setBackgroundBlurRadius](https://developer.android.com/reference/android/view/Window#setBackgroundBlurRadius(int))、[AOSP Window blurs](https://source.android.com/docs/core/display/window-blurs)。

全局玻璃：FrostedPanel.java集中实现API31窗口背景模糊与blur-behind，Apple.java集中同步材质颜色。通过系统能力监听降级到实色，不需截屏权限或后台截图，前景不使用RenderEffect。主页使用SHOW_WALLPAPER显示手机原壁纸的模糊透色，不修改壁纸。
SpringScrollView.java统一滚动与边界回弹，不增加依赖；关闭系统动画时停用弹性。

GlassSurface.java负责薄边光；MainActivity.java在启动时复用保存状态，FrostedPanel复用主页背景。启动录屏回归脚本probe-launch.py（使用本机FFmpeg读取视频），本轮没有将FFmpeg加入APK。

窗口动画需在show前设置：Apple.Builder覆盖create；CompactPanel/ClientPage在构造时设置。panel_enter.xml与panel_exit.xml为共享窗口过渡，不需要额外依赖。

角色抖动修正涉及AlphaVideo.java及PetService.java。前者用固定画布TextureView/EGL输出透明视频，后者保证整数对齐并在API34+关闭系统位置动画。官方接口说明：https://developer.android.com/reference/android/view/WindowManager.LayoutParams#setCanPlayMoveAnimation(boolean) 。API26-33保留兼容路径，本轮没有旧机型真机；不能把当前手机的结果泛化成全部设备。录屏回归区分素材自身运动与一帧后回归的位置异常。


### 本次交付范围
只交付角色动作结束时的漂移、闪烁及抖动修复。启动入口衔接的试验已按用户要求撤回。蓝毛两次录屏回归通过，五个角色各一次代表动作返回待机检查通过；这些样本不代表所有设备和全部动作均已验证。
