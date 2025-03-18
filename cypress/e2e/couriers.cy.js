// couriers.cy.js - Tesztfájl a Futárok oldalhoz

describe('Couriers Page Tests', () => {
  beforeEach(() => {
    // Intercept API hívásokat a futárok lekéréséhez
    cy.intercept('GET', '**/couriers', { fixture: 'couriers.json' }).as('getCouriers');
    cy.intercept('POST', '**/couriers', { statusCode: 201 }).as('createCourier');
    cy.intercept('PUT', '**/couriers/*', { statusCode: 200 }).as('updateCourier');
    cy.intercept('DELETE', '**/couriers/*', { statusCode: 200 }).as('deleteCourier');
    
    // Bejelentkezés szimulálása
    cy.window().then((win) => {
      win.localStorage.setItem('user', JSON.stringify({
        id: 'admin',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      }));
    });
    
    // Navigálás a futárok oldalra
    cy.visit('/couriers');
    cy.wait('@getCouriers');
  });
  
  it('should display couriers list correctly', () => {
    // Ellenőrizzük, hogy a futárok listája megjelenik
    cy.get('.couriers-list').should('exist');
    cy.get('.courier-item').should('have.length.at.least', 1);
  });
  
  it('should show courier details when clicking on a courier', () => {
    // Kattintsunk az első futárra
    cy.get('.courier-item').first().click();
    
    // Ellenőrizzük, hogy a futár részletek megjelennek
    cy.get('.courier-details').should('be.visible');
    cy.get('.courier-details h2').should('include.text', 'Futár');
  });
  
  it('should open new courier form when add button is clicked', () => {
    // Kattintsunk az "Új futár" gombra
    cy.contains('button', 'Új futár').click();
    
    // Ellenőrizzük, hogy megjelenik az új futár űrlap
    cy.get('.courier-form').should('be.visible');
  });
  
  it('should create a new courier', () => {
    // Kattintsunk az "Új futár" gombra
    cy.contains('button', 'Új futár').click();
    
    // Töltsük ki az új futár űrlapot
    cy.get('#courier-name').type('Teszt Futár');
    cy.get('#courier-phone').type('+36701234567');
    cy.get('#courier-email').type('teszt.futar@example.com');
    cy.get('#courier-vehicleType').select('car');
    cy.get('#courier-vehiclePlate').type('ABC-123');
    cy.get('#courier-status').select('active');
    
    // Mentsük el az új futárt
    cy.contains('button', 'Mentés').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@createCourier');
    
    // Ellenőrizzük, hogy az új futár megjelenik a listában
    cy.contains('.courier-item', 'Teszt Futár').should('exist');
  });
  
  it('should edit an existing courier', () => {
    // Kattintsunk az első futárra
    cy.get('.courier-item').first().click();
    
    // Kattintsunk a szerkesztés gombra
    cy.get('.courier-details button.edit-button').click();
    
    // Módosítsuk a futár adatait
    cy.get('#courier-name').clear().type('Módosított Futár');
    
    // Mentsük a módosításokat
    cy.contains('button', 'Mentés').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@updateCourier');
    
    // Ellenőrizzük, hogy a módosított név megjelenik a listában
    cy.contains('.courier-item', 'Módosított Futár').should('exist');
  });
  
  it('should delete a courier', () => {
    // Számoljuk meg a futárok számát
    cy.get('.courier-item').then($couriers => {
      const initialCount = $couriers.length;
      
      // Kattintsunk az első futárra
      cy.get('.courier-item').first().click();
      
      // Kattintsunk a törlés gombra
      cy.get('.courier-details button.delete-button').click();
      
      // Erősítsük meg a törlést
      cy.get('.confirm-dialog button.confirm').click();
      
      // Ellenőrizzük, hogy megtörtént a törlési kérés
      cy.wait('@deleteCourier');
      
      // Ellenőrizzük, hogy eggyel kevesebb futár van
      cy.get('.courier-item').should('have.length', initialCount - 1);
    });
  });
  
  it('should filter couriers by status', () => {
    // Válasszuk ki a "Szabad" állapotot a szűrőben
    cy.get('.status-filter').select('free');
    
    // Ellenőrizzük, hogy csak a szabad futárok jelennek meg
    cy.get('.courier-item').each($item => {
      cy.wrap($item).should('have.class', 'status-free');
    });
  });
  
  it('should toggle courier availability', () => {
    // Nyissuk meg az első aktív futár részleteit
    cy.get('.courier-item.status-active').first().click();
    
    // Kattintsunk az elérhetőség kapcsolóra
    cy.get('.courier-details .availability-toggle').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@updateCourier');
    
    // Ellenőrizzük, hogy a futár állapota megváltozott
    cy.get('.courier-item').first().should('have.class', 'status-inactive');
  });
  
  it('should search for couriers by name', () => {
    // Keressünk egy futárt név szerint
    cy.get('input[type="search"]').type('Teszt');
    
    // Ellenőrizzük, hogy csak a keresési feltételnek megfelelő futárok jelennek meg
    cy.get('.courier-item').each($item => {
      cy.wrap($item).should('contain', 'Teszt');
    });
  });
}); 