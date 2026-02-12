#!/bin/bash

# ==========================================
# Automated Nginx Strategy Update Script
# ==========================================

# 1. Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (use sudo)"
  exit
fi

DOMAIN="analytics.chatnationbot.com"
CONFIG_FILE="/etc/nginx/sites-available/$DOMAIN"
BACKUP_FILE="/etc/nginx/sites-available/$DOMAIN.bak.$(date +%F_%T)"

echo "--------------------------------------------------"
echo "   🚀 Updating Nginx Config for $DOMAIN"
echo "--------------------------------------------------"

if [ -f "$CONFIG_FILE" ]; then
    echo "📦 Backing up existing config to $BACKUP_FILE..."
    cp "$CONFIG_FILE" "$BACKUP_FILE"
else
    echo "⚠️  Warning: No existing config found at $CONFIG_FILE"
fi

echo "📝 Writing new Proxy Configuration..."

# Overwrite with the final Secure Config (includes API proxies)
cat > "$CONFIG_FILE" <<EOF
# HTTP Request Block (Redirect to HTTPS)
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS Production Block
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL Certificates (Assumes these exist from previous setup)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # 1. Dashboard API Proxy (UI -> API)
    # Proxies /api/* requests to internal port 3001
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Cookie \$http_cookie;
        proxy_pass_header Set-Cookie;
    }

    # 2. Collector API Proxy (SDK -> Collector)
    # Proxies /v1/* requests to internal port 3000. CORS handled by Collector.
    location /v1/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # 3. Dashboard UI Proxy (Browser -> Next.js)
    # Proxies root requests to internal port 3002
    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket Support (for HMR or potential backend events)
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Link it if not linked
if [ ! -f "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    ln -s "$CONFIG_FILE" /etc/nginx/sites-enabled/
    echo "🔗 Linked site to sites-enabled."
fi

echo "🔄 Testing and Reloading Nginx..."
nginx -t && systemctl reload nginx

echo "--------------------------------------------------"
echo "✅ SUCCESS! API Rules Applied."
echo "   - UI: https://$DOMAIN"
echo "   - API: https://$DOMAIN/api/"
echo "   - Collector: https://$DOMAIN/v1/"
echo "--------------------------------------------------"
