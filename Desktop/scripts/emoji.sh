#!/usr/bin/env bash
# axdots — scripts/emoji.sh
# Emoji picker using rofi -modi emoji
# Requires: rofi-emoji plugin OR rofimoji
#
# Falls back to rofimoji if rofi-emoji plugin unavailable.

set -euo pipefail

AXDOTS="${HOME}/.config/axdots"

if command -v rofimoji &>/dev/null; then
  rofimoji \
    --action copy \
    --rofi-args "-theme ${AXDOTS}/modules/launcher/launcher.rasi" \
    --skin-tone neutral
elif rofi -modi "emoji:~/.local/share/rofi/emoji" -dump-config &>/dev/null 2>&1; then
  rofi -modi "emoji" -show emoji \
       -theme "${AXDOTS}/modules/launcher/launcher.rasi"
else
  notify-send "axdots" "Emoji picker: install rofimoji\n  pip install rofimoji" --urgency low
fi
