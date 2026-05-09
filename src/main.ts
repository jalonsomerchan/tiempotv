import { mount } from 'svelte'
import './app.css'
import './theme-radical.css'
import './section-animations.css'
import './advanced-options.css'
import './theme-polish.css'
import './configurator-v2.css'
import './tv-final-polish.css'
import './timer-ring-fix.css'
import App from './AppOpenWeather.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
