#!/bin/bash
set -e

echo "🚀 Deploying SmartVan Admin..."
cd /var/www/smartvan-admin

git pull origin main
npm install
npm run build

pm2 restart smartvan-admin 2>/dev/null || \
  pm2 start npm --name smartvan-admin -- start -- -p 3000

pm2 save
echo "✅ SmartVan Admin deployed — $(date)"
