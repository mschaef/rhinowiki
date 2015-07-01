

var point = {
  _template: readres("point.tmpl")
};

function Point(pd)
{
  this.x = pd.x;
  this.y = pd.y;
};
Point.prototype = point;


root.points = {
  _isContainer: true,

  _post: function(target)
  {
    var postData = target.postData;

    if (!("name" in postData))
      postData.name = this.genkey();

    this[postData.name] = new Point(postData);
  },

  _template: readres("points.tmpl")
};
