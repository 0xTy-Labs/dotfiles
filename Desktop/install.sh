#!/usr/bin/env bash
# axdots — install.sh
# ─────────────────────────────────────────────────────────────────────────────
# One-liner installer for axdots Hyprland shell.
# Supports: Arch Linux (pacman/AUR), Fedora (dnf), Debian/Ubuntu (apt)
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/<user>/axdots/main/install.sh | bash
#   Or locally:
#   bash install.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

AXDOTS_DIR="${HOME}/.config/axdots"
REPO_URL="https://github.com/<user>/axdots"  # Update before publishing
BOLD="\e[1m"; RESET="\e[0m"; GREEN="\e[32m"; YELLOW="\e[33m"; RED="\e[31m"; CYAN="\e[36m"

log()  { echo -e "${GREEN}${BOLD}[axdots]${RESET} $*"; }
warn() { echo -e "${YELLOW}${BOLD}[warn]${RESET} $*"; }
err()  { echo -e "${RED}${BOLD}[error]${RESET} $*"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}▸ $*${RESET}"; }

# ── Detect distro ─────────────────────────────────────────────────────────────

detect_distro() {
  if [[ -f /etc/arch-release ]]; then
    echo "arch"
  elif [[ -f /etc/fedora-release ]]; then
    echo "fedora"
  elif [[ -f /etc/debian_version ]]; then
    echo "debian"
  else
    echo "unknown"
  fi
}

DISTRO=$(detect_distro)
log "Detected distro: $DISTRO"

# ── Dependency installer ──────────────────────────────────────────────────────

install_arch() {
  step "Installing Arch dependencies via pacman..."
  sudo pacman -S --needed --noconfirm \
    hyprland hyprlock hypridle hyprpicker hyprpaper \
    swww rofi-wayland dunst \
    wl-clipboard cliphist \
    brightnessctl playerctl \
    grimblast wf-recorder swappy \
    pipewire wireplumber \
    kitty \
    noto-fonts ttf-nerd-fonts-symbols \
    jq wget curl git nodejs npm \
    tesseract tesseract-data-eng \
    imagemagick

  # AUR packages
  if command -v yay &>/dev/null; then
    step "Installing AUR packages..."
    yay -S --needed --noconfirm \
      ags \
      matugen-bin \
      hyprpolkitagent \
      grimblast-git \
      rofimoji \
      ttf-zed-sans 2>/dev/null || warn "Some AUR packages may need manual install"
  elif command -v paru &>/dev/null; then
    paru -S --needed --noconfirm \
      ags matugen-bin hyprpolkitagent grimblast-git rofimoji ttf-zed-sans 2>/dev/null || true
  else
    warn "No AUR helper found. Install manually: ags, matugen-bin, hyprpolkitagent, ttf-zed-sans"
    warn "  yay: https://github.com/Jguer/yay"
  fi
}

install_fedora() {
  step "Installing Fedora dependencies..."
  sudo dnf install -y \
    hyprland swww rofi dunst \
    wl-clipboard brightnessctl playerctl \
    wf-recorder \
    pipewire wireplumber \
    kitty \
    google-noto-emoji-fonts \
    jq wget curl git nodejs npm \
    ImageMagick

  warn "Manual installs needed for Fedora:"
  warn "  - ags (AGS v2): https://github.com/aylur/ags"
  warn "  - matugen: https://github.com/InioX/matugen/releases"
  warn "  - hyprlock, hypridle, hyprpicker: hyprland extras"
  warn "  - grimblast: https://github.com/hyprwm/contrib"
  warn "  - cliphist: https://github.com/sentriz/cliphist"
}

install_debian() {
  step "Installing Debian/Ubuntu dependencies..."
  sudo apt-get install -y \
    swww rofi dunst \
    wl-clipboard brightnessctl playerctl \
    wf-recorder \
    pipewire wireplumber \
    kitty \
    fonts-noto-color-emoji \
    jq wget curl git nodejs npm \
    imagemagick

  warn "Manual installs needed for Debian/Ubuntu:"
  warn "  - ags (AGS v2): https://github.com/aylur/ags"
  warn "  - matugen: https://github.com/InioX/matugen/releases"
  warn "  - hyprland suite: https://hyprland.org/getting-started/installation"
}

case "$DISTRO" in
  arch)    install_arch ;;
  fedora)  install_fedora ;;
  debian)  install_debian ;;
  *)       warn "Unknown distro. Install dependencies manually." ;;
esac

# ── Clone or update repo ──────────────────────────────────────────────────────

step "Setting up axdots config..."

if [[ -d "$AXDOTS_DIR/.git" ]]; then
  log "Existing installation found — updating..."
  git -C "$AXDOTS_DIR" pull --rebase
else
  if [[ -d "$AXDOTS_DIR" ]]; then
    warn "~/.config/axdots exists but isn't a git repo — backing up..."
    mv "$AXDOTS_DIR" "${AXDOTS_DIR}.bak.$(date +%s)"
  fi
  log "Cloning axdots..."
  git clone "$REPO_URL" "$AXDOTS_DIR"
fi

# ── Make scripts executable ───────────────────────────────────────────────────

chmod +x "${AXDOTS_DIR}/scripts/"*.sh

# ── Build AGS (TypeScript bundle) ─────────────────────────────────────────────

step "Building AGS TypeScript bundle..."
cd "$AXDOTS_DIR"

if command -v ags &>/dev/null; then
  ags bundle shell.ts axdots.js 2>/dev/null || warn "AGS bundle failed — try: cd ~/.config/axdots && ags bundle shell.ts axdots.js"
else
  warn "AGS not found in PATH — skipping bundle. Install from: https://github.com/aylur/ags"
fi

# ── Symlink configs ───────────────────────────────────────────────────────────

step "Symlinking configs..."

# Hyprlock
mkdir -p "${HOME}/.config/hypr"
if [[ ! -f "${HOME}/.config/hypr/hyprlock.conf" ]]; then
  ln -sf "${AXDOTS_DIR}/config/hyprlock.conf" "${HOME}/.config/hypr/hyprlock.conf"
  log "Linked hyprlock.conf"
else
  warn "~/.config/hypr/hyprlock.conf exists — skipping (link manually if needed)"
fi

# Hypridle
if [[ ! -f "${HOME}/.config/hypr/hypridle.conf" ]]; then
  ln -sf "${AXDOTS_DIR}/config/hypridle.conf" "${HOME}/.config/hypr/hypridle.conf"
  log "Linked hypridle.conf"
fi

# Dunst
mkdir -p "${HOME}/.config/dunst"
if [[ ! -f "${HOME}/.config/dunst/dunstrc" ]]; then
  ln -sf "${AXDOTS_DIR}/config/dunst.conf" "${HOME}/.config/dunst/dunstrc"
  log "Linked dunstrc"
fi

# ── Initial theme generation ──────────────────────────────────────────────────

step "Running initial theme generation..."

# Find a default wallpaper to bootstrap
DEFAULT_WALL=""
for candidate in \
  "${HOME}/Pictures/wallpaper.jpg" \
  "${HOME}/Pictures/wallpaper.png" \
  /usr/share/backgrounds/gnome/*.jpg \
  /usr/share/pixmaps/backgrounds/*.jpg; do
  if [[ -f "$candidate" ]]; then
    DEFAULT_WALL="$candidate"
    break
  fi
done

if [[ -n "$DEFAULT_WALL" ]] && command -v matugen &>/dev/null; then
  bash "${AXDOTS_DIR}/scripts/theme.sh" "$DEFAULT_WALL" || warn "Theme generation failed — run manually: ~/.config/axdots/scripts/theme.sh <wallpaper>"
else
  warn "Skipping theme generation (no wallpaper or matugen not installed)"
  warn "Run later: ~/.config/axdots/scripts/theme.sh ~/Pictures/wallpaper.jpg"
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}${BOLD}  axdots installed successfully! ✦${RESET}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  ${CYAN}1.${RESET} Add to your ${BOLD}~/.config/hypr/hyprland.conf${RESET}:"
echo -e "     ${YELLOW}source = ~/.config/axdots/config/hyprland.conf${RESET}"
echo ""
echo -e "  ${CYAN}2.${RESET} Set your wallpaper:"
echo -e "     ${YELLOW}~/.config/axdots/scripts/wallpaper.sh ~/Pictures/mywallpaper.jpg${RESET}"
echo ""
echo -e "  ${CYAN}3.${RESET} Edit config:"
echo -e "     ${YELLOW}${AXDOTS_DIR}/config/axdots.json${RESET}"
echo ""
echo -e "  ${CYAN}4.${RESET} Reload Hyprland or log out and back in."
echo ""
