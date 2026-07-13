// OB-10135 CLI smoke — minimal Cypress spec (v10+ format) to exercise the
// observability build lifecycle. We only care about the CLI's buildStop
// payload including automate_build_id; the assertion below is the smallest
// cypress-native surface that keeps the terminal session valid.
describe('OB-10135 CLI smoke', () => {
  it('minimal spec to trigger buildStop', () => {
    cy.visit('https://example.cypress.io');
    cy.contains('type').should('exist');
  });
});
