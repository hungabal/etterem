// Import our CouchDB service
import couchDBService from './couchdb-service.js';
import { ref } from 'vue';

// Reactive state for tables
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

// Inicializálás
loadTables();

export const tableService = {
  // Asztalok lekérése
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
  
  // Asztal létrehozása
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
      
      // Asztal mentése
      const result = await couchDBService.saveTable(tableData);
      
      // Frissítjük a helyi állapotot
      await loadTables();
      
      return result;
    } catch (error) {
      console.error('Hiba az asztal létrehozásakor:', error);
      throw error;
    }
  },
  
  // Asztal frissítése
  async updateTable(tableId, tableData) {
    try {
      // Lekérjük az asztalt
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
      
      // Mentjük a frissített asztalt
      const result = await couchDBService.saveTable(updatedTable);
      
      // Frissítjük a helyi állapotot
      await loadTables();
      
      return result;
    } catch (error) {
      console.error('Hiba az asztal frissítésekor:', error);
      throw error;
    }
  },
  
  // Asztal törlése
  async deleteTable(tableId) {
    try {
      // Lekérjük az asztalt
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
  
  // Foglalás frissítése
  async updateReservation(tableId, reservationData) {
    try {
      // Lekérjük az asztalt
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
  
  // Foglalás törlése
  async deleteReservation(tableId) {
    try {
      // Lekérjük az asztalt
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