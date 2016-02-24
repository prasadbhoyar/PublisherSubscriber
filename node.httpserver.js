/**
 * @summary A simple node http server
 * @description A simple node http server which hosts the Socket.IO server and a bunch a REST services 
 * used for pushing notifications to connected clients using Socket.IO and for reporting server health status.
 * @file node.httpserver.js
 * @version 1.0 
 * External Dependencies: express, socket.io, body-parser, config, and http server
 * Internal Dependencies: node.socketiohandler, node.logger
 */

/**
 * Express is a node.js web application framework
 * @external "express"
 * @see {@link http://expressjs.com/} for more information
 */
var express = require("express");
/**
 * Node.js middleware that provides parsers for processing incoming HTTP requests.
 * JSON and URL-encoded body parsers have been used in this application.
 * @external "body-parser"
 * @see {@link https://github.com/expressjs/body-parser} for more information
 */
var bodyParser = require("body-parser");
/**
 * Node.js module for externalizing and managing environment specific config settings
 * @external "config"
 * @see {@link https://github.com/lorenwest/node-config} for more information
 */
var config = require("config");
/**
 * Application module for handling node process events
 */
var pHandler = require("./node.processhandler.js");
pHandler.processCleanup();
/**
 * Application module for wrapping all Socket.IO related functionalities
 */
var socket = require("./node.socketiohandler.js");
/**
 * Application module for logging messages
 */
var logger = require("./node.logger.js");
/** Initialize express webserver and create a new router object to used later for configure routing behaviours*/
var app = express();	
var router = express.Router();  
/**
 * Node.js http server
 * @external "http"
 * @see {@link https://nodejs.org/api/http.html#http_http} for more information
 */
var server = require("http").createServer(app);

/**
 * Socket.IO is a node.js real-time bidirectional event based communication framework
 * @external "socket.io"
 * @see {@link http://socket.io/} for more information
 */
var io = require("socket.io")(server);

/** Wire the application module to handle all incoming Socket.IO connection requests */
io.on("connection", socket.handleClientConnect);
/** Identify execution environment and log the environment specific host and port settings from the configuration files */
logger.write(logger.INFO, "******** Node Server Starting with Execution environment: " + process.env.NODE_ENV + " *******");
logger.write(logger.INFO, "Config: NodeServer Port: " + config.get("NodeServer.port"));
logger.write(logger.INFO, "Config: PegaServer Host: " + config.get("PegaServer.host"));
logger.write(logger.INFO, "Config: PegaServer Port: " + config.get("PegaServer.port"));
logger.write(logger.INFO, "Config: PegaServer Path: " + config.get("PegaServer.path"));
logger.write(logger.INFO, "Config: LoggerHandler Log Folder: " + config.get("LoggerHandler.logFolder"));
logger.write(logger.INFO, "Config: LoggerHandler Log Duration: " + config.get("LoggerHandler.logDuration"));
logger.write(logger.INFO, "Config: LoggerHandler Log File Count: " + config.get("LoggerHandler.logFileCount"));
logger.write(logger.INFO, "***************");
/** Begin accepting connections on the specified port */
server.listen(config.get("NodeServer.port"));
console.log("Application Started.");
logger.write(logger.INFO, "Node Server Started. Listening for connections on port: " + config.get("NodeServer.port") + "....");
/** Setup public directory for serving static content */
app.use(express.static("public"));
/** Middleware for parsing application/json */
app.use(bodyParser.json()); 
/** Middleware for parsing application/x-www-form-urlencoded */
app.use(bodyParser.urlencoded({ extended: true })); 

/** middleware to use for all requests sent to this router */
router.use(function(req, res, next) {
	//** Enable CORS */
    res.header("Access-Control-Allow-Origin", "*");
  	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  	//console.log(req.method + " " + req.url + " "  + req.path);
    next(); //** make sure we go to the next routes and don't stop here */
});

/** Router.Route returns an instance of a single route which can then be used to handle HTTP verbs */
router.route("/PushNotification")
	/**
	 * Routes HTTP GET requests to this path to the callback method that provides health-check information data for the node server
	 * @callback getCallback
	 * @param {object} req - The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
	 * @param {object} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
	 */
	.get(function(req, res) {

		/** disable caching */
		res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
		res.setHeader("Pragma", "no-cache");
		res.setHeader("Expires", "0");

		/** convert health-check data to JSON before sending in response stream */
		res.status(200).json(socket.getHealthCheckData());
	})
	/**
	 * Routes HTTP POST requests to this path to the callback method that pushes real-time notifications to clients using Socket.IO
	 * @callback postCallback
	 * @param {object} req - The req object represents the HTTP request and has properties for the request query string, parameters, body, HTTP headers, and so on.
	 * @param {object} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
	 */
	.post(function(req, res) {
	  	
	  	/** Read notification details from the request body */
	  	var notificationMsg = {

	  		sessionID:req.body.sessionID,
	  		notificationMessageType:req.body.notificationMessageType,
	  		notificationMessage:req.body.notificationMessage,
	  		notificationMessageContext:req.body.notificationMessageContext
	  	}

		res.setHeader("Content-Type", "application/json");

		var pushStatus = socket.pushNotification(notificationMsg);

		/** Use socket.io to push notification to client */
		if (pushStatus === 200){

	  		res.status(200).json({ success: "true" });
		}
		else{

			res.status(pushStatus).json({ success: "false" });
		}
	})

/**
 * Attach the route to the specified path. Attaching the route will cause the middleware function to be 
 * executed whenever the base of the requested path matches the path.
 */
app.use("/api", router);
