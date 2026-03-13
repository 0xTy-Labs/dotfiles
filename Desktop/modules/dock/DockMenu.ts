/**
 * modules/dock/DockMenu.ts
 * Right-click context menu for a dock icon.
 * Lists: open windows for this app, actions (launch new, pin/unpin, quit all).
 */

import { Gtk } from "astal/gtk4"
import Hyprland from "gi://AstalHyprland"
import { execAsync } from "astal/process"
import type { DockAppEntry } from "./DockItem"

interface DockMenuProps {
  dockApp:  DockAppEntry
  onLaunch: () => void
}

export default class DockMenu extends Gtk.Popover {
  constructor({ dockApp, onLaunch }: DockMenuProps) {
    super()

    const hypr = Hyprland.Hyprland.get_default()
    const cls  = dockApp.id.replace(".desktop", "").toLowerCase()

    // Find all matching windows
    const windows = hypr.clients.filter(c =>
      c.class_name?.toLowerCase().includes(cls) ||
      c.title?.toLowerCase().includes(dockApp.app?.name?.toLowerCase() ?? "")
    )

    const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 2, margin_top: 4, margin_bottom: 4, margin_start: 4, margin_end: 4 })

    // App name header
    const header = new Gtk.Label({ label: dockApp.app?.name ?? dockApp.id, css_classes: ["dock-menu-header"] })
    box.append(header)

    // Separator
    const sep1 = new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4 })
    box.append(sep1)

    // Window list
    for (const win of windows) {
      const btn = new Gtk.Button({
        label: win.title?.slice(0, 40) ?? "Window",
        css_classes: ["dock-menu-item"],
        halign: Gtk.Align.START,
      })
      btn.connect("clicked", () => {
        hypr.message_async(`dispatch focuswindow address:${win.address}`, null, () => {})
        this.popdown()
      })
      box.append(btn)
    }

    if (windows.length > 0) {
      const sep2 = new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL, margin_top: 4, margin_bottom: 4 })
      box.append(sep2)
    }

    // Launch new
    const launchBtn = new Gtk.Button({ label: "Launch new window", css_classes: ["dock-menu-item"] })
    launchBtn.connect("clicked", () => { onLaunch(); this.popdown() })
    box.append(launchBtn)

    // Close all windows
    if (windows.length > 0) {
      const closeBtn = new Gtk.Button({ label: `Close all (${windows.length})`, css_classes: ["dock-menu-item", "dock-menu-destructive"] })
      closeBtn.connect("clicked", () => {
        for (const win of windows) {
          hypr.message_async(`dispatch closewindow address:${win.address}`, null, () => {})
        }
        this.popdown()
      })
      box.append(closeBtn)
    }

    this.set_child(box)
    this.add_css_class("dock-menu-popover")
  }
}
