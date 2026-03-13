/**
 * services/index.ts
 * Re-exports all service singletons for clean imports.
 *
 * Usage:
 *   import { getConfig, initHyprland, applyTheme } from "../services"
 */

export { loadConfig, getConfig }   from "./Config"
export { applyTheme }              from "./Theming"
export { initHyprland,
         workspaces,
         activeWorkspaceId,
         activeWindowTitle,
         activeWindowClass,
         switchWorkspace,
         cycleWorkspace,
         dispatch }                from "./Hyprland"
export { initWallpaper,
         setWallpaper,
         pickWallpaper,
         currentWallpaper }        from "./Wallpaper"
