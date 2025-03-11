<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useAuthStore, UserRoles, AvailableMenus } from '../stores/auth'

const authStore = useAuthStore()

// Állapot
const users = computed(() => authStore.users)
const rolePermissions = computed(() => authStore.rolePermissions)
const selectedUser = ref(null)
const isEditingUser = ref(false)
const isAddingUser = ref(false)
const showDeleteConfirm = ref(false)
const userToDelete = ref(null)
const activeTab = ref('users') // 'users' vagy 'permissions'
const selectedRole = ref(UserRoles.WAITER)
const successMessage = ref('')
const errorMessage = ref('')
const messageTimeout = ref(null)

// Új/szerkesztett felhasználó adatai
const editedUser = reactive({
  id: null,
  name: '',
  code: '',
  role: UserRoles.WAITER
})

// Szerepkörök listája
const roles = [
  { id: UserRoles.WAITER, name: 'Pincér' },
  { id: UserRoles.CHEF, name: 'Szakács' },
  { id: UserRoles.COURIER, name: 'Futár' },
  { id: UserRoles.ADMIN, name: 'Adminisztrátor' }
]

// Szerepkör nevének lekérdezése
const getRoleName = (roleId) => {
  const role = roles.find(r => r.id === roleId)
  return role ? role.name : roleId
}

// Felhasználó szerkesztése
const editUser = (user) => {
  selectedUser.value = user
  Object.assign(editedUser, { ...user })
  isEditingUser.value = true
  isAddingUser.value = false
}

// Új felhasználó hozzáadása
const addNewUser = () => {
  Object.assign(editedUser, {
    id: null,
    name: '',
    code: '',
    role: UserRoles.WAITER
  })
  isAddingUser.value = true
  isEditingUser.value = true
  selectedUser.value = null
}

// Felhasználó mentése
const saveUser = () => {
  // Validáció
  if (!editedUser.name.trim()) {
    showMessage('Kérjük, adja meg a felhasználó nevét!', true)
    return
  }
  
  if (!editedUser.code.trim() || editedUser.code.length !== 4 || !/^\d+$/.test(editedUser.code)) {
    showMessage('A belépési kódnak pontosan 4 számjegyből kell állnia!', true)
    return
  }
  
  // Ellenőrizzük, hogy a kód egyedi-e (kivéve, ha ugyanazt a felhasználót szerkesztjük)
  const codeExists = users.value.some(u => 
    u.code === editedUser.code && (!selectedUser.value || u.id !== selectedUser.value.id)
  )
  
  if (codeExists) {
    showMessage('Ez a belépési kód már használatban van!', true)
    return
  }
  
  let success = false
  
  if (isAddingUser.value) {
    // Új felhasználó hozzáadása
    success = authStore.addUser(editedUser)
    if (success) {
      showMessage('Felhasználó sikeresen hozzáadva!')
    } else {
      showMessage('Hiba történt a felhasználó hozzáadásakor!', true)
      return
    }
  } else {
    // Meglévő felhasználó frissítése
    success = authStore.updateUser(editedUser)
    if (success) {
      showMessage('Felhasználó sikeresen frissítve!')
    } else {
      showMessage('Hiba történt a felhasználó frissítésekor!', true)
      return
    }
  }
  
  // Visszaállítjuk az állapotot
  isEditingUser.value = false
  isAddingUser.value = false
  selectedUser.value = null
}

// Felhasználó törlésének megerősítése
const confirmDeleteUser = (user) => {
  userToDelete.value = user
  showDeleteConfirm.value = true
}

// Felhasználó törlése
const deleteUser = () => {
  if (!userToDelete.value) return
  
  const success = authStore.deleteUser(userToDelete.value.id)
  
  if (success) {
    showMessage('Felhasználó sikeresen törölve!')
  } else {
    showMessage('Nem lehet törölni az utolsó admin felhasználót!', true)
  }
  
  showDeleteConfirm.value = false
  userToDelete.value = null
}

// Szerkesztés megszakítása
const cancelEdit = () => {
  isEditingUser.value = false
  isAddingUser.value = false
  selectedUser.value = null
}

// Jogosultságok frissítése
const updatePermissions = (role, menuId, isChecked) => {
  const currentPermissions = [...rolePermissions.value[role] || []]
  
  if (isChecked && !currentPermissions.includes(menuId)) {
    currentPermissions.push(menuId)
  } else if (!isChecked && currentPermissions.includes(menuId)) {
    const index = currentPermissions.indexOf(menuId)
    if (index !== -1) {
      currentPermissions.splice(index, 1)
    }
  }
  
  authStore.updateRolePermissions(role, currentPermissions)
  showMessage('Jogosultságok sikeresen frissítve!')
}

// Alapértelmezett beállítások visszaállítása
const resetToDefaults = () => {
  if (confirm('Biztosan visszaállítja az alapértelmezett felhasználókat és jogosultságokat? Ez a művelet nem vonható vissza!')) {
    authStore.resetToDefaults()
    showMessage('Alapértelmezett beállítások visszaállítva!')
  }
}

// Üzenet megjelenítése
const showMessage = (message, isError = false) => {
  if (messageTimeout.value) {
    clearTimeout(messageTimeout.value)
  }
  
  if (isError) {
    errorMessage.value = message
    successMessage.value = ''
  } else {
    successMessage.value = message
    errorMessage.value = ''
  }
  
  messageTimeout.value = setTimeout(() => {
    successMessage.value = ''
    errorMessage.value = ''
  }, 3000)
}

// Ellenőrizzük, hogy egy menüpont engedélyezve van-e egy szerepkörhöz
const isMenuEnabled = (role, menuId) => {
  return rolePermissions.value[role]?.includes(menuId) || false
}
</script>

<template>
  <div class="user-management">
    <div class="tabs">
      <button 
        :class="{ active: activeTab === 'users' }" 
        @click="activeTab = 'users'"
      >
        Felhasználók kezelése
      </button>
      <button 
        :class="{ active: activeTab === 'permissions' }" 
        @click="activeTab = 'permissions'"
      >
        Jogosultságok kezelése
      </button>
    </div>
    
    <!-- Üzenetek -->
    <div v-if="successMessage" class="message success">{{ successMessage }}</div>
    <div v-if="errorMessage" class="message error">{{ errorMessage }}</div>
    
    <!-- Felhasználók kezelése -->
    <div v-if="activeTab === 'users'" class="tab-content">
      <div class="section-header">
        <h2>Felhasználók</h2>
        <button class="add-button" @click="addNewUser">+ Új felhasználó</button>
      </div>
      
      <!-- Felhasználó szerkesztése/hozzáadása -->
      <div v-if="isEditingUser" class="edit-form">
        <h3>{{ isAddingUser ? 'Új felhasználó hozzáadása' : 'Felhasználó szerkesztése' }}</h3>
        
        <div class="form-group">
          <label for="user-name">Név:</label>
          <input 
            id="user-name" 
            v-model="editedUser.name" 
            type="text" 
            placeholder="Felhasználó neve"
          />
        </div>
        
        <div class="form-group">
          <label for="user-code">Belépési kód (4 számjegy):</label>
          <input 
            id="user-code" 
            v-model="editedUser.code" 
            type="text" 
            maxlength="4"
            placeholder="pl. 1234"
            @input="editedUser.code = editedUser.code.replace(/[^0-9]/g, '')"
          />
        </div>
        
        <div class="form-group">
          <label for="user-role">Szerepkör:</label>
          <select id="user-role" v-model="editedUser.role">
            <option v-for="role in roles" :key="role.id" :value="role.id">
              {{ role.name }}
            </option>
          </select>
        </div>
        
        <div class="form-actions">
          <button class="cancel-button" @click="cancelEdit">Mégsem</button>
          <button class="save-button" @click="saveUser">Mentés</button>
        </div>
      </div>
      
      <!-- Felhasználók listája -->
      <div v-else class="users-list">
        <table>
          <thead>
            <tr>
              <th>Név</th>
              <th>Belépési kód</th>
              <th>Szerepkör</th>
              <th>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.name }}</td>
              <td>{{ user.code }}</td>
              <td>{{ getRoleName(user.role) }}</td>
              <td class="actions">
                <button class="edit-button" @click="editUser(user)">Szerkesztés</button>
                <button class="delete-button" @click="confirmDeleteUser(user)">Törlés</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="reset-section">
        <button class="reset-button" @click="resetToDefaults">
          Alapértelmezett felhasználók visszaállítása
        </button>
      </div>
    </div>
    
    <!-- Jogosultságok kezelése -->
    <div v-if="activeTab === 'permissions'" class="tab-content">
      <div class="section-header">
        <h2>Jogosultságok</h2>
        <div class="role-selector">
          <label for="role-select">Szerepkör:</label>
          <select id="role-select" v-model="selectedRole">
            <option v-for="role in roles" :key="role.id" :value="role.id">
              {{ role.name }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="permissions-list">
        <p class="permissions-info">
          Válassza ki, hogy a <strong>{{ getRoleName(selectedRole) }}</strong> szerepkörrel rendelkező felhasználók mely menüpontokhoz férhetnek hozzá:
        </p>
        
        <div class="permission-items">
          <div 
            v-for="menu in AvailableMenus" 
            :key="menu.id" 
            class="permission-item"
          >
            <label :for="`perm-${selectedRole}-${menu.id}`" class="checkbox-label">
              <input 
                :id="`perm-${selectedRole}-${menu.id}`" 
                type="checkbox" 
                :checked="isMenuEnabled(selectedRole, menu.id)"
                @change="updatePermissions(selectedRole, menu.id, $event.target.checked)"
              />
              <span class="menu-icon">{{ menu.icon }}</span>
              {{ menu.name }}
            </label>
          </div>
        </div>
      </div>
      
      <div class="reset-section">
        <button class="reset-button" @click="resetToDefaults">
          Alapértelmezett jogosultságok visszaállítása
        </button>
      </div>
    </div>
    
    <!-- Törlés megerősítése -->
    <div v-if="showDeleteConfirm" class="delete-confirm-modal">
      <div class="modal-content">
        <h3>Felhasználó törlése</h3>
        <p>
          Biztosan törölni szeretné a következő felhasználót: 
          <strong>{{ userToDelete?.name }}</strong>?
        </p>
        <div class="modal-actions">
          <button class="cancel-button" @click="showDeleteConfirm = false">Mégsem</button>
          <button class="delete-button" @click="deleteUser">Törlés</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-management {
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--shadow);
  padding: 1.5rem;
  margin-bottom: 2rem;
  position: relative;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 1.5rem;
}

.tabs button {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  transition: all 0.3s ease;
}

.tabs button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tabs button:hover:not(.active) {
  color: var(--secondary-color);
  border-bottom-color: #ddd;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  color: var(--primary-color);
}

.add-button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.add-button:hover {
  background-color: var(--secondary-color);
}

.edit-form {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.edit-form h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--primary-color);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.cancel-button:hover {
  background-color: #e0e0e0;
}

.save-button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.save-button:hover {
  background-color: var(--secondary-color);
}

.users-list {
  margin-bottom: 1.5rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f5f5f5;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.edit-button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.edit-button:hover {
  background-color: var(--secondary-color);
}

.delete-button {
  background-color: #e53935;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.delete-button:hover {
  background-color: #c62828;
}

.role-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.role-selector label {
  font-weight: 500;
}

.role-selector select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.permissions-info {
  margin-bottom: 1.5rem;
}

.permission-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.permission-item {
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 0.75rem;
  transition: background-color 0.3s ease;
}

.permission-item:hover {
  background-color: #f0f0f0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input {
  margin-right: 0.75rem;
}

.menu-icon {
  margin-right: 0.5rem;
  font-size: 1.2rem;
}

.reset-section {
  margin-top: 2rem;
  text-align: center;
}

.reset-button {
  background-color: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.reset-button:hover {
  background-color: #e0e0e0;
  color: #333;
}

.delete-confirm-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-content h3 {
  margin-top: 0;
  color: var(--primary-color);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.message {
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.success {
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.error {
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

@media (max-width: 768px) {
  .tabs button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  
  .permission-items {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

@media (max-width: 480px) {
  .tabs {
    flex-direction: column;
  }
  
  .tabs button {
    width: 100%;
    text-align: center;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .permission-items {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .edit-button, .delete-button {
    width: 100%;
  }
}
</style> 