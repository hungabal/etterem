<script setup>
// Étlap kezelése nézet
// Ez a komponens felelős az étterem étlapjának megjelenítéséért és kezeléséért
// Itt lehet kategóriákat és menüelemeket létrehozni, szerkeszteni és törölni

// Szükséges Vue komponensek és szolgáltatások importálása
import { ref, onMounted, computed } from 'vue';
import { menuService, initializeDatabase, settingsService } from '../services/db.js';
import { useAuthStore } from '../stores/auth';

// Betöltés állapota
// isLoading: Jelzi, hogy folyamatban van-e adatok betöltése
// isSaving: Jelzi, hogy folyamatban van-e adatok mentése
// saveMessage: Sikeres mentés esetén megjelenő üzenet
// errorMessage: Hiba esetén megjelenő üzenet
const isLoading = ref(true);
const isSaving = ref(false);
const saveMessage = ref('');
const errorMessage = ref('');

// Étlap adatok
// categories: Az étlap kategóriái (pl. előételek, főételek, desszertek)
// menuItems: Az összes menüelem (ételek és italok)
const categories = ref([]);
const menuItems = ref([]);

// Keresési kifejezés
const searchQuery = ref('');

// Részletes nézet
// selectedItem: A kiválasztott menüelem részletes megtekintéshez
// showDetailsModal: Jelzi, hogy látható-e a részletes nézet modal
const selectedItem = ref(null);
const showDetailsModal = ref(false);

// Szerkesztési mód
// editingCategory: A jelenleg szerkesztett kategória
// editingMenuItem: A jelenleg szerkesztett menüelem
const editingCategory = ref(null);
const editingMenuItem = ref(null);

// Új kategória
// Az új kategória létrehozásához használt űrlap adatai
const newCategory = ref({
  name: '',
  order: 1
});

// Új menüelem
// Az új menüelem létrehozásához használt űrlap adatai
const newMenuItem = ref({
  name: '',
  description: '',
  price: 0,
  category: '',
  isAvailable: true,
  allergens: [],
  imageUrl: '',
  sizes: null,
  toppings: null,
  customSizePrices: {}
});

// Méret és feltét beállítások
// hasSizes: Jelzi, hogy a menüelemnek vannak-e különböző méretei (pl. pizza méretek)
// hasToppings: Jelzi, hogy a menüelemhez lehet-e feltéteket választani
// settings: Az alkalmazás általános beállításai
const hasSizes = ref(false);
const hasToppings = ref(false);
const settings = ref(null);

// Kategóriák rendezve sorrend szerint
// Ez a számított tulajdonság a kategóriákat a megadott sorrend szerint rendezi
const sortedCategories = computed(() => {
  return [...categories.value].sort((a, b) => a.order - b.order);
});

// Szűrt menüelemek a keresési kifejezés alapján
const filteredMenuItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return menuItems.value;
  }
  
  const query = searchQuery.value.toLowerCase().trim();
  return menuItems.value.filter(item => 
    item.name.toLowerCase().includes(query) || 
    (item.description && item.description.toLowerCase().includes(query))
  );
});

// Kategóriák betöltése
// Ez a függvény lekéri az összes kategóriát az adatbázisból
const loadCategories = async () => {
  try {
    const result = await menuService.getCategories();
    categories.value = result;
  } catch (error) {
    console.error('Hiba a kategóriák betöltésekor:', error);
    errorMessage.value = 'Hiba a kategóriák betöltésekor: ' + error.message;
  }
};

// Menüelemek betöltése
// Ez a függvény lekéri az összes menüelemet az adatbázisból
const loadMenuItems = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    
    const result = await menuService.getAllItems();
    
    menuItems.value = result.filter(item => item.type === 'menuItem');
    
    isLoading.value = false;
  } catch (error) {
    console.error('Hiba a menüelemek betöltésekor:', error);
    errorMessage.value = 'Hiba a menüelemek betöltésekor: ' + error.message;
    isLoading.value = false;
  }
};

// Beállítások betöltése
// Ez a függvény lekéri az alkalmazás beállításait az adatbázisból
const loadSettings = async () => {
  try {
    const settingsData = await settingsService.getSettings();
    settings.value = settingsData;
  } catch (error) {
    console.error('Hiba a beállítások betöltésekor:', error);
    errorMessage.value = 'Hiba a beállítások betöltésekor: ' + error.message;
  }
};

// Kategória szerkesztésének kezdése
// Ez a függvény inicializálja a kategória szerkesztési űrlapot
const startEditingCategory = (category) => {
  editingCategory.value = { ...category };
  newCategory.value = { ...category };
  
  // Görgetés a szerkesztő űrlaphoz
  setTimeout(() => {
    const editForm = document.querySelector('.add-form');
    if (editForm) {
      editForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
};

// Kategória szerkesztésének befejezése
// Ez a függvény megszakítja a kategória szerkesztését
const cancelEditingCategory = () => {
  editingCategory.value = null;
  newCategory.value = {
    name: '',
    order: categories.value.length + 1
  };
};

// Menüelem szerkesztésének kezdése
const startEditingMenuItem = (item) => {
  editingMenuItem.value = { ...item };
  newMenuItem.value = { ...item };
  
  // Méret és feltét opciók beállítása
  hasSizes.value = !!item.sizes;
  hasToppings.value = !!item.toppings && Array.isArray(item.toppings);
  
  // Ha nincs toppings tömb, de be van kapcsolva a feltétválasztás, inicializáljuk
  if (hasToppings.value && !newMenuItem.value.toppings) {
    newMenuItem.value.toppings = [];
  }
  
  // Egyedi méretárak inicializálása, ha még nem létezik
  if (!newMenuItem.value.customSizePrices) {
    newMenuItem.value.customSizePrices = {};
  }
  
  // Görgetés a menüelem szerkesztő űrlaphoz
  setTimeout(() => {
    const menuItemEditForm = document.querySelector('.menu-items-list .add-form');
    if (menuItemEditForm) {
      menuItemEditForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
};

// Menüelem szerkesztésének befejezése
const cancelEditingMenuItem = () => {
  editingMenuItem.value = null;
  newMenuItem.value = {
    name: '',
    description: '',
    price: 0,
    category: '',
    isAvailable: true,
    allergens: [],
    imageUrl: '',
    sizes: null,
    toppings: null,
    customSizePrices: {}
  };
  hasSizes.value = false;
  hasToppings.value = false;
};

// Kategória mentése
const saveCategory = async () => {
  try {
    if (!newCategory.value.name) {
      alert('A kategória neve kötelező!');
      return;
    }
    
    await menuService.saveCategory({
      ...(editingCategory.value ? { _id: editingCategory.value._id, _rev: editingCategory.value._rev } : {}),
      name: newCategory.value.name,
      order: Number(newCategory.value.order)
    });
    
    // Form törlése
    newCategory.value = {
      name: '',
      order: categories.value.length + 1
    };
    editingCategory.value = null;
    
    // Újratöltés
    await loadCategories();
    
    saveMessage.value = 'Kategória sikeresen mentve!';
    setTimeout(() => saveMessage.value = '', 3000);
  } catch (error) {
    console.error('Hiba a kategória mentésekor:', error);
    errorMessage.value = 'Hiba a kategória mentésekor: ' + error.message;
  }
};

// Méret opciók kezelése
const toggleSizes = () => {
  if (hasSizes.value && settings.value) {
    if (settings.value.pizzaPricingType === 'multiplier') {
      // Százalékos árazás esetén
      newMenuItem.value.sizes = settings.value.pizzaSizes.map(size => ({
        id: size.id,
        name: size.name,
        price: Math.round(newMenuItem.value.price * size.priceMultiplier)
      }));
    } else {
      // Egyedi árazás esetén - minden pizzánál egyedi árak
      // Ha már vannak méretei és egyedi árai, használjuk azokat
      if (newMenuItem.value.sizes && newMenuItem.value.sizes.length > 0) {
        // Ellenőrizzük, hogy minden méret megvan-e
        const existingSizeIds = newMenuItem.value.sizes.map(s => s.id);
        const missingSizes = settings.value.pizzaSizes.filter(s => !existingSizeIds.includes(s.id));
        
        // Ha vannak hiányzó méretek, adjuk hozzá őket
        if (missingSizes.length > 0) {
          missingSizes.forEach(size => {
            newMenuItem.value.sizes.push({
              id: size.id,
              name: size.name,
              price: newMenuItem.value.customSizePrices[size.id] || Math.round(newMenuItem.value.price * size.priceMultiplier)
            });
          });
        }
      } else {
        // Ha még nincsenek méretek, hozzuk létre őket
        newMenuItem.value.sizes = settings.value.pizzaSizes.map(size => ({
          id: size.id,
          name: size.name,
          price: newMenuItem.value.customSizePrices[size.id] || Math.round(newMenuItem.value.price * size.priceMultiplier)
        }));
      }
    }
  } else {
    newMenuItem.value.sizes = null;
    newMenuItem.value.customSizePrices = {};
  }
};

// Egyedi méretár frissítése
const updateCustomSizePrice = (sizeId, price) => {
  if (!newMenuItem.value.customSizePrices) {
    newMenuItem.value.customSizePrices = {};
  }
  newMenuItem.value.customSizePrices[sizeId] = Number(price);
  
  // Frissítsük a sizes tömböt is, ha létezik
  if (newMenuItem.value.sizes) {
    const sizeIndex = newMenuItem.value.sizes.findIndex(s => s.id === sizeId);
    if (sizeIndex >= 0) {
      newMenuItem.value.sizes[sizeIndex].price = Number(price);
    }
  }
};

// Méret árának lekérdezése
const getSizePrice = (sizeId) => {
  // Ha van már egyedi ár beállítva, azt használjuk
  if (newMenuItem.value.customSizePrices && newMenuItem.value.customSizePrices[sizeId] !== undefined) {
    return newMenuItem.value.customSizePrices[sizeId];
  }
  
  // Ha van már sizes tömb és benne az adott méret, annak az árát használjuk
  if (newMenuItem.value.sizes) {
    const size = newMenuItem.value.sizes.find(s => s.id === sizeId);
    if (size) {
      return size.price;
    }
  }
  
  // Egyébként számoljuk ki az alapárból és a szorzóból
  const size = settings.value.pizzaSizes.find(s => s.id === sizeId);
  if (size) {
    return Math.round(newMenuItem.value.price * size.priceMultiplier);
  }
  
  return 0;
};

// Feltét opciók kezelése
const toggleToppings = () => {
  if (hasToppings.value && settings.value) {
    // Csak inicializáljuk a toppings tömböt, de nem töltjük fel automatikusan
    if (!newMenuItem.value.toppings) {
      newMenuItem.value.toppings = [];
    }
  } else {
    newMenuItem.value.toppings = null;
  }
};

// Feltét hozzáadása vagy eltávolítása
const toggleTopping = (topping) => {
  if (!newMenuItem.value.toppings) {
    newMenuItem.value.toppings = [];
  }
  
  const existingIndex = newMenuItem.value.toppings.findIndex(t => t.id === topping.id);
  
  if (existingIndex >= 0) {
    // Ha már létezik, távolítsuk el
    newMenuItem.value.toppings.splice(existingIndex, 1);
  } else {
    // Ha még nem létezik, adjuk hozzá
    newMenuItem.value.toppings.push({...topping});
  }
};

// Ellenőrzi, hogy egy feltét ki van-e választva
const isToppingSelected = (toppingId) => {
  return newMenuItem.value.toppings && newMenuItem.value.toppings.some(t => t.id === toppingId);
};

// Menüelem mentése
const saveMenuItem = async () => {
  try {
    if (!newMenuItem.value.name || !newMenuItem.value.category || !newMenuItem.value.price) {
      alert('A név, kategória és ár mezők kötelezőek!');
      return;
    }
    
    // Ha van méret vagy feltét opció, frissítsük őket mentés előtt
    if (hasSizes.value) {
      toggleSizes();
    }
    if (hasToppings.value) {
      toggleToppings();
    }
    
    const itemToSave = {
      ...(editingMenuItem.value ? { _id: editingMenuItem.value._id, _rev: editingMenuItem.value._rev } : {}),
      type: 'menuItem', // Explicitly set the type field
      name: newMenuItem.value.name,
      description: newMenuItem.value.description,
      price: Number(newMenuItem.value.price),
      category: newMenuItem.value.category,
      isAvailable: newMenuItem.value.isAvailable,
      allergens: newMenuItem.value.allergens,
      imageUrl: newMenuItem.value.imageUrl,
      sizes: newMenuItem.value.sizes,
      toppings: newMenuItem.value.toppings,
      customSizePrices: newMenuItem.value.customSizePrices
    };
    
    const response = await menuService.saveItem(itemToSave);
    
    // Form törlése
    newMenuItem.value = {
      name: '',
      description: '',
      price: 0,
      category: '',
      isAvailable: true,
      allergens: [],
      imageUrl: '',
      sizes: null,
      toppings: null,
      customSizePrices: {}
    };
    editingMenuItem.value = null;
    hasSizes.value = false;
    hasToppings.value = false;
    
    // Újratöltés
    await loadMenuItems();
    
    saveMessage.value = 'Menüelem sikeresen mentve!';
    setTimeout(() => saveMessage.value = '', 3000);
  } catch (error) {
    console.error('Hiba a menüelem mentésekor:', error);
    errorMessage.value = 'Hiba a menüelem mentésekor: ' + error.message;
  }
};

// Menüelem törlése
const deleteMenuItem = async (item) => {
  if (confirm('Biztosan törölni szeretné ezt a menüelemet?')) {
    try {
      await menuService.deleteItem(item._id, item._rev);
      await loadMenuItems();
    } catch (error) {
      console.error('Hiba a menüelem törlésekor:', error);
      errorMessage.value = 'Hiba a menüelem törlésekor: ' + error.message;
    }
  }
};

// Kategória törlése
const deleteCategory = async (category) => {
  if (confirm('Biztosan törölni szeretné ezt a kategóriát?')) {
    try {
      await menuService.deleteItem(category._id, category._rev);
      await loadCategories();
    } catch (error) {
      console.error('Hiba a kategória törlésekor:', error);
      errorMessage.value = 'Hiba a kategória törlésekor: ' + error.message;
    }
  }
};

// Menüelemek szűrése kategória szerint
const getItemsByCategory = (categoryId) => {
  return filteredMenuItems.value.filter(item => item.category === categoryId);
};

// Görgetés a kiválasztott kategóriához
const scrollToCategory = (categoryId) => {
  const element = document.getElementById(`category-${categoryId}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Részletes nézet megjelenítése
const showItemDetails = (item) => {
  selectedItem.value = item;
  showDetailsModal.value = true;
};

// Részletes nézet bezárása
const closeItemDetails = () => {
  showDetailsModal.value = false;
  selectedItem.value = null;
};

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);

// Komponens betöltésekor
onMounted(async () => {
  await initializeDatabase();
  await loadSettings();
  await loadCategories();
  await loadMenuItems();
});
</script>

<template>
  <div class="menu-view">
    <h1>Étlap kezelése</h1>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <div v-if="saveMessage" class="save-message">
      {{ saveMessage }}
    </div>
    
    <div v-if="isLoading" class="loading">
      Adatok betöltése...
    </div>
    
    <!-- Részletes nézet modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="closeItemDetails">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedItem.name }}</h3>
          <button class="close-btn" @click="closeItemDetails">&times;</button>
        </div>
        <div class="modal-body">
          <div class="item-details">
            <div class="item-image-container">
              <img v-if="selectedItem.imageUrl" :src="selectedItem.imageUrl" alt="Étel képe" class="item-image">
              <div v-else class="no-image">Nincs kép</div>
            </div>
            
            <div class="item-info">
              <div class="info-row">
                <strong>Ár:</strong> {{ selectedItem.price }} Ft
              </div>
              
              <div class="info-row">
                <strong>Kategória:</strong> {{ categories.find(c => c._id === selectedItem.category)?.name || '-' }}
              </div>
              
              <div class="info-row">
                <strong>Elérhető:</strong> 
                <span :class="selectedItem.isAvailable ? 'status-active' : 'status-inactive'">
                  {{ selectedItem.isAvailable ? 'Igen' : 'Nem' }}
                </span>
              </div>
              
              <div class="info-row">
                <strong>Leírás:</strong> 
                <p>{{ selectedItem.description || 'Nincs leírás' }}</p>
              </div>
              
              <div v-if="selectedItem.allergens && selectedItem.allergens.length > 0" class="info-row">
                <strong>Allergének:</strong> {{ selectedItem.allergens.join(', ') }}
              </div>
              
              <div v-if="selectedItem.sizes && selectedItem.sizes.length > 0" class="info-row">
                <strong>Választható méretek:</strong>
                <div class="sizes-list">
                  <div v-for="size in selectedItem.sizes" :key="size.id" class="size-badge">
                    {{ size.name }}: {{ size.price }} Ft
                  </div>
                </div>
              </div>
              
              <div v-if="selectedItem.toppings && selectedItem.toppings.length > 0" class="info-row">
                <strong>Választható feltétek:</strong>
                <div class="toppings-list modal-toppings">
                  <div v-for="topping in selectedItem.toppings" :key="topping.id" class="topping-badge">
                    {{ topping.name }}: +{{ topping.price }} Ft
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="edit-btn" @click="startEditingMenuItem(selectedItem); closeItemDetails();">Szerkesztés</button>
          <button class="cancel-btn" @click="closeItemDetails">Bezárás</button>
        </div>
      </div>
    </div>
    
    <div v-else class="menu-container">
      <!-- Kategóriák kezelése -->
      <div class="menu-section">
        <h2>Kategóriák</h2>
        
        <div class="categories-list">
          <table v-if="categories.length > 0">
            <thead>
              <tr>
                <th>Név</th>
                <th>Sorrend</th>
                <th>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="category in categories" :key="category._id">
                <td>{{ category.name }}</td>
                <td>{{ category.order }}</td>
                <td>
                  <button class="edit-btn" @click="startEditingCategory(category)">Szerkesztés</button>
                  <button class="delete-btn" @click="deleteCategory(category)" v-if="isAdmin || !authStore.loginEnabled">Törlés</button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div v-else class="empty-message">
            Nincsenek kategóriák megadva.
          </div>
          
          <!-- Kategória form (új vagy szerkesztés) -->
          <div class="add-form">
            <h3>{{ editingCategory ? 'Kategória szerkesztése' : 'Új kategória hozzáadása' }}</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="category-name">Kategória neve:</label>
                <input type="text" id="category-name" v-model="newCategory.name" required>
              </div>
              
              <div class="form-group">
                <label for="category-order">Sorrend:</label>
                <input type="number" id="category-order" v-model="newCategory.order" min="1" required>
              </div>
            </div>
            
            <div class="button-group">
              <button class="add-btn" @click="saveCategory">
                {{ editingCategory ? 'Kategória mentése' : 'Kategória hozzáadása' }}
              </button>
              <button v-if="editingCategory" class="cancel-btn" @click="cancelEditingCategory">Mégsem</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Menüelemek kezelése -->
      <div class="menu-section">
        <h2>Menüelemek</h2>
        
        <!-- Keresőmező -->
        <div class="search-container">
          <div class="search-input-wrapper">
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Keresés név vagy leírás alapján..." 
              class="search-input"
            >
            <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search-btn">&times;</button>
          </div>
          <div v-if="searchQuery" class="search-results-info">
            <span v-if="filteredMenuItems.length > 0">{{ filteredMenuItems.length }} találat a(z) <strong>"{{ searchQuery }}"</strong> keresésre</span>
            <span v-else>Nincs találat a(z) <strong>"{{ searchQuery }}"</strong> keresésre</span>
          </div>
        </div>
        
        <div v-if="menuItems.length > 0 && categories.length > 0" class="category-navigation">
          <span>Ugrás kategóriához:</span>
          <div class="category-nav-buttons">
            <button 
              v-for="category in sortedCategories" 
              :key="category._id"
              class="category-nav-btn"
              @click="scrollToCategory(category._id)"
            >
              {{ category.name }}
            </button>
          </div>
        </div>
        
        <div class="menu-items-list">
          <div v-if="menuItems.length > 0">
            <div 
              v-for="category in sortedCategories" 
              :key="category._id" 
              class="menu-category-group"
              :id="`category-${category._id}`"
            >
              <h3 class="category-title">{{ category.name }}</h3>
              
              <table v-if="getItemsByCategory(category._id).length > 0">
                <thead>
                  <tr>
                    <th>Név</th>
                    <th class="hide-on-mobile">Leírás</th>
                    <th>Ár</th>
                    <th class="hide-on-mobile">Kép</th>
                    <th class="hide-on-mobile sizes-column">Méretek</th>
                    <th class="hide-on-mobile">Feltétek</th>
                    <th>Elérhető</th>
                    <th>Műveletek</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in getItemsByCategory(category._id)" :key="item._id">
                    <td>{{ item.name }}</td>
                    <td class="description-cell hide-on-mobile">
                      <div class="truncate-text">{{ item.description || '-' }}</div>
                    </td>
                    <td>{{ item.price }} Ft</td>
                    <td class="image-cell hide-on-mobile">
                      <img v-if="item.imageUrl" :src="item.imageUrl" alt="Étel képe" class="food-thumbnail">
                      <span v-else>-</span>
                    </td>
                    <td class="hide-on-mobile">
                      <div v-if="item.sizes && item.sizes.length > 0" class="sizes-cell">
                        <div class="sizes-grid">
                          <div v-for="size in item.sizes" :key="size.id" class="size-badge">
                            {{ size.name }}: {{ size.price }} Ft
                          </div>
                        </div>
                      </div>
                      <span v-else>-</span>
                    </td>
                    <td class="hide-on-mobile">
                      <div v-if="item.toppings && item.toppings.length > 0" class="toppings-cell">
                        <div v-for="topping in item.toppings" :key="topping.id" class="topping-badge">
                          {{ topping.name }}: +{{ topping.price }} Ft
                        </div>
                      </div>
                      <span v-else>-</span>
                    </td>
                    <td>
                      <span :class="item.isAvailable ? 'status-active' : 'status-inactive'">
                        {{ item.isAvailable ? 'Igen' : 'Nem' }}
                      </span>
                    </td>
                    <td>
                      <button class="details-btn show-on-mobile" @click="showItemDetails(item)">Részletek</button>
                      <button class="edit-btn" @click="startEditingMenuItem(item)">Szerkesztés</button>
                      <button class="delete-btn" @click="deleteMenuItem(item)" v-if="isAdmin || !authStore.loginEnabled">Törlés</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <div v-else-if="searchQuery && menuItems.some(item => item.category === category._id)" class="empty-search-message">
                Nincs találat a keresésre ebben a kategóriában.
              </div>
              
              <div v-else class="empty-category-message">
                Ebben a kategóriában nincsenek menüelemek.
              </div>
            </div>
          </div>
          
          <div v-else class="empty-message">
            Nincsenek menüelemek megadva.
          </div>
          
          <!-- Menüelem form (új vagy szerkesztés) -->
          <div class="add-form">
            <h3>{{ editingMenuItem ? 'Menüelem szerkesztése' : 'Új menüelem hozzáadása' }}</h3>
            
            <div class="form-group">
              <label for="item-name">Név:</label>
              <input type="text" id="item-name" v-model="newMenuItem.name" required>
            </div>
            
            <div class="form-group">
              <label for="item-description">Leírás:</label>
              <textarea id="item-description" v-model="newMenuItem.description" rows="3"></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="item-category">Kategória:</label>
                <select id="item-category" v-model="newMenuItem.category" required>
                  <option value="">Válasszon kategóriát...</option>
                  <option v-for="category in categories" :key="category._id" :value="category._id">
                    {{ category.name }}
                  </option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="item-price">Ár (Ft):</label>
                <input type="number" id="item-price" v-model="newMenuItem.price" min="0" required>
              </div>
            </div>
            
            <div class="form-group">
              <label for="item-image">Kép URL:</label>
              <input type="text" id="item-image" v-model="newMenuItem.imageUrl">
            </div>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="newMenuItem.isAvailable">
                Elérhető
              </label>
            </div>
            
            <div class="form-group">
              <label for="item-allergens">Allergének (vesszővel elválasztva):</label>
              <input 
                type="text" 
                id="item-allergens" 
                :value="newMenuItem.allergens.join(',')"
                @input="e => newMenuItem.allergens = e.target.value.split(',').map(a => a.trim()).filter(a => a)"
              >
            </div>
            
            <div class="form-group" v-if="settings">
              <label class="checkbox-label">
                <input type="checkbox" v-model="hasSizes" @change="toggleSizes">
                Van méretválasztási lehetőség
              </label>
              
              <div v-if="hasSizes && settings.pizzaPricingType === 'custom'" class="pricing-info-box">
                <p>
                  <i class="info-icon">ℹ️</i> 
                  Egyedi árazási mód van beállítva. Minden mérethez külön megadhatod az árat.
                </p>
              </div>
              
              <div v-if="hasSizes" class="sizes-options">
                <h4>Méretek és árak:</h4>
                <div v-for="size in settings.pizzaSizes" :key="size.id" class="size-item">
                  <span>{{ size.name }}</span>
                  
                  <!-- Százalékos árazás esetén csak megjelenítjük a számított árat -->
                  <span v-if="settings.pizzaPricingType === 'multiplier'">
                    {{ Math.round(newMenuItem.price * size.priceMultiplier) }} Ft
                  </span>
                  
                  <!-- Egyedi árazás esetén szerkeszthető mezőt jelenítünk meg -->
                  <div v-else class="custom-price-input">
                    <input 
                      type="number" 
                      :value="getSizePrice(size.id)"
                      @input="e => updateCustomSizePrice(size.id, e.target.value)"
                      min="0"
                      class="size-price-input"
                    > Ft
                  </div>
                </div>
                <small class="help-text" v-if="settings.pizzaPricingType === 'multiplier'">
                  Az árak automatikusan számolódnak az alapár alapján
                </small>
                <small class="help-text" v-else>
                  Állítsd be az egyedi árakat minden mérethez
                </small>
              </div>
            </div>
            
            <div class="form-group" v-if="settings">
              <label class="checkbox-label">
                <input type="checkbox" v-model="hasToppings" @change="toggleToppings">
                Van feltétválasztási lehetőség
              </label>
              
              <div v-if="hasToppings" class="toppings-options">
                <h4>Választható feltétek:</h4>
                <div class="toppings-list">
                  <div v-for="topping in settings.extraToppings" :key="topping.id" class="topping-item">
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        :checked="isToppingSelected(topping.id)"
                        @change="toggleTopping(topping)"
                      >
                      {{ topping.name }} (+{{ topping.price }} Ft)
                    </label>
                  </div>
                </div>
                <div class="selected-toppings-summary" v-if="newMenuItem.toppings && newMenuItem.toppings.length > 0">
                  <h5>Kiválasztott feltétek:</h5>
                  <ul>
                    <li v-for="topping in newMenuItem.toppings" :key="topping.id">
                      {{ topping.name }} (+{{ topping.price }} Ft)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div class="button-group">
              <button class="add-btn" @click="saveMenuItem">
                {{ editingMenuItem ? 'Menüelem mentése' : 'Menüelem hozzáadása' }}
              </button>
              <button v-if="editingMenuItem" class="cancel-btn" @click="cancelEditingMenuItem">Mégsem</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

.menu-view h1 {
  color: var(--primary-color);
}

.menu-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.menu-section {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.menu-section h2 {
  color: var(--primary-color);
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.save-message {
  background-color: #e8f5e9;
  color: #2e7d32;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.loading {
  text-align: center;
  margin: 2rem 0;
  font-style: italic;
  color: #666;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.5rem;
}

table th, table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

table th {
  font-weight: bold;
  background-color: #f9f9f9;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.form-row .form-group {
  flex: 1;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

input[type="text"],
input[type="number"],
textarea,
select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.add-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-btn:hover {
  background-color: var(--secondary-color);
}

.edit-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-right: 0.5rem;
}

.edit-btn:hover {
  background-color: #1976D2;
}

.delete-btn {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

.cancel-btn {
  background-color: #9e9e9e;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cancel-btn:hover {
  background-color: #757575;
}

.empty-message {
  font-style: italic;
  color: #666;
  margin-bottom: 1.5rem;
}

.add-form {
  background-color: #f9f9f9;
  padding: 1.5rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.add-form h3 {
  color: var(--secondary-color);
  margin-bottom: 1rem;
}

.status-active {
  color: #2e7d32;
  font-weight: bold;
}

.status-inactive {
  color: #c62828;
  font-weight: bold;
}

.sizes-options,
.toppings-options {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.sizes-options h4,
.toppings-options h4 {
  margin: 0 0 0.5rem 0;
  color: #666;
}

.size-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  border-bottom: 1px solid #ddd;
}

.size-item:last-child {
  border-bottom: none;
}

.custom-price-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.size-price-input {
  width: 80px;
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: right;
}

.help-text {
  display: block;
  margin-top: 0.5rem;
  color: #666;
  font-style: italic;
}

.toppings-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
}

.topping-item {
  padding: 0.5rem;
  border-radius: 4px;
  background-color: #f0f0f0;
  transition: background-color 0.2s;
}

.topping-item:hover {
  background-color: #e0e0e0;
}

.topping-item .checkbox-label {
  display: flex;
  align-items: center;
  width: 100%;
  cursor: pointer;
}

.topping-item input[type="checkbox"] {
  margin-right: 8px;
}

.selected-toppings-summary {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #e8f5e9;
  border-radius: 4px;
  border-left: 4px solid #4caf50;
}

.selected-toppings-summary h5 {
  margin: 0 0 0.5rem 0;
  color: #2e7d32;
}

.selected-toppings-summary ul {
  margin: 0;
  padding-left: 1.5rem;
}

.selected-toppings-summary li {
  margin-bottom: 0.25rem;
}

/* Táblázat cellák stílusai */
.description-cell {
  max-width: 200px;
}

.truncate-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.image-cell {
  width: 80px;
  text-align: center;
}

.food-thumbnail {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.sizes-column {
  width: 250px;
}

.sizes-cell, .toppings-cell {
  max-width: 250px;
  max-height: none;
  overflow-y: visible;
}

.sizes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.size-badge, .topping-badge {
  display: inline-block;
  background-color: #f0f0f0;
  border-radius: 4px;
  padding: 4px 8px;
  margin: 3px;
  font-size: 0.9rem;
  white-space: nowrap;
}

.size-badge {
  background-color: #e3f2fd;
  color: #1565c0;
}

.topping-badge {
  background-color: #e8f5e9;
  color: #2e7d32;
}

/* Kategória csoportosítás stílusok */
.menu-category-group {
  margin-bottom: 2rem;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  scroll-margin-top: 20px;
}

.category-title {
  background-color: #f5f5f5;
  padding: 0.75rem 1rem;
  margin: 0;
  color: var(--primary-color);
  border-bottom: 1px solid #eee;
}

.empty-category-message {
  padding: 1rem;
  font-style: italic;
  color: #666;
}

.empty-search-message {
  padding: 1rem;
  font-style: italic;
  color: #666;
  background-color: #f9f9f9;
  border-left: 4px solid #ff9800;
}

/* Kategória navigáció */
.category-navigation {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-navigation span {
  font-weight: bold;
  color: #555;
}

.category-nav-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.category-nav-btn {
  background-color: #e0e0e0;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.category-nav-btn:hover {
  background-color: var(--primary-color);
  color: white;
}

/* Reszponzív design */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 1rem;
  }
  
  table {
    display: block;
    overflow-x: auto;
  }
  
  .hide-on-mobile {
    display: none;
  }
  
  .show-on-mobile {
    display: inline-block;
  }
  
  .item-details {
    flex-direction: column;
  }
  
  .item-image-container {
    flex: 0 0 auto;
    margin-bottom: 1rem;
  }
}

@media (min-width: 769px) {
  .show-on-mobile {
    display: none;
  }
}

/* Modal stílusok */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: var(--primary-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.item-details {
  display: flex;
  gap: 2rem;
}

.item-image-container {
  flex: 0 0 200px;
}

.item-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.no-image {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 8px;
  color: #666;
  font-style: italic;
}

.item-info {
  flex: 1;
}

.info-row {
  margin-bottom: 1rem;
}

.info-row strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #555;
}

.info-row p {
  margin: 0.25rem 0;
}

.modal-toppings {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.details-btn {
  background-color: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-right: 0.5rem;
}

.details-btn:hover {
  background-color: #f57c00;
}

.pricing-info-box {
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.pricing-info-box p {
  margin: 0;
  font-size: 0.8rem;
  color: #666;
}

.pricing-info-box i {
  margin-right: 0.5rem;
}

.debug-info {
  margin-top: 2rem;
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.debug-info h3 {
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.debug-info div {
  margin-bottom: 1rem;
}

.debug-info h4 {
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.debug-info pre {
  background-color: #f9f9f9;
  padding: 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #666;
}

.search-container {
  position: relative;
  margin-bottom: 1.5rem;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.clear-search-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  margin-left: 0.5rem;
}

.search-results-info {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #555;
}

.search-results-info strong {
  color: var(--primary-color);
}
</style> 