# 小小桌宠2

[小小桌宠](../README.md) 的第二个版本：Windows 电脑版加安卓手机版，同样基于 **[PC2005-cloud](https://github.com/PC2005-cloud)** 的 **[dsh-pet](https://github.com/PC2005-cloud/dsh-pet)** 改造，保留原 MIT 许可。

## 下载

在 [Releases](https://github.com/yshuang722-spec/xiaoxiao-zhuochong/releases/tag/xiaoxiao2-v1.0.0) 下载：

- **电脑版安装包** `xiaoxiao2-setup-win-x64.exe`：安装后出现在 Windows 的应用列表里，可以正常卸载。数据保存在 `%USERPROFILE%\.xiaoxiao2`，和小小桌宠互不干扰。
- **手机版 APK** `xiaoxiao2-android-v0.4.0.apk`：Android 8.0 及以上，安装后允许悬浮显示。包名 `com.xiaoxiao2.pet.mobile`，可以和小小桌宠手机版同时安装。
- **手机版完整源码与素材** `xiaoxiao2-android-v0.4.0-source.zip`。

## 八个角色

蓝毛小女仆、橙毛大小姐、黄毛该溜子、白毛小龙娘、黑毛小狐狸、奶茶千金、北美大豆包、豆小妹。

## 这一版的内容

- 贴纸手账风格的控制界面，支持日间和夜间。
- 角色顺序可调整、角色之间的碰撞开关、人设导入。
- 拖动角色后精确放在松手的位置，不再掉落。
- 手机版：界面与电脑端一致；角色卡片显示高清立绘并播放待机动画；点击角色有弹动和音效。
- 手机版贴边停靠：角色停在屏幕边缘探头，点一下播放招手或看过来的动画；按住可以上下拖动，拖到另一侧会自动镜像，拖离边缘会变回站立的样子。

## 目录

- `client/`：电脑版控制界面和服务（Electron）。
- `engine-patch/sprite.js`：对引擎的一处修改（拖动放置位置），替换安装目录里 `resources/engine/runtime/electron-helper/sprite.js`。
- `android/`：手机版源码（不含角色视频素材），构建方法见 [android/BUILD.md](android/BUILD.md)。
