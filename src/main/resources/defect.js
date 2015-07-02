

var defect = {
  _template  : readres("defect.tmpl"),
  description: "",
  priority   : "low",
  category   : "generic",
  status     : "open",

  _post: function(target)
  {
    this.description = target.postData.description;
    this.priority    = target.postData.priority;
    this.category    = target.postData.category;
    this.status      = target.postData.status;
  }
};

function Defect(pd)
{
  this.name        = pd.name;
  this.summary     = pd.summary;
  this.description = pd.description;

  if ("priority" in pd) this.priority = pd.priority;
  if ("category" in pd) this.category = pd.category;
  if ("status"   in pd) this.status   = pd.status;
};
Defect.prototype = defect;


root.defects = {
  _isContainer: true,

  _addDefect: function(postData) {
    var defect;

    postData.name = this.genkey();

    defect = new Defect(postData);
    defect._parent = this;

    this[postData.name] = defect;
  },

  _post: function(target)
  {
    this._addDefect(target.postData);
  },

  _template: readres("defects.tmpl"),

  _priorities: ["low", "medium", "high", "very-high"],
  _categories: ["performance", "features", "defect", "standards", "refactor", "usability", "appearance"],
  _statuses: ["open", "in-progress", "to-test", "closed", "deferred", "re-open"]
};

load("defect-list.js");
