// API alapú CouchDB setup
// Ez a fájl csak az API URL-t adja vissza, nem használ PouchDB-t

// Környezeti változók
let API_BASE_URL;
try {
  // Próbáljuk meg elérni a Vite környezeti változót
  API_BASE_URL = import.meta.env.VITE_API_URL;
} catch (error) {
  // Ha nem sikerül, használjuk az alapértelmezett értéket
  console.warn('Környezeti változók nem elérhetők, alapértelmezett API URL használata');
}
// Alapértelmezett érték, ha a környezeti változó nem elérhető
API_BASE_URL = API_BASE_URL || 'http://localhost:3000/api';

// API URL visszaadása
const getApiUrl = () => {
  return API_BASE_URL;
};

// Export the API URL function
export default getApiUrl; 