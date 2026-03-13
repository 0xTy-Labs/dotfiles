/**
 * modules/widgets/SysMonitor.ts
 * System resource monitor — CPU, RAM, disk, network throughput.
 *
 * PERFORMANCE RULES:
 *   - Only mounts when first shown (lazy creation)
 *   - Polls /proc/* every 2s ONLY while visible
 *   - Destroys polling interval when hidden
 *   - Uses a ring-buffer of 30 samples for sparkline graphs
 */

import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import { Variable, bind } from "astal"
import { interval } from "astal/time"
import { execAsync } from "astal/process"
import { readFile } from "astal/file"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SystemStats {
  cpuPercent:   number
  ramUsedMb:    number
  ramTotalMb:   number
  ramPercent:   number
  swapUsedMb:   number
  swapTotalMb:  number
  diskUsedGb:   number
  diskTotalGb:  number
  diskPercent:  number
  netRxKbs:     number    // KB/s receive
  netTxKbs:     number    // KB/s transmit
  uptime:       string
  loadAvg:      string
}

const HISTORY_LEN = 30   // 30 × 2s = 60s window

// ── Stat readers ──────────────────────────────────────────────────────────────

let prevCpuIdle  = 0
let prevCpuTotal = 0
let prevNetRx    = 0
let prevNetTx    = 0

async function readStats(): Promise<SystemStats> {
  const [cpuLine, memRaw, diskRaw, netRaw, uptimeRaw, loadRaw] = await Promise.all([
    execAsync(["bash", "-c", "head -1 /proc/stat"]),
    readFile("/proc/meminfo"),
    execAsync(["df", "-BG", "/"]),
    execAsync(["bash", "-c", "cat /proc/net/dev | awk 'NR>2{sum_rx+=$2; sum_tx+=$10} END{print sum_rx, sum_tx}'"]),
    execAsync(["bash", "-c", "uptime -p | sed 's/up //' | sed 's/ hours\\?/h/' | sed 's/ minutes\\?/m/'"]),
    execAsync(["bash", "-c", "cut -d' ' -f1-3 /proc/loadavg"]),
  ])

  // CPU
  const cpuNums = cpuLine.trim().split(/\s+/).slice(1).map(Number)
  const idle  = cpuNums[3]
  const total = cpuNums.reduce((a, b) => a + b, 0)
  const diffIdle  = idle  - prevCpuIdle
  const diffTotal = total - prevCpuTotal
  const cpuPercent = diffTotal === 0 ? 0 : Math.round((1 - diffIdle / diffTotal) * 100)
  prevCpuIdle  = idle
  prevCpuTotal = total

  // Memory
  const memLines: Record<string, number> = {}
  for (const line of memRaw.split("\n")) {
    const [key, val] = line.split(":")
    if (key && val) memLines[key.trim()] = parseInt(val.trim()) / 1024 // KB → MB
  }
  const ramTotal = memLines["MemTotal"] ?? 0
  const ramFree  = (memLines["MemFree"] ?? 0) + (memLines["Buffers"] ?? 0) + (memLines["Cached"] ?? 0)
  const ramUsed  = ramTotal - ramFree
  const swapTotal = memLines["SwapTotal"] ?? 0
  const swapFree  = memLines["SwapFree"] ?? 0

  // Disk
  const diskLine = diskRaw.trim().split("\n")[1] ?? ""
  const diskParts = diskLine.split(/\s+/)
  const diskTotal = parseFloat(diskParts[1] ?? "0")
  const diskUsed  = parseFloat(diskParts[2] ?? "0")
  const diskPct   = diskParts[4] ? parseInt(diskParts[4]) : 0

  // Network
  const [rxStr, txStr] = netRaw.trim().split(" ")
  const rx = parseInt(rxStr ?? "0")
  const tx = parseInt(txStr ?? "0")
  const rxKbs = Math.max(0, (rx - prevNetRx) / 2 / 1024)  // bytes/s → KB/s over 2s
  const txKbs = Math.max(0, (tx - prevNetTx) / 2 / 1024)
  prevNetRx = rx
  prevNetTx = tx

  return {
    cpuPercent,
    ramUsedMb:   Math.round(ramUsed),
    ramTotalMb:  Math.round(ramTotal),
    ramPercent:  ramTotal > 0 ? Math.round((ramUsed / ramTotal) * 100) : 0,
    swapUsedMb:  Math.round(swapTotal - swapFree),
    swapTotalMb: Math.round(swapTotal),
    diskUsedGb:  diskUsed,
    diskTotalGb: diskTotal,
    diskPercent: diskPct,
    netRxKbs:    Math.round(rxKbs * 10) / 10,
    netTxKbs:    Math.round(txKbs * 10) / 10,
    uptime:      uptimeRaw.trim(),
    loadAvg:     loadRaw.trim(),
  }
}

// ── Widget ────────────────────────────────────────────────────────────────────

export default function SysMonitor(monitor: Gdk.Monitor) {
  const stats   = Variable<SystemStats | null>(null)
  const cpuHist = Variable<number[]>(Array(HISTORY_LEN).fill(0))
  const ramHist = Variable<number[]>(Array(HISTORY_LEN).fill(0))

  let poller: ReturnType<typeof interval> | null = null

  function startPolling() {
    if (poller) return
    poller = interval(2000, async () => {
      try {
        const s = await readStats()
        stats.set(s)
        cpuHist.set([...cpuHist.get().slice(1), s.cpuPercent])
        ramHist.set([...ramHist.get().slice(1), s.ramPercent])
      } catch (e) {
        console.error("[SysMonitor] stat read error:", e)
      }
    })
    // First read immediately
    readStats().then(s => {
      stats.set(s)
    }).catch(() => {})
  }

  function stopPolling() {
    if (poller) { poller.cancel(); poller = null }
  }

  return (
    <window
      name="sysmonitor"
      className="sysmon-window"
      gdkmonitor={monitor}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
      marginTop={48}
      marginRight={8}
      visible={false}
      onShow={() => startPolling()}
      onHide={() => stopPolling()}
    >
      <box
        className="sysmon-card glass anim-scale-in"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={14}
        widthRequest={280}
      >
        {/* Header */}
        <box spacing={8}>
          <label className="font-mono text-primary text-lg" label="󰍛" />
          <label className="text-md font-semi" label="System" hexpand />
          <button
            className="icon-btn"
            onClicked={() => App.get_window("sysmonitor")?.hide()}
          >
            <label className="font-mono text-muted text-xs" label="✕" />
          </button>
        </box>

        <box className="separator" />

        {bind(stats).as(s => {
          if (!s) return <SkeletonState />
          return (
            <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
              {/* CPU */}
              <StatRow
                icon="󰻠" label="CPU" iconClass="text-primary"
                value={s.cpuPercent} suffix="%"
                history={cpuHist.get()}
                barClass="sysmon-bar-cpu"
              />

              {/* RAM */}
              <StatRow
                icon="󰘚" label="RAM" iconClass="text-secondary"
                value={s.ramPercent}
                detail={`${Math.round(s.ramUsedMb / 1024 * 10) / 10} / ${Math.round(s.ramTotalMb / 1024 * 10) / 10} GB`}
                history={ramHist.get()}
                barClass="sysmon-bar-ram"
              />

              {/* Disk */}
              <StatRow
                icon="󰋊" label="Disk" iconClass="text-tertiary"
                value={s.diskPercent}
                detail={`${s.diskUsedGb} / ${s.diskTotalGb} GB`}
                barClass="sysmon-bar-disk"
              />

              <box className="separator" />

              {/* Network */}
              <box spacing={8}>
                <label className="font-mono text-muted" label="󰛳" />
                <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand>
                  <box spacing={6}>
                    <label className="text-xs text-muted" label="↓" />
                    <label className="text-xs font-mono" label={`${s.netRxKbs} KB/s`} />
                    <label className="text-xs text-muted" label="↑" />
                    <label className="text-xs font-mono" label={`${s.netTxKbs} KB/s`} />
                  </box>
                </box>
              </box>

              <box className="separator" />

              {/* Footer: uptime + load */}
              <box spacing={12}>
                <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand>
                  <label className="text-xs text-muted" label="Uptime" halign={Gtk.Align.START} />
                  <label className="text-xs font-mono" label={s.uptime} halign={Gtk.Align.START} />
                </box>
                <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                  <label className="text-xs text-muted" label="Load avg" halign={Gtk.Align.END} />
                  <label className="text-xs font-mono" label={s.loadAvg} halign={Gtk.Align.END} />
                </box>
              </box>
            </box>
          )
        })}
      </box>
    </window>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatRowProps {
  icon:       string
  label:      string
  iconClass?: string
  value:      number
  suffix?:    string
  detail?:    string
  history?:   number[]
  barClass?:  string
}

function StatRow({
  icon, label, iconClass = "text-primary",
  value, suffix = "%", detail,
  barClass = "",
}: StatRowProps) {
  const color =
    value >= 90 ? "high" :
    value >= 70 ? "med"  : "low"

  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
      <box spacing={8}>
        <label className={`font-mono ${iconClass}`} label={icon} />
        <label className="text-xs font-semi" label={label} hexpand />
        {detail && (
          <label className="text-xs text-muted font-mono" label={detail} />
        )}
        <label
          className={`text-xs font-mono sysmon-val-${color}`}
          label={`${value}${suffix}`}
        />
      </box>
      <levelbar
        className={`sysmon-bar ${barClass} sysmon-bar-${color}`}
        value={value / 100}
        minValue={0}
        maxValue={1}
        heightRequest={4}
      />
    </box>
  )
}

function SkeletonState() {
  return (
    <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      {[1, 2, 3].map(i => (
        <box key={i} orientation={Gtk.Orientation.VERTICAL} spacing={4}>
          <box className="skeleton" heightRequest={12} />
          <box className="skeleton" heightRequest={4} />
        </box>
      ))}
    </box>
  )
}
