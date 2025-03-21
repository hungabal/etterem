// Adatbázis feltöltő script - Hamburgerek
import dotenv from 'dotenv';
import nano from 'nano';

dotenv.config();

// CouchDB kapcsolat beállítása
const couchdbUrl = process.env.COUCHDB_URL || 'http://admin:password@localhost:5984';
const couchdb = nano(couchdbUrl);

// Adatbázisok
const menuDB = couchdb.use('restaurant_menu');

// Hamburger kategória létrehozása
const createBurgerCategory = async () => {
  try {
    // Ellenőrizzük, hogy létezik-e már a kategória
    const existingCategories = await menuDB.find({
      selector: {
        type: 'category',
        name: 'Hamburgerek'
      }
    });

    if (existingCategories.docs.length > 0) {
      console.log('A Hamburgerek kategória már létezik, ID:', existingCategories.docs[0]._id);
      return existingCategories.docs[0]._id;
    }

    // Ha nem létezik, létrehozzuk
    const category = {
      _id: 'category_5', // Explicit ID megadása a konzisztencia érdekében
      type: 'category',
      name: 'Hamburgerek',
      order: 5 // Sorrend a menüben - javítva 3-ról 5-re a db-setup.js-sel való konzisztencia érdekében
    };

    const response = await menuDB.insert(category);
    console.log('Hamburgerek kategória létrehozva, ID:', response.id);
    return response.id;
  } catch (error) {
    console.error('Hiba a Hamburgerek kategória létrehozásakor:', error);
    throw error;
  }
};

// Hamburgerek feltöltése
const seedBurgers = async (categoryId) => {
  try {
    // Ellenőrizzük, hogy a categoryId valóban 'category_5'
    if (categoryId !== 'category_5') {
      console.warn(`Figyelem: A kategória ID (${categoryId}) nem egyezik az elvárt 'category_5' értékkel. Javítás...`);
      categoryId = 'category_5';
    }

    // Hamburgerek listája
    const burgers = [
      {
        name: 'Sima Burger',
        description: 'buci, húspogácsa, sali, paradicsom, uborka, lilahagyma',
        price: 1700,
        isAvailable: true,
        allergens: ['glutén']
      },
      {
        name: 'Sajtburger',
        description: 'buci, húspogácsa, sali, paradicsom, uborka, lilahagyma, sajt',
        price: 1950,
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Bacon Burger',
        description: 'buci, húspogácsa, sali, paradicsom, uborka, lilahagyma, pirított bacon',
        price: 1950,
        isAvailable: true,
        allergens: ['glutén']
      },
      {
        name: 'Cheddar Burger',
        description: 'buci, sali, húspogácsa, paradicsom, uborka, lila hagyma, cheddar sajt, jalapeño paprika, bacon',
        price: 2400,
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Hamburger tál sültburgonyával',
        description: 'sült hagymakarikával, sima burgerrel (hamburger feltét + 350 Ft / feltét)',
        price: 2900,
        isAvailable: true,
        allergens: ['glutén']
      }
    ];

    // Alap hamburger leírás
    const baseDescription = 'Általad kiválasztott öntettel készítjük, amely lehet: Ketchup, Majonéz, Mustár, Csípős tejfölös öntet, Kapros tejfölös öntet, BBQ öntet';

    // Hamburgerek feltöltése
    for (const burger of burgers) {
      // Ellenőrizzük, hogy létezik-e már
      const existingBurgers = await menuDB.find({
        selector: {
          type: 'menuItem',
          category: categoryId,
          name: burger.name
        }
      });

      if (existingBurgers.docs.length > 0) {
        console.log(`A(z) ${burger.name} már létezik, frissítés...`);
        
        // Frissítjük a meglévő dokumentumot
        const existingBurger = existingBurgers.docs[0];
        const updatedBurger = {
          ...existingBurger,
          type: 'menuItem', // Explicit típus beállítása
          category: categoryId, // Explicit kategória beállítása
          description: burger.description,
          price: burger.price,
          isAvailable: burger.isAvailable,
          allergens: burger.allergens
        };
        
        await menuDB.insert(updatedBurger);
        console.log(`A(z) ${burger.name} frissítve.`);
      } else {
        // Új dokumentum létrehozása
        const menuItem = {
          type: 'menuItem', // Explicit típus beállítása
          category: categoryId, // Explicit kategória beállítása
          name: burger.name,
          description: burger.description,
          price: burger.price,
          isAvailable: burger.isAvailable,
          allergens: burger.allergens,
          imageUrl: '',
          baseDescription: baseDescription
        };
        
        const response = await menuDB.insert(menuItem);
        console.log(`A(z) ${burger.name} feltöltve, ID: ${response.id}`);
      }
    }

    console.log('Hamburgerek feltöltése sikeres!');
  } catch (error) {
    console.error('Hiba a hamburgerek feltöltésekor:', error);
    throw error;
  }
};

// Főprogram
const main = async () => {
  try {
    console.log('Hamburgerek feltöltése az adatbázisba...');
    
    // Kategória létrehozása vagy lekérése
    const categoryId = await createBurgerCategory();
    console.log(`Hamburgerek kategória ID: ${categoryId}`);
    
    // Hamburgerek feltöltése
    await seedBurgers(categoryId);
    
    console.log('Hamburgerek feltöltése sikeresen befejeződött!');
    process.exit(0);
  } catch (error) {
    console.error('Hiba a script futtatásakor:', error);
    process.exit(1);
  }
};

// Script indítása
main(); 