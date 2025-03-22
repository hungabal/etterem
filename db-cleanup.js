// CouchDB adatbázis tisztító szkript
// Ez a szkript törli a CouchDB adatbázisokat, hogy újra lehessen futtatni az inicializáló szkriptet

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

// Adatbázisok törlése
const deleteDatabases = async () => {
  const databases = [
    'restaurant_menu',
    'restaurant_tables',
    'restaurant_orders',
    'restaurant_invoices',
    'restaurant_settings',
    'restaurant_reservations',
    'restaurant_customers',
    'restaurant_archived_orders',
    'restaurant_couriers',
    'restaurant_addresses'
  ];
  
  try {
    const existingDbs = await couchdb.db.list();
    
    for (const dbName of databases) {
      if (existingDbs.includes(dbName)) {
        await couchdb.db.destroy(dbName);
      } else {
        console.warn(`A(z) ${dbName} adatbázis nem létezik, nincs mit törölni.`);
      }
    }
  } catch (error) {
    console.error('Hiba az adatbázisok törlésekor:', error);
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
  
  // Adatbázisok törlése
  await deleteDatabases();
  process.exit(0);
};

// Futtatás
main().catch(error => {
  console.error('Nem várt hiba történt:', error);
  process.exit(1);
}); 