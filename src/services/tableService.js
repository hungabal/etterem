// Import our CouchDB service
import couchDBService from './couchdb-service.js';
import { ref } from 'vue';

// Reaktív állapot az asztalok tárolására
const tables = ref([]);

// Asztalok lekérése és tárolása a reaktív állapotban
async function loadTables() {
  try {
    const result = await couchDBService.getAllTables();
    tables.value = result;
    return result;
  } catch (error) {
    console.error('Hiba az asztalok betöltésekor:', error);
    return [];
  }
}

// Inicializálás - Az alkalmazás indításakor betöltjük az asztalokat
loadTables();

export const tableService = {
  // Asztalok lekérése az adatbázisból
  // Visszaadja az összes asztalt friss adatokkal
  async getTables() {
    try {
      // Mindig friss adatokat kérünk le az adatbázisból
      return await loadTables();
    } catch (error) {
      console.error('Hiba a getTables műveletben:', error);
      console.error('Részletes hiba:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      return [];
    }
  },
  
  // Új asztal létrehozása az adatbázisban
  // A tableData objektum tartalmazza az asztal adatait (név, kapacitás, stb.)
  async createTable(tableData) {
    try {
      // Típus beállítása
      tableData.type = 'table';
      
      // Biztosítjuk, hogy a seats tulajdonság be legyen állítva
      if (tableData.capacity && !tableData.seats) {
        tableData.seats = tableData.capacity;
      } else if (tableData.seats && !tableData.capacity) {
        tableData.capacity = tableData.seats;
      } else if (!tableData.seats && !tableData.capacity) {
        tableData.seats = 4;
        tableData.capacity = 4;
      }
      
      // Asztal mentése az adatbázisba
      const result = await couchDBService.saveTable(tableData);
      
      // Frissítjük a helyi állapotot
      await loadTables();
      
      return result;
    } catch (error) {
      console.error('Hiba az asztal létrehozásakor:', error);
      throw error;
    }
  },
  
  // Meglévő asztal adatainak frissítése
  // tableId: a frissítendő asztal azonosítója
  // tableData: az új adatok, amelyekkel frissíteni kell az asztalt
  async updateTable(tableId, tableData) {
    try {
      // Lekérjük az asztalt az adatbázisból
      const table = await couchDBService.getTableById(tableId);
      
      // Frissítjük az adatokat
      const updatedTable = { ...table, ...tableData };
      
      // Biztosítjuk, hogy a seats tulajdonság be legyen állítva
      if (updatedTable.capacity && !updatedTable.seats) {
        updatedTable.seats = updatedTable.capacity;
      } else if (updatedTable.seats && !updatedTable.capacity) {
        updatedTable.capacity = updatedTable.seats;
      } else if (!updatedTable.seats && !updatedTable.capacity) {
        updatedTable.seats = 4;
        updatedTable.capacity = 4;
      }
      
      // Mentjük a frissített asztalt az adatbázisba
      const result = await couchDBService.saveTable(updatedTable);
      
      // Frissítjük a helyi állapotot
      await loadTables();
      
      return result;
    } catch (error) {
      console.error('Hiba az asztal frissítésekor:', error);
      throw error;
    }
  },
  
  // Asztal törlése az adatbázisból
  // tableId: a törlendő asztal azonosítója
  async deleteTable(tableId) {
    try {
      // Lekérjük az asztalt az adatbázisból
      const table = await couchDBService.getTableById(tableId);
      
      // Töröljük az asztalt
      await couchDBService.deleteTable(table._id, table._rev);
      
      // Frissítjük a helyi állapotot
      await loadTables();
      
      return { success: true };
    } catch (error) {
      console.error('Hiba az asztal törlésekor:', error);
      throw error;
    }
  },
  
  // Asztal foglalásának frissítése
  // tableId: a foglalással érintett asztal azonosítója
  // reservationData: a foglalás adatai (név, időpont, stb.)
  async updateReservation(tableId, reservationData) {
    try {
      // Lekérjük az asztalt az adatbázisból
      const table = await couchDBService.getTableById(tableId);
      
      // Frissítjük a foglalást
      table.reservation = reservationData;
      table.status = reservationData ? 'reserved' : 'free';
      
      // Mentjük a frissített asztalt
      const result = await couchDBService.saveTable(table);
      
      // Frissítjük a helyi állapotot
      await loadTables();
      
      return result;
    } catch (error) {
      console.error('Hiba a foglalás frissítésekor:', error);
      throw error;
    }
  },
  
  // Foglalás törlése egy asztalról
  // tableId: a foglalással érintett asztal azonosítója
  async deleteReservation(tableId) {
    try {
      // Lekérjük az asztalt az adatbázisból
      const table = await couchDBService.getTableById(tableId);
      
      // Töröljük a foglalást
      delete table.reservation;
      table.status = 'free';
      
      // Mentjük a frissített asztalt
      const result = await couchDBService.saveTable(table);
      
      // Frissítjük a helyi állapotot
      await loadTables();
      
      return result;
    } catch (error) {
      console.error('Hiba a foglalás törlésekor:', error);
      throw error;
    }
  },
  
  // Asztal státuszának frissítése
  // tableId: a frissítendő asztal azonosítója
  // status: az új státusz (pl. 'free', 'occupied', 'reserved')
  async updateTableStatus(tableId, status) {
    try {
      // Frissítjük az asztal státuszát
      const result = await couchDBService.updateTableStatus(tableId, status);
      
      // Frissítjük a helyi állapotot
      await loadTables();
      
      return result;
    } catch (error) {
      console.error('Hiba az asztal státuszának frissítésekor:', error);
      throw error;
    }
  }
}; 