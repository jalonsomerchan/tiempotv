import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Dominio personalizado en GitHub Pages: https://tiempotv.alon.one/
// Con base '/', Vite genera assets como /assets/... en vez de /tiempotv/assets/...
export default defineConfig({
  base: '/',
  plugins: [svelte()],
})
