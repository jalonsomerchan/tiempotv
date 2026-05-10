<script lang="ts">
  import ChannelStable from './ChannelStable.svelte'
  import AppWeatherResilient from './AppWeatherResilient.svelte'

  const appBase = import.meta.env.BASE_URL.replace(/\/$/, '')
  const cleanPath = typeof window !== 'undefined'
    ? window.location.pathname.replace(new RegExp(`^${appBase}`), '')
    : ''
  const isChannel = cleanPath.startsWith('/canal')
</script>

{#if isChannel}
  <ChannelStable />
{:else}
  <AppWeatherResilient />
{/if}
