const request = require('request'),
			logger = require('./logger').winstonLogger,
			utils = require('./utils'),
			config = require("./config");

exports.getInitialDetails = (bsConfig, args, rawArgs) => {
	let options = {
		url: config.getInitialDetails,
		auth: {
			username: bsConfig.auth.username,
			password: bsConfig.auth.access_key,
		},
		headers: {
			'User-Agent': utils.getUserAgent(),
		},
	};
	let responseData = {};
	return new Promise(async (resolve, reject) => {
		request.get(options, function (err, resp, data) {
			if(err) {
				logger.error(utils.formatRequest(err, resp, data));
				utils.sendUsageReport(bsConfig, args, err, Constants.messageTypes.ERROR, 'get_initial_details_failed', null, rawArgs);
				reject({});
				process.exitCode = Constants.ERROR_EXIT_CODE;
			} else {
				try {
					responseData = JSON.parse(data);
				} catch (e) {
					responseData = {};
				}
				if(resp.statusCode != 200) {
					logger.error(`Error: Get Initial Details Request failed with status code ${resp.statusCode}`);
					utils.sendUsageReport(bsConfig, args, responseData["error"], Constants.messageTypes.ERROR, 'get_initial_details_failed', null, rawArgs);
					reject({});
					process.exitCode = Constants.ERROR_EXIT_CODE;
				} else {
					resolve(responseData);
				}
			}
		});
	});
};
