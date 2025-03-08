// Adatbázis feltöltő script - Saláták
import dotenv from 'dotenv';
import nano from 'nano';

dotenv.config();

// CouchDB kapcsolat beállítása
const couchdbUrl = process.env.COUCHDB_URL || 'http://admin:password@localhost:5984';
const couchdb = nano(couchdbUrl);

// Adatbázisok
const menuDB = couchdb.use('restaurant_menu');

// Saláta kategória létrehozása
const createSaladCategory = async () => {
  try {
    // Ellenőrizzük, hogy létezik-e már a kategória
    const existingCategories = await menuDB.find({
      selector: {
        type: 'category',
        name: 'Saláták'
      }
    });

    if (existingCategories.docs.length > 0) {
      console.log('A Saláták kategória már létezik, ID:', existingCategories.docs[0]._id);
      return existingCategories.docs[0]._id;
    }

    // Ha nem létezik, létrehozzuk
    const category = {
      _id: 'category_6', // Explicit ID megadása a konzisztencia érdekében
      type: 'category',
      name: 'Saláták',
      order: 6 // Sorrend a menüben - konzisztens a db-setup.js-sel
    };

    const response = await menuDB.insert(category);
    console.log('Saláták kategória létrehozva, ID:', response.id);
    return response.id;
  } catch (error) {
    console.error('Hiba a Saláták kategória létrehozásakor:', error);
    throw error;
  }
};

// Saláták feltöltése
const seedSalads = async () => {
  try {
    // Explicit kategória ID beállítása
    const categoryId = 'category_6';
    
    // Saláták listája
    const salads = [
      {
        name: 'Kukorica Saláta',
        description: 'saláta levél, kukorica, tartár',
        price: 1300,
        isAvailable: true,
        allergens: ['tej']
      },
      {
        name: 'Tojás Saláta',
        description: 'alap saláta, tojás, tartár',
        price: 1300,
        isAvailable: true,
        allergens: ['tojás', 'tej']
      },
      {
        name: 'Tonhal Saláta',
        description: 'alap saláta, tonhal, olíva',
        price: 1790,
        isAvailable: true,
        allergens: ['hal']
      },
      {
        name: 'Görög Saláta',
        description: 'alap saláta, olíva, feta sajt, oregánó',
        price: 1790,
        isAvailable: true,
        allergens: ['tej']
      },
      {
        name: 'Hawaii Saláta',
        description: 'salátalevél, kukorica, ananász, csirke, tartár',
        price: 1790,
        isAvailable: true,
        allergens: ['tej']
      },
      {
        name: 'Csirke Saláta',
        description: 'alap saláta, fűszeres csirke, tartár',
        price: 1790,
        isAvailable: true,
        allergens: ['tej']
      },
      {
        name: 'Csípős Csirke Saláta',
        description: 'alap saláta, csípős csirke, csípős tejföl',
        price: 1790,
        isAvailable: true,
        allergens: ['tej']
      },
      {
        name: 'Fokhagymás Csirke Saláta',
        description: 'alap saláta, csirke, fokhagymás-tejfölös öntet',
        price: 1790,
        isAvailable: true,
        allergens: ['tej']
      },
      {
        name: 'Négysajtos Saláta',
        description: 'alap saláta, feta, mozzarella, cheddar, trappista sajt',
        price: 1790,
        isAvailable: true,
        allergens: ['tej']
      },
      {
        name: 'Ház Salátája',
        description: 'salátalevél, kukorica, póréhagyma, fűszeres csirke, bacon',
        price: 1790,
        isAvailable: true,
        allergens: []
      }
    ];

    // Alap saláta leírás
    const baseDescription = 'Alap saláta: saláta, répa, paradicsom, kukorica';

    // Saláták feltöltése
    for (const salad of salads) {
      // Ellenőrizzük, hogy létezik-e már
      const existingSalads = await menuDB.find({
        selector: {
          type: 'menuItem',
          category: categoryId,
          name: salad.name
        }
      });

      if (existingSalads.docs.length > 0) {
        console.log(`A(z) ${salad.name} már létezik, frissítés...`);
        
        // Frissítjük a meglévő dokumentumot
        const existingSalad = existingSalads.docs[0];
        const updatedSalad = {
          ...existingSalad,
          type: 'menuItem',
          category: categoryId,
          description: salad.description,
          price: salad.price,
          isAvailable: salad.isAvailable,
          allergens: salad.allergens
        };
        
        await menuDB.insert(updatedSalad);
        console.log(`A(z) ${salad.name} frissítve.`);
      } else {
        // Új dokumentum létrehozása
        const menuItem = {
          _id: `menuItem_salad_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          type: 'menuItem',
          category: categoryId,
          name: salad.name,
          description: salad.description,
          price: salad.price,
          isAvailable: salad.isAvailable,
          allergens: salad.allergens,
          imageUrl: '',
          baseDescription: baseDescription
        };
        
        const response = await menuDB.insert(menuItem);
        console.log(`A(z) ${salad.name} feltöltve, ID: ${response.id}`);
      }
    }

    console.log('Saláták feltöltése sikeres!');
  } catch (error) {
    console.error('Hiba a saláták feltöltésekor:', error);
    throw error;
  }
};

// Főprogram
const main = async () => {
  try {
    console.log('Saláták feltöltése az adatbázisba...');
    
    // Kategória létrehozása vagy lekérése
    const categoryId = await createSaladCategory();
    console.log(`Saláták kategória ID: ${categoryId}`);
    
    // Saláták feltöltése
    await seedSalads();
    
    console.log('Saláták feltöltése sikeresen befejeződött!');
    process.exit(0);
  } catch (error) {
    console.error('Hiba a script futtatásakor:', error);
    process.exit(1);
  }
};

// Script indítása
main(); 