// Script for creating and initializing the restaurant_addresses database through the API

import fetch from 'node-fetch';
import 'dotenv/config';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3003/api';

// Create the database and design document via the API
const setupAddressesDatabase = async () => {
  try {
    console.log('Setting up addresses database and design document...');
    
    // First, make a direct API call to create the design document with views
    // This will both create the database if it doesn't exist and add the design document
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
    
    // Try to create the design document through the API
    console.log('Creating design document via API...');
    const response = await fetch(`${API_BASE_URL}/db/restaurant_addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(designDoc)
    });
    
    const data = await response.json();
    console.log('Design document creation response:', data);
    
    return true;
  } catch (error) {
    console.error('Error setting up addresses database:', error);
    return false;
  }
};

// Seed sample addresses
const seedSampleAddresses = async () => {
  try {
    console.log('Seeding sample addresses via API...');
    
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
          fullAddress: `${street} ${houseNumber}, 6762 Sándorfalva`,
          active: true,
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
    
    let successCount = 0;
    
    for (const chunk of chunks) {
      try {
        // Save each address individually through the API
        for (const address of chunk) {
          const response = await fetch(`${API_BASE_URL}/db/restaurant_addresses`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(address)
          });
          
          if (response.ok) {
            successCount++;
            if (successCount % 10 === 0) {
              console.log(`Saved ${successCount} addresses so far...`);
            }
          } else {
            console.error('Failed to save address:', await response.json());
          }
        }
      } catch (error) {
        console.error('Error saving addresses chunk:', error);
      }
    }
    
    console.log(`Total of ${successCount} sample addresses created successfully out of ${addresses.length}`);
    return true;
  } catch (error) {
    console.error('Error seeding sample addresses:', error);
    return false;
  }
};

// Function to test if the addresses view is working
const testAddressesView = async () => {
  try {
    console.log('Testing address view...');
    const response = await fetch(`${API_BASE_URL}/db/restaurant_addresses/_design/addresses/_view/by_street`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Success! View returned ${data.rows?.length || 0} addresses.`);
      return true;
    } else {
      console.error('View test failed:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Error testing view:', error);
    return false;
  }
};

// Main function
const main = async () => {
  try {
    // Setup the database and design document
    await setupAddressesDatabase();
    
    // Wait a moment for CouchDB to create the views
    console.log('Waiting for CouchDB to create views...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test if the view is working
    const viewWorking = await testAddressesView();
    
    // If the view is working, seed the sample addresses
    if (viewWorking) {
      await seedSampleAddresses();
    } else {
      console.log('Skipping address seeding because view test failed.');
    }
    
    console.log('Setup process completed.');
  } catch (error) {
    console.error('Error in main process:', error);
  }
};

// Run the main function
main().catch(console.error); 