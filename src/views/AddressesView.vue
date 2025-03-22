<script setup>
// Címek nézet komponens
// Ez a komponens lehetővé teszi a címek kezelését (megtekintés, létrehozás, szerkesztés, törlés)
import { ref, computed, onMounted, reactive } from 'vue'
import { addressService } from '../services/db'
import couchDBService from '../services/couchdb-service'

// Állapot
const loading = ref(false)
const error = ref(null)
const addresses = ref([])
const stats = ref({ total: 0, active: 0, streets: 0 })

// Modál állapot
const showModal = ref(false)
const modalTitle = ref('')
const currentAddress = ref(null)
const modalMode = ref('create') // 'create' vagy 'edit'

// Törlés megerősítés modál
const showDeleteConfirm = ref(false)
const addressToDelete = ref(null)

// Szűrés és rendezés beállítások
const filterSettings = reactive({
  searchQuery: '',
  sortField: 'street',
  sortDirection: 'asc'
})

// Adatok betöltése
const loadData = async () => {
  loading.value = true
  error.value = null
  
  try {
    // Címek lekérése az adatbázisból
    const result = await addressService.getAllAddresses()
    addresses.value = result
    
    // Ha nincsenek címek, inicializáljuk az adatbázist
    if (result.length === 0) {
      error.value = "Nincsenek címek az adatbázisban. Próbáld meg inicializálni az adatbázist."
      await initializeAddressDatabase()
      return
    }
    
    // Statisztikák számítása
    calculateStats()
  } catch (err) {
    console.error('Hiba a címek betöltése közben:', err)
    error.value = 'Nem sikerült betölteni a címeket: ' + (err.message || err)
    
    // Próbáljuk meg inicializálni az adatbázist
    await initializeAddressDatabase()
  } finally {
    loading.value = false
  }
}

// Cím adatbázis inicializálása
const initializeAddressDatabase = async () => {
  try {
    loading.value = true
    error.value = "Adatbázis inicializálása folyamatban..."
    
    // Design doc létrehozása és minta adatok feltöltése
    await couchDBService.seedSampleAddresses()
    
    // Újra próbáljuk betölteni az adatokat
    const result = await addressService.getAllAddresses()
    addresses.value = result
    
    if (result.length > 0) {
      error.value = null
      calculateStats()
    } else {
      error.value = "Nem sikerült inicializálni az adatbázist. Kérlek, ellenőrizd a szerver kapcsolatot."
    }
  } catch (err) {
    console.error('Hiba az adatbázis inicializálása közben:', err)
    error.value = 'Adatbázis inicializálás sikertelen: ' + (err.message || err)
  } finally {
    loading.value = false
  }
}

// Statisztikák számítása
const calculateStats = () => {
  const total = addresses.value.length
  const active = addresses.value.filter(a => a.active !== false).length
  
  // Egyedi utcák számolása
  const uniqueStreets = new Set(addresses.value.map(a => a.street))
  
  stats.value = {
    total,
    active,
    streets: uniqueStreets.size
  }
}

// Szűrt és rendezett címek
const filteredAddresses = computed(() => {
  let result = [...addresses.value]
  
  // Szűrés keresési kifejezés alapján
  if (filterSettings.searchQuery) {
    const query = filterSettings.searchQuery.toLowerCase()
    result = result.filter(address => {
      return (
        (address.street && address.street.toLowerCase().includes(query)) ||
        (address.houseNumber && address.houseNumber.toString().includes(query)) ||
        (address.city && address.city.toLowerCase().includes(query)) ||
        (address.zipCode && address.zipCode.toString().includes(query))
      )
    })
  }
  
  // Rendezés
  result.sort((a, b) => {
    let fieldA = a[filterSettings.sortField] || ''
    let fieldB = b[filterSettings.sortField] || ''
    
    // Szám típusú mezők kezelése
    if (typeof fieldA === 'number' && typeof fieldB === 'number') {
      return filterSettings.sortDirection === 'asc' ? fieldA - fieldB : fieldB - fieldA
    }
    
    // Szöveg típusú mezők kezelése
    if (typeof fieldA === 'string' && typeof fieldB === 'string') {
      // Magyar ABC szerint rendezzük a szöveget
      const compareResult = fieldA.localeCompare(fieldB, 'hu-HU', { sensitivity: 'base' })
      return filterSettings.sortDirection === 'asc' ? compareResult : -compareResult
    }
    
    return 0
  })
  
  return result
})

// Új cím létrehozása
const createNewAddress = () => {
  currentAddress.value = {
    street: '',
    houseNumber: '',
    city: 'Sándorfalva',
    zipCode: '6762',
    active: true
  }
  modalMode.value = 'create'
  modalTitle.value = 'Új cím hozzáadása'
  showModal.value = true
}

// Cím szerkesztése
const editAddress = (address) => {
  currentAddress.value = { ...address }
  modalMode.value = 'edit'
  modalTitle.value = 'Cím szerkesztése'
  showModal.value = true
}

// Cím mentése
const saveAddress = async () => {
  if (!currentAddress.value.street || !currentAddress.value.city) {
    error.value = 'A cím és a város megadása kötelező!'
    return
  }
  
  try {
    loading.value = true
    error.value = null
    
    // Üres mezők alapértelmezése
    if (!currentAddress.value.houseNumber) {
      currentAddress.value.houseNumber = ''
    }
    
    // Mentés
    await addressService.saveAddress(currentAddress.value)
    
    // Adatok újratöltése
    await loadData()
    
    // Modál bezárása
    showModal.value = false
  } catch (err) {
    console.error('Hiba a cím mentése közben:', err)
    error.value = 'Nem sikerült menteni a címet: ' + (err.message || err)
  } finally {
    loading.value = false
  }
}

// Cím törlés megerősítése
const confirmDelete = (address) => {
  addressToDelete.value = address
  showDeleteConfirm.value = true
}

// Cím törlése
const deleteAddress = async () => {
  if (!addressToDelete.value || !addressToDelete.value._id) {
    showDeleteConfirm.value = false
    return
  }
  
  try {
    loading.value = true
    error.value = null
    
    // Törlés
    await addressService.deleteAddress(addressToDelete.value._id)
    
    // Adatok újratöltése
    await loadData()
    
    // Modál bezárása
    showDeleteConfirm.value = false
    addressToDelete.value = null
  } catch (err) {
    console.error('Hiba a cím törlése közben:', err)
    error.value = 'Nem sikerült törölni a címet: ' + (err.message || err)
  } finally {
    loading.value = false
  }
}

// Sortfield változtatása
const changeSortField = (field) => {
  if (filterSettings.sortField === field) {
    // Ha már eszerint rendezünk, megfordítjuk az irányt
    filterSettings.sortDirection = filterSettings.sortDirection === 'asc' ? 'desc' : 'asc'
  } else {
    // Új mező szerint rendezünk
    filterSettings.sortField = field
    filterSettings.sortDirection = 'asc'
  }
}

// Adatbázis inicializálása
const initializeDatabase = async () => {
  loading.value = true
  error.value = "Adatbázis inicializálása folyamatban..."
  
  try {
    await initializeAddressDatabase()
  } catch (err) {
    console.error('Inicializálási hiba:', err)
    error.value = 'Nem sikerült inicializálni az adatbázist: ' + (err.message || err)
  } finally {
    loading.value = false
  }
}

// Komponens betöltésekor
onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="addresses-view">
    <h1>Címek kezelése</h1>
    
    <!-- Betöltési jelző -->
    <div v-if="loading" class="loading-indicator">
      <div class="spinner"></div>
      <p>Adatok betöltése...</p>
    </div>
    
    <!-- Hibaüzenet -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="loadData" class="btn btn-sm">Újra</button>
      <button @click="initializeDatabase" class="btn btn-sm btn-primary">Adatbázis inicializálása</button>
    </div>
    
    <!-- Statisztikák -->
    <div v-if="!error" class="stats-panel">
      <div class="stat-box">
        <span class="stat-title">Összes cím</span>
        <span class="stat-value">{{ stats.total }}</span>
      </div>
      <div class="stat-box">
        <span class="stat-title">Aktív címek</span>
        <span class="stat-value">{{ stats.active }}</span>
      </div>
      <div class="stat-box">
        <span class="stat-title">Utcák száma</span>
        <span class="stat-value">{{ stats.streets }}</span>
      </div>
    </div>
    
    <!-- Eszköztár: keresés, szűrés, új cím -->
    <div v-if="!error && addresses.length > 0" class="addresses-toolbar">
      <div class="search-box">
        <input 
          type="text" 
          v-model="filterSettings.searchQuery" 
          placeholder="Keresés utca, házszám, stb."
          class="form-control"
        >
      </div>
      
      <button @click="createNewAddress" class="btn btn-primary">
        <span>➕</span> Új cím
      </button>
    </div>
    
    <!-- Címek listája táblázatban -->
    <div v-if="!error && addresses.length > 0" class="addresses-table-container">
      <table class="addresses-table">
        <thead>
          <tr>
            <th @click="changeSortField('street')" class="sortable">
              Utca
              <span v-if="filterSettings.sortField === 'street'" class="sort-arrow">
                {{ filterSettings.sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="changeSortField('houseNumber')" class="sortable">
              Házszám
              <span v-if="filterSettings.sortField === 'houseNumber'" class="sort-arrow">
                {{ filterSettings.sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="changeSortField('city')" class="sortable">
              Város
              <span v-if="filterSettings.sortField === 'city'" class="sort-arrow">
                {{ filterSettings.sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="changeSortField('zipCode')" class="sortable">
              Irányítószám
              <span v-if="filterSettings.sortField === 'zipCode'" class="sort-arrow">
                {{ filterSettings.sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>Állapot</th>
            <th>Műveletek</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && filteredAddresses.length === 0">
            <td colspan="6" class="no-data">
              <p>Nincs találat a keresési feltételeknek.</p>
              <button v-if="filterSettings.searchQuery" @click="filterSettings.searchQuery = ''" class="btn btn-sm">
                Szűrés törlése
              </button>
            </td>
          </tr>
          <tr v-for="address in filteredAddresses" :key="address._id" :class="{ 'inactive': address.active === false }">
            <td>{{ address.street }}</td>
            <td>{{ address.houseNumber }}</td>
            <td>{{ address.city }}</td>
            <td>{{ address.zipCode }}</td>
            <td>
              <span class="status-badge" :class="{ 'active': address.active !== false, 'inactive': address.active === false }">
                {{ address.active === false ? 'Inaktív' : 'Aktív' }}
              </span>
            </td>
            <td class="actions">
              <button @click="editAddress(address)" class="btn btn-sm btn-edit" title="Szerkesztés">
                ✏️
              </button>
              <button @click="confirmDelete(address)" class="btn btn-sm btn-delete" title="Törlés">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Cím létrehozás/szerkesztés modál -->
    <div v-if="showModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ modalTitle }}</h2>
          <button @click="showModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="street">Utca*</label>
            <input type="text" id="street" v-model="currentAddress.street" class="form-control" required>
          </div>
          <div class="form-group">
            <label for="houseNumber">Házszám</label>
            <input type="text" id="houseNumber" v-model="currentAddress.houseNumber" class="form-control">
          </div>
          <div class="form-group">
            <label for="city">Város*</label>
            <input type="text" id="city" v-model="currentAddress.city" class="form-control" required>
          </div>
          <div class="form-group">
            <label for="zipCode">Irányítószám</label>
            <input type="text" id="zipCode" v-model="currentAddress.zipCode" class="form-control">
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="currentAddress.active">
              Aktív cím
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showModal = false" class="btn btn-secondary">Mégsem</button>
          <button @click="saveAddress" class="btn btn-primary">Mentés</button>
        </div>
      </div>
    </div>
    
    <!-- Törlés megerősítése modál -->
    <div v-if="showDeleteConfirm" class="modal">
      <div class="modal-content delete-confirm">
        <div class="modal-header">
          <h2>Cím törlése</h2>
          <button @click="showDeleteConfirm = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <p>Biztosan törölni szeretné ezt a címet?</p>
          <p v-if="addressToDelete" class="address-to-delete">
            {{ addressToDelete.street }} {{ addressToDelete.houseNumber }}, {{ addressToDelete.zipCode }} {{ addressToDelete.city }}
          </p>
          <p class="warning">A művelet nem vonható vissza!</p>
        </div>
        <div class="modal-footer">
          <button @click="showDeleteConfirm = false" class="btn btn-secondary">Mégsem</button>
          <button @click="deleteAddress" class="btn btn-danger">Törlés</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.addresses-view {
  padding: 1rem;
  max-width: 100%;
}

h1 {
  margin-bottom: 1.5rem;
  color: var(--primary-color);
}

/* Hibaüzenet */
.error-message {
  background-color: #fff0f0;
  border: 1px solid #ffcccc;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  color: #dc3545;
}

.error-message button {
  margin-right: 0.5rem;
  margin-top: 0.5rem;
}

/* Statisztikák panel */
.stats-panel {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-box {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-title {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--primary-color);
}

/* Eszköztár */
.addresses-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1.5rem;
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-box {
  flex: 1;
  position: relative;
}

.search-box input {
  width: 100%;
  padding: 0.8rem 1rem 0.8rem 2.5rem;
  border-radius: 25px;
  border: 1px solid #e0e0e0;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  background-color: #f8f9fa;
}

.search-box::before {
  content: "🔍";
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
  font-size: 0.9rem;
}

.search-box input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
  background-color: white;
}

/* Gombok */
.btn {
  padding: 0.7rem 1.2rem;
  border-radius: 25px;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-color-dark, #0056b3);
}

.btn-secondary {
  background-color: #f8f9fa;
  color: #495057;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background-color: #e9ecef;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}

.btn-edit, .btn-delete {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.btn-edit {
  background-color: #e9f5ff;
  color: #0969da;
}

.btn-edit:hover {
  background-color: #d0e8ff;
}

.btn-delete {
  background-color: #ffebee;
  color: #d32f2f;
}

.btn-delete:hover {
  background-color: #ffdce0;
}

/* Táblázat */
.addresses-table-container {
  width: 100%;
  overflow-x: auto;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.addresses-table {
  width: 100%;
  border-collapse: collapse;
}

.addresses-table th,
.addresses-table td {
  padding: 0.8rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.addresses-table th {
  background-color: #f9f9f9;
  font-weight: bold;
}

.addresses-table tr:last-child td {
  border-bottom: none;
}

.addresses-table tr:hover {
  background-color: #f8f9fa;
}

.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 20px;
}

.sortable:hover {
  background-color: #edf2f7;
}

.sort-arrow {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: bold;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 25px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.active {
  background-color: #e6f7e6;
  color: #28a745;
}

.status-badge.inactive {
  background-color: #f8f9fa;
  color: #6c757d;
}

tr.inactive {
  color: #6c757d;
  background-color: #f8f9fa;
}

.no-data {
  text-align: center;
  padding: 2rem !important;
  color: #6c757d;
}

/* Műveletek */
.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

/* Modál */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #eee;
  background-color: #f8f9fa;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: #e9ecef;
  color: #343a40;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.2rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #495057;
}

.form-control {
  width: 100%;
  padding: 0.7rem 1rem;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.1);
}

.modal-footer {
  padding: 1.2rem 1.5rem;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
  background-color: #f8f9fa;
}

/* Törlés megerősítés modál */
.delete-confirm .warning {
  color: #dc3545;
  font-weight: bold;
}

.address-to-delete {
  background-color: #f8f9fa;
  padding: 0.8rem;
  border-radius: 8px;
  margin: 1rem 0;
  border: 1px solid #e9ecef;
  font-weight: 500;
  text-align: center;
}

/* Betöltés jelző */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Reszponzív design */
@media (max-width: 768px) {
  .stats-panel {
    flex-direction: column;
  }
  
  .stat-box {
    width: 100%;
    min-width: unset;
  }
  
  .addresses-toolbar {
    flex-direction: column;
    padding: 1rem;
  }
  
  .search-box {
    width: 100%;
    margin-bottom: 0.8rem;
  }
  
  .btn {
    width: 100%;
  }
  
  .addresses-table th:nth-child(4),
  .addresses-table td:nth-child(4) {
    display: none;
  }
}
</style> 