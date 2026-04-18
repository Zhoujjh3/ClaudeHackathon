#!/bin/bash
# FieldFit start script
# Usage: ./start.sh
# Runs backend + frontend in detached screen sessions

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting FieldFit..."

# Kill existing sessions if running
screen -X -S fieldfit-backend quit 2>/dev/null || true
screen -X -S fieldfit-frontend quit 2>/dev/null || true

# Backend
screen -dmS fieldfit-backend bash -c "
  cd '$SCRIPT_DIR/backend'
  source venv/bin/activate
  uvicorn main:app --host 0.0.0.0 --port 8000
  exec bash
"
echo "  Backend  → port 8000  (screen: fieldfit-backend)"

# Frontend — serve pre-built dist if it exists, otherwise dev server
if [ -d "$SCRIPT_DIR/frontend/dist" ]; then
  screen -dmS fieldfit-frontend bash -c "
    cd '$SCRIPT_DIR/frontend'
    npx serve -s dist -l 3000
    exec bash
  "
  echo "  Frontend → port 3000  (screen: fieldfit-frontend, serving dist/)"
else
  screen -dmS fieldfit-frontend bash -c "
    cd '$SCRIPT_DIR/frontend'
    npm run dev -- --host 0.0.0.0
    exec bash
  "
  echo "  Frontend → port 3000  (screen: fieldfit-frontend, dev mode)"
fi

echo ""
echo "FieldFit is running."
echo ""
echo "  App:  http://$(hostname -I | awk '{print $1}'):3000"
echo "  API:  http://$(hostname -I | awk '{print $1}'):8000"
echo ""
echo "Logs:"
echo "  screen -r fieldfit-backend"
echo "  screen -r fieldfit-frontend"
echo ""
echo "Stop:"
echo "  screen -X -S fieldfit-backend quit && screen -X -S fieldfit-frontend quit"
