var JSHandler = {
  ctx: { },

  beginRequest: function(exchange)
  {
    var stringPath = String(exchange.getPath());

    // 'exchange' (An instance of HttpExchange) returns a java.lang.String for
    // getPath, and not a JavaScript native string. Because of this, none of the
    // usual JavaScript string methods work, including the custom parseAsPath.
    var target = this.ctx.resolvePath(stringPath);

    if (target == null) {
      logError("Path Not Found: " + stringPath);

      exchange.respondNotFound();

      return null;
    }

    if ("redirectTo" in target) {
      logInfo("Context redirecting to: " + target.redirectTo);

      exchange.respondRedirect(target.redirectTo);

      return null;
    };

    target.postData = { };

    this.acceptURIQuery(target.postData, exchange.getQuery());

    return target;
  },

  handleReadRequest: function(exchange, headersOnlyP)
  {
    var target = this.beginRequest(exchange);
    var rendered;

    if (target === null)
      return;

    // TODO: Skip actual rendering when headersOnlyP is true. (All we need is the mimeType in that case).
    rendered = this.ctx.render(target);

    if (headersOnlyP)
      exchange.respondHeadersOnly(rendered.mimeType);
    else
      exchange.respondContent(rendered.mimeType, rendered.content);
  },

  handleHEAD: function(exchange)
  {
    this.handleReadRequest(exchange, true);
  },

  handleGET: function(exchange)
  {
    this.handleReadRequest(exchange, false);
  },

  handleDELETE: function(exchange)
  {
    var target = this.beginRequest(exchange);

    if (target === null)
      return;

    delete target.parent[target.objName];

    exchange.respondSuccess();
  },

  decodeURLText: function(str)
  {
    return String(java.net.URLDecoder.decode(str));
  },

  acceptURIQuery: function(pd, queryText)
  {
    var elem;
    var that = this;

    queryText.split("&").forEach(function(elemText) {
      elem = elemText.split("=");

      pd[elem[0]] = that.decodeURLText(elem[1]);
    });
  },

  acceptPOSTData: function(pd, exchange)
  {
    var pdStr;
    var that = this;

    var contentType = exchange.getRequestHeaders().get("content-type").toString();

    if (!contentType.equalsIgnoreCase('[application/x-www-form-urlencoded]'))
      error("Invalid POST data content type.", contentType);

    pdStr = (String(exchange.getRequestBodyAsString())).replace("\n","");

    pdStr.split("&").forEach(function(elemText) {
      var elem = elemText.split("=");

      pd[elem[0]] = that.decodeURLText(elem[1]);
    });
  },

  handlePOST: function(exchange)
  {
    var target = this.beginRequest(exchange);
    var rendered;

    if (target === null)
      return;

    this.acceptPOSTData(target.postData, exchange);

    rendered = ctx.post(target);

    exchange.respondContent(rendered.mimeType, rendered.content);
  }
}
