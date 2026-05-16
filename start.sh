#!/bin/bash
set -e

BENCH_DIR="$HOME/Desktop/frappe-erp-core-bench"
SITE="erp_core.localhost"
REDIS_CACHE_PORT=13003
REDIS_QUEUE_PORT=11003
WEB_PORT=8000

# ── Node via NVM ─────────────────────────────────────────────────────────────
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
  nvm use 24 --silent
fi

# ── Python virtualenv ────────────────────────────────────────────────────────
source "$BENCH_DIR/env/bin/activate"

cd "$BENCH_DIR"

# ── Health check: site exists ────────────────────────────────────────────────
if [ ! -f "sites/$SITE/site_config.json" ]; then
  echo "ERROR: Site '$SITE' not found. Run setup_bench.sh first."
  exit 1
fi

# ── Kill any stale processes from a previous run ─────────────────────────────
echo "==> Stopping existing processes..."
pkill -f "redis-server.*redis_cache.conf" 2>/dev/null && echo "    killed redis_cache" || true
pkill -f "redis-server.*redis_queue.conf" 2>/dev/null && echo "    killed redis_queue" || true
kill $(lsof -ti:$WEB_PORT) 2>/dev/null           && echo "    killed web ($WEB_PORT)" || true
pkill -f "socketio.js"     2>/dev/null            && echo "    killed socketio"        || true
pkill -f "bench worker"    2>/dev/null            && echo "    killed worker"          || true
sleep 1

# ── Start Redis (daemonized) ──────────────────────────────────────────────────
echo "==> Starting Redis cache  (port $REDIS_CACHE_PORT)..."
redis-server "$BENCH_DIR/config/redis_cache.conf" --daemonize yes

echo "==> Starting Redis queue  (port $REDIS_QUEUE_PORT)..."
redis-server "$BENCH_DIR/config/redis_queue.conf" --daemonize yes

for port in $REDIS_CACHE_PORT $REDIS_QUEUE_PORT; do
  for i in $(seq 1 10); do
    redis-cli -p "$port" ping &>/dev/null && break
    sleep 0.5
  done
  redis-cli -p "$port" ping &>/dev/null || { echo "ERROR: Redis on port $port failed to start."; exit 1; }
done
echo "    Redis ready."

# ── Start web server ──────────────────────────────────────────────────────────
echo "==> Starting web server (port $WEB_PORT)..."
nohup bench serve --port $WEB_PORT &>> logs/web.log &
WEB_PID=$!
echo "    PID $WEB_PID — tail logs/web.log to follow"

# ── Start background worker ───────────────────────────────────────────────────
echo "==> Starting worker..."
nohup bench worker &>> logs/worker.log &
echo "    PID $! — tail logs/worker.log to follow"

# ── Wait for web to be ready ──────────────────────────────────────────────────
echo "==> Waiting for server..."
for i in $(seq 1 20); do
  if curl -s -o /dev/null -w "%{http_code}" "http://$SITE:$WEB_PORT/login" | grep -qE "200|301|302"; then
    echo ""
    echo "==> Ready: http://$SITE:$WEB_PORT/app"
    echo "    Login:"
    echo "      Administrator / <your password>   (lands on My Desktop)"
    echo ""
    echo "    To stop: kill $WEB_PID  (or run: pkill -f 'bench serve')"
    exit 0
  fi
  sleep 1
done

echo "ERROR: Server did not respond in 20s — check logs/web.log"
exit 1
