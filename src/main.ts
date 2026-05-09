import { mount } from 'svelte'
import './app.css'
import './theme-radical.css'
import './section-animations.css'
import './advanced-options.css'
import './theme-polish.css'
import './configurator-v2.css'
import App from './AppAdvanced3.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
