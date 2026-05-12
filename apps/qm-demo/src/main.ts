import { createApp, h } from 'vue'
import { NMessageProvider } from 'naive-ui'
import './style.css'
import App from './App.vue'

const root = {
  render() {
    return h(NMessageProvider, null, { default: () => h(App) })
  },
}

createApp(root).mount('#app')
