/**
 * @summary A simple Socket.IO module!
 * @description  Utility module that provides functions related to handling Socket.IO connections for pushing bidirectional notifications using events
 * @file node.sockethandler.js
 * @version 1.0 
 * External Dependencies: config, dict, http server
 * Internal Dependencies: node.logger
 */

/**
 * Node.js module that provides javascript implementations of common collections
 * @external "collections/dict"
 * @see {@link http://www.collectionsjs.com/} for more information
 */
var dictionary = require("collections/dict");
/**
 * Node.js http server
 * @external "http"
 * @see {@link https://nodejs.org/api/http.html#http_http} for more information
 */
var http = require("http");
/**
 * Node.js module for externalizing and managing environment specific config settings
 * @external "config"
 * @see {@link https://github.com/lorenwest/node-config} for more information
 */
var config = require("config");
/**
 * Application module for logging messages
 */
var logger = require("./node.logger.js");

/**
 * Handles an incoming socket.io connection request form the client
 * @param {object} socket - The log level of the message being logged.
 */
function handleClientConnect(socket){

	/** Get the SessionID passed with the handshake data from the client */
	var sessionID = socket.handshake.query.sessionID;
	var socketID = socket.id;

	logger.write(logger.INFO, "+++ New socket connection established with Socket ID: " + socketID + " and Session ID: " + sessionID);

	/** SessionID cannot be null or empty string */
	if (sessionID && sessionID.trim()){

		/** Cache the Socket.IO connection with the SesssionID key */
		cacheConnection(sessionID, new connectionInfo(socket))

		var connectionContext = {

			sessionID:sessionID,
			socketID:socketID
		}

		logger.write(logger.INFO, "Attempting to register newly connected socket.io client");
		
		/**
		 * For every new client that establishes a connection:
		 * 1. Emit "registerClient" event to the client to request for client context information (Client Name, Agent ID, Extension, Status, Workstation IP etc.)
		 * 2. Cache the client context information returned by the client with the SessionID key
		 */
		socket.emit("registerClient", connectionContext, function(data){

			logger.write(logger.INFO, "Processing registration callback from client");

			if (typeof data != "undefined"){

				/** Confirm data match from the client before processing the client context data */
				if (data.status === 200){

					/** Cache the client context data and the Socket.IO connection with the SesssionID key */
					cacheConnection(sessionID, new connectionInfo(socket, data.clientContext));
					/** Notify new client connect event to PEGA */
					notifyClientStatus("ClientConnected", data.clientContext);
				}
				else{

					logger.write(logger.WARN, "Registration failed with status code: " + data.status);
					//force disconnect?
				}
			}
			else{

				logger.write(logger.WARN, "Registration failed as callback data is undefined");
				//force disconnect?
			}
		});
	}
	else
	{
		logger.write(logger.WARN, "Socket established with empty session id");
		//force disconnect?
	}
	
	/**
	 * Subscribe to the client disconnect event to identify client connectivity status change
	 * @callback disconnectCallback
	 */
	socket.on("disconnect", function(){
		
		logger.write(logger.INFO, "--- Socket disconnected with Socket ID: " + socketID + " and Session ID: " + sessionID);

		var connection = getCachedConnnection(sessionID);

		/** Notify client disconnect event to PEGA */
		notifyClientStatus("ClientDisconnected", connection.clientContext);

		/** Remove the cached connection data for the session id */
		removeCachedConnection(sessionID);
	});
}

/**
 * Caches client connection information in in-memory key-value collection
 * @param {object} key - The key to cache the connection information.
 * @param {object} value - The connection information being cached.
 */
function cacheConnection(key, value){

	connectedClients.set(key, value);
	logger.write(logger.INFO, "Connection cached with key: " + key + " Total clients connected: " + connectedClients.length);
}

/**
 * Removes the cached client connection information from the in-memory key-value collection
 * @param {object} key - The key to the connection information being removed from the cache
 */
function removeCachedConnection(key){

	if (connectedClients.delete(key)){

		logger.write(logger.INFO, "Connection deleted from cache with key: " + key + " Total clients connected: " + connectedClients.length);
	}
	else{

		logger.write(logger.WARN, "Connection not found to be deleted in cache for key: " + key);
	}
}

/**
 * Retrieves the cached client connection information from the in-memory key-value collection
 * @param {object} key - The key to look up the connection information from the cache
 */
function getCachedConnnection(key){

	return connectedClients.get(key);
}

/**
 * A constructor function to create data structure used to cache connection information
 * @class
 * @param {object} socket - The Socket.IO socket connection object
 * @param {object} clientContext - The client context information associated with the socket connection
 */
function connectionInfo(socket, clientContext){

	this.socket = socket;
	this.clientContext = clientContext;
}

/**
 * Pushes a notification message to the client identified by the session id
 * @param {object} msg - Data structure that contains the message information to be pushed to the client
 * @returns {Number} status - Returns push notification request processing status 
 */
function pushNotification(msg){

	logger.write(logger.INFO,"Received message to push notification to session id: " + msg.sessionID);

	numberOfNotificationsProcessed++;

	/** Retrieve the cached connection information for the session id */
	var connection = getCachedConnnection(msg.sessionID);

	if ((typeof connection != "undefined") &&
		(typeof connection.socket != "undefined")){

		/** Verify that the client is still connected before attempting to push the notification */
		if (connection.socket.connected){

			logger.write(logger.INFO, "Socket found for session id: " + msg.sessionID + " Attempting to push notification");
			/**
			 * Use the retrieved socket connection to push the notification message
			 * @callback emitCallback
			 * @param {object} data - Acknowledgement message from the client
			 */
			connection.socket.emit("notificationMessage", msg, function(data){

				logger.write(logger.INFO, "Processing notification message callback from client");

				if (typeof data != "undefined"){
					/** Client acknowledges successfully receiving the notification pushed from the server */
					if (data.status === 200){

						logger.write(logger.INFO, "Notification message push successful, received ACK from client");
					}
					else{

						logger.write(logger.ERROR, "Error while pushing notification message to client: " + data.status);
					}
				}
				else{

					logger.write(logger.ERROR, "Error while pushing notification message to client: " + data.status);
				}
			});
			/** Return success status to client if the connection could be retrieved from the cache for the given session id*/
			return 200;
		}
		else{

			logger.write(logger.ERROR, "Notification message cannot be pushed as socket is not in connected state ");

			return 500;
		}
	}
	else{

		logger.write(logger.ERROR, "Connection couldn't be received from the cache for key: " + msg.sessionID);

		return 500;
	}
}

/**
 * Notifies client socket connectivity events (connects, disconnects, reconnects etc.) to PEGA server
 * @param {string} status - Client connectivity status
 * @returns {Number} clientContext - Client connection context information (Client Name, Agent ID, Extension, Status, Workstation IP etc.)
 */
function notifyClientStatus(status, clientContext){

	if (typeof clientContext != "undefined"){

		clientContext.NotificationReason = status;

		var jsonObject = JSON.stringify(clientContext);

		logger.write(logger.INFO, "Posting client status to PEGA: " + jsonObject);

		var postheaders = {

		    "Content-Type" : "application/json",
		    "Content-Length" : Buffer.byteLength(jsonObject, "utf8")
		};

		var optionsPost = {
		    host : config.get("PegaServer.host"),
		    port : config.get("PegaServer.port"),
		    path : config.get("PegaServer.path"),
		    method : config.get("PegaServer.method"),
		    headers : postheaders
		};
		 
		var reqPost = http.request(optionsPost, function(res) {

			logger.write(logger.INFO, "Client status notified to PEGA with status: ", res.statusCode);
		 
		    res.on("data", function(d) {

				logger.write(logger.INFO, "POST result:" + d);
		    });
		});
		 
		reqPost.write(jsonObject);
		reqPost.end();

		reqPost.on("error", function(e) {

			logger.write(logger.ERROR, "*** Error notifying ClientStatus to PEGA");
		});

	}
	else{

		logger.write(logger.ERROR, "*** Error notifying client status to PEGA as clientContext is undefined");
	}
}

/**
 * Returns health-check information of the server
 * @returns {object} healthCheckInfo - Server health-check information
 */
function getHealthCheckData(){

	return {
	    totalConnectedClients: connectedClients.length,
	    notificationsPushed: numberOfNotificationsProcessed
	};	
}

var connectedClients = new dictionary();
var numberOfNotificationsProcessed = 0;


module.exports.handleClientConnect = handleClientConnect;
module.exports.pushNotification = pushNotification;
module.exports.getHealthCheckData = getHealthCheckData;