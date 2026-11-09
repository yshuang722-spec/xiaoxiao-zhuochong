# 小小桌宠

Windows 桌面宠物客户端，当前主推版本是 **小小桌宠2**，见下方下载。

基于 **[PC2005-cloud](https://github.com/PC2005-cloud)** 的 **[dsh-pet](https://github.com/PC2005-cloud/dsh-pet)** 改造，感谢原作者提供桌宠引擎，保留原 MIT 许可。新增角色、动画和图标由本项目作者创作。

## 下载：小小桌宠2（当前版本）

**[下载电脑版安装包（Windows 64 位）](https://github.com/yshuang722-spec/xiaoxiao-zhuochong/releases/latest/download/xiaoxiao2-setup-win-x64.exe)** · **[下载安卓手机版 APK](https://github.com/yshuang722-spec/xiaoxiao-zhuochong/releases/latest/download/xiaoxiao2-android-v0.4.8.apk)** · [已装过的人下载电脑版更新包](https://github.com/yshuang722-spec/xiaoxiao-zhuochong/releases/latest/download/xiaoxiao2-update-v1.1.0.zip)

九个角色，电脑版 v1.1.0，手机版 v0.4.8。介绍、更新内容和各个文件的用途见 [xiaoxiao2/README.md](xiaoxiao2/README.md) 与 [发布页](https://github.com/yshuang722-spec/xiaoxiao-zhuochong/releases/tag/xiaoxiao2-v1.1.0)。

> 早先的小小桌宠 v1.0.x（六角色）和安卓 v0.x 发布已经下架，请直接使用上面的小小桌宠2，避免下错版本。下面保留的是早期版本的源码说明。

## 源码与构建

Windows 客户端在 `client/`，六角色配置、成品动画和人设在 `characters/`。实际运行的引擎 JavaScript 在 `dsh-pet/lib/` 与 `dsh-pet/runtime/`，同时保留原 TypeScript 源码；直接重编原 TypeScript 会覆盖本项目已有集成改动。

安卓当前已发布版本的完整源码和成品素材在 `android/`，构建方法见 [Android BUILD](android/BUILD.md)。安卓与 Windows 分别发布和安装。

Windows 可使用 `tools/client-release/build-1.0.5.py` 配合已有 Electron 与 Node 运行环境构建。GitHub 自动生成的 Source code 是源码；直接使用请下载上面的小小桌宠2 安装包。

[完整使用步骤与常见问题](使用说明.md) · [本版动作列表](docs/RELEASE-CONTENT-1.0.5.json)
