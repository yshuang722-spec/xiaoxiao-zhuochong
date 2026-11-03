// Watches whether the foreground window covers its whole monitor (games, video, slideshows).
// Uses one long-lived PowerShell helper; reports only stable changes (same state twice in a row).
const {spawn}=require('node:child_process');
const SCRIPT=`
Add-Type @'
using System;using System.Runtime.InteropServices;using System.Text;
public static class FullscreenProbe{
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h,uint f);
 [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m,ref MONITORINFO i);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,StringBuilder s,int n);
 [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
 struct RECT{public int L,T,R,B;}
 [StructLayout(LayoutKind.Sequential)] struct MONITORINFO{public int cb;public RECT m;public RECT w;public uint f;}
 public static void Init(){SetProcessDPIAware();}
 public static int Check(){
  IntPtr h=GetForegroundWindow();if(h==IntPtr.Zero)return 0;
  var sb=new StringBuilder(64);GetClassName(h,sb,64);string c=sb.ToString();
  if(c=="Progman"||c=="WorkerW"||c=="Shell_TrayWnd"||c=="Windows.UI.Core.CoreWindow")return 0;
  RECT r;if(!GetWindowRect(h,out r))return 0;
  var mi=new MONITORINFO();mi.cb=Marshal.SizeOf(mi);if(!GetMonitorInfo(MonitorFromWindow(h,2),ref mi))return 0;
  return (r.L<=mi.m.L&&r.T<=mi.m.T&&r.R>=mi.m.R&&r.B>=mi.m.B)?1:0;
 }
}
'@
[FullscreenProbe]::Init()
while($true){[Console]::Out.WriteLine([FullscreenProbe]::Check());[Console]::Out.Flush();Start-Sleep -Milliseconds 1200}
`;
function watchFullscreen(onChange){
 if(process.platform!=='win32')return ()=>{};
 const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',Buffer.from(SCRIPT,'utf16le').toString('base64')],{windowsHide:true,stdio:['ignore','pipe','ignore']});
 let state=false,last=null,buffer='';
 child.stdout.on('data',chunk=>{buffer+=chunk;const lines=buffer.split(/\r?\n/);buffer=lines.pop();for(const line of lines){const now=line.trim()==='1';if(now===last&&now!==state){state=now;onChange(state);}last=now;}});
 child.on('error',()=>{});
 return ()=>{try{child.kill();}catch{}};
}
module.exports={watchFullscreen};
