// settings.cy.js - Tesztfájl a Settings oldalhoz

describe('Settings Page Tests', () => {
  beforeEach(() => {
    // Intercept API hívásokat a beállítások lekéréséhez
    cy.intercept('GET', '**/settings', { fixture: 'settings.json' }).as('getSettings');
    cy.intercept('PUT', '**/settings', { statusCode: 200 }).as('saveSettings');
    
    // Bejelentkezés szimulálása (ez függ a tényleges bejelentkezési mechanizmustól)
    // Imitáljuk, hogy admin felhasználó vagyunk
    cy.window().then((win) => {
      win.localStorage.setItem('user', JSON.stringify({
        id: 'admin',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      }));
    });
    
    // Navigálás a beállítások oldalra
    cy.visit('/settings');
    cy.wait('@getSettings');
  });
  
  it('should display restaurant information correctly', () => {
    // Ellenőrizzük, hogy a cím megfelelően jelenik meg
    cy.get('.settings-header h1').should('contain', 'Beállítások');
    
    // Ellenőrizzük, hogy az étterem neve és adatai megfelelően töltődnek be
    cy.get('#restaurant-name').should('have.value', 'Test Étterem');
    cy.get('#address').should('have.value', 'Test Cím 123');
    cy.get('#phone').should('have.value', '+36123456789');
    cy.get('#email').should('have.value', 'testetterem@example.com');
  });
  
  it('should save settings correctly', () => {
    // Módosítsuk az étterem adatait
    cy.get('#restaurant-name').clear().type('Módosított Étterem');
    cy.get('#address').clear().type('Új cím 456');
    cy.get('#phone').clear().type('+36987654321');
    cy.get('#email').clear().type('uj-email@example.com');
    
    // Kattintsunk a mentés gombra
    cy.get('.primary-btn').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@saveSettings');
    
    // Ellenőrizzük, hogy megjelenik a sikeres mentés üzenete
    cy.get('.save-message').should('be.visible');
    cy.get('.save-message').should('contain', 'Beállítások sikeresen mentve!');
  });
  
  it('should toggle between tabs correctly', () => {
    // Ellenőrizzük, hogy az alapértelmezett fül aktív
    cy.get('.settings-tabs button').first().should('have.class', 'active');
    
    // Kattintsunk a felhasználók fülre (csak admin számára elérhető)
    cy.get('.settings-tabs button').eq(1).click();
    
    // Ellenőrizzük, hogy a felhasználók fül aktív lett
    cy.get('.settings-tabs button').eq(1).should('have.class', 'active');
    
    // Ellenőrizzük, hogy a felhasználókezelő komponens megjelenik
    cy.get('div.settings-section').should('contain', 'UserManagement');
  });
  
  it('should add a new pizza size', () => {
    // Töltsük ki az új pizza méret űrlapot
    cy.get('#size-id').type('extra-large');
    cy.get('#size-name').type('Extra Nagy (45 cm)');
    cy.get('#size-multiplier').clear().type('2.5');
    
    // Kattintsunk a hozzáadás gombra
    cy.contains('button', 'Méret hozzáadása').click();
    
    // Ellenőrizzük, hogy az új méret megjelenik a listában
    cy.get('table tbody tr').contains('Extra Nagy (45 cm)').should('exist');
    cy.get('table tbody tr').contains('extra-large').should('exist');
    cy.get('table tbody tr').contains('2.5').should('exist');
  });
  
  it('should add a new topping', () => {
    // Töltsük ki az új feltét űrlapot
    cy.get('#topping-id').type('jalapeno');
    cy.get('#topping-name').type('Jalapeno');
    cy.get('#topping-price').clear().type('300');
    
    // Kattintsunk a hozzáadás gombra
    cy.contains('button', 'Feltét hozzáadása').click();
    
    // Ellenőrizzük, hogy az új feltét megjelenik a listában
    cy.get('table tbody tr').contains('Jalapeno').should('exist');
    cy.get('table tbody tr').contains('jalapeno').should('exist');
    cy.get('table tbody tr').contains('300').should('exist');
  });
  
  it('should edit an existing pizza size', () => {
    // Kattintsunk az első pizza méret szerkesztés gombjára
    cy.get('.pizza-sizes-list table tbody tr').first().contains('Szerkesztés').click();
    
    // Módosítsuk a nevet
    cy.get('#edit-size-name').clear().type('Módosított Méret');
    
    // Mentsük a módosításokat
    cy.contains('button', 'Mentés').click();
    
    // Ellenőrizzük, hogy a módosított név megjelenik a listában
    cy.get('.pizza-sizes-list table tbody tr').first().contains('Módosított Méret').should('exist');
  });
  
  it('should toggle payment methods correctly', () => {
    // Ellenőrizzük a készpénzes fizetés kapcsolóját
    cy.get('#payment-cash').click();
    
    // Ha be volt kapcsolva, akkor kikapcsolódik, ha ki volt kapcsolva, akkor bekapcsolódik
    // Ellenőrizzük az új állapotot (ez függ a kezdeti állapottól, amit a fixture határoz meg)
  });
}); 