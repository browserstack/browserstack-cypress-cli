describe('My First Test', () => {
  it('Gets, types and asserts', () => {
    cy.visit('https://example.cypress.io')

    cy.contains('type').click()

    //cy.wait(3000)
    // Should be on a new URL which includes '/commands/actions'
    cy.url().should('include', '/commands/actions')

    // Get an input, type into it and verify that the value has been updated
    cy.get('.action-email')
      .type('fake@email.com')
      .should('have.value', 'fake@email.com')
  })

  // it('the long test', () => {
  //   cy.visit('https://example.cypress.io/commands/waiting')
  //   cy.get('.wait-input1').type('Wait 1000ms after typing')
  //   cy.wait(1000)
  //   cy.get('.wait-input2').type('Wait 1000ms after typing')
  //   cy.wait(1000)
  //   cy.get('.wait-input3').type('Wait 1000ms after typing')
  //   cy.wait(1000)
  //   cy.should('.wait-input3', 'Wait 1000ms after typing')
  //
  // })
})
