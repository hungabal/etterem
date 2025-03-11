import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '../stores/auth'

// Az alkalmazás útvonalkezelője (router)
// Ez a komponens felelős a navigációért az alkalmazás különböző nézetei között
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
      // Főoldal - Az alkalmazás kezdőlapja, ahonnan elérhetők a fő funkciók
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guest: true }
      // Bejelentkezési oldal - Csak akkor látható, ha a felhasználó nincs bejelentkezve
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('../views/OrdersView.vue'),
      meta: { requiresAuth: true }
      // Rendelések nézet - Itt lehet kezelni a rendeléseket (új rendelés felvétele, meglévők módosítása, stb.)
    },
    {
      path: '/tables',
      name: 'tables',
      component: () => import('../views/TablesView.vue'),
      meta: { requiresAuth: true }
      // Asztalok nézet - Az étterem asztalainak kezelése, foglalások, asztalállapotok
    },
    {
      path: '/menu',
      name: 'menu',
      component: () => import('../views/MenuView.vue'),
      meta: { requiresAuth: true }
      // Étlap nézet - Az étterem kínálatának kezelése, ételek és italok szerkesztése
    },
    {
      path: '/billing',
      name: 'billing',
      component: () => import('../views/BillingView.vue'),
      meta: { requiresAuth: true }
      // Számlázás nézet - Számlák és nyugták kezelése, fizetési műveletek
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true }
      // Beállítások nézet - Az alkalmazás és az étterem beállításainak módosítása
    },
    {
      path: '/customers',
      name: 'customers',
      component: () => import('../views/CustomersView.vue'),
      meta: { requiresAuth: true }
      // Ügyfelek nézet - Vendégek és törzsvendégek adatainak kezelése
    },
    {
      path: '/couriers',
      name: 'couriers',
      component: () => import('../views/CouriersView.vue'),
      meta: { requiresAuth: true }
      // Futárok nézet - Futárok adatainak kezelése és nyilvántartása
    },
    {
      path: '/kitchen',
      name: 'kitchen',
      component: () => import('../views/KitchenView.vue'),
      meta: { requiresAuth: true }
      // Konyhai nézet - A konyha számára látható aktív rendelések és azok állapotának kezelése
    },
  ],
})

// Navigáció őr - Ellenőrzi a jogosultságokat minden navigáció előtt
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  // Ha a bejelentkezés nincs engedélyezve, akkor minden útvonal elérhető
  if (!authStore.loginEnabled) {
    return next()
  }
  
  // Ha a felhasználó be van jelentkezve és vendég oldalra próbál navigálni (pl. login)
  if (authStore.isLoggedIn && to.meta.guest) {
    return next({ name: 'home' })
  }
  
  // Ha a felhasználó nincs bejelentkezve és védett oldalra próbál navigálni
  if (!authStore.isLoggedIn && to.meta.requiresAuth) {
    return next({ name: 'login' })
  }
  
  // Ha a felhasználó be van jelentkezve, de nincs jogosultsága az adott oldalhoz
  if (authStore.isLoggedIn && to.meta.requiresAuth && !authStore.hasPermission(to.name)) {
    // Ha nincs jogosultsága, visszairányítjuk a főoldalra
    return next({ name: 'home' })
  }
  
  // Minden más esetben engedélyezzük a navigációt
  next()
})

export default router
