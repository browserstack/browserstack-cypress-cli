const sampleBsConfig = {
  auth: {
    username: "random-username",
    access_key: "random-access-key",
  },
  run_settings: {
    cypress_proj_dir: "random path"
  }
};

const initSampleArgs = {
  _: ["init"],
  p: false,
  path: false,
  "disable-usage-reporting": undefined,
  disableUsageReporting: undefined,
  $0: "browserstack-cypress",
};

const buildInfoSampleArgs = {
  _: ["build-info", "f3c94f7203792d03a75be3912d19354fe0961e53"],
  cf: "/browserstack.json",
  "config-file": "/browserstack.json",
  configFile: "/browserstack.json",
  "disable-usage-reporting": undefined,
  disableUsageReporting: undefined,
  $0: "browserstack-cypress",
};

const buildInfoSampleBody = {
  build_id: "random_hashed_id",
  framework: "cypress",
  status: "done",
  input_capabilities: {
    devices: ["Windows 10-chrome69", "Windows 10-chrome66"],
    testSuite: "random_test_id",
    customBuildName: "cypress build",
    local: false,
    localIdentifier: null,
    callbackURL: null,
    projectNotifyURL: null,
    project: "test",
  },
  start_time: "2020-02-20 09:28:35 UTC",
  device_statuses: {
    success: {
      "Windows 10-chrome69": "Success",
      "Windows 10-chrome66": "Success",
    },
    error: {},
  },
  test_suite_details: {
    url: "bs://random_test_id",
    name: "tests.zip",
    size: 354,
  },
  duration: "33 seconds",
  devices: {
    "Windows 10-chrome69": {
      session_id: "random_session_id_1",
      status: "done",
      test_status: {
        failed: 0,
        success: 3,
        queued: 0,
        ignored: 0,
      },
    },
    "Windows 10-chrome66": {
      session_id: "random_session_id_1",
      status: "done",
      test_status: {
        failed: 0,
        success: 3,
        queued: 0,
        ignored: 0,
      },
    },
  },
};

const buildStopSampleArgs = {
  _: ["build-stop", "f3c94f7203792d03a75be3912d19354fe0961e53"],
  cf: "/browserstack.json",
  "config-file": "/browserstack.json",
  configFile: "/browserstack.json",
  "disable-usage-reporting": undefined,
  disableUsageReporting: undefined,
  $0: "browserstack-cypress",
};

const buildStopSampleBody = {
  message: "stopped 1 sessions",
  stopped_session_count: 1,
};

const sampleCapsData = {

}

const runSampleArgs = {
  _: ["run"],
  cf: "/browserstack.json",
  "config-file": "/browserstack.json",
  configFile: "/browserstack.json",
  "disable-usage-reporting": undefined,
  p: undefined,
  "parallels": undefined,
  disableUsageReporting: undefined,
  $0: "browserstack-cypress",
};

module.exports = Object.freeze({
  sampleBsConfig,
  initSampleArgs,
  buildInfoSampleArgs,
  buildInfoSampleBody,
  buildStopSampleArgs,
  buildStopSampleBody,
  sampleCapsData,
  runSampleArgs,
});
