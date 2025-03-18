<script setup>
// Beállítások nézet
// Ez a komponens felelős az alkalmazás és az étterem beállításainak kezeléséért
// Itt lehet módosítani az étterem adatait, nyitvatartási időt, fizetési módokat, pizza méreteket és feltéteket

// Szükséges Vue komponensek és szolgáltatások importálása
import { ref, reactive, onMounted, computed } from 'vue';
import { settingsService, initializeDatabase } from '../services/db.js';
import UserManagement from '../components/UserManagement.vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin);

// Betöltés állapota
// isLoading: Jelzi, hogy folyamatban van-e adatok betöltése
// isSaving: Jelzi, hogy folyamatban van-e adatok mentése
// saveMessage: Sikeres mentés esetén megjelenő üzenet
// errorMessage: Hiba esetén megjelenő üzenet
const isLoading = ref(true);
const isSaving = ref(false);
const saveMessage = ref('');
const errorMessage = ref('');

// Aktív beállítási fül
const activeTab = ref('general');

// Beállítások adatai
// Az étterem és az alkalmazás összes beállítása
const settings = reactive({
  restaurantName: '',        // Étterem neve
  address: '',               // Étterem címe
  phone: '',                 // Étterem telefonszáma
  email: '',                 // Étterem e-mail címe
  taxNumber: '',             // Étterem adószáma
  deliveryFee: 0,            // Kiszállítási díj
  packagingFee: 0,           // Csomagolási díj
  minOrderAmount: 0,         // Minimális rendelési összeg
  deliveryTimeMinutes: 0,    // Kiszállítási idő percben
  paymentMethods: [],        // Fizetési módok
  pizzaSizes: [],            // Pizza méretek
  extraToppings: [],         // Extra feltétek
  pizzaPricingType: 'multiplier'  // Pizza árazási típus (szorzó vagy fix ár)
});

// Fizetési módok
// Az alkalmazásban elérhető fizetési módok listája
const availablePaymentMethods = [
  { id: 'cash', name: 'Készpénz' },
  { id: 'card', name: 'Bankkártya' },
];

// Új pizza méret
// Az új pizza méret létrehozásához használt űrlap adatai
const newPizzaSize = reactive({
  id: '',                    // Egyedi azonosító
  name: '',                  // Méret neve (pl. "Kicsi", "Közepes", "Nagy")
  priceMultiplier: 1         // Árszorzó (pl. 1, 1.5, 2)
});

// Új feltét
// Az új feltét létrehozásához használt űrlap adatai
const newTopping = reactive({
  id: '',                    // Egyedi azonosító
  name: '',                  // Feltét neve (pl. "Sonka", "Gomba", "Sajt")
  price: 0,                  // Alapár (ha nincs méretenkénti ár)
  prices: {}                 // Méretenkénti árak (pl. { "small": 200, "medium": 300, "large": 400 })
});

// Szerkesztési állapot
// A pizza méretek és feltétek szerkesztési állapotának nyilvántartása
const editMode = reactive({
  pizzaSize: {
    active: false,           // Jelzi, hogy szerkesztési módban vagyunk-e
    index: -1                // A szerkesztett elem indexe a tömbben
  },
  topping: {
    active: false,           // Jelzi, hogy szerkesztési módban vagyunk-e
    index: -1                // A szerkesztett elem indexe a tömbben
  }
});

// Szerkesztendő elemek
// A szerkesztés alatt álló pizza méret adatai
const editingPizzaSize = reactive({
  id: '',                    // Egyedi azonosító
  name: '',                  // Méret neve
  priceMultiplier: 1         // Árszorzó
});

// A szerkesztés alatt álló feltét adatai
const editingTopping = reactive({
  id: '',                    // Egyedi azonosító
  name: '',                  // Feltét neve
  price: 0,                  // Alapár
  prices: {}                 // Méretenkénti árak
});

// Beállítások betöltése
// Ez a függvény betölti az összes beállítást az adatbázisból
const loadSettings = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    
    const initialized = await initializeDatabase();
    if (!initialized) {
      errorMessage.value = 'Hiba az adatbázis inicializálásakor. Kérjük, frissítse az oldalt.';
      isLoading.value = false;
      return;
    }
    
    const data = await settingsService.getSettings();
    
    // Adatok másolása a reaktív objektumba
    settings.restaurantName = data.restaurantName || '';
    settings.address = data.address || '';
    settings.phone = data.phone || '';
    settings.email = data.email || '';
    settings.taxNumber = data.taxNumber || '';
    settings.deliveryFee = data.deliveryFee || 0;
    settings.packagingFee = data.packagingFee || 0;
    settings.minOrderAmount = data.minOrderAmount || 0;
    settings.deliveryTimeMinutes = data.deliveryTimeMinutes || 0;
    settings.paymentMethods = data.paymentMethods || [];
    settings.pizzaSizes = data.pizzaSizes || [];
    settings.extraToppings = data.extraToppings || [];
    settings.pizzaPricingType = data.pizzaPricingType || 'multiplier';
    
    isLoading.value = false;
  } catch (error) {
    console.error('Hiba a beállítások betöltésekor:', error);
    errorMessage.value = 'Hiba a beállítások betöltésekor: ' + (error.message || 'Ismeretlen hiba');
    isLoading.value = false;
  }
};

// Beállítások mentése
const saveSettings = async () => {
  try {
    isSaving.value = true;
    saveMessage.value = '';
    errorMessage.value = '';
    
    const settingsToSave = {
      restaurantName: settings.restaurantName,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      taxNumber: settings.taxNumber,
      deliveryFee: Number(settings.deliveryFee),
      packagingFee: Number(settings.packagingFee),
      minOrderAmount: Number(settings.minOrderAmount),
      deliveryTimeMinutes: Number(settings.deliveryTimeMinutes),
      paymentMethods: settings.paymentMethods,
      pizzaSizes: settings.pizzaSizes,
      extraToppings: settings.extraToppings,
      pizzaPricingType: settings.pizzaPricingType
    };
    
    await settingsService.saveSettings(settingsToSave);
    
    saveMessage.value = 'Beállítások sikeresen mentve!';
    setTimeout(() => {
      saveMessage.value = '';
    }, 3000);
  } catch (error) {
    console.error('Hiba a beállítások mentésekor:', error);
    errorMessage.value = 'Hiba a beállítások mentésekor: ' + (error.message || 'Ismeretlen hiba');
  } finally {
    isSaving.value = false;
  }
};

// Fizetési mód kezelése
const togglePaymentMethod = (methodId) => {
  const index = settings.paymentMethods.indexOf(methodId);
  if (index === -1) {
    settings.paymentMethods.push(methodId);
  } else {
    settings.paymentMethods.splice(index, 1);
  }
};

// Pizza méret hozzáadása
const addPizzaSize = () => {
  if (newPizzaSize.id && newPizzaSize.name && newPizzaSize.priceMultiplier > 0) {
    // Ellenőrizzük, hogy az ID egyedi legyen
    if (!settings.pizzaSizes.some(size => size.id === newPizzaSize.id)) {
      settings.pizzaSizes.push({
        id: newPizzaSize.id,
        name: newPizzaSize.name,
        priceMultiplier: Number(newPizzaSize.priceMultiplier)
      });
      
      // Mezők törlése
      newPizzaSize.id = '';
      newPizzaSize.name = '';
      newPizzaSize.priceMultiplier = 1;
    }
  }
};

// Pizza méret szerkesztésének indítása
const startEditPizzaSize = (index) => {
  const size = settings.pizzaSizes[index];
  editingPizzaSize.id = size.id;
  editingPizzaSize.name = size.name;
  editingPizzaSize.priceMultiplier = size.priceMultiplier;
  
  editMode.pizzaSize.active = true;
  editMode.pizzaSize.index = index;
};

// Pizza méret szerkesztésének mentése
const saveEditPizzaSize = () => {
  if (editingPizzaSize.id && editingPizzaSize.name && editingPizzaSize.priceMultiplier > 0) {
    const index = editMode.pizzaSize.index;
    
    // Ellenőrizzük, hogy az ID egyedi legyen (kivéve ha ugyanaz maradt)
    const otherSizes = settings.pizzaSizes.filter((_, i) => i !== index);
    if (!otherSizes.some(size => size.id === editingPizzaSize.id)) {
      settings.pizzaSizes[index] = {
        id: editingPizzaSize.id,
        name: editingPizzaSize.name,
        priceMultiplier: Number(editingPizzaSize.priceMultiplier)
      };
      
      // Szerkesztési mód kikapcsolása
      cancelEditPizzaSize();
    }
  }
};

// Pizza méret szerkesztésének megszakítása
const cancelEditPizzaSize = () => {
  editMode.pizzaSize.active = false;
  editMode.pizzaSize.index = -1;
  
  // Mezők törlése
  editingPizzaSize.id = '';
  editingPizzaSize.name = '';
  editingPizzaSize.priceMultiplier = 1;
};

// Pizza méret törlése
const deletePizzaSize = (index) => {
  settings.pizzaSizes.splice(index, 1);
};

// Feltét hozzáadása
const addTopping = () => {
  if (newTopping.id && newTopping.name && newTopping.price >= 0) {
    // Ellenőrizzük, hogy az ID egyedi legyen
    if (!settings.extraToppings.some(topping => topping.id === newTopping.id)) {
      // Méretenkénti árak beállítása
      const prices = {};
      if (settings.pizzaPricingType === 'custom' && settings.pizzaSizes.length > 0) {
        // Ha egyedi árazás van és vannak méretek, akkor minden mérethez beállítjuk az árat
        settings.pizzaSizes.forEach(size => {
          prices[size.id] = newTopping.prices[size.id] || newTopping.price;
        });
      }
      
      settings.extraToppings.push({
        id: newTopping.id,
        name: newTopping.name,
        price: Number(newTopping.price),
        prices: prices
      });
      
      // Mezők törlése
      newTopping.id = '';
      newTopping.name = '';
      newTopping.price = 0;
      newTopping.prices = {};
    }
  }
};

// Feltét szerkesztésének indítása
const startEditTopping = (index) => {
  const topping = settings.extraToppings[index];
  editingTopping.id = topping.id;
  editingTopping.name = topping.name;
  editingTopping.price = topping.price;
  editingTopping.prices = topping.prices || {};
  
  // Ha nincsenek méretenkénti árak, de vannak méretek, akkor inicializáljuk
  if (!topping.prices && settings.pizzaSizes.length > 0) {
    editingTopping.prices = {};
    settings.pizzaSizes.forEach(size => {
      editingTopping.prices[size.id] = topping.price;
    });
  }
  
  editMode.topping.active = true;
  editMode.topping.index = index;
};

// Feltét szerkesztésének mentése
const saveEditTopping = () => {
  if (editingTopping.id && editingTopping.name && editingTopping.price >= 0) {
    const index = editMode.topping.index;
    
    // Ellenőrizzük, hogy az ID egyedi legyen (kivéve ha ugyanaz maradt)
    const otherToppings = settings.extraToppings.filter((_, i) => i !== index);
    if (!otherToppings.some(topping => topping.id === editingTopping.id)) {
      // Méretenkénti árak beállítása
      const prices = {};
      if (settings.pizzaPricingType === 'custom' && settings.pizzaSizes.length > 0) {
        // Ha egyedi árazás van és vannak méretek, akkor minden mérethez beállítjuk az árat
        settings.pizzaSizes.forEach(size => {
          prices[size.id] = editingTopping.prices[size.id] || editingTopping.price;
        });
      }
      
      settings.extraToppings[index] = {
        id: editingTopping.id,
        name: editingTopping.name,
        price: Number(editingTopping.price),
        prices: prices
      };
      
      // Szerkesztési mód kikapcsolása
      cancelEditTopping();
    }
  }
};

// Feltét szerkesztésének megszakítása
const cancelEditTopping = () => {
  editMode.topping.active = false;
  editMode.topping.index = -1;
  
  // Mezők törlése
  editingTopping.id = '';
  editingTopping.name = '';
  editingTopping.price = 0;
  editingTopping.prices = {};
};

// Feltét törlése
const deleteTopping = (index) => {
  settings.extraToppings.splice(index, 1);
};

// Komponens betöltésekor
onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="settings-view">
    <div class="settings-header">
      <h1>Beállítások</h1>
    </div>
    
    <div class="settings-tabs">
      <button 
        :class="{ active: activeTab === 'general' }" 
        @click="activeTab = 'general'"
      >
        Általános beállítások
      </button>
      <button 
        v-if="isAdmin"
        :class="{ active: activeTab === 'users' }" 
        @click="activeTab = 'users'"
      >
        Felhasználók kezelése
      </button>
    </div>
    
    <!-- Felhasználók és jogosultságok kezelése (csak admin számára) -->
    <div v-if="activeTab === 'users' && isAdmin" class="settings-section">
      <UserManagement />
    </div>
    
    <!-- Általános beállítások -->
    <div v-if="activeTab === 'general'" class="settings-container">
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
        <button @click="loadSettings" class="retry-btn">Újrapróbálkozás</button>
      </div>
      
      <div v-if="isLoading" class="loading">
        Beállítások betöltése...
      </div>
      
      <div v-else-if="!errorMessage">
        <!-- Étterem adatai -->
        <div class="settings-section">
          <h2>Étterem adatai</h2>
          
          <div class="form-group">
            <label for="restaurant-name">Étterem neve:</label>
            <input type="text" id="restaurant-name" v-model="settings.restaurantName">
          </div>
          
          <div class="form-group">
            <label for="address">Cím:</label>
            <input type="text" id="address" v-model="settings.address">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="phone">Telefonszám:</label>
              <input type="text" id="phone" v-model="settings.phone">
            </div>
            
            <div class="form-group">
              <label for="email">E-mail cím:</label>
              <input type="email" id="email" v-model="settings.email">
            </div>
          </div>
          
          <div class="form-group">
            <label for="tax-number">Adószám:</label>
            <input type="text" id="tax-number" v-model="settings.taxNumber">
          </div>
        </div>
        
        <!-- Rendelési beállítások -->
        <div class="settings-section">
          <h2>Rendelési beállítások</h2>
          
          <div class="form-row">
            <div class="form-group">
              <label for="delivery-fee">Kiszállítási díj (Ft):</label>
              <input type="number" id="delivery-fee" v-model="settings.deliveryFee" min="0">
            </div>
            
            <div class="form-group">
              <label for="packaging-fee">Csomagolási díj (Ft):</label>
              <input type="number" id="packaging-fee" v-model="settings.packagingFee" min="0">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="min-order">Minimum rendelési összeg (Ft):</label>
              <input type="number" id="min-order" v-model="settings.minOrderAmount" min="0">
            </div>
            
            <div class="form-group">
              <label for="delivery-time">Átlagos kiszállítási idő (perc):</label>
              <input type="number" id="delivery-time" v-model="settings.deliveryTimeMinutes" min="0">
            </div>
          </div>
          
          <div class="form-group">
            <label>Fizetési módok:</label>
            <div class="payment-methods">
              <div 
                v-for="method in availablePaymentMethods" 
                :key="method.id"
                class="payment-method"
              >
                <input 
                  type="checkbox" 
                  :id="'payment-' + method.id" 
                  :checked="settings.paymentMethods.includes(method.id)"
                  @change="togglePaymentMethod(method.id)"
                >
                <label :for="'payment-' + method.id">{{ method.name }}</label>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Pizza méretek -->
        <div class="settings-section">
          <h2>Pizza méretek</h2>
          
          <div class="pricing-type-selector">
            <label>Árazási mód:</label>
            <div class="radio-group">
              <label class="radio-label">
                <input 
                  type="radio" 
                  name="pricing-type" 
                  value="multiplier" 
                  v-model="settings.pizzaPricingType"
                >
                Százalékos árszorzó (alapár × szorzó)
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  name="pricing-type" 
                  value="custom" 
                  v-model="settings.pizzaPricingType"
                >
                Egyedi árak pizzánként és méretenként
              </label>
            </div>
            <p class="help-text">
              {{ settings.pizzaPricingType === 'multiplier' ? 
                'Százalékos módban minden pizza ára az alapárból számolódik a mérethez tartozó szorzóval.' : 
                'Egyedi árazás módban minden pizzánál külön megadhatod az egyes méretek árait a menüelem szerkesztésekor.' }}
            </p>
          </div>
          
          <div class="pizza-sizes-list">
            <table v-if="settings.pizzaSizes.length > 0">
              <thead>
                <tr>
                  <th>Azonosító</th>
                  <th>Méret neve</th>
                  <th>Árszorzó</th>
                  <th>Műveletek</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(size, index) in settings.pizzaSizes" :key="size.id">
                  <td>{{ size.id }}</td>
                  <td>{{ size.name }}</td>
                  <td>{{ size.priceMultiplier }}</td>
                  <td>
                    <button class="edit-btn" @click="startEditPizzaSize(index)">Szerkesztés</button>
                    <button class="delete-btn" @click="deletePizzaSize(index)" v-if="isAdmin || !authStore.loginEnabled">Törlés</button>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div v-else class="empty-message">
              Nincsenek pizza méretek megadva.
            </div>
            
            <!-- Szerkesztési űrlap -->
            <div v-if="editMode.pizzaSize.active" class="edit-form">
              <h3>Méret szerkesztése</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-size-id">Azonosító:</label>
                  <input type="text" id="edit-size-id" v-model="editingPizzaSize.id" placeholder="pl. small">
                </div>
                
                <div class="form-group">
                  <label for="edit-size-name">Méret neve:</label>
                  <input type="text" id="edit-size-name" v-model="editingPizzaSize.name" placeholder="pl. Kicsi (25 cm)">
                </div>
                
                <div class="form-group" v-if="settings.pizzaPricingType === 'multiplier'">
                  <label for="edit-size-multiplier">Árszorzó:</label>
                  <input type="number" id="edit-size-multiplier" v-model="editingPizzaSize.priceMultiplier" min="0.1" step="0.1">
                </div>
              </div>
              
              <div class="form-actions">
                <button class="save-btn" @click="saveEditPizzaSize">Mentés</button>
                <button class="cancel-btn" @click="cancelEditPizzaSize">Mégsem</button>
              </div>
            </div>
            
            <div class="add-form">
              <h3>Új méret hozzáadása</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="size-id">Azonosító:</label>
                  <input type="text" id="size-id" v-model="newPizzaSize.id" placeholder="pl. small">
                </div>
                
                <div class="form-group">
                  <label for="size-name">Méret neve:</label>
                  <input type="text" id="size-name" v-model="newPizzaSize.name" placeholder="pl. Kicsi (25 cm)">
                </div>
                
                <div class="form-group" v-if="settings.pizzaPricingType === 'multiplier'">
                  <label for="size-multiplier">Árszorzó:</label>
                  <input type="number" id="size-multiplier" v-model="newPizzaSize.priceMultiplier" min="0.1" step="0.1">
                </div>
              </div>
              
              <button class="add-btn" @click="addPizzaSize">Méret hozzáadása</button>
            </div>
          </div>
        </div>
        
        <!-- Extra feltétek -->
        <div class="settings-section">
          <h2>Extra feltétek</h2>
          
          <div class="toppings-list">
            <table v-if="settings.extraToppings.length > 0">
              <thead>
                <tr>
                  <th>Azonosító</th>
                  <th>Feltét neve</th>
                  <th>Alapár (Ft)</th>
                  <th v-if="settings.pizzaPricingType === 'custom'">Méretenkénti árak</th>
                  <th>Műveletek</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(topping, index) in settings.extraToppings" :key="topping.id">
                  <td>{{ topping.id }}</td>
                  <td>{{ topping.name }}</td>
                  <td>{{ topping.price }}</td>
                  <td v-if="settings.pizzaPricingType === 'custom'" class="size-prices-cell">
                    <div v-if="topping.prices && Object.keys(topping.prices).length > 0" class="size-prices-list">
                      <div v-for="size in settings.pizzaSizes" :key="size.id" class="size-price-badge">
                        {{ size.name }}: {{ topping.prices[size.id] || topping.price }} Ft
                      </div>
                    </div>
                    <span v-else>Alapár minden méretnél</span>
                  </td>
                  <td>
                    <button class="edit-btn" @click="startEditTopping(index)">Szerkesztés</button>
                    <button class="delete-btn" @click="deleteTopping(index)" v-if="isAdmin || !authStore.loginEnabled">Törlés</button>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div v-else class="empty-message">
              Nincsenek extra feltétek megadva.
            </div>
            
            <!-- Szerkesztési űrlap -->
            <div v-if="editMode.topping.active" class="edit-form">
              <h3>Feltét szerkesztése</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="edit-topping-id">Azonosító:</label>
                  <input type="text" id="edit-topping-id" v-model="editingTopping.id" placeholder="pl. cheese">
                </div>
                
                <div class="form-group">
                  <label for="edit-topping-name">Feltét neve:</label>
                  <input type="text" id="edit-topping-name" v-model="editingTopping.name" placeholder="pl. Extra sajt">
                </div>
                
                <div class="form-group">
                  <label for="edit-topping-price">Alapár (Ft):</label>
                  <input type="number" id="edit-topping-price" v-model="editingTopping.price" min="0">
                </div>
              </div>
              
              <!-- Méretenkénti árak szerkesztése -->
              <div v-if="settings.pizzaPricingType === 'custom' && settings.pizzaSizes.length > 0" class="size-prices-section">
                <h4>Méretenkénti árak:</h4>
                <div class="size-prices-grid">
                  <div v-for="size in settings.pizzaSizes" :key="size.id" class="size-price-item">
                    <label :for="'edit-topping-price-' + size.id">{{ size.name }}:</label>
                    <div class="price-input-wrapper">
                      <input 
                        type="number" 
                        :id="'edit-topping-price-' + size.id" 
                        v-model="editingTopping.prices[size.id]" 
                        min="0"
                        class="size-price-input"
                      >
                      <span class="price-unit">Ft</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="form-actions">
                <button class="save-btn" @click="saveEditTopping">Mentés</button>
                <button class="cancel-btn" @click="cancelEditTopping">Mégsem</button>
              </div>
            </div>
            
            <div class="add-form">
              <h3>Új feltét hozzáadása</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="topping-id">Azonosító:</label>
                  <input type="text" id="topping-id" v-model="newTopping.id" placeholder="pl. cheese">
                </div>
                
                <div class="form-group">
                  <label for="topping-name">Feltét neve:</label>
                  <input type="text" id="topping-name" v-model="newTopping.name" placeholder="pl. Extra sajt">
                </div>
                
                <div class="form-group">
                  <label for="topping-price">Alapár (Ft):</label>
                  <input type="number" id="topping-price" v-model="newTopping.price" min="0">
                </div>
              </div>
              
              <!-- Méretenkénti árak hozzáadása -->
              <div v-if="settings.pizzaPricingType === 'custom' && settings.pizzaSizes.length > 0" class="size-prices-section">
                <h4>Méretenkénti árak:</h4>
                <div class="size-prices-grid">
                  <div v-for="size in settings.pizzaSizes" :key="size.id" class="size-price-item">
                    <label :for="'new-topping-price-' + size.id">{{ size.name }}:</label>
                    <div class="price-input-wrapper">
                      <input 
                        type="number" 
                        :id="'new-topping-price-' + size.id" 
                        v-model="newTopping.prices[size.id]" 
                        min="0"
                        class="size-price-input"
                        :placeholder="newTopping.price"
                      >
                      <span class="price-unit">Ft</span>
                    </div>
                  </div>
                </div>
                <p class="help-text">Ha nem adsz meg méretenkénti árat, az alapár lesz használva minden méretnél.</p>
              </div>
              
              <button class="add-btn" @click="addTopping">Feltét hozzáadása</button>
            </div>
          </div>
        </div>
        
        <!-- Mentés gomb -->
        <div class="settings-actions">
          <button 
            class="primary-btn" 
            @click="saveSettings" 
            :disabled="isSaving"
          >
            {{ isSaving ? 'Mentés...' : 'Beállítások mentése' }}
          </button>
          
          <div v-if="saveMessage" class="save-message">
            {{ saveMessage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}

.settings-view h1 {
  color: var(--primary-color);
}

.loading {
  text-align: center;
  margin: 2rem 0;
  font-style: italic;
  color: #666;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.retry-btn {
  background-color: #c62828;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.settings-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-section {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.settings-section h2 {
  color: var(--primary-color);
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.settings-section h3 {
  color: var(--secondary-color);
  margin: 1.5rem 0 1rem;
  font-size: 1.1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-row .form-group {
  flex: 1;
  margin-bottom: 0;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

input[type="text"],
input[type="email"],
input[type="number"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.payment-methods {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.payment-method input[type="checkbox"] {
  width: auto;
}

.pricing-type-selector {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
}

.radio-label input[type="radio"] {
  width: auto;
}

.settings-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.primary-btn {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.primary-btn:hover {
  background-color: var(--secondary-color);
}

.primary-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.save-message {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  background-color: #e8f5e9;
  color: #2e7d32;
}

/* Pizza méretek és feltétek táblázat */
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
  background-color: #0b7dda;
}

.save-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.save-btn:hover {
  background-color: #3e8e41;
}

.cancel-btn {
  background-color: #9e9e9e;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-left: 0.5rem;
}

.cancel-btn:hover {
  background-color: #757575;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.edit-form {
  background-color: #e3f2fd;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
  border-left: 4px solid #2196F3;
}

.add-btn {
  background-color: var(--secondary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-btn:hover {
  background-color: var(--primary-color);
}

.empty-message {
  font-style: italic;
  color: #666;
  margin-bottom: 1.5rem;
}

.add-form {
  background-color: #f9f9f9;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
}

/* Reszponzív design */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 1rem;
  }
}

.size-prices-section {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 8px;
  border-left: 4px solid #4CAF50;
}

.size-prices-section h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #2e7d32;
}

.size-prices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.size-price-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.price-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.size-price-input {
  width: 100px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: right;
}

.price-unit {
  color: #666;
}

.size-prices-cell {
  width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.size-prices-list {
  margin-top: 0.5rem;
  margin-left: 1rem;
}

.size-price-badge {
  background-color: #e0e0e0;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.25rem;
}

/* Beállítási fülek stílusa */
.settings-tabs {
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid #ddd;
  margin-bottom: 1.5rem;
}

.settings-tabs button {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  transition: all 0.3s ease;
}

.settings-tabs button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.settings-tabs button:hover:not(.active) {
  color: var(--secondary-color);
  border-bottom-color: #ddd;
}

@media (max-width: 768px) {
  .settings-tabs button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .settings-tabs {
    flex-direction: column;
  }
  
  .settings-tabs button {
    width: 100%;
    text-align: center;
  }
}
</style> 