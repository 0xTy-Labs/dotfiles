/**
 * modules/notifications/Center.ts
 * Notification history panel — slides in from the right.
 * Toggle via: ags request 'toggle notifications'
 *
 * Features:
 *   - Grouped by app
 *   - Clear all button
 *   - Per-notification dismiss
 *   - Scrollable history
 */

import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import { Variable, bind } from "astal"
import Notifd from "gi://AstalNotifd"

export default function NotificationCenter(monitor: Gdk.Monitor) {
  const notifd = Notifd.get_default()

  return (
    <window
      name="notification-center"
      className="notif-center-window"
      gdkmonitor={monitor}
      layer={Astal.Layer.OVERLAY}
      anchor={
        Astal.WindowAnchor.TOP   |
        Astal.WindowAnchor.RIGHT |
        Astal.WindowAnchor.BOTTOM
      }
      visible={false}
    >
      <box
        className="notif-center glass-solid anim-slide-in-right"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={0}
        widthRequest={360}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <box className="notif-center-header" spacing={8}>
          <label className="font-mono text-primary" label="󰂚" />
          <label className="text-md font-semi" label="Notifications" hexpand />
          <label
            className="notif-count text-xs text-muted pill"
            label={bind(notifd, "notifications").as(
              ns => String(ns.length)
            )}
            visible={bind(notifd, "notifications").as(ns => ns.length > 0)}
          />
          <button
            className="icon-btn"
            tooltipText="Clear all"
            onClicked={() => notifd.notifications.forEach(n => n.dismiss())}
            visible={bind(notifd, "notifications").as(ns => ns.length > 0)}
          >
            <label className="font-mono text-muted text-sm" label="󰆴" />
          </button>
          <button
            className="icon-btn"
            tooltipText="Close"
            onClicked={() => App.get_window("notification-center")?.hide()}
          >
            <label className="font-mono text-muted" label="✕" />
          </button>
        </box>

        <box className="separator" />

        {/* ── Notification list ───────────────────────────────────── */}
        <scrolledwindow
          className="notif-scroll"
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          vexpand
        >
          <box orientation={Gtk.Orientation.VERTICAL} spacing={6} className="notif-list">
            {bind(notifd, "notifications").as(notifications => {
              if (notifications.length === 0) {
                return <EmptyState />
              }

              // Group by app name
              const groups = new Map<string, typeof notifications>()
              for (const n of [...notifications].reverse()) {
                const key = n.appName ?? "Other"
                if (!groups.has(key)) groups.set(key, [])
                groups.get(key)!.push(n)
              }

              return [...groups.entries()].map(([appName, notifs]) => (
                <NotifGroup key={appName} appName={appName} notifs={notifs} />
              ))
            })}
          </box>
        </scrolledwindow>

        {/* ── DND footer ─────────────────────────────────────────── */}
        <DndFooter />
      </box>
    </window>
  )
}

// ── Grouped notifications ─────────────────────────────────────────────────────

function NotifGroup({
  appName,
  notifs,
}: {
  appName: string
  notifs:  Notifd.Notification[]
}) {
  const collapsed = Variable<boolean>(false)

  return (
    <box className="notif-group" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
      {/* Group header */}
      <button
        className="notif-group-header"
        onClicked={() => collapsed.set(!collapsed.get())}
      >
        <box spacing={8}>
          {notifs[0]?.appIcon
            ? <image iconName={notifs[0].appIcon} pixelSize={14} />
            : <label className="font-mono text-muted" label="󰅪" />
          }
          <label
            className="text-xs font-semi text-muted"
            label={appName}
            hexpand
            halign={Gtk.Align.START}
          />
          <label
            className="text-xs text-muted"
            label={bind(collapsed).as(c => c ? "›" : "⌄")}
          />
        </box>
      </button>

      {/* Notifications in group */}
      <revealer
        revealChild={bind(collapsed).as(c => !c)}
        transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
        transitionDuration={200}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          {notifs.map(n => (
            <HistoryCard key={n.id} notif={n} />
          ))}
        </box>
      </revealer>
    </box>
  )
}

// ── History card (in panel, not a toast) ─────────────────────────────────────

function HistoryCard({ notif }: { notif: Notifd.Notification }) {
  return (
    <box className="notif-history-card glass-sm" orientation={Gtk.Orientation.VERTICAL} spacing={4}>
      <box spacing={8}>
        <box orientation={Gtk.Orientation.VERTICAL} hexpand spacing={2}>
          <label
            className="text-sm font-semi"
            label={notif.summary ?? ""}
            halign={Gtk.Align.START}
            ellipsize={3}
            maxWidthChars={34}
            visible={!!(notif.summary)}
          />
          <label
            className="text-xs text-muted"
            label={notif.body ?? ""}
            halign={Gtk.Align.START}
            wrap
            wrapMode={2}
            maxWidthChars={34}
            lines={3}
            ellipsize={3}
            visible={!!(notif.body)}
          />
        </box>
        <button
          className="icon-btn"
          onClicked={() => notif.dismiss()}
        >
          <label className="font-mono text-muted text-xs" label="✕" />
        </button>
      </box>
    </box>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      spacing={8}
      valign={Gtk.Align.CENTER}
      halign={Gtk.Align.CENTER}
      vexpand
    >
      <label className="font-mono text-muted" label="󰂛" />
      <label className="text-sm text-muted" label="No notifications" />
    </box>
  )
}

// ── DND footer ────────────────────────────────────────────────────────────────

function DndFooter() {
  const dnd = Variable<boolean>(false)

  async function toggleDnd() {
    const next = !dnd.get()
    dnd.set(next)
    const { execAsync } = await import("astal/process")
    await execAsync(["dunstctl", "set-paused", String(next)])
  }

  return (
    <box className="notif-center-footer" spacing={8}>
      <label className="text-xs text-muted" label="Do not disturb" hexpand />
      <button
        className={bind(dnd).as(d => `dnd-toggle ${d ? "active" : ""}`)}
        onClicked={toggleDnd}
        tooltipText="Toggle Do Not Disturb"
      >
        <label
          className="font-mono text-sm"
          label={bind(dnd).as(d => d ? "󰂛" : "󰂚")}
        />
      </button>
    </box>
  )
}
