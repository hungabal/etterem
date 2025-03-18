// kitchen.cy.js - Tesztfájl a Konyha oldalhoz

describe('Kitchen Page Tests', () => {
  beforeEach(() => {
    // Intercept API hívásokat
    cy.intercept('GET', '**/kitchen/orders*', { fixture: 'kitchen-orders.json' }).as('getKitchenOrders');
    cy.intercept('PUT', '**/kitchen/orders/*', { statusCode: 200 }).as('updateKitchenOrder');
    cy.intercept('PUT', '**/kitchen/items/*', { statusCode: 200 }).as('updateKitchenItem');
    
    // Bejelentkezés szimulálása
    cy.window().then((win) => {
      win.localStorage.setItem('user', JSON.stringify({
        id: 'chef',
        name: 'Chef User',
        email: 'chef@example.com',
        role: 'chef'
      }));
    });
    
    // Navigálás a konyha oldalra
    cy.visit('/kitchen');
    cy.wait('@getKitchenOrders');
  });
  
  it('should display kitchen orders correctly', () => {
    // Ellenőrizzük, hogy a rendelések megjelennek
    cy.get('.kitchen-board').should('exist');
    cy.get('.order-card').should('have.length.at.least', 1);
  });
  
  it('should display order items correctly', () => {
    // Ellenőrizzük, hogy minden rendelési tétel megjelenik
    cy.get('.order-card').first().find('.order-item').should('have.length.at.least', 1);
    
    // Ellenőrizzük, hogy a tétel adatai helyesen jelennek meg
    cy.get('.order-card').first().find('.order-item').first().should('contain', 'Margherita Pizza');
  });
  
  it('should group orders by status', () => {
    // Ellenőrizzük, hogy a különböző státuszú rendelések a megfelelő oszlopban jelennek meg
    cy.get('.column-new .order-card').should('have.length.at.least', 1);
    cy.get('.column-inProgress .order-card').should('have.length.at.least', 1);
    cy.get('.column-ready .order-card').should('have.length.at.least', 1);
  });
  
  it('should show order priority indicators', () => {
    // Ellenőrizzük, hogy a magas prioritású rendeléseken megjelennek a prioritás jelzők
    cy.get('.order-card.high-priority').should('have.length.at.least', 1);
    cy.get('.order-card.high-priority .priority-indicator').should('be.visible');
  });
  
  it('should update item status when clicked', () => {
    // Kattintsunk egy rendelési tételre a státuszának megváltoztatásához
    cy.get('.order-card').first().find('.order-item').first().click();
    
    // Kattintsunk az "Elkészítés alatt" gombra
    cy.get('.status-selector button').contains('Elkészítés alatt').click();
    
    // Ellenőrizzük, hogy megtörtént a kérés
    cy.wait('@updateKitchenItem');
    
    // Ellenőrizzük, hogy a tétel státusza megváltozott
    cy.get('.order-card').first().find('.order-item').first().should('have.class', 'status-inProgress');
  });
  
  it('should mark item as ready', () => {
    // Kattintsunk egy folyamatban lévő tételre
    cy.get('.order-item.status-inProgress').first().click();
    
    // Kattintsunk a "Kész" gombra
    cy.get('.status-selector button').contains('Kész').click();
    
    // Ellenőrizzük, hogy megtörtént a kérés
    cy.wait('@updateKitchenItem');
    
    // Ellenőrizzük, hogy a tétel státusza megváltozott
    cy.get('.order-item').first().should('have.class', 'status-ready');
  });
  
  it('should mark order as ready when all items are ready', () => {
    // Kattintsunk az első rendelés első tételére
    cy.get('.order-card').first().find('.order-item').first().click();
    
    // Kattintsunk a "Kész" gombra
    cy.get('.status-selector button').contains('Kész').click();
    cy.wait('@updateKitchenItem');
    
    // Kattintsunk az első rendelés második tételére (ha van)
    cy.get('.order-card').first().find('.order-item').eq(1).then($item => {
      if ($item.length > 0) {
        cy.wrap($item).click();
        cy.get('.status-selector button').contains('Kész').click();
        cy.wait('@updateKitchenItem');
      }
      
      // Ellenőrizzük, hogy a rendelés státusza megváltozott
      cy.wait('@updateKitchenOrder');
      cy.get('.order-card').first().should('have.class', 'status-ready');
    });
  });
  
  it('should filter orders by type', () => {
    // Válasszuk ki a "Helyben fogyasztás" típust a szűrőben
    cy.get('.type-filter').select('dineIn');
    
    // Ellenőrizzük, hogy csak a helyben fogyasztásra vonatkozó rendelések jelennek meg
    cy.get('.order-card').each($card => {
      cy.wrap($card).should('have.class', 'type-dineIn');
    });
  });
  
  it('should sort orders by time', () => {
    // Válasszuk ki az "Érkezési idő" szerinti rendezést
    cy.get('.sort-selector').select('time');
    
    // Ellenőrizzük, hogy a rendelések időrendben jelennek meg
    cy.get('.order-card').then($cards => {
      // Ellenőrizzük az első és utolsó rendelés időbélyegét
      const firstOrderTime = new Date($cards.first().find('.order-time').text());
      const lastOrderTime = new Date($cards.last().find('.order-time').text());
      
      expect(firstOrderTime.getTime()).to.be.lessThan(lastOrderTime.getTime());
    });
  });
  
  it('should show order details when clicking on order header', () => {
    // Kattintsunk egy rendelés fejlécére
    cy.get('.order-card .order-header').first().click();
    
    // Ellenőrizzük, hogy megjelennek a részletes információk
    cy.get('.order-card .order-details').first().should('be.visible');
    cy.get('.order-card .order-details').first().should('contain', 'Ügyfél adatok');
  });
  
  it('should print kitchen receipt', () => {
    // Spy-oljuk a window.print metódust
    cy.window().then((win) => {
      cy.spy(win, 'print').as('print');
    });
    
    // Kattintsunk a nyomtatás gombra
    cy.get('.order-card .print-button').first().click();
    
    // Ellenőrizzük, hogy meghívódott a print metódus
    cy.get('@print').should('have.been.called');
  });
}); 