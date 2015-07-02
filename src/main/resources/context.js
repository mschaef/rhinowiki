
var Context = {
  root: { },

  renderUnrenderable: function(target)
  {
    logInfo("Rendering as unrenderable.");

    return {
      mimeType: "text/plain",
      content: "No render handler for path: " + target.path
    };
  },

  objToJSON:function(obj)
  {
    return {
      mimeType: "text/plain",
      content: localDataToJSON(obj)
    };
  },

  renderJSON: function(target)
  {
    logInfo("Rendering as JSON.");

    return this.objToJSON(target.obj);
  },

  renderKeys: function(target)
  {
    logInfo("Rendering as JSON.");

    return this.objToJSON(target.obj.localDataKeys());
  },

  render: function(target)
  {
    var obj;

    // TODO: obj isn't in the target only if the incoming URL is a directory request,
    // rather than a leaf request (ie: "/points/" instead of "/points"). Add fixup
    // logic to catch this case and allow special handling.
    if (!("obj" in target))
      obj = target.parent;
    else
      obj = target.obj;

    // TODO: Format dispatch should be table driven in some way.
    // TODO: rendering logic is now split between the context and the object (ctx renders JSON, obj renders HTML). Figure
    // out a way to allow both to participate in all formats.

    if (target.format == 'json')
      return this.renderJSON(target);

    if (target.format == 'keys')
      return this.renderKeys(target);

    if ("_render" in obj)
      {
        logInfo("Rendering in object style.");

        return obj._render(target.postData);
      }

   return  this.renderUnrenderable(target);
  },

  post: function(target)
  {
    var obj;

    // TODO: obj isn't in the target only if the incoming URL is a directory request,
    // rather than a leaf request (ie: "/points/" instead of "/points"). Add fixup
    // logic to catch this case and allow special handling.
    if (!("obj" in target))
      obj = target.parent;
    else
      obj = target.obj;


    if ("_post" in obj)
      {
        logInfo("handling post - delegated");
        obj._post(target);
      }
    else
      logWarn("no post handler in " + obj);

    return this.render(target);
  },

  resolvePath: function(pathText)
  {
    var ii;
    var obj = this.root;
    var temp;
    var parent;

    path = pathText.parseAsPath();

    for(ii = 0; ii < path.path.length; ii++)
    {
      parent = obj;
      obj = obj.getElem(path.path[ii]);

      if (obj == null)
      {
        if (ii == path.path.length - 1)
          break;

        return null;
      }
    }

    var target = {
      path: pathText,
      parent: parent,
      objName: path.objectName,
      format: path.format
    };

    if ((obj !== null) && (obj !== undefined))
    {
      target.obj = obj;

      if ((obj._isContainer) && (path.format === null))
        target.redirectTo = pathText + "/";
    }

    return target;
  }
};

UT.addTestFile("context-unit-tests.js");