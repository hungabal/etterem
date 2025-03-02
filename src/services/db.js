// Import our CouchDB service
import couchDBService from './couchdb-service.js';

// Export databases for use in other modules (backward compatibility)
export const menuDB = null;
export const tablesDB = null;
export const ordersDB = null;
export const invoicesDB = null;
export const settingsDB = null;
export const reservationsDB = null;
export const customersDB = null;

// Adatbázis inicializálása
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
export const menuService = {
  async getAllItems() {
    return await couchDBService.getAllMenuItems();
  },
  
  async getItemsByCategory(category) {
    return await couchDBService.getMenuItemsByCategory(category);
  },
  
  async getCategories() {
    return await couchDBService.getMenuCategories();
  },
  
  async saveItem(item) {
    return await couchDBService.saveMenuItem(item);
  },
  
  async saveCategory(category) {
    return await couchDBService.saveMenuCategory(category);
  },
  
  async deleteItem(id, rev) {
    return await couchDBService.deleteMenuItem(id, rev);
  }
};

// Asztal szolgáltatás
export const tableService = {
  async getAllTables() {
    return await couchDBService.getAllTables();
  },
  
  async getTableById(id) {
    return await couchDBService.getTableById(id);
  },
  
  async saveTable(table) {
    return await couchDBService.saveTable(table);
  },
  
  async updateTableStatus(tableId, status) {
    return await couchDBService.updateTableStatus(tableId, status);
  },
  
  async deleteTable(id, rev) {
    return await couchDBService.deleteTable(id, rev);
  }
};

// Rendelés szolgáltatás
export const orderService = {
  async getActiveOrders() {
    return await couchDBService.getActiveOrders();
  },
  
  async getOrdersByType(type) {
    return await couchDBService.getOrdersByType(type);
  },
  
  async getActiveOrderByTable(tableId) {
    return await couchDBService.getActiveOrderByTable(tableId);
  },
  
  async saveOrder(order) {
    return await couchDBService.saveOrder(order);
  },
  
  async updateOrderStatus(id, status) {
    return await couchDBService.updateOrderStatus(id, status);
  },
  
  async deleteOrder(id) {
    return await couchDBService.deleteOrder(id);
  },
  
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
  }
};

// Ügyfél szolgáltatás
export const customerService = {
  async getAllCustomers() {
    return await couchDBService.getAllCustomers();
  },
  
  async getCustomerByPhone(phone) {
    return await couchDBService.getCustomerByPhone(phone);
  },
  
  async saveCustomer(customer) {
    return await couchDBService.saveCustomer(customer);
  },
  
  async deleteCustomer(id) {
    return await couchDBService.deleteCustomer(id);
  }
};

// Számla szolgáltatás
export const invoiceService = {
  async getInvoices(limit = 50) {
    return await couchDBService.getInvoices(limit);
  },
  
  async saveInvoice(invoice) {
    return await couchDBService.saveInvoice(invoice);
  },
  
  async deleteInvoice(id) {
    return await couchDBService.deleteInvoice(id);
  },
  
  printReceipt(order) {
    // Ez a funkció a böngészőben fut, nem kell módosítani
    // Nyugta nyomtatása
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Kérjük, engedélyezze a felugró ablakokat a nyugta nyomtatásához!');
      return;
    }
    
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
            font-size: 12px;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          .title {
            font-size: 14px;
            font-weight: bold;
            margin: 5px 0;
          }
          .info {
            margin: 5px 0;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .item-name {
            flex: 1;
          }
          .item-quantity {
            width: 30px;
            text-align: right;
            margin-right: 10px;
          }
          .item-price {
            width: 70px;
            text-align: right;
          }
          .total {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin: 5px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Pizza Maestro</div>
          <div class="info">1234 Budapest, Példa utca 1.</div>
          <div class="info">Tel: +36-1-234-5678</div>
          <div class="info">Adószám: 12345678-2-42</div>
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
          www.pizzamaestro.hu
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