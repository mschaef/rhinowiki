with(root.defects) {
  _addDefect({
    summary: "HTTP headers fetched, even when debug logging is off.",
    description: "There's a `logHeaders` method that dumps incoming headers into a log4j for debugging purposes. This method should guard itself with the log level so that it doesn't go to the trouble of pulling headers all the time (even when logging is off).",
    category: "performance"
  });

  _addDefect({
    summary: "Error handling redirect does not pass error context information to the error page",
    description: "All `_error` currently does it report that an error has happened. It doesn't contain any kind of details or useful text. We need to pass in context information to the page so that we can develop a better error handling template that actually contains some detail.",
    category: "feature"
  });

  _addDefect({
    summary: "Faults in the error page result in infinitely recursive redirects",
    description: "If anything fails in `_error`, it redirects back to `_error` and (likely) fails again. This results in an infinite series of redirects. Need to add a 'last chance' error handler to deal with failures in `_error` itself.",
    category: "defect",
    priority: "medium"
  });

  _addDefect({
    summary: "Static content handler responds with 404 not found even if permissions denied.",
    description: "Bad return code for the case when the server can't access a static file.",
    category: "standards"
  });

  _addDefect({
    summary: "Format dispatch hardcoded in context.",
    description: "This is probably very related to @/defects/5 and @/defects/6. Currently, the logic that determines how a JSON object gets served back to the requestor is very hard coded and fixed. This, in general, needs to change. I'd like to see some kind of table driven approach that lets the object and its context somehow negiotiate how the objects gets served back to the client. This should also include @/defects/12 support for binary object rendering.",
    category: "feature"
  });

  _addDefect({
    summary: "No way for objects to override JSON rendering.",
    description: "See @/defects/4. The code path that renders objects to JSON for the client is entiely contained in the context and unadvised by the target object. Target objects need some kind of way to manage this process, at least controlling the fields that get rendered. This may be as simple as allowing target objects to specify a @/wiki/Json2 replacer function (which might have to be wrapped in the default context's replacer function.",
    category: "feature"
  });

  _addDefect({
    summary: "No way for context to override HTML rendering.",
    description: "I'm not sure how important this is... currently objects render themselves as complete HTML pages. This implies that you can see one object per page, and you cannot easily combine multiple objects on the same page. (Actually, I think you can to a limited extent with @/wiki/SyntheticObjects, but that has its own set of problems.) Anyway, this is about letting contexts have more control over the rendering of their contained objects. This means Converting objects so that they can render fragments of an HTML page (@/defects/13), Adding a full page template to the context (@/defects/14), and possibly adding support to @/wiki/ResigTemplates for including objects. (@/defects/15).",
    category: "feature"
  });

  _addDefect({
    summary: "Documents are rendered even for HEAD HTTP requests.",
    description: "`HEAD` is supposed to pull back just the header, so we don't need to render the objects themselves to respond. However, we currently render the object on all `GET` or `HEAD` requests, which is a bit wasteful",
    priority: "medium",
    category: "performance"
  });

  _addDefect({
    summary: "Object.prototype.keys does not use forAllKeys",
    description: "Related to @/defects/9. The keys method is implemented with explicit iteration rather than our new higher order function.",
    category: "refactor"
  });

  _addDefect({
    summary: "Object.prototype.localKeys does not use forLocalKeys",
    description: "Related to @/defects/8. The localKeys method is implemented with explicit iteration rather than our new higher order function.",
    category: "refactor"
  });

  _addDefect({
    summary: "No object persistance.",
    description: "There's no current approach for persisting wiki changes to disk, so we lose all changes when the server restarts. This is a tricky problem to solve, but there are a couple interesting approaches that can be taken. See @/wiki/Persistance for more details. (*The interim approach is to store seed data in text files, depending on the type of data.*)",
    priority: "high",
    category: "operability"
  });

  _addDefect({
    summary: "Objects not rendered with any kind of cache control headers.",
    description: "Objects ought to handle HTTP caching better. I'm not sure of the approach to take, but a simple-minded thing to do is just to require all clients to reload everything all the time. That might be workable in what I'd assume to be the typical low-load scenarios.",
    priority: "medium",
    category: "performance"
  });

  _addDefect({
    summary: "No binary/image rendering path.",
    description: "There should really be a way for an object to render itself as a binary object, including an image.",
    category: "feature"
  });

  _addDefect({
    summary: "Add support for rendering objects as fragments of HTML rather than full pages.",
    description: "Objects that can produce HTML always produce full pages (including `<HTML>` and `<BODY>`). This implies that they cannot co-exist on the same page. To fix this, we need to add an approach for rendering objects as fragments of HTML, possibly in addition to full page HTML and possibly replacing full page HTML. Currently, it's the @/defects list that pulls out fields from defects to form the defect list view. What I really want is for the defect list to traverse the list of defects and ask each for a fragment of HTML that represents it in 'tabular' form.",
    category: "feature"
  });

  _addDefect({
    summary: "Add a full page HTML rendering template to contexts",
    description: "If objects can render themselves as fragments of an HTML page, it may make the most sense to have the context provide the page itself.",
    category: "feature"
  });

  _addDefect({
    summary: "Add include support to Resig templates",
    description: "Add an `@@...` syntax that embeds the target object in the current template. This is more of an include than a hyperlink.",
    category: "feature"
  });

  _addDefect({
    summary: "Defect list query/sort.",
    description: "Add the ability to sort and query the defect list. Possibly with @/wiki/JLinq.",
    category: "feature"
  });

  _addDefect({
    summary: "Resig templates cannot contain apostrophes.",
    description: "Resig templates work by coverting the template to JavaScript code, and something about that process fails when there's an apostrophe in the template.",
    category: "defect"
  });

  _addDefect({
    summary: "Defect list 'new defect' controls appear uncentered in their columns.",
    description: "",
    category: "appearance"
  });

  _addDefect({
    summary: "It's possible to enter an unreferencable wiki page name.",
    description: "The wiki page entry form and editor make it possible to submit a page name that includes spaces. However, our template engine doesn't have a way to specify page links that contain spaces, so pages with these names are unreferencable.",
    category: "defect",
    priority: "medium"
  });

  _addDefect({
    summary: "Missing wiki pages dump you to the wiki toplevel without any notice.",
    description: "If you refer to a wiki page that doesn't exist, it dumps you to the top level, and there isn't any kind of indication why. It should really take you to a page to let you create the missing page.",
    category: "defect",
    priority: "high"
  });

  _addDefect({
    summary: "Errors in launch scripts do not abort server startup.",
    description: "If a launch script fails, the server just keeps on starting up, leading to a potentially invalid or incomplete state. If a startup script fails, the whole thing should fail to start.",
    category: "defect",
    priority: "low"
  });
};