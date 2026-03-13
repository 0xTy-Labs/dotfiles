/**
 * modules/bar/PowerButton.ts
 * Power icon button in bar right zone.
 * Click opens the PowerMenu overlay.
 */

import { App } from "astal/gtk4"

export default function PowerButton() {
  return (
    <button
      className="icon-btn power-btn"
      tooltipText="Power menu"
      onClicked={() => App.toggle_window("power-menu")}
    >
      <label className="font-mono text-error" label="󰐥" />
    </button>
  )
}
