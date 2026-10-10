@echo off
setlocal
title Property Empire - Setup
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-game.ps1" %*
set "setup_result=%errorlevel%"
echo.
pause
exit /b %setup_result%
