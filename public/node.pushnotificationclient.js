/**
 * @summary A simple notification client for processing bidirectional push notification messages
 * @description The client provides a bunch of event handlers for consumers to subscribe and introspect connection state changes and for processing 
 * notification messages pushed from the server.
 * @file node.pushnotificationclient.js
 * @version 1.0 
 * External Dependencies: jquery, socket.io
 * Internal Dependencies: none
 */
var pushNotificationClient = (function ($) {
    /**
     * Creates a new pushNotificationClient
     * @class
     * @param {object} options - Override default config params
     */
    function pushNotificationClient(options) {

        /** Override the default options with the one explicitly passed */
        this.options = $.extend({}, this.defaults, options);
    }

    pushNotificationClient.prototype = {

        /** Default values for the config params */
        defaults: {
            /** Push notification server endpoint */
            socketEndpoint: "http://10.60.182.101:3100",
            /** Socket.IO Namespace to use */
            namespace: "default",
            /** Socket.IO Channel to join */
            roomName: "default",
            /** Client session globally unique identifier */
            sessionID:"",
            /** Client connection context information to be shared with the server once connection is established */
            clientContext:{}
        },

        /**
         * Establishes a connection with the notification server using socket.io client
         */
        connect: function () {
        
            this._connect();
        },
		
        /**
         * Attaches a callback to be executed when the notification server connection is established
         * @param {connectedhandler} handler - The callback that handles the connected event
         */
        connected: function (handler) {
            this._addEventHandler("connected", handler);
        },
        /**
         * Attaches a callback to be executed when the notification server connection is disconnected
         * @param {disconnectedhandler} handler - The callback that handles the disconnected event
         */
        disconnected: function (handler) {
            this._addEventHandler("disconnected", handler);
        },
        /**
         * Attaches a callback to be executed when a connection error is trigerred
         * @param {errorhandler} handler - The callback that handles the connection error event
         */
        error: function (handler) {
            this._addEventHandler("error", handler);
        },
        /**
         * Attaches a callback to be executed when a reconnection is being attempted
         * @param {reconnectAttempthandler} handler - The callback that handles the reconnect attempt event
         */
        reconnectAttempt: function (handler) {
            this._addEventHandler("reconnect_attempt", handler);
        },
        /**
         * Attaches a callback to be executed while reconnecting with notification server
         * @param {reconnectinghandler} handler - The callback that handles the reconnecting event
         */
        reconnecting: function (handler) {
            this._addEventHandler("reconnecting", handler);
        },
        /**
         * Attaches a callback to be executed after a successful reconnection to the notification server
         * @param {reconnecthandler} handler - The callback that handles the reconnect event
         */
        reconnect: function (handler) {
            this._addEventHandler("reconnect", handler);
        },
        /**
         * Attaches a callback to be executed upon a reconnection attempt error
         * @param {reconnectErrorhandler} handler - The callback that handles the reconnect error event
         */
        reconnectError: function (handler) {
            this._addEventHandler("reconnect_error", handler);
        },
        /**
         * Attaches a callback to be executed after all reconnection attempts have failed
         * @param {reconnectFailedhandler} handler - The callback that handles the reconnect failed event
         */
        reconnectFailed: function (handler) {
            this._addEventHandler("reconnect_failed", handler);
        },
        /**
         * Attaches a callback to be executed whenever a notification message is received from the server
         * @param {notificationMessagehandler} handler - The callback that handles the notification message received from the server
         */
        notificationMessage: function (handler) {
            this._addEventHandler("notificationMessage", handler);
        },
        /**
         * Attempts to establish a connection with the notification server using socket.io client
         */
        _connect: function () {

            console.log("Attempting to connect to Socket.IO server on endpoint: ", this.options.socketEndpoint);
            /** Pass the client supplied unique session identifier as part of the initial handshake data */
            this.socketConnection = io.connect(this.options.socketEndpoint, {query:"sessionID="+this.options.sessionID});
            /** Wire up all the socket.io event handlers */
            this.socketConnection.on("connect", $.proxy(this._onConnected, this));
            this.socketConnection.on("disconnect", $.proxy(this._onDisconnected, this));
            this.socketConnection.on("error", $.proxy(this._onError, this));
            this.socketConnection.on("reconnect_attempt", $.proxy(this._onReconnectAttempt, this));
            this.socketConnection.on("reconnecting", $.proxy(this._onReconnecting, this));
            this.socketConnection.on("reconnect", $.proxy(this._onReconnect, this));
            this.socketConnection.on("reconnect_error", $.proxy(this._onReconnectError, this));
            this.socketConnection.on("reconnect_failed", $.proxy(this._onReconnectFailed, this));
            this.socketConnection.on("registerClient", $.proxy(this._onregisterClient, this));
            this.socketConnection.on("notificationMessage", $.proxy(this._onnotificationMessage, this));
        },

        /**
         * Registers a callback to be executed when the given event is trigerred
         * @param {string} eventName - The event name for which the callback needs to be attached
         * @param {callbackHandler} callback - The callback function to be invoked when the event is trigerred
         */
        _addEventHandler: function (eventName, callback) {

            $(this).bind(eventName, function (e, data) {
                callback.call(this, [data]);
            });

            return this;
        },
		/**
         * Removes all the registered callback handlers
         */
		removeAllEventHandlers: function(){
			$(this).unbind();
		},

        /**
         * Triggers the "connected" event handlers
         */
        _onConnected: function () {
			
            $(this).triggerHandler("connected");
        },
        /**
         * Triggers the "disconnected" event handlers
         */
        _onDisconnected: function () {
			
            $(this).triggerHandler("disconnected");
        },
        /**
         * Triggers the "error" event handlers
         */
        _onError: function (err) {
			 
            console.error("***** _onError: " + err);

            $(this).triggerHandler("error", err);
        },
        /**
         * Triggers the "reconnect_attempt" event handlers
         */
        _onReconnectAttempt: function () {
            
            $(this).triggerHandler("reconnect_attempt");
        },
        /**
         * Triggers the "reconnecting" event handlers
         */
        _onReconnecting: function (att) {
            
            $(this).triggerHandler("reconnecting", att);
        },
        /**
         * Triggers the "reconnect" event handlers
         */
        _onReconnect: function (att) {

            $(this).triggerHandler("reconnect", att);
        },
        /**
         * Triggers the "reconnect_error" event handlers
         */
        _onReconnectError: function (err) {
            
            console.error("_onReconnectError: " + err);

            $(this).triggerHandler("reconnect_error", err);
        },
        /**
         * Triggers the "reconnect_failed" event handlers
         */
        _onReconnectFailed: function () {
            
            console.error("_onReconnectFailed");

            $(this).triggerHandler("reconnect_failed");
        },
        /**
         * Handles the "registerClient" event from the notification server
         * @param {object} eventData - Client connection information supplied from the notification server
         * @param {callback} fn - The server side callback to be executed with the client connection context information
         */
        _onregisterClient: function (eventData, fn) {

            if (typeof eventData != "undefined"){

                console.log("Received register client event from server with sessionID: " + eventData.sessionID);
                /** Double-check the session id before passing the client context information */
                if (eventData.sessionID === this.options.sessionID){

                    var registerClientResp = {
                        status:200,
                        sessionID:this.options.sessionID,
                        clientContext:this.options.clientContext
                    }
                    /** Invoke the server side callback with the client context information */
                    fn(registerClientResp);
                }
                else{

                    console.log("Register client failed as session id comparison failed");

                    var registerClientResp = {

                        status:412, //Precondition failed
                        sessionID:this.options.sessionID,
                        clientContext:this.options.clientContext  
                    }

                    fn(registerClientResp);
                }
            }
            else{

                console.error("Register client failed as event data sent by the server couldn't be read");

                var registerClientResp = {

                    status:400, //Bad request
                    sessionID:this.options.sessionID,
                    clientContext:this.options.clientContext    
                }

                fn(registerClientResp);
            }
        },
        /**
         * Handles the "notificationMessage" event from the notification server
         * @param {object} eventData - The notification message pushed from the notification server
         * @param {callback} fn - The server side callback to be executed after processing the notification message
         */
        _onnotificationMessage: function (eventData, fn) {
            
           if (typeof eventData != "undefined"){

                console.log("Received push notification message from server with sessionID: " + eventData.sessionID);
                /** Double-check the session id before trigerring the "notificationMessage" event handlers */
                if (eventData.sessionID === this.options.sessionID){

                    var notificationMessageResp = {
                        status:200,
                        sessionID:this.options.sessionID
                    }
                    /** ACK notification message delivery by invoking the server side callback */
                    fn(notificationMessageResp);

                    $(this).triggerHandler("notificationMessage", eventData);
                }
                else{

                    console.log("Push notification cannot be processed as session id comparison failed");

                    var notificationMessageResp = {

                        status:412, //Precondition failed
                        sessionID:this.options.sessionID
                    }

                    fn(notificationMessageResp);
                }
            }
            else{

                console.error("Push notification message cannot be processed as event data sent by the server couldn't be read");

                var notificationMessageResp = {

                    status:400, //Bad request
                    sessionID:this.options.sessionID
                }

                fn(notificationMessageResp);
            }
        },
    };

    return pushNotificationClient;
}(jQuery));