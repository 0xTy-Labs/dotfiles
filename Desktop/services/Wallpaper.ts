/**
 * services/Wallpaper.ts
 * Controls SWWW for wallpaper transitions.
 * Updates config + triggers theme pipeline on change.
 */

import { execAsync } from "astal/process"
import { writeFileSync, readFile } from "astal/file"
import { Variable } from "astal"
import GLib from "gi://GLib"
import { applyTheme } from "./Theming"
import { getConfig } from "./Config"

// ── Transitions ────────────────────────────────────────────────────────────────

export type TransitionType =
  | "fade"
  | "wipe"
  | "wave"
  | "grow"
  | "center"
  | "any"
  | "outer"
  | "random"

const TRANSITION_DEFAULTS = {
  type:     "wipe" as TransitionType,
  duration: 1.5,    // seconds
  fps:      60,
  angle:    30,     // degrees (for wipe/wave)
}

// ── State ─────────────────────────────────────────────────────────────────────

export const currentWallpaper = Variable<string>(
  getConfig().theme.wallpaper
)

// ── SWWW init ─────────────────────────────────────────────────────────────────

export async function initWallpaper(): Promise<void> {
  // Start swww daemon if not running
  try {
    await execAsync(["swww", "query"])
  } catch {
    console.log("[Wallpaper] Starting swww daemon…")
    await execAsync(["swww-daemon", "--no-cache"])
  }

  // Apply last-known wallpaper on startup
  const wall = getConfig().theme.wallpaper
  if (wall) await setWallpaper(wall, "fade")
}

// ── Set wallpaper ──────────────────────────────────────────────────────────────

export async function setWallpaper(
  path: string,
  transition: TransitionType = "wipe"
): Promise<void> {
  const t = TRANSITION_DEFAULTS

  try {
    await execAsync([
      "swww", "img",
      path,
      "--transition-type",    transition,
      "--transition-duration", String(t.duration),
      "--transition-fps",      String(t.fps),
      "--transition-angle",    String(t.angle),
    ])

    currentWallpaper.set(path)

    // Save to config
    saveWallpaperToConfig(path)

    // Rebuild Matugen theme
    console.log("[Wallpaper] Set →", path, "· Rebuilding theme…")
    await applyTheme(path)
  } catch (e) {
    console.error("[Wallpaper] Failed to set wallpaper:", e)
  }
}

// ── Wallpaper picker (via find + Rofi) ────────────────────────────────────────

export async function pickWallpaper(): Promise<void> {
  const wallDirs = [
    `${GLib.get_home_dir()}/Pictures/wallpapers`,
    `${GLib.get_home_dir()}/Pictures`,
    `/usr/share/backgrounds`,
  ]

  // Build list of image files
  const cmd = [
    "bash", "-c",
    `find ${wallDirs.join(" ")} -maxdepth 2 -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.webp" \\) 2>/dev/null | sort`
  ]

  try {
    const output = await execAsync(cmd)
    const files = output.trim().split("\n").filter(Boolean)

    if (files.length === 0) {
      console.warn("[Wallpaper] No wallpapers found")
      return
    }

    // Pipe to rofi for selection
    const rofiCmd = `echo '${files.join("\n")}' | rofi -dmenu -p "Wallpaper" -theme-str 'listview { lines: 10; }'`
    const selected = await execAsync(["bash", "-c", rofiCmd])

    if (selected.trim()) {
      await setWallpaper(selected.trim())
    }
  } catch (e) {
    // User dismissed rofi — not an error
    console.log("[Wallpaper] Picker closed")
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function saveWallpaperToConfig(path: string): void {
  const { App } = require("astal/gtk4")
  const configPath = `${App.configDir}/config/axdots.json`
  try {
    const raw = readFile(configPath)
    const cfg = JSON.parse(raw)
    cfg.theme = cfg.theme ?? {}
    cfg.theme.wallpaper = path
    writeFileSync(configPath, JSON.stringify(cfg, null, 2))
  } catch (e) {
    console.error("[Wallpaper] Could not persist wallpaper path:", e)
  }
}
