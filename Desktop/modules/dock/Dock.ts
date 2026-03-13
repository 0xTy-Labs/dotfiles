/**
 * modules/dock/Dock.ts
 * macOS-style bottom-center dock.
 *
 * Features:
 *  - Pinned apps from config + running apps
 *  - Running indicator dots under icons
 *  - Auto-hide with configurable delay
 *  - Hover magnification (CSS + JS)
 *  - Right-click context menu
 */

import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import { Variable, bind } from "astal"
import Apps from "gi://AstalApps"
import Hyprland from "gi://AstalHyprland"
import { timeout } from "astal/time"
import { getConfig } from "../../services/Config"
import DockItem from "./DockItem"

interface DockApp {
  id:          string    // desktop file basename
  app:         Apps.Application | null
  running:     boolean
  windowCount: number
  pinned:      boolean
}

export default function Dock(monitor: Gdk.Monitor) {
  const cfg     = getConfig().dock
  const appsLib = Apps.Apps.new()
  const hypr    = Hyprland.Hyprland.get_default()

  // ── Build dock app list ───────────────────────────────────────────────────

  const dockApps = Variable<DockApp[]>([])

  function rebuildDock() {
    const clients = hypr.clients
    const pinnedIds = cfg.pinnedApps

    // Count windows per .desktop entry
    const runningMap = new Map<string, number>()
    for (const client of clients) {
      const cls = client.class_name?.toLowerCase() ?? ""
      // Try to find matching app by class
      const matched = appsLib.list.find(a =>
        a.desktop?.toLowerCase().includes(cls) ||
        a.name?.toLowerCase().includes(cls)
      )
      if (matched) {
        const key = matched.desktop ?? matched.name
        runningMap.set(key, (runningMap.get(key) ?? 0) + 1)
      }
    }

    const apps: DockApp[] = []

    // 1. Pinned apps first
    for (const id of pinnedIds) {
      const app = appsLib.list.find(a =>
        a.desktop === id || a.desktop?.endsWith(id)
      ) ?? null
      apps.push({
        id,
        app,
        running:     runningMap.has(id),
        windowCount: runningMap.get(id) ?? 0,
        pinned:      true,
      })
    }

    // 2. Running apps not already pinned
    for (const [id, count] of runningMap.entries()) {
      if (!pinnedIds.some(p => id.endsWith(p) || p.endsWith(id))) {
        const app = appsLib.list.find(a =>
          a.desktop === id || a.desktop?.endsWith(id)
        ) ?? null
        apps.push({ id, app, running: true, windowCount: count, pinned: false })
      }
    }

    dockApps.set(apps)
  }

  rebuildDock()

  hypr.connect("client-added",   rebuildDock)
  hypr.connect("client-removed", rebuildDock)

  // ── Auto-hide logic ───────────────────────────────────────────────────────

  const dockVisible = Variable<boolean>(false)
  let hideTimer: ReturnType<typeof timeout> | null = null

  function showDock() {
    if (hideTimer) { hideTimer.cancel(); hideTimer = null }
    dockVisible.set(true)
  }

  function scheduleDockHide() {
    if (!cfg.autoHide) return
    if (hideTimer) { hideTimer.cancel(); hideTimer = null }
    hideTimer = timeout(cfg.autoHideDelay, () => {
      dockVisible.set(false)
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <window
      name="dock"
      className="dock-window"
      gdkmonitor={monitor}
      layer={Astal.Layer.BOTTOM}
      anchor={
        Astal.WindowAnchor.BOTTOM |
        Astal.WindowAnchor.LEFT   |
        Astal.WindowAnchor.RIGHT
      }
      exclusivity={Astal.Exclusivity.NORMAL}
      heightRequest={cfg.autoHide ? 4 : cfg.iconSize + 24}
    >
      <box orientation={Gtk.Orientation.VERTICAL} vexpand valign={Gtk.Align.END}>
        {/* Hover trigger strip (invisible, at bottom edge) */}
        <eventbox
          className="dock-trigger"
          heightRequest={4}
          hexpand
          onHoverEnter={showDock}
        />

        {/* Dock container with reveal animation */}
        <revealer
          revealChild={bind(dockVisible)}
          transitionType={Gtk.RevealerTransitionType.SLIDE_UP}
          transitionDuration={250}
        >
          <eventbox
            onHoverEnter={showDock}
            onHoverLeave={scheduleDockHide}
          >
            <box
              className="dock glass"
              halign={Gtk.Align.CENTER}
              spacing={4}
            >
              {/* Separator before running apps if any unpinned running */}
              {bind(dockApps).as(apps => {
                const pinned  = apps.filter(a => a.pinned)
                const running = apps.filter(a => !a.pinned && a.running)

                return (
                  <box spacing={4}>
                    {pinned.map(app => (
                      <DockItem key={app.id} dockApp={app} iconSize={cfg.iconSize} />
                    ))}

                    {/* Vertical divider if running unpinned apps exist */}
                    {running.length > 0 && (
                      <box className="dock-separator" />
                    )}

                    {running.map(app => (
                      <DockItem key={app.id} dockApp={app} iconSize={cfg.iconSize} />
                    ))}
                  </box>
                )
              })}
            </box>
          </eventbox>
        </revealer>
      </box>
    </window>
  )
}
