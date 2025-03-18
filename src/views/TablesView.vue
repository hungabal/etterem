<script setup>
// Asztalok kezelése nézet
// Ez a komponens felelős az étterem asztalainak megjelenítéséért, kezeléséért és a foglalások kezeléséért

// Szükséges Vue komponensek és szolgáltatások importálása
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { tableService } from '@/services/tableService';
import { useAuthStore } from '../stores/auth';

// Asztalok adatai
// tables: Az összes asztal listája
// selectedTable: A jelenleg kiválasztott asztal
// refreshInterval: Az automatikus frissítés időzítője
const tables = ref([]);
const selectedTable = ref(null);
const refreshInterval = ref(null);
const windowWidth = ref(window.innerWidth);

// Mobil nézet ellenőrzése
const isMobileView = computed(() => {
  return windowWidth.value <= 768;
});

// Ablak méretének figyelése
const handleResize = () => {
  windowWidth.value = window.innerWidth;
};

// Új asztal adatai
// Az új asztal létrehozásához használt űrlap adatai
const newTable = reactive({
  name: '',
  seats: 4,
});

// Szerkesztési mód
// isEditingTable: Jelzi, hogy szerkesztési módban vagyunk-e
// editedTable: A szerkesztett asztal adatai
const isEditingTable = ref(false);
const editedTable = reactive({
  name: '',
  seats: 0,
});

// Új foglalás adatai
// Az új foglalás létrehozásához használt űrlap adatai
const newReservation = reactive({
  name: '',
  phone: '',
  date: '',
  time: '',
  guests: 1,
});

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);

// Asztalok betöltése
// Ez a függvény lekéri az összes asztalt az adatbázisból és frissíti a helyi állapotot
const loadTables = async () => {
  try {
    tables.value = await tableService.getTables();
    
    // Ha van kiválasztott asztal, frissítjük annak adatait is
    if (selectedTable.value) {
      const updatedTable = tables.value.find(t => t._id === selectedTable.value._id);
      if (updatedTable) {
        selectedTable.value = updatedTable;
      }
    }
  } catch (error) {
    console.error('Hiba történt az asztalok betöltésekor:', error);
    alert('Nem sikerült betölteni az asztalokat. Kérjük, próbálja újra később!');
  }
};

// Komponens betöltésekor asztalok lekérése és időzítő beállítása
// Ez a hook akkor fut le, amikor a komponens bekerül a DOM-ba
onMounted(() => {
  loadTables();
  
  // Beállítunk egy időzítőt, ami 2 másodpercenként frissíti az asztalok állapotát
  // Ez biztosítja, hogy mindig a legfrissebb adatokat látjuk
  refreshInterval.value = setInterval(() => {
    loadTables();
  }, 2000);
  
  // Ablak méretének figyelése
  window.addEventListener('resize', handleResize);
});

// Komponens leválasztásakor időzítő törlése
// Ez a hook akkor fut le, amikor a komponens kikerül a DOM-ból
// Fontos a memóriaszivárgás elkerülése érdekében
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
  
  // Eseményfigyelő eltávolítása
  window.removeEventListener('resize', handleResize);
});

// Asztal kiválasztása
// Ez a függvény állítja be a kiválasztott asztalt és inicializálja a foglalási űrlapot
const selectTable = (table) => {
  selectedTable.value = table;
  isEditingTable.value = false;
  
  // Ha van foglalás, betöltjük az adatokat a foglalási űrlapba
  if (table.reservation) {
    newReservation.name = table.reservation.name;
    newReservation.phone = table.reservation.phone;
    newReservation.date = table.reservation.date;
    newReservation.time = table.reservation.time;
    newReservation.guests = table.reservation.guests;
  } else {
    // Alapértelmezett értékek, ha nincs foglalás
    newReservation.name = '';
    newReservation.phone = '';
    newReservation.date = '';
    newReservation.time = '';
    newReservation.guests = 1;
  }
};

// Asztal szerkesztési mód bekapcsolása
// Ez a függvény inicializálja az asztal szerkesztési űrlapot
const startEditingTable = () => {
  if (!selectedTable.value) return;
  
  editedTable.name = selectedTable.value.name;
  editedTable.seats = selectedTable.value.seats || selectedTable.value.capacity || 4;
  isEditingTable.value = true;
};

// Asztal adatainak mentése
// Ez a függvény menti a szerkesztett asztal adatait az adatbázisba
const saveTableDetails = async () => {
  if (!selectedTable.value) return;
  
  // Validáció
  if (!editedTable.name) {
    alert('Kérjük, adja meg az asztal nevét!');
    return;
  }
  
  if (editedTable.seats < 1) {
    alert('A férőhelyek száma nem lehet kisebb, mint 1!');
    return;
  }
  
  try {
    // Asztal frissítése
    await tableService.updateTable(selectedTable.value._id, {
      name: editedTable.name,
      seats: editedTable.seats,
      capacity: editedTable.seats
    });
    
    // Frissítjük az asztalok listáját
    await loadTables();
    
    // Frissítjük a kiválasztott asztalt
    const updatedTable = tables.value.find(t => t._id === selectedTable.value._id);
    if (updatedTable) {
      selectedTable.value = updatedTable;
    }
    
    // Kilépünk a szerkesztési módból
    isEditingTable.value = false;
    
    alert('Asztal adatai sikeresen mentve!');
  } catch (error) {
    console.error('Hiba történt az asztal adatainak mentésekor:', error);
    alert('Nem sikerült menteni az asztal adatait. Kérjük, próbálja újra később!');
  }
};

// Szerkesztés megszakítása
const cancelEditing = () => {
  isEditingTable.value = false;
};

// Asztal állapotának módosítása
const changeTableStatus = async (status) => {
  if (!selectedTable.value) return;
  
  try {
    await tableService.updateTableStatus(selectedTable.value._id, status);
    await loadTables();
  } catch (error) {
    console.error('Hiba történt az asztal státuszának módosításakor:', error);
    alert('Nem sikerült módosítani az asztal státuszát. Kérjük, próbálja újra később!');
  }
};

// Foglalás mentése
const saveReservation = async () => {
  if (!selectedTable.value) return;
  
  // Validáció
  if (!newReservation.name || !newReservation.phone || !newReservation.date || !newReservation.time) {
    alert('Kérjük, töltse ki az összes kötelező mezőt!');
    return;
  }
  
  try {
    // Foglalás mentése
    await tableService.updateReservation(selectedTable.value._id, {
      name: newReservation.name,
      phone: newReservation.phone,
      date: newReservation.date,
      time: newReservation.time,
      guests: newReservation.guests
    });
    
    // Frissítjük az asztalok listáját
    await loadTables();
    
    alert('Foglalás sikeresen mentve!');
  } catch (error) {
    console.error('Hiba történt a foglalás mentésekor:', error);
    alert('Nem sikerült menteni a foglalást. Kérjük, próbálja újra később!');
  }
};

// Foglalás törlése
const deleteReservation = async () => {
  if (!selectedTable.value || !selectedTable.value.reservation) return;
  
  if (confirm('Biztosan törölni szeretné a foglalást?')) {
    try {
      await tableService.deleteReservation(selectedTable.value._id);
      
      // Frissítjük az asztalok listáját
      await loadTables();
      
      alert('Foglalás sikeresen törölve!');
    } catch (error) {
      console.error('Hiba történt a foglalás törlésekor:', error);
      alert('Nem sikerült törölni a foglalást. Kérjük, próbálja újra később!');
    }
  }
};

// Új asztal hozzáadása
const addNewTable = async () => {
  // Validáció
  if (!newTable.name) {
    alert('Kérjük, adja meg az asztal nevét!');
    return;
  }
  
  try {
    // Új asztal létrehozása
    await tableService.createTable({
      name: newTable.name,
      seats: newTable.seats,
      status: 'free'
    });
    
    // Frissítjük az asztalok listáját
    await loadTables();
    
    // Mezők törlése
    newTable.name = '';
    newTable.seats = 4;
    
    alert('Új asztal sikeresen hozzáadva!');
  } catch (error) {
    console.error('Hiba történt az asztal létrehozásakor:', error);
    alert('Nem sikerült létrehozni az asztalt. Kérjük, próbálja újra később!');
  }
};

// Asztal törlése
const deleteTable = async () => {
  if (!selectedTable.value) return;
  
  if (confirm(`Biztosan törölni szeretné a(z) ${selectedTable.value.name} asztalt?`)) {
    try {
      await tableService.deleteTable(selectedTable.value._id);
      
      // Frissítjük az asztalok listáját
      await loadTables();
      
      selectedTable.value = null;
      alert('Asztal sikeresen törölve!');
    } catch (error) {
      console.error('Hiba történt az asztal törlésekor:', error);
      alert('Nem sikerült törölni az asztalt. Kérjük, próbálja újra később!');
    }
  }
};

// Dátum formázása
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('hu-HU');
};
</script>

<template>
  <div class="tables-view">
    <h1>Asztalok kezelése</h1>
    
    <div class="tables-container">
      <!-- Asztalok listája -->
      <div class="tables-list-section" :class="{ 'mobile-hidden': selectedTable && isMobileView }">
        <div class="section-header">
          <h2>Asztalok</h2>
          <button class="add-btn" @click="selectedTable = null">+ Új asztal</button>
        </div>
        
        <div class="tables-grid">
          <div 
            v-for="table in tables" 
            :key="table._id" 
            class="table-card" 
            :class="{ 
              'table-free': table.status === 'free',
              'table-occupied': table.status === 'occupied',
              'table-reserved': table.status === 'reserved',
              'table-selected': selectedTable && selectedTable._id === table._id
            }"
            @click="selectTable(table)"
          >
            <div class="table-header">
              <div class="table-name">{{ table.name }}</div>
              <div class="table-capacity">{{ table.seats || table.capacity || 0 }} fő</div>
            </div>
            
            <div class="table-status">
              {{ 
                table.status === 'free' ? 'Szabad' : 
                table.status === 'occupied' ? 'Foglalt' : 'Foglalva' 
              }}
            </div>
            
            <div v-if="table.reservation" class="table-reservation">
              <div>{{ table.reservation.name }}</div>
              <div>{{ formatDate(table.reservation.date) }} {{ table.reservation.time }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Asztal részletek / Új asztal -->
      <div class="table-details-section" :class="{ 'mobile-visible': selectedTable && isMobileView }">
        <div v-if="isMobileView && selectedTable" class="mobile-back-button">
          <button class="secondary-btn" @click="selectedTable = null">
            <span>←</span> Vissza az asztalokhoz
          </button>
        </div>
        
        <div v-if="!selectedTable" class="new-table-form">
          <h2>Új asztal hozzáadása</h2>
          
          <div class="form-group">
            <label for="table-name">Asztal neve:</label>
            <input type="text" id="table-name" v-model="newTable.name" placeholder="pl. Asztal 9">
          </div>
          
          <div class="form-group">
            <label for="table-capacity">Férőhelyek száma:</label>
            <input type="number" id="table-capacity" v-model="newTable.seats" min="1" max="20">
          </div>
          
          <div class="form-actions">
            <button class="primary-btn" @click="addNewTable">Asztal hozzáadása</button>
          </div>
        </div>
        
        <div v-else class="table-management">
          <h2>{{ selectedTable.name }} kezelése</h2>
          
          <!-- Asztal adatok szerkesztése -->
          <div v-if="isEditingTable" class="table-edit-form">
            <h3>Asztal adatainak szerkesztése</h3>
            
            <div class="form-group">
              <label for="edit-table-name">Asztal neve:</label>
              <input type="text" id="edit-table-name" v-model="editedTable.name" placeholder="pl. Asztal 9">
            </div>
            
            <div class="form-group">
              <label for="edit-table-capacity">Férőhelyek száma:</label>
              <input type="number" id="edit-table-capacity" v-model="editedTable.seats" min="1" max="20">
            </div>
            
            <div class="form-actions">
              <button class="primary-btn" @click="saveTableDetails">Mentés</button>
              <button class="secondary-btn" @click="cancelEditing">Mégsem</button>
            </div>
          </div>
          
          <!-- Asztal információk -->
          <div v-else>
            <div class="table-info">
              <div class="info-item">
                <span class="info-label">Állapot:</span>
                <span class="info-value" :class="{
                  'status-free': selectedTable.status === 'free',
                  'status-occupied': selectedTable.status === 'occupied',
                  'status-reserved': selectedTable.status === 'reserved'
                }">
                  {{ 
                    selectedTable.status === 'free' ? 'Szabad' : 
                    selectedTable.status === 'occupied' ? 'Foglalt' : 'Foglalva' 
                  }}
                </span>
              </div>
              
              <div class="info-item">
                <span class="info-label">Férőhelyek:</span>
                <span class="info-value">{{ selectedTable.seats || selectedTable.capacity || 0 }} fő</span>
              </div>
            </div>
            
            <div class="table-actions">
              <button class="edit-btn" @click="startEditingTable">
                <span class="edit-icon">✏️</span> Asztal adatainak szerkesztése
              </button>
            </div>
            
            <div class="status-actions">
              <button 
                class="status-btn free-btn" 
                :class="{ active: selectedTable.status === 'free' }"
                @click="changeTableStatus('free')"
              >
                Szabad
              </button>
              <button 
                class="status-btn occupied-btn" 
                :class="{ active: selectedTable.status === 'occupied' }"
                @click="changeTableStatus('occupied')"
              >
                Foglalt
              </button>
              <button 
                class="status-btn reserved-btn" 
                :class="{ active: selectedTable.status === 'reserved' }"
                @click="changeTableStatus('reserved')"
              >
                Foglalva
              </button>
            </div>
            
            <div class="reservation-section">
              <h3>Asztalfoglalás</h3>
              
              <div class="form-group">
                <label for="reservation-name">Név:</label>
                <input type="text" id="reservation-name" v-model="newReservation.name" placeholder="Vendég neve">
              </div>
              
              <div class="form-group">
                <label for="reservation-phone">Telefonszám:</label>
                <input type="text" id="reservation-phone" v-model="newReservation.phone" placeholder="+36201234567">
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="reservation-date">Dátum:</label>
                  <input type="date" id="reservation-date" v-model="newReservation.date">
                </div>
                
                <div class="form-group">
                  <label for="reservation-time">Időpont:</label>
                  <input type="time" id="reservation-time" v-model="newReservation.time">
                </div>
              </div>
              
              <div class="form-group">
                <label for="reservation-guests">Vendégek száma:</label>
                <input type="number" id="reservation-guests" v-model="newReservation.guests" min="1" :max="selectedTable.capacity">
              </div>
              
              <div class="form-actions">
                <button class="primary-btn" @click="saveReservation">Foglalás mentése</button>
                <button 
                  v-if="selectedTable.reservation && (isAdmin || !authStore.loginEnabled)" 
                  class="danger-btn" 
                  @click="deleteReservation"
                >
                  Foglalás törlése
                </button>
              </div>
            </div>
            
            <div class="delete-table" v-if="isAdmin || !authStore.loginEnabled">
              <button class="danger-btn" @click="deleteTable">Asztal törlése</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tables-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

.tables-view h1 {
  color: var(--primary-color);
}

.tables-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

/* Asztalok lista szekció */
.tables-list-section {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.add-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: bold;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.table-card {
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.table-free {
  background-color: #e8f5e9;
}

.table-occupied {
  background-color: #ffebee;
}

.table-reserved {
  background-color: #fff8e1;
}

.table-selected {
  border-color: var(--primary-color);
  transform: scale(1.05);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-name {
  font-weight: bold;
}

.table-capacity {
  font-size: 0.85rem;
  color: #666;
}

.table-status {
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
  font-size: 0.85rem;
}

.table-free .table-status {
  background-color: #c8e6c9;
  color: #2e7d32;
}

.table-occupied .table-status {
  background-color: #ffcdd2;
  color: #c62828;
}

.table-reserved .table-status {
  background-color: #ffecb3;
  color: #f57f17;
}

.table-reservation {
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

/* Asztal részletek szekció */
.table-details-section {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.new-table-form, .table-management {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.table-info {
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
}

.info-label {
  font-weight: bold;
}

.status-free {
  color: #2e7d32;
}

.status-occupied {
  color: #c62828;
}

.status-reserved {
  color: #f57f17;
}

.status-actions {
  display: flex;
  gap: 0.5rem;
}

.status-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.status-btn:hover, .status-btn.active {
  opacity: 1;
}

.free-btn {
  background-color: #c8e6c9;
  color: #2e7d32;
}

.occupied-btn {
  background-color: #ffcdd2;
  color: #c62828;
}

.reserved-btn {
  background-color: #ffecb3;
  color: #f57f17;
}

.reservation-section {
  border-top: 1px solid #eee;
  padding-top: 1rem;
  margin-top: 0.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.primary-btn, .danger-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.primary-btn {
  background-color: var(--primary-color);
  color: white;
}

.danger-btn {
  background-color: #ffcdd2;
  color: #c62828;
}

.delete-table {
  margin-top: 2rem;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

/* Reszponzív design */
@media (max-width: 768px) {
  .tables-container {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .mobile-hidden {
    display: none;
  }
  
  .mobile-visible {
    display: block;
  }
  
  .mobile-back-button {
    margin-bottom: 1rem;
  }
  
  .mobile-back-button button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
  }
}

/* Removing status bar styles */
.status-bar,
.connection-status,
.connection-status::before,
.connection-status.offline,
.connection-status.offline::before,
.pending-changes {
  display: none;
}

.table-actions {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f0f0f0;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: bold;
  width: 100%;
  transition: background-color 0.2s;
}

.edit-btn:hover {
  background-color: #e0e0e0;
}

.edit-icon {
  font-size: 1rem;
}

.table-edit-form {
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.secondary-btn {
  background-color: #f0f0f0;
  color: #333;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: bold;
}

.secondary-btn:hover {
  background-color: #e0e0e0;
}
</style> 