// Adatbázis feltöltő script - Összes étel
import dotenv from 'dotenv';
import nano from 'nano';
import { execSync } from 'child_process';

dotenv.config();

// Főprogram
const main = async () => {
  try {
    console.log('Adatok feltöltése az adatbázisba...');
    
    // Pizzák feltöltése
    console.log('\n--- Pizzák feltöltése ---');
    execSync('npm run db:seed:pizzas', { stdio: 'inherit' });
    
    // Saláták feltöltése
    console.log('\n--- Saláták feltöltése ---');
    execSync('npm run db:seed:salads', { stdio: 'inherit' });
    
    // Hamburgerek feltöltése
    console.log('\n--- Hamburgerek feltöltése ---');
    execSync('npm run db:seed:burgers', { stdio: 'inherit' });
    
    // Címek feltöltése
    console.log('\n--- Címek feltöltése ---');
    execSync('npm run db:seed:addresses', { stdio: 'inherit' });
    
    // Itt később hozzáadhatók további adattípusok
    
    console.log('\nÖsszes adat feltöltése sikeresen befejeződött!');
    
    // Töröljük a feltétek kategóriáját, ha létezik
    try {
      const couchdbUrl = process.env.COUCHDB_URL || 'http://admin:password@localhost:5984';
      const couchdb = nano(couchdbUrl);
      const menuDB = couchdb.use('restaurant_menu');
      
      // Feltétek kategóriájának keresése
      const result = await menuDB.find({
        selector: {
          type: 'category',
          name: 'Extra feltétek'
        }
      });
      
      // Ha létezik, töröljük
      if (result.docs.length > 0) {
        const category = result.docs[0];
        await menuDB.destroy(category._id, category._rev);
        console.log('Extra feltétek kategória törölve.');
        
        // Töröljük a feltét menüelemeket is
        const toppingItems = await menuDB.find({
          selector: {
            type: 'menuItem',
            category: category._id
          }
        });
        
        for (const item of toppingItems.docs) {
          await menuDB.destroy(item._id, item._rev);
        }
        
        console.log(`${toppingItems.docs.length} feltét menüelem törölve.`);
      }
    } catch (error) {
      console.error('Hiba a feltétek kategóriájának törlésekor:', error);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Hiba a script futtatásakor:', error);
    process.exit(1);
  }
};

// Script indítása
main(); 