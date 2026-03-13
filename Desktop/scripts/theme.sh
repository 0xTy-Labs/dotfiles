#!/usr/bin/env bash
# axdots — scripts/theme.sh
# Runs the full theme pipeline:
#   1. Matugen → palette JSON
#   2. AGS IPC → hot-reload CSS
#   3. Write rofi-colors.rasi for Rofi theming
#   4. Optionally regenerate GTK3/4 theme via nwg-look or gsettings
#
# Usage:
#   theme.sh [wallpaper_path]
#   theme.sh         ← uses wallpaper from config

set -euo pipefail

AXDOTS="${HOME}/.config/axdots"
CACHE="${HOME}/.cache/axdots"
WALL="${1:-$(jq -r '.theme.wallpaper // empty' "${AXDOTS}/config/axdots.json" 2>/dev/null || echo '')}"
SCHEME=$(jq -r '.theme.matugenScheme // "tonal-spot"' "${AXDOTS}/config/axdots.json" 2>/dev/null || echo "tonal-spot")

if [[ -z "$WALL" || ! -f "$WALL" ]]; then
  echo "[theme] No wallpaper found at: $WALL"
  exit 1
fi

mkdir -p "$CACHE"

echo "[theme] Running matugen on: $WALL"

# ── 1. Run matugen ────────────────────────────────────────────────────────────
matugen image "$WALL" \
  --type "$SCHEME" \
  --format json \
  --json hex \
  -o "${CACHE}/palette.json"

echo "[theme] Palette written to ${CACHE}/palette.json"

# ── 2. Generate Rofi color variables ──────────────────────────────────────────
node "${AXDOTS}/scripts/gen-rofi-colors.js" "${CACHE}/palette.json" "${CACHE}/rofi-colors.rasi"
echo "[theme] Rofi colors written"

# ── 3. Hot-reload CSS in running AGS ──────────────────────────────────────────
if ags -l 2>/dev/null | grep -q "axdots"; then
  ags request "reload css" --instance axdots 2>/dev/null && \
    echo "[theme] AGS CSS reloaded" || \
    echo "[theme] AGS reload failed (not running?)"
fi

# ── 4. Optionally update GTK theme colors ─────────────────────────────────────
if command -v gsettings &>/dev/null; then
  # Keep dark scheme preference
  gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark' 2>/dev/null || true
fi

echo "[theme] Done ✦"
