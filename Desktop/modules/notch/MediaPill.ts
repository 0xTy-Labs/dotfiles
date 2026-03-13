/**
 * modules/notch/MediaPill.ts
 * The always-visible collapsed state of the notch.
 * Shows: [player icon] [track title — scrolling] [play/pause] [chevron]
 *
 * If no media is playing: shows a minimal clock/date strip.
 */

import { Gtk } from "astal/gtk4"
import { Variable, bind } from "astal"
import Mpris from "gi://AstalMpris"

interface MediaPillProps {
  expanded: Variable<boolean>
}

const MAX_TITLE = 32

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s
}

function playerIcon(identity: string): string {
  const id = identity.toLowerCase()
  if (id.includes("spotify"))   return "󰓇"
  if (id.includes("firefox"))   return "󰈹"
  if (id.includes("chromium"))  return "󰊯"
  if (id.includes("mpv"))       return "󰎆"
  if (id.includes("vlc"))       return "󰕼"
  if (id.includes("rhythmbox")) return "󰸪"
  return "󰝚"
}

export default function MediaPill({ expanded }: MediaPillProps) {
  const mpris = Mpris.get_default()

  // First active/playing player, fallback to first available
  function getPlayer(): Mpris.Player | null {
    const players = mpris.players
    return players.find(p =>
      p.playbackStatus === Mpris.PlaybackStatus.PLAYING
    ) ?? players[0] ?? null
  }

  const player = Variable<Mpris.Player | null>(getPlayer())

  mpris.connect("notify::players", () => {
    player.set(getPlayer())
  })

  return (
    <box
      className="notch-media-pill"
      spacing={8}
      valign={Gtk.Align.CENTER}
      widthRequest={240}
      heightRequest={32}
    >
      {/* Branch: media playing or idle */}
      {bind(player).as(p => {
        if (!p) return <NoMediaStrip />

        return (
          <box className="media-strip" spacing={8} hexpand>

            {/* Player icon */}
            <label
              className="media-player-icon font-mono text-primary text-md"
              label={bind(p, "identity").as(playerIcon)}
            />

            {/* Track info */}
            <box
              className="media-info"
              orientation={Gtk.Orientation.VERTICAL}
              spacing={0}
              hexpand
            >
              <label
                className="media-title text-sm font-semi"
                label={bind(p, "title").as(t => truncate(t || "Unknown", MAX_TITLE))}
                halign={Gtk.Align.START}
                ellipsize={3}
                maxWidthChars={MAX_TITLE}
              />
              <label
                className="media-artist text-xs text-muted"
                label={bind(p, "artist").as(a => truncate(a || "", MAX_TITLE))}
                halign={Gtk.Align.START}
                ellipsize={3}
                maxWidthChars={MAX_TITLE}
                visible={bind(p, "artist").as(a => !!a)}
              />
            </box>

            {/* Play/Pause button */}
            <button
              className="media-playpause icon-btn"
              onClicked={() => p.playPause()}
              tooltipText={bind(p, "playbackStatus").as(s =>
                s === Mpris.PlaybackStatus.PLAYING ? "Pause" : "Play"
              )}
            >
              <label
                className="font-mono text-primary"
                label={bind(p, "playbackStatus").as(s =>
                  s === Mpris.PlaybackStatus.PLAYING ? "󰏤" : "󰐊"
                )}
              />
            </button>

            {/* Expand chevron */}
            <label
              className={bind(expanded).as(e =>
                `notch-chevron font-mono text-xs text-muted ${e ? "rotated" : ""}`
              )}
              label="󰅀"
            />
          </box>
        )
      })}
    </box>
  )
}

/** Idle strip — shown when no media player is active */
function NoMediaStrip() {
  return (
    <box className="notch-idle" spacing={8} halign={Gtk.Align.CENTER} hexpand>
      <label className="font-mono text-muted" label="󰝚" />
      <label className="text-xs text-muted" label="No media" />
      <label className="font-mono text-muted text-xs" label="󰅀" />
    </box>
  )
}
