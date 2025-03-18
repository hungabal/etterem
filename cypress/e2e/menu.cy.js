// menu.cy.js - Tesztfájl az Étlap oldalhoz

describe('Menu Page Tests', () => {
  beforeEach(() => {
    // Intercept API hívásokat az étlap lekéréséhez
    cy.intercept('GET', '**/menu', { fixture: 'menu.json' }).as('getMenu');
    cy.intercept('PUT', '**/menu/item', { statusCode: 200 }).as('saveMenuItem');
    cy.intercept('POST', '**/menu/item', { statusCode: 201 }).as('createMenuItem');
    cy.intercept('DELETE', '**/menu/item/*', { statusCode: 200 }).as('deleteMenuItem');
    
    // Bejelentkezés szimulálása
    cy.window().then((win) => {
      win.localStorage.setItem('user', JSON.stringify({
        id: 'admin',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      }));
    });
    
    // Navigálás az étlap oldalra
    cy.visit('/menu');
    cy.wait('@getMenu');
  });
  
  it('should display menu categories correctly', () => {
    // Ellenőrizzük, hogy a kategóriák megjelennek
    cy.get('.menu-categories').should('exist');
    cy.get('.category-item').should('have.length.at.least', 1);
    
    // Ellenőrizzük, hogy az első kategória ki van választva
    cy.get('.category-item').first().should('have.class', 'active');
  });
  
  it('should display menu items when a category is selected', () => {
    // Kattintsunk az első kategóriára
    cy.get('.category-item').first().click();
    
    // Ellenőrizzük, hogy megjelennek a kategóriához tartozó ételek
    cy.get('.menu-items').should('exist');
    cy.get('.menu-item-card').should('have.length.at.least', 1);
  });
  
  it('should open new menu item form when add button is clicked', () => {
    // Kattintsunk az "Új étel hozzáadása" gombra
    cy.contains('button', 'Új étel').click();
    
    // Ellenőrizzük, hogy megjelenik az új étel űrlap
    cy.get('.menu-item-form').should('be.visible');
  });
  
  it('should create a new menu item', () => {
    // Kattintsunk az "Új étel hozzáadása" gombra
    cy.contains('button', 'Új étel').click();
    
    // Töltsük ki az új étel űrlapot
    cy.get('#item-name').type('Tesztétel');
    cy.get('#item-description').type('Ez egy teszt étel leírása');
    cy.get('#item-price').clear().type('2500');
    cy.get('#item-category').select('pizza');
    
    // Mentsük el az új ételt
    cy.contains('button', 'Mentés').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@createMenuItem');
    
    // Ellenőrizzük, hogy az új étel megjelenik a listában
    cy.contains('.menu-item-card', 'Tesztétel').should('exist');
  });
  
  it('should edit an existing menu item', () => {
    // Kattintsunk az első étel szerkesztés gombjára
    cy.get('.menu-item-card').first().find('.edit-button').click();
    
    // Módosítsuk az étel nevét
    cy.get('#item-name').clear().type('Módosított étel');
    
    // Mentsük a módosításokat
    cy.contains('button', 'Mentés').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@saveMenuItem');
    
    // Ellenőrizzük, hogy a módosított név megjelenik a listában
    cy.contains('.menu-item-card', 'Módosított étel').should('exist');
  });
  
  it('should delete a menu item', () => {
    // Számoljuk meg az ételek számát
    cy.get('.menu-item-card').then($items => {
      const initialCount = $items.length;
      
      // Kattintsunk az első étel törlés gombjára
      cy.get('.menu-item-card').first().find('.delete-button').click();
      
      // Erősítsük meg a törlést
      cy.get('.confirm-dialog button.confirm').click();
      
      // Ellenőrizzük, hogy megtörtént a törlési kérés
      cy.wait('@deleteMenuItem');
      
      // Ellenőrizzük, hogy eggyel kevesebb étel van
      cy.get('.menu-item-card').should('have.length', initialCount - 1);
    });
  });
  
  it('should filter menu items by search term', () => {
    // Írjunk be egy keresési kifejezést
    cy.get('input[type="search"]').type('pizza');
    
    // Ellenőrizzük, hogy csak a keresési kifejezésnek megfelelő ételek jelennek meg
    cy.get('.menu-item-card').each(($card) => {
      cy.wrap($card).should('contain', 'pizza');
    });
  });
  
  it('should toggle item availability correctly', () => {
    // Kapcsoljuk ki az első étel elérhetőségét
    cy.get('.menu-item-card').first().find('.availability-toggle').click();
    
    // Ellenőrizzük, hogy megváltozott az állapot (inaktív)
    cy.get('.menu-item-card').first().should('have.class', 'unavailable');
    
    // Kapcsoljuk vissza
    cy.get('.menu-item-card').first().find('.availability-toggle').click();
    
    // Ellenőrizzük, hogy visszaváltozott az állapot (aktív)
    cy.get('.menu-item-card').first().should('not.have.class', 'unavailable');
  });
}); 