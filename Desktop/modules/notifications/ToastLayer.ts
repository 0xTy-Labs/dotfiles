/**
 * modules/notifications/ToastLayer.ts
 * Renders incoming notification toasts.
 *
 * Toasts stack from top-right, newest on top.
 * Each toast auto-dismisses after its timeout (or config timeout).
 * Swipe right (or click ✕) to dismiss early.
 * CRITICAL notifications have no timeout.
 */

import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import { Variable, bind } from "astal"
import Notifd from "gi://AstalNotifd"
import { timeout } from "astal/time"
import { getConfig } from "../../services/Config"

interface ToastEntry {
  id:         number
  notif:      Notifd.Notification
  visible:    Variable<boolean>
}

const toasts = Variable<ToastEntry[]>([])

export default function ToastLayer(monitor: Gdk.Monitor) {
  const cfg    = getConfig()
  const notifd = Notifd.get_default()

  notifd.connect("notified", (_self, id) => {
    const notif = notifd.get_notification(id)
    if (!notif) return

    // Cap at maxToasts
    const current = toasts.get()
    const maxT = cfg.notifications.maxToasts

    const entry: ToastEntry = {
      id,
      notif,
      visible: Variable(true),
    }

    // Trim oldest if over limit
    if (current.length >= maxT) {
      const trimmed = current.slice(1)
      toasts.set([...trimmed, entry])
    } else {
      toasts.set([...current, entry])
    }

    // Auto-dismiss (CRITICAL urgency = no timeout)
    const urgency = notif.urgency ?? Notifd.Urgency.NORMAL
    if (urgency !== Notifd.Urgency.CRITICAL) {
      const ms = notif.expireTimeout > 0
        ? notif.expireTimeout
        : cfg.notifications.timeout

      timeout(ms, () => dismissToast(id))
    }
  })

  notifd.connect("resolved", (_self, id) => {
    dismissToast(id)
  })

  function dismissToast(id: number) {
    toasts.set(toasts.get().filter(t => t.id !== id))
  }

  return (
    <window
      name="toast-layer"
      className="toast-layer-window"
      gdkmonitor={monitor}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
      marginTop={48}    // below bar
      marginRight={8}
    >
      <box
        className="toast-stack"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={6}
        valign={Gtk.Align.START}
        halign={Gtk.Align.END}
      >
        {bind(toasts).as(list =>
          list.map(entry => (
            <Toast
              key={entry.id}
              entry={entry}
              onDismiss={() => dismissToast(entry.id)}
            />
          ))
        )}
      </box>
    </window>
  )
}

// ── Individual toast card ──────────────────────────────────────────────────────

interface ToastProps {
  entry:     ToastEntry
  onDismiss: () => void
}

function Toast({ entry, onDismiss }: ToastProps) {
  const { notif } = entry
  const urgency = notif.urgency ?? Notifd.Urgency.NORMAL

  const urgencyClass =
    urgency === Notifd.Urgency.CRITICAL ? "toast-critical" :
    urgency === Notifd.Urgency.LOW      ? "toast-low"      : "toast-normal"

  return (
    <eventbox
      className={`toast-card glass anim-toast-in ${urgencyClass}`}
      onButtonPressed={(_self, event) => {
        if (event.get_button()[1] === 1) {
          // Left click: invoke default action
          const defaultAction = notif.actions?.find(a => a.id === "default")
          if (defaultAction) notif.invoke("default")
          onDismiss()
        }
      }}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={0}>

        {/* Header row */}
        <box className="toast-header" spacing={8}>
          {/* App icon */}
          {notif.appIcon
            ? <image className="toast-app-icon" iconName={notif.appIcon} pixelSize={16} />
            : <label className="toast-app-icon font-mono text-muted" label="󰅪" />
          }

          {/* App name */}
          <label
            className="toast-app-name text-xs text-muted font-semi"
            label={notif.appName ?? "Notification"}
            hexpand
            halign={Gtk.Align.START}
          />

          {/* Dismiss button */}
          <button
            className="toast-dismiss"
            onClicked={onDismiss}
          >
            <label className="font-mono text-muted text-xs" label="✕" />
          </button>
        </box>

        {/* Content row */}
        <box className="toast-content" spacing={8}>
          {/* Image if any */}
          {notif.image && (
            <image
              className="toast-image"
              file={notif.image}
              pixelSize={48}
            />
          )}

          <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand>
            {/* Summary */}
            <label
              className="toast-summary text-md font-semi"
              label={notif.summary ?? ""}
              halign={Gtk.Align.START}
              ellipsize={3}
              maxWidthChars={38}
              visible={!!(notif.summary)}
            />

            {/* Body */}
            <label
              className="toast-body text-sm text-muted"
              label={notif.body ?? ""}
              halign={Gtk.Align.START}
              useMarkup
              wrap
              wrapMode={2}   // WORD_CHAR
              maxWidthChars={38}
              lines={3}
              ellipsize={3}
              visible={!!(notif.body)}
            />
          </box>
        </box>

        {/* Actions row */}
        {notif.actions && notif.actions.length > 0 && (
          <box className="toast-actions" spacing={4}>
            {notif.actions
              .filter(a => a.id !== "default")
              .slice(0, 3)
              .map(action => (
                <button
                  key={action.id}
                  className="toast-action-btn"
                  onClicked={() => {
                    notif.invoke(action.id)
                    onDismiss()
                  }}
                >
                  <label className="text-xs" label={action.label} />
                </button>
              ))
            }
          </box>
        )}

      </box>
    </eventbox>
  )
}
