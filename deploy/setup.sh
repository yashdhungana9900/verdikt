#!/usr/bin/env bash
# One-shot setup for a fresh Ubuntu 22.04 / 24.04 server.
# Usage: sudo bash setup.sh your-name.duckdns.org https://github.com/you/verdikt.git
set -euo pipefail

DOMAIN="${1:-}"; REPO="${2:-}"
if [[ -z "$DOMAIN" || -z "$REPO" ]]; then
  echo "Usage: sudo bash setup.sh your-name.duckdns.org https://github.com/you/verdikt.git"; exit 1
fi
[[ $EUID -eq 0 ]] || { echo "Run this with sudo."; exit 1; }
APP=/opt/verdikt
say() { printf '\n\033[1;35m==> %s\033[0m\n' "$*"; }

say "Installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git gnupg ufw openssl debian-keyring debian-archive-keyring apt-transport-https

say "Adding swap (so small servers don't run out of memory while building)"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

say "Installing Docker"
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh

say "Installing Node.js 22"
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

say "Installing Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -y
  apt-get install -y caddy
fi

say "Creating the app user and fetching the code"
id verdikt >/dev/null 2>&1 || useradd --create-home --shell /bin/bash verdikt
usermod -aG docker verdikt
if [[ -d "$APP/.git" ]]; then git -C "$APP" pull --ff-only; else git clone "$REPO" "$APP"; fi
chown -R verdikt:verdikt "$APP"

say "Writing the settings file (a random database password is generated)"
if [[ ! -f "$APP/.env" ]]; then
  PW="$(openssl rand -hex 16)"
  cat > "$APP/.env" <<ENV
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
TRUST_PROXY=1
DEV_SOLUTIONS=0
POSTGRES_PASSWORD=$PW
DATABASE_URL=postgres://verdikt:$PW@127.0.0.1:5440/verdikt
ENV
  chown verdikt:verdikt "$APP/.env"; chmod 600 "$APP/.env"
fi

say "Building the website and starting the database"
sudo -iu verdikt bash -c "cd $APP && (npm ci --no-audit --no-fund || npm install --no-audit --no-fund) && npm run build && docker compose up -d db"

say "Preparing the code sandboxes (several minutes the first time)"
sudo -iu verdikt bash -c "cd $APP && npm run judge:pull"

say "Starting the server and HTTPS"
sed "s/__DOMAIN__/$DOMAIN/g" "$APP/deploy/Caddyfile.template" > /etc/caddy/Caddyfile
cp "$APP/deploy/verdikt.service" /etc/systemd/system/verdikt.service
systemctl daemon-reload
systemctl enable --now verdikt
systemctl restart caddy

say "Turning on the firewall (SSH, HTTP and HTTPS only)"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

sleep 5
say "Done. Checking status"
systemctl is-active verdikt caddy || true
curl -s "http://127.0.0.1:3001/api/health" || true
printf '\n\nOpen https://%s in your browser. The first visit can take a few seconds while the HTTPS certificate is issued.\n' "$DOMAIN"
