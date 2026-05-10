<script lang="ts">
  import { onMount } from 'svelte'

  type Loc = { id?: number; name: string; latitude: number; longitude: number; country?: string; admin1?: string; timezone?: string }
  type SectionType = 'current' | 'forecast' | 'future-extremes' | 'past-extremes' | 'interest' | 'message' | 'other-current' | 'other-forecast' | 'hourly' | 'rain' | 'wind' | 'sun' | 'summary'
  type Theme = 'minimal' | 'lower-left' | 'split' | 'glass' | 'ticker' | 'poster' | 'dashboard' | 'cinema' | 'vertical' | 'cards'
  type NameStyle = 'default' | 'boxed' | 'pill' | 'huge' | 'corner' | 'hidden-soft'
  type Section = { id: string; type: SectionType; title: string; enabled: boolean; days?: number; hours?: number; message?: string; metrics?: string[] }
  type Config = { channelName: string; location: Loc; otherLocations: Loc[]; locationMode: 'single' | 'multi'; otherMunicipalityMode: 'grouped' | 'individual'; backgroundColor: string; textColor: string; cardColor: string; randomImages: boolean; theme: Theme; channelNameStyle: NameStyle; showLive: boolean; showProgress: boolean; showTimerRing: boolean; showChannelName: boolean; showSectionTitles: boolean; transitionSeconds: number; sections: Section[] }
  type Day = { date: string; max: number; min: number; code: number; precipitation: number; rainProbability: number; sunrise: string; sunset: string; uv: number; wind: number }
  type Hour = { time: string; temperature: number; code: number; precipitation: number; rainProbability: number; wind: number }
  type Weather = { current: { temperature: number; apparent: number; humidity: number; wind: number; code: number }; daily: Day[]; past: Day[]; hourly: Hour[] }
  type Slide = { key: string; section: Section; location: Loc; title: string; mode: 'normal' | 'other-grouped' | 'other-single' }

  const storageKey = 'tiempotv:last-config:expanded-fixed'
  const appBase = import.meta.env.BASE_URL.replace(/\/$/, '')
  const caceres: Loc = { name: 'Cáceres', latitude: 39.4765, longitude: -6.3722, country: 'España', admin1: 'Extremadura', timezone: 'Europe/Madrid' }
  const images = [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1499346030926-9a72daac6c63?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=80',
  ]
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
  const themes: { id: Theme; name: string }[] = [
    { id: 'ticker', name: 'CNN weather' }, { id: 'dashboard', name: 'Weather TV' }, { id: 'minimal', name: 'Minimal' }, { id: 'cards', name: 'Panel público' }, { id: 'glass', name: 'Cristal' }, { id: 'poster', name: 'Póster' }, { id: 'lower-left', name: 'Rótulo inferior' }, { id: 'split', name: 'Split' }, { id: 'cinema', name: 'Cine' }, { id: 'vertical', name: 'Vertical' },
  ]
  const nameStyles: { id: NameStyle; label: string }[] = [{ id: 'default', label: 'Normal' }, { id: 'boxed', label: 'Caja' }, { id: 'pill', label: 'Pastilla' }, { id: 'huge', label: 'Gigante' }, { id: 'corner', label: 'Esquina' }, { id: 'hidden-soft', label: 'Discreto' }]
  const metricOptions = [{ id: 'uv', label: 'UV' }, { id: 'sunrise', label: 'Salida del sol' }, { id: 'sunset', label: 'Puesta del sol' }, { id: 'wind', label: 'Viento' }, { id: 'humidity', label: 'Humedad' }, { id: 'precipitation', label: 'Lluvia' }]
  const sectionTypes = new Set(defaultSections.map((section) => section.type))

  let config: Config = structuredClone(defaultConfig)
  let viewMode: 'configurator' | 'channel' = 'configurator'
  let weatherByKey: Record<string, Weather> = {}
  let loading = false
  let errorMessage = ''
  let lastUpdated = ''
  let activeSlideIndex = 0
  let timerRingKey = 0
  let searchTerm = caceres.name
  let otherSearchTerm = ''
  let searchResults: Loc[] = []
  let otherSearchResults: Loc[] = []
  let searchTimer: number | undefined
  let otherSearchTimer: number | undefined
  let slideTimer: number | undefined
  let draggedSectionId = ''
  let shouldPersist = false
  let requestId = 0

  $: allLocations = unique([config.location, ...config.otherLocations])
  $: enabledSections = config.sections.filter((section) => section.enabled)
  $: slides = makeSlides()
  $: if (slides.length && activeSlideIndex >= slides.length) activeSlideIndex = 0
  $: activeSlide = slides[activeSlideIndex]
  $: activeWeather = activeSlide ? weatherByKey[keyOf(activeSlide.location)] : null
  $: generatedUrl = buildUrl(config)
  $: channelStyle = `--channel-bg:${config.backgroundColor}; --channel-text:${config.textColor}; --channel-card:${hexToRgba(config.cardColor, 0.78)}; --channel-image:url('${images[activeSlideIndex % images.length]}'); --section-cycle:${Math.max(4, config.transitionSeconds)}s`
  $: channelClass = `tv-screen theme-${config.theme} name-${config.channelNameStyle}`
  $: previewClass = `preview-frame theme-${config.theme} name-${config.channelNameStyle}`
  $: if (shouldPersist) saveConfig()

  onMount(() => {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('config')
    const cleanPath = window.location.pathname.replace(new RegExp(`^${appBase}`), '')
    if (cleanPath.startsWith('/canal') && encoded) {
      const decoded = decodeConfig(encoded)
      if (decoded) config = decoded
      viewMode = 'channel'
    } else {
      const stored = loadConfig()
      if (stored) config = stored
      shouldPersist = true
    }
    config = normalizeConfig(config)
    searchTerm = config.location.name
    void refreshWeather(config)
    startRotation()
    window.addEventListener('keydown', handleKeydown)
    return () => { window.clearTimeout(searchTimer); window.clearTimeout(otherSearchTimer); window.clearInterval(slideTimer); window.removeEventListener('keydown', handleKeydown) }
  })

  function makeSlides(): Slide[] {
    const base = enabledSections.filter((section) => !String(section.type).startsWith('other-'))
    const other = enabledSections.filter((section) => String(section.type).startsWith('other-'))
    const result: Slide[] = []
    if (config.locationMode === 'multi') {
      for (const location of allLocations) for (const section of base) result.push({ key: `${keyOf(location)}-${section.id}`, section, location, title: `${section.title} · ${location.name}`, mode: 'normal' })
      return result
    }
    for (const section of base) result.push({ key: `main-${section.id}`, section, location: config.location, title: section.title, mode: 'normal' })
    if (config.otherLocations.length) {
      for (const section of other) {
        if (config.otherMunicipalityMode === 'individual') for (const location of config.otherLocations) result.push({ key: `${section.id}-${keyOf(location)}`, section, location, title: `${section.title}: ${location.name}`, mode: 'other-single' })
        else result.push({ key: `${section.id}-grouped`, section, location: config.location, title: section.title, mode: 'other-grouped' })
      }
    }
    return result
  }
  function keyOf(location: Loc) { return `${Number(location.latitude).toFixed(4)},${Number(location.longitude).toFixed(4)}` }
  function unique(items: Loc[]) { const map = new Map<string, Loc>(); for (const item of items) map.set(keyOf(item), item); return [...map.values()] }
  function normLoc(location: Loc): Loc { return { ...location, latitude: Number(location.latitude), longitude: Number(location.longitude), timezone: location.timezone || 'auto' } }
  function migrateSections(sections?: Section[]) { const byType = new Map((sections ?? []).filter((section) => sectionTypes.has(section.type as SectionType)).map((section) => [section.type, section])); return defaultSections.map((section) => ({ ...structuredClone(section), ...(byType.get(section.type) ?? {}) })) }
  function normalizeConfig(value: Partial<Config>): Config { return { ...structuredClone(defaultConfig), ...value, otherMunicipalityMode: value.otherMunicipalityMode ?? 'grouped', showTimerRing: value.showTimerRing ?? false, location: value.location ? normLoc(value.location) : caceres, otherLocations: (value.otherLocations ?? []).map(normLoc), sections: migrateSections(value.sections) } }
  function saveConfig() { try { localStorage.setItem(storageKey, JSON.stringify(config)) } catch { /* noop */ } }
  function loadConfig() { try { const raw = localStorage.getItem(storageKey); return raw ? normalizeConfig(JSON.parse(raw) as Partial<Config>) : null } catch { return null } }
  function resetConfig() { config = structuredClone(defaultConfig); searchTerm = config.location.name; activeSlideIndex = 0; timerRingKey += 1; weatherByKey = {}; void refreshWeather(config) }
  function encodeConfig(value: Config) { return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '') }
  function decodeConfig(value: string) { try { const normalized = value.replaceAll('-', '+').replaceAll('_', '/'); const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4); return normalizeConfig(JSON.parse(decodeURIComponent(escape(atob(padded)))) as Partial<Config>) } catch { return null } }
  function buildUrl(value: Config) { return typeof window === 'undefined' ? '' : `${window.location.origin}${appBase}/canal?config=${encodeConfig(value)}` }
  function hexToRgba(hex: string, alpha: number) { const clean = hex.replace('#', ''); if (clean.length !== 6) return hex; return `rgba(${parseInt(clean.slice(0, 2), 16)}, ${parseInt(clean.slice(2, 4), 16)}, ${parseInt(clean.slice(4, 6), 16)}, ${alpha})` }

  async function refreshWeather(value: Config = config) {
    const id = ++requestId
    loading = true
    errorMessage = ''
    const locations = unique([value.location, ...value.otherLocations])
    const results = await Promise.allSettled(locations.map(async (location) => ({ location, weather: await fetchWeather(location) })))
    if (id !== requestId) return
    const next: Record<string, Weather> = {}
    for (const result of results) if (result.status === 'fulfilled') next[keyOf(result.value.location)] = result.value.weather
    weatherByKey = next
    loading = false
    lastUpdated = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
    if (!Object.keys(next).length) errorMessage = 'No se han podido cargar los datos del tiempo.'
  }
  async function fetchJson(url: URL) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(await response.text())
    return response.json()
  }
  async function fetchWeather(location: Loc): Promise<Weather> {
    const rich = new URL('https://api.open-meteo.com/v1/forecast')
    rich.searchParams.set('latitude', String(Number(location.latitude)))
    rich.searchParams.set('longitude', String(Number(location.longitude)))
    rich.searchParams.set('timezone', location.timezone || 'auto')
    rich.searchParams.set('forecast_days', '14')
    rich.searchParams.set('past_days', '10')
    rich.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m')
    rich.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,uv_index_max,wind_speed_10m_max')
    rich.searchParams.set('hourly', 'temperature_2m,weather_code,precipitation,wind_speed_10m')
    let data: any
    try {
      data = await fetchJson(rich)
    } catch {
      const safe = new URL('https://api.open-meteo.com/v1/forecast')
      safe.searchParams.set('latitude', String(Number(location.latitude)))
      safe.searchParams.set('longitude', String(Number(location.longitude)))
      safe.searchParams.set('timezone', location.timezone || 'auto')
      safe.searchParams.set('forecast_days', '14')
      safe.searchParams.set('past_days', '10')
      safe.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m')
      safe.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset')
      data = await fetchJson(safe)
    }
    return parseWeather(data)
  }
  function parseWeather(data: any): Weather {
    const today = new Date().toISOString().slice(0, 10)
    const now = Date.now()
    const days: Day[] = (data.daily?.time ?? []).map((date: string, index: number) => {
      const precipitation = Number(data.daily.precipitation_sum?.[index] ?? 0)
      return { date, max: Math.round(data.daily.temperature_2m_max[index]), min: Math.round(data.daily.temperature_2m_min[index]), code: data.daily.weather_code[index], precipitation, rainProbability: precipitation > 0 ? Math.min(100, Math.round(35 + precipitation * 15)) : 0, sunrise: data.daily.sunrise?.[index], sunset: data.daily.sunset?.[index], uv: Number(data.daily.uv_index_max?.[index] ?? 0), wind: Math.round(data.daily.wind_speed_10m_max?.[index] ?? data.current?.wind_speed_10m ?? 0) }
    })
    const hourly: Hour[] = (data.hourly?.time ?? []).map((time: string, index: number) => { const precipitation = Number(data.hourly.precipitation?.[index] ?? 0); return { time, temperature: Math.round(data.hourly.temperature_2m[index]), code: data.hourly.weather_code[index], precipitation, rainProbability: precipitation > 0 ? Math.min(100, Math.round(40 + precipitation * 20)) : 0, wind: Math.round(data.hourly.wind_speed_10m?.[index] ?? data.current?.wind_speed_10m ?? 0) } }).filter((hour: Hour) => new Date(hour.time).getTime() >= now - 60 * 60 * 1000)
    return { current: { temperature: Math.round(data.current.temperature_2m), apparent: Math.round(data.current.apparent_temperature), humidity: Math.round(data.current.relative_humidity_2m), wind: Math.round(data.current.wind_speed_10m), code: data.current.weather_code }, daily: days.filter((day) => day.date >= today), past: days.filter((day) => day.date < today).reverse(), hourly }
  }

  async function searchMunicipalities(term: string, target: 'main' | 'other' = 'main') { const clean = term.trim(); if (clean.length < 2) { if (target === 'main') searchResults = []; else otherSearchResults = []; return } const url = new URL('https://geocoding-api.open-meteo.com/v1/search'); url.searchParams.set('name', clean); url.searchParams.set('count', '8'); url.searchParams.set('language', 'es'); url.searchParams.set('format', 'json'); try { const response = await fetch(url); const data = await response.json(); const results = (data.results ?? []).map((item: Loc) => normLoc(item)); if (target === 'main') searchResults = results; else otherSearchResults = results; const exact = results.find((item: Loc) => item.name.toLowerCase() === clean.toLowerCase()); if (target === 'main' && exact) selectLocation(exact) } catch { if (target === 'main') searchResults = []; else otherSearchResults = [] } }
  function onMainSearchInput() { window.clearTimeout(searchTimer); searchTimer = window.setTimeout(() => searchMunicipalities(searchTerm, 'main'), 300) }
  function onMainSearchBlur() { const first = searchResults[0]; if (first && searchTerm.trim().toLowerCase() !== config.location.name.toLowerCase()) selectLocation(first) }
  function onOtherSearchInput() { window.clearTimeout(otherSearchTimer); otherSearchTimer = window.setTimeout(() => searchMunicipalities(otherSearchTerm, 'other'), 300) }
  function selectLocation(location: Loc) { const selected = normLoc(location); config = { ...config, location: selected, channelName: config.channelName.replace(config.location.name, selected.name) }; searchTerm = selected.name; searchResults = []; activeSlideIndex = 0; timerRingKey += 1; weatherByKey = {}; void refreshWeather(config) }
  function addOtherLocation(location: Loc) { const selected = normLoc(location); if (config.otherLocations.some((item) => keyOf(item) === keyOf(selected))) return; config = { ...config, otherLocations: [...config.otherLocations, selected] }; otherSearchTerm = ''; otherSearchResults = []; activeSlideIndex = 0; timerRingKey += 1; void refreshWeather(config) }
  function removeOtherLocation(location: Loc) { config = { ...config, otherLocations: config.otherLocations.filter((item) => keyOf(item) !== keyOf(location)) }; timerRingKey += 1; void refreshWeather(config) }
  function handleKeydown(event: KeyboardEvent) { if (viewMode !== 'channel' || slides.length < 2) return; const target = event.target as HTMLElement | null; if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)) return; if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(event.key)) { event.preventDefault(); nextSlide() } if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(event.key)) { event.preventDefault(); previousSlide() } if (event.key === 'Home') { event.preventDefault(); goToSlide(0) } if (event.key === 'End') { event.preventDefault(); goToSlide(slides.length - 1) } }
  function nextSlide() { if (!slides.length) return; activeSlideIndex = (activeSlideIndex + 1) % slides.length; timerRingKey += 1; startRotation() }
  function previousSlide() { if (!slides.length) return; activeSlideIndex = (activeSlideIndex - 1 + slides.length) % slides.length; timerRingKey += 1; startRotation() }
  function startRotation() { window.clearInterval(slideTimer); timerRingKey += 1; slideTimer = window.setInterval(() => nextSlide(), Math.max(4, config.transitionSeconds) * 1000) }
  function goToSlide(index: number) { activeSlideIndex = index; timerRingKey += 1; startRotation() }
  function moveSection(index: number, direction: -1 | 1) { const to = index + direction; if (to < 0 || to >= config.sections.length) return; const sections = [...config.sections]; const [item] = sections.splice(index, 1); sections.splice(to, 0, item); config = { ...config, sections }; activeSlideIndex = 0; timerRingKey += 1 }
  function onSectionDragStart(event: DragEvent, id: string) { draggedSectionId = id; event.dataTransfer?.setData('text/plain', id) }
  function onSectionDrop(event: DragEvent, targetId: string) { event.preventDefault(); const sourceId = event.dataTransfer?.getData('text/plain') || draggedSectionId; const from = config.sections.findIndex((s) => s.id === sourceId); const to = config.sections.findIndex((s) => s.id === targetId); if (from < 0 || to < 0 || from === to) return; const sections = [...config.sections]; const [item] = sections.splice(from, 1); sections.splice(to, 0, item); config = { ...config, sections }; draggedSectionId = ''; activeSlideIndex = 0; timerRingKey += 1 }
  function toggleSection(section: Section) { config = { ...config, sections: config.sections.map((item) => item.id === section.id ? { ...item, enabled: !item.enabled } : item) }; activeSlideIndex = 0; timerRingKey += 1 }
  function updateSection(section: Section, patch: Partial<Section>) { config = { ...config, sections: config.sections.map((item) => item.id === section.id ? { ...item, ...patch } : item) } }
  function toggleMetric(section: Section, metric: string) { const metrics = new Set(section.metrics ?? []); metrics.has(metric) ? metrics.delete(metric) : metrics.add(metric); updateSection(section, { metrics: [...metrics] }) }
  function copyUrl() { void navigator.clipboard?.writeText(generatedUrl) }
  function openChannel() { window.open(generatedUrl, '_blank', 'noopener,noreferrer') }
  function formatDay(date: string) { return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(date)) }
  function formatTime(date?: string) { return date ? new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(date)) : '--:--' }
  function weatherLabel(code: number) { if (code === 0) return 'Despejado'; if ([1, 2].includes(code)) return 'Poco nuboso'; if (code === 3) return 'Cubierto'; if ([45, 48].includes(code)) return 'Niebla'; if ([51, 53, 55, 56, 57].includes(code)) return 'Llovizna'; if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Lluvia'; if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Nieve'; if ([95, 96, 99].includes(code)) return 'Tormenta'; return 'Variable' }
  function openWeatherIcon(code: number) { if (code === 0) return '01d'; if ([1, 2].includes(code)) return '02d'; if (code === 3) return '04d'; if ([45, 48].includes(code)) return '50d'; if ([51, 53, 55, 56, 57].includes(code)) return '09d'; if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '10d'; if ([71, 73, 75, 77, 85, 86].includes(code)) return '13d'; if ([95, 96, 99].includes(code)) return '11d'; return '03d' }
  function openWeatherIconUrl(code: number) { return `https://openweathermap.org/img/wn/${openWeatherIcon(code)}@4x.png` }
</script>

{#if viewMode === 'channel'}
  <main class={channelClass} style={channelStyle} aria-live="polite"><div class:with-image={config.randomImages} class="tv-background"></div><div class="tv-overlay">{#if config.showChannelName}<header class="tv-header"><div class="tv-title-box"><p class="eyebrow">{activeSlide?.location.name}</p><h1>{config.channelName}</h1></div>{#if config.showLive}<div class="live-pill">Directo</div>{/if}{#if config.showProgress}<div class="section-progress">{activeSlideIndex + 1}/{slides.length}</div>{/if}</header>{/if}{#if loading}<section class="tv-card tv-center"><p>Cargando datos meteorológicos…</p></section>{:else if errorMessage}<section class="tv-card tv-center"><p>{errorMessage}</p></section>{:else if activeSlide && activeWeather}{#key activeSlide.key}<section class="tv-card tv-content">{@render ChannelSection(activeSlide, activeWeather, false)}</section>{/key}{:else}<section class="tv-card tv-center"><p>No hay datos listos para {activeSlide?.location.name ?? 'el municipio seleccionado'}.</p></section>{/if}{#if config.showTimerRing && slides.length > 1}{#key timerRingKey}<div class="section-timer-ring" style={`--timer-duration:${Math.max(4, config.transitionSeconds)}s`} aria-hidden="true"></div>{/key}{/if}<footer class="tv-footer"><span>Datos: Open-Meteo · iconos OpenWeather</span><span>{lastUpdated}</span></footer><div class="generated-by">Generado por tiempotv.alon.one</div></div></main>
{:else}
  <div class="app-shell configurator-v2"><header class="site-header"><a class="brand" href={appBase || '/'}><span class="brand-mark">TV</span><span>TiempoTV</span></a><nav><a href="#configurador">Configurar</a><a href="#preview">Preview</a><a href="#url">URL</a></nav></header><main><section class="hero-section hero-compact"><div class="hero-copy"><p class="badge">Canales meteorológicos automáticos</p><h1>TiempoTV</h1><p>Diseña una pantalla del tiempo lista para televisión. Incluye otros municipios, datos horarios e históricos.</p><div class="hero-actions"><a class="btn btn-primary" href="#configurador">Editar canal</a><button class="btn btn-secondary" type="button" on:click={openChannel}>Abrir emisión</button><button class="btn btn-secondary" type="button" on:click={resetConfig}>Restablecer</button></div></div><div class={`mini-tv theme-${config.theme} name-${config.channelNameStyle}`} style={channelStyle}><div class="mini-tv-card"><img class="weather-icon-img" src={openWeatherIconUrl(activeWeather?.current.code ?? 1)} alt="" /><strong>{activeWeather?.current.temperature ?? 22}°</strong><small>{activeSlide?.location.name}</small></div></div></section><section class="workspace" id="configurador"><div class="panel config-panel compact-config"><div class="panel-heading"><p class="eyebrow">Configurador</p><h2>Opciones del canal</h2></div>
  <details class="config-group" open><summary><span>1. Canal y municipio</span><small>{config.location.name}</small></summary><div class="config-group-body"><div class="form-grid"><label><span class="label">Nombre del canal</span><input class="input" bind:value={config.channelName} /></label><label class="search-field"><span class="label">Municipio principal activo: {config.location.name}</span><input class="input" bind:value={searchTerm} on:input={onMainSearchInput} on:blur={onMainSearchBlur} placeholder="Buscar municipio" />{#if searchResults.length}<ul class="suggestions">{#each searchResults as result}<li><button type="button" on:mousedown|preventDefault={() => selectLocation(result)}>{result.name} <small>{result.admin1} · {result.country}</small></button></li>{/each}</ul>{/if}</label><label><span class="label">Modo</span><select class="select" bind:value={config.locationMode}><option value="single">Un solo municipio</option><option value="multi">Varios municipios</option></select></label>{#if config.locationMode === 'single'}<label><span class="label">Otros municipios</span><select class="select" bind:value={config.otherMunicipalityMode}><option value="grouped">Agrupados</option><option value="individual">Una pantalla por municipio</option></select></label>{/if}</div><div class="other-cities compact-other"><label class="search-field"><span class="label">Añadir municipio extra</span><input class="input" bind:value={otherSearchTerm} on:input={onOtherSearchInput} placeholder="Madrid, Plasencia, Sevilla…" />{#if otherSearchResults.length}<ul class="suggestions">{#each otherSearchResults as result}<li><button type="button" on:mousedown|preventDefault={() => addOtherLocation(result)}>{result.name} <small>{result.admin1} · {result.country}</small></button></li>{/each}</ul>{/if}</label><div class="chips">{#each config.otherLocations as location}<button class="chip" type="button" on:click={() => removeOtherLocation(location)}>{location.name} ×</button>{/each}</div></div></div></details>
  <details class="config-group" open><summary><span>2. Apariencia</span><small>{config.theme}</small></summary><div class="config-group-body"><div class="theme-picker">{#each themes as theme}<button class:theme-selected={config.theme === theme.id} type="button" on:click={() => (config.theme = theme.id)}><strong>{theme.name}</strong></button>{/each}</div><div class="form-grid compact-colors"><label><span class="label">Fondo</span><input class="input color-input" type="color" bind:value={config.backgroundColor} /></label><label><span class="label">Texto</span><input class="input color-input" type="color" bind:value={config.textColor} /></label><label><span class="label">Recuadros</span><input class="input color-input" type="color" bind:value={config.cardColor} /></label></div><label class="switch-row slim"><input type="checkbox" bind:checked={config.randomImages} /><span><strong>Imágenes aleatorias de fondo</strong></span></label></div></details>
  <details class="config-group"><summary><span>3. Rótulos y emisión</span><small>{config.transitionSeconds}s</small></summary><div class="config-group-body"><div class="option-grid compact-options"><label class="switch-row slim"><input type="checkbox" bind:checked={config.showLive} /><span><strong>Directo</strong></span></label><label class="switch-row slim"><input type="checkbox" bind:checked={config.showProgress} /><span><strong>Progreso 1/5</strong></span></label><label class="switch-row slim"><input type="checkbox" bind:checked={config.showTimerRing} /><span><strong>Barra de avance</strong></span></label><label class="switch-row slim"><input type="checkbox" bind:checked={config.showChannelName} /><span><strong>Nombre del canal</strong></span></label><label class="switch-row slim"><input type="checkbox" bind:checked={config.showSectionTitles} /><span><strong>Títulos</strong></span></label></div>{#if config.showChannelName}<label><span class="label">Estilo del nombre</span><select class="select" bind:value={config.channelNameStyle}>{#each nameStyles as option}<option value={option.id}>{option.label}</option>{/each}</select></label>{/if}<label><span class="label">Transición</span><input class="input" type="number" min="4" max="120" bind:value={config.transitionSeconds} on:change={startRotation} /></label></div></details>
  <details class="config-group" open><summary><span>4. Secciones</span><small>{enabledSections.length} activas · {slides.length} pantallas</small></summary><div class="config-group-body section-list">{#each config.sections as section, index (section.id)}<article class:dragging={draggedSectionId === section.id} class="section-row compact-section-row" draggable="true" on:dragstart={(event) => onSectionDragStart(event, section.id)} on:dragover|preventDefault on:drop={(event) => onSectionDrop(event, section.id)}><div class="drag-handle">⋮⋮</div><div class="section-main"><label class="toggle-label"><input type="checkbox" checked={section.enabled} on:change={() => toggleSection(section)} /><span>{section.title}</span></label>{#if section.enabled}<div class="section-advanced"><label><span class="label">Título</span><input class="input" value={section.title} on:input={(event) => updateSection(section, { title: event.currentTarget.value })} /></label>{#if ['forecast', 'future-extremes', 'past-extremes', 'rain', 'wind', 'sun', 'other-forecast'].includes(section.type)}<label class="inline-control">Días <input type="number" min="1" max="14" value={section.days} on:change={(event) => updateSection(section, { days: Number(event.currentTarget.value) })} /></label>{/if}{#if section.type === 'hourly'}<label class="inline-control">Horas <input type="number" min="3" max="24" value={section.hours} on:change={(event) => updateSection(section, { hours: Number(event.currentTarget.value) })} /></label>{/if}{#if section.type === 'message'}<textarea class="textarea" value={section.message} on:input={(event) => updateSection(section, { message: event.currentTarget.value })}></textarea>{/if}{#if section.type === 'interest'}<div class="metrics-grid metric-pills">{#each metricOptions as metric}<label><input type="checkbox" checked={section.metrics?.includes(metric.id)} on:change={() => toggleMetric(section, metric.id)} /> {metric.label}</label>{/each}</div>{/if}</div>{/if}</div><div class="row-actions"><button class="icon-button" type="button" on:click={() => moveSection(index, -1)}>↑</button><button class="icon-button" type="button" on:click={() => moveSection(index, 1)}>↓</button></div></article>{/each}</div></details>
  </div><aside class="panel preview-panel" id="preview"><div class="panel-heading"><p class="eyebrow">Preview</p><h2>{activeSlide ? `${activeSlideIndex + 1}/${slides.length}` : 'Vista previa'}</h2>{#if activeSlide}<p class="help-text">{activeSlide.title}</p>{/if}</div><div class={previewClass} style={channelStyle}><div class:with-image={config.randomImages} class="tv-background"></div><div class="preview-content">{#if config.showChannelName}<header class="preview-title-box"><span>{activeSlide?.location.name}</span><strong>{config.channelName}</strong>{#if config.showLive}<em>Directo</em>{/if}{#if config.showProgress}<em>{activeSlideIndex + 1}/{slides.length}</em>{/if}</header>{/if}<div class="preview-card">{#if loading}<p>Cargando datos meteorológicos…</p>{:else if activeSlide && activeWeather}{@render ChannelSection(activeSlide, activeWeather, true)}{:else}<p>No hay datos listos para {activeSlide?.location.name ?? 'este municipio'}.</p>{/if}</div><div class="preview-generated">Generado por tiempotv.alon.one</div></div></div>{#if slides.length}<div class="preview-dots">{#each slides as slide, index}<button class:active-dot={index === activeSlideIndex} type="button" title={slide.title} on:click={() => goToSlide(index)}></button>{/each}</div>{/if}<div class="url-box" id="url"><label><span class="label">URL de emisión</span><textarea class="textarea url-textarea" readonly value={generatedUrl}></textarea></label><div class="hero-actions"><button class="btn btn-primary" type="button" on:click={openChannel}>Abrir canal</button><button class="btn btn-secondary" type="button" on:click={copyUrl}>Copiar URL</button></div></div></aside></section></main></div>
{/if}

{#snippet WeatherIcon(code: number, size = 'normal')}
  <img class={`weather-icon-img ${size === 'big' ? 'weather-icon-img-big' : ''}`} src={openWeatherIconUrl(code)} alt={weatherLabel(code)} loading="lazy" decoding="async" />
{/snippet}

{#snippet ChannelSection(slide: Slide, weather: Weather, compact = false)}
  <div class:compact-section={compact} class="channel-section">{#if config.showSectionTitles}<p class="eyebrow section-kicker">{slide.title}</p>{/if}{#if slide.mode === 'other-grouped'}<div class="other-grid">{#each config.otherLocations as location}{@const item = weatherByKey[keyOf(location)]}{#if item}<article><span>{location.name}</span><strong>{item.current.temperature}°</strong><small>{weatherLabel(item.current.code)}</small></article>{/if}{/each}</div>{:else if slide.section.type === 'current' || slide.section.type === 'other-current'}<div class="current-layout"><div class="big-icon weather-icon-holder">{@render WeatherIcon(weather.current.code, 'big')}</div><div class="current-copy"><h2>{weather.current.temperature}°C</h2><p>{slide.location.name} · {weatherLabel(weather.current.code)}</p><div class="weather-stats"><span>Sensación {weather.current.apparent}°</span><span>Humedad {weather.current.humidity}%</span><span>Viento {weather.current.wind} km/h</span></div></div></div>{:else if slide.section.type === 'forecast' || slide.section.type === 'other-forecast'}<div class="forecast-grid">{#each weather.daily.slice(0, slide.section.days ?? 5) as day}<article><strong>{formatDay(day.date)}</strong><span class="day-icon">{@render WeatherIcon(day.code)}</span><small>{weatherLabel(day.code)}</small><b>{day.max}° / {day.min}°</b></article>{/each}</div>{:else if slide.section.type === 'hourly'}<div class="hourly-grid extra-grid">{#each weather.hourly.slice(0, slide.section.hours ?? 8) as hour}<article><span>{formatTime(hour.time)}</span><strong>{hour.temperature}°</strong><small>{hour.precipitation} mm · {hour.wind} km/h</small></article>{/each}</div>{:else if slide.section.type === 'future-extremes'}<div class="extremes-grid">{#each weather.daily.slice(0, slide.section.days ?? 7) as day}<article><span>{formatDay(day.date)}</span><strong>{day.max}°</strong><small>{day.min}°</small></article>{/each}</div>{:else if slide.section.type === 'past-extremes'}<div class="extremes-grid">{#each weather.past.slice(0, slide.section.days ?? 5) as day}<article><span>{formatDay(day.date)}</span><strong>{day.max}°</strong><small>{day.min}°</small></article>{/each}</div>{:else if slide.section.type === 'rain'}<div class="interest-grid extra-grid">{#each weather.daily.slice(0, slide.section.days ?? 5) as day}<article><span>{formatDay(day.date)}</span><strong>{day.precipitation} mm</strong><small>{day.rainProbability}% estimado</small></article>{/each}</div>{:else if slide.section.type === 'wind'}<div class="interest-grid extra-grid">{#each weather.daily.slice(0, slide.section.days ?? 5) as day}<article><span>{formatDay(day.date)}</span><strong>{day.wind}</strong><small>km/h</small></article>{/each}</div>{:else if slide.section.type === 'sun'}<div class="interest-grid extra-grid">{#each weather.daily.slice(0, slide.section.days ?? 4) as day}<article><span>{formatDay(day.date)}</span><strong>{formatTime(day.sunrise)}</strong><small>{formatTime(day.sunset)}</small></article>{/each}</div>{:else if slide.section.type === 'summary'}<div class="summary-block"><h2>{weather.current.temperature}°C</h2><p>{slide.location.name}: {weatherLabel(weather.current.code).toLowerCase()}, sensación de {weather.current.apparent}°, viento de {weather.current.wind} km/h y máxima prevista de {weather.daily[0]?.max}°.</p></div>{:else if slide.section.type === 'interest'}<div class="interest-grid">{#if slide.section.metrics?.includes('uv')}<article><span>Índice UV</span><strong>{weather.daily[0]?.uv.toFixed(1)}</strong></article>{/if}{#if slide.section.metrics?.includes('sunrise')}<article><span>Sale el sol</span><strong>{formatTime(weather.daily[0]?.sunrise)}</strong></article>{/if}{#if slide.section.metrics?.includes('sunset')}<article><span>Se pone el sol</span><strong>{formatTime(weather.daily[0]?.sunset)}</strong></article>{/if}{#if slide.section.metrics?.includes('wind')}<article><span>Viento</span><strong>{weather.current.wind} km/h</strong></article>{/if}{#if slide.section.metrics?.includes('humidity')}<article><span>Humedad</span><strong>{weather.current.humidity}%</strong></article>{/if}{#if slide.section.metrics?.includes('precipitation')}<article><span>Lluvia hoy</span><strong>{weather.daily[0]?.precipitation} mm</strong></article>{/if}</div>{:else if slide.section.type === 'message'}<div class="message-block"><p>{slide.section.message}</p></div>{/if}</div>
{/snippet}
