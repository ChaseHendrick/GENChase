@echo off
rem GENChase on Windows. Double-click this file; the studio opens in your default browser.
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 genchase.py
  goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
  python genchase.py
  goto :eof
)
echo Python was not found on this machine.
echo Opening studio.html directly instead. That works, but the studio cannot
echo keep your settings or gallery between sessions.
start "" "%~dp0..\studio.html"
pause
