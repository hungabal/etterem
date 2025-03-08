// Először importáljuk a polyfill-t
// Ez biztosítja a kompatibilitást a régebbi böngészőkkel
import './polyfill.js'

// Fő CSS stílusok importálása
import './assets/main.css'

// Vue alapkönyvtárak importálása
import { createApp } from 'vue'  // Vue alkalmazás létrehozásához
import { createPinia } from 'pinia'  // Állapotkezeléshez

// Fő komponens és router importálása
import App from './App.vue'  // Fő alkalmazás komponens
import router from './router'  // Útvonalkezelő

// CouchDB szolgáltatás importálása
// Ez kezeli az adatbázis műveleteket
import couchDBService from './services/couchdb-service.js'

// CouchDB inicializálása csak akkor, ha nem fejlesztői módban vagyunk
// Fejlesztői módban az API szerverre támaszkodunk
if (import.meta.env.MODE !== 'development') {
  couchDBService.initialize()
    .then(() => {})
    .catch(error => console.error('Failed to initialize CouchDB:', error))
}

// Vue alkalmazás létrehozása
const app = createApp(App)

// Pinia állapotkezelő és router hozzáadása az alkalmazáshoz
app.use(createPinia())  // Állapotkezelés beállítása
app.use(router)  // Útvonalkezelés beállítása

// Alkalmazás csatolása a DOM-hoz
// Az alkalmazás a #app azonosítójú HTML elembe kerül
app.mount('#app')
