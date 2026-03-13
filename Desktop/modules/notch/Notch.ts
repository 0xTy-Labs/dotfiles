/**
 * modules/notch/Notch.ts
 * The signature center-screen floating notch.
 *
 * States:
 *   COLLAPSED  — slim pill: current media track + icon  (~240x32px)
 *   EXPANDED   — full panel: media controls + toggles + sliders (~400x280px)
 *
 * Expansion triggered by click or by AGS IPC "toggle notch".
 */

import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import { Variable, bind } from "astal"
import MediaPill from "./MediaPill"
import ExpandedPanel from "./Controls"

interface NotchProps {
  monitor: Gdk.Monitor
}

// Shared expansion state — exported so OSD can also control it
export const notchExpanded = Variable<boolean>(false)

export default function Notch({ monitor }: NotchProps) {
  return (
    <window
      name="notch"
      className="notch-window"
      gdkmonitor={monitor}
      layer={Astal.Layer.OVERLAY}
      anchor={
        Astal.WindowAnchor.TOP
      }
      marginTop={8}
      visible={true}
      application={App}
    >
      <eventbox
        onHoverEnter={() => {
          // Auto-expand on hover (if configured)
          // notchExpanded.set(true)
        }}
        onHoverLeave={() => {
          // Auto-collapse on hover leave after delay
          // notchExpanded.set(false)
        }}
        onButtonPressed={(_self, event) => {
          if (event.get_button()[1] === 1) {
            notchExpanded.set(!notchExpanded.get())
          }
        }}
      >
        <box className="notch-pill glass" orientation={Gtk.Orientation.VERTICAL}>

          {/* Always-visible collapsed content */}
          <MediaPill expanded={notchExpanded} />

          {/* Expanded panel — revealed with animation */}
          <revealer
            revealChild={bind(notchExpanded)}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={280}
          >
            <ExpandedPanel onCollapse={() => notchExpanded.set(false)} />
          </revealer>

        </box>
      </eventbox>
    </window>
  )
}
