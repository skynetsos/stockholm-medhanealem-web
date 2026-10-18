#!/usr/bin/env bash
# Restore an encrypted backup made by backup-db.sh.
#
#   scripts/backup/restore-db.sh <file.dump.gpg | s3://bucket/db/file.dump.gpg>
#
# SAFE BY DEFAULT: restores into a scratch database "<POSTGRES_DB>_restore_check", prints what came
# back, then drops it (KEEP_RESTORE_DB=1 keeps it). Use this for the quarterly restore drill.
#
# Restoring OVER THE LIVE DATABASE (disaster recovery) needs both:
#   TARGET_DB=<POSTGRES_DB> CONFIRM_LIVE_RESTORE=yes scripts/backup/restore-db.sh <backup>
# Stop the app first (docker compose -f docker-compose.prod.yml stop app) and start it afterwards.

source "$(dirname "$0")/common.sh"

src="${1:?Usage: restore-db.sh <file.dump.gpg | s3://bucket/db/file.dump.gpg>}"
target="${TARGET_DB:-${POSTGRES_DB}_restore_check}"
live=false
[[ "$target" == "$POSTGRES_DB" ]] && live=true

if $live && [[ "${CONFIRM_LIVE_RESTORE:-}" != "yes" ]]; then
  echo "Refusing to overwrite the live database '$target' without CONFIRM_LIVE_RESTORE=yes." >&2
  exit 1
fi
[[ "$target" =~ ^[a-z0-9_]+$ ]] || { echo "Invalid TARGET_DB '$target'." >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
if [[ "$src" == s3://* ]]; then
  name="$(basename "$src")"
  log "Downloading $src"
  aws_backup s3 cp "$src" "/backups/$name" --only-show-errors
  aws_backup s3 cp "$src.sha256" "/backups/$name.sha256" --only-show-errors || true
  file="$BACKUP_DIR/$name"
else
  file="$src"
fi
[[ -s "$file" ]] || { echo "Backup file not found or empty: $file" >&2; exit 1; }

if [[ -f "$file.sha256" ]]; then
  (cd "$(dirname "$file")" && sha256sum --check --quiet "$(basename "$file").sha256")
  log "Checksum OK"
else
  log "No .sha256 next to the backup; skipping checksum check."
fi

if $live; then
  log "Restoring OVER the live database '$target'"
  restore_flags=(--clean --if-exists)
else
  log "Restoring into scratch database '$target'"
  psql_admin -q -c "DROP DATABASE IF EXISTS \"$target\" WITH (FORCE)" -c "CREATE DATABASE \"$target\""
  restore_flags=()
fi

gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt "$file" 3<<<"$BACKUP_PASSPHRASE" \
  | compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$target" --no-owner --exit-on-error "${restore_flags[@]}"

log "Restored. Contents of '$target':"
compose exec -T postgres psql -U "$POSTGRES_USER" -d "$target" -At -F ' | ' -c "
  select 'tables', count(*)::text from information_schema.tables where table_schema = 'public'
  union all select 'users', count(*)::text from users
  union all select 'migrations applied', count(*)::text from payload_migrations
  union all select 'site name (am)', coalesce((select church_name from site_settings_locales where _locale = 'am' limit 1), '(empty)')"

if ! $live && [[ "${KEEP_RESTORE_DB:-0}" != "1" ]]; then
  psql_admin -q -c "DROP DATABASE \"$target\" WITH (FORCE)"
  log "Dropped scratch database '$target' (set KEEP_RESTORE_DB=1 to keep it)."
fi
log "Restore complete."
