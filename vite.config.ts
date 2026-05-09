import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// GitHub Pages sirve este repositorio público en /tiempotv/.
// Si algún día se usa dominio personalizado, cambia base a '/'.
export default defineConfig({
  base: '/tiempotv/',
  plugins: [svelte()],
})
