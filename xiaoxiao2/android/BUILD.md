# 手机版构建

这里只有源码。角色视频和 `catalog.json` 在 Release 的 `xiaoxiao2-android-v0.4.0-source.zip` 里，解压后得到完整的 `assets/` 目录。

需要 Android SDK（build-tools 36、android-34 平台）和 JDK 17。步骤：

1. `aapt package -f -m -J gen -M AndroidManifest.xml -I android.jar -S res` 生成 R。
2. `javac -encoding UTF-8 -source 8 -target 8 -classpath android.jar` 编译 `src` 和 `gen`。
3. `d8 --lib android.jar --min-api 26` 转成 `classes.dex`。
4. `aapt package -f -M AndroidManifest.xml -I android.jar -A assets -S res -0 mp4 -F unsigned.apk`，再 `aapt add unsigned.apk classes.dex`。
5. `zipalign -f 4` 对齐，用你自己的密钥 `apksigner sign` 签名。

视频资源不要压缩（`-0 mp4`），否则播放器无法按偏移读取。角色素材格式和贴边停靠素材的做法见 `src/com/xiaoxiao/pet/Data.java` 与 catalog 里的 `dock` / `dockWave` 字段。
