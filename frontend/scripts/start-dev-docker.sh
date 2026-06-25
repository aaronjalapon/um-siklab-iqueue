#!/bin/sh
set -eu

if command -v pgrep >/dev/null 2>&1; then
	for pid in $(pgrep -f "next dev" || true); do
		if [ "$pid" != "$$" ]; then
			kill "$pid" 2>/dev/null || true
		fi
	done
elif command -v ps >/dev/null 2>&1; then
	ps | awk '/next dev/ && !/awk/ {print $1}' | while read -r pid; do
		if [ "$pid" != "$$" ]; then
			kill "$pid" 2>/dev/null || true
		fi
	done
fi

rm -rf .next-docker/dev
exec next dev --webpack -H 0.0.0.0
