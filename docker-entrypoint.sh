#!/bin/sh
# Container start-up: create/update tables, create the super admin if configured, start the app.
set -e
mkdir -p /data/storage
# Refuses schema changes that would delete data, so a risky change stops here instead of losing records.
./node_modules/.bin/prisma db push --skip-generate
if [ -n "$SEED_SUPERADMIN_EMAIL" ] && [ -n "$SEED_SUPERADMIN_PASSWORD" ]; then
  # Production seed: one super admin + store categories + clinic settings. Idempotent, no demo data.
  SEED_MODE=production ./node_modules/.bin/tsx prisma/seed.ts
fi
exec ./node_modules/.bin/next start -p 3000 -H 0.0.0.0
