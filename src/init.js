
var batchMode = false; // If false, launch a REPL on startup. If true, block until a shutdown is requested.
var port      = 8088;

load("json2.js");             // The standard JSON parser implemetnation written in JavaScript
load("utils.js");             // A collection of utility functions used throughoug RW to make life easher
load("html-utils.js");        // Functions for rendering JSON->HTML
load("unit-tests.js");        // A simple unit test suite
load("repl.js");              // A REPL, implemented in JS
load("resig-templates.js");   // John Resig's templating engine, with a couple RW specific extensions
load("showdown.js");          // The Showdown implementation of Markdown, with an extension for RW hyperlinks
load("context.js");           // A 'Context', or a container for JSON objects that can be rendered to HTNL
load("js-handler.js");        // A handler for incoming HTTP requests

load("root-content.js");      // The root of the object tree presented to our clients

load("points.js");            // The implmentation of a simple list of points in 2-space (An example)
load("wiki.js");              // The wiki
load("defect.js");            // The defect tracker

load("mimetypes.js");         // A list of standard MIME types (used to initialize the static content handler)

load("user-settings.js");     // A speculative laod that lets us write a config script to override batchMode and port

/* The static content handler is used to serve up static content (files on disk)
 * On request. This loads MIME types that the handler uses to map between extensions
 * and MIME types.
 */
function loadMimeTypes(ctx)
{
  var defn;

  for(var ii = 0; ii < mimeTypes.length; ii++) {
    defn = mimeTypes[ii];

    for(var jj = 0; jj < defn.extensions.length; jj++)
      ctx.setMimeType(defn.extensions[jj], defn.mimeType);
  }
}

var wikiServer; // The primary HTTP server object
var ctx;        // The context that contains the objects that RhinoWiki presents to the outside world
var jsHandler;  // The primary HTTP reques handler for incoming requests.

/* shutDownhandler is another, much simpler, handler that attach to a specific URL. All it does
 * is listen for requests to that URL and shutdown the server if it's running in batch mode. This
 * is about as simple as an HTTP handler can get in RhinoWiki.
 */
var shutdownHandler = {
  doShutdown: function(exchange) {
    exchange.respondContent("text/plain", "RhinoWiki shutting down.");

    logInfo("Shutdown response sent to client.");

    wikiServer.signalShutdown();

    logInfo("Server shutdown request issued.");
  },

  failShutdown: function(exchange) {
    exchange.respondContent("text/plain", "RhinoWiki is running in interactive mode. It must be shut down from the REPL on the server.");
  },

  handleGET: function(exchange) {
    logInfo("Shutdown request received.");

    if (batchMode)
      this.doShutdown(exchange);
    else
      this.failShutdown(exchange);
  }
};


// Once everything is loaded, control transfers here. This is the 'main' of RW.
function run()
{
  wikiServer = new com.ectworks.rhinowiki.server.Server(port);
  ctx        = Context.clone({root: root});
  jsHandler  = JSHandler.clone({ctx: ctx});

  wikiServer.addJSDelegateContext("/", jsHandler);
  wikiServer.addJSDelegateContext("/request-shutdown", shutdownHandler);


  var staticCtx = wikiServer.addStaticContext("/static", ".");
  loadMimeTypes(staticCtx);

  wikiServer.addHandler("/show-headers", new com.ectworks.rhinowiki.handlers.HeaderDumpHandler());

  wikiServer.run();

  if (batchMode) {
    logInfo("Entering batch operation mode");
    wikiServer.waitForShutdownSignal();
    logInfo("Server shutdown request received.");
  } else {
    logInfo("Entering interactive operation mode");
    repl.run();
  }

  logInfo("Stopping server.");

  wikiServer.stop(0); // 0 means 'wait 0 seconds before quitting'... aka forcible shutdown

  logInfo("end run.");
}
