<script lang="ts">
  import { onMount } from 'svelte'

  type LocationResult = { id?: number; name: string; latitude: number; longitude: number; country?: string; admin1?: string; timezone?: string }
  type SectionType = 'current' | 'forecast' | 'future-extremes' | 'past-extremes' | 'interest' | 'message' | 'other-current' | 'other-forecast'
  type Theme = 'minimal' | 'lower-left' | 'split' | 'glass' | 'ticker' | 'poster' | 'dashboard' | 'cinema' | 'vertical' | 'cards'
  type NameStyle = 'default' | 'boxed' | 'pill' | 'huge' | 'corner' | 'hidden-soft'
  type Section = { id: string; type: SectionType; title: string; enabled: boolean; days?: number; message?: string; metrics?: string[] }
  type Config = {
    channelName: string
    location: LocationResult | null
    otherLocations: LocationResult[]
    locationMode: 'single' | 'multi'
    otherMunicipalityMode: 'grouped' | 'individual'
    backgroundColor: string
    textColor: string
    cardColor: string
    randomImages: boolean
    iconStyle: 'emoji' | 'line' | 'solid'
    theme: Theme
    channelNameStyle: NameStyle
    showLive: boolean
    showProgress: boolean
    showChannelName: boolean
    showSectionTitles: boolean
    transitionSeconds: number
    sections: Section[]
  }
  type WeatherDay = { date: string; max: number; min: number; code: number; precipitation: number; sunrise: string; sunset: string; uv: number }
  type Weather = { current: { temperature: number; apparent: number; humidity: number; wind: number; code: number }; daily: WeatherDay[]; past: WeatherDay[] }
  type Slide = { key: string; title: string; section: Section; location: LocationResult; mode: 'normal' | 'other-grouped' | 'other-single' }

  const storageKey = 'tiempotv:last-config:fixed'
  const appBase = import.meta.env.BASE_URL.replace(/\/$/, '')
  const images = [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1499346030926-9a72daac6c63?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=80',
  ]

  const defaultSections: Section[] = [
    { id: 'current', type: 'current', title: 'Tiempo actual', enabled: true },
    { id: 'forecast', type: 'forecast', title: 'Previsión próximos días', enabled: true, days: 5 },
    { id: 'future-extremes', type: 'future-extremes', title: 'Máximas y mínimas próximos días', enabled: true, days: 7 },
    { id: 'past-extremes', type: 'past-extremes', title: 'Máximas y mínimas días anteriores', enabled: false, days: 5 },
    { id: 'interest', type: 'interest', title: 'Más datos de interés', enabled: true, metrics: ['uv', 'sunrise', 'sunset', 'wind', 'humidity'] },
    { id: 'message', type: 'message', title: 'Mensaje personalizado', enabled: false, message: 'Información meteorológica actualizada automáticamente.' },
    { id: 'other-current', type: 'other-current', title: 'Tiempo actual en otros municipios', enabled: false },
    { id: 'other-forecast', type: 'other-forecast', title: 'Previsión en otros municipios', enabled: false, days: 3 },
  ]

  const defaultConfig: Config = {
    channelName: 'TiempoTV Cáceres',
    location: { name: 'Cáceres', latitude: 39.4765, longitude: -6.3722, country: 'España', admin1: 'Extremadura', timezone: 'Europe/Madrid' },
    otherLocations: [],
    locationMode: 'single',
    otherMunicipalityMode: 'grouped',
    backgroundColor: '#06162f',
    textColor: '#f8fafc',
    cardColor: '#0f172a',
    randomImages: true,
    iconStyle: 'emoji',
    theme: 'ticker',
    channelNameStyle: 'default',
    showLive: true,
    showProgress: true,
    showChannelName: true,
    showSectionTitles: true,
    transitionSeconds: 12,
    sections: structuredClone(defaultSections),
  }

  const themes: { id: Theme; name: string; description: string }[] = [
    { id: 'minimal', name: 'Minimal', description: 'Limpio y centrado' },
    { id: 'ticker', name: 'CNN weather', description: 'Informativo con ticker' },
    { id: 'dashboard', name: 'Weather TV', description: 'Panel azul' },
    { id: 'cards', name: 'Panel público', description: 'Mosaico claro' },
    { id: 'glass', name: 'Cristal', description: 'Moderno' },
    { id: 'poster', name: 'Póster', description: 'Visual' },
    { id: 'lower-left', name: 'Rótulo inferior', description: 'Magazine' },
    { id: 'split', name: 'Split', description: 'Lateral' },
    { id: 'cinema', name: 'Cine', description: 'Panorámico' },
    { id: 'vertical', name: 'Vertical', description: 'Estrecho' },
  ]
  const nameStyles: { id: NameStyle; label: string }[] = [
    { id: 'default', label: 'Normal' },
    { id: 'boxed', label: 'Caja' },
    { id: 'pill', label: 'Pastilla' },
    { id: 'huge', label: 'Gigante' },
    { id: 'corner', label: 'Esquina' },
    { id: 'hidden-soft', label: 'Discreto' },
  ]
  const metricOptions = [
    { id: 'uv', label: 'UV' },
    { id: 'sunrise', label: 'Salida del sol' },
    { id: 'sunset', label: 'Puesta del sol' },
    { id: 'wind', label: 'Viento' },
    { id: 'humidity', label: 'Humedad' },
    { id: 'precipitation', label: 'Lluvia' },
  ]

  let config: Config = structuredClone(defaultConfig)
  let viewMode: 'configurator' | 'channel' = 'configurator'
  let weatherByKey = new Map<string, Weather>()
  let weatherVersion = 0
  let loading = false
  let errorMessage = ''
  let lastUpdated = ''
  let activeSlideIndex = 0
  let searchTerm = config.location?.name ?? ''
  let otherSearchTerm = ''
  let searchResults: LocationResult[] = []
  let otherSearchResults: LocationResult[] = []
  let shouldPersist = false
  let savedNotice = ''
  let requestId = 0
  let searchTimer: number | undefined
  let otherSearchTimer: number | undefined
  let slideTimer: number | undefined
  let draggedSectionId = ''

  $: locations = uniqueLocations([config.location, ...config.otherLocations])
  $: channelLocations = config.locationMode === 'multi' ? locations : (config.location ? [config.location] : [])
  $: enabledSections = config.sections.filter((section) => section.enabled)
  $: slides = buildSlides()
  $: if (slides.length && activeSlideIndex >= slides.length) activeSlideIndex = 0
  $: activeSlide = slides[activeSlideIndex]
  $: activeWeather = activeSlide ? findWeather(activeSlide.location, weatherByKey, weatherVersion) : null
  $: generatedUrl = buildUrl(config)
  $: channelStyle = `--channel-bg:${config.backgroundColor}; --channel-text:${config.textColor}; --channel-card:${hexToRgba(config.cardColor, 0.78)}; --channel-image:url('${images[activeSlideIndex % images.length]}'); --section-cycle:${Math.max(4, config.transitionSeconds)}s`
  $: channelClass = `tv-screen theme-${config.theme} name-${config.channelNameStyle}`
  $: previewClass = `preview-frame theme-${config.theme} name-${config.channelNameStyle}`
  $: if (shouldPersist) persistConfig()

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
      searchTerm = config.location?.name ?? ''
      shouldPersist = true
    }

    void refreshWeather(config)
    startRotation()
    return () => {
      window.clearTimeout(searchTimer)
      window.clearTimeout(otherSearchTimer)
      window.clearInterval(slideTimer)
    }
  })

  function weatherKey(location: LocationResult) {
    return `${Number(location.latitude).toFixed(4)},${Number(location.longitude).toFixed(4)}`
  }

  function findWeather(location: LocationResult, map: Map<string, Weather>, _version: number) {
    const direct = map.get(weatherKey(location))
    if (direct) return direct
    for (const [key, value] of map.entries()) {
      const [lat, lon] = key.split(',').map(Number)
      if (Math.abs(lat - Number(location.latitude)) < 0.03 && Math.abs(lon - Number(location.longitude)) < 0.03) return value
    }
    return null
  }

  function uniqueLocations(input: Array<LocationResult | null>) {
    const map = new Map<string, LocationResult>()
    for (const location of input) {
      if (location) map.set(weatherKey(location), location)
    }
    return [...map.values()]
  }

  function buildSlides(): Slide[] {
    if (!config.location) return []
    const base = enabledSections.filter((section) => !section.type.startsWith('other-'))
    const other = enabledSections.filter((section) => section.type.startsWith('other-'))
    const result: Slide[] = []

    if (config.locationMode === 'multi') {
      for (const location of channelLocations) {
        for (const section of base) result.push({ key: `${weatherKey(location)}-${section.id}`, section, location, title: `${section.title} · ${location.name}`, mode: 'normal' })
      }
      return result
    }

    for (const section of base) result.push({ key: `main-${section.id}`, section, location: config.location, title: section.title, mode: 'normal' })
    for (const section of other) {
      if (config.otherMunicipalityMode === 'individual') {
        for (const location of config.otherLocations) result.push({ key: `${section.id}-${weatherKey(location)}`, section, location, title: `${section.title}: ${location.name}`, mode: 'other-single' })
      } else {
        result.push({ key: `${section.id}-grouped`, section, location: config.location, title: section.title, mode: 'other-grouped' })
      }
    }
    return result
  }

  function normalizeConfig(value: Partial<Config>): Config {
    return {
      ...structuredClone(defaultConfig),
      ...value,
      sections: value.sections?.length ? value.sections : structuredClone(defaultSections),
      locationMode: value.locationMode ?? 'single',
      otherMunicipalityMode: value.otherMunicipalityMode ?? 'grouped',
      channelNameStyle: value.channelNameStyle ?? 'default',
      showLive: value.showLive ?? true,
      showProgress: value.showProgress ?? true,
      showChannelName: value.showChannelName ?? true,
      showSectionTitles: value.showSectionTitles ?? true,
    }
  }

  function persistConfig() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(config))
      savedNotice = 'Guardado automáticamente'
    } catch {
      savedNotice = ''
    }
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? normalizeConfig(JSON.parse(raw) as Partial<Config>) : null
    } catch {
      return null
    }
  }

  function resetConfig() {
    const next = structuredClone(defaultConfig)
    config = next
    searchTerm = next.location?.name ?? ''
    activeSlideIndex = 0
    weatherByKey = new Map()
    weatherVersion += 1
    void refreshWeather(next)
  }

  function encodeConfig(value: Config) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  }

  function decodeConfig(value: string) {
    try {
      const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
      return normalizeConfig(JSON.parse(decodeURIComponent(escape(atob(padded)))) as Partial<Config>)
    } catch {
      return null
    }
  }

  function buildUrl(value: Config) {
    return typeof window === 'undefined' ? '' : `${window.location.origin}${appBase}/canal?config=${encodeConfig(value)}`
  }

  function hexToRgba(hex: string, alpha: number) {
    const clean = hex.replace('#', '')
    if (clean.length !== 6) return hex
    return `rgba(${parseInt(clean.slice(0, 2), 16)}, ${parseInt(clean.slice(2, 4), 16)}, ${parseInt(clean.slice(4, 6), 16)}, ${alpha})`
  }

  async function refreshWeather(value: Config = config) {
    const currentRequest = ++requestId
    const requestedLocations = uniqueLocations([value.location, ...value.otherLocations])
    if (!requestedLocations.length) return
    loading = true
    errorMessage = ''

    const settled = await Promise.allSettled(requestedLocations.map(async (location) => ({ location, weather: await fetchWeather(location) })))
    if (currentRequest !== requestId) return

    const nextMap = new Map<string, Weather>()
    for (const item of settled) {
      if (item.status === 'fulfilled') nextMap.set(weatherKey(item.value.location), item.value.weather)
    }

    weatherByKey = nextMap
    weatherVersion += 1
    lastUpdated = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
    loading = false
    if (!nextMap.size) errorMessage = 'No se han podido cargar los datos del tiempo.'
  }

  async function fetchWeather(location: LocationResult): Promise<Weather> {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', String(Number(location.latitude)))
    url.searchParams.set('longitude', String(Number(location.longitude)))
    url.searchParams.set('timezone', location.timezone || 'auto')
    url.searchParams.set('forecast_days', '14')
    url.searchParams.set('past_days', '10')
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m')
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,uv_index_max')

    const response = await fetch(url)
    if (!response.ok) throw new Error('No se han podido cargar los datos del tiempo')
    const data = await response.json()
    const today = new Date().toISOString().slice(0, 10)
    const days: WeatherDay[] = (data.daily?.time ?? []).map((date: string, index: number) => ({
      date,
      max: Math.round(data.daily.temperature_2m_max[index]),
      min: Math.round(data.daily.temperature_2m_min[index]),
      code: data.daily.weather_code[index],
      precipitation: Number(data.daily.precipitation_sum[index] ?? 0),
      sunrise: data.daily.sunrise[index],
      sunset: data.daily.sunset[index],
      uv: Number(data.daily.uv_index_max[index] ?? 0),
    }))

    return {
      current: {
        temperature: Math.round(data.current.temperature_2m),
        apparent: Math.round(data.current.apparent_temperature),
        humidity: Math.round(data.current.relative_humidity_2m),
        wind: Math.round(data.current.wind_speed_10m),
        code: data.current.weather_code,
      },
      daily: days.filter((day) => day.date >= today),
      past: days.filter((day) => day.date < today).reverse(),
    }
  }

  async function searchMunicipalities(term: string, target: 'main' | 'other' = 'main') {
    const cleanTerm = term.trim()
    if (cleanTerm.length < 2) {
      if (target === 'main') searchResults = []
      else otherSearchResults = []
      return
    }
    try {
      const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
      url.searchParams.set('name', cleanTerm)
      url.searchParams.set('count', '8')
      url.searchParams.set('language', 'es')
      url.searchParams.set('format', 'json')
      const response = await fetch(url)
      const data = await response.json()
      const results = (data.results ?? []).map((item: LocationResult) => ({
        id: item.id,
        name: item.name,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        country: item.country,
        admin1: item.admin1,
        timezone: item.timezone,
      }))
      if (target === 'main') searchResults = results
      else otherSearchResults = results
    } catch {
      if (target === 'main') searchResults = []
      else otherSearchResults = []
    }
  }

  function onMainSearchInput() { window.clearTimeout(searchTimer); searchTimer = window.setTimeout(() => searchMunicipalities(searchTerm, 'main'), 250) }
  function onOtherSearchInput() { window.clearTimeout(otherSearchTimer); otherSearchTimer = window.setTimeout(() => searchMunicipalities(otherSearchTerm, 'other'), 250) }

  function selectLocation(location: LocationResult) {
    const normalized = { ...location, latitude: Number(location.latitude), longitude: Number(location.longitude) }
    const next = { ...config, location: normalized }
    config = next
    searchTerm = `${normalized.name}${normalized.admin1 ? `, ${normalized.admin1}` : ''}`
    searchResults = []
    activeSlideIndex = 0
    weatherByKey = new Map()
    weatherVersion += 1
    void refreshWeather(next)
  }

  function addOtherLocation(location: LocationResult) {
    const normalized = { ...location, latitude: Number(location.latitude), longitude: Number(location.longitude) }
    if (config.otherLocations.some((item) => weatherKey(item) === weatherKey(normalized))) return
    const next = { ...config, otherLocations: [...config.otherLocations, normalized] }
    config = next
    otherSearchTerm = ''
    otherSearchResults = []
    activeSlideIndex = 0
    void refreshWeather(next)
  }

  function removeOtherLocation(location: LocationResult) {
    const next = { ...config, otherLocations: config.otherLocations.filter((item) => weatherKey(item) !== weatherKey(location)) }
    config = next
    activeSlideIndex = 0
    weatherByKey = new Map()
    weatherVersion += 1
    void refreshWeather(next)
  }

  function startRotation() {
    window.clearInterval(slideTimer)
    slideTimer = window.setInterval(() => {
      if (slides.length > 1) activeSlideIndex = (activeSlideIndex + 1) % slides.length
    }, Math.max(4, config.transitionSeconds) * 1000)
  }
  function goToSlide(index: number) { activeSlideIndex = index; startRotation() }
  function onSectionDragStart(event: DragEvent, sectionId: string) { draggedSectionId = sectionId; event.dataTransfer?.setData('text/plain', sectionId) }
  function onSectionDrop(event: DragEvent, targetSectionId: string) {
    event.preventDefault()
    const sourceId = event.dataTransfer?.getData('text/plain') || draggedSectionId
    if (!sourceId || sourceId === targetSectionId) return
    const sections = [...config.sections]
    const sourceIndex = sections.findIndex((section) => section.id === sourceId)
    const targetIndex = sections.findIndex((section) => section.id === targetSectionId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const [section] = sections.splice(sourceIndex, 1)
    sections.splice(targetIndex, 0, section)
    config = { ...config, sections }
    activeSlideIndex = 0
    draggedSectionId = ''
  }
  function moveSection(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= config.sections.length) return
    const sections = [...config.sections]
    const [section] = sections.splice(index, 1)
    sections.splice(nextIndex, 0, section)
    config = { ...config, sections }
    activeSlideIndex = 0
  }
  function toggleSection(section: Section) { config = { ...config, sections: config.sections.map((item) => item.id === section.id ? { ...item, enabled: !item.enabled } : item) }; activeSlideIndex = 0 }
  function updateSection(section: Section, patch: Partial<Section>) { config = { ...config, sections: config.sections.map((item) => item.id === section.id ? { ...item, ...patch } : item) } }
  function toggleMetric(section: Section, metric: string) { const metrics = new Set(section.metrics ?? []); if (metrics.has(metric)) metrics.delete(metric); else metrics.add(metric); updateSection(section, { metrics: [...metrics] }) }
  function copyUrl() { void navigator.clipboard?.writeText(generatedUrl) }
  function openChannel() { window.open(generatedUrl, '_blank', 'noopener,noreferrer') }
  function formatDay(date: string) { return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(date)) }
  function formatTime(date?: string) { return date ? new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(date)) : '--:--' }
  function weatherLabel(code: number) { if (code === 0) return 'Despejado'; if ([1, 2].includes(code)) return 'Poco nuboso'; if (code === 3) return 'Cubierto'; if ([45, 48].includes(code)) return 'Niebla'; if ([51, 53, 55, 56, 57].includes(code)) return 'Llovizna'; if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Lluvia'; if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Nieve'; if ([95, 96, 99].includes(code)) return 'Tormenta'; return 'Variable' }
  function weatherIcon(code: number) { if (config.iconStyle === 'line') return code <= 1 ? '☼' : code <= 3 ? '☁' : [61, 63, 65, 80, 81, 82].includes(code) ? '╱╱' : [95, 96, 99].includes(code) ? 'ϟ' : '◌'; if (config.iconStyle === 'solid') return code <= 1 ? '●' : code <= 3 ? '◕' : [61, 63, 65, 80, 81, 82].includes(code) ? '◆' : [95, 96, 99].includes(code) ? '▲' : '◼'; if (code <= 1) return '☀️'; if (code <= 3) return '⛅'; if ([45, 48].includes(code)) return '🌫️'; if ([61, 63, 65, 80, 81, 82].includes(code)) return '🌧️'; if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️'; if ([95, 96, 99].includes(code)) return '⛈️'; return '🌤️' }
</script>

{#if viewMode === 'channel'}
  <main class={channelClass} style={channelStyle} aria-live="polite"><div class:with-image={config.randomImages} class="tv-background"></div><div class="tv-overlay">{#if config.showChannelName}<header class="tv-header"><div class="tv-title-box"><p class="eyebrow">{activeSlide?.location.name ?? config.location?.name ?? 'Tiempo local'}</p><h1>{config.channelName}</h1></div>{#if config.showLive}<div class="live-pill">Directo</div>{/if}{#if config.showProgress && slides.length}<div class="section-progress">{activeSlideIndex + 1}/{slides.length}</div>{/if}</header>{:else if config.showLive || config.showProgress}<header class="tv-header tv-header-compact">{#if config.showLive}<div class="live-pill">Directo</div>{/if}{#if config.showProgress && slides.length}<div class="section-progress">{activeSlideIndex + 1}/{slides.length}</div>{/if}</header>{/if}{#if loading}<section class="tv-card tv-center"><p>Cargando datos meteorológicos…</p></section>{:else if errorMessage}<section class="tv-card tv-center"><p>{errorMessage}</p></section>{:else if activeSlide && activeWeather}{#key activeSlide.key}<section class="tv-card tv-content fade" aria-label={activeSlide.title}>{@render ChannelSection(activeSlide, activeWeather, false)}</section>{/key}{:else}<section class="tv-card tv-center"><p>No hay datos listos para {activeSlide?.location.name ?? 'el municipio seleccionado'}.</p></section>{/if}<footer class="tv-footer"><span>Datos: Open-Meteo</span><span>{lastUpdated ? `Actualizado: ${lastUpdated}` : ''}</span></footer><div class="generated-by">Generado por tiempotv.alon.one</div></div></main>
{:else}
  <div class="app-shell configurator-v2"><header class="site-header"><a class="brand" href={appBase || '/'} aria-label="TiempoTV"><span class="brand-mark">TV</span><span>TiempoTV</span></a><nav aria-label="Navegación principal"><a href="#configurador">Configurar</a><a href="#preview">Preview</a><a href="#url">URL</a></nav></header><main id="main"><section class="hero-section hero-compact"><div class="hero-copy"><p class="badge">Canales meteorológicos automáticos</p><h1>TiempoTV</h1><p>Diseña una pantalla del tiempo lista para televisión. La configuración se guarda automáticamente en este navegador.</p><div class="hero-actions"><a class="btn btn-primary" href="#configurador">Editar canal</a><button class="btn btn-secondary" type="button" on:click={openChannel}>Abrir emisión</button><button class="btn btn-secondary" type="button" on:click={resetConfig}>Restablecer</button></div>{#if savedNotice}<p class="autosave-note">{savedNotice}</p>{/if}</div><div class={`mini-tv theme-${config.theme} name-${config.channelNameStyle}`} style={channelStyle}><div class="mini-tv-card"><span>{weatherIcon(activeWeather?.current.code ?? 1)}</span><strong>{activeWeather?.current.temperature ?? 22}°</strong><small>{activeSlide?.location.name ?? config.location?.name}</small></div></div></section><section class="workspace" id="configurador"><div class="panel config-panel compact-config"><div class="panel-heading"><p class="eyebrow">Configurador</p><h2>Opciones del canal</h2></div>

  <details class="config-group" open><summary><span>1. Canal y municipio</span><small>{config.location?.name ?? 'Sin municipio'}</small></summary><div class="config-group-body"><div class="form-grid"><label><span class="label">Nombre del canal</span><input class="input" bind:value={config.channelName} /></label><label class="search-field"><span class="label">Municipio principal</span><input class="input" bind:value={searchTerm} on:input={onMainSearchInput} placeholder="Buscar municipio" />{#if searchResults.length}<ul class="suggestions">{#each searchResults as result}<li><button type="button" on:click={() => selectLocation(result)}>{result.name} <small>{result.admin1} · {result.country}</small></button></li>{/each}</ul>{/if}</label><label><span class="label">Modo</span><select class="select" bind:value={config.locationMode} on:change={() => (activeSlideIndex = 0)}><option value="single">Un solo municipio</option><option value="multi">Varios municipios</option></select><span class="help-text">En modo varios, todas las secciones se repiten por cada municipio.</span></label>{#if config.locationMode === 'single'}<label><span class="label">Otros municipios</span><select class="select" bind:value={config.otherMunicipalityMode} on:change={() => (activeSlideIndex = 0)}><option value="grouped">Agrupados</option><option value="individual">Una pantalla por municipio</option></select></label>{/if}</div><div class="other-cities compact-other"><label class="search-field"><span class="label">Añadir municipio</span><input class="input" bind:value={otherSearchTerm} on:input={onOtherSearchInput} placeholder="Madrid, Plasencia, Sevilla…" />{#if otherSearchResults.length}<ul class="suggestions">{#each otherSearchResults as result}<li><button type="button" on:click={() => addOtherLocation(result)}>{result.name} <small>{result.admin1} · {result.country}</small></button></li>{/each}</ul>{/if}</label><div class="chips">{#each config.otherLocations as location}<button class="chip" type="button" on:click={() => removeOtherLocation(location)}>{location.name} ×</button>{/each}</div></div></div></details>

  <details class="config-group" open><summary><span>2. Apariencia</span><small>{themes.find((theme) => theme.id === config.theme)?.name}</small></summary><div class="config-group-body"><div class="theme-picker">{#each themes as theme}<button class:theme-selected={config.theme === theme.id} type="button" on:click={() => (config.theme = theme.id)}><strong>{theme.name}</strong><small>{theme.description}</small></button>{/each}</div><div class="form-grid compact-colors"><label><span class="label">Fondo</span><input class="input color-input" type="color" bind:value={config.backgroundColor} /></label><label><span class="label">Texto</span><input class="input color-input" type="color" bind:value={config.textColor} /></label><label><span class="label">Recuadros</span><input class="input color-input" type="color" bind:value={config.cardColor} /></label><label><span class="label">Iconos</span><select class="select" bind:value={config.iconStyle}><option value="emoji">Emoji</option><option value="line">Línea</option><option value="solid">Sólido</option></select></label></div><label class="switch-row slim"><input type="checkbox" bind:checked={config.randomImages} /><span><strong>Usar imágenes aleatorias de fondo</strong><small>Se desactiva para un fondo plano.</small></span></label></div></details>

  <details class="config-group"><summary><span>3. Rótulos y emisión</span><small>{config.transitionSeconds}s</small></summary><div class="config-group-body"><div class="option-grid compact-options"><label class="switch-row slim"><input type="checkbox" bind:checked={config.showLive} /><span><strong>Directo</strong></span></label><label class="switch-row slim"><input type="checkbox" bind:checked={config.showProgress} /><span><strong>Progreso 1/5</strong></span></label><label class="switch-row slim"><input type="checkbox" bind:checked={config.showChannelName} /><span><strong>Nombre del canal</strong></span></label><label class="switch-row slim"><input type="checkbox" bind:checked={config.showSectionTitles} /><span><strong>Títulos de secciones</strong></span></label></div>{#if config.showChannelName}<label><span class="label">Estilo del nombre</span><select class="select" bind:value={config.channelNameStyle}>{#each nameStyles as option}<option value={option.id}>{option.label}</option>{/each}</select></label>{/if}<label><span class="label">Transición</span><input class="input" type="number" min="4" max="120" bind:value={config.transitionSeconds} on:change={startRotation} /><span class="help-text">Segundos por pantalla.</span></label></div></details>

  <details class="config-group"><summary><span>4. Secciones</span><small>{enabledSections.length} activas · {slides.length} pantallas</small></summary><div class="config-group-body section-list">{#each config.sections as section, index (section.id)}<article class:dragging={draggedSectionId === section.id} class="section-row compact-section-row" draggable="true" on:dragstart={(event) => onSectionDragStart(event, section.id)} on:dragover|preventDefault on:drop={(event) => onSectionDrop(event, section.id)} on:dragend={() => (draggedSectionId = '')}><div class="drag-handle" aria-hidden="true">⋮⋮</div><div class="section-main"><label class="toggle-label"><input type="checkbox" checked={section.enabled} on:change={() => toggleSection(section)} /><span>{section.title}</span></label>{#if section.enabled}<div class="section-advanced"><label><span class="label">Título</span><input class="input" value={section.title} on:input={(event) => updateSection(section, { title: event.currentTarget.value })} /></label>{#if ['forecast', 'future-extremes', 'past-extremes', 'other-forecast'].includes(section.type)}<label class="inline-control">Días <input type="number" min="1" max="14" value={section.days} on:change={(event) => updateSection(section, { days: Number(event.currentTarget.value) })} /></label>{/if}{#if section.type === 'message'}<textarea class="textarea" value={section.message} on:input={(event) => updateSection(section, { message: event.currentTarget.value })}></textarea>{/if}{#if section.type === 'interest'}<div class="metrics-grid metric-pills">{#each metricOptions as metric}<label><input type="checkbox" checked={section.metrics?.includes(metric.id)} on:change={() => toggleMetric(section, metric.id)} /> {metric.label}</label>{/each}</div>{/if}</div>{/if}</div><div class="row-actions"><button class="icon-button" type="button" on:click={() => moveSection(index, -1)}>↑</button><button class="icon-button" type="button" on:click={() => moveSection(index, 1)}>↓</button></div></article>{/each}</div></details>
        </div><aside class="panel preview-panel" id="preview"><div class="panel-heading"><p class="eyebrow">Preview</p><h2>{activeSlide ? `${activeSlideIndex + 1}/${slides.length}` : 'Vista previa'}</h2>{#if activeSlide}<p class="help-text">{activeSlide.title}</p>{/if}</div><div class={previewClass} style={channelStyle}><div class:with-image={config.randomImages} class="tv-background"></div><div class="preview-content">{#if config.showChannelName}<header class="preview-title-box"><span>{activeSlide?.location.name}</span><strong>{config.channelName}</strong>{#if config.showLive}<em>Directo</em>{/if}{#if config.showProgress}<em>{activeSlideIndex + 1}/{slides.length}</em>{/if}</header>{/if}<div class="preview-card">{#if loading}<p>Cargando datos meteorológicos…</p>{:else if activeSlide && activeWeather}{@render ChannelSection(activeSlide, activeWeather, true)}{:else}<p>No hay datos listos para {activeSlide?.location.name ?? 'este municipio'}.</p>{/if}</div><div class="preview-generated">Generado por tiempotv.alon.one</div></div></div>{#if slides.length}<div class="preview-dots">{#each slides as slide, index}<button class:active-dot={index === activeSlideIndex} type="button" title={slide.title} on:click={() => goToSlide(index)}></button>{/each}</div>{/if}<div class="url-box" id="url"><label><span class="label">URL de emisión</span><textarea class="textarea url-textarea" readonly value={generatedUrl}></textarea></label><div class="hero-actions"><button class="btn btn-primary" type="button" on:click={openChannel}>Abrir canal</button><button class="btn btn-secondary" type="button" on:click={copyUrl}>Copiar URL</button></div></div></aside></section></main></div>
{/if}

{#snippet ChannelSection(slide: Slide, weather: Weather, compact = false)}
  <div class:compact-section={compact} class="channel-section">{#if config.showSectionTitles}<p class="eyebrow section-kicker">{slide.title}</p>{/if}{#if slide.mode === 'other-grouped'}<div class="other-grid">{#each config.otherLocations as location}{@const item = findWeather(location, weatherByKey, weatherVersion)}{#if item}<article><span>{location.name}</span><strong>{item.current.temperature}°</strong><small>{weatherIcon(item.current.code)} {weatherLabel(item.current.code)}</small></article>{/if}{/each}</div>{:else if slide.mode === 'other-single'}{@const item = findWeather(slide.location, weatherByKey, weatherVersion)}{#if item}{#if slide.section.type === 'other-current'}<div class="current-layout"><div class="big-icon">{weatherIcon(item.current.code)}</div><div class="current-copy"><h2>{item.current.temperature}°C</h2><p>{slide.location.name} · {weatherLabel(item.current.code)}</p><div class="weather-stats"><span>Sensación {item.current.apparent}°</span><span>Humedad {item.current.humidity}%</span><span>Viento {item.current.wind} km/h</span></div></div></div>{:else}<div class="forecast-grid">{#each item.daily.slice(0, slide.section.days ?? 3) as day}<article><strong>{formatDay(day.date)}</strong><span class="day-icon">{weatherIcon(day.code)}</span><small>{weatherLabel(day.code)}</small><b>{day.max}° / {day.min}°</b></article>{/each}</div>{/if}{/if}{:else if slide.section.type === 'current'}<div class="current-layout"><div class="big-icon">{weatherIcon(weather.current.code)}</div><div class="current-copy"><h2>{weather.current.temperature}°C</h2><p>{slide.location.name} · {weatherLabel(weather.current.code)}</p><div class="weather-stats"><span>Sensación {weather.current.apparent}°</span><span>Humedad {weather.current.humidity}%</span><span>Viento {weather.current.wind} km/h</span></div></div></div>{:else if slide.section.type === 'forecast'}<div class="forecast-grid">{#each weather.daily.slice(0, slide.section.days ?? 5) as day}<article><strong>{formatDay(day.date)}</strong><span class="day-icon">{weatherIcon(day.code)}</span><small>{weatherLabel(day.code)}</small><b>{day.max}° / {day.min}°</b></article>{/each}</div>{:else if slide.section.type === 'future-extremes'}<div class="extremes-grid">{#each weather.daily.slice(0, slide.section.days ?? 7) as day}<article><span>{formatDay(day.date)}</span><strong>{day.max}°</strong><small>{day.min}°</small></article>{/each}</div>{:else if slide.section.type === 'past-extremes'}<div class="extremes-grid">{#each weather.past.slice(0, slide.section.days ?? 5) as day}<article><span>{formatDay(day.date)}</span><strong>{day.max}°</strong><small>{day.min}°</small></article>{/each}</div>{:else if slide.section.type === 'interest'}<div class="interest-grid">{#if slide.section.metrics?.includes('uv')}<article><span>Índice UV</span><strong>{weather.daily[0]?.uv.toFixed(1)}</strong></article>{/if}{#if slide.section.metrics?.includes('sunrise')}<article><span>Sale el sol</span><strong>{formatTime(weather.daily[0]?.sunrise)}</strong></article>{/if}{#if slide.section.metrics?.includes('sunset')}<article><span>Se pone el sol</span><strong>{formatTime(weather.daily[0]?.sunset)}</strong></article>{/if}{#if slide.section.metrics?.includes('wind')}<article><span>Viento</span><strong>{weather.current.wind} km/h</strong></article>{/if}{#if slide.section.metrics?.includes('humidity')}<article><span>Humedad</span><strong>{weather.current.humidity}%</strong></article>{/if}{#if slide.section.metrics?.includes('precipitation')}<article><span>Lluvia hoy</span><strong>{weather.daily[0]?.precipitation} mm</strong></article>{/if}</div>{:else if slide.section.type === 'message'}<div class="message-block"><p>{slide.section.message}</p></div>{/if}</div>
{/snippet}
