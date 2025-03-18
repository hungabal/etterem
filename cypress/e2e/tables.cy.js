// tables.cy.js - Tesztfájl az Asztalok oldalhoz

describe('Tables Page Tests', () => {
  beforeEach(() => {
    // Intercept API hívásokat az asztalok lekéréséhez
    cy.intercept('GET', '**/tables', { fixture: 'tables.json' }).as('getTables');
    cy.intercept('GET', '**/tables/layout', { fixture: 'tables-layout.json' }).as('getTablesLayout');
    cy.intercept('POST', '**/tables', { statusCode: 201 }).as('createTable');
    cy.intercept('PUT', '**/tables/*', { statusCode: 200 }).as('updateTable');
    cy.intercept('DELETE', '**/tables/*', { statusCode: 200 }).as('deleteTable');
    
    // Bejelentkezés szimulálása
    cy.window().then((win) => {
      win.localStorage.setItem('user', JSON.stringify({
        id: 'admin',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin'
      }));
    });
    
    // Navigálás az asztalok oldalra
    cy.visit('/tables');
    cy.wait('@getTables');
    cy.wait('@getTablesLayout');
  });
  
  it('should display tables correctly in the layout view', () => {
    // Ellenőrizzük, hogy megjelennek az asztalok
    cy.get('.table-layout').should('exist');
    cy.get('.table-item').should('have.length.at.least', 1);
  });
  
  it('should display tables in list view when switching to list mode', () => {
    // Kattintsunk a lista nézet gombra
    cy.get('.view-toggle button').last().click();
    
    // Ellenőrizzük, hogy megjelennek az asztalok lista nézetben
    cy.get('.tables-list').should('be.visible');
    cy.get('.table-list-item').should('have.length.at.least', 1);
  });
  
  it('should open table details when clicking on a table', () => {
    // Kattintsunk az első asztalra
    cy.get('.table-item').first().click();
    
    // Ellenőrizzük, hogy megjelenik az asztal részletek panel
    cy.get('.table-details').should('be.visible');
    cy.get('.table-details h2').should('contain', 'Asztal');
  });
  
  it('should allow adding a new table', () => {
    // Kattintsunk az "Új asztal" gombra
    cy.contains('button', 'Új asztal').click();
    
    // Töltsük ki az új asztal űrlapot
    cy.get('#table-number').clear().type('999');
    cy.get('#table-capacity').clear().type('4');
    cy.get('#table-status').select('free');
    cy.get('#table-x-position').clear().type('200');
    cy.get('#table-y-position').clear().type('200');
    
    // Mentsük el az új asztalt
    cy.contains('button', 'Mentés').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@createTable');
    
    // Ellenőrizzük, hogy az új asztal megjelenik a listában vagy elrendezésben
    cy.get('.table-item[data-id="999"]').should('exist');
  });
  
  it('should change table status', () => {
    // Nyissuk meg az első asztal részleteit
    cy.get('.table-item').first().click();
    
    // Változtassuk meg az asztal állapotát
    cy.get('.table-details .status-dropdown').select('reserved');
    
    // Mentsük a módosítást
    cy.contains('button', 'Mentés').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@updateTable');
    
    // Ellenőrizzük, hogy az asztal állapota megváltozott
    cy.get('.table-item').first().should('have.class', 'reserved');
  });
  
  it('should allow moving a table in layout view', () => {
    // Kezdeti pozíció lekérése
    cy.get('.table-item').first().then($table => {
      const initialPosition = {
        left: parseInt($table.css('left')),
        top: parseInt($table.css('top'))
      };
      
      // Asztal mozgatása (drag and drop)
      cy.get('.table-item').first().trigger('mousedown', { which: 1 })
        .trigger('mousemove', { clientX: initialPosition.left + 50, clientY: initialPosition.top + 50 })
        .trigger('mouseup');
      
      // Ellenőrizzük, hogy új pozícióban van
      cy.get('.table-item').first().should(($table) => {
        const newPosition = {
          left: parseInt($table.css('left')),
          top: parseInt($table.css('top'))
        };
        expect(newPosition.left).to.be.greaterThan(initialPosition.left);
        expect(newPosition.top).to.be.greaterThan(initialPosition.top);
      });
    });
  });
  
  it('should delete a table', () => {
    // Számoljuk meg az asztalok számát
    cy.get('.table-item').then($tables => {
      const initialCount = $tables.length;
      
      // Nyissuk meg az első asztal részleteit
      cy.get('.table-item').first().click();
      
      // Kattintsunk a törlés gombra
      cy.get('.table-details .delete-button').click();
      
      // Erősítsük meg a törlést
      cy.get('.confirm-dialog button.confirm').click();
      
      // Ellenőrizzük, hogy megtörtént a törlési kérés
      cy.wait('@deleteTable');
      
      // Ellenőrizzük, hogy eggyel kevesebb asztal van
      cy.get('.table-item').should('have.length', initialCount - 1);
    });
  });
  
  it('should allow table reservation', () => {
    // Nyissuk meg az első szabad asztal részleteit
    cy.get('.table-item.free').first().click();
    
    // Kattintsunk a foglalás gombra
    cy.contains('button', 'Foglalás').click();
    
    // Töltsük ki a foglalási űrlapot
    cy.get('#reservation-name').type('Teszt Elek');
    cy.get('#reservation-phone').type('+36701234567');
    cy.get('#reservation-guests').clear().type('4');
    cy.get('#reservation-date').type('2023-12-31');
    cy.get('#reservation-time').type('19:00');
    
    // Mentsük a foglalást
    cy.contains('button', 'Foglalás mentése').click();
    
    // Ellenőrizzük, hogy megtörtént a mentési kérés
    cy.wait('@updateTable');
    
    // Ellenőrizzük, hogy az asztal foglalt állapotba került
    cy.get('.table-item').first().should('have.class', 'reserved');
  });
}); 