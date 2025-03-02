<script setup>
import { ref, reactive, onMounted } from 'vue';
import { settingsService, initializeDatabase } from '../services/db.js';

// Betöltés állapota
const isLoading = ref(true);
const isSaving = ref(false);
const saveMessage = ref('');
const errorMessage = ref('');

// Beállítások adatai
const settings = reactive({
  restaurantName: '',
  address: '',
  phone: '',
  email: '',
  taxNumber: '',
  deliveryFee: 0,
  packagingFee: 0,
  minOrderAmount: 0,
  deliveryTimeMinutes: 0,
  openingHours: {
    monday: { open: '10:00', close: '22:00' },
    tuesday: { open: '10:00', close: '22:00' },
    wednesday: { open: '10:00', close: '22:00' },
    thursday: { open: '10:00', close: '22:00' },
    friday: { open: '10:00', close: '23:00' },
    saturday: { open: '11:00', close: '23:00' },
    sunday: { open: '11:00', close: '22:00' }
  },
  paymentMethods: [],
  pizzaSizes: [],
  extraToppings: []
});

// Fizetési módok
const availablePaymentMethods = [
  { id: 'cash', name: 'Készpénz' },
  { id: 'card', name: 'Bankkártya' },
];

// Hét napjai
const weekdays = [
  { id: 'monday', name: 'Hétfő' },
  { id: 'tuesday', name: 'Kedd' },
  { id: 'wednesday', name: 'Szerda' },
  { id: 'thursday', name: 'Csütörtök' },
  { id: 'friday', name: 'Péntek' },
  { id: 'saturday', name: 'Szombat' },
  { id: 'sunday', name: 'Vasárnap' }
];

// Új pizza méret
const newPizzaSize = reactive({
  id: '',
  name: '',
  priceMultiplier: 1
});

// Új feltét
const newTopping = reactive({
  id: '',
  name: '',
  price: 0
});

// Szerkesztési állapot
const editMode = reactive({
  pizzaSize: {
    active: false,
    index: -1
  },
  topping: {
    active: false,
    index: -1
  }
});

// Szerkesztendő elemek
const editingPizzaSize = reactive({
  id: '',
  name: '',
  priceMultiplier: 1
});

const editingTopping = reactive({
  id: '',
  name: '',
  price: 0
});

// Beállítások betöltése
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
    settings.openingHours = data.openingHours || {
      monday: { open: '10:00', close: '22:00' },
      tuesday: { open: '10:00', close: '22:00' },
      wednesday: { open: '10:00', close: '22:00' },
      thursday: { open: '10:00', close: '22:00' },
      friday: { open: '10:00', close: '23:00' },
      saturday: { open: '11:00', close: '23:00' },
      sunday: { open: '11:00', close: '22:00' }
    };
    settings.paymentMethods = data.paymentMethods || [];
    settings.pizzaSizes = data.pizzaSizes || [];
    settings.extraToppings = data.extraToppings || [];
    
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
    
    await settingsService.saveSettings({
      restaurantName: settings.restaurantName,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      taxNumber: settings.taxNumber,
      deliveryFee: Number(settings.deliveryFee),
      packagingFee: Number(settings.packagingFee),
      minOrderAmount: Number(settings.minOrderAmount),
      deliveryTimeMinutes: Number(settings.deliveryTimeMinutes),
      openingHours: settings.openingHours,
      paymentMethods: settings.paymentMethods,
      pizzaSizes: settings.pizzaSizes,
      extraToppings: settings.extraToppings
    });
    
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
      settings.extraToppings.push({
        id: newTopping.id,
        name: newTopping.name,
        price: Number(newTopping.price)
      });
      
      // Mezők törlése
      newTopping.id = '';
      newTopping.name = '';
      newTopping.price = 0;
    }
  }
};

// Feltét szerkesztésének indítása
const startEditTopping = (index) => {
  const topping = settings.extraToppings[index];
  editingTopping.id = topping.id;
  editingTopping.name = topping.name;
  editingTopping.price = topping.price;
  
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
      settings.extraToppings[index] = {
        id: editingTopping.id,
        name: editingTopping.name,
        price: Number(editingTopping.price)
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
    <h1>Beállítások</h1>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
      <button @click="loadSettings" class="retry-btn">Újrapróbálkozás</button>
    </div>
    
    <div v-if="isLoading" class="loading">
      Beállítások betöltése...
    </div>
    
    <div v-else-if="!errorMessage" class="settings-container">
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
                  <button class="delete-btn" @click="deletePizzaSize(index)">Törlés</button>
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
              
              <div class="form-group">
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
              
              <div class="form-group">
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
                <th>Ár (Ft)</th>
                <th>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(topping, index) in settings.extraToppings" :key="topping.id">
                <td>{{ topping.id }}</td>
                <td>{{ topping.name }}</td>
                <td>{{ topping.price }}</td>
                <td>
                  <button class="edit-btn" @click="startEditTopping(index)">Szerkesztés</button>
                  <button class="delete-btn" @click="deleteTopping(index)">Törlés</button>
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
                <label for="edit-topping-price">Ár (Ft):</label>
                <input type="number" id="edit-topping-price" v-model="editingTopping.price" min="0">
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
                <label for="topping-price">Ár (Ft):</label>
                <input type="number" id="topping-price" v-model="newTopping.price" min="0">
              </div>
            </div>
            
            <button class="add-btn" @click="addTopping">Feltét hozzáadása</button>
          </div>
        </div>
      </div>
      
      <!-- Nyitvatartás -->
      <div class="settings-section">
        <h2>Nyitvatartás</h2>
        
        <div class="opening-hours">
          <div v-for="day in weekdays" :key="day.id" class="opening-hours-day">
            <div class="day-name">{{ day.name }}:</div>
            <div class="day-hours">
              <input 
                type="time" 
                v-model="settings.openingHours[day.id].open" 
                class="time-input"
              >
              <span>-</span>
              <input 
                type="time" 
                v-model="settings.openingHours[day.id].close" 
                class="time-input"
              >
            </div>
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

.opening-hours {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.opening-hours-day {
  display: flex;
  align-items: center;
}

.day-name {
  width: 100px;
  font-weight: bold;
}

.day-hours {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.time-input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
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
  
  .opening-hours-day {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .day-name {
    width: 100%;
  }
}
</style> 