/**
 * modules/dock/DockItem.ts
 * Single icon in the dock.
 * - App icon (falls back to generic icon)
 * - Running indicator dots (one per window)
 * - Click: launch or focus
 * - Right-click: DockMenu
 * - Hover: CSS scale (magnification done via CSS transform)
 */

import { Gtk, Gdk } from "astal/gtk4"
import { execAsync } from "astal/process"
import Hyprland from "gi://AstalHyprland"
import DockMenu from "./DockMenu"

export interface DockAppEntry {
  id:          string
  app:         { name?: string; desktop?: string; iconName?: string; launch?: () => void } | null
  running:     boolean
  windowCount: number
  pinned:      boolean
}

interface DockItemProps {
  dockApp:  DockAppEntry
  iconSize: number
}

export default function DockItem({ dockApp, iconSize }: DockItemProps) {
  const hypr = Hyprland.Hyprland.get_default()
  let popover: DockMenu | null = null

  function launch() {
    if (dockApp.app?.launch) {
      dockApp.app.launch()
    } else {
      // Fallback: try gtk-launch
      const desktop = dockApp.app?.desktop ?? dockApp.id
      execAsync(["gtk-launch", desktop]).catch(() => {
        console.warn("[Dock] Could not launch:", desktop)
      })
    }
  }

  function focusOrLaunch() {
    if (!dockApp.running) {
      launch()
      return
    }
    // Find first window matching this app and focus it
    const cls    = dockApp.id.replace(".desktop", "").toLowerCase()
    const client = hypr.clients.find(c =>
      c.class_name?.toLowerCase().includes(cls) ||
      c.title?.toLowerCase().includes(dockApp.app?.name?.toLowerCase() ?? "")
    )
    if (client) {
      hypr.message_async(`dispatch focuswindow address:${client.address}`, null, () => {})
    } else {
      launch()
    }
  }

  return (
    <box
      className="dock-item-container"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={3}
      tooltipText={dockApp.app?.name ?? dockApp.id}
    >
      <eventbox
        className="dock-item"
        onButtonPressed={(_self, event) => {
          const btn = event.get_button()[1]
          if (btn === 1) focusOrLaunch()
          if (btn === 3) {
            // Show context menu
            if (!popover) {
              popover = new DockMenu({ dockApp, onLaunch: launch })
            }
            popover.popup()
          }
        }}
        onHoverEnter={(self) => self.add_css_class("hovered")}
        onHoverLeave={(self) => self.remove_css_class("hovered")}
      >
        <box
          className={`dock-icon-wrap ${dockApp.running ? "running" : ""}`}
          widthRequest={iconSize}
          heightRequest={iconSize}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
        >
          {dockApp.app?.iconName
            ? <image
                className="dock-icon"
                iconName={dockApp.app.iconName}
                pixelSize={iconSize - 8}
              />
            : <label
                className="dock-icon-fallback font-mono text-muted"
                label="󰣆"
              />
          }
        </box>
      </eventbox>

      {/* Running indicator dots */}
      <box
        className="dock-dots"
        halign={Gtk.Align.CENTER}
        spacing={3}
        visible={dockApp.running}
      >
        {Array.from({ length: Math.min(dockApp.windowCount, 3) }, (_, i) => (
          <box key={i} className="dock-dot" />
        ))}
      </box>
    </box>
  )
}
