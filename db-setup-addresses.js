// Script for creating and initializing the restaurant_addresses database

import fetch from 'node-fetch';
import 'dotenv/config';

// CouchDB connection details
const COUCHDB_URL = process.env.VITE_COUCHDB_URL || 'http://localhost:5984';
const COUCHDB_USER = process.env.VITE_COUCHDB_USER || 'admin';
const COUCHDB_PASSWORD = process.env.VITE_COUCHDB_PASSWORD || 'password';
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

// Basic authentication header
const authHeader = 'Basic ' + Buffer.from(`${COUCHDB_USER}:${COUCHDB_PASSWORD}`).toString('base64');

// Create the restaurant_addresses database
const createAddressesDatabase = async () => {
  try {
    console.log('Creating restaurant_addresses database...');
    const response = await fetch(`${COUCHDB_URL}/restaurant_addresses`, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Database created successfully:', data);
      return true;
    } else if (data.error === 'file_exists') {
      console.log('Database already exists:', data);
      return true;
    } else {
      console.error('Failed to create database:', data);
      return false;
    }
  } catch (error) {
    console.error('Error creating database:', error);
    return false;
  }
};

// Create design document for addresses
const createAddressesDesignDoc = async () => {
  try {
    console.log('Creating design document for addresses...');
    
    // Check if the design document already exists
    const checkResponse = await fetch(`${COUCHDB_URL}/restaurant_addresses/_design/addresses`, {
      headers: {
        'Authorization': authHeader
      }
    });
    
    if (checkResponse.ok) {
      console.log('Design document already exists');
      return true;
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
    
    const response = await fetch(`${COUCHDB_URL}/restaurant_addresses/_design/addresses`, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(designDoc)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Design document created successfully:', data);
      return true;
    } else {
      console.error('Failed to create design document:', data);
      return false;
    }
  } catch (error) {
    console.error('Error creating design document:', error);
    return false;
  }
};

// Seed sample addresses (Sándorfalva)
const seedSampleAddresses = async () => {
  try {
    console.log('Seeding sample addresses...');
    
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
      for (let houseNumber = 1; houseNumber <= 10; houseNumber++) {
        addresses.push({
          type: 'address',
          street: street,
          houseNumber: houseNumber.toString(),
          city: 'Sándorfalva',
          zipCode: '6762',
          active: true,
          _id: `address_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          createdAt: new Date().toISOString()
        });
        
        // Short delay to ensure unique IDs
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
    
    // Save addresses in chunks of 10
    const chunks = [];
    for (let i = 0; i < addresses.length; i += 10) {
      chunks.push(addresses.slice(i, i + 10));
    }
    
    for (const chunk of chunks) {
      try {
        const response = await fetch(`${COUCHDB_URL}/restaurant_addresses/_bulk_docs`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ docs: chunk })
        });
        
        if (response.ok) {
          console.log(`Saved ${chunk.length} addresses successfully`);
        } else {
          console.error('Failed to save chunk of addresses:', await response.json());
        }
      } catch (error) {
        console.error('Error saving addresses:', error);
      }
    }
    
    console.log(`Total of ${addresses.length} sample addresses created`);
    return true;
  } catch (error) {
    console.error('Error seeding sample addresses:', error);
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
    
    // Seed sample addresses
    if (designDocCreated) {
      await seedSampleAddresses();
    }
  }
  
  console.log('Setup completed');
};

// Run the main function
main().catch(console.error); 