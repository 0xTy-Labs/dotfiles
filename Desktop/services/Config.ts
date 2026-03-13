/**
 * services/Config.ts
 * Reads ~/.config/axdots/config/axdots.json
 * Hot-reloads on file change without shell restart.
 * All modules read config through this singleton.
 */

import { readFile, monitorFile } from "astal/file"
import { App } from "astal/gtk4"
import GLib from "gi://GLib"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AxDotsConfig {
  bar: {
    enabled: boolean
    height: number          // px, default 32
    margin: number          // gap from screen edge, default 8
    position: "top" | "bottom"
    modules: {
      left:   ModuleId[]
      center: ModuleId[]
      right:  ModuleId[]
    }
  }
  notch: {
    enabled: boolean
    showMedia: boolean
    showToggles: boolean
    expandOnHover: boolean
  }
  dock: {
    enabled: boolean
    iconSize: number        // default 48
    autoHide: boolean
    autoHideDelay: number   // ms, default 1500
    pinnedApps: string[]    // desktop file names
  }
  notifications: {
    enabled: boolean
    position: "top-right" | "top-left" | "bottom-right" | "bottom-left"
    maxToasts: number       // how many visible at once
    timeout: number         // ms, default 5000
  }
  corners: {
    enabled: boolean
    radius: number          // px, default 16
  }
  widgets: {
    calendar: boolean
    weather: boolean
    sysmonitor: boolean
  }
  theme: {
    matugenScheme: "tonal-spot" | "expressive" | "fidelity" | "content" | "monochrome"
    wallpaper: string       // path to current wallpaper
    blur: number            // Hyprland blur size, default 8
  }
  keybinds: {
    launcher:      string
    notch:         string
    notifications: string
    powerMenu:     string
    colorPicker:   string
    screenshot:    string
    screenRecord:  string
  }
}

type ModuleId =
  | "workspaces"
  | "windowTitle"
  | "notch"
  | "clock"
  | "tray"
  | "statusPills"
  | "power"
  | "media"

// ── Default Config ─────────────────────────────────────────────────────────────

const DEFAULTS: AxDotsConfig = {
  bar: {
    enabled: true,
    height: 32,
    margin: 8,
    position: "top",
    modules: {
      left:   ["workspaces", "windowTitle"],
      center: ["notch", "clock"],
      right:  ["tray", "statusPills", "power"],
    },
  },
  notch: {
    enabled: true,
    showMedia: true,
    showToggles: true,
    expandOnHover: false,
  },
  dock: {
    enabled: true,
    iconSize: 48,
    autoHide: true,
    autoHideDelay: 1500,
    pinnedApps: [
      "firefox.desktop",
      "org.gnome.Nautilus.desktop",
      "kitty.desktop",
      "code.desktop",
      "discord.desktop",
    ],
  },
  notifications: {
    enabled: true,
    position: "top-right",
    maxToasts: 4,
    timeout: 5000,
  },
  corners: {
    enabled: true,
    radius: 16,
  },
  widgets: {
    calendar: true,
    weather: true,
    sysmonitor: true,
  },
  theme: {
    matugenScheme: "tonal-spot",
    wallpaper: `${GLib.get_home_dir()}/Pictures/wallpaper.jpg`,
    blur: 8,
  },
  keybinds: {
    launcher:      "SUPER SPACE",
    notch:         "SUPER N",
    notifications: "SUPER SHIFT N",
    powerMenu:     "SUPER SHIFT P",
    colorPicker:   "SUPER SHIFT C",
    screenshot:    "SUPER SHIFT S",
    screenRecord:  "SUPER SHIFT R",
  },
}

// ── Singleton ──────────────────────────────────────────────────────────────────

let _config: AxDotsConfig = structuredClone(DEFAULTS)
const CONFIG_PATH = `${App.configDir}/config/axdots.json`

function parseConfig(raw: string): AxDotsConfig {
  try {
    const parsed = JSON.parse(raw)
    // Deep merge parsed values over defaults
    return deepMerge(structuredClone(DEFAULTS), parsed) as AxDotsConfig
  } catch (e) {
    console.error("[Config] Parse error, using defaults:", e)
    return structuredClone(DEFAULTS)
  }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  for (const key in source) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {}
      deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      )
    } else {
      target[key] = source[key]
    }
  }
  return target
}

export function loadConfig(): AxDotsConfig {
  try {
    const raw = readFile(CONFIG_PATH)
    _config = parseConfig(raw)
  } catch {
    console.warn("[Config] Config file not found, using defaults")
    writeDefaultConfig()
  }

  // Watch for changes — hot-reload CSS + re-read config
  monitorFile(CONFIG_PATH, () => {
    try {
      const raw = readFile(CONFIG_PATH)
      _config = parseConfig(raw)
      console.log("[Config] Hot-reloaded config")
    } catch (e) {
      console.error("[Config] Hot-reload failed:", e)
    }
  })

  return _config
}

export function getConfig(): AxDotsConfig {
  return _config
}

function writeDefaultConfig() {
  const { writeFileSync, mkdirSync } = await import("astal/file")
  try {
    mkdirSync(`${App.configDir}/config`)
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULTS, null, 2))
    console.log("[Config] Wrote default config to", CONFIG_PATH)
  } catch (e) {
    console.error("[Config] Could not write default config:", e)
  }
}
