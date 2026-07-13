# CLI smoke-test scaffold

Minimal Cypress project used to exercise the observability build lifecycle
end-to-end from a local CLI checkout. Kept on the `local-smoke-test-scaffold`
branch because it's dev tooling, not part of any production PR.

Introduced during **OB-10135** to verify that `stopBuildUpstream` includes
`automate_build_id` on the buildStop payload. Reusable for any future change
to the o11y build-create → session → buildStop flow.

## What's tracked

- `cypress.config.js` — Cypress v10+ config (this file's extension is what
  activates observability in `setTestObservabilityFlags`; a `cypress.json`
  triggers v9 mode and disables o11y silently).
- `cypress/e2e/simple_spec.cy.js` — 4-line spec that keeps the terminal
  session valid without doing anything meaningful.
- `README.md` — this file.

## What's NOT tracked (create locally)

### `browserstack.json`

Ignored via root `.gitignore`. Create with your staging / preprod creds:

```json
{
  "auth": {
    "username": "<staging_or_preprod_user>",
    "access_key": "<staging_or_preprod_key>"
  },
  "browsers": [
    { "browser": "chrome", "os": "Windows 10", "versions": ["latest"] }
  ],
  "run_settings": {
    "cypress_proj_dir": "./",
    "cypress_config_file": "./cypress.config.js",
    "project_name": "cli-smoke",
    "build_name": "cli-verify",
    "parallels": "1",
    "testObservability": true
  },
  "connection_settings": { "local": false, "local_identifier": null },
  "disable_usage_reporting": false,
  "npm_dependencies": {
    "cypress": "latest"
  }
}
```

The `npm_dependencies.cypress` entry is required — without it the BStack
terminal has no Cypress installed and 0 tests will run.

### `.env.<envname>`

Ignored via root `.gitignore`'s `.env.*` pattern. Example for `preprod`:

```
APP_ENV=preprod
UPLOAD_URL=https://api-cloud-preprod.bsstag.com/automate-frameworks/cypress/upload
RAILS_HOST=https://api-preprod.bsstag.com
DASHBOARD_URL=https://automate-preprod.bsstag.com/dashboard/v2/builds/
USAGE_REPORTING_URL=http://127.0.0.1:8000/send_event_cy_internal
```

For `k8s` (default staging), use `api-cloud-k8s`, `apik8s`, `automate-k8s`
(no hyphens — see the [Confluence setup guide](https://browserstack.atlassian.net/wiki/spaces/ENG/pages/1871218517/)).

## Running

From the CLI repo root:

```bash
nvm use 22  # or whatever the CLI supports
npm install
npm link    # makes `browserstack-cypress` point at your local checkout
```

From this directory (`simple_test/`):

```bash
BSTACK_CYPRESS_NODE_ENV=preprod browserstack-cypress run
```

## Verifying a specific CLI change

The typical flow for smoke-testing an in-progress CLI change:

1. Add temporary `console.log('[DEBUG XYZ] ...')` calls to whatever code
   path you're changing (e.g. `bin/testObservability/helper/helper.js` for
   observability endpoints).
2. Run the smoke as above.
3. Grep the CLI output for your debug tag.
4. **Revert the temporary logs** before committing — the productive
   code should stay comment-light.

## Observability endpoint override

The o11y collector URL is hardcoded in
`bin/testObservability/helper/constants.js:API_URL` (production). To run
against a staging collector, temporarily edit that file (e.g. to
`https://collector-observability-preprod.bsstag.com`) and revert before
committing.

## Notes

- Preprod / bsstag URLs require VPN.
- Test suite uploads consume paid terminal minutes on non-prod BStack —
  keep the spec minimal.
- The Confluence [Cypress FAQs](https://browserstack.atlassian.net/wiki/spaces/ENG/pages/3148087393/)
  and [Cypress CLI ops book](https://browserstack.atlassian.net/wiki/spaces/ENG/pages/3270246476/)
  are the authoritative operator refs.
