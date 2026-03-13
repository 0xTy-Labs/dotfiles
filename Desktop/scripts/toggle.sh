#!/usr/bin/env bash
# axdots — scripts/toggle.sh
# Sends toggle IPC commands to the running AGS instance.
# Used by Hyprland keybind blocks.
#
# Usage:
#   toggle.sh notch
#   toggle.sh notifications
#   toggle.sh launcher
#   toggle.sh powermenu
#   toggle.sh clipboard
#   toggle.sh emoji
#   toggle.sh wallpaper

TARGET="${1:-}"

[[ -z "$TARGET" ]] && {
  echo "Usage: toggle.sh <target>"
  exit 1
}

ags request "toggle ${TARGET}" --instance axdots 2>/dev/null || {
  echo "[toggle] AGS not responding for target: ${TARGET}"
}
