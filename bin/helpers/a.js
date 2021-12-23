// with proxy
let a = {
  path: 'https://api.browserstack.com/automate/cypress/v1/builds/8a4ec797f6565b72d84345bb507acd0f3a84f194/build_artifacts',
  method: 'GET',
  headers: {
    Accept: 'application/json, text/plain, */*',
    'User-Agent': 'BStack-Cypress-CLI/1.10.0 (x64/darwin/20.6.0)',
    host: 'api.browserstack.com'
  },
  agent: undefined,
  agents: { http: undefined, https: undefined },
  auth: 'roshanni_70sPLl:qN7mJW7aZ8P5Gnu1XtwX',
  hostname: 'localhost',
  port: '8889',
  host: 'localhost',
  beforeRedirect: [Function: beforeRedirect]
}
let c = {
  path: '/automate/cypress/v1/builds/8a4ec797f6565b72d84345bb507acd0f3a84f194/build_artifacts',
  method: 'GET',
  headers: {
    Accept: 'application/json, text/plain, */*',
    'User-Agent': 'BStack-Cypress-CLI/1.10.0 (x64/darwin/20.6.0)',
    host: 'api.browserstack.com'
  },
  agent: undefined,
  agents: { http: undefined, https: undefined },
  auth: 'roshanni_70sPLl:qN7mJW7aZ8P5Gnu1XtwX',
  hostname: 'localhost',
  port: '8889',
  host: 'localhost',
  beforeRedirect: [Function: beforeRedirect]
}

// without proxy
let b = {
  path: '/automate/cypress/v1/builds/8a4ec797f6565b72d84345bb507acd0f3a84f194/build_artifacts',
  method: 'GET',
  headers: {
    Accept: 'application/json, text/plain, */*',
    'User-Agent': 'BStack-Cypress-CLI/1.10.0 (x64/darwin/20.6.0)'
  },
  agent: undefined,
  agents: { http: undefined, https: undefined },
  auth: 'roshanni_70sPLl:qN7mJW7aZ8P5Gnu1XtwX',
  hostname: 'api.browserstack.com',
  port: null
}