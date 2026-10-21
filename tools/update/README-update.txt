小小桌宠 v1.0.3 更新包使用说明（适用于原v1.0.2发行版）

## 已有v1.0.2：使用更新包

1. 下载 `xiaoxiao-zhuochong-1.0.3-update-from-1.0.2.zip`，右键选择“全部解压”。不要在压缩包里面直接运行。
2. 从托盘菜单选择“退出全部桌宠”。只点控制页右上角的 × 会隐藏窗口，程序仍在运行；更新器也会尝试正常退出所选客户端。
3. 打开解压后的 `xiaoxiao-zhuochong-1.0.3-update` 文件夹，确认有 `update.cmd`、`update.ps1`、`manifest.json` 和 `payload` 文件夹。双击 **update.cmd**。
4. 在弹出的文件夹选择框中，选择**原来使用的“小小桌宠.exe”所在文件夹**，然后确认。可以先右键原桌面快捷方式 →“打开文件所在的位置”找到它。正确目录里应同时有“小小桌宠.exe”、`resources`、`runtimes`；选择文件夹本身，不是选择EXE文件。
5. **不要选择更新包文件夹、角色数据目录（.dsh），也不要笼统选择桌面。** 等待窗口显示“更新完成”；期间不要移动程序文件、关闭更新窗口或再次启动桌宠。
6. 更新完成后，按提示关闭窗口，再双击**原来的快捷方式或原目录的小小桌宠.exe**启动。打开控制页检查动作；白毛小龙娘默认隐藏，需要手动开启。

不用重新下载完整客户端，也不用安装Python、Node或npm。这个更新包不能单独启动桌宠。

更新器会备份并替换官方同名动画，更新官方动作列表；保留原角色的位置、大小、显示设置和自定义动作。备份在 `%LOCALAPPDATA%\XiaoXiaoZhuoChong\UpdateBackups`。写入失败会尝试自动回滚，请保留错误信息和备份。

如果提示版本不匹配或找不到程序：停止操作，检查选择的是否是原v1.0.2发行版目录。不要把payload手工乱拷进其他目录。开发版不支持直接覆盖。如果更新成功却仍是旧版，检查启动的快捷方式是否指向刚更新的那一份程序。

高级用法：自定义过DSH_HOME的用户，应在相同环境运行更新器，或调用 `update.ps1 -ProgramDir "程序目录" -DataHome "数据目录"`。

新用户请下载最新版完整包，全部解压后双击小小桌宠.exe：
https://github.com/yshuang722-spec/xiaoxiao-zhuochong/releases/latest/download/xiaoxiao-zhuochong-win-x64-portable.zip

原作者：PC2005-cloud；原仓库：https://github.com/PC2005-cloud/dsh-pet
