/**
 * modules/notch/Osd.ts
 * On-Screen Display for Volume and Brightness changes.
 * Shows a floating pill with icon + progress bar.
 * Auto-hides after 1.5s of inactivity.
 */

import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import { Variable, bind } from "astal"
import Wp from "gi://AstalWp"
import { timeout } from "astal/time"
import { execAsync } from "astal/process"
import { interval } from "astal/time"

type OsdType = "volume" | "brightness" | null

interface OsdState {
  type:  OsdType
  value: number       // 0..1
  icon:  string
}

const osdState = Variable<OsdState>({ type: null, value: 0, icon: "" })
let hideTimer: ReturnType<typeof timeout> | null = null

function showOsd(type: OsdType, value: number, icon: string) {
  osdState.set({ type, value, icon })
  if (hideTimer) { hideTimer.cancel(); hideTimer = null }
  hideTimer = timeout(1500, () => {
    osdState.set({ type: null, value: 0, icon: "" })
  })
}

// Watch volume changes
const audio   = Wp.get_default()
const speaker = audio?.defaultSpeaker

if (speaker) {
  speaker.connect("notify::volume", () => {
    const v = speaker.volume
    const pct = Math.round(v * 100)
    const icon = speaker.mute || v === 0 ? "󰝟" : v < 0.33 ? "󰕿" : v < 0.66 ? "󰖀" : "󰕾"
    showOsd("volume", Math.min(v, 1), icon)
  })

  speaker.connect("notify::mute", () => {
    showOsd("volume", speaker.volume, speaker.mute ? "󰝟" : "󰕾")
  })
}

// Watch brightness via polling (no D-Bus for backlight on all HW)
let lastBrightness = -1
interval(200, () => {
  execAsync(["brightnessctl", "-m", "get"]).then(out => {
    const [,, max, cur] = out.trim().split(",")
    const val = Number(cur) / Number(max)
    if (Math.abs(val - lastBrightness) > 0.01) {
      lastBrightness = val
      const icon = val < 0.33 ? "󰃞" : val < 0.66 ? "󰃟" : "󰃠"
      showOsd("brightness", val, icon)
    }
  }).catch(() => {})
})

interface OsdProps {
  monitor: Gdk.Monitor
}

export default function OSD({ monitor }: OsdProps) {
  return (
    <window
      name="osd"
      className="osd-window"
      gdkmonitor={monitor}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.BOTTOM}
      marginBottom={80}
      visible={bind(osdState).as(s => s.type !== null)}
    >
      <box
        className="osd-pill glass-sm anim-scale-in"
        spacing={10}
        visible={bind(osdState).as(s => s.type !== null)}
      >
        {/* Icon */}
        <label
          className="osd-icon font-mono text-lg text-primary"
          label={bind(osdState).as(s => s.icon)}
        />

        {/* Progress bar */}
        <levelbar
          className="osd-bar"
          value={bind(osdState).as(s => s.value)}
          minValue={0}
          maxValue={1}
          widthRequest={120}
          heightRequest={4}
        />

        {/* Percentage label */}
        <label
          className="osd-pct text-sm"
          label={bind(osdState).as(s => `${Math.round(s.value * 100)}%`)}
        />
      </box>
    </window>
  )
}
