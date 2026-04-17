#!/bin/bash
# scripts/setup_nginx.sh

set -e

DOMAIN="sqauto.zeraynce.com"

echo "[+] Installing Nginx..."
sudo apt-get update
sudo apt-get install -y nginx

echo "[+] Configuring Nginx for $DOMAIN..."

sudo cat <<EOF | sudo tee /etc/nginx/sites-available/sqauto
server {
    listen 80;
    server_name $DOMAIN;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # API Routes (/api/...)
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # API Health (/api/health)
    location /api/health {
        proxy_pass http://localhost:8000/health;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/sqauto /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-available/default

echo "[+] Restarting Nginx..."
sudo systemctl restart nginx

echo "[+] Nginx setup complete!"
echo "[!] Next step: Run 'sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d $DOMAIN' to add SSL (HTTPS)."
