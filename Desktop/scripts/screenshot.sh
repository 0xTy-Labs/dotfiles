#!/usr/bin/env bash
# axdots — scripts/screenshot.sh
# Grimblast wrapper with save + copy + edit flow.
#
# Usage:
#   screenshot.sh region      # select region (default)
#   screenshot.sh window      # focused window
#   screenshot.sh full        # full screen
#   screenshot.sh freeze      # region from frozen screen

set -euo pipefail

SAVE_DIR="${XDG_PICTURES_DIR:-$HOME/Pictures}/Screenshots"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="screenshot_${TIMESTAMP}.png"
SAVE_PATH="${SAVE_DIR}/${FILENAME}"

mkdir -p "$SAVE_DIR"

MODE="${1:-region}"

case "$MODE" in
  region)
    grimblast --notify copysave area "$SAVE_PATH"
    ;;
  window)
    grimblast --notify copysave active "$SAVE_PATH"
    ;;
  full)
    grimblast --notify copysave screen "$SAVE_PATH"
    ;;
  freeze)
    grimblast --notify --freeze copysave area "$SAVE_PATH"
    ;;
  *)
    echo "Usage: screenshot.sh [region|window|full|freeze]"
    exit 1
    ;;
esac

# If swappy is installed, offer annotation
if command -v swappy &>/dev/null && [[ "$MODE" == "region" ]]; then
  notify-send "axdots" "Screenshot saved. Edit with swappy?" \
    --action="edit=Edit" \
    --expire-time=5000 &
  # Non-blocking — user can click the notification action
fi
