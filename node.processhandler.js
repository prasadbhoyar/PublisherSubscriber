/**
 * @summary A simple wrapper for the node process object
 * @description processhandler hooks the different node process exit events and provides a callback for doing a graceful shutdown. 
 * Refer http://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits for more information
 * @file node.processhandler.js
 * @version 1.0 
 * External Dependencies: none
 * Internal Dependencies: node.logger
 *
 * Default configuration:
 *
 * If a callback is not supplied the default noOp method is bound to the cleanup event
 */


/**
 * Application module for logging messages
 */
var logger = require("./node.logger.js");

/**
 * Binds to the different node process exit events and invokes the callback for performing any cleanup actions
 * @callback processCleanupCallback
 */
function processCleanup(callback) {

  /** Attach user callback if provided else bind noOp */
  callback = callback || noOp;


  process.on("cleanup",callback);

  process.on("exit", function () {

    logger.write(logger.INFO, "Process is shutting down! Performing cleanup...");

    /** Emit cleanup event to handle the process exit gracefully */
    process.emit("cleanup");
  });

  /**
   * Bind to the "SIGINT" signal event which is trigerred on a CTRL+C 
   * @see {@link https://nodejs.org/api/process.html#process_signal_events} for more information
   */
  process.on("SIGINT", function () {

    logger.write(logger.INFO, "Process signal event 'SIGINT' trigerred!");

    process.exit(2);
  });

  /**
   * Bind to the unhandled exception event emitted when an exception bubbles all the way to the event loop 
   * @see {@link https://nodejs.org/api/process.html#process_event_uncaughtexception} for more information
   */
  process.on("uncaughtException", function(e) {

    //Only sync operations here!!!
    //Can't use logger as bunyan doesn't have a sync way of flushing logs to file
    console.error("Unhandled exception event trigerred!");
    console.error("Error: " + e);
    console.error("Error Stack: " + e.stack);

    process.exit(99);
  });
};

function noOp() {};

exports.processCleanup = processCleanup;