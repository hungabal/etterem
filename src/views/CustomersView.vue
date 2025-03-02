<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { orderService, customerService, initializeDatabase } from '../services/db.js';

// Betöltés állapota
const isLoading = ref(true);
const errorMessage = ref('');

// Korábbi rendelők adatai
const customers = ref([]);
const filteredCustomers = ref([]);

// Keresési és szűrési beállítások
const searchQuery = ref('');
const sortBy = ref('lastOrderDate'); // lastOrderDate, name, orderCount, totalSpent
const sortDirection = ref('desc'); // asc, desc
const showOnlyActive = ref(false);

// Szerkesztés és új ügyfél felvétele
const showEditModal = ref(false);
const editingCustomer = ref(null);
const originalCustomer = ref(null);
const isNewCustomer = ref(false);

// Törlés megerősítése
const showDeleteConfirm = ref(false);
const customerToDelete = ref(null);

// Statisztikák
const statistics = ref({
  totalCustomers: 0,
  activeCustomers: 0, // Legalább 2 rendelés
  totalOrders: 0,
  averageOrderValue: 0,
  topCustomers: []
});

// Adatok betöltése
const loadData = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';

    // Adatbázis inicializálása
    await initializeDatabase();

    // Ügyfelek lekérése az adatbázisból
    let customersList = [];
    try {
      const customersProxy = await customerService.getAllCustomers();
      
      // Konvertáljuk a Proxy objektumot egyszerű objektummá
      customersList = JSON.parse(JSON.stringify(customersProxy));
      
      // Biztosítjuk, hogy minden ügyfélnek megvannak a szükséges mezői
      customersList = customersList.map(customer => ({
        ...customer,
        name: customer.name || '',
        address: customer.address || '',
        phone: customer.phone || '',
        notes: customer.notes || '',
        orders: customer.orders || [],
        totalSpent: customer.totalSpent || 0,
        firstOrderDate: customer.firstOrderDate || '2000-01-01',
        lastOrderDate: customer.lastOrderDate || '2000-01-01'
      }));
    } catch (customerError) {
      console.error('Hiba az ügyfelek betöltésekor:', customerError);
      errorMessage.value = 'Hiba az ügyfelek betöltésekor: ' + customerError.message;
    }
    
    // Házhozszállítási rendelések lekérése
    let deliveryOrders = [];
    try {
      const ordersProxy = await orderService.getOrdersByType('delivery');
      
      // Konvertáljuk a Proxy objektumot egyszerű objektummá
      deliveryOrders = JSON.parse(JSON.stringify(ordersProxy));
      
      // Biztosítjuk, hogy minden rendelésnek megvannak a szükséges mezői
      deliveryOrders = deliveryOrders.map(order => ({
        ...order,
        items: order.items || [],
        name: order.name || '',
        address: order.address || '',
        phone: order.phone || '',
        notes: order.notes || ''
      }));
    } catch (orderError) {
      console.error('Hiba a rendelések betöltésekor:', orderError);
      errorMessage.value = errorMessage.value || 'Hiba a rendelések betöltésekor: ' + orderError.message;
    }
    
    // Ha nincsenek ügyfelek az adatbázisban, akkor létrehozzuk őket a rendelésekből
    if (customersList.length === 0 && deliveryOrders.length > 0) {
      try {
        await createCustomersFromOrders(deliveryOrders);
        const newCustomersProxy = await customerService.getAllCustomers();
        customersList = JSON.parse(JSON.stringify(newCustomersProxy));
      } catch (createError) {
        console.error('Hiba az ügyfelek létrehozásakor a rendelésekből:', createError);
        errorMessage.value = errorMessage.value || 'Hiba az ügyfelek létrehozásakor: ' + createError.message;
      }
    }
    
    // Rendelések hozzáadása az ügyfelekhez
    if (customersList.length > 0 && deliveryOrders.length > 0) {
      try {
        await addOrdersToCustomers(customersList, deliveryOrders);
      } catch (addOrdersError) {
        console.error('Hiba a rendelések hozzáadásakor az ügyfelekhez:', addOrdersError);
        errorMessage.value = errorMessage.value || 'Hiba a rendelések hozzáadásakor: ' + addOrdersError.message;
      }
    }
    
    // Statisztikák számítása
    try {
      calculateStatistics(customersList, deliveryOrders);
    } catch (statsError) {
      console.error('Hiba a statisztikák számításakor:', statsError);
      errorMessage.value = errorMessage.value || 'Hiba a statisztikák számításakor: ' + statsError.message;
    }
    
    // Ügyfelek rendezése
    customers.value = JSON.parse(JSON.stringify(customersList));
    
    // Alkalmazzuk a szűrést és rendezést
    applyFiltersAndSort();
    
    // Várunk egy tick-et, hogy a DOM frissüljön
    await nextTick();
    
    isLoading.value = false;
  } catch (error) {
    console.error('Hiba az adatok betöltésekor:', error);
    errorMessage.value = 'Hiba az adatok betöltésekor: ' + error.message;
    isLoading.value = false;
  }
};

// Ügyfelek létrehozása a rendelésekből
const createCustomersFromOrders = async (deliveryOrders) => {
  // Ügyfelek csoportosítása telefonszám alapján
  const customerMap = new Map();
  
  deliveryOrders.forEach(order => {
    if (!order.phone) return;
    
    const phone = order.phone;
    
    if (!customerMap.has(phone)) {
      customerMap.set(phone, {
        name: order.name || '',
        address: order.address || '',
        phone: phone,
        notes: order.notes || '',
        type: 'customer',
        firstOrderDate: order.createdAt,
        lastOrderDate: order.createdAt,
        orders: [],
        totalSpent: 0
      });
    } else {
      const customer = customerMap.get(phone);
      
      // Frissítjük a nevet és címet, ha az újabb rendelésben változott
      if (order.name) customer.name = order.name;
      if (order.address) customer.address = order.address;
      if (order.notes) customer.notes = order.notes;
      
      // Frissítjük a legutóbbi rendelés dátumát
      if (new Date(order.createdAt) > new Date(customer.lastOrderDate)) {
        customer.lastOrderDate = order.createdAt;
      }
    }
  });
  
  // Ügyfelek mentése az adatbázisba
  const customers = Array.from(customerMap.values());
  
  for (const customer of customers) {
    try {
      const savedCustomerProxy = await customerService.saveCustomer(customer);
    } catch (error) {
      console.error('Hiba az ügyfél létrehozásakor:', error);
    }
  }
};

// Rendelések hozzáadása az ügyfelekhez
const addOrdersToCustomers = async (customersList, deliveryOrders) => {
  // Ügyfelek telefonszám szerinti indexelése
  const customersByPhone = {};
  customersList.forEach(customer => {
    customersByPhone[customer.phone] = customer;
    customer.orders = [];
    customer.totalSpent = 0;
  });
  
  // Rendelések hozzáadása az ügyfelekhez
  deliveryOrders.forEach(order => {
    if (!order.phone || !customersByPhone[order.phone]) return;
    
    const customer = customersByPhone[order.phone];
    const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    customer.orders.push({
      id: order._id,
      date: order.createdAt,
      total: orderTotal,
      items: order.items.length
    });
    
    customer.totalSpent += orderTotal;
    
    // Frissítjük a legutóbbi rendelés dátumát
    if (new Date(order.createdAt) > new Date(customer.lastOrderDate || '2000-01-01')) {
      customer.lastOrderDate = order.createdAt;
    }
    
    // Frissítjük a legelső rendelés dátumát
    if (new Date(order.createdAt) < new Date(customer.firstOrderDate || '2099-12-31')) {
      customer.firstOrderDate = order.createdAt;
    }
  });
  
  // Frissítjük az ügyfeleket az adatbázisban
  for (const phone in customersByPhone) {
    const customer = customersByPhone[phone];
    try {
      await customerService.saveCustomer(customer);
    } catch (error) {
      console.error(`Hiba az ügyfél (${phone}) frissítésekor:`, error);
    }
  }
};

// Statisztikák számítása
const calculateStatistics = (customersList, orders) => {
  // Összes ügyfél száma
  statistics.value.totalCustomers = customersList.length;
  
  // Aktív ügyfelek száma (legalább 2 rendelés)
  statistics.value.activeCustomers = customersList.filter(customer => 
    customer.orders && customer.orders.length >= 2
  ).length;
  
  // Összes rendelés száma
  statistics.value.totalOrders = orders.length;
  
  // Átlagos rendelési érték
  const totalOrderValue = orders.reduce((sum, order) => {
    // Ellenőrizzük, hogy az order.items létezik-e és tömb-e
    if (!order.items || !Array.isArray(order.items)) {
      return sum;
    }
    const orderTotal = order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    return sum + orderTotal;
  }, 0);
  
  statistics.value.averageOrderValue = orders.length > 0 
    ? Math.round(totalOrderValue / orders.length) 
    : 0;
  
  // Top 5 ügyfél a költés alapján
  statistics.value.topCustomers = [...customersList]
    .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
    .slice(0, 5)
    .map(customer => ({
      ...customer,
      name: customer.name || '',
      orders: customer.orders || [],
      totalSpent: customer.totalSpent || 0,
      _id: customer._id || null,
      id: customer.id || null
    }));
};

// Szűrés és rendezés alkalmazása
const applyFiltersAndSort = () => {
  // Szűrés keresés és aktív státusz alapján
  let filtered = [...customers.value];
  
  // Keresés
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter(customer => 
      (customer.name || '').toLowerCase().includes(query) ||
      (customer.address || '').toLowerCase().includes(query) ||
      (customer.phone || '').includes(query)
    );
  }
  
  // Csak aktív ügyfelek
  if (showOnlyActive.value) {
    filtered = filtered.filter(customer => customer.orders && customer.orders.length >= 2);
  }
  
  // Rendezés
  filtered.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy.value) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '');
        break;
      case 'orderCount':
        comparison = (a.orders ? a.orders.length : 0) - (b.orders ? b.orders.length : 0);
        break;
      case 'totalSpent':
        comparison = (a.totalSpent || 0) - (b.totalSpent || 0);
        break;
      case 'lastOrderDate':
      default:
        // Biztonságos dátum konverzió
        const dateA = a.lastOrderDate ? new Date(a.lastOrderDate) : new Date('2000-01-01');
        const dateB = b.lastOrderDate ? new Date(b.lastOrderDate) : new Date('2000-01-01');
        comparison = dateA - dateB;
        break;
    }
    
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
  
  // Teljesen új tömböt hozunk létre a reaktivitás biztosításához
  filteredCustomers.value = JSON.parse(JSON.stringify(filtered));
};

// Keresés változásának figyelése
const handleSearchChange = () => {
  applyFiltersAndSort();
};

// Rendezés változtatása
const changeSort = (field) => {
  if (sortBy.value === field) {
    // Ha már ez a mező van kiválasztva, megfordítjuk a rendezési irányt
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    // Új mező kiválasztása
    sortBy.value = field;
    sortDirection.value = 'desc'; // Alapértelmezett: csökkenő sorrend
  }
  
  applyFiltersAndSort();
};

// Ügyfél szerkesztése
const editCustomer = (customer) => {
  originalCustomer.value = { ...customer };
  editingCustomer.value = JSON.parse(JSON.stringify(customer)); // Másolat készítése
  showEditModal.value = true;
  isNewCustomer.value = false;
};

// Új ügyfél felvétele
const addNewCustomer = () => {
  editingCustomer.value = {
    name: '',
    phone: '',
    address: '',
    notes: '',
    type: 'customer',
    firstOrderDate: new Date().toISOString(),
    lastOrderDate: new Date().toISOString(),
    orders: [],
    totalSpent: 0
  };
  showEditModal.value = true;
  isNewCustomer.value = true;
};

// Szerkesztés mentése
const saveCustomerEdit = async () => {
  try {
    // Validáció
    if (!editingCustomer.value || !editingCustomer.value.phone) {
      alert('A telefonszám megadása kötelező!');
      return;
    }
    
    // Biztosítjuk, hogy minden szükséges mező létezik
    if (!editingCustomer.value.orders) {
      editingCustomer.value.orders = [];
    }
    
    // Biztosítjuk, hogy a többi mező is létezik
    editingCustomer.value.name = editingCustomer.value.name || '';
    editingCustomer.value.address = editingCustomer.value.address || '';
    editingCustomer.value.notes = editingCustomer.value.notes || '';
    editingCustomer.value.totalSpent = editingCustomer.value.totalSpent || 0;
    
    // Ha nincs firstOrderDate, akkor beállítjuk
    if (!editingCustomer.value.firstOrderDate) {
      editingCustomer.value.firstOrderDate = new Date().toISOString();
    }
    
    // Ha nincs lastOrderDate, akkor beállítjuk
    if (!editingCustomer.value.lastOrderDate) {
      editingCustomer.value.lastOrderDate = new Date().toISOString();
    }
    
    // Frissítjük az ügyfél adatait az adatbázisban
    const savedCustomerProxy = await customerService.saveCustomer(editingCustomer.value);
    
    // Konvertáljuk a Proxy objektumot egyszerű objektummá
    const savedCustomer = JSON.parse(JSON.stringify(savedCustomerProxy));
    
    if (isNewCustomer.value) {
      // Új ügyfél hozzáadása a listához
      // Biztosítjuk, hogy a mentett ügyfél minden szükséges mezővel rendelkezik
      const newCustomer = {
        ...savedCustomer,
        // Használjuk a szerkesztett ügyfél adatait, mert a savedCustomer-ben lehet, hogy üresek
        name: editingCustomer.value.name || '',
        address: editingCustomer.value.address || '',
        phone: editingCustomer.value.phone || '',
        notes: editingCustomer.value.notes || '',
        orders: editingCustomer.value.orders || [],
        totalSpent: editingCustomer.value.totalSpent || 0,
        firstOrderDate: editingCustomer.value.firstOrderDate || new Date().toISOString(),
        lastOrderDate: editingCustomer.value.lastOrderDate || new Date().toISOString()
      };
      
      // Új ügyfél hozzáadása a listához - új tömböt hozunk létre a reaktivitás biztosításához
      customers.value = [...customers.value, newCustomer];
      
      // Kikapcsoljuk a szűrőket, hogy az új ügyfél biztosan látszódjon
      searchQuery.value = '';
      showOnlyActive.value = false;
      
      // Beállítjuk a rendezést az utolsó rendelés dátuma szerint csökkenő sorrendben
      sortBy.value = 'lastOrderDate';
      sortDirection.value = 'desc';
      
      // Közvetlenül frissítjük a szűrt listát is - új tömböt hozunk létre a reaktivitás biztosításához
      filteredCustomers.value = JSON.parse(JSON.stringify(customers.value));
      
      alert('Új ügyfél sikeresen hozzáadva!');
    } else {
      // Frissítjük az ügyfél adatait a listában
      const index = customers.value.findIndex(c => c._id === editingCustomer.value._id);
      if (index !== -1) {
        // Új objektumot hozunk létre a reaktivitás biztosításához
        const updatedCustomer = {
          ...customers.value[index],
          name: editingCustomer.value.name || '',
          address: editingCustomer.value.address || '',
          phone: editingCustomer.value.phone,
          notes: editingCustomer.value.notes || '',
          orders: editingCustomer.value.orders || [],
          totalSpent: editingCustomer.value.totalSpent || 0,
          firstOrderDate: editingCustomer.value.firstOrderDate,
          lastOrderDate: editingCustomer.value.lastOrderDate
        };
        
        // Frissítjük a listát - új tömböt hozunk létre a reaktivitás biztosításához
        customers.value = [
          ...customers.value.slice(0, index),
          updatedCustomer,
          ...customers.value.slice(index + 1)
        ];
        
        // Frissítjük az összes rendelést is az új adatokkal
        if (originalCustomer.value && originalCustomer.value.phone !== editingCustomer.value.phone) {
          const deliveryOrders = await orderService.getOrdersByType('delivery');
          const customerOrders = deliveryOrders.filter(order => order.phone === originalCustomer.value.phone);
          
          for (const order of customerOrders) {
            // Frissítjük a telefonszámot
            order.phone = editingCustomer.value.phone;
            
            // Frissítjük a nevet és címet
            order.name = editingCustomer.value.name || '';
            order.address = editingCustomer.value.address || '';
            order.notes = editingCustomer.value.notes || '';
            
            // Mentjük a frissített rendelést
            await orderService.saveOrder(order);
          }
        }
        
        alert('Ügyfél adatai sikeresen frissítve!');
      }
    }
    
    // Újra alkalmazzuk a szűrést és rendezést
    applyFiltersAndSort();
    
    // Frissítjük a statisztikákat
    calculateStatistics(customers.value, await orderService.getOrdersByType('delivery'));
    
    // Várunk egy tick-et, hogy a DOM frissüljön
    await nextTick();
    
    // Bezárjuk a modalt
    showEditModal.value = false;
    editingCustomer.value = null;
    originalCustomer.value = null;
    isNewCustomer.value = false;
  } catch (error) {
    console.error('Hiba az ügyfél adatainak mentésekor:', error);
    alert('Hiba az ügyfél adatainak mentésekor: ' + error.message);
  }
};

// Ügyfél törlésének megerősítése
const confirmDeleteCustomer = (customer) => {
  customerToDelete.value = customer;
  showDeleteConfirm.value = true;
};

// Ügyfél törlése
const deleteCustomer = async () => {
  try {
    if (!customerToDelete.value || !customerToDelete.value._id) {
      alert('Nincs kiválasztva törölhető ügyfél!');
      return;
    }
    
    // Töröljük az ügyfelet az adatbázisból
    await customerService.deleteCustomer(customerToDelete.value._id);
    
    // Töröljük az ügyfelet a listából
    const index = customers.value.findIndex(c => c._id === customerToDelete.value._id);
    if (index !== -1) {
      customers.value.splice(index, 1);
    }
    
    // Újra alkalmazzuk a szűrést és rendezést
    applyFiltersAndSort();
    
    // Frissítjük a statisztikákat
    calculateStatistics(customers.value, await orderService.getOrdersByType('delivery'));
    
    alert('Ügyfél sikeresen törölve!');
    
    // Bezárjuk a megerősítő ablakot
    showDeleteConfirm.value = false;
    customerToDelete.value = null;
  } catch (error) {
    console.error('Hiba az ügyfél törlésekor:', error);
    alert('Hiba az ügyfél törlésekor: ' + error.message);
  }
};

// Formázott dátum
const formatDate = (dateString) => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    
    // Ellenőrizzük, hogy érvényes dátum-e
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Hiba a dátum formázásakor:', error);
    return '-';
  }
};

// Komponens betöltésekor
onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="customers-view">
    <h1>Korábbi rendelők kezelése</h1>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
      <button @click="loadData" class="retry-btn">Újrapróbálkozás</button>
    </div>
    
    <div v-if="isLoading" class="loading">
      Adatok betöltése...
    </div>
    
    <div v-else class="customers-container">
      <!-- Statisztikák -->
      <div class="statistics-section">
        <h2>Statisztikák</h2>
        <div class="statistics-grid">
          <div class="stat-card">
            <div class="stat-value">{{ statistics.totalCustomers }}</div>
            <div class="stat-label">Összes ügyfél</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value">{{ statistics.activeCustomers }}</div>
            <div class="stat-label">Visszatérő ügyfél</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value">{{ statistics.totalOrders }}</div>
            <div class="stat-label">Összes rendelés</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value">{{ statistics.averageOrderValue }} Ft</div>
            <div class="stat-label">Átlagos rendelés</div>
          </div>
        </div>
        
        <div class="top-customers">
          <h3>Top 5 ügyfél</h3>
          <div class="top-customers-list">
            <div v-for="(customer, index) in statistics.topCustomers" :key="customer._id || customer.id || index" class="top-customer-item">
              <div class="top-customer-rank">{{ index + 1 }}.</div>
              <div class="top-customer-info">
                <div class="top-customer-name">{{ customer.name || 'Névtelen ügyfél' }}</div>
                <div class="top-customer-details">
                  {{ customer.orders ? customer.orders.length : 0 }} rendelés, {{ customer.totalSpent || 0 }} Ft
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Ügyfelek listája -->
      <div class="customers-list-section">
        <div class="section-header">
          <h2>Ügyfelek listája</h2>
          <button @click="addNewCustomer" class="add-btn">
            <span class="add-icon">+</span> Új ügyfél felvétele
          </button>
        </div>
        
        <!-- Keresés és szűrés -->
        <div class="filters-container">
          <div class="search-container">
            <input 
              type="text" 
              v-model="searchQuery" 
              @input="handleSearchChange"
              placeholder="Keresés név, cím vagy telefonszám alapján..." 
              class="search-input"
            >
            <button 
              v-if="searchQuery" 
              @click="searchQuery = ''; handleSearchChange()" 
              class="clear-search-btn"
              title="Keresés törlése"
            >
              ✕
            </button>
          </div>
          
          <div class="filter-options">
            <label class="filter-checkbox">
              <input type="checkbox" v-model="showOnlyActive" @change="applyFiltersAndSort">
              Csak visszatérő ügyfelek
            </label>
            
            <div class="sort-options">
              <span>Rendezés:</span>
              <button 
                @click="changeSort('lastOrderDate')" 
                :class="['sort-btn', { active: sortBy === 'lastOrderDate' }]"
                title="Rendezés utolsó rendelés szerint"
              >
                Utolsó rendelés
                <span v-if="sortBy === 'lastOrderDate'" class="sort-direction">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </button>
              
              <button 
                @click="changeSort('name')" 
                :class="['sort-btn', { active: sortBy === 'name' }]"
                title="Rendezés név szerint"
              >
                Név
                <span v-if="sortBy === 'name'" class="sort-direction">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </button>
              
              <button 
                @click="changeSort('orderCount')" 
                :class="['sort-btn', { active: sortBy === 'orderCount' }]"
                title="Rendezés rendelések száma szerint"
              >
                Rendelések
                <span v-if="sortBy === 'orderCount'" class="sort-direction">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </button>
              
              <button 
                @click="changeSort('totalSpent')" 
                :class="['sort-btn', { active: sortBy === 'totalSpent' }]"
                title="Rendezés költés szerint"
              >
                Költés
                <span v-if="sortBy === 'totalSpent'" class="sort-direction">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Ügyfelek táblázata -->
        <div class="customers-table-container">
          <table class="customers-table">
            <thead>
              <tr>
                <th>Név</th>
                <th>Telefonszám</th>
                <th>Cím</th>
                <th>Rendelések</th>
                <th>Összes költés</th>
                <th>Utolsó rendelés</th>
                <th>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredCustomers || filteredCustomers.length === 0">
                <td colspan="7" class="no-results">Nincs találat a keresési feltételeknek megfelelően</td>
              </tr>
              <template v-else>
                <tr v-for="(customer, index) in filteredCustomers" :key="index">
                  <td>{{ customer.name || '' }}</td>
                  <td>{{ customer.phone || '' }}</td>
                  <td>{{ customer.address || '' }}</td>
                  <td>{{ customer.orders ? customer.orders.length : 0 }}</td>
                  <td>{{ customer.totalSpent || 0 }} Ft</td>
                  <td>{{ formatDate(customer.lastOrderDate) }}</td>
                  <td class="actions-cell">
                    <button @click="editCustomer(customer)" class="edit-btn" title="Szerkesztés">
                      Szerkesztés
                    </button>
                    <button @click="confirmDeleteCustomer(customer)" class="delete-btn" title="Törlés">
                      Törlés
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Szerkesztés modal -->
    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ isNewCustomer ? 'Új ügyfél felvétele' : 'Ügyfél adatainak szerkesztése' }}</h3>
        
        <div class="form-group">
          <label for="edit-name">Név:</label>
          <input 
            type="text" 
            id="edit-name" 
            v-model="editingCustomer.name"
            placeholder="Ügyfél neve"
          >
        </div>
        
        <div class="form-group">
          <label for="edit-phone">Telefonszám: <span class="required">*</span></label>
          <input 
            type="tel" 
            id="edit-phone" 
            v-model="editingCustomer.phone"
            placeholder="Telefonszám (kötelező)"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="edit-address">Cím:</label>
          <input 
            type="text" 
            id="edit-address" 
            v-model="editingCustomer.address"
            placeholder="Szállítási cím"
          >
        </div>
        
        <div class="form-group">
          <label for="edit-notes">Megjegyzés:</label>
          <textarea 
            id="edit-notes" 
            v-model="editingCustomer.notes"
            rows="2"
            placeholder="Egyéb megjegyzések"
          ></textarea>
        </div>
        
        <div class="modal-actions">
          <button class="secondary-btn" @click="showEditModal = false">Mégse</button>
          <button class="primary-btn" @click="saveCustomerEdit">{{ isNewCustomer ? 'Felvétel' : 'Mentés' }}</button>
        </div>
      </div>
    </div>
    
    <!-- Törlés megerősítése modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay">
      <div class="modal-content delete-confirm-modal">
        <h3>Ügyfél törlése</h3>
        
        <p class="confirm-message">
          Biztosan törölni szeretné a következő ügyfelet?<br>
          <strong>{{ customerToDelete?.name || 'Névtelen ügyfél' }}</strong> ({{ customerToDelete?.phone }})
        </p>
        
        <p class="warning-message">
          A törlés nem vonható vissza, és az ügyfél összes adata elvész!
        </p>
        
        <div class="modal-actions">
          <button class="secondary-btn" @click="showDeleteConfirm = false">Mégse</button>
          <button class="danger-btn" @click="deleteCustomer">Törlés</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customers-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  max-width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
}

.customers-view h1 {
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

.customers-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Statisztikák */
.statistics-section {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stat-card {
  background-color: #f5f5f5;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
}

.top-customers {
  margin-top: 2rem;
}

.top-customers h3 {
  margin-bottom: 1rem;
  color: #333;
}

.top-customers-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.top-customer-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.top-customer-rank {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--primary-color);
  min-width: 30px;
}

.top-customer-info {
  flex: 1;
}

.top-customer-name {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.top-customer-details {
  font-size: 0.9rem;
  color: #666;
}

/* Ügyfelek listája */
.customers-list-section {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
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
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.3s;
}

.add-btn:hover {
  background-color: #3a5a8f;
}

.add-icon {
  font-size: 1.2rem;
  font-weight: bold;
}

.filters-container {
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-container {
  position: relative;
  width: 100%;
}

.search-input {
  padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  width: 100%;
  transition: border-color 0.3s;
  background-color: #f9f9f9;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(74, 109, 167, 0.2);
}

.clear-search-btn {
  position: absolute;
  top: 50%;
  right: 0.75rem;
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

.filter-options {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.sort-options {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sort-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.sort-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.sort-direction {
  font-weight: bold;
}

.customers-table-container {
  margin-top: 1rem;
  overflow-x: auto;
}

.customers-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

.customers-table th,
.customers-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.customers-table th {
  background-color: #f5f5f5;
  font-weight: bold;
  color: #333;
}

.customers-table tbody tr:hover {
  background-color: #f9f9f9;
}

.no-results {
  text-align: center;
  padding: 2rem;
  font-style: italic;
  color: #666;
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.edit-btn, .delete-btn {
  border: none;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  transition: all 0.3s;
  font-size: 0.85rem;
  font-weight: 500;
  color: white;
}

.edit-btn {
  background-color: #2196F3;
}

.delete-btn {
  background-color: #F44336;
}

.edit-btn:hover {
  background-color: #1976D2;
}

.delete-btn:hover {
  background-color: #D32F2F;
}

/* Modal */
.modal-overlay {
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
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  color: var(--primary-color);
}

.form-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: bold;
}

.required {
  color: #c62828;
}

.form-group input,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(74, 109, 167, 0.2);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.primary-btn, .secondary-btn, .danger-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.primary-btn {
  background-color: var(--primary-color);
  color: white;
}

.primary-btn:hover {
  background-color: #3a5a8f;
}

.secondary-btn {
  background-color: #f0f0f0;
}

.secondary-btn:hover {
  background-color: #e0e0e0;
}

.danger-btn {
  background-color: #c62828;
  color: white;
}

.danger-btn:hover {
  background-color: #b71c1c;
}

/* Törlés megerősítése modal */
.delete-confirm-modal {
  max-width: 400px;
}

.confirm-message {
  margin-bottom: 1rem;
  line-height: 1.5;
}

.warning-message {
  color: #c62828;
  font-weight: bold;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #ffebee;
  border-radius: 4px;
  border-left: 4px solid #c62828;
}

/* Responsive */
@media (max-width: 768px) {
  .statistics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filter-options {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .sort-options {
    margin-top: 0.5rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .add-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .statistics-grid {
    grid-template-columns: 1fr;
  }
  
  .sort-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }
  
  .modal-content {
    width: 95%;
    padding: 1rem;
  }
}
</style> 