<script lang="ts">
  import { onMount } from 'svelte'

  type LocationResult = { id?: number; name: string; latitude: number; longitude: number; country?: string; admin1?: string; timezone?: string }
  type SectionType = 'current' | 'forecast' | 'future-extremes' | 'past-extremes' | 'interest' | 'message' | 'other-current' | 'other-forecast'
  type ChannelTheme = 'minimal' | 'lower-left' | 'split' | 'glass' | 'ticker' | 'poster' | 'dashboard' | 'cinema' | 'vertical' | 'cards'
  type ChannelNameStyle = 'default' | 'boxed' | 'pill' | 'huge' | 'corner' | 'hidden-soft'
  type LocationMode = 'single' | 'multi'
  type OtherMode = 'grouped' | 'individual'

  type SectionConfig = { id: string; type: SectionType; title: string; enabled: boolean; days?: number; message?: string; metrics?: string[] }
  type ChannelConfig = {
    channelName: string
    location: LocationResult | null
    otherLocations: LocationResult[]
    locationMode: LocationMode
    otherMunicipalityMode: OtherMode
    backgroundColor: string
    textColor: string
    cardColor: string
    randomImages: boolean
    iconStyle: 'emoji' | 'line' | 'solid'
    theme: ChannelTheme
    channelNameStyle: ChannelNameStyle
    showLive: boolean
    showProgress: boolean
    showChannelName: boolean
    showSectionTitles: boolean
    transitionSeconds: number
    sections: SectionConfig[]
  }
  type WeatherDay = { date: string; max: number; min: number; code: number; precipitation: number; sunrise: string; sunset: string; uv: number }
  type WeatherBundle = { current: { temperature: number; apparent: number; humidity: number; wind: number; code: number; isDay: number }; daily: WeatherDay[]; past: WeatherDay[] }
  type SlideMode = 'normal' | 'other-grouped' | 'other-single'
  type Slide = { key: string; section: SectionConfig; location: LocationResult; title: string; mode: SlideMode }

  const appBase = import.meta.env.BASE_URL.replace(/\/$/, '')
  const homeHref = `${appBase || '/'}`
  const backgroundImages = [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1499346030926-9a72daac6c63?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1800&q=80',
  ]

  const defaultSections: SectionConfig[] = [
    { id: 'current', type: 'current', title: 'Tiempo actual', enabled: true },
    { id: 'forecast', type: 'forecast', title: 'Previsión próximos días', enabled: true, days: 5 },
    { id: 'future-extremes', type: 'future-extremes', title: 'Máximas y mínimas próximos días', enabled: true, days: 7 },
    { id: 'past-extremes', type: 'past-extremes', title: 'Máximas y mínimas días anteriores', enabled: false, days: 5 },
    { id: 'interest', type: 'interest', title: 'Más datos de interés', enabled: true, metrics: ['uv', 'sunrise', 'sunset', 'wind', 'humidity'] },
    { id: 'message', type: 'message', title: 'Mensaje personalizado', enabled: false, message: 'Información meteorológica actualizada automáticamente.' },
    { id: 'other-current', type: 'other-current', title: 'Tiempo actual en otros municipios', enabled: false },
    { id: 'other-forecast', type: 'other-forecast', title: 'Previsión en otros municipios', enabled: false, days: 3 },
  ]

  const themeOptions: { id: ChannelTheme; name: string; description: string }[] = [
    { id: 'minimal', name: 'Minimal central', description: 'Premium, limpio y centrado.' },
    { id: 'lower-left', name: 'Rótulo inferior', description: 'Magazine con pastilla abajo.' },
    { id: 'split', name: 'Informativo split', description: 'Panel lateral y bloque principal.' },
    { id: 'glass', name: 'Cristal atmosférico', description: 'Neón suave y transparencia.' },
    { id: 'ticker', name: 'CNN weather', description: 'Cabecera blanca y ticker TV.' },
    { id: 'poster', name: 'Póster', description: 'Temperatura gigante y editorial.' },
    { id: 'dashboard', name: 'Weather TV azul', description: 'Paneles azules tipo app del tiempo.' },
    { id: 'cinema', name: 'Cinemático', description: 'Franja panorámica y fundidos.' },
    { id: 'vertical', name: 'Vertical social', description: 'Pantallas verticales.' },
    { id: 'cards', name: 'Panel público', description: 'Mosaico claro tipo aeropuerto.' },
  ]
  const nameStyles: { id: ChannelNameStyle; label: string }[] = [
    { id: 'default', label: 'Normal del theme' },
    { id: 'boxed', label: 'Caja sólida' },
    { id: 'pill', label: 'Pastilla redondeada' },
    { id: 'huge', label: 'Muy grande protagonista' },
    { id: 'corner', label: 'Pequeño en esquina' },
    { id: 'hidden-soft', label: 'Discreto/transparente' },
  ]
  const metricOptions = [
    { id: 'uv', label: 'Índice UV' },
    { id: 'sunrise', label: 'Salida del sol' },
    { id: 'sunset', label: 'Puesta del sol' },
    { id: 'wind', label: 'Viento' },
    { id: 'humidity', label: 'Humedad' },
    { id: 'precipitation', label: 'Lluvia prevista' },
  ]

  const defaultConfig: ChannelConfig = {
    channelName: 'TiempoTV Cáceres',
    location: { name: 'Cáceres', latitude: 39.4765, longitude: -6.3722, country: 'España', admin1: 'Extremadura', timezone: 'Europe/Madrid' },
    otherLocations: [
      { name: 'Madrid', latitude: 40.4165, longitude: -3.7026, country: 'España', admin1: 'Madrid', timezone: 'Europe/Madrid' },
      { name: 'Plasencia', latitude: 40.0312, longitude: -6.0885, country: 'España', admin1: 'Extremadura', timezone: 'Europe/Madrid' },
    ],
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

  let config: ChannelConfig = structuredClone(defaultConfig)
  let viewMode: 'configurator' | 'channel' = 'configurator'
  let weatherByLocation = new Map<string, WeatherBundle>()
  let loading = false
  let errorMessage = ''
  let lastUpdated = ''
  let activeSlideIndex = 0
  let searchTerm = config.location?.name ?? ''
  let otherSearchTerm = ''
  let searchResults: LocationResult[] = []
  let otherSearchResults: LocationResult[] = []
  let searchTimer: number | undefined
  let otherSearchTimer: number | undefined
  let sectionTimer: number | undefined
  let draggedSectionId = ''

  $: allLocations = [config.location, ...config.otherLocations].filter(Boolean) as LocationResult[]
  $: channelLocations = config.locationMode === 'multi' ? allLocations : (config.location ? [config.location] : [])
  $: enabledSections = config.sections.filter((section) => section.enabled)
  $: slides = buildSlides()
  $: if (slides.length && activeSlideIndex >= slides.length) activeSlideIndex = 0
  $: activeSlide = slides[activeSlideIndex]
  $: activeWeather = activeSlide ? weatherByLocation.get(locationKey(activeSlide.location)) : null
  $: generatedUrl = buildChannelUrl(config)
  $: channelStyle = `--channel-bg:${config.backgroundColor}; --channel-text:${config.textColor}; --channel-card:${hexToRgba(config.cardColor, 0.78)}; --channel-image:url('${backgroundImages[activeSlideIndex % backgroundImages.length]}'); --section-cycle:${Math.max(4, config.transitionSeconds)}s`
  $: channelClass = `tv-screen theme-${config.theme} name-${config.channelNameStyle}`
  $: previewClass = `preview-frame theme-${config.theme} name-${config.channelNameStyle}`

  onMount(() => {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('config')
    const cleanPath = window.location.pathname.replace(new RegExp(`^${appBase}`), '')
    if (cleanPath.startsWith('/canal') && encoded) {
      const decoded = decodeConfig(encoded)
      if (decoded) config = decoded
      viewMode = 'channel'
    }
    void refreshWeather()
    startAutoRotation()
    return () => {
      window.clearTimeout(searchTimer)
      window.clearTimeout(otherSearchTimer)
      window.clearInterval(sectionTimer)
    }
  })

  function locationKey(location: LocationResult) {
    return `${location.name}-${location.latitude}-${location.longitude}`
  }

  function buildSlides(): Slide[] {
    if (!config.location) return []
    const baseSections = enabledSections.filter((section) => !section.type.startsWith('other-'))
    const otherSections = enabledSections.filter((section) => section.type.startsWith('other-'))
    const result: Slide[] = []

    if (config.locationMode === 'multi') {
      for (const location of channelLocations) {
        for (const section of baseSections) {
          result.push({ key: `${locationKey(location)}-${section.id}`, section, location, title: `${section.title} · ${location.name}`, mode: 'normal' })
        }
      }
      return result
    }

    for (const section of baseSections) {
      result.push({ key: `main-${section.id}`, section, location: config.location, title: section.title, mode: 'normal' })
    }

    for (const section of otherSections) {
      if (config.otherMunicipalityMode === 'individual') {
        for (const location of config.otherLocations) {
          result.push({ key: `${section.id}-${locationKey(location)}`, section, location, title: `${section.title}: ${location.name}`, mode: 'other-single' })
        }
      } else {
        result.push({ key: `${section.id}-grouped`, section, location: config.location, title: section.title, mode: 'other-grouped' })
      }
    }

    return result
  }

  function encodeConfig(value: ChannelConfig) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  }

  function decodeConfig(value: string): ChannelConfig | null {
    try {
      const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
      const parsed = JSON.parse(decodeURIComponent(escape(atob(padded)))) as Partial<ChannelConfig>
      return {
        ...structuredClone(defaultConfig),
        ...parsed,
        sections: parsed.sections?.length ? parsed.sections : structuredClone(defaultSections),
        showLive: parsed.showLive ?? true,
        showProgress: parsed.showProgress ?? true,
        showChannelName: parsed.showChannelName ?? true,
        showSectionTitles: parsed.showSectionTitles ?? true,
        channelNameStyle: parsed.channelNameStyle ?? 'default',
        locationMode: parsed.locationMode ?? 'single',
        otherMunicipalityMode: parsed.otherMunicipalityMode ?? 'grouped',
      }
    } catch {
      return null
    }
  }

  function buildChannelUrl(value: ChannelConfig) {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}${appBase}/canal?config=${encodeConfig(value)}`
  }

  function hexToRgba(hex: string, alpha: number) {
    const clean = hex.replace('#', '')
    if (clean.length !== 6) return hex
    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  async function refreshWeather() {
    if (!allLocations.length) return
    loading = true
    errorMessage = ''
    try {
      const entries = await Promise.all(allLocations.map(async (location) => [locationKey(location), await fetchWeather(location)] as const))
      weatherByLocation = new Map(entries)
      lastUpdated = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'No se han podido cargar los datos del tiempo.'
    } finally {
      loading = false
    }
  }

  async function fetchWeather(location: LocationResult): Promise<WeatherBundle> {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', String(location.latitude))
    url.searchParams.set('longitude', String(location.longitude))
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
        isDay: data.current.is_day,
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
      const results = (data.results ?? []).map((item: LocationResult) => ({ id: item.id, name: item.name, latitude: item.latitude, longitude: item.longitude, country: item.country, admin1: item.admin1, timezone: item.timezone }))
      if (target === 'main') searchResults = results
      else otherSearchResults = results
    } catch {
      if (target === 'main') searchResults = []
      else otherSearchResults = []
    }
  }

  function onMainSearchInput() {
    window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => searchMunicipalities(searchTerm, 'main'), 250)
  }
  function onOtherSearchInput() {
    window.clearTimeout(otherSearchTimer)
    otherSearchTimer = window.setTimeout(() => searchMunicipalities(otherSearchTerm, 'other'), 250)
  }
  function selectLocation(location: LocationResult) {
    config.location = location
    searchTerm = `${location.name}${location.admin1 ? `, ${location.admin1}` : ''}`
    searchResults = []
    activeSlideIndex = 0
    void refreshWeather()
  }
  function addOtherLocation(location: LocationResult) {
    if (!config.otherLocations.some((item) => item.name === location.name && item.latitude === location.latitude)) config.otherLocations = [...config.otherLocations, location]
    otherSearchTerm = ''
    otherSearchResults = []
    activeSlideIndex = 0
    void refreshWeather()
  }
  function removeOtherLocation(location: LocationResult) {
    config.otherLocations = config.otherLocations.filter((item) => item !== location)
    activeSlideIndex = 0
    void refreshWeather()
  }
  function startAutoRotation() {
    window.clearInterval(sectionTimer)
    sectionTimer = window.setInterval(() => {
      if (slides.length > 1) activeSlideIndex = (activeSlideIndex + 1) % slides.length
    }, Math.max(4, config.transitionSeconds) * 1000)
  }
  function goToSlide(index: number) {
    activeSlideIndex = index
    startAutoRotation()
  }
  function onSectionDragStart(event: DragEvent, sectionId: string) {
    draggedSectionId = sectionId
    event.dataTransfer?.setData('text/plain', sectionId)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }
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
    config.sections = sections
    activeSlideIndex = 0
    draggedSectionId = ''
  }
  function moveSection(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= config.sections.length) return
    const sections = [...config.sections]
    const [item] = sections.splice(index, 1)
    sections.splice(nextIndex, 0, item)
    config.sections = sections
    activeSlideIndex = 0
  }
  function toggleSection(section: SectionConfig) {
    section.enabled = !section.enabled
    config.sections = [...config.sections]
    activeSlideIndex = 0
  }
  function toggleMetric(metric: string) {
    const section = config.sections.find((item) => item.type === 'interest')
    if (!section) return
    const metrics = new Set(section.metrics ?? [])
    if (metrics.has(metric)) metrics.delete(metric)
    else metrics.add(metric)
    section.metrics = [...metrics]
    config.sections = [...config.sections]
  }
  function copyUrl() { void navigator.clipboard?.writeText(generatedUrl) }
  function openChannel() { window.open(generatedUrl, '_blank', 'noopener,noreferrer') }
  function formatDay(date: string) { return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(date)) }
  function formatTime(date?: string) { return date ? new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(date)) : '--:--' }
  function weatherLabel(code: number) {
    if (code === 0) return 'Despejado'
    if ([1, 2].includes(code)) return 'Poco nuboso'
    if (code === 3) return 'Cubierto'
    if ([45, 48].includes(code)) return 'Niebla'
    if ([51, 53, 55, 56, 57].includes(code)) return 'Llovizna'
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Lluvia'
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Nieve'
    if ([95, 96, 99].includes(code)) return 'Tormenta'
    return 'Variable'
  }
  function weatherIcon(code: number) {
    if (config.iconStyle === 'line') return code <= 1 ? '☼' : code <= 3 ? '☁' : [61, 63, 65, 80, 81, 82].includes(code) ? '╱╱' : [95, 96, 99].includes(code) ? 'ϟ' : '◌'
    if (config.iconStyle === 'solid') return code <= 1 ? '●' : code <= 3 ? '◕' : [61, 63, 65, 80, 81, 82].includes(code) ? '◆' : [95, 96, 99].includes(code) ? '▲' : '◼'
    if (code <= 1) return '☀️'
    if (code <= 3) return '⛅'
    if ([45, 48].includes(code)) return '🌫️'
    if ([61, 63, 65, 80, 81, 82].includes(code)) return '🌧️'
    if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️'
    if ([95, 96, 99].includes(code)) return '⛈️'
    return '🌤️'
  }
</script>

{#if viewMode === 'channel'}
  <main class={channelClass} style={channelStyle} aria-live="polite">
    <div class:with-image={config.randomImages} class="tv-background"></div>
    <div class="tv-overlay">
      {#if config.showChannelName}
        <header class="tv-header"><div class="tv-title-box"><p class="eyebrow">{activeSlide?.location.name ?? config.location?.name ?? 'Tiempo local'}</p><h1>{config.channelName}</h1></div>{#if config.showLive}<div class="live-pill">Directo</div>{/if}{#if config.showProgress && slides.length}<div class="section-progress">{activeSlideIndex + 1}/{slides.length}</div>{/if}</header>
      {:else if config.showLive || config.showProgress}
        <header class="tv-header tv-header-compact">{#if config.showLive}<div class="live-pill">Directo</div>{/if}{#if config.showProgress && slides.length}<div class="section-progress">{activeSlideIndex + 1}/{slides.length}</div>{/if}</header>
      {/if}
      {#if loading}<section class="tv-card tv-center"><p>Cargando datos meteorológicos…</p></section>{:else if errorMessage}<section class="tv-card tv-center"><p>{errorMessage}</p></section>{:else if activeSlide && activeWeather}{#key activeSlide.key}<section class="tv-card tv-content fade" aria-label={activeSlide.title}>{@render ChannelSection(activeSlide, activeWeather, false)}</section>{/key}{/if}
      <footer class="tv-footer"><span>Datos: Open-Meteo</span><span>{lastUpdated ? `Actualizado: ${lastUpdated}` : ''}</span></footer>
      <div class="generated-by">Generado por tiempotv.alon.one</div>
    </div>
  </main>
{:else}
  <div class="app-shell">
    <header class="site-header"><a class="brand" href={homeHref} aria-label="TiempoTV"><span class="brand-mark">TV</span><span>TiempoTV</span></a><nav aria-label="Navegación principal"><a href="#configurador">Configurador</a><a href="#preview">Previsualización</a><a href="#url">URL</a></nav></header>
    <main id="main">
      <section class="hero-section"><div class="hero-copy"><p class="badge">Canales meteorológicos automáticos</p><h1>Generador de canales de televisión del tiempo</h1><p>Configura un canal meteorológico para una pantalla, televisión o emisión. Puedes usar un municipio o repetir todas las secciones para varios municipios.</p><div class="hero-actions"><a class="btn btn-primary" href="#configurador">Crear canal</a><button class="btn btn-secondary" type="button" on:click={openChannel}>Abrir emisión</button></div></div><div class={`mini-tv theme-${config.theme} name-${config.channelNameStyle}`} style={channelStyle}><div class="mini-tv-card"><span>{weatherIcon(activeWeather?.current.code ?? 1)}</span><strong>{activeWeather?.current.temperature ?? 22}°</strong><small>{activeSlide?.location.name ?? config.location?.name}</small></div></div></section>
      <section class="workspace" id="configurador">
        <div class="panel config-panel">
          <div class="panel-heading"><p class="eyebrow">Configuración</p><h2>Diseña tu canal</h2></div>
          <div class="form-grid">
            <label><span class="label">Nombre del canal</span><input class="input" bind:value={config.channelName} /></label>
            <label class="search-field"><span class="label">Municipio principal</span><input class="input" bind:value={searchTerm} on:input={onMainSearchInput} placeholder="Buscar municipio" />{#if searchResults.length}<ul class="suggestions">{#each searchResults as result}<li><button type="button" on:click={() => selectLocation(result)}>{result.name} <small>{result.admin1} · {result.country}</small></button></li>{/each}</ul>{/if}</label>
            <label><span class="label">Modo de municipios</span><select class="select" bind:value={config.locationMode} on:change={() => (activeSlideIndex = 0)}><option value="single">Un solo municipio</option><option value="multi">Varios municipios: repetir todas las secciones por cada municipio</option></select></label>
            <label><span class="label">Otros municipios</span><select class="select" bind:value={config.otherMunicipalityMode} disabled={config.locationMode === 'multi'} on:change={() => (activeSlideIndex = 0)}><option value="grouped">Agrupados en una misma sección</option><option value="individual">Una sección independiente por municipio</option></select></label>
            <label><span class="label">Theme del canal</span><select class="select" bind:value={config.theme}>{#each themeOptions as theme}<option value={theme.id}>{theme.name}</option>{/each}</select></label>
            <label><span class="label">Estilo del nombre del canal</span><select class="select" bind:value={config.channelNameStyle}>{#each nameStyles as option}<option value={option.id}>{option.label}</option>{/each}</select></label>
            <label><span class="label">Color de fondo</span><input class="input color-input" type="color" bind:value={config.backgroundColor} /></label><label><span class="label">Color del texto</span><input class="input color-input" type="color" bind:value={config.textColor} /></label><label><span class="label">Color de recuadros</span><input class="input color-input" type="color" bind:value={config.cardColor} /></label>
            <label><span class="label">Tipo de iconos</span><select class="select" bind:value={config.iconStyle}><option value="emoji">Emoji meteorológico</option><option value="line">Línea simple</option><option value="solid">Sólido minimalista</option></select></label>
            <label><span class="label">Transición entre secciones</span><input class="input" type="number" min="4" max="120" bind:value={config.transitionSeconds} on:change={startAutoRotation} /><span class="help-text">Segundos por pantalla.</span></label>
          </div>
          <div class="option-grid"><label class="switch-row"><input type="checkbox" bind:checked={config.randomImages} /><span><strong>Fondo con imágenes aleatorias</strong><small>Cielo, nubes y paisaje.</small></span></label><label class="switch-row"><input type="checkbox" bind:checked={config.showLive} /><span><strong>Mostrar “Directo”</strong><small>Rótulo de emisión.</small></span></label><label class="switch-row"><input type="checkbox" bind:checked={config.showProgress} /><span><strong>Mostrar progreso 1/5</strong><small>Indica por qué sección va.</small></span></label><label class="switch-row"><input type="checkbox" bind:checked={config.showChannelName} /><span><strong>Mostrar nombre del canal</strong><small>Se puede ocultar.</small></span></label><label class="switch-row"><input type="checkbox" bind:checked={config.showSectionTitles} /><span><strong>Mostrar títulos en secciones</strong><small>Previsión, UV, máximas…</small></span></label></div>
          <div class="theme-gallery">{#each themeOptions as theme}<button class:theme-selected={config.theme === theme.id} type="button" on:click={() => (config.theme = theme.id)}><span>{theme.name}</span><small>{theme.description}</small></button>{/each}</div>
          <div class="other-cities"><div class="panel-heading compact"><p class="eyebrow">Municipios adicionales</p><h2>{config.locationMode === 'multi' ? 'Se repetirá todo por cada municipio' : 'Para secciones de otros municipios'}</h2></div><label class="search-field"><span class="label">Añadir municipio</span><input class="input" bind:value={otherSearchTerm} on:input={onOtherSearchInput} placeholder="Madrid, Plasencia, Sevilla…" />{#if otherSearchResults.length}<ul class="suggestions">{#each otherSearchResults as result}<li><button type="button" on:click={() => addOtherLocation(result)}>{result.name} <small>{result.admin1} · {result.country}</small></button></li>{/each}</ul>{/if}</label><div class="chips">{#each config.otherLocations as location}<button class="chip" type="button" on:click={() => removeOtherLocation(location)}>{location.name} ×</button>{/each}</div></div>
          <div class="section-editor"><div class="panel-heading compact"><p class="eyebrow">Secciones</p><h2>Orden y contenido</h2><p class="help-text">Arrastra cada bloque para cambiar el orden o usa las flechas.</p></div>{#each config.sections as section, index (section.id)}<article class:dragging={draggedSectionId === section.id} class="section-row" draggable="true" on:dragstart={(event) => onSectionDragStart(event, section.id)} on:dragover|preventDefault on:drop={(event) => onSectionDrop(event, section.id)} on:dragend={() => (draggedSectionId = '')}><div class="drag-handle" aria-hidden="true">⋮⋮</div><div class="section-main"><label class="toggle-label"><input type="checkbox" checked={section.enabled} on:change={() => toggleSection(section)} /><span>{section.title}</span></label><label><span class="label">Título de la sección</span><input class="input" bind:value={section.title} on:input={() => (config.sections = [...config.sections])} /></label>{#if ['forecast', 'future-extremes', 'past-extremes', 'other-forecast'].includes(section.type)}<label class="inline-control">Días <input type="number" min="1" max="14" bind:value={section.days} on:change={() => (config.sections = [...config.sections])} /></label>{/if}{#if section.type === 'message'}<textarea class="textarea" bind:value={section.message} on:input={() => (config.sections = [...config.sections])}></textarea>{/if}{#if section.type === 'interest'}<div class="metrics-grid">{#each metricOptions as metric}<label><input type="checkbox" checked={section.metrics?.includes(metric.id)} on:change={() => toggleMetric(metric.id)} /> {metric.label}</label>{/each}</div>{/if}</div><div class="row-actions"><button class="icon-button" type="button" on:click={() => moveSection(index, -1)}>↑</button><button class="icon-button" type="button" on:click={() => moveSection(index, 1)}>↓</button></div></article>{/each}</div>
        </div>
        <aside class="panel preview-panel" id="preview"><div class="panel-heading"><p class="eyebrow">Vista previa</p><h2>Así se verá en pantalla</h2>{#if activeSlide}<p class="help-text">Sección {activeSlideIndex + 1} de {slides.length}: {activeSlide.title}</p>{/if}</div><div class={previewClass} style={channelStyle}><div class:with-image={config.randomImages} class="tv-background"></div><div class="preview-content">{#if config.showChannelName}<header class="preview-title-box"><span>{activeSlide?.location.name}</span><strong>{config.channelName}</strong>{#if config.showLive}<em>Directo</em>{/if}{#if config.showProgress}<em>{activeSlideIndex + 1}/{slides.length}</em>{/if}</header>{/if}<div class="preview-card">{#if activeSlide && activeWeather}{@render ChannelSection(activeSlide, activeWeather, true)}{:else}<p>Cargando previsualización…</p>{/if}</div><div class="preview-generated">Generado por tiempotv.alon.one</div></div></div>{#if slides.length}<div class="preview-dots">{#each slides as slide, index}<button class:active-dot={index === activeSlideIndex} type="button" title={slide.title} on:click={() => goToSlide(index)}></button>{/each}</div>{/if}<div class="url-box" id="url"><label><span class="label">URL de emisión</span><textarea class="textarea url-textarea" readonly value={generatedUrl}></textarea></label><div class="hero-actions"><button class="btn btn-primary" type="button" on:click={openChannel}>Abrir canal</button><button class="btn btn-secondary" type="button" on:click={copyUrl}>Copiar URL</button></div></div></aside>
      </section>
    </main>
  </div>
{/if}

{#snippet ChannelSection(slide: Slide, weather: WeatherBundle, compact = false)}
  <div class:compact-section={compact} class="channel-section">
    {#if config.showSectionTitles}<p class="eyebrow section-kicker">{slide.title}</p>{/if}
    {#if slide.mode === 'other-grouped'}<div class="other-grid">{#each config.otherLocations as location}{@const item = weatherByLocation.get(locationKey(location))}{#if item}<article><span>{location.name}</span><strong>{item.current.temperature}°</strong><small>{weatherIcon(item.current.code)} {weatherLabel(item.current.code)}</small></article>{/if}{/each}</div>
    {:else if slide.mode === 'other-single'}{@const item = weatherByLocation.get(locationKey(slide.location))}{#if item}{#if slide.section.type === 'other-current'}<div class="current-layout"><div class="big-icon">{weatherIcon(item.current.code)}</div><div class="current-copy"><h2>{item.current.temperature}°C</h2><p>{slide.location.name} · {weatherLabel(item.current.code)}</p><div class="weather-stats"><span>Sensación {item.current.apparent}°</span><span>Humedad {item.current.humidity}%</span><span>Viento {item.current.wind} km/h</span></div></div></div>{:else}<div class="forecast-grid">{#each item.daily.slice(0, slide.section.days ?? 3) as day}<article><strong>{formatDay(day.date)}</strong><span class="day-icon">{weatherIcon(day.code)}</span><small>{weatherLabel(day.code)}</small><b>{day.max}° / {day.min}°</b></article>{/each}</div>{/if}{/if}
    {:else if slide.section.type === 'current'}<div class="current-layout"><div class="big-icon">{weatherIcon(weather.current.code)}</div><div class="current-copy"><h2>{weather.current.temperature}°C</h2><p>{slide.location.name} · {weatherLabel(weather.current.code)}</p><div class="weather-stats"><span>Sensación {weather.current.apparent}°</span><span>Humedad {weather.current.humidity}%</span><span>Viento {weather.current.wind} km/h</span></div></div></div>
    {:else if slide.section.type === 'forecast'}<div class="forecast-grid">{#each weather.daily.slice(0, slide.section.days ?? 5) as day}<article><strong>{formatDay(day.date)}</strong><span class="day-icon">{weatherIcon(day.code)}</span><small>{weatherLabel(day.code)}</small><b>{day.max}° / {day.min}°</b></article>{/each}</div>
    {:else if slide.section.type === 'future-extremes'}<div class="extremes-grid">{#each weather.daily.slice(0, slide.section.days ?? 7) as day}<article><span>{formatDay(day.date)}</span><strong>{day.max}°</strong><small>{day.min}°</small></article>{/each}</div>
    {:else if slide.section.type === 'past-extremes'}<div class="extremes-grid">{#each weather.past.slice(0, slide.section.days ?? 5) as day}<article><span>{formatDay(day.date)}</span><strong>{day.max}°</strong><small>{day.min}°</small></article>{/each}</div>
    {:else if slide.section.type === 'interest'}<div class="interest-grid">{#if slide.section.metrics?.includes('uv')}<article><span>Índice UV</span><strong>{weather.daily[0]?.uv.toFixed(1)}</strong></article>{/if}{#if slide.section.metrics?.includes('sunrise')}<article><span>Sale el sol</span><strong>{formatTime(weather.daily[0]?.sunrise)}</strong></article>{/if}{#if slide.section.metrics?.includes('sunset')}<article><span>Se pone el sol</span><strong>{formatTime(weather.daily[0]?.sunset)}</strong></article>{/if}{#if slide.section.metrics?.includes('wind')}<article><span>Viento</span><strong>{weather.current.wind} km/h</strong></article>{/if}{#if slide.section.metrics?.includes('humidity')}<article><span>Humedad</span><strong>{weather.current.humidity}%</strong></article>{/if}{#if slide.section.metrics?.includes('precipitation')}<article><span>Lluvia hoy</span><strong>{weather.daily[0]?.precipitation} mm</strong></article>{/if}</div>
    {:else if slide.section.type === 'message'}<div class="message-block"><p>{slide.section.message}</p></div>{/if}
  </div>
{/snippet}
