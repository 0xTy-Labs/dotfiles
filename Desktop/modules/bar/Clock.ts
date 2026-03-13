/**
 * modules/bar/Clock.ts
 * Live clock + date. Click toggles the calendar widget.
 * Updates every second via GLib timeout.
 */

import { Gtk } from "astal/gtk4"
import { Variable } from "astal"
import { interval } from "astal/time"
import { App } from "astal/gtk4"
import GLib from "gi://GLib"

// Live time variable — updates every second
const now = Variable<GLib.DateTime>(GLib.DateTime.new_now_local())

interval(1000, () => {
  now.set(GLib.DateTime.new_now_local())
})

export default function Clock() {
  return (
    <button
      className="clock"
      tooltipText="Toggle calendar"
      onClicked={() => App.toggle_window("calendar-widget")}
    >
      <box spacing={8} valign={Gtk.Align.CENTER}>
        {/* Time */}
        <label
          className="clock-time text-md font-semi"
          label={now().as(t => t.format("%H:%M") ?? "--:--")}
        />
        {/* Separator dot */}
        <label className="clock-sep text-muted" label="·" />
        {/* Date */}
        <label
          className="clock-date text-sm text-muted"
          label={now().as(t => t.format("%a %d %b") ?? "---")}
        />
      </box>
    </button>
  )
}
