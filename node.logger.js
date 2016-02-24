/**
 * @summary A simple file logger module!
 * @description Wraps bunyan nodejs module for performing the log operations.
 * @file node.logger.js
 * @version 1.0 
 * External Dependencies: config, bunyan
 * Internal Dependencies: none
 *
 * Default configuration:
 * Logs to a local sub-directory named logs (the directory *must* exist on the filesystem)
 * Files roll-over every day
 * Files are retained for 3 days
 *
 * Additionally, all log messages of type "Error" are posted to a REST end-point for centralized logging.
 */


/**
 * Node.js module for externalizing and managing environment specific config settings
 * @external "config"
 * @see {@link https://github.com/lorenwest/node-config} for more information
 */
var config = require("config");

/**
 * Node.js module for logging
 * @external "bunyan"
 * @see {@link https://github.com/trentm/node-bunyan} for more information
 */
var bunyan = require('bunyan'); 

/** @constant {number} */
var INFO_LEVEL = 10;
/** @constant {number} */
var ERROR_LEVEL = 20;
/** @constant {number} */
var DEBUG_LEVEL = 30;
/** @constant {number} */
var WARN_LEVEL = 40;
/** @constant {number} */
var FATAL_LEVEL = 50;

/** @constant {string} */
var LOG_DURATION = config.get("LoggerHandler.logDuration");
/** @constant {string} */
var LOG_FOLDER = config.get("LoggerHandler.logFolder");
/** @constant {number} */
var LOG_FILE_COUNT = config.get("LoggerHandler.logFileCount");

var log2Console2 = false;
/** Parse command line arguments and see if logging to console is required*/
var cmdArgs = process.argv.slice(2); /** Skip the first 2 arguments as they are always present: Script interpreter and script path */

for (counter = 0; counter < cmdArgs.length; counter++) {
    if (cmdArgs[counter].trim().toUpperCase() === "LOG2CONSOLE2"){

    	log2Console2 = true;
    	break;
    }
}
/** Create an instance of the bunyan logger according to the logger configurations and use that for logging */
var logger = bunyan.createLogger({
    name: 'nodehttpserver.v1',
    serializers: {
        req: bunyan.stdSerializers.req,
        res: bunyan.stdSerializers.res
    },
	streams:[{
		level:'debug',
		type: 'rotating-file',
		period: LOG_DURATION,
		count: LOG_FILE_COUNT,
		path:LOG_FOLDER + "/debug.log"
	},{
		level:'info',
		type: 'rotating-file',
		period: LOG_DURATION,
		count: LOG_FILE_COUNT,
		path:LOG_FOLDER + "/info.log"
	},{
		level:'warn',
		type: 'rotating-file',
		period: LOG_DURATION,
		count: LOG_FILE_COUNT,
		path:LOG_FOLDER + "/warn.log"
	},{
		level:'error',
		type: 'rotating-file',
		period: LOG_DURATION,
		count: LOG_FILE_COUNT,
		path:LOG_FOLDER + "/error.log"
	},{
		level:'fatal',
		type: 'rotating-file',
		period: LOG_DURATION,
		count: LOG_FILE_COUNT,
		path:LOG_FOLDER + "/fatal.log"
	}
	]
});

/**
 * Writes the log message to the logstream
 * @param {number} LogType - The log level of the message being logged.
 * @param {string} message - The message to log to the logstream.
 */
function write(LogType, message){

	try{

		switch(LogType) {

			case INFO_LEVEL:
				if (log2Console2) console.log(message);
				logger.info(message);
				break;
			case ERROR_LEVEL:
				if (log2Console2) console.error(message);
				logger.error(message);
				/** Additionally post error messages*/
				postRequest(message);
				break;
			case DEBUG_LEVEL:
				if (log2Console2) console.log(message);
				logger.debug(message);
				break;
			case WARN_LEVEL:
				if (log2Console2) console.warn(message);
				logger.warn(message);
				break;		
			case FATAL_LEVEL:
				if (log2Console2) console.error(message);
				logger.fatal(message);
				break;		
			default:
				console.error("Unknown log type");
		} 
	}
	catch(err){

		console.error("error while saving log is ---> "+err);
	}
}

/**
 * Posts the log message to a service endpoint for centralized logging.
 * @param {string} message - The log message to post.
 */
function postRequest(message){

	var url = config.get("LoggerHandler.logServiceEndpoint");
	
	//Add code to post to the PEGA Logging endpoint
}

module.exports.write = write;
module.exports.INFO = INFO_LEVEL;
module.exports.ERROR = ERROR_LEVEL;
module.exports.DEBUG = DEBUG_LEVEL;
module.exports.WARN = WARN_LEVEL;
module.exports.FATAL = FATAL_LEVEL;
