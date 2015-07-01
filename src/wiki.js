
var wikiPage = {
  _template: readres("wikiPage.tmpl"),

  markdown: "",

  _post: function(target)
  {
    this.markdown = target.postData.markdown;
  }
};

function WikiPage(pd)
{
  this.name     = pd.name;
  this.markdown = pd.markdown;
}

WikiPage.prototype = wikiPage;

root.wiki = {
  _isContainer: true,

  _post: function(target)
  {
    var postData = target.postData;

    if (!("name" in postData))
      postData.name = this.genkey();

    this[postData.name] = new WikiPage(postData);
  },

  // TODO: Not enough time to write reasonable persistance,
  // so we'll fake it by lazily loading resources as wiki pages.
  // This doesn't preserve edits made through the web interface,
  // but I'm not sure I care for demo purposes.
  _getUndefinedElement: function(key) {
    logInfo("Attempting to laod wiki page: " + key);

    var resValue = readres(key + ".wikipage");

    if (resValue === null) {
      logError("Could not laod wiki page from disk: " + key);

      return null;
    }

    this[key] = new WikiPage({name: key, markdown: resValue});

    return this[key];
  },

  _template: readres("wiki.tmpl")
};

// Prefetch a bunch of content.

root.wiki.getElem("Introduction");
root.wiki.getElem("Javagator");
root.wiki.getElem("Json2");
root.wiki.getElem("OptimizationLevel");
root.wiki.getElem("ResumableContinuations");
root.wiki.getElem("Rhino");
root.wiki.getElem("Showdown");
root.wiki.getElem("ThirdPartyLibraries");
