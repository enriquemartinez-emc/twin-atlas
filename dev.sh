#!/usr/bin/env bash
# Starts the whole app with one command: the database, the API and the client.
# Press Ctrl+C to stop everything.
#
#   ./dev.sh             start everything
#   ./dev.sh --check     only check that this machine can run it, start nothing
#   ./dev.sh --keep-db   leave the database running when you stop
set -euo pipefail

SELF="${BASH_SOURCE[0]}"
SELF_DIR="${SELF%/*}"
[ "$SELF_DIR" = "$SELF" ] && SELF_DIR=.
ROOT="$(cd "$SELF_DIR" && pwd)"
RUN_DIR="$ROOT/.run"
API_URL="http://localhost:8080"
APP_URL="http://localhost:4200"
READY_TIMEOUT=240

MODE=start
KEEP_DB=0
for arg in "$@"; do
  case "$arg" in
    --check) MODE=check ;;
    --keep-db) KEEP_DB=1 ;;
    -h | --help) sed -n '2,7p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

problems=0
ok() { echo "  ✓ $*"; }
problem() { echo "  ✗ $*" >&2; problems=$((problems + 1)); }

port_busy() { [ -n "$(ss -ltnH "sport = :$1" 2>/dev/null)" ]; }

# --- 1. Can this machine run it? -------------------------------------------------------------
check_machine() {
  echo "Checking this machine"

  if ! command -v docker >/dev/null 2>&1; then
    problem "Docker is not installed. Install Docker, then try again."
  elif ! docker info >/dev/null 2>&1; then
    problem "Docker is installed but not running. Start Docker (on Windows, start Docker Desktop), then try again."
  elif ! docker compose version >/dev/null 2>&1; then
    problem "Docker Compose is missing. Install the Docker Compose plugin."
  else
    ok "Docker is running"
  fi

  local major
  major="$(java -version 2>&1 | sed -nE '1s/.*"([0-9]+).*/\1/p' || true)"
  if [ "$major" != "25" ]; then
    local candidate
    candidate="$(ls -d /usr/lib/jvm/*25* 2>/dev/null | head -1 || true)"
    if [ -n "$candidate" ] && [ -x "$candidate/bin/java" ]; then
      export JAVA_HOME="$candidate"
      export PATH="$JAVA_HOME/bin:$PATH"
      ok "JDK 25 found at $JAVA_HOME"
    else
      problem "JDK 25 was not found (the PATH has ${major:+version $major}${major:-no Java}). Install JDK 25 or set JAVA_HOME."
    fi
  else
    ok "JDK 25 is on the PATH"
  fi

  if ! command -v node >/dev/null 2>&1; then
    problem "Node is not installed. Install Node 24 (nvm install 24), then try again."
  else
    local node_major
    node_major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
    case "$node_major" in
      22 | 24 | 26) ok "Node $(node -v)" ;;
      *) problem "Node $(node -v) is not supported by Angular 22. Use Node 24 (nvm install 24)." ;;
    esac
  fi

  [ -x "$ROOT/server/mvnw" ] && ok "Maven wrapper found" || problem "server/mvnw is missing or not executable."

  for port in 8080 4200; do
    if port_busy "$port"; then
      problem "Port $port is already in use. Stop whatever uses it (see: ss -ltnp 'sport = :$port')."
    else
      ok "Port $port is free"
    fi
  done
  if port_busy 5432 && [ -z "$(docker compose -f "$ROOT/docker-compose.yml" ps --status running --quiet db 2>/dev/null || true)" ]; then
    problem "Port 5432 is in use by something that is not this project's database. Stop it, or stop the other PostgreSQL."
  else
    ok "The database port is free or already ours"
  fi
}

check_machine
if [ "$problems" -gt 0 ]; then
  echo >&2
  echo "$problems problem(s) found. Nothing was started." >&2
  exit 1
fi
if [ "$MODE" = check ]; then
  echo
  echo "All good. Run ./dev.sh to start the app."
  exit 0
fi

# --- 2. Start it -------------------------------------------------------------------------------
SERVER_PID=""
CLIENT_PID=""
DB_STARTED=0
STOPPING=0

# Each service gets its own process group, so stopping it also stops what it started.
stop_group() {
  local name="$1" pid="$2"
  [ -n "$pid" ] || return 0
  kill -0 "$pid" 2>/dev/null || return 0
  kill -TERM -- "-$pid" 2>/dev/null || true
  for _ in $(seq 1 40); do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.5
  done
  echo "  $name did not stop in time, forcing it"
  kill -KILL -- "-$pid" 2>/dev/null || true
}

cleanup() {
  [ "$STOPPING" = 1 ] && return
  STOPPING=1
  trap - EXIT INT TERM
  echo
  echo "Stopping"
  stop_group "client" "$CLIENT_PID"
  stop_group "server" "$SERVER_PID"
  if [ "$DB_STARTED" = 1 ] && [ "$KEEP_DB" = 0 ]; then
    docker compose -f "$ROOT/docker-compose.yml" stop db >/dev/null 2>&1 || true
    echo "  database stopped (its data is kept)"
  elif [ "$DB_STARTED" = 1 ]; then
    echo "  database left running (--keep-db)"
  fi
  echo "Stopped."
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

start_service() {
  local name="$1" dir="$2"
  shift 2
  ( cd "$dir" && exec setsid "$@" >"$RUN_DIR/$name.log" 2>&1 ) &
  echo $!
}

wait_until_ready() {
  local name="$1" url="$2" pid="$3" waited=0
  until curl -fsS -o /dev/null "$url" 2>/dev/null; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "  ✗ The $name stopped while starting. Last lines of .run/$name.log:" >&2
      tail -n 25 "$RUN_DIR/$name.log" >&2 || true
      exit 1
    fi
    if [ "$waited" -ge "$READY_TIMEOUT" ]; then
      echo "  ✗ The $name did not answer at $url within ${READY_TIMEOUT}s. Last lines of .run/$name.log:" >&2
      tail -n 25 "$RUN_DIR/$name.log" >&2 || true
      exit 1
    fi
    sleep 2
    waited=$((waited + 2))
  done
  echo "  ✓ $name is up ($url)"
}

mkdir -p "$RUN_DIR"
echo
echo "Starting the database"
docker compose -f "$ROOT/docker-compose.yml" up -d --wait db
DB_STARTED=1

if [ ! -d "$ROOT/client/node_modules" ]; then
  echo "Installing the client's dependencies (first run only)"
  (cd "$ROOT/client" && npm ci)
fi

echo "Starting the API and the client (logs in .run/)"
SERVER_PID="$(start_service server "$ROOT/server" ./mvnw -B spring-boot:run -Dspring-boot.run.jvmArguments=-Xmx512m)"
CLIENT_PID="$(start_service client "$ROOT/client" npm start)"

wait_until_ready "API" "$API_URL/api/scenes" "$SERVER_PID"
wait_until_ready "client" "$APP_URL" "$CLIENT_PID"

cat <<MSG

  Twin Atlas is running.

    App:      $APP_URL
    API docs: $API_URL/swagger-ui.html

  Press Ctrl+C to stop everything.
MSG

wait -n "$SERVER_PID" "$CLIENT_PID" || true
echo
echo "A service stopped on its own. See .run/server.log and .run/client.log."
exit 1
