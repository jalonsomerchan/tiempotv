<script lang="ts">
  import { onMount } from 'svelte'

  type LocationResult = {
    id?: number
    name: string
    latitude: number
    longitude: number
    country?: string
    admin1?: string
    timezone?: string
  }

  type SectionType =
    | 'current'
    | 'forecast'
    | 'future-extremes'
    | 'past-extremes'
    | 'interest'
    | 'message'
    | 'other-current'
    | 'other-forecast'

  type SectionConfig = {
    id: string
    type: SectionType
    title: string
    enabled: boolean
    days?: number
    message?: string
    metrics?: string[]
  }

  type ChannelConfig = {
    channelName: string
    location: LocationResult | null
    backgroundColor: string
    textColor: string
    cardColor: string
    randomImages: boolean
    iconStyle: 'emoji' | 'line' | 'solid'
    transitionSeconds: number
    sections: SectionConfig[]
    otherLocations: LocationResult[]
  }

  type WeatherDay = {
    date: string
    max: number
    min: number
    code: number
    precipitation: number
    sunrise: string
    sunset: string
    uv: number
  }

  type WeatherBundle = {
    current: {
      temperature: number
      apparent: number
      humidity: number
      wind: number
      code: number
      isDay: number
    }
    daily: WeatherDay[]
    past: WeatherDay[]
  }

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

  const defaultConfig: ChannelConfig = {
    channelName: 'TiempoTV Cáceres',
    location: {
      name: 'Cáceres',
      latitude: 39.4765,
      longitude: -6.3722,
      country: 'España',
      admin1: 'Extremadura',
      timezone: 'Europe/Madrid',
    },
    backgroundColor: '#06162f',
    textColor: '#f8fafc',
    cardColor: 'rgba(15, 23, 42, 0.72)',
    randomImages: true,
    iconStyle: 'emoji',
    transitionSeconds: 12,
    sections: structuredClone(defaultSections),
    otherLocations: [
      { name: 'Madrid', latitude: 40.4165, longitude: -3.7026, country: 'España', admin1: 'Madrid', timezone: 'Europe/Madrid' },
      { name: 'Plasencia', latitude: 40.0312, longitude: -6.0885, country: 'España', admin1: 'Extremadura', timezone: 'Europe/Madrid' },
    ],
  }

  const backgroundImages = [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1499346030926-9a72daac6c63?auto=format&fit=crop&w=1800&q=80',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=80',
  ]

  const metricOptions = [
    { id: 'uv', label: 'Índice UV' },
    { id: 'sunrise', label: 'Salida del sol' },
    { id: 'sunset', label: 'Puesta del sol' },
    { id: 'wind', label: 'Viento' },
    { id: 'humidity', label: 'Humedad' },
    { id: 'precipitation', label: 'Lluvia prevista' },
  ]

  let config: ChannelConfig = structuredClone(defaultConfig)
  let viewMode: 'configurator' | 'channel' = 'configurator'
  let searchTerm = config.location?.name ?? ''
  let otherSearchTerm = ''
  let searchResults: LocationResult[] = []
  let otherSearchResults: LocationResult[] = []
  let weather: WeatherBundle | null = null
  let otherWeather = new Map<string, WeatherBundle>()
  let loading = false
  let errorMessage = ''
  let activeSectionIndex = 0
  let generatedUrl = ''
  let lastUpdated = ''
  let searchTimer: number | undefined
  let otherSearchTimer: number | undefined
  let sectionTimer: number | undefined

  $: enabledSections = config.sections.filter((section) => section.enabled)
  $: activeSection = enabledSections[activeSectionIndex] ?? enabledSections[0]
  $: channelStyle = `--channel-bg:${config.backgroundColor}; --channel-text:${config.textColor}; --channel-card:${config.cardColor}; --channel-image:url('${backgroundImages[activeSectionIndex % backgroundImages.length]}')`
  $: generatedUrl = buildChannelUrl(config)

  onMount(() => {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('config')

    if (window.location.pathname.startsWith('/canal') && encoded) {
      const decoded = decodeConfig(encoded)
      if (decoded) {
        config = decoded
      }
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

  function encodeConfig(value: ChannelConfig) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value))))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '')
  }

  function decodeConfig(value: string): ChannelConfig | null {
    try {
      const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
      const parsed = JSON.parse(decodeURIComponent(escape(atob(padded)))) as ChannelConfig
      return { ...structuredClone(defaultConfig), ...parsed, sections: parsed.sections?.length ? parsed.sections : structuredClone(defaultSections) }
    } catch {
      return null
    }
  }

  function buildChannelUrl(value: ChannelConfig) {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/canal?config=${encodeConfig(value)}`
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
        latitude: item.latitude,
        longitude: item.longitude,
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
    void refreshWeather()
  }

  function addOtherLocation(location: LocationResult) {
    if (!config.otherLocations.some((item) => item.name === location.name && item.latitude === location.latitude)) {
      config.otherLocations = [...config.otherLocations, location]
    }
    otherSearchTerm = ''
    otherSearchResults = []
    void refreshWeather()
  }

  function removeOtherLocation(location: LocationResult) {
    config.otherLocations = config.otherLocations.filter((item) => item !== location)
    void refreshWeather()
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

  async function refreshWeather() {
    if (!config.location) return
    loading = true
    errorMessage = ''

    try {
      weather = await fetchWeather(config.location)
      const entries = await Promise.all(config.otherLocations.map(async (location) => [location.name, await fetchWeather(location)] as const))
      otherWeather = new Map(entries)
      lastUpdated = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'No se han podido cargar los datos del tiempo.'
    } finally {
      loading = false
    }
  }

  function startAutoRotation() {
    window.clearInterval(sectionTimer)
    sectionTimer = window.setInterval(() => {
      if (enabledSections.length > 1) {
        activeSectionIndex = (activeSectionIndex + 1) % enabledSections.length
      }
    }, Math.max(4, config.transitionSeconds) * 1000)
  }

  function updateTransition() {
    startAutoRotation()
  }

  function moveSection(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= config.sections.length) return
    const sections = [...config.sections]
    const [item] = sections.splice(index, 1)
    sections.splice(nextIndex, 0, item)
    config.sections = sections
  }

  function toggleSection(section: SectionConfig) {
    section.enabled = !section.enabled
    config.sections = [...config.sections]
    activeSectionIndex = 0
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

  function copyUrl() {
    void navigator.clipboard?.writeText(generatedUrl)
  }

  function openChannel() {
    window.open(generatedUrl, '_blank', 'noopener,noreferrer')
  }

  function formatDay(date: string) {
    return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(date))
  }

  function formatTime(date: string) {
    return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(date))
  }

  function weatherLabel(code: number) {
    if ([0].includes(code)) return 'Despejado'
    if ([1, 2].includes(code)) return 'Poco nuboso'
    if ([3].includes(code)) return 'Cubierto'
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
  <main class="tv-screen" style={channelStyle} aria-live="polite">
    <div class:with-image={config.randomImages} class="tv-background"></div>
    <div class="tv-overlay">
      <header class="tv-header">
        <div>
          <p class="eyebrow">{config.location?.name ?? 'Tiempo local'}</p>
          <h1>{config.channelName}</h1>
        </div>
        <div class="live-pill">Directo</div>
      </header>

      {#if loading}
        <section class="tv-card tv-center"><p>Cargando datos meteorológicos…</p></section>
      {:else if errorMessage}
        <section class="tv-card tv-center"><p>{errorMessage}</p></section>
      {:else if activeSection && weather}
        <section class="tv-card tv-content fade" aria-label={activeSection.title}>
          {@render ChannelSection(activeSection, weather, config, otherWeather)}
        </section>
      {/if}

      <footer class="tv-footer">
        <span>Datos: Open-Meteo</span>
        <span>{lastUpdated ? `Actualizado: ${lastUpdated}` : ''}</span>
      </footer>
    </div>
  </main>
{:else}
  <div class="app-shell">
    <header class="site-header">
      <a class="brand" href="/" aria-label="TiempoTV">
        <span class="brand-mark">TV</span>
        <span>TiempoTV</span>
      </a>
      <nav aria-label="Navegación principal">
        <a href="#configurador">Configurador</a>
        <a href="#preview">Previsualización</a>
        <a href="#url">URL del canal</a>
      </nav>
    </header>

    <main id="main">
      <section class="hero-section">
        <div class="hero-copy">
          <p class="badge">Canales meteorológicos automáticos</p>
          <h1>Generador de canales de televisión del tiempo</h1>
          <p>
            Configura un canal minimalista para mostrar el tiempo de un municipio en una televisión,
            pantalla informativa o emisión grabada. Los datos se cargan desde Open-Meteo.
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#configurador">Crear canal</a>
            <button class="btn btn-secondary" type="button" on:click={openChannel}>Abrir emisión</button>
          </div>
        </div>
        <div class="mini-tv" style={channelStyle}>
          <div class="mini-tv-card">
            <span>{weatherIcon(weather?.current.code ?? 1)}</span>
            <strong>{weather?.current.temperature ?? 22}°</strong>
            <small>{config.location?.name}</small>
          </div>
        </div>
      </section>

      <section class="workspace" id="configurador">
        <div class="panel config-panel">
          <div class="panel-heading">
            <p class="eyebrow">Configuración</p>
            <h2>Diseña tu canal</h2>
          </div>

          <div class="form-grid">
            <label>
              <span class="label">Nombre del canal</span>
              <input class="input" bind:value={config.channelName} />
            </label>

            <label class="search-field">
              <span class="label">Municipio principal</span>
              <input class="input" bind:value={searchTerm} on:input={onMainSearchInput} placeholder="Buscar municipio" />
              {#if searchResults.length}
                <ul class="suggestions">
                  {#each searchResults as result}
                    <li><button type="button" on:click={() => selectLocation(result)}>{result.name} <small>{result.admin1} · {result.country}</small></button></li>
                  {/each}
                </ul>
              {/if}
            </label>

            <label>
              <span class="label">Color de fondo</span>
              <input class="input color-input" type="color" bind:value={config.backgroundColor} />
            </label>

            <label>
              <span class="label">Color del texto</span>
              <input class="input color-input" type="color" bind:value={config.textColor} />
            </label>

            <label>
              <span class="label">Fondo de recuadros</span>
              <input class="input" bind:value={config.cardColor} placeholder="rgba(15, 23, 42, 0.72)" />
            </label>

            <label>
              <span class="label">Tipo de iconos</span>
              <select class="select" bind:value={config.iconStyle}>
                <option value="emoji">Emoji meteorológico</option>
                <option value="line">Línea simple</option>
                <option value="solid">Sólido minimalista</option>
              </select>
            </label>

            <label>
              <span class="label">Transición entre secciones</span>
              <input class="input" type="number" min="4" max="120" bind:value={config.transitionSeconds} on:change={updateTransition} />
              <span class="help-text">Segundos por pantalla.</span>
            </label>

            <label class="switch-row">
              <input type="checkbox" bind:checked={config.randomImages} />
              <span>
                <strong>Fondo con imágenes aleatorias</strong>
                <small>Usa fotografías ambientales de cielo, nubes y paisaje.</small>
              </span>
            </label>
          </div>

          <div class="section-editor">
            <div class="panel-heading compact">
              <p class="eyebrow">Secciones</p>
              <h2>Orden y contenido</h2>
            </div>

            {#each config.sections as section, index (section.id)}
              <article class="section-row">
                <div class="section-main">
                  <label class="toggle-label">
                    <input type="checkbox" checked={section.enabled} on:change={() => toggleSection(section)} />
                    <span>{section.title}</span>
                  </label>

                  {#if ['forecast', 'future-extremes', 'past-extremes', 'other-forecast'].includes(section.type)}
                    <label class="inline-control">Días <input type="number" min="1" max="14" bind:value={section.days} on:change={() => (config.sections = [...config.sections])} /></label>
                  {/if}

                  {#if section.type === 'message'}
                    <textarea class="textarea" bind:value={section.message} on:input={() => (config.sections = [...config.sections])}></textarea>
                  {/if}

                  {#if section.type === 'interest'}
                    <div class="metrics-grid">
                      {#each metricOptions as metric}
                        <label><input type="checkbox" checked={section.metrics?.includes(metric.id)} on:change={() => toggleMetric(metric.id)} /> {metric.label}</label>
                      {/each}
                    </div>
                  {/if}
                </div>
                <div class="row-actions">
                  <button class="icon-button" type="button" on:click={() => moveSection(index, -1)} aria-label="Subir sección">↑</button>
                  <button class="icon-button" type="button" on:click={() => moveSection(index, 1)} aria-label="Bajar sección">↓</button>
                </div>
              </article>
            {/each}
          </div>

          <div class="other-cities">
            <div class="panel-heading compact">
              <p class="eyebrow">Otros municipios</p>
              <h2>Comparativas y previsiones</h2>
            </div>
            <label class="search-field">
              <span class="label">Añadir municipio</span>
              <input class="input" bind:value={otherSearchTerm} on:input={onOtherSearchInput} placeholder="Madrid, Plasencia, Sevilla…" />
              {#if otherSearchResults.length}
                <ul class="suggestions">
                  {#each otherSearchResults as result}
                    <li><button type="button" on:click={() => addOtherLocation(result)}>{result.name} <small>{result.admin1} · {result.country}</small></button></li>
                  {/each}
                </ul>
              {/if}
            </label>
            <div class="chips">
              {#each config.otherLocations as location}
                <button class="chip" type="button" on:click={() => removeOtherLocation(location)}>{location.name} ×</button>
              {/each}
            </div>
          </div>
        </div>

        <aside class="panel preview-panel" id="preview">
          <div class="panel-heading">
            <p class="eyebrow">Vista previa</p>
            <h2>Así se verá en pantalla</h2>
          </div>
          <div class="preview-frame" style={channelStyle}>
            <div class:with-image={config.randomImages} class="tv-background"></div>
            <div class="preview-content">
              <header>
                <span>{config.location?.name}</span>
                <strong>{config.channelName}</strong>
              </header>
              <div class="preview-card">
                {#if weather && activeSection}
                  {@render ChannelSection(activeSection, weather, config, otherWeather, true)}
                {:else}
                  <p>Cargando previsualización…</p>
                {/if}
              </div>
            </div>
          </div>

          <div class="url-box" id="url">
            <label>
              <span class="label">URL de emisión</span>
              <textarea class="textarea url-textarea" readonly value={generatedUrl}></textarea>
            </label>
            <div class="hero-actions">
              <button class="btn btn-primary" type="button" on:click={openChannel}>Abrir canal</button>
              <button class="btn btn-secondary" type="button" on:click={copyUrl}>Copiar URL</button>
            </div>
            <p class="help-text">Abre esta URL en una televisión, navegador a pantalla completa o herramienta de emisión.</p>
          </div>
        </aside>
      </section>
    </main>
  </div>
{/if}

{#snippet ChannelSection(activeSection: SectionConfig, weather: WeatherBundle, config: ChannelConfig, otherWeather: Map<string, WeatherBundle>, compact = false)}
  <div class:compact-section={compact} class="channel-section">
    <p class="eyebrow">{activeSection.title}</p>

    {#if activeSection.type === 'current'}
      <div class="current-layout">
        <div class="big-icon">{weatherIcon(weather.current.code)}</div>
        <div>
          <h2>{weather.current.temperature}°C</h2>
          <p>{weatherLabel(weather.current.code)}</p>
          <div class="weather-stats">
            <span>Sensación {weather.current.apparent}°</span>
            <span>Humedad {weather.current.humidity}%</span>
            <span>Viento {weather.current.wind} km/h</span>
          </div>
        </div>
      </div>
    {:else if activeSection.type === 'forecast'}
      <div class="forecast-grid">
        {#each weather.daily.slice(0, activeSection.days ?? 5) as day}
          <article>
            <strong>{formatDay(day.date)}</strong>
            <span class="day-icon">{weatherIcon(day.code)}</span>
            <small>{weatherLabel(day.code)}</small>
            <b>{day.max}° / {day.min}°</b>
          </article>
        {/each}
      </div>
    {:else if activeSection.type === 'future-extremes'}
      <div class="extremes-grid">
        {#each weather.daily.slice(0, activeSection.days ?? 7) as day}
          <article><span>{formatDay(day.date)}</span><strong>{day.max}°</strong><small>{day.min}°</small></article>
        {/each}
      </div>
    {:else if activeSection.type === 'past-extremes'}
      <div class="extremes-grid">
        {#each weather.past.slice(0, activeSection.days ?? 5) as day}
          <article><span>{formatDay(day.date)}</span><strong>{day.max}°</strong><small>{day.min}°</small></article>
        {/each}
      </div>
    {:else if activeSection.type === 'interest'}
      <div class="interest-grid">
        {#if activeSection.metrics?.includes('uv')}<article><span>Índice UV</span><strong>{weather.daily[0]?.uv.toFixed(1)}</strong></article>{/if}
        {#if activeSection.metrics?.includes('sunrise')}<article><span>Sale el sol</span><strong>{formatTime(weather.daily[0]?.sunrise)}</strong></article>{/if}
        {#if activeSection.metrics?.includes('sunset')}<article><span>Se pone el sol</span><strong>{formatTime(weather.daily[0]?.sunset)}</strong></article>{/if}
        {#if activeSection.metrics?.includes('wind')}<article><span>Viento</span><strong>{weather.current.wind} km/h</strong></article>{/if}
        {#if activeSection.metrics?.includes('humidity')}<article><span>Humedad</span><strong>{weather.current.humidity}%</strong></article>{/if}
        {#if activeSection.metrics?.includes('precipitation')}<article><span>Lluvia hoy</span><strong>{weather.daily[0]?.precipitation} mm</strong></article>{/if}
      </div>
    {:else if activeSection.type === 'message'}
      <div class="message-block"><p>{activeSection.message}</p></div>
    {:else if activeSection.type === 'other-current'}
      <div class="other-grid">
        {#each config.otherLocations as location}
          {@const item = otherWeather.get(location.name)}
          {#if item}
            <article><span>{location.name}</span><strong>{item.current.temperature}°</strong><small>{weatherIcon(item.current.code)} {weatherLabel(item.current.code)}</small></article>
          {/if}
        {/each}
      </div>
    {:else if activeSection.type === 'other-forecast'}
      <div class="other-forecast-grid">
        {#each config.otherLocations as location}
          {@const item = otherWeather.get(location.name)}
          {#if item}
            <article>
              <strong>{location.name}</strong>
              <div>{#each item.daily.slice(0, activeSection.days ?? 3) as day}<span>{formatDay(day.date)} {day.max}°/{day.min}°</span>{/each}</div>
            </article>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}
