#!/usr/bin/env bash
# Quick smoke checks after GitHub org migration or Vercel reconnect.
# Usage: ./scripts/post-migration-smoke.sh [CRON_SECRET]

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-https://meavo.app}"
HOLS_URL="${HOLS_URL:-https://hols.meavo.app}"
ASSEMBLY_URL="${ASSEMBLY_URL:-https://assembly.meavo.app}"
CRON_SECRET="${1:-${CRON_SECRET:-}}"

pass=0
fail=0

check() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" "$url" || echo "000")"
  if [[ "$code" == "$expected" ]]; then
    echo "OK  $name ($code) $url"
    pass=$((pass + 1))
  else
    echo "FAIL $name (expected $expected, got $code) $url"
    fail=$((fail + 1))
  fi
}

echo "=== App availability ==="
check "gateway home" "$GATEWAY_URL/login"
check "hols home" "$HOLS_URL/login"
check "assembly home" "$ASSEMBLY_URL/login"

echo ""
echo "=== Health endpoints ==="
check "gateway health" "$GATEWAY_URL/api/health"
check "hols health" "$HOLS_URL/api/health"

echo ""
echo "=== Git remotes (local) ==="
for label in gateway hols assembly; do
  case "$label" in
    gateway) dir="${GATEWAY_DIR:-$(cd "$(dirname "$0")/.." && pwd)}" ;;
    hols) dir="${HOLS_DIR:-$HOME/Documents/Vacation Tracker}" ;;
    assembly) dir="${ASSEMBLY_DIR:-$(cd "$(dirname "$0")/../.." && pwd)/meavo-assembly}" ;;
  esac
  if [[ -d "$dir/.git" ]]; then
    remote="$(git -C "$dir" remote get-url origin 2>/dev/null || echo missing)"
    if [[ "$remote" == *"meavo-booths"* ]]; then
      echo "OK  $label remote -> $remote"
      pass=$((pass + 1))
    else
      echo "WARN $label remote still old or missing -> $remote"
      fail=$((fail + 1))
    fi
  else
    echo "SKIP $label (no repo at $dir)"
  fi
done

if [[ -n "$CRON_SECRET" ]]; then
  echo ""
  echo "=== Gateway notification cron ==="
  cron_code="$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $CRON_SECRET" \
    "$GATEWAY_URL/api/cron/process-notifications" || echo "000")"
  if [[ "$cron_code" == "200" ]]; then
    echo "OK  notification cron ($cron_code)"
    pass=$((pass + 1))
  else
    echo "FAIL notification cron (expected 200, got $cron_code)"
    fail=$((fail + 1))
  fi
else
  echo ""
  echo "SKIP notification cron (pass CRON_SECRET as arg or env)"
fi

echo ""
echo "=== Summary: $pass passed, $fail failed/warn ==="
[[ "$fail" -eq 0 ]]
