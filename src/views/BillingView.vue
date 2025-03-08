<script setup>
// Számlázás nézet
// Ez a komponens felelős a számlák és nyugták kezeléséért
// Itt lehet rendelésekből számlákat készíteni, nyugtákat nyomtatni és a korábbi számlákat megtekinteni

// Szükséges Vue komponensek és szolgáltatások importálása
import { ref, reactive, computed, onMounted } from 'vue';
import { orderService, tableService, invoiceService, initializeDatabase, settingsService } from '../services/db.js';

// Betöltés állapota
// isLoading: Jelzi, hogy folyamatban van-e adatok betöltése
// errorMessage: Hiba esetén megjelenő üzenet
const isLoading = ref(true);
const errorMessage = ref('');

// Aktív rendelések adatai
// Az összes aktív (még nem kifizetett) rendelés listája
const activeOrders = ref([]);

// Korábbi számlák
// A rendszerben tárolt korábbi számlák listája
const invoices = ref([]);

// Kiválasztott rendelés
// A számlázáshoz kiválasztott rendelés
const selectedOrder = ref(null);

// Étterem beállításai
// Az étterem adatai, amelyek megjelennek a számlán
const settings = ref({
  restaurantName: '',
  address: '',
  taxNumber: '',
  phone: '',
  email: ''
});

// Új számla adatai
// Az új számla létrehozásához használt űrlap adatai
const newInvoice = reactive({
  customerName: '',
  customerTaxNumber: '',
  paymentMethod: 'cash',
  notes: ''
});

// Adatok betöltése
// Ez a függvény betölti az összes szükséges adatot az alkalmazás indításakor
const loadData = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';

    // Adatbázis inicializálása
    await initializeDatabase();

    // Étterem beállításainak betöltése
    // Az étterem adatainak lekérése a számlákhoz
    const settingsData = await settingsService.getSettings();
    settings.value = settingsData;

    // Aktív rendelések betöltése
    // Az összes aktív rendelés lekérése
    const orders = await orderService.getActiveOrders();
    
    // Asztalok lekérése a férőhelyek hozzáadásához
    // Az asztalok adatainak lekérése, hogy a rendelésekhez hozzáadhassuk az asztal nevét és férőhelyeit
    const tables = await tableService.getAllTables();
    
    // Rendelésekhez hozzáadjuk az asztalok adatait
    // Minden rendeléshez hozzáadjuk a hozzá tartozó asztal nevét és férőhelyeit
    orders.forEach(order => {
      if (order.tableId) {
        const table = tables.find(t => t._id === order.tableId);
        if (table) {
          order.tableName = table.name;
          order.tableSeats = table.seats || table.capacity || 0;
        }
      }
    });
    
    activeOrders.value = orders;

    // Korábbi számlák betöltése
    // A rendszerben tárolt korábbi számlák lekérése
    const invoicesList = await invoiceService.getInvoices();
    invoices.value = invoicesList;

    isLoading.value = false;
  } catch (error) {
    console.error('Hiba az adatok betöltésekor:', error);
    errorMessage.value = 'Hiba az adatok betöltésekor: ' + error.message;
    isLoading.value = false;
  }
};

// Komponens betöltésekor adatok lekérése
// Ez a hook akkor fut le, amikor a komponens bekerül a DOM-ba
onMounted(() => {
  loadData();
});

// Rendelés kiválasztása
// Ez a függvény állítja be a kiválasztott rendelést és alaphelyzetbe állítja a számla űrlapot
const selectOrder = (order) => {
  selectedOrder.value = order;
  
  // Számla adatok alaphelyzetbe állítása
  newInvoice.customerName = '';
  newInvoice.customerTaxNumber = '';
  newInvoice.paymentMethod = 'cash';
  newInvoice.notes = '';
};

// Rendelés végösszege
// Ez a számított tulajdonság kiszámolja a kiválasztott rendelés végösszegét
const orderTotal = computed(() => {
  if (!selectedOrder.value) return 0;
  
  return selectedOrder.value.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
});

// Számla létrehozása
const createInvoice = async () => {
  if (!selectedOrder.value) {
    alert('Először válasszon rendelést!');
    return;
  }
  
  // Validáció
  if (!newInvoice.customerName) {
    alert('Kérjük, adja meg a vevő nevét!');
    return;
  }
  
  try {
    // Új számla létrehozása
    const invoice = {
      tableId: selectedOrder.value.tableId,
      tableName: selectedOrder.value.tableName,
      items: selectedOrder.value.items ? [...selectedOrder.value.items] : [],
      total: orderTotal.value,
      paymentMethod: newInvoice.paymentMethod,
      customerName: newInvoice.customerName,
      customerTaxNumber: newInvoice.customerTaxNumber,
      notes: newInvoice.notes,
      orderType: selectedOrder.value.orderType || 'dine_in',
      createdAt: new Date().toISOString()
    };
    
    // Számla mentése
    const savedInvoice = await invoiceService.saveInvoice(invoice);
    
    // Rendelés törlése
    await orderService.deleteOrder(selectedOrder.value._id);
    
    // Adatok újratöltése
    await loadData();
    
    // Megkeressük a mentett számlát az újratöltött számlák között
    const savedInvoiceWithDetails = invoices.value.find(inv => inv._id === savedInvoice._id);
    
    if (savedInvoiceWithDetails) {
      // Számla nyomtatása a teljes adatokkal
      printInvoice(savedInvoiceWithDetails);
    }
    
    // Kiválasztott rendelés törlése
    selectedOrder.value = null;
    
    alert('Számla sikeresen létrehozva!');
  } catch (error) {
    console.error('Hiba a számla létrehozásakor:', error);
    alert('Hiba a számla létrehozásakor: ' + error.message);
  }
};

// Számla nyomtatása
const printInvoice = (invoice) => {
  const printWindow = window.open('', '_blank');
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Számla - ${invoice._id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .invoice-header { text-align: center; margin-bottom: 30px; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .invoice-details div { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; }
          .total { font-weight: bold; text-align: right; margin-top: 20px; font-size: 1.2em; }
          .footer { margin-top: 50px; font-size: 0.9em; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1>Számla</h1>
          <h2>${invoice._id}</h2>
          <p>Dátum: ${new Date(invoice.createdAt).toLocaleDateString('hu-HU')} ${new Date(invoice.createdAt).toLocaleTimeString('hu-HU')}</p>
        </div>
        
        <div class="invoice-details">
          <div>
            <h3>Eladó:</h3>
            <p>${settings.value.restaurantName || 'NÉV'}</p>
            <p>${settings.value.address || 'CÍM'}</p>
            <p>Adószám: ${settings.value.taxNumber || 'ADÓSZÁM'}</p>
            ${settings.value.phone ? `<p>Telefon: ${settings.value.phone}</p>` : ''}
            ${settings.value.email ? `<p>Email: ${settings.value.email}</p>` : ''}
          </div>
          
          <div>
            <h3>Vevő:</h3>
            <p>${invoice.customerName}</p>
            ${invoice.customerTaxNumber ? `<p>Adószám: ${invoice.customerTaxNumber}</p>` : ''}
          </div>
        </div>
        
        <table>
          <tr>
            <th>Tétel</th>
            <th>Mennyiség</th>
            <th>Egységár</th>
            <th>Összesen</th>
          </tr>
          ${invoice.items && Array.isArray(invoice.items) ? invoice.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>${item.price} Ft</td>
              <td>${item.price * item.quantity} Ft</td>
            </tr>
          `).join('') : ''}
        </table>
        
        <div class="total">Végösszeg: ${invoice.total} Ft</div>
        
        <div class="payment-info">
          <p>Fizetési mód: ${invoice.paymentMethod === 'cash' ? 'Készpénz' : 'Bankkártya'}</p>
          ${invoice.orderType ? `<p>Rendelés típusa: ${formatOrderType(invoice.orderType)}</p>` : ''}
          ${invoice.notes ? `<p>Megjegyzés: ${invoice.notes}</p>` : ''}
        </div>
        
        <div class="footer">
          <p>Köszönjük, hogy nálunk vásárolt!</p>
        </div>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
};

// Korábbi számla nyomtatása
const reprintInvoice = (invoice) => {
  // Biztosítjuk, hogy az invoice objektum tartalmazza az items tömböt
  const invoiceForPrinting = {
    ...invoice,
    items: invoice.items || []
  };
  
  printInvoice(invoiceForPrinting);
};

// Számla törlése
const deleteInvoice = async (invoiceId) => {
  if (confirm('Biztosan törölni szeretné ezt a számlát? Ez a művelet nem visszavonható!')) {
    try {
      // Lekérjük a számla adatait a törlés előtt
      const invoiceToDelete = invoices.value.find(inv => inv._id === invoiceId);
      
      // Számla törlése
      await invoiceService.deleteInvoice(invoiceId);
      
      // Ha a számlához tartozott asztal, akkor felszabadítjuk
      if (invoiceToDelete && invoiceToDelete.tableId) {
        try {
          // Importáljuk a couchDBService-t
          import('../services/couchdb-service.js').then(async ({ default: couchDBService }) => {
            
            // Asztal státuszának frissítése szabadra közvetlenül a couchDBService-en keresztül
            const result = await couchDBService.updateTableStatus(invoiceToDelete.tableId, 'free');
            
            // Várunk egy kis időt, hogy a változások biztosan érvényesüljenek
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Frissítjük a számlák listáját
            await loadData();
          });
        } catch (tableError) {
          console.error('Hiba az asztal felszabadításakor:', tableError);
          // Nem szakítjuk meg a folyamatot, ha az asztal frissítése sikertelen
        }
      } else {
        // Ha nincs asztal, akkor csak frissítjük a számlák listáját
        await loadData();
      }
      
      alert('Számla sikeresen törölve!');
    } catch (error) {
      console.error('Hiba a számla törlésekor:', error);
      alert('Hiba a számla törlésekor: ' + error.message);
    }
  }
};

// Rendelés törlése
const deleteOrder = async (orderId) => {
  if (confirm('Biztosan törölni szeretné ezt a rendelést? Ez a művelet nem visszavonható!')) {
    try {
      await orderService.deleteOrder(orderId);
      // Frissítjük a rendelések listáját
      await loadData();
      alert('Rendelés sikeresen törölve!');
    } catch (error) {
      console.error('Hiba a rendelés törlésekor:', error);
      alert('Hiba a rendelés törlésekor: ' + error.message);
    }
  }
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
      return 'Helyi fogyasztás';
    case 'takeaway':
      return 'Elvitel';
    case 'delivery':
      return 'Házhozszállítás';
    default:
      return 'Helyi fogyasztás';
  }
};
</script>

<template>
  <div class="billing-view">
    <h1>Számlázás</h1>
    
    <div v-if="isLoading" class="loading-indicator">
      Adatok betöltése...
    </div>
    
    <div v-else-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <div v-else class="billing-container">
      <!-- Aktív rendelések -->
      <div class="active-orders-section">
        <h2>Aktív rendelések</h2>
        
        <div v-if="activeOrders.length === 0" class="no-orders">
          Nincsenek aktív rendelések.
        </div>
        
        <div v-else class="orders-list">
          <div 
            v-for="order in activeOrders" 
            :key="order._id"
            class="order-card"
            :class="{ 'order-selected': selectedOrder && selectedOrder._id === order._id }"
            @click="selectOrder(order)"
          >
            <div class="order-header">
              <div class="order-table">
                {{ order.tableName }}
                <span class="table-seats" v-if="order.tableSeats">({{ order.tableSeats }} fő)</span>
              </div>
              <div class="order-time">{{ formatDate(order.createdAt) }}</div>
            </div>
            
            <div class="order-type">
              <span class="order-type-badge" :class="order.orderType || 'dine_in'">
                {{ formatOrderType(order.orderType) }}
              </span>
            </div>
            
            <div class="order-items">
              <div v-for="(item, index) in order.items" :key="index" class="order-item">
                <div class="item-details">
                  <span class="item-name">{{ item.quantity }}x {{ item.name }}</span>
                  <span class="item-price">{{ item.price }} Ft</span>
                </div>
              </div>
            </div>
            
            <div class="order-total">
              Összesen: {{ order.items.reduce((total, item) => total + (item.price * item.quantity), 0) }} Ft
            </div>
            
            <div class="order-actions">
              <button class="delete-btn" @click.stop="deleteOrder(order._id)">Törlés</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Számla készítés -->
      <div class="invoice-creation-section">
        <h2>Számla készítése</h2>
        
        <div v-if="!selectedOrder" class="no-order-selected">
          Válasszon rendelést a számlázáshoz!
        </div>
        
        <div v-else class="invoice-form">
          <div class="selected-order-details">
            <h3>
              {{ selectedOrder.tableName }} rendelése
              <span class="table-seats" v-if="selectedOrder.tableSeats">({{ selectedOrder.tableSeats }} fő)</span>
            </h3>
            
            <div class="order-type">
              <span class="order-type-badge" :class="selectedOrder.orderType || 'dine_in'">
                {{ formatOrderType(selectedOrder.orderType) }}
              </span>
            </div>
            
            <div class="order-items-table">
              <table>
                <thead>
                  <tr>
                    <th>Tétel</th>
                    <th>Mennyiség</th>
                    <th>Egységár</th>
                    <th>Összesen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in selectedOrder.items" :key="index">
                    <td>{{ item.name }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ item.price }} Ft</td>
                    <td>{{ item.price * item.quantity }} Ft</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="total-label">Végösszeg:</td>
                    <td class="total-value">{{ orderTotal }} Ft</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div v-if="selectedOrder.notes" class="order-notes">
              <strong>Megjegyzés:</strong> {{ selectedOrder.notes }}
            </div>
          </div>
          
          <div class="invoice-details-form">
            <div class="form-group">
              <label for="customer-name">Vevő neve:</label>
              <input type="text" id="customer-name" v-model="newInvoice.customerName" placeholder="Vevő neve">
            </div>
            
            <div class="form-group">
              <label for="customer-tax-number">Adószám (opcionális):</label>
              <input type="text" id="customer-tax-number" v-model="newInvoice.customerTaxNumber" placeholder="12345678-1-42">
            </div>
            
            <div class="form-group">
              <label>Fizetési mód:</label>
              <div class="payment-methods">
                <div class="payment-method">
                  <input type="radio" id="payment-cash" value="cash" v-model="newInvoice.paymentMethod">
                  <label for="payment-cash">Készpénz</label>
                </div>
                <div class="payment-method">
                  <input type="radio" id="payment-card" value="card" v-model="newInvoice.paymentMethod">
                  <label for="payment-card">Bankkártya</label>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="invoice-notes">Megjegyzés:</label>
              <textarea id="invoice-notes" v-model="newInvoice.notes" rows="2"></textarea>
            </div>
            
            <div class="form-actions">
              <button class="primary-btn" @click="createInvoice">Számla készítése</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Korábbi számlák -->
      <div class="previous-invoices-section">
        <h2>Korábbi számlák</h2>
        
        <div v-if="invoices.length === 0" class="no-invoices">
          Nincsenek korábbi számlák.
        </div>
        
        <div v-else class="invoices-list">
          <div v-for="invoice in invoices" :key="invoice._id" class="invoice-card">
            <div class="invoice-header">
              <div class="invoice-id-container">
                <div class="invoice-id">{{ invoice._id }}</div>
                <div class="invoice-date">{{ formatDate(invoice.createdAt) }}</div>
              </div>
            </div>
            
            <div class="invoice-details">
              <div class="invoice-customer">{{ invoice.customerName }}</div>
              <div class="invoice-table">
                {{ invoice.tableName }}
                <span class="table-seats" v-if="invoice.tableSeats">({{ invoice.tableSeats }} fő)</span>
              </div>
              <div class="invoice-total">{{ invoice.total }} Ft</div>
              <div class="invoice-payment">{{ invoice.paymentMethod === 'cash' ? 'Készpénz' : 'Bankkártya' }}</div>
              <div class="invoice-order-type" v-if="invoice.orderType">
                <span class="order-type-badge" :class="invoice.orderType">
                  {{ formatOrderType(invoice.orderType) }}
                </span>
              </div>
            </div>
            
            <div class="invoice-actions">
              <button class="secondary-btn" @click="reprintInvoice(invoice)">Nyomtatás</button>
              <button class="delete-btn" @click="deleteInvoice(invoice._id)">Törlés</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.billing-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

.billing-view h1 {
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
}

.billing-container {
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  gap: 1.5rem;
}

/* Aktív rendelések szekció */
.active-orders-section {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.no-orders, .no-order-selected, .no-invoices {
  color: #666;
  font-style: italic;
  text-align: center;
  margin: 2rem 0;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
}

.order-card {
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.order-card:hover {
  background-color: #f0f0f0;
}

.order-selected {
  border-color: var(--primary-color);
  transform: scale(1.02);
}

.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.order-table {
  font-weight: bold;
}

.table-seats {
  font-size: 0.85rem;
  font-weight: normal;
  color: #666;
}

.order-time {
  font-size: 0.85rem;
  color: #666;
}

.order-type {
  margin: 0.5rem 0;
}

.order-type-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
  color: white;
}

.order-type-badge.dine_in {
  background-color: #4CAF50;
}

.order-type-badge.takeaway {
  background-color: #FF9800;
}

.order-type-badge.delivery {
  background-color: #2196F3;
}

.order-items {
  margin-bottom: 0.5rem;
}

.order-item {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.item-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-name {
  flex-grow: 1;
}

.item-price {
  font-weight: bold;
  color: var(--primary-color, #333);
  white-space: nowrap;
}

.order-total {
  font-weight: bold;
  text-align: right;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #eee;
}

.order-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #eee;
}

/* Számla készítés szekció */
.invoice-creation-section {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.invoice-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.selected-order-details {
  margin-bottom: 1rem;
}

.order-items-table {
  margin: 1rem 0;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.total-label {
  text-align: right;
  font-weight: bold;
}

.total-value {
  font-weight: bold;
}

.order-notes {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.5rem;
}

.invoice-details-form {
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

input, textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

textarea {
  resize: vertical;
}

.payment-methods {
  display: flex;
  gap: 1rem;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.payment-method input {
  width: auto;
}

.form-actions {
  margin-top: 1.5rem;
}

.primary-btn, .secondary-btn {
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

.secondary-btn {
  background-color: #f0f0f0;
  color: var(--text-color);
}

/* Korábbi számlák szekció */
.previous-invoices-section {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.invoices-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
}

.invoice-card {
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 1rem;
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.invoice-id-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.invoice-id {
  font-weight: bold;
}

.invoice-date {
  font-size: 0.85rem;
  color: #666;
}

.invoice-details {
  margin-bottom: 1rem;
}

.invoice-customer {
  font-weight: bold;
}

.invoice-table, .invoice-payment {
  font-size: 0.9rem;
  color: #666;
}

.invoice-total {
  font-weight: bold;
  margin: 0.5rem 0;
}

.invoice-payment, .invoice-order-type {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.invoice-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.delete-btn {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

/* Reszponzív design */
@media (max-width: 1024px) {
  .billing-container {
    grid-template-columns: 1fr 1fr;
  }
  
  .previous-invoices-section {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .billing-container {
    grid-template-columns: 1fr;
  }
  
  .previous-invoices-section {
    grid-column: span 1;
  }
}
</style> 