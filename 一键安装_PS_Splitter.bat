@echo off
chcp 65001 >nul
echo ============================================================================
echo   PS_Splitter - Photoshop Installer (Windows PS 2020 - 2025)
echo ============================================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install_ps_scripts.ps1" %*
if errorlevel 1 (
  echo.
  echo [WARN] Install failed. Please right-click "一键安装_PS_Splitter.bat" and select "Run as administrator".
)
echo.
pause
