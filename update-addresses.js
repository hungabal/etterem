// Script to update the address database with new street names
import couchDBService from './src/services/couchdb-service.js';
import 'dotenv/config';

// Állítsuk be az API URL-t manuálisan, ha az import.meta.env nem elérhető Node.js-ben
if (!globalThis.API_BASE_URL_SET) {
  globalThis.API_BASE_URL_SET = true;
  const API_URL = process.env.VITE_API_URL || 'http://localhost:3003/api';
  console.log(`Using API URL: ${API_URL}`);
  // Felülírjuk az API_BASE_URL-t az importált couchDBService-ben
  couchDBService.setApiBaseUrl?.(API_URL) || (couchDBService.API_BASE_URL = API_URL);
}

// Main function to initialize addresses
async function updateAddresses() {
  console.log('Starting address database update...');
  
  try {
    // Check if the API is available
    console.log('Checking API connection...');
    await couchDBService.apiRequest('');
    console.log('API connection successful');
    
    // Delete existing address database to start fresh
    console.log('Deleting existing address database...');
    try {
      await couchDBService.apiRequest('db/restaurant_addresses', 'DELETE');
      console.log('Existing address database deleted successfully');
    } catch (error) {
      console.log('No existing address database found or could not delete, creating new one');
    }
    
    // Create the address database and design document
    console.log('Creating address database and design document...');
    try {
      // Create database
      await couchDBService.apiRequest('db/restaurant_addresses', 'PUT');
      
      // Create design document
      const designDoc = {
        _id: '_design/addresses',
        views: {
          by_street: {
            map: 'function (doc) { if (doc.type === "address") { emit(doc.street, doc); } }'
          },
          by_city: {
            map: 'function (doc) { if (doc.type === "address") { emit(doc.city, doc); } }'
          },
          by_full: {
            map: 'function (doc) { if (doc.type === "address") { emit(doc.fullAddress, doc); } }'
          }
        }
      };
      
      await couchDBService.apiRequest('db/restaurant_addresses', 'POST', designDoc);
      console.log('Database and design document created successfully');
    } catch (error) {
      console.error('Error creating database or design document:', error);
    }
    
    // Seed the new addresses
    console.log('Seeding new addresses...');
    await couchDBService.seedSampleAddresses();
    console.log('Address database update completed successfully!');
    
  } catch (error) {
    console.error('Error updating address database:', error);
  }
}

// Run the update function
updateAddresses().catch(error => {
  console.error('Critical error during address database update:', error);
}); 