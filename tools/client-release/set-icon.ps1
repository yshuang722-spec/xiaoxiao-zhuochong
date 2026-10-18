param([string]$Release=(Join-Path $PSScriptRoot '..\..\outputs\小小桌宠'))
$ErrorActionPreference='Stop'
Add-Type @'
using System; using System.Runtime.InteropServices;
public class IconResource {
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] public static extern IntPtr BeginUpdateResource(string file,bool delete);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool UpdateResource(IntPtr h,IntPtr type,IntPtr name,ushort language,byte[] data,uint size);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool EndUpdateResource(IntPtr h,bool discard);
}
'@
$ico=[IO.File]::ReadAllBytes((Join-Path $Release 'resources\app\client\assets\app.ico'))
$count=[BitConverter]::ToUInt16($ico,4)
$group=[IO.MemoryStream]::new();$writer=[IO.BinaryWriter]::new($group)
$writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]$count)
$handle=[IconResource]::BeginUpdateResource((Join-Path $Release '小小桌宠.exe'),$false)
if($handle -eq [IntPtr]::Zero){throw 'Cannot update executable icon'}
try {
 for($i=0;$i -lt $count;$i++) {
  $offset=6+16*$i;$length=[BitConverter]::ToUInt32($ico,$offset+8);$start=[BitConverter]::ToUInt32($ico,$offset+12)
  $bytes=[byte[]]::new($length);[Array]::Copy($ico,$start,$bytes,0,$length)
  if(-not [IconResource]::UpdateResource($handle,[IntPtr]3,[IntPtr]($i+1),1033,$bytes,$length)){throw 'Icon resource failed'}
  $writer.Write($ico,$offset,12);$writer.Write([uint16]($i+1))
 }
 $data=$group.ToArray()
 if(-not [IconResource]::UpdateResource($handle,[IntPtr]14,[IntPtr]1,1033,$data,$data.Length)){throw 'Group resource failed'}
 if(-not [IconResource]::EndUpdateResource($handle,$false)){throw 'Icon commit failed'}
} catch { [IconResource]::EndUpdateResource($handle,$true)|Out-Null;throw }
Write-Output 'Executable icon updated'
