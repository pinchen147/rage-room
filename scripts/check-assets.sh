#!/usr/bin/env bash
# Deploy-size gate: no single file may reach the Cloudflare Pages 25 MiB cap.
set -euo pipefail
cd "$(dirname "$0")/.."

LIMIT=$((25 * 1024 * 1024))
fail=0
while IFS= read -r f; do
  size=$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f")
  if [ "$size" -ge "$LIMIT" ]; then
    echo "FAIL: $f is $((size / 1024 / 1024))MB (>= 25MiB Pages cap)"
    fail=1
  fi
done < <(find public dist -type f 2>/dev/null)

echo "Total public/assets: $(du -sh public/assets | cut -f1) ($(find public/assets -type f | wc -l | tr -d ' ') files)"
[ -d dist ] && echo "Total dist: $(du -sh dist | cut -f1)"
[ "$fail" -eq 0 ] && echo "OK: all files under 25MiB"
exit "$fail"
