#!/usr/bin/env bash
# exit on error
set -o errexit

echo "📦 Installing npm dependencies..."
npm install

echo "🌐 Installing Chromium for Puppeteer..."
# Use the full path to npx and puppeteer
node node_modules/puppeteer/install.mjs

echo "✅ Build complete!"