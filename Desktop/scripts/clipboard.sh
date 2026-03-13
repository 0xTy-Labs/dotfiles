#!/usr/bin/env bash
# axdots — scripts/clipboard.sh
# Opens cliphist via Rofi for clipboard history selection.
# Selected entry is copied to clipboard.

set -euo pipefail

AXDOTS="${HOME}/.config/axdots"

cliphist list | \
  rofi -dmenu \
       -p "Clipboard" \
       -theme "${AXDOTS}/modules/launcher/launcher.rasi" \
       -theme-str 'window { width: 680px; }' \
       -theme-str 'entry { placeholder: "Search clipboard…"; }' \
       -theme-str 'listview { lines: 10; }' \
  | cliphist decode | wl-copy
