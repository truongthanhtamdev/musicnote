@echo off
title Piano Guitar Dem Hat - He thong quan ly
cd /d "%~dp0app"

echo ==================================================
echo   PIANO GUITAR DEM HAT - khoi dong he thong quan ly
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [!] May nay chua cai Node.js.
  echo     Cua so trinh duyet se mo trang tai Node.js - chon ban LTS,
  echo     cai xong thi chay lai file nay.
  echo.
  start "" https://nodejs.org/en/download
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODEVER=%%v
echo Node.js: %NODEVER%

if not exist ".env.local" (
  echo Tao file cau hinh .env.local ...
  > ".env.local" echo AUTH_SECRET=musicnote-%RANDOM%%RANDOM%%RANDOM%%RANDOM%%RANDOM%
)

if not exist "node_modules" (
  echo.
  echo Lan dau chay: dang tai thu vien, mat khoang 2-5 phut tuy mang.
  echo Vui long doi, dung tat cua so nay...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [!] Cai thu vien that bai. Chup man hinh doan chu mau do o tren
    echo     de duoc ho tro xu ly.
    pause
    exit /b 1
  )
)

echo.
echo Dang khoi dong... trinh duyet se tu mo sau khoang 15 giay.
echo Neu khong tu mo, hay vao dia chi:  http://localhost:3000
echo.
echo Dang nhap lan dau:  admin@musicnote.local  /  admin123
echo.
echo   *** DE TAT HE THONG: dong cua so den nay ***
echo.

start "" cmd /c "timeout /t 15 >nul & start http://localhost:3000"
call npm run dev

echo.
echo He thong da dung.
pause
