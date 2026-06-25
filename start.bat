@echo off
setlocal

set BRIDGE_PORT=8765
set APP_PORT=8099

REM --- auto-detect this machine's LAN IP (the adapter that has a default gateway) ---
set LAN_IP=
for /f "delims=" %%i in ('powershell -NoProfile -Command "Get-NetIPConfiguration ^| Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } ^| Select-Object -First 1 -ExpandProperty IPv4Address ^| Select-Object -ExpandProperty IPAddress" 2^>nul') do set LAN_IP=%%i
if "%LAN_IP%"=="" set LAN_IP=127.0.0.1
set APP_URL=http://%LAN_IP%:%APP_PORT%/?bridge=ws://%LAN_IP%:%BRIDGE_PORT%

set SCOOP_PY=%USERPROFILE%\scoop\apps\python\current\python.exe
if exist "%SCOOP_PY%" (set PYTHON=%SCOOP_PY%) else (set PYTHON=python)

echo.
echo CA99 Control - Startup
echo =========================================================
echo Python : %PYTHON%
echo LAN IP : %LAN_IP%   [services bind 0.0.0.0 - reachable from LAN]
echo Bridge : ws://%LAN_IP%:%BRIDGE_PORT%
echo App    : %APP_URL%
echo =========================================================
echo First LAN use? Allow inbound firewall once in an ADMIN PowerShell:
echo   New-NetFirewallRule -DisplayName "CA99" -Direction Inbound -Action Allow -Protocol TCP -LocalPort %APP_PORT%,%BRIDGE_PORT%
echo =========================================================
echo.

echo [1/4] Killing old processes on ports %BRIDGE_PORT% %APP_PORT%...
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%BRIDGE_PORT% " ^| findstr LISTENING') do (taskkill /PID %%p /F >nul 2>&1)
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%APP_PORT% " ^| findstr LISTENING') do (taskkill /PID %%p /F >nul 2>&1)

echo [2/4] Starting MIDI bridge (ws://%LAN_IP%:%BRIDGE_PORT%, bind 0.0.0.0)...
start "CA99 MIDI Bridge" cmd /k "cd /d "%~dp0bridge" && "%PYTHON%" ca99_midi_bridge.py --host 0.0.0.0 --port %BRIDGE_PORT%"

echo [3/4] Waiting for bridge to be ready...
set /a tries=0
:wait_bridge
timeout /t 1 /nobreak >nul
set /a tries+=1
netstat -ano | findstr ":%BRIDGE_PORT% " | findstr LISTENING >nul 2>&1
if not errorlevel 1 goto bridge_ready
if %tries% lss 8 goto wait_bridge
echo [WARNING] Bridge not ready after 8s. Run:
echo   %PYTHON% -m pip install -r bridge\requirements-bridge.txt
echo.
:bridge_ready

echo [4/4] Starting web server (http://%LAN_IP%:%APP_PORT%, bind 0.0.0.0)...
start "CA99 Web Server" cmd /k "cd /d "%~dp0app" && "%PYTHON%" -m http.server %APP_PORT% --bind 0.0.0.0"
timeout /t 2 /nobreak >nul

echo.
echo Opening: %APP_URL%
echo.
start "" "%APP_URL%"

echo Done. Close CA99 MIDI Bridge and CA99 Web Server windows to stop.
echo.
pause
endlocal