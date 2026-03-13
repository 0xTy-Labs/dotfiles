/**
 * modules/bar/SysTray.ts
 * System tray powered by AstalTray.
 * Renders app tray icons with left-click activate and right-click menu.
 */

import { Gtk } from "astal/gtk4"
import { bind } from "astal"
import Tray from "gi://AstalTray"

export default function SysTray() {
  const tray = Tray.get_default()

  return (
    <box
      className="systray"
      spacing={2}
    >
      {bind(tray, "items").as(items =>
        items.map(item => <TrayItem item={item} key={item.itemId} />)
      )}
    </box>
  )
}

function TrayItem({ item }: { item: Tray.TrayItem }) {
  // Build a GtkMenu from the item's MenuModel for right-click
  let menu: Gtk.PopoverMenu | null = null

  if (item.menuModel) {
    menu = Gtk.PopoverMenu.new_from_model(item.menuModel)
  }

  return (
    <button
      className="tray-item icon-btn"
      tooltipText={bind(item, "tooltipMarkup").as(t => t || item.title || "")}
      onClicked={(self) => {
        // Left click: activate
        item.activate(0, 0)
      }}
      onButtonPressed={(self, event) => {
        if (event.get_button()[1] === 3) {
          // Right click: show menu
          if (menu) {
            menu.set_parent(self)
            menu.popup()
          } else {
            item.contextMenu(0, 0)
          }
        }
      }}
    >
      <image
        gIcon={bind(item, "gicon")}
        iconSize={Gtk.IconSize.NORMAL}
        pixelSize={16}
      />
    </button>
  )
}
