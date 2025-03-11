<script setup>
// Vue Router komponensek importálása
// RouterLink: Navigációs linkek létrehozásához
// RouterView: Az aktuális útvonalnak megfelelő komponens megjelenítéséhez
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// Kiszámított tulajdonságok
const isLoggedIn = computed(() => authStore.isLoggedIn)
const currentUser = computed(() => authStore.currentUser)
const loginEnabled = computed(() => authStore.loginEnabled)

// Kijelentkezés metódus
const logout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <!-- Fő alkalmazás konténer -->
  <div class="app-container">
    <!-- Fejléc - Az alkalmazás felső része, amely tartalmazza a logót és a navigációt -->
    <header v-if="isLoggedIn">
      <div class="header-content">
        <!-- Logó és főoldal link -->
        <RouterLink to="/" class="logo-container">
          <h1>Étterem Kezelő</h1>
        </RouterLink>
        
        <!-- Felhasználói információk és kijelentkezés gomb -->
        <div v-if="loginEnabled && currentUser" class="user-info">
          <span class="user-name">{{ currentUser.name }}</span>
          <span class="user-role">
            <span v-if="currentUser.role === 'waiter'">Pincér</span>
            <span v-else-if="currentUser.role === 'chef'">Szakács</span>
            <span v-else-if="currentUser.role === 'courier'">Futár</span>
            <span v-else-if="currentUser.role === 'admin'">Adminisztrátor</span>
          </span>
          <button @click="logout" class="logout-button">Kijelentkezés</button>
        </div>
      </div>
    </header>

    <!-- Fő tartalom - Itt jelenik meg az aktuális nézet -->
    <main>
      <RouterView />
    </main>

    <!-- Lábléc - Az alkalmazás alsó része, amely tartalmazza a copyright információt -->
    <footer v-if="isLoggedIn">
      <p>&copy; {{ new Date().getFullYear() }} Étterem Kezelő Rendszer</p>
    </footer>
    
    <!-- Főoldal gomb - Gyors navigáció a főoldalra bármely nézetből -->
    <div v-if="isLoggedIn" class="home-button-container">
      <RouterLink to="/" class="home-button" title="Vissza a főoldalra">
        <span class="home-icon">🏠</span>
        <span class="home-text">Főoldal</span>
      </RouterLink>
    </div>
  </div>
</template>

<style>
/* Globális CSS változók - Az alkalmazás színsémájának és stílusának beállítása */
:root {
  --primary-color: #4a6da7;
  --secondary-color: #304878;
  --accent-color: #ff9800;
  --text-color: #333;
  --light-bg: #f5f5f5;
  --white: #ffffff;
  --shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* Alapvető CSS reset és box-sizing beállítás */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* HTML és body alapbeállítások */
html, body {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  margin: 0;
  padding: 0;
}

/* Body stílus beállítások */
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: var(--text-color);
  background-color: var(--light-bg);
  line-height: 1.6;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

/* Fő alkalmazás konténer stílusa */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  position: relative;
}

/* Fejléc stílusa */
header {
  background-color: var(--primary-color);
  color: var(--white);
  width: 100%;
  padding: 0;
  box-shadow: var(--shadow);
  margin: 0;
  left: 0;
  right: 0;
  position: relative;
}

/* Fejléc tartalom stílusa */
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.8rem 0;
}

/* Logó konténer stílusa */
.logo-container {
  text-decoration: none;
  color: var(--white);
  margin-left: 1rem;
}

.logo-container h1 {
  margin: 0;
  font-size: 1.5rem;
}

.home-button-container {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
}

.home-button {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--white);
  text-decoration: none;
  width: 180px;
  height: 50px;
  border-radius: 25px;
  background-color: var(--secondary-color);
  transition: all 0.3s ease;
  padding: 0 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  opacity: 0.9;
}

.home-button:hover {
  background-color: var(--accent-color);
  transform: scale(1.05);
  opacity: 1;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

.home-icon {
  font-size: 1.8rem;
  margin-right: 10px;
}

.home-text {
  font-weight: bold;
  font-size: 1.2rem;
}

main {
  flex: 1;
  width: 100%;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  background-color: var(--light-bg);
  overflow-x: hidden;
  position: relative;
}

main > * {
  width: 100%;
  max-width: 100%;
}

footer {
  background-color: var(--primary-color);
  color: var(--white);
  text-align: center;
  padding: 0.8rem 0;
  width: 100%;
  margin: 0;
  left: 0;
  right: 0;
  position: relative;
}

@media (max-width: 768px) {
  .header-content {
    padding: 0.8rem 0;
  }
  
  .logo-container {
    margin-left: 0.8rem;
  }
  
  .home-button-container {
    top: 15px;
  }
  
  .home-button {
    width: 160px;
    height: 45px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 0.6rem 0;
  }
  
  .logo-container {
    margin-left: 0.6rem;
  }
  
  .home-button-container {
    top: 10px;
  }
  
  .home-button {
    width: 140px;
    height: 40px;
  }
  
  .logo-container h1 {
    font-size: 1.3rem;
  }
  
  .home-icon {
    font-size: 1.5rem;
  }
  
  .home-text {
    font-size: 1rem;
  }
  
  footer {
    font-size: 0.9rem;
  }
}
</style>

<style scoped>
/* Fejléc stílusok */
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
}

/* Felhasználói információk stílusai */
.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  font-weight: bold;
  color: var(--primary-color);
}

.user-role {
  background-color: var(--light-bg);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--secondary-color);
}

.logout-button {
  background-color: var(--secondary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.logout-button:hover {
  background-color: #263a61;
}
</style>

