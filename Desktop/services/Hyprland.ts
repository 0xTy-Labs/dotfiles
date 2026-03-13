/**
 * services/Hyprland.ts
 * Thin wrapper around astal-hyprland for workspaces, windows, and IPC commands.
 * All modules import from here — don't import astal-hyprland directly.
 */

import Hyprland from "gi://AstalHyprland"
import { Variable } from "astal"

// ── Singleton instance ─────────────────────────────────────────────────────────

let _hypr: Hyprland.Hyprland | null = null

export function initHyprland() {
  _hypr = Hyprland.Hyprland.get_default()

  _hypr.connect("notify::focused-workspace", () => {
    activeWorkspaceId.set(_hypr!.focused_workspace?.id ?? 1)
  })

  _hypr.connect("notify::focused-client", () => {
    const client = _hypr!.focused_client
    activeWindowTitle.set(
      client?.title   ?? "",
    )
    activeWindowClass.set(
      client?.class_name ?? "",
    )
  })

  _hypr.connect("workspace-added",   () => refreshWorkspaces())
  _hypr.connect("workspace-removed", () => refreshWorkspaces())
  _hypr.connect("client-added",      () => refreshWorkspaces())
  _hypr.connect("client-removed",    () => refreshWorkspaces())

  refreshWorkspaces()
  console.log("[Hyprland] IPC service started")
}

function getHypr(): Hyprland.Hyprland {
  if (!_hypr) throw new Error("[Hyprland] Service not initialised — call initHyprland() first")
  return _hypr
}

// ── Reactive state ─────────────────────────────────────────────────────────────

export const activeWorkspaceId = Variable<number>(1)
export const activeWindowTitle  = Variable<string>("")
export const activeWindowClass  = Variable<string>("")

export interface WorkspaceState {
  id: number
  name: string
  active: boolean
  occupied: boolean  // has clients
  monitorId: number
}

export const workspaces = Variable<WorkspaceState[]>([])

function refreshWorkspaces() {
  const hypr = getHypr()
  const focused = hypr.focused_workspace?.id ?? 1
  const ws: WorkspaceState[] = []

  // Always show at least 10 workspaces (Ambxst behaviour)
  const ids = new Set<number>()
  for (const w of hypr.workspaces) ids.add(w.id)
  for (let i = 1; i <= 10; i++) ids.add(i)

  const sortedIds = [...ids].sort((a, b) => a - b)

  for (const id of sortedIds) {
    const existing = hypr.workspaces.find(w => w.id === id)
    ws.push({
      id,
      name:      existing?.name ?? String(id),
      active:    id === focused,
      occupied:  (existing?.client_count ?? 0) > 0,
      monitorId: existing?.monitor?.id ?? 0,
    })
  }

  workspaces.set(ws)
}

// ── IPC helpers ─────────────────────────────────────────────────────────────────

export function dispatch(cmd: string, ...args: (string | number)[]): void {
  const hypr = getHypr()
  hypr.message_async(`dispatch ${cmd} ${args.join(" ")}`, null, () => {})
}

export function switchWorkspace(id: number): void {
  dispatch("workspace", id)
}

export function moveWindowToWorkspace(id: number): void {
  dispatch("movetoworkspace", id)
}

/** Focus next/prev workspace */
export function cycleWorkspace(direction: "next" | "prev"): void {
  dispatch(direction === "next" ? "workspace" : "workspace", `e${direction === "next" ? "+1" : "-1"}`)
}

/** Toggle Hyprland gamemode (disables blur/animations for perf) */
export function setGameMode(enabled: boolean): void {
  const hypr = getHypr()
  hypr.message_async(
    `keyword ${enabled ? "animations:enabled 0\ndecoration:blur:enabled 0" : "animations:enabled 1\ndecoration:blur:enabled 1"}`,
    null,
    () => {}
  )
}

/** Reload the Hyprland config */
export function reloadHyprland(): void {
  const hypr = getHypr()
  hypr.message_async("reload", null, () => {})
}

/** Get active client title reactively */
export function useActiveTitle(): Variable<string> {
  return activeWindowTitle
}

/** Get workspaces for a specific monitor */
export function workspacesForMonitor(monitorId: number): WorkspaceState[] {
  return workspaces.get().filter(w => w.monitorId === monitorId || monitorId === 0)
}
