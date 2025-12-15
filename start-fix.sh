#!/bin/bash

echo "🚀 FIXING REACT STARTUP ISSUE..."
echo ""

# Solution 1: Try with legacy OpenSSL provider
echo "🔧 Trying with legacy OpenSSL provider..."
export NODE_OPTIONS="--openssl-legacy-provider"
echo "NODE_OPTIONS set to: $NODE_OPTIONS"
echo ""

# Check if port 3000 is in use
echo "🔍 Checking if port 3000 is in use..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3000 is in use. Killing existing process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
else
    echo "✅ Port 3000 is available"
fi
echo ""

# Start React app
echo "🚀 Starting React application..."
echo "If this still hangs, try:"
echo "1. Press Ctrl+C to stop"
echo "2. Run: nvm use 18 (to use Node.js 18)"
echo "3. Then run: npm start"
echo ""

npm start
