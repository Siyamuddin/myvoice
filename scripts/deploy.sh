#!/usr/bin/env bash
# In-repo deploy for self-hosted Mac runner.
# Retries Docker Hub metadata/pull flakes that otherwise fail compose builds.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-fullstack-saas}"
export COMPOSE_PROJECT_NAME

MAX_ATTEMPTS="${DEPLOY_MAX_ATTEMPTS:-5}"
HEALTH_URL="${DEPLOY_HEALTH_URL:-http://localhost:9090/actuator/health}"
FRONTEND_URL="${DEPLOY_FRONTEND_URL:-http://localhost:5174}"

log() {
  printf '[deploy] %s\n' "$*"
}

retry() {
  local attempt=1
  local delay=5
  local desc="$1"
  shift

  until "$@"; do
    if (( attempt >= MAX_ATTEMPTS )); then
      log "FAILED after ${MAX_ATTEMPTS} attempts: ${desc}"
      return 1
    fi
    log "attempt ${attempt}/${MAX_ATTEMPTS} failed (${desc}); retrying in ${delay}s…"
    sleep "${delay}"
    attempt=$((attempt + 1))
    delay=$((delay * 2))
    if (( delay > 60 )); then
      delay=60
    fi
  done
}

require_env_file() {
  if [[ ! -f .env ]]; then
    log "missing .env in ${ROOT_DIR}"
    return 1
  fi
}

prepull_images() {
  local images=(
    mysql:8.0
    redis:7-alpine
    nginx:alpine
    node:20-alpine
    maven:3.9.9-eclipse-temurin-21
    eclipse-temurin:21-jre
  )

  local image
  for image in "${images[@]}"; do
    # Prefer cache; still refresh tags with retries when Hub is flaky.
    if docker image inspect "${image}" >/dev/null 2>&1; then
      log "cached ${image}"
      continue
    fi
    log "pulling ${image}"
    retry "docker pull ${image}" docker pull "${image}"
  done
}

compose_up() {
  log "compose project=${COMPOSE_PROJECT_NAME}"
  docker compose down --remove-orphans || true
  # --pull=missing avoids forced Hub metadata when layers already exist.
  DOCKER_BUILDKIT=1 docker compose build --pull=missing
  docker compose up -d --remove-orphans
}

wait_healthy() {
  local attempt=1
  local max=36
  until curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; do
    if (( attempt >= max )); then
      log "backend health check failed: ${HEALTH_URL}"
      docker compose ps || true
      docker compose logs --tail=80 app || true
      return 1
    fi
    log "waiting for backend health (${attempt}/${max})…"
    sleep 5
    attempt=$((attempt + 1))
  done
  log "backend healthy"

  attempt=1
  until curl -fsS -o /dev/null "${FRONTEND_URL}"; do
    if (( attempt >= max )); then
      log "frontend check failed: ${FRONTEND_URL}"
      docker compose ps || true
      docker compose logs --tail=80 frontend next || true
      return 1
    fi
    log "waiting for frontend (${attempt}/${max})…"
    sleep 5
    attempt=$((attempt + 1))
  done
  log "frontend reachable"
}

main() {
  log "repo=$(git rev-parse --short HEAD 2>/dev/null || echo unknown) cwd=${ROOT_DIR}"
  require_env_file
  prepull_images
  retry "docker compose build/up" compose_up
  wait_healthy
  docker compose ps
  log "deploy complete"
}

main "$@"
