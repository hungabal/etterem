// Direct CouchDB design document creator script using nano

import nano from 'nano';
import 'dotenv/config';

// CouchDB connection details
const COUCHDB_URL = process.env.VITE_COUCHDB_URL || 'http://localhost:5984';
const COUCHDB_USER = process.env.VITE_COUCHDB_USER || 'admin';
const COUCHDB_PASSWORD = process.env.VITE_COUCHDB_PASSWORD || 'password';

// CouchDB connection
const couchdbUrl = `http://${COUCHDB_USER}:${COUCHDB_PASSWORD}@${COUCHDB_URL.replace('http://', '')}`;
const couchdb = nano(couchdbUrl);

// Design document creation
const createDesignDocument = async () => {
  try {
    console.log('Ensuring restaurant_addresses database exists...');
    let dbExists = false;
    
    try {
      // Check if database exists
      const dbList = await couchdb.db.list();
      dbExists = dbList.includes('restaurant_addresses');
    } catch (err) {
      console.error('Error checking databases:', err);
    }
    
    if (!dbExists) {
      console.log('Creating restaurant_addresses database...');
      try {
        await couchdb.db.create('restaurant_addresses');
        console.log('Database created successfully.');
      } catch (err) {
        if (err.statusCode === 412) {
          console.log('Database already exists.');
          dbExists = true;
        } else {
          console.error('Error creating database:', err);
          return false;
        }
      }
    } else {
      console.log('Database already exists.');
    }
    
    // Get reference to the database
    const addressesDb = couchdb.use('restaurant_addresses');
    
    // Check if design document exists
    let designDocExists = false;
    try {
      await addressesDb.get('_design/addresses');
      designDocExists = true;
      console.log('Design document already exists.');
    } catch (err) {
      if (err.statusCode !== 404) {
        console.error('Error checking for design document:', err);
      }
    }
    
    // Create design document if it doesn't exist
    if (!designDocExists) {
      console.log('Creating design document...');
      
      const designDoc = {
        _id: '_design/addresses',
        views: {
          by_street: {
            map: "function(doc) { if (doc.type === 'address') { emit(doc.street, doc); } }"
          },
          by_city: {
            map: "function(doc) { if (doc.type === 'address') { emit(doc.city, doc); } }"
          },
          by_full: {
            map: "function(doc) { if (doc.type === 'address') { emit(doc.fullAddress, doc); } }"
          }
        }
      };
      
      try {
        const response = await addressesDb.insert(designDoc);
        console.log('Design document created successfully:', response);
      } catch (err) {
        console.error('Error creating design document:', err);
        return false;
      }
    }
    
    // Test the view
    console.log('Testing view...');
    try {
      const result = await addressesDb.view('addresses', 'by_street');
      console.log(`View test successful. Found ${result.rows.length} addresses.`);
    } catch (err) {
      console.error('Error testing view:', err);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
};

// Seed sample addresses
const seedSampleAddresses = async () => {
  try {
    console.log('Seeding sample addresses...');
    
    // Get reference to the database
    const addressesDb = couchdb.use('restaurant_addresses');
    
    // Check if we already have addresses
    const existingAddresses = await addressesDb.view('addresses', 'by_street');
    if (existingAddresses.rows.length > 0) {
      console.log(`Database already has ${existingAddresses.rows.length} addresses. Skipping seeding.`);
      return true;
    }
    
    // Sándorfalva streets
    const sandorfalvaStreets = [
      'Alkotmány utca',
      'Aradi utca',
      'Árpád utca',
      'Attila utca',
      'Bem utca',
      'Bethlen utca',
      'Csongrádi utca',
      'Dózsa György utca',
      'Fő utca',
      'Kossuth utca',
      'Kölcsey utca',
      'Munkácsy utca',
      'Petőfi utca',
      'Rákóczi utca',
      'Széchenyi utca',
      'Táncsics utca',
      'Vörösmarty utca',
      'Zrínyi utca'
    ];
    
    // Create multiple addresses for each street (with different house numbers)
    const addresses = [];
    
    for (const street of sandorfalvaStreets) {
      for (let houseNumber = 1; houseNumber <= 20; houseNumber++) {
        addresses.push({
          type: 'address',
          street: street,
          houseNumber: houseNumber.toString(),
          city: 'Sándorfalva',
          zipCode: '6762',
          fullAddress: `${street} ${houseNumber}, 6762 Sándorfalva`,
          active: true,
          createdAt: new Date().toISOString()
        });
      }
    }
    
    // Save addresses in chunks of 50
    const chunks = [];
    for (let i = 0; i < addresses.length; i += 50) {
      chunks.push(addresses.slice(i, i + 50));
    }
    
    for (const [index, chunk] of chunks.entries()) {
      try {
        const response = await addressesDb.bulk({ docs: chunk });
        console.log(`Saved chunk ${index + 1}/${chunks.length} (${chunk.length} addresses)`);
      } catch (err) {
        console.error(`Error saving chunk ${index + 1}:`, err);
      }
    }
    
    console.log(`Seeded ${addresses.length} sample addresses.`);
    return true;
  } catch (err) {
    console.error('Error seeding addresses:', err);
    return false;
  }
};

// Main function
const main = async () => {
  console.log('Starting design document creation...');
  
  const designDocCreated = await createDesignDocument();
  if (designDocCreated) {
    console.log('Design document created successfully.');
    
    // Seed sample addresses
    await seedSampleAddresses();
  } else {
    console.error('Failed to create design document.');
  }
  
  console.log('Process completed.');
};

// Run the main function
main().catch(console.error); 