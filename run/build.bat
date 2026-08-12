@echo off
rem Spak Build Script (Windows)
rem 构建所有 TypeScript 包，并尝试注册全局命令

setlocal enabledelayedexpansion

set PROJECT_ROOT=%~dp0..
set BUILD_LOG=%PROJECT_ROOT%\.build.log

for /f "usebackq tokens=2 delims=:," %%a in (`type "%PROJECT_ROOT%\package.json" ^| find "version"`) do set SPAK_VERSION=%%a
set SPAK_VERSION=%SPAK_VERSION:"=%
set SPAK_VERSION=%SPAK_VERSION: =%

echo.
echo   ^> Spak Build v%SPAK_VERSION%
echo.

rem Step 1: TypeScript Compilation
echo   ^> Compiling TypeScript...

call pnpm tsc --build --force > "%BUILD_LOG%" 2>&1
if %ERRORLEVEL% equ 0 (
  echo   [OK] TypeScript compilation successful
) else (
  echo   [FAIL] TypeScript compilation failed
  type "%BUILD_LOG%"
  del "%BUILD_LOG%"
  exit /b 1
)

del "%BUILD_LOG%"

rem Step 1.5: Re-compile the root CLI with the correct rootDir so that
rem bin.js can resolve ./lib/cli/index.js (mirrors run/build.sh).
echo   ^> Compiling root CLI...
call pnpm exec tsc --build "%PROJECT_ROOT%\tsconfig.root.json" > "%BUILD_LOG%" 2>&1
if %ERRORLEVEL% equ 0 (
  echo   [OK] Root CLI compiled into lib\cli\
) else (
  echo   [FAIL] Root CLI compilation failed
  type "%BUILD_LOG%"
  del "%BUILD_LOG%"
  exit /b 1
)
del "%BUILD_LOG%"

rem Step 1.6: Copy project-level unified locale files so installed packages
rem can still resolve translations when cwd is outside the project.
if exist "%PROJECT_ROOT%\locales\*.yml" (
  if not exist "%PROJECT_ROOT%\lib\locales" mkdir "%PROJECT_ROOT%\lib\locales"
  copy /Y "%PROJECT_ROOT%\locales\*.yml" "%PROJECT_ROOT%\lib\locales\" >nul 2>&1
)

rem Step 2: Global binary registration
echo.
echo   ^> Registering spak command...

set BIN_SOURCE=%PROJECT_ROOT%\bin.js

rem Check if Admin
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
  rem Non-admin: copy to build output
  if not exist "%PROJECT_ROOT%\dist" mkdir "%PROJECT_ROOT%\dist"
  copy /Y "%BIN_SOURCE%" "%PROJECT_ROOT%\dist\spak.js" >nul
  echo   [!] Admin privileges not detected
  echo   [!] Global link skipped
  echo   [OK] Binary copied to dist\spak.js
  echo.
  echo   To use spak command, add dist to PATH or run:
  echo     set PATH=%%PATH%%;%PROJECT_ROOT%\dist
) else (
  rem Admin: create directory link
  if not exist "%PROJECT_ROOT%\dist" mkdir "%PROJECT_ROOT%\dist"
  copy /Y "%BIN_SOURCE%" "%PROJECT_ROOT%\dist\spak.js" >nul
  echo   [OK] Global command registered
)

rem Done
echo.
echo   ^> Build complete
echo.
