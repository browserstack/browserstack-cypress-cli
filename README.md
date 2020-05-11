# BrowserStack Cypress CLI

[![npm version](https://badge.fury.io/js/browserstack-cypress-cli.svg)](https://badge.fury.io/js/browserstack-cypress-cli)

The `browserstack-cypress-cli` is BrowserStack's command-line interface (CLI) which
allows you to run your Cypress tests on BrowserStack.

-   [Quick Start](#quick-start)
-   [Configuration Options](#configuration-options)
    -   [Authentication](#authentication)
    -   [Specify Browsers](#specify-browsers)
    -   [Configure Test Runs](#configure-test-runs)
    -   [Configure Connection Settings](#configure-connection-settings)
    -   [Disable Usage Reporting](#disable-usage-reporting)
    -   [Deprecated Options](#deprecated-options)
-   [CLI Arguments & Flags](#cli-arguments--flags)
    -   [Run the Tests](#run-the-tests)
    -   [Get the Build Information](#get-the-build-information)
    -   [Stop a Running Build](#stop-a-running-build)
-   [Limitations](#limitations)
-   [License](#license)

## Quick Start

First, install the CLI:

```bash
# Install the BrowserStack Cypress CLI
$ npm install -g browserstack-cypress-cli
```

Note that we run tests that are written using Cypress 4.0 and above. Update to
a newer version if you are using an older version of Cypress and update your
tests if required.

Next, set up your BrowserStack credentials and configure the browsers that you
want to run your tests on. Use the `init` command to generate a sample
`browserstack.json` file, or alternatively create one from scratch.

```bash
# Create a sample configuration file for configurations and capabilities
$ browserstack-cypress init
```

Fill in the `auth`, `browsers`, `run_settings` values to be able to run your
tests. Refer to the [configuration options](#configuration-options) to  learn
more about all the options you can use in `browserstack.json` and the possible
values.

Then, run your tests on BrowserStack:

```bash
$ browserstack-cypress run
```

You can access the test results on the [BrowserStack Automate dashboard](https://automate.browserstack.com/).

## Configuration Options

The `init` command will create a sample `browserstack.json` file. This file can
be used to configure your test runs on BrowserStack. Below is the sample file
that is generated for your reference.

You can also specify `--path <path-to-folder-where-you-need-init-to-run>` flag
along with the `init` command to generate `browserstack.json` file in the
specified folder.

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
      "custom_build_name": "build 1",
      "npm_dependencies": [
        "npm-package-you-need-to-run-tests-1",
        "npm-package-you-need-to-run-tests-2@1.0.0"
      ]
    },
    "connection_settings": {
      "local": false,
      "local_identifier": null
    },
    "disable_usage_reporting": "false"
}
```

Here are all the options that you can provide in the `browserstack.json`:

### Authentication

You can use the `auth` option to specify your username and access keys. You
can find them in your [Automate dashboard](https://automate.browserstack.com/)                                                                        

| Option       | Description                   | Possible values |
| ------------ | ----------------------------- | --------------- |
| `username`   | Your BrowserStack username.   | -               |
| `access_key` | Your BrowserStack access key. | -               |

Example:

```json
{
  "auth": {
    "username": "<your-browserstack-username>",
    "access_key": "<your-browserstack-access-key>"
  }
}
```

### Specify Browsers

You can use the `browsers` option to specify the list of OS, browser and browser
versions. Each browser combination should contain the following details:

| Option     | Description                                    | Possible values                                                |
| ---------- | ---------------------------------------------- | -------------------------------------------------------------- |
| `os`       | Operating system you want to run the tests on. | `Windows 10`, `OS X Mojave` and `OS X Catalina`                |
| `browser`  | Browser you want to run the tests on.          | `chrome`, `firefox` and `edge`                                 |
| `versions` | A list of supported browser versions.          | Chrome: `66` to `80` <br/>Firefox: `60` to `72`<br/>Edge: `80` |

Example:

```json
{
  "browsers": [{
      "os": "Windows 10",
      "browser": "chrome",
      "versions": ["69", "66"]
    },
    {
      "os": "OS X Mojave",
      "browser": "firefox",
      "versions": ["69", "66"]
    }
  ]
}
```

### Configure Test Runs

You can use `run_settings` option to specify the settings to run your tests on
BrowserStack.

| Option              | Description                                                                                                      | Possible values |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------- |
| `cypress_proj_dir`  | Path to the folder which contains `cypress.json` file.                                                           | -               |
| `project`           | Name of your project. You'll be able to search & filter your tests on the dashboard using this.                  | -               |
| `custom_build_name` | Name of your build / CI run. You'll be able to search & filter your tests on the dashboard using this. username. | -               |
| `npm_dependencies`  | A list  of NPM packages to be able to run your Cypress tests.                                                    | -               |

Example:

```json
{
  "run_settings": {
    "cypress_proj_dir": "/path/to/directory-that-contains-<cypress.json>-file",
    "project": "my first project",
    "custom_build_name": "build 1",
    "npm_dependencies": [
      "npm-package-you-need-to-run-tests-1",
      "npm-package-you-need-to-run-tests-2@1.0.0"
    ]
  }
}
```

### Configure Connection Settings

You can use the `connection_settings` option to specify the Local connection
settings. This helps you in testing websites that cannot be accessed on the
public network. You can download the Local Testing binary and establish a local
connection first before you run the tests (you can learn how to do so
[here](https://www.browserstack.com/local-testing/automate#command-line))

| Option             | Description                                                            | Possible values |
| ------------------ | ---------------------------------------------------------------------- | --------------- |
| `local`            | Helps in testing private web applications.                             | -               |
| `local_identifier` | The BrowserStack Local tunnel that should be used to resolve requests. | -               |

Note that the `local_identifier` is applicable only when you start a Local
binary with a local identifier. Your tests might fail if you use an invalid
local identifier. This option will be ignored if `local` option is set to
`false`.

Example:

```json
{
  "connection_settings": {
    "local": false,
    "local_identifier": null
  }
}
```

### Disable Usage Reporting

The CLI collects anonymized usage data including the command-line arguments
used, system details and errors that you get so that we can improve the way
you run your Cypress tests on BrowserStack. Usage reporting is enabled by
default - you can disable usage reporting by using the `disable_usage_reporting`
option as follows:

Example:

```json
{
  "disable_usage_reporting": "false"
}
```

### Deprecated Options

The following options are deprecated in favour of the new improved options to
make your testing better, flexible and have a consistent way of specifying
options.

| Deprecated option | New favoured option | Remarks                       |
| ----------------- | ------------------- | ----------------------------- |
| `specs`           | `cypress_proj_dir`  | Used in `run_settings`        |
| `customBuildName` | `custom_build_name` | Used in `run_settings`        |
| `localIdentifier` | `local_identifier`  | Used in `connection_settings` |

## CLI Arguments & Flags

### Run the Tests

You can start running your test build using the following command.

```bash
$ browserstack-cypress run
```

By default, the CLI uses the `browserstack.json` in the directory where the
`run` command is issued. If you need to use a different config file, or are
running from a different directory, you can use the `--cf` or the `--config-file`
option while using `run`. For example,

```bash
$ browserstack-cypress --cf <path-to-browserstack.json> run

# Or
$ browserstack-cypress --config-file <path-to-browserstack.json> run
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

### Get the Build Information

In case you want to get information on the build you can use the following
command

```bash
browserstack-cypress build-info <buildId>
```

By default, the CLI uses the `browserstack.json` in the directory where the
`build-info` command is issued. If you need to use a different config file, or
are running the command from a different directory, you can use the `--cf` or
the `--config-file` option while using `build-info`. For example,

```bash
$ browserstack-cypress --cf <path-to-browserstack.json> build-info <buildId>

# Or
$ browserstack-cypress --config-file <path-to-browserstack.json> build-info <buildId>
```

Example

```bash
browserstack-cypress build-info 06f28ce423d10314b32e98bb6f68e10b0d02a49a
```

Sample output:

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

**Note:** Each browser version represents a session. It is advised to validate
your account's parallel limit before running multiple versions.

### Stop a Running Build

In case you want to stop a running build, you can use the following command

```bash
browserstack-cypress build-stop <buildId>
```

By default, the CLI uses the `browserstack.json` in the directory where the
`build-stop` command is issued. If you need to use a different config file, or
are running the command from a different directory, you can use the `--cf` or
the `--config-file` option while using `build-stop`. For example,

```bash
$ browserstack-cypress --cf <path-to-browserstack.json> build-stop <buildId>

# Or
$ browserstack-cypress --config-file <path-to-browserstack.json> build-stop <buildId>
```

Example

```bash
browserstack-cypress build-stop 06f28ce423d10314b32e98bb6f68e10b0d02a49a
```

Sample output:

```bash
[3/24/2020, 2:31:11 PM]  Stopping build with given buildId 06f28ce423d10314b32e98bb6f68e10b0d02a49a
[3/24/2020, 2:31:12 PM]  Reading config from /browserstack.json
[3/24/2020, 2:31:14 PM]  {
  "message": "stopped 1 sessions",
  "stopped_session_count": 1
}
```

## Limitations

-   `exec` and `task` are not allowed.
-   While using local, please make sure to create `/etc/hosts` entry pointing to
    some URL, and use that URL in the tests. The `localhost` URI doesn't work at
    the moment. You can use `http://bs-local.com` instead, to replace `localhost`
-   Installing custom npm packages are not supported at this moment on macOS.

## License

This project is released under MIT License. Please refer the
[LICENSE.md](LICENSE.md) for more details.
