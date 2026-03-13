/**
 * modules/widgets/PowerMenu.ts
 * Full-screen power/session overlay.
 * Actions: Lock, Suspend, Hibernate, Reboot, Shutdown, Logout.
 * Press Escape or click background to close.
 */

import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import { execAsync } from "astal/process"
import GLib from "gi://GLib"

interface PowerAction {
  icon:    string
  label:   string
  command: string[]
  danger?: boolean
}

const ACTIONS: PowerAction[] = [
  { icon: "󰌾", label: "Lock",      command: ["hyprlock"] },
  { icon: "󰤄", label: "Suspend",   command: ["systemctl", "suspend"] },
  { icon: "󰒲", label: "Hibernate", command: ["systemctl", "hibernate"] },
  { icon: "󰜉", label: "Reboot",    command: ["systemctl", "reboot"],   danger: true },
  { icon: "󰐥", label: "Shutdown",  command: ["systemctl", "poweroff"], danger: true },
  {
    icon: "󰍃",
    label: "Logout",
    command: ["hyprctl", "dispatch", "exit"],
    danger: true,
  },
]

export default function PowerMenu(monitor: Gdk.Monitor) {
  function close() {
    App.get_window("power-menu")?.hide()
  }

  function run(cmd: string[]) {
    close()
    // Small delay to let the overlay disappear first
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
      execAsync(cmd).catch(console.error)
      return GLib.SOURCE_REMOVE
    })
  }

  return (
    <window
      name="power-menu"
      className="power-menu-window"
      gdkmonitor={monitor}
      layer={Astal.Layer.OVERLAY}
      anchor={
        Astal.WindowAnchor.TOP    |
        Astal.WindowAnchor.BOTTOM |
        Astal.WindowAnchor.LEFT   |
        Astal.WindowAnchor.RIGHT
      }
      visible={false}
      keymode={Astal.Keymode.EXCLUSIVE}
      onKeyPressed={(_self, event) => {
        if (event.get_keyval()[1] === Gdk.KEY_Escape) close()
      }}
    >
      {/* Dimmed backdrop — click to close */}
      <eventbox className="power-menu-backdrop" onButtonPressed={close}>
        <box
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
        >
          {/* Card */}
          <eventbox onButtonPressed={(_self, e) => e.stop_propagation()}>
            <box
              className="power-menu-card glass-lg anim-scale-in"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={24}
            >
              {/* Header */}
              <box orientation={Gtk.Orientation.VERTICAL} spacing={4} halign={Gtk.Align.CENTER}>
                <label className="text-4xl font-mono text-primary" label="󰐥" />
                <label className="text-md font-semi" label="Power Menu" />
                <label className="text-xs text-muted" label="Choose an action or press Esc to cancel" />
              </box>

              {/* Actions grid */}
              <box spacing={12} halign={Gtk.Align.CENTER}>
                {ACTIONS.map(action => (
                  <PowerActionBtn
                    key={action.label}
                    action={action}
                    onActivate={() => run(action.command)}
                  />
                ))}
              </box>
            </box>
          </eventbox>
        </box>
      </eventbox>
    </window>
  )
}

function PowerActionBtn({
  action,
  onActivate,
}: {
  action:     PowerAction
  onActivate: () => void
}) {
  return (
    <button
      className={`power-action-btn ${action.danger ? "danger" : ""}`}
      onClicked={onActivate}
      tooltipText={action.label}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={8} halign={Gtk.Align.CENTER}>
        <label className={`power-action-icon font-mono text-3xl ${action.danger ? "text-error" : "text-primary"}`} label={action.icon} />
        <label className="power-action-label text-xs text-muted" label={action.label} />
      </box>
    </button>
  )
}
