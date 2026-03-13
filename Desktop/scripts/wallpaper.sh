#!/usr/bin/env bash
# axdots — scripts/wallpaper.sh
# Set wallpaper via SWWW and trigger theme pipeline.
#
# Usage:
#   wallpaper.sh <path>                     # set specific wallpaper
#   wallpaper.sh --random [dir]             # pick random from dir
#   wallpaper.sh --restore                  # restore last wallpaper
#   wallpaper.sh --pick                     # open rofi file picker

set -euo pipefail

AXDOTS="${HOME}/.config/axdots"
CACHE="${HOME}/.cache/axdots"
WALL_CACHE="${CACHE}/last_wallpaper"
DEFAULT_DIR="${HOME}/Pictures/wallpapers"

# Ensure swww daemon is running
if ! swww query &>/dev/null; then
  swww-daemon --no-cache &
  sleep 0.5
fi

apply_wall() {
  local wall="$1"
  local transition="${2:-wipe}"

  if [[ ! -f "$wall" ]]; then
    echo "[wallpaper] File not found: $wall"
    exit 1
  fi

  echo "[wallpaper] Setting: $wall (transition: $transition)"

  swww img "$wall" \
    --transition-type "$transition" \
    --transition-duration 1.5 \
    --transition-fps 60 \
    --transition-angle 30

  # Save last wallpaper path
  mkdir -p "$CACHE"
  echo "$wall" > "$WALL_CACHE"

  # Update config
  if command -v jq &>/dev/null; then
    local cfg="${AXDOTS}/config/axdots.json"
    local tmp=$(mktemp)
    jq --arg w "$wall" '.theme.wallpaper = $w' "$cfg" > "$tmp" && mv "$tmp" "$cfg"
  fi

  # Trigger theme pipeline
  bash "${AXDOTS}/scripts/theme.sh" "$wall"
}

case "${1:-}" in
  --random)
    dir="${2:-$DEFAULT_DIR}"
    wall=$(find "$dir" -maxdepth 2 -type f \
      \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" \) \
      2>/dev/null | shuf -n1)
    [[ -z "$wall" ]] && { echo "[wallpaper] No images in $dir"; exit 1; }
    apply_wall "$wall" "random"
    ;;

  --restore)
    if [[ -f "$WALL_CACHE" ]]; then
      wall=$(cat "$WALL_CACHE")
      apply_wall "$wall" "fade"
    else
      echo "[wallpaper] No cached wallpaper"
      exit 1
    fi
    ;;

  --pick)
    wall=$(find "${DEFAULT_DIR}" /usr/share/backgrounds -maxdepth 3 -type f \
      \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" \) \
      2>/dev/null | sort | \
      rofi -dmenu -p "Wallpaper" \
           -theme "${AXDOTS}/modules/launcher/launcher.rasi" \
           -theme-str 'window { width: 600px; }' \
           -theme-str 'listview { lines: 12; }' || true)
    [[ -z "$wall" ]] && exit 0
    apply_wall "$wall" "wipe"
    ;;

  "")
    # No args: restore or do nothing
    if [[ -f "$WALL_CACHE" ]]; then
      apply_wall "$(cat "$WALL_CACHE")" "fade"
    fi
    ;;

  *)
    apply_wall "$1" "${2:-wipe}"
    ;;
esac
