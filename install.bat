@echo off
cd /d "%~dp0"
py -3 -m venv .venv || goto fail
.venv\Scripts\python.exe -m pip install -r requirements.txt || goto fail
echo Installation complete.
pause
exit /b 0
:fail
echo Installation failed. Check Python installation.
pause
exit /b 1
