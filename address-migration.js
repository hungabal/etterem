// Script to create and seed the restaurant_addresses database without affecting other databases
import dotenv from 'dotenv';
import nano from 'nano';
import 'dotenv/config';

// Load environment variables
dotenv.config();

// CouchDB connection details
const COUCHDB_URL = process.env.VITE_COUCHDB_URL || 'http://localhost:5984';
const COUCHDB_USER = process.env.VITE_COUCHDB_USER || 'admin';
const COUCHDB_PASSWORD = process.env.VITE_COUCHDB_PASSWORD || 'password';

// CouchDB connection
const couchdbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COUCHDB_URL.replace('http://', '')}`;
const couchdb = nano(couchdbUrl);

// Check if the restaurant_addresses database exists
const checkDatabaseExists = async () => {
  try {
    const dbs = await couchdb.db.list();
    return dbs.includes('restaurant_addresses');
  } catch (error) {
    console.error('Error checking database existence:', error);
    return false;
  }
};

// Create the restaurant_addresses database if it doesn't exist
const createAddressesDatabase = async () => {
  try {
    const exists = await checkDatabaseExists();
    
    if (exists) {
      console.log('restaurant_addresses database already exists');
      return true;
    }
    
    console.log('Creating restaurant_addresses database...');
    await couchdb.db.create('restaurant_addresses');
    console.log('Database created successfully');
    return true;
  } catch (error) {
    console.error('Error creating database:', error);
    return false;
  }
};

// Create design document for addresses
const createAddressesDesignDoc = async () => {
  try {
    const addressesDb = couchdb.use('restaurant_addresses');
    
    // Check if the design document already exists
    try {
      await addressesDb.get('_design/addresses');
      console.log('Design document already exists');
      return true;
    } catch (error) {
      if (error.statusCode !== 404) {
        throw error;
      }
    }
    
    // Design document for addresses
    const designDoc = {
      _id: '_design/addresses',
      views: {
        by_street: {
          map: "function (doc) { if (doc.type === 'address') { emit(doc.street, doc); } }"
        },
        by_city: {
          map: "function (doc) { if (doc.type === 'address') { emit(doc.city, doc); } }"
        },
        by_full: {
          map: "function (doc) { if (doc.type === 'address') { emit(doc.fullAddress, doc); } }"
        }
      }
    };
    
    await addressesDb.insert(designDoc);
    console.log('Design document created successfully');
    return true;
  } catch (error) {
    console.error('Error creating design document:', error);
    return false;
  }
};

// Create index for addresses
const createAddressesIndex = async () => {
  try {
    const addressesDb = couchdb.use('restaurant_addresses');
    
    // Create index for street
    await addressesDb.createIndex({
      index: {
        fields: ['street']
      },
      name: 'address-street-index'
    });
    
    // Create index for city
    await addressesDb.createIndex({
      index: {
        fields: ['city']
      },
      name: 'address-city-index'
    });
    
    // Create index for type
    await addressesDb.createIndex({
      index: {
        fields: ['type']
      },
      name: 'address-type-index'
    });
    
    console.log('Indexes created successfully');
    return true;
  } catch (error) {
    console.error('Error creating indexes:', error);
    return false;
  }
};

// Main function
const main = async () => {
  // Create database
  const dbCreated = await createAddressesDatabase();
  
  if (dbCreated) {
    // Create design document
    const designDocCreated = await createAddressesDesignDoc();
    
    // Create indexes
    const indexesCreated = await createAddressesIndex();
    
    // Csak a struktúrát hozzuk létre, adatokat nem töltünk fel
    console.log('Address database structure created successfully');
  }
  
  console.log('Migration completed');
};

// Run the main function
main().catch(console.error); 