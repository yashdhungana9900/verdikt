#!/usr/bin/env bash
# Pull the latest code from GitHub, rebuild and restart.
# Usage: sudo bash /opt/verdikt/deploy/update.sh
set -euo pipefail
APP=/opt/verdikt
[[ $EUID -eq 0 ]] || { echo "Run this with sudo."; exit 1; }
sudo -u verdikt git -C "$APP" pull --ff-only
sudo -iu verdikt bash -c "cd $APP && (npm ci --no-audit --no-fund || npm install --no-audit --no-fund) && npm run build"
systemctl restart verdikt
echo "Updated."
