

function __get_global_environment() {
  return (function (){ return this; }).call(null);
}


function error(msg)
{
  var args = [];

  for(var ii = 1; ii < arguments.length; ii++)
    args.push(arguments[ii]);

  logError(msg + ": " + args);

  throw {
    error: msg,
    args: args
  };
}

function undefinedp(obj)
{
  return (typeof obj) === 'undefined';
}

function ensureType(obj, typeName)
{
  var actualType = typeof obj;

  if (actualType !== typeName)
    error("Expected type " + typeName + ", and got type " + actualType, obj);
}

function nativep(obj)
{
  return ((typeof obj) === 'object') && ("getClass" in obj) && new String(obj.getClass().getName());
}

Object.prototype.keys = function() {  // TODO: Rewrite with forAllKeys
  var keys = [];

  for(var key in this)
    keys.push(key);

  return keys;
}

Object.prototype.localKeys = function() { // TODO: Rewrite with forLocalKeys
  var keys = [];

  for(var key in this)
    if (this.hasOwnProperty(key))
        keys.push(key);

  return keys;
}

Object.prototype._init = function ()
{
}

Object.prototype.create = function (o,args)
{
  function F(args)
  {
    if (!undefinedp(args))
    {
      for(var key in args)
        if (args.hasOwnProperty(key))
          this[key] = args[key];
    }

    this._init();
  }

  F.prototype = o;
  return new F(args);
};

Object.prototype.clone = function(args)
{
  return this.create(this, args);
}

Object.prototype.findObject = function(obj)
{
  for(var key in this)
    if (this.hasOwnProperty(key) && (this[key] === obj))
      return key;

  return null; // REVISIT: Should this be 'undefined'?
}

Object.prototype.genkey = function()
{
  if (!("__next_genkey" in this))
    this.__next_genkey = 0;

  while(true) {
    if (!(this.__next_genkey in this))
      return this.__next_genkey;

    this.__next_genkey++;
  }

  return 0;
}

Object.prototype.forAllKeys = function(fn)
{
  var key;

  for(key in this)
    fn(key);
}

Object.prototype.forLocalKeys = function(fn)
{
  var that = this;

  that.forAllKeys(function(key) {
                    if (that.hasOwnProperty(key))
                      fn(key);
                  });
}

function localDataKeyP(key)
{
  return ((typeof key) !== 'string') || (key.charAt(0) !== '_');
};

Object.prototype.forLocalDataKeys = function(fn)
{
  var that = this;

  this.forLocalKeys(function(key) {
                      if (localDataKeyP(key))
                        fn(key);
                    });
}

Object.prototype.localDataKeys = function(fn)
{
  var keys = [];

  this.forLocalDataKeys(function(key) {
                          keys.push(key);
                        });

  return keys;
}

function localDataToJSON(obj, prettyPrint)
{
  prettyPrint = prettyPrint || false;

  return JSON.stringify(obj,
                        function(k,v) {
                          if (!localDataKeyP(k))
                            return undefined;

                          return v;
                        },
                        prettyPrint ? '  ' : null);
}

Array.prototype.first    = function() { return this[0];               };
Array.prototype.last     = function() { return this[this.length - 1]; };
Array.prototype.butfirst = function() { return this.slice(1);         };
Array.prototype.butlast  = function() { return this.slice(0, -1);     };

Array.prototype.forEachValue = function(fn)
{
  for(var ii = 0; ii < this.length; ii++)
    fn(this[ii]);
}

String.prototype.getBytes = function() {
  return (new java.lang.String(this)).getBytes();
}

String.prototype.parseAsPath = function()
{
  var pathSegs = this.split("/");
  var isAbsolute = (pathSegs.first() === '');
  var isObjectReference = (pathSegs.last() !== '');
  var name;

  var parsed =  {
    pathText: this,
    isAbsolute: isAbsolute,
    path: isAbsolute ? pathSegs.butfirst() : pathSegs
  };

  if (isObjectReference) {
    name = parsed.path.last().split(".");

    parsed.objectName = name[0];
    parsed.format =  (name[1] || null);

    parsed.path[parsed.path.length - 1] = parsed.objectName;
  };

  return parsed;
}

// ""
// "/"
// "/foo"
// "/foo.bar"
// "/foo.bar/baz"
// "foo/bar"
// "/foo/bar"
// "foo/bar.json"
// "/foo/bar.json"
// "/1/2/3/4"
// "/1/2/3/4/"
// "1/2/3/4"
// "1/2/3/4/"

Object.prototype._getUndefinedElement = function(key)      { return null; }
Object.prototype._setUndefinedElement = function(key, val) { this[key] = val; return val; }

Object.prototype.getElem = function(key)
{
  if (key in this)
    return this[key];

  return this._getUndefinedElement(key);
}

Object.prototype.setElem = function(key, val)
{
  if (key in this)
    this[key] = val;

  return this._setUndefinedElement(key, val);
}

Object.prototype._isContainer = false;

