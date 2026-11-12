# 小小桌宠2

[小小桌宠](../README.md) 的第二个版本：Windows 电脑版加安卓手机版，同样基于 **[PC2005-cloud](https://github.com/PC2005-cloud)** 的 **[dsh-pet](https://github.com/PC2005-cloud/dsh-pet)** 改造，保留原 MIT 许可。

当前版本：**电脑版 v1.1.0 · 手机版 v0.4.8 · 九个角色**。

## 下载

在 [最新发布页](https://github.com/yshuang722-spec/xiaoxiao-zhuochong/releases/tag/xiaoxiao2-v1.1.0) 下载。第一次使用只需要看前两项：

| 文件 | 给谁用 | 大小 |
|---|---|---|
| `xiaoxiao2-setup-win-x64.exe` | **电脑版完整安装包**。没装过的人下载这个；安装后在系统应用列表里可卸载。数据保存在 `%USERPROFILE%\.xiaoxiao2`。 | 约 580 MB |
| `xiaoxiao2-android-v0.4.8.apk` | **手机版**。Android 8.0 及以上，安装后允许悬浮显示。包名 `com.xiaoxiao2.pet.mobile`，可以和小小桌宠手机版同时安装。 | 约 175 MB |
| `xiaoxiao2-update-v1.1.0.zip` | **电脑版更新包**。已经装了小小桌宠2（v1.0.x）的人下载这个，解压后双击「更新.cmd」，只更新改动的部分；你的角色大小、位置、人设和聊天设置会保留。 | 约 75 MB |
| `xiaoxiao2-android-v0.4.8-source.zip` | 手机版完整源码和角色素材，自己构建时才需要。 | 约 175 MB |
| `SHA256.txt` | 校验值。 | |

电脑版和手机版互相独立，更新包只适用于电脑版。

## 九个角色

蓝毛小女仆、橙毛大小姐、黄毛该溜子、白毛小龙娘、黑毛小狐狸、奶茶千金、北美大豆包、豆小妹、中二少女。

## v1.1.0 / 手机 v0.4.8 的变化

- 新角色：**中二少女**。
- 电脑版角色卡可以**直接用鼠标按住拖动换位**，其他卡片顺滑让位；窗口放大后一排放三张卡。
- 每个角色新增**动作分类**（待机、转向、拖拽、点击回应）和**轮播编排**，在角色卡里设置。
- 「查看动作」里点任何一个动作，桌面上的角色马上演给你看。
- 鼠标移到角色卡上播放待机动画时，放大幅度调小，不再切掉头部。
- 「添加角色」先弹出说明，讲清楚角色文件夹要怎么准备、需要哪些文件。
- 北美大豆包、豆小妹的动画首帧重新对齐；中二少女的睡在月亮上去掉了灰边。
- 手机版：**长按角色卡直接拖动换位**；贴边后第一次点击招手，**两秒内**再点一次才恢复，超时回到待命，避免误触；新增动作分类和轮播编排界面。

## 目录

- `client/`：电脑版控制界面和服务（Electron）。
- `engine-patch/`：电脑版引擎补丁。退出桌宠后，将 `standalone.js` 复制到安装目录的 `resources/engine/lib/`，将其余文件复制到 `resources/engine/runtime/electron-helper/`，然后重新启动桌宠。
  - 宠物按当前动画的可见轮廓碰撞。高速抛掷会检查两次位置更新之间的路径，撞到屏幕顶部时按角色头顶回弹。
  - Windows 飞行窗口按所在显示器的刷新率移动。缩放透明窗口时固定角色的位置，贴近任务栏反弹时也能保持画面稳定。
  - Windows 版桌宠默认启用硬件加速，显卡由系统选择。如果透明窗口出现黑边或重叠时角色消失，可将环境变量 `DSH_PET_SOFTWARE_RENDERING` 设为 `1`，完全退出并重新启动桌宠以使用软件渲染。
  - `flight-presenter.exe` 随补丁提供。要从源码重新构建，在 Windows PowerShell 的 `engine-patch` 目录运行 `& "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /optimize+ /target:winexe /out:flight-presenter.exe flight-presenter.cs`。
- `android/`：手机版源码（不含角色视频素材），构建方法见 [android/BUILD.md](android/BUILD.md)。

安装包里的引擎和角色动画不放在仓库中，请从发布页下载。
