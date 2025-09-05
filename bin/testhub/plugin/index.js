const accessibilityPlugin = require('../../accessibility-automation/plugin/index')
const testObservabilityPlugin = require('../../testObservability/plugin')

const browserstackPlugin = (on, config) => {
  accessibilityPlugin(on, config)
  testObservabilityPlugin(on, config)
}

module.exports = browserstackPlugin
