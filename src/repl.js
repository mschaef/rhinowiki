
var __global_env = this;

var repl = {
  out: [],

  running: true,

  printAsJSON: false,

  prompt: "rw> ",

    // marker array to indicate no return value. The array doesn't matter, aside from its identity
  __nothing: [],

  showFullObject: function(obj) {
    this.showObject(obj, true);
  },

  showObject: function(obj, inheritedFieldsP) {
    function showKey(key) {
        var val = obj[key];

        repl.print(val, key, (typeof val === 'function'));
      }

      inheritedFieldsP = inheritedFieldsP || false;

      println("// TYPEOF: " + (typeof obj));

      println("// LOCALS");
      for(var key in obj) {
        if (!obj.hasOwnProperty(key))
          continue

        showKey(key);
      }

    if (inheritedFieldsP) {
      println("// INHERITED");
      for(var key in obj) {
        if (obj.hasOwnProperty(key))
          continue

        showKey(key);
      }
    }

    return obj;
  },

  abbreviations: {
    "X": function() {
      repl.running = false;
      return repl.__nothing;
    },

    "S": function(obj) {
      return repl.showFullObject(eval(obj));
    },

    "s": function(obj) {
      return repl.showObject(eval(obj));
    },

    "utr" : function() {
      UT.run();
      return repl.__othing;
    },

    "crh": function(obj) {
      repl.out = [];
      return repl.__nothing;
    }
  },

  readAbbreviation: function()
  {
    skipWhitespace();

    var abbrevName = readUntilWhitespace();

    if (!(abbrevName in this.abbreviations)) {
      return function() {
        println("Abbreviation not found: " + abbrevName);
      };
    }

    var abbrevFn = this.abbreviations[abbrevName];
    var abbrevArgs = [];

    for(var ii = 0; ii < abbrevFn.arity; ii++)
      abbrevArgs.push(readcu());

    return function() {
      return abbrevFn.apply(this, abbrevArgs);
    };
  },

  read: function()
  {
    var ch = skipWhitespace();

    if (ch == ':') {
      read();
      return this.readAbbreviation();
    } else
      return readcu();
  },

  jsonRepresentation: function(obj)
  {
    var replaceNatives = function(key, value)
    {
      var className = nativep(value);

      return className ? ("#<native@" + value.hashCode() + " " + className + ">") : value;
    };

    return JSON.stringify(obj, replaceNatives);
  },

  printedRepresentation: function(obj)
  {
    var retVal;

    try {
      retVal = this.printAsJSON ? this.jsonRepresentation(obj)  : obj;
    } catch (ex) {
      this.errobj = ex;

      retVal = "#<print-failed (see repl.errobj)>";
    }

    return retVal;
  },

  print: function(obj, desc, suppressValueP)
  {
    if (obj && (obj == repl.__nothing))
      return;

    var historyKey = this.out.findObject(obj);

    if (historyKey == null) {
      this.out.push(obj);
      historyKey  = this.out.findObject(obj);
    }

    if (undefinedp(desc))
      desc = " ";
    else
      desc = " " + desc + ": ";

    var valuePart = "";

    suppressValueP = suppressValueP || false;

    if (!suppressValueP)
      valuePart = " = " + this.printedRepresentation(obj);

    println("//" + desc + "out[" + historyKey + "]" + valuePart);
  },

  errobj: "<no-current-error>",

  handleError: function(ex)
  {
    this.errobj = ex;

    println("Uncaught Exception: " + this.printedRepresentation(ex));

    return this.__nothing;

  },

  showPrompt: function()
  {
    print(this.prompt);
  },

  run: function()
  {
    while(this.running)
    {
      this.showPrompt();

      var expression = this.read();

      var result;

      // This try...catch would be factored into a repl.eval method, in an
      // ideal world. However, when that's done, Rhino doesn't put global
      // definitions executed by the eval into the global enviroinment. Rather,
      // it puts them into an instance of NativeCall that's the topmost frame
      // in the stack in that calling scenario.
      try {
        if (typeof(expression) == "function")
          result = expression.call(__global_env);
        else
          result = eval(expression);
      } catch(ex) {
        result = this.handleError(ex);
      }

      this.print(result);
    }
  },

  quit: function()
  {
    this.running = false;
  }
}

var out = repl.out;
