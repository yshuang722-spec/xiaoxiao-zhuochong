param([string]$ProgramDir,[string]$DataHome,[switch]$PlanOnly)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$Utf8=[Text.UTF8Encoding]::new($false)
$PackageRoot=$PSScriptRoot
$Manifest=Get-Content -LiteralPath (Join-Path $PackageRoot 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
function Hash([string]$Path){
 $stream=[IO.File]::OpenRead($Path);$sha=[Security.Cryptography.SHA256]::Create()
 try{return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose();$stream.Dispose()}
}
function SafePath([string]$Root,[string]$Relative){
 if([IO.Path]::IsPathRooted($Relative) -or $Relative -match '(^|[\\/])\.\.([\\/]|$)'){throw 'Unsafe update path'}
 $base=[IO.Path]::GetFullPath($Root).TrimEnd('\')
 $full=[IO.Path]::GetFullPath((Join-Path $base $Relative))
 if(-not $full.StartsWith($base+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Update path leaves its target folder'}
 $current=$full
 while($current -and $current.Length -ge $base.Length){
  if(Test-Path -LiteralPath $current){if((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Symbolic links are not supported: $current"}}
  $current=[IO.Path]::GetDirectoryName($current)
 }
 return $full
}
function SetValue($Object,[string]$Name,$Value){
 $property=$Object.PSObject.Properties[$Name]
 if($property){$property.Value=$Value}else{$Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value}
}
function Names($Animations){
 $list=@();foreach($key in @('idle','turn','drag','clicks')){$list+=@($Animations.$key)}
 $list+=@($Animations.moves.actions | ForEach-Object {$_.name})
 foreach($c in @($Animations.categories)){$list+=@($c.actions)}
 foreach($event in $Animations.events.PSObject.Properties){$list+=@($event.Value | ForEach-Object {$_})}
 return @($list | Where-Object {$_ -is [string] -and $_} | Select-Object -Unique)
}
function ExtraNames($Old,$Baseline,[string]$Assets){
 return @($Old | Where-Object {$_ -is [string] -and $_ -notin $Baseline -and (Test-Path -LiteralPath (SafePath $Assets ($_+'.webm')) -PathType Leaf)} | Select-Object -Unique)
}
function MergeRole($New,$Old,$Baseline,[string]$Assets){
 if(-not $Old){return $New}
 $official=@(Names $Baseline.animations)+@(Names $New.animations)
 # Keep user pet settings, prompts and custom fields; update only official animation definitions and collision switch.
 foreach($key in @('idle','turn','drag','clicks')){
  SetValue $New.animations $key @(@($New.animations.$key)+@(ExtraNames $Old.animations.$key $official $Assets) | Select-Object -Unique)
 }
 $newMoves=@($New.animations.moves.actions)
 foreach($m in @($Old.animations.moves.actions)){if($m.name -and $m.name -notin $official -and $m.name -notin @($newMoves.name) -and (Test-Path -LiteralPath (SafePath $Assets ($m.name+'.webm')))){$newMoves+=,$m}}
 SetValue $New.animations.moves 'actions' @($newMoves)
 $categories=@($New.animations.categories)
 foreach($oldCategory in @($Old.animations.categories)){
  $extra=@(ExtraNames $oldCategory.actions $official $Assets)
  if(-not $extra.Count){continue}
  $match=@($categories | Where-Object id -eq $oldCategory.id)
  if($match.Count){SetValue $match[0] 'actions' @(@($match[0].actions)+$extra | Select-Object -Unique)}else{SetValue $oldCategory 'actions' $extra;$categories+=,$oldCategory}
 }
 SetValue $New.animations 'categories' @($categories)
 foreach($event in $Old.animations.events.PSObject.Properties){
  $extra=@(ExtraNames $event.Value $official $Assets)
  if($extra.Count){SetValue $New.animations.events $event.Name @(@($New.animations.events.($event.Name))+$extra | Select-Object -Unique)}
 }
 SetValue $Old 'animations' $New.animations
 if(-not $Old.physics){SetValue $Old 'physics' $New.physics}
 SetValue $Old.physics 'petCollision' $true
 return $Old
}
function StopTarget([string]$Root){
 $exe=Join-Path $Root '小小桌宠.exe'
 $running=@(Get-CimInstance Win32_Process | Where-Object {$_.ExecutablePath -and $_.ExecutablePath.Equals($exe,[StringComparison]::OrdinalIgnoreCase)})
 if($running.Count){Start-Process -FilePath $exe -ArgumentList '--quit' -WindowStyle Hidden | Out-Null}
 for($i=0;$i -lt 40;$i++){
  $remaining=@(Get-CimInstance Win32_Process | Where-Object {$_.ExecutablePath -and $_.ExecutablePath.Equals($exe,[StringComparison]::OrdinalIgnoreCase)})
  if(-not $remaining.Count){break};Start-Sleep -Milliseconds 500
 }
 if($remaining.Count){throw '程序没有正常退出，请从托盘退出全部桌宠后重试。不会强制结束进程。'}
 # A server can survive an earlier client crash. Stop only the server belonging to this chosen program.
 try{$health=Invoke-RestMethod 'http://127.0.0.1:3081/health' -TimeoutSec 2}catch{$health=$null}
 if($health -and [IO.Path]::GetFullPath($health.plugin.root).Equals((Join-Path $Root 'resources\engine'),[StringComparison]::OrdinalIgnoreCase)){
  $null=Invoke-RestMethod -Method Post 'http://127.0.0.1:3081/dsh-pet-7340/shutdown' -TimeoutSec 5
  Start-Sleep -Seconds 2
 }
}
$Transaction=$null;$Plan=[Collections.Generic.List[object]]::new();$Applied=[Collections.Generic.List[object]]::new()
try{
 if(-not $ProgramDir){
  Add-Type -AssemblyName System.Windows.Forms
  $dialog=[Windows.Forms.FolderBrowserDialog]::new()
  $dialog.Description='选择你要更新的“小小桌宠.exe”所在文件夹（不要选更新包文件夹）'
  $dialog.ShowNewFolderButton=$false
  if($dialog.ShowDialog() -ne 'OK'){Write-Output '已取消，没有修改文件。';exit 2}
  $ProgramDir=$dialog.SelectedPath
 }
 $ProgramDir=[IO.Path]::GetFullPath($ProgramDir).TrimEnd('\')
 if(-not (Test-Path -LiteralPath (Join-Path $ProgramDir '小小桌宠.exe') -PathType Leaf)){throw '所选文件夹里没有小小桌宠.exe。'}
 if(-not $DataHome){$DataHome=$env:DSH_HOME;if(-not $DataHome){$DataHome=Join-Path $env:USERPROFILE '.dsh'}}
 $DataHome=[IO.Path]::GetFullPath($DataHome).TrimEnd('\')
 # Check every payload hash and the supported program baseline before stopping or writing anything.
 foreach($f in $Manifest.files){$source=SafePath $PackageRoot $f.source;if((Hash $source) -ne $f.sha256){throw "更新包文件校验失败：$($f.source)，请重新下载并完整解压。"}}
 foreach($f in @($Manifest.files | Where-Object scope -eq 'program')){
  $dest=SafePath $ProgramDir $f.path
  if(Test-Path -LiteralPath $dest){$h=Hash $dest;if($h -ne $f.sha256 -and $h -notin @($f.before)){throw "这个客户端文件与v1.0.3/本更新版本不一致，未覆盖：$($f.path)"}}
  elseif(@($f.before).Count){throw "客户端缺少必要文件：$($f.path)"}
 }
 $backupRoot=Join-Path $env:LOCALAPPDATA 'XiaoXiaoZhuoChong\UpdateBackups'
 $Transaction=Join-Path $backupRoot ([DateTime]::Now.ToString('yyyyMMdd-HHmmss-fff')+'-'+[Guid]::NewGuid().ToString('N').Substring(0,8))
 New-Item -ItemType Directory -Path $Transaction -Force | Out-Null
 [IO.File]::WriteAllText((Join-Path $Transaction 'targets.json'),(@{program=$ProgramDir;dataHome=$DataHome;version=$Manifest.version}|ConvertTo-Json),$Utf8)
 foreach($f in $Manifest.files){
  $source=SafePath $PackageRoot $f.source
  if($f.scope -eq 'program'){$Plan.Add(@{source=$source;dest=(SafePath $ProgramDir $f.path)})}
  elseif($f.scope -eq 'character'){
   $seed=SafePath $ProgramDir ('resources\characters\'+$f.path)
   $Plan.Add(@{source=$source;dest=$seed})
   $dest=SafePath $DataHome ('dsh-pet\characters\'+$f.path)
   if($f.path -match '/config\.jsonc?$'){
    $role=$f.path.Split('/')[0];$new=Get-Content -LiteralPath $source -Raw -Encoding UTF8 | ConvertFrom-Json
    $old=$null;if(Test-Path -LiteralPath $dest){$old=Get-Content -LiteralPath $dest -Raw -Encoding UTF8 | ConvertFrom-Json}
    $baseline=$Manifest.baselineConfigs.$role
    $merged=MergeRole $new $old $baseline (Split-Path -Parent $dest | Join-Path -ChildPath 'animations')
    $generated=Join-Path $Transaction ($role+'-merged.json')
    [IO.File]::WriteAllText($generated,($merged | ConvertTo-Json -Depth 100),$Utf8)
    $Plan.Add(@{source=$generated;dest=$dest})
   }else{$Plan.Add(@{source=$source;dest=$dest})}
  }else{throw 'Unsupported manifest scope'}
 }
 # All animation references must resolve after the planned update; no half-empty white template.
 foreach($role in @($Manifest.roles)){
  $generated=Join-Path $Transaction ($role+'-merged.json');$cfg=Get-Content -LiteralPath $generated -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach($name in @(Names $cfg.animations)){
   $dest=SafePath $DataHome ('dsh-pet\characters\'+$role+'/animations/'+$name+'.webm')
   if(-not (Test-Path -LiteralPath $dest) -and -not @($Plan | Where-Object dest -eq $dest).Count){throw "动作文件缺失：$role/$name"}
  }
 }
 $changed=[Collections.Generic.List[object]]::new()
 foreach($item in $Plan){if(-not (Test-Path -LiteralPath $item.dest -PathType Leaf) -or (Hash $item.dest) -ne (Hash $item.source)){$changed.Add($item)}}
 $Plan=$changed
 if(-not $Plan.Count){Write-Output '已经是本版本，没有重复复制文件。';exit 0}
 if($PlanOnly){Write-Output ("预检查通过，计划写入 {0} 个文件；未改程序或角色。" -f $Plan.Count);exit 0}
 StopTarget $ProgramDir
 $index=0
 foreach($item in $Plan){
  $item.existed=Test-Path -LiteralPath $item.dest -PathType Leaf
  $item.backup=Join-Path $Transaction ($index.ToString('D4')+'.bak');$index++
  if($item.existed){Copy-Item -LiteralPath $item.dest -Destination $item.backup}
 }
 [IO.File]::WriteAllText((Join-Path $Transaction 'backup-plan.json'),($Plan | ConvertTo-Json -Depth 8),$Utf8)
 foreach($item in $Plan){
  New-Item -ItemType Directory -Path (Split-Path -Parent $item.dest) -Force | Out-Null
  $temporary=$item.dest+'.update-'+[Guid]::NewGuid().ToString('N')
  try{
   Copy-Item -LiteralPath $item.source -Destination $temporary
   if((Hash $temporary) -ne (Hash $item.source)){throw '复制校验失败'}
   Move-Item -LiteralPath $temporary -Destination $item.dest -Force
   $Applied.Add($item)
  }finally{if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Force}}
 }
 Write-Output "更新完成。请用原来的快捷方式启动小小桌宠。备份：$Transaction"
 Write-Output '五个角色已更新；奶茶千金未包含在更新包内。'
 exit 0
}catch{
 $failure=$_.Exception.Message
 for($i=$Applied.Count-1;$i -ge 0;$i--){
  $item=$Applied[$i]
  try{if($item.existed){Copy-Item -LiteralPath $item.backup -Destination $item.dest -Force}else{Remove-Item -LiteralPath $item.dest -Force}}catch{[Console]::Error.WriteLine('回滚需要人工检查：'+$item.dest)}
 }
 [Console]::Error.WriteLine('更新未完成：'+$failure)
 if($Transaction){[Console]::Error.WriteLine('原文件备份：'+$Transaction)}
 exit 1
}
