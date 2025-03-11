<script setup>
// Főoldal komponens
// Ez a komponens az alkalmazás kezdőlapját jeleníti meg, ahonnan a felhasználó elérheti a fő funkciókat
import { useAuthStore } from '../stores/auth'
import { computed } from 'vue'

const authStore = useAuthStore()

// Kiszámított tulajdonságok
const currentUser = computed(() => authStore.currentUser)
const userRole = computed(() => currentUser.value?.role || null)
const isWaiter = computed(() => userRole.value === 'waiter')
const isChef = computed(() => userRole.value === 'chef')
const isCourier = computed(() => userRole.value === 'courier')
const isAdmin = computed(() => userRole.value === 'admin')
const loginEnabled = computed(() => authStore.loginEnabled)

// Jogosultság ellenőrzése
const hasPermission = (routeName) => {
  return authStore.hasPermission(routeName)
}
</script>

<template>
  <!-- Főoldal konténer -->
  <div class="home">
    <!-- Üdvözlő szakasz - Az oldal tetején megjelenő üdvözlő üzenet -->
    <div class="welcome-section">
      <h1>Üdvözöljük az Étterem Kezelő Rendszerben!</h1>
      <p v-if="loginEnabled && currentUser" class="welcome-user">
        Bejelentkezve mint: <strong>{{ currentUser.name }}</strong>
        <span class="user-role-badge">
          <span v-if="isWaiter">Pincér</span>
          <span v-else-if="isChef">Szakács</span>
          <span v-else-if="isCourier">Futár</span>
          <span v-else-if="isAdmin">Adminisztrátor</span>
        </span>
      </p>
    </div>

    <!-- Menü csempék konténer - A fő navigációs csempék tárolója -->
    <div class="menu-tiles-container">
      <div class="menu-tiles">
        <!-- Rendelések csempe - Navigáció a rendelések kezelése oldalra -->
        <router-link v-if="hasPermission('orders')" to="/orders" class="menu-tile">
          <div class="tile-icon">📋</div>
          <h2>Rendelések</h2>
          <p>Rendelések felvétele és kezelése</p>
        </router-link>

        <!-- Asztalok csempe - Navigáció az asztalok kezelése oldalra -->
        <router-link v-if="hasPermission('tables')" to="/tables" class="menu-tile">
          <div class="tile-icon">🪑</div>
          <h2>Asztalok</h2>
          <p>Asztalok foglalása és állapota</p>
        </router-link>

        <!-- Étlap csempe - Navigáció az étlap kezelése oldalra -->
        <router-link v-if="hasPermission('menu')" to="/menu" class="menu-tile">
          <div class="tile-icon">🍽️</div>
          <h2>Étlap</h2>
          <p>Étlap kezelése és szerkesztése</p>
        </router-link>

        <!-- Számlázás csempe - Navigáció a számlázás oldalra -->
        <router-link v-if="hasPermission('billing')" to="/billing" class="menu-tile">
          <div class="tile-icon">💰</div>
          <h2>Számlázás</h2>
          <p>Számlák készítése és kezelése</p>
        </router-link>

        <!-- Beállítások csempe - Navigáció a beállítások oldalra -->
        <router-link v-if="hasPermission('settings')" to="/settings" class="menu-tile">
          <div class="tile-icon">⚙️</div>
          <h2>Beállítások</h2>
          <p>Rendszer beállítások módosítása</p>
        </router-link>

        <!-- Ügyfelek csempe - Navigáció az ügyfelek kezelése oldalra -->
        <router-link v-if="hasPermission('customers')" to="/customers" class="menu-tile">
          <div class="tile-icon">👥</div>
          <h2>Ügyfelek</h2>
          <p>Ügyfelek adatainak kezelése</p>
        </router-link>

        <!-- Futárok csempe - Navigáció a futárok kezelése oldalra -->
        <router-link v-if="hasPermission('couriers')" to="/couriers" class="menu-tile">
          <div class="tile-icon">🛵</div>
          <h2>Futárok</h2>
          <p>Futárok és kiszállítások kezelése</p>
        </router-link>

        <!-- Konyha csempe - Navigáció a konyha oldalra -->
        <router-link v-if="hasPermission('kitchen')" to="/kitchen" class="menu-tile">
          <div class="tile-icon">👨‍🍳</div>
          <h2>Konyha</h2>
          <p>Konyhai rendelések kezelése</p>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Főoldal konténer stílusa */
.home {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* Üdvözlő szakasz stílusa */
.welcome-section {
  text-align: center;
  padding: 1.5rem 0;
  background-color: white;
  border-radius: 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  margin: 0;
}

/* Üdvözlő cím stílusa */
.welcome-section h1 {
  color: var(--primary-color);
  margin-bottom: 1rem;
}

/* Üdvözlő felhasználó stílusok */
.welcome-user {
  margin-top: 1rem;
  font-size: 1.1rem;
  color: var(--text-color);
}

.user-role-badge {
  display: inline-block;
  background-color: var(--primary-color);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  font-size: 0.9rem;
}

/* Menü csempék konténer stílusa */
.menu-tiles-container {
  width: 100%;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
}

/* Menü csempék rács elrendezése */
.menu-tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  width: 100%;
  margin: 0;
  padding: 0 0 0.5rem 0;
}

/* Egyedi menü csempe stílusa */
.menu-tile {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem 0.8rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  text-decoration: none;
  color: var(--text-color);
  transition: transform 0.3s, box-shadow 0.3s;
  height: 100%;
  min-height: 180px;
  margin: 0;
}

.menu-tile:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.tile-icon {
  font-size: 2.5rem;
  margin-bottom: 0.8rem;
}

.menu-tile h2 {
  color: var(--primary-color);
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
  width: 100%;
}

.menu-tile p {
  color: #666;
  font-size: 0.9rem;
  width: 100%;
  margin: 0;
}

/* Extra nagy képernyők */
@media (min-width: 1600px) {
  .menu-tiles {
    grid-template-columns: repeat(3, 1fr);
    padding: 0;
  }
}

/* Nagy képernyők */
@media (min-width: 1200px) and (max-width: 1599px) {
  .menu-tiles {
    grid-template-columns: repeat(3, 1fr);
    padding: 0;
  }
}

/* Közepes képernyők */
@media (min-width: 769px) and (max-width: 1199px) {
  .menu-tiles {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    padding: 0;
  }
  
  .menu-tile {
    padding: 1.5rem 0.8rem;
    min-height: 180px;
  }
  
  .tile-icon {
    font-size: 2.2rem;
    margin-bottom: 0.8rem;
  }
}

/* Tablet méret */
@media (min-width: 481px) and (max-width: 768px) {
  .home {
    padding: 0;
    gap: 1rem;
  }
  
  .welcome-section {
    padding: 1.2rem 0;
  }
  
  .menu-tiles {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    padding: 0;
  }
  
  .menu-tile {
    padding: 1.2rem 0.8rem;
    min-height: 160px;
  }
  
  .tile-icon {
    font-size: 2.2rem;
    margin-bottom: 0.8rem;
  }
  
  .menu-tile h2 {
    font-size: 1.2rem;
    margin-bottom: 0.4rem;
  }
  
  .menu-tile p {
    font-size: 0.85rem;
  }
}

/* Mobil és terminál méret */
@media (max-width: 480px) {
  .home {
    gap: 0.8rem;
    padding: 0;
  }
  
  .welcome-section {
    padding: 1.2rem 0;
    border-radius: 0;
  }
  
  .menu-tiles {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    padding: 0;
  }
  
  .menu-tile {
    padding: 1.2rem 0.5rem;
    min-height: 140px;
    border-radius: 6px;
  }
  
  .tile-icon {
    font-size: 2rem;
    margin-bottom: 0.6rem;
  }
  
  .menu-tile h2 {
    font-size: 1.1rem;
    margin-bottom: 0.3rem;
  }
  
  .menu-tile p {
    font-size: 0.8rem;
  }
}

/* Nagyon kis képernyők (pl. régi terminálok) */
@media (max-width: 320px) {
  .home {
    gap: 0.5rem;
    padding: 0;
  }
  
  .welcome-section {
    padding: 1rem 0;
    border-radius: 0;
  }
  
  .menu-tiles {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 0;
  }
  
  .menu-tile {
    min-height: 120px;
    padding: 1rem 0.5rem;
  }
}
</style>
