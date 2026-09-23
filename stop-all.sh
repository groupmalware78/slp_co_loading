#!/usr/bin/env bash
# Stops everything run-all.sh starts: Service-Provider (admin), the three
# customer-portal instances, api, warehouse, and the mobile app's
# `flutter run` session. Only touches processes actually bound to these
# ports / matching the flutter run command — never a blind `kill` by name.

set -uo pipefail

PORTS=(3000 3001 3002 3003 3010 3020)

is_next_process() {
  ps -p "$1" -o command= 2>/dev/null | grep -qE "next-server|next dev"
}

for port in "${PORTS[@]}"; do
  pids=$(lsof -ti:"$port" -sTCP:LISTEN 2>/dev/null)
  killed_any=false
  for pid in $pids; do
    if is_next_process "$pid"; then
      # Kill this process and its parent wrapper (`node .../next dev -p
      # PORT`), since `lsof` sometimes reports only the next-server child.
      ppid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
      kill "$pid" 2>/dev/null
      if [ -n "$ppid" ] && is_next_process "$ppid"; then
        kill "$ppid" 2>/dev/null
      fi
      killed_any=true
    fi
  done
  if [ "$killed_any" = true ]; then
    echo "  [stop]  port $port"
  else
    echo "  [skip]  port $port — nothing running"
  fi
done

mobile_pid=$(pgrep -f "flutter_tools.snapshot run" 2>/dev/null | head -1)
if [ -n "$mobile_pid" ]; then
  kill "$mobile_pid" 2>/dev/null
  echo "  [stop]  mobile app (flutter run)"
else
  echo "  [skip]  mobile app — not running"
fi

echo
echo "Done. (The mobile app's flutter debug session is stopped; the app itself may still be installed and open on the simulator/device.)"
