/**
 * modules/widgets/Weather.ts
 * Weather widget using Open-Meteo API (free, no API key).
 * Location from IP geolocation via ip-api.com (fallback: manual lat/lon).
 *
 * Cache: 30 min — only re-fetches when stale or explicitly refreshed.
 * Lazy: Only initialises on first show.
 */

import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import { Variable, bind } from "astal"
import { execAsync } from "astal/process"
import { writeFileSync, readFile } from "astal/file"
import GLib from "gi://GLib"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Location {
  city:  string
  lat:   number
  lon:   number
}

interface WeatherCurrent {
  temp:        number
  feelsLike:   number
  humidity:    number
  windSpeed:   number
  weatherCode: number
  isDay:       boolean
}

interface WeatherDaily {
  date:        string
  tempMin:     number
  tempMax:     number
  weatherCode: number
  precipProb:  number
}

interface WeatherData {
  location:  Location
  current:   WeatherCurrent
  daily:     WeatherDaily[]   // today + 2 days
  fetchedAt: number           // epoch ms
}

// ── WMO weather code → icon + label ──────────────────────────────────────────

function wmoIcon(code: number, isDay: boolean): string {
  if (code === 0)                  return isDay ? "󰖙" : "󰖔"   // Clear
  if (code <= 2)                   return isDay ? "󰖕" : "󰖕"   // Partly cloudy
  if (code === 3)                  return "󰖐"                   // Overcast
  if (code <= 49)                  return "󰖑"                   // Fog/mist
  if (code <= 57)                  return "󰖗"                   // Drizzle
  if (code <= 67)                  return "󰖖"                   // Rain
  if (code <= 77)                  return "󰖘"                   // Snow
  if (code <= 82)                  return "󰖖"                   // Showers
  if (code <= 86)                  return "󰖘"                   // Snow showers
  if (code <= 99)                  return "󰖓"                   // Thunderstorm
  return "󰖐"
}

function wmoLabel(code: number): string {
  if (code === 0)    return "Clear sky"
  if (code <= 2)     return "Partly cloudy"
  if (code === 3)    return "Overcast"
  if (code <= 49)    return "Foggy"
  if (code <= 57)    return "Drizzle"
  if (code <= 67)    return "Rainy"
  if (code <= 77)    return "Snowy"
  if (code <= 82)    return "Showers"
  if (code <= 86)    return "Snow showers"
  if (code <= 99)    return "Thunderstorm"
  return "Unknown"
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

const CACHE_DIR  = `${GLib.get_user_cache_dir()}/axdots`
const CACHE_PATH = `${CACHE_DIR}/weather.json`
const CACHE_TTL  = 30 * 60 * 1000  // 30 minutes

async function fetchLocation(): Promise<Location> {
  const raw = await execAsync([
    "curl", "-sf", "--max-time", "5",
    "http://ip-api.com/json/?fields=city,lat,lon",
  ])
  const data = JSON.parse(raw)
  return { city: data.city ?? "Unknown", lat: data.lat, lon: data.lon }
}

async function fetchWeather(loc: Location): Promise<WeatherData> {
  const url = [
    "https://api.open-meteo.com/v1/forecast",
    `?latitude=${loc.lat}&longitude=${loc.lon}`,
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m",
    ",wind_speed_10m,weather_code,is_day",
    "&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
    "&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto&forecast_days=3",
  ].join("")

  const raw  = await execAsync(["curl", "-sf", "--max-time", "8", url])
  const data = JSON.parse(raw)

  const cur = data.current
  const d   = data.daily

  return {
    location: loc,
    current: {
      temp:        Math.round(cur.temperature_2m),
      feelsLike:   Math.round(cur.apparent_temperature),
      humidity:    cur.relative_humidity_2m,
      windSpeed:   Math.round(cur.wind_speed_10m),
      weatherCode: cur.weather_code,
      isDay:       cur.is_day === 1,
    },
    daily: d.time.slice(0, 3).map((date: string, i: number) => ({
      date,
      tempMin:     Math.round(d.temperature_2m_min[i]),
      tempMax:     Math.round(d.temperature_2m_max[i]),
      weatherCode: d.weather_code[i],
      precipProb:  d.precipitation_probability_max[i] ?? 0,
    })),
    fetchedAt: Date.now(),
  }
}

async function loadWeather(forceRefresh = false): Promise<WeatherData | null> {
  // Try cache first
  if (!forceRefresh) {
    try {
      const raw   = readFile(CACHE_PATH)
      const data  = JSON.parse(raw) as WeatherData
      const stale = Date.now() - data.fetchedAt > CACHE_TTL
      if (!stale) return data
    } catch { /* cache miss — fetch fresh */ }
  }

  try {
    const loc  = await fetchLocation()
    const data = await fetchWeather(loc)
    await execAsync(["mkdir", "-p", CACHE_DIR])
    writeFileSync(CACHE_PATH, JSON.stringify(data))
    return data
  } catch (e) {
    console.error("[Weather] Fetch failed:", e)
    return null
  }
}

// ── Widget ────────────────────────────────────────────────────────────────────

export default function Weather(monitor: Gdk.Monitor) {
  const weather  = Variable<WeatherData | null>(null)
  const loading  = Variable<boolean>(false)
  let initialised = false

  async function refresh(force = false) {
    loading.set(true)
    const data = await loadWeather(force)
    weather.set(data)
    loading.set(false)
  }

  const dayLabels = ["Today", "Tomorrow", ""]

  return (
    <window
      name="weather-widget"
      className="weather-window"
      gdkmonitor={monitor}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
      marginTop={48}
      marginRight={296}   // offset left of sysmonitor
      visible={false}
      onShow={() => {
        if (!initialised) { initialised = true; refresh() }
      }}
    >
      <box
        className="weather-card glass anim-scale-in"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={12}
        widthRequest={240}
      >
        {/* Header */}
        <box spacing={8}>
          <label className="font-mono text-tertiary text-lg" label="󰖙" />
          <label className="text-md font-semi" label="Weather" hexpand />
          <button
            className="icon-btn"
            tooltipText="Refresh"
            onClicked={() => refresh(true)}
          >
            <label
              className={bind(loading).as(l =>
                `font-mono text-muted text-xs ${l ? "spinning" : ""}`
              )}
              label="󰑓"
            />
          </button>
          <button
            className="icon-btn"
            onClicked={() => App.get_window("weather-widget")?.hide()}
          >
            <label className="font-mono text-muted text-xs" label="✕" />
          </button>
        </box>

        {bind(weather).as(w => {
          if (!w) {
            return (
              <box orientation={Gtk.Orientation.VERTICAL} spacing={8} valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
                <label
                  className={bind(loading).as(l => `font-mono text-muted text-2xl ${l ? "spinning" : ""}`)}
                  label={bind(loading).as(l => l ? "󰑓" : "󰖑")}
                />
                <label
                  className="text-xs text-muted"
                  label={bind(loading).as(l => l ? "Fetching weather…" : "No data")}
                />
              </box>
            )
          }

          const { current: cur, location: loc, daily } = w

          return (
            <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>

              {/* Current conditions */}
              <box spacing={12} valign={Gtk.Align.CENTER}>
                <label
                  className="font-mono text-tertiary weather-main-icon"
                  label={wmoIcon(cur.weatherCode, cur.isDay)}
                />
                <box orientation={Gtk.Orientation.VERTICAL} spacing={2} hexpand>
                  <label
                    className="text-4xl font-semi weather-temp"
                    label={`${cur.temp}°`}
                    halign={Gtk.Align.START}
                  />
                  <label
                    className="text-xs text-muted"
                    label={wmoLabel(cur.weatherCode)}
                    halign={Gtk.Align.START}
                  />
                  <label
                    className="text-xs text-muted"
                    label={loc.city}
                    halign={Gtk.Align.START}
                  />
                </box>
              </box>

              {/* Details row */}
              <box spacing={0}>
                <WeatherDetail icon="󰖎" label={`${cur.feelsLike}°`} tooltip="Feels like" />
                <WeatherDetail icon="󰖒" label={`${cur.humidity}%`}  tooltip="Humidity" />
                <WeatherDetail icon="󰞀" label={`${cur.windSpeed}km/h`} tooltip="Wind speed" />
              </box>

              <box className="separator" />

              {/* 3-day forecast */}
              <box spacing={0}>
                {daily.slice(0, 3).map((day, i) => (
                  <ForecastDay
                    key={day.date}
                    label={i < 2 ? dayLabels[i] : new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}
                    day={day}
                  />
                ))}
              </box>

            </box>
          )
        })}
      </box>
    </window>
  )
}

function WeatherDetail({ icon, label, tooltip }: { icon: string; label: string; tooltip: string }) {
  return (
    <box
      className="weather-detail"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={2}
      hexpand
      halign={Gtk.Align.CENTER}
      tooltipText={tooltip}
    >
      <label className="font-mono text-muted" label={icon} />
      <label className="text-xs font-mono" label={label} />
    </box>
  )
}

function ForecastDay({ label, day }: { label: string; day: WeatherDaily }) {
  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      spacing={4}
      hexpand
      halign={Gtk.Align.CENTER}
    >
      <label className="text-xs text-muted" label={label} />
      <label className="font-mono text-lg" label={wmoIcon(day.weatherCode, true)} />
      <label className="text-xs font-semi" label={`${day.tempMax}°`} />
      <label className="text-xs text-muted" label={`${day.tempMin}°`} />
      {day.precipProb > 20 && (
        <label className="text-xs text-primary" label={`${day.precipProb}%`} />
      )}
    </box>
  )
}
