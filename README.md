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
You can now run your Cypress tests in BrowserStack using our `browserstack-cypress-cli`. BrowserStack currently supports Cypress 4 and you can start testing on the following browser combinations:


|       Windows 10    |      OS X Mojave      |    OS X Catalina    |
|:---------------------:|:---------------------:|:--------------------:|
| Chrome 66.0 to 79.0 |   Chrome 66.0 to 79.0 | Chrome 66.0 to 79.0 |
|     Edge 80.0       |       Edge 80.0       |      Edge 80.0      |
| Firefox 60.0 to 72.0|  Firefox 60.0 to 72.0 | Firefox 60.0 to 72.0|


We are actively working on supporting other browsers and will start adding other browsers to this list.

## Using BrowserStack-Cypress CLI:


### Installing browserstack-cypress
```bash
# Install cypress (ignore if already done)
$ npm install -g cypress@4.0.2

# Install the BrowserStack Cypress CLI
$ npm install -g browserstack-cypress-cli
```

### Configuring your tests
```bash
# create a sample configuration file for configurations and capabilities
$ browserstack-cypress init
```

This will create a sample `browserstack.json` file. This file can be used to configure your test runs on BrowserStack. Below is the sample file that is generated for your reference.

```json
{
    "auth": {
      "username": "<your-browserstack-username>",
      "access_key": "<your-browserstack-access-key>"
    },
    "browsers": [
      {
        "browser": "chrome",
        "os": "OS X Catalina",
        "versions": ["69","66"]
      }
    ],
    "run_settings": {
      "cypress_proj_dir": "/path/to/directory-that-contains-<cypress.json>-file",
      "project": "my first project",
      "customBuildName": "build 1"
    },
    "connection_settings": {
      "local": false,
      "localIdentifier": ""
    }
}
```

The following table provides a reference for all the options that can be provided in `browserstack.json` shown above.


| Option          | Description                                                                                                                                 | Possible values                                                                                                               |
|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| `username`        | This is your BrowserStack username. You can find this in your [Automate dashboard](https://automate.browserstack.com/) | -                                                                                                                             |
| `access_key`      | This is your BrowserStack access key. You can find this in your [Automate dashboard](https://automate.browserstack.com/) | -                                                                                                                             |
| `os` <br/> (_case-sensitive_)              | The operating system on which you want to run your test.                                                                                    | `OS X Mojave`, <br/> `OS X Catalina`, and <br/> `Windows 10`                                       |
| `browser` <br/> (case-sensitive)         | The browser on which you want to run your tests.                                                                                         | `chrome`, <br/> `firefox`, and <br/> `edge`                                   |
| `versions`        | A list of browser versions that you want to run your tests on. <br/><br/> **Example:** To run on versions 69, 67 and 65 provide `["69", "67", "65"]`                                                                              | Right now edge 80 and all chrome versions from 66 to 78 are supported |
| `specs` <br/> (_deprecated_)           | This param is deprecated in favour of a more complete `cypress_proj_dir` param. The path to the spec files that need to be run on BrowserStack                                                                              | Takes a list of strings that point to location of the spec files                                                              |
| `cypress_proj_dir`           | Path to the folder which contains `cypress.json` file. This path will be considered as the root path of the project.                                                                           |-                                                               |
| `project`         | Name of your project. This will be displayed in your Automate dashboard, and you'll be able to search & filter your tests based on the project name.                                                                                                                         | A string providing the name of the project                                                                                    |
| `customBuildName` | Helps in providing a custom name for the build. This will be displayed in your Automate dashboard, and you'll be able to search & filter your tests based on the build name.                                                                                              | A string providing the name of the build                                                                                      |
| `local`           | Helps in testing websites that cannot be accessed in public network. If you set this to `true`, please download the Local binary and establish a local connection first (you can learn how to do so [here](https://www.browserstack.com/local-testing/automate#command-line))                                                                       | Boolean: `true` / `false`. Set this to `true` if you need to test a local website. Set this to `false` if the website is accessible publicly.              |
| `localIdentifier`           |  Configure the test script to run through a specific connection. To do so, set the value of localIdentifier capability to be a unique connection name.                                                                       | Set this when `local` is set to `true`.              |

### Running the tests
You can start running your test build using the following command.

```bash
$ browserstack-cypress run
```

Sample output :

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
[2/20/2020, 2:58:34 PM]  Success
[2/20/2020, 2:58:36 PM]  Build created with build id: 06f28ce423d10314b32e98bb6f68e10b0d02a49a
[2/20/2020, 2:58:36 PM]  File deleted successfully.
```

### Getting build information
In case you want to get information on the build you can use the following command

```bash
browserstack-cypress build-info <buildId>
```

Example

```bash
browserstack-cypress build-info 06f28ce423d10314b32e98bb6f68e10b0d02a49a
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

**Note:** Each browser version represents a session. It is advised to validate your account's parallel limit before running multiple versions.

### Stopping a running build
In case you want to stop a running build, you can use the following command

```bash
browserstack-cypress build-stop <buildId>
```

Example

```bash
browserstack-cypress build-stop 06f28ce423d10314b32e98bb6f68e10b0d02a49a
```

Output:

```bash
[3/24/2020, 2:31:11 PM]  Stopping build with given buildId 06f28ce423d10314b32e98bb6f68e10b0d02a49a
[3/24/2020, 2:31:12 PM]  Reading config from /browserstack.json
[3/24/2020, 2:31:14 PM]  {
  "message": "stopped 1 sessions",
  "stopped_session_count": 1
}
```

### Limitations

- `exec` and `task` are not allowed.
- While using local, please make sure to create `/etc/hosts` entry pointing to some URL, and use that URL in the tests. The `localhost` URI doesn't work at the moment.
- Installing custom npm packages are not supported at this moment.

# Accessing test results

You can access your test results in [BrowserStack Automate dashboard](https://automate.browserstack.com/). The dashboard provides test details along with video, console logs and screenshots to help you debug any issues.

# License

This project is released under MIT License. Please refer the [LICENSE.md](LICENSE.md) for more details.
