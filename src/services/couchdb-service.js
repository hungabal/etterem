/**
 * CouchDB Service
 * 
 * Ez a szolgáltatás kezeli a kommunikációt a szerver API-val, amely a CouchDB-vel kommunikál.
 * Az összes adatbázis-művelet ezen a szolgáltatáson keresztül történik.
 */

// API alap URL az .env fájlból
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// CouchDB szolgáltatás
const couchDBService = {
  // API kérés küldése
  // Ez az alap függvény, amely minden API kérést kezel
  // endpoint: az API végpont relatív útvonala
  // method: HTTP metódus (GET, POST, PUT, DELETE)
  // data: opcionális adatok, amelyeket a kérésben küldünk
  async apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.warn('Nem sikerült a hibaüzenetet JSON-ként értelmezni:', errorText);
        }
        
        const errorMessage = `API hiba: ${response.status} ${response.statusText} - ${errorData.message || errorText || ''}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error(`Hiba a(z) ${endpoint} API kérésnél:`, error);
      throw error;
    }
  },

  // Adatbázis inicializálása
  // Ez a függvény ellenőrzi, hogy a szerver elérhető-e, és betölti az alapvető adatokat
  async initialize() {
    try {
      // Ellenőrizzük, hogy a szerver elérhető-e
      try {
        const serverStatus = await this.apiRequest('');
      } catch (error) {
        console.error('API szerver nem elérhető:', error);
        return false;
      }
      
      // Csak akkor folytatjuk, ha a szerver elérhető
      const settings = await this.getSettings();
      
      const categories = await this.getMenuCategories();
      
      const tables = await this.getAllTables();
      
      return true;
    } catch (error) {
      console.error('Hiba az adatbázis inicializálásakor:', error);
      return false;
    }
  },

  // Beállítások lekérése
  // Az étterem alapvető beállításainak lekérése (név, cím, adószám, stb.)
  async getSettings() {
    try {
      const result = await this.apiRequest('db/restaurant_settings/settings');
      return result;
    } catch (error) {
      console.error('Beállítások lekérése sikertelen:', error);
      console.warn('Alapértelmezett beállítások használata');
      return {
        _id: 'settings',
        restaurantName: 'Pizza Maestro',
        address: '1234 Budapest, Példa utca 1.',
        phone: '+36-1-234-5678',
        email: 'info@pizzamaestro.hu',
        taxNumber: '12345678-2-42',
        deliveryFee: 500,
        packagingFee: 200,
        minOrderAmount: 2000,
        deliveryTimeMinutes: 60,
        openingHours: {
          monday: { open: '10:00', close: '22:00' },
          tuesday: { open: '10:00', close: '22:00' },
          wednesday: { open: '10:00', close: '22:00' },
          thursday: { open: '10:00', close: '22:00' },
          friday: { open: '10:00', close: '23:00' },
          saturday: { open: '11:00', close: '23:00' },
          sunday: { open: '11:00', close: '22:00' }
        },
        paymentMethods: ['cash', 'card'],
        pizzaSizes: [],
        extraToppings: [],
        pizzaPricingType: 'multiplier' // Alapértelmezett árazási mód
      };
    }
  },

  // Beállítások mentése
  // Az étterem beállításainak mentése vagy frissítése
  async saveSettings(settings) {
    try {
      // Ellenőrizzük, hogy van-e már beállítás dokumentum
      let existingSettings;
      try {
        existingSettings = await this.getSettings();
      } catch (error) {
        console.warn('Nem sikerült lekérni a meglévő beállításokat, új dokumentum létrehozása');
        existingSettings = { _id: 'settings' };
      }
      
      // Egyesítjük a meglévő és az új beállításokat
      const mergedSettings = {
        ...existingSettings,
        ...settings,
        _id: 'settings' // Biztosítjuk, hogy az ID mindig 'settings' legyen
      };
      
      // Mentjük az egyesített beállításokat
      return await this.apiRequest('db/restaurant_settings', 'POST', mergedSettings);
    } catch (error) {
      console.error('Hiba a beállítások mentésekor:', error);
      throw error;
    }
  },

  // Menü kategóriák lekérése
  // Az étlap kategóriáinak lekérése (pl. előételek, főételek, desszertek)
  async getMenuCategories() {
    try {
      const result = await this.apiRequest('db/restaurant_menu/_find', 'POST', {
        selector: {
          type: 'category'
        },
        sort: [{ order: 'asc' }]
      });
      return result.docs || [];
    } catch (error) {
      console.warn('Menü kategóriák lekérése sikertelen, üres lista visszaadása');
      return [];
    }
  },

  // Menü kategória mentése
  // Új kategória létrehozása vagy meglévő frissítése
  async saveMenuCategory(category) {
    if (!category.type) {
      category.type = 'category';
    }
    
    if (category._id) {
      return await this.apiRequest('db/restaurant_menu', 'POST', category);
    } else {
      category._id = `category_${Date.now()}`;
      return await this.apiRequest('db/restaurant_menu', 'POST', category);
    }
  },

  // Összes menüelem lekérése
  // Az étlapon szereplő összes étel és ital lekérése
  async getAllMenuItems() {
    try {
      const query = {
        selector: {
          type: 'menuItem'
        },
        limit: 1000 // Add a limit to ensure we get all items
      };
      
      const result = await this.apiRequest('db/restaurant_menu/_find', 'POST', query);
      
      return result.docs || [];
    } catch (error) {
      console.warn('Menüelemek lekérése sikertelen, üres lista visszaadása', error);
      return [];
    }
  },

  // Menüelemek lekérése kategória szerint
  // Egy adott kategóriába tartozó ételek és italok lekérése
  async getMenuItemsByCategory(categoryId) {
    try {
      const result = await this.apiRequest('db/restaurant_menu/_find', 'POST', {
        selector: {
          type: 'menuItem',
          category: categoryId
        }
      });
      return result.docs || [];
    } catch (error) {
      console.warn(`Menüelemek lekérése a(z) ${categoryId} kategóriához sikertelen, üres lista visszaadása`);
      return [];
    }
  },

  // Menüelem mentése
  async saveMenuItem(item) {
    if (!item.type) {
      item.type = 'menuItem';
    }
    
    if (item._id) {
      return await this.apiRequest('db/restaurant_menu', 'POST', item);
    } else {
      item._id = `menuItem_${Date.now()}`;
      return await this.apiRequest('db/restaurant_menu', 'POST', item);
    }
  },

  // Menüelem törlése
  async deleteMenuItem(id, rev) {
    return await this.apiRequest(`db/restaurant_menu/${id}?rev=${rev}`, 'DELETE');
  },

  // Összes asztal lekérése
  async getAllTables() {
    try {
      const result = await this.apiRequest('db/restaurant_tables/_find', 'POST', {
        selector: {
          type: 'table'
        },
        sort: [{ order: 'asc' }]
      });
      
      // Biztosítjuk, hogy minden asztalnak legyen seats tulajdonsága
      const tables = result.docs || [];
      tables.forEach(table => {
        if (table.capacity && !table.seats) {
          table.seats = table.capacity;
        } else if (table.seats && !table.capacity) {
          table.capacity = table.seats;
        } else if (!table.seats && !table.capacity) {
          table.seats = 4;
          table.capacity = 4;
        }
      });
      
      return tables;
    } catch (error) {
      console.warn('Asztalok lekérése sikertelen, üres lista visszaadása');
      return [];
    }
  },

  // Asztal lekérése ID alapján
  async getTableById(id) {
    try {
      const table = await this.apiRequest(`db/restaurant_tables/${id}`);
      
      // Biztosítjuk, hogy az asztalnak legyen seats tulajdonsága
      if (table) {
        if (table.capacity && !table.seats) {
          table.seats = table.capacity;
        } else if (table.seats && !table.capacity) {
          table.capacity = table.seats;
        } else if (!table.seats && !table.capacity) {
          table.seats = 4;
          table.capacity = 4;
        }
      }
      
      return table;
    } catch (error) {
      console.warn(`Asztal lekérése a(z) ${id} azonosítóval sikertelen`);
      return null;
    }
  },

  // Asztal mentése
  async saveTable(table) {
    if (!table.type) {
      table.type = 'table';
    }
    
    // Biztosítjuk, hogy a seats tulajdonság be legyen állítva
    if (table.capacity && !table.seats) {
      table.seats = table.capacity;
    } else if (table.seats && !table.capacity) {
      table.capacity = table.seats;
    } else if (!table.seats && !table.capacity) {
      table.seats = 4;
      table.capacity = 4;
    }
    
    if (table._id) {
      return await this.apiRequest('db/restaurant_tables', 'POST', table);
    } else {
      table._id = `table_${Date.now()}`;
      return await this.apiRequest('db/restaurant_tables', 'POST', table);
    }
  },

  // Asztal státuszának frissítése
  async updateTableStatus(tableId, status) {
    try {
      // Lekérjük az asztalt közvetlenül az API-n keresztül
      const table = await this.apiRequest(`db/restaurant_tables/${tableId}`);
      
      if (!table) {
        throw new Error(`Asztal nem található: ${tableId}`);
      }
      
      // Frissítjük a státuszt
      table.status = status;
      table.updatedAt = new Date().toISOString();
      
      // Mentjük a frissített asztalt közvetlenül az API-n keresztül
      const result = await this.apiRequest('db/restaurant_tables', 'POST', table);
      
      return result;
    } catch (error) {
      console.error(`Hiba az asztal státuszának frissítésekor:`, error);
      throw error;
    }
  },

  // Asztal törlése
  async deleteTable(id, rev) {
    return await this.apiRequest(`db/restaurant_tables/${id}?rev=${rev}`, 'DELETE');
  },

  // Aktív rendelések lekérése
  async getActiveOrders() {
    try {
      // Egyszerűbb lekérdezés, status szűrés nélkül
      const result = await this.apiRequest('db/restaurant_orders/_find', 'POST', {
        selector: {}
      });
      
      // Manuálisan szűrjük az aktív rendeléseket
      const orders = result.docs || [];
      const activeOrders = orders.filter(order => 
        order.status === 'new' || 
        order.status === 'in-progress' || 
        order.status === 'ready' ||
        order.status === 'active'
      );
      
      // Rendezzük a rendeléseket dátum szerint (a legrégebbi legyen elöl)
      activeOrders.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      
      // Asztalok lekérése a férőhelyek hozzáadásához
      const tables = await this.getAllTables();
      
      // Rendelésekhez hozzáadjuk az asztalok férőhelyeit
      for (const order of activeOrders) {
        if (order.tableId) {
          const table = tables.find(t => t._id === order.tableId);
          if (table) {
            order.tableSeats = table.seats || table.capacity || 0;
          }
        }
      }
      
      return activeOrders;
    } catch (error) {
      console.warn('Aktív rendelések lekérése sikertelen, üres lista visszaadása:', error);
      return [];
    }
  },

  // Rendelések lekérése típus szerint
  async getOrdersByType(type) {
    try {
      // Egyszerűbb lekérdezés, csak típus alapján
      const result = await this.apiRequest('db/restaurant_orders/_find', 'POST', {
        selector: {
          type: type
        }
      });
      
      // Manuálisan rendezzük a rendeléseket
      const orders = result.docs || [];
      orders.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      return orders;
    } catch (error) {
      console.warn(`Rendelések lekérése a(z) ${type} típushoz sikertelen, üres lista visszaadása:`, error);
      return [];
    }
  },

  // Aktív rendelés lekérése asztal alapján
  async getActiveOrderByTable(tableId) {
    try {
      // Egyszerűbb lekérdezés, csak a tableId alapján
      const result = await this.apiRequest('db/restaurant_orders/_find', 'POST', {
        selector: {
          tableId: tableId
        }
      });
      
      // Manuálisan szűrjük az aktív rendeléseket
      const orders = result.docs || [];
      const activeOrders = orders.filter(order => 
        order.status === 'new' || 
        order.status === 'in-progress' || 
        order.status === 'ready' ||
        order.status === 'active'
      );
      
      // Rendezzük a rendeléseket dátum szerint (a legújabb legyen elöl)
      activeOrders.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      if (activeOrders.length > 0) {
        return activeOrders[0]; // A legújabb aktív rendelést adjuk vissza
      }
      return null;
    } catch (error) {
      console.warn(`Aktív rendelés lekérése a(z) ${tableId} asztalhoz sikertelen:`, error);
      return null;
    }
  },

  // Ideiglenes rendelés lekérése asztal alapján
  async getTemporaryOrderByTable(tableId) {
    try {
      // Lekérdezés a tableId és a temporary státusz alapján
      const result = await this.apiRequest('db/restaurant_orders/_find', 'POST', {
        selector: {
          tableId: tableId,
          status: 'temporary',
          type: 'temporary'
        }
      });
      
      const orders = result.docs || [];
      
      // Rendezzük a rendeléseket dátum szerint (a legújabb legyen elöl)
      orders.sort((a, b) => {
        if (!a.updatedAt) return 1;
        if (!b.updatedAt) return -1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
      
      if (orders.length > 0) {
        return orders[0]; // A legújabb ideiglenes rendelést adjuk vissza
      }
      return null;
    } catch (error) {
      console.warn(`Ideiglenes rendelés lekérése a(z) ${tableId} asztalhoz sikertelen:`, error);
      return null;
    }
  },

  // Rendelés mentése
  async saveOrder(order) {
    if (order._id) {
      order.updatedAt = new Date().toISOString();
      return await this.apiRequest('db/restaurant_orders', 'POST', order);
    } else {
      order._id = `order_${Date.now()}`;
      order.createdAt = new Date().toISOString();
      return await this.apiRequest('db/restaurant_orders', 'POST', order);
    }
  },

  // Rendelés állapotának frissítése
  async updateOrderStatus(id, status) {
    try {
      const order = await this.apiRequest(`db/restaurant_orders/${id}`);
      order.status = status;
      order.updatedAt = new Date().toISOString();
      return await this.apiRequest('db/restaurant_orders', 'POST', order);
    } catch (error) {
      console.error(`Hiba a rendelés állapotának frissítésekor:`, error);
      throw error;
    }
  },

  // Rendelés törlése
  async deleteOrder(id, rev) {
    try {
      if (rev) {
        // Ha van rev paraméter, közvetlenül töröljük
        return await this.apiRequest(`db/restaurant_orders/${id}?rev=${rev}`, 'DELETE');
      } else {
        // Először lekérjük a rendelés adatait, hogy megkapjuk a _rev értéket
        const order = await this.apiRequest(`db/restaurant_orders/${id}`);
        if (!order || !order._rev) {
          throw new Error('A rendelés nem található vagy nincs _rev értéke');
        }
        return await this.apiRequest(`db/restaurant_orders/${id}?rev=${order._rev}`, 'DELETE');
      }
    } catch (error) {
      console.error(`Hiba a rendelés törlésekor:`, error);
      throw error;
    }
  },

  // Számlák lekérése
  async getInvoices(limit = 50) {
    try {
      // Egyszerűbb lekérdezés, rendezés nélkül
      const result = await this.apiRequest('db/restaurant_invoices/_find', 'POST', {
        selector: {},
        limit: limit
      });
      
      // Manuálisan rendezzük a számlákat
      const invoices = result.docs || [];
      invoices.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      // Asztalok lekérése a férőhelyek hozzáadásához
      const tables = await this.getAllTables();
      
      // Számlákhoz hozzáadjuk az asztalok férőhelyeit
      for (const invoice of invoices) {
        if (invoice.tableId) {
          const table = tables.find(t => t._id === invoice.tableId);
          if (table) {
            invoice.tableSeats = table.seats || table.capacity || 0;
          }
        }
      }
      
      return invoices;
    } catch (error) {
      console.warn('Számlák lekérése sikertelen, üres lista visszaadása:', error);
      return [];
    }
  },

  // Számla mentése
  async saveInvoice(invoice) {
    if (!invoice._id) {
      invoice._id = `invoice_${Date.now()}`;
      invoice.createdAt = new Date().toISOString();
    }
    return await this.apiRequest('db/restaurant_invoices', 'POST', invoice);
  },

  // Számla törlése
  async deleteInvoice(id) {
    try {
      // Először lekérjük a számla adatait, hogy megkapjuk a _rev értéket
      const invoice = await this.apiRequest(`db/restaurant_invoices/${id}`);
      if (!invoice || !invoice._rev) {
        throw new Error('A számla nem található vagy nincs _rev értéke');
      }
      
      // Töröljük a számlát
      return await this.apiRequest(`db/restaurant_invoices/${id}?rev=${invoice._rev}`, 'DELETE');
    } catch (error) {
      console.error(`Hiba a számla törlésekor:`, error);
      throw error;
    }
  },

  // Összes ügyfél lekérése
  async getAllCustomers() {
    try {
      // Először ellenőrizzük, hogy létezik-e az adatbázis
      try {
        // Próbáljuk lekérni a view-t
        const result = await this.apiRequest('db/restaurant_customers/_design/customers/_view/by_phone');
        
        if (result && result.rows) {
          return result.rows.map(row => row.value);
        }
        return [];
      } catch (error) {
        console.error('Ügyfelek lekérése sikertelen:', error);
        
        // Ha az adatbázis vagy a view nem létezik, létrehozzuk őket
        if (error.message && (error.message.includes('not_found') || error.message.includes('404'))) {
          try {
            // Először létrehozzuk az adatbázist, ha még nem létezik
            try {
              await this.apiRequest('db/restaurant_customers', 'PUT');
            } catch (dbError) {
              // Ha már létezik, akkor ez a hiba várható, így ignoráljuk
              console.warn('restaurant_customers adatbázis már létezik vagy hiba történt:', dbError);
            }
            
            // Design document létrehozása a view-val
            const designDoc = {
              _id: '_design/customers',
              views: {
                by_phone: {
                  map: 'function (doc) { if (doc.type === "customer") { emit(doc.phone, doc); } }'
                },
                by_name: {
                  map: 'function (doc) { if (doc.type === "customer") { emit(doc.name, doc); } }'
                }
              }
            };
            
            await this.apiRequest('db/restaurant_customers', 'POST', designDoc);
            
            // Üres lista visszaadása, mivel még nincsenek ügyfelek
            return [];
          } catch (designError) {
            console.error('Hiba az ügyfelek view létrehozásakor:', designError);
            return [];
          }
        }
        
        return [];
      }
    } catch (error) {
      console.error('Váratlan hiba az ügyfelek lekérésekor:', error);
      return [];
    }
  },
  
  // Ügyfél keresése telefonszám alapján
  async getCustomerByPhone(phone) {
    try {
      try {
        const result = await this.apiRequest(`db/restaurant_customers/_design/customers/_view/by_phone?key="${phone}"`);
        
        if (result && result.rows && result.rows.length > 0) {
          return result.rows[0].value;
        }
        return null;
      } catch (error) {
        // Ha az adatbázis vagy a view nem létezik, próbáljuk létrehozni
        if (error.message && (error.message.includes('not_found') || error.message.includes('404'))) {
          // Létrehozzuk az adatbázist és a view-t
          await this.getAllCustomers();
          // Újra próbáljuk a lekérdezést
          try {
            const result = await this.apiRequest(`db/restaurant_customers/_design/customers/_view/by_phone?key="${phone}"`);
            
            if (result && result.rows && result.rows.length > 0) {
              return result.rows[0].value;
            }
          } catch (retryError) {
            console.error(`Ügyfél keresése sikertelen a következő telefonszámmal: ${phone} (újrapróbálás után)`, retryError);
          }
        } else {
          console.error(`Ügyfél keresése sikertelen a következő telefonszámmal: ${phone}`, error);
        }
        return null;
      }
    } catch (error) {
      console.error(`Váratlan hiba az ügyfél keresésekor: ${phone}`, error);
      return null;
    }
  },
  
  // Ügyfél mentése
  async saveCustomer(customer) {
    try {
      // Ellenőrizzük, hogy létezik-e már ilyen telefonszámú ügyfél
      let existingCustomer = null;
      
      if (customer.phone) {
        existingCustomer = await this.getCustomerByPhone(customer.phone);
      }
      
      if (existingCustomer && existingCustomer._id !== customer._id) {
        // Ha már létezik ilyen telefonszámú ügyfél, de más ID-val, akkor hiba
        throw new Error('Már létezik ügyfél ezzel a telefonszámmal');
      }
      
      try {
        if (customer._id) {
          // Frissítés
          customer.updatedAt = new Date().toISOString();
          return await this.apiRequest('db/restaurant_customers', 'POST', customer);
        } else {
          // Új ügyfél létrehozása
          customer._id = `customer_${Date.now()}`;
          customer.type = 'customer';
          customer.createdAt = new Date().toISOString();
          return await this.apiRequest('db/restaurant_customers', 'POST', customer);
        }
      } catch (error) {
        // Ha az adatbázis nem létezik, próbáljuk létrehozni
        if (error.message && (error.message.includes('not_found') || error.message.includes('404'))) {
          // Létrehozzuk az adatbázist és a view-t
          await this.getAllCustomers();
          
          // Újra próbáljuk a mentést
          if (customer._id) {
            // Frissítés
            customer.updatedAt = new Date().toISOString();
            return await this.apiRequest('db/restaurant_customers', 'POST', customer);
          } else {
            // Új ügyfél létrehozása
            customer._id = `customer_${Date.now()}`;
            customer.type = 'customer';
            customer.createdAt = new Date().toISOString();
            return await this.apiRequest('db/restaurant_customers', 'POST', customer);
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Hiba az ügyfél mentésekor:', error);
      throw error;
    }
  },
  
  // Ügyfél törlése
  async deleteCustomer(id) {
    try {
      try {
        // Először lekérjük az ügyfél adatait, hogy megkapjuk a _rev értéket
        const customer = await this.apiRequest(`db/restaurant_customers/${id}`);
        if (!customer || !customer._rev) {
          throw new Error('Az ügyfél nem található vagy nincs _rev értéke');
        }
        
        // Töröljük az ügyfelet
        return await this.apiRequest(`db/restaurant_customers/${id}?rev=${customer._rev}`, 'DELETE');
      } catch (error) {
        // Ha az adatbázis nem létezik, próbáljuk létrehozni
        if (error.message && (error.message.includes('not_found') || error.message.includes('404'))) {
          // Létrehozzuk az adatbázist és a view-t
          await this.getAllCustomers();
          
          // Újra próbáljuk a törlést
          try {
            const customer = await this.apiRequest(`db/restaurant_customers/${id}`);
            if (!customer || !customer._rev) {
              throw new Error('Az ügyfél nem található vagy nincs _rev értéke');
            }
            
            return await this.apiRequest(`db/restaurant_customers/${id}?rev=${customer._rev}`, 'DELETE');
          } catch (retryError) {
            console.error(`Hiba az ügyfél törlésekor (újrapróbálás után):`, retryError);
            throw retryError;
          }
        } else {
          console.error(`Hiba az ügyfél törlésekor:`, error);
          throw error;
        }
      }
    } catch (error) {
      console.error(`Váratlan hiba az ügyfél törlésekor:`, error);
      throw error;
    }
  },

  // Rendelés archiválása
  // Ez a függvény elmenti a rendelést az archivált rendelések közé
  async archiveOrder(order) {
    try {
      // Biztosítjuk, hogy a rendelés tartalmazza az archiválás dátumát
      const archivedOrder = {
        ...order,
        status: 'archived',
        archivedAt: new Date().toISOString(),
        type: 'archived_order'
      };
      
      // Töröljük az _id és _rev mezőket, hogy új dokumentumként kerüljön mentésre
      delete archivedOrder._id;
      delete archivedOrder._rev;
      
      // Mentjük az archivált rendelést
      try {
        // Először megpróbáljuk menteni az archivált rendelést
        const result = await this.apiRequest('db/restaurant_archived_orders', 'POST', archivedOrder);
        
        // Ha sikeres volt a mentés, töröljük az eredeti rendelést
        if (result.ok && order._id) {
          await this.deleteOrder(order._id, order._rev);
        }
        
        return result;
      } catch (error) {
        // Ha 404-es hibát kapunk, akkor az adatbázis még nem létezik
        if (error.message && error.message.includes('404')) {
          console.log('Az archivált rendelések adatbázisa még nem létezik. Létrehozás...');
          
          // Létrehozzuk az adatbázist
          try {
            await this.apiRequest('db/restaurant_archived_orders', 'PUT');
            console.log('Archivált rendelések adatbázisa létrehozva.');
            
            // Újra megpróbáljuk menteni az archivált rendelést
            const result = await this.apiRequest('db/restaurant_archived_orders', 'POST', archivedOrder);
            
            // Ha sikeres volt a mentés, töröljük az eredeti rendelést
            if (result.ok && order._id) {
              await this.deleteOrder(order._id, order._rev);
            }
            
            return result;
          } catch (dbError) {
            console.error('Hiba az archivált rendelések adatbázisának létrehozásakor:', dbError);
            throw dbError;
          }
        }
        throw error;
      }
    } catch (error) {
      console.error('Hiba a rendelés archiválásakor:', error);
      throw error;
    }
  },
  
  // Archivált rendelések lekérése
  // Ez a függvény lekéri az archivált rendeléseket
  async getArchivedOrders(limit = 50) {
    try {
      // Ellenőrizzük, hogy létezik-e az adatbázis
      try {
        const result = await this.apiRequest('db/restaurant_archived_orders/_find', 'POST', {
          selector: {
            type: 'archived_order'
          },
          sort: [{ archivedAt: 'desc' }],
          limit: limit
        });
        
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
        // Ha 404-es hibát kapunk, akkor az adatbázis még nem létezik
        if (error.message && error.message.includes('404')) {
          console.log('Az archivált rendelések adatbázisa még nem létezik. Létrehozás szükséges az első archiváláskor.');
          return [];
        }
        throw error;
      }
    } catch (error) {
      console.error('Hiba az archivált rendelések lekérésekor:', error);
      return [];
    }
  },

  // Archivált rendelés törlése
  // Ez a függvény törli az archivált rendelést
  async deleteArchivedOrder(id) {
    try {
      try {
        // Lekérjük az archivált rendelést
        const result = await this.apiRequest(`db/restaurant_archived_orders/${id}`, 'GET');
        
        if (result && result._id) {
          // Töröljük az archivált rendelést
          return await this.apiRequest(`db/restaurant_archived_orders/${id}?rev=${result._rev}`, 'DELETE');
        }
        
        throw new Error('Az archivált rendelés nem található');
      } catch (error) {
        // Ha 404-es hibát kapunk, akkor az adatbázis vagy a dokumentum nem létezik
        if (error.message && error.message.includes('404')) {
          console.log('Az archivált rendelés vagy az adatbázis nem található.');
          return { ok: true, id: id, message: 'Az archivált rendelés már nem létezik' };
        }
        throw error;
      }
    } catch (error) {
      console.error('Hiba az archivált rendelés törlésekor:', error);
      throw error;
    }
  },
  
  // Archivált rendelés visszaállítása aktív rendelésként
  // Ez a függvény visszaállítja az archivált rendelést aktív rendelésként
  async restoreArchivedOrder(id) {
    try {
      try {
        // Lekérjük az archivált rendelést
        const archivedOrder = await this.apiRequest(`db/restaurant_archived_orders/${id}`, 'GET');
        
        if (!archivedOrder || !archivedOrder._id) {
          throw new Error('Az archivált rendelés nem található');
        }
        
        // Létrehozzuk az új aktív rendelést az archivált adatokból
        const activeOrder = {
          ...archivedOrder,
          status: 'active',
          type: 'order',
          restoredAt: new Date().toISOString(),
          restoredFrom: archivedOrder._id
        };
        
        // Töröljük az _id és _rev mezőket, hogy új dokumentumként kerüljön mentésre
        delete activeOrder._id;
        delete activeOrder._rev;
        
        // Töröljük az archiválással kapcsolatos mezőket
        delete activeOrder.archivedAt;
        
        // Mentjük az aktív rendelést
        const result = await this.apiRequest('db/restaurant_orders', 'POST', activeOrder);
        
        // Ha sikeres volt a mentés, töröljük az archivált rendelést
        if (result.ok) {
          await this.deleteArchivedOrder(archivedOrder._id);
        }
        
        return result;
      } catch (error) {
        // Ha 404-es hibát kapunk, akkor az adatbázis vagy a dokumentum nem létezik
        if (error.message && error.message.includes('404')) {
          console.log('Az archivált rendelés vagy az adatbázis nem található.');
          throw new Error('Az archivált rendelés nem található. Lehet, hogy az adatbázis még nem létezik.');
        }
        throw error;
      }
    } catch (error) {
      console.error('Hiba az archivált rendelés visszaállításakor:', error);
      throw error;
    }
  },

  // Futárok kezelése
  
  // Összes futár lekérése
  async getAllCouriers() {
    try {
      const result = await this.apiRequest('db/restaurant_couriers/_design/couriers/_view/by_name?include_docs=true');
      
      if (!result || !result.rows) {
        return [];
      }
      
      return result.rows.map(row => row.doc);
    } catch (error) {
      console.error('Hiba a futárok lekérésekor:', error);
      return [];
    }
  },
  
  // Futárok lekérése státusz szerint
  async getCouriersByStatus(status) {
    try {
      const result = await this.apiRequest(`db/restaurant_couriers/_design/couriers/_view/by_status?key="${status}"&include_docs=true`);
      
      if (!result || !result.rows) {
        return [];
      }
      
      return result.rows.map(row => row.doc);
    } catch (error) {
      console.error(`Hiba a(z) ${status} státuszú futárok lekérésekor:`, error);
      return [];
    }
  },
  
  // Futár lekérése azonosító alapján
  async getCourierById(id) {
    try {
      const result = await this.apiRequest(`db/restaurant_couriers/${id}`);
      return result;
    } catch (error) {
      console.error(`Hiba a(z) ${id} azonosítójú futár lekérésekor:`, error);
      return null;
    }
  },
  
  // Futár mentése (új létrehozása vagy meglévő frissítése)
  async saveCourier(courier) {
    try {
      // Ellenőrizzük, hogy a futár objektum tartalmazza-e a szükséges mezőket
      if (!courier.name || !courier.phone) {
        throw new Error('A futár neve és telefonszáma kötelező!');
      }
      
      // Típus beállítása, ha még nincs
      if (!courier.type) {
        courier.type = 'courier';
      }
      
      // Státusz beállítása, ha még nincs
      if (!courier.status) {
        courier.status = 'available'; // available, busy, offline
      }
      
      // Létrehozás dátumának beállítása, ha új futár
      if (!courier._id) {
        courier.createdAt = new Date().toISOString();
      }
      
      // Módosítás dátumának beállítása
      courier.updatedAt = new Date().toISOString();
      
      // Futár mentése
      const result = await this.apiRequest('db/restaurant_couriers', 'POST', courier);
      
      // Frissítjük a futár objektumot az új _id és _rev értékekkel
      courier._id = result.id;
      courier._rev = result.rev;
      
      return courier;
    } catch (error) {
      console.error('Hiba a futár mentésekor:', error);
      throw error;
    }
  },
  
  // Futár státuszának frissítése
  async updateCourierStatus(courierId, status) {
    try {
      // Futár lekérése
      const courier = await this.getCourierById(courierId);
      
      if (!courier) {
        throw new Error(`Nem található futár a következő azonosítóval: ${courierId}`);
      }
      
      // Státusz frissítése
      courier.status = status;
      courier.updatedAt = new Date().toISOString();
      
      // Futár mentése
      return await this.saveCourier(courier);
    } catch (error) {
      console.error(`Hiba a(z) ${courierId} azonosítójú futár státuszának frissítésekor:`, error);
      throw error;
    }
  },
  
  // Futár törlése
  async deleteCourier(id, rev) {
    try {
      const result = await this.apiRequest(`db/restaurant_couriers/${id}?rev=${rev}`, 'DELETE');
      return result;
    } catch (error) {
      console.error(`Hiba a(z) ${id} azonosítójú futár törlésekor:`, error);
      throw error;
    }
  },
};

export default couchDBService;