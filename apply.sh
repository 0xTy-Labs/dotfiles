#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
LOCAL_SHARE="${XDG_DATA_HOME:-$HOME/.local/share}"
FONT_DIR="$LOCAL_SHARE/fonts"

SKIP_PACKAGES=0
SKIP_FONTS=0
SKIP_THEME_ASSETS=0
COPY_MODE=0

LINK_DIRS=(
  "hypr"
  "waybar"
  "rofi"
  "dunst"
  "kitty"
  "foot"
  "gtk-3.0"
  "gtk-4.0"
)

log() {
  printf '[install] %s\n' "$*"
}

warn() {
  printf '[install][warn] %s\n' "$*"
}

usage() {
  cat <<USAGE
Usage: ./apply.sh [options]

Options:
  --skip-packages      Skip system package installation
  --skip-fonts         Skip Google font download/install
  --skip-theme-assets  Skip icon/cursor/theme package install
  --copy               Copy configs instead of symlinking
  -h, --help           Show this help
USAGE
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --skip-packages) SKIP_PACKAGES=1 ;;
      --skip-fonts) SKIP_FONTS=1 ;;
      --skip-theme-assets) SKIP_THEME_ASSETS=1 ;;
      --copy) COPY_MODE=1 ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        warn "unknown option: $1"
        usage
        exit 1
        ;;
    esac
    shift
  done
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

detect_pkg_manager() {
  if need_cmd pacman; then
    echo "pacman"
  elif need_cmd apt-get; then
    echo "apt"
  elif need_cmd dnf; then
    echo "dnf"
  elif need_cmd zypper; then
    echo "zypper"
  else
    echo "none"
  fi
}

install_pkg_pacman() {
  local pkg
  for pkg in "$@"; do
    if pacman -Qi "$pkg" >/dev/null 2>&1; then
      log "pkg ok: $pkg"
      continue
    fi
    sudo pacman -S --noconfirm --needed "$pkg" || warn "failed pacman pkg: $pkg"
  done
}

install_pkg_apt() {
  local pkg
  for pkg in "$@"; do
    dpkg -s "$pkg" >/dev/null 2>&1 && { log "pkg ok: $pkg"; continue; }
    sudo apt-get install -y "$pkg" || warn "failed apt pkg: $pkg"
  done
}

install_pkg_dnf() {
  local pkg
  for pkg in "$@"; do
    rpm -q "$pkg" >/dev/null 2>&1 && { log "pkg ok: $pkg"; continue; }
    sudo dnf install -y "$pkg" || warn "failed dnf pkg: $pkg"
  done
}

install_pkg_zypper() {
  local pkg
  for pkg in "$@"; do
    rpm -q "$pkg" >/dev/null 2>&1 && { log "pkg ok: $pkg"; continue; }
    sudo zypper --non-interactive install "$pkg" || warn "failed zypper pkg: $pkg"
  done
}

install_base_packages() {
  (( SKIP_PACKAGES == 1 )) && {
    log "skip packages"
    return
  }

  local pm
  pm="$(detect_pkg_manager)"
  log "package manager: $pm"

  case "$pm" in
    pacman)
      sudo pacman -Sy --noconfirm || true
      install_pkg_pacman \
        hyprland hyprpaper hyprlock waybar rofi-wayland dunst kitty foot \
        wl-clipboard grim slurp brightnessctl playerctl networkmanager \
        pavucontrol papirus-icon-theme bibata-cursor-theme \
        ttf-jetbrains-mono-nerd ttf-font-awesome ttf-dejavu
      ;;
    apt)
      sudo apt-get update -y
      install_pkg_apt \
        hyprland waybar rofi dunst kitty foot \
        wl-clipboard grim slurp brightnessctl playerctl network-manager \
        pavucontrol papirus-icon-theme bibata-cursor-theme \
        fonts-jetbrains-mono fonts-font-awesome
      ;;
    dnf)
      install_pkg_dnf \
        hyprland waybar rofi dunst kitty foot \
        wl-clipboard grim slurp brightnessctl playerctl NetworkManager \
        pavucontrol papirus-icon-theme bibata-cursor-theme \
        jetbrains-mono-fonts-all fontawesome-fonts
      ;;
    zypper)
      install_pkg_zypper \
        hyprland waybar rofi dunst kitty foot \
        wl-clipboard grim slurp brightnessctl playerctl NetworkManager \
        pavucontrol papirus-icon-theme bibata-cursor-theme
      ;;
    *)
      warn "no supported package manager found; install dependencies manually"
      ;;
  esac
}

install_google_font_family() {
  local family="$1"
  local encoded
  encoded="${family// /+}"
  local tmp_zip
  tmp_zip="$(mktemp --suffix=.zip)"

  mkdir -p "$FONT_DIR"

  if ! need_cmd curl || ! need_cmd unzip; then
    warn "curl/unzip missing; cannot install $family"
    rm -f "$tmp_zip"
    return
  fi

  if curl -fsSL "https://fonts.google.com/download?family=${encoded}" -o "$tmp_zip"; then
    unzip -o "$tmp_zip" '*.ttf' -d "$FONT_DIR" >/dev/null 2>&1 || warn "no ttf extracted for $family"
    log "font installed: $family"
  else
    warn "failed to download font family: $family"
  fi

  rm -f "$tmp_zip"
}

install_fonts() {
  (( SKIP_FONTS == 1 )) && {
    log "skip fonts"
    return
  }

  install_google_font_family "Syne"
  install_google_font_family "DM Sans"

  if need_cmd fc-cache; then
    fc-cache -f "$FONT_DIR" >/dev/null 2>&1 || true
    log "font cache refreshed"
  fi
}

install_theme_assets() {
  (( SKIP_THEME_ASSETS == 1 )) && {
    log "skip theme assets"
    return
  }

  local pm
  pm="$(detect_pkg_manager)"

  case "$pm" in
    pacman)
      install_pkg_pacman adw-gtk-theme papirus-icon-theme bibata-cursor-theme
      ;;
    apt)
      install_pkg_apt papirus-icon-theme bibata-cursor-theme
      ;;
    dnf)
      install_pkg_dnf papirus-icon-theme bibata-cursor-theme
      ;;
    zypper)
      install_pkg_zypper papirus-icon-theme bibata-cursor-theme
      ;;
    *)
      warn "theme assets skipped: unsupported package manager"
      ;;
  esac

  if need_cmd papirus-folders; then
    papirus-folders -C orange >/dev/null 2>&1 || warn "papirus-folders color tweak failed"
  fi
}

backup_path_if_needed() {
  local dst="$1"
  if [[ -L "$dst" ]]; then
    rm -f "$dst"
  elif [[ -e "$dst" ]]; then
    local backup="$dst.bak.$(date +%Y%m%d%H%M%S)"
    mv "$dst" "$backup"
    log "backup: $dst -> $backup"
  fi
}

deploy_dir() {
  local name="$1"
  local src="$REPO_DIR/$name"
  local dst="$CONFIG_HOME/$name"

  [[ -e "$src" ]] || {
    warn "missing source: $src"
    return
  }

  mkdir -p "$CONFIG_HOME"
  backup_path_if_needed "$dst"

  if (( COPY_MODE == 1 )); then
    cp -a "$src" "$dst"
    log "copied: $src -> $dst"
  else
    ln -s "$src" "$dst"
    log "linked: $dst -> $src"
  fi
}

reload_hyprland() {
  if pgrep -x Hyprland >/dev/null 2>&1 && need_cmd hyprctl; then
    hyprctl reload >/dev/null || warn "hyprctl reload failed"
    log "hyprland: reloaded"
  else
    log "hyprland: not running or hyprctl missing"
  fi
}

restart_waybar() {
  if pgrep -x waybar >/dev/null 2>&1; then
    pkill -x waybar || true
    nohup waybar >/tmp/waybar.log 2>&1 &
    log "waybar: restarted"
  else
    log "waybar: not running"
  fi
}

restart_dunst() {
  if pgrep -x dunst >/dev/null 2>&1; then
    pkill -x dunst || true
    nohup dunst >/tmp/dunst.log 2>&1 &
    log "dunst: restarted"
  else
    log "dunst: not running"
  fi
}

enable_network_manager() {
  if need_cmd systemctl; then
    sudo systemctl enable --now NetworkManager >/dev/null 2>&1 || true
  fi
}

main() {
  parse_args "$@"

  log "repo: $REPO_DIR"
  log "config target: $CONFIG_HOME"

  install_base_packages
  install_theme_assets
  install_fonts
  enable_network_manager

  for dir in "${LINK_DIRS[@]}"; do
    deploy_dir "$dir"
  done

  reload_hyprland
  restart_waybar
  restart_dunst

  log "installation complete"
}

main "$@"
