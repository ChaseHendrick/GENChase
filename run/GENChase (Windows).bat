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
echo Opening the portable dist/studio.html instead. Browser restrictions on
echo local files may affect saved settings and clipboard access.
start "" "%~dp0..\dist\studio.html"
pause
