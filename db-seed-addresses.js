// Adatbázis feltöltő script - Címek
import dotenv from 'dotenv';
import nano from 'nano';

dotenv.config();

// CouchDB kapcsolat beállítása
const couchdbUrl = process.env.COUCHDB_URL || 'http://admin:password@localhost:5984';
const couchdb = nano(couchdbUrl);

// Az adatbázis, amit használni fogunk
const DB_NAME = 'restaurant_addresses';
let addressesDB;

// Az adatbázis és a nézetek létrehozása
const setupAddressDatabase = async () => {
  try {
    console.log('Címek adatbázis és nézetek létrehozása...');
    
    // Ellenőrizzük, hogy létezik-e az adatbázis
    try {
      await couchdb.db.get(DB_NAME);
      console.log(`A(z) ${DB_NAME} adatbázis már létezik.`);
    } catch (error) {
      if (error.statusCode === 404) {
        // Ha nem létezik, létrehozzuk
        await couchdb.db.create(DB_NAME);
        console.log(`A(z) ${DB_NAME} adatbázis létrehozva.`);
      } else {
        throw error;
      }
    }
    
    // Adatbázis referencia beállítása
    addressesDB = couchdb.use(DB_NAME);
    
    // Design document ellenőrzése és létrehozása
    try {
      await addressesDB.get('_design/addresses');
      console.log('A címek design document már létezik.');
    } catch (error) {
      if (error.statusCode === 404) {
        // Ha nem létezik, létrehozzuk
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
        
        await addressesDB.insert(designDoc);
        console.log('Címek design dokumentum létrehozva.');
      } else {
        throw error;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Hiba az adatbázis és nézetek létrehozásakor:', error);
    throw error;
  }
};

// Teljes cím összeállítása
const composeFullAddress = (address) => {
  let parts = [];
  
  if (address.zipCode) {
    parts.push(address.zipCode);
  }
  
  if (address.city) {
    parts.push(address.city);
  }
  
  if (address.street) {
    parts.push(address.street);
  }
  
  return parts.join(', ');
};

// Címek feltöltése
const seedAddresses = async () => {
  try {
    console.log('Címek feltöltése...');
    
    // Ellenőrizzük, hogy van-e már cím az adatbázisban
    const existingAddresses = await addressesDB.view('addresses', 'by_street');
    if (existingAddresses.rows.length > 0) {
      console.log(`Az adatbázisban már ${existingAddresses.rows.length} cím van. Feltöltés megszakítva.`);
      console.log('Ha új címekkel szeretné feltölteni, előbb törölje az adatbázist.');
      return false;
    }
    
    // Sándorfalva településhez tartozó utcák listája
    const sandorfalvaAddresses = [
      { street: 'Ady Endre utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Akácfa utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Alkotmány körút', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Álmos utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Aradi utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Arató utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Árpád utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Attila utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Béke utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Bod Árpád utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Bodza utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Borostyán utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Brassói utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Cinke utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Citera utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Csongrádi utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Csuka utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Dalos utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Dóci utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Dózsa György utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Endresz utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Erdészház utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Erdő sor', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Fácán utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Farkas utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Fecske dűlő', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Fehérföldes út', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Fehértói kertsor', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Fürj utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Galagonya utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Gyöngyvirág utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Harcsa utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Hattyú utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Hét vezér utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Homok dűlő', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Hunyadi utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Ilona utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Iskola utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Jókai Mór utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Juhar utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Kapcaszékdűlő', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Kassai utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Kishomok köz', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Kis körút', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Kis utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Kolozsvári utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Korsó utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Kossuth Lajos utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Kökény utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Kölcsey Ferenc utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Kőris utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Kővágói kerékpáros pihenőhely', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Lénia', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Lila akác köz', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Major utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Május 1. tér', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Maros utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Mátyás utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Munkácsy Mihály utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Nádastó utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Nádas utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Nefelejcs utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Nyírfa utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Orgona utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Őz utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Petőfi Sándor utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Póling utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Ponty utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Pozsonyi utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Pusztaszeri utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Rákóczi utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Rét utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Rigó utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Rózsa utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Sétány a Nádastó Szabadidőparkhoz', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Sövényházi út', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Sport utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Strand utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Süllő utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Szabadkai utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Szabadság tér', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Széchenyi utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Szeder utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Szegedi utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Szegfű utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Szent Imre utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Szent István utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Temesvári utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Tigris utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Tisza utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Tópart utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Tó utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Tölgy utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Vadkacsa utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Vitéz utca', city: 'Sándorfalva', zipCode: '6762' },
      { street: 'Zrínyi utca', city: 'Sándorfalva', zipCode: '6762' }
    ];
    
    // Minden utcát egyszer adunk hozzá házszám nélkül
    const allAddresses = [];
    
    for (const baseAddress of sandorfalvaAddresses) {
      const address = { 
        ...baseAddress, 
        type: 'address',
        active: true,
        createdAt: new Date().toISOString()
      };
      
      // Teljes cím összeállítása
      address.fullAddress = composeFullAddress(address);
      
      allAddresses.push(address);
    }
    
    // Címek feltöltése egyetlen csomagban
    console.log(`${allAddresses.length} cím feltöltése...`);
      
    // bulk insert
    const response = await addressesDB.bulk({ docs: allAddresses });
    
    if (response && response.length) {
      console.log(`${response.length} cím sikeresen feltöltve.`);
    }
    
    console.log(`Összesen ${allAddresses.length} cím sikeresen feltöltve.`);
    return true;
  } catch (error) {
    console.error('Hiba a címek feltöltésekor:', error);
    throw error;
  }
};

// Főprogram
const main = async () => {
  try {
    console.log('Címek feltöltése az adatbázisba...');
    
    // Adatbázis és nézetek létrehozása
    await setupAddressDatabase();
    
    // Címek feltöltése
    await seedAddresses();
    
    console.log('Címek feltöltése sikeresen befejeződött!');
    process.exit(0);
  } catch (error) {
    console.error('Hiba a script futtatásakor:', error);
    process.exit(1);
  }
};

// Script indítása
main(); 