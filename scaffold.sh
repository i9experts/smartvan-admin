#!/bin/bash
# SmartVan Admin - Complete Next.js 14 Scaffold
# Run this on your server at /var/www/

set -e

echo "🚀 Scaffolding SmartVan Admin..."

# 1. Create Next.js app
npx create-next-app@latest smartvan-admin \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git

cd smartvan-admin

# 2. Install dependencies
npm install \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-select \
  @radix-ui/react-tabs \
  @radix-ui/react-tooltip \
  @radix-ui/react-avatar \
  @radix-ui/react-badge \
  @radix-ui/react-separator \
  @radix-ui/react-slot \
  class-variance-authority \
  clsx \
  tailwind-merge \
  lucide-react \
  axios \
  socket.io-client \
  @tanstack/react-query \
  js-cookie \
  recharts \
  date-fns \
  next-themes

echo "✅ Dependencies installed"
