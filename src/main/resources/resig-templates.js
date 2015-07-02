// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed

(function(){
  var cache = {};

   this.tmpl = function tmpl(str) {
        var fnText =
          "var p=[],print=function(){p.push.apply(p,arguments);};" +
          "with(postData) with(obj){p.push('" +
          str
            .replace(/[\r\t\n]/g, " ")
            .split("<%").join("\t")
            .replace(/((^|%>)[^\t]*)'/g, "$1\r")
            .replace(/\t=(.*?)%>/g, "',$1,'")
            .split("\t").join("');")
            .split("%>").join("p.push('")
            .split("\r").join("\\'")
      + "');}return p.join('');";

    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn = !/\W/.test(str) ?
      cache[str] = cache[str] :

      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      new Function("obj, postData", fnText);

      return fn;
  };
})();
