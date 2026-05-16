#!/bin/bash
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Configure these before running ───────────────────────────────────────────
BENCH_DIR="$HOME/Desktop/frappe-erp-core-bench"
SITE="erp_core.localhost"
# ─────────────────────────────────────────────────────────────────────────────

BENCH_PARENT="$(dirname "$BENCH_DIR")"
BENCH_NAME="$(basename "$BENCH_DIR")"

echo "==> Setting up Frappe bench v16 in: $BENCH_DIR"
echo "    App source: $APP_DIR"

# ── Node 24 via NVM ──────────────────────────────────────────────────────────
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "ERROR: NVM not found at $NVM_DIR. Install NVM first: https://github.com/nvm-sh/nvm"
  exit 1
fi
source "$NVM_DIR/nvm.sh"

if ! node --version 2>/dev/null | grep -q "^v24"; then
  echo "==> Installing Node.js 24..."
  nvm install 24
fi
nvm use 24
echo "    Node: $(node --version), npm: $(npm --version)"

if ! yarn --version &>/dev/null; then
  echo "==> Installing yarn for Node 24..."
  npm install -g yarn
fi
echo "    yarn: $(yarn --version)"

# ── Clean up any partial bench state ─────────────────────────────────────────
if [ -d "$BENCH_DIR" ]; then
  echo "==> Cleaning up partial bench state in $BENCH_NAME..."
  for item in apps config env logs sites patches.txt Procfile; do
    rm -rf "$BENCH_DIR/$item"
  done
fi

# ── bench init ───────────────────────────────────────────────────────────────
echo "==> Initializing bench (Frappe version-16, Python 3.14)..."
cd "$BENCH_PARENT"
bench init "$BENCH_NAME" \
  --frappe-branch version-16 \
  --python python3.14 \
  --ignore-exist || true

cd "$BENCH_DIR"

# ── ERPNext ──────────────────────────────────────────────────────────────────
echo "==> Getting ERPNext v16..."
bench get-app erpnext --branch version-16

# ── India Compliance ─────────────────────────────────────────────────────────
echo "==> Getting India Compliance v16..."
bench get-app https://github.com/resilient-tech/india-compliance --branch version-16

# ── Frappe CRM ────────────────────────────────────────────────────────────────
echo "==> Getting Frappe CRM..."
bench get-app crm https://github.com/frappe/crm --branch main

# ── Frappe HRMS ───────────────────────────────────────────────────────────────
echo "==> Getting Frappe HRMS v16..."
bench get-app hrms https://github.com/frappe/hrms --branch version-16

# ── frappe_erp_core (local) ───────────────────────────────────────────────────
echo "==> Installing frappe_erp_core from $APP_DIR..."
bench get-app frappe_erp_core "$APP_DIR"

# ── Verify apps ──────────────────────────────────────────────────────────────
echo "==> Installed apps:"
ls apps/

# ── Start Redis (required for site creation) ─────────────────────────────────
echo "==> Starting Redis..."
redis-server "$BENCH_DIR/config/redis_cache.conf" --daemonize yes
redis-server "$BENCH_DIR/config/redis_queue.conf" --daemonize yes
sleep 2

# ── New site ─────────────────────────────────────────────────────────────────
read -rsp "Enter MariaDB root password: " DB_ROOT_PASS
echo

bench new-site "$SITE" \
  --db-root-password "$DB_ROOT_PASS" \
  --install-app erpnext \
  --install-app india_compliance \
  --install-app crm \
  --install-app hrms \
  --install-app frappe_erp_core

# ── Set default site ─────────────────────────────────────────────────────────
cd "$BENCH_DIR" && bench use "$SITE"

# ── Build assets ─────────────────────────────────────────────────────────────
echo "==> Building assets (JS/CSS for all apps)..."
cd "$BENCH_DIR" && bench build

# ── Stop Redis daemons ────────────────────────────────────────────────────────
echo "==> Stopping Redis daemons..."
redis-cli -p "$(grep '^port' "$BENCH_DIR/config/redis_cache.conf" | awk '{print $2}')" shutdown 2>/dev/null || true
redis-cli -p "$(grep '^port' "$BENCH_DIR/config/redis_queue.conf" | awk '{print $2}')" shutdown 2>/dev/null || true

echo ""
echo "==> Done! Start the dev server with:"
echo "    $APP_DIR/start.sh"
echo "    Then open: http://$SITE:8000/app"
