#!/usr/bin/env bash
set -euo pipefail

# Backend control script
# - Creates virtualenv, data, and log directories under a target path (default: /tmp/cs160-backend)
# - Supports: setup | start | stop | restart | clean-restart
#
# Usage examples:
#   ./scripts/backendctl.sh setup
#   ./scripts/backendctl.sh start /tmp/cs160-backend
#   ./scripts/backendctl.sh start
#   ./scripts/backendctl.sh restart

CMD=${1:-help}
TARGET_ROOT=${2:-/tmp/cs160-backend}

REPO_ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_IMPORT="backend.app.main:app"
SEED_MODULE="backend.app.seed"

VENVDIR="$TARGET_ROOT/venv"
DATADIR="$TARGET_ROOT/data"
LOGDIR="$TARGET_ROOT/logs"
RUNDIR="$TARGET_ROOT/run"
PIDFILE="$RUNDIR/uvicorn.pid"
UVICORN_HOST="0.0.0.0"
UVICORN_PORT="8000"
UVICORN_LOG="$LOGDIR/uvicorn.log"

ensure_dirs() {
  mkdir -p "$VENVDIR" "$DATADIR" "$LOGDIR" "$RUNDIR"
}

create_venv_and_install() {
  if [ ! -f "$VENVDIR/bin/activate" ]; then
    python3 -m venv "$VENVDIR"
  fi
  # shellcheck disable=SC1091
  source "$VENVDIR/bin/activate"
  python -m pip install --upgrade pip
  # Minimal runtime deps
  pip install fastapi "uvicorn[standard]" sqlalchemy pydantic
}

seed_db() {
  # Run project seed using repo root as working dir
  (cd "$REPO_ROOT_DIR" && PYTHONPATH=. "$VENVDIR/bin/python" -m "$SEED_MODULE")
  # Optional: copy/backup DB to data directory for visibility
  if [ -f "$REPO_ROOT_DIR/backend/sqlite.db" ]; then
    cp -f "$REPO_ROOT_DIR/backend/sqlite.db" "$DATADIR/sqlite.db"
  fi
}

start_server() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "Server already running with PID $(cat "$PIDFILE")"; return 0
  fi
  # Start uvicorn in background, logging to file
  (
    cd "$REPO_ROOT_DIR"
    PYTHONPATH=. "$VENVDIR/bin/python" -m uvicorn "$APP_IMPORT" \
      --host "$UVICORN_HOST" --port "$UVICORN_PORT" \
      >>"$UVICORN_LOG" 2>&1 & echo $! >"$PIDFILE"
  )
  sleep 0.5
  echo "Started uvicorn on :$UVICORN_PORT (PID $(cat "$PIDFILE"))"
}

stop_server() {
  if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID" || true
      # wait briefly for clean shutdown
      sleep 0.5
      if kill -0 "$PID" 2>/dev/null; then
        echo "Force killing $PID"; kill -9 "$PID" || true
      fi
    fi
    rm -f "$PIDFILE"
    echo "Stopped server"
  else
    echo "No PID file; server not running?"
  fi
}

clean_restart() {
  stop_server || true
  # Seed script automatically deletes and recreates DB
  seed_db
  start_server
}

setup() {
  ensure_dirs
  create_venv_and_install
  seed_db
  echo "Setup complete at $TARGET_ROOT"
}

case "$CMD" in
  setup)
    ensure_dirs; create_venv_and_install; seed_db ;;
  start)
    ensure_dirs; start_server ;;
  stop)
    ensure_dirs; stop_server ;;
  restart)
    ensure_dirs; stop_server || true; start_server ;;
  clean-restart)
    ensure_dirs; clean_restart ;;
  *)
    cat <<USAGE
Usage: $0 <setup|start|stop|restart|clean-restart> [target_root]
  target_root defaults to /tmp/cs160-backend

Examples:
  $0 setup
  $0 start /tmp/cs160-backend
  $0 restart
USAGE
    exit 1 ;;
esac


