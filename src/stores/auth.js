import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'

// Felhasználói szerepkörök
export const UserRoles = {
  WAITER: 'waiter',    // Pincér
  CHEF: 'chef',        // Szakács
  COURIER: 'courier',  // Futár
  ADMIN: 'admin'       // Adminisztrátor
}

// Elérhető menüpontok
export const AvailableMenus = [
  { id: 'home', name: 'Főoldal', icon: '🏠' },
  { id: 'orders', name: 'Rendelések', icon: '📋' },
  { id: 'tables', name: 'Asztalok', icon: '🪑' },
  { id: 'menu', name: 'Étlap', icon: '🍽️' },
  { id: 'billing', name: 'Számlázás', icon: '💰' },
  { id: 'customers', name: 'Ügyfelek', icon: '👥' },
  { id: 'couriers', name: 'Futárok', icon: '🛵' },
  { id: 'kitchen', name: 'Konyha', icon: '👨‍🍳' },
  { id: 'settings', name: 'Beállítások', icon: '⚙️' }
]

// Szerepkörökhöz tartozó jogosultságok
const defaultRolePermissions = {
  [UserRoles.ADMIN]: [
    'home', 
    'orders', 
    'tables', 
    'menu', 
    'billing', 
    'settings', 
    'customers', 
    'couriers',
    'addresses',
    'kitchen'
  ],
  [UserRoles.WAITER]: [
    'home', 
    'orders', 
    'tables', 
    'billing'
  ],
  [UserRoles.CHEF]: [
    'home', 
    'kitchen'
  ],
  [UserRoles.COURIER]: [
    'home', 
    'orders',
    'addresses'
  ]
}

// Előre definiált felhasználók (valós alkalmazásban ez adatbázisban lenne)
const defaultUsers = [
  { id: 1, name: 'Pincér 1', code: '1111', role: UserRoles.WAITER },
  { id: 2, name: 'Pincér 2', code: '2222', role: UserRoles.WAITER },
  { id: 3, name: 'Szakács 1', code: '3333', role: UserRoles.CHEF },
  { id: 4, name: 'Szakács 2', code: '4444', role: UserRoles.CHEF },
  { id: 5, name: 'Futár 1', code: '5555', role: UserRoles.COURIER },
  { id: 6, name: 'Futár 2', code: '6666', role: UserRoles.COURIER },
  { id: 7, name: 'Admin', code: '0000', role: UserRoles.ADMIN }
]

// Adatok betöltése a localStorage-ból vagy az alapértelmezett értékek használata
const loadFromStorage = (key, defaultValue) => {
  try {
    const storedValue = localStorage.getItem(key)
    return storedValue ? JSON.parse(storedValue) : defaultValue
  } catch (error) {
    console.error(`Hiba a ${key} betöltésekor:`, error)
    return defaultValue
  }
}

// Adatok mentése a localStorage-ba
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Hiba a ${key} mentésekor:`, error)
  }
}

export const useAuthStore = defineStore('auth', () => {
  // Állapot
  const currentUser = ref(null)
  const loginEnabled = ref(import.meta.env.VITE_LOGIN_ENABLED === '1')
  const users = ref(loadFromStorage('users', defaultUsers))
  const rolePermissions = ref(loadFromStorage('rolePermissions', defaultRolePermissions))
  
  // Getterek
  const isLoggedIn = computed(() => {
    // Ha a bejelentkezés nincs engedélyezve, akkor mindig be vagyunk jelentkezve
    if (!loginEnabled.value) return true
    return currentUser.value !== null
  })
  
  const userRole = computed(() => currentUser.value?.role || null)
  
  const isAdmin = computed(() => userRole.value === UserRoles.ADMIN)
  
  const hasPermission = computed(() => (routeName) => {
    // Ha a bejelentkezés nincs engedélyezve, akkor minden jogosultság engedélyezve van
    if (!loginEnabled.value) return true
    
    // Ha nincs bejelentkezett felhasználó, akkor nincs jogosultság
    if (!currentUser.value) return false
    
    // Ellenőrizzük, hogy a felhasználó szerepköre tartalmazza-e a kért útvonalat
    const permissions = rolePermissions.value[currentUser.value.role] || []
    return permissions.includes(routeName)
  })
  
  // Akciók
  function login(code) {
    // Keressük meg a felhasználót a kód alapján
    const user = users.value.find(u => u.code === code)
    if (user) {
      currentUser.value = user
      return true
    }
    return false
  }
  
  function logout() {
    currentUser.value = null
  }
  
  function updateUser(updatedUser) {
    const index = users.value.findIndex(u => u.id === updatedUser.id)
    if (index !== -1) {
      users.value[index] = { ...updatedUser }
      saveToStorage('users', users.value)
      
      // Ha a módosított felhasználó éppen be van jelentkezve, frissítsük a currentUser-t is
      if (currentUser.value && currentUser.value.id === updatedUser.id) {
        currentUser.value = { ...updatedUser }
      }
      return true
    }
    return false
  }
  
  function addUser(newUser) {
    // Generáljunk új ID-t
    const maxId = Math.max(...users.value.map(u => u.id), 0)
    const userWithId = { ...newUser, id: maxId + 1 }
    
    // Ellenőrizzük, hogy a kód egyedi-e
    if (users.value.some(u => u.code === userWithId.code)) {
      return false
    }
    
    users.value.push(userWithId)
    saveToStorage('users', users.value)
    return true
  }
  
  function deleteUser(userId) {
    // Az admin felhasználót nem lehet törölni
    const userToDelete = users.value.find(u => u.id === userId)
    if (userToDelete && userToDelete.role === UserRoles.ADMIN && 
        users.value.filter(u => u.role === UserRoles.ADMIN).length <= 1) {
      return false
    }
    
    const newUsers = users.value.filter(u => u.id !== userId)
    if (newUsers.length !== users.value.length) {
      users.value = newUsers
      saveToStorage('users', users.value)
      return true
    }
    return false
  }
  
  function updateRolePermissions(role, permissions) {
    rolePermissions.value[role] = [...permissions]
    saveToStorage('rolePermissions', rolePermissions.value)
    return true
  }
  
  function resetToDefaults() {
    users.value = [...defaultUsers]
    rolePermissions.value = JSON.parse(JSON.stringify(defaultRolePermissions))
    saveToStorage('users', users.value)
    saveToStorage('rolePermissions', rolePermissions.value)
    return true
  }
  
  return {
    currentUser,
    loginEnabled,
    isLoggedIn,
    userRole,
    isAdmin,
    hasPermission,
    users,
    rolePermissions,
    login,
    logout,
    updateUser,
    addUser,
    deleteUser,
    updateRolePermissions,
    resetToDefaults
  }
}) 