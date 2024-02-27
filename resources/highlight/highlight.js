/*!
  Highlight.js v11.9.0 (git: b7ec4bfafc)
  (c) 2006-2023 undefined and other contributors
  License: BSD-3-Clause
 */
var hljs = (function () {
  'use strict';

  /* eslint-disable no-multi-assign */

  function deepFreeze(obj) {
    if (obj instanceof Map) {
      obj.clear =
        obj.delete =
        obj.set =
          function () {
            throw new Error('map is read-only');
          };
    } else if (obj instanceof Set) {
      obj.add =
        obj.clear =
        obj.delete =
          function () {
            throw new Error('set is read-only');
          };
    }

    // Freeze self
    Object.freeze(obj);

    Object.getOwnPropertyNames(obj).forEach((name) => {
      const prop = obj[name];
      const type = typeof prop;

      // Freeze prop if it is an object or function and also not already frozen
      if ((type === 'object' || type === 'function') && !Object.isFrozen(prop)) {
        deepFreeze(prop);
      }
    });

    return obj;
  }

  /** @typedef {import('highlight.js').CallbackResponse} CallbackResponse */
  /** @typedef {import('highlight.js').CompiledMode} CompiledMode */
  /** @implements CallbackResponse */

  class Response {
    /**
     * @param {CompiledMode} mode
     */
    constructor(mode) {
      // eslint-disable-next-line no-undefined
      if (mode.data === undefined) mode.data = {};

      this.data = mode.data;
      this.isMatchIgnored = false;
    }

    ignoreMatch() {
      this.isMatchIgnored = true;
    }
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  function escapeHTML(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * performs a shallow merge of multiple objects into one
   *
   * @template T
   * @param {T} original
   * @param {Record<string,any>[]} objects
   * @returns {T} a single new object
   */
  function inherit$1(original, ...objects) {
    /** @type Record<string,any> */
    const result = Object.create(null);

    for (const key in original) {
      result[key] = original[key];
    }
    objects.forEach(function(obj) {
      for (const key in obj) {
        result[key] = obj[key];
      }
    });
    return /** @type {T} */ (result);
  }

  /**
   * @typedef {object} Renderer
   * @property {(text: string) => void} addText
   * @property {(node: Node) => void} openNode
   * @property {(node: Node) => void} closeNode
   * @property {() => string} value
   */

  /** @typedef {{scope?: string, language?: string, sublanguage?: boolean}} Node */
  /** @typedef {{walk: (r: Renderer) => void}} Tree */
  /** */

  const SPAN_CLOSE = '</span>';

  /**
   * Determines if a node needs to be wrapped in <span>
   *
   * @param {Node} node */
  const emitsWrappingTags = (node) => {
    // rarely we can have a sublanguage where language is undefined
    // TODO: track down why
    return !!node.scope;
  };

  /**
   *
   * @param {string} name
   * @param {{prefix:string}} options
   */
  const scopeToCSSClass = (name, { prefix }) => {
    // sub-language
    if (name.startsWith("language:")) {
      return name.replace("language:", "language-");
    }
    // tiered scope: comment.line
    if (name.includes(".")) {
      const pieces = name.split(".");
      return [
        `${prefix}${pieces.shift()}`,
        ...(pieces.map((x, i) => `${x}${"_".repeat(i + 1)}`))
      ].join(" ");
    }
    // simple scope
    return `${prefix}${name}`;
  };

  /** @type {Renderer} */
  class HTMLRenderer {
    /**
     * Creates a new HTMLRenderer
     *
     * @param {Tree} parseTree - the parse tree (must support `walk` API)
     * @param {{classPrefix: string}} options
     */
    constructor(parseTree, options) {
      this.buffer = "";
      this.classPrefix = options.classPrefix;
      parseTree.walk(this);
    }

    /**
     * Adds texts to the output stream
     *
     * @param {string} text */
    addText(text) {
      this.buffer += escapeHTML(text);
    }

    /**
     * Adds a node open to the output stream (if needed)
     *
     * @param {Node} node */
    openNode(node) {
      if (!emitsWrappingTags(node)) return;

      const className = scopeToCSSClass(node.scope,
        { prefix: this.classPrefix });
      this.span(className);
    }

    /**
     * Adds a node close to the output stream (if needed)
     *
     * @param {Node} node */
    closeNode(node) {
      if (!emitsWrappingTags(node)) return;

      this.buffer += SPAN_CLOSE;
    }

    /**
     * returns the accumulated buffer
    */
    value() {
      return this.buffer;
    }

    // helpers

    /**
     * Builds a span element
     *
     * @param {string} className */
    span(className) {
      this.buffer += `<span class="${className}">`;
    }
  }

  /** @typedef {{scope?: string, language?: string, children: Node[]} | string} Node */
  /** @typedef {{scope?: string, language?: string, children: Node[]} } DataNode */
  /** @typedef {import('highlight.js').Emitter} Emitter */
  /**  */

  /** @returns {DataNode} */
  const newNode = (opts = {}) => {
    /** @type DataNode */
    const result = { children: [] };
    Object.assign(result, opts);
    return result;
  };

  class TokenTree {
    constructor() {
      /** @type DataNode */
      this.rootNode = newNode();
      this.stack = [this.rootNode];
    }

    get top() {
      return this.stack[this.stack.length - 1];
    }

    get root() { return this.rootNode; }

    /** @param {Node} node */
    add(node) {
      this.top.children.push(node);
    }

    /** @param {string} scope */
    openNode(scope) {
      /** @type Node */
      const node = newNode({ scope });
      this.add(node);
      this.stack.push(node);
    }

    closeNode() {
      if (this.stack.length > 1) {
        return this.stack.pop();
      }
      // eslint-disable-next-line no-undefined
      return undefined;
    }

    closeAllNodes() {
      while (this.closeNode());
    }

    toJSON() {
      return JSON.stringify(this.rootNode, null, 4);
    }

    /**
     * @typedef { import("./html_renderer").Renderer } Renderer
     * @param {Renderer} builder
     */
    walk(builder) {
      // this does not
      return this.constructor._walk(builder, this.rootNode);
      // this works
      // return TokenTree._walk(builder, this.rootNode);
    }

    /**
     * @param {Renderer} builder
     * @param {Node} node
     */
    static _walk(builder, node) {
      if (typeof node === "string") {
        builder.addText(node);
      } else if (node.children) {
        builder.openNode(node);
        node.children.forEach((child) => this._walk(builder, child));
        builder.closeNode(node);
      }
      return builder;
    }

    /**
     * @param {Node} node
     */
    static _collapse(node) {
      if (typeof node === "string") return;
      if (!node.children) return;

      if (node.children.every(el => typeof el === "string")) {
        // node.text = node.children.join("");
        // delete node.children;
        node.children = [node.children.join("")];
      } else {
        node.children.forEach((child) => {
          TokenTree._collapse(child);
        });
      }
    }
  }

  /**
    Currently this is all private API, but this is the minimal API necessary
    that an Emitter must implement to fully support the parser.

    Minimal interface:

    - addText(text)
    - __addSublanguage(emitter, subLanguageName)
    - startScope(scope)
    - endScope()
    - finalize()
    - toHTML()

  */

  /**
   * @implements {Emitter}
   */
  class TokenTreeEmitter extends TokenTree {
    /**
     * @param {*} options
     */
    constructor(options) {
      super();
      this.options = options;
    }

    /**
     * @param {string} text
     */
    addText(text) {
      if (text === "") { return; }

      this.add(text);
    }

    /** @param {string} scope */
    startScope(scope) {
      this.openNode(scope);
    }

    endScope() {
      this.closeNode();
    }

    /**
     * @param {Emitter & {root: DataNode}} emitter
     * @param {string} name
     */
    __addSublanguage(emitter, name) {
      /** @type DataNode */
      const node = emitter.root;
      if (name) node.scope = `language:${name}`;

      this.add(node);
    }

    toHTML() {
      const renderer = new HTMLRenderer(this, this.options);
      return renderer.value();
    }

    finalize() {
      this.closeAllNodes();
      return true;
    }
  }

  /**
   * @param {string} value
   * @returns {RegExp}
   * */

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function source(re) {
    if (!re) return null;
    if (typeof re === "string") return re;

    return re.source;
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function lookahead(re) {
    return concat('(?=', re, ')');
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function anyNumberOfTimes(re) {
    return concat('(?:', re, ')*');
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function optional(re) {
    return concat('(?:', re, ')?');
  }

  /**
   * @param {...(RegExp | string) } args
   * @returns {string}
   */
  function concat(...args) {
    const joined = args.map((x) => source(x)).join("");
    return joined;
  }

  /**
   * @param { Array<string | RegExp | Object> } args
   * @returns {object}
   */
  function stripOptionsFromArgs(args) {
    const opts = args[args.length - 1];

    if (typeof opts === 'object' && opts.constructor === Object) {
      args.splice(args.length - 1, 1);
      return opts;
    } else {
      return {};
    }
  }

  /** @typedef { {capture?: boolean} } RegexEitherOptions */

  /**
   * Any of the passed expresssions may match
   *
   * Creates a huge this | this | that | that match
   * @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
   * @returns {string}
   */
  function either(...args) {
    /** @type { object & {capture?: boolean} }  */
    const opts = stripOptionsFromArgs(args);
    const joined = '('
      + (opts.capture ? "" : "?:")
      + args.map((x) => source(x)).join("|") + ")";
    return joined;
  }

  /**
   * @param {RegExp | string} re
   * @returns {number}
   */
  function countMatchGroups(re) {
    return (new RegExp(re.toString() + '|')).exec('').length - 1;
  }

  /**
   * Does lexeme start with a regular expression match at the beginning
   * @param {RegExp} re
   * @param {string} lexeme
   */
  function startsWith(re, lexeme) {
    const match = re && re.exec(lexeme);
    return match && match.index === 0;
  }

  // BACKREF_RE matches an open parenthesis or backreference. To avoid
  // an incorrect parse, it additionally matches the following:
  // - [...] elements, where the meaning of parentheses and escapes change
  // - other escape sequences, so we do not misparse escape sequences as
  //   interesting elements
  // - non-matching or lookahead parentheses, which do not capture. These
  //   follow the '(' with a '?'.
  const BACKREF_RE = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;

  // **INTERNAL** Not intended for outside usage
  // join logically computes regexps.join(separator), but fixes the
  // backreferences so they continue to match.
  // it also places each individual regular expression into it's own
  // match group, keeping track of the sequencing of those match groups
  // is currently an exercise for the caller. :-)
  /**
   * @param {(string | RegExp)[]} regexps
   * @param {{joinWith: string}} opts
   * @returns {string}
   */
  function _rewriteBackreferences(regexps, { joinWith }) {
    let numCaptures = 0;

    return regexps.map((regex) => {
      numCaptures += 1;
      const offset = numCaptures;
      let re = source(regex);
      let out = '';

      while (re.length > 0) {
        const match = BACKREF_RE.exec(re);
        if (!match) {
          out += re;
          break;
        }
        out += re.substring(0, match.index);
        re = re.substring(match.index + match[0].length);
        if (match[0][0] === '\\' && match[1]) {
          // Adjust the backreference.
          out += '\\' + String(Number(match[1]) + offset);
        } else {
          out += match[0];
          if (match[0] === '(') {
            numCaptures++;
          }
        }
      }
      return out;
    }).map(re => `(${re})`).join(joinWith);
  }

  /** @typedef {import('highlight.js').Mode} Mode */
  /** @typedef {import('highlight.js').ModeCallback} ModeCallback */

  // Common regexps
  const MATCH_NOTHING_RE = /\b\B/;
  const IDENT_RE = '[a-zA-Z]\\w*';
  const UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
  const NUMBER_RE = '\\b\\d+(\\.\\d+)?';
  const C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
  const BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
  const RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

  /**
  * @param { Partial<Mode> & {binary?: string | RegExp} } opts
  */
  const SHEBANG = (opts = {}) => {
    const beginShebang = /^#![ ]*\//;
    if (opts.binary) {
      opts.begin = concat(
        beginShebang,
        /.*\b/,
        opts.binary,
        /\b.*/);
    }
    return inherit$1({
      scope: 'meta',
      begin: beginShebang,
      end: /$/,
      relevance: 0,
      /** @type {ModeCallback} */
      "on:begin": (m, resp) => {
        if (m.index !== 0) resp.ignoreMatch();
      }
    }, opts);
  };

  // Common modes
  const BACKSLASH_ESCAPE = {
    begin: '\\\\[\\s\\S]', relevance: 0
  };
  const APOS_STRING_MODE = {
    scope: 'string',
    begin: '\'',
    end: '\'',
    illegal: '\\n',
    contains: [BACKSLASH_ESCAPE]
  };
  const QUOTE_STRING_MODE = {
    scope: 'string',
    begin: '"',
    end: '"',
    illegal: '\\n',
    contains: [BACKSLASH_ESCAPE]
  };
  const PHRASAL_WORDS_MODE = {
    begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
  };
  /**
   * Creates a comment mode
   *
   * @param {string | RegExp} begin
   * @param {string | RegExp} end
   * @param {Mode | {}} [modeOptions]
   * @returns {Partial<Mode>}
   */
  const COMMENT = function(begin, end, modeOptions = {}) {
    const mode = inherit$1(
      {
        scope: 'comment',
        begin,
        end,
        contains: []
      },
      modeOptions
    );
    mode.contains.push({
      scope: 'doctag',
      // hack to avoid the space from being included. the space is necessary to
      // match here to prevent the plain text rule below from gobbling up doctags
      begin: '[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)',
      end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
      excludeBegin: true,
      relevance: 0
    });
    const ENGLISH_WORD = either(
      // list of common 1 and 2 letter words in English
      "I",
      "a",
      "is",
      "so",
      "us",
      "to",
      "at",
      "if",
      "in",
      "it",
      "on",
      // note: this is not an exhaustive list of contractions, just popular ones
      /[A-Za-z]+['](d|ve|re|ll|t|s|n)/, // contractions - can't we'd they're let's, etc
      /[A-Za-z]+[-][a-z]+/, // `no-way`, etc.
      /[A-Za-z][a-z]{2,}/ // allow capitalized words at beginning of sentences
    );
    // looking like plain text, more likely to be a comment
    mode.contains.push(
      {
        // TODO: how to include ", (, ) without breaking grammars that use these for
        // comment delimiters?
        // begin: /[ ]+([()"]?([A-Za-z'-]{3,}|is|a|I|so|us|[tT][oO]|at|if|in|it|on)[.]?[()":]?([.][ ]|[ ]|\))){3}/
        // ---

        // this tries to find sequences of 3 english words in a row (without any
        // "programming" type syntax) this gives us a strong signal that we've
        // TRULY found a comment - vs perhaps scanning with the wrong language.
        // It's possible to find something that LOOKS like the start of the
        // comment - but then if there is no readable text - good chance it is a
        // false match and not a comment.
        //
        // for a visual example please see:
        // https://github.com/highlightjs/highlight.js/issues/2827

        begin: concat(
          /[ ]+/, // necessary to prevent us gobbling up doctags like /* @author Bob Mcgill */
          '(',
          ENGLISH_WORD,
          /[.]?[:]?([.][ ]|[ ])/,
          '){3}') // look for 3 words in a row
      }
    );
    return mode;
  };
  const C_LINE_COMMENT_MODE = COMMENT('//', '$');
  const C_BLOCK_COMMENT_MODE = COMMENT('/\\*', '\\*/');
  const HASH_COMMENT_MODE = COMMENT('#', '$');
  const NUMBER_MODE = {
    scope: 'number',
    begin: NUMBER_RE,
    relevance: 0
  };
  const C_NUMBER_MODE = {
    scope: 'number',
    begin: C_NUMBER_RE,
    relevance: 0
  };
  const BINARY_NUMBER_MODE = {
    scope: 'number',
    begin: BINARY_NUMBER_RE,
    relevance: 0
  };
  const REGEXP_MODE = {
    scope: "regexp",
    begin: /\/(?=[^/\n]*\/)/,
    end: /\/[gimuy]*/,
    contains: [
      BACKSLASH_ESCAPE,
      {
        begin: /\[/,
        end: /\]/,
        relevance: 0,
        contains: [BACKSLASH_ESCAPE]
      }
    ]
  };
  const TITLE_MODE = {
    scope: 'title',
    begin: IDENT_RE,
    relevance: 0
  };
  const UNDERSCORE_TITLE_MODE = {
    scope: 'title',
    begin: UNDERSCORE_IDENT_RE,
    relevance: 0
  };
  const METHOD_GUARD = {
    // excludes method names from keyword processing
    begin: '\\.\\s*' + UNDERSCORE_IDENT_RE,
    relevance: 0
  };

  /**
   * Adds end same as begin mechanics to a mode
   *
   * Your mode must include at least a single () match group as that first match
   * group is what is used for comparison
   * @param {Partial<Mode>} mode
   */
  const END_SAME_AS_BEGIN = function(mode) {
    return Object.assign(mode,
      {
        /** @type {ModeCallback} */
        'on:begin': (m, resp) => { resp.data._beginMatch = m[1]; },
        /** @type {ModeCallback} */
        'on:end': (m, resp) => { if (resp.data._beginMatch !== m[1]) resp.ignoreMatch(); }
      });
  };

  var MODES = /*#__PURE__*/Object.freeze({
    __proto__: null,
    APOS_STRING_MODE: APOS_STRING_MODE,
    BACKSLASH_ESCAPE: BACKSLASH_ESCAPE,
    BINARY_NUMBER_MODE: BINARY_NUMBER_MODE,
    BINARY_NUMBER_RE: BINARY_NUMBER_RE,
    COMMENT: COMMENT,
    C_BLOCK_COMMENT_MODE: C_BLOCK_COMMENT_MODE,
    C_LINE_COMMENT_MODE: C_LINE_COMMENT_MODE,
    C_NUMBER_MODE: C_NUMBER_MODE,
    C_NUMBER_RE: C_NUMBER_RE,
    END_SAME_AS_BEGIN: END_SAME_AS_BEGIN,
    HASH_COMMENT_MODE: HASH_COMMENT_MODE,
    IDENT_RE: IDENT_RE,
    MATCH_NOTHING_RE: MATCH_NOTHING_RE,
    METHOD_GUARD: METHOD_GUARD,
    NUMBER_MODE: NUMBER_MODE,
    NUMBER_RE: NUMBER_RE,
    PHRASAL_WORDS_MODE: PHRASAL_WORDS_MODE,
    QUOTE_STRING_MODE: QUOTE_STRING_MODE,
    REGEXP_MODE: REGEXP_MODE,
    RE_STARTERS_RE: RE_STARTERS_RE,
    SHEBANG: SHEBANG,
    TITLE_MODE: TITLE_MODE,
    UNDERSCORE_IDENT_RE: UNDERSCORE_IDENT_RE,
    UNDERSCORE_TITLE_MODE: UNDERSCORE_TITLE_MODE
  });

  /**
  @typedef {import('highlight.js').CallbackResponse} CallbackResponse
  @typedef {import('highlight.js').CompilerExt} CompilerExt
  */

  // Grammar extensions / plugins
  // See: https://github.com/highlightjs/highlight.js/issues/2833

  // Grammar extensions allow "syntactic sugar" to be added to the grammar modes
  // without requiring any underlying changes to the compiler internals.

  // `compileMatch` being the perfect small example of now allowing a grammar
  // author to write `match` when they desire to match a single expression rather
  // than being forced to use `begin`.  The extension then just moves `match` into
  // `begin` when it runs.  Ie, no features have been added, but we've just made
  // the experience of writing (and reading grammars) a little bit nicer.

  // ------

  // TODO: We need negative look-behind support to do this properly
  /**
   * Skip a match if it has a preceding dot
   *
   * This is used for `beginKeywords` to prevent matching expressions such as
   * `bob.keyword.do()`. The mode compiler automatically wires this up as a
   * special _internal_ 'on:begin' callback for modes with `beginKeywords`
   * @param {RegExpMatchArray} match
   * @param {CallbackResponse} response
   */
  function skipIfHasPrecedingDot(match, response) {
    const before = match.input[match.index - 1];
    if (before === ".") {
      response.ignoreMatch();
    }
  }

  /**
   *
   * @type {CompilerExt}
   */
  function scopeClassName(mode, _parent) {
    // eslint-disable-next-line no-undefined
    if (mode.className !== undefined) {
      mode.scope = mode.className;
      delete mode.className;
    }
  }

  /**
   * `beginKeywords` syntactic sugar
   * @type {CompilerExt}
   */
  function beginKeywords(mode, parent) {
    if (!parent) return;
    if (!mode.beginKeywords) return;

    // for languages with keywords that include non-word characters checking for
    // a word boundary is not sufficient, so instead we check for a word boundary
    // or whitespace - this does no harm in any case since our keyword engine
    // doesn't allow spaces in keywords anyways and we still check for the boundary
    // first
    mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')(?!\\.)(?=\\b|\\s)';
    mode.__beforeBegin = skipIfHasPrecedingDot;
    mode.keywords = mode.keywords || mode.beginKeywords;
    delete mode.beginKeywords;

    // prevents double relevance, the keywords themselves provide
    // relevance, the mode doesn't need to double it
    // eslint-disable-next-line no-undefined
    if (mode.relevance === undefined) mode.relevance = 0;
  }

  /**
   * Allow `illegal` to contain an array of illegal values
   * @type {CompilerExt}
   */
  function compileIllegal(mode, _parent) {
    if (!Array.isArray(mode.illegal)) return;

    mode.illegal = either(...mode.illegal);
  }

  /**
   * `match` to match a single expression for readability
   * @type {CompilerExt}
   */
  function compileMatch(mode, _parent) {
    if (!mode.match) return;
    if (mode.begin || mode.end) throw new Error("begin & end are not supported with match");

    mode.begin = mode.match;
    delete mode.match;
  }

  /**
   * provides the default 1 relevance to all modes
   * @type {CompilerExt}
   */
  function compileRelevance(mode, _parent) {
    // eslint-disable-next-line no-undefined
    if (mode.relevance === undefined) mode.relevance = 1;
  }

  // allow beforeMatch to act as a "qualifier" for the match
  // the full match begin must be [beforeMatch][begin]
  const beforeMatchExt = (mode, parent) => {
    if (!mode.beforeMatch) return;
    // starts conflicts with endsParent which we need to make sure the child
    // rule is not matched multiple times
    if (mode.starts) throw new Error("beforeMatch cannot be used with starts");

    const originalMode = Object.assign({}, mode);
    Object.keys(mode).forEach((key) => { delete mode[key]; });

    mode.keywords = originalMode.keywords;
    mode.begin = concat(originalMode.beforeMatch, lookahead(originalMode.begin));
    mode.starts = {
      relevance: 0,
      contains: [
        Object.assign(originalMode, { endsParent: true })
      ]
    };
    mode.relevance = 0;

    delete originalMode.beforeMatch;
  };

  // keywords that should have no default relevance value
  const COMMON_KEYWORDS = [
    'of',
    'and',
    'for',
    'in',
    'not',
    'or',
    'if',
    'then',
    'parent', // common variable name
    'list', // common variable name
    'value' // common variable name
  ];

  const DEFAULT_KEYWORD_SCOPE = "keyword";

  /**
   * Given raw keywords from a language definition, compile them.
   *
   * @param {string | Record<string,string|string[]> | Array<string>} rawKeywords
   * @param {boolean} caseInsensitive
   */
  function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
    /** @type {import("highlight.js/private").KeywordDict} */
    const compiledKeywords = Object.create(null);

    // input can be a string of keywords, an array of keywords, or a object with
    // named keys representing scopeName (which can then point to a string or array)
    if (typeof rawKeywords === 'string') {
      compileList(scopeName, rawKeywords.split(" "));
    } else if (Array.isArray(rawKeywords)) {
      compileList(scopeName, rawKeywords);
    } else {
      Object.keys(rawKeywords).forEach(function(scopeName) {
        // collapse all our objects back into the parent object
        Object.assign(
          compiledKeywords,
          compileKeywords(rawKeywords[scopeName], caseInsensitive, scopeName)
        );
      });
    }
    return compiledKeywords;

    // ---

    /**
     * Compiles an individual list of keywords
     *
     * Ex: "for if when while|5"
     *
     * @param {string} scopeName
     * @param {Array<string>} keywordList
     */
    function compileList(scopeName, keywordList) {
      if (caseInsensitive) {
        keywordList = keywordList.map(x => x.toLowerCase());
      }
      keywordList.forEach(function(keyword) {
        const pair = keyword.split('|');
        compiledKeywords[pair[0]] = [scopeName, scoreForKeyword(pair[0], pair[1])];
      });
    }
  }

  /**
   * Returns the proper score for a given keyword
   *
   * Also takes into account comment keywords, which will be scored 0 UNLESS
   * another score has been manually assigned.
   * @param {string} keyword
   * @param {string} [providedScore]
   */
  function scoreForKeyword(keyword, providedScore) {
    // manual scores always win over common keywords
    // so you can force a score of 1 if you really insist
    if (providedScore) {
      return Number(providedScore);
    }

    return commonKeyword(keyword) ? 0 : 1;
  }

  /**
   * Determines if a given keyword is common or not
   *
   * @param {string} keyword */
  function commonKeyword(keyword) {
    return COMMON_KEYWORDS.includes(keyword.toLowerCase());
  }

  /*

  For the reasoning behind this please see:
  https://github.com/highlightjs/highlight.js/issues/2880#issuecomment-747275419

  */

  /**
   * @type {Record<string, boolean>}
   */
  const seenDeprecations = {};

  /**
   * @param {string} message
   */
  const error = (message) => {
    console.error(message);
  };

  /**
   * @param {string} message
   * @param {any} args
   */
  const warn = (message, ...args) => {
    console.log(`WARN: ${message}`, ...args);
  };

  /**
   * @param {string} version
   * @param {string} message
   */
  const deprecated = (version, message) => {
    if (seenDeprecations[`${version}/${message}`]) return;

    console.log(`Deprecated as of ${version}. ${message}`);
    seenDeprecations[`${version}/${message}`] = true;
  };

  /* eslint-disable no-throw-literal */

  /**
  @typedef {import('highlight.js').CompiledMode} CompiledMode
  */

  const MultiClassError = new Error();

  /**
   * Renumbers labeled scope names to account for additional inner match
   * groups that otherwise would break everything.
   *
   * Lets say we 3 match scopes:
   *
   *   { 1 => ..., 2 => ..., 3 => ... }
   *
   * So what we need is a clean match like this:
   *
   *   (a)(b)(c) => [ "a", "b", "c" ]
   *
   * But this falls apart with inner match groups:
   *
   * (a)(((b)))(c) => ["a", "b", "b", "b", "c" ]
   *
   * Our scopes are now "out of alignment" and we're repeating `b` 3 times.
   * What needs to happen is the numbers are remapped:
   *
   *   { 1 => ..., 2 => ..., 5 => ... }
   *
   * We also need to know that the ONLY groups that should be output
   * are 1, 2, and 5.  This function handles this behavior.
   *
   * @param {CompiledMode} mode
   * @param {Array<RegExp | string>} regexes
   * @param {{key: "beginScope"|"endScope"}} opts
   */
  function remapScopeNames(mode, regexes, { key }) {
    let offset = 0;
    const scopeNames = mode[key];
    /** @type Record<number,boolean> */
    const emit = {};
    /** @type Record<number,string> */
    const positions = {};

    for (let i = 1; i <= regexes.length; i++) {
      positions[i + offset] = scopeNames[i];
      emit[i + offset] = true;
      offset += countMatchGroups(regexes[i - 1]);
    }
    // we use _emit to keep track of which match groups are "top-level" to avoid double
    // output from inside match groups
    mode[key] = positions;
    mode[key]._emit = emit;
    mode[key]._multi = true;
  }

  /**
   * @param {CompiledMode} mode
   */
  function beginMultiClass(mode) {
    if (!Array.isArray(mode.begin)) return;

    if (mode.skip || mode.excludeBegin || mode.returnBegin) {
      error("skip, excludeBegin, returnBegin not compatible with beginScope: {}");
      throw MultiClassError;
    }

    if (typeof mode.beginScope !== "object" || mode.beginScope === null) {
      error("beginScope must be object");
      throw MultiClassError;
    }

    remapScopeNames(mode, mode.begin, { key: "beginScope" });
    mode.begin = _rewriteBackreferences(mode.begin, { joinWith: "" });
  }

  /**
   * @param {CompiledMode} mode
   */
  function endMultiClass(mode) {
    if (!Array.isArray(mode.end)) return;

    if (mode.skip || mode.excludeEnd || mode.returnEnd) {
      error("skip, excludeEnd, returnEnd not compatible with endScope: {}");
      throw MultiClassError;
    }

    if (typeof mode.endScope !== "object" || mode.endScope === null) {
      error("endScope must be object");
      throw MultiClassError;
    }

    remapScopeNames(mode, mode.end, { key: "endScope" });
    mode.end = _rewriteBackreferences(mode.end, { joinWith: "" });
  }

  /**
   * this exists only to allow `scope: {}` to be used beside `match:`
   * Otherwise `beginScope` would necessary and that would look weird

    {
      match: [ /def/, /\w+/ ]
      scope: { 1: "keyword" , 2: "title" }
    }

   * @param {CompiledMode} mode
   */
  function scopeSugar(mode) {
    if (mode.scope && typeof mode.scope === "object" && mode.scope !== null) {
      mode.beginScope = mode.scope;
      delete mode.scope;
    }
  }

  /**
   * @param {CompiledMode} mode
   */
  function MultiClass(mode) {
    scopeSugar(mode);

    if (typeof mode.beginScope === "string") {
      mode.beginScope = { _wrap: mode.beginScope };
    }
    if (typeof mode.endScope === "string") {
      mode.endScope = { _wrap: mode.endScope };
    }

    beginMultiClass(mode);
    endMultiClass(mode);
  }

  /**
  @typedef {import('highlight.js').Mode} Mode
  @typedef {import('highlight.js').CompiledMode} CompiledMode
  @typedef {import('highlight.js').Language} Language
  @typedef {import('highlight.js').HLJSPlugin} HLJSPlugin
  @typedef {import('highlight.js').CompiledLanguage} CompiledLanguage
  */

  // compilation

  /**
   * Compiles a language definition result
   *
   * Given the raw result of a language definition (Language), compiles this so
   * that it is ready for highlighting code.
   * @param {Language} language
   * @returns {CompiledLanguage}
   */
  function compileLanguage(language) {
    /**
     * Builds a regex with the case sensitivity of the current language
     *
     * @param {RegExp | string} value
     * @param {boolean} [global]
     */
    function langRe(value, global) {
      return new RegExp(
        source(value),
        'm'
        + (language.case_insensitive ? 'i' : '')
        + (language.unicodeRegex ? 'u' : '')
        + (global ? 'g' : '')
      );
    }

    /**
      Stores multiple regular expressions and allows you to quickly search for
      them all in a string simultaneously - returning the first match.  It does
      this by creating a huge (a|b|c) regex - each individual item wrapped with ()
      and joined by `|` - using match groups to track position.  When a match is
      found checking which position in the array has content allows us to figure
      out which of the original regexes / match groups triggered the match.

      The match object itself (the result of `Regex.exec`) is returned but also
      enhanced by merging in any meta-data that was registered with the regex.
      This is how we keep track of which mode matched, and what type of rule
      (`illegal`, `begin`, end, etc).
    */
    class MultiRegex {
      constructor() {
        this.matchIndexes = {};
        // @ts-ignore
        this.regexes = [];
        this.matchAt = 1;
        this.position = 0;
      }

      // @ts-ignore
      addRule(re, opts) {
        opts.position = this.position++;
        // @ts-ignore
        this.matchIndexes[this.matchAt] = opts;
        this.regexes.push([opts, re]);
        this.matchAt += countMatchGroups(re) + 1;
      }

      compile() {
        if (this.regexes.length === 0) {
          // avoids the need to check length every time exec is called
          // @ts-ignore
          this.exec = () => null;
        }
        const terminators = this.regexes.map(el => el[1]);
        this.matcherRe = langRe(_rewriteBackreferences(terminators, { joinWith: '|' }), true);
        this.lastIndex = 0;
      }

      /** @param {string} s */
      exec(s) {
        this.matcherRe.lastIndex = this.lastIndex;
        const match = this.matcherRe.exec(s);
        if (!match) { return null; }

        // eslint-disable-next-line no-undefined
        const i = match.findIndex((el, i) => i > 0 && el !== undefined);
        // @ts-ignore
        const matchData = this.matchIndexes[i];
        // trim off any earlier non-relevant match groups (ie, the other regex
        // match groups that make up the multi-matcher)
        match.splice(0, i);

        return Object.assign(match, matchData);
      }
    }

    /*
      Created to solve the key deficiently with MultiRegex - there is no way to
      test for multiple matches at a single location.  Why would we need to do
      that?  In the future a more dynamic engine will allow certain matches to be
      ignored.  An example: if we matched say the 3rd regex in a large group but
      decided to ignore it - we'd need to started testing again at the 4th
      regex... but MultiRegex itself gives us no real way to do that.

      So what this class creates MultiRegexs on the fly for whatever search
      position they are needed.

      NOTE: These additional MultiRegex objects are created dynamically.  For most
      grammars most of the time we will never actually need anything more than the
      first MultiRegex - so this shouldn't have too much overhead.

      Say this is our search group, and we match regex3, but wish to ignore it.

        regex1 | regex2 | regex3 | regex4 | regex5    ' ie, startAt = 0

      What we need is a new MultiRegex that only includes the remaining
      possibilities:

        regex4 | regex5                               ' ie, startAt = 3

      This class wraps all that complexity up in a simple API... `startAt` decides
      where in the array of expressions to start doing the matching. It
      auto-increments, so if a match is found at position 2, then startAt will be
      set to 3.  If the end is reached startAt will return to 0.

      MOST of the time the parser will be setting startAt manually to 0.
    */
    class ResumableMultiRegex {
      constructor() {
        // @ts-ignore
        this.rules = [];
        // @ts-ignore
        this.multiRegexes = [];
        this.count = 0;

        this.lastIndex = 0;
        this.regexIndex = 0;
      }

      // @ts-ignore
      getMatcher(index) {
        if (this.multiRegexes[index]) return this.multiRegexes[index];

        const matcher = new MultiRegex();
        this.rules.slice(index).forEach(([re, opts]) => matcher.addRule(re, opts));
        matcher.compile();
        this.multiRegexes[index] = matcher;
        return matcher;
      }

      resumingScanAtSamePosition() {
        return this.regexIndex !== 0;
      }

      considerAll() {
        this.regexIndex = 0;
      }

      // @ts-ignore
      addRule(re, opts) {
        this.rules.push([re, opts]);
        if (opts.type === "begin") this.count++;
      }

      /** @param {string} s */
      exec(s) {
        const m = this.getMatcher(this.regexIndex);
        m.lastIndex = this.lastIndex;
        let result = m.exec(s);

        // The following is because we have no easy way to say "resume scanning at the
        // existing position but also skip the current rule ONLY". What happens is
        // all prior rules are also skipped which can result in matching the wrong
        // thing. Example of matching "booger":

        // our matcher is [string, "booger", number]
        //
        // ....booger....

        // if "booger" is ignored then we'd really need a regex to scan from the
        // SAME position for only: [string, number] but ignoring "booger" (if it
        // was the first match), a simple resume would scan ahead who knows how
        // far looking only for "number", ignoring potential string matches (or
        // future "booger" matches that might be valid.)

        // So what we do: We execute two matchers, one resuming at the same
        // position, but the second full matcher starting at the position after:

        //     /--- resume first regex match here (for [number])
        //     |/---- full match here for [string, "booger", number]
        //     vv
        // ....booger....

        // Which ever results in a match first is then used. So this 3-4 step
        // process essentially allows us to say "match at this position, excluding
        // a prior rule that was ignored".
        //
        // 1. Match "booger" first, ignore. Also proves that [string] does non match.
        // 2. Resume matching for [number]
        // 3. Match at index + 1 for [string, "booger", number]
        // 4. If #2 and #3 result in matches, which came first?
        if (this.resumingScanAtSamePosition()) {
          if (result && result.index === this.lastIndex) ; else { // use the second matcher result
            const m2 = this.getMatcher(0);
            m2.lastIndex = this.lastIndex + 1;
            result = m2.exec(s);
          }
        }

        if (result) {
          this.regexIndex += result.position + 1;
          if (this.regexIndex === this.count) {
            // wrap-around to considering all matches again
            this.considerAll();
          }
        }

        return result;
      }
    }

    /**
     * Given a mode, builds a huge ResumableMultiRegex that can be used to walk
     * the content and find matches.
     *
     * @param {CompiledMode} mode
     * @returns {ResumableMultiRegex}
     */
    function buildModeRegex(mode) {
      const mm = new ResumableMultiRegex();

      mode.contains.forEach(term => mm.addRule(term.begin, { rule: term, type: "begin" }));

      if (mode.terminatorEnd) {
        mm.addRule(mode.terminatorEnd, { type: "end" });
      }
      if (mode.illegal) {
        mm.addRule(mode.illegal, { type: "illegal" });
      }

      return mm;
    }

    /** skip vs abort vs ignore
     *
     * @skip   - The mode is still entered and exited normally (and contains rules apply),
     *           but all content is held and added to the parent buffer rather than being
     *           output when the mode ends.  Mostly used with `sublanguage` to build up
     *           a single large buffer than can be parsed by sublanguage.
     *
     *             - The mode begin ands ends normally.
     *             - Content matched is added to the parent mode buffer.
     *             - The parser cursor is moved forward normally.
     *
     * @abort  - A hack placeholder until we have ignore.  Aborts the mode (as if it
     *           never matched) but DOES NOT continue to match subsequent `contains`
     *           modes.  Abort is bad/suboptimal because it can result in modes
     *           farther down not getting applied because an earlier rule eats the
     *           content but then aborts.
     *
     *             - The mode does not begin.
     *             - Content matched by `begin` is added to the mode buffer.
     *             - The parser cursor is moved forward accordingly.
     *
     * @ignore - Ignores the mode (as if it never matched) and continues to match any
     *           subsequent `contains` modes.  Ignore isn't technically possible with
     *           the current parser implementation.
     *
     *             - The mode does not begin.
     *             - Content matched by `begin` is ignored.
     *             - The parser cursor is not moved forward.
     */

    /**
     * Compiles an individual mode
     *
     * This can raise an error if the mode contains certain detectable known logic
     * issues.
     * @param {Mode} mode
     * @param {CompiledMode | null} [parent]
     * @returns {CompiledMode | never}
     */
    function compileMode(mode, parent) {
      const cmode = /** @type CompiledMode */ (mode);
      if (mode.isCompiled) return cmode;

      [
        scopeClassName,
        // do this early so compiler extensions generally don't have to worry about
        // the distinction between match/begin
        compileMatch,
        MultiClass,
        beforeMatchExt
      ].forEach(ext => ext(mode, parent));

      language.compilerExtensions.forEach(ext => ext(mode, parent));

      // __beforeBegin is considered private API, internal use only
      mode.__beforeBegin = null;

      [
        beginKeywords,
        // do this later so compiler extensions that come earlier have access to the
        // raw array if they wanted to perhaps manipulate it, etc.
        compileIllegal,
        // default to 1 relevance if not specified
        compileRelevance
      ].forEach(ext => ext(mode, parent));

      mode.isCompiled = true;

      let keywordPattern = null;
      if (typeof mode.keywords === "object" && mode.keywords.$pattern) {
        // we need a copy because keywords might be compiled multiple times
        // so we can't go deleting $pattern from the original on the first
        // pass
        mode.keywords = Object.assign({}, mode.keywords);
        keywordPattern = mode.keywords.$pattern;
        delete mode.keywords.$pattern;
      }
      keywordPattern = keywordPattern || /\w+/;

      if (mode.keywords) {
        mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);
      }

      cmode.keywordPatternRe = langRe(keywordPattern, true);

      if (parent) {
        if (!mode.begin) mode.begin = /\B|\b/;
        cmode.beginRe = langRe(cmode.begin);
        if (!mode.end && !mode.endsWithParent) mode.end = /\B|\b/;
        if (mode.end) cmode.endRe = langRe(cmode.end);
        cmode.terminatorEnd = source(cmode.end) || '';
        if (mode.endsWithParent && parent.terminatorEnd) {
          cmode.terminatorEnd += (mode.end ? '|' : '') + parent.terminatorEnd;
        }
      }
      if (mode.illegal) cmode.illegalRe = langRe(/** @type {RegExp | string} */ (mode.illegal));
      if (!mode.contains) mode.contains = [];

      mode.contains = [].concat(...mode.contains.map(function(c) {
        return expandOrCloneMode(c === 'self' ? mode : c);
      }));
      mode.contains.forEach(function(c) { compileMode(/** @type Mode */ (c), cmode); });

      if (mode.starts) {
        compileMode(mode.starts, parent);
      }

      cmode.matcher = buildModeRegex(cmode);
      return cmode;
    }

    if (!language.compilerExtensions) language.compilerExtensions = [];

    // self is not valid at the top-level
    if (language.contains && language.contains.includes('self')) {
      throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
    }

    // we need a null object, which inherit will guarantee
    language.classNameAliases = inherit$1(language.classNameAliases || {});

    return compileMode(/** @type Mode */ (language));
  }

  /**
   * Determines if a mode has a dependency on it's parent or not
   *
   * If a mode does have a parent dependency then often we need to clone it if
   * it's used in multiple places so that each copy points to the correct parent,
   * where-as modes without a parent can often safely be re-used at the bottom of
   * a mode chain.
   *
   * @param {Mode | null} mode
   * @returns {boolean} - is there a dependency on the parent?
   * */
  function dependencyOnParent(mode) {
    if (!mode) return false;

    return mode.endsWithParent || dependencyOnParent(mode.starts);
  }

  /**
   * Expands a mode or clones it if necessary
   *
   * This is necessary for modes with parental dependenceis (see notes on
   * `dependencyOnParent`) and for nodes that have `variants` - which must then be
   * exploded into their own individual modes at compile time.
   *
   * @param {Mode} mode
   * @returns {Mode | Mode[]}
   * */
  function expandOrCloneMode(mode) {
    if (mode.variants && !mode.cachedVariants) {
      mode.cachedVariants = mode.variants.map(function(variant) {
        return inherit$1(mode, { variants: null }, variant);
      });
    }

    // EXPAND
    // if we have variants then essentially "replace" the mode with the variants
    // this happens in compileMode, where this function is called from
    if (mode.cachedVariants) {
      return mode.cachedVariants;
    }

    // CLONE
    // if we have dependencies on parents then we need a unique
    // instance of ourselves, so we can be reused with many
    // different parents without issue
    if (dependencyOnParent(mode)) {
      return inherit$1(mode, { starts: mode.starts ? inherit$1(mode.starts) : null });
    }

    if (Object.isFrozen(mode)) {
      return inherit$1(mode);
    }

    // no special dependency issues, just return ourselves
    return mode;
  }

  var version = "11.9.0";

  class HTMLInjectionError extends Error {
    constructor(reason, html) {
      super(reason);
      this.name = "HTMLInjectionError";
      this.html = html;
    }
  }

  /*
  Syntax highlighting with language autodetection.
  https://highlightjs.org/
  */



  /**
  @typedef {import('highlight.js').Mode} Mode
  @typedef {import('highlight.js').CompiledMode} CompiledMode
  @typedef {import('highlight.js').CompiledScope} CompiledScope
  @typedef {import('highlight.js').Language} Language
  @typedef {import('highlight.js').HLJSApi} HLJSApi
  @typedef {import('highlight.js').HLJSPlugin} HLJSPlugin
  @typedef {import('highlight.js').PluginEvent} PluginEvent
  @typedef {import('highlight.js').HLJSOptions} HLJSOptions
  @typedef {import('highlight.js').LanguageFn} LanguageFn
  @typedef {import('highlight.js').HighlightedHTMLElement} HighlightedHTMLElement
  @typedef {import('highlight.js').BeforeHighlightContext} BeforeHighlightContext
  @typedef {import('highlight.js/private').MatchType} MatchType
  @typedef {import('highlight.js/private').KeywordData} KeywordData
  @typedef {import('highlight.js/private').EnhancedMatch} EnhancedMatch
  @typedef {import('highlight.js/private').AnnotatedError} AnnotatedError
  @typedef {import('highlight.js').AutoHighlightResult} AutoHighlightResult
  @typedef {import('highlight.js').HighlightOptions} HighlightOptions
  @typedef {import('highlight.js').HighlightResult} HighlightResult
  */


  const escape = escapeHTML;
  const inherit = inherit$1;
  const NO_MATCH = Symbol("nomatch");
  const MAX_KEYWORD_HITS = 7;

  /**
   * @param {any} hljs - object that is extended (legacy)
   * @returns {HLJSApi}
   */
  const HLJS = function(hljs) {
    // Global internal variables used within the highlight.js library.
    /** @type {Record<string, Language>} */
    const languages = Object.create(null);
    /** @type {Record<string, string>} */
    const aliases = Object.create(null);
    /** @type {HLJSPlugin[]} */
    const plugins = [];

    // safe/production mode - swallows more errors, tries to keep running
    // even if a single syntax or parse hits a fatal error
    let SAFE_MODE = true;
    const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";
    /** @type {Language} */
    const PLAINTEXT_LANGUAGE = { disableAutodetect: true, name: 'Plain text', contains: [] };

    // Global options used when within external APIs. This is modified when
    // calling the `hljs.configure` function.
    /** @type HLJSOptions */
    let options = {
      ignoreUnescapedHTML: false,
      throwUnescapedHTML: false,
      noHighlightRe: /^(no-?highlight)$/i,
      languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
      classPrefix: 'hljs-',
      cssSelector: 'pre code',
      languages: null,
      // beta configuration options, subject to change, welcome to discuss
      // https://github.com/highlightjs/highlight.js/issues/1086
      __emitter: TokenTreeEmitter
    };

    /* Utility functions */

    /**
     * Tests a language name to see if highlighting should be skipped
     * @param {string} languageName
     */
    function shouldNotHighlight(languageName) {
      return options.noHighlightRe.test(languageName);
    }

    /**
     * @param {HighlightedHTMLElement} block - the HTML element to determine language for
     */
    function blockLanguage(block) {
      let classes = block.className + ' ';

      classes += block.parentNode ? block.parentNode.className : '';

      // language-* takes precedence over non-prefixed class names.
      const match = options.languageDetectRe.exec(classes);
      if (match) {
        const language = getLanguage(match[1]);
        if (!language) {
          warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
          warn("Falling back to no-highlight mode for this block.", block);
        }
        return language ? match[1] : 'no-highlight';
      }

      return classes
        .split(/\s+/)
        .find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
    }

    /**
     * Core highlighting function.
     *
     * OLD API
     * highlight(lang, code, ignoreIllegals, continuation)
     *
     * NEW API
     * highlight(code, {lang, ignoreIllegals})
     *
     * @param {string} codeOrLanguageName - the language to use for highlighting
     * @param {string | HighlightOptions} optionsOrCode - the code to highlight
     * @param {boolean} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
     *
     * @returns {HighlightResult} Result - an object that represents the result
     * @property {string} language - the language name
     * @property {number} relevance - the relevance score
     * @property {string} value - the highlighted HTML code
     * @property {string} code - the original raw code
     * @property {CompiledMode} top - top of the current mode stack
     * @property {boolean} illegal - indicates whether any illegal matches were found
    */
    function highlight(codeOrLanguageName, optionsOrCode, ignoreIllegals) {
      let code = "";
      let languageName = "";
      if (typeof optionsOrCode === "object") {
        code = codeOrLanguageName;
        ignoreIllegals = optionsOrCode.ignoreIllegals;
        languageName = optionsOrCode.language;
      } else {
        // old API
        deprecated("10.7.0", "highlight(lang, code, ...args) has been deprecated.");
        deprecated("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277");
        languageName = codeOrLanguageName;
        code = optionsOrCode;
      }

      // https://github.com/highlightjs/highlight.js/issues/3149
      // eslint-disable-next-line no-undefined
      if (ignoreIllegals === undefined) { ignoreIllegals = true; }

      /** @type {BeforeHighlightContext} */
      const context = {
        code,
        language: languageName
      };
      // the plugin can change the desired language or the code to be highlighted
      // just be changing the object it was passed
      fire("before:highlight", context);

      // a before plugin can usurp the result completely by providing it's own
      // in which case we don't even need to call highlight
      const result = context.result
        ? context.result
        : _highlight(context.language, context.code, ignoreIllegals);

      result.code = context.code;
      // the plugin can change anything in result to suite it
      fire("after:highlight", result);

      return result;
    }

    /**
     * private highlight that's used internally and does not fire callbacks
     *
     * @param {string} languageName - the language to use for highlighting
     * @param {string} codeToHighlight - the code to highlight
     * @param {boolean?} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
     * @param {CompiledMode?} [continuation] - current continuation mode, if any
     * @returns {HighlightResult} - result of the highlight operation
    */
    function _highlight(languageName, codeToHighlight, ignoreIllegals, continuation) {
      const keywordHits = Object.create(null);

      /**
       * Return keyword data if a match is a keyword
       * @param {CompiledMode} mode - current mode
       * @param {string} matchText - the textual match
       * @returns {KeywordData | false}
       */
      function keywordData(mode, matchText) {
        return mode.keywords[matchText];
      }

      function processKeywords() {
        if (!top.keywords) {
          emitter.addText(modeBuffer);
          return;
        }

        let lastIndex = 0;
        top.keywordPatternRe.lastIndex = 0;
        let match = top.keywordPatternRe.exec(modeBuffer);
        let buf = "";

        while (match) {
          buf += modeBuffer.substring(lastIndex, match.index);
          const word = language.case_insensitive ? match[0].toLowerCase() : match[0];
          const data = keywordData(top, word);
          if (data) {
            const [kind, keywordRelevance] = data;
            emitter.addText(buf);
            buf = "";

            keywordHits[word] = (keywordHits[word] || 0) + 1;
            if (keywordHits[word] <= MAX_KEYWORD_HITS) relevance += keywordRelevance;
            if (kind.startsWith("_")) {
              // _ implied for relevance only, do not highlight
              // by applying a class name
              buf += match[0];
            } else {
              const cssClass = language.classNameAliases[kind] || kind;
              emitKeyword(match[0], cssClass);
            }
          } else {
            buf += match[0];
          }
          lastIndex = top.keywordPatternRe.lastIndex;
          match = top.keywordPatternRe.exec(modeBuffer);
        }
        buf += modeBuffer.substring(lastIndex);
        emitter.addText(buf);
      }

      function processSubLanguage() {
        if (modeBuffer === "") return;
        /** @type HighlightResult */
        let result = null;

        if (typeof top.subLanguage === 'string') {
          if (!languages[top.subLanguage]) {
            emitter.addText(modeBuffer);
            return;
          }
          result = _highlight(top.subLanguage, modeBuffer, true, continuations[top.subLanguage]);
          continuations[top.subLanguage] = /** @type {CompiledMode} */ (result._top);
        } else {
          result = highlightAuto(modeBuffer, top.subLanguage.length ? top.subLanguage : null);
        }

        // Counting embedded language score towards the host language may be disabled
        // with zeroing the containing mode relevance. Use case in point is Markdown that
        // allows XML everywhere and makes every XML snippet to have a much larger Markdown
        // score.
        if (top.relevance > 0) {
          relevance += result.relevance;
        }
        emitter.__addSublanguage(result._emitter, result.language);
      }

      function processBuffer() {
        if (top.subLanguage != null) {
          processSubLanguage();
        } else {
          processKeywords();
        }
        modeBuffer = '';
      }

      /**
       * @param {string} text
       * @param {string} scope
       */
      function emitKeyword(keyword, scope) {
        if (keyword === "") return;

        emitter.startScope(scope);
        emitter.addText(keyword);
        emitter.endScope();
      }

      /**
       * @param {CompiledScope} scope
       * @param {RegExpMatchArray} match
       */
      function emitMultiClass(scope, match) {
        let i = 1;
        const max = match.length - 1;
        while (i <= max) {
          if (!scope._emit[i]) { i++; continue; }
          const klass = language.classNameAliases[scope[i]] || scope[i];
          const text = match[i];
          if (klass) {
            emitKeyword(text, klass);
          } else {
            modeBuffer = text;
            processKeywords();
            modeBuffer = "";
          }
          i++;
        }
      }

      /**
       * @param {CompiledMode} mode - new mode to start
       * @param {RegExpMatchArray} match
       */
      function startNewMode(mode, match) {
        if (mode.scope && typeof mode.scope === "string") {
          emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
        }
        if (mode.beginScope) {
          // beginScope just wraps the begin match itself in a scope
          if (mode.beginScope._wrap) {
            emitKeyword(modeBuffer, language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap);
            modeBuffer = "";
          } else if (mode.beginScope._multi) {
            // at this point modeBuffer should just be the match
            emitMultiClass(mode.beginScope, match);
            modeBuffer = "";
          }
        }

        top = Object.create(mode, { parent: { value: top } });
        return top;
      }

      /**
       * @param {CompiledMode } mode - the mode to potentially end
       * @param {RegExpMatchArray} match - the latest match
       * @param {string} matchPlusRemainder - match plus remainder of content
       * @returns {CompiledMode | void} - the next mode, or if void continue on in current mode
       */
      function endOfMode(mode, match, matchPlusRemainder) {
        let matched = startsWith(mode.endRe, matchPlusRemainder);

        if (matched) {
          if (mode["on:end"]) {
            const resp = new Response(mode);
            mode["on:end"](match, resp);
            if (resp.isMatchIgnored) matched = false;
          }

          if (matched) {
            while (mode.endsParent && mode.parent) {
              mode = mode.parent;
            }
            return mode;
          }
        }
        // even if on:end fires an `ignore` it's still possible
        // that we might trigger the end node because of a parent mode
        if (mode.endsWithParent) {
          return endOfMode(mode.parent, match, matchPlusRemainder);
        }
      }

      /**
       * Handle matching but then ignoring a sequence of text
       *
       * @param {string} lexeme - string containing full match text
       */
      function doIgnore(lexeme) {
        if (top.matcher.regexIndex === 0) {
          // no more regexes to potentially match here, so we move the cursor forward one
          // space
          modeBuffer += lexeme[0];
          return 1;
        } else {
          // no need to move the cursor, we still have additional regexes to try and
          // match at this very spot
          resumeScanAtSamePosition = true;
          return 0;
        }
      }

      /**
       * Handle the start of a new potential mode match
       *
       * @param {EnhancedMatch} match - the current match
       * @returns {number} how far to advance the parse cursor
       */
      function doBeginMatch(match) {
        const lexeme = match[0];
        const newMode = match.rule;

        const resp = new Response(newMode);
        // first internal before callbacks, then the public ones
        const beforeCallbacks = [newMode.__beforeBegin, newMode["on:begin"]];
        for (const cb of beforeCallbacks) {
          if (!cb) continue;
          cb(match, resp);
          if (resp.isMatchIgnored) return doIgnore(lexeme);
        }

        if (newMode.skip) {
          modeBuffer += lexeme;
        } else {
          if (newMode.excludeBegin) {
            modeBuffer += lexeme;
          }
          processBuffer();
          if (!newMode.returnBegin && !newMode.excludeBegin) {
            modeBuffer = lexeme;
          }
        }
        startNewMode(newMode, match);
        return newMode.returnBegin ? 0 : lexeme.length;
      }

      /**
       * Handle the potential end of mode
       *
       * @param {RegExpMatchArray} match - the current match
       */
      function doEndMatch(match) {
        const lexeme = match[0];
        const matchPlusRemainder = codeToHighlight.substring(match.index);

        const endMode = endOfMode(top, match, matchPlusRemainder);
        if (!endMode) { return NO_MATCH; }

        const origin = top;
        if (top.endScope && top.endScope._wrap) {
          processBuffer();
          emitKeyword(lexeme, top.endScope._wrap);
        } else if (top.endScope && top.endScope._multi) {
          processBuffer();
          emitMultiClass(top.endScope, match);
        } else if (origin.skip) {
          modeBuffer += lexeme;
        } else {
          if (!(origin.returnEnd || origin.excludeEnd)) {
            modeBuffer += lexeme;
          }
          processBuffer();
          if (origin.excludeEnd) {
            modeBuffer = lexeme;
          }
        }
        do {
          if (top.scope) {
            emitter.closeNode();
          }
          if (!top.skip && !top.subLanguage) {
            relevance += top.relevance;
          }
          top = top.parent;
        } while (top !== endMode.parent);
        if (endMode.starts) {
          startNewMode(endMode.starts, match);
        }
        return origin.returnEnd ? 0 : lexeme.length;
      }

      function processContinuations() {
        const list = [];
        for (let current = top; current !== language; current = current.parent) {
          if (current.scope) {
            list.unshift(current.scope);
          }
        }
        list.forEach(item => emitter.openNode(item));
      }

      /** @type {{type?: MatchType, index?: number, rule?: Mode}}} */
      let lastMatch = {};

      /**
       *  Process an individual match
       *
       * @param {string} textBeforeMatch - text preceding the match (since the last match)
       * @param {EnhancedMatch} [match] - the match itself
       */
      function processLexeme(textBeforeMatch, match) {
        const lexeme = match && match[0];

        // add non-matched text to the current mode buffer
        modeBuffer += textBeforeMatch;

        if (lexeme == null) {
          processBuffer();
          return 0;
        }

        // we've found a 0 width match and we're stuck, so we need to advance
        // this happens when we have badly behaved rules that have optional matchers to the degree that
        // sometimes they can end up matching nothing at all
        // Ref: https://github.com/highlightjs/highlight.js/issues/2140
        if (lastMatch.type === "begin" && match.type === "end" && lastMatch.index === match.index && lexeme === "") {
          // spit the "skipped" character that our regex choked on back into the output sequence
          modeBuffer += codeToHighlight.slice(match.index, match.index + 1);
          if (!SAFE_MODE) {
            /** @type {AnnotatedError} */
            const err = new Error(`0 width match regex (${languageName})`);
            err.languageName = languageName;
            err.badRule = lastMatch.rule;
            throw err;
          }
          return 1;
        }
        lastMatch = match;

        if (match.type === "begin") {
          return doBeginMatch(match);
        } else if (match.type === "illegal" && !ignoreIllegals) {
          // illegal match, we do not continue processing
          /** @type {AnnotatedError} */
          const err = new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.scope || '<unnamed>') + '"');
          err.mode = top;
          throw err;
        } else if (match.type === "end") {
          const processed = doEndMatch(match);
          if (processed !== NO_MATCH) {
            return processed;
          }
        }

        // edge case for when illegal matches $ (end of line) which is technically
        // a 0 width match but not a begin/end match so it's not caught by the
        // first handler (when ignoreIllegals is true)
        if (match.type === "illegal" && lexeme === "") {
          // advance so we aren't stuck in an infinite loop
          return 1;
        }

        // infinite loops are BAD, this is a last ditch catch all. if we have a
        // decent number of iterations yet our index (cursor position in our
        // parsing) still 3x behind our index then something is very wrong
        // so we bail
        if (iterations > 100000 && iterations > match.index * 3) {
          const err = new Error('potential infinite loop, way more iterations than matches');
          throw err;
        }

        /*
        Why might be find ourselves here?  An potential end match that was
        triggered but could not be completed.  IE, `doEndMatch` returned NO_MATCH.
        (this could be because a callback requests the match be ignored, etc)

        This causes no real harm other than stopping a few times too many.
        */

        modeBuffer += lexeme;
        return lexeme.length;
      }

      const language = getLanguage(languageName);
      if (!language) {
        error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
        throw new Error('Unknown language: "' + languageName + '"');
      }

      const md = compileLanguage(language);
      let result = '';
      /** @type {CompiledMode} */
      let top = continuation || md;
      /** @type Record<string,CompiledMode> */
      const continuations = {}; // keep continuations for sub-languages
      const emitter = new options.__emitter(options);
      processContinuations();
      let modeBuffer = '';
      let relevance = 0;
      let index = 0;
      let iterations = 0;
      let resumeScanAtSamePosition = false;

      try {
        if (!language.__emitTokens) {
          top.matcher.considerAll();

          for (;;) {
            iterations++;
            if (resumeScanAtSamePosition) {
              // only regexes not matched previously will now be
              // considered for a potential match
              resumeScanAtSamePosition = false;
            } else {
              top.matcher.considerAll();
            }
            top.matcher.lastIndex = index;

            const match = top.matcher.exec(codeToHighlight);
            // console.log("match", match[0], match.rule && match.rule.begin)

            if (!match) break;

            const beforeMatch = codeToHighlight.substring(index, match.index);
            const processedCount = processLexeme(beforeMatch, match);
            index = match.index + processedCount;
          }
          processLexeme(codeToHighlight.substring(index));
        } else {
          language.__emitTokens(codeToHighlight, emitter);
        }

        emitter.finalize();
        result = emitter.toHTML();

        return {
          language: languageName,
          value: result,
          relevance,
          illegal: false,
          _emitter: emitter,
          _top: top
        };
      } catch (err) {
        if (err.message && err.message.includes('Illegal')) {
          return {
            language: languageName,
            value: escape(codeToHighlight),
            illegal: true,
            relevance: 0,
            _illegalBy: {
              message: err.message,
              index,
              context: codeToHighlight.slice(index - 100, index + 100),
              mode: err.mode,
              resultSoFar: result
            },
            _emitter: emitter
          };
        } else if (SAFE_MODE) {
          return {
            language: languageName,
            value: escape(codeToHighlight),
            illegal: false,
            relevance: 0,
            errorRaised: err,
            _emitter: emitter,
            _top: top
          };
        } else {
          throw err;
        }
      }
    }

    /**
     * returns a valid highlight result, without actually doing any actual work,
     * auto highlight starts with this and it's possible for small snippets that
     * auto-detection may not find a better match
     * @param {string} code
     * @returns {HighlightResult}
     */
    function justTextHighlightResult(code) {
      const result = {
        value: escape(code),
        illegal: false,
        relevance: 0,
        _top: PLAINTEXT_LANGUAGE,
        _emitter: new options.__emitter(options)
      };
      result._emitter.addText(code);
      return result;
    }

    /**
    Highlighting with language detection. Accepts a string with the code to
    highlight. Returns an object with the following properties:

    - language (detected language)
    - relevance (int)
    - value (an HTML string with highlighting markup)
    - secondBest (object with the same structure for second-best heuristically
      detected language, may be absent)

      @param {string} code
      @param {Array<string>} [languageSubset]
      @returns {AutoHighlightResult}
    */
    function highlightAuto(code, languageSubset) {
      languageSubset = languageSubset || options.languages || Object.keys(languages);
      const plaintext = justTextHighlightResult(code);

      const results = languageSubset.filter(getLanguage).filter(autoDetection).map(name =>
        _highlight(name, code, false)
      );
      results.unshift(plaintext); // plaintext is always an option

      const sorted = results.sort((a, b) => {
        // sort base on relevance
        if (a.relevance !== b.relevance) return b.relevance - a.relevance;

        // always award the tie to the base language
        // ie if C++ and Arduino are tied, it's more likely to be C++
        if (a.language && b.language) {
          if (getLanguage(a.language).supersetOf === b.language) {
            return 1;
          } else if (getLanguage(b.language).supersetOf === a.language) {
            return -1;
          }
        }

        // otherwise say they are equal, which has the effect of sorting on
        // relevance while preserving the original ordering - which is how ties
        // have historically been settled, ie the language that comes first always
        // wins in the case of a tie
        return 0;
      });

      const [best, secondBest] = sorted;

      /** @type {AutoHighlightResult} */
      const result = best;
      result.secondBest = secondBest;

      return result;
    }

    /**
     * Builds new class name for block given the language name
     *
     * @param {HTMLElement} element
     * @param {string} [currentLang]
     * @param {string} [resultLang]
     */
    function updateClassName(element, currentLang, resultLang) {
      const language = (currentLang && aliases[currentLang]) || resultLang;

      element.classList.add("hljs");
      element.classList.add(`language-${language}`);
    }

    /**
     * Applies highlighting to a DOM node containing code.
     *
     * @param {HighlightedHTMLElement} element - the HTML element to highlight
    */
    function highlightElement(element) {
      /** @type HTMLElement */
      let node = null;
      const language = blockLanguage(element);

      if (shouldNotHighlight(language)) return;

      fire("before:highlightElement",
        { el: element, language });

      if (element.dataset.highlighted) {
        console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.", element);
        return;
      }

      // we should be all text, no child nodes (unescaped HTML) - this is possibly
      // an HTML injection attack - it's likely too late if this is already in
      // production (the code has likely already done its damage by the time
      // we're seeing it)... but we yell loudly about this so that hopefully it's
      // more likely to be caught in development before making it to production
      if (element.children.length > 0) {
        if (!options.ignoreUnescapedHTML) {
          console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk.");
          console.warn("https://github.com/highlightjs/highlight.js/wiki/security");
          console.warn("The element with unescaped HTML:");
          console.warn(element);
        }
        if (options.throwUnescapedHTML) {
          const err = new HTMLInjectionError(
            "One of your code blocks includes unescaped HTML.",
            element.innerHTML
          );
          throw err;
        }
      }

      node = element;
      const text = node.textContent;
      const result = language ? highlight(text, { language, ignoreIllegals: true }) : highlightAuto(text);

      element.innerHTML = result.value;
      element.dataset.highlighted = "yes";
      updateClassName(element, language, result.language);
      element.result = {
        language: result.language,
        // TODO: remove with version 11.0
        re: result.relevance,
        relevance: result.relevance
      };
      if (result.secondBest) {
        element.secondBest = {
          language: result.secondBest.language,
          relevance: result.secondBest.relevance
        };
      }

      fire("after:highlightElement", { el: element, result, text });
    }

    /**
     * Updates highlight.js global options with the passed options
     *
     * @param {Partial<HLJSOptions>} userOptions
     */
    function configure(userOptions) {
      options = inherit(options, userOptions);
    }

    // TODO: remove v12, deprecated
    const initHighlighting = () => {
      highlightAll();
      deprecated("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
    };

    // TODO: remove v12, deprecated
    function initHighlightingOnLoad() {
      highlightAll();
      deprecated("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
    }

    let wantsHighlight = false;

    /**
     * auto-highlights all pre>code elements on the page
     */
    function highlightAll() {
      // if we are called too early in the loading process
      if (document.readyState === "loading") {
        wantsHighlight = true;
        return;
      }

      const blocks = document.querySelectorAll(options.cssSelector);
      blocks.forEach(highlightElement);
    }

    function boot() {
      // if a highlight was requested before DOM was loaded, do now
      if (wantsHighlight) highlightAll();
    }

    // make sure we are in the browser environment
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('DOMContentLoaded', boot, false);
    }

    /**
     * Register a language grammar module
     *
     * @param {string} languageName
     * @param {LanguageFn} languageDefinition
     */
    function registerLanguage(languageName, languageDefinition) {
      let lang = null;
      try {
        lang = languageDefinition(hljs);
      } catch (error$1) {
        error("Language definition for '{}' could not be registered.".replace("{}", languageName));
        // hard or soft error
        if (!SAFE_MODE) { throw error$1; } else { error(error$1); }
        // languages that have serious errors are replaced with essentially a
        // "plaintext" stand-in so that the code blocks will still get normal
        // css classes applied to them - and one bad language won't break the
        // entire highlighter
        lang = PLAINTEXT_LANGUAGE;
      }
      // give it a temporary name if it doesn't have one in the meta-data
      if (!lang.name) lang.name = languageName;
      languages[languageName] = lang;
      lang.rawDefinition = languageDefinition.bind(null, hljs);

      if (lang.aliases) {
        registerAliases(lang.aliases, { languageName });
      }
    }

    /**
     * Remove a language grammar module
     *
     * @param {string} languageName
     */
    function unregisterLanguage(languageName) {
      delete languages[languageName];
      for (const alias of Object.keys(aliases)) {
        if (aliases[alias] === languageName) {
          delete aliases[alias];
        }
      }
    }

    /**
     * @returns {string[]} List of language internal names
     */
    function listLanguages() {
      return Object.keys(languages);
    }

    /**
     * @param {string} name - name of the language to retrieve
     * @returns {Language | undefined}
     */
    function getLanguage(name) {
      name = (name || '').toLowerCase();
      return languages[name] || languages[aliases[name]];
    }

    /**
     *
     * @param {string|string[]} aliasList - single alias or list of aliases
     * @param {{languageName: string}} opts
     */
    function registerAliases(aliasList, { languageName }) {
      if (typeof aliasList === 'string') {
        aliasList = [aliasList];
      }
      aliasList.forEach(alias => { aliases[alias.toLowerCase()] = languageName; });
    }

    /**
     * Determines if a given language has auto-detection enabled
     * @param {string} name - name of the language
     */
    function autoDetection(name) {
      const lang = getLanguage(name);
      return lang && !lang.disableAutodetect;
    }

    /**
     * Upgrades the old highlightBlock plugins to the new
     * highlightElement API
     * @param {HLJSPlugin} plugin
     */
    function upgradePluginAPI(plugin) {
      // TODO: remove with v12
      if (plugin["before:highlightBlock"] && !plugin["before:highlightElement"]) {
        plugin["before:highlightElement"] = (data) => {
          plugin["before:highlightBlock"](
            Object.assign({ block: data.el }, data)
          );
        };
      }
      if (plugin["after:highlightBlock"] && !plugin["after:highlightElement"]) {
        plugin["after:highlightElement"] = (data) => {
          plugin["after:highlightBlock"](
            Object.assign({ block: data.el }, data)
          );
        };
      }
    }

    /**
     * @param {HLJSPlugin} plugin
     */
    function addPlugin(plugin) {
      upgradePluginAPI(plugin);
      plugins.push(plugin);
    }

    /**
     * @param {HLJSPlugin} plugin
     */
    function removePlugin(plugin) {
      const index = plugins.indexOf(plugin);
      if (index !== -1) {
        plugins.splice(index, 1);
      }
    }

    /**
     *
     * @param {PluginEvent} event
     * @param {any} args
     */
    function fire(event, args) {
      const cb = event;
      plugins.forEach(function(plugin) {
        if (plugin[cb]) {
          plugin[cb](args);
        }
      });
    }

    /**
     * DEPRECATED
     * @param {HighlightedHTMLElement} el
     */
    function deprecateHighlightBlock(el) {
      deprecated("10.7.0", "highlightBlock will be removed entirely in v12.0");
      deprecated("10.7.0", "Please use highlightElement now.");

      return highlightElement(el);
    }

    /* Interface definition */
    Object.assign(hljs, {
      highlight,
      highlightAuto,
      highlightAll,
      highlightElement,
      // TODO: Remove with v12 API
      highlightBlock: deprecateHighlightBlock,
      configure,
      initHighlighting,
      initHighlightingOnLoad,
      registerLanguage,
      unregisterLanguage,
      listLanguages,
      getLanguage,
      registerAliases,
      autoDetection,
      inherit,
      addPlugin,
      removePlugin
    });

    hljs.debugMode = function() { SAFE_MODE = false; };
    hljs.safeMode = function() { SAFE_MODE = true; };
    hljs.versionString = version;

    hljs.regex = {
      concat: concat,
      lookahead: lookahead,
      either: either,
      optional: optional,
      anyNumberOfTimes: anyNumberOfTimes
    };

    for (const key in MODES) {
      // @ts-ignore
      if (typeof MODES[key] === "object") {
        // @ts-ignore
        deepFreeze(MODES[key]);
      }
    }

    // merge all the modes/regexes into our main object
    Object.assign(hljs, MODES);

    return hljs;
  };

  // Other names for the variable may break build script
  const highlight = HLJS({});

  // returns a new instance of the highlighter to be used for extensions
  // check https://github.com/wooorm/lowlight/issues/47
  highlight.newInstance = () => HLJS({});

  return highlight;

})();
if (typeof exports === 'object' && typeof module !== 'undefined') { module.exports = hljs; }
/*! `armasm` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: ARM Assembly
  Author: Dan Panzarella <alsoelp@gmail.com>
  Description: ARM Assembly including Thumb and Thumb2 instructions
  Category: assembler
  */

  /** @type LanguageFn */
  function armasm(hljs) {
    // local labels: %?[FB]?[AT]?\d{1,2}\w+

    const COMMENT = { variants: [
      hljs.COMMENT('^[ \\t]*(?=#)', '$', {
        relevance: 0,
        excludeBegin: true
      }),
      hljs.COMMENT('[;@]', '$', { relevance: 0 }),
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE
    ] };

    return {
      name: 'ARM Assembly',
      case_insensitive: true,
      aliases: [ 'arm' ],
      keywords: {
        $pattern: '\\.?' + hljs.IDENT_RE,
        meta:
          // GNU preprocs
          '.2byte .4byte .align .ascii .asciz .balign .byte .code .data .else .end .endif .endm .endr .equ .err .exitm .extern .global .hword .if .ifdef .ifndef .include .irp .long .macro .rept .req .section .set .skip .space .text .word .arm .thumb .code16 .code32 .force_thumb .thumb_func .ltorg '
          // ARM directives
          + 'ALIAS ALIGN ARM AREA ASSERT ATTR CN CODE CODE16 CODE32 COMMON CP DATA DCB DCD DCDU DCDO DCFD DCFDU DCI DCQ DCQU DCW DCWU DN ELIF ELSE END ENDFUNC ENDIF ENDP ENTRY EQU EXPORT EXPORTAS EXTERN FIELD FILL FUNCTION GBLA GBLL GBLS GET GLOBAL IF IMPORT INCBIN INCLUDE INFO KEEP LCLA LCLL LCLS LTORG MACRO MAP MEND MEXIT NOFP OPT PRESERVE8 PROC QN READONLY RELOC REQUIRE REQUIRE8 RLIST FN ROUT SETA SETL SETS SN SPACE SUBT THUMB THUMBX TTL WHILE WEND ',
        built_in:
          'r0 r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15 ' // standard registers
          + 'w0 w1 w2 w3 w4 w5 w6 w7 w8 w9 w10 w11 w12 w13 w14 w15 ' // 32 bit ARMv8 registers
          + 'w16 w17 w18 w19 w20 w21 w22 w23 w24 w25 w26 w27 w28 w29 w30 '
          + 'x0 x1 x2 x3 x4 x5 x6 x7 x8 x9 x10 x11 x12 x13 x14 x15 ' // 64 bit ARMv8 registers
          + 'x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 '
          + 'pc lr sp ip sl sb fp ' // typical regs plus backward compatibility
          + 'a1 a2 a3 a4 v1 v2 v3 v4 v5 v6 v7 v8 f0 f1 f2 f3 f4 f5 f6 f7 ' // more regs and fp
          + 'p0 p1 p2 p3 p4 p5 p6 p7 p8 p9 p10 p11 p12 p13 p14 p15 ' // coprocessor regs
          + 'c0 c1 c2 c3 c4 c5 c6 c7 c8 c9 c10 c11 c12 c13 c14 c15 ' // more coproc
          + 'q0 q1 q2 q3 q4 q5 q6 q7 q8 q9 q10 q11 q12 q13 q14 q15 ' // advanced SIMD NEON regs

          // program status registers
          + 'cpsr_c cpsr_x cpsr_s cpsr_f cpsr_cx cpsr_cxs cpsr_xs cpsr_xsf cpsr_sf cpsr_cxsf '
          + 'spsr_c spsr_x spsr_s spsr_f spsr_cx spsr_cxs spsr_xs spsr_xsf spsr_sf spsr_cxsf '

          // NEON and VFP registers
          + 's0 s1 s2 s3 s4 s5 s6 s7 s8 s9 s10 s11 s12 s13 s14 s15 '
          + 's16 s17 s18 s19 s20 s21 s22 s23 s24 s25 s26 s27 s28 s29 s30 s31 '
          + 'd0 d1 d2 d3 d4 d5 d6 d7 d8 d9 d10 d11 d12 d13 d14 d15 '
          + 'd16 d17 d18 d19 d20 d21 d22 d23 d24 d25 d26 d27 d28 d29 d30 d31 '

          + '{PC} {VAR} {TRUE} {FALSE} {OPT} {CONFIG} {ENDIAN} {CODESIZE} {CPU} {FPU} {ARCHITECTURE} {PCSTOREOFFSET} {ARMASM_VERSION} {INTER} {ROPI} {RWPI} {SWST} {NOSWST} . @'
      },
      contains: [
        {
          className: 'keyword',
          begin: '\\b(' // mnemonics
              + 'adc|'
              + '(qd?|sh?|u[qh]?)?add(8|16)?|usada?8|(q|sh?|u[qh]?)?(as|sa)x|'
              + 'and|adrl?|sbc|rs[bc]|asr|b[lx]?|blx|bxj|cbn?z|tb[bh]|bic|'
              + 'bfc|bfi|[su]bfx|bkpt|cdp2?|clz|clrex|cmp|cmn|cpsi[ed]|cps|'
              + 'setend|dbg|dmb|dsb|eor|isb|it[te]{0,3}|lsl|lsr|ror|rrx|'
              + 'ldm(([id][ab])|f[ds])?|ldr((s|ex)?[bhd])?|movt?|mvn|mra|mar|'
              + 'mul|[us]mull|smul[bwt][bt]|smu[as]d|smmul|smmla|'
              + 'mla|umlaal|smlal?([wbt][bt]|d)|mls|smlsl?[ds]|smc|svc|sev|'
              + 'mia([bt]{2}|ph)?|mrr?c2?|mcrr2?|mrs|msr|orr|orn|pkh(tb|bt)|rbit|'
              + 'rev(16|sh)?|sel|[su]sat(16)?|nop|pop|push|rfe([id][ab])?|'
              + 'stm([id][ab])?|str(ex)?[bhd]?|(qd?)?sub|(sh?|q|u[qh]?)?sub(8|16)|'
              + '[su]xt(a?h|a?b(16)?)|srs([id][ab])?|swpb?|swi|smi|tst|teq|'
              + 'wfe|wfi|yield'
          + ')'
          + '(eq|ne|cs|cc|mi|pl|vs|vc|hi|ls|ge|lt|gt|le|al|hs|lo)?' // condition codes
          + '[sptrx]?' // legal postfixes
          + '(?=\\s)' // followed by space
        },
        COMMENT,
        hljs.QUOTE_STRING_MODE,
        {
          className: 'string',
          begin: '\'',
          end: '[^\\\\]\'',
          relevance: 0
        },
        {
          className: 'title',
          begin: '\\|',
          end: '\\|',
          illegal: '\\n',
          relevance: 0
        },
        {
          className: 'number',
          variants: [
            { // hex
              begin: '[#$=]?0x[0-9a-f]+' },
            { // bin
              begin: '[#$=]?0b[01]+' },
            { // literal
              begin: '[#$=]\\d+' },
            { // bare number
              begin: '\\b\\d+' }
          ],
          relevance: 0
        },
        {
          className: 'symbol',
          variants: [
            { // GNU ARM syntax
              begin: '^[ \\t]*[a-z_\\.\\$][a-z0-9_\\.\\$]+:' },
            { // ARM syntax
              begin: '^[a-z_\\.\\$][a-z0-9_\\.\\$]+' },
            { // label reference
              begin: '[=#]\\w+' }
          ],
          relevance: 0
        }
      ]
    };
  }

  return armasm;

})();

    hljs.registerLanguage('armasm', hljsGrammar);
  })();/*! `asciidoc` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: AsciiDoc
  Requires: xml.js
  Author: Dan Allen <dan.j.allen@gmail.com>
  Website: http://asciidoc.org
  Description: A semantic, text-based document format that can be exported to HTML, DocBook and other backends.
  Category: markup
  */

  /** @type LanguageFn */
  function asciidoc(hljs) {
    const regex = hljs.regex;
    const HORIZONTAL_RULE = {
      begin: '^\'{3,}[ \\t]*$',
      relevance: 10
    };
    const ESCAPED_FORMATTING = [
      // escaped constrained formatting marks (i.e., \* \_ or \`)
      { begin: /\\[*_`]/ },
      // escaped unconstrained formatting marks (i.e., \\** \\__ or \\``)
      // must ignore until the next formatting marks
      // this rule might not be 100% compliant with Asciidoctor 2.0 but we are entering undefined behavior territory...
      { begin: /\\\\\*{2}[^\n]*?\*{2}/ },
      { begin: /\\\\_{2}[^\n]*_{2}/ },
      { begin: /\\\\`{2}[^\n]*`{2}/ },
      // guard: constrained formatting mark may not be preceded by ":", ";" or
      // "}". match these so the constrained rule doesn't see them
      { begin: /[:;}][*_`](?![*_`])/ }
    ];
    const STRONG = [
      // inline unconstrained strong (single line)
      {
        className: 'strong',
        begin: /\*{2}([^\n]+?)\*{2}/
      },
      // inline unconstrained strong (multi-line)
      {
        className: 'strong',
        begin: regex.concat(
          /\*\*/,
          /((\*(?!\*)|\\[^\n]|[^*\n\\])+\n)+/,
          /(\*(?!\*)|\\[^\n]|[^*\n\\])*/,
          /\*\*/
        ),
        relevance: 0
      },
      // inline constrained strong (single line)
      {
        className: 'strong',
        // must not precede or follow a word character
        begin: /\B\*(\S|\S[^\n]*?\S)\*(?!\w)/
      },
      // inline constrained strong (multi-line)
      {
        className: 'strong',
        // must not precede or follow a word character
        begin: /\*[^\s]([^\n]+\n)+([^\n]+)\*/
      }
    ];
    const EMPHASIS = [
      // inline unconstrained emphasis (single line)
      {
        className: 'emphasis',
        begin: /_{2}([^\n]+?)_{2}/
      },
      // inline unconstrained emphasis (multi-line)
      {
        className: 'emphasis',
        begin: regex.concat(
          /__/,
          /((_(?!_)|\\[^\n]|[^_\n\\])+\n)+/,
          /(_(?!_)|\\[^\n]|[^_\n\\])*/,
          /__/
        ),
        relevance: 0
      },
      // inline constrained emphasis (single line)
      {
        className: 'emphasis',
        // must not precede or follow a word character
        begin: /\b_(\S|\S[^\n]*?\S)_(?!\w)/
      },
      // inline constrained emphasis (multi-line)
      {
        className: 'emphasis',
        // must not precede or follow a word character
        begin: /_[^\s]([^\n]+\n)+([^\n]+)_/
      },
      // inline constrained emphasis using single quote (legacy)
      {
        className: 'emphasis',
        // must not follow a word character or be followed by a single quote or space
        begin: '\\B\'(?![\'\\s])',
        end: '(\\n{2}|\')',
        // allow escaped single quote followed by word char
        contains: [
          {
            begin: '\\\\\'\\w',
            relevance: 0
          }
        ],
        relevance: 0
      }
    ];
    const ADMONITION = {
      className: 'symbol',
      begin: '^(NOTE|TIP|IMPORTANT|WARNING|CAUTION):\\s+',
      relevance: 10
    };
    const BULLET_LIST = {
      className: 'bullet',
      begin: '^(\\*+|-+|\\.+|[^\\n]+?::)\\s+'
    };

    return {
      name: 'AsciiDoc',
      aliases: [ 'adoc' ],
      contains: [
        // block comment
        hljs.COMMENT(
          '^/{4,}\\n',
          '\\n/{4,}$',
          // can also be done as...
          // '^/{4,}$',
          // '^/{4,}$',
          { relevance: 10 }
        ),
        // line comment
        hljs.COMMENT(
          '^//',
          '$',
          { relevance: 0 }
        ),
        // title
        {
          className: 'title',
          begin: '^\\.\\w.*$'
        },
        // example, admonition & sidebar blocks
        {
          begin: '^[=\\*]{4,}\\n',
          end: '\\n^[=\\*]{4,}$',
          relevance: 10
        },
        // headings
        {
          className: 'section',
          relevance: 10,
          variants: [
            { begin: '^(={1,6})[ \t].+?([ \t]\\1)?$' },
            { begin: '^[^\\[\\]\\n]+?\\n[=\\-~\\^\\+]{2,}$' }
          ]
        },
        // document attributes
        {
          className: 'meta',
          begin: '^:.+?:',
          end: '\\s',
          excludeEnd: true,
          relevance: 10
        },
        // block attributes
        {
          className: 'meta',
          begin: '^\\[.+?\\]$',
          relevance: 0
        },
        // quoteblocks
        {
          className: 'quote',
          begin: '^_{4,}\\n',
          end: '\\n_{4,}$',
          relevance: 10
        },
        // listing and literal blocks
        {
          className: 'code',
          begin: '^[\\-\\.]{4,}\\n',
          end: '\\n[\\-\\.]{4,}$',
          relevance: 10
        },
        // passthrough blocks
        {
          begin: '^\\+{4,}\\n',
          end: '\\n\\+{4,}$',
          contains: [
            {
              begin: '<',
              end: '>',
              subLanguage: 'xml',
              relevance: 0
            }
          ],
          relevance: 10
        },

        BULLET_LIST,
        ADMONITION,
        ...ESCAPED_FORMATTING,
        ...STRONG,
        ...EMPHASIS,

        // inline smart quotes
        {
          className: 'string',
          variants: [
            { begin: "``.+?''" },
            { begin: "`.+?'" }
          ]
        },
        // inline unconstrained emphasis
        {
          className: 'code',
          begin: /`{2}/,
          end: /(\n{2}|`{2})/
        },
        // inline code snippets (TODO should get same treatment as strong and emphasis)
        {
          className: 'code',
          begin: '(`.+?`|\\+.+?\\+)',
          relevance: 0
        },
        // indented literal block
        {
          className: 'code',
          begin: '^[ \\t]',
          end: '$',
          relevance: 0
        },
        HORIZONTAL_RULE,
        // images and links
        {
          begin: '(link:)?(http|https|ftp|file|irc|image:?):\\S+?\\[[^[]*?\\]',
          returnBegin: true,
          contains: [
            {
              begin: '(link|image:?):',
              relevance: 0
            },
            {
              className: 'link',
              begin: '\\w',
              end: '[^\\[]+',
              relevance: 0
            },
            {
              className: 'string',
              begin: '\\[',
              end: '\\]',
              excludeBegin: true,
              excludeEnd: true,
              relevance: 0
            }
          ],
          relevance: 10
        }
      ]
    };
  }

  return asciidoc;

})();

    hljs.registerLanguage('asciidoc', hljsGrammar);
  })();/*! `awk` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Awk
  Author: Matthew Daly <matthewbdaly@gmail.com>
  Website: https://www.gnu.org/software/gawk/manual/gawk.html
  Description: language definition for Awk scripts
  Category: scripting
  */

  /** @type LanguageFn */
  function awk(hljs) {
    const VARIABLE = {
      className: 'variable',
      variants: [
        { begin: /\$[\w\d#@][\w\d_]*/ },
        { begin: /\$\{(.*?)\}/ }
      ]
    };
    const KEYWORDS = 'BEGIN END if else while do for in break continue delete next nextfile function func exit|10';
    const STRING = {
      className: 'string',
      contains: [ hljs.BACKSLASH_ESCAPE ],
      variants: [
        {
          begin: /(u|b)?r?'''/,
          end: /'''/,
          relevance: 10
        },
        {
          begin: /(u|b)?r?"""/,
          end: /"""/,
          relevance: 10
        },
        {
          begin: /(u|r|ur)'/,
          end: /'/,
          relevance: 10
        },
        {
          begin: /(u|r|ur)"/,
          end: /"/,
          relevance: 10
        },
        {
          begin: /(b|br)'/,
          end: /'/
        },
        {
          begin: /(b|br)"/,
          end: /"/
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE
      ]
    };
    return {
      name: 'Awk',
      keywords: { keyword: KEYWORDS },
      contains: [
        VARIABLE,
        STRING,
        hljs.REGEXP_MODE,
        hljs.HASH_COMMENT_MODE,
        hljs.NUMBER_MODE
      ]
    };
  }

  return awk;

})();

    hljs.registerLanguage('awk', hljsGrammar);
  })();/*! `bash` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Bash
  Author: vah <vahtenberg@gmail.com>
  Contributrors: Benjamin Pannell <contact@sierrasoftworks.com>
  Website: https://www.gnu.org/software/bash/
  Category: common, scripting
  */

  /** @type LanguageFn */
  function bash(hljs) {
    const regex = hljs.regex;
    const VAR = {};
    const BRACED_VAR = {
      begin: /\$\{/,
      end: /\}/,
      contains: [
        "self",
        {
          begin: /:-/,
          contains: [ VAR ]
        } // default values
      ]
    };
    Object.assign(VAR, {
      className: 'variable',
      variants: [
        { begin: regex.concat(/\$[\w\d#@][\w\d_]*/,
          // negative look-ahead tries to avoid matching patterns that are not
          // Perl at all like $ident$, @ident@, etc.
          `(?![\\w\\d])(?![$])`) },
        BRACED_VAR
      ]
    });

    const SUBST = {
      className: 'subst',
      begin: /\$\(/,
      end: /\)/,
      contains: [ hljs.BACKSLASH_ESCAPE ]
    };
    const COMMENT = hljs.inherit(
      hljs.COMMENT(),
      {
        match: [
          /(^|\s)/,
          /#.*$/
        ],
        scope: {
          2: 'comment'
        }
      }
    );
    const HERE_DOC = {
      begin: /<<-?\s*(?=\w+)/,
      starts: { contains: [
        hljs.END_SAME_AS_BEGIN({
          begin: /(\w+)/,
          end: /(\w+)/,
          className: 'string'
        })
      ] }
    };
    const QUOTE_STRING = {
      className: 'string',
      begin: /"/,
      end: /"/,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        VAR,
        SUBST
      ]
    };
    SUBST.contains.push(QUOTE_STRING);
    const ESCAPED_QUOTE = {
      match: /\\"/
    };
    const APOS_STRING = {
      className: 'string',
      begin: /'/,
      end: /'/
    };
    const ESCAPED_APOS = {
      match: /\\'/
    };
    const ARITHMETIC = {
      begin: /\$?\(\(/,
      end: /\)\)/,
      contains: [
        {
          begin: /\d+#[0-9a-f]+/,
          className: "number"
        },
        hljs.NUMBER_MODE,
        VAR
      ]
    };
    const SH_LIKE_SHELLS = [
      "fish",
      "bash",
      "zsh",
      "sh",
      "csh",
      "ksh",
      "tcsh",
      "dash",
      "scsh",
    ];
    const KNOWN_SHEBANG = hljs.SHEBANG({
      binary: `(${SH_LIKE_SHELLS.join("|")})`,
      relevance: 10
    });
    const FUNCTION = {
      className: 'function',
      begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
      returnBegin: true,
      contains: [ hljs.inherit(hljs.TITLE_MODE, { begin: /\w[\w\d_]*/ }) ],
      relevance: 0
    };

    const KEYWORDS = [
      "if",
      "then",
      "else",
      "elif",
      "fi",
      "for",
      "while",
      "until",
      "in",
      "do",
      "done",
      "case",
      "esac",
      "function",
      "select"
    ];

    const LITERALS = [
      "true",
      "false"
    ];

    // to consume paths to prevent keyword matches inside them
    const PATH_MODE = { match: /(\/[a-z._-]+)+/ };

    // http://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
    const SHELL_BUILT_INS = [
      "break",
      "cd",
      "continue",
      "eval",
      "exec",
      "exit",
      "export",
      "getopts",
      "hash",
      "pwd",
      "readonly",
      "return",
      "shift",
      "test",
      "times",
      "trap",
      "umask",
      "unset"
    ];

    const BASH_BUILT_INS = [
      "alias",
      "bind",
      "builtin",
      "caller",
      "command",
      "declare",
      "echo",
      "enable",
      "help",
      "let",
      "local",
      "logout",
      "mapfile",
      "printf",
      "read",
      "readarray",
      "source",
      "type",
      "typeset",
      "ulimit",
      "unalias"
    ];

    const ZSH_BUILT_INS = [
      "autoload",
      "bg",
      "bindkey",
      "bye",
      "cap",
      "chdir",
      "clone",
      "comparguments",
      "compcall",
      "compctl",
      "compdescribe",
      "compfiles",
      "compgroups",
      "compquote",
      "comptags",
      "comptry",
      "compvalues",
      "dirs",
      "disable",
      "disown",
      "echotc",
      "echoti",
      "emulate",
      "fc",
      "fg",
      "float",
      "functions",
      "getcap",
      "getln",
      "history",
      "integer",
      "jobs",
      "kill",
      "limit",
      "log",
      "noglob",
      "popd",
      "print",
      "pushd",
      "pushln",
      "rehash",
      "sched",
      "setcap",
      "setopt",
      "stat",
      "suspend",
      "ttyctl",
      "unfunction",
      "unhash",
      "unlimit",
      "unsetopt",
      "vared",
      "wait",
      "whence",
      "where",
      "which",
      "zcompile",
      "zformat",
      "zftp",
      "zle",
      "zmodload",
      "zparseopts",
      "zprof",
      "zpty",
      "zregexparse",
      "zsocket",
      "zstyle",
      "ztcp"
    ];

    const GNU_CORE_UTILS = [
      "chcon",
      "chgrp",
      "chown",
      "chmod",
      "cp",
      "dd",
      "df",
      "dir",
      "dircolors",
      "ln",
      "ls",
      "mkdir",
      "mkfifo",
      "mknod",
      "mktemp",
      "mv",
      "realpath",
      "rm",
      "rmdir",
      "shred",
      "sync",
      "touch",
      "truncate",
      "vdir",
      "b2sum",
      "base32",
      "base64",
      "cat",
      "cksum",
      "comm",
      "csplit",
      "cut",
      "expand",
      "fmt",
      "fold",
      "head",
      "join",
      "md5sum",
      "nl",
      "numfmt",
      "od",
      "paste",
      "ptx",
      "pr",
      "sha1sum",
      "sha224sum",
      "sha256sum",
      "sha384sum",
      "sha512sum",
      "shuf",
      "sort",
      "split",
      "sum",
      "tac",
      "tail",
      "tr",
      "tsort",
      "unexpand",
      "uniq",
      "wc",
      "arch",
      "basename",
      "chroot",
      "date",
      "dirname",
      "du",
      "echo",
      "env",
      "expr",
      "factor",
      // "false", // keyword literal already
      "groups",
      "hostid",
      "id",
      "link",
      "logname",
      "nice",
      "nohup",
      "nproc",
      "pathchk",
      "pinky",
      "printenv",
      "printf",
      "pwd",
      "readlink",
      "runcon",
      "seq",
      "sleep",
      "stat",
      "stdbuf",
      "stty",
      "tee",
      "test",
      "timeout",
      // "true", // keyword literal already
      "tty",
      "uname",
      "unlink",
      "uptime",
      "users",
      "who",
      "whoami",
      "yes"
    ];

    return {
      name: 'Bash',
      aliases: [ 'sh' ],
      keywords: {
        $pattern: /\b[a-z][a-z0-9._-]+\b/,
        keyword: KEYWORDS,
        literal: LITERALS,
        built_in: [
          ...SHELL_BUILT_INS,
          ...BASH_BUILT_INS,
          // Shell modifiers
          "set",
          "shopt",
          ...ZSH_BUILT_INS,
          ...GNU_CORE_UTILS
        ]
      },
      contains: [
        KNOWN_SHEBANG, // to catch known shells and boost relevancy
        hljs.SHEBANG(), // to catch unknown shells but still highlight the shebang
        FUNCTION,
        ARITHMETIC,
        COMMENT,
        HERE_DOC,
        PATH_MODE,
        QUOTE_STRING,
        ESCAPED_QUOTE,
        APOS_STRING,
        ESCAPED_APOS,
        VAR
      ]
    };
  }

  return bash;

})();

    hljs.registerLanguage('bash', hljsGrammar);
  })();/*! `basic` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: BASIC
  Author: Raphaël Assénat <raph@raphnet.net>
  Description: Based on the BASIC reference from the Tandy 1000 guide
  Website: https://en.wikipedia.org/wiki/Tandy_1000
  Category: system
  */

  /** @type LanguageFn */
  function basic(hljs) {
    const KEYWORDS = [
      "ABS",
      "ASC",
      "AND",
      "ATN",
      "AUTO|0",
      "BEEP",
      "BLOAD|10",
      "BSAVE|10",
      "CALL",
      "CALLS",
      "CDBL",
      "CHAIN",
      "CHDIR",
      "CHR$|10",
      "CINT",
      "CIRCLE",
      "CLEAR",
      "CLOSE",
      "CLS",
      "COLOR",
      "COM",
      "COMMON",
      "CONT",
      "COS",
      "CSNG",
      "CSRLIN",
      "CVD",
      "CVI",
      "CVS",
      "DATA",
      "DATE$",
      "DEFDBL",
      "DEFINT",
      "DEFSNG",
      "DEFSTR",
      "DEF|0",
      "SEG",
      "USR",
      "DELETE",
      "DIM",
      "DRAW",
      "EDIT",
      "END",
      "ENVIRON",
      "ENVIRON$",
      "EOF",
      "EQV",
      "ERASE",
      "ERDEV",
      "ERDEV$",
      "ERL",
      "ERR",
      "ERROR",
      "EXP",
      "FIELD",
      "FILES",
      "FIX",
      "FOR|0",
      "FRE",
      "GET",
      "GOSUB|10",
      "GOTO",
      "HEX$",
      "IF",
      "THEN",
      "ELSE|0",
      "INKEY$",
      "INP",
      "INPUT",
      "INPUT#",
      "INPUT$",
      "INSTR",
      "IMP",
      "INT",
      "IOCTL",
      "IOCTL$",
      "KEY",
      "ON",
      "OFF",
      "LIST",
      "KILL",
      "LEFT$",
      "LEN",
      "LET",
      "LINE",
      "LLIST",
      "LOAD",
      "LOC",
      "LOCATE",
      "LOF",
      "LOG",
      "LPRINT",
      "USING",
      "LSET",
      "MERGE",
      "MID$",
      "MKDIR",
      "MKD$",
      "MKI$",
      "MKS$",
      "MOD",
      "NAME",
      "NEW",
      "NEXT",
      "NOISE",
      "NOT",
      "OCT$",
      "ON",
      "OR",
      "PEN",
      "PLAY",
      "STRIG",
      "OPEN",
      "OPTION",
      "BASE",
      "OUT",
      "PAINT",
      "PALETTE",
      "PCOPY",
      "PEEK",
      "PMAP",
      "POINT",
      "POKE",
      "POS",
      "PRINT",
      "PRINT]",
      "PSET",
      "PRESET",
      "PUT",
      "RANDOMIZE",
      "READ",
      "REM",
      "RENUM",
      "RESET|0",
      "RESTORE",
      "RESUME",
      "RETURN|0",
      "RIGHT$",
      "RMDIR",
      "RND",
      "RSET",
      "RUN",
      "SAVE",
      "SCREEN",
      "SGN",
      "SHELL",
      "SIN",
      "SOUND",
      "SPACE$",
      "SPC",
      "SQR",
      "STEP",
      "STICK",
      "STOP",
      "STR$",
      "STRING$",
      "SWAP",
      "SYSTEM",
      "TAB",
      "TAN",
      "TIME$",
      "TIMER",
      "TROFF",
      "TRON",
      "TO",
      "USR",
      "VAL",
      "VARPTR",
      "VARPTR$",
      "VIEW",
      "WAIT",
      "WHILE",
      "WEND",
      "WIDTH",
      "WINDOW",
      "WRITE",
      "XOR"
    ];

    return {
      name: 'BASIC',
      case_insensitive: true,
      illegal: '^\.',
      // Support explicitly typed variables that end with $%! or #.
      keywords: {
        $pattern: '[a-zA-Z][a-zA-Z0-9_$%!#]*',
        keyword: KEYWORDS
      },
      contains: [
        hljs.QUOTE_STRING_MODE,
        hljs.COMMENT('REM', '$', { relevance: 10 }),
        hljs.COMMENT('\'', '$', { relevance: 0 }),
        {
          // Match line numbers
          className: 'symbol',
          begin: '^[0-9]+ ',
          relevance: 10
        },
        {
          // Match typed numeric constants (1000, 12.34!, 1.2e5, 1.5#, 1.2D2)
          className: 'number',
          begin: '\\b\\d+(\\.\\d+)?([edED]\\d+)?[#\!]?',
          relevance: 0
        },
        {
          // Match hexadecimal numbers (&Hxxxx)
          className: 'number',
          begin: '(&[hH][0-9a-fA-F]{1,4})'
        },
        {
          // Match octal numbers (&Oxxxxxx)
          className: 'number',
          begin: '(&[oO][0-7]{1,6})'
        }
      ]
    };
  }

  return basic;

})();

    hljs.registerLanguage('basic', hljsGrammar);
  })();/*! `c` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: C
  Category: common, system
  Website: https://en.wikipedia.org/wiki/C_(programming_language)
  */

  /** @type LanguageFn */
  function c(hljs) {
    const regex = hljs.regex;
    // added for historic reasons because `hljs.C_LINE_COMMENT_MODE` does
    // not include such support nor can we be sure all the grammars depending
    // on it would desire this behavior
    const C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$', { contains: [ { begin: /\\\n/ } ] });
    const DECLTYPE_AUTO_RE = 'decltype\\(auto\\)';
    const NAMESPACE_RE = '[a-zA-Z_]\\w*::';
    const TEMPLATE_ARGUMENT_RE = '<[^<>]+>';
    const FUNCTION_TYPE_RE = '('
      + DECLTYPE_AUTO_RE + '|'
      + regex.optional(NAMESPACE_RE)
      + '[a-zA-Z_]\\w*' + regex.optional(TEMPLATE_ARGUMENT_RE)
    + ')';


    const TYPES = {
      className: 'type',
      variants: [
        { begin: '\\b[a-z\\d_]*_t\\b' },
        { match: /\batomic_[a-z]{3,6}\b/ }
      ]

    };

    // https://en.cppreference.com/w/cpp/language/escape
    // \\ \x \xFF \u2837 \u00323747 \374
    const CHARACTER_ESCAPES = '\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)';
    const STRINGS = {
      className: 'string',
      variants: [
        {
          begin: '(u8?|U|L)?"',
          end: '"',
          illegal: '\\n',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          begin: '(u8?|U|L)?\'(' + CHARACTER_ESCAPES + "|.)",
          end: '\'',
          illegal: '.'
        },
        hljs.END_SAME_AS_BEGIN({
          begin: /(?:u8?|U|L)?R"([^()\\ ]{0,16})\(/,
          end: /\)([^()\\ ]{0,16})"/
        })
      ]
    };

    const NUMBERS = {
      className: 'number',
      variants: [
        { begin: '\\b(0b[01\']+)' },
        { begin: '(-?)\\b([\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)((ll|LL|l|L)(u|U)?|(u|U)(ll|LL|l|L)?|f|F|b|B)' },
        { begin: '(-?)(\\b0[xX][a-fA-F0-9\']+|(\\b[\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)([eE][-+]?[\\d\']+)?)' }
      ],
      relevance: 0
    };

    const PREPROCESSOR = {
      className: 'meta',
      begin: /#\s*[a-z]+\b/,
      end: /$/,
      keywords: { keyword:
          'if else elif endif define undef warning error line '
          + 'pragma _Pragma ifdef ifndef include' },
      contains: [
        {
          begin: /\\\n/,
          relevance: 0
        },
        hljs.inherit(STRINGS, { className: 'string' }),
        {
          className: 'string',
          begin: /<.*?>/
        },
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE
      ]
    };

    const TITLE_MODE = {
      className: 'title',
      begin: regex.optional(NAMESPACE_RE) + hljs.IDENT_RE,
      relevance: 0
    };

    const FUNCTION_TITLE = regex.optional(NAMESPACE_RE) + hljs.IDENT_RE + '\\s*\\(';

    const C_KEYWORDS = [
      "asm",
      "auto",
      "break",
      "case",
      "continue",
      "default",
      "do",
      "else",
      "enum",
      "extern",
      "for",
      "fortran",
      "goto",
      "if",
      "inline",
      "register",
      "restrict",
      "return",
      "sizeof",
      "struct",
      "switch",
      "typedef",
      "union",
      "volatile",
      "while",
      "_Alignas",
      "_Alignof",
      "_Atomic",
      "_Generic",
      "_Noreturn",
      "_Static_assert",
      "_Thread_local",
      // aliases
      "alignas",
      "alignof",
      "noreturn",
      "static_assert",
      "thread_local",
      // not a C keyword but is, for all intents and purposes, treated exactly like one.
      "_Pragma"
    ];

    const C_TYPES = [
      "float",
      "double",
      "signed",
      "unsigned",
      "int",
      "short",
      "long",
      "char",
      "void",
      "_Bool",
      "_Complex",
      "_Imaginary",
      "_Decimal32",
      "_Decimal64",
      "_Decimal128",
      // modifiers
      "const",
      "static",
      // aliases
      "complex",
      "bool",
      "imaginary"
    ];

    const KEYWORDS = {
      keyword: C_KEYWORDS,
      type: C_TYPES,
      literal: 'true false NULL',
      // TODO: apply hinting work similar to what was done in cpp.js
      built_in: 'std string wstring cin cout cerr clog stdin stdout stderr stringstream istringstream ostringstream '
        + 'auto_ptr deque list queue stack vector map set pair bitset multiset multimap unordered_set '
        + 'unordered_map unordered_multiset unordered_multimap priority_queue make_pair array shared_ptr abort terminate abs acos '
        + 'asin atan2 atan calloc ceil cosh cos exit exp fabs floor fmod fprintf fputs free frexp '
        + 'fscanf future isalnum isalpha iscntrl isdigit isgraph islower isprint ispunct isspace isupper '
        + 'isxdigit tolower toupper labs ldexp log10 log malloc realloc memchr memcmp memcpy memset modf pow '
        + 'printf putchar puts scanf sinh sin snprintf sprintf sqrt sscanf strcat strchr strcmp '
        + 'strcpy strcspn strlen strncat strncmp strncpy strpbrk strrchr strspn strstr tanh tan '
        + 'vfprintf vprintf vsprintf endl initializer_list unique_ptr',
    };

    const EXPRESSION_CONTAINS = [
      PREPROCESSOR,
      TYPES,
      C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      NUMBERS,
      STRINGS
    ];

    const EXPRESSION_CONTEXT = {
      // This mode covers expression context where we can't expect a function
      // definition and shouldn't highlight anything that looks like one:
      // `return some()`, `else if()`, `(x*sum(1, 2))`
      variants: [
        {
          begin: /=/,
          end: /;/
        },
        {
          begin: /\(/,
          end: /\)/
        },
        {
          beginKeywords: 'new throw return else',
          end: /;/
        }
      ],
      keywords: KEYWORDS,
      contains: EXPRESSION_CONTAINS.concat([
        {
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          contains: EXPRESSION_CONTAINS.concat([ 'self' ]),
          relevance: 0
        }
      ]),
      relevance: 0
    };

    const FUNCTION_DECLARATION = {
      begin: '(' + FUNCTION_TYPE_RE + '[\\*&\\s]+)+' + FUNCTION_TITLE,
      returnBegin: true,
      end: /[{;=]/,
      excludeEnd: true,
      keywords: KEYWORDS,
      illegal: /[^\w\s\*&:<>.]/,
      contains: [
        { // to prevent it from being confused as the function title
          begin: DECLTYPE_AUTO_RE,
          keywords: KEYWORDS,
          relevance: 0
        },
        {
          begin: FUNCTION_TITLE,
          returnBegin: true,
          contains: [ hljs.inherit(TITLE_MODE, { className: "title.function" }) ],
          relevance: 0
        },
        // allow for multiple declarations, e.g.:
        // extern void f(int), g(char);
        {
          relevance: 0,
          match: /,/
        },
        {
          className: 'params',
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          relevance: 0,
          contains: [
            C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
            STRINGS,
            NUMBERS,
            TYPES,
            // Count matching parentheses.
            {
              begin: /\(/,
              end: /\)/,
              keywords: KEYWORDS,
              relevance: 0,
              contains: [
                'self',
                C_LINE_COMMENT_MODE,
                hljs.C_BLOCK_COMMENT_MODE,
                STRINGS,
                NUMBERS,
                TYPES
              ]
            }
          ]
        },
        TYPES,
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        PREPROCESSOR
      ]
    };

    return {
      name: "C",
      aliases: [ 'h' ],
      keywords: KEYWORDS,
      // Until differentiations are added between `c` and `cpp`, `c` will
      // not be auto-detected to avoid auto-detect conflicts between C and C++
      disableAutodetect: true,
      illegal: '</',
      contains: [].concat(
        EXPRESSION_CONTEXT,
        FUNCTION_DECLARATION,
        EXPRESSION_CONTAINS,
        [
          PREPROCESSOR,
          {
            begin: hljs.IDENT_RE + '::',
            keywords: KEYWORDS
          },
          {
            className: 'class',
            beginKeywords: 'enum class struct union',
            end: /[{;:<>=]/,
            contains: [
              { beginKeywords: "final class struct" },
              hljs.TITLE_MODE
            ]
          }
        ]),
      exports: {
        preprocessor: PREPROCESSOR,
        strings: STRINGS,
        keywords: KEYWORDS
      }
    };
  }

  return c;

})();

    hljs.registerLanguage('c', hljsGrammar);
  })();/*! `cal` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: C/AL
  Author: Kenneth Fuglsang Christensen <kfuglsang@gmail.com>
  Description: Provides highlighting of Microsoft Dynamics NAV C/AL code files
  Website: https://docs.microsoft.com/en-us/dynamics-nav/programming-in-c-al
  Category: enterprise
  */

  /** @type LanguageFn */
  function cal(hljs) {
    const regex = hljs.regex;
    const KEYWORDS = [
      "div",
      "mod",
      "in",
      "and",
      "or",
      "not",
      "xor",
      "asserterror",
      "begin",
      "case",
      "do",
      "downto",
      "else",
      "end",
      "exit",
      "for",
      "local",
      "if",
      "of",
      "repeat",
      "then",
      "to",
      "until",
      "while",
      "with",
      "var"
    ];
    const LITERALS = 'false true';
    const COMMENT_MODES = [
      hljs.C_LINE_COMMENT_MODE,
      hljs.COMMENT(
        /\{/,
        /\}/,
        { relevance: 0 }
      ),
      hljs.COMMENT(
        /\(\*/,
        /\*\)/,
        { relevance: 10 }
      )
    ];
    const STRING = {
      className: 'string',
      begin: /'/,
      end: /'/,
      contains: [ { begin: /''/ } ]
    };
    const CHAR_STRING = {
      className: 'string',
      begin: /(#\d+)+/
    };
    const DATE = {
      className: 'number',
      begin: '\\b\\d+(\\.\\d+)?(DT|D|T)',
      relevance: 0
    };
    const DBL_QUOTED_VARIABLE = {
      className: 'string', // not a string technically but makes sense to be highlighted in the same style
      begin: '"',
      end: '"'
    };

    const PROCEDURE = {
      match: [
        /procedure/,
        /\s+/,
        /[a-zA-Z_][\w@]*/,
        /\s*/
      ],
      scope: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        {
          className: 'params',
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          contains: [
            STRING,
            CHAR_STRING,
            hljs.NUMBER_MODE
          ]
        },
        ...COMMENT_MODES
      ]
    };

    const OBJECT_TYPES = [
      "Table",
      "Form",
      "Report",
      "Dataport",
      "Codeunit",
      "XMLport",
      "MenuSuite",
      "Page",
      "Query"
    ];
    const OBJECT = {
      match: [
        /OBJECT/,
        /\s+/,
        regex.either(...OBJECT_TYPES),
        /\s+/,
        /\d+/,
        /\s+(?=[^\s])/,
        /.*/,
        /$/
      ],
      relevance: 3,
      scope: {
        1: "keyword",
        3: "type",
        5: "number",
        7: "title"
      }
    };

    const PROPERTY = {
      match: /[\w]+(?=\=)/,
      scope: "attribute",
      relevance: 0
    };

    return {
      name: 'C/AL',
      case_insensitive: true,
      keywords: {
        keyword: KEYWORDS,
        literal: LITERALS
      },
      illegal: /\/\*/,
      contains: [
        PROPERTY,
        STRING,
        CHAR_STRING,
        DATE,
        DBL_QUOTED_VARIABLE,
        hljs.NUMBER_MODE,
        OBJECT,
        PROCEDURE
      ]
    };
  }

  return cal;

})();

    hljs.registerLanguage('cal', hljsGrammar);
  })();/*! `capnproto` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Cap’n Proto
  Author: Oleg Efimov <efimovov@gmail.com>
  Description: Cap’n Proto message definition format
  Website: https://capnproto.org/capnp-tool.html
  Category: protocols
  */

  /** @type LanguageFn */
  function capnproto(hljs) {
    const KEYWORDS = [
      "struct",
      "enum",
      "interface",
      "union",
      "group",
      "import",
      "using",
      "const",
      "annotation",
      "extends",
      "in",
      "of",
      "on",
      "as",
      "with",
      "from",
      "fixed"
    ];
    const TYPES = [
      "Void",
      "Bool",
      "Int8",
      "Int16",
      "Int32",
      "Int64",
      "UInt8",
      "UInt16",
      "UInt32",
      "UInt64",
      "Float32",
      "Float64",
      "Text",
      "Data",
      "AnyPointer",
      "AnyStruct",
      "Capability",
      "List"
    ];
    const LITERALS = [
      "true",
      "false"
    ];
    const CLASS_DEFINITION = {
      variants: [
        { match: [
          /(struct|enum|interface)/,
          /\s+/,
          hljs.IDENT_RE
        ] },
        { match: [
          /extends/,
          /\s*\(/,
          hljs.IDENT_RE,
          /\s*\)/
        ] }
      ],
      scope: {
        1: "keyword",
        3: "title.class"
      }
    };
    return {
      name: 'Cap’n Proto',
      aliases: [ 'capnp' ],
      keywords: {
        keyword: KEYWORDS,
        type: TYPES,
        literal: LITERALS
      },
      contains: [
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
        hljs.HASH_COMMENT_MODE,
        {
          className: 'meta',
          begin: /@0x[\w\d]{16};/,
          illegal: /\n/
        },
        {
          className: 'symbol',
          begin: /@\d+\b/
        },
        CLASS_DEFINITION
      ]
    };
  }

  return capnproto;

})();

    hljs.registerLanguage('capnproto', hljsGrammar);
  })();/*! `clean` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Clean
  Author: Camil Staps <info@camilstaps.nl>
  Category: functional
  Website: http://clean.cs.ru.nl
  */

  /** @type LanguageFn */
  function clean(hljs) {
    const KEYWORDS = [
      "if",
      "let",
      "in",
      "with",
      "where",
      "case",
      "of",
      "class",
      "instance",
      "otherwise",
      "implementation",
      "definition",
      "system",
      "module",
      "from",
      "import",
      "qualified",
      "as",
      "special",
      "code",
      "inline",
      "foreign",
      "export",
      "ccall",
      "stdcall",
      "generic",
      "derive",
      "infix",
      "infixl",
      "infixr"
    ];
    return {
      name: 'Clean',
      aliases: [
        'icl',
        'dcl'
      ],
      keywords: {
        keyword: KEYWORDS,
        built_in:
          'Int Real Char Bool',
        literal:
          'True False'
      },
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.C_NUMBER_MODE,
        { // relevance booster
          begin: '->|<-[|:]?|#!?|>>=|\\{\\||\\|\\}|:==|=:|<>' }
      ]
    };
  }

  return clean;

})();

    hljs.registerLanguage('clean', hljsGrammar);
  })();/*! `clojure` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Clojure
  Description: Clojure syntax (based on lisp.js)
  Author: mfornos
  Website: https://clojure.org
  Category: lisp
  */

  /** @type LanguageFn */
  function clojure(hljs) {
    const SYMBOLSTART = 'a-zA-Z_\\-!.?+*=<>&\'';
    const SYMBOL_RE = '[#]?[' + SYMBOLSTART + '][' + SYMBOLSTART + '0-9/;:$#]*';
    const globals = 'def defonce defprotocol defstruct defmulti defmethod defn- defn defmacro deftype defrecord';
    const keywords = {
      $pattern: SYMBOL_RE,
      built_in:
        // Clojure keywords
        globals + ' '
        + 'cond apply if-not if-let if not not= =|0 <|0 >|0 <=|0 >=|0 ==|0 +|0 /|0 *|0 -|0 rem '
        + 'quot neg? pos? delay? symbol? keyword? true? false? integer? empty? coll? list? '
        + 'set? ifn? fn? associative? sequential? sorted? counted? reversible? number? decimal? '
        + 'class? distinct? isa? float? rational? reduced? ratio? odd? even? char? seq? vector? '
        + 'string? map? nil? contains? zero? instance? not-every? not-any? libspec? -> ->> .. . '
        + 'inc compare do dotimes mapcat take remove take-while drop letfn drop-last take-last '
        + 'drop-while while intern condp case reduced cycle split-at split-with repeat replicate '
        + 'iterate range merge zipmap declare line-seq sort comparator sort-by dorun doall nthnext '
        + 'nthrest partition eval doseq await await-for let agent atom send send-off release-pending-sends '
        + 'add-watch mapv filterv remove-watch agent-error restart-agent set-error-handler error-handler '
        + 'set-error-mode! error-mode shutdown-agents quote var fn loop recur throw try monitor-enter '
        + 'monitor-exit macroexpand macroexpand-1 for dosync and or '
        + 'when when-not when-let comp juxt partial sequence memoize constantly complement identity assert '
        + 'peek pop doto proxy first rest cons cast coll last butlast '
        + 'sigs reify second ffirst fnext nfirst nnext meta with-meta ns in-ns create-ns import '
        + 'refer keys select-keys vals key val rseq name namespace promise into transient persistent! conj! '
        + 'assoc! dissoc! pop! disj! use class type num float double short byte boolean bigint biginteger '
        + 'bigdec print-method print-dup throw-if printf format load compile get-in update-in pr pr-on newline '
        + 'flush read slurp read-line subvec with-open memfn time re-find re-groups rand-int rand mod locking '
        + 'assert-valid-fdecl alias resolve ref deref refset swap! reset! set-validator! compare-and-set! alter-meta! '
        + 'reset-meta! commute get-validator alter ref-set ref-history-count ref-min-history ref-max-history ensure sync io! '
        + 'new next conj set! to-array future future-call into-array aset gen-class reduce map filter find empty '
        + 'hash-map hash-set sorted-map sorted-map-by sorted-set sorted-set-by vec vector seq flatten reverse assoc dissoc list '
        + 'disj get union difference intersection extend extend-type extend-protocol int nth delay count concat chunk chunk-buffer '
        + 'chunk-append chunk-first chunk-rest max min dec unchecked-inc-int unchecked-inc unchecked-dec-inc unchecked-dec unchecked-negate '
        + 'unchecked-add-int unchecked-add unchecked-subtract-int unchecked-subtract chunk-next chunk-cons chunked-seq? prn vary-meta '
        + 'lazy-seq spread list* str find-keyword keyword symbol gensym force rationalize'
    };

    const SYMBOL = {
      begin: SYMBOL_RE,
      relevance: 0
    };
    const NUMBER = {
      scope: 'number',
      relevance: 0,
      variants: [
        { match: /[-+]?0[xX][0-9a-fA-F]+N?/ }, // hexadecimal                 // 0x2a
        { match: /[-+]?0[0-7]+N?/ }, // octal                       // 052
        { match: /[-+]?[1-9][0-9]?[rR][0-9a-zA-Z]+N?/ }, // variable radix from 2 to 36 // 2r101010, 8r52, 36r16
        { match: /[-+]?[0-9]+\/[0-9]+N?/ }, // ratio                       // 1/2
        { match: /[-+]?[0-9]+((\.[0-9]*([eE][+-]?[0-9]+)?M?)|([eE][+-]?[0-9]+M?|M))/ }, // float        // 0.42 4.2E-1M 42E1 42M
        { match: /[-+]?([1-9][0-9]*|0)N?/ }, // int (don't match leading 0) // 42 42N
      ]
    };
    const CHARACTER = {
      scope: 'character',
      variants: [
        { match: /\\o[0-3]?[0-7]{1,2}/ }, // Unicode Octal 0 - 377
        { match: /\\u[0-9a-fA-F]{4}/ }, // Unicode Hex 0000 - FFFF
        { match: /\\(newline|space|tab|formfeed|backspace|return)/ }, // special characters
        {
          match: /\\\S/,
          relevance: 0
        } // any non-whitespace char
      ]
    };
    const REGEX = {
      scope: 'regex',
      begin: /#"/,
      end: /"/,
      contains: [ hljs.BACKSLASH_ESCAPE ]
    };
    const STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null });
    const COMMA = {
      scope: 'punctuation',
      match: /,/,
      relevance: 0
    };
    const COMMENT = hljs.COMMENT(
      ';',
      '$',
      { relevance: 0 }
    );
    const LITERAL = {
      className: 'literal',
      begin: /\b(true|false|nil)\b/
    };
    const COLLECTION = {
      begin: "\\[|(#::?" + SYMBOL_RE + ")?\\{",
      end: '[\\]\\}]',
      relevance: 0
    };
    const KEY = {
      className: 'symbol',
      begin: '[:]{1,2}' + SYMBOL_RE
    };
    const LIST = {
      begin: '\\(',
      end: '\\)'
    };
    const BODY = {
      endsWithParent: true,
      relevance: 0
    };
    const NAME = {
      keywords: keywords,
      className: 'name',
      begin: SYMBOL_RE,
      relevance: 0,
      starts: BODY
    };
    const DEFAULT_CONTAINS = [
      COMMA,
      LIST,
      CHARACTER,
      REGEX,
      STRING,
      COMMENT,
      KEY,
      COLLECTION,
      NUMBER,
      LITERAL,
      SYMBOL
    ];

    const GLOBAL = {
      beginKeywords: globals,
      keywords: {
        $pattern: SYMBOL_RE,
        keyword: globals
      },
      end: '(\\[|#|\\d|"|:|\\{|\\)|\\(|$)',
      contains: [
        {
          className: 'title',
          begin: SYMBOL_RE,
          relevance: 0,
          excludeEnd: true,
          // we can only have a single title
          endsParent: true
        }
      ].concat(DEFAULT_CONTAINS)
    };

    LIST.contains = [
      GLOBAL,
      NAME,
      BODY
    ];
    BODY.contains = DEFAULT_CONTAINS;
    COLLECTION.contains = DEFAULT_CONTAINS;

    return {
      name: 'Clojure',
      aliases: [
        'clj',
        'edn'
      ],
      illegal: /\S/,
      contains: [
        COMMA,
        LIST,
        CHARACTER,
        REGEX,
        STRING,
        COMMENT,
        KEY,
        COLLECTION,
        NUMBER,
        LITERAL
      ]
    };
  }

  return clojure;

})();

    hljs.registerLanguage('clojure', hljsGrammar);
  })();/*! `clojure-repl` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Clojure REPL
  Description: Clojure REPL sessions
  Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Requires: clojure.js
  Website: https://clojure.org
  Category: lisp
  */

  /** @type LanguageFn */
  function clojureRepl(hljs) {
    return {
      name: 'Clojure REPL',
      contains: [
        {
          className: 'meta.prompt',
          begin: /^([\w.-]+|\s*#_)?=>/,
          starts: {
            end: /$/,
            subLanguage: 'clojure'
          }
        }
      ]
    };
  }

  return clojureRepl;

})();

    hljs.registerLanguage('clojure-repl', hljsGrammar);
  })();/*! `cpp` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: C++
  Category: common, system
  Website: https://isocpp.org
  */

  /** @type LanguageFn */
  function cpp(hljs) {
    const regex = hljs.regex;
    // added for historic reasons because `hljs.C_LINE_COMMENT_MODE` does
    // not include such support nor can we be sure all the grammars depending
    // on it would desire this behavior
    const C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$', { contains: [ { begin: /\\\n/ } ] });
    const DECLTYPE_AUTO_RE = 'decltype\\(auto\\)';
    const NAMESPACE_RE = '[a-zA-Z_]\\w*::';
    const TEMPLATE_ARGUMENT_RE = '<[^<>]+>';
    const FUNCTION_TYPE_RE = '(?!struct)('
      + DECLTYPE_AUTO_RE + '|'
      + regex.optional(NAMESPACE_RE)
      + '[a-zA-Z_]\\w*' + regex.optional(TEMPLATE_ARGUMENT_RE)
    + ')';

    const CPP_PRIMITIVE_TYPES = {
      className: 'type',
      begin: '\\b[a-z\\d_]*_t\\b'
    };

    // https://en.cppreference.com/w/cpp/language/escape
    // \\ \x \xFF \u2837 \u00323747 \374
    const CHARACTER_ESCAPES = '\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)';
    const STRINGS = {
      className: 'string',
      variants: [
        {
          begin: '(u8?|U|L)?"',
          end: '"',
          illegal: '\\n',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          begin: '(u8?|U|L)?\'(' + CHARACTER_ESCAPES + '|.)',
          end: '\'',
          illegal: '.'
        },
        hljs.END_SAME_AS_BEGIN({
          begin: /(?:u8?|U|L)?R"([^()\\ ]{0,16})\(/,
          end: /\)([^()\\ ]{0,16})"/
        })
      ]
    };

    const NUMBERS = {
      className: 'number',
      variants: [
        // Floating-point literal.
        { begin:
          "[+-]?(?:" // Leading sign.
            // Decimal.
            + "(?:"
              +"[0-9](?:'?[0-9])*\\.(?:[0-9](?:'?[0-9])*)?"
              + "|\\.[0-9](?:'?[0-9])*"
            + ")(?:[Ee][+-]?[0-9](?:'?[0-9])*)?"
            + "|[0-9](?:'?[0-9])*[Ee][+-]?[0-9](?:'?[0-9])*"
            // Hexadecimal.
            + "|0[Xx](?:"
              +"[0-9A-Fa-f](?:'?[0-9A-Fa-f])*(?:\\.(?:[0-9A-Fa-f](?:'?[0-9A-Fa-f])*)?)?"
              + "|\\.[0-9A-Fa-f](?:'?[0-9A-Fa-f])*"
            + ")[Pp][+-]?[0-9](?:'?[0-9])*"
          + ")(?:" // Literal suffixes.
            + "[Ff](?:16|32|64|128)?"
            + "|(BF|bf)16"
            + "|[Ll]"
            + "|" // Literal suffix is optional.
          + ")"
        },
        // Integer literal.
        { begin:
          "[+-]?\\b(?:" // Leading sign.
            + "0[Bb][01](?:'?[01])*" // Binary.
            + "|0[Xx][0-9A-Fa-f](?:'?[0-9A-Fa-f])*" // Hexadecimal.
            + "|0(?:'?[0-7])*" // Octal or just a lone zero.
            + "|[1-9](?:'?[0-9])*" // Decimal.
          + ")(?:" // Literal suffixes.
            + "[Uu](?:LL?|ll?)"
            + "|[Uu][Zz]?"
            + "|(?:LL?|ll?)[Uu]?"
            + "|[Zz][Uu]"
            + "|" // Literal suffix is optional.
          + ")"
          // Note: there are user-defined literal suffixes too, but perhaps having the custom suffix not part of the
          // literal highlight actually makes it stand out more.
        }
      ],
      relevance: 0
    };

    const PREPROCESSOR = {
      className: 'meta',
      begin: /#\s*[a-z]+\b/,
      end: /$/,
      keywords: { keyword:
          'if else elif endif define undef warning error line '
          + 'pragma _Pragma ifdef ifndef include' },
      contains: [
        {
          begin: /\\\n/,
          relevance: 0
        },
        hljs.inherit(STRINGS, { className: 'string' }),
        {
          className: 'string',
          begin: /<.*?>/
        },
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE
      ]
    };

    const TITLE_MODE = {
      className: 'title',
      begin: regex.optional(NAMESPACE_RE) + hljs.IDENT_RE,
      relevance: 0
    };

    const FUNCTION_TITLE = regex.optional(NAMESPACE_RE) + hljs.IDENT_RE + '\\s*\\(';

    // https://en.cppreference.com/w/cpp/keyword
    const RESERVED_KEYWORDS = [
      'alignas',
      'alignof',
      'and',
      'and_eq',
      'asm',
      'atomic_cancel',
      'atomic_commit',
      'atomic_noexcept',
      'auto',
      'bitand',
      'bitor',
      'break',
      'case',
      'catch',
      'class',
      'co_await',
      'co_return',
      'co_yield',
      'compl',
      'concept',
      'const_cast|10',
      'consteval',
      'constexpr',
      'constinit',
      'continue',
      'decltype',
      'default',
      'delete',
      'do',
      'dynamic_cast|10',
      'else',
      'enum',
      'explicit',
      'export',
      'extern',
      'false',
      'final',
      'for',
      'friend',
      'goto',
      'if',
      'import',
      'inline',
      'module',
      'mutable',
      'namespace',
      'new',
      'noexcept',
      'not',
      'not_eq',
      'nullptr',
      'operator',
      'or',
      'or_eq',
      'override',
      'private',
      'protected',
      'public',
      'reflexpr',
      'register',
      'reinterpret_cast|10',
      'requires',
      'return',
      'sizeof',
      'static_assert',
      'static_cast|10',
      'struct',
      'switch',
      'synchronized',
      'template',
      'this',
      'thread_local',
      'throw',
      'transaction_safe',
      'transaction_safe_dynamic',
      'true',
      'try',
      'typedef',
      'typeid',
      'typename',
      'union',
      'using',
      'virtual',
      'volatile',
      'while',
      'xor',
      'xor_eq'
    ];

    // https://en.cppreference.com/w/cpp/keyword
    const RESERVED_TYPES = [
      'bool',
      'char',
      'char16_t',
      'char32_t',
      'char8_t',
      'double',
      'float',
      'int',
      'long',
      'short',
      'void',
      'wchar_t',
      'unsigned',
      'signed',
      'const',
      'static'
    ];

    const TYPE_HINTS = [
      'any',
      'auto_ptr',
      'barrier',
      'binary_semaphore',
      'bitset',
      'complex',
      'condition_variable',
      'condition_variable_any',
      'counting_semaphore',
      'deque',
      'false_type',
      'future',
      'imaginary',
      'initializer_list',
      'istringstream',
      'jthread',
      'latch',
      'lock_guard',
      'multimap',
      'multiset',
      'mutex',
      'optional',
      'ostringstream',
      'packaged_task',
      'pair',
      'promise',
      'priority_queue',
      'queue',
      'recursive_mutex',
      'recursive_timed_mutex',
      'scoped_lock',
      'set',
      'shared_future',
      'shared_lock',
      'shared_mutex',
      'shared_timed_mutex',
      'shared_ptr',
      'stack',
      'string_view',
      'stringstream',
      'timed_mutex',
      'thread',
      'true_type',
      'tuple',
      'unique_lock',
      'unique_ptr',
      'unordered_map',
      'unordered_multimap',
      'unordered_multiset',
      'unordered_set',
      'variant',
      'vector',
      'weak_ptr',
      'wstring',
      'wstring_view'
    ];

    const FUNCTION_HINTS = [
      'abort',
      'abs',
      'acos',
      'apply',
      'as_const',
      'asin',
      'atan',
      'atan2',
      'calloc',
      'ceil',
      'cerr',
      'cin',
      'clog',
      'cos',
      'cosh',
      'cout',
      'declval',
      'endl',
      'exchange',
      'exit',
      'exp',
      'fabs',
      'floor',
      'fmod',
      'forward',
      'fprintf',
      'fputs',
      'free',
      'frexp',
      'fscanf',
      'future',
      'invoke',
      'isalnum',
      'isalpha',
      'iscntrl',
      'isdigit',
      'isgraph',
      'islower',
      'isprint',
      'ispunct',
      'isspace',
      'isupper',
      'isxdigit',
      'labs',
      'launder',
      'ldexp',
      'log',
      'log10',
      'make_pair',
      'make_shared',
      'make_shared_for_overwrite',
      'make_tuple',
      'make_unique',
      'malloc',
      'memchr',
      'memcmp',
      'memcpy',
      'memset',
      'modf',
      'move',
      'pow',
      'printf',
      'putchar',
      'puts',
      'realloc',
      'scanf',
      'sin',
      'sinh',
      'snprintf',
      'sprintf',
      'sqrt',
      'sscanf',
      'std',
      'stderr',
      'stdin',
      'stdout',
      'strcat',
      'strchr',
      'strcmp',
      'strcpy',
      'strcspn',
      'strlen',
      'strncat',
      'strncmp',
      'strncpy',
      'strpbrk',
      'strrchr',
      'strspn',
      'strstr',
      'swap',
      'tan',
      'tanh',
      'terminate',
      'to_underlying',
      'tolower',
      'toupper',
      'vfprintf',
      'visit',
      'vprintf',
      'vsprintf'
    ];

    const LITERALS = [
      'NULL',
      'false',
      'nullopt',
      'nullptr',
      'true'
    ];

    // https://en.cppreference.com/w/cpp/keyword
    const BUILT_IN = [ '_Pragma' ];

    const CPP_KEYWORDS = {
      type: RESERVED_TYPES,
      keyword: RESERVED_KEYWORDS,
      literal: LITERALS,
      built_in: BUILT_IN,
      _type_hints: TYPE_HINTS
    };

    const FUNCTION_DISPATCH = {
      className: 'function.dispatch',
      relevance: 0,
      keywords: {
        // Only for relevance, not highlighting.
        _hint: FUNCTION_HINTS },
      begin: regex.concat(
        /\b/,
        /(?!decltype)/,
        /(?!if)/,
        /(?!for)/,
        /(?!switch)/,
        /(?!while)/,
        hljs.IDENT_RE,
        regex.lookahead(/(<[^<>]+>|)\s*\(/))
    };

    const EXPRESSION_CONTAINS = [
      FUNCTION_DISPATCH,
      PREPROCESSOR,
      CPP_PRIMITIVE_TYPES,
      C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      NUMBERS,
      STRINGS
    ];

    const EXPRESSION_CONTEXT = {
      // This mode covers expression context where we can't expect a function
      // definition and shouldn't highlight anything that looks like one:
      // `return some()`, `else if()`, `(x*sum(1, 2))`
      variants: [
        {
          begin: /=/,
          end: /;/
        },
        {
          begin: /\(/,
          end: /\)/
        },
        {
          beginKeywords: 'new throw return else',
          end: /;/
        }
      ],
      keywords: CPP_KEYWORDS,
      contains: EXPRESSION_CONTAINS.concat([
        {
          begin: /\(/,
          end: /\)/,
          keywords: CPP_KEYWORDS,
          contains: EXPRESSION_CONTAINS.concat([ 'self' ]),
          relevance: 0
        }
      ]),
      relevance: 0
    };

    const FUNCTION_DECLARATION = {
      className: 'function',
      begin: '(' + FUNCTION_TYPE_RE + '[\\*&\\s]+)+' + FUNCTION_TITLE,
      returnBegin: true,
      end: /[{;=]/,
      excludeEnd: true,
      keywords: CPP_KEYWORDS,
      illegal: /[^\w\s\*&:<>.]/,
      contains: [
        { // to prevent it from being confused as the function title
          begin: DECLTYPE_AUTO_RE,
          keywords: CPP_KEYWORDS,
          relevance: 0
        },
        {
          begin: FUNCTION_TITLE,
          returnBegin: true,
          contains: [ TITLE_MODE ],
          relevance: 0
        },
        // needed because we do not have look-behind on the below rule
        // to prevent it from grabbing the final : in a :: pair
        {
          begin: /::/,
          relevance: 0
        },
        // initializers
        {
          begin: /:/,
          endsWithParent: true,
          contains: [
            STRINGS,
            NUMBERS
          ]
        },
        // allow for multiple declarations, e.g.:
        // extern void f(int), g(char);
        {
          relevance: 0,
          match: /,/
        },
        {
          className: 'params',
          begin: /\(/,
          end: /\)/,
          keywords: CPP_KEYWORDS,
          relevance: 0,
          contains: [
            C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
            STRINGS,
            NUMBERS,
            CPP_PRIMITIVE_TYPES,
            // Count matching parentheses.
            {
              begin: /\(/,
              end: /\)/,
              keywords: CPP_KEYWORDS,
              relevance: 0,
              contains: [
                'self',
                C_LINE_COMMENT_MODE,
                hljs.C_BLOCK_COMMENT_MODE,
                STRINGS,
                NUMBERS,
                CPP_PRIMITIVE_TYPES
              ]
            }
          ]
        },
        CPP_PRIMITIVE_TYPES,
        C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        PREPROCESSOR
      ]
    };

    return {
      name: 'C++',
      aliases: [
        'cc',
        'c++',
        'h++',
        'hpp',
        'hh',
        'hxx',
        'cxx'
      ],
      keywords: CPP_KEYWORDS,
      illegal: '</',
      classNameAliases: { 'function.dispatch': 'built_in' },
      contains: [].concat(
        EXPRESSION_CONTEXT,
        FUNCTION_DECLARATION,
        FUNCTION_DISPATCH,
        EXPRESSION_CONTAINS,
        [
          PREPROCESSOR,
          { // containers: ie, `vector <int> rooms (9);`
            begin: '\\b(deque|list|queue|priority_queue|pair|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array|tuple|optional|variant|function)\\s*<(?!<)',
            end: '>',
            keywords: CPP_KEYWORDS,
            contains: [
              'self',
              CPP_PRIMITIVE_TYPES
            ]
          },
          {
            begin: hljs.IDENT_RE + '::',
            keywords: CPP_KEYWORDS
          },
          {
            match: [
              // extra complexity to deal with `enum class` and `enum struct`
              /\b(?:enum(?:\s+(?:class|struct))?|class|struct|union)/,
              /\s+/,
              /\w+/
            ],
            className: {
              1: 'keyword',
              3: 'title.class'
            }
          }
        ])
    };
  }

  return cpp;

})();

    hljs.registerLanguage('cpp', hljsGrammar);
  })();/*! `csharp` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: C#
  Author: Jason Diamond <jason@diamond.name>
  Contributor: Nicolas LLOBERA <nllobera@gmail.com>, Pieter Vantorre <pietervantorre@gmail.com>, David Pine <david.pine@microsoft.com>
  Website: https://docs.microsoft.com/dotnet/csharp/
  Category: common
  */

  /** @type LanguageFn */
  function csharp(hljs) {
    const BUILT_IN_KEYWORDS = [
      'bool',
      'byte',
      'char',
      'decimal',
      'delegate',
      'double',
      'dynamic',
      'enum',
      'float',
      'int',
      'long',
      'nint',
      'nuint',
      'object',
      'sbyte',
      'short',
      'string',
      'ulong',
      'uint',
      'ushort'
    ];
    const FUNCTION_MODIFIERS = [
      'public',
      'private',
      'protected',
      'static',
      'internal',
      'protected',
      'abstract',
      'async',
      'extern',
      'override',
      'unsafe',
      'virtual',
      'new',
      'sealed',
      'partial'
    ];
    const LITERAL_KEYWORDS = [
      'default',
      'false',
      'null',
      'true'
    ];
    const NORMAL_KEYWORDS = [
      'abstract',
      'as',
      'base',
      'break',
      'case',
      'catch',
      'class',
      'const',
      'continue',
      'do',
      'else',
      'event',
      'explicit',
      'extern',
      'finally',
      'fixed',
      'for',
      'foreach',
      'goto',
      'if',
      'implicit',
      'in',
      'interface',
      'internal',
      'is',
      'lock',
      'namespace',
      'new',
      'operator',
      'out',
      'override',
      'params',
      'private',
      'protected',
      'public',
      'readonly',
      'record',
      'ref',
      'return',
      'scoped',
      'sealed',
      'sizeof',
      'stackalloc',
      'static',
      'struct',
      'switch',
      'this',
      'throw',
      'try',
      'typeof',
      'unchecked',
      'unsafe',
      'using',
      'virtual',
      'void',
      'volatile',
      'while'
    ];
    const CONTEXTUAL_KEYWORDS = [
      'add',
      'alias',
      'and',
      'ascending',
      'async',
      'await',
      'by',
      'descending',
      'equals',
      'from',
      'get',
      'global',
      'group',
      'init',
      'into',
      'join',
      'let',
      'nameof',
      'not',
      'notnull',
      'on',
      'or',
      'orderby',
      'partial',
      'remove',
      'select',
      'set',
      'unmanaged',
      'value|0',
      'var',
      'when',
      'where',
      'with',
      'yield'
    ];

    const KEYWORDS = {
      keyword: NORMAL_KEYWORDS.concat(CONTEXTUAL_KEYWORDS),
      built_in: BUILT_IN_KEYWORDS,
      literal: LITERAL_KEYWORDS
    };
    const TITLE_MODE = hljs.inherit(hljs.TITLE_MODE, { begin: '[a-zA-Z](\\.?\\w)*' });
    const NUMBERS = {
      className: 'number',
      variants: [
        { begin: '\\b(0b[01\']+)' },
        { begin: '(-?)\\b([\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)(u|U|l|L|ul|UL|f|F|b|B)' },
        { begin: '(-?)(\\b0[xX][a-fA-F0-9\']+|(\\b[\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)([eE][-+]?[\\d\']+)?)' }
      ],
      relevance: 0
    };
    const VERBATIM_STRING = {
      className: 'string',
      begin: '@"',
      end: '"',
      contains: [ { begin: '""' } ]
    };
    const VERBATIM_STRING_NO_LF = hljs.inherit(VERBATIM_STRING, { illegal: /\n/ });
    const SUBST = {
      className: 'subst',
      begin: /\{/,
      end: /\}/,
      keywords: KEYWORDS
    };
    const SUBST_NO_LF = hljs.inherit(SUBST, { illegal: /\n/ });
    const INTERPOLATED_STRING = {
      className: 'string',
      begin: /\$"/,
      end: '"',
      illegal: /\n/,
      contains: [
        { begin: /\{\{/ },
        { begin: /\}\}/ },
        hljs.BACKSLASH_ESCAPE,
        SUBST_NO_LF
      ]
    };
    const INTERPOLATED_VERBATIM_STRING = {
      className: 'string',
      begin: /\$@"/,
      end: '"',
      contains: [
        { begin: /\{\{/ },
        { begin: /\}\}/ },
        { begin: '""' },
        SUBST
      ]
    };
    const INTERPOLATED_VERBATIM_STRING_NO_LF = hljs.inherit(INTERPOLATED_VERBATIM_STRING, {
      illegal: /\n/,
      contains: [
        { begin: /\{\{/ },
        { begin: /\}\}/ },
        { begin: '""' },
        SUBST_NO_LF
      ]
    });
    SUBST.contains = [
      INTERPOLATED_VERBATIM_STRING,
      INTERPOLATED_STRING,
      VERBATIM_STRING,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      NUMBERS,
      hljs.C_BLOCK_COMMENT_MODE
    ];
    SUBST_NO_LF.contains = [
      INTERPOLATED_VERBATIM_STRING_NO_LF,
      INTERPOLATED_STRING,
      VERBATIM_STRING_NO_LF,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      NUMBERS,
      hljs.inherit(hljs.C_BLOCK_COMMENT_MODE, { illegal: /\n/ })
    ];
    const STRING = { variants: [
      INTERPOLATED_VERBATIM_STRING,
      INTERPOLATED_STRING,
      VERBATIM_STRING,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE
    ] };

    const GENERIC_MODIFIER = {
      begin: "<",
      end: ">",
      contains: [
        { beginKeywords: "in out" },
        TITLE_MODE
      ]
    };
    const TYPE_IDENT_RE = hljs.IDENT_RE + '(<' + hljs.IDENT_RE + '(\\s*,\\s*' + hljs.IDENT_RE + ')*>)?(\\[\\])?';
    const AT_IDENTIFIER = {
      // prevents expressions like `@class` from incorrect flagging
      // `class` as a keyword
      begin: "@" + hljs.IDENT_RE,
      relevance: 0
    };

    return {
      name: 'C#',
      aliases: [
        'cs',
        'c#'
      ],
      keywords: KEYWORDS,
      illegal: /::/,
      contains: [
        hljs.COMMENT(
          '///',
          '$',
          {
            returnBegin: true,
            contains: [
              {
                className: 'doctag',
                variants: [
                  {
                    begin: '///',
                    relevance: 0
                  },
                  { begin: '<!--|-->' },
                  {
                    begin: '</?',
                    end: '>'
                  }
                ]
              }
            ]
          }
        ),
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: 'meta',
          begin: '#',
          end: '$',
          keywords: { keyword: 'if else elif endif define undef warning error line region endregion pragma checksum' }
        },
        STRING,
        NUMBERS,
        {
          beginKeywords: 'class interface',
          relevance: 0,
          end: /[{;=]/,
          illegal: /[^\s:,]/,
          contains: [
            { beginKeywords: "where class" },
            TITLE_MODE,
            GENERIC_MODIFIER,
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        {
          beginKeywords: 'namespace',
          relevance: 0,
          end: /[{;=]/,
          illegal: /[^\s:]/,
          contains: [
            TITLE_MODE,
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        {
          beginKeywords: 'record',
          relevance: 0,
          end: /[{;=]/,
          illegal: /[^\s:]/,
          contains: [
            TITLE_MODE,
            GENERIC_MODIFIER,
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        {
          // [Attributes("")]
          className: 'meta',
          begin: '^\\s*\\[(?=[\\w])',
          excludeBegin: true,
          end: '\\]',
          excludeEnd: true,
          contains: [
            {
              className: 'string',
              begin: /"/,
              end: /"/
            }
          ]
        },
        {
          // Expression keywords prevent 'keyword Name(...)' from being
          // recognized as a function definition
          beginKeywords: 'new return throw await else',
          relevance: 0
        },
        {
          className: 'function',
          begin: '(' + TYPE_IDENT_RE + '\\s+)+' + hljs.IDENT_RE + '\\s*(<[^=]+>\\s*)?\\(',
          returnBegin: true,
          end: /\s*[{;=]/,
          excludeEnd: true,
          keywords: KEYWORDS,
          contains: [
            // prevents these from being highlighted `title`
            {
              beginKeywords: FUNCTION_MODIFIERS.join(" "),
              relevance: 0
            },
            {
              begin: hljs.IDENT_RE + '\\s*(<[^=]+>\\s*)?\\(',
              returnBegin: true,
              contains: [
                hljs.TITLE_MODE,
                GENERIC_MODIFIER
              ],
              relevance: 0
            },
            { match: /\(\)/ },
            {
              className: 'params',
              begin: /\(/,
              end: /\)/,
              excludeBegin: true,
              excludeEnd: true,
              keywords: KEYWORDS,
              relevance: 0,
              contains: [
                STRING,
                NUMBERS,
                hljs.C_BLOCK_COMMENT_MODE
              ]
            },
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        AT_IDENTIFIER
      ]
    };
  }

  return csharp;

})();

    hljs.registerLanguage('csharp', hljsGrammar);
  })();/*! `css` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  const MODES = (hljs) => {
    return {
      IMPORTANT: {
        scope: 'meta',
        begin: '!important'
      },
      BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
      HEXCOLOR: {
        scope: 'number',
        begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
      },
      FUNCTION_DISPATCH: {
        className: "built_in",
        begin: /[\w-]+(?=\()/
      },
      ATTRIBUTE_SELECTOR_MODE: {
        scope: 'selector-attr',
        begin: /\[/,
        end: /\]/,
        illegal: '$',
        contains: [
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE
        ]
      },
      CSS_NUMBER_MODE: {
        scope: 'number',
        begin: hljs.NUMBER_RE + '(' +
          '%|em|ex|ch|rem' +
          '|vw|vh|vmin|vmax' +
          '|cm|mm|in|pt|pc|px' +
          '|deg|grad|rad|turn' +
          '|s|ms' +
          '|Hz|kHz' +
          '|dpi|dpcm|dppx' +
          ')?',
        relevance: 0
      },
      CSS_VARIABLE: {
        className: "attr",
        begin: /--[A-Za-z_][A-Za-z0-9_-]*/
      }
    };
  };

  const HTML_TAGS = [
    'a',
    'abbr',
    'address',
    'article',
    'aside',
    'audio',
    'b',
    'blockquote',
    'body',
    'button',
    'canvas',
    'caption',
    'cite',
    'code',
    'dd',
    'del',
    'details',
    'dfn',
    'div',
    'dl',
    'dt',
    'em',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hgroup',
    'html',
    'i',
    'iframe',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'legend',
    'li',
    'main',
    'mark',
    'menu',
    'nav',
    'object',
    'ol',
    'p',
    'q',
    'quote',
    'samp',
    'section',
    'span',
    'strong',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'textarea',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'ul',
    'var',
    'video'
  ];

  const SVG_TAGS = [
    'defs',
    'g',
    'marker',
    'mask',
    'pattern',
    'svg',
    'switch',
    'symbol',
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feFlood',
    'feGaussianBlur',
    'feImage',
    'feMerge',
    'feMorphology',
    'feOffset',
    'feSpecularLighting',
    'feTile',
    'feTurbulence',
    'linearGradient',
    'radialGradient',
    'stop',
    'circle',
    'ellipse',
    'image',
    'line',
    'path',
    'polygon',
    'polyline',
    'rect',
    'text',
    'use',
    'textPath',
    'tspan',
    'foreignObject',
    'clipPath'
  ];

  const TAGS = [
    ...HTML_TAGS,
    ...SVG_TAGS,
  ];

  // Sorting, then reversing makes sure longer attributes/elements like
  // `font-weight` are matched fully instead of getting false positives on say `font`

  const MEDIA_FEATURES = [
    'any-hover',
    'any-pointer',
    'aspect-ratio',
    'color',
    'color-gamut',
    'color-index',
    'device-aspect-ratio',
    'device-height',
    'device-width',
    'display-mode',
    'forced-colors',
    'grid',
    'height',
    'hover',
    'inverted-colors',
    'monochrome',
    'orientation',
    'overflow-block',
    'overflow-inline',
    'pointer',
    'prefers-color-scheme',
    'prefers-contrast',
    'prefers-reduced-motion',
    'prefers-reduced-transparency',
    'resolution',
    'scan',
    'scripting',
    'update',
    'width',
    // TODO: find a better solution?
    'min-width',
    'max-width',
    'min-height',
    'max-height'
  ].sort().reverse();

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
  const PSEUDO_CLASSES = [
    'active',
    'any-link',
    'blank',
    'checked',
    'current',
    'default',
    'defined',
    'dir', // dir()
    'disabled',
    'drop',
    'empty',
    'enabled',
    'first',
    'first-child',
    'first-of-type',
    'fullscreen',
    'future',
    'focus',
    'focus-visible',
    'focus-within',
    'has', // has()
    'host', // host or host()
    'host-context', // host-context()
    'hover',
    'indeterminate',
    'in-range',
    'invalid',
    'is', // is()
    'lang', // lang()
    'last-child',
    'last-of-type',
    'left',
    'link',
    'local-link',
    'not', // not()
    'nth-child', // nth-child()
    'nth-col', // nth-col()
    'nth-last-child', // nth-last-child()
    'nth-last-col', // nth-last-col()
    'nth-last-of-type', //nth-last-of-type()
    'nth-of-type', //nth-of-type()
    'only-child',
    'only-of-type',
    'optional',
    'out-of-range',
    'past',
    'placeholder-shown',
    'read-only',
    'read-write',
    'required',
    'right',
    'root',
    'scope',
    'target',
    'target-within',
    'user-invalid',
    'valid',
    'visited',
    'where' // where()
  ].sort().reverse();

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
  const PSEUDO_ELEMENTS = [
    'after',
    'backdrop',
    'before',
    'cue',
    'cue-region',
    'first-letter',
    'first-line',
    'grammar-error',
    'marker',
    'part',
    'placeholder',
    'selection',
    'slotted',
    'spelling-error'
  ].sort().reverse();

  const ATTRIBUTES = [
    'align-content',
    'align-items',
    'align-self',
    'alignment-baseline',
    'all',
    'animation',
    'animation-delay',
    'animation-direction',
    'animation-duration',
    'animation-fill-mode',
    'animation-iteration-count',
    'animation-name',
    'animation-play-state',
    'animation-timing-function',
    'backface-visibility',
    'background',
    'background-attachment',
    'background-blend-mode',
    'background-clip',
    'background-color',
    'background-image',
    'background-origin',
    'background-position',
    'background-repeat',
    'background-size',
    'baseline-shift',
    'block-size',
    'border',
    'border-block',
    'border-block-color',
    'border-block-end',
    'border-block-end-color',
    'border-block-end-style',
    'border-block-end-width',
    'border-block-start',
    'border-block-start-color',
    'border-block-start-style',
    'border-block-start-width',
    'border-block-style',
    'border-block-width',
    'border-bottom',
    'border-bottom-color',
    'border-bottom-left-radius',
    'border-bottom-right-radius',
    'border-bottom-style',
    'border-bottom-width',
    'border-collapse',
    'border-color',
    'border-image',
    'border-image-outset',
    'border-image-repeat',
    'border-image-slice',
    'border-image-source',
    'border-image-width',
    'border-inline',
    'border-inline-color',
    'border-inline-end',
    'border-inline-end-color',
    'border-inline-end-style',
    'border-inline-end-width',
    'border-inline-start',
    'border-inline-start-color',
    'border-inline-start-style',
    'border-inline-start-width',
    'border-inline-style',
    'border-inline-width',
    'border-left',
    'border-left-color',
    'border-left-style',
    'border-left-width',
    'border-radius',
    'border-right',
    'border-right-color',
    'border-right-style',
    'border-right-width',
    'border-spacing',
    'border-style',
    'border-top',
    'border-top-color',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-top-style',
    'border-top-width',
    'border-width',
    'bottom',
    'box-decoration-break',
    'box-shadow',
    'box-sizing',
    'break-after',
    'break-before',
    'break-inside',
    'cx',
    'cy',
    'caption-side',
    'caret-color',
    'clear',
    'clip',
    'clip-path',
    'clip-rule',
    'color',
    'color-interpolation',
    'color-interpolation-filters',
    'color-profile',
    'color-rendering',
    'column-count',
    'column-fill',
    'column-gap',
    'column-rule',
    'column-rule-color',
    'column-rule-style',
    'column-rule-width',
    'column-span',
    'column-width',
    'columns',
    'contain',
    'content',
    'content-visibility',
    'counter-increment',
    'counter-reset',
    'cue',
    'cue-after',
    'cue-before',
    'cursor',
    'direction',
    'display',
    'dominant-baseline',
    'empty-cells',
    'enable-background',
    'fill',
    'fill-opacity',
    'fill-rule',
    'filter',
    'flex',
    'flex-basis',
    'flex-direction',
    'flex-flow',
    'flex-grow',
    'flex-shrink',
    'flex-wrap',
    'float',
    'flow',
    'flood-color',
    'flood-opacity',
    'font',
    'font-display',
    'font-family',
    'font-feature-settings',
    'font-kerning',
    'font-language-override',
    'font-size',
    'font-size-adjust',
    'font-smoothing',
    'font-stretch',
    'font-style',
    'font-synthesis',
    'font-variant',
    'font-variant-caps',
    'font-variant-east-asian',
    'font-variant-ligatures',
    'font-variant-numeric',
    'font-variant-position',
    'font-variation-settings',
    'font-weight',
    'gap',
    'glyph-orientation-horizontal',
    'glyph-orientation-vertical',
    'grid',
    'grid-area',
    'grid-auto-columns',
    'grid-auto-flow',
    'grid-auto-rows',
    'grid-column',
    'grid-column-end',
    'grid-column-start',
    'grid-gap',
    'grid-row',
    'grid-row-end',
    'grid-row-start',
    'grid-template',
    'grid-template-areas',
    'grid-template-columns',
    'grid-template-rows',
    'hanging-punctuation',
    'height',
    'hyphens',
    'icon',
    'image-orientation',
    'image-rendering',
    'image-resolution',
    'ime-mode',
    'inline-size',
    'isolation',
    'kerning',
    'justify-content',
    'left',
    'letter-spacing',
    'lighting-color',
    'line-break',
    'line-height',
    'list-style',
    'list-style-image',
    'list-style-position',
    'list-style-type',
    'marker',
    'marker-end',
    'marker-mid',
    'marker-start',
    'mask',
    'margin',
    'margin-block',
    'margin-block-end',
    'margin-block-start',
    'margin-bottom',
    'margin-inline',
    'margin-inline-end',
    'margin-inline-start',
    'margin-left',
    'margin-right',
    'margin-top',
    'marks',
    'mask',
    'mask-border',
    'mask-border-mode',
    'mask-border-outset',
    'mask-border-repeat',
    'mask-border-slice',
    'mask-border-source',
    'mask-border-width',
    'mask-clip',
    'mask-composite',
    'mask-image',
    'mask-mode',
    'mask-origin',
    'mask-position',
    'mask-repeat',
    'mask-size',
    'mask-type',
    'max-block-size',
    'max-height',
    'max-inline-size',
    'max-width',
    'min-block-size',
    'min-height',
    'min-inline-size',
    'min-width',
    'mix-blend-mode',
    'nav-down',
    'nav-index',
    'nav-left',
    'nav-right',
    'nav-up',
    'none',
    'normal',
    'object-fit',
    'object-position',
    'opacity',
    'order',
    'orphans',
    'outline',
    'outline-color',
    'outline-offset',
    'outline-style',
    'outline-width',
    'overflow',
    'overflow-wrap',
    'overflow-x',
    'overflow-y',
    'padding',
    'padding-block',
    'padding-block-end',
    'padding-block-start',
    'padding-bottom',
    'padding-inline',
    'padding-inline-end',
    'padding-inline-start',
    'padding-left',
    'padding-right',
    'padding-top',
    'page-break-after',
    'page-break-before',
    'page-break-inside',
    'pause',
    'pause-after',
    'pause-before',
    'perspective',
    'perspective-origin',
    'pointer-events',
    'position',
    'quotes',
    'r',
    'resize',
    'rest',
    'rest-after',
    'rest-before',
    'right',
    'row-gap',
    'scroll-margin',
    'scroll-margin-block',
    'scroll-margin-block-end',
    'scroll-margin-block-start',
    'scroll-margin-bottom',
    'scroll-margin-inline',
    'scroll-margin-inline-end',
    'scroll-margin-inline-start',
    'scroll-margin-left',
    'scroll-margin-right',
    'scroll-margin-top',
    'scroll-padding',
    'scroll-padding-block',
    'scroll-padding-block-end',
    'scroll-padding-block-start',
    'scroll-padding-bottom',
    'scroll-padding-inline',
    'scroll-padding-inline-end',
    'scroll-padding-inline-start',
    'scroll-padding-left',
    'scroll-padding-right',
    'scroll-padding-top',
    'scroll-snap-align',
    'scroll-snap-stop',
    'scroll-snap-type',
    'scrollbar-color',
    'scrollbar-gutter',
    'scrollbar-width',
    'shape-image-threshold',
    'shape-margin',
    'shape-outside',
    'shape-rendering',
    'stop-color',
    'stop-opacity',
    'stroke',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-opacity',
    'stroke-width',
    'speak',
    'speak-as',
    'src', // @font-face
    'tab-size',
    'table-layout',
    'text-anchor',
    'text-align',
    'text-align-all',
    'text-align-last',
    'text-combine-upright',
    'text-decoration',
    'text-decoration-color',
    'text-decoration-line',
    'text-decoration-style',
    'text-emphasis',
    'text-emphasis-color',
    'text-emphasis-position',
    'text-emphasis-style',
    'text-indent',
    'text-justify',
    'text-orientation',
    'text-overflow',
    'text-rendering',
    'text-shadow',
    'text-transform',
    'text-underline-position',
    'top',
    'transform',
    'transform-box',
    'transform-origin',
    'transform-style',
    'transition',
    'transition-delay',
    'transition-duration',
    'transition-property',
    'transition-timing-function',
    'unicode-bidi',
    'vector-effect',
    'vertical-align',
    'visibility',
    'voice-balance',
    'voice-duration',
    'voice-family',
    'voice-pitch',
    'voice-range',
    'voice-rate',
    'voice-stress',
    'voice-volume',
    'white-space',
    'widows',
    'width',
    'will-change',
    'word-break',
    'word-spacing',
    'word-wrap',
    'writing-mode',
    'x',
    'y',
    'z-index'
  ].sort().reverse();

  /*
  Language: CSS
  Category: common, css, web
  Website: https://developer.mozilla.org/en-US/docs/Web/CSS
  */


  /** @type LanguageFn */
  function css(hljs) {
    const regex = hljs.regex;
    const modes = MODES(hljs);
    const VENDOR_PREFIX = { begin: /-(webkit|moz|ms|o)-(?=[a-z])/ };
    const AT_MODIFIERS = "and or not only";
    const AT_PROPERTY_RE = /@-?\w[\w]*(-\w+)*/; // @-webkit-keyframes
    const IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
    const STRINGS = [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE
    ];

    return {
      name: 'CSS',
      case_insensitive: true,
      illegal: /[=|'\$]/,
      keywords: { keyframePosition: "from to" },
      classNameAliases: {
        // for visual continuity with `tag {}` and because we
        // don't have a great class for this?
        keyframePosition: "selector-tag" },
      contains: [
        modes.BLOCK_COMMENT,
        VENDOR_PREFIX,
        // to recognize keyframe 40% etc which are outside the scope of our
        // attribute value mode
        modes.CSS_NUMBER_MODE,
        {
          className: 'selector-id',
          begin: /#[A-Za-z0-9_-]+/,
          relevance: 0
        },
        {
          className: 'selector-class',
          begin: '\\.' + IDENT_RE,
          relevance: 0
        },
        modes.ATTRIBUTE_SELECTOR_MODE,
        {
          className: 'selector-pseudo',
          variants: [
            { begin: ':(' + PSEUDO_CLASSES.join('|') + ')' },
            { begin: ':(:)?(' + PSEUDO_ELEMENTS.join('|') + ')' }
          ]
        },
        // we may actually need this (12/2020)
        // { // pseudo-selector params
        //   begin: /\(/,
        //   end: /\)/,
        //   contains: [ hljs.CSS_NUMBER_MODE ]
        // },
        modes.CSS_VARIABLE,
        {
          className: 'attribute',
          begin: '\\b(' + ATTRIBUTES.join('|') + ')\\b'
        },
        // attribute values
        {
          begin: /:/,
          end: /[;}{]/,
          contains: [
            modes.BLOCK_COMMENT,
            modes.HEXCOLOR,
            modes.IMPORTANT,
            modes.CSS_NUMBER_MODE,
            ...STRINGS,
            // needed to highlight these as strings and to avoid issues with
            // illegal characters that might be inside urls that would tigger the
            // languages illegal stack
            {
              begin: /(url|data-uri)\(/,
              end: /\)/,
              relevance: 0, // from keywords
              keywords: { built_in: "url data-uri" },
              contains: [
                ...STRINGS,
                {
                  className: "string",
                  // any character other than `)` as in `url()` will be the start
                  // of a string, which ends with `)` (from the parent mode)
                  begin: /[^)]/,
                  endsWithParent: true,
                  excludeEnd: true
                }
              ]
            },
            modes.FUNCTION_DISPATCH
          ]
        },
        {
          begin: regex.lookahead(/@/),
          end: '[{;]',
          relevance: 0,
          illegal: /:/, // break on Less variables @var: ...
          contains: [
            {
              className: 'keyword',
              begin: AT_PROPERTY_RE
            },
            {
              begin: /\s/,
              endsWithParent: true,
              excludeEnd: true,
              relevance: 0,
              keywords: {
                $pattern: /[a-z-]+/,
                keyword: AT_MODIFIERS,
                attribute: MEDIA_FEATURES.join(" ")
              },
              contains: [
                {
                  begin: /[a-z-]+(?=:)/,
                  className: "attribute"
                },
                ...STRINGS,
                modes.CSS_NUMBER_MODE
              ]
            }
          ]
        },
        {
          className: 'selector-tag',
          begin: '\\b(' + TAGS.join('|') + ')\\b'
        }
      ]
    };
  }

  return css;

})();

    hljs.registerLanguage('css', hljsGrammar);
  })();/*! `delphi` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Delphi
  Website: https://www.embarcadero.com/products/delphi
  Category: system
  */

  /** @type LanguageFn */
  function delphi(hljs) {
    const KEYWORDS = [
      "exports",
      "register",
      "file",
      "shl",
      "array",
      "record",
      "property",
      "for",
      "mod",
      "while",
      "set",
      "ally",
      "label",
      "uses",
      "raise",
      "not",
      "stored",
      "class",
      "safecall",
      "var",
      "interface",
      "or",
      "private",
      "static",
      "exit",
      "index",
      "inherited",
      "to",
      "else",
      "stdcall",
      "override",
      "shr",
      "asm",
      "far",
      "resourcestring",
      "finalization",
      "packed",
      "virtual",
      "out",
      "and",
      "protected",
      "library",
      "do",
      "xorwrite",
      "goto",
      "near",
      "function",
      "end",
      "div",
      "overload",
      "object",
      "unit",
      "begin",
      "string",
      "on",
      "inline",
      "repeat",
      "until",
      "destructor",
      "write",
      "message",
      "program",
      "with",
      "read",
      "initialization",
      "except",
      "default",
      "nil",
      "if",
      "case",
      "cdecl",
      "in",
      "downto",
      "threadvar",
      "of",
      "try",
      "pascal",
      "const",
      "external",
      "constructor",
      "type",
      "public",
      "then",
      "implementation",
      "finally",
      "published",
      "procedure",
      "absolute",
      "reintroduce",
      "operator",
      "as",
      "is",
      "abstract",
      "alias",
      "assembler",
      "bitpacked",
      "break",
      "continue",
      "cppdecl",
      "cvar",
      "enumerator",
      "experimental",
      "platform",
      "deprecated",
      "unimplemented",
      "dynamic",
      "export",
      "far16",
      "forward",
      "generic",
      "helper",
      "implements",
      "interrupt",
      "iochecks",
      "local",
      "name",
      "nodefault",
      "noreturn",
      "nostackframe",
      "oldfpccall",
      "otherwise",
      "saveregisters",
      "softfloat",
      "specialize",
      "strict",
      "unaligned",
      "varargs"
    ];
    const COMMENT_MODES = [
      hljs.C_LINE_COMMENT_MODE,
      hljs.COMMENT(/\{/, /\}/, { relevance: 0 }),
      hljs.COMMENT(/\(\*/, /\*\)/, { relevance: 10 })
    ];
    const DIRECTIVE = {
      className: 'meta',
      variants: [
        {
          begin: /\{\$/,
          end: /\}/
        },
        {
          begin: /\(\*\$/,
          end: /\*\)/
        }
      ]
    };
    const STRING = {
      className: 'string',
      begin: /'/,
      end: /'/,
      contains: [ { begin: /''/ } ]
    };
    const NUMBER = {
      className: 'number',
      relevance: 0,
      // Source: https://www.freepascal.org/docs-html/ref/refse6.html
      variants: [
        {
          // Hexadecimal notation, e.g., $7F.
          begin: '\\$[0-9A-Fa-f]+' },
        {
          // Octal notation, e.g., &42.
          begin: '&[0-7]+' },
        {
          // Binary notation, e.g., %1010.
          begin: '%[01]+' }
      ]
    };
    const CHAR_STRING = {
      className: 'string',
      begin: /(#\d+)+/
    };
    const CLASS = {
      begin: hljs.IDENT_RE + '\\s*=\\s*class\\s*\\(',
      returnBegin: true,
      contains: [ hljs.TITLE_MODE ]
    };
    const FUNCTION = {
      className: 'function',
      beginKeywords: 'function constructor destructor procedure',
      end: /[:;]/,
      keywords: 'function constructor|10 destructor|10 procedure|10',
      contains: [
        hljs.TITLE_MODE,
        {
          className: 'params',
          begin: /\(/,
          end: /\)/,
          keywords: KEYWORDS,
          contains: [
            STRING,
            CHAR_STRING,
            DIRECTIVE
          ].concat(COMMENT_MODES)
        },
        DIRECTIVE
      ].concat(COMMENT_MODES)
    };
    return {
      name: 'Delphi',
      aliases: [
        'dpr',
        'dfm',
        'pas',
        'pascal'
      ],
      case_insensitive: true,
      keywords: KEYWORDS,
      illegal: /"|\$[G-Zg-z]|\/\*|<\/|\|/,
      contains: [
        STRING,
        CHAR_STRING,
        hljs.NUMBER_MODE,
        NUMBER,
        CLASS,
        FUNCTION,
        DIRECTIVE
      ].concat(COMMENT_MODES)
    };
  }

  return delphi;

})();

    hljs.registerLanguage('delphi', hljsGrammar);
  })();/*! `diff` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Diff
  Description: Unified and context diff
  Author: Vasily Polovnyov <vast@whiteants.net>
  Website: https://www.gnu.org/software/diffutils/
  Category: common
  */

  /** @type LanguageFn */
  function diff(hljs) {
    const regex = hljs.regex;
    return {
      name: 'Diff',
      aliases: [ 'patch' ],
      contains: [
        {
          className: 'meta',
          relevance: 10,
          match: regex.either(
            /^@@ +-\d+,\d+ +\+\d+,\d+ +@@/,
            /^\*\*\* +\d+,\d+ +\*\*\*\*$/,
            /^--- +\d+,\d+ +----$/
          )
        },
        {
          className: 'comment',
          variants: [
            {
              begin: regex.either(
                /Index: /,
                /^index/,
                /={3,}/,
                /^-{3}/,
                /^\*{3} /,
                /^\+{3}/,
                /^diff --git/
              ),
              end: /$/
            },
            { match: /^\*{15}$/ }
          ]
        },
        {
          className: 'addition',
          begin: /^\+/,
          end: /$/
        },
        {
          className: 'deletion',
          begin: /^-/,
          end: /$/
        },
        {
          className: 'addition',
          begin: /^!/,
          end: /$/
        }
      ]
    };
  }

  return diff;

})();

    hljs.registerLanguage('diff', hljsGrammar);
  })();/*! `dns` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: DNS Zone
  Author: Tim Schumacher <tim@datenknoten.me>
  Category: config
  Website: https://en.wikipedia.org/wiki/Zone_file
  */

  /** @type LanguageFn */
  function dns(hljs) {
    const KEYWORDS = [
      "IN",
      "A",
      "AAAA",
      "AFSDB",
      "APL",
      "CAA",
      "CDNSKEY",
      "CDS",
      "CERT",
      "CNAME",
      "DHCID",
      "DLV",
      "DNAME",
      "DNSKEY",
      "DS",
      "HIP",
      "IPSECKEY",
      "KEY",
      "KX",
      "LOC",
      "MX",
      "NAPTR",
      "NS",
      "NSEC",
      "NSEC3",
      "NSEC3PARAM",
      "PTR",
      "RRSIG",
      "RP",
      "SIG",
      "SOA",
      "SRV",
      "SSHFP",
      "TA",
      "TKEY",
      "TLSA",
      "TSIG",
      "TXT"
    ];
    return {
      name: 'DNS Zone',
      aliases: [
        'bind',
        'zone'
      ],
      keywords: KEYWORDS,
      contains: [
        hljs.COMMENT(';', '$', { relevance: 0 }),
        {
          className: 'meta',
          begin: /^\$(TTL|GENERATE|INCLUDE|ORIGIN)\b/
        },
        // IPv6
        {
          className: 'number',
          begin: '((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:)))\\b'
        },
        // IPv4
        {
          className: 'number',
          begin: '((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\b'
        },
        hljs.inherit(hljs.NUMBER_MODE, { begin: /\b\d+[dhwm]?/ })
      ]
    };
  }

  return dns;

})();

    hljs.registerLanguage('dns', hljsGrammar);
  })();/*! `dockerfile` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Dockerfile
  Requires: bash.js
  Author: Alexis Hénaut <alexis@henaut.net>
  Description: language definition for Dockerfile files
  Website: https://docs.docker.com/engine/reference/builder/
  Category: config
  */

  /** @type LanguageFn */
  function dockerfile(hljs) {
    const KEYWORDS = [
      "from",
      "maintainer",
      "expose",
      "env",
      "arg",
      "user",
      "onbuild",
      "stopsignal"
    ];
    return {
      name: 'Dockerfile',
      aliases: [ 'docker' ],
      case_insensitive: true,
      keywords: KEYWORDS,
      contains: [
        hljs.HASH_COMMENT_MODE,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
        {
          beginKeywords: 'run cmd entrypoint volume add copy workdir label healthcheck shell',
          starts: {
            end: /[^\\]$/,
            subLanguage: 'bash'
          }
        }
      ],
      illegal: '</'
    };
  }

  return dockerfile;

})();

    hljs.registerLanguage('dockerfile', hljsGrammar);
  })();/*! `dos` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Batch file (DOS)
  Author: Alexander Makarov <sam@rmcreative.ru>
  Contributors: Anton Kochkov <anton.kochkov@gmail.com>
  Website: https://en.wikipedia.org/wiki/Batch_file
  Category: scripting
  */

  /** @type LanguageFn */
  function dos(hljs) {
    const COMMENT = hljs.COMMENT(
      /^\s*@?rem\b/, /$/,
      { relevance: 10 }
    );
    const LABEL = {
      className: 'symbol',
      begin: '^\\s*[A-Za-z._?][A-Za-z0-9_$#@~.?]*(:|\\s+label)',
      relevance: 0
    };
    const KEYWORDS = [
      "if",
      "else",
      "goto",
      "for",
      "in",
      "do",
      "call",
      "exit",
      "not",
      "exist",
      "errorlevel",
      "defined",
      "equ",
      "neq",
      "lss",
      "leq",
      "gtr",
      "geq"
    ];
    const BUILT_INS = [
      "prn",
      "nul",
      "lpt3",
      "lpt2",
      "lpt1",
      "con",
      "com4",
      "com3",
      "com2",
      "com1",
      "aux",
      "shift",
      "cd",
      "dir",
      "echo",
      "setlocal",
      "endlocal",
      "set",
      "pause",
      "copy",
      "append",
      "assoc",
      "at",
      "attrib",
      "break",
      "cacls",
      "cd",
      "chcp",
      "chdir",
      "chkdsk",
      "chkntfs",
      "cls",
      "cmd",
      "color",
      "comp",
      "compact",
      "convert",
      "date",
      "dir",
      "diskcomp",
      "diskcopy",
      "doskey",
      "erase",
      "fs",
      "find",
      "findstr",
      "format",
      "ftype",
      "graftabl",
      "help",
      "keyb",
      "label",
      "md",
      "mkdir",
      "mode",
      "more",
      "move",
      "path",
      "pause",
      "print",
      "popd",
      "pushd",
      "promt",
      "rd",
      "recover",
      "rem",
      "rename",
      "replace",
      "restore",
      "rmdir",
      "shift",
      "sort",
      "start",
      "subst",
      "time",
      "title",
      "tree",
      "type",
      "ver",
      "verify",
      "vol",
      // winutils
      "ping",
      "net",
      "ipconfig",
      "taskkill",
      "xcopy",
      "ren",
      "del"
    ];
    return {
      name: 'Batch file (DOS)',
      aliases: [
        'bat',
        'cmd'
      ],
      case_insensitive: true,
      illegal: /\/\*/,
      keywords: {
        keyword: KEYWORDS,
        built_in: BUILT_INS
      },
      contains: [
        {
          className: 'variable',
          begin: /%%[^ ]|%[^ ]+?%|![^ ]+?!/
        },
        {
          className: 'function',
          begin: LABEL.begin,
          end: 'goto:eof',
          contains: [
            hljs.inherit(hljs.TITLE_MODE, { begin: '([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*' }),
            COMMENT
          ]
        },
        {
          className: 'number',
          begin: '\\b\\d+',
          relevance: 0
        },
        COMMENT
      ]
    };
  }

  return dos;

})();

    hljs.registerLanguage('dos', hljsGrammar);
  })();/*! `elixir` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Elixir
  Author: Josh Adams <josh@isotope11.com>
  Description: language definition for Elixir source code files (.ex and .exs).  Based on ruby language support.
  Category: functional
  Website: https://elixir-lang.org
  */

  /** @type LanguageFn */
  function elixir(hljs) {
    const regex = hljs.regex;
    const ELIXIR_IDENT_RE = '[a-zA-Z_][a-zA-Z0-9_.]*(!|\\?)?';
    const ELIXIR_METHOD_RE = '[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?';
    const KEYWORDS = [
      "after",
      "alias",
      "and",
      "case",
      "catch",
      "cond",
      "defstruct",
      "defguard",
      "do",
      "else",
      "end",
      "fn",
      "for",
      "if",
      "import",
      "in",
      "not",
      "or",
      "quote",
      "raise",
      "receive",
      "require",
      "reraise",
      "rescue",
      "try",
      "unless",
      "unquote",
      "unquote_splicing",
      "use",
      "when",
      "with|0"
    ];
    const LITERALS = [
      "false",
      "nil",
      "true"
    ];
    const KWS = {
      $pattern: ELIXIR_IDENT_RE,
      keyword: KEYWORDS,
      literal: LITERALS
    };
    const SUBST = {
      className: 'subst',
      begin: /#\{/,
      end: /\}/,
      keywords: KWS
    };
    const NUMBER = {
      className: 'number',
      begin: '(\\b0o[0-7_]+)|(\\b0b[01_]+)|(\\b0x[0-9a-fA-F_]+)|(-?\\b[0-9][0-9_]*(\\.[0-9_]+([eE][-+]?[0-9]+)?)?)',
      relevance: 0
    };
    // TODO: could be tightened
    // https://elixir-lang.readthedocs.io/en/latest/intro/18.html
    // but you also need to include closing delemeters in the escape list per
    // individual sigil mode from what I can tell,
    // ie: \} might or might not be an escape depending on the sigil used
    const ESCAPES_RE = /\\[\s\S]/;
    // const ESCAPES_RE = /\\["'\\abdefnrstv0]/;
    const BACKSLASH_ESCAPE = {
      match: ESCAPES_RE,
      scope: "char.escape",
      relevance: 0
    };
    const SIGIL_DELIMITERS = '[/|([{<"\']';
    const SIGIL_DELIMITER_MODES = [
      {
        begin: /"/,
        end: /"/
      },
      {
        begin: /'/,
        end: /'/
      },
      {
        begin: /\//,
        end: /\//
      },
      {
        begin: /\|/,
        end: /\|/
      },
      {
        begin: /\(/,
        end: /\)/
      },
      {
        begin: /\[/,
        end: /\]/
      },
      {
        begin: /\{/,
        end: /\}/
      },
      {
        begin: /</,
        end: />/
      }
    ];
    const escapeSigilEnd = (end) => {
      return {
        scope: "char.escape",
        begin: regex.concat(/\\/, end),
        relevance: 0
      };
    };
    const LOWERCASE_SIGIL = {
      className: 'string',
      begin: '~[a-z]' + '(?=' + SIGIL_DELIMITERS + ')',
      contains: SIGIL_DELIMITER_MODES.map(x => hljs.inherit(x,
        { contains: [
          escapeSigilEnd(x.end),
          BACKSLASH_ESCAPE,
          SUBST
        ] }
      ))
    };

    const UPCASE_SIGIL = {
      className: 'string',
      begin: '~[A-Z]' + '(?=' + SIGIL_DELIMITERS + ')',
      contains: SIGIL_DELIMITER_MODES.map(x => hljs.inherit(x,
        { contains: [ escapeSigilEnd(x.end) ] }
      ))
    };

    const REGEX_SIGIL = {
      className: 'regex',
      variants: [
        {
          begin: '~r' + '(?=' + SIGIL_DELIMITERS + ')',
          contains: SIGIL_DELIMITER_MODES.map(x => hljs.inherit(x,
            {
              end: regex.concat(x.end, /[uismxfU]{0,7}/),
              contains: [
                escapeSigilEnd(x.end),
                BACKSLASH_ESCAPE,
                SUBST
              ]
            }
          ))
        },
        {
          begin: '~R' + '(?=' + SIGIL_DELIMITERS + ')',
          contains: SIGIL_DELIMITER_MODES.map(x => hljs.inherit(x,
            {
              end: regex.concat(x.end, /[uismxfU]{0,7}/),
              contains: [ escapeSigilEnd(x.end) ]
            })
          )
        }
      ]
    };

    const STRING = {
      className: 'string',
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      variants: [
        {
          begin: /"""/,
          end: /"""/
        },
        {
          begin: /'''/,
          end: /'''/
        },
        {
          begin: /~S"""/,
          end: /"""/,
          contains: [] // override default
        },
        {
          begin: /~S"/,
          end: /"/,
          contains: [] // override default
        },
        {
          begin: /~S'''/,
          end: /'''/,
          contains: [] // override default
        },
        {
          begin: /~S'/,
          end: /'/,
          contains: [] // override default
        },
        {
          begin: /'/,
          end: /'/
        },
        {
          begin: /"/,
          end: /"/
        }
      ]
    };
    const FUNCTION = {
      className: 'function',
      beginKeywords: 'def defp defmacro defmacrop',
      end: /\B\b/, // the mode is ended by the title
      contains: [
        hljs.inherit(hljs.TITLE_MODE, {
          begin: ELIXIR_IDENT_RE,
          endsParent: true
        })
      ]
    };
    const CLASS = hljs.inherit(FUNCTION, {
      className: 'class',
      beginKeywords: 'defimpl defmodule defprotocol defrecord',
      end: /\bdo\b|$|;/
    });
    const ELIXIR_DEFAULT_CONTAINS = [
      STRING,
      REGEX_SIGIL,
      UPCASE_SIGIL,
      LOWERCASE_SIGIL,
      hljs.HASH_COMMENT_MODE,
      CLASS,
      FUNCTION,
      { begin: '::' },
      {
        className: 'symbol',
        begin: ':(?![\\s:])',
        contains: [
          STRING,
          { begin: ELIXIR_METHOD_RE }
        ],
        relevance: 0
      },
      {
        className: 'symbol',
        begin: ELIXIR_IDENT_RE + ':(?!:)',
        relevance: 0
      },
      { // Usage of a module, struct, etc.
        className: 'title.class',
        begin: /(\b[A-Z][a-zA-Z0-9_]+)/,
        relevance: 0
      },
      NUMBER,
      {
        className: 'variable',
        begin: '(\\$\\W)|((\\$|@@?)(\\w+))'
      }
      // -> has been removed, capnproto always uses this grammar construct
    ];
    SUBST.contains = ELIXIR_DEFAULT_CONTAINS;

    return {
      name: 'Elixir',
      aliases: [
        'ex',
        'exs'
      ],
      keywords: KWS,
      contains: ELIXIR_DEFAULT_CONTAINS
    };
  }

  return elixir;

})();

    hljs.registerLanguage('elixir', hljsGrammar);
  })();/*! `erlang` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Erlang
  Description: Erlang is a general-purpose functional language, with strict evaluation, single assignment, and dynamic typing.
  Author: Nikolay Zakharov <nikolay.desh@gmail.com>, Dmitry Kovega <arhibot@gmail.com>
  Website: https://www.erlang.org
  Category: functional
  */

  /** @type LanguageFn */
  function erlang(hljs) {
    const BASIC_ATOM_RE = '[a-z\'][a-zA-Z0-9_\']*';
    const FUNCTION_NAME_RE = '(' + BASIC_ATOM_RE + ':' + BASIC_ATOM_RE + '|' + BASIC_ATOM_RE + ')';
    const ERLANG_RESERVED = {
      keyword:
        'after and andalso|10 band begin bnot bor bsl bzr bxor case catch cond div end fun if '
        + 'let not of orelse|10 query receive rem try when xor',
      literal:
        'false true'
    };

    const COMMENT = hljs.COMMENT('%', '$');
    const NUMBER = {
      className: 'number',
      begin: '\\b(\\d+(_\\d+)*#[a-fA-F0-9]+(_[a-fA-F0-9]+)*|\\d+(_\\d+)*(\\.\\d+(_\\d+)*)?([eE][-+]?\\d+)?)',
      relevance: 0
    };
    const NAMED_FUN = { begin: 'fun\\s+' + BASIC_ATOM_RE + '/\\d+' };
    const FUNCTION_CALL = {
      begin: FUNCTION_NAME_RE + '\\(',
      end: '\\)',
      returnBegin: true,
      relevance: 0,
      contains: [
        {
          begin: FUNCTION_NAME_RE,
          relevance: 0
        },
        {
          begin: '\\(',
          end: '\\)',
          endsWithParent: true,
          returnEnd: true,
          relevance: 0
          // "contains" defined later
        }
      ]
    };
    const TUPLE = {
      begin: /\{/,
      end: /\}/,
      relevance: 0
      // "contains" defined later
    };
    const VAR1 = {
      begin: '\\b_([A-Z][A-Za-z0-9_]*)?',
      relevance: 0
    };
    const VAR2 = {
      begin: '[A-Z][a-zA-Z0-9_]*',
      relevance: 0
    };
    const RECORD_ACCESS = {
      begin: '#' + hljs.UNDERSCORE_IDENT_RE,
      relevance: 0,
      returnBegin: true,
      contains: [
        {
          begin: '#' + hljs.UNDERSCORE_IDENT_RE,
          relevance: 0
        },
        {
          begin: /\{/,
          end: /\}/,
          relevance: 0
          // "contains" defined later
        }
      ]
    };

    const BLOCK_STATEMENTS = {
      beginKeywords: 'fun receive if try case',
      end: 'end',
      keywords: ERLANG_RESERVED
    };
    BLOCK_STATEMENTS.contains = [
      COMMENT,
      NAMED_FUN,
      hljs.inherit(hljs.APOS_STRING_MODE, { className: '' }),
      BLOCK_STATEMENTS,
      FUNCTION_CALL,
      hljs.QUOTE_STRING_MODE,
      NUMBER,
      TUPLE,
      VAR1,
      VAR2,
      RECORD_ACCESS
    ];

    const BASIC_MODES = [
      COMMENT,
      NAMED_FUN,
      BLOCK_STATEMENTS,
      FUNCTION_CALL,
      hljs.QUOTE_STRING_MODE,
      NUMBER,
      TUPLE,
      VAR1,
      VAR2,
      RECORD_ACCESS
    ];
    FUNCTION_CALL.contains[1].contains = BASIC_MODES;
    TUPLE.contains = BASIC_MODES;
    RECORD_ACCESS.contains[1].contains = BASIC_MODES;

    const DIRECTIVES = [
      "-module",
      "-record",
      "-undef",
      "-export",
      "-ifdef",
      "-ifndef",
      "-author",
      "-copyright",
      "-doc",
      "-vsn",
      "-import",
      "-include",
      "-include_lib",
      "-compile",
      "-define",
      "-else",
      "-endif",
      "-file",
      "-behaviour",
      "-behavior",
      "-spec"
    ];

    const PARAMS = {
      className: 'params',
      begin: '\\(',
      end: '\\)',
      contains: BASIC_MODES
    };
    return {
      name: 'Erlang',
      aliases: [ 'erl' ],
      keywords: ERLANG_RESERVED,
      illegal: '(</|\\*=|\\+=|-=|/\\*|\\*/|\\(\\*|\\*\\))',
      contains: [
        {
          className: 'function',
          begin: '^' + BASIC_ATOM_RE + '\\s*\\(',
          end: '->',
          returnBegin: true,
          illegal: '\\(|#|//|/\\*|\\\\|:|;',
          contains: [
            PARAMS,
            hljs.inherit(hljs.TITLE_MODE, { begin: BASIC_ATOM_RE })
          ],
          starts: {
            end: ';|\\.',
            keywords: ERLANG_RESERVED,
            contains: BASIC_MODES
          }
        },
        COMMENT,
        {
          begin: '^-',
          end: '\\.',
          relevance: 0,
          excludeEnd: true,
          returnBegin: true,
          keywords: {
            $pattern: '-' + hljs.IDENT_RE,
            keyword: DIRECTIVES.map(x => `${x}|1.5`).join(" ")
          },
          contains: [ PARAMS ]
        },
        NUMBER,
        hljs.QUOTE_STRING_MODE,
        RECORD_ACCESS,
        VAR1,
        VAR2,
        TUPLE,
        { begin: /\.$/ } // relevance booster
      ]
    };
  }

  return erlang;

})();

    hljs.registerLanguage('erlang', hljsGrammar);
  })();/*! `excel` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Excel formulae
  Author: Victor Zhou <OiCMudkips@users.noreply.github.com>
  Description: Excel formulae
  Website: https://products.office.com/en-us/excel/
  Category: enterprise
  */

  /** @type LanguageFn */
  function excel(hljs) {
    // built-in functions imported from https://web.archive.org/web/20160513042710/https://support.office.com/en-us/article/Excel-functions-alphabetical-b3944572-255d-4efb-bb96-c6d90033e188
    const BUILT_INS = [
      "ABS",
      "ACCRINT",
      "ACCRINTM",
      "ACOS",
      "ACOSH",
      "ACOT",
      "ACOTH",
      "AGGREGATE",
      "ADDRESS",
      "AMORDEGRC",
      "AMORLINC",
      "AND",
      "ARABIC",
      "AREAS",
      "ASC",
      "ASIN",
      "ASINH",
      "ATAN",
      "ATAN2",
      "ATANH",
      "AVEDEV",
      "AVERAGE",
      "AVERAGEA",
      "AVERAGEIF",
      "AVERAGEIFS",
      "BAHTTEXT",
      "BASE",
      "BESSELI",
      "BESSELJ",
      "BESSELK",
      "BESSELY",
      "BETADIST",
      "BETA.DIST",
      "BETAINV",
      "BETA.INV",
      "BIN2DEC",
      "BIN2HEX",
      "BIN2OCT",
      "BINOMDIST",
      "BINOM.DIST",
      "BINOM.DIST.RANGE",
      "BINOM.INV",
      "BITAND",
      "BITLSHIFT",
      "BITOR",
      "BITRSHIFT",
      "BITXOR",
      "CALL",
      "CEILING",
      "CEILING.MATH",
      "CEILING.PRECISE",
      "CELL",
      "CHAR",
      "CHIDIST",
      "CHIINV",
      "CHITEST",
      "CHISQ.DIST",
      "CHISQ.DIST.RT",
      "CHISQ.INV",
      "CHISQ.INV.RT",
      "CHISQ.TEST",
      "CHOOSE",
      "CLEAN",
      "CODE",
      "COLUMN",
      "COLUMNS",
      "COMBIN",
      "COMBINA",
      "COMPLEX",
      "CONCAT",
      "CONCATENATE",
      "CONFIDENCE",
      "CONFIDENCE.NORM",
      "CONFIDENCE.T",
      "CONVERT",
      "CORREL",
      "COS",
      "COSH",
      "COT",
      "COTH",
      "COUNT",
      "COUNTA",
      "COUNTBLANK",
      "COUNTIF",
      "COUNTIFS",
      "COUPDAYBS",
      "COUPDAYS",
      "COUPDAYSNC",
      "COUPNCD",
      "COUPNUM",
      "COUPPCD",
      "COVAR",
      "COVARIANCE.P",
      "COVARIANCE.S",
      "CRITBINOM",
      "CSC",
      "CSCH",
      "CUBEKPIMEMBER",
      "CUBEMEMBER",
      "CUBEMEMBERPROPERTY",
      "CUBERANKEDMEMBER",
      "CUBESET",
      "CUBESETCOUNT",
      "CUBEVALUE",
      "CUMIPMT",
      "CUMPRINC",
      "DATE",
      "DATEDIF",
      "DATEVALUE",
      "DAVERAGE",
      "DAY",
      "DAYS",
      "DAYS360",
      "DB",
      "DBCS",
      "DCOUNT",
      "DCOUNTA",
      "DDB",
      "DEC2BIN",
      "DEC2HEX",
      "DEC2OCT",
      "DECIMAL",
      "DEGREES",
      "DELTA",
      "DEVSQ",
      "DGET",
      "DISC",
      "DMAX",
      "DMIN",
      "DOLLAR",
      "DOLLARDE",
      "DOLLARFR",
      "DPRODUCT",
      "DSTDEV",
      "DSTDEVP",
      "DSUM",
      "DURATION",
      "DVAR",
      "DVARP",
      "EDATE",
      "EFFECT",
      "ENCODEURL",
      "EOMONTH",
      "ERF",
      "ERF.PRECISE",
      "ERFC",
      "ERFC.PRECISE",
      "ERROR.TYPE",
      "EUROCONVERT",
      "EVEN",
      "EXACT",
      "EXP",
      "EXPON.DIST",
      "EXPONDIST",
      "FACT",
      "FACTDOUBLE",
      "FALSE|0",
      "F.DIST",
      "FDIST",
      "F.DIST.RT",
      "FILTERXML",
      "FIND",
      "FINDB",
      "F.INV",
      "F.INV.RT",
      "FINV",
      "FISHER",
      "FISHERINV",
      "FIXED",
      "FLOOR",
      "FLOOR.MATH",
      "FLOOR.PRECISE",
      "FORECAST",
      "FORECAST.ETS",
      "FORECAST.ETS.CONFINT",
      "FORECAST.ETS.SEASONALITY",
      "FORECAST.ETS.STAT",
      "FORECAST.LINEAR",
      "FORMULATEXT",
      "FREQUENCY",
      "F.TEST",
      "FTEST",
      "FV",
      "FVSCHEDULE",
      "GAMMA",
      "GAMMA.DIST",
      "GAMMADIST",
      "GAMMA.INV",
      "GAMMAINV",
      "GAMMALN",
      "GAMMALN.PRECISE",
      "GAUSS",
      "GCD",
      "GEOMEAN",
      "GESTEP",
      "GETPIVOTDATA",
      "GROWTH",
      "HARMEAN",
      "HEX2BIN",
      "HEX2DEC",
      "HEX2OCT",
      "HLOOKUP",
      "HOUR",
      "HYPERLINK",
      "HYPGEOM.DIST",
      "HYPGEOMDIST",
      "IF",
      "IFERROR",
      "IFNA",
      "IFS",
      "IMABS",
      "IMAGINARY",
      "IMARGUMENT",
      "IMCONJUGATE",
      "IMCOS",
      "IMCOSH",
      "IMCOT",
      "IMCSC",
      "IMCSCH",
      "IMDIV",
      "IMEXP",
      "IMLN",
      "IMLOG10",
      "IMLOG2",
      "IMPOWER",
      "IMPRODUCT",
      "IMREAL",
      "IMSEC",
      "IMSECH",
      "IMSIN",
      "IMSINH",
      "IMSQRT",
      "IMSUB",
      "IMSUM",
      "IMTAN",
      "INDEX",
      "INDIRECT",
      "INFO",
      "INT",
      "INTERCEPT",
      "INTRATE",
      "IPMT",
      "IRR",
      "ISBLANK",
      "ISERR",
      "ISERROR",
      "ISEVEN",
      "ISFORMULA",
      "ISLOGICAL",
      "ISNA",
      "ISNONTEXT",
      "ISNUMBER",
      "ISODD",
      "ISREF",
      "ISTEXT",
      "ISO.CEILING",
      "ISOWEEKNUM",
      "ISPMT",
      "JIS",
      "KURT",
      "LARGE",
      "LCM",
      "LEFT",
      "LEFTB",
      "LEN",
      "LENB",
      "LINEST",
      "LN",
      "LOG",
      "LOG10",
      "LOGEST",
      "LOGINV",
      "LOGNORM.DIST",
      "LOGNORMDIST",
      "LOGNORM.INV",
      "LOOKUP",
      "LOWER",
      "MATCH",
      "MAX",
      "MAXA",
      "MAXIFS",
      "MDETERM",
      "MDURATION",
      "MEDIAN",
      "MID",
      "MIDBs",
      "MIN",
      "MINIFS",
      "MINA",
      "MINUTE",
      "MINVERSE",
      "MIRR",
      "MMULT",
      "MOD",
      "MODE",
      "MODE.MULT",
      "MODE.SNGL",
      "MONTH",
      "MROUND",
      "MULTINOMIAL",
      "MUNIT",
      "N",
      "NA",
      "NEGBINOM.DIST",
      "NEGBINOMDIST",
      "NETWORKDAYS",
      "NETWORKDAYS.INTL",
      "NOMINAL",
      "NORM.DIST",
      "NORMDIST",
      "NORMINV",
      "NORM.INV",
      "NORM.S.DIST",
      "NORMSDIST",
      "NORM.S.INV",
      "NORMSINV",
      "NOT",
      "NOW",
      "NPER",
      "NPV",
      "NUMBERVALUE",
      "OCT2BIN",
      "OCT2DEC",
      "OCT2HEX",
      "ODD",
      "ODDFPRICE",
      "ODDFYIELD",
      "ODDLPRICE",
      "ODDLYIELD",
      "OFFSET",
      "OR",
      "PDURATION",
      "PEARSON",
      "PERCENTILE.EXC",
      "PERCENTILE.INC",
      "PERCENTILE",
      "PERCENTRANK.EXC",
      "PERCENTRANK.INC",
      "PERCENTRANK",
      "PERMUT",
      "PERMUTATIONA",
      "PHI",
      "PHONETIC",
      "PI",
      "PMT",
      "POISSON.DIST",
      "POISSON",
      "POWER",
      "PPMT",
      "PRICE",
      "PRICEDISC",
      "PRICEMAT",
      "PROB",
      "PRODUCT",
      "PROPER",
      "PV",
      "QUARTILE",
      "QUARTILE.EXC",
      "QUARTILE.INC",
      "QUOTIENT",
      "RADIANS",
      "RAND",
      "RANDBETWEEN",
      "RANK.AVG",
      "RANK.EQ",
      "RANK",
      "RATE",
      "RECEIVED",
      "REGISTER.ID",
      "REPLACE",
      "REPLACEB",
      "REPT",
      "RIGHT",
      "RIGHTB",
      "ROMAN",
      "ROUND",
      "ROUNDDOWN",
      "ROUNDUP",
      "ROW",
      "ROWS",
      "RRI",
      "RSQ",
      "RTD",
      "SEARCH",
      "SEARCHB",
      "SEC",
      "SECH",
      "SECOND",
      "SERIESSUM",
      "SHEET",
      "SHEETS",
      "SIGN",
      "SIN",
      "SINH",
      "SKEW",
      "SKEW.P",
      "SLN",
      "SLOPE",
      "SMALL",
      "SQL.REQUEST",
      "SQRT",
      "SQRTPI",
      "STANDARDIZE",
      "STDEV",
      "STDEV.P",
      "STDEV.S",
      "STDEVA",
      "STDEVP",
      "STDEVPA",
      "STEYX",
      "SUBSTITUTE",
      "SUBTOTAL",
      "SUM",
      "SUMIF",
      "SUMIFS",
      "SUMPRODUCT",
      "SUMSQ",
      "SUMX2MY2",
      "SUMX2PY2",
      "SUMXMY2",
      "SWITCH",
      "SYD",
      "T",
      "TAN",
      "TANH",
      "TBILLEQ",
      "TBILLPRICE",
      "TBILLYIELD",
      "T.DIST",
      "T.DIST.2T",
      "T.DIST.RT",
      "TDIST",
      "TEXT",
      "TEXTJOIN",
      "TIME",
      "TIMEVALUE",
      "T.INV",
      "T.INV.2T",
      "TINV",
      "TODAY",
      "TRANSPOSE",
      "TREND",
      "TRIM",
      "TRIMMEAN",
      "TRUE|0",
      "TRUNC",
      "T.TEST",
      "TTEST",
      "TYPE",
      "UNICHAR",
      "UNICODE",
      "UPPER",
      "VALUE",
      "VAR",
      "VAR.P",
      "VAR.S",
      "VARA",
      "VARP",
      "VARPA",
      "VDB",
      "VLOOKUP",
      "WEBSERVICE",
      "WEEKDAY",
      "WEEKNUM",
      "WEIBULL",
      "WEIBULL.DIST",
      "WORKDAY",
      "WORKDAY.INTL",
      "XIRR",
      "XNPV",
      "XOR",
      "YEAR",
      "YEARFRAC",
      "YIELD",
      "YIELDDISC",
      "YIELDMAT",
      "Z.TEST",
      "ZTEST"
    ];
    return {
      name: 'Excel formulae',
      aliases: [
        'xlsx',
        'xls'
      ],
      case_insensitive: true,
      keywords: {
        $pattern: /[a-zA-Z][\w\.]*/,
        built_in: BUILT_INS
      },
      contains: [
        {
          /* matches a beginning equal sign found in Excel formula examples */
          begin: /^=/,
          end: /[^=]/,
          returnEnd: true,
          illegal: /=/, /* only allow single equal sign at front of line */
          relevance: 10
        },
        /* technically, there can be more than 2 letters in column names, but this prevents conflict with some keywords */
        {
          /* matches a reference to a single cell */
          className: 'symbol',
          begin: /\b[A-Z]{1,2}\d+\b/,
          end: /[^\d]/,
          excludeEnd: true,
          relevance: 0
        },
        {
          /* matches a reference to a range of cells */
          className: 'symbol',
          begin: /[A-Z]{0,2}\d*:[A-Z]{0,2}\d*/,
          relevance: 0
        },
        hljs.BACKSLASH_ESCAPE,
        hljs.QUOTE_STRING_MODE,
        {
          className: 'number',
          begin: hljs.NUMBER_RE + '(%)?',
          relevance: 0
        },
        /* Excel formula comments are done by putting the comment in a function call to N() */
        hljs.COMMENT(/\bN\(/, /\)/,
          {
            excludeBegin: true,
            excludeEnd: true,
            illegal: /\n/
          })
      ]
    };
  }

  return excel;

})();

    hljs.registerLanguage('excel', hljsGrammar);
  })();/*! `fortran` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Fortran
  Author: Anthony Scemama <scemama@irsamc.ups-tlse.fr>
  Website: https://en.wikipedia.org/wiki/Fortran
  Category: scientific
  */

  /** @type LanguageFn */
  function fortran(hljs) {
    const regex = hljs.regex;
    const PARAMS = {
      className: 'params',
      begin: '\\(',
      end: '\\)'
    };

    const COMMENT = { variants: [
      hljs.COMMENT('!', '$', { relevance: 0 }),
      // allow FORTRAN 77 style comments
      hljs.COMMENT('^C[ ]', '$', { relevance: 0 }),
      hljs.COMMENT('^C$', '$', { relevance: 0 })
    ] };

    // regex in both fortran and irpf90 should match
    const OPTIONAL_NUMBER_SUFFIX = /(_[a-z_\d]+)?/;
    const OPTIONAL_NUMBER_EXP = /([de][+-]?\d+)?/;
    const NUMBER = {
      className: 'number',
      variants: [
        { begin: regex.concat(/\b\d+/, /\.(\d*)/, OPTIONAL_NUMBER_EXP, OPTIONAL_NUMBER_SUFFIX) },
        { begin: regex.concat(/\b\d+/, OPTIONAL_NUMBER_EXP, OPTIONAL_NUMBER_SUFFIX) },
        { begin: regex.concat(/\.\d+/, OPTIONAL_NUMBER_EXP, OPTIONAL_NUMBER_SUFFIX) }
      ],
      relevance: 0
    };

    const FUNCTION_DEF = {
      className: 'function',
      beginKeywords: 'subroutine function program',
      illegal: '[${=\\n]',
      contains: [
        hljs.UNDERSCORE_TITLE_MODE,
        PARAMS
      ]
    };

    const STRING = {
      className: 'string',
      relevance: 0,
      variants: [
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE
      ]
    };

    const KEYWORDS = [
      "kind",
      "do",
      "concurrent",
      "local",
      "shared",
      "while",
      "private",
      "call",
      "intrinsic",
      "where",
      "elsewhere",
      "type",
      "endtype",
      "endmodule",
      "endselect",
      "endinterface",
      "end",
      "enddo",
      "endif",
      "if",
      "forall",
      "endforall",
      "only",
      "contains",
      "default",
      "return",
      "stop",
      "then",
      "block",
      "endblock",
      "endassociate",
      "public",
      "subroutine|10",
      "function",
      "program",
      ".and.",
      ".or.",
      ".not.",
      ".le.",
      ".eq.",
      ".ge.",
      ".gt.",
      ".lt.",
      "goto",
      "save",
      "else",
      "use",
      "module",
      "select",
      "case",
      "access",
      "blank",
      "direct",
      "exist",
      "file",
      "fmt",
      "form",
      "formatted",
      "iostat",
      "name",
      "named",
      "nextrec",
      "number",
      "opened",
      "rec",
      "recl",
      "sequential",
      "status",
      "unformatted",
      "unit",
      "continue",
      "format",
      "pause",
      "cycle",
      "exit",
      "c_null_char",
      "c_alert",
      "c_backspace",
      "c_form_feed",
      "flush",
      "wait",
      "decimal",
      "round",
      "iomsg",
      "synchronous",
      "nopass",
      "non_overridable",
      "pass",
      "protected",
      "volatile",
      "abstract",
      "extends",
      "import",
      "non_intrinsic",
      "value",
      "deferred",
      "generic",
      "final",
      "enumerator",
      "class",
      "associate",
      "bind",
      "enum",
      "c_int",
      "c_short",
      "c_long",
      "c_long_long",
      "c_signed_char",
      "c_size_t",
      "c_int8_t",
      "c_int16_t",
      "c_int32_t",
      "c_int64_t",
      "c_int_least8_t",
      "c_int_least16_t",
      "c_int_least32_t",
      "c_int_least64_t",
      "c_int_fast8_t",
      "c_int_fast16_t",
      "c_int_fast32_t",
      "c_int_fast64_t",
      "c_intmax_t",
      "C_intptr_t",
      "c_float",
      "c_double",
      "c_long_double",
      "c_float_complex",
      "c_double_complex",
      "c_long_double_complex",
      "c_bool",
      "c_char",
      "c_null_ptr",
      "c_null_funptr",
      "c_new_line",
      "c_carriage_return",
      "c_horizontal_tab",
      "c_vertical_tab",
      "iso_c_binding",
      "c_loc",
      "c_funloc",
      "c_associated",
      "c_f_pointer",
      "c_ptr",
      "c_funptr",
      "iso_fortran_env",
      "character_storage_size",
      "error_unit",
      "file_storage_size",
      "input_unit",
      "iostat_end",
      "iostat_eor",
      "numeric_storage_size",
      "output_unit",
      "c_f_procpointer",
      "ieee_arithmetic",
      "ieee_support_underflow_control",
      "ieee_get_underflow_mode",
      "ieee_set_underflow_mode",
      "newunit",
      "contiguous",
      "recursive",
      "pad",
      "position",
      "action",
      "delim",
      "readwrite",
      "eor",
      "advance",
      "nml",
      "interface",
      "procedure",
      "namelist",
      "include",
      "sequence",
      "elemental",
      "pure",
      "impure",
      "integer",
      "real",
      "character",
      "complex",
      "logical",
      "codimension",
      "dimension",
      "allocatable|10",
      "parameter",
      "external",
      "implicit|10",
      "none",
      "double",
      "precision",
      "assign",
      "intent",
      "optional",
      "pointer",
      "target",
      "in",
      "out",
      "common",
      "equivalence",
      "data"
    ];
    const LITERALS = [
      ".False.",
      ".True."
    ];
    const BUILT_INS = [
      "alog",
      "alog10",
      "amax0",
      "amax1",
      "amin0",
      "amin1",
      "amod",
      "cabs",
      "ccos",
      "cexp",
      "clog",
      "csin",
      "csqrt",
      "dabs",
      "dacos",
      "dasin",
      "datan",
      "datan2",
      "dcos",
      "dcosh",
      "ddim",
      "dexp",
      "dint",
      "dlog",
      "dlog10",
      "dmax1",
      "dmin1",
      "dmod",
      "dnint",
      "dsign",
      "dsin",
      "dsinh",
      "dsqrt",
      "dtan",
      "dtanh",
      "float",
      "iabs",
      "idim",
      "idint",
      "idnint",
      "ifix",
      "isign",
      "max0",
      "max1",
      "min0",
      "min1",
      "sngl",
      "algama",
      "cdabs",
      "cdcos",
      "cdexp",
      "cdlog",
      "cdsin",
      "cdsqrt",
      "cqabs",
      "cqcos",
      "cqexp",
      "cqlog",
      "cqsin",
      "cqsqrt",
      "dcmplx",
      "dconjg",
      "derf",
      "derfc",
      "dfloat",
      "dgamma",
      "dimag",
      "dlgama",
      "iqint",
      "qabs",
      "qacos",
      "qasin",
      "qatan",
      "qatan2",
      "qcmplx",
      "qconjg",
      "qcos",
      "qcosh",
      "qdim",
      "qerf",
      "qerfc",
      "qexp",
      "qgamma",
      "qimag",
      "qlgama",
      "qlog",
      "qlog10",
      "qmax1",
      "qmin1",
      "qmod",
      "qnint",
      "qsign",
      "qsin",
      "qsinh",
      "qsqrt",
      "qtan",
      "qtanh",
      "abs",
      "acos",
      "aimag",
      "aint",
      "anint",
      "asin",
      "atan",
      "atan2",
      "char",
      "cmplx",
      "conjg",
      "cos",
      "cosh",
      "exp",
      "ichar",
      "index",
      "int",
      "log",
      "log10",
      "max",
      "min",
      "nint",
      "sign",
      "sin",
      "sinh",
      "sqrt",
      "tan",
      "tanh",
      "print",
      "write",
      "dim",
      "lge",
      "lgt",
      "lle",
      "llt",
      "mod",
      "nullify",
      "allocate",
      "deallocate",
      "adjustl",
      "adjustr",
      "all",
      "allocated",
      "any",
      "associated",
      "bit_size",
      "btest",
      "ceiling",
      "count",
      "cshift",
      "date_and_time",
      "digits",
      "dot_product",
      "eoshift",
      "epsilon",
      "exponent",
      "floor",
      "fraction",
      "huge",
      "iand",
      "ibclr",
      "ibits",
      "ibset",
      "ieor",
      "ior",
      "ishft",
      "ishftc",
      "lbound",
      "len_trim",
      "matmul",
      "maxexponent",
      "maxloc",
      "maxval",
      "merge",
      "minexponent",
      "minloc",
      "minval",
      "modulo",
      "mvbits",
      "nearest",
      "pack",
      "present",
      "product",
      "radix",
      "random_number",
      "random_seed",
      "range",
      "repeat",
      "reshape",
      "rrspacing",
      "scale",
      "scan",
      "selected_int_kind",
      "selected_real_kind",
      "set_exponent",
      "shape",
      "size",
      "spacing",
      "spread",
      "sum",
      "system_clock",
      "tiny",
      "transpose",
      "trim",
      "ubound",
      "unpack",
      "verify",
      "achar",
      "iachar",
      "transfer",
      "dble",
      "entry",
      "dprod",
      "cpu_time",
      "command_argument_count",
      "get_command",
      "get_command_argument",
      "get_environment_variable",
      "is_iostat_end",
      "ieee_arithmetic",
      "ieee_support_underflow_control",
      "ieee_get_underflow_mode",
      "ieee_set_underflow_mode",
      "is_iostat_eor",
      "move_alloc",
      "new_line",
      "selected_char_kind",
      "same_type_as",
      "extends_type_of",
      "acosh",
      "asinh",
      "atanh",
      "bessel_j0",
      "bessel_j1",
      "bessel_jn",
      "bessel_y0",
      "bessel_y1",
      "bessel_yn",
      "erf",
      "erfc",
      "erfc_scaled",
      "gamma",
      "log_gamma",
      "hypot",
      "norm2",
      "atomic_define",
      "atomic_ref",
      "execute_command_line",
      "leadz",
      "trailz",
      "storage_size",
      "merge_bits",
      "bge",
      "bgt",
      "ble",
      "blt",
      "dshiftl",
      "dshiftr",
      "findloc",
      "iall",
      "iany",
      "iparity",
      "image_index",
      "lcobound",
      "ucobound",
      "maskl",
      "maskr",
      "num_images",
      "parity",
      "popcnt",
      "poppar",
      "shifta",
      "shiftl",
      "shiftr",
      "this_image",
      "sync",
      "change",
      "team",
      "co_broadcast",
      "co_max",
      "co_min",
      "co_sum",
      "co_reduce"
    ];
    return {
      name: 'Fortran',
      case_insensitive: true,
      aliases: [
        'f90',
        'f95'
      ],
      keywords: {
        keyword: KEYWORDS,
        literal: LITERALS,
        built_in: BUILT_INS
      },
      illegal: /\/\*/,
      contains: [
        STRING,
        FUNCTION_DEF,
        // allow `C = value` for assignments so they aren't misdetected
        // as Fortran 77 style comments
        {
          begin: /^C\s*=(?!=)/,
          relevance: 0
        },
        COMMENT,
        NUMBER
      ]
    };
  }

  return fortran;

})();

    hljs.registerLanguage('fortran', hljsGrammar);
  })();/*! `fsharp` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /**
   * @param {string} value
   * @returns {RegExp}
   * */
  function escape(value) {
    return new RegExp(value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm');
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function source(re) {
    if (!re) return null;
    if (typeof re === "string") return re;

    return re.source;
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function lookahead(re) {
    return concat('(?=', re, ')');
  }

  /**
   * @param {...(RegExp | string) } args
   * @returns {string}
   */
  function concat(...args) {
    const joined = args.map((x) => source(x)).join("");
    return joined;
  }

  /**
   * @param { Array<string | RegExp | Object> } args
   * @returns {object}
   */
  function stripOptionsFromArgs(args) {
    const opts = args[args.length - 1];

    if (typeof opts === 'object' && opts.constructor === Object) {
      args.splice(args.length - 1, 1);
      return opts;
    } else {
      return {};
    }
  }

  /** @typedef { {capture?: boolean} } RegexEitherOptions */

  /**
   * Any of the passed expresssions may match
   *
   * Creates a huge this | this | that | that match
   * @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
   * @returns {string}
   */
  function either(...args) {
    /** @type { object & {capture?: boolean} }  */
    const opts = stripOptionsFromArgs(args);
    const joined = '('
      + (opts.capture ? "" : "?:")
      + args.map((x) => source(x)).join("|") + ")";
    return joined;
  }

  /*
  Language: F#
  Author: Jonas Follesø <jonas@follesoe.no>
  Contributors: Troy Kershaw <hello@troykershaw.com>, Henrik Feldt <henrik@haf.se>, Melvyn Laïly <melvyn.laily@gmail.com>
  Website: https://docs.microsoft.com/en-us/dotnet/fsharp/
  Category: functional
  */


  /** @type LanguageFn */
  function fsharp(hljs) {
    const KEYWORDS = [
      "abstract",
      "and",
      "as",
      "assert",
      "base",
      "begin",
      "class",
      "default",
      "delegate",
      "do",
      "done",
      "downcast",
      "downto",
      "elif",
      "else",
      "end",
      "exception",
      "extern",
      // "false", // literal
      "finally",
      "fixed",
      "for",
      "fun",
      "function",
      "global",
      "if",
      "in",
      "inherit",
      "inline",
      "interface",
      "internal",
      "lazy",
      "let",
      "match",
      "member",
      "module",
      "mutable",
      "namespace",
      "new",
      // "not", // built_in
      // "null", // literal
      "of",
      "open",
      "or",
      "override",
      "private",
      "public",
      "rec",
      "return",
      "static",
      "struct",
      "then",
      "to",
      // "true", // literal
      "try",
      "type",
      "upcast",
      "use",
      "val",
      "void",
      "when",
      "while",
      "with",
      "yield"
    ];

    const BANG_KEYWORD_MODE = {
      // monad builder keywords (matches before non-bang keywords)
      scope: 'keyword',
      match: /\b(yield|return|let|do|match|use)!/
    };

    const PREPROCESSOR_KEYWORDS = [
      "if",
      "else",
      "endif",
      "line",
      "nowarn",
      "light",
      "r",
      "i",
      "I",
      "load",
      "time",
      "help",
      "quit"
    ];

    const LITERALS = [
      "true",
      "false",
      "null",
      "Some",
      "None",
      "Ok",
      "Error",
      "infinity",
      "infinityf",
      "nan",
      "nanf"
    ];

    const SPECIAL_IDENTIFIERS = [
      "__LINE__",
      "__SOURCE_DIRECTORY__",
      "__SOURCE_FILE__"
    ];

    // Since it's possible to re-bind/shadow names (e.g. let char = 'c'),
    // these builtin types should only be matched when a type name is expected.
    const KNOWN_TYPES = [
      // basic types
      "bool",
      "byte",
      "sbyte",
      "int8",
      "int16",
      "int32",
      "uint8",
      "uint16",
      "uint32",
      "int",
      "uint",
      "int64",
      "uint64",
      "nativeint",
      "unativeint",
      "decimal",
      "float",
      "double",
      "float32",
      "single",
      "char",
      "string",
      "unit",
      "bigint",
      // other native types or lowercase aliases
      "option",
      "voption",
      "list",
      "array",
      "seq",
      "byref",
      "exn",
      "inref",
      "nativeptr",
      "obj",
      "outref",
      "voidptr",
      // other important FSharp types
      "Result"
    ];

    const BUILTINS = [
      // Somewhat arbitrary list of builtin functions and values.
      // Most of them are declared in Microsoft.FSharp.Core
      // I tried to stay relevant by adding only the most idiomatic
      // and most used symbols that are not already declared as types.
      "not",
      "ref",
      "raise",
      "reraise",
      "dict",
      "readOnlyDict",
      "set",
      "get",
      "enum",
      "sizeof",
      "typeof",
      "typedefof",
      "nameof",
      "nullArg",
      "invalidArg",
      "invalidOp",
      "id",
      "fst",
      "snd",
      "ignore",
      "lock",
      "using",
      "box",
      "unbox",
      "tryUnbox",
      "printf",
      "printfn",
      "sprintf",
      "eprintf",
      "eprintfn",
      "fprintf",
      "fprintfn",
      "failwith",
      "failwithf"
    ];

    const ALL_KEYWORDS = {
      keyword: KEYWORDS,
      literal: LITERALS,
      built_in: BUILTINS,
      'variable.constant': SPECIAL_IDENTIFIERS
    };

    // (* potentially multi-line Meta Language style comment *)
    const ML_COMMENT =
      hljs.COMMENT(/\(\*(?!\))/, /\*\)/, {
        contains: ["self"]
      });
    // Either a multi-line (* Meta Language style comment *) or a single line // C style comment.
    const COMMENT = {
      variants: [
        ML_COMMENT,
        hljs.C_LINE_COMMENT_MODE,
      ]
    };

    // Most identifiers can contain apostrophes
    const IDENTIFIER_RE = /[a-zA-Z_](\w|')*/;

    const QUOTED_IDENTIFIER = {
      scope: 'variable',
      begin: /``/,
      end: /``/
    };

    // 'a or ^a where a can be a ``quoted identifier``
    const BEGIN_GENERIC_TYPE_SYMBOL_RE = /\B('|\^)/;
    const GENERIC_TYPE_SYMBOL = {
      scope: 'symbol',
      variants: [
        // the type name is a quoted identifier:
        { match: concat(BEGIN_GENERIC_TYPE_SYMBOL_RE, /``.*?``/) },
        // the type name is a normal identifier (we don't use IDENTIFIER_RE because there cannot be another apostrophe here):
        { match: concat(BEGIN_GENERIC_TYPE_SYMBOL_RE, hljs.UNDERSCORE_IDENT_RE) }
      ],
      relevance: 0
    };

    const makeOperatorMode = function({ includeEqual }) {
      // List or symbolic operator characters from the FSharp Spec 4.1, minus the dot, and with `?` added, used for nullable operators.
      let allOperatorChars;
      if (includeEqual)
        allOperatorChars = "!%&*+-/<=>@^|~?";
      else
        allOperatorChars = "!%&*+-/<>@^|~?";
      const OPERATOR_CHARS = Array.from(allOperatorChars);
      const OPERATOR_CHAR_RE = concat('[', ...OPERATOR_CHARS.map(escape), ']');
      // The lone dot operator is special. It cannot be redefined, and we don't want to highlight it. It can be used as part of a multi-chars operator though.
      const OPERATOR_CHAR_OR_DOT_RE = either(OPERATOR_CHAR_RE, /\./);
      // When a dot is present, it must be followed by another operator char:
      const OPERATOR_FIRST_CHAR_OF_MULTIPLE_RE = concat(OPERATOR_CHAR_OR_DOT_RE, lookahead(OPERATOR_CHAR_OR_DOT_RE));
      const SYMBOLIC_OPERATOR_RE = either(
        concat(OPERATOR_FIRST_CHAR_OF_MULTIPLE_RE, OPERATOR_CHAR_OR_DOT_RE, '*'), // Matches at least 2 chars operators
        concat(OPERATOR_CHAR_RE, '+'), // Matches at least one char operators
      );
      return {
        scope: 'operator',
        match: either(
          // symbolic operators:
          SYMBOLIC_OPERATOR_RE,
          // other symbolic keywords:
          // Type casting and conversion operators:
          /:\?>/,
          /:\?/,
          /:>/,
          /:=/, // Reference cell assignment
          /::?/, // : or ::
          /\$/), // A single $ can be used as an operator
        relevance: 0
      };
    };

    const OPERATOR = makeOperatorMode({ includeEqual: true });
    // This variant is used when matching '=' should end a parent mode:
    const OPERATOR_WITHOUT_EQUAL = makeOperatorMode({ includeEqual: false });

    const makeTypeAnnotationMode = function(prefix, prefixScope) {
      return {
        begin: concat( // a type annotation is a
          prefix,            // should be a colon or the 'of' keyword
          lookahead(   // that has to be followed by
            concat(
              /\s*/,         // optional space
              either(  // then either of:
                /\w/,        // word
                /'/,         // generic type name
                /\^/,        // generic type name
                /#/,         // flexible type name
                /``/,        // quoted type name
                /\(/,        // parens type expression
                /{\|/,       // anonymous type annotation
        )))),
        beginScope: prefixScope,
        // BUG: because ending with \n is necessary for some cases, multi-line type annotations are not properly supported.
        // Examples where \n is required at the end:
        // - abstract member definitions in classes: abstract Property : int * string
        // - return type annotations: let f f' = f' () : returnTypeAnnotation
        // - record fields definitions: { A : int \n B : string }
        end: lookahead(
          either(
            /\n/,
            /=/)),
        relevance: 0,
        // we need the known types, and we need the type constraint keywords and literals. e.g.: when 'a : null
        keywords: hljs.inherit(ALL_KEYWORDS, { type: KNOWN_TYPES }),
        contains: [
          COMMENT,
          GENERIC_TYPE_SYMBOL,
          hljs.inherit(QUOTED_IDENTIFIER, { scope: null }), // match to avoid strange patterns inside that may break the parsing
          OPERATOR_WITHOUT_EQUAL
        ]
      };
    };

    const TYPE_ANNOTATION = makeTypeAnnotationMode(/:/, 'operator');
    const DISCRIMINATED_UNION_TYPE_ANNOTATION = makeTypeAnnotationMode(/\bof\b/, 'keyword');

    // type MyType<'a> = ...
    const TYPE_DECLARATION = {
      begin: [
        /(^|\s+)/, // prevents matching the following: `match s.stype with`
        /type/,
        /\s+/,
        IDENTIFIER_RE
      ],
      beginScope: {
        2: 'keyword',
        4: 'title.class'
      },
      end: lookahead(/\(|=|$/),
      keywords: ALL_KEYWORDS, // match keywords in type constraints. e.g.: when 'a : null
      contains: [
        COMMENT,
        hljs.inherit(QUOTED_IDENTIFIER, { scope: null }), // match to avoid strange patterns inside that may break the parsing
        GENERIC_TYPE_SYMBOL,
        {
          // For visual consistency, highlight type brackets as operators.
          scope: 'operator',
          match: /<|>/
        },
        TYPE_ANNOTATION // generic types can have constraints, which are type annotations. e.g. type MyType<'T when 'T : delegate<obj * string>> =
      ]
    };

    const COMPUTATION_EXPRESSION = {
      // computation expressions:
      scope: 'computation-expression',
      // BUG: might conflict with record deconstruction. e.g. let f { Name = name } = name // will highlight f
      match: /\b[_a-z]\w*(?=\s*\{)/
    };

    const PREPROCESSOR = {
      // preprocessor directives and fsi commands:
      begin: [
        /^\s*/,
        concat(/#/, either(...PREPROCESSOR_KEYWORDS)),
        /\b/
      ],
      beginScope: { 2: 'meta' },
      end: lookahead(/\s|$/)
    };

    // TODO: this definition is missing support for type suffixes and octal notation.
    // BUG: range operator without any space is wrongly interpreted as a single number (e.g. 1..10 )
    const NUMBER = {
      variants: [
        hljs.BINARY_NUMBER_MODE,
        hljs.C_NUMBER_MODE
      ]
    };

    // All the following string definitions are potentially multi-line.
    // BUG: these definitions are missing support for byte strings (suffixed with B)

    // "..."
    const QUOTED_STRING = {
      scope: 'string',
      begin: /"/,
      end: /"/,
      contains: [
        hljs.BACKSLASH_ESCAPE
      ]
    };
    // @"..."
    const VERBATIM_STRING = {
      scope: 'string',
      begin: /@"/,
      end: /"/,
      contains: [
        {
          match: /""/ // escaped "
        },
        hljs.BACKSLASH_ESCAPE
      ]
    };
    // """..."""
    const TRIPLE_QUOTED_STRING = {
      scope: 'string',
      begin: /"""/,
      end: /"""/,
      relevance: 2
    };
    const SUBST = {
      scope: 'subst',
      begin: /\{/,
      end: /\}/,
      keywords: ALL_KEYWORDS
    };
    // $"...{1+1}..."
    const INTERPOLATED_STRING = {
      scope: 'string',
      begin: /\$"/,
      end: /"/,
      contains: [
        {
          match: /\{\{/ // escaped {
        },
        {
          match: /\}\}/ // escaped }
        },
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ]
    };
    // $@"...{1+1}..."
    const INTERPOLATED_VERBATIM_STRING = {
      scope: 'string',
      begin: /(\$@|@\$)"/,
      end: /"/,
      contains: [
        {
          match: /\{\{/ // escaped {
        },
        {
          match: /\}\}/ // escaped }
        },
        {
          match: /""/
        },
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ]
    };
    // $"""...{1+1}..."""
    const INTERPOLATED_TRIPLE_QUOTED_STRING = {
      scope: 'string',
      begin: /\$"""/,
      end: /"""/,
      contains: [
        {
          match: /\{\{/ // escaped {
        },
        {
          match: /\}\}/ // escaped }
        },
        SUBST
      ],
      relevance: 2
    };
    // '.'
    const CHAR_LITERAL = {
      scope: 'string',
      match: concat(
        /'/,
        either(
          /[^\\']/, // either a single non escaped char...
          /\\(?:.|\d{3}|x[a-fA-F\d]{2}|u[a-fA-F\d]{4}|U[a-fA-F\d]{8})/ // ...or an escape sequence
        ),
        /'/
      )
    };
    // F# allows a lot of things inside string placeholders.
    // Things that don't currently seem allowed by the compiler: types definition, attributes usage.
    // (Strictly speaking, some of the followings are only allowed inside triple quoted interpolated strings...)
    SUBST.contains = [
      INTERPOLATED_VERBATIM_STRING,
      INTERPOLATED_STRING,
      VERBATIM_STRING,
      QUOTED_STRING,
      CHAR_LITERAL,
      BANG_KEYWORD_MODE,
      COMMENT,
      QUOTED_IDENTIFIER,
      TYPE_ANNOTATION,
      COMPUTATION_EXPRESSION,
      PREPROCESSOR,
      NUMBER,
      GENERIC_TYPE_SYMBOL,
      OPERATOR
    ];
    const STRING = {
      variants: [
        INTERPOLATED_TRIPLE_QUOTED_STRING,
        INTERPOLATED_VERBATIM_STRING,
        INTERPOLATED_STRING,
        TRIPLE_QUOTED_STRING,
        VERBATIM_STRING,
        QUOTED_STRING,
        CHAR_LITERAL
      ]
    };

    return {
      name: 'F#',
      aliases: [
        'fs',
        'f#'
      ],
      keywords: ALL_KEYWORDS,
      illegal: /\/\*/,
      classNameAliases: {
        'computation-expression': 'keyword'
      },
      contains: [
        BANG_KEYWORD_MODE,
        STRING,
        COMMENT,
        QUOTED_IDENTIFIER,
        TYPE_DECLARATION,
        {
          // e.g. [<Attributes("")>] or [<``module``: MyCustomAttributeThatWorksOnModules>]
          // or [<Sealed; NoEquality; NoComparison; CompiledName("FSharpAsync`1")>]
          scope: 'meta',
          begin: /\[</,
          end: />\]/,
          relevance: 2,
          contains: [
            QUOTED_IDENTIFIER,
            // can contain any constant value
            TRIPLE_QUOTED_STRING,
            VERBATIM_STRING,
            QUOTED_STRING,
            CHAR_LITERAL,
            NUMBER
          ]
        },
        DISCRIMINATED_UNION_TYPE_ANNOTATION,
        TYPE_ANNOTATION,
        COMPUTATION_EXPRESSION,
        PREPROCESSOR,
        NUMBER,
        GENERIC_TYPE_SYMBOL,
        OPERATOR
      ]
    };
  }

  return fsharp;

})();

    hljs.registerLanguage('fsharp', hljsGrammar);
  })();/*! `gcode` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
   Language: G-code (ISO 6983)
   Contributors: Adam Joseph Cook <adam.joseph.cook@gmail.com>
   Description: G-code syntax highlighter for Fanuc and other common CNC machine tool controls.
   Website: https://www.sis.se/api/document/preview/911952/
   Category: hardware
   */

  function gcode(hljs) {
    const GCODE_IDENT_RE = '[A-Z_][A-Z0-9_.]*';
    const GCODE_CLOSE_RE = '%';
    const GCODE_KEYWORDS = {
      $pattern: GCODE_IDENT_RE,
      keyword: 'IF DO WHILE ENDWHILE CALL ENDIF SUB ENDSUB GOTO REPEAT ENDREPEAT '
        + 'EQ LT GT NE GE LE OR XOR'
    };
    const GCODE_START = {
      className: 'meta',
      begin: '([O])([0-9]+)'
    };
    const NUMBER = hljs.inherit(hljs.C_NUMBER_MODE, { begin: '([-+]?((\\.\\d+)|(\\d+)(\\.\\d*)?))|' + hljs.C_NUMBER_RE });
    const GCODE_CODE = [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.COMMENT(/\(/, /\)/),
      NUMBER,
      hljs.inherit(hljs.APOS_STRING_MODE, { illegal: null }),
      hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null }),
      {
        className: 'name',
        begin: '([G])([0-9]+\\.?[0-9]?)'
      },
      {
        className: 'name',
        begin: '([M])([0-9]+\\.?[0-9]?)'
      },
      {
        className: 'attr',
        begin: '(VC|VS|#)',
        end: '(\\d+)'
      },
      {
        className: 'attr',
        begin: '(VZOFX|VZOFY|VZOFZ)'
      },
      {
        className: 'built_in',
        begin: '(ATAN|ABS|ACOS|ASIN|SIN|COS|EXP|FIX|FUP|ROUND|LN|TAN)(\\[)',
        contains: [ NUMBER ],
        end: '\\]'
      },
      {
        className: 'symbol',
        variants: [
          {
            begin: 'N',
            end: '\\d+',
            illegal: '\\W'
          }
        ]
      }
    ];

    return {
      name: 'G-code (ISO 6983)',
      aliases: [ 'nc' ],
      // Some implementations (CNC controls) of G-code are interoperable with uppercase and lowercase letters seamlessly.
      // However, most prefer all uppercase and uppercase is customary.
      case_insensitive: true,
      keywords: GCODE_KEYWORDS,
      contains: [
        {
          className: 'meta',
          begin: GCODE_CLOSE_RE
        },
        GCODE_START
      ].concat(GCODE_CODE)
    };
  }

  return gcode;

})();

    hljs.registerLanguage('gcode', hljsGrammar);
  })();/*! `glsl` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: GLSL
  Description: OpenGL Shading Language
  Author: Sergey Tikhomirov <sergey@tikhomirov.io>
  Website: https://en.wikipedia.org/wiki/OpenGL_Shading_Language
  Category: graphics
  */

  function glsl(hljs) {
    return {
      name: 'GLSL',
      keywords: {
        keyword:
          // Statements
          'break continue discard do else for if return while switch case default '
          // Qualifiers
          + 'attribute binding buffer ccw centroid centroid varying coherent column_major const cw '
          + 'depth_any depth_greater depth_less depth_unchanged early_fragment_tests equal_spacing '
          + 'flat fractional_even_spacing fractional_odd_spacing highp in index inout invariant '
          + 'invocations isolines layout line_strip lines lines_adjacency local_size_x local_size_y '
          + 'local_size_z location lowp max_vertices mediump noperspective offset origin_upper_left '
          + 'out packed patch pixel_center_integer point_mode points precise precision quads r11f_g11f_b10f '
          + 'r16 r16_snorm r16f r16i r16ui r32f r32i r32ui r8 r8_snorm r8i r8ui readonly restrict '
          + 'rg16 rg16_snorm rg16f rg16i rg16ui rg32f rg32i rg32ui rg8 rg8_snorm rg8i rg8ui rgb10_a2 '
          + 'rgb10_a2ui rgba16 rgba16_snorm rgba16f rgba16i rgba16ui rgba32f rgba32i rgba32ui rgba8 '
          + 'rgba8_snorm rgba8i rgba8ui row_major sample shared smooth std140 std430 stream triangle_strip '
          + 'triangles triangles_adjacency uniform varying vertices volatile writeonly',
        type:
          'atomic_uint bool bvec2 bvec3 bvec4 dmat2 dmat2x2 dmat2x3 dmat2x4 dmat3 dmat3x2 dmat3x3 '
          + 'dmat3x4 dmat4 dmat4x2 dmat4x3 dmat4x4 double dvec2 dvec3 dvec4 float iimage1D iimage1DArray '
          + 'iimage2D iimage2DArray iimage2DMS iimage2DMSArray iimage2DRect iimage3D iimageBuffer '
          + 'iimageCube iimageCubeArray image1D image1DArray image2D image2DArray image2DMS image2DMSArray '
          + 'image2DRect image3D imageBuffer imageCube imageCubeArray int isampler1D isampler1DArray '
          + 'isampler2D isampler2DArray isampler2DMS isampler2DMSArray isampler2DRect isampler3D '
          + 'isamplerBuffer isamplerCube isamplerCubeArray ivec2 ivec3 ivec4 mat2 mat2x2 mat2x3 '
          + 'mat2x4 mat3 mat3x2 mat3x3 mat3x4 mat4 mat4x2 mat4x3 mat4x4 sampler1D sampler1DArray '
          + 'sampler1DArrayShadow sampler1DShadow sampler2D sampler2DArray sampler2DArrayShadow '
          + 'sampler2DMS sampler2DMSArray sampler2DRect sampler2DRectShadow sampler2DShadow sampler3D '
          + 'samplerBuffer samplerCube samplerCubeArray samplerCubeArrayShadow samplerCubeShadow '
          + 'image1D uimage1DArray uimage2D uimage2DArray uimage2DMS uimage2DMSArray uimage2DRect '
          + 'uimage3D uimageBuffer uimageCube uimageCubeArray uint usampler1D usampler1DArray '
          + 'usampler2D usampler2DArray usampler2DMS usampler2DMSArray usampler2DRect usampler3D '
          + 'samplerBuffer usamplerCube usamplerCubeArray uvec2 uvec3 uvec4 vec2 vec3 vec4 void',
        built_in:
          // Constants
          'gl_MaxAtomicCounterBindings gl_MaxAtomicCounterBufferSize gl_MaxClipDistances gl_MaxClipPlanes '
          + 'gl_MaxCombinedAtomicCounterBuffers gl_MaxCombinedAtomicCounters gl_MaxCombinedImageUniforms '
          + 'gl_MaxCombinedImageUnitsAndFragmentOutputs gl_MaxCombinedTextureImageUnits gl_MaxComputeAtomicCounterBuffers '
          + 'gl_MaxComputeAtomicCounters gl_MaxComputeImageUniforms gl_MaxComputeTextureImageUnits '
          + 'gl_MaxComputeUniformComponents gl_MaxComputeWorkGroupCount gl_MaxComputeWorkGroupSize '
          + 'gl_MaxDrawBuffers gl_MaxFragmentAtomicCounterBuffers gl_MaxFragmentAtomicCounters '
          + 'gl_MaxFragmentImageUniforms gl_MaxFragmentInputComponents gl_MaxFragmentInputVectors '
          + 'gl_MaxFragmentUniformComponents gl_MaxFragmentUniformVectors gl_MaxGeometryAtomicCounterBuffers '
          + 'gl_MaxGeometryAtomicCounters gl_MaxGeometryImageUniforms gl_MaxGeometryInputComponents '
          + 'gl_MaxGeometryOutputComponents gl_MaxGeometryOutputVertices gl_MaxGeometryTextureImageUnits '
          + 'gl_MaxGeometryTotalOutputComponents gl_MaxGeometryUniformComponents gl_MaxGeometryVaryingComponents '
          + 'gl_MaxImageSamples gl_MaxImageUnits gl_MaxLights gl_MaxPatchVertices gl_MaxProgramTexelOffset '
          + 'gl_MaxTessControlAtomicCounterBuffers gl_MaxTessControlAtomicCounters gl_MaxTessControlImageUniforms '
          + 'gl_MaxTessControlInputComponents gl_MaxTessControlOutputComponents gl_MaxTessControlTextureImageUnits '
          + 'gl_MaxTessControlTotalOutputComponents gl_MaxTessControlUniformComponents '
          + 'gl_MaxTessEvaluationAtomicCounterBuffers gl_MaxTessEvaluationAtomicCounters '
          + 'gl_MaxTessEvaluationImageUniforms gl_MaxTessEvaluationInputComponents gl_MaxTessEvaluationOutputComponents '
          + 'gl_MaxTessEvaluationTextureImageUnits gl_MaxTessEvaluationUniformComponents '
          + 'gl_MaxTessGenLevel gl_MaxTessPatchComponents gl_MaxTextureCoords gl_MaxTextureImageUnits '
          + 'gl_MaxTextureUnits gl_MaxVaryingComponents gl_MaxVaryingFloats gl_MaxVaryingVectors '
          + 'gl_MaxVertexAtomicCounterBuffers gl_MaxVertexAtomicCounters gl_MaxVertexAttribs gl_MaxVertexImageUniforms '
          + 'gl_MaxVertexOutputComponents gl_MaxVertexOutputVectors gl_MaxVertexTextureImageUnits '
          + 'gl_MaxVertexUniformComponents gl_MaxVertexUniformVectors gl_MaxViewports gl_MinProgramTexelOffset '
          // Variables
          + 'gl_BackColor gl_BackLightModelProduct gl_BackLightProduct gl_BackMaterial '
          + 'gl_BackSecondaryColor gl_ClipDistance gl_ClipPlane gl_ClipVertex gl_Color '
          + 'gl_DepthRange gl_EyePlaneQ gl_EyePlaneR gl_EyePlaneS gl_EyePlaneT gl_Fog gl_FogCoord '
          + 'gl_FogFragCoord gl_FragColor gl_FragCoord gl_FragData gl_FragDepth gl_FrontColor '
          + 'gl_FrontFacing gl_FrontLightModelProduct gl_FrontLightProduct gl_FrontMaterial '
          + 'gl_FrontSecondaryColor gl_GlobalInvocationID gl_InstanceID gl_InvocationID gl_Layer gl_LightModel '
          + 'gl_LightSource gl_LocalInvocationID gl_LocalInvocationIndex gl_ModelViewMatrix '
          + 'gl_ModelViewMatrixInverse gl_ModelViewMatrixInverseTranspose gl_ModelViewMatrixTranspose '
          + 'gl_ModelViewProjectionMatrix gl_ModelViewProjectionMatrixInverse gl_ModelViewProjectionMatrixInverseTranspose '
          + 'gl_ModelViewProjectionMatrixTranspose gl_MultiTexCoord0 gl_MultiTexCoord1 gl_MultiTexCoord2 '
          + 'gl_MultiTexCoord3 gl_MultiTexCoord4 gl_MultiTexCoord5 gl_MultiTexCoord6 gl_MultiTexCoord7 '
          + 'gl_Normal gl_NormalMatrix gl_NormalScale gl_NumSamples gl_NumWorkGroups gl_ObjectPlaneQ '
          + 'gl_ObjectPlaneR gl_ObjectPlaneS gl_ObjectPlaneT gl_PatchVerticesIn gl_Point gl_PointCoord '
          + 'gl_PointSize gl_Position gl_PrimitiveID gl_PrimitiveIDIn gl_ProjectionMatrix gl_ProjectionMatrixInverse '
          + 'gl_ProjectionMatrixInverseTranspose gl_ProjectionMatrixTranspose gl_SampleID gl_SampleMask '
          + 'gl_SampleMaskIn gl_SamplePosition gl_SecondaryColor gl_TessCoord gl_TessLevelInner gl_TessLevelOuter '
          + 'gl_TexCoord gl_TextureEnvColor gl_TextureMatrix gl_TextureMatrixInverse gl_TextureMatrixInverseTranspose '
          + 'gl_TextureMatrixTranspose gl_Vertex gl_VertexID gl_ViewportIndex gl_WorkGroupID gl_WorkGroupSize gl_in gl_out '
          // Functions
          + 'EmitStreamVertex EmitVertex EndPrimitive EndStreamPrimitive abs acos acosh all any asin '
          + 'asinh atan atanh atomicAdd atomicAnd atomicCompSwap atomicCounter atomicCounterDecrement '
          + 'atomicCounterIncrement atomicExchange atomicMax atomicMin atomicOr atomicXor barrier '
          + 'bitCount bitfieldExtract bitfieldInsert bitfieldReverse ceil clamp cos cosh cross '
          + 'dFdx dFdy degrees determinant distance dot equal exp exp2 faceforward findLSB findMSB '
          + 'floatBitsToInt floatBitsToUint floor fma fract frexp ftransform fwidth greaterThan '
          + 'greaterThanEqual groupMemoryBarrier imageAtomicAdd imageAtomicAnd imageAtomicCompSwap '
          + 'imageAtomicExchange imageAtomicMax imageAtomicMin imageAtomicOr imageAtomicXor imageLoad '
          + 'imageSize imageStore imulExtended intBitsToFloat interpolateAtCentroid interpolateAtOffset '
          + 'interpolateAtSample inverse inversesqrt isinf isnan ldexp length lessThan lessThanEqual log '
          + 'log2 matrixCompMult max memoryBarrier memoryBarrierAtomicCounter memoryBarrierBuffer '
          + 'memoryBarrierImage memoryBarrierShared min mix mod modf noise1 noise2 noise3 noise4 '
          + 'normalize not notEqual outerProduct packDouble2x32 packHalf2x16 packSnorm2x16 packSnorm4x8 '
          + 'packUnorm2x16 packUnorm4x8 pow radians reflect refract round roundEven shadow1D shadow1DLod '
          + 'shadow1DProj shadow1DProjLod shadow2D shadow2DLod shadow2DProj shadow2DProjLod sign sin sinh '
          + 'smoothstep sqrt step tan tanh texelFetch texelFetchOffset texture texture1D texture1DLod '
          + 'texture1DProj texture1DProjLod texture2D texture2DLod texture2DProj texture2DProjLod '
          + 'texture3D texture3DLod texture3DProj texture3DProjLod textureCube textureCubeLod '
          + 'textureGather textureGatherOffset textureGatherOffsets textureGrad textureGradOffset '
          + 'textureLod textureLodOffset textureOffset textureProj textureProjGrad textureProjGradOffset '
          + 'textureProjLod textureProjLodOffset textureProjOffset textureQueryLevels textureQueryLod '
          + 'textureSize transpose trunc uaddCarry uintBitsToFloat umulExtended unpackDouble2x32 '
          + 'unpackHalf2x16 unpackSnorm2x16 unpackSnorm4x8 unpackUnorm2x16 unpackUnorm4x8 usubBorrow',
        literal: 'true false'
      },
      illegal: '"',
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_NUMBER_MODE,
        {
          className: 'meta',
          begin: '#',
          end: '$'
        }
      ]
    };
  }

  return glsl;

})();

    hljs.registerLanguage('glsl', hljsGrammar);
  })();/*! `gradle` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Gradle
  Description: Gradle is an open-source build automation tool focused on flexibility and performance.
  Website: https://gradle.org
  Author: Damian Mee <mee.damian@gmail.com>
  Category: build-system
  */

  function gradle(hljs) {
    const KEYWORDS = [
      "task",
      "project",
      "allprojects",
      "subprojects",
      "artifacts",
      "buildscript",
      "configurations",
      "dependencies",
      "repositories",
      "sourceSets",
      "description",
      "delete",
      "from",
      "into",
      "include",
      "exclude",
      "source",
      "classpath",
      "destinationDir",
      "includes",
      "options",
      "sourceCompatibility",
      "targetCompatibility",
      "group",
      "flatDir",
      "doLast",
      "doFirst",
      "flatten",
      "todir",
      "fromdir",
      "ant",
      "def",
      "abstract",
      "break",
      "case",
      "catch",
      "continue",
      "default",
      "do",
      "else",
      "extends",
      "final",
      "finally",
      "for",
      "if",
      "implements",
      "instanceof",
      "native",
      "new",
      "private",
      "protected",
      "public",
      "return",
      "static",
      "switch",
      "synchronized",
      "throw",
      "throws",
      "transient",
      "try",
      "volatile",
      "while",
      "strictfp",
      "package",
      "import",
      "false",
      "null",
      "super",
      "this",
      "true",
      "antlrtask",
      "checkstyle",
      "codenarc",
      "copy",
      "boolean",
      "byte",
      "char",
      "class",
      "double",
      "float",
      "int",
      "interface",
      "long",
      "short",
      "void",
      "compile",
      "runTime",
      "file",
      "fileTree",
      "abs",
      "any",
      "append",
      "asList",
      "asWritable",
      "call",
      "collect",
      "compareTo",
      "count",
      "div",
      "dump",
      "each",
      "eachByte",
      "eachFile",
      "eachLine",
      "every",
      "find",
      "findAll",
      "flatten",
      "getAt",
      "getErr",
      "getIn",
      "getOut",
      "getText",
      "grep",
      "immutable",
      "inject",
      "inspect",
      "intersect",
      "invokeMethods",
      "isCase",
      "join",
      "leftShift",
      "minus",
      "multiply",
      "newInputStream",
      "newOutputStream",
      "newPrintWriter",
      "newReader",
      "newWriter",
      "next",
      "plus",
      "pop",
      "power",
      "previous",
      "print",
      "println",
      "push",
      "putAt",
      "read",
      "readBytes",
      "readLines",
      "reverse",
      "reverseEach",
      "round",
      "size",
      "sort",
      "splitEachLine",
      "step",
      "subMap",
      "times",
      "toInteger",
      "toList",
      "tokenize",
      "upto",
      "waitForOrKill",
      "withPrintWriter",
      "withReader",
      "withStream",
      "withWriter",
      "withWriterAppend",
      "write",
      "writeLine"
    ];
    return {
      name: 'Gradle',
      case_insensitive: true,
      keywords: KEYWORDS,
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
        hljs.REGEXP_MODE

      ]
    };
  }

  return gradle;

})();

    hljs.registerLanguage('gradle', hljsGrammar);
  })();/*! `haml` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: HAML
  Requires: ruby.js
  Author: Dan Allen <dan.j.allen@gmail.com>
  Website: http://haml.info
  Category: template
  */

  // TODO support filter tags like :javascript, support inline HTML
  function haml(hljs) {
    return {
      name: 'HAML',
      case_insensitive: true,
      contains: [
        {
          className: 'meta',
          begin: '^!!!( (5|1\\.1|Strict|Frameset|Basic|Mobile|RDFa|XML\\b.*))?$',
          relevance: 10
        },
        // FIXME these comments should be allowed to span indented lines
        hljs.COMMENT(
          '^\\s*(!=#|=#|-#|/).*$',
          null,
          { relevance: 0 }
        ),
        {
          begin: '^\\s*(-|=|!=)(?!#)',
          end: /$/,
          subLanguage: 'ruby',
          excludeBegin: true,
          excludeEnd: true
        },
        {
          className: 'tag',
          begin: '^\\s*%',
          contains: [
            {
              className: 'selector-tag',
              begin: '\\w+'
            },
            {
              className: 'selector-id',
              begin: '#[\\w-]+'
            },
            {
              className: 'selector-class',
              begin: '\\.[\\w-]+'
            },
            {
              begin: /\{\s*/,
              end: /\s*\}/,
              contains: [
                {
                  begin: ':\\w+\\s*=>',
                  end: ',\\s+',
                  returnBegin: true,
                  endsWithParent: true,
                  contains: [
                    {
                      className: 'attr',
                      begin: ':\\w+'
                    },
                    hljs.APOS_STRING_MODE,
                    hljs.QUOTE_STRING_MODE,
                    {
                      begin: '\\w+',
                      relevance: 0
                    }
                  ]
                }
              ]
            },
            {
              begin: '\\(\\s*',
              end: '\\s*\\)',
              excludeEnd: true,
              contains: [
                {
                  begin: '\\w+\\s*=',
                  end: '\\s+',
                  returnBegin: true,
                  endsWithParent: true,
                  contains: [
                    {
                      className: 'attr',
                      begin: '\\w+',
                      relevance: 0
                    },
                    hljs.APOS_STRING_MODE,
                    hljs.QUOTE_STRING_MODE,
                    {
                      begin: '\\w+',
                      relevance: 0
                    }
                  ]
                }
              ]
            }
          ]
        },
        { begin: '^\\s*[=~]\\s*' },
        {
          begin: /#\{/,
          end: /\}/,
          subLanguage: 'ruby',
          excludeBegin: true,
          excludeEnd: true
        }
      ]
    };
  }

  return haml;

})();

    hljs.registerLanguage('haml', hljsGrammar);
  })();/*! `handlebars` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Handlebars
  Requires: xml.js
  Author: Robin Ward <robin.ward@gmail.com>
  Description: Matcher for Handlebars as well as EmberJS additions.
  Website: https://handlebarsjs.com
  Category: template
  */

  function handlebars(hljs) {
    const regex = hljs.regex;
    const BUILT_INS = {
      $pattern: /[\w.\/]+/,
      built_in: [
        'action',
        'bindattr',
        'collection',
        'component',
        'concat',
        'debugger',
        'each',
        'each-in',
        'get',
        'hash',
        'if',
        'in',
        'input',
        'link-to',
        'loc',
        'log',
        'lookup',
        'mut',
        'outlet',
        'partial',
        'query-params',
        'render',
        'template',
        'textarea',
        'unbound',
        'unless',
        'view',
        'with',
        'yield'
      ]
    };

    const LITERALS = {
      $pattern: /[\w.\/]+/,
      literal: [
        'true',
        'false',
        'undefined',
        'null'
      ]
    };

    // as defined in https://handlebarsjs.com/guide/expressions.html#literal-segments
    // this regex matches literal segments like ' abc ' or [ abc ] as well as helpers and paths
    // like a/b, ./abc/cde, and abc.bcd

    const DOUBLE_QUOTED_ID_REGEX = /""|"[^"]+"/;
    const SINGLE_QUOTED_ID_REGEX = /''|'[^']+'/;
    const BRACKET_QUOTED_ID_REGEX = /\[\]|\[[^\]]+\]/;
    const PLAIN_ID_REGEX = /[^\s!"#%&'()*+,.\/;<=>@\[\\\]^`{|}~]+/;
    const PATH_DELIMITER_REGEX = /(\.|\/)/;
    const ANY_ID = regex.either(
      DOUBLE_QUOTED_ID_REGEX,
      SINGLE_QUOTED_ID_REGEX,
      BRACKET_QUOTED_ID_REGEX,
      PLAIN_ID_REGEX
    );

    const IDENTIFIER_REGEX = regex.concat(
      regex.optional(/\.|\.\/|\//), // relative or absolute path
      ANY_ID,
      regex.anyNumberOfTimes(regex.concat(
        PATH_DELIMITER_REGEX,
        ANY_ID
      ))
    );

    // identifier followed by a equal-sign (without the equal sign)
    const HASH_PARAM_REGEX = regex.concat(
      '(',
      BRACKET_QUOTED_ID_REGEX, '|',
      PLAIN_ID_REGEX,
      ')(?==)'
    );

    const HELPER_NAME_OR_PATH_EXPRESSION = { begin: IDENTIFIER_REGEX };

    const HELPER_PARAMETER = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, { keywords: LITERALS });

    const SUB_EXPRESSION = {
      begin: /\(/,
      end: /\)/
      // the "contains" is added below when all necessary sub-modes are defined
    };

    const HASH = {
      // fka "attribute-assignment", parameters of the form 'key=value'
      className: 'attr',
      begin: HASH_PARAM_REGEX,
      relevance: 0,
      starts: {
        begin: /=/,
        end: /=/,
        starts: { contains: [
          hljs.NUMBER_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          HELPER_PARAMETER,
          SUB_EXPRESSION
        ] }
      }
    };

    const BLOCK_PARAMS = {
      // parameters of the form '{{#with x as | y |}}...{{/with}}'
      begin: /as\s+\|/,
      keywords: { keyword: 'as' },
      end: /\|/,
      contains: [
        {
          // define sub-mode in order to prevent highlighting of block-parameter named "as"
          begin: /\w+/ }
      ]
    };

    const HELPER_PARAMETERS = {
      contains: [
        hljs.NUMBER_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.APOS_STRING_MODE,
        BLOCK_PARAMS,
        HASH,
        HELPER_PARAMETER,
        SUB_EXPRESSION
      ],
      returnEnd: true
      // the property "end" is defined through inheritance when the mode is used. If depends
      // on the surrounding mode, but "endsWithParent" does not work here (i.e. it includes the
      // end-token of the surrounding mode)
    };

    const SUB_EXPRESSION_CONTENTS = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
      className: 'name',
      keywords: BUILT_INS,
      starts: hljs.inherit(HELPER_PARAMETERS, { end: /\)/ })
    });

    SUB_EXPRESSION.contains = [ SUB_EXPRESSION_CONTENTS ];

    const OPENING_BLOCK_MUSTACHE_CONTENTS = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
      keywords: BUILT_INS,
      className: 'name',
      starts: hljs.inherit(HELPER_PARAMETERS, { end: /\}\}/ })
    });

    const CLOSING_BLOCK_MUSTACHE_CONTENTS = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
      keywords: BUILT_INS,
      className: 'name'
    });

    const BASIC_MUSTACHE_CONTENTS = hljs.inherit(HELPER_NAME_OR_PATH_EXPRESSION, {
      className: 'name',
      keywords: BUILT_INS,
      starts: hljs.inherit(HELPER_PARAMETERS, { end: /\}\}/ })
    });

    const ESCAPE_MUSTACHE_WITH_PRECEEDING_BACKSLASH = {
      begin: /\\\{\{/,
      skip: true
    };
    const PREVENT_ESCAPE_WITH_ANOTHER_PRECEEDING_BACKSLASH = {
      begin: /\\\\(?=\{\{)/,
      skip: true
    };

    return {
      name: 'Handlebars',
      aliases: [
        'hbs',
        'html.hbs',
        'html.handlebars',
        'htmlbars'
      ],
      case_insensitive: true,
      subLanguage: 'xml',
      contains: [
        ESCAPE_MUSTACHE_WITH_PRECEEDING_BACKSLASH,
        PREVENT_ESCAPE_WITH_ANOTHER_PRECEEDING_BACKSLASH,
        hljs.COMMENT(/\{\{!--/, /--\}\}/),
        hljs.COMMENT(/\{\{!/, /\}\}/),
        {
          // open raw block "{{{{raw}}}} content not evaluated {{{{/raw}}}}"
          className: 'template-tag',
          begin: /\{\{\{\{(?!\/)/,
          end: /\}\}\}\}/,
          contains: [ OPENING_BLOCK_MUSTACHE_CONTENTS ],
          starts: {
            end: /\{\{\{\{\//,
            returnEnd: true,
            subLanguage: 'xml'
          }
        },
        {
          // close raw block
          className: 'template-tag',
          begin: /\{\{\{\{\//,
          end: /\}\}\}\}/,
          contains: [ CLOSING_BLOCK_MUSTACHE_CONTENTS ]
        },
        {
          // open block statement
          className: 'template-tag',
          begin: /\{\{#/,
          end: /\}\}/,
          contains: [ OPENING_BLOCK_MUSTACHE_CONTENTS ]
        },
        {
          className: 'template-tag',
          begin: /\{\{(?=else\}\})/,
          end: /\}\}/,
          keywords: 'else'
        },
        {
          className: 'template-tag',
          begin: /\{\{(?=else if)/,
          end: /\}\}/,
          keywords: 'else if'
        },
        {
          // closing block statement
          className: 'template-tag',
          begin: /\{\{\//,
          end: /\}\}/,
          contains: [ CLOSING_BLOCK_MUSTACHE_CONTENTS ]
        },
        {
          // template variable or helper-call that is NOT html-escaped
          className: 'template-variable',
          begin: /\{\{\{/,
          end: /\}\}\}/,
          contains: [ BASIC_MUSTACHE_CONTENTS ]
        },
        {
          // template variable or helper-call that is html-escaped
          className: 'template-variable',
          begin: /\{\{/,
          end: /\}\}/,
          contains: [ BASIC_MUSTACHE_CONTENTS ]
        }
      ]
    };
  }

  return handlebars;

})();

    hljs.registerLanguage('handlebars', hljsGrammar);
  })();/*! `haskell` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Haskell
  Author: Jeremy Hull <sourdrums@gmail.com>
  Contributors: Zena Treep <zena.treep@gmail.com>
  Website: https://www.haskell.org
  Category: functional
  */

  function haskell(hljs) {

    /* See:
       - https://www.haskell.org/onlinereport/lexemes.html
       - https://downloads.haskell.org/ghc/9.0.1/docs/html/users_guide/exts/binary_literals.html
       - https://downloads.haskell.org/ghc/9.0.1/docs/html/users_guide/exts/numeric_underscores.html
       - https://downloads.haskell.org/ghc/9.0.1/docs/html/users_guide/exts/hex_float_literals.html
    */
    const decimalDigits = '([0-9]_*)+';
    const hexDigits = '([0-9a-fA-F]_*)+';
    const binaryDigits = '([01]_*)+';
    const octalDigits = '([0-7]_*)+';
    const ascSymbol = '[!#$%&*+.\\/<=>?@\\\\^~-]';
    const uniSymbol = '(\\p{S}|\\p{P})'; // Symbol or Punctuation
    const special = '[(),;\\[\\]`|{}]';
    const symbol = `(${ascSymbol}|(?!(${special}|[_:"']))${uniSymbol})`;

    const COMMENT = { variants: [
      // Double dash forms a valid comment only if it's not part of legal lexeme.
      // See: Haskell 98 report: https://www.haskell.org/onlinereport/lexemes.html
      //
      // The commented code does the job, but we can't use negative lookbehind,
      // due to poor support by Safari browser.
      // > hljs.COMMENT(`(?<!${symbol})--+(?!${symbol})`, '$'),
      // So instead, we'll add a no-markup rule before the COMMENT rule in the rules list
      // to match the problematic infix operators that contain double dash.
      hljs.COMMENT('--+', '$'),
      hljs.COMMENT(
        /\{-/,
        /-\}/,
        { contains: [ 'self' ] }
      )
    ] };

    const PRAGMA = {
      className: 'meta',
      begin: /\{-#/,
      end: /#-\}/
    };

    const PREPROCESSOR = {
      className: 'meta',
      begin: '^#',
      end: '$'
    };

    const CONSTRUCTOR = {
      className: 'type',
      begin: '\\b[A-Z][\\w\']*', // TODO: other constructors (build-in, infix).
      relevance: 0
    };

    const LIST = {
      begin: '\\(',
      end: '\\)',
      illegal: '"',
      contains: [
        PRAGMA,
        PREPROCESSOR,
        {
          className: 'type',
          begin: '\\b[A-Z][\\w]*(\\((\\.\\.|,|\\w+)\\))?'
        },
        hljs.inherit(hljs.TITLE_MODE, { begin: '[_a-z][\\w\']*' }),
        COMMENT
      ]
    };

    const RECORD = {
      begin: /\{/,
      end: /\}/,
      contains: LIST.contains
    };

    const NUMBER = {
      className: 'number',
      relevance: 0,
      variants: [
        // decimal floating-point-literal (subsumes decimal-literal)
        { match: `\\b(${decimalDigits})(\\.(${decimalDigits}))?` + `([eE][+-]?(${decimalDigits}))?\\b` },
        // hexadecimal floating-point-literal (subsumes hexadecimal-literal)
        { match: `\\b0[xX]_*(${hexDigits})(\\.(${hexDigits}))?` + `([pP][+-]?(${decimalDigits}))?\\b` },
        // octal-literal
        { match: `\\b0[oO](${octalDigits})\\b` },
        // binary-literal
        { match: `\\b0[bB](${binaryDigits})\\b` }
      ]
    };

    return {
      name: 'Haskell',
      aliases: [ 'hs' ],
      keywords:
        'let in if then else case of where do module import hiding '
        + 'qualified type data newtype deriving class instance as default '
        + 'infix infixl infixr foreign export ccall stdcall cplusplus '
        + 'jvm dotnet safe unsafe family forall mdo proc rec',
      unicodeRegex: true,
      contains: [
        // Top-level constructions.
        {
          beginKeywords: 'module',
          end: 'where',
          keywords: 'module where',
          contains: [
            LIST,
            COMMENT
          ],
          illegal: '\\W\\.|;'
        },
        {
          begin: '\\bimport\\b',
          end: '$',
          keywords: 'import qualified as hiding',
          contains: [
            LIST,
            COMMENT
          ],
          illegal: '\\W\\.|;'
        },
        {
          className: 'class',
          begin: '^(\\s*)?(class|instance)\\b',
          end: 'where',
          keywords: 'class family instance where',
          contains: [
            CONSTRUCTOR,
            LIST,
            COMMENT
          ]
        },
        {
          className: 'class',
          begin: '\\b(data|(new)?type)\\b',
          end: '$',
          keywords: 'data family type newtype deriving',
          contains: [
            PRAGMA,
            CONSTRUCTOR,
            LIST,
            RECORD,
            COMMENT
          ]
        },
        {
          beginKeywords: 'default',
          end: '$',
          contains: [
            CONSTRUCTOR,
            LIST,
            COMMENT
          ]
        },
        {
          beginKeywords: 'infix infixl infixr',
          end: '$',
          contains: [
            hljs.C_NUMBER_MODE,
            COMMENT
          ]
        },
        {
          begin: '\\bforeign\\b',
          end: '$',
          keywords: 'foreign import export ccall stdcall cplusplus jvm '
                    + 'dotnet safe unsafe',
          contains: [
            CONSTRUCTOR,
            hljs.QUOTE_STRING_MODE,
            COMMENT
          ]
        },
        {
          className: 'meta',
          begin: '#!\\/usr\\/bin\\/env\ runhaskell',
          end: '$'
        },
        // "Whitespaces".
        PRAGMA,
        PREPROCESSOR,

        // Literals and names.

        // Single characters.
        {
          scope: 'string',
          begin: /'(?=\\?.')/,
          end: /'/,
          contains: [
            {
              scope: 'char.escape',
              match: /\\./,
            },
          ]
        },
        hljs.QUOTE_STRING_MODE,
        NUMBER,
        CONSTRUCTOR,
        hljs.inherit(hljs.TITLE_MODE, { begin: '^[_a-z][\\w\']*' }),
        // No markup, prevents infix operators from being recognized as comments.
        { begin: `(?!-)${symbol}--+|--+(?!-)${symbol}`},
        COMMENT,
        { // No markup, relevance booster
          begin: '->|<-' }
      ]
    };
  }

  return haskell;

})();

    hljs.registerLanguage('haskell', hljsGrammar);
  })();/*! `http` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: HTTP
  Description: HTTP request and response headers with automatic body highlighting
  Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Category: protocols, web
  Website: https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview
  */

  function http(hljs) {
    const regex = hljs.regex;
    const VERSION = 'HTTP/([32]|1\\.[01])';
    const HEADER_NAME = /[A-Za-z][A-Za-z0-9-]*/;
    const HEADER = {
      className: 'attribute',
      begin: regex.concat('^', HEADER_NAME, '(?=\\:\\s)'),
      starts: { contains: [
        {
          className: "punctuation",
          begin: /: /,
          relevance: 0,
          starts: {
            end: '$',
            relevance: 0
          }
        }
      ] }
    };
    const HEADERS_AND_BODY = [
      HEADER,
      {
        begin: '\\n\\n',
        starts: {
          subLanguage: [],
          endsWithParent: true
        }
      }
    ];

    return {
      name: 'HTTP',
      aliases: [ 'https' ],
      illegal: /\S/,
      contains: [
        // response
        {
          begin: '^(?=' + VERSION + " \\d{3})",
          end: /$/,
          contains: [
            {
              className: "meta",
              begin: VERSION
            },
            {
              className: 'number',
              begin: '\\b\\d{3}\\b'
            }
          ],
          starts: {
            end: /\b\B/,
            illegal: /\S/,
            contains: HEADERS_AND_BODY
          }
        },
        // request
        {
          begin: '(?=^[A-Z]+ (.*?) ' + VERSION + '$)',
          end: /$/,
          contains: [
            {
              className: 'string',
              begin: ' ',
              end: ' ',
              excludeBegin: true,
              excludeEnd: true
            },
            {
              className: "meta",
              begin: VERSION
            },
            {
              className: 'keyword',
              begin: '[A-Z]+'
            }
          ],
          starts: {
            end: /\b\B/,
            illegal: /\S/,
            contains: HEADERS_AND_BODY
          }
        },
        // to allow headers to work even without a preamble
        hljs.inherit(HEADER, { relevance: 0 })
      ]
    };
  }

  return http;

})();

    hljs.registerLanguage('http', hljsGrammar);
  })();/*! `hy` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Hy
  Description: Hy is a wonderful dialect of Lisp that’s embedded in Python.
  Author: Sergey Sobko <s.sobko@profitware.ru>
  Website: http://docs.hylang.org/en/stable/
  Category: lisp
  */

  function hy(hljs) {
    const SYMBOLSTART = 'a-zA-Z_\\-!.?+*=<>&#\'';
    const SYMBOL_RE = '[' + SYMBOLSTART + '][' + SYMBOLSTART + '0-9/;:]*';
    const keywords = {
      $pattern: SYMBOL_RE,
      built_in:
        // keywords
        '!= % %= & &= * ** **= *= *map '
        + '+ += , --build-class-- --import-- -= . / // //= '
        + '/= < << <<= <= = > >= >> >>= '
        + '@ @= ^ ^= abs accumulate all and any ap-compose '
        + 'ap-dotimes ap-each ap-each-while ap-filter ap-first ap-if ap-last ap-map ap-map-when ap-pipe '
        + 'ap-reduce ap-reject apply as-> ascii assert assoc bin break butlast '
        + 'callable calling-module-name car case cdr chain chr coll? combinations compile '
        + 'compress cond cons cons? continue count curry cut cycle dec '
        + 'def default-method defclass defmacro defmacro-alias defmacro/g! defmain defmethod defmulti defn '
        + 'defn-alias defnc defnr defreader defseq del delattr delete-route dict-comp dir '
        + 'disassemble dispatch-reader-macro distinct divmod do doto drop drop-last drop-while empty? '
        + 'end-sequence eval eval-and-compile eval-when-compile even? every? except exec filter first '
        + 'flatten float? fn fnc fnr for for* format fraction genexpr '
        + 'gensym get getattr global globals group-by hasattr hash hex id '
        + 'identity if if* if-not if-python2 import in inc input instance? '
        + 'integer integer-char? integer? interleave interpose is is-coll is-cons is-empty is-even '
        + 'is-every is-float is-instance is-integer is-integer-char is-iterable is-iterator is-keyword is-neg is-none '
        + 'is-not is-numeric is-odd is-pos is-string is-symbol is-zero isinstance islice issubclass '
        + 'iter iterable? iterate iterator? keyword keyword? lambda last len let '
        + 'lif lif-not list* list-comp locals loop macro-error macroexpand macroexpand-1 macroexpand-all '
        + 'map max merge-with method-decorator min multi-decorator multicombinations name neg? next '
        + 'none? nonlocal not not-in not? nth numeric? oct odd? open '
        + 'or ord partition permutations pos? post-route postwalk pow prewalk print '
        + 'product profile/calls profile/cpu put-route quasiquote quote raise range read read-str '
        + 'recursive-replace reduce remove repeat repeatedly repr require rest round route '
        + 'route-with-methods rwm second seq set-comp setattr setv some sorted string '
        + 'string? sum switch symbol? take take-nth take-while tee try unless '
        + 'unquote unquote-splicing vars walk when while with with* with-decorator with-gensyms '
        + 'xi xor yield yield-from zero? zip zip-longest | |= ~'
    };

    const SIMPLE_NUMBER_RE = '[-+]?\\d+(\\.\\d+)?';

    const SYMBOL = {
      begin: SYMBOL_RE,
      relevance: 0
    };
    const NUMBER = {
      className: 'number',
      begin: SIMPLE_NUMBER_RE,
      relevance: 0
    };
    const STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null });
    const COMMENT = hljs.COMMENT(
      ';',
      '$',
      { relevance: 0 }
    );
    const LITERAL = {
      className: 'literal',
      begin: /\b([Tt]rue|[Ff]alse|nil|None)\b/
    };
    const COLLECTION = {
      begin: '[\\[\\{]',
      end: '[\\]\\}]',
      relevance: 0
    };
    const HINT = {
      className: 'comment',
      begin: '\\^' + SYMBOL_RE
    };
    const HINT_COL = hljs.COMMENT('\\^\\{', '\\}');
    const KEY = {
      className: 'symbol',
      begin: '[:]{1,2}' + SYMBOL_RE
    };
    const LIST = {
      begin: '\\(',
      end: '\\)'
    };
    const BODY = {
      endsWithParent: true,
      relevance: 0
    };
    const NAME = {
      className: 'name',
      relevance: 0,
      keywords: keywords,
      begin: SYMBOL_RE,
      starts: BODY
    };
    const DEFAULT_CONTAINS = [
      LIST,
      STRING,
      HINT,
      HINT_COL,
      COMMENT,
      KEY,
      COLLECTION,
      NUMBER,
      LITERAL,
      SYMBOL
    ];

    LIST.contains = [
      hljs.COMMENT('comment', ''),
      NAME,
      BODY
    ];
    BODY.contains = DEFAULT_CONTAINS;
    COLLECTION.contains = DEFAULT_CONTAINS;

    return {
      name: 'Hy',
      aliases: [ 'hylang' ],
      illegal: /\S/,
      contains: [
        hljs.SHEBANG(),
        LIST,
        STRING,
        HINT,
        HINT_COL,
        COMMENT,
        KEY,
        COLLECTION,
        NUMBER,
        LITERAL
      ]
    };
  }

  return hy;

})();

    hljs.registerLanguage('hy', hljsGrammar);
  })();/*! `inform7` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Inform 7
  Author: Bruno Dias <bruno.r.dias@gmail.com>
  Description: Language definition for Inform 7, a DSL for writing parser interactive fiction.
  Website: http://inform7.com
  Category: gaming
  */

  function inform7(hljs) {
    const START_BRACKET = '\\[';
    const END_BRACKET = '\\]';
    return {
      name: 'Inform 7',
      aliases: [ 'i7' ],
      case_insensitive: true,
      keywords: {
        // Some keywords more or less unique to I7, for relevance.
        keyword:
          // kind:
          'thing room person man woman animal container '
          + 'supporter backdrop door '
          // characteristic:
          + 'scenery open closed locked inside gender '
          // verb:
          + 'is are say understand '
          // misc keyword:
          + 'kind of rule' },
      contains: [
        {
          className: 'string',
          begin: '"',
          end: '"',
          relevance: 0,
          contains: [
            {
              className: 'subst',
              begin: START_BRACKET,
              end: END_BRACKET
            }
          ]
        },
        {
          className: 'section',
          begin: /^(Volume|Book|Part|Chapter|Section|Table)\b/,
          end: '$'
        },
        {
          // Rule definition
          // This is here for relevance.
          begin: /^(Check|Carry out|Report|Instead of|To|Rule|When|Before|After)\b/,
          end: ':',
          contains: [
            {
              // Rule name
              begin: '\\(This',
              end: '\\)'
            }
          ]
        },
        {
          className: 'comment',
          begin: START_BRACKET,
          end: END_BRACKET,
          contains: [ 'self' ]
        }
      ]
    };
  }

  return inform7;

})();

    hljs.registerLanguage('inform7', hljsGrammar);
  })();/*! `ini` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: TOML, also INI
  Description: TOML aims to be a minimal configuration file format that's easy to read due to obvious semantics.
  Contributors: Guillaume Gomez <guillaume1.gomez@gmail.com>
  Category: common, config
  Website: https://github.com/toml-lang/toml
  */

  function ini(hljs) {
    const regex = hljs.regex;
    const NUMBERS = {
      className: 'number',
      relevance: 0,
      variants: [
        { begin: /([+-]+)?[\d]+_[\d_]+/ },
        { begin: hljs.NUMBER_RE }
      ]
    };
    const COMMENTS = hljs.COMMENT();
    COMMENTS.variants = [
      {
        begin: /;/,
        end: /$/
      },
      {
        begin: /#/,
        end: /$/
      }
    ];
    const VARIABLES = {
      className: 'variable',
      variants: [
        { begin: /\$[\w\d"][\w\d_]*/ },
        { begin: /\$\{(.*?)\}/ }
      ]
    };
    const LITERALS = {
      className: 'literal',
      begin: /\bon|off|true|false|yes|no\b/
    };
    const STRINGS = {
      className: "string",
      contains: [ hljs.BACKSLASH_ESCAPE ],
      variants: [
        {
          begin: "'''",
          end: "'''",
          relevance: 10
        },
        {
          begin: '"""',
          end: '"""',
          relevance: 10
        },
        {
          begin: '"',
          end: '"'
        },
        {
          begin: "'",
          end: "'"
        }
      ]
    };
    const ARRAY = {
      begin: /\[/,
      end: /\]/,
      contains: [
        COMMENTS,
        LITERALS,
        VARIABLES,
        STRINGS,
        NUMBERS,
        'self'
      ],
      relevance: 0
    };

    const BARE_KEY = /[A-Za-z0-9_-]+/;
    const QUOTED_KEY_DOUBLE_QUOTE = /"(\\"|[^"])*"/;
    const QUOTED_KEY_SINGLE_QUOTE = /'[^']*'/;
    const ANY_KEY = regex.either(
      BARE_KEY, QUOTED_KEY_DOUBLE_QUOTE, QUOTED_KEY_SINGLE_QUOTE
    );
    const DOTTED_KEY = regex.concat(
      ANY_KEY, '(\\s*\\.\\s*', ANY_KEY, ')*',
      regex.lookahead(/\s*=\s*[^#\s]/)
    );

    return {
      name: 'TOML, also INI',
      aliases: [ 'toml' ],
      case_insensitive: true,
      illegal: /\S/,
      contains: [
        COMMENTS,
        {
          className: 'section',
          begin: /\[+/,
          end: /\]+/
        },
        {
          begin: DOTTED_KEY,
          className: 'attr',
          starts: {
            end: /$/,
            contains: [
              COMMENTS,
              ARRAY,
              LITERALS,
              VARIABLES,
              STRINGS,
              NUMBERS
            ]
          }
        }
      ]
    };
  }

  return ini;

})();

    hljs.registerLanguage('ini', hljsGrammar);
  })();/*! `java` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  // https://docs.oracle.com/javase/specs/jls/se15/html/jls-3.html#jls-3.10
  var decimalDigits = '[0-9](_*[0-9])*';
  var frac = `\\.(${decimalDigits})`;
  var hexDigits = '[0-9a-fA-F](_*[0-9a-fA-F])*';
  var NUMERIC = {
    className: 'number',
    variants: [
      // DecimalFloatingPointLiteral
      // including ExponentPart
      { begin: `(\\b(${decimalDigits})((${frac})|\\.)?|(${frac}))` +
        `[eE][+-]?(${decimalDigits})[fFdD]?\\b` },
      // excluding ExponentPart
      { begin: `\\b(${decimalDigits})((${frac})[fFdD]?\\b|\\.([fFdD]\\b)?)` },
      { begin: `(${frac})[fFdD]?\\b` },
      { begin: `\\b(${decimalDigits})[fFdD]\\b` },

      // HexadecimalFloatingPointLiteral
      { begin: `\\b0[xX]((${hexDigits})\\.?|(${hexDigits})?\\.(${hexDigits}))` +
        `[pP][+-]?(${decimalDigits})[fFdD]?\\b` },

      // DecimalIntegerLiteral
      { begin: '\\b(0|[1-9](_*[0-9])*)[lL]?\\b' },

      // HexIntegerLiteral
      { begin: `\\b0[xX](${hexDigits})[lL]?\\b` },

      // OctalIntegerLiteral
      { begin: '\\b0(_*[0-7])*[lL]?\\b' },

      // BinaryIntegerLiteral
      { begin: '\\b0[bB][01](_*[01])*[lL]?\\b' },
    ],
    relevance: 0
  };

  /*
  Language: Java
  Author: Vsevolod Solovyov <vsevolod.solovyov@gmail.com>
  Category: common, enterprise
  Website: https://www.java.com/
  */


  /**
   * Allows recursive regex expressions to a given depth
   *
   * ie: recurRegex("(abc~~~)", /~~~/g, 2) becomes:
   * (abc(abc(abc)))
   *
   * @param {string} re
   * @param {RegExp} substitution (should be a g mode regex)
   * @param {number} depth
   * @returns {string}``
   */
  function recurRegex(re, substitution, depth) {
    if (depth === -1) return "";

    return re.replace(substitution, _ => {
      return recurRegex(re, substitution, depth - 1);
    });
  }

  /** @type LanguageFn */
  function java(hljs) {
    const regex = hljs.regex;
    const JAVA_IDENT_RE = '[\u00C0-\u02B8a-zA-Z_$][\u00C0-\u02B8a-zA-Z_$0-9]*';
    const GENERIC_IDENT_RE = JAVA_IDENT_RE
      + recurRegex('(?:<' + JAVA_IDENT_RE + '~~~(?:\\s*,\\s*' + JAVA_IDENT_RE + '~~~)*>)?', /~~~/g, 2);
    const MAIN_KEYWORDS = [
      'synchronized',
      'abstract',
      'private',
      'var',
      'static',
      'if',
      'const ',
      'for',
      'while',
      'strictfp',
      'finally',
      'protected',
      'import',
      'native',
      'final',
      'void',
      'enum',
      'else',
      'break',
      'transient',
      'catch',
      'instanceof',
      'volatile',
      'case',
      'assert',
      'package',
      'default',
      'public',
      'try',
      'switch',
      'continue',
      'throws',
      'protected',
      'public',
      'private',
      'module',
      'requires',
      'exports',
      'do',
      'sealed',
      'yield',
      'permits'
    ];

    const BUILT_INS = [
      'super',
      'this'
    ];

    const LITERALS = [
      'false',
      'true',
      'null'
    ];

    const TYPES = [
      'char',
      'boolean',
      'long',
      'float',
      'int',
      'byte',
      'short',
      'double'
    ];

    const KEYWORDS = {
      keyword: MAIN_KEYWORDS,
      literal: LITERALS,
      type: TYPES,
      built_in: BUILT_INS
    };

    const ANNOTATION = {
      className: 'meta',
      begin: '@' + JAVA_IDENT_RE,
      contains: [
        {
          begin: /\(/,
          end: /\)/,
          contains: [ "self" ] // allow nested () inside our annotation
        }
      ]
    };
    const PARAMS = {
      className: 'params',
      begin: /\(/,
      end: /\)/,
      keywords: KEYWORDS,
      relevance: 0,
      contains: [ hljs.C_BLOCK_COMMENT_MODE ],
      endsParent: true
    };

    return {
      name: 'Java',
      aliases: [ 'jsp' ],
      keywords: KEYWORDS,
      illegal: /<\/|#/,
      contains: [
        hljs.COMMENT(
          '/\\*\\*',
          '\\*/',
          {
            relevance: 0,
            contains: [
              {
                // eat up @'s in emails to prevent them to be recognized as doctags
                begin: /\w+@/,
                relevance: 0
              },
              {
                className: 'doctag',
                begin: '@[A-Za-z]+'
              }
            ]
          }
        ),
        // relevance boost
        {
          begin: /import java\.[a-z]+\./,
          keywords: "import",
          relevance: 2
        },
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          begin: /"""/,
          end: /"""/,
          className: "string",
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        {
          match: [
            /\b(?:class|interface|enum|extends|implements|new)/,
            /\s+/,
            JAVA_IDENT_RE
          ],
          className: {
            1: "keyword",
            3: "title.class"
          }
        },
        {
          // Exceptions for hyphenated keywords
          match: /non-sealed/,
          scope: "keyword"
        },
        {
          begin: [
            regex.concat(/(?!else)/, JAVA_IDENT_RE),
            /\s+/,
            JAVA_IDENT_RE,
            /\s+/,
            /=(?!=)/
          ],
          className: {
            1: "type",
            3: "variable",
            5: "operator"
          }
        },
        {
          begin: [
            /record/,
            /\s+/,
            JAVA_IDENT_RE
          ],
          className: {
            1: "keyword",
            3: "title.class"
          },
          contains: [
            PARAMS,
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        {
          // Expression keywords prevent 'keyword Name(...)' from being
          // recognized as a function definition
          beginKeywords: 'new throw return else',
          relevance: 0
        },
        {
          begin: [
            '(?:' + GENERIC_IDENT_RE + '\\s+)',
            hljs.UNDERSCORE_IDENT_RE,
            /\s*(?=\()/
          ],
          className: { 2: "title.function" },
          keywords: KEYWORDS,
          contains: [
            {
              className: 'params',
              begin: /\(/,
              end: /\)/,
              keywords: KEYWORDS,
              relevance: 0,
              contains: [
                ANNOTATION,
                hljs.APOS_STRING_MODE,
                hljs.QUOTE_STRING_MODE,
                NUMERIC,
                hljs.C_BLOCK_COMMENT_MODE
              ]
            },
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        NUMERIC,
        ANNOTATION
      ]
    };
  }

  return java;

})();

    hljs.registerLanguage('java', hljsGrammar);
  })();/*! `javascript` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  const IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
  const KEYWORDS = [
    "as", // for exports
    "in",
    "of",
    "if",
    "for",
    "while",
    "finally",
    "var",
    "new",
    "function",
    "do",
    "return",
    "void",
    "else",
    "break",
    "catch",
    "instanceof",
    "with",
    "throw",
    "case",
    "default",
    "try",
    "switch",
    "continue",
    "typeof",
    "delete",
    "let",
    "yield",
    "const",
    "class",
    // JS handles these with a special rule
    // "get",
    // "set",
    "debugger",
    "async",
    "await",
    "static",
    "import",
    "from",
    "export",
    "extends"
  ];
  const LITERALS = [
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "Infinity"
  ];

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
  const TYPES = [
    // Fundamental objects
    "Object",
    "Function",
    "Boolean",
    "Symbol",
    // numbers and dates
    "Math",
    "Date",
    "Number",
    "BigInt",
    // text
    "String",
    "RegExp",
    // Indexed collections
    "Array",
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Int32Array",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array",
    // Keyed collections
    "Set",
    "Map",
    "WeakSet",
    "WeakMap",
    // Structured data
    "ArrayBuffer",
    "SharedArrayBuffer",
    "Atomics",
    "DataView",
    "JSON",
    // Control abstraction objects
    "Promise",
    "Generator",
    "GeneratorFunction",
    "AsyncFunction",
    // Reflection
    "Reflect",
    "Proxy",
    // Internationalization
    "Intl",
    // WebAssembly
    "WebAssembly"
  ];

  const ERROR_TYPES = [
    "Error",
    "EvalError",
    "InternalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError"
  ];

  const BUILT_IN_GLOBALS = [
    "setInterval",
    "setTimeout",
    "clearInterval",
    "clearTimeout",

    "require",
    "exports",

    "eval",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "unescape"
  ];

  const BUILT_IN_VARIABLES = [
    "arguments",
    "this",
    "super",
    "console",
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "module",
    "global" // Node.js
  ];

  const BUILT_INS = [].concat(
    BUILT_IN_GLOBALS,
    TYPES,
    ERROR_TYPES
  );

  /*
  Language: JavaScript
  Description: JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.
  Category: common, scripting, web
  Website: https://developer.mozilla.org/en-US/docs/Web/JavaScript
  */


  /** @type LanguageFn */
  function javascript(hljs) {
    const regex = hljs.regex;
    /**
     * Takes a string like "<Booger" and checks to see
     * if we can find a matching "</Booger" later in the
     * content.
     * @param {RegExpMatchArray} match
     * @param {{after:number}} param1
     */
    const hasClosingTag = (match, { after }) => {
      const tag = "</" + match[0].slice(1);
      const pos = match.input.indexOf(tag, after);
      return pos !== -1;
    };

    const IDENT_RE$1 = IDENT_RE;
    const FRAGMENT = {
      begin: '<>',
      end: '</>'
    };
    // to avoid some special cases inside isTrulyOpeningTag
    const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
    const XML_TAG = {
      begin: /<[A-Za-z0-9\\._:-]+/,
      end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
      /**
       * @param {RegExpMatchArray} match
       * @param {CallbackResponse} response
       */
      isTrulyOpeningTag: (match, response) => {
        const afterMatchIndex = match[0].length + match.index;
        const nextChar = match.input[afterMatchIndex];
        if (
          // HTML should not include another raw `<` inside a tag
          // nested type?
          // `<Array<Array<number>>`, etc.
          nextChar === "<" ||
          // the , gives away that this is not HTML
          // `<T, A extends keyof T, V>`
          nextChar === ","
          ) {
          response.ignoreMatch();
          return;
        }

        // `<something>`
        // Quite possibly a tag, lets look for a matching closing tag...
        if (nextChar === ">") {
          // if we cannot find a matching closing tag, then we
          // will ignore it
          if (!hasClosingTag(match, { after: afterMatchIndex })) {
            response.ignoreMatch();
          }
        }

        // `<blah />` (self-closing)
        // handled by simpleSelfClosing rule

        let m;
        const afterMatch = match.input.substring(afterMatchIndex);

        // some more template typing stuff
        //  <T = any>(key?: string) => Modify<
        if ((m = afterMatch.match(/^\s*=/))) {
          response.ignoreMatch();
          return;
        }

        // `<From extends string>`
        // technically this could be HTML, but it smells like a type
        // NOTE: This is ugh, but added specifically for https://github.com/highlightjs/highlight.js/issues/3276
        if ((m = afterMatch.match(/^\s+extends\s+/))) {
          if (m.index === 0) {
            response.ignoreMatch();
            // eslint-disable-next-line no-useless-return
            return;
          }
        }
      }
    };
    const KEYWORDS$1 = {
      $pattern: IDENT_RE,
      keyword: KEYWORDS,
      literal: LITERALS,
      built_in: BUILT_INS,
      "variable.language": BUILT_IN_VARIABLES
    };

    // https://tc39.es/ecma262/#sec-literals-numeric-literals
    const decimalDigits = '[0-9](_?[0-9])*';
    const frac = `\\.(${decimalDigits})`;
    // DecimalIntegerLiteral, including Annex B NonOctalDecimalIntegerLiteral
    // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
    const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
    const NUMBER = {
      className: 'number',
      variants: [
        // DecimalLiteral
        { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))` +
          `[eE][+-]?(${decimalDigits})\\b` },
        { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },

        // DecimalBigIntegerLiteral
        { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },

        // NonDecimalIntegerLiteral
        { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
        { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
        { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },

        // LegacyOctalIntegerLiteral (does not include underscore separators)
        // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
        { begin: "\\b0[0-7]+n?\\b" },
      ],
      relevance: 0
    };

    const SUBST = {
      className: 'subst',
      begin: '\\$\\{',
      end: '\\}',
      keywords: KEYWORDS$1,
      contains: [] // defined later
    };
    const HTML_TEMPLATE = {
      begin: 'html`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'xml'
      }
    };
    const CSS_TEMPLATE = {
      begin: 'css`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'css'
      }
    };
    const GRAPHQL_TEMPLATE = {
      begin: 'gql`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'graphql'
      }
    };
    const TEMPLATE_STRING = {
      className: 'string',
      begin: '`',
      end: '`',
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ]
    };
    const JSDOC_COMMENT = hljs.COMMENT(
      /\/\*\*(?!\/)/,
      '\\*/',
      {
        relevance: 0,
        contains: [
          {
            begin: '(?=@[A-Za-z]+)',
            relevance: 0,
            contains: [
              {
                className: 'doctag',
                begin: '@[A-Za-z]+'
              },
              {
                className: 'type',
                begin: '\\{',
                end: '\\}',
                excludeEnd: true,
                excludeBegin: true,
                relevance: 0
              },
              {
                className: 'variable',
                begin: IDENT_RE$1 + '(?=\\s*(-)|$)',
                endsParent: true,
                relevance: 0
              },
              // eat spaces (not newlines) so we can find
              // types or variables
              {
                begin: /(?=[^\n])\s/,
                relevance: 0
              }
            ]
          }
        ]
      }
    );
    const COMMENT = {
      className: "comment",
      variants: [
        JSDOC_COMMENT,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_LINE_COMMENT_MODE
      ]
    };
    const SUBST_INTERNALS = [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER,
      // This is intentional:
      // See https://github.com/highlightjs/highlight.js/issues/3288
      // hljs.REGEXP_MODE
    ];
    SUBST.contains = SUBST_INTERNALS
      .concat({
        // we need to pair up {} inside our subst to prevent
        // it from ending too early by matching another }
        begin: /\{/,
        end: /\}/,
        keywords: KEYWORDS$1,
        contains: [
          "self"
        ].concat(SUBST_INTERNALS)
      });
    const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
    const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
      // eat recursive parens in sub expressions
      {
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS$1,
        contains: ["self"].concat(SUBST_AND_COMMENTS)
      }
    ]);
    const PARAMS = {
      className: 'params',
      begin: /\(/,
      end: /\)/,
      excludeBegin: true,
      excludeEnd: true,
      keywords: KEYWORDS$1,
      contains: PARAMS_CONTAINS
    };

    // ES6 classes
    const CLASS_OR_EXTENDS = {
      variants: [
        // class Car extends vehicle
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1,
            /\s+/,
            /extends/,
            /\s+/,
            regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
          ],
          scope: {
            1: "keyword",
            3: "title.class",
            5: "keyword",
            7: "title.class.inherited"
          }
        },
        // class Car
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1
          ],
          scope: {
            1: "keyword",
            3: "title.class"
          }
        },

      ]
    };

    const CLASS_REFERENCE = {
      relevance: 0,
      match:
      regex.either(
        // Hard coded exceptions
        /\bJSON/,
        // Float32Array, OutT
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        // CSSFactory, CSSFactoryT
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        // FPs, FPsT
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/,
        // P
        // single letters are not highlighted
        // BLAH
        // this will be flagged as a UPPER_CASE_CONSTANT instead
      ),
      className: "title.class",
      keywords: {
        _: [
          // se we still get relevance credit for JS library classes
          ...TYPES,
          ...ERROR_TYPES
        ]
      }
    };

    const USE_STRICT = {
      label: "use_strict",
      className: 'meta',
      relevance: 10,
      begin: /^\s*['"]use (strict|asm)['"]/
    };

    const FUNCTION_DEFINITION = {
      variants: [
        {
          match: [
            /function/,
            /\s+/,
            IDENT_RE$1,
            /(?=\s*\()/
          ]
        },
        // anonymous function
        {
          match: [
            /function/,
            /\s*(?=\()/
          ]
        }
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      label: "func.def",
      contains: [ PARAMS ],
      illegal: /%/
    };

    const UPPER_CASE_CONSTANT = {
      relevance: 0,
      match: /\b[A-Z][A-Z_0-9]+\b/,
      className: "variable.constant"
    };

    function noneOf(list) {
      return regex.concat("(?!", list.join("|"), ")");
    }

    const FUNCTION_CALL = {
      match: regex.concat(
        /\b/,
        noneOf([
          ...BUILT_IN_GLOBALS,
          "super",
          "import"
        ]),
        IDENT_RE$1, regex.lookahead(/\(/)),
      className: "title.function",
      relevance: 0
    };

    const PROPERTY_ACCESS = {
      begin: regex.concat(/\./, regex.lookahead(
        regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
      )),
      end: IDENT_RE$1,
      excludeBegin: true,
      keywords: "prototype",
      className: "property",
      relevance: 0
    };

    const GETTER_OR_SETTER = {
      match: [
        /get|set/,
        /\s+/,
        IDENT_RE$1,
        /(?=\()/
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        { // eat to avoid empty params
          begin: /\(\)/
        },
        PARAMS
      ]
    };

    const FUNC_LEAD_IN_RE = '(\\(' +
      '[^()]*(\\(' +
      '[^()]*(\\(' +
      '[^()]*' +
      '\\)[^()]*)*' +
      '\\)[^()]*)*' +
      '\\)|' + hljs.UNDERSCORE_IDENT_RE + ')\\s*=>';

    const FUNCTION_VARIABLE = {
      match: [
        /const|var|let/, /\s+/,
        IDENT_RE$1, /\s*/,
        /=\s*/,
        /(async\s*)?/, // async is optional
        regex.lookahead(FUNC_LEAD_IN_RE)
      ],
      keywords: "async",
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        PARAMS
      ]
    };

    return {
      name: 'JavaScript',
      aliases: ['js', 'jsx', 'mjs', 'cjs'],
      keywords: KEYWORDS$1,
      // this will be extended by TypeScript
      exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
      illegal: /#(?![$_A-z])/,
      contains: [
        hljs.SHEBANG({
          label: "shebang",
          binary: "node",
          relevance: 5
        }),
        USE_STRICT,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        HTML_TEMPLATE,
        CSS_TEMPLATE,
        GRAPHQL_TEMPLATE,
        TEMPLATE_STRING,
        COMMENT,
        // Skip numbers when they are part of a variable name
        { match: /\$\d+/ },
        NUMBER,
        CLASS_REFERENCE,
        {
          className: 'attr',
          begin: IDENT_RE$1 + regex.lookahead(':'),
          relevance: 0
        },
        FUNCTION_VARIABLE,
        { // "value" container
          begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
          keywords: 'return throw case',
          relevance: 0,
          contains: [
            COMMENT,
            hljs.REGEXP_MODE,
            {
              className: 'function',
              // we have to count the parens to make sure we actually have the
              // correct bounding ( ) before the =>.  There could be any number of
              // sub-expressions inside also surrounded by parens.
              begin: FUNC_LEAD_IN_RE,
              returnBegin: true,
              end: '\\s*=>',
              contains: [
                {
                  className: 'params',
                  variants: [
                    {
                      begin: hljs.UNDERSCORE_IDENT_RE,
                      relevance: 0
                    },
                    {
                      className: null,
                      begin: /\(\s*\)/,
                      skip: true
                    },
                    {
                      begin: /\(/,
                      end: /\)/,
                      excludeBegin: true,
                      excludeEnd: true,
                      keywords: KEYWORDS$1,
                      contains: PARAMS_CONTAINS
                    }
                  ]
                }
              ]
            },
            { // could be a comma delimited list of params to a function call
              begin: /,/,
              relevance: 0
            },
            {
              match: /\s+/,
              relevance: 0
            },
            { // JSX
              variants: [
                { begin: FRAGMENT.begin, end: FRAGMENT.end },
                { match: XML_SELF_CLOSING },
                {
                  begin: XML_TAG.begin,
                  // we carefully check the opening tag to see if it truly
                  // is a tag and not a false positive
                  'on:begin': XML_TAG.isTrulyOpeningTag,
                  end: XML_TAG.end
                }
              ],
              subLanguage: 'xml',
              contains: [
                {
                  begin: XML_TAG.begin,
                  end: XML_TAG.end,
                  skip: true,
                  contains: ['self']
                }
              ]
            }
          ],
        },
        FUNCTION_DEFINITION,
        {
          // prevent this from getting swallowed up by function
          // since they appear "function like"
          beginKeywords: "while if switch catch for"
        },
        {
          // we have to count the parens to make sure we actually have the correct
          // bounding ( ).  There could be any number of sub-expressions inside
          // also surrounded by parens.
          begin: '\\b(?!function)' + hljs.UNDERSCORE_IDENT_RE +
            '\\(' + // first parens
            '[^()]*(\\(' +
              '[^()]*(\\(' +
                '[^()]*' +
              '\\)[^()]*)*' +
            '\\)[^()]*)*' +
            '\\)\\s*\\{', // end parens
          returnBegin:true,
          label: "func.def",
          contains: [
            PARAMS,
            hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
          ]
        },
        // catch ... so it won't trigger the property rule below
        {
          match: /\.\.\./,
          relevance: 0
        },
        PROPERTY_ACCESS,
        // hack: prevents detection of keywords in some circumstances
        // .keyword()
        // $keyword = x
        {
          match: '\\$' + IDENT_RE$1,
          relevance: 0
        },
        {
          match: [ /\bconstructor(?=\s*\()/ ],
          className: { 1: "title.function" },
          contains: [ PARAMS ]
        },
        FUNCTION_CALL,
        UPPER_CASE_CONSTANT,
        CLASS_OR_EXTENDS,
        GETTER_OR_SETTER,
        {
          match: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
        }
      ]
    };
  }

  return javascript;

})();

    hljs.registerLanguage('javascript', hljsGrammar);
  })();/*! `json` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: JSON
  Description: JSON (JavaScript Object Notation) is a lightweight data-interchange format.
  Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Website: http://www.json.org
  Category: common, protocols, web
  */

  function json(hljs) {
    const ATTRIBUTE = {
      className: 'attr',
      begin: /"(\\.|[^\\"\r\n])*"(?=\s*:)/,
      relevance: 1.01
    };
    const PUNCTUATION = {
      match: /[{}[\],:]/,
      className: "punctuation",
      relevance: 0
    };
    const LITERALS = [
      "true",
      "false",
      "null"
    ];
    // NOTE: normally we would rely on `keywords` for this but using a mode here allows us
    // - to use the very tight `illegal: \S` rule later to flag any other character
    // - as illegal indicating that despite looking like JSON we do not truly have
    // - JSON and thus improve false-positively greatly since JSON will try and claim
    // - all sorts of JSON looking stuff
    const LITERALS_MODE = {
      scope: "literal",
      beginKeywords: LITERALS.join(" "),
    };

    return {
      name: 'JSON',
      keywords:{
        literal: LITERALS,
      },
      contains: [
        ATTRIBUTE,
        PUNCTUATION,
        hljs.QUOTE_STRING_MODE,
        LITERALS_MODE,
        hljs.C_NUMBER_MODE,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE
      ],
      illegal: '\\S'
    };
  }

  return json;

})();

    hljs.registerLanguage('json', hljsGrammar);
  })();/*! `kotlin` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  // https://docs.oracle.com/javase/specs/jls/se15/html/jls-3.html#jls-3.10
  var decimalDigits = '[0-9](_*[0-9])*';
  var frac = `\\.(${decimalDigits})`;
  var hexDigits = '[0-9a-fA-F](_*[0-9a-fA-F])*';
  var NUMERIC = {
    className: 'number',
    variants: [
      // DecimalFloatingPointLiteral
      // including ExponentPart
      { begin: `(\\b(${decimalDigits})((${frac})|\\.)?|(${frac}))` +
        `[eE][+-]?(${decimalDigits})[fFdD]?\\b` },
      // excluding ExponentPart
      { begin: `\\b(${decimalDigits})((${frac})[fFdD]?\\b|\\.([fFdD]\\b)?)` },
      { begin: `(${frac})[fFdD]?\\b` },
      { begin: `\\b(${decimalDigits})[fFdD]\\b` },

      // HexadecimalFloatingPointLiteral
      { begin: `\\b0[xX]((${hexDigits})\\.?|(${hexDigits})?\\.(${hexDigits}))` +
        `[pP][+-]?(${decimalDigits})[fFdD]?\\b` },

      // DecimalIntegerLiteral
      { begin: '\\b(0|[1-9](_*[0-9])*)[lL]?\\b' },

      // HexIntegerLiteral
      { begin: `\\b0[xX](${hexDigits})[lL]?\\b` },

      // OctalIntegerLiteral
      { begin: '\\b0(_*[0-7])*[lL]?\\b' },

      // BinaryIntegerLiteral
      { begin: '\\b0[bB][01](_*[01])*[lL]?\\b' },
    ],
    relevance: 0
  };

  /*
   Language: Kotlin
   Description: Kotlin is an OSS statically typed programming language that targets the JVM, Android, JavaScript and Native.
   Author: Sergey Mashkov <cy6erGn0m@gmail.com>
   Website: https://kotlinlang.org
   Category: common
   */


  function kotlin(hljs) {
    const KEYWORDS = {
      keyword:
        'abstract as val var vararg get set class object open private protected public noinline '
        + 'crossinline dynamic final enum if else do while for when throw try catch finally '
        + 'import package is in fun override companion reified inline lateinit init '
        + 'interface annotation data sealed internal infix operator out by constructor super '
        + 'tailrec where const inner suspend typealias external expect actual',
      built_in:
        'Byte Short Char Int Long Boolean Float Double Void Unit Nothing',
      literal:
        'true false null'
    };
    const KEYWORDS_WITH_LABEL = {
      className: 'keyword',
      begin: /\b(break|continue|return|this)\b/,
      starts: { contains: [
        {
          className: 'symbol',
          begin: /@\w+/
        }
      ] }
    };
    const LABEL = {
      className: 'symbol',
      begin: hljs.UNDERSCORE_IDENT_RE + '@'
    };

    // for string templates
    const SUBST = {
      className: 'subst',
      begin: /\$\{/,
      end: /\}/,
      contains: [ hljs.C_NUMBER_MODE ]
    };
    const VARIABLE = {
      className: 'variable',
      begin: '\\$' + hljs.UNDERSCORE_IDENT_RE
    };
    const STRING = {
      className: 'string',
      variants: [
        {
          begin: '"""',
          end: '"""(?=[^"])',
          contains: [
            VARIABLE,
            SUBST
          ]
        },
        // Can't use built-in modes easily, as we want to use STRING in the meta
        // context as 'meta-string' and there's no syntax to remove explicitly set
        // classNames in built-in modes.
        {
          begin: '\'',
          end: '\'',
          illegal: /\n/,
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          begin: '"',
          end: '"',
          illegal: /\n/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            VARIABLE,
            SUBST
          ]
        }
      ]
    };
    SUBST.contains.push(STRING);

    const ANNOTATION_USE_SITE = {
      className: 'meta',
      begin: '@(?:file|property|field|get|set|receiver|param|setparam|delegate)\\s*:(?:\\s*' + hljs.UNDERSCORE_IDENT_RE + ')?'
    };
    const ANNOTATION = {
      className: 'meta',
      begin: '@' + hljs.UNDERSCORE_IDENT_RE,
      contains: [
        {
          begin: /\(/,
          end: /\)/,
          contains: [
            hljs.inherit(STRING, { className: 'string' }),
            "self"
          ]
        }
      ]
    };

    // https://kotlinlang.org/docs/reference/whatsnew11.html#underscores-in-numeric-literals
    // According to the doc above, the number mode of kotlin is the same as java 8,
    // so the code below is copied from java.js
    const KOTLIN_NUMBER_MODE = NUMERIC;
    const KOTLIN_NESTED_COMMENT = hljs.COMMENT(
      '/\\*', '\\*/',
      { contains: [ hljs.C_BLOCK_COMMENT_MODE ] }
    );
    const KOTLIN_PAREN_TYPE = { variants: [
      {
        className: 'type',
        begin: hljs.UNDERSCORE_IDENT_RE
      },
      {
        begin: /\(/,
        end: /\)/,
        contains: [] // defined later
      }
    ] };
    const KOTLIN_PAREN_TYPE2 = KOTLIN_PAREN_TYPE;
    KOTLIN_PAREN_TYPE2.variants[1].contains = [ KOTLIN_PAREN_TYPE ];
    KOTLIN_PAREN_TYPE.variants[1].contains = [ KOTLIN_PAREN_TYPE2 ];

    return {
      name: 'Kotlin',
      aliases: [
        'kt',
        'kts'
      ],
      keywords: KEYWORDS,
      contains: [
        hljs.COMMENT(
          '/\\*\\*',
          '\\*/',
          {
            relevance: 0,
            contains: [
              {
                className: 'doctag',
                begin: '@[A-Za-z]+'
              }
            ]
          }
        ),
        hljs.C_LINE_COMMENT_MODE,
        KOTLIN_NESTED_COMMENT,
        KEYWORDS_WITH_LABEL,
        LABEL,
        ANNOTATION_USE_SITE,
        ANNOTATION,
        {
          className: 'function',
          beginKeywords: 'fun',
          end: '[(]|$',
          returnBegin: true,
          excludeEnd: true,
          keywords: KEYWORDS,
          relevance: 5,
          contains: [
            {
              begin: hljs.UNDERSCORE_IDENT_RE + '\\s*\\(',
              returnBegin: true,
              relevance: 0,
              contains: [ hljs.UNDERSCORE_TITLE_MODE ]
            },
            {
              className: 'type',
              begin: /</,
              end: />/,
              keywords: 'reified',
              relevance: 0
            },
            {
              className: 'params',
              begin: /\(/,
              end: /\)/,
              endsParent: true,
              keywords: KEYWORDS,
              relevance: 0,
              contains: [
                {
                  begin: /:/,
                  end: /[=,\/]/,
                  endsWithParent: true,
                  contains: [
                    KOTLIN_PAREN_TYPE,
                    hljs.C_LINE_COMMENT_MODE,
                    KOTLIN_NESTED_COMMENT
                  ],
                  relevance: 0
                },
                hljs.C_LINE_COMMENT_MODE,
                KOTLIN_NESTED_COMMENT,
                ANNOTATION_USE_SITE,
                ANNOTATION,
                STRING,
                hljs.C_NUMBER_MODE
              ]
            },
            KOTLIN_NESTED_COMMENT
          ]
        },
        {
          begin: [
            /class|interface|trait/,
            /\s+/,
            hljs.UNDERSCORE_IDENT_RE
          ],
          beginScope: {
            3: "title.class"
          },
          keywords: 'class interface trait',
          end: /[:\{(]|$/,
          excludeEnd: true,
          illegal: 'extends implements',
          contains: [
            { beginKeywords: 'public protected internal private constructor' },
            hljs.UNDERSCORE_TITLE_MODE,
            {
              className: 'type',
              begin: /</,
              end: />/,
              excludeBegin: true,
              excludeEnd: true,
              relevance: 0
            },
            {
              className: 'type',
              begin: /[,:]\s*/,
              end: /[<\(,){\s]|$/,
              excludeBegin: true,
              returnEnd: true
            },
            ANNOTATION_USE_SITE,
            ANNOTATION
          ]
        },
        STRING,
        {
          className: 'meta',
          begin: "^#!/usr/bin/env",
          end: '$',
          illegal: '\n'
        },
        KOTLIN_NUMBER_MODE
      ]
    };
  }

  return kotlin;

})();

    hljs.registerLanguage('kotlin', hljsGrammar);
  })();/*! `latex` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: LaTeX
  Author: Benedikt Wilde <bwilde@posteo.de>
  Website: https://www.latex-project.org
  Category: markup
  */

  /** @type LanguageFn */
  function latex(hljs) {
    const regex = hljs.regex;
    const KNOWN_CONTROL_WORDS = regex.either(...[
      '(?:NeedsTeXFormat|RequirePackage|GetIdInfo)',
      'Provides(?:Expl)?(?:Package|Class|File)',
      '(?:DeclareOption|ProcessOptions)',
      '(?:documentclass|usepackage|input|include)',
      'makeat(?:letter|other)',
      'ExplSyntax(?:On|Off)',
      '(?:new|renew|provide)?command',
      '(?:re)newenvironment',
      '(?:New|Renew|Provide|Declare)(?:Expandable)?DocumentCommand',
      '(?:New|Renew|Provide|Declare)DocumentEnvironment',
      '(?:(?:e|g|x)?def|let)',
      '(?:begin|end)',
      '(?:part|chapter|(?:sub){0,2}section|(?:sub)?paragraph)',
      'caption',
      '(?:label|(?:eq|page|name)?ref|(?:paren|foot|super)?cite)',
      '(?:alpha|beta|[Gg]amma|[Dd]elta|(?:var)?epsilon|zeta|eta|[Tt]heta|vartheta)',
      '(?:iota|(?:var)?kappa|[Ll]ambda|mu|nu|[Xx]i|[Pp]i|varpi|(?:var)rho)',
      '(?:[Ss]igma|varsigma|tau|[Uu]psilon|[Pp]hi|varphi|chi|[Pp]si|[Oo]mega)',
      '(?:frac|sum|prod|lim|infty|times|sqrt|leq|geq|left|right|middle|[bB]igg?)',
      '(?:[lr]angle|q?quad|[lcvdi]?dots|d?dot|hat|tilde|bar)'
    ].map(word => word + '(?![a-zA-Z@:_])'));
    const L3_REGEX = new RegExp([
      // A function \module_function_name:signature or \__module_function_name:signature,
      // where both module and function_name need at least two characters and
      // function_name may contain single underscores.
      '(?:__)?[a-zA-Z]{2,}_[a-zA-Z](?:_?[a-zA-Z])+:[a-zA-Z]*',
      // A variable \scope_module_and_name_type or \scope__module_ane_name_type,
      // where scope is one of l, g or c, type needs at least two characters
      // and module_and_name may contain single underscores.
      '[lgc]__?[a-zA-Z](?:_?[a-zA-Z])*_[a-zA-Z]{2,}',
      // A quark \q_the_name or \q__the_name or
      // scan mark \s_the_name or \s__vthe_name,
      // where variable_name needs at least two characters and
      // may contain single underscores.
      '[qs]__?[a-zA-Z](?:_?[a-zA-Z])+',
      // Other LaTeX3 macro names that are not covered by the three rules above.
      'use(?:_i)?:[a-zA-Z]*',
      '(?:else|fi|or):',
      '(?:if|cs|exp):w',
      '(?:hbox|vbox):n',
      '::[a-zA-Z]_unbraced',
      '::[a-zA-Z:]'
    ].map(pattern => pattern + '(?![a-zA-Z:_])').join('|'));
    const L2_VARIANTS = [
      { begin: /[a-zA-Z@]+/ }, // control word
      { begin: /[^a-zA-Z@]?/ } // control symbol
    ];
    const DOUBLE_CARET_VARIANTS = [
      { begin: /\^{6}[0-9a-f]{6}/ },
      { begin: /\^{5}[0-9a-f]{5}/ },
      { begin: /\^{4}[0-9a-f]{4}/ },
      { begin: /\^{3}[0-9a-f]{3}/ },
      { begin: /\^{2}[0-9a-f]{2}/ },
      { begin: /\^{2}[\u0000-\u007f]/ }
    ];
    const CONTROL_SEQUENCE = {
      className: 'keyword',
      begin: /\\/,
      relevance: 0,
      contains: [
        {
          endsParent: true,
          begin: KNOWN_CONTROL_WORDS
        },
        {
          endsParent: true,
          begin: L3_REGEX
        },
        {
          endsParent: true,
          variants: DOUBLE_CARET_VARIANTS
        },
        {
          endsParent: true,
          relevance: 0,
          variants: L2_VARIANTS
        }
      ]
    };
    const MACRO_PARAM = {
      className: 'params',
      relevance: 0,
      begin: /#+\d?/
    };
    const DOUBLE_CARET_CHAR = {
      // relevance: 1
      variants: DOUBLE_CARET_VARIANTS };
    const SPECIAL_CATCODE = {
      className: 'built_in',
      relevance: 0,
      begin: /[$&^_]/
    };
    const MAGIC_COMMENT = {
      className: 'meta',
      begin: /% ?!(T[eE]X|tex|BIB|bib)/,
      end: '$',
      relevance: 10
    };
    const COMMENT = hljs.COMMENT(
      '%',
      '$',
      { relevance: 0 }
    );
    const EVERYTHING_BUT_VERBATIM = [
      CONTROL_SEQUENCE,
      MACRO_PARAM,
      DOUBLE_CARET_CHAR,
      SPECIAL_CATCODE,
      MAGIC_COMMENT,
      COMMENT
    ];
    const BRACE_GROUP_NO_VERBATIM = {
      begin: /\{/,
      end: /\}/,
      relevance: 0,
      contains: [
        'self',
        ...EVERYTHING_BUT_VERBATIM
      ]
    };
    const ARGUMENT_BRACES = hljs.inherit(
      BRACE_GROUP_NO_VERBATIM,
      {
        relevance: 0,
        endsParent: true,
        contains: [
          BRACE_GROUP_NO_VERBATIM,
          ...EVERYTHING_BUT_VERBATIM
        ]
      }
    );
    const ARGUMENT_BRACKETS = {
      begin: /\[/,
      end: /\]/,
      endsParent: true,
      relevance: 0,
      contains: [
        BRACE_GROUP_NO_VERBATIM,
        ...EVERYTHING_BUT_VERBATIM
      ]
    };
    const SPACE_GOBBLER = {
      begin: /\s+/,
      relevance: 0
    };
    const ARGUMENT_M = [ ARGUMENT_BRACES ];
    const ARGUMENT_O = [ ARGUMENT_BRACKETS ];
    const ARGUMENT_AND_THEN = function(arg, starts_mode) {
      return {
        contains: [ SPACE_GOBBLER ],
        starts: {
          relevance: 0,
          contains: arg,
          starts: starts_mode
        }
      };
    };
    const CSNAME = function(csname, starts_mode) {
      return {
        begin: '\\\\' + csname + '(?![a-zA-Z@:_])',
        keywords: {
          $pattern: /\\[a-zA-Z]+/,
          keyword: '\\' + csname
        },
        relevance: 0,
        contains: [ SPACE_GOBBLER ],
        starts: starts_mode
      };
    };
    const BEGIN_ENV = function(envname, starts_mode) {
      return hljs.inherit(
        {
          begin: '\\\\begin(?=[ \t]*(\\r?\\n[ \t]*)?\\{' + envname + '\\})',
          keywords: {
            $pattern: /\\[a-zA-Z]+/,
            keyword: '\\begin'
          },
          relevance: 0,
        },
        ARGUMENT_AND_THEN(ARGUMENT_M, starts_mode)
      );
    };
    const VERBATIM_DELIMITED_EQUAL = (innerName = "string") => {
      return hljs.END_SAME_AS_BEGIN({
        className: innerName,
        begin: /(.|\r?\n)/,
        end: /(.|\r?\n)/,
        excludeBegin: true,
        excludeEnd: true,
        endsParent: true
      });
    };
    const VERBATIM_DELIMITED_ENV = function(envname) {
      return {
        className: 'string',
        end: '(?=\\\\end\\{' + envname + '\\})'
      };
    };

    const VERBATIM_DELIMITED_BRACES = (innerName = "string") => {
      return {
        relevance: 0,
        begin: /\{/,
        starts: {
          endsParent: true,
          contains: [
            {
              className: innerName,
              end: /(?=\})/,
              endsParent: true,
              contains: [
                {
                  begin: /\{/,
                  end: /\}/,
                  relevance: 0,
                  contains: [ "self" ]
                }
              ],
            }
          ]
        }
      };
    };
    const VERBATIM = [
      ...[
        'verb',
        'lstinline'
      ].map(csname => CSNAME(csname, { contains: [ VERBATIM_DELIMITED_EQUAL() ] })),
      CSNAME('mint', ARGUMENT_AND_THEN(ARGUMENT_M, { contains: [ VERBATIM_DELIMITED_EQUAL() ] })),
      CSNAME('mintinline', ARGUMENT_AND_THEN(ARGUMENT_M, { contains: [
        VERBATIM_DELIMITED_BRACES(),
        VERBATIM_DELIMITED_EQUAL()
      ] })),
      CSNAME('url', { contains: [
        VERBATIM_DELIMITED_BRACES("link"),
        VERBATIM_DELIMITED_BRACES("link")
      ] }),
      CSNAME('hyperref', { contains: [ VERBATIM_DELIMITED_BRACES("link") ] }),
      CSNAME('href', ARGUMENT_AND_THEN(ARGUMENT_O, { contains: [ VERBATIM_DELIMITED_BRACES("link") ] })),
      ...[].concat(...[
        '',
        '\\*'
      ].map(suffix => [
        BEGIN_ENV('verbatim' + suffix, VERBATIM_DELIMITED_ENV('verbatim' + suffix)),
        BEGIN_ENV('filecontents' + suffix, ARGUMENT_AND_THEN(ARGUMENT_M, VERBATIM_DELIMITED_ENV('filecontents' + suffix))),
        ...[
          '',
          'B',
          'L'
        ].map(prefix =>
          BEGIN_ENV(prefix + 'Verbatim' + suffix, ARGUMENT_AND_THEN(ARGUMENT_O, VERBATIM_DELIMITED_ENV(prefix + 'Verbatim' + suffix)))
        )
      ])),
      BEGIN_ENV('minted', ARGUMENT_AND_THEN(ARGUMENT_O, ARGUMENT_AND_THEN(ARGUMENT_M, VERBATIM_DELIMITED_ENV('minted')))),
    ];

    return {
      name: 'LaTeX',
      aliases: [ 'tex' ],
      contains: [
        ...VERBATIM,
        ...EVERYTHING_BUT_VERBATIM
      ]
    };
  }

  return latex;

})();

    hljs.registerLanguage('latex', hljsGrammar);
  })();/*! `less` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  const MODES = (hljs) => {
    return {
      IMPORTANT: {
        scope: 'meta',
        begin: '!important'
      },
      BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
      HEXCOLOR: {
        scope: 'number',
        begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
      },
      FUNCTION_DISPATCH: {
        className: "built_in",
        begin: /[\w-]+(?=\()/
      },
      ATTRIBUTE_SELECTOR_MODE: {
        scope: 'selector-attr',
        begin: /\[/,
        end: /\]/,
        illegal: '$',
        contains: [
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE
        ]
      },
      CSS_NUMBER_MODE: {
        scope: 'number',
        begin: hljs.NUMBER_RE + '(' +
          '%|em|ex|ch|rem' +
          '|vw|vh|vmin|vmax' +
          '|cm|mm|in|pt|pc|px' +
          '|deg|grad|rad|turn' +
          '|s|ms' +
          '|Hz|kHz' +
          '|dpi|dpcm|dppx' +
          ')?',
        relevance: 0
      },
      CSS_VARIABLE: {
        className: "attr",
        begin: /--[A-Za-z_][A-Za-z0-9_-]*/
      }
    };
  };

  const HTML_TAGS = [
    'a',
    'abbr',
    'address',
    'article',
    'aside',
    'audio',
    'b',
    'blockquote',
    'body',
    'button',
    'canvas',
    'caption',
    'cite',
    'code',
    'dd',
    'del',
    'details',
    'dfn',
    'div',
    'dl',
    'dt',
    'em',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hgroup',
    'html',
    'i',
    'iframe',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'legend',
    'li',
    'main',
    'mark',
    'menu',
    'nav',
    'object',
    'ol',
    'p',
    'q',
    'quote',
    'samp',
    'section',
    'span',
    'strong',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'textarea',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'ul',
    'var',
    'video'
  ];

  const SVG_TAGS = [
    'defs',
    'g',
    'marker',
    'mask',
    'pattern',
    'svg',
    'switch',
    'symbol',
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feFlood',
    'feGaussianBlur',
    'feImage',
    'feMerge',
    'feMorphology',
    'feOffset',
    'feSpecularLighting',
    'feTile',
    'feTurbulence',
    'linearGradient',
    'radialGradient',
    'stop',
    'circle',
    'ellipse',
    'image',
    'line',
    'path',
    'polygon',
    'polyline',
    'rect',
    'text',
    'use',
    'textPath',
    'tspan',
    'foreignObject',
    'clipPath'
  ];

  const TAGS = [
    ...HTML_TAGS,
    ...SVG_TAGS,
  ];

  // Sorting, then reversing makes sure longer attributes/elements like
  // `font-weight` are matched fully instead of getting false positives on say `font`

  const MEDIA_FEATURES = [
    'any-hover',
    'any-pointer',
    'aspect-ratio',
    'color',
    'color-gamut',
    'color-index',
    'device-aspect-ratio',
    'device-height',
    'device-width',
    'display-mode',
    'forced-colors',
    'grid',
    'height',
    'hover',
    'inverted-colors',
    'monochrome',
    'orientation',
    'overflow-block',
    'overflow-inline',
    'pointer',
    'prefers-color-scheme',
    'prefers-contrast',
    'prefers-reduced-motion',
    'prefers-reduced-transparency',
    'resolution',
    'scan',
    'scripting',
    'update',
    'width',
    // TODO: find a better solution?
    'min-width',
    'max-width',
    'min-height',
    'max-height'
  ].sort().reverse();

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
  const PSEUDO_CLASSES = [
    'active',
    'any-link',
    'blank',
    'checked',
    'current',
    'default',
    'defined',
    'dir', // dir()
    'disabled',
    'drop',
    'empty',
    'enabled',
    'first',
    'first-child',
    'first-of-type',
    'fullscreen',
    'future',
    'focus',
    'focus-visible',
    'focus-within',
    'has', // has()
    'host', // host or host()
    'host-context', // host-context()
    'hover',
    'indeterminate',
    'in-range',
    'invalid',
    'is', // is()
    'lang', // lang()
    'last-child',
    'last-of-type',
    'left',
    'link',
    'local-link',
    'not', // not()
    'nth-child', // nth-child()
    'nth-col', // nth-col()
    'nth-last-child', // nth-last-child()
    'nth-last-col', // nth-last-col()
    'nth-last-of-type', //nth-last-of-type()
    'nth-of-type', //nth-of-type()
    'only-child',
    'only-of-type',
    'optional',
    'out-of-range',
    'past',
    'placeholder-shown',
    'read-only',
    'read-write',
    'required',
    'right',
    'root',
    'scope',
    'target',
    'target-within',
    'user-invalid',
    'valid',
    'visited',
    'where' // where()
  ].sort().reverse();

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
  const PSEUDO_ELEMENTS = [
    'after',
    'backdrop',
    'before',
    'cue',
    'cue-region',
    'first-letter',
    'first-line',
    'grammar-error',
    'marker',
    'part',
    'placeholder',
    'selection',
    'slotted',
    'spelling-error'
  ].sort().reverse();

  const ATTRIBUTES = [
    'align-content',
    'align-items',
    'align-self',
    'alignment-baseline',
    'all',
    'animation',
    'animation-delay',
    'animation-direction',
    'animation-duration',
    'animation-fill-mode',
    'animation-iteration-count',
    'animation-name',
    'animation-play-state',
    'animation-timing-function',
    'backface-visibility',
    'background',
    'background-attachment',
    'background-blend-mode',
    'background-clip',
    'background-color',
    'background-image',
    'background-origin',
    'background-position',
    'background-repeat',
    'background-size',
    'baseline-shift',
    'block-size',
    'border',
    'border-block',
    'border-block-color',
    'border-block-end',
    'border-block-end-color',
    'border-block-end-style',
    'border-block-end-width',
    'border-block-start',
    'border-block-start-color',
    'border-block-start-style',
    'border-block-start-width',
    'border-block-style',
    'border-block-width',
    'border-bottom',
    'border-bottom-color',
    'border-bottom-left-radius',
    'border-bottom-right-radius',
    'border-bottom-style',
    'border-bottom-width',
    'border-collapse',
    'border-color',
    'border-image',
    'border-image-outset',
    'border-image-repeat',
    'border-image-slice',
    'border-image-source',
    'border-image-width',
    'border-inline',
    'border-inline-color',
    'border-inline-end',
    'border-inline-end-color',
    'border-inline-end-style',
    'border-inline-end-width',
    'border-inline-start',
    'border-inline-start-color',
    'border-inline-start-style',
    'border-inline-start-width',
    'border-inline-style',
    'border-inline-width',
    'border-left',
    'border-left-color',
    'border-left-style',
    'border-left-width',
    'border-radius',
    'border-right',
    'border-right-color',
    'border-right-style',
    'border-right-width',
    'border-spacing',
    'border-style',
    'border-top',
    'border-top-color',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-top-style',
    'border-top-width',
    'border-width',
    'bottom',
    'box-decoration-break',
    'box-shadow',
    'box-sizing',
    'break-after',
    'break-before',
    'break-inside',
    'cx',
    'cy',
    'caption-side',
    'caret-color',
    'clear',
    'clip',
    'clip-path',
    'clip-rule',
    'color',
    'color-interpolation',
    'color-interpolation-filters',
    'color-profile',
    'color-rendering',
    'column-count',
    'column-fill',
    'column-gap',
    'column-rule',
    'column-rule-color',
    'column-rule-style',
    'column-rule-width',
    'column-span',
    'column-width',
    'columns',
    'contain',
    'content',
    'content-visibility',
    'counter-increment',
    'counter-reset',
    'cue',
    'cue-after',
    'cue-before',
    'cursor',
    'direction',
    'display',
    'dominant-baseline',
    'empty-cells',
    'enable-background',
    'fill',
    'fill-opacity',
    'fill-rule',
    'filter',
    'flex',
    'flex-basis',
    'flex-direction',
    'flex-flow',
    'flex-grow',
    'flex-shrink',
    'flex-wrap',
    'float',
    'flow',
    'flood-color',
    'flood-opacity',
    'font',
    'font-display',
    'font-family',
    'font-feature-settings',
    'font-kerning',
    'font-language-override',
    'font-size',
    'font-size-adjust',
    'font-smoothing',
    'font-stretch',
    'font-style',
    'font-synthesis',
    'font-variant',
    'font-variant-caps',
    'font-variant-east-asian',
    'font-variant-ligatures',
    'font-variant-numeric',
    'font-variant-position',
    'font-variation-settings',
    'font-weight',
    'gap',
    'glyph-orientation-horizontal',
    'glyph-orientation-vertical',
    'grid',
    'grid-area',
    'grid-auto-columns',
    'grid-auto-flow',
    'grid-auto-rows',
    'grid-column',
    'grid-column-end',
    'grid-column-start',
    'grid-gap',
    'grid-row',
    'grid-row-end',
    'grid-row-start',
    'grid-template',
    'grid-template-areas',
    'grid-template-columns',
    'grid-template-rows',
    'hanging-punctuation',
    'height',
    'hyphens',
    'icon',
    'image-orientation',
    'image-rendering',
    'image-resolution',
    'ime-mode',
    'inline-size',
    'isolation',
    'kerning',
    'justify-content',
    'left',
    'letter-spacing',
    'lighting-color',
    'line-break',
    'line-height',
    'list-style',
    'list-style-image',
    'list-style-position',
    'list-style-type',
    'marker',
    'marker-end',
    'marker-mid',
    'marker-start',
    'mask',
    'margin',
    'margin-block',
    'margin-block-end',
    'margin-block-start',
    'margin-bottom',
    'margin-inline',
    'margin-inline-end',
    'margin-inline-start',
    'margin-left',
    'margin-right',
    'margin-top',
    'marks',
    'mask',
    'mask-border',
    'mask-border-mode',
    'mask-border-outset',
    'mask-border-repeat',
    'mask-border-slice',
    'mask-border-source',
    'mask-border-width',
    'mask-clip',
    'mask-composite',
    'mask-image',
    'mask-mode',
    'mask-origin',
    'mask-position',
    'mask-repeat',
    'mask-size',
    'mask-type',
    'max-block-size',
    'max-height',
    'max-inline-size',
    'max-width',
    'min-block-size',
    'min-height',
    'min-inline-size',
    'min-width',
    'mix-blend-mode',
    'nav-down',
    'nav-index',
    'nav-left',
    'nav-right',
    'nav-up',
    'none',
    'normal',
    'object-fit',
    'object-position',
    'opacity',
    'order',
    'orphans',
    'outline',
    'outline-color',
    'outline-offset',
    'outline-style',
    'outline-width',
    'overflow',
    'overflow-wrap',
    'overflow-x',
    'overflow-y',
    'padding',
    'padding-block',
    'padding-block-end',
    'padding-block-start',
    'padding-bottom',
    'padding-inline',
    'padding-inline-end',
    'padding-inline-start',
    'padding-left',
    'padding-right',
    'padding-top',
    'page-break-after',
    'page-break-before',
    'page-break-inside',
    'pause',
    'pause-after',
    'pause-before',
    'perspective',
    'perspective-origin',
    'pointer-events',
    'position',
    'quotes',
    'r',
    'resize',
    'rest',
    'rest-after',
    'rest-before',
    'right',
    'row-gap',
    'scroll-margin',
    'scroll-margin-block',
    'scroll-margin-block-end',
    'scroll-margin-block-start',
    'scroll-margin-bottom',
    'scroll-margin-inline',
    'scroll-margin-inline-end',
    'scroll-margin-inline-start',
    'scroll-margin-left',
    'scroll-margin-right',
    'scroll-margin-top',
    'scroll-padding',
    'scroll-padding-block',
    'scroll-padding-block-end',
    'scroll-padding-block-start',
    'scroll-padding-bottom',
    'scroll-padding-inline',
    'scroll-padding-inline-end',
    'scroll-padding-inline-start',
    'scroll-padding-left',
    'scroll-padding-right',
    'scroll-padding-top',
    'scroll-snap-align',
    'scroll-snap-stop',
    'scroll-snap-type',
    'scrollbar-color',
    'scrollbar-gutter',
    'scrollbar-width',
    'shape-image-threshold',
    'shape-margin',
    'shape-outside',
    'shape-rendering',
    'stop-color',
    'stop-opacity',
    'stroke',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-opacity',
    'stroke-width',
    'speak',
    'speak-as',
    'src', // @font-face
    'tab-size',
    'table-layout',
    'text-anchor',
    'text-align',
    'text-align-all',
    'text-align-last',
    'text-combine-upright',
    'text-decoration',
    'text-decoration-color',
    'text-decoration-line',
    'text-decoration-style',
    'text-emphasis',
    'text-emphasis-color',
    'text-emphasis-position',
    'text-emphasis-style',
    'text-indent',
    'text-justify',
    'text-orientation',
    'text-overflow',
    'text-rendering',
    'text-shadow',
    'text-transform',
    'text-underline-position',
    'top',
    'transform',
    'transform-box',
    'transform-origin',
    'transform-style',
    'transition',
    'transition-delay',
    'transition-duration',
    'transition-property',
    'transition-timing-function',
    'unicode-bidi',
    'vector-effect',
    'vertical-align',
    'visibility',
    'voice-balance',
    'voice-duration',
    'voice-family',
    'voice-pitch',
    'voice-range',
    'voice-rate',
    'voice-stress',
    'voice-volume',
    'white-space',
    'widows',
    'width',
    'will-change',
    'word-break',
    'word-spacing',
    'word-wrap',
    'writing-mode',
    'x',
    'y',
    'z-index'
  ].sort().reverse();

  // some grammars use them all as a single group
  const PSEUDO_SELECTORS = PSEUDO_CLASSES.concat(PSEUDO_ELEMENTS).sort().reverse();

  /*
  Language: Less
  Description: It's CSS, with just a little more.
  Author:   Max Mikhailov <seven.phases.max@gmail.com>
  Website: http://lesscss.org
  Category: common, css, web
  */


  /** @type LanguageFn */
  function less(hljs) {
    const modes = MODES(hljs);
    const PSEUDO_SELECTORS$1 = PSEUDO_SELECTORS;

    const AT_MODIFIERS = "and or not only";
    const IDENT_RE = '[\\w-]+'; // yes, Less identifiers may begin with a digit
    const INTERP_IDENT_RE = '(' + IDENT_RE + '|@\\{' + IDENT_RE + '\\})';

    /* Generic Modes */

    const RULES = []; const VALUE_MODES = []; // forward def. for recursive modes

    const STRING_MODE = function(c) {
      return {
      // Less strings are not multiline (also include '~' for more consistent coloring of "escaped" strings)
        className: 'string',
        begin: '~?' + c + '.*?' + c
      };
    };

    const IDENT_MODE = function(name, begin, relevance) {
      return {
        className: name,
        begin: begin,
        relevance: relevance
      };
    };

    const AT_KEYWORDS = {
      $pattern: /[a-z-]+/,
      keyword: AT_MODIFIERS,
      attribute: MEDIA_FEATURES.join(" ")
    };

    const PARENS_MODE = {
      // used only to properly balance nested parens inside mixin call, def. arg list
      begin: '\\(',
      end: '\\)',
      contains: VALUE_MODES,
      keywords: AT_KEYWORDS,
      relevance: 0
    };

    // generic Less highlighter (used almost everywhere except selectors):
    VALUE_MODES.push(
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      STRING_MODE("'"),
      STRING_MODE('"'),
      modes.CSS_NUMBER_MODE, // fixme: it does not include dot for numbers like .5em :(
      {
        begin: '(url|data-uri)\\(',
        starts: {
          className: 'string',
          end: '[\\)\\n]',
          excludeEnd: true
        }
      },
      modes.HEXCOLOR,
      PARENS_MODE,
      IDENT_MODE('variable', '@@?' + IDENT_RE, 10),
      IDENT_MODE('variable', '@\\{' + IDENT_RE + '\\}'),
      IDENT_MODE('built_in', '~?`[^`]*?`'), // inline javascript (or whatever host language) *multiline* string
      { // @media features (it’s here to not duplicate things in AT_RULE_MODE with extra PARENS_MODE overriding):
        className: 'attribute',
        begin: IDENT_RE + '\\s*:',
        end: ':',
        returnBegin: true,
        excludeEnd: true
      },
      modes.IMPORTANT,
      { beginKeywords: 'and not' },
      modes.FUNCTION_DISPATCH
    );

    const VALUE_WITH_RULESETS = VALUE_MODES.concat({
      begin: /\{/,
      end: /\}/,
      contains: RULES
    });

    const MIXIN_GUARD_MODE = {
      beginKeywords: 'when',
      endsWithParent: true,
      contains: [ { beginKeywords: 'and not' } ].concat(VALUE_MODES) // using this form to override VALUE’s 'function' match
    };

    /* Rule-Level Modes */

    const RULE_MODE = {
      begin: INTERP_IDENT_RE + '\\s*:',
      returnBegin: true,
      end: /[;}]/,
      relevance: 0,
      contains: [
        { begin: /-(webkit|moz|ms|o)-/ },
        modes.CSS_VARIABLE,
        {
          className: 'attribute',
          begin: '\\b(' + ATTRIBUTES.join('|') + ')\\b',
          end: /(?=:)/,
          starts: {
            endsWithParent: true,
            illegal: '[<=$]',
            relevance: 0,
            contains: VALUE_MODES
          }
        }
      ]
    };

    const AT_RULE_MODE = {
      className: 'keyword',
      begin: '@(import|media|charset|font-face|(-[a-z]+-)?keyframes|supports|document|namespace|page|viewport|host)\\b',
      starts: {
        end: '[;{}]',
        keywords: AT_KEYWORDS,
        returnEnd: true,
        contains: VALUE_MODES,
        relevance: 0
      }
    };

    // variable definitions and calls
    const VAR_RULE_MODE = {
      className: 'variable',
      variants: [
        // using more strict pattern for higher relevance to increase chances of Less detection.
        // this is *the only* Less specific statement used in most of the sources, so...
        // (we’ll still often loose to the css-parser unless there's '//' comment,
        // simply because 1 variable just can't beat 99 properties :)
        {
          begin: '@' + IDENT_RE + '\\s*:',
          relevance: 15
        },
        { begin: '@' + IDENT_RE }
      ],
      starts: {
        end: '[;}]',
        returnEnd: true,
        contains: VALUE_WITH_RULESETS
      }
    };

    const SELECTOR_MODE = {
      // first parse unambiguous selectors (i.e. those not starting with tag)
      // then fall into the scary lookahead-discriminator variant.
      // this mode also handles mixin definitions and calls
      variants: [
        {
          begin: '[\\.#:&\\[>]',
          end: '[;{}]' // mixin calls end with ';'
        },
        {
          begin: INTERP_IDENT_RE,
          end: /\{/
        }
      ],
      returnBegin: true,
      returnEnd: true,
      illegal: '[<=\'$"]',
      relevance: 0,
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        MIXIN_GUARD_MODE,
        IDENT_MODE('keyword', 'all\\b'),
        IDENT_MODE('variable', '@\\{' + IDENT_RE + '\\}'), // otherwise it’s identified as tag
        
        {
          begin: '\\b(' + TAGS.join('|') + ')\\b',
          className: 'selector-tag'
        },
        modes.CSS_NUMBER_MODE,
        IDENT_MODE('selector-tag', INTERP_IDENT_RE, 0),
        IDENT_MODE('selector-id', '#' + INTERP_IDENT_RE),
        IDENT_MODE('selector-class', '\\.' + INTERP_IDENT_RE, 0),
        IDENT_MODE('selector-tag', '&', 0),
        modes.ATTRIBUTE_SELECTOR_MODE,
        {
          className: 'selector-pseudo',
          begin: ':(' + PSEUDO_CLASSES.join('|') + ')'
        },
        {
          className: 'selector-pseudo',
          begin: ':(:)?(' + PSEUDO_ELEMENTS.join('|') + ')'
        },
        {
          begin: /\(/,
          end: /\)/,
          relevance: 0,
          contains: VALUE_WITH_RULESETS
        }, // argument list of parametric mixins
        { begin: '!important' }, // eat !important after mixin call or it will be colored as tag
        modes.FUNCTION_DISPATCH
      ]
    };

    const PSEUDO_SELECTOR_MODE = {
      begin: IDENT_RE + ':(:)?' + `(${PSEUDO_SELECTORS$1.join('|')})`,
      returnBegin: true,
      contains: [ SELECTOR_MODE ]
    };

    RULES.push(
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      AT_RULE_MODE,
      VAR_RULE_MODE,
      PSEUDO_SELECTOR_MODE,
      RULE_MODE,
      SELECTOR_MODE,
      MIXIN_GUARD_MODE,
      modes.FUNCTION_DISPATCH
    );

    return {
      name: 'Less',
      case_insensitive: true,
      illegal: '[=>\'/<($"]',
      contains: RULES
    };
  }

  return less;

})();

    hljs.registerLanguage('less', hljsGrammar);
  })();/*! `lisp` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Lisp
  Description: Generic lisp syntax
  Author: Vasily Polovnyov <vast@whiteants.net>
  Category: lisp
  */

  function lisp(hljs) {
    const LISP_IDENT_RE = '[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*';
    const MEC_RE = '\\|[^]*?\\|';
    const LISP_SIMPLE_NUMBER_RE = '(-|\\+)?\\d+(\\.\\d+|\\/\\d+)?((d|e|f|l|s|D|E|F|L|S)(\\+|-)?\\d+)?';
    const LITERAL = {
      className: 'literal',
      begin: '\\b(t{1}|nil)\\b'
    };
    const NUMBER = {
      className: 'number',
      variants: [
        {
          begin: LISP_SIMPLE_NUMBER_RE,
          relevance: 0
        },
        { begin: '#(b|B)[0-1]+(/[0-1]+)?' },
        { begin: '#(o|O)[0-7]+(/[0-7]+)?' },
        { begin: '#(x|X)[0-9a-fA-F]+(/[0-9a-fA-F]+)?' },
        {
          begin: '#(c|C)\\(' + LISP_SIMPLE_NUMBER_RE + ' +' + LISP_SIMPLE_NUMBER_RE,
          end: '\\)'
        }
      ]
    };
    const STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null });
    const COMMENT = hljs.COMMENT(
      ';', '$',
      { relevance: 0 }
    );
    const VARIABLE = {
      begin: '\\*',
      end: '\\*'
    };
    const KEYWORD = {
      className: 'symbol',
      begin: '[:&]' + LISP_IDENT_RE
    };
    const IDENT = {
      begin: LISP_IDENT_RE,
      relevance: 0
    };
    const MEC = { begin: MEC_RE };
    const QUOTED_LIST = {
      begin: '\\(',
      end: '\\)',
      contains: [
        'self',
        LITERAL,
        STRING,
        NUMBER,
        IDENT
      ]
    };
    const QUOTED = {
      contains: [
        NUMBER,
        STRING,
        VARIABLE,
        KEYWORD,
        QUOTED_LIST,
        IDENT
      ],
      variants: [
        {
          begin: '[\'`]\\(',
          end: '\\)'
        },
        {
          begin: '\\(quote ',
          end: '\\)',
          keywords: { name: 'quote' }
        },
        { begin: '\'' + MEC_RE }
      ]
    };
    const QUOTED_ATOM = { variants: [
      { begin: '\'' + LISP_IDENT_RE },
      { begin: '#\'' + LISP_IDENT_RE + '(::' + LISP_IDENT_RE + ')*' }
    ] };
    const LIST = {
      begin: '\\(\\s*',
      end: '\\)'
    };
    const BODY = {
      endsWithParent: true,
      relevance: 0
    };
    LIST.contains = [
      {
        className: 'name',
        variants: [
          {
            begin: LISP_IDENT_RE,
            relevance: 0,
          },
          { begin: MEC_RE }
        ]
      },
      BODY
    ];
    BODY.contains = [
      QUOTED,
      QUOTED_ATOM,
      LIST,
      LITERAL,
      NUMBER,
      STRING,
      COMMENT,
      VARIABLE,
      KEYWORD,
      MEC,
      IDENT
    ];

    return {
      name: 'Lisp',
      illegal: /\S/,
      contains: [
        NUMBER,
        hljs.SHEBANG(),
        LITERAL,
        STRING,
        COMMENT,
        QUOTED,
        QUOTED_ATOM,
        LIST,
        IDENT
      ]
    };
  }

  return lisp;

})();

    hljs.registerLanguage('lisp', hljsGrammar);
  })();/*! `makefile` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Makefile
  Author: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Contributors: Joël Porquet <joel@porquet.org>
  Website: https://www.gnu.org/software/make/manual/html_node/Introduction.html
  Category: common, build-system
  */

  function makefile(hljs) {
    /* Variables: simple (eg $(var)) and special (eg $@) */
    const VARIABLE = {
      className: 'variable',
      variants: [
        {
          begin: '\\$\\(' + hljs.UNDERSCORE_IDENT_RE + '\\)',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        { begin: /\$[@%<?\^\+\*]/ }
      ]
    };
    /* Quoted string with variables inside */
    const QUOTE_STRING = {
      className: 'string',
      begin: /"/,
      end: /"/,
      contains: [
        hljs.BACKSLASH_ESCAPE,
        VARIABLE
      ]
    };
    /* Function: $(func arg,...) */
    const FUNC = {
      className: 'variable',
      begin: /\$\([\w-]+\s/,
      end: /\)/,
      keywords: { built_in:
          'subst patsubst strip findstring filter filter-out sort '
          + 'word wordlist firstword lastword dir notdir suffix basename '
          + 'addsuffix addprefix join wildcard realpath abspath error warning '
          + 'shell origin flavor foreach if or and call eval file value' },
      contains: [ VARIABLE ]
    };
    /* Variable assignment */
    const ASSIGNMENT = { begin: '^' + hljs.UNDERSCORE_IDENT_RE + '\\s*(?=[:+?]?=)' };
    /* Meta targets (.PHONY) */
    const META = {
      className: 'meta',
      begin: /^\.PHONY:/,
      end: /$/,
      keywords: {
        $pattern: /[\.\w]+/,
        keyword: '.PHONY'
      }
    };
    /* Targets */
    const TARGET = {
      className: 'section',
      begin: /^[^\s]+:/,
      end: /$/,
      contains: [ VARIABLE ]
    };
    return {
      name: 'Makefile',
      aliases: [
        'mk',
        'mak',
        'make',
      ],
      keywords: {
        $pattern: /[\w-]+/,
        keyword: 'define endef undefine ifdef ifndef ifeq ifneq else endif '
        + 'include -include sinclude override export unexport private vpath'
      },
      contains: [
        hljs.HASH_COMMENT_MODE,
        VARIABLE,
        QUOTE_STRING,
        FUNC,
        ASSIGNMENT,
        META,
        TARGET
      ]
    };
  }

  return makefile;

})();

    hljs.registerLanguage('makefile', hljsGrammar);
  })();/*! `markdown` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Markdown
  Requires: xml.js
  Author: John Crepezzi <john.crepezzi@gmail.com>
  Website: https://daringfireball.net/projects/markdown/
  Category: common, markup
  */

  function markdown(hljs) {
    const regex = hljs.regex;
    const INLINE_HTML = {
      begin: /<\/?[A-Za-z_]/,
      end: '>',
      subLanguage: 'xml',
      relevance: 0
    };
    const HORIZONTAL_RULE = {
      begin: '^[-\\*]{3,}',
      end: '$'
    };
    const CODE = {
      className: 'code',
      variants: [
        // TODO: fix to allow these to work with sublanguage also
        { begin: '(`{3,})[^`](.|\\n)*?\\1`*[ ]*' },
        { begin: '(~{3,})[^~](.|\\n)*?\\1~*[ ]*' },
        // needed to allow markdown as a sublanguage to work
        {
          begin: '```',
          end: '```+[ ]*$'
        },
        {
          begin: '~~~',
          end: '~~~+[ ]*$'
        },
        { begin: '`.+?`' },
        {
          begin: '(?=^( {4}|\\t))',
          // use contains to gobble up multiple lines to allow the block to be whatever size
          // but only have a single open/close tag vs one per line
          contains: [
            {
              begin: '^( {4}|\\t)',
              end: '(\\n)$'
            }
          ],
          relevance: 0
        }
      ]
    };
    const LIST = {
      className: 'bullet',
      begin: '^[ \t]*([*+-]|(\\d+\\.))(?=\\s+)',
      end: '\\s+',
      excludeEnd: true
    };
    const LINK_REFERENCE = {
      begin: /^\[[^\n]+\]:/,
      returnBegin: true,
      contains: [
        {
          className: 'symbol',
          begin: /\[/,
          end: /\]/,
          excludeBegin: true,
          excludeEnd: true
        },
        {
          className: 'link',
          begin: /:\s*/,
          end: /$/,
          excludeBegin: true
        }
      ]
    };
    const URL_SCHEME = /[A-Za-z][A-Za-z0-9+.-]*/;
    const LINK = {
      variants: [
        // too much like nested array access in so many languages
        // to have any real relevance
        {
          begin: /\[.+?\]\[.*?\]/,
          relevance: 0
        },
        // popular internet URLs
        {
          begin: /\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)/,
          relevance: 2
        },
        {
          begin: regex.concat(/\[.+?\]\(/, URL_SCHEME, /:\/\/.*?\)/),
          relevance: 2
        },
        // relative urls
        {
          begin: /\[.+?\]\([./?&#].*?\)/,
          relevance: 1
        },
        // whatever else, lower relevance (might not be a link at all)
        {
          begin: /\[.*?\]\(.*?\)/,
          relevance: 0
        }
      ],
      returnBegin: true,
      contains: [
        {
          // empty strings for alt or link text
          match: /\[(?=\])/ },
        {
          className: 'string',
          relevance: 0,
          begin: '\\[',
          end: '\\]',
          excludeBegin: true,
          returnEnd: true
        },
        {
          className: 'link',
          relevance: 0,
          begin: '\\]\\(',
          end: '\\)',
          excludeBegin: true,
          excludeEnd: true
        },
        {
          className: 'symbol',
          relevance: 0,
          begin: '\\]\\[',
          end: '\\]',
          excludeBegin: true,
          excludeEnd: true
        }
      ]
    };
    const BOLD = {
      className: 'strong',
      contains: [], // defined later
      variants: [
        {
          begin: /_{2}(?!\s)/,
          end: /_{2}/
        },
        {
          begin: /\*{2}(?!\s)/,
          end: /\*{2}/
        }
      ]
    };
    const ITALIC = {
      className: 'emphasis',
      contains: [], // defined later
      variants: [
        {
          begin: /\*(?![*\s])/,
          end: /\*/
        },
        {
          begin: /_(?![_\s])/,
          end: /_/,
          relevance: 0
        }
      ]
    };

    // 3 level deep nesting is not allowed because it would create confusion
    // in cases like `***testing***` because where we don't know if the last
    // `***` is starting a new bold/italic or finishing the last one
    const BOLD_WITHOUT_ITALIC = hljs.inherit(BOLD, { contains: [] });
    const ITALIC_WITHOUT_BOLD = hljs.inherit(ITALIC, { contains: [] });
    BOLD.contains.push(ITALIC_WITHOUT_BOLD);
    ITALIC.contains.push(BOLD_WITHOUT_ITALIC);

    let CONTAINABLE = [
      INLINE_HTML,
      LINK
    ];

    [
      BOLD,
      ITALIC,
      BOLD_WITHOUT_ITALIC,
      ITALIC_WITHOUT_BOLD
    ].forEach(m => {
      m.contains = m.contains.concat(CONTAINABLE);
    });

    CONTAINABLE = CONTAINABLE.concat(BOLD, ITALIC);

    const HEADER = {
      className: 'section',
      variants: [
        {
          begin: '^#{1,6}',
          end: '$',
          contains: CONTAINABLE
        },
        {
          begin: '(?=^.+?\\n[=-]{2,}$)',
          contains: [
            { begin: '^[=-]*$' },
            {
              begin: '^',
              end: "\\n",
              contains: CONTAINABLE
            }
          ]
        }
      ]
    };

    const BLOCKQUOTE = {
      className: 'quote',
      begin: '^>\\s+',
      contains: CONTAINABLE,
      end: '$'
    };

    return {
      name: 'Markdown',
      aliases: [
        'md',
        'mkdown',
        'mkd'
      ],
      contains: [
        HEADER,
        INLINE_HTML,
        LIST,
        BOLD,
        ITALIC,
        BLOCKQUOTE,
        CODE,
        HORIZONTAL_RULE,
        LINK,
        LINK_REFERENCE
      ]
    };
  }

  return markdown;

})();

    hljs.registerLanguage('markdown', hljsGrammar);
  })();/*! `mel` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: MEL
  Description: Maya Embedded Language
  Author: Shuen-Huei Guan <drake.guan@gmail.com>
  Website: http://www.autodesk.com/products/autodesk-maya/overview
  Category: graphics
  */

  function mel(hljs) {
    return {
      name: 'MEL',
      keywords:
        'int float string vector matrix if else switch case default while do for in break '
        + 'continue global proc return about abs addAttr addAttributeEditorNodeHelp addDynamic '
        + 'addNewShelfTab addPP addPanelCategory addPrefixToName advanceToNextDrivenKey '
        + 'affectedNet affects aimConstraint air alias aliasAttr align alignCtx alignCurve '
        + 'alignSurface allViewFit ambientLight angle angleBetween animCone animCurveEditor '
        + 'animDisplay animView annotate appendStringArray applicationName applyAttrPreset '
        + 'applyTake arcLenDimContext arcLengthDimension arclen arrayMapper art3dPaintCtx '
        + 'artAttrCtx artAttrPaintVertexCtx artAttrSkinPaintCtx artAttrTool artBuildPaintMenu '
        + 'artFluidAttrCtx artPuttyCtx artSelectCtx artSetPaintCtx artUserPaintCtx assignCommand '
        + 'assignInputDevice assignViewportFactories attachCurve attachDeviceAttr attachSurface '
        + 'attrColorSliderGrp attrCompatibility attrControlGrp attrEnumOptionMenu '
        + 'attrEnumOptionMenuGrp attrFieldGrp attrFieldSliderGrp attrNavigationControlGrp '
        + 'attrPresetEditWin attributeExists attributeInfo attributeMenu attributeQuery '
        + 'autoKeyframe autoPlace bakeClip bakeFluidShading bakePartialHistory bakeResults '
        + 'bakeSimulation basename basenameEx batchRender bessel bevel bevelPlus binMembership '
        + 'bindSkin blend2 blendShape blendShapeEditor blendShapePanel blendTwoAttr blindDataType '
        + 'boneLattice boundary boxDollyCtx boxZoomCtx bufferCurve buildBookmarkMenu '
        + 'buildKeyframeMenu button buttonManip CBG cacheFile cacheFileCombine cacheFileMerge '
        + 'cacheFileTrack camera cameraView canCreateManip canvas capitalizeString catch '
        + 'catchQuiet ceil changeSubdivComponentDisplayLevel changeSubdivRegion channelBox '
        + 'character characterMap characterOutlineEditor characterize chdir checkBox checkBoxGrp '
        + 'checkDefaultRenderGlobals choice circle circularFillet clamp clear clearCache clip '
        + 'clipEditor clipEditorCurrentTimeCtx clipSchedule clipSchedulerOutliner clipTrimBefore '
        + 'closeCurve closeSurface cluster cmdFileOutput cmdScrollFieldExecuter '
        + 'cmdScrollFieldReporter cmdShell coarsenSubdivSelectionList collision color '
        + 'colorAtPoint colorEditor colorIndex colorIndexSliderGrp colorSliderButtonGrp '
        + 'colorSliderGrp columnLayout commandEcho commandLine commandPort compactHairSystem '
        + 'componentEditor compositingInterop computePolysetVolume condition cone confirmDialog '
        + 'connectAttr connectControl connectDynamic connectJoint connectionInfo constrain '
        + 'constrainValue constructionHistory container containsMultibyte contextInfo control '
        + 'convertFromOldLayers convertIffToPsd convertLightmap convertSolidTx convertTessellation '
        + 'convertUnit copyArray copyFlexor copyKey copySkinWeights cos cpButton cpCache '
        + 'cpClothSet cpCollision cpConstraint cpConvClothToMesh cpForces cpGetSolverAttr cpPanel '
        + 'cpProperty cpRigidCollisionFilter cpSeam cpSetEdit cpSetSolverAttr cpSolver '
        + 'cpSolverTypes cpTool cpUpdateClothUVs createDisplayLayer createDrawCtx createEditor '
        + 'createLayeredPsdFile createMotionField createNewShelf createNode createRenderLayer '
        + 'createSubdivRegion cross crossProduct ctxAbort ctxCompletion ctxEditMode ctxTraverse '
        + 'currentCtx currentTime currentTimeCtx currentUnit curve curveAddPtCtx '
        + 'curveCVCtx curveEPCtx curveEditorCtx curveIntersect curveMoveEPCtx curveOnSurface '
        + 'curveSketchCtx cutKey cycleCheck cylinder dagPose date defaultLightListCheckBox '
        + 'defaultNavigation defineDataServer defineVirtualDevice deformer deg_to_rad delete '
        + 'deleteAttr deleteShadingGroupsAndMaterials deleteShelfTab deleteUI deleteUnusedBrushes '
        + 'delrandstr detachCurve detachDeviceAttr detachSurface deviceEditor devicePanel dgInfo '
        + 'dgdirty dgeval dgtimer dimWhen directKeyCtx directionalLight dirmap dirname disable '
        + 'disconnectAttr disconnectJoint diskCache displacementToPoly displayAffected '
        + 'displayColor displayCull displayLevelOfDetail displayPref displayRGBColor '
        + 'displaySmoothness displayStats displayString displaySurface distanceDimContext '
        + 'distanceDimension doBlur dolly dollyCtx dopeSheetEditor dot dotProduct '
        + 'doubleProfileBirailSurface drag dragAttrContext draggerContext dropoffLocator '
        + 'duplicate duplicateCurve duplicateSurface dynCache dynControl dynExport dynExpression '
        + 'dynGlobals dynPaintEditor dynParticleCtx dynPref dynRelEdPanel dynRelEditor '
        + 'dynamicLoad editAttrLimits editDisplayLayerGlobals editDisplayLayerMembers '
        + 'editRenderLayerAdjustment editRenderLayerGlobals editRenderLayerMembers editor '
        + 'editorTemplate effector emit emitter enableDevice encodeString endString endsWith env '
        + 'equivalent equivalentTol erf error eval evalDeferred evalEcho event '
        + 'exactWorldBoundingBox exclusiveLightCheckBox exec executeForEachObject exists exp '
        + 'expression expressionEditorListen extendCurve extendSurface extrude fcheck fclose feof '
        + 'fflush fgetline fgetword file fileBrowserDialog fileDialog fileExtension fileInfo '
        + 'filetest filletCurve filter filterCurve filterExpand filterStudioImport '
        + 'findAllIntersections findAnimCurves findKeyframe findMenuItem findRelatedSkinCluster '
        + 'finder firstParentOf fitBspline flexor floatEq floatField floatFieldGrp floatScrollBar '
        + 'floatSlider floatSlider2 floatSliderButtonGrp floatSliderGrp floor flow fluidCacheInfo '
        + 'fluidEmitter fluidVoxelInfo flushUndo fmod fontDialog fopen formLayout format fprint '
        + 'frameLayout fread freeFormFillet frewind fromNativePath fwrite gamma gauss '
        + 'geometryConstraint getApplicationVersionAsFloat getAttr getClassification '
        + 'getDefaultBrush getFileList getFluidAttr getInputDeviceRange getMayaPanelTypes '
        + 'getModifiers getPanel getParticleAttr getPluginResource getenv getpid glRender '
        + 'glRenderEditor globalStitch gmatch goal gotoBindPose grabColor gradientControl '
        + 'gradientControlNoAttr graphDollyCtx graphSelectContext graphTrackCtx gravity grid '
        + 'gridLayout group groupObjectsByName HfAddAttractorToAS HfAssignAS HfBuildEqualMap '
        + 'HfBuildFurFiles HfBuildFurImages HfCancelAFR HfConnectASToHF HfCreateAttractor '
        + 'HfDeleteAS HfEditAS HfPerformCreateAS HfRemoveAttractorFromAS HfSelectAttached '
        + 'HfSelectAttractors HfUnAssignAS hardenPointCurve hardware hardwareRenderPanel '
        + 'headsUpDisplay headsUpMessage help helpLine hermite hide hilite hitTest hotBox hotkey '
        + 'hotkeyCheck hsv_to_rgb hudButton hudSlider hudSliderButton hwReflectionMap hwRender '
        + 'hwRenderLoad hyperGraph hyperPanel hyperShade hypot iconTextButton iconTextCheckBox '
        + 'iconTextRadioButton iconTextRadioCollection iconTextScrollList iconTextStaticLabel '
        + 'ikHandle ikHandleCtx ikHandleDisplayScale ikSolver ikSplineHandleCtx ikSystem '
        + 'ikSystemInfo ikfkDisplayMethod illustratorCurves image imfPlugins inheritTransform '
        + 'insertJoint insertJointCtx insertKeyCtx insertKnotCurve insertKnotSurface instance '
        + 'instanceable instancer intField intFieldGrp intScrollBar intSlider intSliderGrp '
        + 'interToUI internalVar intersect iprEngine isAnimCurve isConnected isDirty isParentOf '
        + 'isSameObject isTrue isValidObjectName isValidString isValidUiName isolateSelect '
        + 'itemFilter itemFilterAttr itemFilterRender itemFilterType joint jointCluster jointCtx '
        + 'jointDisplayScale jointLattice keyTangent keyframe keyframeOutliner '
        + 'keyframeRegionCurrentTimeCtx keyframeRegionDirectKeyCtx keyframeRegionDollyCtx '
        + 'keyframeRegionInsertKeyCtx keyframeRegionMoveKeyCtx keyframeRegionScaleKeyCtx '
        + 'keyframeRegionSelectKeyCtx keyframeRegionSetKeyCtx keyframeRegionTrackCtx '
        + 'keyframeStats lassoContext lattice latticeDeformKeyCtx launch launchImageEditor '
        + 'layerButton layeredShaderPort layeredTexturePort layout layoutDialog lightList '
        + 'lightListEditor lightListPanel lightlink lineIntersection linearPrecision linstep '
        + 'listAnimatable listAttr listCameras listConnections listDeviceAttachments listHistory '
        + 'listInputDeviceAxes listInputDeviceButtons listInputDevices listMenuAnnotation '
        + 'listNodeTypes listPanelCategories listRelatives listSets listTransforms '
        + 'listUnselected listerEditor loadFluid loadNewShelf loadPlugin '
        + 'loadPluginLanguageResources loadPrefObjects localizedPanelLabel lockNode loft log '
        + 'longNameOf lookThru ls lsThroughFilter lsType lsUI Mayatomr mag makeIdentity makeLive '
        + 'makePaintable makeRoll makeSingleSurface makeTubeOn makebot manipMoveContext '
        + 'manipMoveLimitsCtx manipOptions manipRotateContext manipRotateLimitsCtx '
        + 'manipScaleContext manipScaleLimitsCtx marker match max memory menu menuBarLayout '
        + 'menuEditor menuItem menuItemToShelf menuSet menuSetPref messageLine min minimizeApp '
        + 'mirrorJoint modelCurrentTimeCtx modelEditor modelPanel mouse movIn movOut move '
        + 'moveIKtoFK moveKeyCtx moveVertexAlongDirection multiProfileBirailSurface mute '
        + 'nParticle nameCommand nameField namespace namespaceInfo newPanelItems newton nodeCast '
        + 'nodeIconButton nodeOutliner nodePreset nodeType noise nonLinear normalConstraint '
        + 'normalize nurbsBoolean nurbsCopyUVSet nurbsCube nurbsEditUV nurbsPlane nurbsSelect '
        + 'nurbsSquare nurbsToPoly nurbsToPolygonsPref nurbsToSubdiv nurbsToSubdivPref '
        + 'nurbsUVSet nurbsViewDirectionVector objExists objectCenter objectLayer objectType '
        + 'objectTypeUI obsoleteProc oceanNurbsPreviewPlane offsetCurve offsetCurveOnSurface '
        + 'offsetSurface openGLExtension openMayaPref optionMenu optionMenuGrp optionVar orbit '
        + 'orbitCtx orientConstraint outlinerEditor outlinerPanel overrideModifier '
        + 'paintEffectsDisplay pairBlend palettePort paneLayout panel panelConfiguration '
        + 'panelHistory paramDimContext paramDimension paramLocator parent parentConstraint '
        + 'particle particleExists particleInstancer particleRenderInfo partition pasteKey '
        + 'pathAnimation pause pclose percent performanceOptions pfxstrokes pickWalk picture '
        + 'pixelMove planarSrf plane play playbackOptions playblast plugAttr plugNode pluginInfo '
        + 'pluginResourceUtil pointConstraint pointCurveConstraint pointLight pointMatrixMult '
        + 'pointOnCurve pointOnSurface pointPosition poleVectorConstraint polyAppend '
        + 'polyAppendFacetCtx polyAppendVertex polyAutoProjection polyAverageNormal '
        + 'polyAverageVertex polyBevel polyBlendColor polyBlindData polyBoolOp polyBridgeEdge '
        + 'polyCacheMonitor polyCheck polyChipOff polyClipboard polyCloseBorder polyCollapseEdge '
        + 'polyCollapseFacet polyColorBlindData polyColorDel polyColorPerVertex polyColorSet '
        + 'polyCompare polyCone polyCopyUV polyCrease polyCreaseCtx polyCreateFacet '
        + 'polyCreateFacetCtx polyCube polyCut polyCutCtx polyCylinder polyCylindricalProjection '
        + 'polyDelEdge polyDelFacet polyDelVertex polyDuplicateAndConnect polyDuplicateEdge '
        + 'polyEditUV polyEditUVShell polyEvaluate polyExtrudeEdge polyExtrudeFacet '
        + 'polyExtrudeVertex polyFlipEdge polyFlipUV polyForceUV polyGeoSampler polyHelix '
        + 'polyInfo polyInstallAction polyLayoutUV polyListComponentConversion polyMapCut '
        + 'polyMapDel polyMapSew polyMapSewMove polyMergeEdge polyMergeEdgeCtx polyMergeFacet '
        + 'polyMergeFacetCtx polyMergeUV polyMergeVertex polyMirrorFace polyMoveEdge '
        + 'polyMoveFacet polyMoveFacetUV polyMoveUV polyMoveVertex polyNormal polyNormalPerVertex '
        + 'polyNormalizeUV polyOptUvs polyOptions polyOutput polyPipe polyPlanarProjection '
        + 'polyPlane polyPlatonicSolid polyPoke polyPrimitive polyPrism polyProjection '
        + 'polyPyramid polyQuad polyQueryBlindData polyReduce polySelect polySelectConstraint '
        + 'polySelectConstraintMonitor polySelectCtx polySelectEditCtx polySeparate '
        + 'polySetToFaceNormal polySewEdge polyShortestPathCtx polySmooth polySoftEdge '
        + 'polySphere polySphericalProjection polySplit polySplitCtx polySplitEdge polySplitRing '
        + 'polySplitVertex polyStraightenUVBorder polySubdivideEdge polySubdivideFacet '
        + 'polyToSubdiv polyTorus polyTransfer polyTriangulate polyUVSet polyUnite polyWedgeFace '
        + 'popen popupMenu pose pow preloadRefEd print progressBar progressWindow projFileViewer '
        + 'projectCurve projectTangent projectionContext projectionManip promptDialog propModCtx '
        + 'propMove psdChannelOutliner psdEditTextureFile psdExport psdTextureFile putenv pwd '
        + 'python querySubdiv quit rad_to_deg radial radioButton radioButtonGrp radioCollection '
        + 'radioMenuItemCollection rampColorPort rand randomizeFollicles randstate rangeControl '
        + 'readTake rebuildCurve rebuildSurface recordAttr recordDevice redo reference '
        + 'referenceEdit referenceQuery refineSubdivSelectionList refresh refreshAE '
        + 'registerPluginResource rehash reloadImage removeJoint removeMultiInstance '
        + 'removePanelCategory rename renameAttr renameSelectionList renameUI render '
        + 'renderGlobalsNode renderInfo renderLayerButton renderLayerParent '
        + 'renderLayerPostProcess renderLayerUnparent renderManip renderPartition '
        + 'renderQualityNode renderSettings renderThumbnailUpdate renderWindowEditor '
        + 'renderWindowSelectContext renderer reorder reorderDeformers requires reroot '
        + 'resampleFluid resetAE resetPfxToPolyCamera resetTool resolutionNode retarget '
        + 'reverseCurve reverseSurface revolve rgb_to_hsv rigidBody rigidSolver roll rollCtx '
        + 'rootOf rot rotate rotationInterpolation roundConstantRadius rowColumnLayout rowLayout '
        + 'runTimeCommand runup sampleImage saveAllShelves saveAttrPreset saveFluid saveImage '
        + 'saveInitialState saveMenu savePrefObjects savePrefs saveShelf saveToolSettings scale '
        + 'scaleBrushBrightness scaleComponents scaleConstraint scaleKey scaleKeyCtx sceneEditor '
        + 'sceneUIReplacement scmh scriptCtx scriptEditorInfo scriptJob scriptNode scriptTable '
        + 'scriptToShelf scriptedPanel scriptedPanelType scrollField scrollLayout sculpt '
        + 'searchPathArray seed selLoadSettings select selectContext selectCurveCV selectKey '
        + 'selectKeyCtx selectKeyframeRegionCtx selectMode selectPref selectPriority selectType '
        + 'selectedNodes selectionConnection separator setAttr setAttrEnumResource '
        + 'setAttrMapping setAttrNiceNameResource setConstraintRestPosition '
        + 'setDefaultShadingGroup setDrivenKeyframe setDynamic setEditCtx setEditor setFluidAttr '
        + 'setFocus setInfinity setInputDeviceMapping setKeyCtx setKeyPath setKeyframe '
        + 'setKeyframeBlendshapeTargetWts setMenuMode setNodeNiceNameResource setNodeTypeFlag '
        + 'setParent setParticleAttr setPfxToPolyCamera setPluginResource setProject '
        + 'setStampDensity setStartupMessage setState setToolTo setUITemplate setXformManip sets '
        + 'shadingConnection shadingGeometryRelCtx shadingLightRelCtx shadingNetworkCompare '
        + 'shadingNode shapeCompare shelfButton shelfLayout shelfTabLayout shellField '
        + 'shortNameOf showHelp showHidden showManipCtx showSelectionInTitle '
        + 'showShadingGroupAttrEditor showWindow sign simplify sin singleProfileBirailSurface '
        + 'size sizeBytes skinCluster skinPercent smoothCurve smoothTangentSurface smoothstep '
        + 'snap2to2 snapKey snapMode snapTogetherCtx snapshot soft softMod softModCtx sort sound '
        + 'soundControl source spaceLocator sphere sphrand spotLight spotLightPreviewPort '
        + 'spreadSheetEditor spring sqrt squareSurface srtContext stackTrace startString '
        + 'startsWith stitchAndExplodeShell stitchSurface stitchSurfacePoints strcmp '
        + 'stringArrayCatenate stringArrayContains stringArrayCount stringArrayInsertAtIndex '
        + 'stringArrayIntersector stringArrayRemove stringArrayRemoveAtIndex '
        + 'stringArrayRemoveDuplicates stringArrayRemoveExact stringArrayToString '
        + 'stringToStringArray strip stripPrefixFromName stroke subdAutoProjection '
        + 'subdCleanTopology subdCollapse subdDuplicateAndConnect subdEditUV '
        + 'subdListComponentConversion subdMapCut subdMapSewMove subdMatchTopology subdMirror '
        + 'subdToBlind subdToPoly subdTransferUVsToCache subdiv subdivCrease '
        + 'subdivDisplaySmoothness substitute substituteAllString substituteGeometry substring '
        + 'surface surfaceSampler surfaceShaderList swatchDisplayPort switchTable symbolButton '
        + 'symbolCheckBox sysFile system tabLayout tan tangentConstraint texLatticeDeformContext '
        + 'texManipContext texMoveContext texMoveUVShellContext texRotateContext texScaleContext '
        + 'texSelectContext texSelectShortestPathCtx texSmudgeUVContext texWinToolCtx text '
        + 'textCurves textField textFieldButtonGrp textFieldGrp textManip textScrollList '
        + 'textToShelf textureDisplacePlane textureHairColor texturePlacementContext '
        + 'textureWindow threadCount threePointArcCtx timeControl timePort timerX toNativePath '
        + 'toggle toggleAxis toggleWindowVisibility tokenize tokenizeList tolerance tolower '
        + 'toolButton toolCollection toolDropped toolHasOptions toolPropertyWindow torus toupper '
        + 'trace track trackCtx transferAttributes transformCompare transformLimits translator '
        + 'trim trunc truncateFluidCache truncateHairCache tumble tumbleCtx turbulence '
        + 'twoPointArcCtx uiRes uiTemplate unassignInputDevice undo undoInfo ungroup uniform unit '
        + 'unloadPlugin untangleUV untitledFileName untrim upAxis updateAE userCtx uvLink '
        + 'uvSnapshot validateShelfName vectorize view2dToolCtx viewCamera viewClipPlane '
        + 'viewFit viewHeadOn viewLookAt viewManip viewPlace viewSet visor volumeAxis vortex '
        + 'waitCursor warning webBrowser webBrowserPrefs whatIs window windowPref wire '
        + 'wireContext workspace wrinkle wrinkleContext writeTake xbmLangPathList xform',
      illegal: '</',
      contains: [
        hljs.C_NUMBER_MODE,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        {
          className: 'string',
          begin: '`',
          end: '`',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        { // eats variables
          begin: /[$%@](\^\w\b|#\w+|[^\s\w{]|\{\w+\}|\w+)/ },
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE
      ]
    };
  }

  return mel;

})();

    hljs.registerLanguage('mel', hljsGrammar);
  })();/*! `mipsasm` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: MIPS Assembly
  Author: Nebuleon Fumika <nebuleon.fumika@gmail.com>
  Description: MIPS Assembly (up to MIPS32R2)
  Website: https://en.wikipedia.org/wiki/MIPS_architecture
  Category: assembler
  */

  function mipsasm(hljs) {
    // local labels: %?[FB]?[AT]?\d{1,2}\w+
    return {
      name: 'MIPS Assembly',
      case_insensitive: true,
      aliases: [ 'mips' ],
      keywords: {
        $pattern: '\\.?' + hljs.IDENT_RE,
        meta:
          // GNU preprocs
          '.2byte .4byte .align .ascii .asciz .balign .byte .code .data .else .end .endif .endm .endr .equ .err .exitm .extern .global .hword .if .ifdef .ifndef .include .irp .long .macro .rept .req .section .set .skip .space .text .word .ltorg ',
        built_in:
          '$0 $1 $2 $3 $4 $5 $6 $7 $8 $9 $10 $11 $12 $13 $14 $15 ' // integer registers
          + '$16 $17 $18 $19 $20 $21 $22 $23 $24 $25 $26 $27 $28 $29 $30 $31 ' // integer registers
          + 'zero at v0 v1 a0 a1 a2 a3 a4 a5 a6 a7 ' // integer register aliases
          + 't0 t1 t2 t3 t4 t5 t6 t7 t8 t9 s0 s1 s2 s3 s4 s5 s6 s7 s8 ' // integer register aliases
          + 'k0 k1 gp sp fp ra ' // integer register aliases
          + '$f0 $f1 $f2 $f2 $f4 $f5 $f6 $f7 $f8 $f9 $f10 $f11 $f12 $f13 $f14 $f15 ' // floating-point registers
          + '$f16 $f17 $f18 $f19 $f20 $f21 $f22 $f23 $f24 $f25 $f26 $f27 $f28 $f29 $f30 $f31 ' // floating-point registers
          + 'Context Random EntryLo0 EntryLo1 Context PageMask Wired EntryHi ' // Coprocessor 0 registers
          + 'HWREna BadVAddr Count Compare SR IntCtl SRSCtl SRSMap Cause EPC PRId ' // Coprocessor 0 registers
          + 'EBase Config Config1 Config2 Config3 LLAddr Debug DEPC DESAVE CacheErr ' // Coprocessor 0 registers
          + 'ECC ErrorEPC TagLo DataLo TagHi DataHi WatchLo WatchHi PerfCtl PerfCnt ' // Coprocessor 0 registers
      },
      contains: [
        {
          className: 'keyword',
          begin: '\\b(' // mnemonics
              // 32-bit integer instructions
              + 'addi?u?|andi?|b(al)?|beql?|bgez(al)?l?|bgtzl?|blezl?|bltz(al)?l?|'
              + 'bnel?|cl[oz]|divu?|ext|ins|j(al)?|jalr(\\.hb)?|jr(\\.hb)?|lbu?|lhu?|'
              + 'll|lui|lw[lr]?|maddu?|mfhi|mflo|movn|movz|move|msubu?|mthi|mtlo|mul|'
              + 'multu?|nop|nor|ori?|rotrv?|sb|sc|se[bh]|sh|sllv?|slti?u?|srav?|'
              + 'srlv?|subu?|sw[lr]?|xori?|wsbh|'
              // floating-point instructions
              + 'abs\\.[sd]|add\\.[sd]|alnv.ps|bc1[ft]l?|'
              + 'c\\.(s?f|un|u?eq|[ou]lt|[ou]le|ngle?|seq|l[et]|ng[et])\\.[sd]|'
              + '(ceil|floor|round|trunc)\\.[lw]\\.[sd]|cfc1|cvt\\.d\\.[lsw]|'
              + 'cvt\\.l\\.[dsw]|cvt\\.ps\\.s|cvt\\.s\\.[dlw]|cvt\\.s\\.p[lu]|cvt\\.w\\.[dls]|'
              + 'div\\.[ds]|ldx?c1|luxc1|lwx?c1|madd\\.[sd]|mfc1|mov[fntz]?\\.[ds]|'
              + 'msub\\.[sd]|mth?c1|mul\\.[ds]|neg\\.[ds]|nmadd\\.[ds]|nmsub\\.[ds]|'
              + 'p[lu][lu]\\.ps|recip\\.fmt|r?sqrt\\.[ds]|sdx?c1|sub\\.[ds]|suxc1|'
              + 'swx?c1|'
              // system control instructions
              + 'break|cache|d?eret|[de]i|ehb|mfc0|mtc0|pause|prefx?|rdhwr|'
              + 'rdpgpr|sdbbp|ssnop|synci?|syscall|teqi?|tgei?u?|tlb(p|r|w[ir])|'
              + 'tlti?u?|tnei?|wait|wrpgpr'
          + ')',
          end: '\\s'
        },
        // lines ending with ; or # aren't really comments, probably auto-detect fail
        hljs.COMMENT('[;#](?!\\s*$)', '$'),
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.QUOTE_STRING_MODE,
        {
          className: 'string',
          begin: '\'',
          end: '[^\\\\]\'',
          relevance: 0
        },
        {
          className: 'title',
          begin: '\\|',
          end: '\\|',
          illegal: '\\n',
          relevance: 0
        },
        {
          className: 'number',
          variants: [
            { // hex
              begin: '0x[0-9a-f]+' },
            { // bare number
              begin: '\\b-?\\d+' }
          ],
          relevance: 0
        },
        {
          className: 'symbol',
          variants: [
            { // GNU MIPS syntax
              begin: '^\\s*[a-z_\\.\\$][a-z0-9_\\.\\$]+:' },
            { // numbered local labels
              begin: '^\\s*[0-9]+:' },
            { // number local label reference (backwards, forwards)
              begin: '[0-9]+[bf]' }
          ],
          relevance: 0
        }
      ],
      // forward slashes are not allowed
      illegal: /\//
    };
  }

  return mipsasm;

})();

    hljs.registerLanguage('mipsasm', hljsGrammar);
  })();/*! `monkey` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Monkey
  Description: Monkey2 is an easy to use, cross platform, games oriented programming language from Blitz Research.
  Author: Arthur Bikmullin <devolonter@gmail.com>
  Website: https://blitzresearch.itch.io/monkey2
  Category: gaming
  */

  function monkey(hljs) {
    const NUMBER = {
      className: 'number',
      relevance: 0,
      variants: [
        { begin: '[$][a-fA-F0-9]+' },
        hljs.NUMBER_MODE
      ]
    };
    const FUNC_DEFINITION = {
      variants: [
        { match: [
          /(function|method)/,
          /\s+/,
          hljs.UNDERSCORE_IDENT_RE,
        ] },
      ],
      scope: {
        1: "keyword",
        3: "title.function"
      }
    };
    const CLASS_DEFINITION = {
      variants: [
        { match: [
          /(class|interface|extends|implements)/,
          /\s+/,
          hljs.UNDERSCORE_IDENT_RE,
        ] },
      ],
      scope: {
        1: "keyword",
        3: "title.class"
      }
    };
    const BUILT_INS = [
      "DebugLog",
      "DebugStop",
      "Error",
      "Print",
      "ACos",
      "ACosr",
      "ASin",
      "ASinr",
      "ATan",
      "ATan2",
      "ATan2r",
      "ATanr",
      "Abs",
      "Abs",
      "Ceil",
      "Clamp",
      "Clamp",
      "Cos",
      "Cosr",
      "Exp",
      "Floor",
      "Log",
      "Max",
      "Max",
      "Min",
      "Min",
      "Pow",
      "Sgn",
      "Sgn",
      "Sin",
      "Sinr",
      "Sqrt",
      "Tan",
      "Tanr",
      "Seed",
      "PI",
      "HALFPI",
      "TWOPI"
    ];
    const LITERALS = [
      "true",
      "false",
      "null"
    ];
    const KEYWORDS = [
      "public",
      "private",
      "property",
      "continue",
      "exit",
      "extern",
      "new",
      "try",
      "catch",
      "eachin",
      "not",
      "abstract",
      "final",
      "select",
      "case",
      "default",
      "const",
      "local",
      "global",
      "field",
      "end",
      "if",
      "then",
      "else",
      "elseif",
      "endif",
      "while",
      "wend",
      "repeat",
      "until",
      "forever",
      "for",
      "to",
      "step",
      "next",
      "return",
      "module",
      "inline",
      "throw",
      "import",
      // not positive, but these are not literals
      "and",
      "or",
      "shl",
      "shr",
      "mod"
    ];

    return {
      name: 'Monkey',
      case_insensitive: true,
      keywords: {
        keyword: KEYWORDS,
        built_in: BUILT_INS,
        literal: LITERALS
      },
      illegal: /\/\*/,
      contains: [
        hljs.COMMENT('#rem', '#end'),
        hljs.COMMENT(
          "'",
          '$',
          { relevance: 0 }
        ),
        FUNC_DEFINITION,
        CLASS_DEFINITION,
        {
          className: 'variable.language',
          begin: /\b(self|super)\b/
        },
        {
          className: 'meta',
          begin: /\s*#/,
          end: '$',
          keywords: { keyword: 'if else elseif endif end then' }
        },
        {
          match: [
            /^\s*/,
            /strict\b/
          ],
          scope: { 2: "meta" }
        },
        {
          beginKeywords: 'alias',
          end: '=',
          contains: [ hljs.UNDERSCORE_TITLE_MODE ]
        },
        hljs.QUOTE_STRING_MODE,
        NUMBER
      ]
    };
  }

  return monkey;

})();

    hljs.registerLanguage('monkey', hljsGrammar);
  })();/*! `nginx` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Nginx config
  Author: Peter Leonov <gojpeg@yandex.ru>
  Contributors: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Category: config, web
  Website: https://www.nginx.com
  */

  /** @type LanguageFn */
  function nginx(hljs) {
    const regex = hljs.regex;
    const VAR = {
      className: 'variable',
      variants: [
        { begin: /\$\d+/ },
        { begin: /\$\{\w+\}/ },
        { begin: regex.concat(/[$@]/, hljs.UNDERSCORE_IDENT_RE) }
      ]
    };
    const LITERALS = [
      "on",
      "off",
      "yes",
      "no",
      "true",
      "false",
      "none",
      "blocked",
      "debug",
      "info",
      "notice",
      "warn",
      "error",
      "crit",
      "select",
      "break",
      "last",
      "permanent",
      "redirect",
      "kqueue",
      "rtsig",
      "epoll",
      "poll",
      "/dev/poll"
    ];
    const DEFAULT = {
      endsWithParent: true,
      keywords: {
        $pattern: /[a-z_]{2,}|\/dev\/poll/,
        literal: LITERALS
      },
      relevance: 0,
      illegal: '=>',
      contains: [
        hljs.HASH_COMMENT_MODE,
        {
          className: 'string',
          contains: [
            hljs.BACKSLASH_ESCAPE,
            VAR
          ],
          variants: [
            {
              begin: /"/,
              end: /"/
            },
            {
              begin: /'/,
              end: /'/
            }
          ]
        },
        // this swallows entire URLs to avoid detecting numbers within
        {
          begin: '([a-z]+):/',
          end: '\\s',
          endsWithParent: true,
          excludeEnd: true,
          contains: [ VAR ]
        },
        {
          className: 'regexp',
          contains: [
            hljs.BACKSLASH_ESCAPE,
            VAR
          ],
          variants: [
            {
              begin: "\\s\\^",
              end: "\\s|\\{|;",
              returnEnd: true
            },
            // regexp locations (~, ~*)
            {
              begin: "~\\*?\\s+",
              end: "\\s|\\{|;",
              returnEnd: true
            },
            // *.example.com
            { begin: "\\*(\\.[a-z\\-]+)+" },
            // sub.example.*
            { begin: "([a-z\\-]+\\.)+\\*" }
          ]
        },
        // IP
        {
          className: 'number',
          begin: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d{1,5})?\\b'
        },
        // units
        {
          className: 'number',
          begin: '\\b\\d+[kKmMgGdshdwy]?\\b',
          relevance: 0
        },
        VAR
      ]
    };

    return {
      name: 'Nginx config',
      aliases: [ 'nginxconf' ],
      contains: [
        hljs.HASH_COMMENT_MODE,
        {
          beginKeywords: "upstream location",
          end: /;|\{/,
          contains: DEFAULT.contains,
          keywords: { section: "upstream location" }
        },
        {
          className: 'section',
          begin: regex.concat(hljs.UNDERSCORE_IDENT_RE + regex.lookahead(/\s+\{/)),
          relevance: 0
        },
        {
          begin: regex.lookahead(hljs.UNDERSCORE_IDENT_RE + '\\s'),
          end: ';|\\{',
          contains: [
            {
              className: 'attribute',
              begin: hljs.UNDERSCORE_IDENT_RE,
              starts: DEFAULT
            }
          ],
          relevance: 0
        }
      ],
      illegal: '[^\\s\\}\\{]'
    };
  }

  return nginx;

})();

    hljs.registerLanguage('nginx', hljsGrammar);
  })();/*! `nix` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Nix
  Author: Domen Kožar <domen@dev.si>
  Description: Nix functional language
  Website: http://nixos.org/nix
  Category: system
  */

  function nix(hljs) {
    const KEYWORDS = {
      keyword: [
        "rec",
        "with",
        "let",
        "in",
        "inherit",
        "assert",
        "if",
        "else",
        "then"
      ],
      literal: [
        "true",
        "false",
        "or",
        "and",
        "null"
      ],
      built_in: [
        "import",
        "abort",
        "baseNameOf",
        "dirOf",
        "isNull",
        "builtins",
        "map",
        "removeAttrs",
        "throw",
        "toString",
        "derivation"
      ]
    };
    const ANTIQUOTE = {
      className: 'subst',
      begin: /\$\{/,
      end: /\}/,
      keywords: KEYWORDS
    };
    const ESCAPED_DOLLAR = {
      className: 'char.escape',
      begin: /''\$/,
    };
    const ATTRS = {
      begin: /[a-zA-Z0-9-_]+(\s*=)/,
      returnBegin: true,
      relevance: 0,
      contains: [
        {
          className: 'attr',
          begin: /\S+/,
          relevance: 0.2
        }
      ]
    };
    const STRING = {
      className: 'string',
      contains: [ ESCAPED_DOLLAR, ANTIQUOTE ],
      variants: [
        {
          begin: "''",
          end: "''"
        },
        {
          begin: '"',
          end: '"'
        }
      ]
    };
    const EXPRESSIONS = [
      hljs.NUMBER_MODE,
      hljs.HASH_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      STRING,
      ATTRS
    ];
    ANTIQUOTE.contains = EXPRESSIONS;
    return {
      name: 'Nix',
      aliases: [ "nixos" ],
      keywords: KEYWORDS,
      contains: EXPRESSIONS
    };
  }

  return nix;

})();

    hljs.registerLanguage('nix', hljsGrammar);
  })();/*! `objectivec` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Objective-C
  Author: Valerii Hiora <valerii.hiora@gmail.com>
  Contributors: Angel G. Olloqui <angelgarcia.mail@gmail.com>, Matt Diephouse <matt@diephouse.com>, Andrew Farmer <ahfarmer@gmail.com>, Minh Nguyễn <mxn@1ec5.org>
  Website: https://developer.apple.com/documentation/objectivec
  Category: common
  */

  function objectivec(hljs) {
    const API_CLASS = {
      className: 'built_in',
      begin: '\\b(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)\\w+'
    };
    const IDENTIFIER_RE = /[a-zA-Z@][a-zA-Z0-9_]*/;
    const TYPES = [
      "int",
      "float",
      "char",
      "unsigned",
      "signed",
      "short",
      "long",
      "double",
      "wchar_t",
      "unichar",
      "void",
      "bool",
      "BOOL",
      "id|0",
      "_Bool"
    ];
    const KWS = [
      "while",
      "export",
      "sizeof",
      "typedef",
      "const",
      "struct",
      "for",
      "union",
      "volatile",
      "static",
      "mutable",
      "if",
      "do",
      "return",
      "goto",
      "enum",
      "else",
      "break",
      "extern",
      "asm",
      "case",
      "default",
      "register",
      "explicit",
      "typename",
      "switch",
      "continue",
      "inline",
      "readonly",
      "assign",
      "readwrite",
      "self",
      "@synchronized",
      "id",
      "typeof",
      "nonatomic",
      "IBOutlet",
      "IBAction",
      "strong",
      "weak",
      "copy",
      "in",
      "out",
      "inout",
      "bycopy",
      "byref",
      "oneway",
      "__strong",
      "__weak",
      "__block",
      "__autoreleasing",
      "@private",
      "@protected",
      "@public",
      "@try",
      "@property",
      "@end",
      "@throw",
      "@catch",
      "@finally",
      "@autoreleasepool",
      "@synthesize",
      "@dynamic",
      "@selector",
      "@optional",
      "@required",
      "@encode",
      "@package",
      "@import",
      "@defs",
      "@compatibility_alias",
      "__bridge",
      "__bridge_transfer",
      "__bridge_retained",
      "__bridge_retain",
      "__covariant",
      "__contravariant",
      "__kindof",
      "_Nonnull",
      "_Nullable",
      "_Null_unspecified",
      "__FUNCTION__",
      "__PRETTY_FUNCTION__",
      "__attribute__",
      "getter",
      "setter",
      "retain",
      "unsafe_unretained",
      "nonnull",
      "nullable",
      "null_unspecified",
      "null_resettable",
      "class",
      "instancetype",
      "NS_DESIGNATED_INITIALIZER",
      "NS_UNAVAILABLE",
      "NS_REQUIRES_SUPER",
      "NS_RETURNS_INNER_POINTER",
      "NS_INLINE",
      "NS_AVAILABLE",
      "NS_DEPRECATED",
      "NS_ENUM",
      "NS_OPTIONS",
      "NS_SWIFT_UNAVAILABLE",
      "NS_ASSUME_NONNULL_BEGIN",
      "NS_ASSUME_NONNULL_END",
      "NS_REFINED_FOR_SWIFT",
      "NS_SWIFT_NAME",
      "NS_SWIFT_NOTHROW",
      "NS_DURING",
      "NS_HANDLER",
      "NS_ENDHANDLER",
      "NS_VALUERETURN",
      "NS_VOIDRETURN"
    ];
    const LITERALS = [
      "false",
      "true",
      "FALSE",
      "TRUE",
      "nil",
      "YES",
      "NO",
      "NULL"
    ];
    const BUILT_INS = [
      "dispatch_once_t",
      "dispatch_queue_t",
      "dispatch_sync",
      "dispatch_async",
      "dispatch_once"
    ];
    const KEYWORDS = {
      "variable.language": [
        "this",
        "super"
      ],
      $pattern: IDENTIFIER_RE,
      keyword: KWS,
      literal: LITERALS,
      built_in: BUILT_INS,
      type: TYPES
    };
    const CLASS_KEYWORDS = {
      $pattern: IDENTIFIER_RE,
      keyword: [
        "@interface",
        "@class",
        "@protocol",
        "@implementation"
      ]
    };
    return {
      name: 'Objective-C',
      aliases: [
        'mm',
        'objc',
        'obj-c',
        'obj-c++',
        'objective-c++'
      ],
      keywords: KEYWORDS,
      illegal: '</',
      contains: [
        API_CLASS,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_NUMBER_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.APOS_STRING_MODE,
        {
          className: 'string',
          variants: [
            {
              begin: '@"',
              end: '"',
              illegal: '\\n',
              contains: [ hljs.BACKSLASH_ESCAPE ]
            }
          ]
        },
        {
          className: 'meta',
          begin: /#\s*[a-z]+\b/,
          end: /$/,
          keywords: { keyword:
              'if else elif endif define undef warning error line '
              + 'pragma ifdef ifndef include' },
          contains: [
            {
              begin: /\\\n/,
              relevance: 0
            },
            hljs.inherit(hljs.QUOTE_STRING_MODE, { className: 'string' }),
            {
              className: 'string',
              begin: /<.*?>/,
              end: /$/,
              illegal: '\\n'
            },
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE
          ]
        },
        {
          className: 'class',
          begin: '(' + CLASS_KEYWORDS.keyword.join('|') + ')\\b',
          end: /(\{|$)/,
          excludeEnd: true,
          keywords: CLASS_KEYWORDS,
          contains: [ hljs.UNDERSCORE_TITLE_MODE ]
        },
        {
          begin: '\\.' + hljs.UNDERSCORE_IDENT_RE,
          relevance: 0
        }
      ]
    };
  }

  return objectivec;

})();

    hljs.registerLanguage('objectivec', hljsGrammar);
  })();/*! `ocaml` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: OCaml
  Author: Mehdi Dogguy <mehdi@dogguy.org>
  Contributors: Nicolas Braud-Santoni <nicolas.braud-santoni@ens-cachan.fr>, Mickael Delahaye <mickael.delahaye@gmail.com>
  Description: OCaml language definition.
  Website: https://ocaml.org
  Category: functional
  */

  function ocaml(hljs) {
    /* missing support for heredoc-like string (OCaml 4.0.2+) */
    return {
      name: 'OCaml',
      aliases: [ 'ml' ],
      keywords: {
        $pattern: '[a-z_]\\w*!?',
        keyword:
          'and as assert asr begin class constraint do done downto else end '
          + 'exception external for fun function functor if in include '
          + 'inherit! inherit initializer land lazy let lor lsl lsr lxor match method!|10 method '
          + 'mod module mutable new object of open! open or private rec sig struct '
          + 'then to try type val! val virtual when while with '
          /* camlp4 */
          + 'parser value',
        built_in:
          /* built-in types */
          'array bool bytes char exn|5 float int int32 int64 list lazy_t|5 nativeint|5 string unit '
          /* (some) types in Pervasives */
          + 'in_channel out_channel ref',
        literal:
          'true false'
      },
      illegal: /\/\/|>>/,
      contains: [
        {
          className: 'literal',
          begin: '\\[(\\|\\|)?\\]|\\(\\)',
          relevance: 0
        },
        hljs.COMMENT(
          '\\(\\*',
          '\\*\\)',
          { contains: [ 'self' ] }
        ),
        { /* type variable */
          className: 'symbol',
          begin: '\'[A-Za-z_](?!\')[\\w\']*'
          /* the grammar is ambiguous on how 'a'b should be interpreted but not the compiler */
        },
        { /* polymorphic variant */
          className: 'type',
          begin: '`[A-Z][\\w\']*'
        },
        { /* module or constructor */
          className: 'type',
          begin: '\\b[A-Z][\\w\']*',
          relevance: 0
        },
        { /* don't color identifiers, but safely catch all identifiers with ' */
          begin: '[a-z_]\\w*\'[\\w\']*',
          relevance: 0
        },
        hljs.inherit(hljs.APOS_STRING_MODE, {
          className: 'string',
          relevance: 0
        }),
        hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null }),
        {
          className: 'number',
          begin:
            '\\b(0[xX][a-fA-F0-9_]+[Lln]?|'
            + '0[oO][0-7_]+[Lln]?|'
            + '0[bB][01_]+[Lln]?|'
            + '[0-9][0-9_]*([Lln]|(\\.[0-9_]*)?([eE][-+]?[0-9_]+)?)?)',
          relevance: 0
        },
        { begin: /->/ // relevance booster
        }
      ]
    };
  }

  return ocaml;

})();

    hljs.registerLanguage('ocaml', hljsGrammar);
  })();/*! `openscad` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: OpenSCAD
  Author: Dan Panzarella <alsoelp@gmail.com>
  Description: OpenSCAD is a language for the 3D CAD modeling software of the same name.
  Website: https://www.openscad.org
  Category: scientific
  */

  function openscad(hljs) {
    const SPECIAL_VARS = {
      className: 'keyword',
      begin: '\\$(f[asn]|t|vp[rtd]|children)'
    };
    const LITERALS = {
      className: 'literal',
      begin: 'false|true|PI|undef'
    };
    const NUMBERS = {
      className: 'number',
      begin: '\\b\\d+(\\.\\d+)?(e-?\\d+)?', // adds 1e5, 1e-10
      relevance: 0
    };
    const STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null });
    const PREPRO = {
      className: 'meta',
      keywords: { keyword: 'include use' },
      begin: 'include|use <',
      end: '>'
    };
    const PARAMS = {
      className: 'params',
      begin: '\\(',
      end: '\\)',
      contains: [
        'self',
        NUMBERS,
        STRING,
        SPECIAL_VARS,
        LITERALS
      ]
    };
    const MODIFIERS = {
      begin: '[*!#%]',
      relevance: 0
    };
    const FUNCTIONS = {
      className: 'function',
      beginKeywords: 'module function',
      end: /=|\{/,
      contains: [
        PARAMS,
        hljs.UNDERSCORE_TITLE_MODE
      ]
    };

    return {
      name: 'OpenSCAD',
      aliases: [ 'scad' ],
      keywords: {
        keyword: 'function module include use for intersection_for if else \\%',
        literal: 'false true PI undef',
        built_in: 'circle square polygon text sphere cube cylinder polyhedron translate rotate scale resize mirror multmatrix color offset hull minkowski union difference intersection abs sign sin cos tan acos asin atan atan2 floor round ceil ln log pow sqrt exp rands min max concat lookup str chr search version version_num norm cross parent_module echo import import_dxf dxf_linear_extrude linear_extrude rotate_extrude surface projection render children dxf_cross dxf_dim let assign'
      },
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        NUMBERS,
        PREPRO,
        STRING,
        SPECIAL_VARS,
        MODIFIERS,
        FUNCTIONS
      ]
    };
  }

  return openscad;

})();

    hljs.registerLanguage('openscad', hljsGrammar);
  })();/*! `pgsql` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: PostgreSQL and PL/pgSQL
  Author: Egor Rogov (e.rogov@postgrespro.ru)
  Website: https://www.postgresql.org/docs/11/sql.html
  Description:
      This language incorporates both PostgreSQL SQL dialect and PL/pgSQL language.
      It is based on PostgreSQL version 11. Some notes:
      - Text in double-dollar-strings is _always_ interpreted as some programming code. Text
        in ordinary quotes is _never_ interpreted that way and highlighted just as a string.
      - There are quite a bit "special cases". That's because many keywords are not strictly
        they are keywords in some contexts and ordinary identifiers in others. Only some
        of such cases are handled; you still can get some of your identifiers highlighted
        wrong way.
      - Function names deliberately are not highlighted. There is no way to tell function
        call from other constructs, hence we can't highlight _all_ function names. And
        some names highlighted while others not looks ugly.
  Category: database
  */

  function pgsql(hljs) {
    const COMMENT_MODE = hljs.COMMENT('--', '$');
    const UNQUOTED_IDENT = '[a-zA-Z_][a-zA-Z_0-9$]*';
    const DOLLAR_STRING = '\\$([a-zA-Z_]?|[a-zA-Z_][a-zA-Z_0-9]*)\\$';
    const LABEL = '<<\\s*' + UNQUOTED_IDENT + '\\s*>>';

    const SQL_KW =
      // https://www.postgresql.org/docs/11/static/sql-keywords-appendix.html
      // https://www.postgresql.org/docs/11/static/sql-commands.html
      // SQL commands (starting words)
      'ABORT ALTER ANALYZE BEGIN CALL CHECKPOINT|10 CLOSE CLUSTER COMMENT COMMIT COPY CREATE DEALLOCATE DECLARE '
      + 'DELETE DISCARD DO DROP END EXECUTE EXPLAIN FETCH GRANT IMPORT INSERT LISTEN LOAD LOCK MOVE NOTIFY '
      + 'PREPARE REASSIGN|10 REFRESH REINDEX RELEASE RESET REVOKE ROLLBACK SAVEPOINT SECURITY SELECT SET SHOW '
      + 'START TRUNCATE UNLISTEN|10 UPDATE VACUUM|10 VALUES '
      // SQL commands (others)
      + 'AGGREGATE COLLATION CONVERSION|10 DATABASE DEFAULT PRIVILEGES DOMAIN TRIGGER EXTENSION FOREIGN '
      + 'WRAPPER|10 TABLE FUNCTION GROUP LANGUAGE LARGE OBJECT MATERIALIZED VIEW OPERATOR CLASS '
      + 'FAMILY POLICY PUBLICATION|10 ROLE RULE SCHEMA SEQUENCE SERVER STATISTICS SUBSCRIPTION SYSTEM '
      + 'TABLESPACE CONFIGURATION DICTIONARY PARSER TEMPLATE TYPE USER MAPPING PREPARED ACCESS '
      + 'METHOD CAST AS TRANSFORM TRANSACTION OWNED TO INTO SESSION AUTHORIZATION '
      + 'INDEX PROCEDURE ASSERTION '
      // additional reserved key words
      + 'ALL ANALYSE AND ANY ARRAY ASC ASYMMETRIC|10 BOTH CASE CHECK '
      + 'COLLATE COLUMN CONCURRENTLY|10 CONSTRAINT CROSS '
      + 'DEFERRABLE RANGE '
      + 'DESC DISTINCT ELSE EXCEPT FOR FREEZE|10 FROM FULL HAVING '
      + 'ILIKE IN INITIALLY INNER INTERSECT IS ISNULL JOIN LATERAL LEADING LIKE LIMIT '
      + 'NATURAL NOT NOTNULL NULL OFFSET ON ONLY OR ORDER OUTER OVERLAPS PLACING PRIMARY '
      + 'REFERENCES RETURNING SIMILAR SOME SYMMETRIC TABLESAMPLE THEN '
      + 'TRAILING UNION UNIQUE USING VARIADIC|10 VERBOSE WHEN WHERE WINDOW WITH '
      // some of non-reserved (which are used in clauses or as PL/pgSQL keyword)
      + 'BY RETURNS INOUT OUT SETOF|10 IF STRICT CURRENT CONTINUE OWNER LOCATION OVER PARTITION WITHIN '
      + 'BETWEEN ESCAPE EXTERNAL INVOKER DEFINER WORK RENAME VERSION CONNECTION CONNECT '
      + 'TABLES TEMP TEMPORARY FUNCTIONS SEQUENCES TYPES SCHEMAS OPTION CASCADE RESTRICT ADD ADMIN '
      + 'EXISTS VALID VALIDATE ENABLE DISABLE REPLICA|10 ALWAYS PASSING COLUMNS PATH '
      + 'REF VALUE OVERRIDING IMMUTABLE STABLE VOLATILE BEFORE AFTER EACH ROW PROCEDURAL '
      + 'ROUTINE NO HANDLER VALIDATOR OPTIONS STORAGE OIDS|10 WITHOUT INHERIT DEPENDS CALLED '
      + 'INPUT LEAKPROOF|10 COST ROWS NOWAIT SEARCH UNTIL ENCRYPTED|10 PASSWORD CONFLICT|10 '
      + 'INSTEAD INHERITS CHARACTERISTICS WRITE CURSOR ALSO STATEMENT SHARE EXCLUSIVE INLINE '
      + 'ISOLATION REPEATABLE READ COMMITTED SERIALIZABLE UNCOMMITTED LOCAL GLOBAL SQL PROCEDURES '
      + 'RECURSIVE SNAPSHOT ROLLUP CUBE TRUSTED|10 INCLUDE FOLLOWING PRECEDING UNBOUNDED RANGE GROUPS '
      + 'UNENCRYPTED|10 SYSID FORMAT DELIMITER HEADER QUOTE ENCODING FILTER OFF '
      // some parameters of VACUUM/ANALYZE/EXPLAIN
      + 'FORCE_QUOTE FORCE_NOT_NULL FORCE_NULL COSTS BUFFERS TIMING SUMMARY DISABLE_PAGE_SKIPPING '
      //
      + 'RESTART CYCLE GENERATED IDENTITY DEFERRED IMMEDIATE LEVEL LOGGED UNLOGGED '
      + 'OF NOTHING NONE EXCLUDE ATTRIBUTE '
      // from GRANT (not keywords actually)
      + 'USAGE ROUTINES '
      // actually literals, but look better this way (due to IS TRUE, IS FALSE, ISNULL etc)
      + 'TRUE FALSE NAN INFINITY ';

    const ROLE_ATTRS = // only those not in keywrods already
      'SUPERUSER NOSUPERUSER CREATEDB NOCREATEDB CREATEROLE NOCREATEROLE INHERIT NOINHERIT '
      + 'LOGIN NOLOGIN REPLICATION NOREPLICATION BYPASSRLS NOBYPASSRLS ';

    const PLPGSQL_KW =
      'ALIAS BEGIN CONSTANT DECLARE END EXCEPTION RETURN PERFORM|10 RAISE GET DIAGNOSTICS '
      + 'STACKED|10 FOREACH LOOP ELSIF EXIT WHILE REVERSE SLICE DEBUG LOG INFO NOTICE WARNING ASSERT '
      + 'OPEN ';

    const TYPES =
      // https://www.postgresql.org/docs/11/static/datatype.html
      'BIGINT INT8 BIGSERIAL SERIAL8 BIT VARYING VARBIT BOOLEAN BOOL BOX BYTEA CHARACTER CHAR VARCHAR '
      + 'CIDR CIRCLE DATE DOUBLE PRECISION FLOAT8 FLOAT INET INTEGER INT INT4 INTERVAL JSON JSONB LINE LSEG|10 '
      + 'MACADDR MACADDR8 MONEY NUMERIC DEC DECIMAL PATH POINT POLYGON REAL FLOAT4 SMALLINT INT2 '
      + 'SMALLSERIAL|10 SERIAL2|10 SERIAL|10 SERIAL4|10 TEXT TIME ZONE TIMETZ|10 TIMESTAMP TIMESTAMPTZ|10 TSQUERY|10 TSVECTOR|10 '
      + 'TXID_SNAPSHOT|10 UUID XML NATIONAL NCHAR '
      + 'INT4RANGE|10 INT8RANGE|10 NUMRANGE|10 TSRANGE|10 TSTZRANGE|10 DATERANGE|10 '
      // pseudotypes
      + 'ANYELEMENT ANYARRAY ANYNONARRAY ANYENUM ANYRANGE CSTRING INTERNAL '
      + 'RECORD PG_DDL_COMMAND VOID UNKNOWN OPAQUE REFCURSOR '
      // spec. type
      + 'NAME '
      // OID-types
      + 'OID REGPROC|10 REGPROCEDURE|10 REGOPER|10 REGOPERATOR|10 REGCLASS|10 REGTYPE|10 REGROLE|10 '
      + 'REGNAMESPACE|10 REGCONFIG|10 REGDICTIONARY|10 ';// +

    const TYPES_RE =
      TYPES.trim()
        .split(' ')
        .map(function(val) { return val.split('|')[0]; })
        .join('|');

    const SQL_BI =
      'CURRENT_TIME CURRENT_TIMESTAMP CURRENT_USER CURRENT_CATALOG|10 CURRENT_DATE LOCALTIME LOCALTIMESTAMP '
      + 'CURRENT_ROLE|10 CURRENT_SCHEMA|10 SESSION_USER PUBLIC ';

    const PLPGSQL_BI =
      'FOUND NEW OLD TG_NAME|10 TG_WHEN|10 TG_LEVEL|10 TG_OP|10 TG_RELID|10 TG_RELNAME|10 '
      + 'TG_TABLE_NAME|10 TG_TABLE_SCHEMA|10 TG_NARGS|10 TG_ARGV|10 TG_EVENT|10 TG_TAG|10 '
      // get diagnostics
      + 'ROW_COUNT RESULT_OID|10 PG_CONTEXT|10 RETURNED_SQLSTATE COLUMN_NAME CONSTRAINT_NAME '
      + 'PG_DATATYPE_NAME|10 MESSAGE_TEXT TABLE_NAME SCHEMA_NAME PG_EXCEPTION_DETAIL|10 '
      + 'PG_EXCEPTION_HINT|10 PG_EXCEPTION_CONTEXT|10 ';

    const PLPGSQL_EXCEPTIONS =
      // exceptions https://www.postgresql.org/docs/current/static/errcodes-appendix.html
      'SQLSTATE SQLERRM|10 '
      + 'SUCCESSFUL_COMPLETION WARNING DYNAMIC_RESULT_SETS_RETURNED IMPLICIT_ZERO_BIT_PADDING '
      + 'NULL_VALUE_ELIMINATED_IN_SET_FUNCTION PRIVILEGE_NOT_GRANTED PRIVILEGE_NOT_REVOKED '
      + 'STRING_DATA_RIGHT_TRUNCATION DEPRECATED_FEATURE NO_DATA NO_ADDITIONAL_DYNAMIC_RESULT_SETS_RETURNED '
      + 'SQL_STATEMENT_NOT_YET_COMPLETE CONNECTION_EXCEPTION CONNECTION_DOES_NOT_EXIST CONNECTION_FAILURE '
      + 'SQLCLIENT_UNABLE_TO_ESTABLISH_SQLCONNECTION SQLSERVER_REJECTED_ESTABLISHMENT_OF_SQLCONNECTION '
      + 'TRANSACTION_RESOLUTION_UNKNOWN PROTOCOL_VIOLATION TRIGGERED_ACTION_EXCEPTION FEATURE_NOT_SUPPORTED '
      + 'INVALID_TRANSACTION_INITIATION LOCATOR_EXCEPTION INVALID_LOCATOR_SPECIFICATION INVALID_GRANTOR '
      + 'INVALID_GRANT_OPERATION INVALID_ROLE_SPECIFICATION DIAGNOSTICS_EXCEPTION '
      + 'STACKED_DIAGNOSTICS_ACCESSED_WITHOUT_ACTIVE_HANDLER CASE_NOT_FOUND CARDINALITY_VIOLATION '
      + 'DATA_EXCEPTION ARRAY_SUBSCRIPT_ERROR CHARACTER_NOT_IN_REPERTOIRE DATETIME_FIELD_OVERFLOW '
      + 'DIVISION_BY_ZERO ERROR_IN_ASSIGNMENT ESCAPE_CHARACTER_CONFLICT INDICATOR_OVERFLOW '
      + 'INTERVAL_FIELD_OVERFLOW INVALID_ARGUMENT_FOR_LOGARITHM INVALID_ARGUMENT_FOR_NTILE_FUNCTION '
      + 'INVALID_ARGUMENT_FOR_NTH_VALUE_FUNCTION INVALID_ARGUMENT_FOR_POWER_FUNCTION '
      + 'INVALID_ARGUMENT_FOR_WIDTH_BUCKET_FUNCTION INVALID_CHARACTER_VALUE_FOR_CAST '
      + 'INVALID_DATETIME_FORMAT INVALID_ESCAPE_CHARACTER INVALID_ESCAPE_OCTET INVALID_ESCAPE_SEQUENCE '
      + 'NONSTANDARD_USE_OF_ESCAPE_CHARACTER INVALID_INDICATOR_PARAMETER_VALUE INVALID_PARAMETER_VALUE '
      + 'INVALID_REGULAR_EXPRESSION INVALID_ROW_COUNT_IN_LIMIT_CLAUSE '
      + 'INVALID_ROW_COUNT_IN_RESULT_OFFSET_CLAUSE INVALID_TABLESAMPLE_ARGUMENT INVALID_TABLESAMPLE_REPEAT '
      + 'INVALID_TIME_ZONE_DISPLACEMENT_VALUE INVALID_USE_OF_ESCAPE_CHARACTER MOST_SPECIFIC_TYPE_MISMATCH '
      + 'NULL_VALUE_NOT_ALLOWED NULL_VALUE_NO_INDICATOR_PARAMETER NUMERIC_VALUE_OUT_OF_RANGE '
      + 'SEQUENCE_GENERATOR_LIMIT_EXCEEDED STRING_DATA_LENGTH_MISMATCH STRING_DATA_RIGHT_TRUNCATION '
      + 'SUBSTRING_ERROR TRIM_ERROR UNTERMINATED_C_STRING ZERO_LENGTH_CHARACTER_STRING '
      + 'FLOATING_POINT_EXCEPTION INVALID_TEXT_REPRESENTATION INVALID_BINARY_REPRESENTATION '
      + 'BAD_COPY_FILE_FORMAT UNTRANSLATABLE_CHARACTER NOT_AN_XML_DOCUMENT INVALID_XML_DOCUMENT '
      + 'INVALID_XML_CONTENT INVALID_XML_COMMENT INVALID_XML_PROCESSING_INSTRUCTION '
      + 'INTEGRITY_CONSTRAINT_VIOLATION RESTRICT_VIOLATION NOT_NULL_VIOLATION FOREIGN_KEY_VIOLATION '
      + 'UNIQUE_VIOLATION CHECK_VIOLATION EXCLUSION_VIOLATION INVALID_CURSOR_STATE '
      + 'INVALID_TRANSACTION_STATE ACTIVE_SQL_TRANSACTION BRANCH_TRANSACTION_ALREADY_ACTIVE '
      + 'HELD_CURSOR_REQUIRES_SAME_ISOLATION_LEVEL INAPPROPRIATE_ACCESS_MODE_FOR_BRANCH_TRANSACTION '
      + 'INAPPROPRIATE_ISOLATION_LEVEL_FOR_BRANCH_TRANSACTION '
      + 'NO_ACTIVE_SQL_TRANSACTION_FOR_BRANCH_TRANSACTION READ_ONLY_SQL_TRANSACTION '
      + 'SCHEMA_AND_DATA_STATEMENT_MIXING_NOT_SUPPORTED NO_ACTIVE_SQL_TRANSACTION '
      + 'IN_FAILED_SQL_TRANSACTION IDLE_IN_TRANSACTION_SESSION_TIMEOUT INVALID_SQL_STATEMENT_NAME '
      + 'TRIGGERED_DATA_CHANGE_VIOLATION INVALID_AUTHORIZATION_SPECIFICATION INVALID_PASSWORD '
      + 'DEPENDENT_PRIVILEGE_DESCRIPTORS_STILL_EXIST DEPENDENT_OBJECTS_STILL_EXIST '
      + 'INVALID_TRANSACTION_TERMINATION SQL_ROUTINE_EXCEPTION FUNCTION_EXECUTED_NO_RETURN_STATEMENT '
      + 'MODIFYING_SQL_DATA_NOT_PERMITTED PROHIBITED_SQL_STATEMENT_ATTEMPTED '
      + 'READING_SQL_DATA_NOT_PERMITTED INVALID_CURSOR_NAME EXTERNAL_ROUTINE_EXCEPTION '
      + 'CONTAINING_SQL_NOT_PERMITTED MODIFYING_SQL_DATA_NOT_PERMITTED '
      + 'PROHIBITED_SQL_STATEMENT_ATTEMPTED READING_SQL_DATA_NOT_PERMITTED '
      + 'EXTERNAL_ROUTINE_INVOCATION_EXCEPTION INVALID_SQLSTATE_RETURNED NULL_VALUE_NOT_ALLOWED '
      + 'TRIGGER_PROTOCOL_VIOLATED SRF_PROTOCOL_VIOLATED EVENT_TRIGGER_PROTOCOL_VIOLATED '
      + 'SAVEPOINT_EXCEPTION INVALID_SAVEPOINT_SPECIFICATION INVALID_CATALOG_NAME '
      + 'INVALID_SCHEMA_NAME TRANSACTION_ROLLBACK TRANSACTION_INTEGRITY_CONSTRAINT_VIOLATION '
      + 'SERIALIZATION_FAILURE STATEMENT_COMPLETION_UNKNOWN DEADLOCK_DETECTED '
      + 'SYNTAX_ERROR_OR_ACCESS_RULE_VIOLATION SYNTAX_ERROR INSUFFICIENT_PRIVILEGE CANNOT_COERCE '
      + 'GROUPING_ERROR WINDOWING_ERROR INVALID_RECURSION INVALID_FOREIGN_KEY INVALID_NAME '
      + 'NAME_TOO_LONG RESERVED_NAME DATATYPE_MISMATCH INDETERMINATE_DATATYPE COLLATION_MISMATCH '
      + 'INDETERMINATE_COLLATION WRONG_OBJECT_TYPE GENERATED_ALWAYS UNDEFINED_COLUMN '
      + 'UNDEFINED_FUNCTION UNDEFINED_TABLE UNDEFINED_PARAMETER UNDEFINED_OBJECT '
      + 'DUPLICATE_COLUMN DUPLICATE_CURSOR DUPLICATE_DATABASE DUPLICATE_FUNCTION '
      + 'DUPLICATE_PREPARED_STATEMENT DUPLICATE_SCHEMA DUPLICATE_TABLE DUPLICATE_ALIAS '
      + 'DUPLICATE_OBJECT AMBIGUOUS_COLUMN AMBIGUOUS_FUNCTION AMBIGUOUS_PARAMETER AMBIGUOUS_ALIAS '
      + 'INVALID_COLUMN_REFERENCE INVALID_COLUMN_DEFINITION INVALID_CURSOR_DEFINITION '
      + 'INVALID_DATABASE_DEFINITION INVALID_FUNCTION_DEFINITION '
      + 'INVALID_PREPARED_STATEMENT_DEFINITION INVALID_SCHEMA_DEFINITION INVALID_TABLE_DEFINITION '
      + 'INVALID_OBJECT_DEFINITION WITH_CHECK_OPTION_VIOLATION INSUFFICIENT_RESOURCES DISK_FULL '
      + 'OUT_OF_MEMORY TOO_MANY_CONNECTIONS CONFIGURATION_LIMIT_EXCEEDED PROGRAM_LIMIT_EXCEEDED '
      + 'STATEMENT_TOO_COMPLEX TOO_MANY_COLUMNS TOO_MANY_ARGUMENTS OBJECT_NOT_IN_PREREQUISITE_STATE '
      + 'OBJECT_IN_USE CANT_CHANGE_RUNTIME_PARAM LOCK_NOT_AVAILABLE OPERATOR_INTERVENTION '
      + 'QUERY_CANCELED ADMIN_SHUTDOWN CRASH_SHUTDOWN CANNOT_CONNECT_NOW DATABASE_DROPPED '
      + 'SYSTEM_ERROR IO_ERROR UNDEFINED_FILE DUPLICATE_FILE SNAPSHOT_TOO_OLD CONFIG_FILE_ERROR '
      + 'LOCK_FILE_EXISTS FDW_ERROR FDW_COLUMN_NAME_NOT_FOUND FDW_DYNAMIC_PARAMETER_VALUE_NEEDED '
      + 'FDW_FUNCTION_SEQUENCE_ERROR FDW_INCONSISTENT_DESCRIPTOR_INFORMATION '
      + 'FDW_INVALID_ATTRIBUTE_VALUE FDW_INVALID_COLUMN_NAME FDW_INVALID_COLUMN_NUMBER '
      + 'FDW_INVALID_DATA_TYPE FDW_INVALID_DATA_TYPE_DESCRIPTORS '
      + 'FDW_INVALID_DESCRIPTOR_FIELD_IDENTIFIER FDW_INVALID_HANDLE FDW_INVALID_OPTION_INDEX '
      + 'FDW_INVALID_OPTION_NAME FDW_INVALID_STRING_LENGTH_OR_BUFFER_LENGTH '
      + 'FDW_INVALID_STRING_FORMAT FDW_INVALID_USE_OF_NULL_POINTER FDW_TOO_MANY_HANDLES '
      + 'FDW_OUT_OF_MEMORY FDW_NO_SCHEMAS FDW_OPTION_NAME_NOT_FOUND FDW_REPLY_HANDLE '
      + 'FDW_SCHEMA_NOT_FOUND FDW_TABLE_NOT_FOUND FDW_UNABLE_TO_CREATE_EXECUTION '
      + 'FDW_UNABLE_TO_CREATE_REPLY FDW_UNABLE_TO_ESTABLISH_CONNECTION PLPGSQL_ERROR '
      + 'RAISE_EXCEPTION NO_DATA_FOUND TOO_MANY_ROWS ASSERT_FAILURE INTERNAL_ERROR DATA_CORRUPTED '
      + 'INDEX_CORRUPTED ';

    const FUNCTIONS =
      // https://www.postgresql.org/docs/11/static/functions-aggregate.html
      'ARRAY_AGG AVG BIT_AND BIT_OR BOOL_AND BOOL_OR COUNT EVERY JSON_AGG JSONB_AGG JSON_OBJECT_AGG '
      + 'JSONB_OBJECT_AGG MAX MIN MODE STRING_AGG SUM XMLAGG '
      + 'CORR COVAR_POP COVAR_SAMP REGR_AVGX REGR_AVGY REGR_COUNT REGR_INTERCEPT REGR_R2 REGR_SLOPE '
      + 'REGR_SXX REGR_SXY REGR_SYY STDDEV STDDEV_POP STDDEV_SAMP VARIANCE VAR_POP VAR_SAMP '
      + 'PERCENTILE_CONT PERCENTILE_DISC '
      // https://www.postgresql.org/docs/11/static/functions-window.html
      + 'ROW_NUMBER RANK DENSE_RANK PERCENT_RANK CUME_DIST NTILE LAG LEAD FIRST_VALUE LAST_VALUE NTH_VALUE '
      // https://www.postgresql.org/docs/11/static/functions-comparison.html
      + 'NUM_NONNULLS NUM_NULLS '
      // https://www.postgresql.org/docs/11/static/functions-math.html
      + 'ABS CBRT CEIL CEILING DEGREES DIV EXP FLOOR LN LOG MOD PI POWER RADIANS ROUND SCALE SIGN SQRT '
      + 'TRUNC WIDTH_BUCKET '
      + 'RANDOM SETSEED '
      + 'ACOS ACOSD ASIN ASIND ATAN ATAND ATAN2 ATAN2D COS COSD COT COTD SIN SIND TAN TAND '
      // https://www.postgresql.org/docs/11/static/functions-string.html
      + 'BIT_LENGTH CHAR_LENGTH CHARACTER_LENGTH LOWER OCTET_LENGTH OVERLAY POSITION SUBSTRING TREAT TRIM UPPER '
      + 'ASCII BTRIM CHR CONCAT CONCAT_WS CONVERT CONVERT_FROM CONVERT_TO DECODE ENCODE INITCAP '
      + 'LEFT LENGTH LPAD LTRIM MD5 PARSE_IDENT PG_CLIENT_ENCODING QUOTE_IDENT|10 QUOTE_LITERAL|10 '
      + 'QUOTE_NULLABLE|10 REGEXP_MATCH REGEXP_MATCHES REGEXP_REPLACE REGEXP_SPLIT_TO_ARRAY '
      + 'REGEXP_SPLIT_TO_TABLE REPEAT REPLACE REVERSE RIGHT RPAD RTRIM SPLIT_PART STRPOS SUBSTR '
      + 'TO_ASCII TO_HEX TRANSLATE '
      // https://www.postgresql.org/docs/11/static/functions-binarystring.html
      + 'OCTET_LENGTH GET_BIT GET_BYTE SET_BIT SET_BYTE '
      // https://www.postgresql.org/docs/11/static/functions-formatting.html
      + 'TO_CHAR TO_DATE TO_NUMBER TO_TIMESTAMP '
      // https://www.postgresql.org/docs/11/static/functions-datetime.html
      + 'AGE CLOCK_TIMESTAMP|10 DATE_PART DATE_TRUNC ISFINITE JUSTIFY_DAYS JUSTIFY_HOURS JUSTIFY_INTERVAL '
      + 'MAKE_DATE MAKE_INTERVAL|10 MAKE_TIME MAKE_TIMESTAMP|10 MAKE_TIMESTAMPTZ|10 NOW STATEMENT_TIMESTAMP|10 '
      + 'TIMEOFDAY TRANSACTION_TIMESTAMP|10 '
      // https://www.postgresql.org/docs/11/static/functions-enum.html
      + 'ENUM_FIRST ENUM_LAST ENUM_RANGE '
      // https://www.postgresql.org/docs/11/static/functions-geometry.html
      + 'AREA CENTER DIAMETER HEIGHT ISCLOSED ISOPEN NPOINTS PCLOSE POPEN RADIUS WIDTH '
      + 'BOX BOUND_BOX CIRCLE LINE LSEG PATH POLYGON '
      // https://www.postgresql.org/docs/11/static/functions-net.html
      + 'ABBREV BROADCAST HOST HOSTMASK MASKLEN NETMASK NETWORK SET_MASKLEN TEXT INET_SAME_FAMILY '
      + 'INET_MERGE MACADDR8_SET7BIT '
      // https://www.postgresql.org/docs/11/static/functions-textsearch.html
      + 'ARRAY_TO_TSVECTOR GET_CURRENT_TS_CONFIG NUMNODE PLAINTO_TSQUERY PHRASETO_TSQUERY WEBSEARCH_TO_TSQUERY '
      + 'QUERYTREE SETWEIGHT STRIP TO_TSQUERY TO_TSVECTOR JSON_TO_TSVECTOR JSONB_TO_TSVECTOR TS_DELETE '
      + 'TS_FILTER TS_HEADLINE TS_RANK TS_RANK_CD TS_REWRITE TSQUERY_PHRASE TSVECTOR_TO_ARRAY '
      + 'TSVECTOR_UPDATE_TRIGGER TSVECTOR_UPDATE_TRIGGER_COLUMN '
      // https://www.postgresql.org/docs/11/static/functions-xml.html
      + 'XMLCOMMENT XMLCONCAT XMLELEMENT XMLFOREST XMLPI XMLROOT '
      + 'XMLEXISTS XML_IS_WELL_FORMED XML_IS_WELL_FORMED_DOCUMENT XML_IS_WELL_FORMED_CONTENT '
      + 'XPATH XPATH_EXISTS XMLTABLE XMLNAMESPACES '
      + 'TABLE_TO_XML TABLE_TO_XMLSCHEMA TABLE_TO_XML_AND_XMLSCHEMA '
      + 'QUERY_TO_XML QUERY_TO_XMLSCHEMA QUERY_TO_XML_AND_XMLSCHEMA '
      + 'CURSOR_TO_XML CURSOR_TO_XMLSCHEMA '
      + 'SCHEMA_TO_XML SCHEMA_TO_XMLSCHEMA SCHEMA_TO_XML_AND_XMLSCHEMA '
      + 'DATABASE_TO_XML DATABASE_TO_XMLSCHEMA DATABASE_TO_XML_AND_XMLSCHEMA '
      + 'XMLATTRIBUTES '
      // https://www.postgresql.org/docs/11/static/functions-json.html
      + 'TO_JSON TO_JSONB ARRAY_TO_JSON ROW_TO_JSON JSON_BUILD_ARRAY JSONB_BUILD_ARRAY JSON_BUILD_OBJECT '
      + 'JSONB_BUILD_OBJECT JSON_OBJECT JSONB_OBJECT JSON_ARRAY_LENGTH JSONB_ARRAY_LENGTH JSON_EACH '
      + 'JSONB_EACH JSON_EACH_TEXT JSONB_EACH_TEXT JSON_EXTRACT_PATH JSONB_EXTRACT_PATH '
      + 'JSON_OBJECT_KEYS JSONB_OBJECT_KEYS JSON_POPULATE_RECORD JSONB_POPULATE_RECORD JSON_POPULATE_RECORDSET '
      + 'JSONB_POPULATE_RECORDSET JSON_ARRAY_ELEMENTS JSONB_ARRAY_ELEMENTS JSON_ARRAY_ELEMENTS_TEXT '
      + 'JSONB_ARRAY_ELEMENTS_TEXT JSON_TYPEOF JSONB_TYPEOF JSON_TO_RECORD JSONB_TO_RECORD JSON_TO_RECORDSET '
      + 'JSONB_TO_RECORDSET JSON_STRIP_NULLS JSONB_STRIP_NULLS JSONB_SET JSONB_INSERT JSONB_PRETTY '
      // https://www.postgresql.org/docs/11/static/functions-sequence.html
      + 'CURRVAL LASTVAL NEXTVAL SETVAL '
      // https://www.postgresql.org/docs/11/static/functions-conditional.html
      + 'COALESCE NULLIF GREATEST LEAST '
      // https://www.postgresql.org/docs/11/static/functions-array.html
      + 'ARRAY_APPEND ARRAY_CAT ARRAY_NDIMS ARRAY_DIMS ARRAY_FILL ARRAY_LENGTH ARRAY_LOWER ARRAY_POSITION '
      + 'ARRAY_POSITIONS ARRAY_PREPEND ARRAY_REMOVE ARRAY_REPLACE ARRAY_TO_STRING ARRAY_UPPER CARDINALITY '
      + 'STRING_TO_ARRAY UNNEST '
      // https://www.postgresql.org/docs/11/static/functions-range.html
      + 'ISEMPTY LOWER_INC UPPER_INC LOWER_INF UPPER_INF RANGE_MERGE '
      // https://www.postgresql.org/docs/11/static/functions-srf.html
      + 'GENERATE_SERIES GENERATE_SUBSCRIPTS '
      // https://www.postgresql.org/docs/11/static/functions-info.html
      + 'CURRENT_DATABASE CURRENT_QUERY CURRENT_SCHEMA|10 CURRENT_SCHEMAS|10 INET_CLIENT_ADDR INET_CLIENT_PORT '
      + 'INET_SERVER_ADDR INET_SERVER_PORT ROW_SECURITY_ACTIVE FORMAT_TYPE '
      + 'TO_REGCLASS TO_REGPROC TO_REGPROCEDURE TO_REGOPER TO_REGOPERATOR TO_REGTYPE TO_REGNAMESPACE TO_REGROLE '
      + 'COL_DESCRIPTION OBJ_DESCRIPTION SHOBJ_DESCRIPTION '
      + 'TXID_CURRENT TXID_CURRENT_IF_ASSIGNED TXID_CURRENT_SNAPSHOT TXID_SNAPSHOT_XIP TXID_SNAPSHOT_XMAX '
      + 'TXID_SNAPSHOT_XMIN TXID_VISIBLE_IN_SNAPSHOT TXID_STATUS '
      // https://www.postgresql.org/docs/11/static/functions-admin.html
      + 'CURRENT_SETTING SET_CONFIG BRIN_SUMMARIZE_NEW_VALUES BRIN_SUMMARIZE_RANGE BRIN_DESUMMARIZE_RANGE '
      + 'GIN_CLEAN_PENDING_LIST '
      // https://www.postgresql.org/docs/11/static/functions-trigger.html
      + 'SUPPRESS_REDUNDANT_UPDATES_TRIGGER '
      // ihttps://www.postgresql.org/docs/devel/static/lo-funcs.html
      + 'LO_FROM_BYTEA LO_PUT LO_GET LO_CREAT LO_CREATE LO_UNLINK LO_IMPORT LO_EXPORT LOREAD LOWRITE '
      //
      + 'GROUPING CAST ';

    const FUNCTIONS_RE =
        FUNCTIONS.trim()
          .split(' ')
          .map(function(val) { return val.split('|')[0]; })
          .join('|');

    return {
      name: 'PostgreSQL',
      aliases: [
        'postgres',
        'postgresql'
      ],
      supersetOf: "sql",
      case_insensitive: true,
      keywords: {
        keyword:
              SQL_KW + PLPGSQL_KW + ROLE_ATTRS,
        built_in:
              SQL_BI + PLPGSQL_BI + PLPGSQL_EXCEPTIONS
      },
      // Forbid some cunstructs from other languages to improve autodetect. In fact
      // "[a-z]:" is legal (as part of array slice), but improbabal.
      illegal: /:==|\W\s*\(\*|(^|\s)\$[a-z]|\{\{|[a-z]:\s*$|\.\.\.|TO:|DO:/,
      contains: [
        // special handling of some words, which are reserved only in some contexts
        {
          className: 'keyword',
          variants: [
            { begin: /\bTEXT\s*SEARCH\b/ },
            { begin: /\b(PRIMARY|FOREIGN|FOR(\s+NO)?)\s+KEY\b/ },
            { begin: /\bPARALLEL\s+(UNSAFE|RESTRICTED|SAFE)\b/ },
            { begin: /\bSTORAGE\s+(PLAIN|EXTERNAL|EXTENDED|MAIN)\b/ },
            { begin: /\bMATCH\s+(FULL|PARTIAL|SIMPLE)\b/ },
            { begin: /\bNULLS\s+(FIRST|LAST)\b/ },
            { begin: /\bEVENT\s+TRIGGER\b/ },
            { begin: /\b(MAPPING|OR)\s+REPLACE\b/ },
            { begin: /\b(FROM|TO)\s+(PROGRAM|STDIN|STDOUT)\b/ },
            { begin: /\b(SHARE|EXCLUSIVE)\s+MODE\b/ },
            { begin: /\b(LEFT|RIGHT)\s+(OUTER\s+)?JOIN\b/ },
            { begin: /\b(FETCH|MOVE)\s+(NEXT|PRIOR|FIRST|LAST|ABSOLUTE|RELATIVE|FORWARD|BACKWARD)\b/ },
            { begin: /\bPRESERVE\s+ROWS\b/ },
            { begin: /\bDISCARD\s+PLANS\b/ },
            { begin: /\bREFERENCING\s+(OLD|NEW)\b/ },
            { begin: /\bSKIP\s+LOCKED\b/ },
            { begin: /\bGROUPING\s+SETS\b/ },
            { begin: /\b(BINARY|INSENSITIVE|SCROLL|NO\s+SCROLL)\s+(CURSOR|FOR)\b/ },
            { begin: /\b(WITH|WITHOUT)\s+HOLD\b/ },
            { begin: /\bWITH\s+(CASCADED|LOCAL)\s+CHECK\s+OPTION\b/ },
            { begin: /\bEXCLUDE\s+(TIES|NO\s+OTHERS)\b/ },
            { begin: /\bFORMAT\s+(TEXT|XML|JSON|YAML)\b/ },
            { begin: /\bSET\s+((SESSION|LOCAL)\s+)?NAMES\b/ },
            { begin: /\bIS\s+(NOT\s+)?UNKNOWN\b/ },
            { begin: /\bSECURITY\s+LABEL\b/ },
            { begin: /\bSTANDALONE\s+(YES|NO|NO\s+VALUE)\b/ },
            { begin: /\bWITH\s+(NO\s+)?DATA\b/ },
            { begin: /\b(FOREIGN|SET)\s+DATA\b/ },
            { begin: /\bSET\s+(CATALOG|CONSTRAINTS)\b/ },
            { begin: /\b(WITH|FOR)\s+ORDINALITY\b/ },
            { begin: /\bIS\s+(NOT\s+)?DOCUMENT\b/ },
            { begin: /\bXML\s+OPTION\s+(DOCUMENT|CONTENT)\b/ },
            { begin: /\b(STRIP|PRESERVE)\s+WHITESPACE\b/ },
            { begin: /\bNO\s+(ACTION|MAXVALUE|MINVALUE)\b/ },
            { begin: /\bPARTITION\s+BY\s+(RANGE|LIST|HASH)\b/ },
            { begin: /\bAT\s+TIME\s+ZONE\b/ },
            { begin: /\bGRANTED\s+BY\b/ },
            { begin: /\bRETURN\s+(QUERY|NEXT)\b/ },
            { begin: /\b(ATTACH|DETACH)\s+PARTITION\b/ },
            { begin: /\bFORCE\s+ROW\s+LEVEL\s+SECURITY\b/ },
            { begin: /\b(INCLUDING|EXCLUDING)\s+(COMMENTS|CONSTRAINTS|DEFAULTS|IDENTITY|INDEXES|STATISTICS|STORAGE|ALL)\b/ },
            { begin: /\bAS\s+(ASSIGNMENT|IMPLICIT|PERMISSIVE|RESTRICTIVE|ENUM|RANGE)\b/ }
          ]
        },
        // functions named as keywords, followed by '('
        { begin: /\b(FORMAT|FAMILY|VERSION)\s*\(/
          // keywords: { built_in: 'FORMAT FAMILY VERSION' }
        },
        // INCLUDE ( ... ) in index_parameters in CREATE TABLE
        {
          begin: /\bINCLUDE\s*\(/,
          keywords: 'INCLUDE'
        },
        // not highlight RANGE if not in frame_clause (not 100% correct, but seems satisfactory)
        { begin: /\bRANGE(?!\s*(BETWEEN|UNBOUNDED|CURRENT|[-0-9]+))/ },
        // disable highlighting in commands CREATE AGGREGATE/COLLATION/DATABASE/OPERTOR/TEXT SEARCH .../TYPE
        // and in PL/pgSQL RAISE ... USING
        { begin: /\b(VERSION|OWNER|TEMPLATE|TABLESPACE|CONNECTION\s+LIMIT|PROCEDURE|RESTRICT|JOIN|PARSER|COPY|START|END|COLLATION|INPUT|ANALYZE|STORAGE|LIKE|DEFAULT|DELIMITER|ENCODING|COLUMN|CONSTRAINT|TABLE|SCHEMA)\s*=/ },
        // PG_smth; HAS_some_PRIVILEGE
        {
          // className: 'built_in',
          begin: /\b(PG_\w+?|HAS_[A-Z_]+_PRIVILEGE)\b/,
          relevance: 10
        },
        // extract
        {
          begin: /\bEXTRACT\s*\(/,
          end: /\bFROM\b/,
          returnEnd: true,
          keywords: {
            // built_in: 'EXTRACT',
            type: 'CENTURY DAY DECADE DOW DOY EPOCH HOUR ISODOW ISOYEAR MICROSECONDS '
                          + 'MILLENNIUM MILLISECONDS MINUTE MONTH QUARTER SECOND TIMEZONE TIMEZONE_HOUR '
                          + 'TIMEZONE_MINUTE WEEK YEAR' }
        },
        // xmlelement, xmlpi - special NAME
        {
          begin: /\b(XMLELEMENT|XMLPI)\s*\(\s*NAME/,
          keywords: {
            // built_in: 'XMLELEMENT XMLPI',
            keyword: 'NAME' }
        },
        // xmlparse, xmlserialize
        {
          begin: /\b(XMLPARSE|XMLSERIALIZE)\s*\(\s*(DOCUMENT|CONTENT)/,
          keywords: {
            // built_in: 'XMLPARSE XMLSERIALIZE',
            keyword: 'DOCUMENT CONTENT' }
        },
        // Sequences. We actually skip everything between CACHE|INCREMENT|MAXVALUE|MINVALUE and
        // nearest following numeric constant. Without with trick we find a lot of "keywords"
        // in 'avrasm' autodetection test...
        {
          beginKeywords: 'CACHE INCREMENT MAXVALUE MINVALUE',
          end: hljs.C_NUMBER_RE,
          returnEnd: true,
          keywords: 'BY CACHE INCREMENT MAXVALUE MINVALUE'
        },
        // WITH|WITHOUT TIME ZONE as part of datatype
        {
          className: 'type',
          begin: /\b(WITH|WITHOUT)\s+TIME\s+ZONE\b/
        },
        // INTERVAL optional fields
        {
          className: 'type',
          begin: /\bINTERVAL\s+(YEAR|MONTH|DAY|HOUR|MINUTE|SECOND)(\s+TO\s+(MONTH|HOUR|MINUTE|SECOND))?\b/
        },
        // Pseudo-types which allowed only as return type
        {
          begin: /\bRETURNS\s+(LANGUAGE_HANDLER|TRIGGER|EVENT_TRIGGER|FDW_HANDLER|INDEX_AM_HANDLER|TSM_HANDLER)\b/,
          keywords: {
            keyword: 'RETURNS',
            type: 'LANGUAGE_HANDLER TRIGGER EVENT_TRIGGER FDW_HANDLER INDEX_AM_HANDLER TSM_HANDLER'
          }
        },
        // Known functions - only when followed by '('
        { begin: '\\b(' + FUNCTIONS_RE + ')\\s*\\('
          // keywords: { built_in: FUNCTIONS }
        },
        // Types
        { begin: '\\.(' + TYPES_RE + ')\\b' // prevent highlight as type, say, 'oid' in 'pgclass.oid'
        },
        {
          begin: '\\b(' + TYPES_RE + ')\\s+PATH\\b', // in XMLTABLE
          keywords: {
            keyword: 'PATH', // hopefully no one would use PATH type in XMLTABLE...
            type: TYPES.replace('PATH ', '')
          }
        },
        {
          className: 'type',
          begin: '\\b(' + TYPES_RE + ')\\b'
        },
        // Strings, see https://www.postgresql.org/docs/11/static/sql-syntax-lexical.html#SQL-SYNTAX-CONSTANTS
        {
          className: 'string',
          begin: '\'',
          end: '\'',
          contains: [ { begin: '\'\'' } ]
        },
        {
          className: 'string',
          begin: '(e|E|u&|U&)\'',
          end: '\'',
          contains: [ { begin: '\\\\.' } ],
          relevance: 10
        },
        hljs.END_SAME_AS_BEGIN({
          begin: DOLLAR_STRING,
          end: DOLLAR_STRING,
          contains: [
            {
              // actually we want them all except SQL; listed are those with known implementations
              // and XML + JSON just in case
              subLanguage: [
                'pgsql',
                'perl',
                'python',
                'tcl',
                'r',
                'lua',
                'java',
                'php',
                'ruby',
                'bash',
                'scheme',
                'xml',
                'json'
              ],
              endsWithParent: true
            }
          ]
        }),
        // identifiers in quotes
        {
          begin: '"',
          end: '"',
          contains: [ { begin: '""' } ]
        },
        // numbers
        hljs.C_NUMBER_MODE,
        // comments
        hljs.C_BLOCK_COMMENT_MODE,
        COMMENT_MODE,
        // PL/pgSQL staff
        // %ROWTYPE, %TYPE, $n
        {
          className: 'meta',
          variants: [
            { // %TYPE, %ROWTYPE
              begin: '%(ROW)?TYPE',
              relevance: 10
            },
            { // $n
              begin: '\\$\\d+' },
            { // #compiler option
              begin: '^#\\w',
              end: '$'
            }
          ]
        },
        // <<labeles>>
        {
          className: 'symbol',
          begin: LABEL,
          relevance: 10
        }
      ]
    };
  }

  return pgsql;

})();

    hljs.registerLanguage('pgsql', hljsGrammar);
  })();/*! `php` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: PHP
  Author: Victor Karamzin <Victor.Karamzin@enterra-inc.com>
  Contributors: Evgeny Stepanischev <imbolk@gmail.com>, Ivan Sagalaev <maniac@softwaremaniacs.org>
  Website: https://www.php.net
  Category: common
  */

  /**
   * @param {HLJSApi} hljs
   * @returns {LanguageDetail}
   * */
  function php(hljs) {
    const regex = hljs.regex;
    // negative look-ahead tries to avoid matching patterns that are not
    // Perl at all like $ident$, @ident@, etc.
    const NOT_PERL_ETC = /(?![A-Za-z0-9])(?![$])/;
    const IDENT_RE = regex.concat(
      /[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/,
      NOT_PERL_ETC);
    // Will not detect camelCase classes
    const PASCAL_CASE_CLASS_NAME_RE = regex.concat(
      /(\\?[A-Z][a-z0-9_\x7f-\xff]+|\\?[A-Z]+(?=[A-Z][a-z0-9_\x7f-\xff])){1,}/,
      NOT_PERL_ETC);
    const VARIABLE = {
      scope: 'variable',
      match: '\\$+' + IDENT_RE,
    };
    const PREPROCESSOR = {
      scope: 'meta',
      variants: [
        { begin: /<\?php/, relevance: 10 }, // boost for obvious PHP
        { begin: /<\?=/ },
        // less relevant per PSR-1 which says not to use short-tags
        { begin: /<\?/, relevance: 0.1 },
        { begin: /\?>/ } // end php tag
      ]
    };
    const SUBST = {
      scope: 'subst',
      variants: [
        { begin: /\$\w+/ },
        {
          begin: /\{\$/,
          end: /\}/
        }
      ]
    };
    const SINGLE_QUOTED = hljs.inherit(hljs.APOS_STRING_MODE, { illegal: null, });
    const DOUBLE_QUOTED = hljs.inherit(hljs.QUOTE_STRING_MODE, {
      illegal: null,
      contains: hljs.QUOTE_STRING_MODE.contains.concat(SUBST),
    });

    const HEREDOC = {
      begin: /<<<[ \t]*(?:(\w+)|"(\w+)")\n/,
      end: /[ \t]*(\w+)\b/,
      contains: hljs.QUOTE_STRING_MODE.contains.concat(SUBST),
      'on:begin': (m, resp) => { resp.data._beginMatch = m[1] || m[2]; },
      'on:end': (m, resp) => { if (resp.data._beginMatch !== m[1]) resp.ignoreMatch(); },
    };

    const NOWDOC = hljs.END_SAME_AS_BEGIN({
      begin: /<<<[ \t]*'(\w+)'\n/,
      end: /[ \t]*(\w+)\b/,
    });
    // list of valid whitespaces because non-breaking space might be part of a IDENT_RE
    const WHITESPACE = '[ \t\n]';
    const STRING = {
      scope: 'string',
      variants: [
        DOUBLE_QUOTED,
        SINGLE_QUOTED,
        HEREDOC,
        NOWDOC
      ]
    };
    const NUMBER = {
      scope: 'number',
      variants: [
        { begin: `\\b0[bB][01]+(?:_[01]+)*\\b` }, // Binary w/ underscore support
        { begin: `\\b0[oO][0-7]+(?:_[0-7]+)*\\b` }, // Octals w/ underscore support
        { begin: `\\b0[xX][\\da-fA-F]+(?:_[\\da-fA-F]+)*\\b` }, // Hex w/ underscore support
        // Decimals w/ underscore support, with optional fragments and scientific exponent (e) suffix.
        { begin: `(?:\\b\\d+(?:_\\d+)*(\\.(?:\\d+(?:_\\d+)*))?|\\B\\.\\d+)(?:[eE][+-]?\\d+)?` }
      ],
      relevance: 0
    };
    const LITERALS = [
      "false",
      "null",
      "true"
    ];
    const KWS = [
      // Magic constants:
      // <https://www.php.net/manual/en/language.constants.predefined.php>
      "__CLASS__",
      "__DIR__",
      "__FILE__",
      "__FUNCTION__",
      "__COMPILER_HALT_OFFSET__",
      "__LINE__",
      "__METHOD__",
      "__NAMESPACE__",
      "__TRAIT__",
      // Function that look like language construct or language construct that look like function:
      // List of keywords that may not require parenthesis
      "die",
      "echo",
      "exit",
      "include",
      "include_once",
      "print",
      "require",
      "require_once",
      // These are not language construct (function) but operate on the currently-executing function and can access the current symbol table
      // 'compact extract func_get_arg func_get_args func_num_args get_called_class get_parent_class ' +
      // Other keywords:
      // <https://www.php.net/manual/en/reserved.php>
      // <https://www.php.net/manual/en/language.types.type-juggling.php>
      "array",
      "abstract",
      "and",
      "as",
      "binary",
      "bool",
      "boolean",
      "break",
      "callable",
      "case",
      "catch",
      "class",
      "clone",
      "const",
      "continue",
      "declare",
      "default",
      "do",
      "double",
      "else",
      "elseif",
      "empty",
      "enddeclare",
      "endfor",
      "endforeach",
      "endif",
      "endswitch",
      "endwhile",
      "enum",
      "eval",
      "extends",
      "final",
      "finally",
      "float",
      "for",
      "foreach",
      "from",
      "global",
      "goto",
      "if",
      "implements",
      "instanceof",
      "insteadof",
      "int",
      "integer",
      "interface",
      "isset",
      "iterable",
      "list",
      "match|0",
      "mixed",
      "new",
      "never",
      "object",
      "or",
      "private",
      "protected",
      "public",
      "readonly",
      "real",
      "return",
      "string",
      "switch",
      "throw",
      "trait",
      "try",
      "unset",
      "use",
      "var",
      "void",
      "while",
      "xor",
      "yield"
    ];

    const BUILT_INS = [
      // Standard PHP library:
      // <https://www.php.net/manual/en/book.spl.php>
      "Error|0",
      "AppendIterator",
      "ArgumentCountError",
      "ArithmeticError",
      "ArrayIterator",
      "ArrayObject",
      "AssertionError",
      "BadFunctionCallException",
      "BadMethodCallException",
      "CachingIterator",
      "CallbackFilterIterator",
      "CompileError",
      "Countable",
      "DirectoryIterator",
      "DivisionByZeroError",
      "DomainException",
      "EmptyIterator",
      "ErrorException",
      "Exception",
      "FilesystemIterator",
      "FilterIterator",
      "GlobIterator",
      "InfiniteIterator",
      "InvalidArgumentException",
      "IteratorIterator",
      "LengthException",
      "LimitIterator",
      "LogicException",
      "MultipleIterator",
      "NoRewindIterator",
      "OutOfBoundsException",
      "OutOfRangeException",
      "OuterIterator",
      "OverflowException",
      "ParentIterator",
      "ParseError",
      "RangeException",
      "RecursiveArrayIterator",
      "RecursiveCachingIterator",
      "RecursiveCallbackFilterIterator",
      "RecursiveDirectoryIterator",
      "RecursiveFilterIterator",
      "RecursiveIterator",
      "RecursiveIteratorIterator",
      "RecursiveRegexIterator",
      "RecursiveTreeIterator",
      "RegexIterator",
      "RuntimeException",
      "SeekableIterator",
      "SplDoublyLinkedList",
      "SplFileInfo",
      "SplFileObject",
      "SplFixedArray",
      "SplHeap",
      "SplMaxHeap",
      "SplMinHeap",
      "SplObjectStorage",
      "SplObserver",
      "SplPriorityQueue",
      "SplQueue",
      "SplStack",
      "SplSubject",
      "SplTempFileObject",
      "TypeError",
      "UnderflowException",
      "UnexpectedValueException",
      "UnhandledMatchError",
      // Reserved interfaces:
      // <https://www.php.net/manual/en/reserved.interfaces.php>
      "ArrayAccess",
      "BackedEnum",
      "Closure",
      "Fiber",
      "Generator",
      "Iterator",
      "IteratorAggregate",
      "Serializable",
      "Stringable",
      "Throwable",
      "Traversable",
      "UnitEnum",
      "WeakReference",
      "WeakMap",
      // Reserved classes:
      // <https://www.php.net/manual/en/reserved.classes.php>
      "Directory",
      "__PHP_Incomplete_Class",
      "parent",
      "php_user_filter",
      "self",
      "static",
      "stdClass"
    ];

    /** Dual-case keywords
     *
     * ["then","FILE"] =>
     *     ["then", "THEN", "FILE", "file"]
     *
     * @param {string[]} items */
    const dualCase = (items) => {
      /** @type string[] */
      const result = [];
      items.forEach(item => {
        result.push(item);
        if (item.toLowerCase() === item) {
          result.push(item.toUpperCase());
        } else {
          result.push(item.toLowerCase());
        }
      });
      return result;
    };

    const KEYWORDS = {
      keyword: KWS,
      literal: dualCase(LITERALS),
      built_in: BUILT_INS,
    };

    /**
     * @param {string[]} items */
    const normalizeKeywords = (items) => {
      return items.map(item => {
        return item.replace(/\|\d+$/, "");
      });
    };

    const CONSTRUCTOR_CALL = { variants: [
      {
        match: [
          /new/,
          regex.concat(WHITESPACE, "+"),
          // to prevent built ins from being confused as the class constructor call
          regex.concat("(?!", normalizeKeywords(BUILT_INS).join("\\b|"), "\\b)"),
          PASCAL_CASE_CLASS_NAME_RE,
        ],
        scope: {
          1: "keyword",
          4: "title.class",
        },
      }
    ] };

    const CONSTANT_REFERENCE = regex.concat(IDENT_RE, "\\b(?!\\()");

    const LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON = { variants: [
      {
        match: [
          regex.concat(
            /::/,
            regex.lookahead(/(?!class\b)/)
          ),
          CONSTANT_REFERENCE,
        ],
        scope: { 2: "variable.constant", },
      },
      {
        match: [
          /::/,
          /class/,
        ],
        scope: { 2: "variable.language", },
      },
      {
        match: [
          PASCAL_CASE_CLASS_NAME_RE,
          regex.concat(
            /::/,
            regex.lookahead(/(?!class\b)/)
          ),
          CONSTANT_REFERENCE,
        ],
        scope: {
          1: "title.class",
          3: "variable.constant",
        },
      },
      {
        match: [
          PASCAL_CASE_CLASS_NAME_RE,
          regex.concat(
            "::",
            regex.lookahead(/(?!class\b)/)
          ),
        ],
        scope: { 1: "title.class", },
      },
      {
        match: [
          PASCAL_CASE_CLASS_NAME_RE,
          /::/,
          /class/,
        ],
        scope: {
          1: "title.class",
          3: "variable.language",
        },
      }
    ] };

    const NAMED_ARGUMENT = {
      scope: 'attr',
      match: regex.concat(IDENT_RE, regex.lookahead(':'), regex.lookahead(/(?!::)/)),
    };
    const PARAMS_MODE = {
      relevance: 0,
      begin: /\(/,
      end: /\)/,
      keywords: KEYWORDS,
      contains: [
        NAMED_ARGUMENT,
        VARIABLE,
        LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON,
        hljs.C_BLOCK_COMMENT_MODE,
        STRING,
        NUMBER,
        CONSTRUCTOR_CALL,
      ],
    };
    const FUNCTION_INVOKE = {
      relevance: 0,
      match: [
        /\b/,
        // to prevent keywords from being confused as the function title
        regex.concat("(?!fn\\b|function\\b|", normalizeKeywords(KWS).join("\\b|"), "|", normalizeKeywords(BUILT_INS).join("\\b|"), "\\b)"),
        IDENT_RE,
        regex.concat(WHITESPACE, "*"),
        regex.lookahead(/(?=\()/)
      ],
      scope: { 3: "title.function.invoke", },
      contains: [ PARAMS_MODE ]
    };
    PARAMS_MODE.contains.push(FUNCTION_INVOKE);

    const ATTRIBUTE_CONTAINS = [
      NAMED_ARGUMENT,
      LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON,
      hljs.C_BLOCK_COMMENT_MODE,
      STRING,
      NUMBER,
      CONSTRUCTOR_CALL,
    ];

    const ATTRIBUTES = {
      begin: regex.concat(/#\[\s*/, PASCAL_CASE_CLASS_NAME_RE),
      beginScope: "meta",
      end: /]/,
      endScope: "meta",
      keywords: {
        literal: LITERALS,
        keyword: [
          'new',
          'array',
        ]
      },
      contains: [
        {
          begin: /\[/,
          end: /]/,
          keywords: {
            literal: LITERALS,
            keyword: [
              'new',
              'array',
            ]
          },
          contains: [
            'self',
            ...ATTRIBUTE_CONTAINS,
          ]
        },
        ...ATTRIBUTE_CONTAINS,
        {
          scope: 'meta',
          match: PASCAL_CASE_CLASS_NAME_RE
        }
      ]
    };

    return {
      case_insensitive: false,
      keywords: KEYWORDS,
      contains: [
        ATTRIBUTES,
        hljs.HASH_COMMENT_MODE,
        hljs.COMMENT('//', '$'),
        hljs.COMMENT(
          '/\\*',
          '\\*/',
          { contains: [
            {
              scope: 'doctag',
              match: '@[A-Za-z]+'
            }
          ] }
        ),
        {
          match: /__halt_compiler\(\);/,
          keywords: '__halt_compiler',
          starts: {
            scope: "comment",
            end: hljs.MATCH_NOTHING_RE,
            contains: [
              {
                match: /\?>/,
                scope: "meta",
                endsParent: true
              }
            ]
          }
        },
        PREPROCESSOR,
        {
          scope: 'variable.language',
          match: /\$this\b/
        },
        VARIABLE,
        FUNCTION_INVOKE,
        LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON,
        {
          match: [
            /const/,
            /\s/,
            IDENT_RE,
          ],
          scope: {
            1: "keyword",
            3: "variable.constant",
          },
        },
        CONSTRUCTOR_CALL,
        {
          scope: 'function',
          relevance: 0,
          beginKeywords: 'fn function',
          end: /[;{]/,
          excludeEnd: true,
          illegal: '[$%\\[]',
          contains: [
            { beginKeywords: 'use', },
            hljs.UNDERSCORE_TITLE_MODE,
            {
              begin: '=>', // No markup, just a relevance booster
              endsParent: true
            },
            {
              scope: 'params',
              begin: '\\(',
              end: '\\)',
              excludeBegin: true,
              excludeEnd: true,
              keywords: KEYWORDS,
              contains: [
                'self',
                VARIABLE,
                LEFT_AND_RIGHT_SIDE_OF_DOUBLE_COLON,
                hljs.C_BLOCK_COMMENT_MODE,
                STRING,
                NUMBER
              ]
            },
          ]
        },
        {
          scope: 'class',
          variants: [
            {
              beginKeywords: "enum",
              illegal: /[($"]/
            },
            {
              beginKeywords: "class interface trait",
              illegal: /[:($"]/
            }
          ],
          relevance: 0,
          end: /\{/,
          excludeEnd: true,
          contains: [
            { beginKeywords: 'extends implements' },
            hljs.UNDERSCORE_TITLE_MODE
          ]
        },
        // both use and namespace still use "old style" rules (vs multi-match)
        // because the namespace name can include `\` and we still want each
        // element to be treated as its own *individual* title
        {
          beginKeywords: 'namespace',
          relevance: 0,
          end: ';',
          illegal: /[.']/,
          contains: [ hljs.inherit(hljs.UNDERSCORE_TITLE_MODE, { scope: "title.class" }) ]
        },
        {
          beginKeywords: 'use',
          relevance: 0,
          end: ';',
          contains: [
            // TODO: title.function vs title.class
            {
              match: /\b(as|const|function)\b/,
              scope: "keyword"
            },
            // TODO: could be title.class or title.function
            hljs.UNDERSCORE_TITLE_MODE
          ]
        },
        STRING,
        NUMBER,
      ]
    };
  }

  return php;

})();

    hljs.registerLanguage('php', hljsGrammar);
  })();/*! `plaintext` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Plain text
  Author: Egor Rogov (e.rogov@postgrespro.ru)
  Description: Plain text without any highlighting.
  Category: common
  */

  function plaintext(hljs) {
    return {
      name: 'Plain text',
      aliases: [
        'text',
        'txt'
      ],
      disableAutodetect: true
    };
  }

  return plaintext;

})();

    hljs.registerLanguage('plaintext', hljsGrammar);
  })();/*! `powershell` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: PowerShell
  Description: PowerShell is a task-based command-line shell and scripting language built on .NET.
  Author: David Mohundro <david@mohundro.com>
  Contributors: Nicholas Blumhardt <nblumhardt@nblumhardt.com>, Victor Zhou <OiCMudkips@users.noreply.github.com>, Nicolas Le Gall <contact@nlegall.fr>
  Website: https://docs.microsoft.com/en-us/powershell/
  Category: scripting
  */

  function powershell(hljs) {
    const TYPES = [
      "string",
      "char",
      "byte",
      "int",
      "long",
      "bool",
      "decimal",
      "single",
      "double",
      "DateTime",
      "xml",
      "array",
      "hashtable",
      "void"
    ];

    // https://docs.microsoft.com/en-us/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands
    const VALID_VERBS =
      'Add|Clear|Close|Copy|Enter|Exit|Find|Format|Get|Hide|Join|Lock|'
      + 'Move|New|Open|Optimize|Pop|Push|Redo|Remove|Rename|Reset|Resize|'
      + 'Search|Select|Set|Show|Skip|Split|Step|Switch|Undo|Unlock|'
      + 'Watch|Backup|Checkpoint|Compare|Compress|Convert|ConvertFrom|'
      + 'ConvertTo|Dismount|Edit|Expand|Export|Group|Import|Initialize|'
      + 'Limit|Merge|Mount|Out|Publish|Restore|Save|Sync|Unpublish|Update|'
      + 'Approve|Assert|Build|Complete|Confirm|Deny|Deploy|Disable|Enable|Install|Invoke|'
      + 'Register|Request|Restart|Resume|Start|Stop|Submit|Suspend|Uninstall|'
      + 'Unregister|Wait|Debug|Measure|Ping|Repair|Resolve|Test|Trace|Connect|'
      + 'Disconnect|Read|Receive|Send|Write|Block|Grant|Protect|Revoke|Unblock|'
      + 'Unprotect|Use|ForEach|Sort|Tee|Where';

    const COMPARISON_OPERATORS =
      '-and|-as|-band|-bnot|-bor|-bxor|-casesensitive|-ccontains|-ceq|-cge|-cgt|'
      + '-cle|-clike|-clt|-cmatch|-cne|-cnotcontains|-cnotlike|-cnotmatch|-contains|'
      + '-creplace|-csplit|-eq|-exact|-f|-file|-ge|-gt|-icontains|-ieq|-ige|-igt|'
      + '-ile|-ilike|-ilt|-imatch|-in|-ine|-inotcontains|-inotlike|-inotmatch|'
      + '-ireplace|-is|-isnot|-isplit|-join|-le|-like|-lt|-match|-ne|-not|'
      + '-notcontains|-notin|-notlike|-notmatch|-or|-regex|-replace|-shl|-shr|'
      + '-split|-wildcard|-xor';

    const KEYWORDS = {
      $pattern: /-?[A-z\.\-]+\b/,
      keyword:
        'if else foreach return do while until elseif begin for trap data dynamicparam '
        + 'end break throw param continue finally in switch exit filter try process catch '
        + 'hidden static parameter',
      // "echo" relevance has been set to 0 to avoid auto-detect conflicts with shell transcripts
      built_in:
        'ac asnp cat cd CFS chdir clc clear clhy cli clp cls clv cnsn compare copy cp '
        + 'cpi cpp curl cvpa dbp del diff dir dnsn ebp echo|0 epal epcsv epsn erase etsn exsn fc fhx '
        + 'fl ft fw gal gbp gc gcb gci gcm gcs gdr gerr ghy gi gin gjb gl gm gmo gp gps gpv group '
        + 'gsn gsnp gsv gtz gu gv gwmi h history icm iex ihy ii ipal ipcsv ipmo ipsn irm ise iwmi '
        + 'iwr kill lp ls man md measure mi mount move mp mv nal ndr ni nmo npssc nsn nv ogv oh '
        + 'popd ps pushd pwd r rbp rcjb rcsn rd rdr ren ri rjb rm rmdir rmo rni rnp rp rsn rsnp '
        + 'rujb rv rvpa rwmi sajb sal saps sasv sbp sc scb select set shcm si sl sleep sls sort sp '
        + 'spjb spps spsv start stz sujb sv swmi tee trcm type wget where wjb write'
      // TODO: 'validate[A-Z]+' can't work in keywords
    };

    const TITLE_NAME_RE = /\w[\w\d]*((-)[\w\d]+)*/;

    const BACKTICK_ESCAPE = {
      begin: '`[\\s\\S]',
      relevance: 0
    };

    const VAR = {
      className: 'variable',
      variants: [
        { begin: /\$\B/ },
        {
          className: 'keyword',
          begin: /\$this/
        },
        { begin: /\$[\w\d][\w\d_:]*/ }
      ]
    };

    const LITERAL = {
      className: 'literal',
      begin: /\$(null|true|false)\b/
    };

    const QUOTE_STRING = {
      className: "string",
      variants: [
        {
          begin: /"/,
          end: /"/
        },
        {
          begin: /@"/,
          end: /^"@/
        }
      ],
      contains: [
        BACKTICK_ESCAPE,
        VAR,
        {
          className: 'variable',
          begin: /\$[A-z]/,
          end: /[^A-z]/
        }
      ]
    };

    const APOS_STRING = {
      className: 'string',
      variants: [
        {
          begin: /'/,
          end: /'/
        },
        {
          begin: /@'/,
          end: /^'@/
        }
      ]
    };

    const PS_HELPTAGS = {
      className: "doctag",
      variants: [
        /* no paramater help tags */
        { begin: /\.(synopsis|description|example|inputs|outputs|notes|link|component|role|functionality)/ },
        /* one parameter help tags */
        { begin: /\.(parameter|forwardhelptargetname|forwardhelpcategory|remotehelprunspace|externalhelp)\s+\S+/ }
      ]
    };

    const PS_COMMENT = hljs.inherit(
      hljs.COMMENT(null, null),
      {
        variants: [
          /* single-line comment */
          {
            begin: /#/,
            end: /$/
          },
          /* multi-line comment */
          {
            begin: /<#/,
            end: /#>/
          }
        ],
        contains: [ PS_HELPTAGS ]
      }
    );

    const CMDLETS = {
      className: 'built_in',
      variants: [ { begin: '('.concat(VALID_VERBS, ')+(-)[\\w\\d]+') } ]
    };

    const PS_CLASS = {
      className: 'class',
      beginKeywords: 'class enum',
      end: /\s*[{]/,
      excludeEnd: true,
      relevance: 0,
      contains: [ hljs.TITLE_MODE ]
    };

    const PS_FUNCTION = {
      className: 'function',
      begin: /function\s+/,
      end: /\s*\{|$/,
      excludeEnd: true,
      returnBegin: true,
      relevance: 0,
      contains: [
        {
          begin: "function",
          relevance: 0,
          className: "keyword"
        },
        {
          className: "title",
          begin: TITLE_NAME_RE,
          relevance: 0
        },
        {
          begin: /\(/,
          end: /\)/,
          className: "params",
          relevance: 0,
          contains: [ VAR ]
        }
        // CMDLETS
      ]
    };

    // Using statment, plus type, plus assembly name.
    const PS_USING = {
      begin: /using\s/,
      end: /$/,
      returnBegin: true,
      contains: [
        QUOTE_STRING,
        APOS_STRING,
        {
          className: 'keyword',
          begin: /(using|assembly|command|module|namespace|type)/
        }
      ]
    };

    // Comperison operators & function named parameters.
    const PS_ARGUMENTS = { variants: [
      // PS literals are pretty verbose so it's a good idea to accent them a bit.
      {
        className: 'operator',
        begin: '('.concat(COMPARISON_OPERATORS, ')\\b')
      },
      {
        className: 'literal',
        begin: /(-){1,2}[\w\d-]+/,
        relevance: 0
      }
    ] };

    const HASH_SIGNS = {
      className: 'selector-tag',
      begin: /@\B/,
      relevance: 0
    };

    // It's a very general rule so I'll narrow it a bit with some strict boundaries
    // to avoid any possible false-positive collisions!
    const PS_METHODS = {
      className: 'function',
      begin: /\[.*\]\s*[\w]+[ ]??\(/,
      end: /$/,
      returnBegin: true,
      relevance: 0,
      contains: [
        {
          className: 'keyword',
          begin: '('.concat(
            KEYWORDS.keyword.toString().replace(/\s/g, '|'
            ), ')\\b'),
          endsParent: true,
          relevance: 0
        },
        hljs.inherit(hljs.TITLE_MODE, { endsParent: true })
      ]
    };

    const GENTLEMANS_SET = [
      // STATIC_MEMBER,
      PS_METHODS,
      PS_COMMENT,
      BACKTICK_ESCAPE,
      hljs.NUMBER_MODE,
      QUOTE_STRING,
      APOS_STRING,
      // PS_NEW_OBJECT_TYPE,
      CMDLETS,
      VAR,
      LITERAL,
      HASH_SIGNS
    ];

    const PS_TYPE = {
      begin: /\[/,
      end: /\]/,
      excludeBegin: true,
      excludeEnd: true,
      relevance: 0,
      contains: [].concat(
        'self',
        GENTLEMANS_SET,
        {
          begin: "(" + TYPES.join("|") + ")",
          className: "built_in",
          relevance: 0
        },
        {
          className: 'type',
          begin: /[\.\w\d]+/,
          relevance: 0
        }
      )
    };

    PS_METHODS.contains.unshift(PS_TYPE);

    return {
      name: 'PowerShell',
      aliases: [
        "pwsh",
        "ps",
        "ps1"
      ],
      case_insensitive: true,
      keywords: KEYWORDS,
      contains: GENTLEMANS_SET.concat(
        PS_CLASS,
        PS_FUNCTION,
        PS_USING,
        PS_ARGUMENTS,
        PS_TYPE
      )
    };
  }

  return powershell;

})();

    hljs.registerLanguage('powershell', hljsGrammar);
  })();/*! `processing` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Processing
  Description: Processing is a flexible software sketchbook and a language for learning how to code within the context of the visual arts.
  Author: Erik Paluka <erik.paluka@gmail.com>
  Website: https://processing.org
  Category: graphics
  */

  function processing(hljs) {
    const regex = hljs.regex;
    const BUILT_INS = [
      "displayHeight",
      "displayWidth",
      "mouseY",
      "mouseX",
      "mousePressed",
      "pmouseX",
      "pmouseY",
      "key",
      "keyCode",
      "pixels",
      "focused",
      "frameCount",
      "frameRate",
      "height",
      "width",
      "size",
      "createGraphics",
      "beginDraw",
      "createShape",
      "loadShape",
      "PShape",
      "arc",
      "ellipse",
      "line",
      "point",
      "quad",
      "rect",
      "triangle",
      "bezier",
      "bezierDetail",
      "bezierPoint",
      "bezierTangent",
      "curve",
      "curveDetail",
      "curvePoint",
      "curveTangent",
      "curveTightness",
      "shape",
      "shapeMode",
      "beginContour",
      "beginShape",
      "bezierVertex",
      "curveVertex",
      "endContour",
      "endShape",
      "quadraticVertex",
      "vertex",
      "ellipseMode",
      "noSmooth",
      "rectMode",
      "smooth",
      "strokeCap",
      "strokeJoin",
      "strokeWeight",
      "mouseClicked",
      "mouseDragged",
      "mouseMoved",
      "mousePressed",
      "mouseReleased",
      "mouseWheel",
      "keyPressed",
      "keyPressedkeyReleased",
      "keyTyped",
      "print",
      "println",
      "save",
      "saveFrame",
      "day",
      "hour",
      "millis",
      "minute",
      "month",
      "second",
      "year",
      "background",
      "clear",
      "colorMode",
      "fill",
      "noFill",
      "noStroke",
      "stroke",
      "alpha",
      "blue",
      "brightness",
      "color",
      "green",
      "hue",
      "lerpColor",
      "red",
      "saturation",
      "modelX",
      "modelY",
      "modelZ",
      "screenX",
      "screenY",
      "screenZ",
      "ambient",
      "emissive",
      "shininess",
      "specular",
      "add",
      "createImage",
      "beginCamera",
      "camera",
      "endCamera",
      "frustum",
      "ortho",
      "perspective",
      "printCamera",
      "printProjection",
      "cursor",
      "frameRate",
      "noCursor",
      "exit",
      "loop",
      "noLoop",
      "popStyle",
      "pushStyle",
      "redraw",
      "binary",
      "boolean",
      "byte",
      "char",
      "float",
      "hex",
      "int",
      "str",
      "unbinary",
      "unhex",
      "join",
      "match",
      "matchAll",
      "nf",
      "nfc",
      "nfp",
      "nfs",
      "split",
      "splitTokens",
      "trim",
      "append",
      "arrayCopy",
      "concat",
      "expand",
      "reverse",
      "shorten",
      "sort",
      "splice",
      "subset",
      "box",
      "sphere",
      "sphereDetail",
      "createInput",
      "createReader",
      "loadBytes",
      "loadJSONArray",
      "loadJSONObject",
      "loadStrings",
      "loadTable",
      "loadXML",
      "open",
      "parseXML",
      "saveTable",
      "selectFolder",
      "selectInput",
      "beginRaw",
      "beginRecord",
      "createOutput",
      "createWriter",
      "endRaw",
      "endRecord",
      "PrintWritersaveBytes",
      "saveJSONArray",
      "saveJSONObject",
      "saveStream",
      "saveStrings",
      "saveXML",
      "selectOutput",
      "popMatrix",
      "printMatrix",
      "pushMatrix",
      "resetMatrix",
      "rotate",
      "rotateX",
      "rotateY",
      "rotateZ",
      "scale",
      "shearX",
      "shearY",
      "translate",
      "ambientLight",
      "directionalLight",
      "lightFalloff",
      "lights",
      "lightSpecular",
      "noLights",
      "normal",
      "pointLight",
      "spotLight",
      "image",
      "imageMode",
      "loadImage",
      "noTint",
      "requestImage",
      "tint",
      "texture",
      "textureMode",
      "textureWrap",
      "blend",
      "copy",
      "filter",
      "get",
      "loadPixels",
      "set",
      "updatePixels",
      "blendMode",
      "loadShader",
      "PShaderresetShader",
      "shader",
      "createFont",
      "loadFont",
      "text",
      "textFont",
      "textAlign",
      "textLeading",
      "textMode",
      "textSize",
      "textWidth",
      "textAscent",
      "textDescent",
      "abs",
      "ceil",
      "constrain",
      "dist",
      "exp",
      "floor",
      "lerp",
      "log",
      "mag",
      "map",
      "max",
      "min",
      "norm",
      "pow",
      "round",
      "sq",
      "sqrt",
      "acos",
      "asin",
      "atan",
      "atan2",
      "cos",
      "degrees",
      "radians",
      "sin",
      "tan",
      "noise",
      "noiseDetail",
      "noiseSeed",
      "random",
      "randomGaussian",
      "randomSeed"
    ];
    const IDENT = hljs.IDENT_RE;
    const FUNC_NAME = { variants: [
      {
        match: regex.concat(regex.either(...BUILT_INS), regex.lookahead(/\s*\(/)),
        className: "built_in"
      },
      {
        relevance: 0,
        match: regex.concat(
          /\b(?!for|if|while)/,
          IDENT, regex.lookahead(/\s*\(/)),
        className: "title.function"
      }
    ] };
    const NEW_CLASS = {
      match: [
        /new\s+/,
        IDENT
      ],
      className: {
        1: "keyword",
        2: "class.title"
      }
    };
    const PROPERTY = {
      relevance: 0,
      match: [
        /\./,
        IDENT
      ],
      className: { 2: "property" }
    };
    const CLASS = {
      variants: [
        { match: [
          /class/,
          /\s+/,
          IDENT,
          /\s+/,
          /extends/,
          /\s+/,
          IDENT
        ] },
        { match: [
          /class/,
          /\s+/,
          IDENT
        ] }
      ],
      className: {
        1: "keyword",
        3: "title.class",
        5: "keyword",
        7: "title.class.inherited"
      }
    };

    const TYPES = [
      "boolean",
      "byte",
      "char",
      "color",
      "double",
      "float",
      "int",
      "long",
      "short",
    ];
    const CLASSES = [
      "BufferedReader",
      "PVector",
      "PFont",
      "PImage",
      "PGraphics",
      "HashMap",
      "String",
      "Array",
      "FloatDict",
      "ArrayList",
      "FloatList",
      "IntDict",
      "IntList",
      "JSONArray",
      "JSONObject",
      "Object",
      "StringDict",
      "StringList",
      "Table",
      "TableRow",
      "XML"
    ];
    const JAVA_KEYWORDS = [
      "abstract",
      "assert",
      "break",
      "case",
      "catch",
      "const",
      "continue",
      "default",
      "else",
      "enum",
      "final",
      "finally",
      "for",
      "if",
      "import",
      "instanceof",
      "long",
      "native",
      "new",
      "package",
      "private",
      "private",
      "protected",
      "protected",
      "public",
      "public",
      "return",
      "static",
      "strictfp",
      "switch",
      "synchronized",
      "throw",
      "throws",
      "transient",
      "try",
      "void",
      "volatile",
      "while"
    ];

    return {
      name: 'Processing',
      aliases: [ 'pde' ],
      keywords: {
        keyword: [ ...JAVA_KEYWORDS ],
        literal: 'P2D P3D HALF_PI PI QUARTER_PI TAU TWO_PI null true false',
        title: 'setup draw',
        variable: "super this",
        built_in: [
          ...BUILT_INS,
          ...CLASSES
        ],
        type: TYPES
      },
      contains: [
        CLASS,
        NEW_CLASS,
        FUNC_NAME,
        PROPERTY,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.C_NUMBER_MODE
      ]
    };
  }

  return processing;

})();

    hljs.registerLanguage('processing', hljsGrammar);
  })();/*! `prolog` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Prolog
  Description: Prolog is a general purpose logic programming language associated with artificial intelligence and computational linguistics.
  Author: Raivo Laanemets <raivo@infdot.com>
  Website: https://en.wikipedia.org/wiki/Prolog
  Category: functional
  */

  function prolog(hljs) {
    const ATOM = {

      begin: /[a-z][A-Za-z0-9_]*/,
      relevance: 0
    };

    const VAR = {

      className: 'symbol',
      variants: [
        { begin: /[A-Z][a-zA-Z0-9_]*/ },
        { begin: /_[A-Za-z0-9_]*/ }
      ],
      relevance: 0
    };

    const PARENTED = {

      begin: /\(/,
      end: /\)/,
      relevance: 0
    };

    const LIST = {

      begin: /\[/,
      end: /\]/
    };

    const LINE_COMMENT = {

      className: 'comment',
      begin: /%/,
      end: /$/,
      contains: [ hljs.PHRASAL_WORDS_MODE ]
    };

    const BACKTICK_STRING = {

      className: 'string',
      begin: /`/,
      end: /`/,
      contains: [ hljs.BACKSLASH_ESCAPE ]
    };

    const CHAR_CODE = {
      className: 'string', // 0'a etc.
      begin: /0'(\\'|.)/
    };

    const SPACE_CODE = {
      className: 'string',
      begin: /0'\\s/ // 0'\s
    };

    const PRED_OP = { // relevance booster
      begin: /:-/ };

    const inner = [

      ATOM,
      VAR,
      PARENTED,
      PRED_OP,
      LIST,
      LINE_COMMENT,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.APOS_STRING_MODE,
      BACKTICK_STRING,
      CHAR_CODE,
      SPACE_CODE,
      hljs.C_NUMBER_MODE
    ];

    PARENTED.contains = inner;
    LIST.contains = inner;

    return {
      name: 'Prolog',
      contains: inner.concat([
        { // relevance booster
          begin: /\.$/ }
      ])
    };
  }

  return prolog;

})();

    hljs.registerLanguage('prolog', hljsGrammar);
  })();/*! `properties` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: .properties
  Contributors: Valentin Aitken <valentin@nalisbg.com>, Egor Rogov <e.rogov@postgrespro.ru>
  Website: https://en.wikipedia.org/wiki/.properties
  Category: config
  */

  /** @type LanguageFn */
  function properties(hljs) {
    // whitespaces: space, tab, formfeed
    const WS0 = '[ \\t\\f]*';
    const WS1 = '[ \\t\\f]+';
    // delimiter
    const EQUAL_DELIM = WS0 + '[:=]' + WS0;
    const WS_DELIM = WS1;
    const DELIM = '(' + EQUAL_DELIM + '|' + WS_DELIM + ')';
    const KEY = '([^\\\\:= \\t\\f\\n]|\\\\.)+';

    const DELIM_AND_VALUE = {
      // skip DELIM
      end: DELIM,
      relevance: 0,
      starts: {
        // value: everything until end of line (again, taking into account backslashes)
        className: 'string',
        end: /$/,
        relevance: 0,
        contains: [
          { begin: '\\\\\\\\' },
          { begin: '\\\\\\n' }
        ]
      }
    };

    return {
      name: '.properties',
      disableAutodetect: true,
      case_insensitive: true,
      illegal: /\S/,
      contains: [
        hljs.COMMENT('^\\s*[!#]', '$'),
        // key: everything until whitespace or = or : (taking into account backslashes)
        // case of a key-value pair
        {
          returnBegin: true,
          variants: [
            { begin: KEY + EQUAL_DELIM },
            { begin: KEY + WS_DELIM }
          ],
          contains: [
            {
              className: 'attr',
              begin: KEY,
              endsParent: true
            }
          ],
          starts: DELIM_AND_VALUE
        },
        // case of an empty key
        {
          className: 'attr',
          begin: KEY + WS0 + '$'
        }
      ]
    };
  }

  return properties;

})();

    hljs.registerLanguage('properties', hljsGrammar);
  })();/*! `protobuf` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Protocol Buffers
  Author: Dan Tao <daniel.tao@gmail.com>
  Description: Protocol buffer message definition format
  Website: https://developers.google.com/protocol-buffers/docs/proto3
  Category: protocols
  */

  function protobuf(hljs) {
    const KEYWORDS = [
      "package",
      "import",
      "option",
      "optional",
      "required",
      "repeated",
      "group",
      "oneof"
    ];
    const TYPES = [
      "double",
      "float",
      "int32",
      "int64",
      "uint32",
      "uint64",
      "sint32",
      "sint64",
      "fixed32",
      "fixed64",
      "sfixed32",
      "sfixed64",
      "bool",
      "string",
      "bytes"
    ];
    const CLASS_DEFINITION = {
      match: [
        /(message|enum|service)\s+/,
        hljs.IDENT_RE
      ],
      scope: {
        1: "keyword",
        2: "title.class"
      }
    };

    return {
      name: 'Protocol Buffers',
      aliases: ['proto'],
      keywords: {
        keyword: KEYWORDS,
        type: TYPES,
        literal: [
          'true',
          'false'
        ]
      },
      contains: [
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        CLASS_DEFINITION,
        {
          className: 'function',
          beginKeywords: 'rpc',
          end: /[{;]/,
          excludeEnd: true,
          keywords: 'rpc returns'
        },
        { // match enum items (relevance)
          // BLAH = ...;
          begin: /^\s*[A-Z_]+(?=\s*=[^\n]+;$)/ }
      ]
    };
  }

  return protobuf;

})();

    hljs.registerLanguage('protobuf', hljsGrammar);
  })();/*! `python` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Python
  Description: Python is an interpreted, object-oriented, high-level programming language with dynamic semantics.
  Website: https://www.python.org
  Category: common
  */

  function python(hljs) {
    const regex = hljs.regex;
    const IDENT_RE = /[\p{XID_Start}_]\p{XID_Continue}*/u;
    const RESERVED_WORDS = [
      'and',
      'as',
      'assert',
      'async',
      'await',
      'break',
      'case',
      'class',
      'continue',
      'def',
      'del',
      'elif',
      'else',
      'except',
      'finally',
      'for',
      'from',
      'global',
      'if',
      'import',
      'in',
      'is',
      'lambda',
      'match',
      'nonlocal|10',
      'not',
      'or',
      'pass',
      'raise',
      'return',
      'try',
      'while',
      'with',
      'yield'
    ];

    const BUILT_INS = [
      '__import__',
      'abs',
      'all',
      'any',
      'ascii',
      'bin',
      'bool',
      'breakpoint',
      'bytearray',
      'bytes',
      'callable',
      'chr',
      'classmethod',
      'compile',
      'complex',
      'delattr',
      'dict',
      'dir',
      'divmod',
      'enumerate',
      'eval',
      'exec',
      'filter',
      'float',
      'format',
      'frozenset',
      'getattr',
      'globals',
      'hasattr',
      'hash',
      'help',
      'hex',
      'id',
      'input',
      'int',
      'isinstance',
      'issubclass',
      'iter',
      'len',
      'list',
      'locals',
      'map',
      'max',
      'memoryview',
      'min',
      'next',
      'object',
      'oct',
      'open',
      'ord',
      'pow',
      'print',
      'property',
      'range',
      'repr',
      'reversed',
      'round',
      'set',
      'setattr',
      'slice',
      'sorted',
      'staticmethod',
      'str',
      'sum',
      'super',
      'tuple',
      'type',
      'vars',
      'zip'
    ];

    const LITERALS = [
      '__debug__',
      'Ellipsis',
      'False',
      'None',
      'NotImplemented',
      'True'
    ];

    // https://docs.python.org/3/library/typing.html
    // TODO: Could these be supplemented by a CamelCase matcher in certain
    // contexts, leaving these remaining only for relevance hinting?
    const TYPES = [
      "Any",
      "Callable",
      "Coroutine",
      "Dict",
      "List",
      "Literal",
      "Generic",
      "Optional",
      "Sequence",
      "Set",
      "Tuple",
      "Type",
      "Union"
    ];

    const KEYWORDS = {
      $pattern: /[A-Za-z]\w+|__\w+__/,
      keyword: RESERVED_WORDS,
      built_in: BUILT_INS,
      literal: LITERALS,
      type: TYPES
    };

    const PROMPT = {
      className: 'meta',
      begin: /^(>>>|\.\.\.) /
    };

    const SUBST = {
      className: 'subst',
      begin: /\{/,
      end: /\}/,
      keywords: KEYWORDS,
      illegal: /#/
    };

    const LITERAL_BRACKET = {
      begin: /\{\{/,
      relevance: 0
    };

    const STRING = {
      className: 'string',
      contains: [ hljs.BACKSLASH_ESCAPE ],
      variants: [
        {
          begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
          end: /'''/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            PROMPT
          ],
          relevance: 10
        },
        {
          begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
          end: /"""/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            PROMPT
          ],
          relevance: 10
        },
        {
          begin: /([fF][rR]|[rR][fF]|[fF])'''/,
          end: /'''/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            PROMPT,
            LITERAL_BRACKET,
            SUBST
          ]
        },
        {
          begin: /([fF][rR]|[rR][fF]|[fF])"""/,
          end: /"""/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            PROMPT,
            LITERAL_BRACKET,
            SUBST
          ]
        },
        {
          begin: /([uU]|[rR])'/,
          end: /'/,
          relevance: 10
        },
        {
          begin: /([uU]|[rR])"/,
          end: /"/,
          relevance: 10
        },
        {
          begin: /([bB]|[bB][rR]|[rR][bB])'/,
          end: /'/
        },
        {
          begin: /([bB]|[bB][rR]|[rR][bB])"/,
          end: /"/
        },
        {
          begin: /([fF][rR]|[rR][fF]|[fF])'/,
          end: /'/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            LITERAL_BRACKET,
            SUBST
          ]
        },
        {
          begin: /([fF][rR]|[rR][fF]|[fF])"/,
          end: /"/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            LITERAL_BRACKET,
            SUBST
          ]
        },
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE
      ]
    };

    // https://docs.python.org/3.9/reference/lexical_analysis.html#numeric-literals
    const digitpart = '[0-9](_?[0-9])*';
    const pointfloat = `(\\b(${digitpart}))?\\.(${digitpart})|\\b(${digitpart})\\.`;
    // Whitespace after a number (or any lexical token) is needed only if its absence
    // would change the tokenization
    // https://docs.python.org/3.9/reference/lexical_analysis.html#whitespace-between-tokens
    // We deviate slightly, requiring a word boundary or a keyword
    // to avoid accidentally recognizing *prefixes* (e.g., `0` in `0x41` or `08` or `0__1`)
    const lookahead = `\\b|${RESERVED_WORDS.join('|')}`;
    const NUMBER = {
      className: 'number',
      relevance: 0,
      variants: [
        // exponentfloat, pointfloat
        // https://docs.python.org/3.9/reference/lexical_analysis.html#floating-point-literals
        // optionally imaginary
        // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
        // Note: no leading \b because floats can start with a decimal point
        // and we don't want to mishandle e.g. `fn(.5)`,
        // no trailing \b for pointfloat because it can end with a decimal point
        // and we don't want to mishandle e.g. `0..hex()`; this should be safe
        // because both MUST contain a decimal point and so cannot be confused with
        // the interior part of an identifier
        {
          begin: `(\\b(${digitpart})|(${pointfloat}))[eE][+-]?(${digitpart})[jJ]?(?=${lookahead})`
        },
        {
          begin: `(${pointfloat})[jJ]?`
        },

        // decinteger, bininteger, octinteger, hexinteger
        // https://docs.python.org/3.9/reference/lexical_analysis.html#integer-literals
        // optionally "long" in Python 2
        // https://docs.python.org/2.7/reference/lexical_analysis.html#integer-and-long-integer-literals
        // decinteger is optionally imaginary
        // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
        {
          begin: `\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${lookahead})`
        },
        {
          begin: `\\b0[bB](_?[01])+[lL]?(?=${lookahead})`
        },
        {
          begin: `\\b0[oO](_?[0-7])+[lL]?(?=${lookahead})`
        },
        {
          begin: `\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${lookahead})`
        },

        // imagnumber (digitpart-based)
        // https://docs.python.org/3.9/reference/lexical_analysis.html#imaginary-literals
        {
          begin: `\\b(${digitpart})[jJ](?=${lookahead})`
        }
      ]
    };
    const COMMENT_TYPE = {
      className: "comment",
      begin: regex.lookahead(/# type:/),
      end: /$/,
      keywords: KEYWORDS,
      contains: [
        { // prevent keywords from coloring `type`
          begin: /# type:/
        },
        // comment within a datatype comment includes no keywords
        {
          begin: /#/,
          end: /\b\B/,
          endsWithParent: true
        }
      ]
    };
    const PARAMS = {
      className: 'params',
      variants: [
        // Exclude params in functions without params
        {
          className: "",
          begin: /\(\s*\)/,
          skip: true
        },
        {
          begin: /\(/,
          end: /\)/,
          excludeBegin: true,
          excludeEnd: true,
          keywords: KEYWORDS,
          contains: [
            'self',
            PROMPT,
            NUMBER,
            STRING,
            hljs.HASH_COMMENT_MODE
          ]
        }
      ]
    };
    SUBST.contains = [
      STRING,
      NUMBER,
      PROMPT
    ];

    return {
      name: 'Python',
      aliases: [
        'py',
        'gyp',
        'ipython'
      ],
      unicodeRegex: true,
      keywords: KEYWORDS,
      illegal: /(<\/|\?)|=>/,
      contains: [
        PROMPT,
        NUMBER,
        {
          // very common convention
          begin: /\bself\b/
        },
        {
          // eat "if" prior to string so that it won't accidentally be
          // labeled as an f-string
          beginKeywords: "if",
          relevance: 0
        },
        { match: /\bor\b/, scope: "keyword" },
        STRING,
        COMMENT_TYPE,
        hljs.HASH_COMMENT_MODE,
        {
          match: [
            /\bdef/, /\s+/,
            IDENT_RE,
          ],
          scope: {
            1: "keyword",
            3: "title.function"
          },
          contains: [ PARAMS ]
        },
        {
          variants: [
            {
              match: [
                /\bclass/, /\s+/,
                IDENT_RE, /\s*/,
                /\(\s*/, IDENT_RE,/\s*\)/
              ],
            },
            {
              match: [
                /\bclass/, /\s+/,
                IDENT_RE
              ],
            }
          ],
          scope: {
            1: "keyword",
            3: "title.class",
            6: "title.class.inherited",
          }
        },
        {
          className: 'meta',
          begin: /^[\t ]*@/,
          end: /(?=#)|$/,
          contains: [
            NUMBER,
            PARAMS,
            STRING
          ]
        }
      ]
    };
  }

  return python;

})();

    hljs.registerLanguage('python', hljsGrammar);
  })();/*! `python-repl` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Python REPL
  Requires: python.js
  Author: Josh Goebel <hello@joshgoebel.com>
  Category: common
  */

  function pythonRepl(hljs) {
    return {
      aliases: [ 'pycon' ],
      contains: [
        {
          className: 'meta.prompt',
          starts: {
            // a space separates the REPL prefix from the actual code
            // this is purely for cleaner HTML output
            end: / |$/,
            starts: {
              end: '$',
              subLanguage: 'python'
            }
          },
          variants: [
            { begin: /^>>>(?=[ ]|$)/ },
            { begin: /^\.\.\.(?=[ ]|$)/ }
          ]
        }
      ]
    };
  }

  return pythonRepl;

})();

    hljs.registerLanguage('python-repl', hljsGrammar);
  })();/*! `r` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: R
  Description: R is a free software environment for statistical computing and graphics.
  Author: Joe Cheng <joe@rstudio.org>
  Contributors: Konrad Rudolph <konrad.rudolph@gmail.com>
  Website: https://www.r-project.org
  Category: common,scientific
  */

  /** @type LanguageFn */
  function r(hljs) {
    const regex = hljs.regex;
    // Identifiers in R cannot start with `_`, but they can start with `.` if it
    // is not immediately followed by a digit.
    // R also supports quoted identifiers, which are near-arbitrary sequences
    // delimited by backticks (`…`), which may contain escape sequences. These are
    // handled in a separate mode. See `test/markup/r/names.txt` for examples.
    // FIXME: Support Unicode identifiers.
    const IDENT_RE = /(?:(?:[a-zA-Z]|\.[._a-zA-Z])[._a-zA-Z0-9]*)|\.(?!\d)/;
    const NUMBER_TYPES_RE = regex.either(
      // Special case: only hexadecimal binary powers can contain fractions
      /0[xX][0-9a-fA-F]+\.[0-9a-fA-F]*[pP][+-]?\d+i?/,
      // Hexadecimal numbers without fraction and optional binary power
      /0[xX][0-9a-fA-F]+(?:[pP][+-]?\d+)?[Li]?/,
      // Decimal numbers
      /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[Li]?/
    );
    const OPERATORS_RE = /[=!<>:]=|\|\||&&|:::?|<-|<<-|->>|->|\|>|[-+*\/?!$&|:<=>@^~]|\*\*/;
    const PUNCTUATION_RE = regex.either(
      /[()]/,
      /[{}]/,
      /\[\[/,
      /[[\]]/,
      /\\/,
      /,/
    );

    return {
      name: 'R',

      keywords: {
        $pattern: IDENT_RE,
        keyword:
          'function if in break next repeat else for while',
        literal:
          'NULL NA TRUE FALSE Inf NaN NA_integer_|10 NA_real_|10 '
          + 'NA_character_|10 NA_complex_|10',
        built_in:
          // Builtin constants
          'LETTERS letters month.abb month.name pi T F '
          // Primitive functions
          // These are all the functions in `base` that are implemented as a
          // `.Primitive`, minus those functions that are also keywords.
          + 'abs acos acosh all any anyNA Arg as.call as.character '
          + 'as.complex as.double as.environment as.integer as.logical '
          + 'as.null.default as.numeric as.raw asin asinh atan atanh attr '
          + 'attributes baseenv browser c call ceiling class Conj cos cosh '
          + 'cospi cummax cummin cumprod cumsum digamma dim dimnames '
          + 'emptyenv exp expression floor forceAndCall gamma gc.time '
          + 'globalenv Im interactive invisible is.array is.atomic is.call '
          + 'is.character is.complex is.double is.environment is.expression '
          + 'is.finite is.function is.infinite is.integer is.language '
          + 'is.list is.logical is.matrix is.na is.name is.nan is.null '
          + 'is.numeric is.object is.pairlist is.raw is.recursive is.single '
          + 'is.symbol lazyLoadDBfetch length lgamma list log max min '
          + 'missing Mod names nargs nzchar oldClass on.exit pos.to.env '
          + 'proc.time prod quote range Re rep retracemem return round '
          + 'seq_along seq_len seq.int sign signif sin sinh sinpi sqrt '
          + 'standardGeneric substitute sum switch tan tanh tanpi tracemem '
          + 'trigamma trunc unclass untracemem UseMethod xtfrm',
      },

      contains: [
        // Roxygen comments
        hljs.COMMENT(
          /#'/,
          /$/,
          { contains: [
            {
              // Handle `@examples` separately to cause all subsequent code
              // until the next `@`-tag on its own line to be kept as-is,
              // preventing highlighting. This code is example R code, so nested
              // doctags shouldn’t be treated as such. See
              // `test/markup/r/roxygen.txt` for an example.
              scope: 'doctag',
              match: /@examples/,
              starts: {
                end: regex.lookahead(regex.either(
                  // end if another doc comment
                  /\n^#'\s*(?=@[a-zA-Z]+)/,
                  // or a line with no comment
                  /\n^(?!#')/
                )),
                endsParent: true
              }
            },
            {
              // Handle `@param` to highlight the parameter name following
              // after.
              scope: 'doctag',
              begin: '@param',
              end: /$/,
              contains: [
                {
                  scope: 'variable',
                  variants: [
                    { match: IDENT_RE },
                    { match: /`(?:\\.|[^`\\])+`/ }
                  ],
                  endsParent: true
                }
              ]
            },
            {
              scope: 'doctag',
              match: /@[a-zA-Z]+/
            },
            {
              scope: 'keyword',
              match: /\\[a-zA-Z]+/
            }
          ] }
        ),

        hljs.HASH_COMMENT_MODE,

        {
          scope: 'string',
          contains: [ hljs.BACKSLASH_ESCAPE ],
          variants: [
            hljs.END_SAME_AS_BEGIN({
              begin: /[rR]"(-*)\(/,
              end: /\)(-*)"/
            }),
            hljs.END_SAME_AS_BEGIN({
              begin: /[rR]"(-*)\{/,
              end: /\}(-*)"/
            }),
            hljs.END_SAME_AS_BEGIN({
              begin: /[rR]"(-*)\[/,
              end: /\](-*)"/
            }),
            hljs.END_SAME_AS_BEGIN({
              begin: /[rR]'(-*)\(/,
              end: /\)(-*)'/
            }),
            hljs.END_SAME_AS_BEGIN({
              begin: /[rR]'(-*)\{/,
              end: /\}(-*)'/
            }),
            hljs.END_SAME_AS_BEGIN({
              begin: /[rR]'(-*)\[/,
              end: /\](-*)'/
            }),
            {
              begin: '"',
              end: '"',
              relevance: 0
            },
            {
              begin: "'",
              end: "'",
              relevance: 0
            }
          ],
        },

        // Matching numbers immediately following punctuation and operators is
        // tricky since we need to look at the character ahead of a number to
        // ensure the number is not part of an identifier, and we cannot use
        // negative look-behind assertions. So instead we explicitly handle all
        // possible combinations of (operator|punctuation), number.
        // TODO: replace with negative look-behind when available
        // { begin: /(?<![a-zA-Z0-9._])0[xX][0-9a-fA-F]+\.[0-9a-fA-F]*[pP][+-]?\d+i?/ },
        // { begin: /(?<![a-zA-Z0-9._])0[xX][0-9a-fA-F]+([pP][+-]?\d+)?[Li]?/ },
        // { begin: /(?<![a-zA-Z0-9._])(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?[Li]?/ }
        {
          relevance: 0,
          variants: [
            {
              scope: {
                1: 'operator',
                2: 'number'
              },
              match: [
                OPERATORS_RE,
                NUMBER_TYPES_RE
              ]
            },
            {
              scope: {
                1: 'operator',
                2: 'number'
              },
              match: [
                /%[^%]*%/,
                NUMBER_TYPES_RE
              ]
            },
            {
              scope: {
                1: 'punctuation',
                2: 'number'
              },
              match: [
                PUNCTUATION_RE,
                NUMBER_TYPES_RE
              ]
            },
            {
              scope: { 2: 'number' },
              match: [
                /[^a-zA-Z0-9._]|^/, // not part of an identifier, or start of document
                NUMBER_TYPES_RE
              ]
            }
          ]
        },

        // Operators/punctuation when they're not directly followed by numbers
        {
          // Relevance boost for the most common assignment form.
          scope: { 3: 'operator' },
          match: [
            IDENT_RE,
            /\s+/,
            /<-/,
            /\s+/
          ]
        },

        {
          scope: 'operator',
          relevance: 0,
          variants: [
            { match: OPERATORS_RE },
            { match: /%[^%]*%/ }
          ]
        },

        {
          scope: 'punctuation',
          relevance: 0,
          match: PUNCTUATION_RE
        },

        {
          // Escaped identifier
          begin: '`',
          end: '`',
          contains: [ { begin: /\\./ } ]
        }
      ]
    };
  }

  return r;

})();

    hljs.registerLanguage('r', hljsGrammar);
  })();/*! `rib` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: RenderMan RIB
  Author: Konstantin Evdokimenko <qewerty@gmail.com>
  Contributors: Shuen-Huei Guan <drake.guan@gmail.com>
  Website: https://renderman.pixar.com/resources/RenderMan_20/ribBinding.html
  Category: graphics
  */

  function rib(hljs) {
    return {
      name: 'RenderMan RIB',
      keywords:
        'ArchiveRecord AreaLightSource Atmosphere Attribute AttributeBegin AttributeEnd Basis '
        + 'Begin Blobby Bound Clipping ClippingPlane Color ColorSamples ConcatTransform Cone '
        + 'CoordinateSystem CoordSysTransform CropWindow Curves Cylinder DepthOfField Detail '
        + 'DetailRange Disk Displacement Display End ErrorHandler Exposure Exterior Format '
        + 'FrameAspectRatio FrameBegin FrameEnd GeneralPolygon GeometricApproximation Geometry '
        + 'Hider Hyperboloid Identity Illuminate Imager Interior LightSource '
        + 'MakeCubeFaceEnvironment MakeLatLongEnvironment MakeShadow MakeTexture Matte '
        + 'MotionBegin MotionEnd NuPatch ObjectBegin ObjectEnd ObjectInstance Opacity Option '
        + 'Orientation Paraboloid Patch PatchMesh Perspective PixelFilter PixelSamples '
        + 'PixelVariance Points PointsGeneralPolygons PointsPolygons Polygon Procedural Projection '
        + 'Quantize ReadArchive RelativeDetail ReverseOrientation Rotate Scale ScreenWindow '
        + 'ShadingInterpolation ShadingRate Shutter Sides Skew SolidBegin SolidEnd Sphere '
        + 'SubdivisionMesh Surface TextureCoordinates Torus Transform TransformBegin TransformEnd '
        + 'TransformPoints Translate TrimCurve WorldBegin WorldEnd',
      illegal: '</',
      contains: [
        hljs.HASH_COMMENT_MODE,
        hljs.C_NUMBER_MODE,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE
      ]
    };
  }

  return rib;

})();

    hljs.registerLanguage('rib', hljsGrammar);
  })();/*! `rsl` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: RenderMan RSL
  Author: Konstantin Evdokimenko <qewerty@gmail.com>
  Contributors: Shuen-Huei Guan <drake.guan@gmail.com>
  Website: https://renderman.pixar.com/resources/RenderMan_20/shadingLanguage.html
  Category: graphics
  */

  function rsl(hljs) {
    const BUILT_INS = [
      "abs",
      "acos",
      "ambient",
      "area",
      "asin",
      "atan",
      "atmosphere",
      "attribute",
      "calculatenormal",
      "ceil",
      "cellnoise",
      "clamp",
      "comp",
      "concat",
      "cos",
      "degrees",
      "depth",
      "Deriv",
      "diffuse",
      "distance",
      "Du",
      "Dv",
      "environment",
      "exp",
      "faceforward",
      "filterstep",
      "floor",
      "format",
      "fresnel",
      "incident",
      "length",
      "lightsource",
      "log",
      "match",
      "max",
      "min",
      "mod",
      "noise",
      "normalize",
      "ntransform",
      "opposite",
      "option",
      "phong",
      "pnoise",
      "pow",
      "printf",
      "ptlined",
      "radians",
      "random",
      "reflect",
      "refract",
      "renderinfo",
      "round",
      "setcomp",
      "setxcomp",
      "setycomp",
      "setzcomp",
      "shadow",
      "sign",
      "sin",
      "smoothstep",
      "specular",
      "specularbrdf",
      "spline",
      "sqrt",
      "step",
      "tan",
      "texture",
      "textureinfo",
      "trace",
      "transform",
      "vtransform",
      "xcomp",
      "ycomp",
      "zcomp"
    ];

    const TYPES = [
      "matrix",
      "float",
      "color",
      "point",
      "normal",
      "vector"
    ];

    const KEYWORDS = [
      "while",
      "for",
      "if",
      "do",
      "return",
      "else",
      "break",
      "extern",
      "continue"
    ];

    const CLASS_DEFINITION = {
      match: [
        /(surface|displacement|light|volume|imager)/,
        /\s+/,
        hljs.IDENT_RE,
      ],
      scope: {
        1: "keyword",
        3: "title.class",
      }
    };

    return {
      name: 'RenderMan RSL',
      keywords: {
        keyword: KEYWORDS,
        built_in: BUILT_INS,
        type: TYPES
      },
      illegal: '</',
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.APOS_STRING_MODE,
        hljs.C_NUMBER_MODE,
        {
          className: 'meta',
          begin: '#',
          end: '$'
        },
        CLASS_DEFINITION,
        {
          beginKeywords: 'illuminate illuminance gather',
          end: '\\('
        }
      ]
    };
  }

  return rsl;

})();

    hljs.registerLanguage('rsl', hljsGrammar);
  })();/*! `ruby` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Ruby
  Description: Ruby is a dynamic, open source programming language with a focus on simplicity and productivity.
  Website: https://www.ruby-lang.org/
  Author: Anton Kovalyov <anton@kovalyov.net>
  Contributors: Peter Leonov <gojpeg@yandex.ru>, Vasily Polovnyov <vast@whiteants.net>, Loren Segal <lsegal@soen.ca>, Pascal Hurni <phi@ruby-reactive.org>, Cedric Sohrauer <sohrauer@googlemail.com>
  Category: common, scripting
  */

  function ruby(hljs) {
    const regex = hljs.regex;
    const RUBY_METHOD_RE = '([a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?)';
    // TODO: move concepts like CAMEL_CASE into `modes.js`
    const CLASS_NAME_RE = regex.either(
      /\b([A-Z]+[a-z0-9]+)+/,
      // ends in caps
      /\b([A-Z]+[a-z0-9]+)+[A-Z]+/,
    )
    ;
    const CLASS_NAME_WITH_NAMESPACE_RE = regex.concat(CLASS_NAME_RE, /(::\w+)*/);
    // very popular ruby built-ins that one might even assume
    // are actual keywords (despite that not being the case)
    const PSEUDO_KWS = [
      "include",
      "extend",
      "prepend",
      "public",
      "private",
      "protected",
      "raise",
      "throw"
    ];
    const RUBY_KEYWORDS = {
      "variable.constant": [
        "__FILE__",
        "__LINE__",
        "__ENCODING__"
      ],
      "variable.language": [
        "self",
        "super",
      ],
      keyword: [
        "alias",
        "and",
        "begin",
        "BEGIN",
        "break",
        "case",
        "class",
        "defined",
        "do",
        "else",
        "elsif",
        "end",
        "END",
        "ensure",
        "for",
        "if",
        "in",
        "module",
        "next",
        "not",
        "or",
        "redo",
        "require",
        "rescue",
        "retry",
        "return",
        "then",
        "undef",
        "unless",
        "until",
        "when",
        "while",
        "yield",
        ...PSEUDO_KWS
      ],
      built_in: [
        "proc",
        "lambda",
        "attr_accessor",
        "attr_reader",
        "attr_writer",
        "define_method",
        "private_constant",
        "module_function"
      ],
      literal: [
        "true",
        "false",
        "nil"
      ]
    };
    const YARDOCTAG = {
      className: 'doctag',
      begin: '@[A-Za-z]+'
    };
    const IRB_OBJECT = {
      begin: '#<',
      end: '>'
    };
    const COMMENT_MODES = [
      hljs.COMMENT(
        '#',
        '$',
        { contains: [ YARDOCTAG ] }
      ),
      hljs.COMMENT(
        '^=begin',
        '^=end',
        {
          contains: [ YARDOCTAG ],
          relevance: 10
        }
      ),
      hljs.COMMENT('^__END__', hljs.MATCH_NOTHING_RE)
    ];
    const SUBST = {
      className: 'subst',
      begin: /#\{/,
      end: /\}/,
      keywords: RUBY_KEYWORDS
    };
    const STRING = {
      className: 'string',
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ],
      variants: [
        {
          begin: /'/,
          end: /'/
        },
        {
          begin: /"/,
          end: /"/
        },
        {
          begin: /`/,
          end: /`/
        },
        {
          begin: /%[qQwWx]?\(/,
          end: /\)/
        },
        {
          begin: /%[qQwWx]?\[/,
          end: /\]/
        },
        {
          begin: /%[qQwWx]?\{/,
          end: /\}/
        },
        {
          begin: /%[qQwWx]?</,
          end: />/
        },
        {
          begin: /%[qQwWx]?\//,
          end: /\//
        },
        {
          begin: /%[qQwWx]?%/,
          end: /%/
        },
        {
          begin: /%[qQwWx]?-/,
          end: /-/
        },
        {
          begin: /%[qQwWx]?\|/,
          end: /\|/
        },
        // in the following expressions, \B in the beginning suppresses recognition of ?-sequences
        // where ? is the last character of a preceding identifier, as in: `func?4`
        { begin: /\B\?(\\\d{1,3})/ },
        { begin: /\B\?(\\x[A-Fa-f0-9]{1,2})/ },
        { begin: /\B\?(\\u\{?[A-Fa-f0-9]{1,6}\}?)/ },
        { begin: /\B\?(\\M-\\C-|\\M-\\c|\\c\\M-|\\M-|\\C-\\M-)[\x20-\x7e]/ },
        { begin: /\B\?\\(c|C-)[\x20-\x7e]/ },
        { begin: /\B\?\\?\S/ },
        // heredocs
        {
          // this guard makes sure that we have an entire heredoc and not a false
          // positive (auto-detect, etc.)
          begin: regex.concat(
            /<<[-~]?'?/,
            regex.lookahead(/(\w+)(?=\W)[^\n]*\n(?:[^\n]*\n)*?\s*\1\b/)
          ),
          contains: [
            hljs.END_SAME_AS_BEGIN({
              begin: /(\w+)/,
              end: /(\w+)/,
              contains: [
                hljs.BACKSLASH_ESCAPE,
                SUBST
              ]
            })
          ]
        }
      ]
    };

    // Ruby syntax is underdocumented, but this grammar seems to be accurate
    // as of version 2.7.2 (confirmed with (irb and `Ripper.sexp(...)`)
    // https://docs.ruby-lang.org/en/2.7.0/doc/syntax/literals_rdoc.html#label-Numbers
    const decimal = '[1-9](_?[0-9])*|0';
    const digits = '[0-9](_?[0-9])*';
    const NUMBER = {
      className: 'number',
      relevance: 0,
      variants: [
        // decimal integer/float, optionally exponential or rational, optionally imaginary
        { begin: `\\b(${decimal})(\\.(${digits}))?([eE][+-]?(${digits})|r)?i?\\b` },

        // explicit decimal/binary/octal/hexadecimal integer,
        // optionally rational and/or imaginary
        { begin: "\\b0[dD][0-9](_?[0-9])*r?i?\\b" },
        { begin: "\\b0[bB][0-1](_?[0-1])*r?i?\\b" },
        { begin: "\\b0[oO][0-7](_?[0-7])*r?i?\\b" },
        { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*r?i?\\b" },

        // 0-prefixed implicit octal integer, optionally rational and/or imaginary
        { begin: "\\b0(_?[0-7])+r?i?\\b" }
      ]
    };

    const PARAMS = {
      variants: [
        {
          match: /\(\)/,
        },
        {
          className: 'params',
          begin: /\(/,
          end: /(?=\))/,
          excludeBegin: true,
          endsParent: true,
          keywords: RUBY_KEYWORDS,
        }
      ]
    };

    const INCLUDE_EXTEND = {
      match: [
        /(include|extend)\s+/,
        CLASS_NAME_WITH_NAMESPACE_RE
      ],
      scope: {
        2: "title.class"
      },
      keywords: RUBY_KEYWORDS
    };

    const CLASS_DEFINITION = {
      variants: [
        {
          match: [
            /class\s+/,
            CLASS_NAME_WITH_NAMESPACE_RE,
            /\s+<\s+/,
            CLASS_NAME_WITH_NAMESPACE_RE
          ]
        },
        {
          match: [
            /\b(class|module)\s+/,
            CLASS_NAME_WITH_NAMESPACE_RE
          ]
        }
      ],
      scope: {
        2: "title.class",
        4: "title.class.inherited"
      },
      keywords: RUBY_KEYWORDS
    };

    const UPPER_CASE_CONSTANT = {
      relevance: 0,
      match: /\b[A-Z][A-Z_0-9]+\b/,
      className: "variable.constant"
    };

    const METHOD_DEFINITION = {
      match: [
        /def/, /\s+/,
        RUBY_METHOD_RE
      ],
      scope: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        PARAMS
      ]
    };

    const OBJECT_CREATION = {
      relevance: 0,
      match: [
        CLASS_NAME_WITH_NAMESPACE_RE,
        /\.new[. (]/
      ],
      scope: {
        1: "title.class"
      }
    };

    // CamelCase
    const CLASS_REFERENCE = {
      relevance: 0,
      match: CLASS_NAME_RE,
      scope: "title.class"
    };

    const RUBY_DEFAULT_CONTAINS = [
      STRING,
      CLASS_DEFINITION,
      INCLUDE_EXTEND,
      OBJECT_CREATION,
      UPPER_CASE_CONSTANT,
      CLASS_REFERENCE,
      METHOD_DEFINITION,
      {
        // swallow namespace qualifiers before symbols
        begin: hljs.IDENT_RE + '::' },
      {
        className: 'symbol',
        begin: hljs.UNDERSCORE_IDENT_RE + '(!|\\?)?:',
        relevance: 0
      },
      {
        className: 'symbol',
        begin: ':(?!\\s)',
        contains: [
          STRING,
          { begin: RUBY_METHOD_RE }
        ],
        relevance: 0
      },
      NUMBER,
      {
        // negative-look forward attempts to prevent false matches like:
        // @ident@ or $ident$ that might indicate this is not ruby at all
        className: "variable",
        begin: '(\\$\\W)|((\\$|@@?)(\\w+))(?=[^@$?])' + `(?![A-Za-z])(?![@$?'])`
      },
      {
        className: 'params',
        begin: /\|/,
        end: /\|/,
        excludeBegin: true,
        excludeEnd: true,
        relevance: 0, // this could be a lot of things (in other languages) other than params
        keywords: RUBY_KEYWORDS
      },
      { // regexp container
        begin: '(' + hljs.RE_STARTERS_RE + '|unless)\\s*',
        keywords: 'unless',
        contains: [
          {
            className: 'regexp',
            contains: [
              hljs.BACKSLASH_ESCAPE,
              SUBST
            ],
            illegal: /\n/,
            variants: [
              {
                begin: '/',
                end: '/[a-z]*'
              },
              {
                begin: /%r\{/,
                end: /\}[a-z]*/
              },
              {
                begin: '%r\\(',
                end: '\\)[a-z]*'
              },
              {
                begin: '%r!',
                end: '![a-z]*'
              },
              {
                begin: '%r\\[',
                end: '\\][a-z]*'
              }
            ]
          }
        ].concat(IRB_OBJECT, COMMENT_MODES),
        relevance: 0
      }
    ].concat(IRB_OBJECT, COMMENT_MODES);

    SUBST.contains = RUBY_DEFAULT_CONTAINS;
    PARAMS.contains = RUBY_DEFAULT_CONTAINS;

    // >>
    // ?>
    const SIMPLE_PROMPT = "[>?]>";
    // irb(main):001:0>
    const DEFAULT_PROMPT = "[\\w#]+\\(\\w+\\):\\d+:\\d+[>*]";
    const RVM_PROMPT = "(\\w+-)?\\d+\\.\\d+\\.\\d+(p\\d+)?[^\\d][^>]+>";

    const IRB_DEFAULT = [
      {
        begin: /^\s*=>/,
        starts: {
          end: '$',
          contains: RUBY_DEFAULT_CONTAINS
        }
      },
      {
        className: 'meta.prompt',
        begin: '^(' + SIMPLE_PROMPT + "|" + DEFAULT_PROMPT + '|' + RVM_PROMPT + ')(?=[ ])',
        starts: {
          end: '$',
          keywords: RUBY_KEYWORDS,
          contains: RUBY_DEFAULT_CONTAINS
        }
      }
    ];

    COMMENT_MODES.unshift(IRB_OBJECT);

    return {
      name: 'Ruby',
      aliases: [
        'rb',
        'gemspec',
        'podspec',
        'thor',
        'irb'
      ],
      keywords: RUBY_KEYWORDS,
      illegal: /\/\*/,
      contains: [ hljs.SHEBANG({ binary: "ruby" }) ]
        .concat(IRB_DEFAULT)
        .concat(COMMENT_MODES)
        .concat(RUBY_DEFAULT_CONTAINS)
    };
  }

  return ruby;

})();

    hljs.registerLanguage('ruby', hljsGrammar);
  })();/*! `ruleslanguage` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Oracle Rules Language
  Author: Jason Jacobson <jason.a.jacobson@gmail.com>
  Description: The Oracle Utilities Rules Language is used to program the Oracle Utilities Applications acquired from LODESTAR Corporation.  The products include Billing Component, LPSS, Pricing Component etc. through version 1.6.1.
  Website: https://docs.oracle.com/cd/E17904_01/dev.1111/e10227/rlref.htm
  Category: enterprise
  */

  function ruleslanguage(hljs) {
    return {
      name: 'Oracle Rules Language',
      keywords: {
        keyword:
          'BILL_PERIOD BILL_START BILL_STOP RS_EFFECTIVE_START RS_EFFECTIVE_STOP RS_JURIS_CODE RS_OPCO_CODE '
          + 'INTDADDATTRIBUTE|5 INTDADDVMSG|5 INTDBLOCKOP|5 INTDBLOCKOPNA|5 INTDCLOSE|5 INTDCOUNT|5 '
          + 'INTDCOUNTSTATUSCODE|5 INTDCREATEMASK|5 INTDCREATEDAYMASK|5 INTDCREATEFACTORMASK|5 '
          + 'INTDCREATEHANDLE|5 INTDCREATEOVERRIDEDAYMASK|5 INTDCREATEOVERRIDEMASK|5 '
          + 'INTDCREATESTATUSCODEMASK|5 INTDCREATETOUPERIOD|5 INTDDELETE|5 INTDDIPTEST|5 INTDEXPORT|5 '
          + 'INTDGETERRORCODE|5 INTDGETERRORMESSAGE|5 INTDISEQUAL|5 INTDJOIN|5 INTDLOAD|5 INTDLOADACTUALCUT|5 '
          + 'INTDLOADDATES|5 INTDLOADHIST|5 INTDLOADLIST|5 INTDLOADLISTDATES|5 INTDLOADLISTENERGY|5 '
          + 'INTDLOADLISTHIST|5 INTDLOADRELATEDCHANNEL|5 INTDLOADSP|5 INTDLOADSTAGING|5 INTDLOADUOM|5 '
          + 'INTDLOADUOMDATES|5 INTDLOADUOMHIST|5 INTDLOADVERSION|5 INTDOPEN|5 INTDREADFIRST|5 INTDREADNEXT|5 '
          + 'INTDRECCOUNT|5 INTDRELEASE|5 INTDREPLACE|5 INTDROLLAVG|5 INTDROLLPEAK|5 INTDSCALAROP|5 INTDSCALE|5 '
          + 'INTDSETATTRIBUTE|5 INTDSETDSTPARTICIPANT|5 INTDSETSTRING|5 INTDSETVALUE|5 INTDSETVALUESTATUS|5 '
          + 'INTDSHIFTSTARTTIME|5 INTDSMOOTH|5 INTDSORT|5 INTDSPIKETEST|5 INTDSUBSET|5 INTDTOU|5 '
          + 'INTDTOURELEASE|5 INTDTOUVALUE|5 INTDUPDATESTATS|5 INTDVALUE|5 STDEV INTDDELETEEX|5 '
          + 'INTDLOADEXACTUAL|5 INTDLOADEXCUT|5 INTDLOADEXDATES|5 INTDLOADEX|5 INTDLOADEXRELATEDCHANNEL|5 '
          + 'INTDSAVEEX|5 MVLOAD|5 MVLOADACCT|5 MVLOADACCTDATES|5 MVLOADACCTHIST|5 MVLOADDATES|5 MVLOADHIST|5 '
          + 'MVLOADLIST|5 MVLOADLISTDATES|5 MVLOADLISTHIST|5 IF FOR NEXT DONE SELECT END CALL ABORT CLEAR CHANNEL FACTOR LIST NUMBER '
          + 'OVERRIDE SET WEEK DISTRIBUTIONNODE ELSE WHEN THEN OTHERWISE IENUM CSV INCLUDE LEAVE RIDER SAVE DELETE '
          + 'NOVALUE SECTION WARN SAVE_UPDATE DETERMINANT LABEL REPORT REVENUE EACH '
          + 'IN FROM TOTAL CHARGE BLOCK AND OR CSV_FILE RATE_CODE AUXILIARY_DEMAND '
          + 'UIDACCOUNT RS BILL_PERIOD_SELECT HOURS_PER_MONTH INTD_ERROR_STOP SEASON_SCHEDULE_NAME '
          + 'ACCOUNTFACTOR ARRAYUPPERBOUND CALLSTOREDPROC GETADOCONNECTION GETCONNECT GETDATASOURCE '
          + 'GETQUALIFIER GETUSERID HASVALUE LISTCOUNT LISTOP LISTUPDATE LISTVALUE PRORATEFACTOR RSPRORATE '
          + 'SETBINPATH SETDBMONITOR WQ_OPEN BILLINGHOURS DATE DATEFROMFLOAT DATETIMEFROMSTRING '
          + 'DATETIMETOSTRING DATETOFLOAT DAY DAYDIFF DAYNAME DBDATETIME HOUR MINUTE MONTH MONTHDIFF '
          + 'MONTHHOURS MONTHNAME ROUNDDATE SAMEWEEKDAYLASTYEAR SECOND WEEKDAY WEEKDIFF YEAR YEARDAY '
          + 'YEARSTR COMPSUM HISTCOUNT HISTMAX HISTMIN HISTMINNZ HISTVALUE MAXNRANGE MAXRANGE MINRANGE '
          + 'COMPIKVA COMPKVA COMPKVARFROMKQKW COMPLF IDATTR FLAG LF2KW LF2KWH MAXKW POWERFACTOR '
          + 'READING2USAGE AVGSEASON MAXSEASON MONTHLYMERGE SEASONVALUE SUMSEASON ACCTREADDATES '
          + 'ACCTTABLELOAD CONFIGADD CONFIGGET CREATEOBJECT CREATEREPORT EMAILCLIENT EXPBLKMDMUSAGE '
          + 'EXPMDMUSAGE EXPORT_USAGE FACTORINEFFECT GETUSERSPECIFIEDSTOP INEFFECT ISHOLIDAY RUNRATE '
          + 'SAVE_PROFILE SETREPORTTITLE USEREXIT WATFORRUNRATE TO TABLE ACOS ASIN ATAN ATAN2 BITAND CEIL '
          + 'COS COSECANT COSH COTANGENT DIVQUOT DIVREM EXP FABS FLOOR FMOD FREPM FREXPN LOG LOG10 MAX MAXN '
          + 'MIN MINNZ MODF POW ROUND ROUND2VALUE ROUNDINT SECANT SIN SINH SQROOT TAN TANH FLOAT2STRING '
          + 'FLOAT2STRINGNC INSTR LEFT LEN LTRIM MID RIGHT RTRIM STRING STRINGNC TOLOWER TOUPPER TRIM '
          + 'NUMDAYS READ_DATE STAGING',
        built_in:
          'IDENTIFIER OPTIONS XML_ELEMENT XML_OP XML_ELEMENT_OF DOMDOCCREATE DOMDOCLOADFILE DOMDOCLOADXML '
          + 'DOMDOCSAVEFILE DOMDOCGETROOT DOMDOCADDPI DOMNODEGETNAME DOMNODEGETTYPE DOMNODEGETVALUE DOMNODEGETCHILDCT '
          + 'DOMNODEGETFIRSTCHILD DOMNODEGETSIBLING DOMNODECREATECHILDELEMENT DOMNODESETATTRIBUTE '
          + 'DOMNODEGETCHILDELEMENTCT DOMNODEGETFIRSTCHILDELEMENT DOMNODEGETSIBLINGELEMENT DOMNODEGETATTRIBUTECT '
          + 'DOMNODEGETATTRIBUTEI DOMNODEGETATTRIBUTEBYNAME DOMNODEGETBYNAME'
      },
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.C_NUMBER_MODE,
        {
          className: 'literal',
          variants: [
            { // looks like #-comment
              begin: '#\\s+',
              relevance: 0
            },
            { begin: '#[a-zA-Z .]+' }
          ]
        }
      ]
    };
  }

  return ruleslanguage;

})();

    hljs.registerLanguage('ruleslanguage', hljsGrammar);
  })();/*! `rust` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Rust
  Author: Andrey Vlasovskikh <andrey.vlasovskikh@gmail.com>
  Contributors: Roman Shmatov <romanshmatov@gmail.com>, Kasper Andersen <kma_untrusted@protonmail.com>
  Website: https://www.rust-lang.org
  Category: common, system
  */

  /** @type LanguageFn */
  function rust(hljs) {
    const regex = hljs.regex;
    const FUNCTION_INVOKE = {
      className: "title.function.invoke",
      relevance: 0,
      begin: regex.concat(
        /\b/,
        /(?!let|for|while|if|else|match\b)/,
        hljs.IDENT_RE,
        regex.lookahead(/\s*\(/))
    };
    const NUMBER_SUFFIX = '([ui](8|16|32|64|128|size)|f(32|64))\?';
    const KEYWORDS = [
      "abstract",
      "as",
      "async",
      "await",
      "become",
      "box",
      "break",
      "const",
      "continue",
      "crate",
      "do",
      "dyn",
      "else",
      "enum",
      "extern",
      "false",
      "final",
      "fn",
      "for",
      "if",
      "impl",
      "in",
      "let",
      "loop",
      "macro",
      "match",
      "mod",
      "move",
      "mut",
      "override",
      "priv",
      "pub",
      "ref",
      "return",
      "self",
      "Self",
      "static",
      "struct",
      "super",
      "trait",
      "true",
      "try",
      "type",
      "typeof",
      "unsafe",
      "unsized",
      "use",
      "virtual",
      "where",
      "while",
      "yield"
    ];
    const LITERALS = [
      "true",
      "false",
      "Some",
      "None",
      "Ok",
      "Err"
    ];
    const BUILTINS = [
      // functions
      'drop ',
      // traits
      "Copy",
      "Send",
      "Sized",
      "Sync",
      "Drop",
      "Fn",
      "FnMut",
      "FnOnce",
      "ToOwned",
      "Clone",
      "Debug",
      "PartialEq",
      "PartialOrd",
      "Eq",
      "Ord",
      "AsRef",
      "AsMut",
      "Into",
      "From",
      "Default",
      "Iterator",
      "Extend",
      "IntoIterator",
      "DoubleEndedIterator",
      "ExactSizeIterator",
      "SliceConcatExt",
      "ToString",
      // macros
      "assert!",
      "assert_eq!",
      "bitflags!",
      "bytes!",
      "cfg!",
      "col!",
      "concat!",
      "concat_idents!",
      "debug_assert!",
      "debug_assert_eq!",
      "env!",
      "eprintln!",
      "panic!",
      "file!",
      "format!",
      "format_args!",
      "include_bytes!",
      "include_str!",
      "line!",
      "local_data_key!",
      "module_path!",
      "option_env!",
      "print!",
      "println!",
      "select!",
      "stringify!",
      "try!",
      "unimplemented!",
      "unreachable!",
      "vec!",
      "write!",
      "writeln!",
      "macro_rules!",
      "assert_ne!",
      "debug_assert_ne!"
    ];
    const TYPES = [
      "i8",
      "i16",
      "i32",
      "i64",
      "i128",
      "isize",
      "u8",
      "u16",
      "u32",
      "u64",
      "u128",
      "usize",
      "f32",
      "f64",
      "str",
      "char",
      "bool",
      "Box",
      "Option",
      "Result",
      "String",
      "Vec"
    ];
    return {
      name: 'Rust',
      aliases: [ 'rs' ],
      keywords: {
        $pattern: hljs.IDENT_RE + '!?',
        type: TYPES,
        keyword: KEYWORDS,
        literal: LITERALS,
        built_in: BUILTINS
      },
      illegal: '</',
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.COMMENT('/\\*', '\\*/', { contains: [ 'self' ] }),
        hljs.inherit(hljs.QUOTE_STRING_MODE, {
          begin: /b?"/,
          illegal: null
        }),
        {
          className: 'string',
          variants: [
            { begin: /b?r(#*)"(.|\n)*?"\1(?!#)/ },
            { begin: /b?'\\?(x\w{2}|u\w{4}|U\w{8}|.)'/ }
          ]
        },
        {
          className: 'symbol',
          begin: /'[a-zA-Z_][a-zA-Z0-9_]*/
        },
        {
          className: 'number',
          variants: [
            { begin: '\\b0b([01_]+)' + NUMBER_SUFFIX },
            { begin: '\\b0o([0-7_]+)' + NUMBER_SUFFIX },
            { begin: '\\b0x([A-Fa-f0-9_]+)' + NUMBER_SUFFIX },
            { begin: '\\b(\\d[\\d_]*(\\.[0-9_]+)?([eE][+-]?[0-9_]+)?)'
                     + NUMBER_SUFFIX }
          ],
          relevance: 0
        },
        {
          begin: [
            /fn/,
            /\s+/,
            hljs.UNDERSCORE_IDENT_RE
          ],
          className: {
            1: "keyword",
            3: "title.function"
          }
        },
        {
          className: 'meta',
          begin: '#!?\\[',
          end: '\\]',
          contains: [
            {
              className: 'string',
              begin: /"/,
              end: /"/,
              contains: [
                hljs.BACKSLASH_ESCAPE
              ]
            }
          ]
        },
        {
          begin: [
            /let/,
            /\s+/,
            /(?:mut\s+)?/,
            hljs.UNDERSCORE_IDENT_RE
          ],
          className: {
            1: "keyword",
            3: "keyword",
            4: "variable"
          }
        },
        // must come before impl/for rule later
        {
          begin: [
            /for/,
            /\s+/,
            hljs.UNDERSCORE_IDENT_RE,
            /\s+/,
            /in/
          ],
          className: {
            1: "keyword",
            3: "variable",
            5: "keyword"
          }
        },
        {
          begin: [
            /type/,
            /\s+/,
            hljs.UNDERSCORE_IDENT_RE
          ],
          className: {
            1: "keyword",
            3: "title.class"
          }
        },
        {
          begin: [
            /(?:trait|enum|struct|union|impl|for)/,
            /\s+/,
            hljs.UNDERSCORE_IDENT_RE
          ],
          className: {
            1: "keyword",
            3: "title.class"
          }
        },
        {
          begin: hljs.IDENT_RE + '::',
          keywords: {
            keyword: "Self",
            built_in: BUILTINS,
            type: TYPES
          }
        },
        {
          className: "punctuation",
          begin: '->'
        },
        FUNCTION_INVOKE
      ]
    };
  }

  return rust;

})();

    hljs.registerLanguage('rust', hljsGrammar);
  })();/*! `scala` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Scala
  Category: functional
  Author: Jan Berkel <jan.berkel@gmail.com>
  Contributors: Erik Osheim <d_m@plastic-idolatry.com>
  Website: https://www.scala-lang.org
  */

  function scala(hljs) {
    const regex = hljs.regex;
    const ANNOTATION = {
      className: 'meta',
      begin: '@[A-Za-z]+'
    };

    // used in strings for escaping/interpolation/substitution
    const SUBST = {
      className: 'subst',
      variants: [
        { begin: '\\$[A-Za-z0-9_]+' },
        {
          begin: /\$\{/,
          end: /\}/
        }
      ]
    };

    const STRING = {
      className: 'string',
      variants: [
        {
          begin: '"""',
          end: '"""'
        },
        {
          begin: '"',
          end: '"',
          illegal: '\\n',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          begin: '[a-z]+"',
          end: '"',
          illegal: '\\n',
          contains: [
            hljs.BACKSLASH_ESCAPE,
            SUBST
          ]
        },
        {
          className: 'string',
          begin: '[a-z]+"""',
          end: '"""',
          contains: [ SUBST ],
          relevance: 10
        }
      ]

    };

    const TYPE = {
      className: 'type',
      begin: '\\b[A-Z][A-Za-z0-9_]*',
      relevance: 0
    };

    const NAME = {
      className: 'title',
      begin: /[^0-9\n\t "'(),.`{}\[\]:;][^\n\t "'(),.`{}\[\]:;]+|[^0-9\n\t "'(),.`{}\[\]:;=]/,
      relevance: 0
    };

    const CLASS = {
      className: 'class',
      beginKeywords: 'class object trait type',
      end: /[:={\[\n;]/,
      excludeEnd: true,
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          beginKeywords: 'extends with',
          relevance: 10
        },
        {
          begin: /\[/,
          end: /\]/,
          excludeBegin: true,
          excludeEnd: true,
          relevance: 0,
          contains: [ 
            TYPE, 
            hljs.C_LINE_COMMENT_MODE, 
            hljs.C_BLOCK_COMMENT_MODE, 
          ]
        },
        {
          className: 'params',
          begin: /\(/,
          end: /\)/,
          excludeBegin: true,
          excludeEnd: true,
          relevance: 0,
          contains: [ 
            TYPE, 
            hljs.C_LINE_COMMENT_MODE, 
            hljs.C_BLOCK_COMMENT_MODE, 
          ]
        },
        NAME
      ]
    };

    const METHOD = {
      className: 'function',
      beginKeywords: 'def',
      end: regex.lookahead(/[:={\[(\n;]/),
      contains: [ NAME ]
    };

    const EXTENSION = {
      begin: [
        /^\s*/, // Is first token on the line
        'extension',
        /\s+(?=[[(])/, // followed by at least one space and `[` or `(`
      ],
      beginScope: { 2: "keyword", }
    };

    const END = {
      begin: [
        /^\s*/, // Is first token on the line
        /end/,
        /\s+/,
        /(extension\b)?/, // `extension` is the only marker that follows an `end` that cannot be captured by another rule.
      ],
      beginScope: {
        2: "keyword",
        4: "keyword",
      }
    };

    // TODO: use negative look-behind in future
    //       /(?<!\.)\binline(?=\s)/
    const INLINE_MODES = [
      { match: /\.inline\b/ },
      {
        begin: /\binline(?=\s)/,
        keywords: 'inline'
      }
    ];

    const USING_PARAM_CLAUSE = {
      begin: [
        /\(\s*/, // Opening `(` of a parameter or argument list
        /using/,
        /\s+(?!\))/, // Spaces not followed by `)`
      ],
      beginScope: { 2: "keyword", }
    };

    // glob all non-whitespace characters as a "string"
    // sourced from https://github.com/scala/docs.scala-lang/pull/2845
    const DIRECTIVE_VALUE = {
      className: 'string',
      begin: /\S+/,
    };

    // directives
    // sourced from https://github.com/scala/docs.scala-lang/pull/2845
    const USING_DIRECTIVE = {
      begin: [
        '//>',
        /\s+/,
        /using/,
        /\s+/,
        /\S+/
      ],
      beginScope: {
        1: "comment",
        3: "keyword",
        5: "type"
      },
      end: /$/,
      contains: [
        DIRECTIVE_VALUE,
      ]
    };

    return {
      name: 'Scala',
      keywords: {
        literal: 'true false null',
        keyword: 'type yield lazy override def with val var sealed abstract private trait object if then forSome for while do throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicit export enum given transparent'
      },
      contains: [
        USING_DIRECTIVE,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        STRING,
        TYPE,
        METHOD,
        CLASS,
        hljs.C_NUMBER_MODE,
        EXTENSION,
        END,
        ...INLINE_MODES,
        USING_PARAM_CLAUSE,
        ANNOTATION
      ]
    };
  }

  return scala;

})();

    hljs.registerLanguage('scala', hljsGrammar);
  })();/*! `scheme` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Scheme
  Description: Scheme is a programming language in the Lisp family.
               (keywords based on http://community.schemewiki.org/?scheme-keywords)
  Author: JP Verkamp <me@jverkamp.com>
  Contributors: Ivan Sagalaev <maniac@softwaremaniacs.org>
  Origin: clojure.js
  Website: http://community.schemewiki.org/?what-is-scheme
  Category: lisp
  */

  function scheme(hljs) {
    const SCHEME_IDENT_RE = '[^\\(\\)\\[\\]\\{\\}",\'`;#|\\\\\\s]+';
    const SCHEME_SIMPLE_NUMBER_RE = '(-|\\+)?\\d+([./]\\d+)?';
    const SCHEME_COMPLEX_NUMBER_RE = SCHEME_SIMPLE_NUMBER_RE + '[+\\-]' + SCHEME_SIMPLE_NUMBER_RE + 'i';
    const KEYWORDS = {
      $pattern: SCHEME_IDENT_RE,
      built_in:
        'case-lambda call/cc class define-class exit-handler field import '
        + 'inherit init-field interface let*-values let-values let/ec mixin '
        + 'opt-lambda override protect provide public rename require '
        + 'require-for-syntax syntax syntax-case syntax-error unit/sig unless '
        + 'when with-syntax and begin call-with-current-continuation '
        + 'call-with-input-file call-with-output-file case cond define '
        + 'define-syntax delay do dynamic-wind else for-each if lambda let let* '
        + 'let-syntax letrec letrec-syntax map or syntax-rules \' * + , ,@ - ... / '
        + '; < <= = => > >= ` abs acos angle append apply asin assoc assq assv atan '
        + 'boolean? caar cadr call-with-input-file call-with-output-file '
        + 'call-with-values car cdddar cddddr cdr ceiling char->integer '
        + 'char-alphabetic? char-ci<=? char-ci<? char-ci=? char-ci>=? char-ci>? '
        + 'char-downcase char-lower-case? char-numeric? char-ready? char-upcase '
        + 'char-upper-case? char-whitespace? char<=? char<? char=? char>=? char>? '
        + 'char? close-input-port close-output-port complex? cons cos '
        + 'current-input-port current-output-port denominator display eof-object? '
        + 'eq? equal? eqv? eval even? exact->inexact exact? exp expt floor '
        + 'force gcd imag-part inexact->exact inexact? input-port? integer->char '
        + 'integer? interaction-environment lcm length list list->string '
        + 'list->vector list-ref list-tail list? load log magnitude make-polar '
        + 'make-rectangular make-string make-vector max member memq memv min '
        + 'modulo negative? newline not null-environment null? number->string '
        + 'number? numerator odd? open-input-file open-output-file output-port? '
        + 'pair? peek-char port? positive? procedure? quasiquote quote quotient '
        + 'rational? rationalize read read-char real-part real? remainder reverse '
        + 'round scheme-report-environment set! set-car! set-cdr! sin sqrt string '
        + 'string->list string->number string->symbol string-append string-ci<=? '
        + 'string-ci<? string-ci=? string-ci>=? string-ci>? string-copy '
        + 'string-fill! string-length string-ref string-set! string<=? string<? '
        + 'string=? string>=? string>? string? substring symbol->string symbol? '
        + 'tan transcript-off transcript-on truncate values vector '
        + 'vector->list vector-fill! vector-length vector-ref vector-set! '
        + 'with-input-from-file with-output-to-file write write-char zero?'
    };

    const LITERAL = {
      className: 'literal',
      begin: '(#t|#f|#\\\\' + SCHEME_IDENT_RE + '|#\\\\.)'
    };

    const NUMBER = {
      className: 'number',
      variants: [
        {
          begin: SCHEME_SIMPLE_NUMBER_RE,
          relevance: 0
        },
        {
          begin: SCHEME_COMPLEX_NUMBER_RE,
          relevance: 0
        },
        { begin: '#b[0-1]+(/[0-1]+)?' },
        { begin: '#o[0-7]+(/[0-7]+)?' },
        { begin: '#x[0-9a-f]+(/[0-9a-f]+)?' }
      ]
    };

    const STRING = hljs.QUOTE_STRING_MODE;

    const COMMENT_MODES = [
      hljs.COMMENT(
        ';',
        '$',
        { relevance: 0 }
      ),
      hljs.COMMENT('#\\|', '\\|#')
    ];

    const IDENT = {
      begin: SCHEME_IDENT_RE,
      relevance: 0
    };

    const QUOTED_IDENT = {
      className: 'symbol',
      begin: '\'' + SCHEME_IDENT_RE
    };

    const BODY = {
      endsWithParent: true,
      relevance: 0
    };

    const QUOTED_LIST = {
      variants: [
        { begin: /'/ },
        { begin: '`' }
      ],
      contains: [
        {
          begin: '\\(',
          end: '\\)',
          contains: [
            'self',
            LITERAL,
            STRING,
            NUMBER,
            IDENT,
            QUOTED_IDENT
          ]
        }
      ]
    };

    const NAME = {
      className: 'name',
      relevance: 0,
      begin: SCHEME_IDENT_RE,
      keywords: KEYWORDS
    };

    const LAMBDA = {
      begin: /lambda/,
      endsWithParent: true,
      returnBegin: true,
      contains: [
        NAME,
        {
          endsParent: true,
          variants: [
            {
              begin: /\(/,
              end: /\)/
            },
            {
              begin: /\[/,
              end: /\]/
            }
          ],
          contains: [ IDENT ]
        }
      ]
    };

    const LIST = {
      variants: [
        {
          begin: '\\(',
          end: '\\)'
        },
        {
          begin: '\\[',
          end: '\\]'
        }
      ],
      contains: [
        LAMBDA,
        NAME,
        BODY
      ]
    };

    BODY.contains = [
      LITERAL,
      NUMBER,
      STRING,
      IDENT,
      QUOTED_IDENT,
      QUOTED_LIST,
      LIST
    ].concat(COMMENT_MODES);

    return {
      name: 'Scheme',
      aliases: ['scm'],
      illegal: /\S/,
      contains: [
        hljs.SHEBANG(),
        NUMBER,
        STRING,
        QUOTED_IDENT,
        QUOTED_LIST,
        LIST
      ].concat(COMMENT_MODES)
    };
  }

  return scheme;

})();

    hljs.registerLanguage('scheme', hljsGrammar);
  })();/*! `scss` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  const MODES = (hljs) => {
    return {
      IMPORTANT: {
        scope: 'meta',
        begin: '!important'
      },
      BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
      HEXCOLOR: {
        scope: 'number',
        begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
      },
      FUNCTION_DISPATCH: {
        className: "built_in",
        begin: /[\w-]+(?=\()/
      },
      ATTRIBUTE_SELECTOR_MODE: {
        scope: 'selector-attr',
        begin: /\[/,
        end: /\]/,
        illegal: '$',
        contains: [
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE
        ]
      },
      CSS_NUMBER_MODE: {
        scope: 'number',
        begin: hljs.NUMBER_RE + '(' +
          '%|em|ex|ch|rem' +
          '|vw|vh|vmin|vmax' +
          '|cm|mm|in|pt|pc|px' +
          '|deg|grad|rad|turn' +
          '|s|ms' +
          '|Hz|kHz' +
          '|dpi|dpcm|dppx' +
          ')?',
        relevance: 0
      },
      CSS_VARIABLE: {
        className: "attr",
        begin: /--[A-Za-z_][A-Za-z0-9_-]*/
      }
    };
  };

  const HTML_TAGS = [
    'a',
    'abbr',
    'address',
    'article',
    'aside',
    'audio',
    'b',
    'blockquote',
    'body',
    'button',
    'canvas',
    'caption',
    'cite',
    'code',
    'dd',
    'del',
    'details',
    'dfn',
    'div',
    'dl',
    'dt',
    'em',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hgroup',
    'html',
    'i',
    'iframe',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'legend',
    'li',
    'main',
    'mark',
    'menu',
    'nav',
    'object',
    'ol',
    'p',
    'q',
    'quote',
    'samp',
    'section',
    'span',
    'strong',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'textarea',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'ul',
    'var',
    'video'
  ];

  const SVG_TAGS = [
    'defs',
    'g',
    'marker',
    'mask',
    'pattern',
    'svg',
    'switch',
    'symbol',
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feFlood',
    'feGaussianBlur',
    'feImage',
    'feMerge',
    'feMorphology',
    'feOffset',
    'feSpecularLighting',
    'feTile',
    'feTurbulence',
    'linearGradient',
    'radialGradient',
    'stop',
    'circle',
    'ellipse',
    'image',
    'line',
    'path',
    'polygon',
    'polyline',
    'rect',
    'text',
    'use',
    'textPath',
    'tspan',
    'foreignObject',
    'clipPath'
  ];

  const TAGS = [
    ...HTML_TAGS,
    ...SVG_TAGS,
  ];

  // Sorting, then reversing makes sure longer attributes/elements like
  // `font-weight` are matched fully instead of getting false positives on say `font`

  const MEDIA_FEATURES = [
    'any-hover',
    'any-pointer',
    'aspect-ratio',
    'color',
    'color-gamut',
    'color-index',
    'device-aspect-ratio',
    'device-height',
    'device-width',
    'display-mode',
    'forced-colors',
    'grid',
    'height',
    'hover',
    'inverted-colors',
    'monochrome',
    'orientation',
    'overflow-block',
    'overflow-inline',
    'pointer',
    'prefers-color-scheme',
    'prefers-contrast',
    'prefers-reduced-motion',
    'prefers-reduced-transparency',
    'resolution',
    'scan',
    'scripting',
    'update',
    'width',
    // TODO: find a better solution?
    'min-width',
    'max-width',
    'min-height',
    'max-height'
  ].sort().reverse();

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
  const PSEUDO_CLASSES = [
    'active',
    'any-link',
    'blank',
    'checked',
    'current',
    'default',
    'defined',
    'dir', // dir()
    'disabled',
    'drop',
    'empty',
    'enabled',
    'first',
    'first-child',
    'first-of-type',
    'fullscreen',
    'future',
    'focus',
    'focus-visible',
    'focus-within',
    'has', // has()
    'host', // host or host()
    'host-context', // host-context()
    'hover',
    'indeterminate',
    'in-range',
    'invalid',
    'is', // is()
    'lang', // lang()
    'last-child',
    'last-of-type',
    'left',
    'link',
    'local-link',
    'not', // not()
    'nth-child', // nth-child()
    'nth-col', // nth-col()
    'nth-last-child', // nth-last-child()
    'nth-last-col', // nth-last-col()
    'nth-last-of-type', //nth-last-of-type()
    'nth-of-type', //nth-of-type()
    'only-child',
    'only-of-type',
    'optional',
    'out-of-range',
    'past',
    'placeholder-shown',
    'read-only',
    'read-write',
    'required',
    'right',
    'root',
    'scope',
    'target',
    'target-within',
    'user-invalid',
    'valid',
    'visited',
    'where' // where()
  ].sort().reverse();

  // https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
  const PSEUDO_ELEMENTS = [
    'after',
    'backdrop',
    'before',
    'cue',
    'cue-region',
    'first-letter',
    'first-line',
    'grammar-error',
    'marker',
    'part',
    'placeholder',
    'selection',
    'slotted',
    'spelling-error'
  ].sort().reverse();

  const ATTRIBUTES = [
    'align-content',
    'align-items',
    'align-self',
    'alignment-baseline',
    'all',
    'animation',
    'animation-delay',
    'animation-direction',
    'animation-duration',
    'animation-fill-mode',
    'animation-iteration-count',
    'animation-name',
    'animation-play-state',
    'animation-timing-function',
    'backface-visibility',
    'background',
    'background-attachment',
    'background-blend-mode',
    'background-clip',
    'background-color',
    'background-image',
    'background-origin',
    'background-position',
    'background-repeat',
    'background-size',
    'baseline-shift',
    'block-size',
    'border',
    'border-block',
    'border-block-color',
    'border-block-end',
    'border-block-end-color',
    'border-block-end-style',
    'border-block-end-width',
    'border-block-start',
    'border-block-start-color',
    'border-block-start-style',
    'border-block-start-width',
    'border-block-style',
    'border-block-width',
    'border-bottom',
    'border-bottom-color',
    'border-bottom-left-radius',
    'border-bottom-right-radius',
    'border-bottom-style',
    'border-bottom-width',
    'border-collapse',
    'border-color',
    'border-image',
    'border-image-outset',
    'border-image-repeat',
    'border-image-slice',
    'border-image-source',
    'border-image-width',
    'border-inline',
    'border-inline-color',
    'border-inline-end',
    'border-inline-end-color',
    'border-inline-end-style',
    'border-inline-end-width',
    'border-inline-start',
    'border-inline-start-color',
    'border-inline-start-style',
    'border-inline-start-width',
    'border-inline-style',
    'border-inline-width',
    'border-left',
    'border-left-color',
    'border-left-style',
    'border-left-width',
    'border-radius',
    'border-right',
    'border-right-color',
    'border-right-style',
    'border-right-width',
    'border-spacing',
    'border-style',
    'border-top',
    'border-top-color',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-top-style',
    'border-top-width',
    'border-width',
    'bottom',
    'box-decoration-break',
    'box-shadow',
    'box-sizing',
    'break-after',
    'break-before',
    'break-inside',
    'cx',
    'cy',
    'caption-side',
    'caret-color',
    'clear',
    'clip',
    'clip-path',
    'clip-rule',
    'color',
    'color-interpolation',
    'color-interpolation-filters',
    'color-profile',
    'color-rendering',
    'column-count',
    'column-fill',
    'column-gap',
    'column-rule',
    'column-rule-color',
    'column-rule-style',
    'column-rule-width',
    'column-span',
    'column-width',
    'columns',
    'contain',
    'content',
    'content-visibility',
    'counter-increment',
    'counter-reset',
    'cue',
    'cue-after',
    'cue-before',
    'cursor',
    'direction',
    'display',
    'dominant-baseline',
    'empty-cells',
    'enable-background',
    'fill',
    'fill-opacity',
    'fill-rule',
    'filter',
    'flex',
    'flex-basis',
    'flex-direction',
    'flex-flow',
    'flex-grow',
    'flex-shrink',
    'flex-wrap',
    'float',
    'flow',
    'flood-color',
    'flood-opacity',
    'font',
    'font-display',
    'font-family',
    'font-feature-settings',
    'font-kerning',
    'font-language-override',
    'font-size',
    'font-size-adjust',
    'font-smoothing',
    'font-stretch',
    'font-style',
    'font-synthesis',
    'font-variant',
    'font-variant-caps',
    'font-variant-east-asian',
    'font-variant-ligatures',
    'font-variant-numeric',
    'font-variant-position',
    'font-variation-settings',
    'font-weight',
    'gap',
    'glyph-orientation-horizontal',
    'glyph-orientation-vertical',
    'grid',
    'grid-area',
    'grid-auto-columns',
    'grid-auto-flow',
    'grid-auto-rows',
    'grid-column',
    'grid-column-end',
    'grid-column-start',
    'grid-gap',
    'grid-row',
    'grid-row-end',
    'grid-row-start',
    'grid-template',
    'grid-template-areas',
    'grid-template-columns',
    'grid-template-rows',
    'hanging-punctuation',
    'height',
    'hyphens',
    'icon',
    'image-orientation',
    'image-rendering',
    'image-resolution',
    'ime-mode',
    'inline-size',
    'isolation',
    'kerning',
    'justify-content',
    'left',
    'letter-spacing',
    'lighting-color',
    'line-break',
    'line-height',
    'list-style',
    'list-style-image',
    'list-style-position',
    'list-style-type',
    'marker',
    'marker-end',
    'marker-mid',
    'marker-start',
    'mask',
    'margin',
    'margin-block',
    'margin-block-end',
    'margin-block-start',
    'margin-bottom',
    'margin-inline',
    'margin-inline-end',
    'margin-inline-start',
    'margin-left',
    'margin-right',
    'margin-top',
    'marks',
    'mask',
    'mask-border',
    'mask-border-mode',
    'mask-border-outset',
    'mask-border-repeat',
    'mask-border-slice',
    'mask-border-source',
    'mask-border-width',
    'mask-clip',
    'mask-composite',
    'mask-image',
    'mask-mode',
    'mask-origin',
    'mask-position',
    'mask-repeat',
    'mask-size',
    'mask-type',
    'max-block-size',
    'max-height',
    'max-inline-size',
    'max-width',
    'min-block-size',
    'min-height',
    'min-inline-size',
    'min-width',
    'mix-blend-mode',
    'nav-down',
    'nav-index',
    'nav-left',
    'nav-right',
    'nav-up',
    'none',
    'normal',
    'object-fit',
    'object-position',
    'opacity',
    'order',
    'orphans',
    'outline',
    'outline-color',
    'outline-offset',
    'outline-style',
    'outline-width',
    'overflow',
    'overflow-wrap',
    'overflow-x',
    'overflow-y',
    'padding',
    'padding-block',
    'padding-block-end',
    'padding-block-start',
    'padding-bottom',
    'padding-inline',
    'padding-inline-end',
    'padding-inline-start',
    'padding-left',
    'padding-right',
    'padding-top',
    'page-break-after',
    'page-break-before',
    'page-break-inside',
    'pause',
    'pause-after',
    'pause-before',
    'perspective',
    'perspective-origin',
    'pointer-events',
    'position',
    'quotes',
    'r',
    'resize',
    'rest',
    'rest-after',
    'rest-before',
    'right',
    'row-gap',
    'scroll-margin',
    'scroll-margin-block',
    'scroll-margin-block-end',
    'scroll-margin-block-start',
    'scroll-margin-bottom',
    'scroll-margin-inline',
    'scroll-margin-inline-end',
    'scroll-margin-inline-start',
    'scroll-margin-left',
    'scroll-margin-right',
    'scroll-margin-top',
    'scroll-padding',
    'scroll-padding-block',
    'scroll-padding-block-end',
    'scroll-padding-block-start',
    'scroll-padding-bottom',
    'scroll-padding-inline',
    'scroll-padding-inline-end',
    'scroll-padding-inline-start',
    'scroll-padding-left',
    'scroll-padding-right',
    'scroll-padding-top',
    'scroll-snap-align',
    'scroll-snap-stop',
    'scroll-snap-type',
    'scrollbar-color',
    'scrollbar-gutter',
    'scrollbar-width',
    'shape-image-threshold',
    'shape-margin',
    'shape-outside',
    'shape-rendering',
    'stop-color',
    'stop-opacity',
    'stroke',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-opacity',
    'stroke-width',
    'speak',
    'speak-as',
    'src', // @font-face
    'tab-size',
    'table-layout',
    'text-anchor',
    'text-align',
    'text-align-all',
    'text-align-last',
    'text-combine-upright',
    'text-decoration',
    'text-decoration-color',
    'text-decoration-line',
    'text-decoration-style',
    'text-emphasis',
    'text-emphasis-color',
    'text-emphasis-position',
    'text-emphasis-style',
    'text-indent',
    'text-justify',
    'text-orientation',
    'text-overflow',
    'text-rendering',
    'text-shadow',
    'text-transform',
    'text-underline-position',
    'top',
    'transform',
    'transform-box',
    'transform-origin',
    'transform-style',
    'transition',
    'transition-delay',
    'transition-duration',
    'transition-property',
    'transition-timing-function',
    'unicode-bidi',
    'vector-effect',
    'vertical-align',
    'visibility',
    'voice-balance',
    'voice-duration',
    'voice-family',
    'voice-pitch',
    'voice-range',
    'voice-rate',
    'voice-stress',
    'voice-volume',
    'white-space',
    'widows',
    'width',
    'will-change',
    'word-break',
    'word-spacing',
    'word-wrap',
    'writing-mode',
    'x',
    'y',
    'z-index'
  ].sort().reverse();

  /*
  Language: SCSS
  Description: Scss is an extension of the syntax of CSS.
  Author: Kurt Emch <kurt@kurtemch.com>
  Website: https://sass-lang.com
  Category: common, css, web
  */


  /** @type LanguageFn */
  function scss(hljs) {
    const modes = MODES(hljs);
    const PSEUDO_ELEMENTS$1 = PSEUDO_ELEMENTS;
    const PSEUDO_CLASSES$1 = PSEUDO_CLASSES;

    const AT_IDENTIFIER = '@[a-z-]+'; // @font-face
    const AT_MODIFIERS = "and or not only";
    const IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
    const VARIABLE = {
      className: 'variable',
      begin: '(\\$' + IDENT_RE + ')\\b',
      relevance: 0
    };

    return {
      name: 'SCSS',
      case_insensitive: true,
      illegal: '[=/|\']',
      contains: [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        // to recognize keyframe 40% etc which are outside the scope of our
        // attribute value mode
        modes.CSS_NUMBER_MODE,
        {
          className: 'selector-id',
          begin: '#[A-Za-z0-9_-]+',
          relevance: 0
        },
        {
          className: 'selector-class',
          begin: '\\.[A-Za-z0-9_-]+',
          relevance: 0
        },
        modes.ATTRIBUTE_SELECTOR_MODE,
        {
          className: 'selector-tag',
          begin: '\\b(' + TAGS.join('|') + ')\\b',
          // was there, before, but why?
          relevance: 0
        },
        {
          className: 'selector-pseudo',
          begin: ':(' + PSEUDO_CLASSES$1.join('|') + ')'
        },
        {
          className: 'selector-pseudo',
          begin: ':(:)?(' + PSEUDO_ELEMENTS$1.join('|') + ')'
        },
        VARIABLE,
        { // pseudo-selector params
          begin: /\(/,
          end: /\)/,
          contains: [ modes.CSS_NUMBER_MODE ]
        },
        modes.CSS_VARIABLE,
        {
          className: 'attribute',
          begin: '\\b(' + ATTRIBUTES.join('|') + ')\\b'
        },
        { begin: '\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b' },
        {
          begin: /:/,
          end: /[;}{]/,
          relevance: 0,
          contains: [
            modes.BLOCK_COMMENT,
            VARIABLE,
            modes.HEXCOLOR,
            modes.CSS_NUMBER_MODE,
            hljs.QUOTE_STRING_MODE,
            hljs.APOS_STRING_MODE,
            modes.IMPORTANT,
            modes.FUNCTION_DISPATCH
          ]
        },
        // matching these here allows us to treat them more like regular CSS
        // rules so everything between the {} gets regular rule highlighting,
        // which is what we want for page and font-face
        {
          begin: '@(page|font-face)',
          keywords: {
            $pattern: AT_IDENTIFIER,
            keyword: '@page @font-face'
          }
        },
        {
          begin: '@',
          end: '[{;]',
          returnBegin: true,
          keywords: {
            $pattern: /[a-z-]+/,
            keyword: AT_MODIFIERS,
            attribute: MEDIA_FEATURES.join(" ")
          },
          contains: [
            {
              begin: AT_IDENTIFIER,
              className: "keyword"
            },
            {
              begin: /[a-z-]+(?=:)/,
              className: "attribute"
            },
            VARIABLE,
            hljs.QUOTE_STRING_MODE,
            hljs.APOS_STRING_MODE,
            modes.HEXCOLOR,
            modes.CSS_NUMBER_MODE
          ]
        },
        modes.FUNCTION_DISPATCH
      ]
    };
  }

  return scss;

})();

    hljs.registerLanguage('scss', hljsGrammar);
  })();/*! `shell` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Shell Session
  Requires: bash.js
  Author: TSUYUSATO Kitsune <make.just.on@gmail.com>
  Category: common
  Audit: 2020
  */

  /** @type LanguageFn */
  function shell(hljs) {
    return {
      name: 'Shell Session',
      aliases: [
        'console',
        'shellsession'
      ],
      contains: [
        {
          className: 'meta.prompt',
          // We cannot add \s (spaces) in the regular expression otherwise it will be too broad and produce unexpected result.
          // For instance, in the following example, it would match "echo /path/to/home >" as a prompt:
          // echo /path/to/home > t.exe
          begin: /^\s{0,3}[/~\w\d[\]()@-]*[>%$#][ ]?/,
          starts: {
            end: /[^\\](?=\s*$)/,
            subLanguage: 'bash'
          }
        }
      ]
    };
  }

  return shell;

})();

    hljs.registerLanguage('shell', hljsGrammar);
  })();/*! `smalltalk` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Smalltalk
  Description: Smalltalk is an object-oriented, dynamically typed reflective programming language.
  Author: Vladimir Gubarkov <xonixx@gmail.com>
  Website: https://en.wikipedia.org/wiki/Smalltalk
  Category: system
  */

  function smalltalk(hljs) {
    const VAR_IDENT_RE = '[a-z][a-zA-Z0-9_]*';
    const CHAR = {
      className: 'string',
      begin: '\\$.{1}'
    };
    const SYMBOL = {
      className: 'symbol',
      begin: '#' + hljs.UNDERSCORE_IDENT_RE
    };
    return {
      name: 'Smalltalk',
      aliases: [ 'st' ],
      keywords: [
        "self",
        "super",
        "nil",
        "true",
        "false",
        "thisContext"
      ],
      contains: [
        hljs.COMMENT('"', '"'),
        hljs.APOS_STRING_MODE,
        {
          className: 'type',
          begin: '\\b[A-Z][A-Za-z0-9_]*',
          relevance: 0
        },
        {
          begin: VAR_IDENT_RE + ':',
          relevance: 0
        },
        hljs.C_NUMBER_MODE,
        SYMBOL,
        CHAR,
        {
          // This looks more complicated than needed to avoid combinatorial
          // explosion under V8. It effectively means `| var1 var2 ... |` with
          // whitespace adjacent to `|` being optional.
          begin: '\\|[ ]*' + VAR_IDENT_RE + '([ ]+' + VAR_IDENT_RE + ')*[ ]*\\|',
          returnBegin: true,
          end: /\|/,
          illegal: /\S/,
          contains: [ { begin: '(\\|[ ]*)?' + VAR_IDENT_RE } ]
        },
        {
          begin: '#\\(',
          end: '\\)',
          contains: [
            hljs.APOS_STRING_MODE,
            CHAR,
            hljs.C_NUMBER_MODE,
            SYMBOL
          ]
        }
      ]
    };
  }

  return smalltalk;

})();

    hljs.registerLanguage('smalltalk', hljsGrammar);
  })();/*! `sml` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: SML (Standard ML)
  Author: Edwin Dalorzo <edwin@dalorzo.org>
  Description: SML language definition.
  Website: https://www.smlnj.org
  Origin: ocaml.js
  Category: functional
  */
  function sml(hljs) {
    return {
      name: 'SML (Standard ML)',
      aliases: [ 'ml' ],
      keywords: {
        $pattern: '[a-z_]\\w*!?',
        keyword:
          /* according to Definition of Standard ML 97  */
          'abstype and andalso as case datatype do else end eqtype '
          + 'exception fn fun functor handle if in include infix infixr '
          + 'let local nonfix of op open orelse raise rec sharing sig '
          + 'signature struct structure then type val with withtype where while',
        built_in:
          /* built-in types according to basis library */
          'array bool char exn int list option order real ref string substring vector unit word',
        literal:
          'true false NONE SOME LESS EQUAL GREATER nil'
      },
      illegal: /\/\/|>>/,
      contains: [
        {
          className: 'literal',
          begin: /\[(\|\|)?\]|\(\)/,
          relevance: 0
        },
        hljs.COMMENT(
          '\\(\\*',
          '\\*\\)',
          { contains: [ 'self' ] }
        ),
        { /* type variable */
          className: 'symbol',
          begin: '\'[A-Za-z_](?!\')[\\w\']*'
          /* the grammar is ambiguous on how 'a'b should be interpreted but not the compiler */
        },
        { /* polymorphic variant */
          className: 'type',
          begin: '`[A-Z][\\w\']*'
        },
        { /* module or constructor */
          className: 'type',
          begin: '\\b[A-Z][\\w\']*',
          relevance: 0
        },
        { /* don't color identifiers, but safely catch all identifiers with ' */
          begin: '[a-z_]\\w*\'[\\w\']*' },
        hljs.inherit(hljs.APOS_STRING_MODE, {
          className: 'string',
          relevance: 0
        }),
        hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null }),
        {
          className: 'number',
          begin:
            '\\b(0[xX][a-fA-F0-9_]+[Lln]?|'
            + '0[oO][0-7_]+[Lln]?|'
            + '0[bB][01_]+[Lln]?|'
            + '[0-9][0-9_]*([Lln]|(\\.[0-9_]*)?([eE][-+]?[0-9_]+)?)?)',
          relevance: 0
        },
        { begin: /[-=]>/ // relevance booster
        }
      ]
    };
  }

  return sml;

})();

    hljs.registerLanguage('sml', hljsGrammar);
  })();/*! `sql` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
   Language: SQL
   Website: https://en.wikipedia.org/wiki/SQL
   Category: common, database
   */

  /*

  Goals:

  SQL is intended to highlight basic/common SQL keywords and expressions

  - If pretty much every single SQL server includes supports, then it's a canidate.
  - It is NOT intended to include tons of vendor specific keywords (Oracle, MySQL,
    PostgreSQL) although the list of data types is purposely a bit more expansive.
  - For more specific SQL grammars please see:
    - PostgreSQL and PL/pgSQL - core
    - T-SQL - https://github.com/highlightjs/highlightjs-tsql
    - sql_more (core)

   */

  function sql(hljs) {
    const regex = hljs.regex;
    const COMMENT_MODE = hljs.COMMENT('--', '$');
    const STRING = {
      className: 'string',
      variants: [
        {
          begin: /'/,
          end: /'/,
          contains: [ { begin: /''/ } ]
        }
      ]
    };
    const QUOTED_IDENTIFIER = {
      begin: /"/,
      end: /"/,
      contains: [ { begin: /""/ } ]
    };

    const LITERALS = [
      "true",
      "false",
      // Not sure it's correct to call NULL literal, and clauses like IS [NOT] NULL look strange that way.
      // "null",
      "unknown"
    ];

    const MULTI_WORD_TYPES = [
      "double precision",
      "large object",
      "with timezone",
      "without timezone"
    ];

    const TYPES = [
      'bigint',
      'binary',
      'blob',
      'boolean',
      'char',
      'character',
      'clob',
      'date',
      'dec',
      'decfloat',
      'decimal',
      'float',
      'int',
      'integer',
      'interval',
      'nchar',
      'nclob',
      'national',
      'numeric',
      'real',
      'row',
      'smallint',
      'time',
      'timestamp',
      'varchar',
      'varying', // modifier (character varying)
      'varbinary'
    ];

    const NON_RESERVED_WORDS = [
      "add",
      "asc",
      "collation",
      "desc",
      "final",
      "first",
      "last",
      "view"
    ];

    // https://jakewheat.github.io/sql-overview/sql-2016-foundation-grammar.html#reserved-word
    const RESERVED_WORDS = [
      "abs",
      "acos",
      "all",
      "allocate",
      "alter",
      "and",
      "any",
      "are",
      "array",
      "array_agg",
      "array_max_cardinality",
      "as",
      "asensitive",
      "asin",
      "asymmetric",
      "at",
      "atan",
      "atomic",
      "authorization",
      "avg",
      "begin",
      "begin_frame",
      "begin_partition",
      "between",
      "bigint",
      "binary",
      "blob",
      "boolean",
      "both",
      "by",
      "call",
      "called",
      "cardinality",
      "cascaded",
      "case",
      "cast",
      "ceil",
      "ceiling",
      "char",
      "char_length",
      "character",
      "character_length",
      "check",
      "classifier",
      "clob",
      "close",
      "coalesce",
      "collate",
      "collect",
      "column",
      "commit",
      "condition",
      "connect",
      "constraint",
      "contains",
      "convert",
      "copy",
      "corr",
      "corresponding",
      "cos",
      "cosh",
      "count",
      "covar_pop",
      "covar_samp",
      "create",
      "cross",
      "cube",
      "cume_dist",
      "current",
      "current_catalog",
      "current_date",
      "current_default_transform_group",
      "current_path",
      "current_role",
      "current_row",
      "current_schema",
      "current_time",
      "current_timestamp",
      "current_path",
      "current_role",
      "current_transform_group_for_type",
      "current_user",
      "cursor",
      "cycle",
      "date",
      "day",
      "deallocate",
      "dec",
      "decimal",
      "decfloat",
      "declare",
      "default",
      "define",
      "delete",
      "dense_rank",
      "deref",
      "describe",
      "deterministic",
      "disconnect",
      "distinct",
      "double",
      "drop",
      "dynamic",
      "each",
      "element",
      "else",
      "empty",
      "end",
      "end_frame",
      "end_partition",
      "end-exec",
      "equals",
      "escape",
      "every",
      "except",
      "exec",
      "execute",
      "exists",
      "exp",
      "external",
      "extract",
      "false",
      "fetch",
      "filter",
      "first_value",
      "float",
      "floor",
      "for",
      "foreign",
      "frame_row",
      "free",
      "from",
      "full",
      "function",
      "fusion",
      "get",
      "global",
      "grant",
      "group",
      "grouping",
      "groups",
      "having",
      "hold",
      "hour",
      "identity",
      "in",
      "indicator",
      "initial",
      "inner",
      "inout",
      "insensitive",
      "insert",
      "int",
      "integer",
      "intersect",
      "intersection",
      "interval",
      "into",
      "is",
      "join",
      "json_array",
      "json_arrayagg",
      "json_exists",
      "json_object",
      "json_objectagg",
      "json_query",
      "json_table",
      "json_table_primitive",
      "json_value",
      "lag",
      "language",
      "large",
      "last_value",
      "lateral",
      "lead",
      "leading",
      "left",
      "like",
      "like_regex",
      "listagg",
      "ln",
      "local",
      "localtime",
      "localtimestamp",
      "log",
      "log10",
      "lower",
      "match",
      "match_number",
      "match_recognize",
      "matches",
      "max",
      "member",
      "merge",
      "method",
      "min",
      "minute",
      "mod",
      "modifies",
      "module",
      "month",
      "multiset",
      "national",
      "natural",
      "nchar",
      "nclob",
      "new",
      "no",
      "none",
      "normalize",
      "not",
      "nth_value",
      "ntile",
      "null",
      "nullif",
      "numeric",
      "octet_length",
      "occurrences_regex",
      "of",
      "offset",
      "old",
      "omit",
      "on",
      "one",
      "only",
      "open",
      "or",
      "order",
      "out",
      "outer",
      "over",
      "overlaps",
      "overlay",
      "parameter",
      "partition",
      "pattern",
      "per",
      "percent",
      "percent_rank",
      "percentile_cont",
      "percentile_disc",
      "period",
      "portion",
      "position",
      "position_regex",
      "power",
      "precedes",
      "precision",
      "prepare",
      "primary",
      "procedure",
      "ptf",
      "range",
      "rank",
      "reads",
      "real",
      "recursive",
      "ref",
      "references",
      "referencing",
      "regr_avgx",
      "regr_avgy",
      "regr_count",
      "regr_intercept",
      "regr_r2",
      "regr_slope",
      "regr_sxx",
      "regr_sxy",
      "regr_syy",
      "release",
      "result",
      "return",
      "returns",
      "revoke",
      "right",
      "rollback",
      "rollup",
      "row",
      "row_number",
      "rows",
      "running",
      "savepoint",
      "scope",
      "scroll",
      "search",
      "second",
      "seek",
      "select",
      "sensitive",
      "session_user",
      "set",
      "show",
      "similar",
      "sin",
      "sinh",
      "skip",
      "smallint",
      "some",
      "specific",
      "specifictype",
      "sql",
      "sqlexception",
      "sqlstate",
      "sqlwarning",
      "sqrt",
      "start",
      "static",
      "stddev_pop",
      "stddev_samp",
      "submultiset",
      "subset",
      "substring",
      "substring_regex",
      "succeeds",
      "sum",
      "symmetric",
      "system",
      "system_time",
      "system_user",
      "table",
      "tablesample",
      "tan",
      "tanh",
      "then",
      "time",
      "timestamp",
      "timezone_hour",
      "timezone_minute",
      "to",
      "trailing",
      "translate",
      "translate_regex",
      "translation",
      "treat",
      "trigger",
      "trim",
      "trim_array",
      "true",
      "truncate",
      "uescape",
      "union",
      "unique",
      "unknown",
      "unnest",
      "update",
      "upper",
      "user",
      "using",
      "value",
      "values",
      "value_of",
      "var_pop",
      "var_samp",
      "varbinary",
      "varchar",
      "varying",
      "versioning",
      "when",
      "whenever",
      "where",
      "width_bucket",
      "window",
      "with",
      "within",
      "without",
      "year",
    ];

    // these are reserved words we have identified to be functions
    // and should only be highlighted in a dispatch-like context
    // ie, array_agg(...), etc.
    const RESERVED_FUNCTIONS = [
      "abs",
      "acos",
      "array_agg",
      "asin",
      "atan",
      "avg",
      "cast",
      "ceil",
      "ceiling",
      "coalesce",
      "corr",
      "cos",
      "cosh",
      "count",
      "covar_pop",
      "covar_samp",
      "cume_dist",
      "dense_rank",
      "deref",
      "element",
      "exp",
      "extract",
      "first_value",
      "floor",
      "json_array",
      "json_arrayagg",
      "json_exists",
      "json_object",
      "json_objectagg",
      "json_query",
      "json_table",
      "json_table_primitive",
      "json_value",
      "lag",
      "last_value",
      "lead",
      "listagg",
      "ln",
      "log",
      "log10",
      "lower",
      "max",
      "min",
      "mod",
      "nth_value",
      "ntile",
      "nullif",
      "percent_rank",
      "percentile_cont",
      "percentile_disc",
      "position",
      "position_regex",
      "power",
      "rank",
      "regr_avgx",
      "regr_avgy",
      "regr_count",
      "regr_intercept",
      "regr_r2",
      "regr_slope",
      "regr_sxx",
      "regr_sxy",
      "regr_syy",
      "row_number",
      "sin",
      "sinh",
      "sqrt",
      "stddev_pop",
      "stddev_samp",
      "substring",
      "substring_regex",
      "sum",
      "tan",
      "tanh",
      "translate",
      "translate_regex",
      "treat",
      "trim",
      "trim_array",
      "unnest",
      "upper",
      "value_of",
      "var_pop",
      "var_samp",
      "width_bucket",
    ];

    // these functions can
    const POSSIBLE_WITHOUT_PARENS = [
      "current_catalog",
      "current_date",
      "current_default_transform_group",
      "current_path",
      "current_role",
      "current_schema",
      "current_transform_group_for_type",
      "current_user",
      "session_user",
      "system_time",
      "system_user",
      "current_time",
      "localtime",
      "current_timestamp",
      "localtimestamp"
    ];

    // those exist to boost relevance making these very
    // "SQL like" keyword combos worth +1 extra relevance
    const COMBOS = [
      "create table",
      "insert into",
      "primary key",
      "foreign key",
      "not null",
      "alter table",
      "add constraint",
      "grouping sets",
      "on overflow",
      "character set",
      "respect nulls",
      "ignore nulls",
      "nulls first",
      "nulls last",
      "depth first",
      "breadth first"
    ];

    const FUNCTIONS = RESERVED_FUNCTIONS;

    const KEYWORDS = [
      ...RESERVED_WORDS,
      ...NON_RESERVED_WORDS
    ].filter((keyword) => {
      return !RESERVED_FUNCTIONS.includes(keyword);
    });

    const VARIABLE = {
      className: "variable",
      begin: /@[a-z0-9][a-z0-9_]*/,
    };

    const OPERATOR = {
      className: "operator",
      begin: /[-+*/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?/,
      relevance: 0,
    };

    const FUNCTION_CALL = {
      begin: regex.concat(/\b/, regex.either(...FUNCTIONS), /\s*\(/),
      relevance: 0,
      keywords: { built_in: FUNCTIONS }
    };

    // keywords with less than 3 letters are reduced in relevancy
    function reduceRelevancy(list, {
      exceptions, when
    } = {}) {
      const qualifyFn = when;
      exceptions = exceptions || [];
      return list.map((item) => {
        if (item.match(/\|\d+$/) || exceptions.includes(item)) {
          return item;
        } else if (qualifyFn(item)) {
          return `${item}|0`;
        } else {
          return item;
        }
      });
    }

    return {
      name: 'SQL',
      case_insensitive: true,
      // does not include {} or HTML tags `</`
      illegal: /[{}]|<\//,
      keywords: {
        $pattern: /\b[\w\.]+/,
        keyword:
          reduceRelevancy(KEYWORDS, { when: (x) => x.length < 3 }),
        literal: LITERALS,
        type: TYPES,
        built_in: POSSIBLE_WITHOUT_PARENS
      },
      contains: [
        {
          begin: regex.either(...COMBOS),
          relevance: 0,
          keywords: {
            $pattern: /[\w\.]+/,
            keyword: KEYWORDS.concat(COMBOS),
            literal: LITERALS,
            type: TYPES
          },
        },
        {
          className: "type",
          begin: regex.either(...MULTI_WORD_TYPES)
        },
        FUNCTION_CALL,
        VARIABLE,
        STRING,
        QUOTED_IDENTIFIER,
        hljs.C_NUMBER_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        COMMENT_MODE,
        OPERATOR
      ]
    };
  }

  return sql;

})();

    hljs.registerLanguage('sql', hljsGrammar);
  })();/*! `stata` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Stata
  Author: Brian Quistorff <bquistorff@gmail.com>
  Contributors: Drew McDonald <drewmcdo@gmail.com>
  Description: Stata is a general-purpose statistical software package created in 1985 by StataCorp.
  Website: https://en.wikipedia.org/wiki/Stata
  Category: scientific
  */

  /*
    This is a fork and modification of Drew McDonald's file (https://github.com/drewmcdonald/stata-highlighting). I have also included a list of builtin commands from https://bugs.kde.org/show_bug.cgi?id=135646.
  */

  function stata(hljs) {
    return {
      name: 'Stata',
      aliases: [
        'do',
        'ado'
      ],
      case_insensitive: true,
      keywords: 'if else in foreach for forv forva forval forvalu forvalue forvalues by bys bysort xi quietly qui capture about ac ac_7 acprplot acprplot_7 adjust ado adopath adoupdate alpha ameans an ano anov anova anova_estat anova_terms anovadef aorder ap app appe appen append arch arch_dr arch_estat arch_p archlm areg areg_p args arima arima_dr arima_estat arima_p as asmprobit asmprobit_estat asmprobit_lf asmprobit_mfx__dlg asmprobit_p ass asse asser assert avplot avplot_7 avplots avplots_7 bcskew0 bgodfrey bias binreg bip0_lf biplot bipp_lf bipr_lf bipr_p biprobit bitest bitesti bitowt blogit bmemsize boot bootsamp bootstrap bootstrap_8 boxco_l boxco_p boxcox boxcox_6 boxcox_p bprobit br break brier bro brow brows browse brr brrstat bs bs_7 bsampl_w bsample bsample_7 bsqreg bstat bstat_7 bstat_8 bstrap bstrap_7 bubble bubbleplot ca ca_estat ca_p cabiplot camat canon canon_8 canon_8_p canon_estat canon_p cap caprojection capt captu captur capture cat cc cchart cchart_7 cci cd censobs_table centile cf char chdir checkdlgfiles checkestimationsample checkhlpfiles checksum chelp ci cii cl class classutil clear cli clis clist clo clog clog_lf clog_p clogi clogi_sw clogit clogit_lf clogit_p clogitp clogl_sw cloglog clonevar clslistarray cluster cluster_measures cluster_stop cluster_tree cluster_tree_8 clustermat cmdlog cnr cnre cnreg cnreg_p cnreg_sw cnsreg codebook collaps4 collapse colormult_nb colormult_nw compare compress conf confi confir confirm conren cons const constr constra constrai constrain constraint continue contract copy copyright copysource cor corc corr corr2data corr_anti corr_kmo corr_smc corre correl correla correlat correlate corrgram cou coun count cox cox_p cox_sw coxbase coxhaz coxvar cprplot cprplot_7 crc cret cretu cretur creturn cross cs cscript cscript_log csi ct ct_is ctset ctst_5 ctst_st cttost cumsp cumsp_7 cumul cusum cusum_7 cutil d|0 datasig datasign datasigna datasignat datasignatu datasignatur datasignature datetof db dbeta de dec deco decod decode deff des desc descr descri describ describe destring dfbeta dfgls dfuller di di_g dir dirstats dis discard disp disp_res disp_s displ displa display distinct do doe doed doedi doedit dotplot dotplot_7 dprobit drawnorm drop ds ds_util dstdize duplicates durbina dwstat dydx e|0 ed edi edit egen eivreg emdef en enc enco encod encode eq erase ereg ereg_lf ereg_p ereg_sw ereghet ereghet_glf ereghet_glf_sh ereghet_gp ereghet_ilf ereghet_ilf_sh ereghet_ip eret eretu eretur ereturn err erro error esize est est_cfexist est_cfname est_clickable est_expand est_hold est_table est_unhold est_unholdok estat estat_default estat_summ estat_vce_only esti estimates etodow etof etomdy ex exi exit expand expandcl fac fact facto factor factor_estat factor_p factor_pca_rotated factor_rotate factormat fcast fcast_compute fcast_graph fdades fdadesc fdadescr fdadescri fdadescrib fdadescribe fdasav fdasave fdause fh_st file open file read file close file filefilter fillin find_hlp_file findfile findit findit_7 fit fl fli flis flist for5_0 forest forestplot form forma format fpredict frac_154 frac_adj frac_chk frac_cox frac_ddp frac_dis frac_dv frac_in frac_mun frac_pp frac_pq frac_pv frac_wgt frac_xo fracgen fracplot fracplot_7 fracpoly fracpred fron_ex fron_hn fron_p fron_tn fron_tn2 frontier ftodate ftoe ftomdy ftowdate funnel funnelplot g|0 gamhet_glf gamhet_gp gamhet_ilf gamhet_ip gamma gamma_d2 gamma_p gamma_sw gammahet gdi_hexagon gdi_spokes ge gen gene gener genera generat generate genrank genstd genvmean gettoken gl gladder gladder_7 glim_l01 glim_l02 glim_l03 glim_l04 glim_l05 glim_l06 glim_l07 glim_l08 glim_l09 glim_l10 glim_l11 glim_l12 glim_lf glim_mu glim_nw1 glim_nw2 glim_nw3 glim_p glim_v1 glim_v2 glim_v3 glim_v4 glim_v5 glim_v6 glim_v7 glm glm_6 glm_p glm_sw glmpred glo glob globa global glogit glogit_8 glogit_p gmeans gnbre_lf gnbreg gnbreg_5 gnbreg_p gomp_lf gompe_sw gomper_p gompertz gompertzhet gomphet_glf gomphet_glf_sh gomphet_gp gomphet_ilf gomphet_ilf_sh gomphet_ip gphdot gphpen gphprint gprefs gprobi_p gprobit gprobit_8 gr gr7 gr_copy gr_current gr_db gr_describe gr_dir gr_draw gr_draw_replay gr_drop gr_edit gr_editviewopts gr_example gr_example2 gr_export gr_print gr_qscheme gr_query gr_read gr_rename gr_replay gr_save gr_set gr_setscheme gr_table gr_undo gr_use graph graph7 grebar greigen greigen_7 greigen_8 grmeanby grmeanby_7 gs_fileinfo gs_filetype gs_graphinfo gs_stat gsort gwood h|0 hadimvo hareg hausman haver he heck_d2 heckma_p heckman heckp_lf heckpr_p heckprob hel help hereg hetpr_lf hetpr_p hetprob hettest hexdump hilite hist hist_7 histogram hlogit hlu hmeans hotel hotelling hprobit hreg hsearch icd9 icd9_ff icd9p iis impute imtest inbase include inf infi infil infile infix inp inpu input ins insheet insp inspe inspec inspect integ inten intreg intreg_7 intreg_p intrg2_ll intrg_ll intrg_ll2 ipolate iqreg ir irf irf_create irfm iri is_svy is_svysum isid istdize ivprob_1_lf ivprob_lf ivprobit ivprobit_p ivreg ivreg_footnote ivtob_1_lf ivtob_lf ivtobit ivtobit_p jackknife jacknife jknife jknife_6 jknife_8 jkstat joinby kalarma1 kap kap_3 kapmeier kappa kapwgt kdensity kdensity_7 keep ksm ksmirnov ktau kwallis l|0 la lab labbe labbeplot labe label labelbook ladder levels levelsof leverage lfit lfit_p li lincom line linktest lis list lloghet_glf lloghet_glf_sh lloghet_gp lloghet_ilf lloghet_ilf_sh lloghet_ip llogi_sw llogis_p llogist llogistic llogistichet lnorm_lf lnorm_sw lnorma_p lnormal lnormalhet lnormhet_glf lnormhet_glf_sh lnormhet_gp lnormhet_ilf lnormhet_ilf_sh lnormhet_ip lnskew0 loadingplot loc loca local log logi logis_lf logistic logistic_p logit logit_estat logit_p loglogs logrank loneway lookfor lookup lowess lowess_7 lpredict lrecomp lroc lroc_7 lrtest ls lsens lsens_7 lsens_x lstat ltable ltable_7 ltriang lv lvr2plot lvr2plot_7 m|0 ma mac macr macro makecns man manova manova_estat manova_p manovatest mantel mark markin markout marksample mat mat_capp mat_order mat_put_rr mat_rapp mata mata_clear mata_describe mata_drop mata_matdescribe mata_matsave mata_matuse mata_memory mata_mlib mata_mosave mata_rename mata_which matalabel matcproc matlist matname matr matri matrix matrix_input__dlg matstrik mcc mcci md0_ md1_ md1debug_ md2_ md2debug_ mds mds_estat mds_p mdsconfig mdslong mdsmat mdsshepard mdytoe mdytof me_derd mean means median memory memsize menl meqparse mer merg merge meta mfp mfx mhelp mhodds minbound mixed_ll mixed_ll_reparm mkassert mkdir mkmat mkspline ml ml_5 ml_adjs ml_bhhhs ml_c_d ml_check ml_clear ml_cnt ml_debug ml_defd ml_e0 ml_e0_bfgs ml_e0_cycle ml_e0_dfp ml_e0i ml_e1 ml_e1_bfgs ml_e1_bhhh ml_e1_cycle ml_e1_dfp ml_e2 ml_e2_cycle ml_ebfg0 ml_ebfr0 ml_ebfr1 ml_ebh0q ml_ebhh0 ml_ebhr0 ml_ebr0i ml_ecr0i ml_edfp0 ml_edfr0 ml_edfr1 ml_edr0i ml_eds ml_eer0i ml_egr0i ml_elf ml_elf_bfgs ml_elf_bhhh ml_elf_cycle ml_elf_dfp ml_elfi ml_elfs ml_enr0i ml_enrr0 ml_erdu0 ml_erdu0_bfgs ml_erdu0_bhhh ml_erdu0_bhhhq ml_erdu0_cycle ml_erdu0_dfp ml_erdu0_nrbfgs ml_exde ml_footnote ml_geqnr ml_grad0 ml_graph ml_hbhhh ml_hd0 ml_hold ml_init ml_inv ml_log ml_max ml_mlout ml_mlout_8 ml_model ml_nb0 ml_opt ml_p ml_plot ml_query ml_rdgrd ml_repor ml_s_e ml_score ml_searc ml_technique ml_unhold mleval mlf_ mlmatbysum mlmatsum mlog mlogi mlogit mlogit_footnote mlogit_p mlopts mlsum mlvecsum mnl0_ mor more mov move mprobit mprobit_lf mprobit_p mrdu0_ mrdu1_ mvdecode mvencode mvreg mvreg_estat n|0 nbreg nbreg_al nbreg_lf nbreg_p nbreg_sw nestreg net newey newey_7 newey_p news nl nl_7 nl_9 nl_9_p nl_p nl_p_7 nlcom nlcom_p nlexp2 nlexp2_7 nlexp2a nlexp2a_7 nlexp3 nlexp3_7 nlgom3 nlgom3_7 nlgom4 nlgom4_7 nlinit nllog3 nllog3_7 nllog4 nllog4_7 nlog_rd nlogit nlogit_p nlogitgen nlogittree nlpred no nobreak noi nois noisi noisil noisily note notes notes_dlg nptrend numlabel numlist odbc old_ver olo olog ologi ologi_sw ologit ologit_p ologitp on one onew onewa oneway op_colnm op_comp op_diff op_inv op_str opr opro oprob oprob_sw oprobi oprobi_p oprobit oprobitp opts_exclusive order orthog orthpoly ou out outf outfi outfil outfile outs outsh outshe outshee outsheet ovtest pac pac_7 palette parse parse_dissim pause pca pca_8 pca_display pca_estat pca_p pca_rotate pcamat pchart pchart_7 pchi pchi_7 pcorr pctile pentium pergram pergram_7 permute permute_8 personal peto_st pkcollapse pkcross pkequiv pkexamine pkexamine_7 pkshape pksumm pksumm_7 pl plo plot plugin pnorm pnorm_7 poisgof poiss_lf poiss_sw poisso_p poisson poisson_estat post postclose postfile postutil pperron pr prais prais_e prais_e2 prais_p predict predictnl preserve print pro prob probi probit probit_estat probit_p proc_time procoverlay procrustes procrustes_estat procrustes_p profiler prog progr progra program prop proportion prtest prtesti pwcorr pwd q\\s qby qbys qchi qchi_7 qladder qladder_7 qnorm qnorm_7 qqplot qqplot_7 qreg qreg_c qreg_p qreg_sw qu quadchk quantile quantile_7 que quer query range ranksum ratio rchart rchart_7 rcof recast reclink recode reg reg3 reg3_p regdw regr regre regre_p2 regres regres_p regress regress_estat regriv_p remap ren rena renam rename renpfix repeat replace report reshape restore ret retu retur return rm rmdir robvar roccomp roccomp_7 roccomp_8 rocf_lf rocfit rocfit_8 rocgold rocplot rocplot_7 roctab roctab_7 rolling rologit rologit_p rot rota rotat rotate rotatemat rreg rreg_p ru run runtest rvfplot rvfplot_7 rvpplot rvpplot_7 sa safesum sample sampsi sav save savedresults saveold sc sca scal scala scalar scatter scm_mine sco scob_lf scob_p scobi_sw scobit scor score scoreplot scoreplot_help scree screeplot screeplot_help sdtest sdtesti se search separate seperate serrbar serrbar_7 serset set set_defaults sfrancia sh she shel shell shewhart shewhart_7 signestimationsample signrank signtest simul simul_7 simulate simulate_8 sktest sleep slogit slogit_d2 slogit_p smooth snapspan so sor sort spearman spikeplot spikeplot_7 spikeplt spline_x split sqreg sqreg_p sret sretu sretur sreturn ssc st st_ct st_hc st_hcd st_hcd_sh st_is st_issys st_note st_promo st_set st_show st_smpl st_subid stack statsby statsby_8 stbase stci stci_7 stcox stcox_estat stcox_fr stcox_fr_ll stcox_p stcox_sw stcoxkm stcoxkm_7 stcstat stcurv stcurve stcurve_7 stdes stem stepwise stereg stfill stgen stir stjoin stmc stmh stphplot stphplot_7 stphtest stphtest_7 stptime strate strate_7 streg streg_sw streset sts sts_7 stset stsplit stsum sttocc sttoct stvary stweib su suest suest_8 sum summ summa summar summari summariz summarize sunflower sureg survcurv survsum svar svar_p svmat svy svy_disp svy_dreg svy_est svy_est_7 svy_estat svy_get svy_gnbreg_p svy_head svy_header svy_heckman_p svy_heckprob_p svy_intreg_p svy_ivreg_p svy_logistic_p svy_logit_p svy_mlogit_p svy_nbreg_p svy_ologit_p svy_oprobit_p svy_poisson_p svy_probit_p svy_regress_p svy_sub svy_sub_7 svy_x svy_x_7 svy_x_p svydes svydes_8 svygen svygnbreg svyheckman svyheckprob svyintreg svyintreg_7 svyintrg svyivreg svylc svylog_p svylogit svymarkout svymarkout_8 svymean svymlog svymlogit svynbreg svyolog svyologit svyoprob svyoprobit svyopts svypois svypois_7 svypoisson svyprobit svyprobt svyprop svyprop_7 svyratio svyreg svyreg_p svyregress svyset svyset_7 svyset_8 svytab svytab_7 svytest svytotal sw sw_8 swcnreg swcox swereg swilk swlogis swlogit swologit swoprbt swpois swprobit swqreg swtobit swweib symmetry symmi symplot symplot_7 syntax sysdescribe sysdir sysuse szroeter ta tab tab1 tab2 tab_or tabd tabdi tabdis tabdisp tabi table tabodds tabodds_7 tabstat tabu tabul tabula tabulat tabulate te tempfile tempname tempvar tes test testnl testparm teststd tetrachoric time_it timer tis tob tobi tobit tobit_p tobit_sw token tokeni tokeniz tokenize tostring total translate translator transmap treat_ll treatr_p treatreg trim trimfill trnb_cons trnb_mean trpoiss_d2 trunc_ll truncr_p truncreg tsappend tset tsfill tsline tsline_ex tsreport tsrevar tsrline tsset tssmooth tsunab ttest ttesti tut_chk tut_wait tutorial tw tware_st two twoway twoway__fpfit_serset twoway__function_gen twoway__histogram_gen twoway__ipoint_serset twoway__ipoints_serset twoway__kdensity_gen twoway__lfit_serset twoway__normgen_gen twoway__pci_serset twoway__qfit_serset twoway__scatteri_serset twoway__sunflower_gen twoway_ksm_serset ty typ type typeof u|0 unab unabbrev unabcmd update us use uselabel var var_mkcompanion var_p varbasic varfcast vargranger varirf varirf_add varirf_cgraph varirf_create varirf_ctable varirf_describe varirf_dir varirf_drop varirf_erase varirf_graph varirf_ograph varirf_rename varirf_set varirf_table varlist varlmar varnorm varsoc varstable varstable_w varstable_w2 varwle vce vec vec_fevd vec_mkphi vec_p vec_p_w vecirf_create veclmar veclmar_w vecnorm vecnorm_w vecrank vecstable verinst vers versi versio version view viewsource vif vwls wdatetof webdescribe webseek webuse weib1_lf weib2_lf weib_lf weib_lf0 weibhet_glf weibhet_glf_sh weibhet_glfa weibhet_glfa_sh weibhet_gp weibhet_ilf weibhet_ilf_sh weibhet_ilfa weibhet_ilfa_sh weibhet_ip weibu_sw weibul_p weibull weibull_c weibull_s weibullhet wh whelp whi which whil while wilc_st wilcoxon win wind windo window winexec wntestb wntestb_7 wntestq xchart xchart_7 xcorr xcorr_7 xi xi_6 xmlsav xmlsave xmluse xpose xsh xshe xshel xshell xt_iis xt_tis xtab_p xtabond xtbin_p xtclog xtcloglog xtcloglog_8 xtcloglog_d2 xtcloglog_pa_p xtcloglog_re_p xtcnt_p xtcorr xtdata xtdes xtfront_p xtfrontier xtgee xtgee_elink xtgee_estat xtgee_makeivar xtgee_p xtgee_plink xtgls xtgls_p xthaus xthausman xtht_p xthtaylor xtile xtint_p xtintreg xtintreg_8 xtintreg_d2 xtintreg_p xtivp_1 xtivp_2 xtivreg xtline xtline_ex xtlogit xtlogit_8 xtlogit_d2 xtlogit_fe_p xtlogit_pa_p xtlogit_re_p xtmixed xtmixed_estat xtmixed_p xtnb_fe xtnb_lf xtnbreg xtnbreg_pa_p xtnbreg_refe_p xtpcse xtpcse_p xtpois xtpoisson xtpoisson_d2 xtpoisson_pa_p xtpoisson_refe_p xtpred xtprobit xtprobit_8 xtprobit_d2 xtprobit_re_p xtps_fe xtps_lf xtps_ren xtps_ren_8 xtrar_p xtrc xtrc_p xtrchh xtrefe_p xtreg xtreg_be xtreg_fe xtreg_ml xtreg_pa_p xtreg_re xtregar xtrere_p xtset xtsf_ll xtsf_llti xtsum xttab xttest0 xttobit xttobit_8 xttobit_p xttrans yx yxview__barlike_draw yxview_area_draw yxview_bar_draw yxview_dot_draw yxview_dropline_draw yxview_function_draw yxview_iarrow_draw yxview_ilabels_draw yxview_normal_draw yxview_pcarrow_draw yxview_pcbarrow_draw yxview_pccapsym_draw yxview_pcscatter_draw yxview_pcspike_draw yxview_rarea_draw yxview_rbar_draw yxview_rbarm_draw yxview_rcap_draw yxview_rcapsym_draw yxview_rconnected_draw yxview_rline_draw yxview_rscatter_draw yxview_rspike_draw yxview_spike_draw yxview_sunflower_draw zap_s zinb zinb_llf zinb_plf zip zip_llf zip_p zip_plf zt_ct_5 zt_hc_5 zt_hcd_5 zt_is_5 zt_iss_5 zt_sho_5 zt_smp_5 ztbase_5 ztcox_5 ztdes_5 ztereg_5 ztfill_5 ztgen_5 ztir_5 ztjoin_5 ztnb ztnb_p ztp ztp_p zts_5 ztset_5 ztspli_5 ztsum_5 zttoct_5 ztvary_5 ztweib_5',
      contains: [
        {
          className: 'symbol',
          begin: /`[a-zA-Z0-9_]+'/
        },
        {
          className: 'variable',
          begin: /\$\{?[a-zA-Z0-9_]+\}?/,
          relevance: 0
        },
        {
          className: 'string',
          variants: [
            { begin: '`"[^\r\n]*?"\'' },
            { begin: '"[^\r\n"]*"' }
          ]
        },

        {
          className: 'built_in',
          variants: [ { begin: '\\b(abs|acos|asin|atan|atan2|atanh|ceil|cloglog|comb|cos|digamma|exp|floor|invcloglog|invlogit|ln|lnfact|lnfactorial|lngamma|log|log10|max|min|mod|reldif|round|sign|sin|sqrt|sum|tan|tanh|trigamma|trunc|betaden|Binomial|binorm|binormal|chi2|chi2tail|dgammapda|dgammapdada|dgammapdadx|dgammapdx|dgammapdxdx|F|Fden|Ftail|gammaden|gammap|ibeta|invbinomial|invchi2|invchi2tail|invF|invFtail|invgammap|invibeta|invnchi2|invnFtail|invnibeta|invnorm|invnormal|invttail|nbetaden|nchi2|nFden|nFtail|nibeta|norm|normal|normalden|normd|npnchi2|tden|ttail|uniform|abbrev|char|index|indexnot|length|lower|ltrim|match|plural|proper|real|regexm|regexr|regexs|reverse|rtrim|string|strlen|strlower|strltrim|strmatch|strofreal|strpos|strproper|strreverse|strrtrim|strtrim|strupper|subinstr|subinword|substr|trim|upper|word|wordcount|_caller|autocode|byteorder|chop|clip|cond|e|epsdouble|epsfloat|group|inlist|inrange|irecode|matrix|maxbyte|maxdouble|maxfloat|maxint|maxlong|mi|minbyte|mindouble|minfloat|minint|minlong|missing|r|recode|replay|return|s|scalar|d|date|day|dow|doy|halfyear|mdy|month|quarter|week|year|d|daily|dofd|dofh|dofm|dofq|dofw|dofy|h|halfyearly|hofd|m|mofd|monthly|q|qofd|quarterly|tin|twithin|w|weekly|wofd|y|yearly|yh|ym|yofd|yq|yw|cholesky|colnumb|colsof|corr|det|diag|diag0cnt|el|get|hadamard|I|inv|invsym|issym|issymmetric|J|matmissing|matuniform|mreldif|nullmat|rownumb|rowsof|sweep|syminv|trace|vec|vecdiag)(?=\\()' } ]
        },

        hljs.COMMENT('^[ \t]*\\*.*$', false),
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE
      ]
    };
  }

  return stata;

})();

    hljs.registerLanguage('stata', hljsGrammar);
  })();/*! `subunit` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: SubUnit
  Author: Sergey Bronnikov <sergeyb@bronevichok.ru>
  Website: https://pypi.org/project/python-subunit/
  Category: protocols
  */

  function subunit(hljs) {
    const DETAILS = {
      className: 'string',
      begin: '\\[\n(multipart)?',
      end: '\\]\n'
    };
    const TIME = {
      className: 'string',
      begin: '\\d{4}-\\d{2}-\\d{2}(\\s+)\\d{2}:\\d{2}:\\d{2}\.\\d+Z'
    };
    const PROGRESSVALUE = {
      className: 'string',
      begin: '(\\+|-)\\d+'
    };
    const KEYWORDS = {
      className: 'keyword',
      relevance: 10,
      variants: [
        { begin: '^(test|testing|success|successful|failure|error|skip|xfail|uxsuccess)(:?)\\s+(test)?' },
        { begin: '^progress(:?)(\\s+)?(pop|push)?' },
        { begin: '^tags:' },
        { begin: '^time:' }
      ]
    };
    return {
      name: 'SubUnit',
      case_insensitive: true,
      contains: [
        DETAILS,
        TIME,
        PROGRESSVALUE,
        KEYWORDS
      ]
    };
  }

  return subunit;

})();

    hljs.registerLanguage('subunit', hljsGrammar);
  })();/*! `swift` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /**
   * @param {string} value
   * @returns {RegExp}
   * */

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function source(re) {
    if (!re) return null;
    if (typeof re === "string") return re;

    return re.source;
  }

  /**
   * @param {RegExp | string } re
   * @returns {string}
   */
  function lookahead(re) {
    return concat('(?=', re, ')');
  }

  /**
   * @param {...(RegExp | string) } args
   * @returns {string}
   */
  function concat(...args) {
    const joined = args.map((x) => source(x)).join("");
    return joined;
  }

  /**
   * @param { Array<string | RegExp | Object> } args
   * @returns {object}
   */
  function stripOptionsFromArgs(args) {
    const opts = args[args.length - 1];

    if (typeof opts === 'object' && opts.constructor === Object) {
      args.splice(args.length - 1, 1);
      return opts;
    } else {
      return {};
    }
  }

  /** @typedef { {capture?: boolean} } RegexEitherOptions */

  /**
   * Any of the passed expresssions may match
   *
   * Creates a huge this | this | that | that match
   * @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
   * @returns {string}
   */
  function either(...args) {
    /** @type { object & {capture?: boolean} }  */
    const opts = stripOptionsFromArgs(args);
    const joined = '('
      + (opts.capture ? "" : "?:")
      + args.map((x) => source(x)).join("|") + ")";
    return joined;
  }

  const keywordWrapper = keyword => concat(
    /\b/,
    keyword,
    /\w$/.test(keyword) ? /\b/ : /\B/
  );

  // Keywords that require a leading dot.
  const dotKeywords = [
    'Protocol', // contextual
    'Type' // contextual
  ].map(keywordWrapper);

  // Keywords that may have a leading dot.
  const optionalDotKeywords = [
    'init',
    'self'
  ].map(keywordWrapper);

  // should register as keyword, not type
  const keywordTypes = [
    'Any',
    'Self'
  ];

  // Regular keywords and literals.
  const keywords = [
    // strings below will be fed into the regular `keywords` engine while regex
    // will result in additional modes being created to scan for those keywords to
    // avoid conflicts with other rules
    'actor',
    'any', // contextual
    'associatedtype',
    'async',
    'await',
    /as\?/, // operator
    /as!/, // operator
    'as', // operator
    'borrowing', // contextual
    'break',
    'case',
    'catch',
    'class',
    'consume', // contextual
    'consuming', // contextual
    'continue',
    'convenience', // contextual
    'copy', // contextual
    'default',
    'defer',
    'deinit',
    'didSet', // contextual
    'distributed',
    'do',
    'dynamic', // contextual
    'each',
    'else',
    'enum',
    'extension',
    'fallthrough',
    /fileprivate\(set\)/,
    'fileprivate',
    'final', // contextual
    'for',
    'func',
    'get', // contextual
    'guard',
    'if',
    'import',
    'indirect', // contextual
    'infix', // contextual
    /init\?/,
    /init!/,
    'inout',
    /internal\(set\)/,
    'internal',
    'in',
    'is', // operator
    'isolated', // contextual
    'nonisolated', // contextual
    'lazy', // contextual
    'let',
    'macro',
    'mutating', // contextual
    'nonmutating', // contextual
    /open\(set\)/, // contextual
    'open', // contextual
    'operator',
    'optional', // contextual
    'override', // contextual
    'postfix', // contextual
    'precedencegroup',
    'prefix', // contextual
    /private\(set\)/,
    'private',
    'protocol',
    /public\(set\)/,
    'public',
    'repeat',
    'required', // contextual
    'rethrows',
    'return',
    'set', // contextual
    'some', // contextual
    'static',
    'struct',
    'subscript',
    'super',
    'switch',
    'throws',
    'throw',
    /try\?/, // operator
    /try!/, // operator
    'try', // operator
    'typealias',
    /unowned\(safe\)/, // contextual
    /unowned\(unsafe\)/, // contextual
    'unowned', // contextual
    'var',
    'weak', // contextual
    'where',
    'while',
    'willSet' // contextual
  ];

  // NOTE: Contextual keywords are reserved only in specific contexts.
  // Ideally, these should be matched using modes to avoid false positives.

  // Literals.
  const literals = [
    'false',
    'nil',
    'true'
  ];

  // Keywords used in precedence groups.
  const precedencegroupKeywords = [
    'assignment',
    'associativity',
    'higherThan',
    'left',
    'lowerThan',
    'none',
    'right'
  ];

  // Keywords that start with a number sign (#).
  // #(un)available is handled separately.
  const numberSignKeywords = [
    '#colorLiteral',
    '#column',
    '#dsohandle',
    '#else',
    '#elseif',
    '#endif',
    '#error',
    '#file',
    '#fileID',
    '#fileLiteral',
    '#filePath',
    '#function',
    '#if',
    '#imageLiteral',
    '#keyPath',
    '#line',
    '#selector',
    '#sourceLocation',
    '#warning'
  ];

  // Global functions in the Standard Library.
  const builtIns = [
    'abs',
    'all',
    'any',
    'assert',
    'assertionFailure',
    'debugPrint',
    'dump',
    'fatalError',
    'getVaList',
    'isKnownUniquelyReferenced',
    'max',
    'min',
    'numericCast',
    'pointwiseMax',
    'pointwiseMin',
    'precondition',
    'preconditionFailure',
    'print',
    'readLine',
    'repeatElement',
    'sequence',
    'stride',
    'swap',
    'swift_unboxFromSwiftValueWithType',
    'transcode',
    'type',
    'unsafeBitCast',
    'unsafeDowncast',
    'withExtendedLifetime',
    'withUnsafeMutablePointer',
    'withUnsafePointer',
    'withVaList',
    'withoutActuallyEscaping',
    'zip'
  ];

  // Valid first characters for operators.
  const operatorHead = either(
    /[/=\-+!*%<>&|^~?]/,
    /[\u00A1-\u00A7]/,
    /[\u00A9\u00AB]/,
    /[\u00AC\u00AE]/,
    /[\u00B0\u00B1]/,
    /[\u00B6\u00BB\u00BF\u00D7\u00F7]/,
    /[\u2016-\u2017]/,
    /[\u2020-\u2027]/,
    /[\u2030-\u203E]/,
    /[\u2041-\u2053]/,
    /[\u2055-\u205E]/,
    /[\u2190-\u23FF]/,
    /[\u2500-\u2775]/,
    /[\u2794-\u2BFF]/,
    /[\u2E00-\u2E7F]/,
    /[\u3001-\u3003]/,
    /[\u3008-\u3020]/,
    /[\u3030]/
  );

  // Valid characters for operators.
  const operatorCharacter = either(
    operatorHead,
    /[\u0300-\u036F]/,
    /[\u1DC0-\u1DFF]/,
    /[\u20D0-\u20FF]/,
    /[\uFE00-\uFE0F]/,
    /[\uFE20-\uFE2F]/
    // TODO: The following characters are also allowed, but the regex isn't supported yet.
    // /[\u{E0100}-\u{E01EF}]/u
  );

  // Valid operator.
  const operator = concat(operatorHead, operatorCharacter, '*');

  // Valid first characters for identifiers.
  const identifierHead = either(
    /[a-zA-Z_]/,
    /[\u00A8\u00AA\u00AD\u00AF\u00B2-\u00B5\u00B7-\u00BA]/,
    /[\u00BC-\u00BE\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/,
    /[\u0100-\u02FF\u0370-\u167F\u1681-\u180D\u180F-\u1DBF]/,
    /[\u1E00-\u1FFF]/,
    /[\u200B-\u200D\u202A-\u202E\u203F-\u2040\u2054\u2060-\u206F]/,
    /[\u2070-\u20CF\u2100-\u218F\u2460-\u24FF\u2776-\u2793]/,
    /[\u2C00-\u2DFF\u2E80-\u2FFF]/,
    /[\u3004-\u3007\u3021-\u302F\u3031-\u303F\u3040-\uD7FF]/,
    /[\uF900-\uFD3D\uFD40-\uFDCF\uFDF0-\uFE1F\uFE30-\uFE44]/,
    /[\uFE47-\uFEFE\uFF00-\uFFFD]/ // Should be /[\uFE47-\uFFFD]/, but we have to exclude FEFF.
    // The following characters are also allowed, but the regexes aren't supported yet.
    // /[\u{10000}-\u{1FFFD}\u{20000-\u{2FFFD}\u{30000}-\u{3FFFD}\u{40000}-\u{4FFFD}]/u,
    // /[\u{50000}-\u{5FFFD}\u{60000-\u{6FFFD}\u{70000}-\u{7FFFD}\u{80000}-\u{8FFFD}]/u,
    // /[\u{90000}-\u{9FFFD}\u{A0000-\u{AFFFD}\u{B0000}-\u{BFFFD}\u{C0000}-\u{CFFFD}]/u,
    // /[\u{D0000}-\u{DFFFD}\u{E0000-\u{EFFFD}]/u
  );

  // Valid characters for identifiers.
  const identifierCharacter = either(
    identifierHead,
    /\d/,
    /[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/
  );

  // Valid identifier.
  const identifier = concat(identifierHead, identifierCharacter, '*');

  // Valid type identifier.
  const typeIdentifier = concat(/[A-Z]/, identifierCharacter, '*');

  // Built-in attributes, which are highlighted as keywords.
  // @available is handled separately.
  // https://docs.swift.org/swift-book/documentation/the-swift-programming-language/attributes
  const keywordAttributes = [
    'attached',
    'autoclosure',
    concat(/convention\(/, either('swift', 'block', 'c'), /\)/),
    'discardableResult',
    'dynamicCallable',
    'dynamicMemberLookup',
    'escaping',
    'freestanding',
    'frozen',
    'GKInspectable',
    'IBAction',
    'IBDesignable',
    'IBInspectable',
    'IBOutlet',
    'IBSegueAction',
    'inlinable',
    'main',
    'nonobjc',
    'NSApplicationMain',
    'NSCopying',
    'NSManaged',
    concat(/objc\(/, identifier, /\)/),
    'objc',
    'objcMembers',
    'propertyWrapper',
    'requires_stored_property_inits',
    'resultBuilder',
    'Sendable',
    'testable',
    'UIApplicationMain',
    'unchecked',
    'unknown',
    'usableFromInline',
    'warn_unqualified_access'
  ];

  // Contextual keywords used in @available and #(un)available.
  const availabilityKeywords = [
    'iOS',
    'iOSApplicationExtension',
    'macOS',
    'macOSApplicationExtension',
    'macCatalyst',
    'macCatalystApplicationExtension',
    'watchOS',
    'watchOSApplicationExtension',
    'tvOS',
    'tvOSApplicationExtension',
    'swift'
  ];

  /*
  Language: Swift
  Description: Swift is a general-purpose programming language built using a modern approach to safety, performance, and software design patterns.
  Author: Steven Van Impe <steven.vanimpe@icloud.com>
  Contributors: Chris Eidhof <chris@eidhof.nl>, Nate Cook <natecook@gmail.com>, Alexander Lichter <manniL@gmx.net>, Richard Gibson <gibson042@github>
  Website: https://swift.org
  Category: common, system
  */


  /** @type LanguageFn */
  function swift(hljs) {
    const WHITESPACE = {
      match: /\s+/,
      relevance: 0
    };
    // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID411
    const BLOCK_COMMENT = hljs.COMMENT(
      '/\\*',
      '\\*/',
      { contains: [ 'self' ] }
    );
    const COMMENTS = [
      hljs.C_LINE_COMMENT_MODE,
      BLOCK_COMMENT
    ];

    // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID413
    // https://docs.swift.org/swift-book/ReferenceManual/zzSummaryOfTheGrammar.html
    const DOT_KEYWORD = {
      match: [
        /\./,
        either(...dotKeywords, ...optionalDotKeywords)
      ],
      className: { 2: "keyword" }
    };
    const KEYWORD_GUARD = {
      // Consume .keyword to prevent highlighting properties and methods as keywords.
      match: concat(/\./, either(...keywords)),
      relevance: 0
    };
    const PLAIN_KEYWORDS = keywords
      .filter(kw => typeof kw === 'string')
      .concat([ "_|0" ]); // seems common, so 0 relevance
    const REGEX_KEYWORDS = keywords
      .filter(kw => typeof kw !== 'string') // find regex
      .concat(keywordTypes)
      .map(keywordWrapper);
    const KEYWORD = { variants: [
      {
        className: 'keyword',
        match: either(...REGEX_KEYWORDS, ...optionalDotKeywords)
      }
    ] };
    // find all the regular keywords
    const KEYWORDS = {
      $pattern: either(
        /\b\w+/, // regular keywords
        /#\w+/ // number keywords
      ),
      keyword: PLAIN_KEYWORDS
        .concat(numberSignKeywords),
      literal: literals
    };
    const KEYWORD_MODES = [
      DOT_KEYWORD,
      KEYWORD_GUARD,
      KEYWORD
    ];

    // https://github.com/apple/swift/tree/main/stdlib/public/core
    const BUILT_IN_GUARD = {
      // Consume .built_in to prevent highlighting properties and methods.
      match: concat(/\./, either(...builtIns)),
      relevance: 0
    };
    const BUILT_IN = {
      className: 'built_in',
      match: concat(/\b/, either(...builtIns), /(?=\()/)
    };
    const BUILT_INS = [
      BUILT_IN_GUARD,
      BUILT_IN
    ];

    // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID418
    const OPERATOR_GUARD = {
      // Prevent -> from being highlighting as an operator.
      match: /->/,
      relevance: 0
    };
    const OPERATOR = {
      className: 'operator',
      relevance: 0,
      variants: [
        { match: operator },
        {
          // dot-operator: only operators that start with a dot are allowed to use dots as
          // characters (..., ...<, .*, etc). So there rule here is: a dot followed by one or more
          // characters that may also include dots.
          match: `\\.(\\.|${operatorCharacter})+` }
      ]
    };
    const OPERATORS = [
      OPERATOR_GUARD,
      OPERATOR
    ];

    // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#grammar_numeric-literal
    // TODO: Update for leading `-` after lookbehind is supported everywhere
    const decimalDigits = '([0-9]_*)+';
    const hexDigits = '([0-9a-fA-F]_*)+';
    const NUMBER = {
      className: 'number',
      relevance: 0,
      variants: [
        // decimal floating-point-literal (subsumes decimal-literal)
        { match: `\\b(${decimalDigits})(\\.(${decimalDigits}))?` + `([eE][+-]?(${decimalDigits}))?\\b` },
        // hexadecimal floating-point-literal (subsumes hexadecimal-literal)
        { match: `\\b0x(${hexDigits})(\\.(${hexDigits}))?` + `([pP][+-]?(${decimalDigits}))?\\b` },
        // octal-literal
        { match: /\b0o([0-7]_*)+\b/ },
        // binary-literal
        { match: /\b0b([01]_*)+\b/ }
      ]
    };

    // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#grammar_string-literal
    const ESCAPED_CHARACTER = (rawDelimiter = "") => ({
      className: 'subst',
      variants: [
        { match: concat(/\\/, rawDelimiter, /[0\\tnr"']/) },
        { match: concat(/\\/, rawDelimiter, /u\{[0-9a-fA-F]{1,8}\}/) }
      ]
    });
    const ESCAPED_NEWLINE = (rawDelimiter = "") => ({
      className: 'subst',
      match: concat(/\\/, rawDelimiter, /[\t ]*(?:[\r\n]|\r\n)/)
    });
    const INTERPOLATION = (rawDelimiter = "") => ({
      className: 'subst',
      label: "interpol",
      begin: concat(/\\/, rawDelimiter, /\(/),
      end: /\)/
    });
    const MULTILINE_STRING = (rawDelimiter = "") => ({
      begin: concat(rawDelimiter, /"""/),
      end: concat(/"""/, rawDelimiter),
      contains: [
        ESCAPED_CHARACTER(rawDelimiter),
        ESCAPED_NEWLINE(rawDelimiter),
        INTERPOLATION(rawDelimiter)
      ]
    });
    const SINGLE_LINE_STRING = (rawDelimiter = "") => ({
      begin: concat(rawDelimiter, /"/),
      end: concat(/"/, rawDelimiter),
      contains: [
        ESCAPED_CHARACTER(rawDelimiter),
        INTERPOLATION(rawDelimiter)
      ]
    });
    const STRING = {
      className: 'string',
      variants: [
        MULTILINE_STRING(),
        MULTILINE_STRING("#"),
        MULTILINE_STRING("##"),
        MULTILINE_STRING("###"),
        SINGLE_LINE_STRING(),
        SINGLE_LINE_STRING("#"),
        SINGLE_LINE_STRING("##"),
        SINGLE_LINE_STRING("###")
      ]
    };

    const REGEXP_CONTENTS = [
      hljs.BACKSLASH_ESCAPE,
      {
        begin: /\[/,
        end: /\]/,
        relevance: 0,
        contains: [ hljs.BACKSLASH_ESCAPE ]
      }
    ];

    const BARE_REGEXP_LITERAL = {
      begin: /\/[^\s](?=[^/\n]*\/)/,
      end: /\//,
      contains: REGEXP_CONTENTS
    };

    const EXTENDED_REGEXP_LITERAL = (rawDelimiter) => {
      const begin = concat(rawDelimiter, /\//);
      const end = concat(/\//, rawDelimiter);
      return {
        begin,
        end,
        contains: [
          ...REGEXP_CONTENTS,
          {
            scope: "comment",
            begin: `#(?!.*${end})`,
            end: /$/,
          },
        ],
      };
    };

    // https://docs.swift.org/swift-book/documentation/the-swift-programming-language/lexicalstructure/#Regular-Expression-Literals
    const REGEXP = {
      scope: "regexp",
      variants: [
        EXTENDED_REGEXP_LITERAL('###'),
        EXTENDED_REGEXP_LITERAL('##'),
        EXTENDED_REGEXP_LITERAL('#'),
        BARE_REGEXP_LITERAL
      ]
    };

    // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID412
    const QUOTED_IDENTIFIER = { match: concat(/`/, identifier, /`/) };
    const IMPLICIT_PARAMETER = {
      className: 'variable',
      match: /\$\d+/
    };
    const PROPERTY_WRAPPER_PROJECTION = {
      className: 'variable',
      match: `\\$${identifierCharacter}+`
    };
    const IDENTIFIERS = [
      QUOTED_IDENTIFIER,
      IMPLICIT_PARAMETER,
      PROPERTY_WRAPPER_PROJECTION
    ];

    // https://docs.swift.org/swift-book/ReferenceManual/Attributes.html
    const AVAILABLE_ATTRIBUTE = {
      match: /(@|#(un)?)available/,
      scope: 'keyword',
      starts: { contains: [
        {
          begin: /\(/,
          end: /\)/,
          keywords: availabilityKeywords,
          contains: [
            ...OPERATORS,
            NUMBER,
            STRING
          ]
        }
      ] }
    };
    const KEYWORD_ATTRIBUTE = {
      scope: 'keyword',
      match: concat(/@/, either(...keywordAttributes))
    };
    const USER_DEFINED_ATTRIBUTE = {
      scope: 'meta',
      match: concat(/@/, identifier)
    };
    const ATTRIBUTES = [
      AVAILABLE_ATTRIBUTE,
      KEYWORD_ATTRIBUTE,
      USER_DEFINED_ATTRIBUTE
    ];

    // https://docs.swift.org/swift-book/ReferenceManual/Types.html
    const TYPE = {
      match: lookahead(/\b[A-Z]/),
      relevance: 0,
      contains: [
        { // Common Apple frameworks, for relevance boost
          className: 'type',
          match: concat(/(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)/, identifierCharacter, '+')
        },
        { // Type identifier
          className: 'type',
          match: typeIdentifier,
          relevance: 0
        },
        { // Optional type
          match: /[?!]+/,
          relevance: 0
        },
        { // Variadic parameter
          match: /\.\.\./,
          relevance: 0
        },
        { // Protocol composition
          match: concat(/\s+&\s+/, lookahead(typeIdentifier)),
          relevance: 0
        }
      ]
    };
    const GENERIC_ARGUMENTS = {
      begin: /</,
      end: />/,
      keywords: KEYWORDS,
      contains: [
        ...COMMENTS,
        ...KEYWORD_MODES,
        ...ATTRIBUTES,
        OPERATOR_GUARD,
        TYPE
      ]
    };
    TYPE.contains.push(GENERIC_ARGUMENTS);

    // https://docs.swift.org/swift-book/ReferenceManual/Expressions.html#ID552
    // Prevents element names from being highlighted as keywords.
    const TUPLE_ELEMENT_NAME = {
      match: concat(identifier, /\s*:/),
      keywords: "_|0",
      relevance: 0
    };
    // Matches tuples as well as the parameter list of a function type.
    const TUPLE = {
      begin: /\(/,
      end: /\)/,
      relevance: 0,
      keywords: KEYWORDS,
      contains: [
        'self',
        TUPLE_ELEMENT_NAME,
        ...COMMENTS,
        REGEXP,
        ...KEYWORD_MODES,
        ...BUILT_INS,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...IDENTIFIERS,
        ...ATTRIBUTES,
        TYPE
      ]
    };

    const GENERIC_PARAMETERS = {
      begin: /</,
      end: />/,
      keywords: 'repeat each',
      contains: [
        ...COMMENTS,
        TYPE
      ]
    };
    const FUNCTION_PARAMETER_NAME = {
      begin: either(
        lookahead(concat(identifier, /\s*:/)),
        lookahead(concat(identifier, /\s+/, identifier, /\s*:/))
      ),
      end: /:/,
      relevance: 0,
      contains: [
        {
          className: 'keyword',
          match: /\b_\b/
        },
        {
          className: 'params',
          match: identifier
        }
      ]
    };
    const FUNCTION_PARAMETERS = {
      begin: /\(/,
      end: /\)/,
      keywords: KEYWORDS,
      contains: [
        FUNCTION_PARAMETER_NAME,
        ...COMMENTS,
        ...KEYWORD_MODES,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...ATTRIBUTES,
        TYPE,
        TUPLE
      ],
      endsParent: true,
      illegal: /["']/
    };
    // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID362
    // https://docs.swift.org/swift-book/documentation/the-swift-programming-language/declarations/#Macro-Declaration
    const FUNCTION_OR_MACRO = {
      match: [
        /(func|macro)/,
        /\s+/,
        either(QUOTED_IDENTIFIER.match, identifier, operator)
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        GENERIC_PARAMETERS,
        FUNCTION_PARAMETERS,
        WHITESPACE
      ],
      illegal: [
        /\[/,
        /%/
      ]
    };

    // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID375
    // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID379
    const INIT_SUBSCRIPT = {
      match: [
        /\b(?:subscript|init[?!]?)/,
        /\s*(?=[<(])/,
      ],
      className: { 1: "keyword" },
      contains: [
        GENERIC_PARAMETERS,
        FUNCTION_PARAMETERS,
        WHITESPACE
      ],
      illegal: /\[|%/
    };
    // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID380
    const OPERATOR_DECLARATION = {
      match: [
        /operator/,
        /\s+/,
        operator
      ],
      className: {
        1: "keyword",
        3: "title"
      }
    };

    // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID550
    const PRECEDENCEGROUP = {
      begin: [
        /precedencegroup/,
        /\s+/,
        typeIdentifier
      ],
      className: {
        1: "keyword",
        3: "title"
      },
      contains: [ TYPE ],
      keywords: [
        ...precedencegroupKeywords,
        ...literals
      ],
      end: /}/
    };

    // Add supported submodes to string interpolation.
    for (const variant of STRING.variants) {
      const interpolation = variant.contains.find(mode => mode.label === "interpol");
      // TODO: Interpolation can contain any expression, so there's room for improvement here.
      interpolation.keywords = KEYWORDS;
      const submodes = [
        ...KEYWORD_MODES,
        ...BUILT_INS,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...IDENTIFIERS
      ];
      interpolation.contains = [
        ...submodes,
        {
          begin: /\(/,
          end: /\)/,
          contains: [
            'self',
            ...submodes
          ]
        }
      ];
    }

    return {
      name: 'Swift',
      keywords: KEYWORDS,
      contains: [
        ...COMMENTS,
        FUNCTION_OR_MACRO,
        INIT_SUBSCRIPT,
        {
          beginKeywords: 'struct protocol class extension enum actor',
          end: '\\{',
          excludeEnd: true,
          keywords: KEYWORDS,
          contains: [
            hljs.inherit(hljs.TITLE_MODE, {
              className: "title.class",
              begin: /[A-Za-z$_][\u00C0-\u02B80-9A-Za-z$_]*/
            }),
            ...KEYWORD_MODES
          ]
        },
        OPERATOR_DECLARATION,
        PRECEDENCEGROUP,
        {
          beginKeywords: 'import',
          end: /$/,
          contains: [ ...COMMENTS ],
          relevance: 0
        },
        REGEXP,
        ...KEYWORD_MODES,
        ...BUILT_INS,
        ...OPERATORS,
        NUMBER,
        STRING,
        ...IDENTIFIERS,
        ...ATTRIBUTES,
        TYPE,
        TUPLE
      ]
    };
  }

  return swift;

})();

    hljs.registerLanguage('swift', hljsGrammar);
  })();/*! `tcl` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Tcl
  Description: Tcl is a very simple programming language.
  Author: Radek Liska <radekliska@gmail.com>
  Website: https://www.tcl.tk/about/language.html
  Category: scripting
  */

  function tcl(hljs) {
    const regex = hljs.regex;
    const TCL_IDENT = /[a-zA-Z_][a-zA-Z0-9_]*/;

    const NUMBER = {
      className: 'number',
      variants: [
        hljs.BINARY_NUMBER_MODE,
        hljs.C_NUMBER_MODE
      ]
    };

    const KEYWORDS = [
      "after",
      "append",
      "apply",
      "array",
      "auto_execok",
      "auto_import",
      "auto_load",
      "auto_mkindex",
      "auto_mkindex_old",
      "auto_qualify",
      "auto_reset",
      "bgerror",
      "binary",
      "break",
      "catch",
      "cd",
      "chan",
      "clock",
      "close",
      "concat",
      "continue",
      "dde",
      "dict",
      "encoding",
      "eof",
      "error",
      "eval",
      "exec",
      "exit",
      "expr",
      "fblocked",
      "fconfigure",
      "fcopy",
      "file",
      "fileevent",
      "filename",
      "flush",
      "for",
      "foreach",
      "format",
      "gets",
      "glob",
      "global",
      "history",
      "http",
      "if",
      "incr",
      "info",
      "interp",
      "join",
      "lappend|10",
      "lassign|10",
      "lindex|10",
      "linsert|10",
      "list",
      "llength|10",
      "load",
      "lrange|10",
      "lrepeat|10",
      "lreplace|10",
      "lreverse|10",
      "lsearch|10",
      "lset|10",
      "lsort|10",
      "mathfunc",
      "mathop",
      "memory",
      "msgcat",
      "namespace",
      "open",
      "package",
      "parray",
      "pid",
      "pkg::create",
      "pkg_mkIndex",
      "platform",
      "platform::shell",
      "proc",
      "puts",
      "pwd",
      "read",
      "refchan",
      "regexp",
      "registry",
      "regsub|10",
      "rename",
      "return",
      "safe",
      "scan",
      "seek",
      "set",
      "socket",
      "source",
      "split",
      "string",
      "subst",
      "switch",
      "tcl_endOfWord",
      "tcl_findLibrary",
      "tcl_startOfNextWord",
      "tcl_startOfPreviousWord",
      "tcl_wordBreakAfter",
      "tcl_wordBreakBefore",
      "tcltest",
      "tclvars",
      "tell",
      "time",
      "tm",
      "trace",
      "unknown",
      "unload",
      "unset",
      "update",
      "uplevel",
      "upvar",
      "variable",
      "vwait",
      "while"
    ];

    return {
      name: 'Tcl',
      aliases: [ 'tk' ],
      keywords: KEYWORDS,
      contains: [
        hljs.COMMENT(';[ \\t]*#', '$'),
        hljs.COMMENT('^[ \\t]*#', '$'),
        {
          beginKeywords: 'proc',
          end: '[\\{]',
          excludeEnd: true,
          contains: [
            {
              className: 'title',
              begin: '[ \\t\\n\\r]+(::)?[a-zA-Z_]((::)?[a-zA-Z0-9_])*',
              end: '[ \\t\\n\\r]',
              endsWithParent: true,
              excludeEnd: true
            }
          ]
        },
        {
          className: "variable",
          variants: [
            { begin: regex.concat(
              /\$/,
              regex.optional(/::/),
              TCL_IDENT,
              '(::',
              TCL_IDENT,
              ')*'
            ) },
            {
              begin: '\\$\\{(::)?[a-zA-Z_]((::)?[a-zA-Z0-9_])*',
              end: '\\}',
              contains: [ NUMBER ]
            }
          ]
        },
        {
          className: 'string',
          contains: [ hljs.BACKSLASH_ESCAPE ],
          variants: [ hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null }) ]
        },
        NUMBER
      ]
    };
  }

  return tcl;

})();

    hljs.registerLanguage('tcl', hljsGrammar);
  })();/*! `thrift` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Thrift
  Author: Oleg Efimov <efimovov@gmail.com>
  Description: Thrift message definition format
  Website: https://thrift.apache.org
  Category: protocols
  */

  function thrift(hljs) {
    const TYPES = [
      "bool",
      "byte",
      "i16",
      "i32",
      "i64",
      "double",
      "string",
      "binary"
    ];
    const KEYWORDS = [
      "namespace",
      "const",
      "typedef",
      "struct",
      "enum",
      "service",
      "exception",
      "void",
      "oneway",
      "set",
      "list",
      "map",
      "required",
      "optional"
    ];
    return {
      name: 'Thrift',
      keywords: {
        keyword: KEYWORDS,
        type: TYPES,
        literal: 'true false'
      },
      contains: [
        hljs.QUOTE_STRING_MODE,
        hljs.NUMBER_MODE,
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: 'class',
          beginKeywords: 'struct enum service exception',
          end: /\{/,
          illegal: /\n/,
          contains: [
            hljs.inherit(hljs.TITLE_MODE, {
              // hack: eating everything after the first title
              starts: {
                endsWithParent: true,
                excludeEnd: true
              } })
          ]
        },
        {
          begin: '\\b(set|list|map)\\s*<',
          keywords: { type: [
            ...TYPES,
            "set",
            "list",
            "map"
          ] },
          end: '>',
          contains: [ 'self' ]
        }
      ]
    };
  }

  return thrift;

})();

    hljs.registerLanguage('thrift', hljsGrammar);
  })();/*! `tp` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: TP
  Author: Jay Strybis <jay.strybis@gmail.com>
  Description: FANUC TP programming language (TPP).
  Category: hardware
  */

  function tp(hljs) {
    const TPID = {
      className: 'number',
      begin: '[1-9][0-9]*', /* no leading zeros */
      relevance: 0
    };
    const TPLABEL = {
      className: 'symbol',
      begin: ':[^\\]]+'
    };
    const TPDATA = {
      className: 'built_in',
      begin: '(AR|P|PAYLOAD|PR|R|SR|RSR|LBL|VR|UALM|MESSAGE|UTOOL|UFRAME|TIMER|'
      + 'TIMER_OVERFLOW|JOINT_MAX_SPEED|RESUME_PROG|DIAG_REC)\\[',
      end: '\\]',
      contains: [
        'self',
        TPID,
        TPLABEL
      ]
    };
    const TPIO = {
      className: 'built_in',
      begin: '(AI|AO|DI|DO|F|RI|RO|UI|UO|GI|GO|SI|SO)\\[',
      end: '\\]',
      contains: [
        'self',
        TPID,
        hljs.QUOTE_STRING_MODE, /* for pos section at bottom */
        TPLABEL
      ]
    };

    const KEYWORDS = [
      "ABORT",
      "ACC",
      "ADJUST",
      "AND",
      "AP_LD",
      "BREAK",
      "CALL",
      "CNT",
      "COL",
      "CONDITION",
      "CONFIG",
      "DA",
      "DB",
      "DIV",
      "DETECT",
      "ELSE",
      "END",
      "ENDFOR",
      "ERR_NUM",
      "ERROR_PROG",
      "FINE",
      "FOR",
      "GP",
      "GUARD",
      "INC",
      "IF",
      "JMP",
      "LINEAR_MAX_SPEED",
      "LOCK",
      "MOD",
      "MONITOR",
      "OFFSET",
      "Offset",
      "OR",
      "OVERRIDE",
      "PAUSE",
      "PREG",
      "PTH",
      "RT_LD",
      "RUN",
      "SELECT",
      "SKIP",
      "Skip",
      "TA",
      "TB",
      "TO",
      "TOOL_OFFSET",
      "Tool_Offset",
      "UF",
      "UT",
      "UFRAME_NUM",
      "UTOOL_NUM",
      "UNLOCK",
      "WAIT",
      "X",
      "Y",
      "Z",
      "W",
      "P",
      "R",
      "STRLEN",
      "SUBSTR",
      "FINDSTR",
      "VOFFSET",
      "PROG",
      "ATTR",
      "MN",
      "POS"
    ];
    const LITERALS = [
      "ON",
      "OFF",
      "max_speed",
      "LPOS",
      "JPOS",
      "ENABLE",
      "DISABLE",
      "START",
      "STOP",
      "RESET"
    ];

    return {
      name: 'TP',
      keywords: {
        keyword: KEYWORDS,
        literal: LITERALS
      },
      contains: [
        TPDATA,
        TPIO,
        {
          className: 'keyword',
          begin: '/(PROG|ATTR|MN|POS|END)\\b'
        },
        {
          /* this is for cases like ,CALL */
          className: 'keyword',
          begin: '(CALL|RUN|POINT_LOGIC|LBL)\\b'
        },
        {
          /* this is for cases like CNT100 where the default lexemes do not
           * separate the keyword and the number */
          className: 'keyword',
          begin: '\\b(ACC|CNT|Skip|Offset|PSPD|RT_LD|AP_LD|Tool_Offset)'
        },
        {
          /* to catch numbers that do not have a word boundary on the left */
          className: 'number',
          begin: '\\d+(sec|msec|mm/sec|cm/min|inch/min|deg/sec|mm|in|cm)?\\b',
          relevance: 0
        },
        hljs.COMMENT('//', '[;$]'),
        hljs.COMMENT('!', '[;$]'),
        hljs.COMMENT('--eg:', '$'),
        hljs.QUOTE_STRING_MODE,
        {
          className: 'string',
          begin: '\'',
          end: '\''
        },
        hljs.C_NUMBER_MODE,
        {
          className: 'variable',
          begin: '\\$[A-Za-z0-9_]+'
        }
      ]
    };
  }

  return tp;

})();

    hljs.registerLanguage('tp', hljsGrammar);
  })();/*! `typescript` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  const IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
  const KEYWORDS = [
    "as", // for exports
    "in",
    "of",
    "if",
    "for",
    "while",
    "finally",
    "var",
    "new",
    "function",
    "do",
    "return",
    "void",
    "else",
    "break",
    "catch",
    "instanceof",
    "with",
    "throw",
    "case",
    "default",
    "try",
    "switch",
    "continue",
    "typeof",
    "delete",
    "let",
    "yield",
    "const",
    "class",
    // JS handles these with a special rule
    // "get",
    // "set",
    "debugger",
    "async",
    "await",
    "static",
    "import",
    "from",
    "export",
    "extends"
  ];
  const LITERALS = [
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "Infinity"
  ];

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
  const TYPES = [
    // Fundamental objects
    "Object",
    "Function",
    "Boolean",
    "Symbol",
    // numbers and dates
    "Math",
    "Date",
    "Number",
    "BigInt",
    // text
    "String",
    "RegExp",
    // Indexed collections
    "Array",
    "Float32Array",
    "Float64Array",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Int32Array",
    "Uint16Array",
    "Uint32Array",
    "BigInt64Array",
    "BigUint64Array",
    // Keyed collections
    "Set",
    "Map",
    "WeakSet",
    "WeakMap",
    // Structured data
    "ArrayBuffer",
    "SharedArrayBuffer",
    "Atomics",
    "DataView",
    "JSON",
    // Control abstraction objects
    "Promise",
    "Generator",
    "GeneratorFunction",
    "AsyncFunction",
    // Reflection
    "Reflect",
    "Proxy",
    // Internationalization
    "Intl",
    // WebAssembly
    "WebAssembly"
  ];

  const ERROR_TYPES = [
    "Error",
    "EvalError",
    "InternalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError"
  ];

  const BUILT_IN_GLOBALS = [
    "setInterval",
    "setTimeout",
    "clearInterval",
    "clearTimeout",

    "require",
    "exports",

    "eval",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "unescape"
  ];

  const BUILT_IN_VARIABLES = [
    "arguments",
    "this",
    "super",
    "console",
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "module",
    "global" // Node.js
  ];

  const BUILT_INS = [].concat(
    BUILT_IN_GLOBALS,
    TYPES,
    ERROR_TYPES
  );

  /*
  Language: JavaScript
  Description: JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions.
  Category: common, scripting, web
  Website: https://developer.mozilla.org/en-US/docs/Web/JavaScript
  */


  /** @type LanguageFn */
  function javascript(hljs) {
    const regex = hljs.regex;
    /**
     * Takes a string like "<Booger" and checks to see
     * if we can find a matching "</Booger" later in the
     * content.
     * @param {RegExpMatchArray} match
     * @param {{after:number}} param1
     */
    const hasClosingTag = (match, { after }) => {
      const tag = "</" + match[0].slice(1);
      const pos = match.input.indexOf(tag, after);
      return pos !== -1;
    };

    const IDENT_RE$1 = IDENT_RE;
    const FRAGMENT = {
      begin: '<>',
      end: '</>'
    };
    // to avoid some special cases inside isTrulyOpeningTag
    const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
    const XML_TAG = {
      begin: /<[A-Za-z0-9\\._:-]+/,
      end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
      /**
       * @param {RegExpMatchArray} match
       * @param {CallbackResponse} response
       */
      isTrulyOpeningTag: (match, response) => {
        const afterMatchIndex = match[0].length + match.index;
        const nextChar = match.input[afterMatchIndex];
        if (
          // HTML should not include another raw `<` inside a tag
          // nested type?
          // `<Array<Array<number>>`, etc.
          nextChar === "<" ||
          // the , gives away that this is not HTML
          // `<T, A extends keyof T, V>`
          nextChar === ","
          ) {
          response.ignoreMatch();
          return;
        }

        // `<something>`
        // Quite possibly a tag, lets look for a matching closing tag...
        if (nextChar === ">") {
          // if we cannot find a matching closing tag, then we
          // will ignore it
          if (!hasClosingTag(match, { after: afterMatchIndex })) {
            response.ignoreMatch();
          }
        }

        // `<blah />` (self-closing)
        // handled by simpleSelfClosing rule

        let m;
        const afterMatch = match.input.substring(afterMatchIndex);

        // some more template typing stuff
        //  <T = any>(key?: string) => Modify<
        if ((m = afterMatch.match(/^\s*=/))) {
          response.ignoreMatch();
          return;
        }

        // `<From extends string>`
        // technically this could be HTML, but it smells like a type
        // NOTE: This is ugh, but added specifically for https://github.com/highlightjs/highlight.js/issues/3276
        if ((m = afterMatch.match(/^\s+extends\s+/))) {
          if (m.index === 0) {
            response.ignoreMatch();
            // eslint-disable-next-line no-useless-return
            return;
          }
        }
      }
    };
    const KEYWORDS$1 = {
      $pattern: IDENT_RE,
      keyword: KEYWORDS,
      literal: LITERALS,
      built_in: BUILT_INS,
      "variable.language": BUILT_IN_VARIABLES
    };

    // https://tc39.es/ecma262/#sec-literals-numeric-literals
    const decimalDigits = '[0-9](_?[0-9])*';
    const frac = `\\.(${decimalDigits})`;
    // DecimalIntegerLiteral, including Annex B NonOctalDecimalIntegerLiteral
    // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
    const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
    const NUMBER = {
      className: 'number',
      variants: [
        // DecimalLiteral
        { begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))` +
          `[eE][+-]?(${decimalDigits})\\b` },
        { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },

        // DecimalBigIntegerLiteral
        { begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },

        // NonDecimalIntegerLiteral
        { begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
        { begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
        { begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },

        // LegacyOctalIntegerLiteral (does not include underscore separators)
        // https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
        { begin: "\\b0[0-7]+n?\\b" },
      ],
      relevance: 0
    };

    const SUBST = {
      className: 'subst',
      begin: '\\$\\{',
      end: '\\}',
      keywords: KEYWORDS$1,
      contains: [] // defined later
    };
    const HTML_TEMPLATE = {
      begin: 'html`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'xml'
      }
    };
    const CSS_TEMPLATE = {
      begin: 'css`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'css'
      }
    };
    const GRAPHQL_TEMPLATE = {
      begin: 'gql`',
      end: '',
      starts: {
        end: '`',
        returnEnd: false,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ],
        subLanguage: 'graphql'
      }
    };
    const TEMPLATE_STRING = {
      className: 'string',
      begin: '`',
      end: '`',
      contains: [
        hljs.BACKSLASH_ESCAPE,
        SUBST
      ]
    };
    const JSDOC_COMMENT = hljs.COMMENT(
      /\/\*\*(?!\/)/,
      '\\*/',
      {
        relevance: 0,
        contains: [
          {
            begin: '(?=@[A-Za-z]+)',
            relevance: 0,
            contains: [
              {
                className: 'doctag',
                begin: '@[A-Za-z]+'
              },
              {
                className: 'type',
                begin: '\\{',
                end: '\\}',
                excludeEnd: true,
                excludeBegin: true,
                relevance: 0
              },
              {
                className: 'variable',
                begin: IDENT_RE$1 + '(?=\\s*(-)|$)',
                endsParent: true,
                relevance: 0
              },
              // eat spaces (not newlines) so we can find
              // types or variables
              {
                begin: /(?=[^\n])\s/,
                relevance: 0
              }
            ]
          }
        ]
      }
    );
    const COMMENT = {
      className: "comment",
      variants: [
        JSDOC_COMMENT,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_LINE_COMMENT_MODE
      ]
    };
    const SUBST_INTERNALS = [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      GRAPHQL_TEMPLATE,
      TEMPLATE_STRING,
      // Skip numbers when they are part of a variable name
      { match: /\$\d+/ },
      NUMBER,
      // This is intentional:
      // See https://github.com/highlightjs/highlight.js/issues/3288
      // hljs.REGEXP_MODE
    ];
    SUBST.contains = SUBST_INTERNALS
      .concat({
        // we need to pair up {} inside our subst to prevent
        // it from ending too early by matching another }
        begin: /\{/,
        end: /\}/,
        keywords: KEYWORDS$1,
        contains: [
          "self"
        ].concat(SUBST_INTERNALS)
      });
    const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
    const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([
      // eat recursive parens in sub expressions
      {
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS$1,
        contains: ["self"].concat(SUBST_AND_COMMENTS)
      }
    ]);
    const PARAMS = {
      className: 'params',
      begin: /\(/,
      end: /\)/,
      excludeBegin: true,
      excludeEnd: true,
      keywords: KEYWORDS$1,
      contains: PARAMS_CONTAINS
    };

    // ES6 classes
    const CLASS_OR_EXTENDS = {
      variants: [
        // class Car extends vehicle
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1,
            /\s+/,
            /extends/,
            /\s+/,
            regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
          ],
          scope: {
            1: "keyword",
            3: "title.class",
            5: "keyword",
            7: "title.class.inherited"
          }
        },
        // class Car
        {
          match: [
            /class/,
            /\s+/,
            IDENT_RE$1
          ],
          scope: {
            1: "keyword",
            3: "title.class"
          }
        },

      ]
    };

    const CLASS_REFERENCE = {
      relevance: 0,
      match:
      regex.either(
        // Hard coded exceptions
        /\bJSON/,
        // Float32Array, OutT
        /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
        // CSSFactory, CSSFactoryT
        /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
        // FPs, FPsT
        /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/,
        // P
        // single letters are not highlighted
        // BLAH
        // this will be flagged as a UPPER_CASE_CONSTANT instead
      ),
      className: "title.class",
      keywords: {
        _: [
          // se we still get relevance credit for JS library classes
          ...TYPES,
          ...ERROR_TYPES
        ]
      }
    };

    const USE_STRICT = {
      label: "use_strict",
      className: 'meta',
      relevance: 10,
      begin: /^\s*['"]use (strict|asm)['"]/
    };

    const FUNCTION_DEFINITION = {
      variants: [
        {
          match: [
            /function/,
            /\s+/,
            IDENT_RE$1,
            /(?=\s*\()/
          ]
        },
        // anonymous function
        {
          match: [
            /function/,
            /\s*(?=\()/
          ]
        }
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      label: "func.def",
      contains: [ PARAMS ],
      illegal: /%/
    };

    const UPPER_CASE_CONSTANT = {
      relevance: 0,
      match: /\b[A-Z][A-Z_0-9]+\b/,
      className: "variable.constant"
    };

    function noneOf(list) {
      return regex.concat("(?!", list.join("|"), ")");
    }

    const FUNCTION_CALL = {
      match: regex.concat(
        /\b/,
        noneOf([
          ...BUILT_IN_GLOBALS,
          "super",
          "import"
        ]),
        IDENT_RE$1, regex.lookahead(/\(/)),
      className: "title.function",
      relevance: 0
    };

    const PROPERTY_ACCESS = {
      begin: regex.concat(/\./, regex.lookahead(
        regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/)
      )),
      end: IDENT_RE$1,
      excludeBegin: true,
      keywords: "prototype",
      className: "property",
      relevance: 0
    };

    const GETTER_OR_SETTER = {
      match: [
        /get|set/,
        /\s+/,
        IDENT_RE$1,
        /(?=\()/
      ],
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        { // eat to avoid empty params
          begin: /\(\)/
        },
        PARAMS
      ]
    };

    const FUNC_LEAD_IN_RE = '(\\(' +
      '[^()]*(\\(' +
      '[^()]*(\\(' +
      '[^()]*' +
      '\\)[^()]*)*' +
      '\\)[^()]*)*' +
      '\\)|' + hljs.UNDERSCORE_IDENT_RE + ')\\s*=>';

    const FUNCTION_VARIABLE = {
      match: [
        /const|var|let/, /\s+/,
        IDENT_RE$1, /\s*/,
        /=\s*/,
        /(async\s*)?/, // async is optional
        regex.lookahead(FUNC_LEAD_IN_RE)
      ],
      keywords: "async",
      className: {
        1: "keyword",
        3: "title.function"
      },
      contains: [
        PARAMS
      ]
    };

    return {
      name: 'JavaScript',
      aliases: ['js', 'jsx', 'mjs', 'cjs'],
      keywords: KEYWORDS$1,
      // this will be extended by TypeScript
      exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
      illegal: /#(?![$_A-z])/,
      contains: [
        hljs.SHEBANG({
          label: "shebang",
          binary: "node",
          relevance: 5
        }),
        USE_STRICT,
        hljs.APOS_STRING_MODE,
        hljs.QUOTE_STRING_MODE,
        HTML_TEMPLATE,
        CSS_TEMPLATE,
        GRAPHQL_TEMPLATE,
        TEMPLATE_STRING,
        COMMENT,
        // Skip numbers when they are part of a variable name
        { match: /\$\d+/ },
        NUMBER,
        CLASS_REFERENCE,
        {
          className: 'attr',
          begin: IDENT_RE$1 + regex.lookahead(':'),
          relevance: 0
        },
        FUNCTION_VARIABLE,
        { // "value" container
          begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
          keywords: 'return throw case',
          relevance: 0,
          contains: [
            COMMENT,
            hljs.REGEXP_MODE,
            {
              className: 'function',
              // we have to count the parens to make sure we actually have the
              // correct bounding ( ) before the =>.  There could be any number of
              // sub-expressions inside also surrounded by parens.
              begin: FUNC_LEAD_IN_RE,
              returnBegin: true,
              end: '\\s*=>',
              contains: [
                {
                  className: 'params',
                  variants: [
                    {
                      begin: hljs.UNDERSCORE_IDENT_RE,
                      relevance: 0
                    },
                    {
                      className: null,
                      begin: /\(\s*\)/,
                      skip: true
                    },
                    {
                      begin: /\(/,
                      end: /\)/,
                      excludeBegin: true,
                      excludeEnd: true,
                      keywords: KEYWORDS$1,
                      contains: PARAMS_CONTAINS
                    }
                  ]
                }
              ]
            },
            { // could be a comma delimited list of params to a function call
              begin: /,/,
              relevance: 0
            },
            {
              match: /\s+/,
              relevance: 0
            },
            { // JSX
              variants: [
                { begin: FRAGMENT.begin, end: FRAGMENT.end },
                { match: XML_SELF_CLOSING },
                {
                  begin: XML_TAG.begin,
                  // we carefully check the opening tag to see if it truly
                  // is a tag and not a false positive
                  'on:begin': XML_TAG.isTrulyOpeningTag,
                  end: XML_TAG.end
                }
              ],
              subLanguage: 'xml',
              contains: [
                {
                  begin: XML_TAG.begin,
                  end: XML_TAG.end,
                  skip: true,
                  contains: ['self']
                }
              ]
            }
          ],
        },
        FUNCTION_DEFINITION,
        {
          // prevent this from getting swallowed up by function
          // since they appear "function like"
          beginKeywords: "while if switch catch for"
        },
        {
          // we have to count the parens to make sure we actually have the correct
          // bounding ( ).  There could be any number of sub-expressions inside
          // also surrounded by parens.
          begin: '\\b(?!function)' + hljs.UNDERSCORE_IDENT_RE +
            '\\(' + // first parens
            '[^()]*(\\(' +
              '[^()]*(\\(' +
                '[^()]*' +
              '\\)[^()]*)*' +
            '\\)[^()]*)*' +
            '\\)\\s*\\{', // end parens
          returnBegin:true,
          label: "func.def",
          contains: [
            PARAMS,
            hljs.inherit(hljs.TITLE_MODE, { begin: IDENT_RE$1, className: "title.function" })
          ]
        },
        // catch ... so it won't trigger the property rule below
        {
          match: /\.\.\./,
          relevance: 0
        },
        PROPERTY_ACCESS,
        // hack: prevents detection of keywords in some circumstances
        // .keyword()
        // $keyword = x
        {
          match: '\\$' + IDENT_RE$1,
          relevance: 0
        },
        {
          match: [ /\bconstructor(?=\s*\()/ ],
          className: { 1: "title.function" },
          contains: [ PARAMS ]
        },
        FUNCTION_CALL,
        UPPER_CASE_CONSTANT,
        CLASS_OR_EXTENDS,
        GETTER_OR_SETTER,
        {
          match: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
        }
      ]
    };
  }

  /*
  Language: TypeScript
  Author: Panu Horsmalahti <panu.horsmalahti@iki.fi>
  Contributors: Ike Ku <dempfi@yahoo.com>
  Description: TypeScript is a strict superset of JavaScript
  Website: https://www.typescriptlang.org
  Category: common, scripting
  */


  /** @type LanguageFn */
  function typescript(hljs) {
    const tsLanguage = javascript(hljs);

    const IDENT_RE$1 = IDENT_RE;
    const TYPES = [
      "any",
      "void",
      "number",
      "boolean",
      "string",
      "object",
      "never",
      "symbol",
      "bigint",
      "unknown"
    ];
    const NAMESPACE = {
      beginKeywords: 'namespace',
      end: /\{/,
      excludeEnd: true,
      contains: [ tsLanguage.exports.CLASS_REFERENCE ]
    };
    const INTERFACE = {
      beginKeywords: 'interface',
      end: /\{/,
      excludeEnd: true,
      keywords: {
        keyword: 'interface extends',
        built_in: TYPES
      },
      contains: [ tsLanguage.exports.CLASS_REFERENCE ]
    };
    const USE_STRICT = {
      className: 'meta',
      relevance: 10,
      begin: /^\s*['"]use strict['"]/
    };
    const TS_SPECIFIC_KEYWORDS = [
      "type",
      "namespace",
      "interface",
      "public",
      "private",
      "protected",
      "implements",
      "declare",
      "abstract",
      "readonly",
      "enum",
      "override"
    ];
    const KEYWORDS$1 = {
      $pattern: IDENT_RE,
      keyword: KEYWORDS.concat(TS_SPECIFIC_KEYWORDS),
      literal: LITERALS,
      built_in: BUILT_INS.concat(TYPES),
      "variable.language": BUILT_IN_VARIABLES
    };
    const DECORATOR = {
      className: 'meta',
      begin: '@' + IDENT_RE$1,
    };

    const swapMode = (mode, label, replacement) => {
      const indx = mode.contains.findIndex(m => m.label === label);
      if (indx === -1) { throw new Error("can not find mode to replace"); }

      mode.contains.splice(indx, 1, replacement);
    };


    // this should update anywhere keywords is used since
    // it will be the same actual JS object
    Object.assign(tsLanguage.keywords, KEYWORDS$1);

    tsLanguage.exports.PARAMS_CONTAINS.push(DECORATOR);
    tsLanguage.contains = tsLanguage.contains.concat([
      DECORATOR,
      NAMESPACE,
      INTERFACE,
    ]);

    // TS gets a simpler shebang rule than JS
    swapMode(tsLanguage, "shebang", hljs.SHEBANG());
    // JS use strict rule purposely excludes `asm` which makes no sense
    swapMode(tsLanguage, "use_strict", USE_STRICT);

    const functionDeclaration = tsLanguage.contains.find(m => m.label === "func.def");
    functionDeclaration.relevance = 0; // () => {} is more typical in TypeScript

    Object.assign(tsLanguage, {
      name: 'TypeScript',
      aliases: [
        'ts',
        'tsx',
        'mts',
        'cts'
      ]
    });

    return tsLanguage;
  }

  return typescript;

})();

    hljs.registerLanguage('typescript', hljsGrammar);
  })();/*! `vbnet` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Visual Basic .NET
  Description: Visual Basic .NET (VB.NET) is a multi-paradigm, object-oriented programming language, implemented on the .NET Framework.
  Authors: Poren Chiang <ren.chiang@gmail.com>, Jan Pilzer
  Website: https://docs.microsoft.com/dotnet/visual-basic/getting-started
  Category: common
  */

  /** @type LanguageFn */
  function vbnet(hljs) {
    const regex = hljs.regex;
    /**
     * Character Literal
     * Either a single character ("a"C) or an escaped double quote (""""C).
     */
    const CHARACTER = {
      className: 'string',
      begin: /"(""|[^/n])"C\b/
    };

    const STRING = {
      className: 'string',
      begin: /"/,
      end: /"/,
      illegal: /\n/,
      contains: [
        {
          // double quote escape
          begin: /""/ }
      ]
    };

    /** Date Literals consist of a date, a time, or both separated by whitespace, surrounded by # */
    const MM_DD_YYYY = /\d{1,2}\/\d{1,2}\/\d{4}/;
    const YYYY_MM_DD = /\d{4}-\d{1,2}-\d{1,2}/;
    const TIME_12H = /(\d|1[012])(:\d+){0,2} *(AM|PM)/;
    const TIME_24H = /\d{1,2}(:\d{1,2}){1,2}/;
    const DATE = {
      className: 'literal',
      variants: [
        {
          // #YYYY-MM-DD# (ISO-Date) or #M/D/YYYY# (US-Date)
          begin: regex.concat(/# */, regex.either(YYYY_MM_DD, MM_DD_YYYY), / *#/) },
        {
          // #H:mm[:ss]# (24h Time)
          begin: regex.concat(/# */, TIME_24H, / *#/) },
        {
          // #h[:mm[:ss]] A# (12h Time)
          begin: regex.concat(/# */, TIME_12H, / *#/) },
        {
          // date plus time
          begin: regex.concat(
            /# */,
            regex.either(YYYY_MM_DD, MM_DD_YYYY),
            / +/,
            regex.either(TIME_12H, TIME_24H),
            / *#/
          ) }
      ]
    };

    const NUMBER = {
      className: 'number',
      relevance: 0,
      variants: [
        {
          // Float
          begin: /\b\d[\d_]*((\.[\d_]+(E[+-]?[\d_]+)?)|(E[+-]?[\d_]+))[RFD@!#]?/ },
        {
          // Integer (base 10)
          begin: /\b\d[\d_]*((U?[SIL])|[%&])?/ },
        {
          // Integer (base 16)
          begin: /&H[\dA-F_]+((U?[SIL])|[%&])?/ },
        {
          // Integer (base 8)
          begin: /&O[0-7_]+((U?[SIL])|[%&])?/ },
        {
          // Integer (base 2)
          begin: /&B[01_]+((U?[SIL])|[%&])?/ }
      ]
    };

    const LABEL = {
      className: 'label',
      begin: /^\w+:/
    };

    const DOC_COMMENT = hljs.COMMENT(/'''/, /$/, { contains: [
      {
        className: 'doctag',
        begin: /<\/?/,
        end: />/
      }
    ] });

    const COMMENT = hljs.COMMENT(null, /$/, { variants: [
      { begin: /'/ },
      {
        // TODO: Use multi-class for leading spaces
        begin: /([\t ]|^)REM(?=\s)/ }
    ] });

    const DIRECTIVES = {
      className: 'meta',
      // TODO: Use multi-class for indentation once available
      begin: /[\t ]*#(const|disable|else|elseif|enable|end|externalsource|if|region)\b/,
      end: /$/,
      keywords: { keyword:
          'const disable else elseif enable end externalsource if region then' },
      contains: [ COMMENT ]
    };

    return {
      name: 'Visual Basic .NET',
      aliases: [ 'vb' ],
      case_insensitive: true,
      classNameAliases: { label: 'symbol' },
      keywords: {
        keyword:
          'addhandler alias aggregate ansi as async assembly auto binary by byref byval ' /* a-b */
          + 'call case catch class compare const continue custom declare default delegate dim distinct do ' /* c-d */
          + 'each equals else elseif end enum erase error event exit explicit finally for friend from function ' /* e-f */
          + 'get global goto group handles if implements imports in inherits interface into iterator ' /* g-i */
          + 'join key let lib loop me mid module mustinherit mustoverride mybase myclass ' /* j-m */
          + 'namespace narrowing new next notinheritable notoverridable ' /* n */
          + 'of off on operator option optional order overloads overridable overrides ' /* o */
          + 'paramarray partial preserve private property protected public ' /* p */
          + 'raiseevent readonly redim removehandler resume return ' /* r */
          + 'select set shadows shared skip static step stop structure strict sub synclock ' /* s */
          + 'take text then throw to try unicode until using when where while widening with withevents writeonly yield' /* t-y */,
        built_in:
          // Operators https://docs.microsoft.com/dotnet/visual-basic/language-reference/operators
          'addressof and andalso await directcast gettype getxmlnamespace is isfalse isnot istrue like mod nameof new not or orelse trycast typeof xor '
          // Type Conversion Functions https://docs.microsoft.com/dotnet/visual-basic/language-reference/functions/type-conversion-functions
          + 'cbool cbyte cchar cdate cdbl cdec cint clng cobj csbyte cshort csng cstr cuint culng cushort',
        type:
          // Data types https://docs.microsoft.com/dotnet/visual-basic/language-reference/data-types
          'boolean byte char date decimal double integer long object sbyte short single string uinteger ulong ushort',
        literal: 'true false nothing'
      },
      illegal:
        '//|\\{|\\}|endif|gosub|variant|wend|^\\$ ' /* reserved deprecated keywords */,
      contains: [
        CHARACTER,
        STRING,
        DATE,
        NUMBER,
        LABEL,
        DOC_COMMENT,
        COMMENT,
        DIRECTIVES
      ]
    };
  }

  return vbnet;

})();

    hljs.registerLanguage('vbnet', hljsGrammar);
  })();/*! `verilog` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Verilog
  Author: Jon Evans <jon@craftyjon.com>
  Contributors: Boone Severson <boone.severson@gmail.com>
  Description: Verilog is a hardware description language used in electronic design automation to describe digital and mixed-signal systems. This highlighter supports Verilog and SystemVerilog through IEEE 1800-2012.
  Website: http://www.verilog.com
  Category: hardware
  */

  function verilog(hljs) {
    const regex = hljs.regex;
    const KEYWORDS = {
      $pattern: /\$?[\w]+(\$[\w]+)*/,
      keyword: [
        "accept_on",
        "alias",
        "always",
        "always_comb",
        "always_ff",
        "always_latch",
        "and",
        "assert",
        "assign",
        "assume",
        "automatic",
        "before",
        "begin",
        "bind",
        "bins",
        "binsof",
        "bit",
        "break",
        "buf|0",
        "bufif0",
        "bufif1",
        "byte",
        "case",
        "casex",
        "casez",
        "cell",
        "chandle",
        "checker",
        "class",
        "clocking",
        "cmos",
        "config",
        "const",
        "constraint",
        "context",
        "continue",
        "cover",
        "covergroup",
        "coverpoint",
        "cross",
        "deassign",
        "default",
        "defparam",
        "design",
        "disable",
        "dist",
        "do",
        "edge",
        "else",
        "end",
        "endcase",
        "endchecker",
        "endclass",
        "endclocking",
        "endconfig",
        "endfunction",
        "endgenerate",
        "endgroup",
        "endinterface",
        "endmodule",
        "endpackage",
        "endprimitive",
        "endprogram",
        "endproperty",
        "endspecify",
        "endsequence",
        "endtable",
        "endtask",
        "enum",
        "event",
        "eventually",
        "expect",
        "export",
        "extends",
        "extern",
        "final",
        "first_match",
        "for",
        "force",
        "foreach",
        "forever",
        "fork",
        "forkjoin",
        "function",
        "generate|5",
        "genvar",
        "global",
        "highz0",
        "highz1",
        "if",
        "iff",
        "ifnone",
        "ignore_bins",
        "illegal_bins",
        "implements",
        "implies",
        "import",
        "incdir",
        "include",
        "initial",
        "inout",
        "input",
        "inside",
        "instance",
        "int",
        "integer",
        "interconnect",
        "interface",
        "intersect",
        "join",
        "join_any",
        "join_none",
        "large",
        "let",
        "liblist",
        "library",
        "local",
        "localparam",
        "logic",
        "longint",
        "macromodule",
        "matches",
        "medium",
        "modport",
        "module",
        "nand",
        "negedge",
        "nettype",
        "new",
        "nexttime",
        "nmos",
        "nor",
        "noshowcancelled",
        "not",
        "notif0",
        "notif1",
        "or",
        "output",
        "package",
        "packed",
        "parameter",
        "pmos",
        "posedge",
        "primitive",
        "priority",
        "program",
        "property",
        "protected",
        "pull0",
        "pull1",
        "pulldown",
        "pullup",
        "pulsestyle_ondetect",
        "pulsestyle_onevent",
        "pure",
        "rand",
        "randc",
        "randcase",
        "randsequence",
        "rcmos",
        "real",
        "realtime",
        "ref",
        "reg",
        "reject_on",
        "release",
        "repeat",
        "restrict",
        "return",
        "rnmos",
        "rpmos",
        "rtran",
        "rtranif0",
        "rtranif1",
        "s_always",
        "s_eventually",
        "s_nexttime",
        "s_until",
        "s_until_with",
        "scalared",
        "sequence",
        "shortint",
        "shortreal",
        "showcancelled",
        "signed",
        "small",
        "soft",
        "solve",
        "specify",
        "specparam",
        "static",
        "string",
        "strong",
        "strong0",
        "strong1",
        "struct",
        "super",
        "supply0",
        "supply1",
        "sync_accept_on",
        "sync_reject_on",
        "table",
        "tagged",
        "task",
        "this",
        "throughout",
        "time",
        "timeprecision",
        "timeunit",
        "tran",
        "tranif0",
        "tranif1",
        "tri",
        "tri0",
        "tri1",
        "triand",
        "trior",
        "trireg",
        "type",
        "typedef",
        "union",
        "unique",
        "unique0",
        "unsigned",
        "until",
        "until_with",
        "untyped",
        "use",
        "uwire",
        "var",
        "vectored",
        "virtual",
        "void",
        "wait",
        "wait_order",
        "wand",
        "weak",
        "weak0",
        "weak1",
        "while",
        "wildcard",
        "wire",
        "with",
        "within",
        "wor",
        "xnor",
        "xor"
      ],
      literal: [ 'null' ],
      built_in: [
        "$finish",
        "$stop",
        "$exit",
        "$fatal",
        "$error",
        "$warning",
        "$info",
        "$realtime",
        "$time",
        "$printtimescale",
        "$bitstoreal",
        "$bitstoshortreal",
        "$itor",
        "$signed",
        "$cast",
        "$bits",
        "$stime",
        "$timeformat",
        "$realtobits",
        "$shortrealtobits",
        "$rtoi",
        "$unsigned",
        "$asserton",
        "$assertkill",
        "$assertpasson",
        "$assertfailon",
        "$assertnonvacuouson",
        "$assertoff",
        "$assertcontrol",
        "$assertpassoff",
        "$assertfailoff",
        "$assertvacuousoff",
        "$isunbounded",
        "$sampled",
        "$fell",
        "$changed",
        "$past_gclk",
        "$fell_gclk",
        "$changed_gclk",
        "$rising_gclk",
        "$steady_gclk",
        "$coverage_control",
        "$coverage_get",
        "$coverage_save",
        "$set_coverage_db_name",
        "$rose",
        "$stable",
        "$past",
        "$rose_gclk",
        "$stable_gclk",
        "$future_gclk",
        "$falling_gclk",
        "$changing_gclk",
        "$display",
        "$coverage_get_max",
        "$coverage_merge",
        "$get_coverage",
        "$load_coverage_db",
        "$typename",
        "$unpacked_dimensions",
        "$left",
        "$low",
        "$increment",
        "$clog2",
        "$ln",
        "$log10",
        "$exp",
        "$sqrt",
        "$pow",
        "$floor",
        "$ceil",
        "$sin",
        "$cos",
        "$tan",
        "$countbits",
        "$onehot",
        "$isunknown",
        "$fatal",
        "$warning",
        "$dimensions",
        "$right",
        "$high",
        "$size",
        "$asin",
        "$acos",
        "$atan",
        "$atan2",
        "$hypot",
        "$sinh",
        "$cosh",
        "$tanh",
        "$asinh",
        "$acosh",
        "$atanh",
        "$countones",
        "$onehot0",
        "$error",
        "$info",
        "$random",
        "$dist_chi_square",
        "$dist_erlang",
        "$dist_exponential",
        "$dist_normal",
        "$dist_poisson",
        "$dist_t",
        "$dist_uniform",
        "$q_initialize",
        "$q_remove",
        "$q_exam",
        "$async$and$array",
        "$async$nand$array",
        "$async$or$array",
        "$async$nor$array",
        "$sync$and$array",
        "$sync$nand$array",
        "$sync$or$array",
        "$sync$nor$array",
        "$q_add",
        "$q_full",
        "$psprintf",
        "$async$and$plane",
        "$async$nand$plane",
        "$async$or$plane",
        "$async$nor$plane",
        "$sync$and$plane",
        "$sync$nand$plane",
        "$sync$or$plane",
        "$sync$nor$plane",
        "$system",
        "$display",
        "$displayb",
        "$displayh",
        "$displayo",
        "$strobe",
        "$strobeb",
        "$strobeh",
        "$strobeo",
        "$write",
        "$readmemb",
        "$readmemh",
        "$writememh",
        "$value$plusargs",
        "$dumpvars",
        "$dumpon",
        "$dumplimit",
        "$dumpports",
        "$dumpportson",
        "$dumpportslimit",
        "$writeb",
        "$writeh",
        "$writeo",
        "$monitor",
        "$monitorb",
        "$monitorh",
        "$monitoro",
        "$writememb",
        "$dumpfile",
        "$dumpoff",
        "$dumpall",
        "$dumpflush",
        "$dumpportsoff",
        "$dumpportsall",
        "$dumpportsflush",
        "$fclose",
        "$fdisplay",
        "$fdisplayb",
        "$fdisplayh",
        "$fdisplayo",
        "$fstrobe",
        "$fstrobeb",
        "$fstrobeh",
        "$fstrobeo",
        "$swrite",
        "$swriteb",
        "$swriteh",
        "$swriteo",
        "$fscanf",
        "$fread",
        "$fseek",
        "$fflush",
        "$feof",
        "$fopen",
        "$fwrite",
        "$fwriteb",
        "$fwriteh",
        "$fwriteo",
        "$fmonitor",
        "$fmonitorb",
        "$fmonitorh",
        "$fmonitoro",
        "$sformat",
        "$sformatf",
        "$fgetc",
        "$ungetc",
        "$fgets",
        "$sscanf",
        "$rewind",
        "$ftell",
        "$ferror"
      ]
    };
    const BUILT_IN_CONSTANTS = [
      "__FILE__",
      "__LINE__"
    ];
    const DIRECTIVES = [
      "begin_keywords",
      "celldefine",
      "default_nettype",
      "default_decay_time",
      "default_trireg_strength",
      "define",
      "delay_mode_distributed",
      "delay_mode_path",
      "delay_mode_unit",
      "delay_mode_zero",
      "else",
      "elsif",
      "end_keywords",
      "endcelldefine",
      "endif",
      "ifdef",
      "ifndef",
      "include",
      "line",
      "nounconnected_drive",
      "pragma",
      "resetall",
      "timescale",
      "unconnected_drive",
      "undef",
      "undefineall"
    ];

    return {
      name: 'Verilog',
      aliases: [
        'v',
        'sv',
        'svh'
      ],
      case_insensitive: false,
      keywords: KEYWORDS,
      contains: [
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.C_LINE_COMMENT_MODE,
        hljs.QUOTE_STRING_MODE,
        {
          scope: 'number',
          contains: [ hljs.BACKSLASH_ESCAPE ],
          variants: [
            { begin: /\b((\d+'([bhodBHOD]))[0-9xzXZa-fA-F_]+)/ },
            { begin: /\B(('([bhodBHOD]))[0-9xzXZa-fA-F_]+)/ },
            { // decimal
              begin: /\b[0-9][0-9_]*/,
              relevance: 0
            }
          ]
        },
        /* parameters to instances */
        {
          scope: 'variable',
          variants: [
            { begin: '#\\((?!parameter).+\\)' },
            {
              begin: '\\.\\w+',
              relevance: 0
            }
          ]
        },
        {
          scope: 'variable.constant',
          match: regex.concat(/`/, regex.either(...BUILT_IN_CONSTANTS)),
        },
        {
          scope: 'meta',
          begin: regex.concat(/`/, regex.either(...DIRECTIVES)),
          end: /$|\/\/|\/\*/,
          returnEnd: true,
          keywords: DIRECTIVES
        }
      ]
    };
  }

  return verilog;

})();

    hljs.registerLanguage('verilog', hljsGrammar);
  })();/*! `vhdl` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: VHDL
  Author: Igor Kalnitsky <igor@kalnitsky.org>
  Contributors: Daniel C.K. Kho <daniel.kho@tauhop.com>, Guillaume Savaton <guillaume.savaton@eseo.fr>
  Description: VHDL is a hardware description language used in electronic design automation to describe digital and mixed-signal systems.
  Website: https://en.wikipedia.org/wiki/VHDL
  Category: hardware
  */

  function vhdl(hljs) {
    // Regular expression for VHDL numeric literals.

    // Decimal literal:
    const INTEGER_RE = '\\d(_|\\d)*';
    const EXPONENT_RE = '[eE][-+]?' + INTEGER_RE;
    const DECIMAL_LITERAL_RE = INTEGER_RE + '(\\.' + INTEGER_RE + ')?' + '(' + EXPONENT_RE + ')?';
    // Based literal:
    const BASED_INTEGER_RE = '\\w+';
    const BASED_LITERAL_RE = INTEGER_RE + '#' + BASED_INTEGER_RE + '(\\.' + BASED_INTEGER_RE + ')?' + '#' + '(' + EXPONENT_RE + ')?';

    const NUMBER_RE = '\\b(' + BASED_LITERAL_RE + '|' + DECIMAL_LITERAL_RE + ')';

    const KEYWORDS = [
      "abs",
      "access",
      "after",
      "alias",
      "all",
      "and",
      "architecture",
      "array",
      "assert",
      "assume",
      "assume_guarantee",
      "attribute",
      "begin",
      "block",
      "body",
      "buffer",
      "bus",
      "case",
      "component",
      "configuration",
      "constant",
      "context",
      "cover",
      "disconnect",
      "downto",
      "default",
      "else",
      "elsif",
      "end",
      "entity",
      "exit",
      "fairness",
      "file",
      "for",
      "force",
      "function",
      "generate",
      "generic",
      "group",
      "guarded",
      "if",
      "impure",
      "in",
      "inertial",
      "inout",
      "is",
      "label",
      "library",
      "linkage",
      "literal",
      "loop",
      "map",
      "mod",
      "nand",
      "new",
      "next",
      "nor",
      "not",
      "null",
      "of",
      "on",
      "open",
      "or",
      "others",
      "out",
      "package",
      "parameter",
      "port",
      "postponed",
      "procedure",
      "process",
      "property",
      "protected",
      "pure",
      "range",
      "record",
      "register",
      "reject",
      "release",
      "rem",
      "report",
      "restrict",
      "restrict_guarantee",
      "return",
      "rol",
      "ror",
      "select",
      "sequence",
      "severity",
      "shared",
      "signal",
      "sla",
      "sll",
      "sra",
      "srl",
      "strong",
      "subtype",
      "then",
      "to",
      "transport",
      "type",
      "unaffected",
      "units",
      "until",
      "use",
      "variable",
      "view",
      "vmode",
      "vprop",
      "vunit",
      "wait",
      "when",
      "while",
      "with",
      "xnor",
      "xor"
    ];
    const BUILT_INS = [
      "boolean",
      "bit",
      "character",
      "integer",
      "time",
      "delay_length",
      "natural",
      "positive",
      "string",
      "bit_vector",
      "file_open_kind",
      "file_open_status",
      "std_logic",
      "std_logic_vector",
      "unsigned",
      "signed",
      "boolean_vector",
      "integer_vector",
      "std_ulogic",
      "std_ulogic_vector",
      "unresolved_unsigned",
      "u_unsigned",
      "unresolved_signed",
      "u_signed",
      "real_vector",
      "time_vector"
    ];
    const LITERALS = [
      // severity_level
      "false",
      "true",
      "note",
      "warning",
      "error",
      "failure",
      // textio
      "line",
      "text",
      "side",
      "width"
    ];

    return {
      name: 'VHDL',
      case_insensitive: true,
      keywords: {
        keyword: KEYWORDS,
        built_in: BUILT_INS,
        literal: LITERALS
      },
      illegal: /\{/,
      contains: [
        hljs.C_BLOCK_COMMENT_MODE, // VHDL-2008 block commenting.
        hljs.COMMENT('--', '$'),
        hljs.QUOTE_STRING_MODE,
        {
          className: 'number',
          begin: NUMBER_RE,
          relevance: 0
        },
        {
          className: 'string',
          begin: '\'(U|X|0|1|Z|W|L|H|-)\'',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          className: 'symbol',
          begin: '\'[A-Za-z](_?[A-Za-z0-9])*',
          contains: [ hljs.BACKSLASH_ESCAPE ]
        }
      ]
    };
  }

  return vhdl;

})();

    hljs.registerLanguage('vhdl', hljsGrammar);
  })();/*! `x86asm` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: Intel x86 Assembly
  Author: innocenat <innocenat@gmail.com>
  Description: x86 assembly language using Intel's mnemonic and NASM syntax
  Website: https://en.wikipedia.org/wiki/X86_assembly_language
  Category: assembler
  */

  function x86asm(hljs) {
    return {
      name: 'Intel x86 Assembly',
      case_insensitive: true,
      keywords: {
        $pattern: '[.%]?' + hljs.IDENT_RE,
        keyword:
          'lock rep repe repz repne repnz xaquire xrelease bnd nobnd '
          + 'aaa aad aam aas adc add and arpl bb0_reset bb1_reset bound bsf bsr bswap bt btc btr bts call cbw cdq cdqe clc cld cli clts cmc cmp cmpsb cmpsd cmpsq cmpsw cmpxchg cmpxchg486 cmpxchg8b cmpxchg16b cpuid cpu_read cpu_write cqo cwd cwde daa das dec div dmint emms enter equ f2xm1 fabs fadd faddp fbld fbstp fchs fclex fcmovb fcmovbe fcmove fcmovnb fcmovnbe fcmovne fcmovnu fcmovu fcom fcomi fcomip fcomp fcompp fcos fdecstp fdisi fdiv fdivp fdivr fdivrp femms feni ffree ffreep fiadd ficom ficomp fidiv fidivr fild fimul fincstp finit fist fistp fisttp fisub fisubr fld fld1 fldcw fldenv fldl2e fldl2t fldlg2 fldln2 fldpi fldz fmul fmulp fnclex fndisi fneni fninit fnop fnsave fnstcw fnstenv fnstsw fpatan fprem fprem1 fptan frndint frstor fsave fscale fsetpm fsin fsincos fsqrt fst fstcw fstenv fstp fstsw fsub fsubp fsubr fsubrp ftst fucom fucomi fucomip fucomp fucompp fxam fxch fxtract fyl2x fyl2xp1 hlt ibts icebp idiv imul in inc incbin insb insd insw int int01 int1 int03 int3 into invd invpcid invlpg invlpga iret iretd iretq iretw jcxz jecxz jrcxz jmp jmpe lahf lar lds lea leave les lfence lfs lgdt lgs lidt lldt lmsw loadall loadall286 lodsb lodsd lodsq lodsw loop loope loopne loopnz loopz lsl lss ltr mfence monitor mov movd movq movsb movsd movsq movsw movsx movsxd movzx mul mwait neg nop not or out outsb outsd outsw packssdw packsswb packuswb paddb paddd paddsb paddsiw paddsw paddusb paddusw paddw pand pandn pause paveb pavgusb pcmpeqb pcmpeqd pcmpeqw pcmpgtb pcmpgtd pcmpgtw pdistib pf2id pfacc pfadd pfcmpeq pfcmpge pfcmpgt pfmax pfmin pfmul pfrcp pfrcpit1 pfrcpit2 pfrsqit1 pfrsqrt pfsub pfsubr pi2fd pmachriw pmaddwd pmagw pmulhriw pmulhrwa pmulhrwc pmulhw pmullw pmvgezb pmvlzb pmvnzb pmvzb pop popa popad popaw popf popfd popfq popfw por prefetch prefetchw pslld psllq psllw psrad psraw psrld psrlq psrlw psubb psubd psubsb psubsiw psubsw psubusb psubusw psubw punpckhbw punpckhdq punpckhwd punpcklbw punpckldq punpcklwd push pusha pushad pushaw pushf pushfd pushfq pushfw pxor rcl rcr rdshr rdmsr rdpmc rdtsc rdtscp ret retf retn rol ror rdm rsdc rsldt rsm rsts sahf sal salc sar sbb scasb scasd scasq scasw sfence sgdt shl shld shr shrd sidt sldt skinit smi smint smintold smsw stc std sti stosb stosd stosq stosw str sub svdc svldt svts swapgs syscall sysenter sysexit sysret test ud0 ud1 ud2b ud2 ud2a umov verr verw fwait wbinvd wrshr wrmsr xadd xbts xchg xlatb xlat xor cmove cmovz cmovne cmovnz cmova cmovnbe cmovae cmovnb cmovb cmovnae cmovbe cmovna cmovg cmovnle cmovge cmovnl cmovl cmovnge cmovle cmovng cmovc cmovnc cmovo cmovno cmovs cmovns cmovp cmovpe cmovnp cmovpo je jz jne jnz ja jnbe jae jnb jb jnae jbe jna jg jnle jge jnl jl jnge jle jng jc jnc jo jno js jns jpo jnp jpe jp sete setz setne setnz seta setnbe setae setnb setnc setb setnae setcset setbe setna setg setnle setge setnl setl setnge setle setng sets setns seto setno setpe setp setpo setnp addps addss andnps andps cmpeqps cmpeqss cmpleps cmpless cmpltps cmpltss cmpneqps cmpneqss cmpnleps cmpnless cmpnltps cmpnltss cmpordps cmpordss cmpunordps cmpunordss cmpps cmpss comiss cvtpi2ps cvtps2pi cvtsi2ss cvtss2si cvttps2pi cvttss2si divps divss ldmxcsr maxps maxss minps minss movaps movhps movlhps movlps movhlps movmskps movntps movss movups mulps mulss orps rcpps rcpss rsqrtps rsqrtss shufps sqrtps sqrtss stmxcsr subps subss ucomiss unpckhps unpcklps xorps fxrstor fxrstor64 fxsave fxsave64 xgetbv xsetbv xsave xsave64 xsaveopt xsaveopt64 xrstor xrstor64 prefetchnta prefetcht0 prefetcht1 prefetcht2 maskmovq movntq pavgb pavgw pextrw pinsrw pmaxsw pmaxub pminsw pminub pmovmskb pmulhuw psadbw pshufw pf2iw pfnacc pfpnacc pi2fw pswapd maskmovdqu clflush movntdq movnti movntpd movdqa movdqu movdq2q movq2dq paddq pmuludq pshufd pshufhw pshuflw pslldq psrldq psubq punpckhqdq punpcklqdq addpd addsd andnpd andpd cmpeqpd cmpeqsd cmplepd cmplesd cmpltpd cmpltsd cmpneqpd cmpneqsd cmpnlepd cmpnlesd cmpnltpd cmpnltsd cmpordpd cmpordsd cmpunordpd cmpunordsd cmppd comisd cvtdq2pd cvtdq2ps cvtpd2dq cvtpd2pi cvtpd2ps cvtpi2pd cvtps2dq cvtps2pd cvtsd2si cvtsd2ss cvtsi2sd cvtss2sd cvttpd2pi cvttpd2dq cvttps2dq cvttsd2si divpd divsd maxpd maxsd minpd minsd movapd movhpd movlpd movmskpd movupd mulpd mulsd orpd shufpd sqrtpd sqrtsd subpd subsd ucomisd unpckhpd unpcklpd xorpd addsubpd addsubps haddpd haddps hsubpd hsubps lddqu movddup movshdup movsldup clgi stgi vmcall vmclear vmfunc vmlaunch vmload vmmcall vmptrld vmptrst vmread vmresume vmrun vmsave vmwrite vmxoff vmxon invept invvpid pabsb pabsw pabsd palignr phaddw phaddd phaddsw phsubw phsubd phsubsw pmaddubsw pmulhrsw pshufb psignb psignw psignd extrq insertq movntsd movntss lzcnt blendpd blendps blendvpd blendvps dppd dpps extractps insertps movntdqa mpsadbw packusdw pblendvb pblendw pcmpeqq pextrb pextrd pextrq phminposuw pinsrb pinsrd pinsrq pmaxsb pmaxsd pmaxud pmaxuw pminsb pminsd pminud pminuw pmovsxbw pmovsxbd pmovsxbq pmovsxwd pmovsxwq pmovsxdq pmovzxbw pmovzxbd pmovzxbq pmovzxwd pmovzxwq pmovzxdq pmuldq pmulld ptest roundpd roundps roundsd roundss crc32 pcmpestri pcmpestrm pcmpistri pcmpistrm pcmpgtq popcnt getsec pfrcpv pfrsqrtv movbe aesenc aesenclast aesdec aesdeclast aesimc aeskeygenassist vaesenc vaesenclast vaesdec vaesdeclast vaesimc vaeskeygenassist vaddpd vaddps vaddsd vaddss vaddsubpd vaddsubps vandpd vandps vandnpd vandnps vblendpd vblendps vblendvpd vblendvps vbroadcastss vbroadcastsd vbroadcastf128 vcmpeq_ospd vcmpeqpd vcmplt_ospd vcmpltpd vcmple_ospd vcmplepd vcmpunord_qpd vcmpunordpd vcmpneq_uqpd vcmpneqpd vcmpnlt_uspd vcmpnltpd vcmpnle_uspd vcmpnlepd vcmpord_qpd vcmpordpd vcmpeq_uqpd vcmpnge_uspd vcmpngepd vcmpngt_uspd vcmpngtpd vcmpfalse_oqpd vcmpfalsepd vcmpneq_oqpd vcmpge_ospd vcmpgepd vcmpgt_ospd vcmpgtpd vcmptrue_uqpd vcmptruepd vcmplt_oqpd vcmple_oqpd vcmpunord_spd vcmpneq_uspd vcmpnlt_uqpd vcmpnle_uqpd vcmpord_spd vcmpeq_uspd vcmpnge_uqpd vcmpngt_uqpd vcmpfalse_ospd vcmpneq_ospd vcmpge_oqpd vcmpgt_oqpd vcmptrue_uspd vcmppd vcmpeq_osps vcmpeqps vcmplt_osps vcmpltps vcmple_osps vcmpleps vcmpunord_qps vcmpunordps vcmpneq_uqps vcmpneqps vcmpnlt_usps vcmpnltps vcmpnle_usps vcmpnleps vcmpord_qps vcmpordps vcmpeq_uqps vcmpnge_usps vcmpngeps vcmpngt_usps vcmpngtps vcmpfalse_oqps vcmpfalseps vcmpneq_oqps vcmpge_osps vcmpgeps vcmpgt_osps vcmpgtps vcmptrue_uqps vcmptrueps vcmplt_oqps vcmple_oqps vcmpunord_sps vcmpneq_usps vcmpnlt_uqps vcmpnle_uqps vcmpord_sps vcmpeq_usps vcmpnge_uqps vcmpngt_uqps vcmpfalse_osps vcmpneq_osps vcmpge_oqps vcmpgt_oqps vcmptrue_usps vcmpps vcmpeq_ossd vcmpeqsd vcmplt_ossd vcmpltsd vcmple_ossd vcmplesd vcmpunord_qsd vcmpunordsd vcmpneq_uqsd vcmpneqsd vcmpnlt_ussd vcmpnltsd vcmpnle_ussd vcmpnlesd vcmpord_qsd vcmpordsd vcmpeq_uqsd vcmpnge_ussd vcmpngesd vcmpngt_ussd vcmpngtsd vcmpfalse_oqsd vcmpfalsesd vcmpneq_oqsd vcmpge_ossd vcmpgesd vcmpgt_ossd vcmpgtsd vcmptrue_uqsd vcmptruesd vcmplt_oqsd vcmple_oqsd vcmpunord_ssd vcmpneq_ussd vcmpnlt_uqsd vcmpnle_uqsd vcmpord_ssd vcmpeq_ussd vcmpnge_uqsd vcmpngt_uqsd vcmpfalse_ossd vcmpneq_ossd vcmpge_oqsd vcmpgt_oqsd vcmptrue_ussd vcmpsd vcmpeq_osss vcmpeqss vcmplt_osss vcmpltss vcmple_osss vcmpless vcmpunord_qss vcmpunordss vcmpneq_uqss vcmpneqss vcmpnlt_usss vcmpnltss vcmpnle_usss vcmpnless vcmpord_qss vcmpordss vcmpeq_uqss vcmpnge_usss vcmpngess vcmpngt_usss vcmpngtss vcmpfalse_oqss vcmpfalsess vcmpneq_oqss vcmpge_osss vcmpgess vcmpgt_osss vcmpgtss vcmptrue_uqss vcmptruess vcmplt_oqss vcmple_oqss vcmpunord_sss vcmpneq_usss vcmpnlt_uqss vcmpnle_uqss vcmpord_sss vcmpeq_usss vcmpnge_uqss vcmpngt_uqss vcmpfalse_osss vcmpneq_osss vcmpge_oqss vcmpgt_oqss vcmptrue_usss vcmpss vcomisd vcomiss vcvtdq2pd vcvtdq2ps vcvtpd2dq vcvtpd2ps vcvtps2dq vcvtps2pd vcvtsd2si vcvtsd2ss vcvtsi2sd vcvtsi2ss vcvtss2sd vcvtss2si vcvttpd2dq vcvttps2dq vcvttsd2si vcvttss2si vdivpd vdivps vdivsd vdivss vdppd vdpps vextractf128 vextractps vhaddpd vhaddps vhsubpd vhsubps vinsertf128 vinsertps vlddqu vldqqu vldmxcsr vmaskmovdqu vmaskmovps vmaskmovpd vmaxpd vmaxps vmaxsd vmaxss vminpd vminps vminsd vminss vmovapd vmovaps vmovd vmovq vmovddup vmovdqa vmovqqa vmovdqu vmovqqu vmovhlps vmovhpd vmovhps vmovlhps vmovlpd vmovlps vmovmskpd vmovmskps vmovntdq vmovntqq vmovntdqa vmovntpd vmovntps vmovsd vmovshdup vmovsldup vmovss vmovupd vmovups vmpsadbw vmulpd vmulps vmulsd vmulss vorpd vorps vpabsb vpabsw vpabsd vpacksswb vpackssdw vpackuswb vpackusdw vpaddb vpaddw vpaddd vpaddq vpaddsb vpaddsw vpaddusb vpaddusw vpalignr vpand vpandn vpavgb vpavgw vpblendvb vpblendw vpcmpestri vpcmpestrm vpcmpistri vpcmpistrm vpcmpeqb vpcmpeqw vpcmpeqd vpcmpeqq vpcmpgtb vpcmpgtw vpcmpgtd vpcmpgtq vpermilpd vpermilps vperm2f128 vpextrb vpextrw vpextrd vpextrq vphaddw vphaddd vphaddsw vphminposuw vphsubw vphsubd vphsubsw vpinsrb vpinsrw vpinsrd vpinsrq vpmaddwd vpmaddubsw vpmaxsb vpmaxsw vpmaxsd vpmaxub vpmaxuw vpmaxud vpminsb vpminsw vpminsd vpminub vpminuw vpminud vpmovmskb vpmovsxbw vpmovsxbd vpmovsxbq vpmovsxwd vpmovsxwq vpmovsxdq vpmovzxbw vpmovzxbd vpmovzxbq vpmovzxwd vpmovzxwq vpmovzxdq vpmulhuw vpmulhrsw vpmulhw vpmullw vpmulld vpmuludq vpmuldq vpor vpsadbw vpshufb vpshufd vpshufhw vpshuflw vpsignb vpsignw vpsignd vpslldq vpsrldq vpsllw vpslld vpsllq vpsraw vpsrad vpsrlw vpsrld vpsrlq vptest vpsubb vpsubw vpsubd vpsubq vpsubsb vpsubsw vpsubusb vpsubusw vpunpckhbw vpunpckhwd vpunpckhdq vpunpckhqdq vpunpcklbw vpunpcklwd vpunpckldq vpunpcklqdq vpxor vrcpps vrcpss vrsqrtps vrsqrtss vroundpd vroundps vroundsd vroundss vshufpd vshufps vsqrtpd vsqrtps vsqrtsd vsqrtss vstmxcsr vsubpd vsubps vsubsd vsubss vtestps vtestpd vucomisd vucomiss vunpckhpd vunpckhps vunpcklpd vunpcklps vxorpd vxorps vzeroall vzeroupper pclmullqlqdq pclmulhqlqdq pclmullqhqdq pclmulhqhqdq pclmulqdq vpclmullqlqdq vpclmulhqlqdq vpclmullqhqdq vpclmulhqhqdq vpclmulqdq vfmadd132ps vfmadd132pd vfmadd312ps vfmadd312pd vfmadd213ps vfmadd213pd vfmadd123ps vfmadd123pd vfmadd231ps vfmadd231pd vfmadd321ps vfmadd321pd vfmaddsub132ps vfmaddsub132pd vfmaddsub312ps vfmaddsub312pd vfmaddsub213ps vfmaddsub213pd vfmaddsub123ps vfmaddsub123pd vfmaddsub231ps vfmaddsub231pd vfmaddsub321ps vfmaddsub321pd vfmsub132ps vfmsub132pd vfmsub312ps vfmsub312pd vfmsub213ps vfmsub213pd vfmsub123ps vfmsub123pd vfmsub231ps vfmsub231pd vfmsub321ps vfmsub321pd vfmsubadd132ps vfmsubadd132pd vfmsubadd312ps vfmsubadd312pd vfmsubadd213ps vfmsubadd213pd vfmsubadd123ps vfmsubadd123pd vfmsubadd231ps vfmsubadd231pd vfmsubadd321ps vfmsubadd321pd vfnmadd132ps vfnmadd132pd vfnmadd312ps vfnmadd312pd vfnmadd213ps vfnmadd213pd vfnmadd123ps vfnmadd123pd vfnmadd231ps vfnmadd231pd vfnmadd321ps vfnmadd321pd vfnmsub132ps vfnmsub132pd vfnmsub312ps vfnmsub312pd vfnmsub213ps vfnmsub213pd vfnmsub123ps vfnmsub123pd vfnmsub231ps vfnmsub231pd vfnmsub321ps vfnmsub321pd vfmadd132ss vfmadd132sd vfmadd312ss vfmadd312sd vfmadd213ss vfmadd213sd vfmadd123ss vfmadd123sd vfmadd231ss vfmadd231sd vfmadd321ss vfmadd321sd vfmsub132ss vfmsub132sd vfmsub312ss vfmsub312sd vfmsub213ss vfmsub213sd vfmsub123ss vfmsub123sd vfmsub231ss vfmsub231sd vfmsub321ss vfmsub321sd vfnmadd132ss vfnmadd132sd vfnmadd312ss vfnmadd312sd vfnmadd213ss vfnmadd213sd vfnmadd123ss vfnmadd123sd vfnmadd231ss vfnmadd231sd vfnmadd321ss vfnmadd321sd vfnmsub132ss vfnmsub132sd vfnmsub312ss vfnmsub312sd vfnmsub213ss vfnmsub213sd vfnmsub123ss vfnmsub123sd vfnmsub231ss vfnmsub231sd vfnmsub321ss vfnmsub321sd rdfsbase rdgsbase rdrand wrfsbase wrgsbase vcvtph2ps vcvtps2ph adcx adox rdseed clac stac xstore xcryptecb xcryptcbc xcryptctr xcryptcfb xcryptofb montmul xsha1 xsha256 llwpcb slwpcb lwpval lwpins vfmaddpd vfmaddps vfmaddsd vfmaddss vfmaddsubpd vfmaddsubps vfmsubaddpd vfmsubaddps vfmsubpd vfmsubps vfmsubsd vfmsubss vfnmaddpd vfnmaddps vfnmaddsd vfnmaddss vfnmsubpd vfnmsubps vfnmsubsd vfnmsubss vfrczpd vfrczps vfrczsd vfrczss vpcmov vpcomb vpcomd vpcomq vpcomub vpcomud vpcomuq vpcomuw vpcomw vphaddbd vphaddbq vphaddbw vphadddq vphaddubd vphaddubq vphaddubw vphaddudq vphadduwd vphadduwq vphaddwd vphaddwq vphsubbw vphsubdq vphsubwd vpmacsdd vpmacsdqh vpmacsdql vpmacssdd vpmacssdqh vpmacssdql vpmacsswd vpmacssww vpmacswd vpmacsww vpmadcsswd vpmadcswd vpperm vprotb vprotd vprotq vprotw vpshab vpshad vpshaq vpshaw vpshlb vpshld vpshlq vpshlw vbroadcasti128 vpblendd vpbroadcastb vpbroadcastw vpbroadcastd vpbroadcastq vpermd vpermpd vpermps vpermq vperm2i128 vextracti128 vinserti128 vpmaskmovd vpmaskmovq vpsllvd vpsllvq vpsravd vpsrlvd vpsrlvq vgatherdpd vgatherqpd vgatherdps vgatherqps vpgatherdd vpgatherqd vpgatherdq vpgatherqq xabort xbegin xend xtest andn bextr blci blcic blsi blsic blcfill blsfill blcmsk blsmsk blsr blcs bzhi mulx pdep pext rorx sarx shlx shrx tzcnt tzmsk t1mskc valignd valignq vblendmpd vblendmps vbroadcastf32x4 vbroadcastf64x4 vbroadcasti32x4 vbroadcasti64x4 vcompresspd vcompressps vcvtpd2udq vcvtps2udq vcvtsd2usi vcvtss2usi vcvttpd2udq vcvttps2udq vcvttsd2usi vcvttss2usi vcvtudq2pd vcvtudq2ps vcvtusi2sd vcvtusi2ss vexpandpd vexpandps vextractf32x4 vextractf64x4 vextracti32x4 vextracti64x4 vfixupimmpd vfixupimmps vfixupimmsd vfixupimmss vgetexppd vgetexpps vgetexpsd vgetexpss vgetmantpd vgetmantps vgetmantsd vgetmantss vinsertf32x4 vinsertf64x4 vinserti32x4 vinserti64x4 vmovdqa32 vmovdqa64 vmovdqu32 vmovdqu64 vpabsq vpandd vpandnd vpandnq vpandq vpblendmd vpblendmq vpcmpltd vpcmpled vpcmpneqd vpcmpnltd vpcmpnled vpcmpd vpcmpltq vpcmpleq vpcmpneqq vpcmpnltq vpcmpnleq vpcmpq vpcmpequd vpcmpltud vpcmpleud vpcmpnequd vpcmpnltud vpcmpnleud vpcmpud vpcmpequq vpcmpltuq vpcmpleuq vpcmpnequq vpcmpnltuq vpcmpnleuq vpcmpuq vpcompressd vpcompressq vpermi2d vpermi2pd vpermi2ps vpermi2q vpermt2d vpermt2pd vpermt2ps vpermt2q vpexpandd vpexpandq vpmaxsq vpmaxuq vpminsq vpminuq vpmovdb vpmovdw vpmovqb vpmovqd vpmovqw vpmovsdb vpmovsdw vpmovsqb vpmovsqd vpmovsqw vpmovusdb vpmovusdw vpmovusqb vpmovusqd vpmovusqw vpord vporq vprold vprolq vprolvd vprolvq vprord vprorq vprorvd vprorvq vpscatterdd vpscatterdq vpscatterqd vpscatterqq vpsraq vpsravq vpternlogd vpternlogq vptestmd vptestmq vptestnmd vptestnmq vpxord vpxorq vrcp14pd vrcp14ps vrcp14sd vrcp14ss vrndscalepd vrndscaleps vrndscalesd vrndscaless vrsqrt14pd vrsqrt14ps vrsqrt14sd vrsqrt14ss vscalefpd vscalefps vscalefsd vscalefss vscatterdpd vscatterdps vscatterqpd vscatterqps vshuff32x4 vshuff64x2 vshufi32x4 vshufi64x2 kandnw kandw kmovw knotw kortestw korw kshiftlw kshiftrw kunpckbw kxnorw kxorw vpbroadcastmb2q vpbroadcastmw2d vpconflictd vpconflictq vplzcntd vplzcntq vexp2pd vexp2ps vrcp28pd vrcp28ps vrcp28sd vrcp28ss vrsqrt28pd vrsqrt28ps vrsqrt28sd vrsqrt28ss vgatherpf0dpd vgatherpf0dps vgatherpf0qpd vgatherpf0qps vgatherpf1dpd vgatherpf1dps vgatherpf1qpd vgatherpf1qps vscatterpf0dpd vscatterpf0dps vscatterpf0qpd vscatterpf0qps vscatterpf1dpd vscatterpf1dps vscatterpf1qpd vscatterpf1qps prefetchwt1 bndmk bndcl bndcu bndcn bndmov bndldx bndstx sha1rnds4 sha1nexte sha1msg1 sha1msg2 sha256rnds2 sha256msg1 sha256msg2 hint_nop0 hint_nop1 hint_nop2 hint_nop3 hint_nop4 hint_nop5 hint_nop6 hint_nop7 hint_nop8 hint_nop9 hint_nop10 hint_nop11 hint_nop12 hint_nop13 hint_nop14 hint_nop15 hint_nop16 hint_nop17 hint_nop18 hint_nop19 hint_nop20 hint_nop21 hint_nop22 hint_nop23 hint_nop24 hint_nop25 hint_nop26 hint_nop27 hint_nop28 hint_nop29 hint_nop30 hint_nop31 hint_nop32 hint_nop33 hint_nop34 hint_nop35 hint_nop36 hint_nop37 hint_nop38 hint_nop39 hint_nop40 hint_nop41 hint_nop42 hint_nop43 hint_nop44 hint_nop45 hint_nop46 hint_nop47 hint_nop48 hint_nop49 hint_nop50 hint_nop51 hint_nop52 hint_nop53 hint_nop54 hint_nop55 hint_nop56 hint_nop57 hint_nop58 hint_nop59 hint_nop60 hint_nop61 hint_nop62 hint_nop63',
        built_in:
          // Instruction pointer
          'ip eip rip '
          // 8-bit registers
          + 'al ah bl bh cl ch dl dh sil dil bpl spl r8b r9b r10b r11b r12b r13b r14b r15b '
          // 16-bit registers
          + 'ax bx cx dx si di bp sp r8w r9w r10w r11w r12w r13w r14w r15w '
          // 32-bit registers
          + 'eax ebx ecx edx esi edi ebp esp eip r8d r9d r10d r11d r12d r13d r14d r15d '
          // 64-bit registers
          + 'rax rbx rcx rdx rsi rdi rbp rsp r8 r9 r10 r11 r12 r13 r14 r15 '
          // Segment registers
          + 'cs ds es fs gs ss '
          // Floating point stack registers
          + 'st st0 st1 st2 st3 st4 st5 st6 st7 '
          // MMX Registers
          + 'mm0 mm1 mm2 mm3 mm4 mm5 mm6 mm7 '
          // SSE registers
          + 'xmm0  xmm1  xmm2  xmm3  xmm4  xmm5  xmm6  xmm7  xmm8  xmm9 xmm10  xmm11 xmm12 xmm13 xmm14 xmm15 '
          + 'xmm16 xmm17 xmm18 xmm19 xmm20 xmm21 xmm22 xmm23 xmm24 xmm25 xmm26 xmm27 xmm28 xmm29 xmm30 xmm31 '
          // AVX registers
          + 'ymm0  ymm1  ymm2  ymm3  ymm4  ymm5  ymm6  ymm7  ymm8  ymm9 ymm10  ymm11 ymm12 ymm13 ymm14 ymm15 '
          + 'ymm16 ymm17 ymm18 ymm19 ymm20 ymm21 ymm22 ymm23 ymm24 ymm25 ymm26 ymm27 ymm28 ymm29 ymm30 ymm31 '
          // AVX-512F registers
          + 'zmm0  zmm1  zmm2  zmm3  zmm4  zmm5  zmm6  zmm7  zmm8  zmm9 zmm10  zmm11 zmm12 zmm13 zmm14 zmm15 '
          + 'zmm16 zmm17 zmm18 zmm19 zmm20 zmm21 zmm22 zmm23 zmm24 zmm25 zmm26 zmm27 zmm28 zmm29 zmm30 zmm31 '
          // AVX-512F mask registers
          + 'k0 k1 k2 k3 k4 k5 k6 k7 '
          // Bound (MPX) register
          + 'bnd0 bnd1 bnd2 bnd3 '
          // Special register
          + 'cr0 cr1 cr2 cr3 cr4 cr8 dr0 dr1 dr2 dr3 dr8 tr3 tr4 tr5 tr6 tr7 '
          // NASM altreg package
          + 'r0 r1 r2 r3 r4 r5 r6 r7 r0b r1b r2b r3b r4b r5b r6b r7b '
          + 'r0w r1w r2w r3w r4w r5w r6w r7w r0d r1d r2d r3d r4d r5d r6d r7d '
          + 'r0h r1h r2h r3h '
          + 'r0l r1l r2l r3l r4l r5l r6l r7l r8l r9l r10l r11l r12l r13l r14l r15l '

          + 'db dw dd dq dt ddq do dy dz '
          + 'resb resw resd resq rest resdq reso resy resz '
          + 'incbin equ times '
          + 'byte word dword qword nosplit rel abs seg wrt strict near far a32 ptr',

        meta:
          '%define %xdefine %+ %undef %defstr %deftok %assign %strcat %strlen %substr %rotate %elif %else %endif '
          + '%if %ifmacro %ifctx %ifidn %ifidni %ifid %ifnum %ifstr %iftoken %ifempty %ifenv %error %warning %fatal %rep '
          + '%endrep %include %push %pop %repl %pathsearch %depend %use %arg %stacksize %local %line %comment %endcomment '
          + '.nolist '
          + '__FILE__ __LINE__ __SECT__  __BITS__ __OUTPUT_FORMAT__ __DATE__ __TIME__ __DATE_NUM__ __TIME_NUM__ '
          + '__UTC_DATE__ __UTC_TIME__ __UTC_DATE_NUM__ __UTC_TIME_NUM__  __PASS__ struc endstruc istruc at iend '
          + 'align alignb sectalign daz nodaz up down zero default option assume public '

          + 'bits use16 use32 use64 default section segment absolute extern global common cpu float '
          + '__utf16__ __utf16le__ __utf16be__ __utf32__ __utf32le__ __utf32be__ '
          + '__float8__ __float16__ __float32__ __float64__ __float80m__ __float80e__ __float128l__ __float128h__ '
          + '__Infinity__ __QNaN__ __SNaN__ Inf NaN QNaN SNaN float8 float16 float32 float64 float80m float80e '
          + 'float128l float128h __FLOAT_DAZ__ __FLOAT_ROUND__ __FLOAT__'
      },
      contains: [
        hljs.COMMENT(
          ';',
          '$',
          { relevance: 0 }
        ),
        {
          className: 'number',
          variants: [
            // Float number and x87 BCD
            {
              begin: '\\b(?:([0-9][0-9_]*)?\\.[0-9_]*(?:[eE][+-]?[0-9_]+)?|'
                     + '(0[Xx])?[0-9][0-9_]*(\\.[0-9_]*)?(?:[pP](?:[+-]?[0-9_]+)?)?)\\b',
              relevance: 0
            },

            // Hex number in $
            {
              begin: '\\$[0-9][0-9A-Fa-f]*',
              relevance: 0
            },

            // Number in H,D,T,Q,O,B,Y suffix
            { begin: '\\b(?:[0-9A-Fa-f][0-9A-Fa-f_]*[Hh]|[0-9][0-9_]*[DdTt]?|[0-7][0-7_]*[QqOo]|[0-1][0-1_]*[BbYy])\\b' },

            // Number in X,D,T,Q,O,B,Y prefix
            { begin: '\\b(?:0[Xx][0-9A-Fa-f_]+|0[DdTt][0-9_]+|0[QqOo][0-7_]+|0[BbYy][0-1_]+)\\b' }
          ]
        },
        // Double quote string
        hljs.QUOTE_STRING_MODE,
        {
          className: 'string',
          variants: [
            // Single-quoted string
            {
              begin: '\'',
              end: '[^\\\\]\''
            },
            // Backquoted string
            {
              begin: '`',
              end: '[^\\\\]`'
            }
          ],
          relevance: 0
        },
        {
          className: 'symbol',
          variants: [
            // Global label and local label
            { begin: '^\\s*[A-Za-z._?][A-Za-z0-9_$#@~.?]*(:|\\s+label)' },
            // Macro-local label
            { begin: '^\\s*%%[A-Za-z0-9_$#@~.?]*:' }
          ],
          relevance: 0
        },
        // Macro parameter
        {
          className: 'subst',
          begin: '%[0-9]+',
          relevance: 0
        },
        // Macro parameter
        {
          className: 'subst',
          begin: '%!\S+',
          relevance: 0
        },
        {
          className: 'meta',
          begin: /^\s*\.[\w_-]+/
        }
      ]
    };
  }

  return x86asm;

})();

    hljs.registerLanguage('x86asm', hljsGrammar);
  })();/*! `xml` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: HTML, XML
  Website: https://www.w3.org/XML/
  Category: common, web
  Audit: 2020
  */

  /** @type LanguageFn */
  function xml(hljs) {
    const regex = hljs.regex;
    // XML names can have the following additional letters: https://www.w3.org/TR/xml/#NT-NameChar
    // OTHER_NAME_CHARS = /[:\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]/;
    // Element names start with NAME_START_CHAR followed by optional other Unicode letters, ASCII digits, hyphens, underscores, and periods
    // const TAG_NAME_RE = regex.concat(/[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, regex.optional(/[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*:/), /[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*/);;
    // const XML_IDENT_RE = /[A-Z_a-z:\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]+/;
    // const TAG_NAME_RE = regex.concat(/[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/, regex.optional(/[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*:/), /[A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*/);
    // however, to cater for performance and more Unicode support rely simply on the Unicode letter class
    const TAG_NAME_RE = regex.concat(/[\p{L}_]/u, regex.optional(/[\p{L}0-9_.-]*:/u), /[\p{L}0-9_.-]*/u);
    const XML_IDENT_RE = /[\p{L}0-9._:-]+/u;
    const XML_ENTITIES = {
      className: 'symbol',
      begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/
    };
    const XML_META_KEYWORDS = {
      begin: /\s/,
      contains: [
        {
          className: 'keyword',
          begin: /#?[a-z_][a-z1-9_-]+/,
          illegal: /\n/
        }
      ]
    };
    const XML_META_PAR_KEYWORDS = hljs.inherit(XML_META_KEYWORDS, {
      begin: /\(/,
      end: /\)/
    });
    const APOS_META_STRING_MODE = hljs.inherit(hljs.APOS_STRING_MODE, { className: 'string' });
    const QUOTE_META_STRING_MODE = hljs.inherit(hljs.QUOTE_STRING_MODE, { className: 'string' });
    const TAG_INTERNALS = {
      endsWithParent: true,
      illegal: /</,
      relevance: 0,
      contains: [
        {
          className: 'attr',
          begin: XML_IDENT_RE,
          relevance: 0
        },
        {
          begin: /=\s*/,
          relevance: 0,
          contains: [
            {
              className: 'string',
              endsParent: true,
              variants: [
                {
                  begin: /"/,
                  end: /"/,
                  contains: [ XML_ENTITIES ]
                },
                {
                  begin: /'/,
                  end: /'/,
                  contains: [ XML_ENTITIES ]
                },
                { begin: /[^\s"'=<>`]+/ }
              ]
            }
          ]
        }
      ]
    };
    return {
      name: 'HTML, XML',
      aliases: [
        'html',
        'xhtml',
        'rss',
        'atom',
        'xjb',
        'xsd',
        'xsl',
        'plist',
        'wsf',
        'svg'
      ],
      case_insensitive: true,
      unicodeRegex: true,
      contains: [
        {
          className: 'meta',
          begin: /<![a-z]/,
          end: />/,
          relevance: 10,
          contains: [
            XML_META_KEYWORDS,
            QUOTE_META_STRING_MODE,
            APOS_META_STRING_MODE,
            XML_META_PAR_KEYWORDS,
            {
              begin: /\[/,
              end: /\]/,
              contains: [
                {
                  className: 'meta',
                  begin: /<![a-z]/,
                  end: />/,
                  contains: [
                    XML_META_KEYWORDS,
                    XML_META_PAR_KEYWORDS,
                    QUOTE_META_STRING_MODE,
                    APOS_META_STRING_MODE
                  ]
                }
              ]
            }
          ]
        },
        hljs.COMMENT(
          /<!--/,
          /-->/,
          { relevance: 10 }
        ),
        {
          begin: /<!\[CDATA\[/,
          end: /\]\]>/,
          relevance: 10
        },
        XML_ENTITIES,
        // xml processing instructions
        {
          className: 'meta',
          end: /\?>/,
          variants: [
            {
              begin: /<\?xml/,
              relevance: 10,
              contains: [
                QUOTE_META_STRING_MODE
              ]
            },
            {
              begin: /<\?[a-z][a-z0-9]+/,
            }
          ]

        },
        {
          className: 'tag',
          /*
          The lookahead pattern (?=...) ensures that 'begin' only matches
          '<style' as a single word, followed by a whitespace or an
          ending bracket.
          */
          begin: /<style(?=\s|>)/,
          end: />/,
          keywords: { name: 'style' },
          contains: [ TAG_INTERNALS ],
          starts: {
            end: /<\/style>/,
            returnEnd: true,
            subLanguage: [
              'css',
              'xml'
            ]
          }
        },
        {
          className: 'tag',
          // See the comment in the <style tag about the lookahead pattern
          begin: /<script(?=\s|>)/,
          end: />/,
          keywords: { name: 'script' },
          contains: [ TAG_INTERNALS ],
          starts: {
            end: /<\/script>/,
            returnEnd: true,
            subLanguage: [
              'javascript',
              'handlebars',
              'xml'
            ]
          }
        },
        // we need this for now for jSX
        {
          className: 'tag',
          begin: /<>|<\/>/
        },
        // open tag
        {
          className: 'tag',
          begin: regex.concat(
            /</,
            regex.lookahead(regex.concat(
              TAG_NAME_RE,
              // <tag/>
              // <tag>
              // <tag ...
              regex.either(/\/>/, />/, /\s/)
            ))
          ),
          end: /\/?>/,
          contains: [
            {
              className: 'name',
              begin: TAG_NAME_RE,
              relevance: 0,
              starts: TAG_INTERNALS
            }
          ]
        },
        // close tag
        {
          className: 'tag',
          begin: regex.concat(
            /<\//,
            regex.lookahead(regex.concat(
              TAG_NAME_RE, />/
            ))
          ),
          contains: [
            {
              className: 'name',
              begin: TAG_NAME_RE,
              relevance: 0
            },
            {
              begin: />/,
              relevance: 0,
              endsParent: true
            }
          ]
        }
      ]
    };
  }

  return xml;

})();

    hljs.registerLanguage('xml', hljsGrammar);
  })();/*! `xquery` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: XQuery
  Author: Dirk Kirsten <dk@basex.org>
  Contributor: Duncan Paterson
  Description: Supports XQuery 3.1 including XQuery Update 3, so also XPath (as it is a superset)
  Refactored to process xml constructor syntax and function-bodies. Added missing data-types, xpath operands, inbuilt functions, and query prologs
  Website: https://www.w3.org/XML/Query/
  Category: functional
  Audit: 2020
  */

  /** @type LanguageFn */
  function xquery(_hljs) {
    // see https://www.w3.org/TR/xquery/#id-terminal-delimitation
    const KEYWORDS = [
      "module",
      "schema",
      "namespace",
      "boundary-space",
      "preserve",
      "no-preserve",
      "strip",
      "default",
      "collation",
      "base-uri",
      "ordering",
      "context",
      "decimal-format",
      "decimal-separator",
      "copy-namespaces",
      "empty-sequence",
      "except",
      "exponent-separator",
      "external",
      "grouping-separator",
      "inherit",
      "no-inherit",
      "lax",
      "minus-sign",
      "per-mille",
      "percent",
      "schema-attribute",
      "schema-element",
      "strict",
      "unordered",
      "zero-digit",
      "declare",
      "import",
      "option",
      "function",
      "validate",
      "variable",
      "for",
      "at",
      "in",
      "let",
      "where",
      "order",
      "group",
      "by",
      "return",
      "if",
      "then",
      "else",
      "tumbling",
      "sliding",
      "window",
      "start",
      "when",
      "only",
      "end",
      "previous",
      "next",
      "stable",
      "ascending",
      "descending",
      "allowing",
      "empty",
      "greatest",
      "least",
      "some",
      "every",
      "satisfies",
      "switch",
      "case",
      "typeswitch",
      "try",
      "catch",
      "and",
      "or",
      "to",
      "union",
      "intersect",
      "instance",
      "of",
      "treat",
      "as",
      "castable",
      "cast",
      "map",
      "array",
      "delete",
      "insert",
      "into",
      "replace",
      "value",
      "rename",
      "copy",
      "modify",
      "update"
    ];

    // Node Types (sorted by inheritance)
    // atomic types (sorted by inheritance)
    const TYPES = [
      "item",
      "document-node",
      "node",
      "attribute",
      "document",
      "element",
      "comment",
      "namespace",
      "namespace-node",
      "processing-instruction",
      "text",
      "construction",
      "xs:anyAtomicType",
      "xs:untypedAtomic",
      "xs:duration",
      "xs:time",
      "xs:decimal",
      "xs:float",
      "xs:double",
      "xs:gYearMonth",
      "xs:gYear",
      "xs:gMonthDay",
      "xs:gMonth",
      "xs:gDay",
      "xs:boolean",
      "xs:base64Binary",
      "xs:hexBinary",
      "xs:anyURI",
      "xs:QName",
      "xs:NOTATION",
      "xs:dateTime",
      "xs:dateTimeStamp",
      "xs:date",
      "xs:string",
      "xs:normalizedString",
      "xs:token",
      "xs:language",
      "xs:NMTOKEN",
      "xs:Name",
      "xs:NCName",
      "xs:ID",
      "xs:IDREF",
      "xs:ENTITY",
      "xs:integer",
      "xs:nonPositiveInteger",
      "xs:negativeInteger",
      "xs:long",
      "xs:int",
      "xs:short",
      "xs:byte",
      "xs:nonNegativeInteger",
      "xs:unisignedLong",
      "xs:unsignedInt",
      "xs:unsignedShort",
      "xs:unsignedByte",
      "xs:positiveInteger",
      "xs:yearMonthDuration",
      "xs:dayTimeDuration"
    ];

    const LITERALS = [
      "eq",
      "ne",
      "lt",
      "le",
      "gt",
      "ge",
      "is",
      "self::",
      "child::",
      "descendant::",
      "descendant-or-self::",
      "attribute::",
      "following::",
      "following-sibling::",
      "parent::",
      "ancestor::",
      "ancestor-or-self::",
      "preceding::",
      "preceding-sibling::",
      "NaN"
    ];

    // functions (TODO: find regex for op: without breaking build)
    const BUILT_IN = {
      className: 'built_in',
      variants: [
        {
          begin: /\barray:/,
          end: /(?:append|filter|flatten|fold-(?:left|right)|for-each(?:-pair)?|get|head|insert-before|join|put|remove|reverse|size|sort|subarray|tail)\b/
        },
        {
          begin: /\bmap:/,
          end: /(?:contains|entry|find|for-each|get|keys|merge|put|remove|size)\b/
        },
        {
          begin: /\bmath:/,
          end: /(?:a(?:cos|sin|tan[2]?)|cos|exp(?:10)?|log(?:10)?|pi|pow|sin|sqrt|tan)\b/
        },
        {
          begin: /\bop:/,
          end: /\(/,
          excludeEnd: true
        },
        {
          begin: /\bfn:/,
          end: /\(/,
          excludeEnd: true
        },
        // do not highlight inbuilt strings as variable or xml element names
        { begin: /[^</$:'"-]\b(?:abs|accumulator-(?:after|before)|adjust-(?:date(?:Time)?|time)-to-timezone|analyze-string|apply|available-(?:environment-variables|system-properties)|avg|base-uri|boolean|ceiling|codepoints?-(?:equal|to-string)|collation-key|collection|compare|concat|contains(?:-token)?|copy-of|count|current(?:-)?(?:date(?:Time)?|time|group(?:ing-key)?|output-uri|merge-(?:group|key))?data|dateTime|days?-from-(?:date(?:Time)?|duration)|deep-equal|default-(?:collation|language)|distinct-values|document(?:-uri)?|doc(?:-available)?|element-(?:available|with-id)|empty|encode-for-uri|ends-with|environment-variable|error|escape-html-uri|exactly-one|exists|false|filter|floor|fold-(?:left|right)|for-each(?:-pair)?|format-(?:date(?:Time)?|time|integer|number)|function-(?:arity|available|lookup|name)|generate-id|has-children|head|hours-from-(?:dateTime|duration|time)|id(?:ref)?|implicit-timezone|in-scope-prefixes|index-of|innermost|insert-before|iri-to-uri|json-(?:doc|to-xml)|key|lang|last|load-xquery-module|local-name(?:-from-QName)?|(?:lower|upper)-case|matches|max|minutes-from-(?:dateTime|duration|time)|min|months?-from-(?:date(?:Time)?|duration)|name(?:space-uri-?(?:for-prefix|from-QName)?)?|nilled|node-name|normalize-(?:space|unicode)|not|number|one-or-more|outermost|parse-(?:ietf-date|json)|path|position|(?:prefix-from-)?QName|random-number-generator|regex-group|remove|replace|resolve-(?:QName|uri)|reverse|root|round(?:-half-to-even)?|seconds-from-(?:dateTime|duration|time)|snapshot|sort|starts-with|static-base-uri|stream-available|string-?(?:join|length|to-codepoints)?|subsequence|substring-?(?:after|before)?|sum|system-property|tail|timezone-from-(?:date(?:Time)?|time)|tokenize|trace|trans(?:form|late)|true|type-available|unordered|unparsed-(?:entity|text)?-?(?:public-id|uri|available|lines)?|uri-collection|xml-to-json|years?-from-(?:date(?:Time)?|duration)|zero-or-one)\b/ },
        {
          begin: /\blocal:/,
          end: /\(/,
          excludeEnd: true
        },
        {
          begin: /\bzip:/,
          end: /(?:zip-file|(?:xml|html|text|binary)-entry| (?:update-)?entries)\b/
        },
        {
          begin: /\b(?:util|db|functx|app|xdmp|xmldb):/,
          end: /\(/,
          excludeEnd: true
        }
      ]
    };

    const TITLE = {
      className: 'title',
      begin: /\bxquery version "[13]\.[01]"\s?(?:encoding ".+")?/,
      end: /;/
    };

    const VAR = {
      className: 'variable',
      begin: /[$][\w\-:]+/
    };

    const NUMBER = {
      className: 'number',
      begin: /(\b0[0-7_]+)|(\b0x[0-9a-fA-F_]+)|(\b[1-9][0-9_]*(\.[0-9_]+)?)|[0_]\b/,
      relevance: 0
    };

    const STRING = {
      className: 'string',
      variants: [
        {
          begin: /"/,
          end: /"/,
          contains: [
            {
              begin: /""/,
              relevance: 0
            }
          ]
        },
        {
          begin: /'/,
          end: /'/,
          contains: [
            {
              begin: /''/,
              relevance: 0
            }
          ]
        }
      ]
    };

    const ANNOTATION = {
      className: 'meta',
      begin: /%[\w\-:]+/
    };

    const COMMENT = {
      className: 'comment',
      begin: /\(:/,
      end: /:\)/,
      relevance: 10,
      contains: [
        {
          className: 'doctag',
          begin: /@\w+/
        }
      ]
    };

    // see https://www.w3.org/TR/xquery/#id-computedConstructors
    // mocha: computed_inbuilt
    // see https://www.regexpal.com/?fam=99749
    const COMPUTED = {
      beginKeywords: 'element attribute comment document processing-instruction',
      end: /\{/,
      excludeEnd: true
    };

    // mocha: direct_method
    const DIRECT = {
      begin: /<([\w._:-]+)(\s+\S*=('|").*('|"))?>/,
      end: /(\/[\w._:-]+>)/,
      subLanguage: 'xml',
      contains: [
        {
          begin: /\{/,
          end: /\}/,
          subLanguage: 'xquery'
        },
        'self'
      ]
    };

    const CONTAINS = [
      VAR,
      BUILT_IN,
      STRING,
      NUMBER,
      COMMENT,
      ANNOTATION,
      TITLE,
      COMPUTED,
      DIRECT
    ];

    return {
      name: 'XQuery',
      aliases: [
        'xpath',
        'xq',
        'xqm'
      ],
      case_insensitive: false,
      illegal: /(proc)|(abstract)|(extends)|(until)|(#)/,
      keywords: {
        $pattern: /[a-zA-Z$][a-zA-Z0-9_:-]*/,
        keyword: KEYWORDS,
        type: TYPES,
        literal: LITERALS
      },
      contains: CONTAINS
    };
  }

  return xquery;

})();

    hljs.registerLanguage('xquery', hljsGrammar);
  })();/*! `yaml` grammar compiled for Highlight.js 11.9.0 */
  (function(){
    var hljsGrammar = (function () {
  'use strict';

  /*
  Language: YAML
  Description: Yet Another Markdown Language
  Author: Stefan Wienert <stwienert@gmail.com>
  Contributors: Carl Baxter <carl@cbax.tech>
  Requires: ruby.js
  Website: https://yaml.org
  Category: common, config
  */
  function yaml(hljs) {
    const LITERALS = 'true false yes no null';

    // YAML spec allows non-reserved URI characters in tags.
    const URI_CHARACTERS = '[\\w#;/?:@&=+$,.~*\'()[\\]]+';

    // Define keys as starting with a word character
    // ...containing word chars, spaces, colons, forward-slashes, hyphens and periods
    // ...and ending with a colon followed immediately by a space, tab or newline.
    // The YAML spec allows for much more than this, but this covers most use-cases.
    const KEY = {
      className: 'attr',
      variants: [
        // added brackets support 
        { begin: /\w[\w :()\./-]*:(?=[ \t]|$)/ },
        { // double quoted keys - with brackets
          begin: /"\w[\w :()\./-]*":(?=[ \t]|$)/ },
        { // single quoted keys - with brackets
          begin: /'\w[\w :()\./-]*':(?=[ \t]|$)/ },
      ]
    };

    const TEMPLATE_VARIABLES = {
      className: 'template-variable',
      variants: [
        { // jinja templates Ansible
          begin: /\{\{/,
          end: /\}\}/
        },
        { // Ruby i18n
          begin: /%\{/,
          end: /\}/
        }
      ]
    };
    const STRING = {
      className: 'string',
      relevance: 0,
      variants: [
        {
          begin: /'/,
          end: /'/
        },
        {
          begin: /"/,
          end: /"/
        },
        { begin: /\S+/ }
      ],
      contains: [
        hljs.BACKSLASH_ESCAPE,
        TEMPLATE_VARIABLES
      ]
    };

    // Strings inside of value containers (objects) can't contain braces,
    // brackets, or commas
    const CONTAINER_STRING = hljs.inherit(STRING, { variants: [
      {
        begin: /'/,
        end: /'/
      },
      {
        begin: /"/,
        end: /"/
      },
      { begin: /[^\s,{}[\]]+/ }
    ] });

    const DATE_RE = '[0-9]{4}(-[0-9][0-9]){0,2}';
    const TIME_RE = '([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?';
    const FRACTION_RE = '(\\.[0-9]*)?';
    const ZONE_RE = '([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?';
    const TIMESTAMP = {
      className: 'number',
      begin: '\\b' + DATE_RE + TIME_RE + FRACTION_RE + ZONE_RE + '\\b'
    };

    const VALUE_CONTAINER = {
      end: ',',
      endsWithParent: true,
      excludeEnd: true,
      keywords: LITERALS,
      relevance: 0
    };
    const OBJECT = {
      begin: /\{/,
      end: /\}/,
      contains: [ VALUE_CONTAINER ],
      illegal: '\\n',
      relevance: 0
    };
    const ARRAY = {
      begin: '\\[',
      end: '\\]',
      contains: [ VALUE_CONTAINER ],
      illegal: '\\n',
      relevance: 0
    };

    const MODES = [
      KEY,
      {
        className: 'meta',
        begin: '^---\\s*$',
        relevance: 10
      },
      { // multi line string
        // Blocks start with a | or > followed by a newline
        //
        // Indentation of subsequent lines must be the same to
        // be considered part of the block
        className: 'string',
        begin: '[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*'
      },
      { // Ruby/Rails erb
        begin: '<%[%=-]?',
        end: '[%-]?%>',
        subLanguage: 'ruby',
        excludeBegin: true,
        excludeEnd: true,
        relevance: 0
      },
      { // named tags
        className: 'type',
        begin: '!\\w+!' + URI_CHARACTERS
      },
      // https://yaml.org/spec/1.2/spec.html#id2784064
      { // verbatim tags
        className: 'type',
        begin: '!<' + URI_CHARACTERS + ">"
      },
      { // primary tags
        className: 'type',
        begin: '!' + URI_CHARACTERS
      },
      { // secondary tags
        className: 'type',
        begin: '!!' + URI_CHARACTERS
      },
      { // fragment id &ref
        className: 'meta',
        begin: '&' + hljs.UNDERSCORE_IDENT_RE + '$'
      },
      { // fragment reference *ref
        className: 'meta',
        begin: '\\*' + hljs.UNDERSCORE_IDENT_RE + '$'
      },
      { // array listing
        className: 'bullet',
        // TODO: remove |$ hack when we have proper look-ahead support
        begin: '-(?=[ ]|$)',
        relevance: 0
      },
      hljs.HASH_COMMENT_MODE,
      {
        beginKeywords: LITERALS,
        keywords: { literal: LITERALS }
      },
      TIMESTAMP,
      // numbers are any valid C-style number that
      // sit isolated from other words
      {
        className: 'number',
        begin: hljs.C_NUMBER_RE + '\\b',
        relevance: 0
      },
      OBJECT,
      ARRAY,
      STRING
    ];

    const VALUE_MODES = [ ...MODES ];
    VALUE_MODES.pop();
    VALUE_MODES.push(CONTAINER_STRING);
    VALUE_CONTAINER.contains = VALUE_MODES;

    return {
      name: 'YAML',
      case_insensitive: true,
      aliases: [ 'yml' ],
      contains: MODES
    };
  }

  return yaml;

})();

    hljs.registerLanguage('yaml', hljsGrammar);
  })();