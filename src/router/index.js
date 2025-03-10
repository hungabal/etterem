import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

// Az alkalmazás útvonalkezelője (router)
// Ez a komponens felelős a navigációért az alkalmazás különböző nézetei között
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      // Főoldal - Az alkalmazás kezdőlapja, ahonnan elérhetők a fő funkciók
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('../views/OrdersView.vue'),
      // Rendelések nézet - Itt lehet kezelni a rendeléseket (új rendelés felvétele, meglévők módosítása, stb.)
    },
    {
      path: '/tables',
      name: 'tables',
      component: () => import('../views/TablesView.vue'),
      // Asztalok nézet - Az étterem asztalainak kezelése, foglalások, asztalállapotok
    },
    {
      path: '/menu',
      name: 'menu',
      component: () => import('../views/MenuView.vue'),
      // Étlap nézet - Az étterem kínálatának kezelése, ételek és italok szerkesztése
    },
    {
      path: '/billing',
      name: 'billing',
      component: () => import('../views/BillingView.vue'),
      // Számlázás nézet - Számlák és nyugták kezelése, fizetési műveletek
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      // Beállítások nézet - Az alkalmazás és az étterem beállításainak módosítása
    },
    {
      path: '/customers',
      name: 'customers',
      component: () => import('../views/CustomersView.vue'),
      // Ügyfelek nézet - Vendégek és törzsvendégek adatainak kezelése
    },
    {
      path: '/couriers',
      name: 'couriers',
      component: () => import('../views/CouriersView.vue'),
      // Futárok nézet - Futárok adatainak kezelése és nyilvántartása
    },
    {
      path: '/kitchen',
      name: 'kitchen',
      component: () => import('../views/KitchenView.vue'),
      // Konyhai nézet - A konyha számára látható aktív rendelések és azok állapotának kezelése
    },
  ],
})

export default router
