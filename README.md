- [BrowserStack Cypress CLI](#browserstack-cypress-cli)
  - [Using BrowserStack-Cypress CLI:](#using-browserstack-cypress-cli)
    - [Installing browserstack-cypress](#installing-browserstack-cypress)
    - [Configuring your tests](#configuring-your-tests)
    - [Running the tests](#running-the-tests)
    - [Getting build information](#getting-build-information)
    - [Limitations](#limitations)
- [Accessing test results](#accessing-test-results)
- [License](#license)

# BrowserStack Cypress CLI
You can now run your Cypress tests in BrowserStack using our browserstack-cypress-cli. BrowserStack currently supports Cypress 4 and you can start testing on the following browser combinations.


|       Windows 10    |      OS X Mojave      |    OS X Catalina    |
|---------------------|:---------------------:|--------------------:|
| chrome 66.0 to 78.0 |   chrome 66.0 to 78.0 | chrome 66.0 to 78.0 |
|     edge 80.0       |       edge 80.0       |      edge 80.0      |


We are actively working on supporting other browsers and will start adding other browsers to this list.

## Using BrowserStack-Cypress CLI:


### Installing browserstack-cypress
```bash
# Install dependencies
$ npm install --save-dev browserstack-cypress-cli
```

### Configuring your tests
```bash
# create a sample configuration file for configurations and capabiltiies
$ browserstack-cypress init
```
This will create a sample browserstack.json file. This file can be used to configure your tests on BrowserStack. Below is the sample file that is generated for your reference.

```json
{
    "auth": {
      "username": "<username>",
      "access_key": "<access-key>"
    },
    "browsers": [
      {
        "browser": "chrome",
        "os": "OS X Catalina",
        "versions": ["69","66"]
      }
    ],
    "run_settings": {
      "specs": ["folder_path_with_files/*.js"],
      "project": "test",
      "customBuildName": "cypress build"
    },
    "connection_settings": {
      "local": false
    }
}
```

The following table provides a reference for all the options that can be provided in browserstack.json shown above.


| Option          | Description                                                                                                                                 | Possible values                                                                                                               |
|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| username        | These are the BrowserStack credentials that need to be provided to run a test on BrowserStack. You can find this in your [automate dashboard](https://automate.browserstack.com/) | -                                                                                                                             |
| access_key      | These are the BrowserStack credentials that need to be provided to run a test on BrowserStack. You can find this in your [automate dashboard](https://automate.browserstack.com/) | -                                                                                                                             |
| os (case-sensitive)              | The operating system in which you want to run your test.                                                                                    | The following three strings are supported."OS X Mojave" , "OS X Catalina", "Windows 10"                                       |
| browser (case-sensitive)         | The browser in which you want to run your tests on.                                                                                         | Right now only "chrome" and "edge" are supported. We are actively working on supporting other browsers.                                   |
| versions        | A list of browser versions that you need to run your tests on                                                                               | Example: To run on versions 69, 67 and 65 provide ["69", "67", "65"]. Right now edge 80 and all chrome versions from 66 to 78 are supported |
| specs           | The path to the spec files that need to be run on BrowserStack                                                                              | Takes a list of strings that point to location of the spec files                                                              |
| project         | Name of the project                                                                                                                         | A string providing the name of the project                                                                                    |
| customBuildName | Helps in providing a custom name for the build                                                                                              | A string providing the name of the build                                                                                      |
| local(boolean: true/false)           | Helps in testing websites that cannot be accessed in public network                                                                         | Set this to true if you need to test a local website. Set this to false if the website is accessible publically.              |

### Running the tests
You can start running your test build using the following command.

```bash
$ browserstack-cypress run
```

Output :

```bash
[2/20/2020, 2:58:31 PM]  Reading browserstack.json from /browserstack.json
[2/20/2020, 2:58:31 PM]  browserstack.json file is validated
[2/20/2020, 2:58:31 PM]  Adding  tests/*.js to zip
[2/20/2020, 2:58:34 PM]  Zip uploaded with url: bs://15f90b540b8cbc47929782f35bb7db20fe1c4709
[2/20/2020, 2:58:34 PM]  File deleted successfully
[2/20/2020, 2:58:34 PM]  Browser list: OS X Catalina-chrome69,OS X Catalina-chrome66
[2/20/2020, 2:58:34 PM]  Test suite: bs://15f90b540b8cbc47929782f35bb7db20fe1c4709
[2/20/2020, 2:58:34 PM]  Local is set to: false
[2/20/2020, 2:58:34 PM]  Build name is: cypress build
[2/20/2020, 2:58:36 PM]  Build created with build id: 06f28ce423d10314b32e98bb6f68e10b0d02a49a
```

### Getting build information
In case you want to get information on the build you can use the following command

```bash
browserstack-cypress build <buildId>
```

Example

```bash
browserstack-cypress build 06f28ce423d10314b32e98bb6f68e10b0d02a49a
```

Output:

```bash
[2/20/2020, 3:01:52 PM]  Getting information for buildId 06f28ce423d10314b32e98bb6f68e10b0d02a49a
[2/20/2020, 3:01:52 PM]  Reading browserstack.json from /browserstack.json
[2/20/2020, 3:01:54 PM]  Build info for build id:
 {
  "build_id": "06f28ce423d10314b32e98bb6f68e10b0d02a49a",
  "framework": "cypress",
  "status": "done",
  "input_capabilities": {
    "devices": [
      "OS X Catalina-chrome69",
      "OS X Catalina-chrome66"
    ],
    "testSuite": "15f90b540b8cbc47929782f35bb7db20fe1c4709",
    "customBuildName": "cypress build",
    "local": false,
    "localIdentifier": null,
    "callbackURL": null,
    "projectNotifyURL": null,
    "project": "test"
  },
  "start_time": "2020-02-20 09:28:35 UTC",
  "device_statuses": {
    "success": {
      "OS X Catalina-chrome69": "Success",
      "OS X Catalina-chrome66": "Success"
    },
    "error": {}
  },
  "test_suite_details": {
    "url": "bs://15f90b540b8cbc47929782f35bb7db20fe1c4709",
    "name": "tests.zip",
    "size": 354
  },
  "duration": "33 seconds",
  "devices": {
    "OS X Catalina-chrome69": {
      "session_id": "3b4038cbbc55d34c1b33c930f3417c7c534c25dd",
      "status": "done",
      "test_status": {
        "failed": 0,
        "success": 3,
        "queued": 0,
        "ignored": 0
      }
    },
    "OS X Catalina-chrome66": {
      "session_id": "fbda8eb5a9eeb7823a9ef7be1a42213c568197e8",
      "status": "done",
      "test_status": {
        "failed": 0,
        "success": 3,
        "queued": 0,
        "ignored": 0
      }
    }
  }
}
```

**Note** that individual version represents a session. It is advised to validate your account's parallel before running multiple versions.

### Limitations

- `exec` and `task` are not allowed.
- `baseUrl` is not supported at the moment.
- Environment variables and configuration files are not supported yet.
- While using local, please make sure to create /etc/hosts entry pointing to a URL. The `localhost` is not working at the moment.

# Accessing test results

You can access your test results in [BrowserStack Automate dashboard](https://automate.browserstack.com/). The dashboard provides test details along with video, console logs and screenshots to help you debug any issues.

# License

This project is released under MIT License. Please refer the [LICENSE.md](LICENSE.md) for more detail.
