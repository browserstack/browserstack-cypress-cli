# BrowserStack Cypress CLI - Accessibility Automation Flow Documentation

## Overview
This document provides an in-depth explanation of the Accessibility Automation flow in the BrowserStack Cypress CLI, including the complete data flow from configuration to test execution and result reporting.

## Complete Accessibility Flow

### 1. Initial Configuration & Setup (runs.js)
**Location**: `bin/commands/runs.js`

```javascript
// 1.1 Check if any browser has accessibility enabled
const checkAccessibility = checkAccessibilityPlatform(bsConfig);

// 1.2 Determine if this is an accessibility session
const isAccessibilitySession = bsConfig.run_settings.accessibility || checkAccessibility;
```

**Key Functions**:
- `checkAccessibilityPlatform()`: Scans all browsers in config to see if any have `accessibility: true`
- Decision logic: `isAccessibilitySession = global_setting OR any_browser_has_accessibility`

### 2. Platform Checking Logic (accessibility-automation/helper.js)
**Location**: `bin/accessibility-automation/helper.js`

```javascript
exports.checkAccessibilityPlatform = (user_config) => {
  let accessibility = false;
  user_config.browsers.forEach(browser => {
    if (browser.accessibility) {
      accessibility = true; // If ANY browser has accessibility, return true
    }
  });
  return accessibility;
}
```

**Critical Issue Identified**: This function returns `true` if ANY browser has accessibility enabled, but doesn't track WHICH browsers. This could be part of the platform visibility issue.

### 3. Accessibility Test Run Creation
**Location**: `bin/accessibility-automation/helper.js`

When `isAccessibilitySession && isBrowserstackInfra` is true:
```javascript
await createAccessibilityTestRun(bsConfig);
```

**Data Sent to Accessibility API**:
```javascript
const data = {
  'projectName': projectName,
  'buildName': buildName,
  'startTime': (new Date()).toISOString(),
  'description': buildDescription,
  'source': {
    frameworkName: "Cypress",
    frameworkVersion: packageVersion,
    sdkVersion: agentVersion,
    language: 'javascript',
    testFramework: 'cypress',
    testFrameworkVersion: packageVersion
  },
  'settings': accessibilityOptions,
  'versionControl': gitMetadata,
  'ciInfo': ciInfo,
  'hostInfo': {
    hostname: os.hostname(),
    platform: os.platform(),
    type: os.type(),
    version: os.version(),
    arch: os.arch()
  },
  'browserstackAutomation': process.env.BROWSERSTACK_AUTOMATION === 'true'
};
```

**Note**: The platform-specific browser configuration is NOT sent in this initial request. This is likely why the dashboard doesn't know about specific platforms initially.

### 4. Platform Capabilities Generation (capabilityHelper.js)
**Location**: `bin/helpers/capabilityHelper.js`

When `process.env.BROWSERSTACK_TEST_ACCESSIBILITY === 'true'`:

```javascript
bsConfig.run_settings["accessibility"] = true;
bsConfig.run_settings["accessibilityPlatforms"] = getAccessibilityPlatforms(bsConfig);
```

#### 4.1 getAccessibilityPlatforms Function
```javascript
const getAccessibilityPlatforms = (bsConfig) => {
  const browserList = [];
  
  // Create expanded browser list with platform identifiers
  bsConfig.browsers.forEach((element) => {
    element.versions.forEach((version) => {
      browserList.push({
        ...element, 
        version, 
        platform: element.os + "-" + element.browser
      });
    });
  });
  
  // Create accessibility flags array
  const accessibilityPlatforms = Array(browserList.length).fill(false);
  let rootLevelAccessibility = bsConfig.run_settings.accessibility === 'true';
  
  browserList.forEach((browserDetails, idx) => {
    // Per-browser accessibility OR global accessibility
    accessibilityPlatforms[idx] = (browserDetails.accessibility === undefined) 
      ? rootLevelAccessibility 
      : browserDetails.accessibility;
  });
  
  return accessibilityPlatforms; // Returns: [true, false, true, false, ...]
}
```

**Critical Analysis**: 
- This function creates a boolean array where each index corresponds to a browser/version combination
- Index 0 = First browser + first version
- Index 1 = First browser + second version  
- Index 2 = Second browser + first version
- etc.

### 5. Final Capabilities Object
The `accessibilityPlatforms` array is included in the final capabilities:

```javascript
obj.run_settings = JSON.stringify(bsConfig.run_settings);
```

Where `bsConfig.run_settings` now contains:
```javascript
{
  "accessibility": true,
  "accessibilityPlatforms": [true, false, true, false, ...] // Boolean array
}
```

### 6. Test Execution - Platform Data Flow
**Location**: `bin/accessibility-automation/cypress/index.js`

During test execution, each test sends platform data:

```javascript
const payloadToSend = {
  "saveResults": shouldScanTestForAccessibility,
  "testDetails": {
    "name": attributes.title,
    "testRunId": '5058',
    "filePath": filePath,
    "scopeList": [filePath, attributes.title]
  },
  "platform": {
    "os_name": os_data,           // Environment variable or detected
    "os_version": Cypress.env("OS_VERSION"),
    "browser_name": Cypress.browser.name,
    "browser_version": Cypress.browser.version
  }
};
```

## Identified Issues with Multi-Platform Visibility

### Issue 1: Boolean Array Mapping
The `accessibilityPlatforms` array uses indices to map to browser configurations, but there's no clear documentation of this mapping in the API payload. The dashboard might not understand which boolean corresponds to which platform.

### Issue 2: Platform Detection in Tests
The platform detection in Cypress tests uses:
```javascript
os_data = Cypress.platform === 'linux' ? 'mac' : "win"
```
This is a fallback that might not accurately reflect the intended BrowserStack platform.

### Issue 3: Missing Platform Context in Initial API Call
The initial accessibility test run creation doesn't include specific browser/platform information, only host system info.

## Potential Solutions

### Solution 1: Enhanced Platform Mapping
Instead of a boolean array, send explicit platform mappings:
```javascript
"accessibilityPlatforms": {
  "os x big sur-chrome-latest-1": true,
  "Windows 10-chrome-latest-1": true
}
```

### Solution 2: Platform-Aware Test Run Creation
Include browser platform information in the initial test run creation API call.

### Solution 3: Explicit Platform Registration
Register each platform separately with the accessibility service before test execution.

## Logging Points Added

I've added comprehensive logging at the following key points:

1. **checkAccessibilityPlatform**: Browser-by-browser accessibility checking
2. **runs.js accessibility decision**: When accessibility session is determined
3. **getAccessibilityPlatforms**: Platform list generation and boolean array creation
4. **caps function**: Final capabilities object serialization
5. **createAccessibilityTestRun**: API payload and response
6. **Cypress test execution**: Per-test platform payload

## Testing the Logging

To test with your configuration:
```json
{
  "browsers": [
    {
      "browser": "chrome",
      "os": "os x big sur", 
      "versions": ["latest - 1"]
    },
    {
      "browser": "chrome",
      "os": "Windows 10",
      "versions": ["latest - 1"]
    }
  ]
}
```

Expected `accessibilityPlatforms` array: `[true, true]` (if both have accessibility enabled)
Expected platform strings: `["os x big sur-chrome", "Windows 10-chrome"]`

## Next Steps

1. Run tests with logging enabled
2. Analyze the logged data to see exact values
3. Compare API payloads for single vs. multiple platform configs
4. Identify where the platform mapping breaks down
5. Implement appropriate fix based on findings

The comprehensive logging will help identify exactly where the platform information gets lost or incorrectly processed.
