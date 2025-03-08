// Adatbázis feltöltő script - Pizzák
import dotenv from 'dotenv';
import nano from 'nano';

dotenv.config();

// CouchDB kapcsolat beállítása
const couchdbUrl = process.env.COUCHDB_URL || 'http://admin:password@localhost:5984';
const couchdb = nano(couchdbUrl);

// Adatbázisok
const menuDB = couchdb.use('restaurant_menu');
const settingsDB = couchdb.use('restaurant_settings');

// Pizza méretek létrehozása vagy frissítése a beállításokban
const setupPizzaSizes = async () => {
  try {
    // Beállítások lekérése
    let settings;
    try {
      settings = await settingsDB.get('settings');
    } catch (error) {
      console.log('Beállítások nem találhatók, új létrehozása...');
      settings = {
        _id: 'settings',
        restaurantName: 'Pizza Maestro',
        pizzaSizes: [],
        pizzaPricingType: 'custom',
        extraToppings: []
      };
    }

    // Pizza méretek definiálása
    const pizzaSizes = [
      { id: 'kicsi', name: 'Kicsi (20 cm)', priceMultiplier: 1, customPrice: 0 },
      { id: 'kozepes', name: 'Közepes (26 cm)', priceMultiplier: 1.3, customPrice: 0 },
      { id: 'nagy', name: 'Nagy (32 cm)', priceMultiplier: 1.6, customPrice: 0 },
      { id: 'csaladi', name: 'Családi (50 cm)', priceMultiplier: 2.2, customPrice: 0 }
    ];

    // Extra feltétek definiálása méretfüggő árakkal
    const extraToppings = [
      { 
        id: 'dupla_sajt', 
        name: 'Dupla sajt', 
        prices: { kicsi: 130, kozepes: 350, nagy: 430, csaladi: 590 }
      },
      { 
        id: 'plusz_kulon_pizzaszosz', 
        name: 'Plusz külön pizzaszósz', 
        prices: { kicsi: 170, kozepes: 170, nagy: 170, csaladi: 170 }
      }
    ];

    // Beállítások frissítése
    settings.pizzaSizes = pizzaSizes;
    settings.pizzaPricingType = 'custom'; // Egyedi árazás használata
    settings.extraToppings = extraToppings;

    // Beállítások mentése
    await settingsDB.insert(settings);
    console.log('Pizza méretek és feltétek beállítva a rendszerben.');

    return { pizzaSizes, extraToppings };
  } catch (error) {
    console.error('Hiba a pizza méretek és feltétek beállításakor:', error);
    throw error;
  }
};

// Pizza kategória létrehozása
const createPizzaCategory = async () => {
  try {
    // Ellenőrizzük, hogy létezik-e már a kategória
    const existingCategories = await menuDB.find({
      selector: {
        type: 'category',
        name: 'Pizzák'
      }
    });

    if (existingCategories.docs.length > 0) {
      console.log('A Pizzák kategória már létezik, ID:', existingCategories.docs[0]._id);
      return existingCategories.docs[0]._id;
    }

    // Ha nem létezik, létrehozzuk
    const category = {
      _id: 'category_4', // Explicit ID megadása a konzisztencia érdekében
      type: 'category',
      name: 'Pizzák',
      order: 1 // Sorrend a menüben (első helyen)
    };

    const response = await menuDB.insert(category);
    console.log('Pizzák kategória létrehozva, ID:', response.id);
    return response.id;
  } catch (error) {
    console.error('Hiba a Pizzák kategória létrehozásakor:', error);
    throw error;
  }
};

// Extra feltétek kategória létrehozása
const createToppingsCategory = async () => {
  try {
    // Ellenőrizzük, hogy létezik-e már a kategória
    const existingCategories = await menuDB.find({
      selector: {
        type: 'category',
        name: 'Extra feltétek'
      }
    });

    if (existingCategories.docs.length > 0) {
      console.log('Az Extra feltétek kategória már létezik, ID:', existingCategories.docs[0]._id);
      return existingCategories.docs[0]._id;
    }

    // Ha nem létezik, létrehozzuk
    const category = {
      _id: 'category_extra', // Explicit ID megadása a konzisztencia érdekében
      type: 'category',
      name: 'Extra feltétek',
      order: 10 // Sorrend a menüben (utolsó helyek egyikén)
    };

    const response = await menuDB.insert(category);
    console.log('Extra feltétek kategória létrehozva, ID:', response.id);
    return response.id;
  } catch (error) {
    console.error('Hiba az Extra feltétek kategória létrehozásakor:', error);
    throw error;
  }
};

// Pizzák feltöltése
const seedPizzas = async (categoryId, pizzaSizes) => {
  try {
    // Pizzák listája a különböző méretekhez tartozó árakkal
    const pizzas = [
      {
        name: 'Sajtos',
        description: 'paradicsomsos alap, sajt',
        prices: { kicsi: 1120, kozepes: 1500, nagy: 2000, csaladi: 3400 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Kukoricás',
        description: 'paradicsomsos alap, kukorica, sajt',
        prices: { kicsi: 1170, kozepes: 1750, nagy: 2350, csaladi: 3700 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Gombás',
        description: 'paradicsomsos alap, gomba, sajt',
        prices: { kicsi: 1170, kozepes: 1750, nagy: 2350, csaladi: 3700 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Sonkás',
        description: 'paradicsomsos alap, sonka, sajt',
        prices: { kicsi: 1270, kozepes: 1750, nagy: 2350, csaladi: 3700 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Tarjás',
        description: 'paradicsomsos alap, tarja, sajt',
        prices: { kicsi: 1270, kozepes: 1750, nagy: 2350, csaladi: 3700 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Szalámis',
        description: 'paradicsomsos alap, szalámi, sajt',
        prices: { kicsi: 1270, kozepes: 1750, nagy: 2350, csaladi: 3700 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Kolbászos',
        description: 'paradicsomsos alap, kolbász, sajt',
        prices: { kicsi: 1270, kozepes: 1750, nagy: 2350, csaladi: 3700 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Baconos',
        description: 'paradicsomsos alap, bacon, sajt',
        prices: { kicsi: 1270, kozepes: 1750, nagy: 2350, csaladi: 3700 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Bolognai',
        description: 'bolognai szósz, sajt',
        prices: { kicsi: 1270, kozepes: 1750, nagy: 2350, csaladi: 3700 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Sonkás-kukoricás',
        description: 'paradicsomsos alap, sonka, kukorica, sajt',
        prices: { kicsi: 1400, kozepes: 1850, nagy: 2550, csaladi: 4100 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Sonkás-gombás',
        description: 'paradicsomsos alap, sonka, gomba, sajt',
        prices: { kicsi: 1400, kozepes: 1850, nagy: 2550, csaladi: 4100 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Hawaii',
        description: 'paradicsomsos alap, sonka, ananász, sajt',
        prices: { kicsi: 1400, kozepes: 1850, nagy: 2550, csaladi: 4100 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Szalámis-pepperonis',
        description: 'paradicsomsos alap, szalámi, pepperoni, sajt',
        prices: { kicsi: 1400, kozepes: 1850, nagy: 2550, csaladi: 4100 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Tonhalas',
        description: 'paradicsomsos alap, tonhal, olíva, sajt',
        prices: { kicsi: 1400, kozepes: 2100, nagy: 2750, csaladi: 4500 },
        isAvailable: true,
        allergens: ['glutén', 'tej', 'hal']
      },
      {
        name: 'Mexikói',
        description: 'bolognai, chili paprika, bab, kukorica, sajt',
        prices: { kicsi: 1490, kozepes: 2100, nagy: 2750, csaladi: 4500 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Songoku',
        description: 'paradicsomsos alap, sonka, gomba, kukorica, sajt',
        prices: { kicsi: 1490, kozepes: 2100, nagy: 2750, csaladi: 4500 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Sonka - Gomba - Szalámi',
        description: 'paradicsomsos alap, sonka, gomba, szalámi, sajt',
        prices: { kicsi: 1490, kozepes: 2100, nagy: 2750, csaladi: 4500 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Falusi Csirke',
        description: 'tejföl alap, csirke, paprika, lilahagyma, sajt',
        prices: { kicsi: 1490, kozepes: 2100, nagy: 2750, csaladi: 4500 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Csípős Csirke',
        description: 'csípős tejföl alap, csirke, bacon, brokkoli, sajt',
        prices: { kicsi: 1490, kozepes: 2100, nagy: 2750, csaladi: 4500 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Maci Laci',
        description: 'sajtkrém alap, szalámi, csemege uborka, főtt tojás, sajt',
        prices: { kicsi: 1490, kozepes: 2100, nagy: 2750, csaladi: 4500 },
        isAvailable: true,
        allergens: ['glutén', 'tej', 'tojás']
      },
      {
        name: 'Csak köménnyel',
        description: 'fokhagymás tejföl alap, kolbász, bab, bacon, köménymag, sajt',
        prices: { kicsi: 1490, kozepes: 2100, nagy: 2750, csaladi: 4500 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Molly',
        description: 'sajtkrém alap, sonka, tarja, csemege uborka, sajt',
        prices: { kicsi: 1490, kozepes: 2100, nagy: 2750, csaladi: 4500 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Négy Évszak',
        description: 'paradicsomsos alap, sonka, gomba, kukorica, borsó, sajt',
        prices: { kicsi: 1590, kozepes: 2370, nagy: 2930, csaladi: 4900 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Négysajtos',
        description: 'paradicsomsos alap, cheddar-, fűstölt-, feta-, trappista sajt',
        prices: { kicsi: 1590, kozepes: 2370, nagy: 2930, csaladi: 4900 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Négy Szem Közt',
        description: 'tejföl alap, póréhagyma, csirke, 2 db tükörtojás, sajt',
        prices: { kicsi: 1590, kozepes: 2370, nagy: 2930, csaladi: 4900 },
        isAvailable: true,
        allergens: ['glutén', 'tej', 'tojás']
      },
      {
        name: 'Magyaros',
        description: 'csípős paradicsomsos alap, kolbász, erős paprika, lilahagyma, bacon, sajt',
        prices: { kicsi: 1590, kozepes: 2470, nagy: 3030, csaladi: 5100 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Húsfesztivál',
        description: 'paradicsomsos alap, kolbász, tarja, sonka, szalámi, sajt',
        prices: { kicsi: 1590, kozepes: 2370, nagy: 3080, csaladi: 5200 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Csibefutam',
        description: 'tejföl alap, csirke, jalapeno, paradicsom, bacon, sajt',
        prices: { kicsi: 1590, kozepes: 2370, nagy: 3080, csaladi: 5200 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Paprika Jancsi',
        description: 'csípős alap, kolbász, erős paprika, jalapeno, pepperoni, sajt',
        prices: { kicsi: 1590, kozepes: 2370, nagy: 3080, csaladi: 5200 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Vega',
        description: 'paradicsomsos alap, gomba, lilahagyma, paprika, kukorica, brokkoli, sajt',
        prices: { kicsi: 1590, kozepes: 2370, nagy: 3080, csaladi: 5200 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Csípős Vega',
        description: 'csípős alap, gomba, lilahagyma, paprika, kukorica, jalapeno, sajt',
        prices: { kicsi: 1590, kozepes: 2370, nagy: 3080, csaladi: 5200 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Juhász',
        description: 'tejföl alap, juhtúró, lilahagyma, bacon, paradicsom, sajt',
        prices: { kicsi: 1900, kozepes: 2580, nagy: 3150, csaladi: 5540 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Ötödik Elem',
        description: 'tejföl alap, sonka, tarja, lilahagyma, gomba, bacon, sajt',
        prices: { kicsi: 1900, kozepes: 2580, nagy: 3150, csaladi: 5540 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Jalapeno',
        description: 'fokhagymás tejföl alap, tarja, szalámi, paprika, bacon, jalapeno, sajt',
        prices: { kicsi: 1900, kozepes: 2580, nagy: 3150, csaladi: 5540 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Csubi',
        description: 'sajtkrém alap, csemege uborka, csirke, sonka, paprika, lilahagyma, sajt',
        prices: { kicsi: 1900, kozepes: 2580, nagy: 3150, csaladi: 5540 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Gyrossos',
        description: 'fokhagymás tejföl alap, gyros hús, sajt, kígyóuborka, paradicsom, lilahagyma és fetasajttal',
        prices: { kicsi: 1900, kozepes: 2580, nagy: 3150, csaladi: 5540 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      },
      {
        name: 'Kedvenc',
        description: 'KEDVENC ALAPÚD, 5 DB KEDVENC FELTÉTED, SAJT',
        prices: { kicsi: 1900, kozepes: 2580, nagy: 3150, csaladi: 5540 },
        isAvailable: true,
        allergens: ['glutén', 'tej']
      }
    ];

    // Pizzák feltöltése
    for (const pizza of pizzas) {
      // Ellenőrizzük, hogy létezik-e már
      const existingPizzas = await menuDB.find({
        selector: {
          type: 'menuItem',
          category: categoryId,
          name: pizza.name
        }
      });

      // Méretenkénti árak beállítása
      const customSizePrices = {};
      pizzaSizes.forEach(size => {
        customSizePrices[size.id] = pizza.prices[size.id];
      });

      // Méret opciók létrehozása
      const sizes = pizzaSizes.map(size => ({
        id: size.id,
        name: size.name,
        price: pizza.prices[size.id]
      }));

      if (existingPizzas.docs.length > 0) {
        console.log(`A(z) ${pizza.name} pizza már létezik, frissítés...`);
        
        // Frissítjük a meglévő dokumentumot
        const existingPizza = existingPizzas.docs[0];
        const updatedPizza = {
          ...existingPizza,
          description: pizza.description,
          price: pizza.prices.kicsi, // Alapár a legkisebb méret ára
          isAvailable: pizza.isAvailable,
          allergens: pizza.allergens,
          customSizePrices: customSizePrices,
          sizes: sizes
        };
        
        await menuDB.insert(updatedPizza);
        console.log(`A(z) ${pizza.name} pizza frissítve.`);
      } else {
        // Új dokumentum létrehozása
        const menuItem = {
          type: 'menuItem',
          category: categoryId,
          name: pizza.name,
          description: pizza.description,
          price: pizza.prices.kicsi, // Alapár a legkisebb méret ára
          isAvailable: pizza.isAvailable,
          allergens: pizza.allergens,
          imageUrl: '',
          customSizePrices: customSizePrices,
          sizes: sizes
        };
        
        const response = await menuDB.insert(menuItem);
        console.log(`A(z) ${pizza.name} pizza feltöltve, ID: ${response.id}`);
      }
    }

    console.log('Pizzák feltöltése sikeres!');
  } catch (error) {
    console.error('Hiba a pizzák feltöltésekor:', error);
    throw error;
  }
};

// Extra feltétek feltöltése
const seedToppings = async (categoryId, extraToppings, pizzaSizes) => {
  try {
    // Extra feltétek feltöltése
    for (const topping of extraToppings) {
      // Ellenőrizzük, hogy létezik-e már
      const existingToppings = await menuDB.find({
        selector: {
          type: 'menuItem',
          category: categoryId,
          name: topping.name
        }
      });

      // Méretenkénti árak beállítása
      const customSizePrices = {};
      pizzaSizes.forEach(size => {
        customSizePrices[size.id] = topping.prices[size.id];
      });

      // Méret opciók létrehozása
      const sizes = pizzaSizes.map(size => ({
        id: size.id,
        name: size.name,
        price: topping.prices[size.id]
      }));

      if (existingToppings.docs.length > 0) {
        console.log(`A(z) ${topping.name} feltét már létezik, frissítés...`);
        
        // Frissítjük a meglévő dokumentumot
        const existingTopping = existingToppings.docs[0];
        const updatedTopping = {
          ...existingTopping,
          price: topping.prices.kicsi, // Alapár a legkisebb méret ára
          isAvailable: true,
          customSizePrices: customSizePrices,
          sizes: sizes
        };
        
        await menuDB.insert(updatedTopping);
        console.log(`A(z) ${topping.name} feltét frissítve.`);
      } else {
        // Új dokumentum létrehozása
        const menuItem = {
          type: 'menuItem',
          category: categoryId,
          name: topping.name,
          description: 'Extra feltét pizzákhoz',
          price: topping.prices.kicsi, // Alapár a legkisebb méret ára
          isAvailable: true,
          allergens: ['glutén', 'tej'],
          imageUrl: '',
          customSizePrices: customSizePrices,
          sizes: sizes,
          isTopping: true // Jelöljük, hogy ez egy feltét
        };
        
        const response = await menuDB.insert(menuItem);
        console.log(`A(z) ${topping.name} feltét feltöltve, ID: ${response.id}`);
      }
    }

    console.log('Extra feltétek feltöltése sikeres!');
  } catch (error) {
    console.error('Hiba az extra feltétek feltöltésekor:', error);
    throw error;
  }
};

// Főprogram
const main = async () => {
  try {
    console.log('Pizzák és feltétek feltöltése az adatbázisba...');
    
    // Pizza méretek és feltétek beállítása
    const { pizzaSizes, extraToppings } = await setupPizzaSizes();
    
    // Pizza kategória létrehozása vagy lekérése
    const pizzaCategoryId = await createPizzaCategory();
    
    // Pizzák feltöltése
    await seedPizzas(pizzaCategoryId, pizzaSizes);
    
    // Feltétek kategóriája és feltöltése kikommentezve, mivel csak a beállításokban szükségesek
    // const toppingsCategoryId = await createToppingsCategory();
    // await seedToppings(toppingsCategoryId, extraToppings, pizzaSizes);
    
    console.log('Pizzák feltöltése sikeresen befejeződött!');
    process.exit(0);
  } catch (error) {
    console.error('Hiba a script futtatásakor:', error);
    process.exit(1);
  }
};

// Script indítása
main(); 