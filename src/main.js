// Import polyfill first
import './polyfill.js'

import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Import CouchDB service
import couchDBService from './services/couchdb-service.js'

// Initialize CouchDB only if we're not in development mode
// In development mode, we'll rely on the API server
if (import.meta.env.MODE !== 'development') {
  couchDBService.initialize()
    .then(() => {})
    .catch(error => console.error('Failed to initialize CouchDB:', error))
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
