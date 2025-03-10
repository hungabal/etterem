// CouchDB adatbázis inicializáló szkript
// Ez a szkript inicializálja a CouchDB adatbázisokat és létrehozza az alapértelmezett adatokat

import fetch from 'node-fetch';
import nano from 'nano';
import 'dotenv/config';

// CouchDB kapcsolati adatok
const COUCHDB_URL = process.env.VITE_COUCHDB_URL || 'http://localhost:5984';
const COUCHDB_USER = process.env.VITE_COUCHDB_USER || 'admin';
const COUCHDB_PASSWORD = process.env.VITE_COUCHDB_PASSWORD || 'password';

// CouchDB kapcsolat létrehozása
const couchdbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COUCHDB_URL.replace('http://', '')}`;
const couchdb = nano(couchdbUrl);

// CouchDB kapcsolat ellenőrzése
const checkCouchDBConnection = async () => {
  try {
    const response = await fetch(COUCHDB_URL, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${COUCHDB_USER}:${COUCHDB_PASSWORD}`).toString('base64')
      }
    });
    
    if (!response.ok) {
      throw new Error(`CouchDB kapcsolódási hiba: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return true;
  } catch (error) {
    console.error('Hiba a CouchDB kapcsolat ellenőrzésekor:', error.message);
    return false;
  }
};

// Adatbázisok létrehozása
const createDatabases = async () => {
  const databases = [
    'restaurant_menu',
    'restaurant_tables',
    'restaurant_orders',
    'restaurant_invoices',
    'restaurant_settings',
    'restaurant_reservations',
    'restaurant_customers',
    'restaurant_archived_orders',
    'restaurant_couriers'
  ];
  
  try {
    const existingDbs = await couchdb.db.list();
    
    for (const dbName of databases) {
      if (!existingDbs.includes(dbName)) {
        await couchdb.db.create(dbName);
      } else {
        console.warn(`A(z) ${dbName} adatbázis már létezik`);
      }
    }
  } catch (error) {
    console.error('Hiba az adatbázisok létrehozásakor:', error);
  }
};

// Indexek létrehozása az adatbázisokban
const createIndexes = async () => {
  try {
    // Menü kategóriák indexe
    const menuDb = couchdb.use('restaurant_menu');
    await menuDb.createIndex({
      index: {
        fields: ['type', 'order']
      },
      name: 'type-order-index'
    });
    
    // Asztalok indexe
    const tablesDb = couchdb.use('restaurant_tables');
    await tablesDb.createIndex({
      index: {
        fields: ['type', 'order']
      },
      name: 'table-order-index'
    });
    
    // Rendelések indexe
    const ordersDb = couchdb.use('restaurant_orders');
    await ordersDb.createIndex({
      index: {
        fields: ['status', 'createdAt']
      },
      name: 'order-status-date-index'
    });
    
    // Foglalások indexe
    const reservationsDb = couchdb.use('restaurant_reservations');
    await reservationsDb.createIndex({
      index: {
        fields: ['date', 'time']
      },
      name: 'reservation-date-time-index'
    });
    
    // Ügyfelek indexe
    const customersDb = couchdb.use('restaurant_customers');
    await customersDb.createIndex({
      index: {
        fields: ['phone']
      },
      name: 'customer-phone-index'
    });
    
    await customersDb.createIndex({
      index: {
        fields: ['name']
      },
      name: 'customer-name-index'
    });
    
    await customersDb.createIndex({
      index: {
        fields: ['lastOrderDate']
      },
      name: 'customer-lastorder-index'
    });
    
    // Archivált rendelések indexe
    const archivedOrdersDb = couchdb.use('restaurant_archived_orders');
    await archivedOrdersDb.createIndex({
      index: {
        fields: ['archivedAt']
      },
      name: 'archived-order-date-index'
    });
    
    await archivedOrdersDb.createIndex({
      index: {
        fields: ['tableId']
      },
      name: 'archived-order-table-index'
    });
    
    // Futárok indexe
    const couriersDb = couchdb.use('restaurant_couriers');
    await couriersDb.createIndex({
      index: {
        fields: ['status']
      },
      name: 'courier-status-index'
    });
  } catch (error) {
    console.error('Hiba az indexek létrehozásakor:', error);
  }
};

// Design dokumentumok létrehozása
const createDesignDocuments = async () => {
  try {
    // Ügyfelek design dokumentum
    const customersDb = couchdb.use('restaurant_customers');
    
    // Ellenőrizzük, hogy létezik-e már a design dokumentum
    try {
      await customersDb.get('_design/customers');
    } catch (error) {
      if (error.statusCode === 404) {
        // Létrehozzuk a design dokumentumot
        const designDoc = {
          _id: '_design/customers',
          views: {
            by_phone: {
              map: "function(doc) { if (doc.type === 'customer') { emit(doc.phone, doc); } }"
            },
            by_name: {
              map: "function(doc) { if (doc.type === 'customer') { emit(doc.name, doc); } }"
            }
          }
        };
        
        await customersDb.insert(designDoc);
      } else {
        throw error;
      }
    }
    
    // Archivált rendelések design dokumentum
    const archivedOrdersDb = couchdb.use('restaurant_archived_orders');
    
    // Ellenőrizzük, hogy létezik-e már a design dokumentum
    try {
      await archivedOrdersDb.get('_design/archived_orders');
    } catch (error) {
      if (error.statusCode === 404) {
        // Létrehozzuk a design dokumentumot
        const designDoc = {
          _id: '_design/archived_orders',
          views: {
            by_date: {
              map: "function(doc) { if (doc.type === 'archived_order') { emit(doc.archivedAt, doc); } }"
            },
            by_table: {
              map: "function(doc) { if (doc.type === 'archived_order' && doc.tableId) { emit(doc.tableId, doc); } }"
            }
          }
        };
        
        await archivedOrdersDb.insert(designDoc);
      } else {
        throw error;
      }
    }
    
    // Futárok design dokumentum
    const couriersDb = couchdb.use('restaurant_couriers');
    
    // Ellenőrizzük, hogy létezik-e már a design dokumentum
    try {
      await couriersDb.get('_design/couriers');
    } catch (error) {
      if (error.statusCode === 404) {
        // Létrehozzuk a design dokumentumot
        const designDoc = {
          _id: '_design/couriers',
          views: {
            by_status: {
              map: "function(doc) { if (doc.type === 'courier') { emit(doc.status, doc); } }"
            },
            by_name: {
              map: "function(doc) { if (doc.type === 'courier') { emit(doc.name, doc); } }"
            }
          }
        };
        
        await couriersDb.insert(designDoc);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Hiba a design dokumentumok létrehozásakor:', error);
  }
};

// Alapértelmezett beállítások létrehozása
const createDefaultSettings = async () => {
  try {
    const settingsDb = couchdb.use('restaurant_settings');
    
    // Ellenőrizzük, hogy van-e már beállítás
    try {
      await settingsDb.get('settings');
      return;
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }
    
    // Alapértelmezett beállítások létrehozása
    const defaultSettings = {
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
      pizzaSizes: [
        { id: 'small', name: 'Kicsi (25 cm)', priceMultiplier: 1 },
        { id: 'medium', name: 'Közepes (32 cm)', priceMultiplier: 1.4 },
        { id: 'large', name: 'Nagy (45 cm)', priceMultiplier: 1.8 },
        { id: 'family', name: 'Családi (50 cm)', priceMultiplier: 2.2 }
      ],
      extraToppings: [
        { id: 'cheese', name: 'Extra sajt', price: 300 },
        { id: 'ham', name: 'Sonka', price: 350 },
        { id: 'mushroom', name: 'Gomba', price: 250 },
        { id: 'corn', name: 'Kukorica', price: 200 },
        { id: 'bacon', name: 'Bacon', price: 400 },
        { id: 'onion', name: 'Hagyma', price: 150 },
        { id: 'salami', name: 'Szalámi', price: 400 },
        { id: 'pineapple', name: 'Ananász', price: 300 }
      ]
    };
    
    await settingsDb.insert(defaultSettings);
  } catch (error) {
    console.error('Hiba az alapértelmezett beállítások létrehozásakor:', error);
  }
};

// Alapértelmezett menükategóriák létrehozása
const createDefaultMenuCategories = async () => {
  try {
    const menuDb = couchdb.use('restaurant_menu');
    
    // Ellenőrizzük, hogy vannak-e már kategóriák
    const result = await menuDb.find({
      selector: {
        type: 'category'
      }
    });
    
    if (result.docs.length > 0) {
      return;
    }
    
    // Alapértelmezett kategóriák létrehozása
    const defaultCategories = [
      { _id: 'category_1', type: 'category', name: 'Előételek', order: 1 },
      { _id: 'category_2', type: 'category', name: 'Levesek', order: 2 },
      { _id: 'category_3', type: 'category', name: 'Főételek', order: 3 },
      { _id: 'category_4', type: 'category', name: 'Pizzák', order: 4 },
      { _id: 'category_5', type: 'category', name: 'Hamburgerek', order: 5 },
      { _id: 'category_6', type: 'category', name: 'Saláták', order: 6 },
      { _id: 'category_7', type: 'category', name: 'Desszertek', order: 7 },
      { _id: 'category_8', type: 'category', name: 'Üdítők', order: 8 },
      { _id: 'category_9', type: 'category', name: 'Alkoholos italok', order: 9 }
    ];
    
    for (const category of defaultCategories) {
      await menuDb.insert(category);
    }
    
  } catch (error) {
    console.error('Hiba az alapértelmezett menükategóriák létrehozásakor:', error);
  }
};

// Alapértelmezett asztalok létrehozása
const createDefaultTables = async () => {
  try {
    const tablesDb = couchdb.use('restaurant_tables');
    
    // Ellenőrizzük, hogy vannak-e már asztalok
    const result = await tablesDb.find({
      selector: {
        type: 'table'
      }
    });
    
    if (result.docs.length > 0) {
      return;
    }
    
    // Alapértelmezett asztalok létrehozása
    const defaultTables = [
      { _id: 'table_1', type: 'table', name: 'Asztal 1', seats: 4, status: 'free', order: 1 },
      { _id: 'table_2', type: 'table', name: 'Asztal 2', seats: 4, status: 'free', order: 2 },
      { _id: 'table_3', type: 'table', name: 'Asztal 3', seats: 4, status: 'free', order: 3 },
      { _id: 'table_4', type: 'table', name: 'Asztal 4', seats: 6, status: 'free', order: 4 },
      { _id: 'table_5', type: 'table', name: 'Asztal 5', seats: 6, status: 'free', order: 5 },
      { _id: 'table_6', type: 'table', name: 'Asztal 6', seats: 8, status: 'free', order: 6 },
      { _id: 'table_7', type: 'table', name: 'Bár 1', seats: 2, status: 'free', order: 7 },
      { _id: 'table_8', type: 'table', name: 'Bár 2', seats: 2, status: 'free', order: 8 },
      { _id: 'table_9', type: 'table', name: 'Terasz 1', seats: 4, status: 'free', order: 9 },
      { _id: 'table_10', type: 'table', name: 'Terasz 2', seats: 4, status: 'free', order: 10 }
    ];
    
    for (const table of defaultTables) {
      await tablesDb.insert(table);
    }
    
  } catch (error) {
    console.error('Hiba az alapértelmezett asztalok létrehozásakor:', error);
  }
};

// Fő függvény
const main = async () => {
  // CouchDB kapcsolat ellenőrzése
  const isConnected = await checkCouchDBConnection();
  
  if (!isConnected) {
    console.error('Nem sikerült kapcsolódni a CouchDB szerverhez!');
    console.error('Kérjük ellenőrizze a következőket:');
    console.error('1. Fut-e a CouchDB szerver?');
    console.error('2. Helyesek-e a kapcsolódási adatok (.env fájlban)?');
    console.error('3. Elérhető-e a CouchDB a megadott URL-en?');
    process.exit(1);
  }
  
  // Adatbázisok létrehozása
  await createDatabases();
  
  // Indexek létrehozása
  await createIndexes();
  
  // Design dokumentumok létrehozása
  await createDesignDocuments();
  
  // Alapértelmezett adatok létrehozása
  await createDefaultSettings();
  await createDefaultMenuCategories();
  await createDefaultTables();
  
  process.exit(0);
};

// Futtatás
main().catch(error => {
  console.error('Nem várt hiba történt:', error);
  process.exit(1);
}); 