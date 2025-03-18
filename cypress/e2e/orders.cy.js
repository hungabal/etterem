// orders.cy.js - Tesztfájl a Rendelések oldalhoz

describe('Orders Page Tests', () => {
  beforeEach(() => {
    // Intercept API hívásokat a rendelések lekéréséhez
    cy.intercept('GET', '**/orders*', { fixture: 'orders.json' }).as('getOrders');
    cy.intercept('GET', '**/tables', { fixture: 'tables.json' }).as('getTables');
    cy.intercept('GET', '**/menu', { fixture: 'menu.json' }).as('getMenu');
    cy.intercept('GET', '**/couriers', { fixture: 'couriers.json' }).as('getCouriers');
    cy.intercept('POST', '**/orders', { statusCode: 201 }).as('createOrder');
    cy.intercept('PUT', '**/orders/*', { statusCode: 200 }).as('updateOrder');
    cy.intercept('DELETE', '**/orders/*', { statusCode: 200 }).as('deleteOrder');
    
    // Bejelentkezés szimulálása
    cy.window().then((win) => {
      win.localStorage.setItem('user', JSON.stringify({
        id: 'admin',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      }));
    });
    
    // Navigálás a rendelések oldalra
    cy.visit('/orders');
    cy.wait('@getOrders');
    cy.wait('@getTables');
    cy.wait('@getMenu');
    cy.wait('@getCouriers');
  });
  
  it('should display orders list correctly', () => {
    // Ellenőrizzük, hogy a rendelések listája megjelenik
    cy.get('.orders-list').should('exist');
    cy.get('.order-item').should('have.length.at.least', 1);
  });
  
  it('should filter orders by status', () => {
    // Válasszuk ki a "Folyamatban" állapotot a szűrőben
    cy.get('.status-filter').select('inProgress');
    
    // Ellenőrizzük, hogy csak a folyamatban lévő rendelések jelennek meg
    cy.get('.order-item').each($item => {
      cy.wrap($item).should('have.class', 'status-inProgress');
    });
  });
  
  it('should filter orders by type', () => {
    // Válasszuk ki a "Kiszállítás" típust a szűrőben
    cy.get('.type-filter').select('delivery');
    
    // Ellenőrizzük, hogy csak a kiszállítás típusú rendelések jelennek meg
    cy.get('.order-item').each($item => {
      cy.wrap($item).should('have.class', 'type-delivery');
    });
  });
  
  it('should open order details when clicking on an order', () => {
    // Kattintsunk az első rendelésre
    cy.get('.order-item').first().click();
    
    // Ellenőrizzük, hogy a rendelés részletek megjelennek
    cy.get('.order-details').should('be.visible');
    cy.get('.order-details h2').should('include.text', 'Rendelés');
  });
  
  it('should create a new order for a table', () => {
    // Kattintsunk az "Új rendelés" gombra
    cy.contains('button', 'Új rendelés').click();
    
    // Válasszuk ki a helyben fogyasztás opciót
    cy.get('input[name="orderType"][value="dineIn"]').check();
    
    // Válasszunk egy asztalt
    cy.get('#table-select').select('1');
    
    // Kattintsunk a "Tovább" gombra
    cy.contains('button', 'Tovább').click();
    
    // Adjunk hozzá egy tételt a rendeléshez
    cy.contains('.menu-item', 'Margherita Pizza').click();
    
    // Növeljük a mennyiséget
    cy.get('.quantity-control button').last().click();
    
    // Adjunk megjegyzést a tételhez
    cy.get('.item-note textarea').type('Extra sajt kérése');
    
    // Adjuk hozzá a tételt a rendeléshez
    cy.contains('button', 'Hozzáadás').click();
    
    // Ellenőrizzük, hogy a tétel megjelent a rendelésben
    cy.get('.order-items').should('contain', 'Margherita Pizza');
    
    // Adjunk megjegyzést a teljes rendeléshez
    cy.get('#order-notes').type('Allergia: laktóz');
    
    // Mentsük a rendelést
    cy.contains('button', 'Rendelés mentése').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@createOrder');
    
    // Ellenőrizzük, hogy visszakerültünk a rendelések listájához
    cy.url().should('include', '/orders');
  });
  
  it('should create a new delivery order', () => {
    // Kattintsunk az "Új rendelés" gombra
    cy.contains('button', 'Új rendelés').click();
    
    // Válasszuk ki a kiszállítás opciót
    cy.get('input[name="orderType"][value="delivery"]').check();
    
    // Adjuk meg a szállítási adatokat
    cy.get('#customer-name').type('Teszt Ügyfél');
    cy.get('#customer-phone').type('+36701234567');
    cy.get('#delivery-address').type('Példa utca 123, Budapest');
    
    // Kattintsunk a "Tovább" gombra
    cy.contains('button', 'Tovább').click();
    
    // Adjunk hozzá egy tételt a rendeléshez
    cy.contains('.menu-item', 'Hawaii Pizza').click();
    
    // Adjuk hozzá a tételt a rendeléshez
    cy.contains('button', 'Hozzáadás').click();
    
    // Mentsük a rendelést
    cy.contains('button', 'Rendelés mentése').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@createOrder');
    
    // Ellenőrizzük, hogy visszakerültünk a rendelések listájához
    cy.url().should('include', '/orders');
  });
  
  it('should update order status', () => {
    // Kattintsunk az első rendelésre
    cy.get('.order-item').first().click();
    
    // Változtassuk meg a rendelés állapotát
    cy.get('.status-dropdown').select('completed');
    
    // Mentsük a módosítást
    cy.contains('button', 'Mentés').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@updateOrder');
    
    // Ellenőrizzük, hogy a rendelés állapota megváltozott
    cy.get('.order-item').first().should('have.class', 'status-completed');
  });
  
  it('should assign courier to delivery order', () => {
    // Kattintsunk egy kiszállítási rendelésre
    cy.get('.order-item.type-delivery').first().click();
    
    // Válasszunk ki egy futárt
    cy.get('#courier-select').select('courier-1');
    
    // Mentsük a módosítást
    cy.contains('button', 'Mentés').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@updateOrder');
    
    // Ellenőrizzük, hogy a futár neve megjelenik a rendelésen
    cy.get('.order-item').first().should('contain', 'Teszt István');
  });
  
  it('should print receipt for an order', () => {
    // Spy-oljuk a window.print metódust
    cy.window().then((win) => {
      cy.spy(win, 'print').as('print');
    });
    
    // Kattintsunk az első rendelésre
    cy.get('.order-item').first().click();
    
    // Kattintsunk a számla nyomtatása gombra
    cy.contains('button', 'Számla').click();
    
    // Ellenőrizzük, hogy meghívódott a print metódus
    cy.get('@print').should('have.been.called');
  });
  
  it('should delete an order', () => {
    // Számoljuk meg a rendelések számát
    cy.get('.order-item').then($orders => {
      const initialCount = $orders.length;
      
      // Kattintsunk az első rendelésre
      cy.get('.order-item').first().click();
      
      // Kattintsunk a törlés gombra
      cy.get('.order-details button.delete-button').click();
      
      // Erősítsük meg a törlést
      cy.get('.confirm-dialog button.confirm').click();
      
      // Ellenőrizzük, hogy megtörtént a törlési kérés
      cy.wait('@deleteOrder');
      
      // Ellenőrizzük, hogy eggyel kevesebb rendelés van
      cy.get('.order-item').should('have.length', initialCount - 1);
    });
  });
  
  it('should search for orders by customer name', () => {
    // Keressünk egy rendelést ügyfélnév szerint
    cy.get('input[type="search"]').type('Teszt');
    
    // Ellenőrizzük, hogy csak a keresési feltételnek megfelelő rendelések jelennek meg
    cy.get('.order-item').each($item => {
      cy.wrap($item).should('contain', 'Teszt');
    });
  });
}); 