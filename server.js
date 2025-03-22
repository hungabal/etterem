// Express szerver a CouchDB és a böngésző közötti közvetítéshez
// Ez a szerver biztosítja az API-t, amelyen keresztül a frontend kommunikál a CouchDB adatbázissal
import express from 'express';
import cors from 'cors';
import nano from 'nano';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Környezeti változók betöltése a .env fájlból
dotenv.config();

// __dirname beállítása ES modules esetén
// Ez szükséges, mert az ES modulok nem biztosítják a __dirname változót
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Környezeti változók beállítása
// Ezek a változók a CouchDB kapcsolathoz és a szerver portjához szükségesek
const COUCHDB_URL = process.env.VITE_COUCHDB_URL || 'http://localhost:5984';
const COUCHDB_USER = process.env.VITE_COUCHDB_USER || 'admin';
const COUCHDB_PASSWORD = process.env.VITE_COUCHDB_PASSWORD || 'password';
const PORT = process.env.PORT || 3003;

// CouchDB kapcsolat létrehozása
// A nano könyvtár segítségével kapcsolódunk a CouchDB-hez
const couchdbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COUCHDB_URL.replace('http://', '')}`;
const couchdb = nano(couchdbUrl);

// Express alkalmazás létrehozása
// Ez az alkalmazás fogja kezelni a HTTP kéréseket
const app = express();

// Middleware-ek beállítása
// Ezek a middleware-ek kezelik a kérések előfeldolgozását
app.use(cors());  // Cross-Origin Resource Sharing engedélyezése
app.use(express.json());  // JSON kérések feldolgozása
app.use(express.static(join(__dirname, 'dist')));  // Statikus fájlok kiszolgálása

// Adatbázisok listája
// Ezek az adatbázisok tárolják az alkalmazás különböző adatait
const databases = [
  'restaurant_menu',       // Étlap adatok
  'restaurant_tables',     // Asztalok adatai
  'restaurant_orders',     // Rendelések
  'restaurant_invoices',   // Számlák
  'restaurant_settings',   // Beállítások
  'restaurant_reservations', // Foglalások
  'restaurant_customers',   // Ügyfelek
  'restaurant_archived_orders', // Archivált rendelések
  'restaurant_couriers'    // Futárok
];

// Adatbázisok létrehozása, ha nem léteznek
// Ez a függvény ellenőrzi, hogy az adatbázisok léteznek-e, és ha nem, létrehozza őket
const createDatabases = async () => {
  try {
    const existingDbs = await couchdb.db.list();
    
    for (const dbName of databases) {
      if (!existingDbs.includes(dbName)) {
        await couchdb.db.create(dbName);
      }
    }
  } catch (error) {
    console.error('Hiba az adatbázisok létrehozásakor:', error);
  }
};

// Indexek létrehozása az adatbázisokban
// Az indexek gyorsítják a lekérdezéseket az adatbázisokban
const createIndexes = async () => {
  try {
    // Menü kategóriák indexe
    // Ez az index segít a menü kategóriák gyors lekérdezésében
    const menuDb = couchdb.use('restaurant_menu');
    await menuDb.createIndex({
      index: {
        fields: ['type', 'order']
      },
      name: 'type-order-index'
    });
    
    // Asztalok indexe
    // Ez az index segít az asztalok gyors lekérdezésében
    const tablesDb = couchdb.use('restaurant_tables');
    await tablesDb.createIndex({
      index: {
        fields: ['type', 'order']
      },
      name: 'table-order-index'
    });
    
    // Rendelések indexe státusz és dátum szerint
    // Ez az index segít a rendelések szűrésében státusz és dátum alapján
    const ordersDb = couchdb.use('restaurant_orders');
    await ordersDb.createIndex({
      index: {
        fields: ['status', 'createdAt']
      },
      name: 'order-status-date-index'
    });
    
    // Rendelések indexe típus és dátum szerint
    // Ez az index segít a rendelések szűrésében típus és dátum alapján
    await ordersDb.createIndex({
      index: {
        fields: ['type', 'createdAt']
      },
      name: 'order-type-date-index'
    });
    
    // Rendelések indexe csak dátum szerint
    // Ez az index segít a rendelések időrendi lekérdezésében
    await ordersDb.createIndex({
      index: {
        fields: ['createdAt']
      },
      name: 'order-date-index'
    });
    
    // Rendelések indexe asztal és státusz szerint
    await ordersDb.createIndex({
      index: {
        fields: ['tableId', 'status']
      },
      name: 'order-table-status-index'
    });
    
    // Számlák indexe
    const invoicesDb = couchdb.use('restaurant_invoices');
    await invoicesDb.createIndex({
      index: {
        fields: ['createdAt']
      },
      name: 'invoice-date-index'
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
    
    // Archivált rendelések indexei
    const archivedOrdersDb = couchdb.use('restaurant_archived_orders');
    await archivedOrdersDb.createIndex({
      index: {
        fields: ['type', 'archivedAt']
      },
      name: 'archived-order-date-index'
    });
    
    await archivedOrdersDb.createIndex({
      index: {
        fields: ['tableId']
      },
      name: 'archived-order-table-index'
    });
    
    // Futárok indexe státusz szerint
    // Ez az index segít a futárok szűrésében státusz alapján
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

// Root API végpont
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API szerver fut',
    databases: databases
  });
});

// API végpontok létrehozása minden adatbázishoz
databases.forEach(dbName => {
  const db = couchdb.use(dbName);
  
  // Dokumentumok lekérése
  app.get(`/api/db/${dbName}`, async (req, res) => {
    try {
      const result = await db.list({ include_docs: true });
      res.json(result.rows.map(row => row.doc));
    } catch (error) {
      console.error(`Hiba a(z) ${dbName} adatbázis lekérésekor:`, error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Dokumentum lekérése ID alapján
  app.get(`/api/db/${dbName}/:id`, async (req, res) => {
    try {
      const doc = await db.get(req.params.id);
      res.json(doc);
    } catch (error) {
      console.error(`Hiba a(z) ${dbName} dokumentum lekérésekor:`, error);
      res.status(404).json({ error: error.message });
    }
  });
  
  // View lekérése
  app.get(`/api/db/${dbName}/_design/:designDoc/_view/:viewName`, async (req, res) => {
    try {
      const result = await db.view(req.params.designDoc, req.params.viewName, req.query);
      res.json(result);
    } catch (error) {
      console.error(`Hiba a(z) ${dbName} view lekérésekor:`, error);
      res.status(404).json({ error: error.message });
    }
  });
  
  // Dokumentum létrehozása/frissítése
  app.post(`/api/db/${dbName}`, async (req, res) => {
    try {
      const result = await db.insert(req.body);
      res.json(result);
    } catch (error) {
      console.error(`Hiba a(z) ${dbName} dokumentum mentésekor:`, error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Dokumentum törlése
  app.delete(`/api/db/${dbName}/:id`, async (req, res) => {
    try {
      const doc = await db.get(req.params.id);
      const result = await db.destroy(doc._id, doc._rev);
      res.json(result);
    } catch (error) {
      console.error(`Hiba a(z) ${dbName} dokumentum törlésekor:`, error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Keresés az adatbázisban
  app.post(`/api/db/${dbName}/_find`, async (req, res) => {
    try {
      const result = await db.find(req.body);
      res.json(result);
    } catch (error) {
      console.error(`Hiba a(z) ${dbName} adatbázisban való keresésnél:`, error);
      res.status(500).json({ error: error.message });
    }
  });
});

// Régi API végpontok megtartása a kompatibilitás érdekében
databases.forEach(dbName => {
  const db = couchdb.use(dbName);
  
  // Dokumentumok lekérése
  app.get(`/api/${dbName}`, async (req, res) => {
    try {
      const result = await db.list({ include_docs: true });
      res.json(result.rows.map(row => row.doc));
    } catch (error) {
      console.error(`Hiba a(z) ${dbName} adatbázis lekérésekor:`, error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Dokumentum lekérése ID alapján
  app.get(`/api/${dbName}/:id`, async (req, res) => {
    try {
      const doc = await db.get(req.params.id);
      res.json(doc);
    } catch (error) {
      console.error(`Hiba a(z) ${dbName} dokumentum lekérésekor:`, error);
      res.status(404).json({ error: error.message });
    }
  });
  
  // View lekérése
  app.get(`/api/${dbName}/_design/:designDoc/_view/:viewName`, async (req, res) => {
    try {
      const result = await db.view(req.params.designDoc, req.params.viewName, req.query);
      res.json(result);
    } catch (error) {
      console.error(`Hiba a(z) ${dbName} view lekérésekor:`, error);
      res.status(404).json({ error: error.message });
    }
  });
  
  // Dokumentum létrehozása/frissítése
  app.post(`/api/${dbName}`, async (req, res) => {
    try {
      const result = await db.insert(req.body);
      res.json(result);
    } catch (error) {
      console.error(`Hiba a(z) ${dbName} dokumentum mentésekor:`, error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Dokumentum törlése
  app.delete(`/api/${dbName}/:id`, async (req, res) => {
    try {
      const doc = await db.get(req.params.id);
      const result = await db.destroy(doc._id, doc._rev);
      res.json(result);
    } catch (error) {
      console.error(`Hiba a(z) ${dbName} dokumentum törlésekor:`, error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Keresés az adatbázisban
  app.post(`/api/${dbName}/_find`, async (req, res) => {
    try {
      const result = await db.find(req.body);
      res.json(result);
    } catch (error) {
      console.error(`Hiba a(z) ${dbName} adatbázisban való keresésnél:`, error);
      res.status(500).json({ error: error.message });
    }
  });
});

// Szerver indítása
app.listen(PORT, '0.0.0.0', async () => {
  // Adatbázisok létrehozása
  await createDatabases();
  
  // Indexek létrehozása
  await createIndexes();
  
  // Design dokumentumok létrehozása
  await createDesignDocuments();
  
  console.log(`Szerver fut a http://0.0.0.0:${PORT} címen`);
}); 