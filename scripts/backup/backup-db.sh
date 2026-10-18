#!/usr/bin/env bash
# Encrypted PostgreSQL backup: pg_dump → GPG (AES-256) → local file + SHA-256 → off-server bucket.
#
#   scripts/backup/backup-db.sh                                            # production server
#   ENV_FILE=.env COMPOSE_FILE=docker-compose.yml scripts/backup/backup-db.sh   # local dev stack
#
# Schedule daily on the server (docs/RUNBOOK.md → Backups). Local copies older than
# RETENTION_DAYS (default 30) are pruned; the bucket's lifecycle rule handles remote retention.

source "$(dirname "$0")/common.sh"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" 2>/dev/null || true

name="medhanealem-db-$(date -u +%Y%m%dT%H%M%SZ).dump.gpg"
file="$BACKUP_DIR/$name"

log "Dumping $POSTGRES_DB and encrypting to $file"
compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --compress=9 --no-owner \
  | gpg --batch --yes --pinentry-mode loopback --passphrase-fd 3 \
      --symmetric --cipher-algo AES256 --output "$file" 3<<<"$BACKUP_PASSPHRASE"

[[ -s "$file" ]] || { echo "Backup file is empty: $file" >&2; exit 1; }
(cd "$BACKUP_DIR" && sha256sum "$name" > "$name.sha256")
log "Wrote $(du -h "$file" | cut -f1) ($name)"

if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  log "Uploading to s3://$BACKUP_S3_BUCKET/db/"
  aws_backup s3 cp "/backups/$name" "s3://$BACKUP_S3_BUCKET/db/$name" --only-show-errors
  aws_backup s3 cp "/backups/$name.sha256" "s3://$BACKUP_S3_BUCKET/db/$name.sha256" --only-show-errors
  log "Uploaded."
else
  log "WARNING: BACKUP_S3_BUCKET not set; backup is NOT stored off-server."
fi

find "$BACKUP_DIR" -maxdepth 1 -name 'medhanealem-db-*.dump.gpg*' -mtime "+$RETENTION_DAYS" -print -delete \
  | sed 's/^/Pruned old local backup: /'
log "Backup complete: $name"
