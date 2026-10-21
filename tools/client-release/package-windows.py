from pathlib import Path
import json,os,shutil,subprocess,sys

root=Path(__file__).resolve().parents[2]
payload=root/'outputs/小小桌宠-1.0.3'
dist=root/'outputs/Windows安装包'
work=root/'work/windows-installer'
dist.mkdir(parents=True,exist_ok=True);work.mkdir(parents=True,exist_ok=True)
cache=Path.home()/'AppData/Local/electron-builder/Cache'
compilers=list(cache.glob('nsis-*/nsis-*/makensis.exe'))
if not compilers:raise RuntimeError('Local NSIS compiler not found')
compiler=compilers[0]
if not (payload/'小小桌宠.exe').is_file():raise RuntimeError('Build the client first')

def esc(s):return str(s).replace('$','$$').replace('"','$\\"')
owned=[]
for p in sorted(payload.rglob('*')):
 if p.is_file():owned.append('  Delete "$INSTDIR\\'+esc(p.relative_to(payload)).replace('/','\\')+'"')
for p in sorted([p for p in payload.rglob('*') if p.is_dir()],key=lambda p:len(p.parts),reverse=True):
 owned.append('  RMDir "$INSTDIR\\'+esc(p.relative_to(payload)).replace('/','\\')+'"')
owned='\n'.join(owned)
template=r'''
Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
Name "小小桌宠"
OutFile "@OUT@"
InstallDir "$LOCALAPPDATA\Programs\XiaoXiaoZhuoChong"
InstallDirRegKey HKCU "Software\XiaoXiaoZhuoChong" "InstallDir"
RequestExecutionLevel user
SetCompressor zlib
SetDatablockOptimize on
ShowInstDetails nevershow
ShowUninstDetails nevershow
BrandingText "小小桌宠 · 基于 PC2005-cloud/dsh-pet"
Icon "@ICON@"
UninstallIcon "@ICON@"
VIProductVersion "1.0.3.0"
VIAddVersionKey /LANG=2052 "ProductName" "小小桌宠"
VIAddVersionKey /LANG=2052 "FileDescription" "小小桌宠 Windows 一键安装程序"
VIAddVersionKey /LANG=2052 "FileVersion" "1.0.3"
VIAddVersionKey /LANG=2052 "LegalCopyright" "基于 PC2005-cloud 的 dsh-pet (MIT)"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_TITLE "小小桌宠已安装完成"
!define MUI_FINISHPAGE_TEXT "点击完成即可启动。关闭控制页后，宠物会继续陪在桌面上。"
!define MUI_FINISHPAGE_RUN "$INSTDIR\小小桌宠.exe"
!define MUI_FINISHPAGE_RUN_TEXT "立即启动小小桌宠"
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH
!insertmacro MUI_LANGUAGE "SimpChinese"

!macro CLOSE_CLIENT Prefix
Function ${Prefix}CloseClient
  FindWindow $0 "" "小小桌宠"
  ${If} $0 != 0
    SendMessage $0 0x8042 0 0 /TIMEOUT=2000
    StrCpy $1 0
    ${Do}
      Sleep 500
      FindWindow $0 "" "小小桌宠"
      IntOp $1 $1 + 1
      ${If} $1 >= 30
        MessageBox MB_ICONEXCLAMATION "小小桌宠暂时无法退出。请从托盘退出后重新运行安装程序。"
        SetErrorLevel 2
        Abort
      ${EndIf}
    ${LoopUntil} $0 == 0
    Sleep 2500
  ${EndIf}
FunctionEnd
!macroend
!insertmacro CLOSE_CLIENT ""
!insertmacro CLOSE_CLIENT "un."

Function .onInit
  SetShellVarContext current
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "请在 64 位 Windows 上安装小小桌宠。"
    Abort
  ${EndIf}
  System::Call 'kernel32::CreateMutexW(p 0, i 0, w "Local\XiaoXiaoZhuoChong.Setup") p .r0 ?e'
  Pop $1
  ${If} $1 == 183
    MessageBox MB_ICONINFORMATION "安装程序已经打开。"
    Abort
  ${EndIf}
  Call CloseClient
FunctionEnd

Section "安装小小桌宠"
  SetOutPath "$INSTDIR"
  SetOverwrite on
  File /r "@PAYLOAD@\*.*"
  FileOpen $0 "$INSTDIR\.xiaoxiao-zhuochong" w
  FileWrite $0 "XiaoXiaoZhuoChong-install-v1"
  FileClose $0
  WriteUninstaller "$INSTDIR\卸载小小桌宠.exe"
  CreateShortCut "$DESKTOP\小小桌宠.lnk" "$INSTDIR\小小桌宠.exe" "" "$INSTDIR\resources\app\client\assets\app.ico" 0
  CreateDirectory "$SMPROGRAMS\小小桌宠"
  CreateShortCut "$SMPROGRAMS\小小桌宠\小小桌宠.lnk" "$INSTDIR\小小桌宠.exe" "" "$INSTDIR\resources\app\client\assets\app.ico" 0
  CreateShortCut "$SMPROGRAMS\小小桌宠\卸载小小桌宠.lnk" "$INSTDIR\卸载小小桌宠.exe"
  WriteRegStr HKCU "Software\XiaoXiaoZhuoChong" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\XiaoXiaoZhuoChong" "DisplayName" "小小桌宠"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\XiaoXiaoZhuoChong" "DisplayVersion" "1.0.3"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\XiaoXiaoZhuoChong" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\XiaoXiaoZhuoChong" "UninstallString" '"$INSTDIR\卸载小小桌宠.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\XiaoXiaoZhuoChong" "QuietUninstallString" '"$INSTDIR\卸载小小桌宠.exe" /S'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\XiaoXiaoZhuoChong" "DisplayIcon" "$INSTDIR\resources\app\client\assets\app.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\XiaoXiaoZhuoChong" "URLInfoAbout" "https://github.com/PC2005-cloud/dsh-pet"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\XiaoXiaoZhuoChong" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\XiaoXiaoZhuoChong" "NoRepair" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\XiaoXiaoZhuoChong" "EstimatedSize" @SIZE@
SectionEnd

Function un.onInit
  SetShellVarContext current
  FileOpen $0 "$INSTDIR\.xiaoxiao-zhuochong" r
  IfErrors invalid
  FileRead $0 $1
  FileClose $0
  StrCmp $1 "XiaoXiaoZhuoChong-install-v1" valid invalid
  invalid:
    MessageBox MB_ICONSTOP "安装标记缺失，已停止卸载以保护文件。"
    Abort
  valid:
  Call un.CloseClient
FunctionEnd

Section "Uninstall"
  ReadRegStr $0 HKCU "Software\XiaoXiaoZhuoChong" "InstallDir"
  ${If} $0 == $INSTDIR
    Delete "$DESKTOP\小小桌宠.lnk"
    Delete "$SMPROGRAMS\小小桌宠\小小桌宠.lnk"
    Delete "$SMPROGRAMS\小小桌宠\卸载小小桌宠.lnk"
    RMDir "$SMPROGRAMS\小小桌宠"
    DeleteRegKey HKCU "Software\XiaoXiaoZhuoChong"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\XiaoXiaoZhuoChong"
  ${EndIf}
@OWNED@
  Delete "$INSTDIR\.xiaoxiao-zhuochong"
  Delete "$INSTDIR\卸载小小桌宠.exe"
  RMDir "$INSTDIR"
SectionEnd
'''
source=template.replace('@OUT@',esc(dist/'小小桌宠-1.0.3-安装版.exe')).replace('@ICON@',esc(payload/'resources/app/client/assets/app.ico')).replace('@PAYLOAD@',esc(payload)).replace('@OWNED@',owned).replace('@SIZE@',str(sum(p.stat().st_size for p in payload.rglob('*') if p.is_file())//1024))
nsi=work/'installer.nsi';nsi.write_text(source,'utf-8-sig')
manifest={str(p.relative_to(payload)):p.stat().st_size for p in payload.rglob('*') if p.is_file()}
(work/'payload-files.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf-8')
print(str(nsi),flush=True)
subprocess.run([str(compiler),'/V2',str(nsi)],check=True)
print(str(dist/'小小桌宠-1.0.3-安装版.exe'),flush=True)
