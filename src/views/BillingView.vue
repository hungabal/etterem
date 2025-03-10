<script setup>
// Számlázás nézet
// Ez a komponens felelős a számlák és nyugták kezeléséért
// Itt lehet rendelésekből számlákat készíteni, nyugtákat nyomtatni és a korábbi számlákat megtekinteni

// Szükséges Vue komponensek és szolgáltatások importálása
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { orderService, tableService, invoiceService, initializeDatabase, settingsService, courierService, customerService } from '../services/db.js';

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

// Archivált rendelések
// A rendszerben tárolt archivált rendelések listája
const archivedOrders = ref([]);

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

// Futárok adatai
// A rendszerben tárolt futárok listája
const couriers = ref([]);

// Futár kiválasztó modal
// showCourierModal: Jelzi, hogy látható-e a futár kiválasztó modal
// selectedOrderForCourier: A rendelés, amelyhez futárt rendelünk
// courierSearchQuery: Futárok kereséséhez használt szöveg
const showCourierModal = ref(false);
const selectedOrderForCourier = ref(null);
const courierSearchQuery = ref('');

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
    
    // Futárok betöltése
    try {
      couriers.value = await courierService.getAllCouriers();
    } catch (error) {
      console.error('Hiba a futárok betöltésekor:', error);
      couriers.value = [];
    }
    
    // Rendelésekhez hozzáadjuk az asztalok adatait és biztosítjuk a típus konzisztenciáját
    orders.forEach(order => {
      // Asztal adatok hozzáadása
      if (order.tableId) {
        const table = tables.find(t => t._id === order.tableId);
        if (table) {
          order.tableName = table.name;
          order.tableSeats = table.seats || table.capacity || 0;
        }
      }
      
      // Típus konzisztencia biztosítása
      if (order.orderType && !order.type) {
        // Ha csak orderType van, de type nincs, akkor konvertáljuk
        if (order.orderType === 'dine_in') {
          order.type = 'local';
        } else {
          order.type = order.orderType;
        }
      } else if (!order.type) {
        // Ha nincs típus megadva, alapértelmezetten helyi fogyasztás
        order.type = 'local';
      }
    });
    
    activeOrders.value = orders;

    // Korábbi számlák betöltése
    // A rendszerben tárolt korábbi számlák lekérése
    const invoicesList = await invoiceService.getInvoices();
    
    // Számlák típus konzisztenciájának biztosítása
    invoicesList.forEach(invoice => {
      if (invoice.orderType && !invoice.type) {
        // Ha csak orderType van, de type nincs, akkor konvertáljuk
        if (invoice.orderType === 'dine_in') {
          invoice.type = 'local';
        } else {
          invoice.type = invoice.orderType;
        }
      } else if (!invoice.type) {
        // Ha nincs típus megadva, alapértelmezetten helyi fogyasztás
        invoice.type = 'local';
      }
    });
    
    invoices.value = invoicesList;

    // Archivált rendelések betöltése
    // A rendszerben tárolt archivált rendelések lekérése
    try {
      const archivedOrdersList = await orderService.getArchivedOrders();
      
      // Archivált rendelések típus konzisztenciájának biztosítása
      archivedOrdersList.forEach(order => {
        if (order.orderType && !order.type) {
          // Ha csak orderType van, de type nincs, akkor konvertáljuk
          if (order.orderType === 'dine_in') {
            order.type = 'local';
          } else {
            order.type = order.orderType;
          }
        } else if (!order.type) {
          // Ha nincs típus megadva, alapértelmezetten helyi fogyasztás
          order.type = 'local';
        }
      });
      
      archivedOrders.value = archivedOrdersList;
    } catch (error) {
      console.error('Hiba az archivált rendelések betöltésekor:', error);
      // Nem szakítjuk meg a folyamatot, ha az archivált rendelések betöltése sikertelen
      archivedOrders.value = [];
    }

    isLoading.value = false;
  } catch (error) {
    console.error('Hiba az adatok betöltésekor:', error);
    errorMessage.value = 'Hiba az adatok betöltésekor: ' + error.message;
    isLoading.value = false;
  }
};

// Komponens betöltésekor adatok lekérése és eseménykezelők beállítása
// Ez a hook akkor fut le, amikor a komponens bekerül a DOM-ba
onMounted(() => {
  loadData();
  
  // Eseménykezelő hozzáadása a dokumentumra
  document.addEventListener('click', handleDocumentClick);
});

// Komponens eltávolításakor eseménykezelők eltávolítása
// Ez a hook akkor fut le, amikor a komponens kikerül a DOM-ból
onUnmounted(() => {
  // Eseménykezelő eltávolítása a dokumentumról
  document.removeEventListener('click', handleDocumentClick);
});

// Dokumentumra történő kattintás kezelése
// Ha nem egy rendelésre történik a kattintás, akkor töröljük a kiválasztást
const handleDocumentClick = (event) => {
  // Ellenőrizzük, hogy a kattintás egy rendelés kártyán történt-e
  const isOrderCardClick = event.target.closest('.order-card');
  const isInvoiceFormClick = event.target.closest('.invoice-form');
  
  // Ha nem rendelés kártyára és nem a számla űrlapra kattintottak, akkor töröljük a kiválasztást
  if (!isOrderCardClick && !isInvoiceFormClick && selectedOrder.value) {
    selectedOrder.value = null;
  }
};

// Rendelés kiválasztása
// Ez a függvény állítja be a kiválasztott rendelést és alaphelyzetbe állítja a számla űrlapot
const selectOrder = async (order) => {
  // Biztosítjuk, hogy a rendelés típusa konzisztens legyen
  if (order.orderType && !order.type) {
    // Ha csak orderType van, de type nincs, akkor konvertáljuk
    if (order.orderType === 'dine_in') {
      order.type = 'local';
    } else {
      order.type = order.orderType;
    }
  } else if (!order.type) {
    // Ha nincs típus megadva, alapértelmezetten helyi fogyasztás
    order.type = 'local';
  }
  
  selectedOrder.value = order;
  
  // Számla adatok alaphelyzetbe állítása
  newInvoice.customerName = '';
  newInvoice.customerTaxNumber = '';
  newInvoice.paymentMethod = 'cash';
  newInvoice.notes = '';
  
  // Ha házhozszállítás, ellenőrizzük, hogy létezik-e már ügyfél a megadott telefonszámmal
  if (order.type === 'delivery' && order.customerPhone) {
    try {
      const existingCustomer = await customerService.getCustomerByPhone(order.customerPhone);
      
      if (existingCustomer) {
        // Ha létezik ügyfél, akkor használjuk az adatait a számla űrlapon
        newInvoice.customerName = existingCustomer.name || '';
        newInvoice.customerTaxNumber = existingCustomer.taxNumber || '';
        
        // Biztosítjuk, hogy a szállítási cím konzisztens legyen
        if (existingCustomer.address && (!order.deliveryAddress || order.deliveryAddress === '')) {
          order.deliveryAddress = existingCustomer.address;
        }
      }
    } catch (error) {
      console.error('Hiba az ügyfél ellenőrzésekor:', error);
      // Nem szakítjuk meg a folyamatot, ha az ügyfél ellenőrzése sikertelen
    }
  }
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
    // Ha házhozszállítás, ellenőrizzük, hogy létezik-e már ügyfél a megadott telefonszámmal
    if (selectedOrder.value.type === 'delivery' && selectedOrder.value.customerPhone) {
      try {
        const existingCustomer = await customerService.getCustomerByPhone(selectedOrder.value.customerPhone);
        
        if (existingCustomer) {
          // Ha létezik ügyfél, akkor használjuk az adatait
          console.log('Meglévő ügyfél adatai használata:', existingCustomer);
          
          // Ha a név üres, akkor használjuk a meglévő ügyfél nevét
          if (!newInvoice.customerName || newInvoice.customerName === '') {
            newInvoice.customerName = existingCustomer.name;
          }
          
          // Biztosítjuk, hogy a szállítási cím és telefonszám konzisztens legyen
          selectedOrder.value.deliveryAddress = existingCustomer.address || selectedOrder.value.deliveryAddress;
          selectedOrder.value.customerPhone = existingCustomer.phone;
          
          // Ha van adószám, azt is átvesszük
          if (existingCustomer.taxNumber && (!newInvoice.customerTaxNumber || newInvoice.customerTaxNumber === '')) {
            newInvoice.customerTaxNumber = existingCustomer.taxNumber;
          }
        } else if (selectedOrder.value.customerPhone && selectedOrder.value.deliveryAddress) {
          // Ha nincs meglévő ügyfél, de van telefonszám és cím, akkor mentsük el az új ügyfelet
          const newCustomer = {
            name: newInvoice.customerName,
            phone: selectedOrder.value.customerPhone,
            address: selectedOrder.value.deliveryAddress,
            taxNumber: newInvoice.customerTaxNumber || '',
            createdAt: new Date().toISOString()
          };
          
          try {
            await customerService.saveCustomer(newCustomer);
            console.log('Új ügyfél mentve:', newCustomer);
          } catch (customerError) {
            console.error('Hiba az új ügyfél mentésekor:', customerError);
            // Nem szakítjuk meg a folyamatot, ha az ügyfél mentése sikertelen
          }
        }
      } catch (customerError) {
        console.error('Hiba az ügyfél ellenőrzésekor:', customerError);
        // Nem szakítjuk meg a folyamatot, ha az ügyfél ellenőrzése sikertelen
      }
    }
    
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
      type: selectedOrder.value.type || 'local',
      orderType: selectedOrder.value.orderType || 'dine_in',
      deliveryAddress: selectedOrder.value.deliveryAddress || '',
      customerPhone: selectedOrder.value.customerPhone || '',
      courierName: selectedOrder.value.courierName || '',
      courierId: selectedOrder.value.courierId || '',
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
  
  // Rendelés típusának formázása
  const orderTypeText = formatOrderType(invoice.type || invoice.orderType || 'local');
  const orderTypeClass = invoice.type || invoice.orderType || 'local';
  
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
          .order-type-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
          }
          .local, .dine_in { background-color: #4CAF50; }
          .takeaway { background-color: #FF9800; }
          .delivery { background-color: #2196F3; }
          .courier-info {
            margin-top: 10px;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1>Számla</h1>
          <h2>${invoice._id}</h2>
          <p>Dátum: ${new Date(invoice.createdAt).toLocaleDateString('hu-HU')} ${new Date(invoice.createdAt).toLocaleTimeString('hu-HU')}</p>
          <div class="order-type-badge ${orderTypeClass}">
            ${orderTypeText}
          </div>
          ${invoice.courierName ? `<div class="courier-info">Futár: ${invoice.courierName}</div>` : ''}
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
            ${invoice.deliveryAddress ? `<p>Szállítási cím: ${invoice.deliveryAddress}</p>` : ''}
            ${invoice.customerPhone ? `<p>Telefon: ${invoice.customerPhone}</p>` : ''}
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

// Rendelés archiválása
const archiveOrder = async (order) => {
  if (confirm('Biztosan archiválni szeretné ezt a rendelést? A rendelés kikerül az aktív rendelések közül.')) {
    try {
      await orderService.archiveOrder(order);
      // Frissítjük a rendelések listáját
      await loadData();
      alert('Rendelés sikeresen archiválva!');
    } catch (error) {
      console.error('Hiba a rendelés archiválásakor:', error);
      alert('Hiba a rendelés archiválásakor: ' + error.message);
    }
  }
};

// Archivált rendelés törlése
const deleteArchivedOrder = async (orderId) => {
  if (confirm('Biztosan törölni szeretné ezt az archivált rendelést? Ez a művelet nem visszavonható!')) {
    try {
      await orderService.deleteArchivedOrder(orderId);
      // Frissítjük a rendelések listáját
      await loadData();
      alert('Archivált rendelés sikeresen törölve!');
    } catch (error) {
      console.error('Hiba az archivált rendelés törlésekor:', error);
      alert('Hiba az archivált rendelés törlésekor: ' + error.message);
    }
  }
};

// Archivált rendelés visszaállítása
const restoreArchivedOrder = async (orderId) => {
  if (confirm('Biztosan visszaállítja ezt a rendelést az aktív rendelések közé?')) {
    try {
      await orderService.restoreArchivedOrder(orderId);
      // Frissítjük a rendelések listáját
      await loadData();
      alert('Rendelés sikeresen visszaállítva az aktív rendelések közé!');
    } catch (error) {
      console.error('Hiba a rendelés visszaállításakor:', error);
      alert('Hiba a rendelés visszaállításakor: ' + error.message);
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

// Szűrt futárok
// A keresési szöveg alapján szűrt futárok listája
const filteredCouriers = computed(() => {
  if (!couriers.value || couriers.value.length === 0) {
    return [];
  }
  
  if (!courierSearchQuery.value) {
    return couriers.value;
  }
  
  const searchText = courierSearchQuery.value.toLowerCase().trim();
  return couriers.value.filter(courier => 
    courier.name.toLowerCase().includes(searchText) || 
    courier.phone.toLowerCase().includes(searchText) ||
    (courier.email && courier.email.toLowerCase().includes(searchText))
  );
});

// Futár kiválasztó modal megnyitása
const openCourierModal = (order) => {
  selectedOrderForCourier.value = order;
  courierSearchQuery.value = '';
  showCourierModal.value = true;
};

// Futár kiválasztása
const selectCourier = async (courier) => {
  if (!selectedOrderForCourier.value) return;
  
  try {
    // Futár adatok hozzáadása a rendeléshez
    selectedOrderForCourier.value.courierId = courier._id;
    selectedOrderForCourier.value.courierName = courier.name;
    
    // Rendelés mentése
    await orderService.saveOrder(selectedOrderForCourier.value);
    
    // Futár státuszának frissítése "foglalt"-ra
    try {
      // Frissítjük a futár státuszát
      await courierService.updateCourierStatus(courier._id, 'busy');
      console.log(`Futár (${courier.name}) státusza frissítve: foglalt`);
    } catch (statusError) {
      console.error('Hiba a futár státuszának frissítésekor:', statusError);
      // Nem szakítjuk meg a folyamatot, ha a státusz frissítése sikertelen
    }
    
    // Modal bezárása
    showCourierModal.value = false;
    
    // Adatok újratöltése
    await loadData();
    
    // Sikeres mentés üzenet
    alert(`Futár (${courier.name}) sikeresen hozzárendelve a rendeléshez!`);
  } catch (error) {
    console.error('Hiba a futár hozzárendelésekor:', error);
    alert('Hiba történt a futár hozzárendelésekor: ' + error.message);
  }
};

// Futár eltávolítása a rendelésből
const removeCourier = async (order) => {
  if (!order) return;
  
  try {
    // Megerősítés kérése
    if (!confirm(`Biztosan eltávolítja a futárt (${order.courierName}) a rendelésből?`)) {
      return;
    }
    
    // Futár ID mentése, mielőtt töröljük a rendelésből
    const courierId = order.courierId;
    const courierName = order.courierName;
    
    // Futár adatok törlése a rendelésből
    order.courierId = null;
    order.courierName = null;
    
    // Rendelés mentése
    await orderService.saveOrder(order);
    
    // Futár státuszának frissítése "elérhető"-re
    if (courierId) {
      try {
        // Frissítjük a futár státuszát
        await courierService.updateCourierStatus(courierId, 'available');
        console.log(`Futár (${courierName}) státusza frissítve: elérhető`);
      } catch (statusError) {
        console.error('Hiba a futár státuszának frissítésekor:', statusError);
        // Nem szakítjuk meg a folyamatot, ha a státusz frissítése sikertelen
      }
    }
    
    // Adatok újratöltése
    await loadData();
    
    // Sikeres törlés üzenet
    alert('Futár sikeresen eltávolítva a rendelésből!');
  } catch (error) {
    console.error('Hiba a futár eltávolításakor:', error);
    alert('Hiba történt a futár eltávolításakor: ' + error.message);
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
    
    <div v-else class="billing-container" @click.stop>
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
              <span class="order-type-badge" :class="order.type || 'local'">
                {{ order.type === 'delivery' ? 'Házhozszállítás' : 
                   order.type === 'takeaway' ? 'Elvitel' : 'Helyi fogyasztás' }}
              </span>
              <span v-if="order.type === 'delivery' && order.courierName" class="courier-badge">
                Futár: {{ order.courierName }}
              </span>
              <span class="order-status-badge" :class="order.status || 'new'">
                {{ order.status === 'new' ? 'Új' : 
                   order.status === 'in-progress' ? 'Folyamatban' : 
                   order.status === 'ready' ? 'Elkészült' : 
                   order.status || 'Új' }}
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
              <button class="select-btn" @click.stop="selectOrder(order)">Kiválasztás</button>
              <button class="archive-btn" @click.stop="archiveOrder(order)">Archiválás</button>
              <button class="delete-btn" @click.stop="deleteOrder(order._id)">Törlés</button>
            </div>
            <div v-if="order.type === 'delivery'" class="courier-actions">
              <button v-if="!order.courierId" @click.stop="openCourierModal(order)" class="courier-btn">
                Futár hozzárendelése
              </button>
              <button v-else @click.stop="removeCourier(order)" class="courier-remove-btn">
                Futár eltávolítása
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Archivált rendelések -->
      <div class="archived-orders-section">
        <h2>Archivált rendelések</h2>
        
        <div v-if="archivedOrders.length === 0" class="no-archived-orders">
          Nincsenek archivált rendelések.
        </div>
        
        <div v-else class="archived-orders-list">
          <div v-for="order in archivedOrders" :key="order._id" class="archived-order-card">
            <div class="order-header">
              <div class="order-table">
                {{ order.tableName || 'Ismeretlen asztal' }}
                <span class="table-seats" v-if="order.tableSeats">({{ order.tableSeats }} fő)</span>
              </div>
              <div class="order-time">
                <div>Létrehozva: {{ formatDate(order.createdAt) }}</div>
                <div>Archiválva: {{ formatDate(order.archivedAt) }}</div>
              </div>
            </div>
            
            <div class="order-type">
              <span class="order-type-badge" :class="order.type || 'local'">
                {{ order.type === 'delivery' ? 'Házhozszállítás' : 
                   order.type === 'takeaway' ? 'Elvitel' : 'Helyi fogyasztás' }}
              </span>
              <span v-if="order.type === 'delivery' && order.courierName" class="courier-badge">
                Futár: {{ order.courierName }}
              </span>
              <span class="order-status-badge" :class="order.status || 'new'">
                {{ order.status === 'new' ? 'Új' : 
                   order.status === 'in-progress' ? 'Folyamatban' : 
                   order.status === 'ready' ? 'Elkészült' : 
                   order.status || 'Új' }}
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
            
            <div class="archived-order-actions">
              <button class="restore-btn" @click="restoreArchivedOrder(order._id)">Visszaállítás</button>
              <button class="delete-btn" @click="deleteArchivedOrder(order._id)">Törlés</button>
            </div>
            <div v-if="order.type === 'delivery'" class="courier-actions">
              <button v-if="!order.courierId" @click.stop="openCourierModal(order)" class="courier-btn">
                Futár hozzárendelése
              </button>
              <button v-else @click.stop="removeCourier(order)" class="courier-remove-btn">
                Futár eltávolítása
              </button>
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
              <span class="order-type-badge" :class="selectedOrder.type || 'local'">
                {{ selectedOrder.type === 'delivery' ? 'Házhozszállítás' : 
                   selectedOrder.type === 'takeaway' ? 'Elvitel' : 'Helyi fogyasztás' }}
              </span>
              <span v-if="selectedOrder.type === 'delivery' && selectedOrder.courierName" class="courier-badge">
                Futár: {{ selectedOrder.courierName }}
              </span>
            </div>
            
            <!-- Szállítási adatok megjelenítése házhozszállítás esetén -->
            <div v-if="selectedOrder.type === 'delivery'" class="delivery-details">
              <div v-if="selectedOrder.deliveryAddress" class="delivery-address">
                <strong>Szállítási cím:</strong> {{ selectedOrder.deliveryAddress }}
              </div>
              <div v-if="selectedOrder.customerPhone" class="customer-phone">
                <strong>Telefonszám:</strong> {{ selectedOrder.customerPhone }}
              </div>
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
              <div class="invoice-order-type">
                <span class="order-type-badge" :class="invoice.type || invoice.orderType || 'local'">
                  {{ invoice.type === 'delivery' ? 'Házhozszállítás' : 
                     invoice.type === 'takeaway' ? 'Elvitel' : 'Helyi fogyasztás' }}
                </span>
                <span v-if="(invoice.type === 'delivery' || invoice.orderType === 'delivery') && invoice.courierName" class="courier-badge">
                  Futár: {{ invoice.courierName }}
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
  
  <!-- Futár kiválasztó modal -->
  <div v-if="showCourierModal" class="modal-overlay">
    <div class="modal-content">
      <h2>Futár kiválasztása</h2>
      
      <div class="courier-search-container">
        <input 
          type="text" 
          v-model="courierSearchQuery" 
          placeholder="Keresés név vagy telefonszám alapján..." 
          class="courier-search-input"
        >
        <button v-if="courierSearchQuery" @click="courierSearchQuery = ''" class="clear-search-btn">✕</button>
      </div>
      
      <div class="couriers-list">
        <div v-if="filteredCouriers.length === 0" class="no-couriers">
          <p>Nincsenek futárok a rendszerben vagy a keresési feltételeknek megfelelő találat.</p>
        </div>
        
        <div v-else class="courier-items">
          <div 
            v-for="courier in filteredCouriers" 
            :key="courier._id" 
            class="courier-item"
            :class="{ 'available': courier.status === 'available', 'busy': courier.status === 'busy', 'offline': courier.status === 'offline' }"
            @click="selectCourier(courier)"
          >
            <div class="courier-details">
              <div class="courier-name">{{ courier.name }}</div>
              <div class="courier-phone">{{ courier.phone }}</div>
              <div class="courier-status">
                {{ courier.status === 'available' ? 'Elérhető' : 
                   courier.status === 'busy' ? 'Foglalt' : 'Nem elérhető' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-actions">
        <button @click="showCourierModal = false" class="cancel-btn">Mégsem</button>
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
  grid-template-columns: 350px 1fr 300px;
  grid-template-rows: auto auto;
  gap: 1.5rem;
}

.active-orders-section {
  grid-column: 1;
  grid-row: 1;
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.invoice-creation-section {
  grid-column: 2;
  grid-row: 1;
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.previous-invoices-section {
  grid-column: 3;
  grid-row: 1;
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.archived-orders-section {
  grid-column: 1 / span 3;
  grid-row: 2;
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

.courier-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  background-color: #E1F5FE;
  color: #0288D1;
  font-weight: bold;
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
  gap: 0.5rem;
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

.delivery-details {
  background-color: #E3F2FD;
  border-radius: 4px;
  padding: 0.75rem;
  margin: 0.75rem 0;
  border-left: 4px solid #2196F3;
}

.delivery-address, .customer-phone {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
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

@media (max-width: 1400px) {
  .billing-container {
    grid-template-columns: 350px 1fr;
    grid-template-rows: auto auto auto;
  }
  
  .active-orders-section {
    grid-column: 1;
    grid-row: 1;
  }
  
  .invoice-creation-section {
    grid-column: 2;
    grid-row: 1;
  }
  
  .previous-invoices-section {
    grid-column: 1 / span 2;
    grid-row: 2;
  }
  
  .archived-orders-section {
    grid-column: 1 / span 2;
    grid-row: 3;
  }
}

@media (max-width: 768px) {
  .billing-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
  }
  
  .active-orders-section {
    grid-column: 1;
    grid-row: 1;
  }
  
  .invoice-creation-section {
    grid-column: 1;
    grid-row: 2;
  }
  
  .previous-invoices-section {
    grid-column: 1;
    grid-row: 3;
  }
  
  .archived-orders-section {
    grid-column: 1;
    grid-row: 4;
  }
}

.archive-btn {
  background-color: #607D8B;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.archive-btn:hover {
  background-color: #455A64;
}

.select-btn {
  background-color: var(--primary-color, #4CAF50);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.select-btn:hover {
  background-color: var(--primary-dark-color, #388E3C);
}

.archived-orders-section {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-top: 1.5rem;
}

.no-archived-orders {
  color: #666;
  font-style: italic;
  text-align: center;
  margin: 2rem 0;
}

.archived-orders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.archived-order-card {
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 1rem;
  border-left: 4px solid #607D8B;
}

.archived-order-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.restore-btn {
  background-color: #607D8B;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.restore-btn:hover {
  background-color: #455A64;
}

.courier-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.courier-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.courier-remove-btn {
  background-color: #F44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.courier-btn:hover {
  background-color: #1976D2;
}

.courier-remove-btn:hover {
  background-color: #D32F2F;
}

/* Futár kiválasztó modal */
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
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-top: 0;
  color: var(--primary-color);
  margin-bottom: 1.5rem;
}

.courier-search-container {
  position: relative;
  margin-bottom: 1rem;
}

.courier-search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.courier-search-input:focus {
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

.couriers-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1rem;
  border: 1px solid #eee;
  border-radius: 4px;
}

.no-couriers {
  padding: 1rem;
  text-align: center;
  color: #666;
  font-style: italic;
}

.courier-items {
  display: flex;
  flex-direction: column;
}

.courier-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.3s;
}

.courier-item:hover {
  background-color: #f5f5f5;
}

.courier-item.available {
  border-left: 4px solid #4CAF50;
}

.courier-item.busy {
  border-left: 4px solid #FF9800;
}

.courier-item.offline {
  border-left: 4px solid #F44336;
}

.courier-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.courier-name {
  font-weight: bold;
}

.courier-phone {
  color: #666;
  font-size: 0.9rem;
}

.courier-status {
  font-size: 0.8rem;
  font-weight: bold;
  color: #666;
}

.courier-item.available .courier-status {
  color: #4CAF50;
}

.courier-item.busy .courier-status {
  color: #FF9800;
}

.courier-item.offline .courier-status {
  color: #F44336;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  background-color: #f0f0f0;
  color: #333;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}

.order-status-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
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
</style> 