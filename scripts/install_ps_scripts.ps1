<#
.SYNOPSIS
  SpineSplitter Photoshop 可停靠 CEP 窗口面板 & 快捷脚本一键安装助手
.DESCRIPTION
  1. 自动合成 cep_panel\jsx\host_bundle.jsx，并将 CEP 扩展面板安装至 %APPDATA%\Adobe\CEP\extensions\com.spinesplitter.panel
  2. 自动开启当前用户注册表 HKCU:\Software\Adobe\CSXS.7 ~ CSXS.12 的 PlayerDebugMode=1（无需管理员权限即可在 PS「窗口 > 扩展功能 (旧版)」打开可停靠面板）
  3. 同时尝试将 6 个快捷入口 (.jsx) 安装至 Photoshop 的 Presets\Scripts\SpineSplitter\ 以便录制 F2~F6 快捷键
#>

param(
  [string]$TargetPhotoshopScriptsDir = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SrcDir = Join-Path $ProjectRoot "src"
$CepSrcDir = Join-Path $ProjectRoot "cep_panel"
$Utf8Bom = New-Object System.Text.UTF8Encoding($true)

# ============================================================================
# 第一部分：构建并安装 Photoshop CEP 可停靠扩展窗口 (无需管理员权限)
# ============================================================================
Write-Host "[1/2] 正在构建并安装 Photoshop 可停靠窗口扩展 (CEP Panel)..." -ForegroundColor Cyan

$bundleOrder = @(
  "core\polyfill_es3.js",
  "core\spine_tags.js",
  "core\naming_engine.js",
  "core\skeleton_templates.js",
  "core\skin_mapper.js",
  "core\alignment_math.js",
  "core\clip_chain_resolver.js",
  "core\preflight_validator.js",
  "core\sanitize_planner.js",
  "host\ps_am.js",
  "host\ps_safety.js",
  "host\ps_split_joint_ops.js",
  "host\ps_naming_hierarchy_ops.js"
)

$bundleParts = @("// SpineSplitter CEP Host Bundle (Auto-Generated ES3)`r`n")
foreach ($rel in $bundleOrder) {
  $fp = Join-Path $SrcDir $rel
  $txt = [System.IO.File]::ReadAllText($fp, [System.Text.Encoding]::UTF8)
  if ($txt.Length -gt 0 -and [int]$txt[0] -eq 0xFEFF) {
    $txt = $txt.Substring(1)
  }
  $bundleParts += "// --- BEGIN $rel ---`r`n" + $txt + "`r`n// --- END $rel ---`r`n"
}

$bridgeFp = Join-Path $CepSrcDir "jsx\cep_bridge.js"
$bridgeTxt = [System.IO.File]::ReadAllText($bridgeFp, [System.Text.Encoding]::UTF8)
if ($bridgeTxt.Length -gt 0 -and [int]$bridgeTxt[0] -eq 0xFEFF) {
  $bridgeTxt = $bridgeTxt.Substring(1)
}
$bundleParts += $bridgeTxt

$hostBundlePath = Join-Path $CepSrcDir "jsx\host_bundle.jsx"
[System.IO.File]::WriteAllText($hostBundlePath, ($bundleParts -join "`r`n"), $Utf8Bom)

# 开启 HKCU PlayerDebugMode=1 (CSXS.7 ~ CSXS.12)
foreach ($ver in 7..12) {
  $regPath = "HKCU:\Software\Adobe\CSXS.$ver"
  if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
  }
  New-ItemProperty -Path $regPath -Name "PlayerDebugMode" -Value "1" -PropertyType String -Force | Out-Null
}

# 复制到用户级 CEP 扩展目录：%APPDATA%\Adobe\CEP\extensions\com.spinesplitter.panel
$userCepTarget = Join-Path $env:APPDATA "Adobe\CEP\extensions\com.spinesplitter.panel"
if (Test-Path $userCepTarget) {
  Remove-Item -LiteralPath $userCepTarget -Recurse -Force
}
New-Item -ItemType Directory -Path $userCepTarget -Force | Out-Null
Copy-Item -Path (Join-Path $CepSrcDir "*") -Destination $userCepTarget -Recurse -Force

Write-Host "  -> [成功] 可停靠窗口面板已安装至: $userCepTarget" -ForegroundColor Green
Write-Host "  -> [成功] 已开启 CSXS PlayerDebugMode=1" -ForegroundColor Green

# ============================================================================
# 第二部分：安装「文件 > 脚本」菜单入口（供绑定 F2~F6 快捷键使用）
# ============================================================================
Write-Host "`n[2/2] 正在部署「文件 > 脚本」快捷入口..." -ForegroundColor Cyan

function Find-PhotoshopScriptDirs {
  $candidates = @()
  $progRoots = @($env:ProgramFiles, ${env:ProgramFiles(x86)}) | Where-Object { $_ -and (Test-Path $_) }
  foreach ($root in $progRoots) {
    $adobeDir = Join-Path $root "Adobe"
    if (Test-Path $adobeDir) {
      Get-ChildItem -Path $adobeDir -Directory -Filter "*Photoshop*" -ErrorAction SilentlyContinue | ForEach-Object {
        $sDir = Join-Path $_.FullName "Presets\Scripts"
        if (Test-Path $sDir) {
          $candidates += $sDir
        }
      }
    }
  }
  return ($candidates | Select-Object -Unique)
}

$targetDirs = @()
if ($TargetPhotoshopScriptsDir -ne "") {
  if (-not (Test-Path $TargetPhotoshopScriptsDir)) {
    New-Item -ItemType Directory -Path $TargetPhotoshopScriptsDir -Force | Out-Null
  }
  $targetDirs += (Resolve-Path $TargetPhotoshopScriptsDir).Path
} else {
  $targetDirs = Find-PhotoshopScriptDirs
}

foreach ($scriptsRoot in $targetDirs) {
  try {
    $installRoot = Join-Path $scriptsRoot "SpineSplitter"
    foreach ($sub in @("core", "host", "ui", "entries")) {
      New-Item -ItemType Directory -Path (Join-Path $installRoot $sub) -Force | Out-Null
    }
    foreach ($libGroup in @("core", "host", "ui")) {
      $srcGroupDir = Join-Path $SrcDir $libGroup
      $dstGroupDir = Join-Path $installRoot $libGroup
      Get-ChildItem -Path $srcGroupDir -File -Filter "*.js" | ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
        $incName = [System.IO.Path]::GetFileNameWithoutExtension($_.Name) + ".jsxinc"
        [System.IO.File]::WriteAllText((Join-Path $dstGroupDir $incName), $content, $Utf8Bom)
      }
    }
    $srcEntriesDir = Join-Path $SrcDir "entries"
    $dstEntriesDir = Join-Path $installRoot "entries"
    Get-ChildItem -Path $srcEntriesDir -File -Filter "*.jsx" | ForEach-Object {
      $raw = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
      $patched = $raw -replace '(\/\/@include\s+"\.\.\/(?:core|host|ui)\/[^"]+)\.js"', '$1.jsxinc"'
      [System.IO.File]::WriteAllText((Join-Path $dstEntriesDir $_.Name), $patched, $Utf8Bom)
    }
    Write-Host "  -> [成功] 快捷键脚本已同步至: $installRoot" -ForegroundColor Green
  } catch {
    Write-Host "  -> [提示] Program Files 脚本目录无需重复写入或需管理员权限（可停靠 CEP 窗口面板已正常安装成功！）" -ForegroundColor Yellow
  }
}

Write-Host "`n============================================================================" -ForegroundColor Green
Write-Host "安装全部完成！请重启 Photoshop，然后点击顶部菜单：" -ForegroundColor Green
Write-Host "  「窗口 (Window) > 扩展功能 (旧版) > PS_Splitter」" -ForegroundColor White
Write-Host "即可打开可停靠在侧边栏的常驻拆图面板（边用套索画选区、边直接点击按钮拆图）！" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Green
