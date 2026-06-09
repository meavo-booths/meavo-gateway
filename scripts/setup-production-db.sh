#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Strip surrounding quotes and whitespace from an env value.
strip_quotes() {
  local v="${1:-}"
  v="${v#"${v%%[![:space:]]*}"}"
  v="${v%"${v##*[![:space:]]}"}"
  v="${v#\"}"
  v="${v%\"}"
  v="${v#\'}"
  v="${v%\'}"
  printf '%s' "$v"
}

# True when value is missing or an empty quoted string (length-2 check: "").
is_empty_env() {
  local v
  v="$(strip_quotes "${1:-}")"
  [[ -z "$v" ]]
}

# Return first non-empty Postgres URL from named vars in the current shell.
pick_database_url() {
  local name value
  for name in \
    DATABASE_URL \
    POSTGRES_PRISMA_URL \
    POSTGRES_URL \
    DATABASE_URL_UNPOOLED \
    POSTGRES_URL_NON_POOLING; do
    value="$(strip_quotes "${!name:-}")"
    if [[ -n "$value" ]]; then
      printf '%s' "$value"
      return 0
    fi
  done
  return 1
}

ensure_vercel_link() {
  if [[ -f .vercel/project.json ]]; then
    return 0
  fi

  if [[ -f .vercel/repo.json ]]; then
    local project_id org_id
    project_id="$(node -e "const j=require('./.vercel/repo.json'); console.log(j.projects?.[0]?.id||'')")"
    org_id="$(node -e "const j=require('./.vercel/repo.json'); console.log(j.projects?.[0]?.orgId||'')")"
    if [[ -n "$project_id" && -n "$org_id" ]]; then
      printf '{"projectId":"%s","orgId":"%s"}\n' "$project_id" "$org_id" > .vercel/project.json
      echo "==> Created .vercel/project.json from repo.json"
      return 0
    fi
  fi

  echo "Project is not linked to Vercel."
  echo "Run:"
  echo "  vercel link --yes --project meavo-gateway"
  return 1
}

pull_vercel_env() {
  local env_file="$1"
  if ! command -v vercel >/dev/null 2>&1; then
    echo "Vercel CLI not found — skip pull or install: npm i -g vercel"
    return 1
  fi

  ensure_vercel_link || return 1
  echo "==> Pulling production env into $env_file"
  vercel env pull "$env_file" --environment=production --yes
}

load_env_files() {
  local file
  for file in "$@"; do
    [[ -f "$file" ]] || continue
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  done
}

ENV_FILE=".env.production.local"

if [[ ! -f "$ENV_FILE" ]]; then
  pull_vercel_env "$ENV_FILE" || true
fi

if [[ -f "$ENV_FILE" ]]; then
  load_env_files "$ENV_FILE"
fi

# Local overrides (manual Neon paste often lands here).
if [[ -f .env.local ]]; then
  load_env_files .env.local
fi

DATABASE_URL="$(pick_database_url || true)"

if is_empty_env "$DATABASE_URL"; then
  echo "==> No usable Postgres URL in env files; re-pulling from Vercel"
  pull_vercel_env "$ENV_FILE" || true
  load_env_files "$ENV_FILE"
  if [[ -f .env.local ]]; then
    load_env_files .env.local
  fi
  DATABASE_URL="$(pick_database_url || true)"
fi

if is_empty_env "$DATABASE_URL"; then
  echo "ERROR: Postgres connection URL is missing or empty."
  echo ""
  if [[ -f .env.local ]] && ! grep -q '^DATABASE_URL=' .env.local 2>/dev/null; then
    echo "You have .env.local but it has no DATABASE_URL line on disk."
    echo "If you edited it in Cursor, save the file first: Cmd+S, then re-run npm run db:setup"
    echo ""
  fi
  echo "Root cause: Vercel has Neon variable NAMES but empty VALUES (DATABASE_URL=\"\")."
  echo "The integration is linked, but credentials were never injected."
  echo ""
  echo "Fix on Vercel (recommended):"
  echo "  1. vercel.com → meavo-gateway → Storage → Neon (meavo-gateway)"
  echo "  2. Open in Neon Console → Connection details"
  echo "  3. Copy the *pooled* connection string (postgresql://...)"
  echo "  4. Vercel → Settings → Environment Variables → DATABASE_URL"
  echo "     Paste for Production and Preview, then Save"
  echo "  5. Re-run: vercel env pull $ENV_FILE --environment=production --yes"
  echo "  6. Re-run: npm run db:setup"
  echo ""
  echo "Or fix locally only (for db:push / db:seed on this machine):"
  echo "  Add to .env.local:"
  echo '    DATABASE_URL="postgresql://..."'
  echo "  Then re-run: npm run db:setup"
  echo ""
  echo "Optional: reconnect the Neon resource in Vercel Storage if vars stay empty after paste."
  exit 1
fi

if [[ "$DATABASE_URL" != postgresql://* && "$DATABASE_URL" != postgres://* ]]; then
  echo "ERROR: DATABASE_URL must start with postgresql:// or postgres://"
  echo "Got a ${#DATABASE_URL}-character value that does not look like a Postgres URL."
  echo "If you see ~55 characters, that is the .env.example placeholder — replace it."
  exit 1
fi

# Prisma reads .env by default — sync the working URL there.
if [[ -f .env ]]; then
  grep -v '^DATABASE_URL=' .env > .env.tmp
else
  : > .env.tmp
fi
printf 'DATABASE_URL="%s"\n' "$DATABASE_URL" >> .env.tmp
mv .env.tmp .env

echo "==> Using Postgres URL from Vercel/local env (${#DATABASE_URL} chars)"
echo "==> Creating tables (db:push)"
npm run db:push

echo "==> Seeding admin and Vacation Tracker card (db:seed)"
npm run db:seed

echo ""
echo "Done. Sign in at https://meavo.app/login"
