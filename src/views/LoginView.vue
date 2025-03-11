<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Ha a bejelentkezés nincs engedélyezve, átirányítunk a főoldalra
onMounted(() => {
  if (!authStore.loginEnabled) {
    router.push('/')
  }
})

// Állapot
const code = ref('')
const error = ref('')
const digits = reactive(['', '', '', ''])
const activeDigit = ref(0)

// Metódusok
const handleDigitInput = (index, value) => {
  // Csak számokat fogadunk el
  if (!/^\d$/.test(value)) return
  
  digits[index] = value
  
  // Automatikusan léptetjük a fókuszt a következő mezőre
  if (index < 3) {
    activeDigit.value = index + 1
    // Fókuszáljuk a következő input mezőt
    document.getElementById(`digit-${index + 1}`).focus()
  } else {
    // Ha az utolsó számjegyet is megadtuk, megpróbálunk bejelentkezni
    tryLogin()
  }
}

const handleKeyDown = (index, event) => {
  // Backspace esetén töröljük az aktuális számjegyet és visszalépünk
  if (event.key === 'Backspace') {
    if (digits[index] !== '') {
      digits[index] = ''
    } else if (index > 0) {
      activeDigit.value = index - 1
      document.getElementById(`digit-${index - 1}`).focus()
    }
  }
  // Nyilak kezelése a navigációhoz
  else if (event.key === 'ArrowLeft' && index > 0) {
    activeDigit.value = index - 1
    document.getElementById(`digit-${index - 1}`).focus()
  }
  else if (event.key === 'ArrowRight' && index < 3) {
    activeDigit.value = index + 1
    document.getElementById(`digit-${index + 1}`).focus()
  }
}

const tryLogin = () => {
  // Összeállítjuk a teljes kódot
  const fullCode = digits.join('')
  
  // Ellenőrizzük, hogy minden számjegy meg van-e adva
  if (fullCode.length !== 4) {
    error.value = 'Kérjük, adja meg mind a 4 számjegyet!'
    return
  }
  
  // Megpróbálunk bejelentkezni
  const success = authStore.login(fullCode)
  
  if (success) {
    // Sikeres bejelentkezés esetén átirányítunk a főoldalra
    router.push('/')
    error.value = ''
  } else {
    // Sikertelen bejelentkezés esetén hibaüzenetet jelenítünk meg
    error.value = 'Érvénytelen kód. Kérjük, próbálja újra!'
    // Töröljük a beírt kódot
    digits.forEach((_, index) => {
      digits[index] = ''
    })
    // Visszaállítjuk a fókuszt az első mezőre
    activeDigit.value = 0
    document.getElementById('digit-0').focus()
  }
}

const clearCode = () => {
  // Töröljük a beírt kódot
  digits.forEach((_, index) => {
    digits[index] = ''
  })
  error.value = ''
  // Visszaállítjuk a fókuszt az első mezőre
  activeDigit.value = 0
  document.getElementById('digit-0').focus()
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Bejelentkezés</h1>
      <p class="login-instruction">Kérjük, adja meg a 4 számjegyű belépési kódját:</p>
      
      <div class="code-input-container">
        <input
          v-for="(digit, index) in digits"
          :key="index"
          :id="`digit-${index}`"
          type="text"
          inputmode="numeric"
          maxlength="1"
          v-model="digits[index]"
          @input="handleDigitInput(index, $event.target.value)"
          @keydown="handleKeyDown(index, $event)"
          :class="{ 'active': activeDigit === index }"
          class="digit-input"
        />
      </div>
      
      <p v-if="error" class="error-message">{{ error }}</p>
      
      <div class="button-container">
        <button @click="clearCode" class="clear-button">Törlés</button>
        <button @click="tryLogin" class="login-button">Belépés</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--light-bg);
}

.login-card {
  background-color: var(--white);
  border-radius: 8px;
  box-shadow: var(--shadow);
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h1 {
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.login-instruction {
  margin-bottom: 2rem;
  color: var(--text-color);
}

.code-input-container {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.digit-input {
  width: 50px;
  height: 60px;
  font-size: 24px;
  text-align: center;
  border: 2px solid #ddd;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.digit-input.active {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(74, 109, 167, 0.3);
}

.digit-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(74, 109, 167, 0.3);
}

.error-message {
  color: #e53935;
  margin-bottom: 1rem;
}

.button-container {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.login-button, .clear-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s ease;
  flex: 1;
}

.login-button {
  background-color: var(--primary-color);
  color: white;
}

.login-button:hover {
  background-color: var(--secondary-color);
}

.clear-button {
  background-color: #f5f5f5;
  color: var(--text-color);
}

.clear-button:hover {
  background-color: #e0e0e0;
}
</style> 