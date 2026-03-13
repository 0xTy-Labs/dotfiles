/**
 * modules/bar/Bar.ts
 * Floating top status bar.
 * Layout: [Left: workspaces + title] [Center: clock] [Right: tray + pills + power]
 *
 * Renders as a wlr-layer-shell surface with EXCLUSIVE zone (pushes tiling below).
 */

import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import { bind } from "astal"
import Workspaces from "./Workspaces"
import WindowTitle from "./WindowTitle"
import Clock from "./Clock"
import SysTray from "./SysTray"
import StatusPills from "./StatusPills"
import PowerButton from "./PowerButton"
import { getConfig } from "../../services/Config"

export default function Bar(monitor: Gdk.Monitor) {
  const cfg = getConfig()
  const { height, margin } = cfg.bar

  return <window
    name="bar"
    className="bar-window"
    gdkmonitor={monitor}
    layer={Astal.Layer.TOP}
    anchor={
      Astal.WindowAnchor.TOP   |
      Astal.WindowAnchor.LEFT  |
      Astal.WindowAnchor.RIGHT
    }
    exclusivity={Astal.Exclusivity.EXCLUSIVE}
    marginTop={margin}
    marginLeft={margin}
    marginRight={margin}
    heightRequest={height}
  >
    <centerbox className="bar glass anim-slide-down">

      {/* ── Left zone ───────────────────────────────────────── */}
      <box className="bar-left" spacing={8}>
        <Workspaces monitor={monitor} />
        <box className="separator-v" />
        <WindowTitle />
      </box>

      {/* ── Center zone ─────────────────────────────────────── */}
      <box className="bar-center" halign={Gtk.Align.CENTER}>
        <Clock />
      </box>

      {/* ── Right zone ──────────────────────────────────────── */}
      <box className="bar-right" spacing={4} halign={Gtk.Align.END}>
        <SysTray />
        <box className="separator-v" />
        <StatusPills />
        <PowerButton />
      </box>

    </centerbox>
  </window>
}
