#!/usr/bin/env bash
set -o errexit

echo "📦 Installing npm dependencies..."
npm install

echo "✅ Build complete! (Chromium installed via postinstall)"