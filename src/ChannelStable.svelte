<script lang="ts">
  import { onMount } from 'svelte'

  type Loc = { id?: number; name: string; latitude: number | string; longitude: number | string; country?: string; admin1?: string; timezone?: string }
  type Section = { id: string; type: string; title: string; enabled: boolean; days?: number; hours?: number; message?: string; metrics?: string[] }
  type Config = { channelName: string; location: Loc; otherLocations: Loc[]; locationMode: 'single' | 'multi'; otherMunicipalityMode?: 'grouped' | 'individual'; backgroundColor: string; textColor: string; cardColor: string; randomImages: boolean; theme: string; channelNameStyle: string; showLive: boolean; showProgress: boolean; showTimerRing: boolean; showChannelName: boolean; showSectionTitles: boolean; transitionSeconds: number; sections: Section[] }
  type Day = { date: string; max: number; min: number; code: number; precipitation: number; rainProbability: number; sunrise?: string; sunset?: string; uv: number; wind: number }
  type Hour = { time: string; temperature: number; code: number; precipitation: number; wind: number }
  type Weather = { current: { temperature: number; apparent: number; humidity: number; wind: number; code: number }; daily: Day[]; past: Day[]; hourly: Hour[] }
  type Slide = { key: string; section: Section; location: Loc; mode: 'normal' | 'other-grouped' | 'other-single'; title: string }

  const caceres: Loc = { name: 'Cáceres', latitude: 39.4765, longitude: -6.3722, timezone: 'Europe/Madrid' }
  const defaultSections: Section[] = [
    { id: 'current', type: 'current', title: 'Tiempo actual', enabled: true },
    { id: 'forecast', type: 'forecast', title: 'Previsión próximos días', enabled: true, days: 5 },
    { id: 'hourly', type: 'hourly', title: 'Previsión por horas', enabled: false, hours: 8 },
    { id: 'future-extremes', type: 'future-extremes', title: 'Máximas y mínimas próximos días', enabled: true, days: 7 },
    { id: 'past-extremes', type: 'past-extremes', title: 'Máximas y mínimas días anteriores', enabled: false, days: 5 },
    { id: 'rain', type: 'rain', title: 'Lluvia próximos días', enabled: false, days: 5 },
    { id: 'wind', type: 'wind', title: 'Viento próximos días', enabled: false, days: 5 },
    { id: 'sun', type: 'sun', title: 'Amanecer y atardecer', enabled: false, days: 4 },
    { id: 'summary', type: 'summary', title: 'Resumen del día', enabled: false },
    { id: 'interest', type: 'interest', title: 'Más datos de interés', enabled: true, metrics: ['uv', 'sunrise', 'sunset', 'wind', 'humidity'] },
    { id: 'message', type: 'message', title: 'Mensaje personalizado', enabled: false, message: 'Información meteorológica actualizada automáticamente.' },
    { id: 'other-current', type: 'other-current', title: 'Tiempo actual en otros municipios', enabled: false },
    { id: 'other-forecast', type: 'other-forecast', title: 'Previsión en otros municipios', enabled: false, days: 3 },
  ]
  const defaultConfig: Config = { channelName: 'TiempoTV Cáceres', location: caceres, otherLocations: [], locationMode: 'single', otherMunicipalityMode: 'grouped', backgroundColor: '#06162f', textColor: '#f8fafc', cardColor: '#0f172a', randomImages: true, theme: 'ticker', channelNameStyle: 'default', showLive: true, showProgress: true, showTimerRing: false, showChannelName: true, showSectionTitles: true, transitionSeconds: 12, sections: structuredClone(defaultSections) }
  const images = [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1499346030926-9a72daac6c63?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=80',
  ]

  let config: Config = structuredClone(defaultConfig)
  let weatherByKey: Record<string, Weather> = {}
  let loading = true
  let errorMessage = ''
  let activeSlideIndex = 0
  let timerKey = 0
  let slideTimer: number | undefined
  let lastUpdated = ''

  $: slides = buildSlides(config)
  $: if (slides.length && activeSlideIndex >= slides.length) activeSlideIndex = 0
  $: activeSlide = slides[activeSlideIndex]
  $: activeWeather = activeSlide ? getWeather(activeSlide.location) : Object.values(weatherByKey)[0]
  $: channelStyle = `--channel-bg:${config.backgroundColor}; --channel-text:${config.textColor}; --channel-card:${hexToRgba(config.cardColor, 0.78)}; --channel-image:url('${images[activeSlideIndex % images.length]}'); --section-cycle:${Math.max(4, config.transitionSeconds)}s`
  $: channelClass = `tv-screen theme-${config.theme} name-${config.channelNameStyle}`

  onMount(() => {
    config = loadConfigFromUrl()
    void loadWeather()
    startRotation()
    window.addEventListener('keydown', onKey)
    return () => { window.clearInterval(slideTimer); window.removeEventListener('keydown', onKey) }
  })

  function loadConfigFromUrl(): Config {
    const raw = new URLSearchParams(window.location.search).get('config')
    if (!raw) return normalizeConfig(defaultConfig)
    try {
      const normalized = raw.replaceAll('-', '+').replaceAll('_', '/')
      const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
      return normalizeConfig(JSON.parse(decodeURIComponent(escape(atob(padded)))))
    } catch {
      return normalizeConfig(defaultConfig)
    }
  }

  function normalizeConfig(value: Partial<Config>): Config {
    const oldByType = new Map((value.sections ?? []).map((section) => [section.type, section]))
    return {
      ...structuredClone(defaultConfig),
      ...value,
      location: value.location ? normLoc(value.location) : caceres,
      otherLocations: (value.otherLocations ?? []).map(normLoc),
      otherMunicipalityMode: value.otherMunicipalityMode ?? 'grouped',
      showTimerRing: value.showTimerRing ?? false,
      sections: defaultSections.map((section) => ({ ...structuredClone(section), ...(oldByType.get(section.type) ?? {}) })),
    }
  }

  function buildSlides(value: Config): Slide[] {
    const enabled = value.sections.filter((section) => section.enabled)
    const base = enabled.filter((section) => !section.type.startsWith('other-'))
    const other = enabled.filter((section) => section.type.startsWith('other-'))
    const locations = unique([value.location, ...value.otherLocations])
    const result: Slide[] = []

    if (value.locationMode === 'multi') {
      for (const location of locations) for (const section of base) result.push({ key: `${keyOf(location)}-${section.id}`, section, location, title: `${section.title} · ${location.name}`, mode: 'normal' })
      return result
    }

    for (const section of base) result.push({ key: `main-${section.id}`, section, location: value.location, title: section.title, mode: 'normal' })
    if (value.otherLocations.length) for (const section of other) {
      if (value.otherMunicipalityMode === 'individual') {
        for (const location of value.otherLocations) result.push({ key: `${section.id}-${keyOf(location)}`, section, location, title: `${section.title}: ${location.name}`, mode: 'other-single' })
      } else {
        result.push({ key: `${section.id}-grouped`, section, location: value.location, title: section.title, mode: 'other-grouped' })
      }
    }
    return result
  }

  async function loadWeather() {
    loading = true
    errorMessage = ''
    const next: Record<string, Weather> = {}
    const results = await Promise.allSettled(unique([config.location, ...config.otherLocations]).map(async (location) => ({ location, weather: await fetchWeather(location) })))
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const keys = altKeys(result.value.location)
        for (const key of keys) next[key] = result.value.weather
      }
    }
    weatherByKey = next
    loading = false
    lastUpdated = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
    if (!Object.keys(next).length) errorMessage = 'No se han podido cargar los datos del tiempo.'
  }

  async function fetchWeather(location: Loc): Promise<Weather> {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', String(Number(location.latitude)))
    url.searchParams.set('longitude', String(Number(location.longitude)))
    url.searchParams.set('timezone', location.timezone || 'auto')
    url.searchParams.set('forecast_days', '14')
    url.searchParams.set('past_days', '10')
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m')
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,uv_index_max,wind_speed_10m_max')
    url.searchParams.set('hourly', 'temperature_2m,weather_code,precipitation,wind_speed_10m')
    const response = await fetch(url)
    if (!response.ok) throw new Error('Open-Meteo')
    return parseWeather(await response.json())
  }

  function parseWeather(data: any): Weather {
    const today = new Date().toISOString().slice(0, 10)
    const now = Date.now()
    const daily = data.daily ?? {}
    const current = data.current ?? {}
    const days: Day[] = (daily.time ?? []).map((date: string, index: number) => {
      const precipitation = n(daily.precipitation_sum?.[index])
      return { date, max: Math.round(n(daily.temperature_2m_max?.[index])), min: Math.round(n(daily.temperature_2m_min?.[index])), code: Math.round(n(daily.weather_code?.[index])), precipitation, rainProbability: precipitation > 0 ? Math.min(100, Math.round(35 + precipitation * 15)) : 0, sunrise: daily.sunrise?.[index], sunset: daily.sunset?.[index], uv: n(daily.uv_index_max?.[index]), wind: Math.round(n(daily.wind_speed_10m_max?.[index], n(current.wind_speed_10m))) }
    })
    const hourly = data.hourly ?? {}
    const hours: Hour[] = (hourly.time ?? []).map((time: string, index: number) => ({ time, temperature: Math.round(n(hourly.temperature_2m?.[index])), code: Math.round(n(hourly.weather_code?.[index])), precipitation: n(hourly.precipitation?.[index]), wind: Math.round(n(hourly.wind_speed_10m?.[index], n(current.wind_speed_10m))) })).filter((hour: Hour) => new Date(hour.time).getTime() >= now - 3600000)
    return { current: { temperature: Math.round(n(current.temperature_2m)), apparent: Math.round(n(current.apparent_temperature, n(current.temperature_2m))), humidity: Math.round(n(current.relative_humidity_2m)), wind: Math.round(n(current.wind_speed_10m)), code: Math.round(n(current.weather_code)) }, daily: days.filter((day) => day.date >= today), past: days.filter((day) => day.date < today).reverse(), hourly: hours }
  }

  function getWeather(location: Loc) {
    for (const key of altKeys(location)) if (weatherByKey[key]) return weatherByKey[key]
    const wantedLat = Number(location.latitude)
    const wantedLon = Number(location.longitude)
    for (const [key, value] of Object.entries(weatherByKey)) {
      const [lat, lon] = key.split(',').map(Number)
      if (Number.isFinite(lat) && Math.abs(lat - wantedLat) < 0.1 && Math.abs(lon - wantedLon) < 0.1) return value
    }
    return Object.values(weatherByKey)[0] ?? null
  }

  function normLoc(location: Loc): Loc { return { ...location, latitude: Number(location.latitude), longitude: Number(location.longitude), timezone: location.timezone || 'auto' } }
  function keyOf(location: Loc) { return `${Number(location.latitude).toFixed(4)},${Number(location.longitude).toFixed(4)}` }
  function altKeys(location: Loc) { return [keyOf(location), location.id ? `id:${location.id}` : '', `name:${location.name.toLowerCase()}`].filter(Boolean) }
  function unique(items: Loc[]) { const map = new Map<string, Loc>(); for (const item of items.filter(Boolean).map(normLoc)) map.set(keyOf(item), item); return [...map.values()] }
  function n(value: unknown, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? number : fallback }
  function hexToRgba(hex: string, alpha: number) { const clean = hex.replace('#', ''); if (clean.length !== 6) return hex; return `rgba(${parseInt(clean.slice(0, 2), 16)}, ${parseInt(clean.slice(2, 4), 16)}, ${parseInt(clean.slice(4, 6), 16)}, ${alpha})` }
  function startRotation() { window.clearInterval(slideTimer); timerKey += 1; slideTimer = window.setInterval(() => nextSlide(), Math.max(4, config.transitionSeconds) * 1000) }
  function nextSlide() { if (!slides.length) return; activeSlideIndex = (activeSlideIndex + 1) % slides.length; timerKey += 1; startRotation() }
  function previousSlide() { if (!slides.length) return; activeSlideIndex = (activeSlideIndex - 1 + slides.length) % slides.length; timerKey += 1; startRotation() }
  function onKey(event: KeyboardEvent) { if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(event.key)) { event.preventDefault(); nextSlide() } if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(event.key)) { event.preventDefault(); previousSlide() } if (event.key === 'Home') { activeSlideIndex = 0; startRotation() } if (event.key === 'End') { activeSlideIndex = Math.max(0, slides.length - 1); startRotation() } }
  function formatDay(date: string) { return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(date)) }
  function formatTime(date?: string) { return date ? new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(date)) : '--:--' }
  function weatherLabel(code: number) { if (code === 0) return 'Despejado'; if ([1, 2].includes(code)) return 'Poco nuboso'; if (code === 3) return 'Cubierto'; if ([45, 48].includes(code)) return 'Niebla'; if ([51, 53, 55, 56, 57].includes(code)) return 'Llovizna'; if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Lluvia'; if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Nieve'; if ([95, 96, 99].includes(code)) return 'Tormenta'; return 'Variable' }
  function iconId(code: number) { if (code === 0) return '01d'; if ([1, 2].includes(code)) return '02d'; if (code === 3) return '04d'; if ([45, 48].includes(code)) return '50d'; if ([51, 53, 55, 56, 57].includes(code)) return '09d'; if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '10d'; if ([71, 73, 75, 77, 85, 86].includes(code)) return '13d'; if ([95, 96, 99].includes(code)) return '11d'; return '03d' }
  function iconUrl(code: number) { return `https://openweathermap.org/img/wn/${iconId(code)}@4x.png` }
</script>

<main class={channelClass} style={channelStyle}><div class:with-image={config.randomImages} class="tv-background"></div><div class="tv-overlay">{#if config.showChannelName}<header class="tv-header"><div class="tv-title-box"><p class="eyebrow">{activeSlide?.location.name ?? config.location.name}</p><h1>{config.channelName}</h1></div>{#if config.showLive}<div class="live-pill">Directo</div>{/if}{#if config.showProgress}<div class="section-progress">{activeSlideIndex + 1}/{slides.length}</div>{/if}</header>{/if}{#if loading}<section class="tv-card tv-center"><p>Cargando datos meteorológicos…</p></section>{:else if errorMessage}<section class="tv-card tv-center"><p>{errorMessage}</p></section>{:else if activeSlide && activeWeather}<section class="tv-card tv-content">{@render ChannelSection(activeSlide, activeWeather)}</section>{:else}<section class="tv-card tv-center"><p>No hay datos listos para {config.location.name}.</p></section>{/if}{#if config.showTimerRing && slides.length > 1}{#key timerKey}<div class="section-timer-ring" style={`--timer-duration:${Math.max(4, config.transitionSeconds)}s`} aria-hidden="true"></div>{/key}{/if}<footer class="tv-footer"><span>Datos: Open-Meteo · iconos OpenWeather</span><span>{lastUpdated}</span></footer><div class="generated-by">Generado por tiempotv.alon.one</div></div></main>

{#snippet WeatherIcon(code: number, size = 'normal')}
  <img class={`weather-icon-img ${size === 'big' ? 'weather-icon-img-big' : ''}`} src={iconUrl(code)} alt={weatherLabel(code)} loading="lazy" decoding="async" />
{/snippet}

{#snippet ChannelSection(slide: Slide, weather: Weather)}
  <div class="channel-section">{#if config.showSectionTitles}<p class="eyebrow section-kicker">{slide.title}</p>{/if}{#if slide.mode === 'other-grouped'}<div class="other-grid">{#each config.otherLocations as location}{@const item = getWeather(location)}{#if item}<article><span>{location.name}</span><strong>{item.current.temperature}°</strong><small>{weatherLabel(item.current.code)}</small></article>{/if}{/each}</div>{:else if slide.section.type === 'current' || slide.section.type === 'other-current'}<div class="current-layout"><div class="big-icon weather-icon-holder">{@render WeatherIcon(weather.current.code, 'big')}</div><div class="current-copy"><h2>{weather.current.temperature}°C</h2><p>{slide.location.name} · {weatherLabel(weather.current.code)}</p><div class="weather-stats"><span>Sensación {weather.current.apparent}°</span><span>Humedad {weather.current.humidity}%</span><span>Viento {weather.current.wind} km/h</span></div></div></div>{:else if slide.section.type === 'forecast' || slide.section.type === 'other-forecast'}<div class="forecast-grid">{#each weather.daily.slice(0, slide.section.days ?? 5) as day}<article><strong>{formatDay(day.date)}</strong><span class="day-icon">{@render WeatherIcon(day.code)}</span><small>{weatherLabel(day.code)}</small><b>{day.max}° / {day.min}°</b></article>{/each}</div>{:else if slide.section.type === 'hourly'}<div class="hourly-grid extra-grid">{#each weather.hourly.slice(0, slide.section.hours ?? 8) as hour}<article><span>{formatTime(hour.time)}</span><strong>{hour.temperature}°</strong><small>{hour.precipitation} mm · {hour.wind} km/h</small></article>{/each}</div>{:else if slide.section.type === 'future-extremes'}<div class="extremes-grid">{#each weather.daily.slice(0, slide.section.days ?? 7) as day}<article><span>{formatDay(day.date)}</span><strong>{day.max}°</strong><small>{day.min}°</small></article>{/each}</div>{:else if slide.section.type === 'past-extremes'}<div class="extremes-grid">{#each weather.past.slice(0, slide.section.days ?? 5) as day}<article><span>{formatDay(day.date)}</span><strong>{day.max}°</strong><small>{day.min}°</small></article>{/each}</div>{:else if slide.section.type === 'rain'}<div class="interest-grid extra-grid">{#each weather.daily.slice(0, slide.section.days ?? 5) as day}<article><span>{formatDay(day.date)}</span><strong>{day.precipitation} mm</strong><small>{day.rainProbability}% estimado</small></article>{/each}</div>{:else if slide.section.type === 'wind'}<div class="interest-grid extra-grid">{#each weather.daily.slice(0, slide.section.days ?? 5) as day}<article><span>{formatDay(day.date)}</span><strong>{day.wind}</strong><small>km/h</small></article>{/each}</div>{:else if slide.section.type === 'sun'}<div class="interest-grid extra-grid">{#each weather.daily.slice(0, slide.section.days ?? 4) as day}<article><span>{formatDay(day.date)}</span><strong>{formatTime(day.sunrise)}</strong><small>{formatTime(day.sunset)}</small></article>{/each}</div>{:else if slide.section.type === 'summary'}<div class="summary-block"><h2>{weather.current.temperature}°C</h2><p>{slide.location.name}: {weatherLabel(weather.current.code).toLowerCase()}, sensación de {weather.current.apparent}°, viento de {weather.current.wind} km/h y máxima prevista de {weather.daily[0]?.max}°.</p></div>{:else if slide.section.type === 'interest'}<div class="interest-grid">{#if slide.section.metrics?.includes('uv')}<article><span>Índice UV</span><strong>{weather.daily[0]?.uv.toFixed(1)}</strong></article>{/if}{#if slide.section.metrics?.includes('sunrise')}<article><span>Sale el sol</span><strong>{formatTime(weather.daily[0]?.sunrise)}</strong></article>{/if}{#if slide.section.metrics?.includes('sunset')}<article><span>Se pone el sol</span><strong>{formatTime(weather.daily[0]?.sunset)}</strong></article>{/if}{#if slide.section.metrics?.includes('wind')}<article><span>Viento</span><strong>{weather.current.wind} km/h</strong></article>{/if}{#if slide.section.metrics?.includes('humidity')}<article><span>Humedad</span><strong>{weather.current.humidity}%</strong></article>{/if}{#if slide.section.metrics?.includes('precipitation')}<article><span>Lluvia hoy</span><strong>{weather.daily[0]?.precipitation} mm</strong></article>{/if}</div>{:else if slide.section.type === 'message'}<div class="message-block"><p>{slide.section.message}</p></div>{/if}</div>
{/snippet}
