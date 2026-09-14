#!/usr/bin/env bash
set -e

# Detect active Wi-Fi / Local Area Network IP
LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')
if [ -z "$LAN_IP" ]; then
  LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

if [ -z "$LAN_IP" ]; then
  echo "❌ Error: Could not determine your local network IP. Are you connected to Wi-Fi?"
  exit 1
fi

echo "=================================================="
echo " Detected Wi-Fi / Local IP: $LAN_IP"
echo "=================================================="

# Restart the Next.js dev server container so it picks up the network
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q '^iqueue-web$'; then
  echo "🔄 Restarting Next.js dev container (iqueue-web)..."
  docker restart iqueue-web >/dev/null
  echo "✅ Next.js dev server reloaded!"
elif [ -f docker-compose.dev.yml ]; then
  echo "🔄 Restarting frontend service with docker compose..."
  docker compose -f docker-compose.dev.yml restart frontend >/dev/null
  echo "✅ Frontend service reloaded!"
fi

echo ""
echo "📱 Open this link in your mobile browser:"
echo "   http://${LAN_IP}:3000"
echo "=================================================="
