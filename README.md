# 小小桌宠

Windows 桌面宠物客户端，当前版本 **v1.0.4（2026-10-23）**。

基于 **[PC2005-cloud](https://github.com/PC2005-cloud)** 的 **[dsh-pet](https://github.com/PC2005-cloud/dsh-pet)** 改造，感谢原作者提供桌宠引擎，保留原 MIT 许可。新增角色、动画和图标由本项目作者创作。

## 下载

**[下载最新版完整客户端（Windows 64位，解压即用）](https://github.com/yshuang722-spec/xiaoxiao-zhuochong/releases/latest/download/xiaoxiao-zhuochong-win-x64-portable.zip)**

新用户：右键“全部解压”，打开“小小桌宠”文件夹，双击“小小桌宠.exe”。内含运行环境，不必安装 Node、npm 或 Python；不要只移动一个 EXE。

**[v1.0.3 老用户下载更新包](https://github.com/yshuang722-spec/xiaoxiao-zhuochong/releases/download/v1.0.4/xiaoxiao-zhuochong-1.0.4-update-from-1.0.3.zip)**：[更新步骤](docs/UPDATE-1.0.4.md)。完整解压，双击 update.cmd，选择原程序 EXE 所在文件夹，完成后使用原快捷方式启动。

## 本版内容

包含蓝毛小女仆、橙毛大小姐、黄毛该溜子、白毛小龙娘、黑毛小狐狸五个角色，补齐现有动作并加入最新对齐修正。奶茶千金尚未完成，本版不包含。

- 角色独立开启、隐藏，支持全部开启和全部隐藏。
- 动作点播与轮播、拖拽弹动、角色碰撞、播放错误恢复。
- 角色独立人设和聊天历史，共用用户自己设置的模型接口；AI 设置位于二级菜单。
- 宠物旁持续对话窗口、头顶回复气泡与大小姐的对话动作。
- 角色运行及调整日志，自动清理超过十天的旧日志。
- 关闭控制页后宠物继续运行；从托盘重新打开或退出全部。

数据位于 `%USERPROFILE%\.dsh\dsh-pet\characters`。

## 源码与构建

客户端源码在 `client/`，角色配置、动画及人设在 `characters/`。实际发布的引擎 JavaScript 源码在 `dsh-pet/lib/` 和 `dsh-pet/runtime/`；同时保留原项目 TypeScript 源码。当前客户端集成改动包含在实际发布的 JavaScript 中，直接重编原 TypeScript 会覆盖这些集成改动。

使用 `tools/client-release/build-1.0.4.py` 配合本机已有 Electron 和 Node 可打包完整运行目录；原 NSIS 脚本仍保留。GitHub 自动生成的 Source code 是源码，使用者应下载上面的完整客户端 ZIP。

本版已通过隔离用户目录启动、五角色待机预览、更新器保留设置及自定义动作、重复更新、故障回滚、篡改包拒绝和归档完整性检查。不同设备的长期播放表现仍需实际使用反馈。
