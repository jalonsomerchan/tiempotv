import { mount } from 'svelte'
import './app.css'
import './theme-radical.css'
import './section-animations.css'
import './advanced-options.css'
import './theme-polish.css'
import './configurator-v2.css'
import './wmo-icons.css'
import App from './AppWmo.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
