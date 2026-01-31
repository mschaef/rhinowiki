// logo.js
hljs.registerLanguage('logo', function(hljs) {
  return {
    name: 'Logo',
    case_insensitive: true,
    keywords: {
      keyword: [
          'to','end','make', 'thing',
          'local', 'global', 'repeat',
          'if', 'ifelse', 'stop', 'output',
      ],
      built_in: [
          'forward', 'fd', 'back', 'bk', 'left', 'lt',
          'right', 'rt', 'setxy', 'setx', 'sety', 'seth',
          'home', 'penup', 'pu', 'pendown', 'pd', 'pencolor',
          'setpc', 'pensize', 'setpensize', 'setpen',
          'clearscreen', 'cs', 'clean', 'showturtle', 'st',
          'hideturtle', 'ht', '+', '-', '*', '/', 'remainder',
          'round', 'int', 'sqrt', 'power', 'random', '=', '<',
          '>', '<=', '>=', '<>', 'and', 'or', 'not', 'list',
          'sentence', 'se', 'word', 'first', 'last', 'butfirst',
          'bf', 'butlast', 'bl', 'item', 'count', 'fput', 'lput',
          'print', 'pr', 'show', 'type', 'readword', 'readlist',
          'readchar', 'wait', 'random', 'emptyp', 'wordp',
          'listp', 'numberp', 'equalp', 'memberp', 'pl',
          'bye', 'erase', 'po',
      ]
    },
    contains: [
      hljs.COMMENT(';', '$'),
      hljs.NUMBER_MODE,
      {
        className: 'symbol',
        begin: ':[a-zA-Z_][\\w-]*'
      }
    ]
  };
});



