// Express szerver a CouchDB és a böngésző közötti közvetítéshez
import express from 'express';
import cors from 'cors';
import nano from 'nano';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Környezeti változók betöltése
dotenv.config();

// __dirname beállítása ES modules esetén
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Környezeti változók
const COUCHDB_URL = process.env.VITE_COUCHDB_URL || 'http://localhost:5984';
const COUCHDB_USER = process.env.VITE_COUCHDB_USER || 'admin';
const COUCHDB_PASSWORD = process.env.VITE_COUCHDB_PASSWORD || 'password';
const PORT = process.env.PORT || 3000;

// CouchDB kapcsolat létrehozása
const couchdbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COUCHDB_URL.replace('http://', '')}`;
const couchdb = nano(couchdbUrl);

// Express alkalmazás létrehozása
const app = express();

// Middleware-ek
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// Adatbázisok listája
const databases = [
  'restaurant_menu',
  'restaurant_tables',
  'restaurant_orders',
  'restaurant_invoices',
  'restaurant_settings',
  'restaurant_reservations',
  'restaurant_customers'
];

// Adatbázisok létrehozása, ha nem léteznek
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
    
    // Rendelések indexe státusz és dátum szerint
    const ordersDb = couchdb.use('restaurant_orders');
    await ordersDb.createIndex({
      index: {
        fields: ['status', 'createdAt']
      },
      name: 'order-status-date-index'
    });
    
    // Rendelések indexe típus és dátum szerint
    await ordersDb.createIndex({
      index: {
        fields: ['type', 'createdAt']
      },
      name: 'order-type-date-index'
    });
    
    // Rendelések indexe csak dátum szerint
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
app.listen(PORT, async () => {
  // Adatbázisok létrehozása
  await createDatabases();
  
  // Indexek létrehozása
  await createIndexes();
  
  // Design dokumentumok létrehozása
  await createDesignDocuments();
}); 