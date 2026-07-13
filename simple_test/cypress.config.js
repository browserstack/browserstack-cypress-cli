// Cypress v10+ config — required for observability to activate on the CLI
// side (setTestObservabilityFlags at helper.js:640 gates on this file's
// extension being one of the v10+ config extensions). The CLI doesn't
// execute this config locally; it just zips and ships to the BStack
// terminal, so avoiding `require('cypress')` here keeps the local CLI
// path from failing on a missing dev-dep.
module.exports = {
  e2e: {
    defaultCommandTimeout: 2000,
    video: false,
  },
};
