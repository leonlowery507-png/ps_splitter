@echo off
chcp 65001 >nul
echo ============================================================================
echo   SpineSplitter - Photoshop Script Installer
echo ============================================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_ps_scripts.ps1" %*
if errorlevel 1 (
  echo.
  echo [WARN] Install failed. Please right-click install_ps_scripts.bat and select "Run as administrator".
)
echo.
pause
