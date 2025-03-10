<script setup>
// Konyhai nézet
// Ez a komponens felelős a konyhai rendelések megjelenítéséért és kezeléséért
// Itt láthatják a szakácsok az aktív rendeléseket és jelezhetik, ha elkészültek velük

// Szükséges Vue komponensek és szolgáltatások importálása
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { orderService, initializeDatabase, tableService } from '../services/db.js';

// Betöltés állapota
// isLoading: Jelzi, hogy folyamatban van-e adatok betöltése
// errorMessage: Hiba esetén megjelenő üzenet
const isLoading = ref(true);
const errorMessage = ref('');

// Aktív rendelések adatai
// Az összes aktív (még nem kifizetett) rendelés listája
const activeOrders = ref([]);

// Automatikus frissítés időzítője
let refreshTimer = null;

// Szűrési beállítások
const showReadyOrders = ref(true); // Elkészült rendelések megjelenítése
const showActiveOrders = ref(true); // Aktív rendelések megjelenítése

// Szűrt rendelések
const filteredOrders = computed(() => {
  return activeOrders.value.filter(order => {
    if (order.status === 'ready') {
      return showReadyOrders.value;
    } else {
      return showActiveOrders.value;
    }
  });
});

// Szűrés beállítása
const toggleReadyOrders = () => {
  showReadyOrders.value = !showReadyOrders.value;
};

const toggleActiveOrders = () => {
  showActiveOrders.value = !showActiveOrders.value;
};

// Csak az aktív rendelések megjelenítése
const showOnlyActiveOrders = () => {
  showActiveOrders.value = true;
  showReadyOrders.value = false;
};

// Csak az elkészült rendelések megjelenítése
const showOnlyReadyOrders = () => {
  showActiveOrders.value = false;
  showReadyOrders.value = true;
};

// Minden rendelés megjelenítése
const showAllOrders = () => {
  showActiveOrders.value = true;
  showReadyOrders.value = true;
};

// Adatok betöltése
// Ez a függvény betölti az összes szükséges adatot
const loadData = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';

    // Adatbázis inicializálása
    await initializeDatabase();

    // Aktív rendelések betöltése
    const orders = await orderService.getActiveOrders();
    
    // Asztalok lekérése a nevek hozzáadásához
    const tables = await tableService.getAllTables();
    
    // Rendelésekhez hozzáadjuk az asztalok neveit
    orders.forEach(order => {
      if (order.tableId) {
        const table = tables.find(t => t._id === order.tableId);
        if (table) {
          order.tableName = table.name;
        }
      }
    });
    
    // Rendezzük a rendeléseket állapot és létrehozási idő szerint
    orders.sort((a, b) => {
      // Először az elkészült rendeléseket a végére tesszük
      if (a.status === 'ready' && b.status !== 'ready') {
        return 1; // a a végére kerül
      }
      if (a.status !== 'ready' && b.status === 'ready') {
        return -1; // b a végére kerül
      }
      
      // Ha mindkettő elkészült vagy egyik sem, akkor a többi állapot szerint rendezzük
      const statusOrder = {
        'new': 1,
        'in-progress': 2,
        'active': 3
      };
      
      const statusA = statusOrder[a.status] || 10;
      const statusB = statusOrder[b.status] || 10;
      
      if (statusA !== statusB) {
        return statusA - statusB;
      }
      
      // Ha az állapot azonos, akkor létrehozási idő szerint rendezzük
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    activeOrders.value = orders;
    isLoading.value = false;
  } catch (error) {
    console.error('Hiba az adatok betöltésekor:', error);
    errorMessage.value = 'Hiba az adatok betöltésekor: ' + error.message;
    isLoading.value = false;
  }
};

// Rendelés állapotának frissítése
const updateOrderStatus = async (order, newStatus) => {
  try {
    // Frissítjük a rendelés állapotát
    await orderService.updateOrderStatus(order._id, newStatus);
    
    // Frissítjük a rendelés állapotát a helyi listában is
    const index = activeOrders.value.findIndex(o => o._id === order._id);
    if (index !== -1) {
      activeOrders.value[index].status = newStatus;
      activeOrders.value[index].updatedAt = new Date().toISOString();
    }
    
    // Visszajelzés a felhasználónak
    const statusText = formatOrderStatus(newStatus);
    alert(`A rendelés állapota sikeresen módosítva: ${statusText}`);
    
    // Újrarendezzük a rendeléseket
    loadData();
  } catch (error) {
    console.error('Hiba a rendelés állapotának frissítésekor:', error);
    alert('Hiba a rendelés állapotának frissítésekor: ' + error.message);
  }
};

// Rendelés elkészítése
const markOrderAsReady = async (order) => {
  await updateOrderStatus(order, 'ready');
};

// Rendelés folyamatban
const markOrderAsInProgress = async (order) => {
  await updateOrderStatus(order, 'in-progress');
};

// Dátum formázása
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return `${date.toLocaleDateString('hu-HU')} ${date.toLocaleTimeString('hu-HU')}`;
};

// Rendelés típus formázása
const formatOrderType = (type) => {
  if (!type) return 'Helyi fogyasztás';
  
  switch(type) {
    case 'dine_in':
    case 'local':
      return 'Helyi fogyasztás';
    case 'takeaway':
      return 'Elvitel';
    case 'delivery':
      return 'Házhozszállítás';
    default:
      return 'Helyi fogyasztás';
  }
};

// Rendelés állapot formázása
const formatOrderStatus = (status) => {
  if (!status) return 'Új';
  
  switch(status) {
    case 'new':
      return 'Új';
    case 'in-progress':
      return 'Folyamatban';
    case 'ready':
      return 'Elkészült';
    case 'active':
      return 'Aktív';
    default:
      return status === 'active' ? 'Aktív' : status;
  }
};

// Komponens betöltésekor adatok lekérése és időzítő beállítása
onMounted(() => {
  loadData();
  
  // Automatikus frissítés beállítása (30 másodpercenként)
  refreshTimer = setInterval(() => {
    loadData();
  }, 30000);
});

// Komponens eltávolításakor időzítő törlése
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<template>
  <div class="kitchen-view">
    <h1>Konyhai rendelések</h1>
    
    <div v-if="isLoading" class="loading-indicator">
      Adatok betöltése...
    </div>
    
    <div v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
      <button @click="loadData" class="retry-btn">Újrapróbálkozás</button>
    </div>
    
    <div v-else class="kitchen-container">
      <div class="refresh-button-container">
        <div class="filter-buttons">
          <button 
            @click="showAllOrders" 
            class="filter-btn"
            :class="{ active: showActiveOrders && showReadyOrders }"
          >
            Összes
          </button>
          <button 
            @click="showOnlyActiveOrders" 
            class="filter-btn"
            :class="{ active: showActiveOrders && !showReadyOrders }"
          >
            Aktív rendelések
          </button>
          <button 
            @click="showOnlyReadyOrders" 
            class="filter-btn"
            :class="{ active: !showActiveOrders && showReadyOrders }"
          >
            Elkészült rendelések
          </button>
        </div>
        <button @click="loadData" class="refresh-button">
          <span class="refresh-icon">🔄</span>
          Frissítés
        </button>
      </div>
      
      <div v-if="activeOrders.length === 0" class="no-orders">
        Nincsenek aktív rendelések.
      </div>
      
      <div v-else class="orders-grid">
        <div 
          v-for="order in filteredOrders" 
          :key="order._id"
          class="order-card"
          :class="{
            'order-new': order.status === 'new',
            'order-in-progress': order.status === 'in-progress',
            'order-ready': order.status === 'ready'
          }"
        >
          <div v-if="order.status === 'ready'" class="ready-overlay">
            <span class="ready-text">ELKÉSZÜLT</span>
          </div>
          <div class="order-header">
            <div class="order-table">
              <template v-if="order.type === 'takeaway'">
                Elvitel
              </template>
              <template v-else-if="order.type === 'delivery'">
                Házhozszállítás
              </template>
              <template v-else>
                {{ order.tableName || 'Ismeretlen asztal' }}
                <span class="table-seats" v-if="order.tableSeats">({{ order.tableSeats }} fő)</span>
              </template>
            </div>
            <div class="order-time">{{ formatDate(order.createdAt) }}</div>
          </div>
          
          <div class="order-info">
            <div class="order-type">
              <span class="order-type-badge" :class="order.type || 'local'">
                {{ formatOrderType(order.type) }}
              </span>
            </div>
            
            <div class="order-status">
              <span class="order-status-badge" :class="order.status || 'new'">
                {{ formatOrderStatus(order.status) }}
              </span>
            </div>
          </div>
          
          <div class="order-items">
            <div v-for="(item, index) in order.items" :key="index" class="order-item">
              <div class="item-details">
                <span class="item-quantity">{{ item.quantity }}x</span>
                <span class="item-name">{{ item.name }}</span>
                <span v-if="item.notes" class="item-notes">{{ item.notes }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="order.notes" class="order-notes">
            <strong>Megjegyzés:</strong> {{ order.notes }}
          </div>
          
          <div class="order-actions">
            <!-- Állapot jelző és gombok -->
            <div class="status-indicator">
              <span class="status-text">Állapot: {{ formatOrderStatus(order.status) }}</span>
            </div>
            
            <div class="action-buttons">
              <!-- Elkészült gomb - minden rendelésnél látható, kivéve ha már kész -->
              <button 
                v-if="order.status !== 'ready'" 
                @click="markOrderAsReady(order)" 
                class="ready-btn main-action"
              >
                <span class="action-icon">✅</span> Elkészült az étel
              </button>
              
              <!-- Elkezdve gomb - csak új rendeléseknél -->
              <button 
                v-if="order.status === 'new'" 
                @click="markOrderAsInProgress(order)" 
                class="in-progress-btn"
              >
                <span class="action-icon">🔄</span> Elkezdtem főzni
              </button>
              
              <!-- Visszaállítás gomb - kész rendeléseknél -->
              <button 
                v-if="order.status === 'ready'" 
                @click="markOrderAsInProgress(order)" 
                class="revert-btn"
              >
                <span class="action-icon">↩️</span> Mégsem készült el
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kitchen-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

.kitchen-view h1 {
  color: var(--primary-color);
}

.loading-indicator {
  text-align: center;
  padding: 2rem;
  font-style: italic;
  color: #666;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.retry-btn {
  background-color: #c62828;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.retry-btn:hover {
  background-color: #b71c1c;
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.kitchen-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.refresh-button-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  background-color: #f0f0f0;
  color: #555;
}

.filter-btn:hover {
  background-color: #e0e0e0;
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-btn.active {
  background-color: var(--primary-color);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.1rem;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.refresh-button:hover {
  background-color: var(--secondary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
}

.refresh-icon {
  font-size: 1.3rem;
}

.no-orders {
  text-align: center;
  padding: 3rem;
  font-style: italic;
  color: #666;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  font-size: 1.2rem;
}

.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.order-card {
  background-color: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-left: 8px solid #ccc;
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
  overflow: hidden;
}

.order-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.order-new {
  border-left-color: #f44336;
}

.order-in-progress {
  border-left-color: #ff9800;
}

.order-ready {
  border-left-color: #4caf50;
  opacity: 0.85;
  background-color: #f9f9f9;
}

.order-ready .order-table,
.order-ready .item-name,
.order-ready .item-quantity {
  color: #777;
}

.order-ready .order-items {
  background-color: #f0f0f0;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #eee;
  padding-bottom: 1rem;
}

.order-table {
  font-weight: bold;
  font-size: 1.4rem;
  color: var(--primary-color);
}

.table-seats {
  font-size: 1rem;
  font-weight: normal;
  color: #666;
}

.order-time {
  font-size: 0.95rem;
  color: #666;
  background-color: #f5f5f5;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
}

.order-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.order-type-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-size: 0.95rem;
  font-weight: bold;
  color: white;
}

.order-type-badge.dine_in,
.order-type-badge.local {
  background-color: #4CAF50;
}

.order-type-badge.takeaway {
  background-color: #FF9800;
}

.order-type-badge.delivery {
  background-color: #2196F3;
}

.order-status-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-size: 0.95rem;
  font-weight: bold;
  color: white;
}

.order-status-badge.new {
  background-color: #f44336;
}

.order-status-badge.in-progress {
  background-color: #ff9800;
}

.order-status-badge.ready {
  background-color: #4caf50;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.order-item {
  display: flex;
  align-items: flex-start;
  padding: 0.5rem;
  border-bottom: 1px dashed #eee;
}

.order-item:last-child {
  border-bottom: none;
}

.item-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
}

.item-quantity {
  font-weight: bold;
  color: var(--primary-color);
  min-width: 2.5rem;
  font-size: 1.1rem;
}

.item-name {
  flex: 1;
  font-weight: 500;
  font-size: 1.1rem;
}

.item-notes {
  width: 100%;
  font-size: 0.9rem;
  color: #666;
  font-style: italic;
  margin-left: 2.5rem;
  background-color: #f0f0f0;
  padding: 0.4rem;
  border-radius: 4px;
}

.order-notes {
  font-size: 1rem;
  color: #555;
  background-color: #fff3e0;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
  margin-top: 0.5rem;
}

.order-notes strong {
  color: #e65100;
  display: block;
  margin-bottom: 0.5rem;
}

.order-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

.status-indicator {
  display: flex;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.status-text {
  font-weight: bold;
  font-size: 1.1rem;
  color: #555;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}

.in-progress-btn, .ready-btn, .revert-btn {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 140px;
  font-size: 1rem;
}

.main-action {
  width: 100%;
  padding: 1.2rem;
  font-size: 1.3rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  background-color: #4caf50;
  color: white;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
}

.main-action:hover {
  background-color: #388e3c;
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
}

.main-action .action-icon {
  font-size: 1.5rem;
}

.in-progress-btn {
  background-color: #ff9800;
  color: white;
}

.in-progress-btn:hover {
  background-color: #f57c00;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.ready-btn {
  background-color: #4caf50;
  color: white;
}

.ready-btn:hover {
  background-color: #388e3c;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.revert-btn {
  background-color: #9e9e9e;
  color: white;
}

.revert-btn:hover {
  background-color: #757575;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.action-icon {
  margin-right: 0.5rem;
  font-size: 1.2rem;
}

.ready-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  pointer-events: none;
}

.ready-text {
  font-size: 2.5rem;
  font-weight: bold;
  color: rgba(76, 175, 80, 0.3);
  transform: rotate(-30deg);
  text-transform: uppercase;
  letter-spacing: 5px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
  background-color: rgba(255, 255, 255, 0.7);
  padding: 0.5rem 2rem;
  border: 3px solid rgba(76, 175, 80, 0.3);
  border-radius: 8px;
}

@media (max-width: 768px) {
  .orders-grid {
    grid-template-columns: 1fr;
  }
}
</style> 