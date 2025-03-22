// Import our CouchDB service
import couchDBService from './couchdb-service.js';

// Adatbázis referenciák exportálása más modulok számára (visszafelé kompatibilitás)
// Ezek a változók már nem használatosak, de a visszafelé kompatibilitás miatt megmaradtak
export const menuDB = null;
export const tablesDB = null;
export const ordersDB = null;
export const invoicesDB = null;
export const settingsDB = null;
export const reservationsDB = null;
export const customersDB = null;
export const couriersDB = null;

// Adatbázis inicializálása
// Ez a függvény inicializálja az adatbázis kapcsolatot és ellenőrzi, hogy minden szükséges adat elérhető-e
export const initializeDatabase = async () => {
  try {
    const result = await couchDBService.initialize();
    return result;
  } catch (error) {
    console.error('Hiba az adatbázis inicializálásakor:', error);
    return false;
  }
};

// Menü szolgáltatás
// Az étlap kezeléséhez szükséges funkciók gyűjteménye
export const menuService = {
  // Összes menüelem lekérése
  async getAllItems() {
    return await couchDBService.getAllMenuItems();
  },
  
  // Menüelemek lekérése kategória szerint
  async getItemsByCategory(category) {
    return await couchDBService.getMenuItemsByCategory(category);
  },
  
  // Menü kategóriák lekérése
  async getCategories() {
    return await couchDBService.getMenuCategories();
  },
  
  // Menüelem mentése (új létrehozása vagy meglévő frissítése)
  async saveItem(item) {
    return await couchDBService.saveMenuItem(item);
  },
  
  // Kategória mentése (új létrehozása vagy meglévő frissítése)
  async saveCategory(category) {
    return await couchDBService.saveMenuCategory(category);
  },
  
  // Menüelem törlése
  async deleteItem(id, rev) {
    return await couchDBService.deleteMenuItem(id, rev);
  }
};

// Asztal szolgáltatás
// Az asztalok kezeléséhez szükséges funkciók gyűjteménye
export const tableService = {
  // Összes asztal lekérése
  async getAllTables() {
    return await couchDBService.getAllTables();
  },
  
  // Asztal lekérése azonosító alapján
  async getTableById(id) {
    return await couchDBService.getTableById(id);
  },
  
  // Asztal mentése (új létrehozása vagy meglévő frissítése)
  async saveTable(table) {
    return await couchDBService.saveTable(table);
  },
  
  // Asztal státuszának frissítése
  async updateTableStatus(tableId, status) {
    return await couchDBService.updateTableStatus(tableId, status);
  },
  
  // Asztal törlése
  async deleteTable(id, rev) {
    return await couchDBService.deleteTable(id, rev);
  }
};

// Rendelés szolgáltatás
// A rendelések kezeléséhez szükséges funkciók gyűjteménye
export const orderService = {
  // Aktív rendelések lekérése
  async getActiveOrders() {
    return await couchDBService.getActiveOrders();
  },
  
  // Rendelések lekérése típus szerint (helyben, elvitel, kiszállítás)
  async getOrdersByType(type) {
    return await couchDBService.getOrdersByType(type);
  },
  
  // Rendelések lekérése futár azonosító alapján
  async getOrdersByCourier(courierId) {
    return await couchDBService.getOrdersByCourier(courierId);
  },
  
  // Aktív rendelés lekérése asztal azonosító alapján
  async getActiveOrderByTable(tableId) {
    return await couchDBService.getActiveOrderByTable(tableId);
  },
  
  // Ideiglenes rendelés lekérése asztal azonosító alapján
  async getTemporaryOrderByTable(tableId) {
    return await couchDBService.getTemporaryOrderByTable(tableId);
  },
  
  // Rendelés lekérése azonosító alapján
  async getOrderById(id) {
    return await couchDBService.getOrderById(id);
  },
  
  // Rendelés mentése (új létrehozása vagy meglévő frissítése)
  async saveOrder(order) {
    return await couchDBService.saveOrder(order);
  },
  
  // Rendelés státuszának frissítése
  async updateOrderStatus(id, status) {
    return await couchDBService.updateOrderStatus(id, status);
  },
  
  // Rendelés törlése
  async deleteOrder(id, rev) {
    return await couchDBService.deleteOrder(id, rev);
  },
  
  // Összes rendelés lekérése
  async getAllOrders() {
    try {
      const result = await couchDBService.apiRequest('db/restaurant_orders/_find', 'POST', {
        selector: {},
        limit: 1000
      });
      
      // Ellenőrizzük, hogy a docs tömb létezik-e, és minden elemnek van-e items tulajdonsága
      if (result.docs && Array.isArray(result.docs)) {
        // Biztosítjuk, hogy minden rendelésnek legyen items tulajdonsága
        return result.docs.map(order => {
          if (!order.items) {
            order.items = [];
          }
          return order;
        });
      }
      
      return [];
    } catch (error) {
      console.error('Hiba az összes rendelés lekérésekor:', error);
      return [];
    }
  },
  
  // Rendelés archiválása
  async archiveOrder(order) {
    return await couchDBService.archiveOrder(order);
  },
  
  // Archivált rendelések lekérése
  async getArchivedOrders(limit = 50) {
    return await couchDBService.getArchivedOrders(limit);
  },
  
  // Archivált rendelés törlése
  async deleteArchivedOrder(id) {
    return await couchDBService.deleteArchivedOrder(id);
  },
  
  // Archivált rendelés visszaállítása
  async restoreArchivedOrder(id) {
    return await couchDBService.restoreArchivedOrder(id);
  }
};

// Ügyfél szolgáltatás
// Az ügyfelek/vendégek kezeléséhez szükséges funkciók gyűjteménye
export const customerService = {
  // Összes ügyfél lekérése
  async getAllCustomers() {
    return await couchDBService.getAllCustomers();
  },
  
  // Ügyfél keresése telefonszám alapján
  async getCustomerByPhone(phone) {
    return await couchDBService.getCustomerByPhone(phone);
  },
  
  // Ügyfél mentése (új létrehozása vagy meglévő frissítése)
  async saveCustomer(customer) {
    return await couchDBService.saveCustomer(customer);
  },
  
  // Ügyfél törlése
  async deleteCustomer(id) {
    return await couchDBService.deleteCustomer(id);
  }
};

// Cím szolgáltatás
// A címek kezeléséhez szükséges funkciók gyűjteménye
export const addressService = {
  // Összes cím lekérése
  async getAllAddresses() {
    return await couchDBService.getAllAddresses();
  },

  // Címek keresése szöveg alapján
  async searchAddresses(searchText) {
    return await couchDBService.searchAddresses(searchText);
  },
  
  // Cím mentése (új létrehozása vagy meglévő frissítése)
  async saveAddress(address) {
    return await couchDBService.saveAddress(address);
  },
  
  // Cím törlése
  async deleteAddress(id) {
    return await couchDBService.deleteAddress(id);
  }
};

// Számla szolgáltatás
// A számlák és nyugták kezeléséhez szükséges funkciók gyűjteménye
export const invoiceService = {
  // Számlák lekérése (alapértelmezetten az utolsó 50)
  async getInvoices(limit = 50) {
    return await couchDBService.getInvoices(limit);
  },
  
  // Számla mentése (új létrehozása vagy meglévő frissítése)
  async saveInvoice(invoice) {
    return await couchDBService.saveInvoice(invoice);
  },
  
  // Számla törlése
  async deleteInvoice(id) {
    return await couchDBService.deleteInvoice(id);
  },
  
  // Nyugta nyomtatása
  async printReceipt(order) {
    // Ez a funkció a böngészőben fut, nem kell módosítani
    // Nyugta nyomtatása
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Kérjük, engedélyezze a felugró ablakokat a nyugta nyomtatásához!');
      return;
    }
    
    // Beállítások lekérése az étterem adatokhoz
    const settings = await this.getSettings();
    
    const today = new Date();
    const formattedDate = `${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`;
    const formattedTime = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;
    
    let totalAmount = 0;
    order.items.forEach(item => {
      totalAmount += item.price * item.quantity;
    });
    
    const vatAmount = Math.round(totalAmount * 0.27);
    const netAmount = totalAmount - vatAmount;
    
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nyugta</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 14px; /* Megnövelt betűméret */
            width: 80mm;
            margin: 0;
            padding: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 5px;
          }
          .title {
            font-size: 16px; /* Megnövelt betűméret */
            font-weight: bold;
            margin: 3px 0;
          }
          .info {
            margin: 2px 0;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 5px 0;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .item-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .item-quantity {
            width: 30px;
            text-align: right;
            margin-right: 5px;
          }
          .item-price {
            width: 70px;
            text-align: right;
          }
          .total {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin: 3px 0;
            font-size: 15px; /* Megnövelt betűméret */
          }
          .footer {
            text-align: center;
            margin-top: 5px;
            font-size: 12px;
          }
          .footer p {
            margin: 2px 0;
          }
          @page {
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${settings.restaurantName || 'Pizza Maestro'}</div>
          <div class="info">${settings.address || '1234 Budapest, Példa utca 1.'}</div>
          <div class="info">Tel: ${settings.phone || '+36-1-234-5678'}</div>
          <div class="info">Adószám: ${settings.taxNumber || '12345678-2-42'}</div>
          ${settings.email ? `<div class="info">Email: ${settings.email}</div>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="info">Dátum: ${formattedDate} ${formattedTime}</div>
        <div class="info">Rendelés azonosító: ${order._id}</div>
        <div class="info">Fizetési mód: ${order.paymentMethod === 'cash' ? 'Készpénz' : 'Bankkártya'}</div>
        
        <div class="divider"></div>
        
        ${order.items.map(item => `
          <div class="item">
            <div class="item-name">${item.name}</div>
            <div class="item-quantity">${item.quantity}x</div>
            <div class="item-price">${item.price} Ft</div>
          </div>
        `).join('')}
        
        <div class="divider"></div>
        
        <div class="total">
          <div>Összesen:</div>
          <div>${totalAmount} Ft</div>
        </div>
        <div class="info">Nettó: ${netAmount} Ft</div>
        <div class="info">ÁFA (27%): ${vatAmount} Ft</div>
        
        <div class="divider"></div>
        
        <div class="footer">
          Köszönjük, hogy nálunk vásárolt!<br>
          ${settings.email ? settings.email : 'www.pizzamaestro.hu'}
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    
    // Kis késleltetés a nyomtatás előtt, hogy a tartalom betöltődjön
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
};

// Beállítások szolgáltatás
export const settingsService = {
  async getSettings() {
    return await couchDBService.getSettings();
  },
  
  async saveSettings(settings) {
    return await couchDBService.saveSettings(settings);
  }
};

// Foglalás szolgáltatás
export const reservationService = {
  async getReservationsByDate(date) {
    return await couchDBService.getReservationsByDate(date);
  },
  
  async getActiveReservations() {
    return await couchDBService.getActiveReservations();
  },
  
  async saveReservation(reservation) {
    return await couchDBService.saveReservation(reservation);
  },
  
  async updateReservationStatus(id, status) {
    return await couchDBService.updateReservationStatus(id, status);
  },
  
  async deleteReservation(id, rev) {
    return await couchDBService.deleteReservation(id, rev);
  }
};

// Futár szolgáltatás
// A futárok kezeléséhez szükséges funkciók gyűjteménye
export const courierService = {
  // Összes futár lekérése
  async getAllCouriers() {
    return await couchDBService.getAllCouriers();
  },
  
  // Futárok lekérése státusz szerint
  async getCouriersByStatus(status) {
    return await couchDBService.getCouriersByStatus(status);
  },
  
  // Futár lekérése azonosító alapján
  async getCourierById(id) {
    return await couchDBService.getCourierById(id);
  },
  
  // Futár mentése (új létrehozása vagy meglévő frissítése)
  async saveCourier(courier) {
    return await couchDBService.saveCourier(courier);
  },
  
  // Futár státuszának frissítése
  async updateCourierStatus(courierId, status) {
    return await couchDBService.updateCourierStatus(courierId, status);
  },
  
  // Futár törlése
  async deleteCourier(id, rev) {
    return await couchDBService.deleteCourier(id, rev);
  }
}; 