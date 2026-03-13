/**
 * modules/widgets/Calendar.ts
 * Mini month calendar — floats below the clock when toggled.
 * Navigate months with arrow buttons.
 */

import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import { Variable, bind } from "astal"
import GLib from "gi://GLib"
import { interval } from "astal/time"

const DAYS   = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

export default function CalendarWidget(monitor: Gdk.Monitor) {
  const today     = GLib.DateTime.new_now_local()
  const viewYear  = Variable<number>(today.get_year())
  const viewMonth = Variable<number>(today.get_month())  // 1-based

  // Update "today" at midnight
  const todayDate = Variable<GLib.DateTime>(today)
  interval(60_000, () => todayDate.set(GLib.DateTime.new_now_local()))

  function prevMonth() {
    let m = viewMonth.get() - 1
    let y = viewYear.get()
    if (m < 1) { m = 12; y-- }
    viewMonth.set(m); viewYear.set(y)
  }

  function nextMonth() {
    let m = viewMonth.get() + 1
    let y = viewYear.get()
    if (m > 12) { m = 1; y++ }
    viewMonth.set(m); viewYear.set(y)
  }

  function goToday() {
    const t = GLib.DateTime.new_now_local()
    viewYear.set(t.get_year())
    viewMonth.set(t.get_month())
  }

  return (
    <window
      name="calendar-widget"
      className="calendar-window"
      gdkmonitor={monitor}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP}
      marginTop={48}
      visible={false}
      onKeyPressed={(_self, event) => {
        if (event.get_keyval()[1] === 0xff1b /* Escape */) {
          App.get_window("calendar-widget")?.hide()
        }
      }}
    >
      <box className="calendar-card glass anim-scale-in" orientation={Gtk.Orientation.VERTICAL} spacing={12}>

        {/* Header */}
        <box className="calendar-header" spacing={8}>
          <button className="icon-btn calendar-nav" onClicked={prevMonth}>
            <label className="font-mono text-muted" label="‹" />
          </button>

          <button className="calendar-month-label" onClicked={goToday}>
            <label
              className="text-md font-semi"
              label={bind(viewMonth).as(m =>
                `${MONTHS[m - 1]} ${viewYear.get()}`
              )}
            />
          </button>

          <button className="icon-btn calendar-nav" onClicked={nextMonth}>
            <label className="font-mono text-muted" label="›" />
          </button>
        </box>

        {/* Day-of-week headers */}
        <box className="calendar-dow-row" spacing={0}>
          {DAYS.map(d => (
            <label
              key={d}
              className="calendar-dow text-xs text-muted"
              label={d}
            />
          ))}
        </box>

        {/* Days grid */}
        <box className="calendar-grid" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
          {bind(viewMonth).as(() => buildGrid(viewYear.get(), viewMonth.get(), todayDate.get()))}
        </box>

      </box>
    </window>
  )
}

// ── Grid builder ──────────────────────────────────────────────────────────────

function buildGrid(year: number, month: number, today: GLib.DateTime) {
  const firstDay  = GLib.DateTime.new_local(year, month, 1, 0, 0, 0)
  const startDow  = firstDay.get_day_of_week() % 7  // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayD = today.get_year() === year && today.get_month() === month
    ? today.get_day_of_month()
    : -1

  const cells: number[] = []
  for (let i = 0; i < startDow; i++) cells.push(0)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(0)

  const rows: JSX.Element[] = []
  for (let r = 0; r < cells.length / 7; r++) {
    const week = cells.slice(r * 7, r * 7 + 7)
    rows.push(
      <box key={r} className="calendar-week" spacing={0}>
        {week.map((d, i) => (
          <label
            key={i}
            className={[
              "calendar-day",
              d === 0   ? "empty"   : "",
              d === todayD ? "today" : "",
            ].filter(Boolean).join(" ")}
            label={d > 0 ? String(d) : ""}
          />
        ))}
      </box>
    )
  }
  return rows
}
