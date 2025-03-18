// billing.cy.js - Tesztfájl a Számlázás oldalhoz

describe('Billing Page Tests', () => {
  beforeEach(() => {
    // Intercept API hívásokat
    cy.intercept('GET', '**/billing/orders*', { fixture: 'billing-orders.json' }).as('getBillingOrders');
    cy.intercept('GET', '**/billing/invoices*', { fixture: 'billing-invoices.json' }).as('getBillingInvoices');
    cy.intercept('GET', '**/billing/statistics*', { fixture: 'billing-statistics.json' }).as('getBillingStatistics');
    cy.intercept('POST', '**/billing/invoices', { statusCode: 201 }).as('createInvoice');
    cy.intercept('POST', '**/billing/receipts', { statusCode: 201 }).as('createReceipt');
    
    // Bejelentkezés szimulálása
    cy.window().then((win) => {
      win.localStorage.setItem('user', JSON.stringify({
        id: 'admin',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      }));
    });
    
    // Navigálás a számlázás oldalra
    cy.visit('/billing');
    cy.wait('@getBillingOrders');
    cy.wait('@getBillingInvoices');
    cy.wait('@getBillingStatistics');
  });
  
  it('should display orders waiting for payment correctly', () => {
    // Ellenőrizzük, hogy a fizetésre váró rendelések megjelennek
    cy.get('.orders-to-bill').should('exist');
    cy.get('.order-item').should('have.length.at.least', 1);
  });
  
  it('should show order details when clicking on an order', () => {
    // Kattintsunk az első rendelésre
    cy.get('.order-item').first().click();
    
    // Ellenőrizzük, hogy a rendelés részletek megjelennek
    cy.get('.order-details').should('be.visible');
    cy.get('.order-details h2').should('include.text', 'Rendelés');
  });
  
  it('should generate receipt for an order', () => {
    // Kattintsunk az első rendelésre
    cy.get('.order-item').first().click();
    
    // Kattintsunk a "Nyugta generálása" gombra
    cy.contains('button', 'Nyugta').click();
    
    // Válasszunk fizetési módot, ha szükséges
    cy.get('.payment-method-selector').select('cash');
    
    // Erősítsük meg a nyugta készítését
    cy.contains('button', 'Nyugta elkészítése').click();
    
    // Ellenőrizzük, hogy megtörtént a kérés
    cy.wait('@createReceipt');
    
    // Ellenőrizzük, hogy megjelenik a siker üzenet
    cy.get('.success-message').should('be.visible');
    cy.get('.success-message').should('contain', 'Nyugta sikeresen létrehozva');
  });
  
  it('should generate invoice for an order', () => {
    // Kattintsunk az első rendelésre
    cy.get('.order-item').first().click();
    
    // Kattintsunk a "Számla generálása" gombra
    cy.contains('button', 'Számla').click();
    
    // Adjuk meg a számlázási adatokat
    cy.get('#invoice-name').type('Teszt Cég Kft.');
    cy.get('#invoice-tax-number').type('12345678-2-42');
    cy.get('#invoice-address').type('Példa utca 123, Budapest, 1111');
    
    // Válasszunk fizetési módot, ha szükséges
    cy.get('.payment-method-selector').select('transfer');
    
    // Erősítsük meg a számla készítését
    cy.contains('button', 'Számla elkészítése').click();
    
    // Ellenőrizzük, hogy megtörtént a kérés
    cy.wait('@createInvoice');
    
    // Ellenőrizzük, hogy megjelenik a siker üzenet
    cy.get('.success-message').should('be.visible');
    cy.get('.success-message').should('contain', 'Számla sikeresen létrehozva');
  });
  
  it('should view generated invoices in the list', () => {
    // Váltsunk a "Számlák" fülre
    cy.get('.tabs-navbar').contains('Számlák').click();
    
    // Ellenőrizzük, hogy a számlák listája megjelenik
    cy.get('.invoices-list').should('be.visible');
    cy.get('.invoice-item').should('have.length.at.least', 1);
  });
  
  it('should show invoice details when clicking on an invoice', () => {
    // Váltsunk a "Számlák" fülre
    cy.get('.tabs-navbar').contains('Számlák').click();
    
    // Kattintsunk az első számlára
    cy.get('.invoice-item').first().click();
    
    // Ellenőrizzük, hogy a számla részletek megjelennek
    cy.get('.invoice-details').should('be.visible');
    cy.get('.invoice-details').should('contain', 'Számla adatok');
  });
  
  it('should print an invoice', () => {
    // Spy-oljuk a window.print metódust
    cy.window().then((win) => {
      cy.spy(win, 'print').as('print');
    });
    
    // Váltsunk a "Számlák" fülre
    cy.get('.tabs-navbar').contains('Számlák').click();
    
    // Kattintsunk az első számlára
    cy.get('.invoice-item').first().click();
    
    // Kattintsunk a nyomtatás gombra
    cy.get('.invoice-details .print-button').click();
    
    // Ellenőrizzük, hogy meghívódott a print metódus
    cy.get('@print').should('have.been.called');
  });
  
  it('should show daily statistics', () => {
    // Váltsunk a "Statisztikák" fülre
    cy.get('.tabs-navbar').contains('Statisztikák').click();
    
    // Ellenőrizzük, hogy a napi statisztikák megjelennek
    cy.get('.statistics-panel').should('be.visible');
    cy.get('.daily-summary').should('be.visible');
  });
  
  it('should filter invoices by date range', () => {
    // Váltsunk a "Számlák" fülre
    cy.get('.tabs-navbar').contains('Számlák').click();
    
    // Állítsuk be a dátum szűrőt
    cy.get('.date-filter input[name="startDate"]').type('2023-12-01');
    cy.get('.date-filter input[name="endDate"]').type('2023-12-31');
    
    // Kattintsunk a szűrés gombra
    cy.get('.date-filter button').click();
    
    // Ellenőrizzük, hogy csak a dátum tartományba eső számlák jelennek meg
    cy.get('.invoice-item').each($item => {
      const dateText = $item.find('.invoice-date').text();
      const invoiceDate = new Date(dateText);
      const startDate = new Date('2023-12-01');
      const endDate = new Date('2023-12-31');
      
      expect(invoiceDate >= startDate && invoiceDate <= endDate).to.be.true;
    });
  });
  
  it('should search invoices by customer name', () => {
    // Váltsunk a "Számlák" fülre
    cy.get('.tabs-navbar').contains('Számlák').click();
    
    // Keressünk egy számlát ügyfélnév szerint
    cy.get('input[type="search"]').type('Teszt');
    
    // Ellenőrizzük, hogy csak a keresési feltételnek megfelelő számlák jelennek meg
    cy.get('.invoice-item').each($item => {
      cy.wrap($item).should('contain', 'Teszt');
    });
  });
  
  it('should generate month-end financial report', () => {
    // Spy-oljuk a dokumentum letöltést
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen');
    });
    
    // Váltsunk a "Statisztikák" fülre
    cy.get('.tabs-navbar').contains('Statisztikák').click();
    
    // Válasszuk ki a hónapot a jelentéshez
    cy.get('.report-generator select').select('2023-12');
    
    // Kattintsunk a jelentés generálása gombra
    cy.get('.report-generator button').click();
    
    // Ellenőrizzük, hogy megtörtént a jelentés letöltés kezdeményezése
    cy.get('@windowOpen').should('have.been.called');
  });
  
  it('should show payment breakdown by method', () => {
    // Váltsunk a "Statisztikák" fülre
    cy.get('.tabs-navbar').contains('Statisztikák').click();
    
    // Ellenőrizzük, hogy a fizetési módok szerinti bontás megjelenik
    cy.get('.payment-methods-chart').should('be.visible');
    
    // Ellenőrizzük, hogy a chart adatok helyesen jelennek meg
    cy.get('.payment-methods-chart .chart-legend').should('contain', 'Készpénz');
    cy.get('.payment-methods-chart .chart-legend').should('contain', 'Kártya');
  });
}); 