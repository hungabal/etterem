<script setup>
// Rendelések kezelése nézet
// Ez a komponens felelős az étterem rendeléseinek kezeléséért
// Itt lehet új rendeléseket felvenni, meglévőket módosítani és kezelni a különböző rendeléstípusokat (helyben, elvitel, kiszállítás)

// Szükséges Vue komponensek és szolgáltatások importálása
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { menuService, tableService, orderService, customerService, initializeDatabase, settingsService } from '../services/db.js';

// Betöltés állapota
// isLoading: Jelzi, hogy folyamatban van-e adatok betöltése
// errorMessage: Hiba esetén megjelenő üzenet
const isLoading = ref(true);
const errorMessage = ref('');

// Asztalok adatai
// Az étterem összes asztalának listája
const tables = ref([]);

// Menü kategóriák és ételek
// menuCategories: Az étlap kategóriái (pl. előételek, főételek, desszertek)
// menuItems: Az összes menüelem (ételek és italok)
const menuCategories = ref([]);
const menuItems = ref([]);

// Beállítások
// Az alkalmazás általános beállításai
const settings = ref(null);

// Aktív rendelés adatai
// Az éppen szerkesztett vagy létrehozott rendelés adatai
const activeOrder = ref({
  tableId: null,
  items: [],
  notes: '',
  type: 'local' // local, takeaway, delivery - helyben, elvitel, kiszállítás
});

// Kiválasztott asztal
// A rendeléshez kiválasztott asztal
const selectedTable = ref(null);

// Aktív kategória
// A jelenleg kiválasztott menükategória
const activeCategory = ref(null);

// Keresési szöveg
// Menüelemek kereséséhez használt szöveg
const searchQuery = ref('');

// Aktív tab
// A jelenleg kiválasztott rendeléstípus (helyben, elvitel, kiszállítás)
const activeTab = ref('local');

// Kedvezmény százaléka
// A rendelésre alkalmazott kedvezmény mértéke százalékban
const discountPercent = ref(0);

// Házhozszállítás adatok
// A kiszállításos rendeléshez szükséges adatok
const deliveryData = ref({
  name: '',
  address: '',
  phone: '',
  notes: '',
  items: [],
  paymentMethod: ''
});

// Korábbi rendelők adatai
// previousCustomers: A rendszerben tárolt ügyfelek listája
// showCustomersList: Jelzi, hogy látható-e az ügyfelek listája
// customerSearchQuery: Ügyfelek kereséséhez használt szöveg
const previousCustomers = ref([]);
const showCustomersList = ref(false);
const customerSearchQuery = ref('');

// Méret vagy feltét kiválasztás modal
// showOptionsModal: Jelzi, hogy látható-e a méret/feltét választó modal
// selectedItemForOptions: A kiválasztott menüelem, amelyhez méretet/feltétet választunk
// selectedSize: A kiválasztott méret
// selectedToppings: A kiválasztott feltétek listája
const showOptionsModal = ref(false);
const selectedItemForOptions = ref(null);
const selectedSize = ref(null);
const selectedToppings = ref([]);
// Feltét kereső
// A feltétek kereséséhez használt szöveg
const toppingSearchQuery = ref('');

// Rendelési adatok mentése localStorage-ba
const saveOrderToLocalStorage = () => {
  try {
    // Aktív rendelés mentése
    localStorage.setItem('activeOrder', JSON.stringify(activeOrder.value));
    
    // Kiválasztott asztal mentése (csak az ID-t mentjük)
    if (selectedTable.value) {
      localStorage.setItem('selectedTableId', selectedTable.value._id);
    } else {
      localStorage.removeItem('selectedTableId');
    }
    
    // Aktív tab mentése
    localStorage.setItem('activeTab', activeTab.value);
    
    // Házhozszállítási adatok mentése
    localStorage.setItem('deliveryData', JSON.stringify(deliveryData.value));
    
    // Kedvezmény mentése
    localStorage.setItem('discountPercent', discountPercent.value.toString());
  } catch (error) {
    console.error('Hiba a rendelési adatok mentésekor:', error);
  }
};

// Rendelési adatok betöltése localStorage-ból
const loadOrderFromLocalStorage = async () => {
  try {
    // Aktív tab betöltése
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab) {
      activeTab.value = savedTab;
    }
    
    // Házhozszállítási adatok betöltése
    const savedDeliveryData = localStorage.getItem('deliveryData');
    if (savedDeliveryData) {
      const parsedDeliveryData = JSON.parse(savedDeliveryData);
      // Csak akkor állítjuk vissza, ha van benne tétel
      if (parsedDeliveryData && parsedDeliveryData.items && parsedDeliveryData.items.length > 0) {
        deliveryData.value = parsedDeliveryData;
      }
    }
    
    // Kedvezmény betöltése
    const savedDiscount = localStorage.getItem('discountPercent');
    if (savedDiscount) {
      discountPercent.value = parseInt(savedDiscount, 10) || 0;
    }
  } catch (error) {
    console.error('Hiba a rendelési adatok betöltésekor:', error);
  }
};

// Ideiglenes rendelés mentése az adatbázisba
const saveTemporaryOrderToDatabase = async () => {
  try {
    // Csak helyi rendelés esetén és ha van kiválasztott asztal
    if (activeTab.value !== 'local' || !selectedTable.value || !activeOrder.value.tableId) return;
    
    // Csak akkor mentjük, ha van tétel a rendelésben
    if (activeOrder.value.items && activeOrder.value.items.length > 0) {
      // Létrehozunk egy ideiglenes rendelés objektumot
      const tempOrder = {
        ...activeOrder.value,
        type: 'temporary',
        status: 'temporary',
        tableId: selectedTable.value._id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        discountPercent: discountPercent.value,
        discountAmount: discountAmount.value,
        subtotal: orderTotal.value,
        total: finalTotal.value
      };
      
      // Ellenőrizzük, hogy van-e már ideiglenes rendelés ehhez az asztalhoz
      const existingTempOrder = await orderService.getTemporaryOrderByTable(selectedTable.value._id);
      
      if (existingTempOrder) {
        // Ha van, frissítjük
        tempOrder._id = existingTempOrder._id;
        tempOrder._rev = existingTempOrder._rev;
      }
      
      // Mentjük az adatbázisba
      await orderService.saveOrder(tempOrder);
    }
  } catch (error) {
    console.error('Hiba az ideiglenes rendelés mentésekor:', error);
  }
};

// Ideiglenes rendelés betöltése az adatbázisból
const loadTemporaryOrderFromDatabase = async (tableId) => {
  try {
    if (!tableId) return null;
    
    // Lekérjük az ideiglenes rendelést
    const tempOrder = await orderService.getTemporaryOrderByTable(tableId);
    
    if (tempOrder && tempOrder.items && tempOrder.items.length > 0) {
      return tempOrder;
    }
    
    return null;
  } catch (error) {
    console.error('Hiba az ideiglenes rendelés betöltésekor:', error);
    return null;
  }
};

// Ideiglenes rendelés törlése az adatbázisból
const deleteTemporaryOrderFromDatabase = async (tableId) => {
  try {
    if (!tableId) return;
    
    // Lekérjük az ideiglenes rendelést
    const tempOrder = await orderService.getTemporaryOrderByTable(tableId);
    
    if (tempOrder) {
      // Töröljük az adatbázisból
      await orderService.deleteOrder(tempOrder._id, tempOrder._rev);
    }
  } catch (error) {
    console.error('Hiba az ideiglenes rendelés törlésekor:', error);
  }
};

// Rendelési adatok törlése localStorage-ból
const clearOrderFromLocalStorage = () => {
  try {
    localStorage.removeItem('activeOrder');
    localStorage.removeItem('selectedTableId');
    localStorage.removeItem('deliveryData');
    localStorage.removeItem('discountPercent');
    // Az activeTab-ot megtartjuk
  } catch (error) {
    console.error('Hiba a rendelési adatok törlésekor:', error);
  }
};

// Adatok betöltése
// Ez a függvény betölti az összes szükséges adatot az alkalmazás indításakor
const loadData = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';

    // Adatbázis inicializálása
    await initializeDatabase();

    // Beállítások betöltése
    // Az alkalmazás általános beállításainak lekérése
    const settingsData = await settingsService.getSettings();
    settings.value = settingsData;
    
    // Ha van alapértelmezett fizetési mód, beállítjuk
    if (settings.value && settings.value.paymentMethods && settings.value.paymentMethods.length > 0) {
      deliveryData.value.paymentMethod = settings.value.paymentMethods[0];
    }

    // Kategóriák betöltése
    // Az étlap kategóriáinak lekérése
    const categories = await menuService.getCategories();
    menuCategories.value = categories;
    if (categories.length > 0) {
      activeCategory.value = categories[0];
    }

    // Menüelemek betöltése
    // Az összes menüelem lekérése
    const items = await menuService.getAllItems();
    menuItems.value = items.filter(item => item.type === 'menuItem');

    // Asztalok betöltése
    // Az étterem asztalainak lekérése
    const tablesList = await tableService.getAllTables();
    tables.value = tablesList;

    // Korábbi rendelők betöltése
    // A rendszerben tárolt ügyfelek lekérése
    await loadPreviousCustomers();
    
    // Csak az aktív tab és házhozszállítási adatok betöltése
    await loadOrderFromLocalStorage();

    isLoading.value = false;
  } catch (error) {
    console.error('Hiba az adatok betöltésekor:', error);
    errorMessage.value = 'Hiba az adatok betöltésekor: ' + error.message;
    isLoading.value = false;
  }
};

// Korábbi rendelők betöltése
const loadPreviousCustomers = async () => {
  try {
    // Lekérjük az összes ügyfelet az adatbázisból
    const allCustomers = await customerService.getAllCustomers();
    
    // Rendezés a legutóbbi rendelés alapján
    const sortedCustomers = [...allCustomers].sort((a, b) => 
      new Date(b.lastOrderDate || '2000-01-01') - new Date(a.lastOrderDate || '2000-01-01')
    );
    
    previousCustomers.value = sortedCustomers.map(customer => ({
      name: customer.name || '',
      address: customer.address || '',
      phone: customer.phone || '',
      notes: customer.notes || '',
      lastOrderDate: customer.lastOrderDate || new Date().toISOString()
    }));
    
    // Ha nincsenek ügyfelek, akkor a rendelésekből próbáljuk meg betölteni
    if (previousCustomers.value.length === 0) {
      await loadPreviousCustomersFromOrders();
    }
  } catch (error) {
    console.error('Hiba a korábbi rendelők betöltésekor:', error);
    // Fallback: ha nem sikerül az ügyfeleket lekérni, akkor a rendelésekből próbáljuk meg
    await loadPreviousCustomersFromOrders();
  }
};

// Korábbi rendelők betöltése a rendelésekből (fallback)
const loadPreviousCustomersFromOrders = async () => {
  try {
    // Lekérjük az összes korábbi házhozszállítási rendelést
    const allOrders = await orderService.getAllOrders();
    
    if (!allOrders || !Array.isArray(allOrders)) {
      console.error('Nem sikerült lekérni a rendeléseket vagy a visszaadott érték nem tömb');
      previousCustomers.value = [];
      return;
    }
    
    // Kiszűrjük a házhozszállítási rendeléseket
    const deliveryOrders = allOrders.filter(order => order && order.type === 'delivery');
    
    // Egyedi ügyfelek kiszűrése (telefon alapján)
    const uniqueCustomers = [];
    const phoneNumbers = new Set();
    
    deliveryOrders.forEach(order => {
      if (order && order.phone && !phoneNumbers.has(order.phone)) {
        phoneNumbers.add(order.phone);
        uniqueCustomers.push({
          name: order.name || '',
          address: order.address || '',
          phone: order.phone || '',
          notes: order.notes || '',
          lastOrderDate: order.createdAt || new Date().toISOString()
        });
      }
    });
    
    // Rendezés a legutóbbi rendelés alapján
    uniqueCustomers.sort((a, b) => new Date(b.lastOrderDate || '2000-01-01') - new Date(a.lastOrderDate || '2000-01-01'));
    
    previousCustomers.value = uniqueCustomers;
    
    // Mentsük el az ügyfeleket az adatbázisba is
    for (const customer of uniqueCustomers) {
      try {
        if (customer && customer.phone) {
          await customerService.saveCustomer({
            name: customer.name || '',
            address: customer.address || '',
            phone: customer.phone,
            notes: customer.notes || '',
            type: 'customer',
            lastOrderDate: customer.lastOrderDate || new Date().toISOString()
          });
        }
      } catch (saveError) {
        console.warn('Nem sikerült menteni az ügyfelet:', saveError);
      }
    }
  } catch (error) {
    console.error('Hiba a korábbi rendelők betöltésekor a rendelésekből:', error);
    previousCustomers.value = [];
  }
};

// Szűrt ügyfelek a keresés alapján
const filteredCustomers = computed(() => {
  if (!customerSearchQuery.value.trim()) {
    return previousCustomers.value;
  }
  
  const query = customerSearchQuery.value.toLowerCase().trim();
  return previousCustomers.value.filter(customer => 
    customer.name.toLowerCase().includes(query) ||
    customer.address.toLowerCase().includes(query) ||
    customer.phone.includes(query)
  );
});

// Ügyfél kiválasztása
const selectCustomer = (customer) => {
  deliveryData.value.name = customer.name;
  deliveryData.value.address = customer.address;
  deliveryData.value.phone = customer.phone;
  deliveryData.value.notes = customer.notes;
  
  // Bezárjuk a listát
  showCustomersList.value = false;
  customerSearchQuery.value = '';
};

// Kategóriához tartozó menüelemek lekérése
const getCategoryItems = computed(() => {
  if (!activeCategory.value) return [];
  return menuItems.value.filter(item => 
    item.category === activeCategory.value._id && 
    item.isAvailable
  );
});

// Szűrt menüelemek a keresés alapján
const filteredMenuItems = computed(() => {
  let items = [];
  
  if (!searchQuery.value.trim()) {
    items = getCategoryItems.value;
  } else {
    const query = searchQuery.value.toLowerCase().trim();
    items = getCategoryItems.value.filter(item => 
      item.name.toLowerCase().includes(query)
    );
  }
  
  // ABC sorrendbe rendezés név szerint
  return items.sort((a, b) => a.name.localeCompare(b.name));
});

// Asztal kiválasztása
const selectTable = async (table) => {
  if (table.status !== 'free' && table.status !== 'occupied') {
    alert('Ez az asztal nem elérhető rendelés felvételéhez!');
    return;
  }
  
  selectedTable.value = table;
  
  // Ha az asztal foglalt, betöltjük a meglévő rendelést
  if (table.status === 'occupied') {
    try {
      // Először megnézzük, van-e aktív rendelés az asztalhoz
      const existingOrder = await orderService.getActiveOrderByTable(table._id);
      
      if (existingOrder) {
        // Ha van aktív rendelés, azt használjuk
        activeOrder.value = existingOrder;
      } else {
        // Ha nincs aktív rendelés, megnézzük, van-e ideiglenes rendelés
        const tempOrder = await loadTemporaryOrderFromDatabase(table._id);
        
        if (tempOrder) {
          // Ha van ideiglenes rendelés, azt használjuk
          activeOrder.value = tempOrder;
        } else {
          // Ha nincs ideiglenes rendelés, megnézzük, van-e localStorage-ban mentett rendelés
          const savedTableId = localStorage.getItem('selectedTableId');
          const savedOrder = localStorage.getItem('activeOrder');
          
          if (savedTableId === table._id && savedOrder) {
            // Ha van localStorage-ban mentett rendelés ehhez az asztalhoz, azt használjuk
            const parsedOrder = JSON.parse(savedOrder);
            if (parsedOrder && parsedOrder.items && parsedOrder.items.length > 0) {
              activeOrder.value = parsedOrder;
            } else {
              // Ha nincs, új rendelést kezdünk
              activeOrder.value = {
                tableId: table._id,
                items: [],
                notes: '',
                type: 'local'
              };
            }
          } else {
            // Ha nincs, új rendelést kezdünk
            activeOrder.value = {
              tableId: table._id,
              items: [],
              notes: '',
              type: 'local'
            };
          }
        }
      }
      
      // Mentjük a rendelési adatokat localStorage-ba
      saveOrderToLocalStorage();
    } catch (error) {
      console.error('Hiba a rendelés betöltésekor:', error);
      alert('Hiba a rendelés betöltésekor: ' + error.message);
    }
  } else {
    // Ha az asztal szabad, megnézzük, van-e ideiglenes rendelés
    try {
      const tempOrder = await loadTemporaryOrderFromDatabase(table._id);
      
      if (tempOrder) {
        // Ha van ideiglenes rendelés, azt használjuk
        activeOrder.value = tempOrder;
      } else {
        // Ha nincs ideiglenes rendelés, megnézzük, van-e localStorage-ban mentett rendelés
        const savedTableId = localStorage.getItem('selectedTableId');
        const savedOrder = localStorage.getItem('activeOrder');
        
        if (savedTableId === table._id && savedOrder) {
          // Ha van localStorage-ban mentett rendelés ehhez az asztalhoz, azt használjuk
          const parsedOrder = JSON.parse(savedOrder);
          if (parsedOrder && parsedOrder.items && parsedOrder.items.length > 0) {
            activeOrder.value = parsedOrder;
          } else {
            // Ha nincs, új rendelést kezdünk
            activeOrder.value = {
              tableId: table._id,
              items: [],
              notes: '',
              type: 'local'
            };
          }
        } else {
          // Ha nincs, új rendelést kezdünk
          activeOrder.value = {
            tableId: table._id,
            items: [],
            notes: '',
            type: 'local'
          };
        }
      }
      
      // Mentjük a rendelési adatokat localStorage-ba
      saveOrderToLocalStorage();
    } catch (error) {
      console.error('Hiba az ideiglenes rendelés betöltésekor:', error);
      
      // Új rendelést kezdünk
      activeOrder.value = {
        tableId: table._id,
        items: [],
        notes: '',
        type: 'local'
      };
      
      // Mentjük a rendelési adatokat localStorage-ba
      saveOrderToLocalStorage();
    }
  }
};

// Kategória váltása
const changeCategory = (category) => {
  activeCategory.value = category;
};

// Tétel hozzáadása a rendeléshez
const addItemToOrder = async (item) => {
  try {
    // Ha helyi rendelés és nincs kiválasztott asztal, nem tudunk rendelést felvenni
    if (activeTab.value === 'local' && !selectedTable.value) {
      alert('Kérjük, válasszon asztalt a rendelés felvételéhez!');
      return;
    }
    
    // Helyi rendelés esetén ellenőrizzük, hogy ez-e az első tétel és az asztal szabad-e
    if (activeTab.value === 'local' && 
        (!activeOrder.value.items || activeOrder.value.items.length === 0) && 
        selectedTable.value.status === 'free') {
      try {
        // Importáljuk a couchDBService-t
        const { default: couchDBService } = await import('../services/couchdb-service.js');
        
        // Asztal státuszának frissítése foglaltra közvetlenül a couchDBService-en keresztül
        const result = await couchDBService.updateTableStatus(selectedTable.value._id, 'occupied');
        
        // Frissítjük a kiválasztott asztalt
        const updatedTable = await couchDBService.getTableById(selectedTable.value._id);
        selectedTable.value = updatedTable;
      } catch (tableError) {
        console.error('Hiba az asztal státuszának frissítésekor:', tableError);
        // Folytatjuk a rendelés felvételét akkor is, ha az asztal státuszának frissítése sikertelen
      }
    }
    
    // Tétel másolása, hogy ne módosítsuk az eredetit
    const newItem = { ...item };
    
    // Alapértelmezett mennyiség
    newItem.quantity = 1;
    
    // Ár beállítása
    if (newItem.sizes && newItem.sizes.length > 0) {
      newItem.price = newItem.sizes[0].price;
      newItem.selectedSize = newItem.sizes[0].name;
    }
    
    // Tétel hozzáadása a rendeléshez
    if (!activeOrder.value.items) {
      activeOrder.value.items = [];
    }
    
    // Házhozszállítás esetén a deliveryData-ba tesszük a tételt
    if (activeTab.value === 'delivery') {
      if (!deliveryData.value.items) {
        deliveryData.value.items = [];
      }
      
      // Ellenőrizzük, hogy a tétel már szerepel-e a rendelésben
      const existingItemIndex = deliveryData.value.items.findIndex(i => 
        i._id === newItem._id && 
        i.selectedSize === newItem.selectedSize &&
        JSON.stringify(i.selectedToppings || []) === JSON.stringify(newItem.selectedToppings || [])
      );
      
      if (existingItemIndex !== -1) {
        // Ha már szerepel, növeljük a mennyiséget
        deliveryData.value.items[existingItemIndex].quantity += 1;
      } else {
        // Ha még nem szerepel, hozzáadjuk
        deliveryData.value.items.push(newItem);
      }
    } else {
      // Ellenőrizzük, hogy a tétel már szerepel-e a rendelésben
      const existingItemIndex = activeOrder.value.items.findIndex(i => 
        i._id === newItem._id && 
        i.selectedSize === newItem.selectedSize &&
        JSON.stringify(i.selectedToppings || []) === JSON.stringify(newItem.selectedToppings || [])
      );
      
      if (existingItemIndex !== -1) {
        // Ha már szerepel, növeljük a mennyiséget
        activeOrder.value.items[existingItemIndex].quantity += 1;
      } else {
        // Ha még nem szerepel, hozzáadjuk
        activeOrder.value.items.push(newItem);
      }
    }
    
    // Mentjük a rendelési adatokat localStorage-ba
    saveOrderToLocalStorage();
    
    // Mentjük az ideiglenes rendelést az adatbázisba is (csak helyi rendelés esetén)
    if (activeTab.value === 'local') {
      await saveTemporaryOrderToDatabase();
    }
    
    // Nem mentjük automatikusan a rendelést, csak ha a felhasználó a mentés gombra kattint
    // await saveOrder();
    // await loadData();
  } catch (error) {
    console.error('Hiba a tétel hozzáadásakor:', error);
    alert('Hiba a tétel hozzáadásakor: ' + error.message);
  }
};

// Tétel mennyiségének módosítása
const updateItemQuantity = async (item, change) => {
  const order = activeTab.value === 'delivery' ? deliveryData.value : activeOrder.value;
  const newQuantity = item.quantity + change;
  
  if (newQuantity <= 0) {
    // Tétel eltávolítása
    order.items = order.items.filter(i => i._id !== item._id);
  } else {
    item.quantity = newQuantity;
  }
  
  // Mentjük a rendelési adatokat localStorage-ba
  saveOrderToLocalStorage();
  
  // Ha helyi rendelés és van kiválasztott asztal
  if (activeTab.value === 'local' && selectedTable.value) {
    // Ha nincs több tétel a rendelésben, töröljük az ideiglenes rendelést az adatbázisból
    if (order.items.length === 0) {
      await deleteTemporaryOrderFromDatabase(selectedTable.value._id);
    } else {
      // Különben mentjük az ideiglenes rendelést az adatbázisba
      await saveTemporaryOrderToDatabase();
    }
  }
};

// Rendelés végösszege
const orderTotal = computed(() => {
  const order = activeTab.value === 'delivery' ? deliveryData.value : activeOrder.value;
  return order.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
});

// Kedvezmény összege
const discountAmount = computed(() => {
  const subtotal = orderTotal.value;
  return Math.round(subtotal * (discountPercent.value / 100));
});

// Végösszeg kedvezménnyel
const finalTotal = computed(() => {
  const subtotal = orderTotal.value;
  const extras = (activeTab.value === 'delivery' ? 500 : 0) + 
                (activeTab.value === 'takeaway' || activeTab.value === 'delivery' ? 200 : 0);
  return subtotal - discountAmount.value + extras;
});

// Rendelés mentése
const saveOrder = async () => {
  try {
    const order = activeTab.value === 'delivery' ? deliveryData.value : activeOrder.value;
    
    if (activeTab.value === 'local' && !selectedTable.value) {
      alert('Először válasszon asztalt!');
      return;
    }
    
    if (order.items.length === 0) {
      alert('A rendelés nem tartalmazhat üres tételeket!');
      return;
    }

    // Házhozszállítás validáció
    if (activeTab.value === 'delivery') {
      if (!deliveryData.value.name || !deliveryData.value.address || !deliveryData.value.phone) {
        alert('Kérjük, töltse ki az összes szállítási adatot!');
        return;
      }
      
      if (!deliveryData.value.paymentMethod) {
        alert('Kérjük, válasszon fizetési módot!');
        return;
      }
      
      // Ügyfél mentése az adatbázisba
      try {
        // Ellenőrizzük, hogy létezik-e már ilyen telefonszámú ügyfél
        const existingCustomer = await customerService.getCustomerByPhone(deliveryData.value.phone);
        
        if (existingCustomer) {
          // Frissítjük a meglévő ügyfél adatait
          await customerService.saveCustomer({
            ...existingCustomer,
            name: deliveryData.value.name,
            address: deliveryData.value.address,
            notes: deliveryData.value.notes,
            lastOrderDate: new Date().toISOString()
          });
        } else {
          // Új ügyfél létrehozása
          await customerService.saveCustomer({
            name: deliveryData.value.name,
            address: deliveryData.value.address,
            phone: deliveryData.value.phone,
            notes: deliveryData.value.notes,
            type: 'customer',
            firstOrderDate: new Date().toISOString(),
            lastOrderDate: new Date().toISOString()
          });
        }
        
        // Frissítjük a korábbi ügyfelek listáját
        await loadPreviousCustomers();
      } catch (customerError) {
        console.error('Hiba az ügyfél mentésekor:', customerError);
        // Folytatjuk a rendelés mentését akkor is, ha az ügyfél mentése sikertelen
      }
    }
    
    // Rendelés mentése
    const savedOrder = await orderService.saveOrder({
      ...order,
      type: activeTab.value,
      status: 'active',
      createdAt: new Date().toISOString(),
      discountPercent: discountPercent.value,
      discountAmount: discountAmount.value,
      subtotal: orderTotal.value,
      total: finalTotal.value
    });
    
    // Ha helyi rendelés, frissítjük az asztal státuszát
    if (activeTab.value === 'local') {
      try {
        await tableService.updateTableStatus(selectedTable.value._id, 'occupied');
        // Frissítjük a helyi asztal státuszát is
        const updatedTable = await tableService.getTableById(selectedTable.value._id);
        const tableIndex = tables.value.findIndex(t => t._id === selectedTable.value._id);
        if (tableIndex !== -1 && updatedTable) {
          tables.value[tableIndex] = updatedTable;
        }
        
        // Töröljük az ideiglenes rendelést az adatbázisból
        await deleteTemporaryOrderFromDatabase(selectedTable.value._id);
      } catch (error) {
        console.error('Hiba az asztal státuszának frissítésekor:', error);
        alert('A rendelés mentve, de az asztal státuszának frissítése sikertelen.');
      }
    }
    
    // Ha házhozszállítás, frissítjük a korábbi rendelők listáját
    if (activeTab.value === 'delivery') {
      await loadPreviousCustomers();
    }
    
    // Rendelés törlése
    if (activeTab.value === 'delivery') {
      deliveryData.value = {
        name: '',
        address: '',
        phone: '',
        notes: '',
        items: [],
        paymentMethod: settings.value && settings.value.paymentMethods.length > 0 ? settings.value.paymentMethods[0] : ''
      };
    } else {
      activeOrder.value = {
        tableId: null,
        items: [],
        notes: '',
        type: 'local'
      };
      selectedTable.value = null;
    }
    
    // Kedvezmény visszaállítása
    discountPercent.value = 0;
    
    // Töröljük a mentett rendelési adatokat
    clearOrderFromLocalStorage();
    
    alert('Rendelés sikeresen mentve!');
  } catch (error) {
    console.error('Hiba a rendelés mentésekor:', error);
    alert('Hiba a rendelés mentésekor: ' + error.message);
  }
};

// Rendelés nyomtatása
const printOrder = () => {
  const order = activeTab.value === 'delivery' ? deliveryData.value : activeOrder.value;
  
  if (order.items.length === 0) {
    alert('Nincs aktív rendelés nyomtatáshoz!');
    return;
  }
  
  // Nyomtatási nézet létrehozása
  const printWindow = window.open('', '_blank');
  
  // Fejléc és cím meghatározása
  let title = '';
  let additionalInfo = '';
  
  if (activeTab.value === 'local') {
    title = `Rendelés - ${selectedTable.value?.name || 'Asztal nincs kiválasztva'}`;
  } else if (activeTab.value === 'takeaway') {
    title = 'Elviteles rendelés';
  } else {
    title = 'Házhozszállítás';
    additionalInfo = `
      <div class="customer-info">
        <p><strong>Név:</strong> ${order.name}</p>
        <p><strong>Cím:</strong> ${order.address}</p>
        <p><strong>Telefon:</strong> ${order.phone}</p>
        ${order.notes ? `<p><strong>Megjegyzés:</strong> ${order.notes}</p>` : ''}
      </div>
    `;
  }
  
  // Nyugta generálása
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            padding: 20px; 
            max-width: 800px; 
            margin: 0 auto; 
          }
          h1 { text-align: center; margin-bottom: 20px; }
          .customer-info { 
            margin: 20px 0; 
            padding: 10px; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
          }
          th, td { 
            padding: 8px; 
            text-align: left; 
            border-bottom: 1px solid #ddd; 
          }
          .amount { text-align: right; }
          .total { 
            font-weight: bold; 
            text-align: right; 
            margin-top: 20px; 
            font-size: 1.2em; 
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 0.9em;
          }
          .timestamp {
            text-align: right;
            margin: 10px 0;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        
        <div class="timestamp">
          ${new Date().toLocaleString('hu-HU')}
        </div>
        
        ${additionalInfo}
        
        <table>
          <thead>
            <tr>
              <th>Tétel</th>
              <th>Mennyiség</th>
              <th class="amount">Egységár</th>
              <th class="amount">Összesen</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td class="amount">${item.price} Ft</td>
                <td class="amount">${item.price * item.quantity} Ft</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${activeTab.value === 'delivery' ? `
          <div class="amount">
            <p>Kiszállítási díj: 500 Ft</p>
          </div>
        ` : ''}
        
        ${activeTab.value === 'takeaway' || activeTab.value === 'delivery' ? `
          <div class="amount">
            <p>Csomagolási díj: 200 Ft</p>
          </div>
        ` : ''}
        
        ${discountPercent.value > 0 ? `
          <div class="discount">
            <p>Kedvezmény (${discountPercent.value}%): -${discountAmount.value} Ft</p>
          </div>
        ` : ''}
        
        <div class="total">
          Végösszeg: ${finalTotal.value} Ft
        </div>
        
        <div class="footer">
          <p>Köszönjük a vásárlást!</p>
          ${activeTab.value === 'delivery' ? '<p>Jó étvágyat kívánunk!</p>' : ''}
        </div>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
};

// Méret vagy feltét kiválasztása
const selectItemOptions = async (item) => {
  if (item.sizes || item.toppings) {
    selectedItemForOptions.value = item;
    selectedSize.value = item.sizes ? item.sizes[0] : null;
    selectedToppings.value = [];
    toppingSearchQuery.value = ''; // Feltét kereső törlése
    showOptionsModal.value = true;
  } else {
    await addItemToOrder(item);
  }
};

// Szűrt feltétek a keresés alapján
const filteredToppings = computed(() => {
  // Ha nincs beállítva a settings vagy nincs extraToppings, üres tömböt adunk vissza
  if (!settings.value || !settings.value.extraToppings) {
    return [];
  }
  
  // Ha nincs keresési szöveg, az összes feltétet visszaadjuk
  if (!toppingSearchQuery.value.trim()) {
    return settings.value.extraToppings;
  }
  
  // Keresés a feltétek között
  const searchText = toppingSearchQuery.value.toLowerCase().trim();
  return settings.value.extraToppings.filter(topping => 
    topping.name.toLowerCase().includes(searchText)
  );
});

// Feltét ár megjelenítése (méretfüggő árazás esetén)
const getDisplayPrice = (topping) => {
  // Ha nincs kiválasztott méret vagy nincs méretfüggő árazás, az alapárat használjuk
  if (!selectedSize.value || !topping.prices || !settings.value || settings.value.pizzaPricingType !== 'custom') {
    return topping.price;
  }
  
  // Ha van méretfüggő ár a kiválasztott mérethez, azt használjuk
  const sizeId = selectedSize.value.id;
  return topping.prices[sizeId] || topping.price;
};

// Feltét ki/bekapcsolása
const toggleTopping = (topping) => {
  const index = selectedToppings.value.findIndex(t => t.id === topping.id);
  if (index === -1) {
    selectedToppings.value.push(topping);
  } else {
    selectedToppings.value.splice(index, 1);
  }
};

// Tétel hozzáadása opciókkal
const addItemWithOptions = async () => {
  try {
    if (!selectedItemForOptions.value) return;
    
    // Ha helyi rendelés és nincs kiválasztott asztal, nem tudunk rendelést felvenni
    if (activeTab.value === 'local' && !selectedTable.value) {
      alert('Kérjük, válasszon asztalt a rendelés felvételéhez!');
      return;
    }
    
    // Helyi rendelés esetén ellenőrizzük, hogy ez-e az első tétel és az asztal szabad-e
    if (activeTab.value === 'local' && 
        (!activeOrder.value.items || activeOrder.value.items.length === 0) && 
        selectedTable.value.status === 'free') {
      try {
        // Importáljuk a couchDBService-t
        const { default: couchDBService } = await import('../services/couchdb-service.js');
        
        // Asztal státuszának frissítése foglaltra közvetlenül a couchDBService-en keresztül
        const result = await couchDBService.updateTableStatus(selectedTable.value._id, 'occupied');
        
        // Frissítjük a kiválasztott asztalt
        const updatedTable = await couchDBService.getTableById(selectedTable.value._id);
        selectedTable.value = updatedTable;
      } catch (tableError) {
        console.error('Hiba az asztal státuszának frissítésekor:', tableError);
        // Folytatjuk a rendelés felvételét akkor is, ha az asztal státuszának frissítése sikertelen
      }
    }
    
    // Tétel másolása, hogy ne módosítsuk az eredetit
    const newItem = { ...selectedItemForOptions.value };
    
    // Alapértelmezett mennyiség
    newItem.quantity = 1;
    
    // Méret beállítása
    if (selectedSize.value) {
      const size = selectedItemForOptions.value.sizes.find(s => s.name === selectedSize.value.name);
      if (size) {
        newItem.price = size.price;
        newItem.selectedSize = size.name;
      }
    }
    
    // Feltétek beállítása
    if (selectedToppings.value.length > 0) {
      newItem.selectedToppings = [...selectedToppings.value];
      
      // Feltétek árának hozzáadása
      newItem.selectedToppings.forEach(topping => {
        newItem.price += getDisplayPrice(topping);
      });
    }
    
    // Tétel hozzáadása a rendeléshez
    if (!activeOrder.value.items) {
      activeOrder.value.items = [];
    }
    
    // Házhozszállítás esetén a deliveryData-ba tesszük a tételt
    if (activeTab.value === 'delivery') {
      if (!deliveryData.value.items) {
        deliveryData.value.items = [];
      }
      
      // Ellenőrizzük, hogy a tétel már szerepel-e a rendelésben
      const existingItemIndex = deliveryData.value.items.findIndex(i => 
        i._id === newItem._id && 
        i.selectedSize === newItem.selectedSize &&
        JSON.stringify(i.selectedToppings || []) === JSON.stringify(newItem.selectedToppings || [])
      );
      
      if (existingItemIndex !== -1) {
        // Ha már szerepel, növeljük a mennyiséget
        deliveryData.value.items[existingItemIndex].quantity += 1;
      } else {
        // Ha még nem szerepel, hozzáadjuk
        deliveryData.value.items.push(newItem);
      }
    } else {
      // Ellenőrizzük, hogy a tétel már szerepel-e a rendelésben
      const existingItemIndex = activeOrder.value.items.findIndex(i => 
        i._id === newItem._id && 
        i.selectedSize === newItem.selectedSize &&
        JSON.stringify(i.selectedToppings || []) === JSON.stringify(newItem.selectedToppings || [])
      );
      
      if (existingItemIndex !== -1) {
        // Ha már szerepel, növeljük a mennyiséget
        activeOrder.value.items[existingItemIndex].quantity += 1;
      } else {
        // Ha még nem szerepel, hozzáadjuk
        activeOrder.value.items.push(newItem);
      }
    }
    
    // Mentjük a rendelési adatokat localStorage-ba
    saveOrderToLocalStorage();
    
    // Mentjük az ideiglenes rendelést az adatbázisba is (csak helyi rendelés esetén)
    if (activeTab.value === 'local') {
      await saveTemporaryOrderToDatabase();
    }
    
    // Nem mentjük automatikusan a rendelést, csak ha a felhasználó a mentés gombra kattint
    // await saveOrder();
    // await loadData();
    
    // Opciók ablak bezárása
    showOptionsModal.value = false;
    
    // Kiválasztott tétel törlése
    selectedItemForOptions.value = null;
    selectedSize.value = null;
    selectedToppings.value = [];
    toppingSearchQuery.value = ''; // Feltét kereső törlése
  } catch (error) {
    console.error('Hiba a tétel hozzáadásakor:', error);
    alert('Hiba a tétel hozzáadásakor: ' + error.message);
  }
};

// Komponens betöltésekor
onMounted(() => {
  loadData();
  
  // Eseménykezelő hozzáadása a dropdown bezárásához
  document.addEventListener('click', handleClickOutside);
});

// Komponens megsemmisítésekor
onUnmounted(() => {
  // Eseménykezelő eltávolítása
  document.removeEventListener('click', handleClickOutside);
});

// Tab váltás figyelése
watch(activeTab, (newTab) => {
  // Mentjük az aktív tabot
  localStorage.setItem('activeTab', newTab);
});

// Rendelés jegyzetek figyelése
watch(() => activeOrder.value.notes, (newNotes) => {
  // Mentjük a rendelési adatokat localStorage-ba
  saveOrderToLocalStorage();
  
  // Ha helyi rendelés és van kiválasztott asztal és van tétel a rendelésben
  if (activeTab.value === 'local' && selectedTable.value && activeOrder.value.items.length > 0) {
    // Mentjük az ideiglenes rendelést az adatbázisba
    saveTemporaryOrderToDatabase();
  }
});

// Kedvezmény figyelése
watch(discountPercent, (newDiscount) => {
  // Mentjük a rendelési adatokat localStorage-ba
  saveOrderToLocalStorage();
  
  // Ha helyi rendelés és van kiválasztott asztal és van tétel a rendelésben
  if (activeTab.value === 'local' && selectedTable.value && activeOrder.value.items.length > 0) {
    // Mentjük az ideiglenes rendelést az adatbázisba
    saveTemporaryOrderToDatabase();
  }
});

// Kattintás kezelése a dropdown-on kívül
const handleClickOutside = (event) => {
  const customerSearchContainer = document.querySelector('.customer-search-container');
  const customersDropdown = document.querySelector('.customers-dropdown');
  
  if (customerSearchContainer && customersDropdown) {
    if (!customerSearchContainer.contains(event.target) && !customersDropdown.contains(event.target)) {
      showCustomersList.value = false;
    }
  }
};
</script>

<template>
  <div class="orders-view">
    <h1>Rendelések kezelése</h1>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
      <button @click="loadData" class="retry-btn">Újrapróbálkozás</button>
    </div>
    
    <div v-if="isLoading" class="loading">
      Adatok betöltése...
    </div>
    
    <div v-else class="orders-container">
      <!-- Tabs -->
      <div class="order-tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'local' }]"
          @click="activeTab = 'local'"
        >
          Helyi fogyasztás
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'takeaway' }]"
          @click="activeTab = 'takeaway'"
        >
          Elvitel
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'delivery' }]"
          @click="activeTab = 'delivery'"
        >
          Házhozszállítás
        </button>
      </div>
      
      <div class="order-content">
        <!-- Asztalok (csak helyi fogyasztásnál) -->
        <div v-if="activeTab === 'local'" class="tables-section">
          <h2>Asztalok</h2>
          <div class="tables-grid">
            <div 
              v-for="table in tables" 
              :key="table._id"
              class="table-item"
              :class="[
                table.status,
                { selected: selectedTable && selectedTable._id === table._id }
              ]"
              @click="selectTable(table)"
            >
              <div class="table-name">{{ table.name }}</div>
              <div class="table-seats">{{ table.seats }} fő</div>
            </div>
          </div>
        </div>
        
        <!-- Házhozszállítási adatok -->
        <div v-if="activeTab === 'delivery'" class="delivery-section">
          <h2>Szállítási adatok</h2>
          
          <!-- Korábbi rendelők kiválasztása -->
          <div class="previous-customers-section">
            <div class="customer-search-container">
              <input 
                type="text" 
                v-model="customerSearchQuery" 
                placeholder="Keresés név, cím vagy telefonszám alapján..." 
                class="customer-search-input"
                @focus="showCustomersList = true"
              >
              <button 
                class="customer-search-btn"
                @click="showCustomersList = !showCustomersList"
                title="Korábbi rendelők keresése"
              >
                <span v-if="!showCustomersList">▼</span>
                <span v-else>▲</span>
              </button>
            </div>
            
            <div v-if="showCustomersList" class="customers-dropdown">
              <div v-if="filteredCustomers.length === 0" class="no-customers">
                <p>Nincs találat vagy még nem volt korábbi rendelés</p>
              </div>
              <div 
                v-else
                v-for="customer in filteredCustomers" 
                :key="customer.phone"
                class="customer-item"
                @click="selectCustomer(customer)"
              >
                <div class="customer-details">
                  <div class="customer-name">{{ customer.name }}</div>
                  <div class="customer-address">{{ customer.address }}</div>
                  <div class="customer-phone">{{ customer.phone }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="delivery-form">
            <div class="form-group">
              <label for="customer-name">Név:</label>
              <input 
                type="text" 
                id="customer-name" 
                v-model="deliveryData.name"
                required
              >
            </div>
            
            <div class="form-group">
              <label for="delivery-address">Cím:</label>
              <input 
                type="text" 
                id="delivery-address" 
                v-model="deliveryData.address"
                required
              >
            </div>
            
            <div class="form-group">
              <label for="phone-number">Telefonszám:</label>
              <input 
                type="tel" 
                id="phone-number" 
                v-model="deliveryData.phone"
                required
              >
            </div>
            
            <div class="form-group">
              <label>Fizetési mód:</label>
              <div class="payment-methods" v-if="settings && settings.paymentMethods">
                <div 
                  v-for="methodId in settings.paymentMethods" 
                  :key="methodId"
                  class="payment-method"
                >
                  <input 
                    type="radio" 
                    :id="'payment-' + methodId" 
                    :value="methodId"
                    v-model="deliveryData.paymentMethod"
                    required
                  >
                  <label :for="'payment-' + methodId">
                    {{ methodId === 'cash' ? 'Készpénz' : methodId === 'card' ? 'Bankkártya' : methodId }}
                  </label>
                </div>
              </div>
              <div v-else class="empty-message">
                Nincsenek fizetési módok beállítva.
              </div>
            </div>
            
            <div class="form-group">
              <label for="delivery-notes">Megjegyzés:</label>
              <textarea 
                id="delivery-notes" 
                v-model="deliveryData.notes"
                rows="2"
              ></textarea>
            </div>
          </div>
        </div>
        
        <!-- Menü -->
        <div class="menu-section">
          <h2>Menü</h2>
          
          <!-- Kategóriák -->
          <div class="categories-list">
            <button 
              v-for="category in menuCategories" 
              :key="category._id"
              class="category-btn"
              :class="{ active: activeCategory && activeCategory._id === category._id }"
              @click="changeCategory(category)"
            >
              {{ category.name }}
            </button>
          </div>
          
          <!-- Keresőmező -->
          <div class="search-container">
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Keresés a menüben..." 
              class="search-input"
            >
            <button 
              v-if="searchQuery" 
              @click="searchQuery = ''" 
              class="clear-search-btn"
              title="Keresés törlése"
            >
              ✕
            </button>
          </div>
          
          <!-- Menüelemek -->
          <div class="menu-items-grid">
            <div v-if="filteredMenuItems.length === 0" class="no-results">
              <p>Nincs találat a keresési feltételeknek megfelelően</p>
              <button @click="searchQuery = ''" class="reset-search-btn">Keresés törlése</button>
            </div>
            <div 
              v-else
              v-for="item in filteredMenuItems" 
              :key="item._id"
              class="menu-item"
              :class="{ 'has-options': item.sizes || item.toppings }"
              @click="selectItemOptions(item)"
            >
              <div class="item-content">
                <div class="item-name">
                  {{ item.name }}
                  <span v-if="item.sizes || item.toppings" class="options-badge">
                    <span v-if="item.sizes">🔄</span>
                    <span v-if="item.toppings">✨</span>
                  </span>
                </div>
                <div class="item-price">
                  {{ item.sizes ? `${item.sizes[0].price} Ft-tól` : `${item.price} Ft` }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Aktív rendelés -->
        <div class="active-order-section">
          <h2>
            {{ activeTab === 'local' ? 'Rendelés - ' + (selectedTable?.name || 'Nincs kiválasztva asztal') :
               activeTab === 'takeaway' ? 'Elviteles rendelés' : 'Házhozszállítás' }}
          </h2>
          
          <div class="order-items">
            <div v-if="(activeTab === 'delivery' ? deliveryData.items : activeOrder.items).length === 0" class="empty-order">
              Még nincsenek tételek a rendelésben
            </div>
            
            <div v-else class="order-item" v-for="item in (activeTab === 'delivery' ? deliveryData.items : activeOrder.items)" :key="item._id">
              <div class="item-details">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-price">{{ item.price * item.quantity }} Ft</span>
              </div>
              
              <div class="item-quantity">
                <button @click="updateItemQuantity(item, -1)">-</button>
                <span>{{ item.quantity }}</span>
                <button @click="updateItemQuantity(item, 1)">+</button>
              </div>
            </div>
          </div>
          
          <div class="order-summary">
            <div class="order-total">
              Végösszeg: {{ finalTotal }} Ft
              <div v-if="activeTab === 'delivery'" class="delivery-fees">
                <small>Kiszállítási díj: 500 Ft</small>
                <br>
                <small>Csomagolási díj: 200 Ft</small>
              </div>
              <div v-if="activeTab === 'takeaway'" class="takeaway-fees">
                <small>Csomagolási díj: 200 Ft</small>
              </div>
              <div v-if="discountPercent > 0" class="discount-info">
                <small>Kedvezmény ({{ discountPercent }}%): -{{ discountAmount }} Ft</small>
              </div>
              <div class="calculation-details">
                <small v-if="activeTab !== 'local'">
                  Számítás: {{ orderTotal }} Ft (tételek) 
                  <span v-if="discountPercent > 0">- {{ discountAmount }} Ft (kedvezmény)</span>
                  <span v-if="activeTab === 'takeaway'"> + 200 Ft (csomagolás)</span>
                  <span v-if="activeTab === 'delivery'"> + 500 Ft (kiszállítás) + 200 Ft (csomagolás)</span>
                  = {{ finalTotal }} Ft
                </small>
              </div>
            </div>
            
            <div class="discount-controls">
              <label for="discount-percent">Kedvezmény (%):</label>
              <div class="discount-input-group">
                <input 
                  type="number" 
                  id="discount-percent" 
                  v-model="discountPercent" 
                  min="0" 
                  max="100"
                  step="1"
                >
                <button @click="discountPercent = 0" class="clear-discount-btn" title="Kedvezmény törlése">✕</button>
              </div>
            </div>
            
            <div class="order-actions">
              <button class="primary-btn" @click="saveOrder">
                {{ activeTab === 'delivery' ? 'Rendelés leadása' : 'Rendelés mentése' }}
              </button>
              <button class="secondary-btn" @click="printOrder">Nyomtatás</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Méret és feltét választó modal -->
    <div v-if="showOptionsModal" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ selectedItemForOptions?.name }}</h3>
        
        <!-- Méretek -->
        <div v-if="selectedItemForOptions?.sizes" class="options-section">
          <h4>Válasszon méretet:</h4>
          <div class="size-options">
            <button
              v-for="size in selectedItemForOptions.sizes"
              :key="size.id"
              class="size-btn"
              :class="{ active: selectedSize?.id === size.id }"
              @click="selectedSize = size"
            >
              {{ size.name }} ({{ size.price }} Ft)
            </button>
          </div>
        </div>
        
        <!-- Feltétek -->
        <div v-if="selectedItemForOptions?.toppings" class="options-section">
          <h4>Extra feltétek:</h4>
          
          <!-- Feltét kereső -->
          <div class="topping-search-container">
            <input 
              type="text" 
              v-model="toppingSearchQuery" 
              placeholder="Feltét keresése..." 
              class="topping-search-input"
            >
            <button 
              v-if="toppingSearchQuery" 
              @click="toppingSearchQuery = ''" 
              class="clear-topping-search-btn"
              title="Keresés törlése"
            >
              ✕
            </button>
          </div>
          
          <div class="toppings-list">
            <label
              v-for="topping in filteredToppings"
              :key="topping.id"
              class="topping-item"
            >
              <input
                type="checkbox"
                :checked="selectedToppings.some(t => t.id === topping.id)"
                @change="toggleTopping(topping)"
              >
              {{ topping.name }} (+{{ getDisplayPrice(topping) }} Ft)
            </label>
            
            <div v-if="filteredToppings.length === 0" class="no-toppings-found">
              Nincs találat a keresési feltételeknek megfelelően
            </div>
          </div>
        </div>
        
        <!-- Ár összesítés -->
        <div class="modal-total">
          Végösszeg: {{ 
            (selectedSize?.price || selectedItemForOptions?.price || 0) +
            selectedToppings.reduce((sum, t) => sum + getDisplayPrice(t), 0)
          }} Ft
        </div>
        
        <!-- Modal gombok -->
        <div class="modal-actions">
          <button class="secondary-btn" @click="showOptionsModal = false">Mégse</button>
          <button class="primary-btn" @click="addItemWithOptions">Hozzáadás</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orders-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  max-width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
}

.orders-view h1 {
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

.orders-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Tabs */
.order-tabs {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid #ddd;
  padding-bottom: 1rem;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  background-color: #f0f0f0;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.tab-btn.active {
  background-color: var(--primary-color);
  color: white;
}

/* Order content */
.order-content {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 1.5rem;
  width: 100%;
  height: auto;
  overflow: visible;
}

/* Tables section */
.tables-section {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  height: 500px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  overflow-y: auto;
  padding-right: 0.5rem;
  flex: 1;
}

.table-item {
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.table-item.free {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.table-item.occupied {
  background-color: #ffebee;
  color: #c62828;
}

.table-item.reserved {
  background-color: #fff3e0;
  color: #ef6c00;
}

.table-item.selected {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  background-color: #B0E0E6;
}

.table-name {
  font-weight: bold;
}

.table-seats {
  font-size: 0.9rem;
  color: #666;
}

/* Menu section */
.menu-section {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 500px;
  overflow: hidden;
  max-height: 100%;
}

.categories-list {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  flex-shrink: 0;
}

.category-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #f0f0f0;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s;
}

.category-btn.active {
  background-color: var(--primary-color);
  color: white;
}

.search-container {
  position: relative;
  margin-bottom: 1rem;
  width: 100%;
  flex-shrink: 0;
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

.no-results {
  grid-column: 1 / -1;
  text-align: center;
  padding: 2rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  color: #666;
}

.no-results p {
  margin-bottom: 1rem;
  font-style: italic;
}

.reset-search-btn {
  padding: 0.5rem 1rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.reset-search-btn:hover {
  background-color: var(--secondary-color);
}

.menu-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  overflow-y: auto;
  padding-right: 0.5rem;
  flex: 1;
  min-height: 0;
  max-height: calc(100% - 120px);
}

.menu-item {
  background-color: #f5f5f5;
  padding: 0.5rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  border: 1px solid #eee;
  height: auto;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.menu-item.has-options {
  border-color: var(--primary-color);
}

.menu-item:hover {
  background-color: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.options-badge {
  display: inline-flex;
  gap: 0.25rem;
  margin-left: 0.25rem;
  font-size: 0.8rem;
}

.item-name {
  font-weight: bold;
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  margin-bottom: 0;
  margin-right: 0.5rem;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #333;
}

.item-price {
  color: var(--primary-color);
  font-size: 0.8rem;
  white-space: nowrap;
  font-weight: bold;
}

/* Active order section */
.active-order-section {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  min-height: 100%;
  height: auto;
  overflow: visible;
}

.order-items {
  margin: 1rem 0;
  padding-right: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: visible;
}

.empty-order {
  text-align: center;
  color: #666;
  font-style: italic;
  margin: 2rem 0;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-quantity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-quantity button {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background-color: #f0f0f0;
  cursor: pointer;
}

.order-summary {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.order-total {
  font-size: 1.2rem;
  font-weight: bold;
  text-align: right;
  margin-bottom: 1rem;
}

.order-actions {
  display: flex;
  gap: 1rem;
}

.primary-btn, .secondary-btn {
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

.secondary-btn {
  background-color: #f0f0f0;
}

/* Delivery section */
.delivery-section {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  height: 500px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.delivery-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: bold;
}

input, textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

textarea {
  resize: vertical;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #666;
}

/* Responsive design */
@media (max-width: 1200px) {
  .order-content {
    grid-template-columns: 1fr 1fr;
    height: auto;
  }
  
  .active-order-section {
    grid-column: span 2;
    min-height: auto;
    height: auto;
  }

  .menu-section, .tables-section, .delivery-section {
    height: 500px;
  }
}

@media (max-width: 768px) {
  .order-content {
    grid-template-columns: 1fr;
  }
  
  .active-order-section {
    grid-column: span 1;
    min-height: auto;
    height: auto;
  }
  
  .menu-section, .tables-section, .delivery-section {
    height: 400px;
  }
  
  .order-tabs {
    flex-wrap: wrap;
  }
  
  .tab-btn {
    flex: 1;
    min-width: 120px;
    font-size: 0.9rem;
    padding: 0.5rem 1rem;
  }

  .menu-items-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 480px) {
  .orders-view {
    padding: 0.5rem;
  }

  .menu-items-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.4rem;
  }

  .tables-grid {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 0.5rem;
  }

  h1 {
    font-size: 1.5rem;
  }

  h2 {
    font-size: 1.2rem;
  }

  .primary-btn, .secondary-btn {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
  
  .menu-item {
    padding: 0.4rem 0.6rem;
  }
  
  .item-name {
    font-size: 0.85rem;
  }
  
  .item-price {
    font-size: 0.75rem;
  }
}

/* Fix for iOS Safari 100vh issue */
@supports (-webkit-touch-callout: none) {
  .order-content {
    height: -webkit-fill-available;
  }
}

/* Modal styles */
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

.options-section {
  margin: 1.5rem 0;
}

.options-section h4 {
  margin: 0 0 0.5rem 0;
  color: #666;
}

.size-options {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.size-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.size-btn.active {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.toppings-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.topping-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.topping-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.modal-total {
  margin: 1.5rem 0;
  font-size: 1.2rem;
  font-weight: bold;
  text-align: right;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

@media (max-width: 480px) {
  .modal-content {
    width: 95%;
    padding: 1rem;
  }
  
  .size-btn {
    font-size: 0.9rem;
    padding: 0.4rem 0.8rem;
  }
  
  .modal-total {
    font-size: 1.1rem;
  }
}

.payment-methods {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.payment-method input[type="radio"] {
  margin: 0;
}

.payment-method label {
  margin: 0;
  font-weight: normal;
}

.empty-message {
  font-style: italic;
  color: #666;
  margin-top: 0.5rem;
}

/* Kedvezmény stílusok */
.discount-controls {
  margin: 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.discount-input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.discount-input-group input {
  padding-right: 2rem;
  width: 80px;
}

.clear-discount-btn {
  position: absolute;
  right: 0.5rem;
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

.clear-discount-btn:hover {
  background-color: #eee;
}

.discount-info {
  margin-top: 0.5rem;
  color: #e53935;
}

.takeaway-fees, .delivery-fees {
  margin-top: 0.5rem;
  color: #666;
}

.calculation-details {
  margin-top: 0.8rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #ddd;
  color: #666;
  font-size: 0.9rem;
}

/* Korábbi rendelők kiválasztása */
.previous-customers-section {
  margin-bottom: 1.5rem;
  position: relative;
}

.customer-search-container {
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: 0.5rem;
}

.customer-search-input {
  padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  width: 100%;
  transition: border-color 0.3s;
  background-color: #f9f9f9;
}

.customer-search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(74, 109, 167, 0.2);
}

.customer-search-btn {
  position: absolute;
  right: 0.75rem;
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

.customer-search-btn:hover {
  background-color: #eee;
}

.customers-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
}

.no-customers {
  padding: 1rem;
  text-align: center;
  color: #666;
  font-style: italic;
}

.customer-item {
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.3s;
}

.customer-item:last-child {
  border-bottom: none;
}

.customer-item:hover {
  background-color: #f5f5f5;
}

.customer-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.customer-name {
  font-weight: bold;
  color: var(--primary-color);
}

.customer-address, .customer-phone {
  font-size: 0.9rem;
  color: #666;
}

@media (max-width: 480px) {
  .customers-dropdown {
    max-height: 250px;
  }
  
  .customer-item {
    padding: 0.5rem;
  }
}

/* Feltét kereső stílusok */
.topping-search-container {
  position: relative;
  margin-bottom: 1rem;
  width: 100%;
}

.topping-search-input {
  padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  width: 100%;
  transition: border-color 0.3s;
  background-color: #f9f9f9;
}

.topping-search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(74, 109, 167, 0.2);
}

.clear-topping-search-btn {
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

.clear-topping-search-btn:hover {
  background-color: #eee;
}

.no-toppings-found {
  text-align: center;
  padding: 1rem;
  color: #666;
  font-style: italic;
  background-color: #f9f9f9;
  border-radius: 4px;
  margin-top: 0.5rem;
}

.toppings-list {
  max-height: 200px;
  overflow-y: auto;
  padding-right: 0.5rem;
}
</style> 