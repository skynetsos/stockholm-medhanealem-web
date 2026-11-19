#!/usr/bin/env sh
# Loads the committee-review content into a STAGING database (docs/RUNBOOK.md → Staging):
# base data, the old site's pages and photos, the church's written content (Amharic + English draft),
# the coming church year's feasts — and publishes them with the placeholder approval
# "NOT APPROVED – development review". Every step is idempotent: re-run it after a content update.
#
#   scripts/staging/load-review-content.sh [.env.staging]
#
# Refused in production: the publish steps check SITE_ENV themselves; this script stops earlier.
set -eu
ENV_FILE="${1:-.env.staging}"
[ -f "$ENV_FILE" ] || { echo "No $ENV_FILE (copy .env.staging.example)" >&2; exit 1; }
if grep -q '^SITE_ENV=production' "$ENV_FILE"; then
  echo "SITE_ENV=production in $ENV_FILE: review content is never published in production." >&2
  exit 1
fi

run() {
  echo "── pnpm $1"
  docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" run --rm tools "$1"
}

run seed:base
run import:wordpress
run import:wordpress:publish
run content:import
run content:publish
run events:church-year
echo "Review content loaded. Recreate the app so its page cache starts fresh:"
echo "  docker compose -f docker-compose.prod.yml --env-file $ENV_FILE up -d --force-recreate app"
