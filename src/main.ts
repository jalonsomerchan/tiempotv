import { mount } from 'svelte'
import './app.css'
import './theme-radical.css'
import './section-animations.css'
import './advanced-options.css'
import App from './AppAdvanced.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
