/**
 * modules/notch/Controls.ts
 * Expanded notch panel.
 * Sections:
 *   1. Full media controls (prev / play-pause / next + progress + album art)
 *   2. Quick toggles row (WiFi, Bluetooth, Night Mode, DND, Game Mode)
 *   3. Volume + Brightness sliders
 */

import { Gtk } from "astal/gtk4"
import { Variable, bind } from "astal"
import Mpris    from "gi://AstalMpris"
import Network  from "gi://AstalNetwork"
import Wp       from "gi://AstalWp"
import Bluetooth from "gi://AstalBluetooth"
import { execAsync } from "astal/process"
import { interval }  from "astal/time"

interface ControlsProps {
  onCollapse: () => void
}

export default function ExpandedPanel({ onCollapse }: ControlsProps) {
  return (
    <box
      className="notch-expanded"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={12}
    >
      {/* Divider */}
      <box className="separator" />

      {/* 1. Full media controls */}
      <MediaControls />

      {/* Divider */}
      <box className="separator" />

      {/* 2. Quick toggles */}
      <QuickToggles />

      {/* Divider */}
      <box className="separator" />

      {/* 3. Sliders */}
      <SlidersRow />

      {/* Collapse button */}
      <button
        className="notch-collapse-btn"
        onClicked={onCollapse}
        halign={Gtk.Align.CENTER}
      >
        <label className="font-mono text-muted text-xs" label="󰅃" />
      </button>
    </box>
  )
}

// ── Media controls ────────────────────────────────────────────────────────────

function MediaControls() {
  const mpris = Mpris.get_default()

  function getPlayer() {
    return mpris.players.find(p =>
      p.playbackStatus === Mpris.PlaybackStatus.PLAYING
    ) ?? mpris.players[0] ?? null
  }

  const player = Variable<Mpris.Player | null>(getPlayer())
  mpris.connect("notify::players", () => player.set(getPlayer()))

  // Progress update — only tick when player is playing
  const progress = Variable<number>(0)
  interval(1000, () => {
    const p = player.get()
    if (p && p.length > 0) {
      progress.set(p.position / p.length)
    }
  })

  return (
    <box className="media-controls" orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      {bind(player).as(p => {
        if (!p) {
          return (
            <label
              className="text-xs text-muted"
              label="No media playing"
              halign={Gtk.Align.CENTER}
            />
          )
        }

        return (
          <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>

            {/* Album art + info row */}
            <box spacing={12}>
              {/* Album art thumbnail */}
              <box className="album-art-container">
                <image
                  className="album-art"
                  file={bind(p, "coverArt").as(art => art ?? "")}
                  visible={bind(p, "coverArt").as(a => !!a)}
                  pixelSize={56}
                />
                <label
                  className="album-art-placeholder font-mono text-muted"
                  label="󰝚"
                  visible={bind(p, "coverArt").as(a => !a)}
                />
              </box>

              {/* Title + artist */}
              <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand>
                <label
                  className="text-md font-semi"
                  label={bind(p, "title").as(t => t || "Unknown")}
                  halign={Gtk.Align.START}
                  ellipsize={3}
                  maxWidthChars={28}
                />
                <label
                  className="text-sm text-muted"
                  label={bind(p, "artist").as(a => a || "Unknown artist")}
                  halign={Gtk.Align.START}
                  ellipsize={3}
                  maxWidthChars={28}
                />
                <label
                  className="text-xs text-muted"
                  label={bind(p, "album").as(a => a || "")}
                  halign={Gtk.Align.START}
                  ellipsize={3}
                  maxWidthChars={28}
                  visible={bind(p, "album").as(a => !!a)}
                />
              </box>
            </box>

            {/* Progress bar */}
            <scale
              className="media-progress"
              drawValue={false}
              hexpand
              value={bind(progress)}
              onChangeValue={(_self, val) => {
                p.position = val * p.length
              }}
            />

            {/* Transport controls */}
            <box className="transport-controls" halign={Gtk.Align.CENTER} spacing={8}>
              <button
                className="icon-btn transport-btn"
                onClicked={() => p.previous()}
                sensitive={bind(p, "canGoPrevious")}
                tooltipText="Previous"
              >
                <label className="font-mono text-primary" label="󰒮" />
              </button>

              <button
                className="icon-btn transport-play"
                onClicked={() => p.playPause()}
                tooltipText={bind(p, "playbackStatus").as(s =>
                  s === Mpris.PlaybackStatus.PLAYING ? "Pause" : "Play"
                )}
              >
                <label
                  className="font-mono text-primary text-xl"
                  label={bind(p, "playbackStatus").as(s =>
                    s === Mpris.PlaybackStatus.PLAYING ? "󰏤" : "󰐊"
                  )}
                />
              </button>

              <button
                className="icon-btn transport-btn"
                onClicked={() => p.next()}
                sensitive={bind(p, "canGoNext")}
                tooltipText="Next"
              >
                <label className="font-mono text-primary" label="󰒭" />
              </button>

              {/* Shuffle */}
              <button
                className={bind(p, "shuffleStatus").as(s =>
                  `icon-btn transport-btn ${s === Mpris.Shuffle.ON ? "active" : ""}`
                )}
                onClicked={() => p.shuffle()}
                tooltipText="Shuffle"
              >
                <label className="font-mono text-muted" label="󰒟" />
              </button>

              {/* Loop */}
              <button
                className={bind(p, "loopStatus").as(s =>
                  `icon-btn transport-btn ${s !== Mpris.Loop.NONE ? "active" : ""}`
                )}
                onClicked={() => p.loop()}
                tooltipText="Loop"
              >
                <label
                  className="font-mono text-muted"
                  label={bind(p, "loopStatus").as(s =>
                    s === Mpris.Loop.TRACK ? "󰑘" : "󰑖"
                  )}
                />
              </button>
            </box>
          </box>
        )
      })}
    </box>
  )
}

// ── Quick toggles ─────────────────────────────────────────────────────────────

function QuickToggles() {
  const network   = Network.get_default()
  const bluetooth = Bluetooth.get_default()

  // Night mode state (hyprsunset)
  const nightMode = Variable<boolean>(false)
  // DND (dunst pause)
  const dnd = Variable<boolean>(false)

  async function toggleNightMode() {
    const next = !nightMode.get()
    nightMode.set(next)
    if (next) {
      await execAsync(["hyprctl", "hyprsunset", "temperature", "4000"])
    } else {
      await execAsync(["hyprctl", "hyprsunset", "reset"])
    }
  }

  async function toggleDnd() {
    const next = !dnd.get()
    dnd.set(next)
    await execAsync(["dunstctl", next ? "set-paused", "true" : "set-paused", "false"])
  }

  return (
    <box className="quick-toggles" spacing={8} halign={Gtk.Align.CENTER}>

      {/* WiFi */}
      <ToggleButton
        icon={bind(network.wifi ?? Variable(null), "enabled").as((e: boolean) =>
          e ? "󰤨" : "󰤭"
        )}
        active={bind(network.wifi ?? Variable(null), "enabled").as((e: boolean) => !!e)}
        tooltip="WiFi"
        onToggle={() => {
          if (network.wifi) network.wifi.enabled = !network.wifi.enabled
        }}
      />

      {/* Bluetooth */}
      <ToggleButton
        icon={bind(bluetooth, "isPowered").as((p: boolean) => p ? "󰂯" : "󰂲")}
        active={bind(bluetooth, "isPowered").as((p: boolean) => !!p)}
        tooltip="Bluetooth"
        onToggle={() => bluetooth.toggle()}
      />

      {/* Night mode */}
      <ToggleButton
        icon={bind(nightMode).as(n => n ? "󰛨" : "󰌔")}
        active={bind(nightMode)}
        tooltip="Night mode"
        onToggle={toggleNightMode}
      />

      {/* DND */}
      <ToggleButton
        icon={bind(dnd).as(d => d ? "󰂛" : "󰂚")}
        active={bind(dnd)}
        tooltip="Do not disturb"
        onToggle={toggleDnd}
      />

      {/* Airplane mode placeholder */}
      <ToggleButton
        icon={"󰀝"}
        active={false}
        tooltip="Airplane mode (soon)"
        onToggle={() => {}}
      />

    </box>
  )
}

interface ToggleButtonProps {
  icon:     string | ReturnType<typeof bind>
  active:   boolean | ReturnType<typeof bind>
  tooltip:  string
  onToggle: () => void
}

function ToggleButton({ icon, active, tooltip, onToggle }: ToggleButtonProps) {
  return (
    <button
      className={typeof active === "boolean"
        ? `toggle-btn ${active ? "active" : ""}`
        : bind(active as any).as((a: boolean) => `toggle-btn ${a ? "active" : ""}`)
      }
      tooltipText={tooltip}
      onClicked={onToggle}
    >
      <label
        className="font-mono text-lg"
        label={typeof icon === "string" ? icon : icon as any}
      />
    </button>
  )
}

// ── Sliders ───────────────────────────────────────────────────────────────────

function SlidersRow() {
  const audio   = Wp.get_default()
  const speaker = audio?.defaultSpeaker

  // Brightness via brightnessctl
  const brightness = Variable<number>(1.0)

  // Read initial brightness
  execAsync(["brightnessctl", "get"]).then(cur => {
    execAsync(["brightnessctl", "max"]).then(max => {
      brightness.set(Number(cur.trim()) / Number(max.trim()))
    })
  }).catch(() => {})

  async function setBrightness(val: number) {
    const pct = Math.round(val * 100)
    brightness.set(val)
    await execAsync(["brightnessctl", "set", `${pct}%`])
  }

  return (
    <box className="sliders-row" orientation={Gtk.Orientation.VERTICAL} spacing={8}>

      {/* Volume slider */}
      {speaker && (
        <box className="slider-row" spacing={8}>
          <label className="font-mono text-primary slider-icon" label="󰕾" />
          <scale
            className="control-slider volume-slider"
            drawValue={false}
            hexpand
            min={0} max={1}
            value={bind(speaker, "volume")}
            onChangeValue={(_self, val) => {
              if (speaker) speaker.volume = val
            }}
          />
          <label
            className="text-xs text-muted slider-val"
            label={bind(speaker, "volume").as(v => `${Math.round(v * 100)}%`)}
          />
        </box>
      )}

      {/* Brightness slider */}
      <box className="slider-row" spacing={8}>
        <label className="font-mono text-tertiary slider-icon" label="󰃞" />
        <scale
          className="control-slider brightness-slider"
          drawValue={false}
          hexpand
          min={0} max={1}
          value={bind(brightness)}
          onChangeValue={(_self, val) => setBrightness(val)}
        />
        <label
          className="text-xs text-muted slider-val"
          label={bind(brightness).as(b => `${Math.round(b * 100)}%`)}
        />
      </box>

    </box>
  )
}
