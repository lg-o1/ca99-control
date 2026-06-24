@echo off
chcp 65001 >nul
setlocal

:: ─── 配置 ──────────────────────────────────────────────────────────────────
set BRIDGE_PORT=8765
set APP_PORT=8099
set APP_URL=http://127.0.0.1:%APP_PORT%/?bridge=ws://127.0.0.1:%BRIDGE_PORT%

:: 优先用 scoop 安装的 Python（winsdk 装在那里），否则 fallback 到 PATH 里的 python
set SCOOP_PY=%USERPROFILE%\scoop\apps\python\current\python.exe
if exist "%SCOOP_PY%" (
    set PYTHON=%SCOOP_PY%
) else (
    set PYTHON=python
)

echo.
echo  CA99 Control — 启动脚本
echo  ─────────────────────────────────────────────────────────
echo  Python  : %PYTHON%
echo  Bridge  : ws://127.0.0.1:%BRIDGE_PORT%
echo  App     : %APP_URL%
echo  ─────────────────────────────────────────────────────────
echo.

:: ─── 释放端口（如有旧进程）─────────────────────────────────────────────────
echo [1/4] 清理旧进程...
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%BRIDGE_PORT% " ^| findstr LISTENING') do (
    taskkill /PID %%p /F >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%APP_PORT% " ^| findstr LISTENING') do (
    taskkill /PID %%p /F >nul 2>&1
)

:: ─── 启动 MIDI Bridge ────────────────────────────────────────────────────────
echo [2/4] 启动 MIDI bridge (ws://127.0.0.1:%BRIDGE_PORT%)...
start "CA99 MIDI Bridge" cmd /k "cd /d "%~dp0bridge" && "%PYTHON%" ca99_midi_bridge.py --host 127.0.0.1 --port %BRIDGE_PORT%"

:: 等 bridge 就绪（最多 8 秒）
echo [3/4] 等待 bridge 就绪...
set /a tries=0
:wait_bridge
timeout /t 1 /nobreak >nul
set /a tries+=1
netstat -ano | findstr ":%BRIDGE_PORT% " | findstr LISTENING >nul 2>&1
if not errorlevel 1 goto bridge_ready
if %tries% lss 8 goto wait_bridge
echo      [警告] bridge 未能在 8 秒内就绪，请检查 winsdk 是否安装：
echo        %PYTHON% -m pip install -r bridge\requirements-bridge.txt
echo.

:bridge_ready

:: ─── 启动 Web 服务器 ─────────────────────────────────────────────────────────
echo [4/4] 启动 Web 服务器 (http://127.0.0.1:%APP_PORT%)...
start "CA99 Web Server" cmd /k "cd /d "%~dp0app" && "%PYTHON%" -m http.server %APP_PORT% --bind 127.0.0.1"

:: 等 web server 就绪
timeout /t 2 /nobreak >nul

:: ─── 打开浏览器 ──────────────────────────────────────────────────────────────
echo.
echo  正在打开 Chrome...
echo  URL: %APP_URL%
echo.
start "" "%APP_URL%"

echo  两个后台窗口已启动（关闭本窗口不影响它们）。
echo  要停止服务，关闭 "CA99 MIDI Bridge" 和 "CA99 Web Server" 窗口即可。
echo.
pause
endlocal
