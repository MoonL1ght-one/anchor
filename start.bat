@echo off
rem =====================================================
rem  锚点 · 个人底层系统
rem  双击本文件启动。会打开一个本地地址并自动跳转浏览器。
rem  关掉命令行窗口即停止；数据仍然留在浏览器里。
rem =====================================================
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"

if not exist "index.html" (
  echo.
  echo   当前目录里没有 index.html，请确认文件是否完整。
  echo.
  pause
  exit /b 1
)

set "PYCMD="

rem 1) Python 启动器
where py.exe >nul 2>nul
if !errorlevel!==0 set "PYCMD=py -3"

rem 2) 常见按用户安装的位置
if not defined PYCMD (
  for %%V in (313 312 311 310) do (
    if not defined PYCMD if exist "%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe" set "PYCMD=%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe"
  )
)

rem 3) PATH 回退（跳过 Microsoft Store 的占位程序）
if not defined PYCMD (
  for /f "delims=" %%W in ('where python.exe 2^>nul') do (
    if not defined PYCMD (
      echo %%W | find /i "WindowsApps" >nul
      if !errorlevel! neq 0 set "PYCMD=%%W"
    )
  )
)

if not defined PYCMD (
  echo.
  echo   没有找到 Python 3。
  echo   可以直接双击 index.html 使用；若加密导出提示不可用，再安装 Python。
  echo   或安装 Python：https://www.python.org/downloads/
  echo.
  pause
  exit /b 1
)

%PYCMD% "serve.py"
if !errorlevel! neq 0 pause
exit /b 0
