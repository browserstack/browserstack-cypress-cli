'use strict';
const chai = require('chai');
const expect = chai.expect;

const MyReporter = require('../../../../bin/testObservability/reporter');

// SDK-7389: per-test tags set via it()/describe() config must reach the TestRun events.
describe('testObservability reporter tags', () => {
  const tags = (test) => MyReporter.prototype.tags.call({}, test);

  it('collects suite and test level tags from the resolved test config', () => {
    const test = {
      _testConfig: {
        testConfigList: [
          { overrideLevel: 'suite', overrides: { tags: ['@suite_tag'] } },
          { overrideLevel: 'test', overrides: { tags: ['@test_tag'], retries: 1 } }
        ],
        unverifiedTestConfig: { tags: ['@test_tag'], retries: 1 }
      }
    };
    expect(tags(test)).to.deep.equal(['@suite_tag', '@test_tag']);
  });

  it('accepts a single string tag', () => {
    const test = { _testConfig: { testConfigList: [{ overrides: { tags: '@smoke' } }] } };
    expect(tags(test)).to.deep.equal(['@smoke']);
  });

  it('reads the raw overrides object sent by older Cypress versions', () => {
    expect(tags({ _testConfig: { tags: ['@a', '@b'] } })).to.deep.equal(['@a', '@b']);
  });

  it('trims, de-duplicates and drops non-string or empty tags', () => {
    const test = { _testConfig: { testConfigList: [{ overrides: { tags: [' @a ', '@a', 5, null, '', '  '] } }] } };
    expect(tags(test)).to.deep.equal(['@a']);
  });

  it('returns an empty list when the test has no tags', () => {
    expect(tags({})).to.deep.equal([]);
    expect(tags(undefined)).to.deep.equal([]);
    expect(tags({ _testConfig: { testConfigList: [{ overrides: { retries: 2 } }, null] } })).to.deep.equal([]);
  });
});
