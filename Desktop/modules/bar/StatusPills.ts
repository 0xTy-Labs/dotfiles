/**
 * modules/bar/StatusPills.ts
 * Battery, Network, Volume — each a reactive glass pill.
 * All data from Astal services (event-driven, no polling).
 */

import { Gtk } from "astal/gtk4"
import { bind } from "astal"
import Battery   from "gi://AstalBattery"
import Network   from "gi://AstalNetwork"
import Wp        from "gi://AstalWp"
import { App }   from "astal/gtk4"

// ── Battery pill ──────────────────────────────────────────────────────────────

function BatteryPill() {
  const battery = Battery.get_default()

  // Battery icon by charge level
  function battIcon(pct: number, charging: boolean): string {
    if (charging) return "󰂄"
    if (pct >= 90) return "󰁹"
    if (pct >= 75) return "󰂀"
    if (pct >= 60) return "󰁿"
    if (pct >= 45) return "󰁾"
    if (pct >= 30) return "󰁽"
    if (pct >= 15) return "󰁻"
    return "󰁺"
  }

  function battClass(pct: number): string {
    if (pct <= 15) return "battery-critical"
    if (pct <= 30) return "battery-low"
    return ""
  }

  return (
    <button
      className="pill battery-pill"
      tooltipText={bind(battery, "percentage").as(
        p => `Battery: ${Math.round(p * 100)}%`
      )}
      visible={bind(battery, "isPresent")}
    >
      <box spacing={4}>
        <label
          className={bind(battery, "percentage").as(
            p => `battery-icon font-mono ${battClass(Math.round(p * 100))}`
          )}
          label={bind(battery, "percentage").as((p) => {
            const pct = Math.round(p * 100)
            const charging = battery.charging
            return battIcon(pct, charging)
          })}
        />
        <label
          className="battery-pct text-xs"
          label={bind(battery, "percentage").as(
            p => `${Math.round(p * 100)}%`
          )}
        />
      </box>
    </button>
  )
}

// ── Network pill ──────────────────────────────────────────────────────────────

function NetworkPill() {
  const network = Network.get_default()
  const wifi    = network.wifi

  function wifiIcon(strength: number): string {
    if (strength >= 75) return "󰤨"
    if (strength >= 50) return "󰤥"
    if (strength >= 25) return "󰤢"
    return "󰤟"
  }

  return (
    <button
      className="pill network-pill"
      tooltipText={bind(network, "connectivity").as(
        c => c === 4 ? "Connected" : "No network"
      )}
      onClicked={() => App.toggle_window("network-menu")}
    >
      <box spacing={4}>
        <label
          className="network-icon font-mono text-primary"
          label={bind(network, "primary").as(p => {
            if (p === Network.Primary.WIRED)  return "󰈀"
            if (p === Network.Primary.WIFI)   return wifiIcon(wifi?.strength ?? 0)
            return "󰤭"  // disconnected
          })}
        />
        <label
          className="network-ssid text-xs"
          label={bind(network, "primary").as(p => {
            if (p === Network.Primary.WIFI)  return wifi?.ssid ?? "WiFi"
            if (p === Network.Primary.WIRED) return "LAN"
            return "Off"
          })}
        />
      </box>
    </button>
  )
}

// ── Volume pill ───────────────────────────────────────────────────────────────

function VolumePill() {
  const audio  = Wp.get_default()
  const speaker = audio?.defaultSpeaker

  function volIcon(vol: number, muted: boolean): string {
    if (muted || vol === 0) return "󰝟"
    if (vol < 33)           return "󰕿"
    if (vol < 66)           return "󰖀"
    return "󰕾"
  }

  if (!speaker) return <box />

  return (
    <button
      className="pill volume-pill"
      tooltipText={bind(speaker, "volume").as(
        v => `Volume: ${Math.round(v * 100)}%`
      )}
      onClicked={() => App.toggle_window("audio-mixer")}
      onScroll={(_self, event) => {
        const [, , dy] = event.get_scroll_deltas()
        const step = 0.05
        speaker.volume = Math.max(0, Math.min(1.5, speaker.volume + (dy < 0 ? step : -step)))
      }}
    >
      <box spacing={4}>
        <label
          className="volume-icon font-mono text-secondary"
          label={bind(speaker, "volume").as(v =>
            volIcon(Math.round(v * 100), speaker.mute)
          )}
        />
        <label
          className="volume-pct text-xs"
          label={bind(speaker, "volume").as(v =>
            speaker.mute ? "Muted" : `${Math.round(v * 100)}%`
          )}
        />
      </box>
    </button>
  )
}

// ── Composed export ───────────────────────────────────────────────────────────

export default function StatusPills() {
  return (
    <box className="status-pills" spacing={4}>
      <NetworkPill />
      <VolumePill />
      <BatteryPill />
    </box>
  )
}
