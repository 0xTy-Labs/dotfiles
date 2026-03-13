/**
 * modules/bar/Workspaces.ts
 * Workspace indicator pills.
 *
 * Each workspace = a dot. Active workspace = expanding pill (CSS animated).
 * Click to switch. Scroll to cycle.
 */

import { Gtk, Gdk } from "astal/gtk4"
import { bind } from "astal"
import {
  workspaces,
  switchWorkspace,
  cycleWorkspace,
  type WorkspaceState,
} from "../../services/Hyprland"

interface WorkspacesProps {
  monitor: Gdk.Monitor
}

export default function Workspaces({ monitor }: WorkspacesProps) {
  return (
    <eventbox
      className="workspaces"
      onScroll={(_self, event) => {
        const dy = event.get_scroll_deltas()[2]
        if (dy < 0) cycleWorkspace("prev")
        else if (dy > 0) cycleWorkspace("next")
      }}
    >
      <box spacing={6}>
        {bind(workspaces).as(wsList =>
          wsList.slice(0, 10).map(ws => (
            <WorkspaceDot key={ws.id} ws={ws} />
          ))
        )}
      </box>
    </eventbox>
  )
}

function WorkspaceDot({ ws }: { ws: WorkspaceState }) {
  const classes = [
    "workspace-dot",
    ws.active   ? "active"   : "",
    ws.occupied ? "occupied" : "",
    !ws.active && !ws.occupied ? "empty" : "",
  ].filter(Boolean).join(" ")

  return (
    <button
      className={classes}
      tooltipText={`Workspace ${ws.id}${ws.occupied ? " •" : ""}`}
      onClicked={() => switchWorkspace(ws.id)}
    />
  )
}
