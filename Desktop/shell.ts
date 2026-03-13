/**
 * axdots — shell.ts
 * Root entry point. Instantiates all PanelWindows and services.
 * Run: ags run .  (or sourced via hyprland exec-once)
 */

import { App } from "astal/gtk4"
import { execAsync } from "astal/process"
import Bar from "./modules/bar/Bar"
import Notch from "./modules/notch/Notch"
import Dock from "./modules/dock/Dock"
import Corners from "./modules/corners/Corners"
import NotificationCenter from "./modules/notifications/Center"
import ToastLayer from "./modules/notifications/ToastLayer"
import PowerMenu from "./modules/widgets/PowerMenu"
import CalendarWidget from "./modules/widgets/Calendar"
import SysMonitor from "./modules/widgets/SysMonitor"
import Weather from "./modules/widgets/Weather"
import OSD from "./modules/notch/Osd"
import { loadConfig } from "./services/Config"
import { applyTheme } from "./services/Theming"
import { initHyprland } from "./services/Hyprland"

// ── Bootstrap ────────────────────────────────────────────────────────────────

App.start({
  // All CSS is loaded from a single entry stylesheet.
  // Matugen-generated tokens live in styles/tokens.css (auto-generated).
  css: `${App.configDir}/styles/main.css`,

  requestHandler(request: string, res: (r: unknown) => void) {
    // IPC bridge — external scripts can call:
    //   ags request 'toggle notch'
    //   ags request 'toggle notifications'
    //   ags request 'reload theme'
    const [cmd, ...args] = request.split(" ")
    switch (cmd) {
      case "toggle":
        handleToggle(args[0])
        res("ok")
        break
      case "reload":
        if (args[0] === "theme") {
          applyTheme().then(() => res("ok"))
        } else if (args[0] === "css") {
          App.resetCss(`${App.configDir}/styles/main.css`)
          res("ok")
        }
        break
      case "wallpaper":
        // args[0] = path to new wallpaper
        setWallpaper(args[0])
        res("ok")
        break
      default:
        res("unknown command")
    }
  },

  // ── Mount all shell surfaces ────────────────────────────────────────────
  main() {
    const cfg = loadConfig()

    // Init Hyprland IPC service
    initHyprland()

    // Apply theme from last-known wallpaper on start
    applyTheme()

    // One surface per monitor (AGS iterates connected monitors)
    const monitors = App.get_monitors()

    monitors.forEach((monitor, idx) => {
      // Primary monitor gets the full shell
      if (idx === 0) {
        if (cfg.bar.enabled)           Bar(monitor)
        if (cfg.notch.enabled)         Notch(monitor)
        if (cfg.dock.enabled)          Dock(monitor)
        if (cfg.notifications.enabled) {
          ToastLayer(monitor)
          NotificationCenter(monitor)
        }
        OSD(monitor)
        PowerMenu(monitor)
        CalendarWidget(monitor)
        if (cfg.widgets.sysmonitor) SysMonitor(monitor)
        if (cfg.widgets.weather)    Weather(monitor)
        if (cfg.corners.enabled)       Corners(monitor)
      } else {
        // Secondary monitors get bar only
        if (cfg.bar.enabled) Bar(monitor)
        if (cfg.corners.enabled) Corners(monitor)
      }
    })

    console.log("[axdots] Shell started ✦")
  },
})

// ── Toggle handler ────────────────────────────────────────────────────────────
function handleToggle(widget: string) {
  switch (widget) {
    case "notch":
      App.toggle_window("notch")
      break
    case "notifications":
      App.toggle_window("notification-center")
      break
    case "launcher":
      // Rofi handles its own toggle via keybind / script
      execAsync(["rofi", "-show", "drun", "-theme",
        `${App.configDir}/modules/launcher/launcher.rasi`])
      break
    case "powermenu":
      App.toggle_window("power-menu")
      break
    case "clipboard":
      execAsync(["bash", `${App.configDir}/scripts/clipboard.sh`])
      break
    case "emoji":
      execAsync(["bash", `${App.configDir}/scripts/emoji.sh`])
      break
    default:
      console.warn(`[axdots] Unknown toggle target: ${widget}`)
  }
}

function setWallpaper(path: string) {
  execAsync([
    "bash",
    `${App.configDir}/scripts/wallpaper.sh`,
    path,
  ]).catch(console.error)
}
