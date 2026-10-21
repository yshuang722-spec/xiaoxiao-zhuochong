# 小小桌宠

Windows 桌面宠物客户端。解压即可使用，支持多个角色独立显示、动作点播、动作轮播和托盘控制。

基于 **[PC2005-cloud](https://github.com/PC2005-cloud)** 的 **[dsh-pet](https://github.com/PC2005-cloud/dsh-pet)** 改造，感谢原作者提供桌宠引擎。保留原项目的 MIT 许可证和版权声明；新增角色、动画和图标由本项目作者创作。

## 下载与启动

**当前版本：v1.0.3** · [下载 v1.0.2 → v1.0.3 更新包](https://github.com/yshuang722-spec/xiaoxiao-zhuochong/releases/download/v1.0.3/xiaoxiao-zhuochong-1.0.3-update-from-1.0.2.zip) · [更新内容与操作](docs/UPDATE-1.0.3.md)

新用户先下载基础包，再应用更新包。已下载v1.0.2的用户只需本次更新包。

**[下载 Windows 64 位解压即用基础包 v1.0.2](https://github.com/yshuang722-spec/xiaoxiao-zhuochong/releases/download/v1.0.2/xiaoxiao-zhuochong-1.0.2-win-x64-portable.zip)** · [查看所有版本](https://github.com/yshuang722-spec/xiaoxiao-zhuochong/releases)

1. 下载上面的“xiaoxiao-zhuochong-1.0.2-win-x64-portable.zip”。
2. 右键压缩包，选择“全部解压”。
3. 完整解压v1.0.3更新包，双击`update.cmd`，选择刚解压的基础程序文件夹。
4. 更新完成后打开“小小桌宠”文件夹，双击 **小小桌宠.exe**。
5. 在控制页开启想显示的角色，或点击“全部开启”。

已包含运行环境和角色素材，无需另外安装 Node、npm 或 Python。请保留完整的程序目录。

## 可以做什么

- 分别显示或隐藏角色，切换一个角色不会重启其他角色。
- 全部开启、全部隐藏，以及动作点播。
- 大小姐、黄毛和白毛的小动作轮播。
- 拖拽抛掷时，角色主体碰撞后相互弹开；遇到播放错误可恢复动作链。
- 通过角色文件夹和角色包导入继续添加人物。
- 关闭控制页后宠物继续运行；从系统托盘重新打开。

更新后包含 **蓝毛小女仆、橙毛大小姐、黄毛该溜子、白毛小龙娘** 四个可用角色。大小姐16段、黄毛7段、白毛8段动画；黑毛小狐狸暂不发布。

## 退出、更新与数据

**完全退出：**在控制页或托盘菜单选择“退出全部桌宠”。窗口右上角的关闭按钮只隐藏控制页。

**更新：**已有v1.0.2用户完整解压v1.0.3更新包，双击`update.cmd`，选择原程序文件夹。更新器备份并更新官方角色动画，保留个人显示设置和自定义动作，无需重下整个客户端。详见[升级说明](docs/UPDATE-1.0.3.md)。

**数据位置：**`%USERPROFILE%\.dsh\dsh-pet\characters`。每个角色使用独立的配置和动画目录；删除解压的程序文件夹会保留这些数据。

[完整使用说明](使用说明.md)包含角色导入、动作播放和更新操作。

## 原有可选功能

“打开网站 / 查看余额”等菜单保持可见。余额、对话和碎碎念需要原 DSH 的账号、模型或宿主服务；独立运行时未预先连接，不影响桌宠显示和动画播放。

## 开发与验证

本仓库同时保留改造后的源码。客户端位于 `client/`，引擎位于 `dsh-pet/`，角色初始包位于 `characters/`。

进入 `dsh-pet/` 后运行 `npm install`、`npm run build` 可构建引擎。测试命令：引擎目录下 `npm test`，仓库根目录下 `node --test client/service.test.cjs`。

Windows 打包脚本在 `tools/client-release/`，使用已有的 Electron、Node 和 NSIS 工具；完整构建后才具备运行目录，GitHub 自动生成的源码压缩包用于开发。

本版本已完成本机 Windows 运行、首次启动、角色独立控制、托盘同步、关闭/退出验证；解压包通过 Windows .NET 完整解压及 682 个文件的逐项校验。尚未声称在所有 Windows 版本和硬件环境测试通过。

## 致谢与许可

- 原作者：**PC2005-cloud**。
- 原仓库：**https://github.com/PC2005-cloud/dsh-pet**。
- 原许可证：[MIT LICENSE](LICENSE)。
- [上游项目说明快照](docs/UPSTREAM_README.md)。

Electron、Node 和其他依赖的许可证随程序保留在对应目录中。
