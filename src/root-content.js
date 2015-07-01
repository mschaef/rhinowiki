
Object.prototype._render = function(postData)
{
  return {
    mimeType: "text/html",
    content: (tmpl(this._template))(this, postData)
  };
}

var root = {
  "_error" : { },

  _template: readres("root.tmpl")
};


var errorTmpl = readres("error.tmpl");
root._error._template = errorTmpl;
