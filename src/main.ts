import { mount } from 'svelte'
import './app.css'
import './theme-radical.css'
import './section-animations.css'
import './advanced-options.css'
import './theme-polish.css'
import App from './AppAdvanced2.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
