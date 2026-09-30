#!/bin/bash
set -e

echo "=========================================================="
echo " EkshitaScreen — Local Management Dashboard & Backend Setup"
echo "=========================================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js (v18 or higher) is required."
    echo "Please download and install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VER=$(node -v)
echo "✓ Node.js version: $NODE_VER"

# Check if node_modules exists, if not run npm install
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Ensure storage directories exist
mkdir -p storage/media storage/thumbnails storage/downloads

echo ""
echo "🚀 Starting EkshitaScreen Local Server on port 3000..."
echo "Open your browser at: http://localhost:3000"
echo "Press Ctrl+C to stop the server."
echo ""

npm run dev
