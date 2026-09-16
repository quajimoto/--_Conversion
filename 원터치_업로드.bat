@echo off
chcp 65001 > nul
title 깃허브 원터치 업로드 스크립트

echo ===================================================
echo   🚀 GitHub 원터치 자동 업로드 및 Render 배포 시작
echo ===================================================
echo.

git add .

set COMMIT_MSG=Render 원터치 자동 배포 - %date% %time%
echo [1/2] 커밋 중: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%"

echo.
echo [2/2] GitHub (origin main) 푸시 중...
git push origin main

echo.
echo ===================================================
echo  ✅ GitHub 업로드 완료!
echo   Render에서 자동으로 백엔드 및 프론트엔드 배포가 진행됩니다.
echo ===================================================
echo.
pause
