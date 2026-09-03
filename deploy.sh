#!/bin/bash

echo "============================================"
echo " Starting One-Touch Server Deployment"
echo "============================================"

# Exit on error
set -e

echo "[1/7] Updating apt and installing dependencies (mysql, etc)..."
sudo apt-get update -y

# Nginx 설치 시 백그라운드 자동 실행을 원천 차단하여 IPv6 에러를 방지합니다.
echo "Installing Nginx and dependencies..."
sudo ln -sf /dev/null /etc/systemd/system/nginx.service
sudo apt-get install -y curl build-essential mysql-server nginx

# Nginx 서비스 차단 해제
sudo rm -f /etc/systemd/system/nginx.service
sudo systemctl daemon-reload

# IPv6 설정이 아예 빠져있는 새로운 Nginx 기본 설정 파일로 덮어쓰기 (React SPA용 세팅 포함)
sudo bash -c 'cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80 default_server;
    root /var/www/html;
    index index.html index.htm;
    server_name _;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF'

echo "[2/7] Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "[3/7] Installing PM2..."
sudo npm install -g pm2

echo "[4/7] Setting up MySQL Database..."
# Create DB and user if not exists
sudo mysql -e "CREATE DATABASE IF NOT EXISTS evaluation;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'evaluation'@'localhost' IDENTIFIED BY 'Tlsgmd1@#$';"
sudo mysql -e "GRANT ALL PRIVILEGES ON evaluation.* TO 'evaluation'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
echo "MySQL Database configured."

echo "[5/7] Building and Starting Backend API..."
if [ -d "AI_Competition_API" ]; then
  cd AI_Competition_API
  npm install
  
  # Stop existing pm2 process if it exists
  pm2 stop server 2>/dev/null || true
  pm2 delete server 2>/dev/null || true
  
  # Start new pm2 process
  pm2 start server.js --name "server"
  pm2 save
  cd ..
else
  echo "Error: AI_Competition_API directory not found."
  exit 1
fi

echo "[6/7] Building and Setting up Frontend (Nginx)..."
if [ -d "AI_Competition_Mobile_Web" ]; then
  cd AI_Competition_Mobile_Web
  npm install
  npm run build
  
  # Copy built files to nginx root
  sudo rm -rf /var/www/html/*
  sudo cp -r dist/* /var/www/html/
  cd ..
else
  echo "Error: AI_Competition_Mobile_Web directory not found."
  exit 1
fi

echo "[7/7] Restarting Nginx Web Server..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "============================================"
echo " Deployment Completed Successfully! 🎉"
echo " You can now access the app at: http://101.79.29.163"
echo "============================================"
