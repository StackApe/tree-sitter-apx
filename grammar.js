/**
 * Tree-sitter grammar for ApX (APEX Command Language)
 * @see docs/ApX_SPEC.md for language specification
 */

const PREC = {
  COMMAND: 1,
  PIPE: 2,
  OR: 3,
  AND: 4,
  COMPARE: 5,
  ADD: 6,
  MULT: 7,
  UNARY: 8,
  CALL: 9,
};

module.exports = grammar({
  name: 'apx',

  extras: $ => [
    /\s/,
    $.comment,
  ],

  conflicts: $ => [
    [$.command_expression],
    [$.record, $.closure, $.block],
    [$.closure, $.block],
  ],

  word: $ => $.identifier,

  rules: {
    // Entry point
    source_file: $ => repeat($._statement),

    _statement: $ => choice(
      $.assignment,
      $.if_statement,
      $.for_statement,
      $.while_statement,
      $.match_statement,
      $.function_definition,
      $.macro_definition,
      $.alias_definition,
      $.try_statement,
      $.test_definition,
      $.import_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $._expression,
    ),

    // Comments
    comment: $ => token(seq('#', /.*/)),

    // Expressions
    _expression: $ => choice(
      $.pipeline,
      $._non_pipe_expression,
    ),

    _non_pipe_expression: $ => choice(
      $.binary_expression,
      $.unary_expression,
      $.primary_expression,
      $.command_expression,
    ),

    // Pipeline - the core of ApX
    pipeline: $ => prec.left(PREC.PIPE, seq(
      $._non_pipe_expression,
      repeat1(seq('|', $._non_pipe_expression)),
    )),

    primary_expression: $ => choice(
      $.number,
      $.string,
      $.boolean,
      $.null,
      $.variable,
      $.list,
      $.record,
      $.range,
      $.closure,
      $.parenthesized_expression,
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    // Binary expressions with precedence
    binary_expression: $ => choice(
      prec.left(PREC.OR, seq($._non_pipe_expression, choice('or', '||'), $._non_pipe_expression)),
      prec.left(PREC.AND, seq($._non_pipe_expression, choice('and', '&&'), $._non_pipe_expression)),
      prec.left(PREC.COMPARE, seq($._non_pipe_expression, choice('==', '!=', '<', '>', '<=', '>='), $._non_pipe_expression)),
      prec.left(PREC.ADD, seq($._non_pipe_expression, choice('+', '-'), $._non_pipe_expression)),
      prec.left(PREC.MULT, seq($._non_pipe_expression, choice('*', '/', '%'), $._non_pipe_expression)),
    ),

    unary_expression: $ => choice(
      prec(PREC.UNARY, seq('not', $._non_pipe_expression)),
      prec(PREC.UNARY, seq('!', $._non_pipe_expression)),
      prec(PREC.UNARY, seq('-', $.primary_expression)),
    ),

    // Literals
    number: $ => choice(
      $.integer,
      $.float,
      $.hex_number,
      $.binary_number,
      $.octal_number,
    ),

    integer: $ => /\d+/,
    float: $ => /\d+\.\d+/,
    hex_number: $ => /0x[0-9a-fA-F_]+/,
    binary_number: $ => /0b[01_]+/,
    octal_number: $ => /0o[0-7_]+/,

    string: $ => choice(
      $.double_string,
      $.single_string,
      $.triple_string,
      $.raw_string,
      $.backtick_string,
    ),

    double_string: $ => token(seq(
      '"',
      repeat(choice(
        /\\./,             // escape sequence
        /[^"\\]+/,         // regular characters
      )),
      '"',
    )),

    single_string: $ => token(seq(
      "'",
      repeat(choice(
        /\\./,             // escape sequence
        /[^'\\]+/,         // regular characters
      )),
      "'",
    )),

    triple_string: $ => seq(
      '"""',
      /[^"]*(""?[^"]*)*/,
      '"""',
    ),

    raw_string: $ => seq(
      'r"',
      /[^"]*/,
      '"',
    ),

    backtick_string: $ => seq(
      '`',
      /[^`]*/,
      '`',
    ),

    escape_sequence: $ => /\\[nrt"'\\]/,

    string_interpolation: $ => seq('$', $.identifier),

    boolean: $ => choice('true', 'false'),

    null: $ => 'null',

    // Variables
    variable: $ => choice(
      $.regular_variable,
      $.env_variable,
      $.special_variable,
    ),

    regular_variable: $ => /\$[a-zA-Z_][a-zA-Z0-9_]*/,
    env_variable: $ => /\$env\.[a-zA-Z_][a-zA-Z0-9_]*/,
    special_variable: $ => choice('$it', '$_', '$err'),

    // Range
    range: $ => seq(
      $.integer,
      choice('..', '..='),
      $.integer,
    ),

    // List
    list: $ => seq(
      '[',
      optional(seq(
        $._expression,
        repeat(seq(',', $._expression)),
        optional(','),
      )),
      ']',
    ),

    // Record - higher precedence than closure for empty {}
    record: $ => prec(2, seq(
      '{',
      optional(seq(
        $.record_field,
        repeat(seq(',', $.record_field)),
        optional(','),
      )),
      '}',
    )),

    record_field: $ => seq(
      $.identifier,
      ':',
      $._expression,
    ),

    // Closure / Block - lower precedence than record for empty {}
    closure: $ => prec(1, seq(
      '{',
      optional($.closure_parameters),
      repeat($._statement),
      '}',
    )),

    closure_parameters: $ => seq(
      '|',
      optional(seq(
        $.identifier,
        repeat(seq(',', $.identifier)),
      )),
      '|',
    ),

    // Control flow
    if_statement: $ => seq(
      'if',
      $._expression,
      $.block,
      repeat($.elif_clause),
      optional($.else_clause),
    ),

    elif_clause: $ => seq(
      'elif',
      $._expression,
      $.block,
    ),

    else_clause: $ => seq(
      'else',
      $.block,
    ),

    for_statement: $ => seq(
      'for',
      $.identifier,
      'in',
      $._expression,
      $.block,
    ),

    while_statement: $ => seq(
      'while',
      $._expression,
      $.block,
    ),

    match_statement: $ => seq(
      'match',
      $._expression,
      '{',
      repeat($.match_arm),
      '}',
    ),

    match_arm: $ => seq(
      $._pattern,
      optional(seq('if', $._expression)),
      '=>',
      choice($._expression, $.block),
      optional(','),
    ),

    _pattern: $ => choice(
      $.number,
      $.string,
      $.boolean,
      $.null,
      $.identifier,
      '_',
    ),

    block: $ => prec(1, seq(
      '{',
      repeat($._statement),
      '}',
    )),

    // Try/catch
    try_statement: $ => seq(
      'try',
      $.block,
      'catch',
      optional($.identifier),
      $.block,
    ),

    // Function definition
    function_definition: $ => seq(
      'fn',
      $.identifier,
      $.parameter_list,
      $.block,
    ),

    parameter_list: $ => seq(
      '(',
      optional(seq(
        $.parameter,
        repeat(seq(',', $.parameter)),
      )),
      ')',
    ),

    parameter: $ => seq(
      $.identifier,
      optional(seq('=', $._expression)),
    ),

    // Macro definition
    macro_definition: $ => seq(
      'macro',
      $.identifier,
      optional($.parameter_list),
      $.block,
    ),

    // Alias definition
    alias_definition: $ => seq(
      'alias',
      $.identifier,
      '=',
      $._expression,
    ),

    // Test definition
    test_definition: $ => seq(
      'test',
      $.string,
      $.block,
    ),

    // Import statement
    import_statement: $ => choice(
      seq('use', $.module_path),
      seq('from', $.module_path, 'import', $.import_list),
    ),

    module_path: $ => seq(
      $.identifier,
      repeat(seq('::', $.identifier)),
    ),

    import_list: $ => choice(
      '*',
      seq(
        $.import_item,
        repeat(seq(',', $.import_item)),
      ),
    ),

    import_item: $ => seq(
      $.identifier,
      optional(seq('as', $.identifier)),
    ),

    // Return, break, continue
    return_statement: $ => prec.right(seq('return', optional($._expression))),
    break_statement: $ => 'break',
    continue_statement: $ => 'continue',

    // Assignment
    assignment: $ => seq(
      choice('let', 'const', 'set'),
      $.identifier,
      '=',
      $._expression,
    ),

    // Command expression - any identifier followed by arguments
    // This handles both built-in and user-defined commands
    // Higher precedence to capture arguments greedily
    command_expression: $ => prec.right(PREC.CALL, seq(
      $.command_name,
      repeat($.argument),
    )),

    // Command names - built-in commands get special highlighting
    command_name: $ => choice(
      $.builtin_command,
      $.identifier,
    ),

    // All built-in commands as simple tokens for highlighting
    builtin_command: $ => choice(
      // I/O
      'echo', 'print', 'pwd', 'cd', 'run', 'prime', 'input', 'cat',
      // File operations
      'touch', 'cp', 'mv', 'rm', 'ls', 'll', 'mkdir',
      'exists', 'is-file', 'is-dir', 'write', 'append-file',
      'read-bytes', 'write-bytes', 'file-size', 'file-info', 'file-type',
      // List operations
      'count', 'length', 'first', 'last', 'take', 'skip', 'get',
      'reverse', 'append', 'prepend', 'flatten', 'uniq', 'sum', 'avg',
      'min', 'max', 'range', 'enumerate', 'compact', 'zip',
      // Filters
      'where', 'each', 'select', 'sort-by', 'group-by', 'any', 'all', 'none',
      // String operations
      'upper', 'lower', 'trim', 'split', 'join', 'replace', 'lines',
      'contains', 'starts-with', 'ends-with', 'empty', 'chars', 'char-at',
      'slice', 'find', 'pad-left', 'pad-right', 'repeat', 'capitalize', 'title-case',
      // Math
      'abs', 'round', 'ceil', 'floor', 'pow', 'sqrt',
      'sin', 'cos', 'tan', 'log', 'log10', 'exp',
      'band', 'bor', 'bxor', 'bnot', 'shl', 'shr',
      // Git
      'git-status', 'git-log', 'git-branch', 'git-diff',
      'git-add', 'git-commit', 'git-push', 'git-pull', 'git-stash',
      // Network
      'http-get', 'http-post', 'http-serve', 'download',
      'dns-lookup', 'ptr-lookup', 'whois', 'port-scan',
      'ip-addr', 'ping', 'netstat', 'ip-route', 'ip-link',
      'traceroute', 'arp', 'headers', 'recon',
      'wifi-scan', 'wifi-status', 'wifi-connect', 'wifi-disconnect',
      'wifi-saved', 'wifi-forget',
      'bt-status', 'bt-devices', 'bt-scan', 'bt-connect',
      'bt-disconnect', 'bt-pair', 'bt-power', 'bt-remove',
      'firewall-status', 'firewall-rules', 'firewall-allow', 'firewall-deny',
      'ws-connect', 'ws-send', 'ws-echo',
      // Crypto
      'md5', 'sha1', 'sha256', 'sha512', 'blake2b', 'blake2s', 'hash-file',
      'hmac-sha256', 'crc32', 'rot13', 'caesar', 'xor',
      'aes-encrypt', 'aes-decrypt', 'jwt-decode',
      'password-gen', 'entropy', 'random-bytes', 'uuid',
      'base64-encode', 'base64-decode', 'hex-encode', 'hex-decode',
      'url-encode', 'url-decode', 'hex-dump',
      'strings', 'binary-info', 'parse-elf', 'parse-pe',
      'symbols', 'disassemble', 'analyze',
      'hash-id', 'detect-encoding', 'decode-auto',
      // System
      'sys-info', 'mem-info', 'cpu-info', 'disk-info',
      'processes', 'loadavg', 'uptime', 'launch',
      'hostname', 'os', 'which', 'env', 'set-env',
      'monitors', 'screenshot', 'screenshot-region', 'screenshot-window', 'windows',
      'clipboard-read', 'clipboard-write', 'browser-open',
      'notify', 'notify-urgent', 'notify-progress',
      'audio-play', 'audio-beep', 'audio-volume',
      'spawn-process', 'kill-process', 'process-list',
      // Data formats
      'parse-json', 'from-json', 'to-json',
      'parse-yaml', 'to-yaml',
      'parse-toml', 'to-toml',
      'parse-csv', 'to-csv',
      'sqlite-create', 'sqlite-exec', 'sqlite-query', 'sqlite-tables', 'sqlite-schema',
      'qr-encode', 'qr-save',
      'now', 'timestamp', 'date', 'parse-date', 'format-date', 'date-add',
      'zip', 'unzip',
      'pdf-create', 'pdf-text',
      'md-to-html', 'md-parse', 'md-strip',
      // Image
      'img-open', 'img-save', 'img-size', 'img-info', 'img-pixel',
      'img-resize', 'img-thumbnail', 'img-crop', 'img-rotate',
      'img-flip-h', 'img-flip-v', 'img-grayscale', 'img-brighten',
      'img-contrast', 'img-blur', 'img-invert', 'img-close', 'img-list',
      // Panel control
      'open', 'close', 'toggle', 'focus', 'hsplit', 'vsplit', 'edit', 'term',
      // AI
      'ai-ask', 'ai-models', 'ala',
      // Utility
      'help', 'version', 'type', 'sleep', 'random', 'clear', 'beep',
      'aliases', 'assert', 'assert-eq', 'debug', 'seq', 'keys', 'values',
      'watch', 'confirm', 'choose', 'exec',
      'to-int', 'to-float', 'to-string', 'to-bool',
      'matches', 'match-regex', 'replace-regex', 'split-regex', 'capture-groups', 'grep',
      'email-validate', 'email-send',
      'ssh-exec', 'scp-upload',
      'spawn', 'await', 'parallel',
      'run-tests',
      'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'bold', 'dim', 'underline',
    ),

    // Arguments
    argument: $ => choice(
      $.flag,
      $.primary_expression,
    ),

    flag: $ => choice(
      /--[a-zA-Z][a-zA-Z0-9-]*/,
      /-[a-zA-Z]/,
    ),

    // Identifier
    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_-]*/,
  },
});
