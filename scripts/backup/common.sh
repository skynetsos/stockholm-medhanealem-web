#!/usr/bin/env bash
# Shared setup for backup-db.sh and restore-db.sh. Not run directly.
#
# Environment (all have defaults):
#   ENV_FILE       env file with POSTGRES_* and BACKUP_* values   (default .env.production)
#   COMPOSE_FILE   compose file that runs the "postgres" service  (default docker-compose.prod.yml)
#   BACKUP_DIR     local folder for encrypted dumps               (default ./backups)

set -euo pipefail
# Git Bash on Windows rewrites "/paths" in docker arguments; disable that.
export MSYS_NO_PATHCONV=1

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
AWS_CLI_IMAGE="amazon/aws-cli:2.38.1"

[[ -f "$ENV_FILE" ]] || { echo "Env file $ENV_FILE not found (set ENV_FILE)." >&2; exit 1; }
set -a
# shellcheck disable=SC1090
source <(sed 's/\r$//' "$ENV_FILE")
set +a

: "${POSTGRES_USER:?POSTGRES_USER missing in $ENV_FILE}"
: "${POSTGRES_DB:?POSTGRES_DB missing in $ENV_FILE}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE missing in $ENV_FILE}"

compose() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }
psql_admin() { compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres "$@"; }

# Absolute host path usable in `docker run -v` (Windows Git Bash needs C:/… form).
host_path() { (cd "$1" && (pwd -W 2>/dev/null || pwd)); }

# Run the AWS CLI in a container against the off-server backup bucket.
aws_backup() {
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID:?}" \
    -e AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY:?}" \
    -e AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-us-east-1}" \
    -v "$(host_path "$BACKUP_DIR"):/backups" \
    "$AWS_CLI_IMAGE" --endpoint-url "${BACKUP_S3_ENDPOINT:?}" "$@"
}

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
