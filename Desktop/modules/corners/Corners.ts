/**
 * modules/corners/Corners.ts
 * Renders 4 tiny transparent windows at screen corners to simulate
 * rounded screen edges. Classic Ambxst aesthetic touch.
 * Each corner is a 16x16px surface with a quarter-circle cutout.
 */

import { Astal, Gtk, Gdk } from "astal/gtk4"
import { getConfig } from "../../services/Config"

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right"

const CORNER_ANCHORS: Record<Corner, number> = {
  "top-left":     Astal.WindowAnchor.TOP  | Astal.WindowAnchor.LEFT,
  "top-right":    Astal.WindowAnchor.TOP  | Astal.WindowAnchor.RIGHT,
  "bottom-left":  Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT,
  "bottom-right": Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.RIGHT,
}

export default function Corners(monitor: Gdk.Monitor) {
  const r = getConfig().corners.radius

  return (
    <>
      {(["top-left", "top-right", "bottom-left", "bottom-right"] as Corner[]).map(pos => (
        <CornerWindow key={pos} corner={pos} radius={r} monitor={monitor} />
      ))}
    </>
  )
}

function CornerWindow({
  corner,
  radius,
  monitor,
}: {
  corner:  Corner
  radius:  number
  monitor: Gdk.Monitor
}) {
  return (
    <window
      name={`corner-${corner}`}
      className={`corner-window corner-${corner}`}
      gdkmonitor={monitor}
      layer={Astal.Layer.OVERLAY}
      anchor={CORNER_ANCHORS[corner]}
      exclusivity={Astal.Exclusivity.IGNORE}
      widthRequest={radius}
      heightRequest={radius}
    >
      {/* The corner uses CSS border-radius to cut the background color
          against the transparent window, creating the rounded corner illusion. */}
      <box className={`corner-cutout corner-cutout-${corner}`} />
    </window>
  )
}
