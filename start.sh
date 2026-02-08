#!/bin/sh
set -e

# Start the relayer in the background
echo "[start] Launching relayer..."
cd /app/apps/relayer
bun run index.ts &
RELAYER_PID=$!

# Start the Next.js frontend (standalone build)
# The server.js location depends on the standalone output structure
echo "[start] Launching frontend on port ${PORT:-3000}..."
if [ -f /app/apps/web/frontend/server.js ]; then
  cd /app/apps/web/frontend
elif [ -f /app/server.js ]; then
  cd /app
else
  echo "[start] ERROR: Could not find Next.js server.js"
  exit 1
fi

HOSTNAME="${HOSTNAME:-0.0.0.0}" PORT="${PORT:-3000}" node server.js &
FRONTEND_PID=$!

echo "[start] Both services started (relayer=$RELAYER_PID, frontend=$FRONTEND_PID)"

# Handle shutdown gracefully
trap "kill $RELAYER_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGTERM SIGINT

# Wait for either process to exit
wait -n $RELAYER_PID $FRONTEND_PID 2>/dev/null || true

# If one exits, kill the other and exit
kill $RELAYER_PID $FRONTEND_PID 2>/dev/null
wait
