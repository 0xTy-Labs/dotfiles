/**
 * modules/bar/WindowTitle.ts
 * Shows the title of the currently focused window.
 * Truncates long titles to prevent bar overflow.
 */

import { Gtk } from "astal/gtk4"
import { bind } from "astal"
import { activeWindowTitle, activeWindowClass } from "../../services/Hyprland"

const MAX_TITLE_LEN = 48

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s
}

// Map window classes to Tabler icon characters
// Using Tabler Icons font — icon characters by name
const CLASS_ICONS: Record<string, string> = {
  "firefox":          "󰈹",
  "chromium":         "󰊯",
  "google-chrome":    "󰊯",
  "kitty":            "󰆍",
  "alacritty":        "󰆍",
  "foot":             "󰆍",
  "code":             "󰨞",
  "code-oss":         "󰨞",
  "nvim":             "󰈸",
  "neovim":           "󰈸",
  "nautilus":         "󰉋",
  "thunar":           "󰉋",
  "discord":          "󰙯",
  "telegram":         "󰟩",
  "spotify":          "󰓇",
  "mpv":              "󰎆",
  "vlc":              "󰕼",
  "gimp":             "󰃣",
  "inkscape":         "󰱽",
  "obsidian":         "󰔫",
  "thunderbird":      "󰇮",
  "steam":            "󰓓",
  "lutris":           "󰺵",
}

function getIcon(cls: string): string {
  const lower = cls.toLowerCase()
  for (const [key, icon] of Object.entries(CLASS_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return "󰣆" // default desktop icon
}

export default function WindowTitle() {
  return (
    <box
      className="window-title"
      spacing={6}
      valign={Gtk.Align.CENTER}
    >
      {/* App icon from class */}
      <label
        className="window-icon font-mono text-primary"
        label={bind(activeWindowClass).as(getIcon)}
        visible={bind(activeWindowTitle).as(t => t.length > 0)}
      />

      {/* Window title */}
      <label
        className="window-title-text text-sm"
        label={bind(activeWindowTitle).as(t =>
          t ? truncate(t, MAX_TITLE_LEN) : ""
        )}
        visible={bind(activeWindowTitle).as(t => t.length > 0)}
        ellipsize={3}  // PANGO_ELLIPSIZE_END
        maxWidthChars={MAX_TITLE_LEN}
      />
    </box>
  )
}
