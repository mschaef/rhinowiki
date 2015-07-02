
Array.prototype.htmlSelect = function(name, initial)
{
  var result = "<select name=\"" + name + "\">";

  initial = initial || this[0];

  this.forEachValue(function(value) {
    result += ("<option value=\"" + value + "\"");

    if (value === initial)
      result += " selected";

    result += (">" + value + "</option>");
  });

  return result + "</select>";
}