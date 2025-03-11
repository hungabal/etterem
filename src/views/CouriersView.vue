<script setup>
// Futárok kezelése nézet
// Ez a komponens felelős a futárok kezeléséért és nyilvántartásáért
// Itt lehet új futárokat felvenni, meglévőket módosítani és törölni

// Szükséges Vue komponensek és szolgáltatások importálása
import { ref, onMounted, computed } from 'vue';
import { courierService, initializeDatabase, orderService } from '../services/db.js';

// Betöltés állapota
// isLoading: Jelzi, hogy folyamatban van-e adatok betöltése
// errorMessage: Hiba esetén megjelenő üzenet
const isLoading = ref(true);
const errorMessage = ref('');

// Futárok adatai
// couriers: Az összes futár listája
const couriers = ref([]);

// Futárokhoz rendelt rendelések
// courierOrders: A futárokhoz rendelt rendelések térképe (futár ID -> rendelések listája)
const courierOrders = ref({});

// Új/szerkesztett futár adatai
// editedCourier: Az éppen szerkesztett futár adatai
// isEditing: Jelzi, hogy szerkesztés vagy új futár felvétele van-e folyamatban
// showForm: Jelzi, hogy látható-e a futár űrlap
const editedCourier = ref({
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  status: 'available' // available, busy, offline
});
const isEditing = ref(false);
const showForm = ref(false);

// Keresési szöveg
// searchQuery: Futárok kereséséhez használt szöveg
const searchQuery = ref('');

// Szűrt futárok
// A keresési szöveg alapján szűrt futárok listája
const filteredCouriers = computed(() => {
  if (!couriers.value || couriers.value.length === 0) {
    return [];
  }
  
  if (!searchQuery.value) {
    return couriers.value;
  }
  
  const searchText = searchQuery.value.toLowerCase().trim();
  return couriers.value.filter(courier => 
    courier.name.toLowerCase().includes(searchText) || 
    courier.phone.toLowerCase().includes(searchText) ||
    (courier.email && courier.email.toLowerCase().includes(searchText)) ||
    (courier.address && courier.address.toLowerCase().includes(searchText))
  );
});

// Rendelés részletek
// selectedOrder: A kiválasztott rendelés részleteinek megjelenítéséhez
// showOrderModal: Jelzi, hogy látható-e a rendelés részletek modal
const selectedOrder = ref(null);
const showOrderModal = ref(false);

// Adatok betöltése
const loadData = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    
    // Adatbázis inicializálása
    await initializeDatabase();
    
    // Futárok betöltése
    couriers.value = await courierService.getAllCouriers();
    
    // Futárokhoz rendelt rendelések betöltése
    await loadCourierOrders();
    
    isLoading.value = false;
  } catch (error) {
    console.error('Hiba az adatok betöltésekor:', error);
    errorMessage.value = 'Hiba történt az adatok betöltésekor. Kérjük, próbálja újra!';
    isLoading.value = false;
  }
};

// Futárokhoz rendelt rendelések betöltése
const loadCourierOrders = async () => {
  try {
    // Üres térkép inicializálása
    courierOrders.value = {};
    
    // Minden futárhoz lekérjük a rendeléseket
    for (const courier of couriers.value) {
      const orders = await orderService.getOrdersByCourier(courier._id);
      if (orders && orders.length > 0) {
        courierOrders.value[courier._id] = orders;
      }
    }
  } catch (error) {
    console.error('Hiba a futárokhoz rendelt rendelések betöltésekor:', error);
  }
};

// Futár szerkesztése
const editCourier = (courier) => {
  editedCourier.value = { ...courier };
  isEditing.value = true;
  showForm.value = true;
};

// Új futár felvétele
const addNewCourier = () => {
  editedCourier.value = {
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    status: 'available'
  };
  isEditing.value = false;
  showForm.value = true;
};

// Futár mentése
const saveCourier = async () => {
  try {
    // Ellenőrizzük, hogy a kötelező mezők ki vannak-e töltve
    if (!editedCourier.value.name || !editedCourier.value.phone) {
      alert('A név és telefonszám mezők kitöltése kötelező!');
      return;
    }
    
    // Futár mentése
    await courierService.saveCourier(editedCourier.value);
    
    // Űrlap elrejtése
    showForm.value = false;
    
    // Adatok újratöltése
    await loadData();
    
    // Sikeres mentés üzenet
    alert(isEditing.value ? 'Futár sikeresen frissítve!' : 'Új futár sikeresen hozzáadva!');
  } catch (error) {
    console.error('Hiba a futár mentésekor:', error);
    alert('Hiba történt a futár mentésekor: ' + error.message);
  }
};

// Futár törlése
const deleteCourier = async (courier) => {
  try {
    // Megerősítés kérése
    if (!confirm(`Biztosan törölni szeretné a(z) ${courier.name} nevű futárt?`)) {
      return;
    }
    
    // Futár törlése
    await courierService.deleteCourier(courier._id, courier._rev);
    
    // Adatok újratöltése
    await loadData();
    
    // Sikeres törlés üzenet
    alert('Futár sikeresen törölve!');
  } catch (error) {
    console.error('Hiba a futár törlésekor:', error);
    alert('Hiba történt a futár törlésekor: ' + error.message);
  }
};

// Futár státuszának frissítése
const updateCourierStatus = async (courier, status) => {
  try {
    // Státusz frissítése
    await courierService.updateCourierStatus(courier._id, status);
    
    // Ha a futár nem elérhető, akkor a hozzá rendelt rendelésekből eltávolítjuk
    if (status === 'offline' && courierOrders.value[courier._id] && courierOrders.value[courier._id].length > 0) {
      if (confirm(`A futár nem elérhető státuszba került. Eltávolítja a hozzá rendelt rendelésekből?`)) {
        for (const order of courierOrders.value[courier._id]) {
          order.courierId = null;
          order.courierName = null;
          await orderService.saveOrder(order);
        }
      }
    }
    
    // Adatok újratöltése
    await loadData();
  } catch (error) {
    console.error('Hiba a futár státuszának frissítésekor:', error);
    alert('Hiba történt a futár státuszának frissítésekor: ' + error.message);
  }
};

// Rendelés részletek megjelenítése
const showOrderDetails = (order) => {
  selectedOrder.value = order;
  showOrderModal.value = true;
};

// Rendelés modal bezárása
const closeOrderModal = () => {
  showOrderModal.value = false;
  selectedOrder.value = null;
};

// Komponens betöltésekor adatok betöltése
onMounted(loadData);
</script>

<template>
  <div class="couriers-view">
    <h1>Futárok kezelése</h1>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
      <button @click="loadData" class="retry-btn">Újrapróbálkozás</button>
    </div>
    
    <div v-if="isLoading" class="loading">
      Adatok betöltése...
    </div>
    
    <div v-else class="couriers-container">
      <!-- Keresés és új futár gomb -->
      <div class="couriers-header">
        <div class="search-container">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Keresés név, telefon, email vagy cím alapján..." 
            class="search-input"
          >
          <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search-btn">✕</button>
        </div>
        
        <button @click="addNewCourier" class="add-courier-btn">
          <span class="btn-icon">+</span> Új futár
        </button>
      </div>
      
      <!-- Futárok listája -->
      <div class="couriers-list">
        <div v-if="filteredCouriers.length === 0" class="no-couriers">
          <p>Nincsenek futárok a rendszerben vagy a keresési feltételeknek megfelelő találat.</p>
        </div>
        
        <div v-else class="courier-cards">
          <div v-for="courier in filteredCouriers" :key="courier._id" class="courier-card">
            <div class="courier-header">
              <h3>{{ courier.name }}</h3>
              <div class="courier-status" :class="courier.status">
                {{ courier.status === 'available' ? 'Elérhető' : 
                   courier.status === 'busy' ? 'Foglalt' : 'Nem elérhető' }}
              </div>
            </div>
            
            <div class="courier-details">
              <p><strong>Telefon:</strong> {{ courier.phone }}</p>
              <p v-if="courier.email"><strong>Email:</strong> {{ courier.email }}</p>
              <p v-if="courier.address"><strong>Cím:</strong> {{ courier.address }}</p>
              <p v-if="courier.notes"><strong>Megjegyzés:</strong> {{ courier.notes }}</p>
            </div>
            
            <!-- Futárhoz rendelt rendelések -->
            <div v-if="courierOrders[courier._id] && courierOrders[courier._id].length > 0" class="courier-orders">
              <h4>Kiosztott rendelések</h4>
              <div class="order-list">
                <div v-for="order in courierOrders[courier._id]" :key="order._id" class="order-item" @click="showOrderDetails(order)">
                  <div class="order-header">
                    <span class="order-id">#{{ order._id.substring(order._id.length - 6) }}</span>
                    <span class="order-date">{{ new Date(order.createdAt).toLocaleString('hu-HU') }}</span>
                  </div>
                  <div class="order-customer">
                    <p v-if="order.customerName"><strong>Név:</strong> {{ order.customerName }}</p>
                    <p v-if="order.address"><strong>Cím:</strong> {{ order.address }}</p>
                    <p v-if="order.phone"><strong>Telefon:</strong> {{ order.phone }}</p>
                  </div>
                  <div class="order-items-summary">
                    <p><strong>Tételek:</strong> {{ order.items ? order.items.length : 0 }} db</p>
                    <p><strong>Összesen:</strong> {{ order.items ? order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0 }} Ft</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="courier-actions">
              <div class="status-actions">
                <button 
                  @click="updateCourierStatus(courier, 'available')" 
                  :class="['status-btn', 'available', { active: courier.status === 'available' }]"
                  title="Elérhető"
                >
                  Elérhető
                </button>
                <button 
                  @click="updateCourierStatus(courier, 'busy')" 
                  :class="['status-btn', 'busy', { active: courier.status === 'busy' }]"
                  title="Foglalt"
                >
                  Foglalt
                </button>
                <button 
                  @click="updateCourierStatus(courier, 'offline')" 
                  :class="['status-btn', 'offline', { active: courier.status === 'offline' }]"
                  title="Nem elérhető"
                >
                  Nem elérhető
                </button>
              </div>
              
              <div class="edit-actions">
                <button @click="editCourier(courier)" class="edit-btn">Szerkesztés</button>
                <button @click="deleteCourier(courier)" class="delete-btn">Törlés</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Futár űrlap -->
      <div v-if="showForm" class="courier-form-overlay">
        <div class="courier-form">
          <h2>{{ isEditing ? 'Futár szerkesztése' : 'Új futár felvétele' }}</h2>
          
          <div class="form-group">
            <label for="courier-name">Név: <span class="required">*</span></label>
            <input 
              type="text" 
              id="courier-name" 
              v-model="editedCourier.name"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="courier-phone">Telefon: <span class="required">*</span></label>
            <input 
              type="text" 
              id="courier-phone" 
              v-model="editedCourier.phone"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="courier-email">Email:</label>
            <input 
              type="email" 
              id="courier-email" 
              v-model="editedCourier.email"
            >
          </div>
          
          <div class="form-group">
            <label for="courier-address">Cím:</label>
            <input 
              type="text" 
              id="courier-address" 
              v-model="editedCourier.address"
            >
          </div>
          
          <div class="form-group">
            <label for="courier-notes">Megjegyzés:</label>
            <textarea 
              id="courier-notes" 
              v-model="editedCourier.notes"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="courier-status">Státusz:</label>
            <select id="courier-status" v-model="editedCourier.status">
              <option value="available">Elérhető</option>
              <option value="busy">Foglalt</option>
              <option value="offline">Nem elérhető</option>
            </select>
          </div>
          
          <div class="form-actions">
            <button @click="showForm = false" class="cancel-btn">Mégsem</button>
            <button @click="saveCourier" class="save-btn">Mentés</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Rendelés részletek modal -->
  <div v-if="showOrderModal && selectedOrder" class="order-modal-overlay">
    <div class="order-modal">
      <div class="order-modal-header">
        <h2>Rendelés részletei</h2>
        <button @click="closeOrderModal" class="close-modal-btn">✕</button>
      </div>
      
      <div class="order-modal-content">
        <div class="order-info">
          <p><strong>Azonosító:</strong> {{ selectedOrder._id }}</p>
          <p><strong>Dátum:</strong> {{ new Date(selectedOrder.createdAt).toLocaleString('hu-HU') }}</p>
          <p><strong>Státusz:</strong> {{ selectedOrder.status }}</p>
        </div>
        
        <div class="customer-info">
          <h3>Megrendelő adatai</h3>
          <p v-if="selectedOrder.customerName"><strong>Név:</strong> {{ selectedOrder.customerName }}</p>
          <p v-if="selectedOrder.address"><strong>Cím:</strong> {{ selectedOrder.address }}</p>
          <p v-if="selectedOrder.phone"><strong>Telefon:</strong> {{ selectedOrder.phone }}</p>
          <p v-if="selectedOrder.email"><strong>Email:</strong> {{ selectedOrder.email }}</p>
          <p v-if="selectedOrder.notes"><strong>Megjegyzés:</strong> {{ selectedOrder.notes }}</p>
        </div>
        
        <div class="order-items-details">
          <h3>Rendelt tételek</h3>
          <div class="items-list">
            <div v-for="(item, index) in selectedOrder.items" :key="index" class="item-row">
              <div class="item-info">
                <span class="item-quantity">{{ item.quantity }}x</span>
                <span class="item-name">{{ item.name }}</span>
                <span v-if="item.size" class="item-size">({{ item.size }})</span>
              </div>
              <div class="item-price">{{ item.price * item.quantity }} Ft</div>
            </div>
          </div>
          
          <div class="order-total">
            <strong>Összesen:</strong> {{ selectedOrder.items ? selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0 }} Ft
          </div>
        </div>
      </div>
      
      <div class="order-modal-actions">
        <button @click="closeOrderModal" class="close-btn">Bezárás</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.couriers-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  max-width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
}

.couriers-view h1 {
  color: var(--primary-color);
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.retry-btn {
  background-color: #c62828;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.loading {
  text-align: center;
  margin: 2rem 0;
  font-style: italic;
  color: #666;
}

.couriers-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Keresés és új futár gomb */
.couriers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.search-container {
  position: relative;
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(74, 109, 167, 0.2);
}

.clear-search-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1rem;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.clear-search-btn:hover {
  background-color: #eee;
}

.add-courier-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.3s;
}

.add-courier-btn:hover {
  background-color: var(--secondary-color);
}

.btn-icon {
  font-size: 1.2rem;
  font-weight: bold;
}

/* Futárok listája */
.couriers-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.no-couriers {
  text-align: center;
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  color: #666;
  font-style: italic;
}

.courier-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.courier-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.courier-header {
  padding: 1rem;
  background-color: #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.courier-header h3 {
  margin: 0;
  color: var(--primary-color);
}

.courier-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.courier-status.available {
  background-color: #c8e6c9;
  color: #2e7d32;
}

.courier-status.busy {
  background-color: #ffecb3;
  color: #f57f17;
}

.courier-status.offline {
  background-color: #ffcdd2;
  color: #c62828;
}

.courier-details {
  padding: 1rem;
  flex: 1;
}

.courier-details p {
  margin: 0.5rem 0;
}

.courier-orders {
  padding: 1rem;
  border-top: 1px solid #eee;
  margin-top: 0.5rem;
}

.courier-orders h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: var(--primary-color);
  font-size: 1rem;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.order-item {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: background-color 0.2s, transform 0.2s;
}

.order-item:hover {
  background-color: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

.order-id {
  font-weight: bold;
  color: var(--primary-color);
}

.order-date {
  font-size: 0.8rem;
  color: #666;
}

.order-customer {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.order-customer p {
  margin: 0;
  font-size: 0.9rem;
}

.order-items-summary {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #eee;
  padding-top: 0.5rem;
  font-size: 0.9rem;
}

.order-items-summary p {
  margin: 0;
}

.courier-actions {
  padding: 1rem;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  font-size: 0.8rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.status-btn.active {
  opacity: 1;
  font-weight: bold;
}

.status-btn.available {
  background-color: #c8e6c9;
  color: #2e7d32;
}

.status-btn.busy {
  background-color: #ffecb3;
  color: #f57f17;
}

.status-btn.offline {
  background-color: #ffcdd2;
  color: #c62828;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-btn, .delete-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.edit-btn {
  background-color: #e3f2fd;
  color: #1565c0;
}

.edit-btn:hover {
  background-color: #bbdefb;
}

.delete-btn {
  background-color: #ffebee;
  color: #c62828;
}

.delete-btn:hover {
  background-color: #ffcdd2;
}

/* Futár űrlap */
.courier-form-overlay {
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

.courier-form {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.courier-form h2 {
  margin-top: 0;
  color: var(--primary-color);
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.required {
  color: #c62828;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(74, 109, 167, 0.2);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-btn, .save-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #333;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}

.save-btn {
  background-color: var(--primary-color);
  color: white;
}

.save-btn:hover {
  background-color: var(--secondary-color);
}

/* Rendelés részletek modal */
.order-modal-overlay {
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

.order-modal {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.order-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.order-modal-header h2 {
  margin: 0;
  color: var(--primary-color);
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
}

.order-modal-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.order-info p {
  margin: 0;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.customer-info h3 {
  margin: 0;
  color: var(--primary-color);
}

.customer-info p {
  margin: 0;
}

.order-items-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-info {
  display: flex;
  gap: 0.5rem;
}

.item-quantity {
  font-weight: bold;
  color: var(--primary-color);
}

.item-name {
  color: var(--primary-color);
}

.item-size {
  font-size: 0.8rem;
  color: #666;
}

.item-price {
  font-weight: bold;
  color: var(--primary-color);
}

.order-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #eee;
  padding-top: 0.5rem;
}

.order-total strong {
  font-weight: bold;
  color: var(--primary-color);
}

.order-modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.close-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.close-btn:hover {
  background-color: #f0f0f0;
}
</style> 