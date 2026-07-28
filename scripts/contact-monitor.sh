#!/usr/bin/env bash
# Synthetic uptime monitor for the contact backend (the path recruiters use to
# reach the site owner). Exercises the REAL POST /contact endpoint with two
# probes that are safe to run on a schedule — neither sends email nor consumes
# the per-IP rate-limit budget:
#
#   1. Honeypot-tripped POST  -> 202 {"status":"ok"}   (liveness; server drops
#      any submission whose _hp field is set, BEFORE the send path, so no mail)
#   2. Invalid POST (no name) -> 400                    (validation is live)
#
# Note: GET /healthz is intentionally NOT checked — at wealth.vikenparikh.com it
# is shadowed by another app and does not reach this backend. The /contact path
# is the one the contact form actually calls, so it's the meaningful signal.
#
# Usage:  scripts/contact-monitor.sh [base_url]
#         CONTACT_API_BASE=https://... scripts/contact-monitor.sh
# Exit 0 if all probes pass, 1 otherwise.

set -uo pipefail

BASE="${1:-${CONTACT_API_BASE:-https://wealth.vikenparikh.com}}"
BASE="${BASE%/}"
URL="$BASE/contact"
CURL_OPTS=(--silent --show-error --max-time 15 -H "Content-Type: application/json")
fail=0

# Probe helper: POST $2, expect HTTP $1. Retries transient failures a few times
# so a single network blip doesn't page. Prints a one-line PASS/FAIL.
probe() {
  local expect="$1" body="$2" label="$3"
  local code="" attempt
  for attempt in 1 2 3; do
    code="$(curl "${CURL_OPTS[@]}" -o /dev/null -w '%{http_code}' -X POST "$URL" -d "$body" 2>/dev/null)"
    [ "$code" = "$expect" ] && break
    sleep $((attempt * 2))
  done
  if [ "$code" = "$expect" ]; then
    echo "PASS  $label  (HTTP $code)"
  else
    echo "FAIL  $label  (expected HTTP $expect, got ${code:-no-response})"
    fail=1
  fi
}

echo "contact-monitor: probing $URL"
probe 202 '{"_hp":"synthetic-monitor"}' "honeypot liveness"
probe 400 '{"name":""}'                 "validation active"

if [ "$fail" -eq 0 ]; then
  echo "contact-monitor: OK"
else
  echo "contact-monitor: FAILING — the contact form may be down; check the backend container." >&2
fi
exit "$fail"
