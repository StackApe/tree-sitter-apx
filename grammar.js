/**
 * Tree-sitter grammar for ApX (APEX Command Language)
 * @see docs/ApX_SPEC.md for language specification
 * @version 0.3.54 - Sync with ApXript v0.3.54
 *
 * Changes from 0.3.50:
 * - Scientific notation for numbers (1e6, 2.5e-3)
 * - Record pattern matching in match expressions
 * - New commands: left, right, rename, spawn, zip-lists
 * - Record-style object construction: Dog { name: "Rex" }
 */

const PREC = {
  COMMAND: 1,
  PIPE: 2,
  APPEND_PIPE: 2,    // |>
  NULL_PIPE: 2,      // |?
  ERROR_PIPE: 2,     // |!
  NULL_COALESCE: 3,  // ??
  OR: 4,
  AND: 5,
  COMPARE: 6,
  ADD: 7,
  MULT: 8,
  UNARY: 9,
  CALL: 10,
  MEMBER: 11,
};

module.exports = grammar({
  name: 'apx',

  extras: $ => [
    /[ \t\r]/,  // whitespace excluding newlines (newlines are statement terminators)
    $.comment,
  ],

  conflicts: $ => [
    [$.command_expression],
    [$.pipe_continuation],
    [$.record, $.closure, $.block],
    [$.closure, $.block],
    [$.flag_with_value, $.flag],
    [$.lambda_parameter, $.typed_parameter],
    [$.closure_parameters, $.lambda],
    [$.range, $.brace_expansion],
  ],

  word: $ => $.identifier,

  rules: {
    // Entry point - statements separated by newlines or semicolons
    source_file: $ => seq(
      repeat($._line_ending),
      optional(seq(
        $._statement,
        repeat(seq(repeat1($._line_ending), $._statement)),
        repeat($._line_ending),
      )),
    ),

    // Newline or semicolon as statement terminator
    _line_ending: $ => /[\n;]/,

    _statement: $ => choice(
      $.assignment,
      $.variable_assignment,
      $.compound_assignment,
      $.if_statement,
      $.for_statement,
      $.while_statement,
      $.loop_statement,
      $.match_statement,
      $.decorated_definition,
      $.function_definition,
      $.macro_definition,
      $.alias_definition,
      $.try_statement,
      $.test_definition,
      $.enum_definition,
      $.object_definition,
      $.import_statement,
      $.source_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $._expression,
    ),

    // Comments - single line (#) and multi-line (### ... ###)
    comment: $ => choice(
      $.line_comment,
      $.block_comment,
    ),

    // Single line comment: # to end of line (but not ### which starts block)
    line_comment: $ => token(prec(1, seq('#', optional(choice(
      seq(/[^#\n]/, /.*/),  // # followed by non-# then anything
      seq('#', /[^#]/, /.*/),  // ## followed by non-# then anything
    ))))),

    // Multi-line block comment: ### ... ###
    block_comment: $ => token(prec(2, seq(
      '###',
      repeat(choice(
        /[^#]+/,           // any non-# characters
        /#[^#]/,           // single # not followed by #
        /##[^#]/,          // double ## not followed by #
      )),
      '###'
    ))),

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

    // Pipeline - the core of ApX (includes |>, |?, |!)
    pipeline: $ => prec.left(PREC.PIPE, seq(
      $._non_pipe_expression,
      repeat1(seq(choice('|', '|>', '|?', '|!'), $._non_pipe_expression)),
    )),

    primary_expression: $ => choice(
      $.number,
      $.string,
      $.boolean,
      $.null,
      $.field_access,
      $.variable,
      $.list,
      $.record,
      $.tuple,
      $.set,
      $.range,
      $.closure,
      $.lambda,
      $.parenthesized_expression,
      $.command_substitution,
      $.input_process_substitution,
      $.output_process_substitution,
      $.brace_expansion,
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    // Binary expressions with precedence
    binary_expression: $ => choice(
      prec.left(PREC.NULL_COALESCE, seq($._non_pipe_expression, '??', $._non_pipe_expression)),
      prec.left(PREC.OR, seq($._non_pipe_expression, choice('or', '||'), $._non_pipe_expression)),
      prec.left(PREC.AND, seq($._non_pipe_expression, choice('and', '&&'), $._non_pipe_expression)),
      prec.left(PREC.COMPARE, seq($._non_pipe_expression, choice('==', '!=', '<', '>', '<=', '>=', '=~', '!~'), $._non_pipe_expression)),
      prec.left(PREC.ADD, seq($._non_pipe_expression, choice('+', '-', '++'), $._non_pipe_expression)),
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
    // Float includes scientific notation: 1.5, 1.5e10, 2e-3, 1E+6
    float: $ => choice(
      /\d+\.\d+([eE][+-]?\d+)?/,   // 1.5, 1.5e10, 1.5E-3
      /\d+[eE][+-]?\d+/,            // 1e6, 2E-3, 1e+10
    ),
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

    // Field access: $var.field or $it.name
    field_access: $ => prec.left(PREC.MEMBER, seq(
      $.variable,
      repeat1(seq('.', $.identifier)),
    )),

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
      repeat($._line_ending),
      optional(seq(
        $._statement,
        repeat(seq(repeat1($._line_ending), $._statement)),
      )),
      repeat($._line_ending),
      '}',
    )),

    closure_parameters: $ => seq(
      '|',
      optional(seq(
        $.typed_parameter,
        repeat(seq(',', $.typed_parameter)),
      )),
      '|',
    ),

    // Lambda syntax: |$x| { $x * 2 } or |$x, $y| { $x + $y }
    lambda: $ => prec(2, seq(
      '|',
      optional(seq(
        $.lambda_parameter,
        repeat(seq(',', $.lambda_parameter)),
      )),
      '|',
      optional(seq('->', $.type_hint)),
      $.block,
    )),

    lambda_parameter: $ => seq(
      $.variable,
      optional(seq(':', $.type_hint)),
    ),

    // Tuple: (1, 2, 3) or tuple [1, 2, 3]
    tuple: $ => choice(
      seq('(', $._expression, ',', $._expression, repeat(seq(',', $._expression)), optional(','), ')'),
      seq('tuple', '[', optional(seq($._expression, repeat(seq(',', $._expression)), optional(','))), ']'),
    ),

    // Set: set[1, 2, 3]
    set: $ => seq('set', '[', optional(seq($._expression, repeat(seq(',', $._expression)), optional(','))), ']'),

    // Command substitution: $(command)
    command_substitution: $ => seq('$(', $._expression, ')'),

    // Input process substitution: <(command)
    input_process_substitution: $ => seq('<(', $._expression, ')'),

    // Output process substitution: >(command)
    output_process_substitution: $ => seq('>(', $._expression, ')'),

    // Brace expansion: {a,b,c} or {1..5}
    brace_expansion: $ => seq(
      '{',
      choice(
        seq($._expression, repeat1(seq(',', $._expression))),  // {a,b,c}
        seq($.integer, '..', $.integer),                        // {1..5}
      ),
      '}',
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
      choice($.variable, $.identifier),
      'in',
      $._expression,
      $.block,
    ),

    while_statement: $ => seq(
      'while',
      $._expression,
      $.block,
    ),

    // Infinite loop: loop { ... }
    loop_statement: $ => seq('loop', $.block),

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
      $.record_pattern,     // { name, age } or { name: $n, age: $a }
      $.typed_record_pattern, // Dog { name, age }
      $.list_pattern,       // [first, second, ...rest]
      $.identifier,
      '_',
    ),

    // Record pattern: { name, age } or { name: $n }
    record_pattern: $ => seq(
      '{',
      optional(seq(
        $.pattern_field,
        repeat(seq(',', $.pattern_field)),
        optional(','),
      )),
      '}',
    ),

    pattern_field: $ => choice(
      $.identifier,                                    // shorthand: { name }
      seq($.identifier, ':', choice($.variable, '_')), // binding: { name: $n }
    ),

    // Typed record pattern: Dog { name, age }
    typed_record_pattern: $ => seq(
      $.identifier,  // Type name
      $.record_pattern,
    ),

    // List pattern: [first, second, ...rest]
    list_pattern: $ => seq(
      '[',
      optional(seq(
        $.list_pattern_element,
        repeat(seq(',', $.list_pattern_element)),
        optional(','),
      )),
      ']',
    ),

    list_pattern_element: $ => choice(
      $.identifier,
      $.variable,
      seq('...', choice($.identifier, $.variable)),  // rest pattern
      '_',
    ),

    block: $ => prec(1, seq(
      '{',
      repeat($._line_ending),
      optional(seq(
        $._statement,
        repeat(seq(repeat1($._line_ending), $._statement)),
      )),
      repeat($._line_ending),
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

    // Decorated definitions (function or test with @decorator)
    decorated_definition: $ => seq(
      repeat1($.decorator),
      choice($.function_definition, $.test_definition),
    ),

    // Decorator: @name or @name "arg" or @name n
    decorator: $ => seq(
      '@',
      $.identifier,
      optional(choice($.string, $.number)),
    ),

    // Function definition with optional type hints
    function_definition: $ => seq(
      'fn',
      $.identifier,
      $.parameter_list,
      optional(seq('->', $.type_hint)),
      $.block,
    ),

    // Type hints: int, float, string, bool, list, record, etc.
    type_hint: $ => choice(
      seq($.type_name, '?'),  // Optional type: int?
      $.type_name,
    ),

    type_name: $ => choice(
      'int', 'float', 'number', 'string', 'bool', 'list', 'record',
      'tuple', 'set', 'closure', 'path', 'duration', 'filesize',
      'task', 'enum', 'any', 'null',
    ),

    parameter_list: $ => seq(
      '(',
      optional(seq(
        $.parameter,
        repeat(seq(',', $.parameter)),
      )),
      ')',
    ),

    // Parameter with optional type hint and default value
    parameter: $ => seq(
      choice($.variable, $.identifier),
      optional(seq(':', $.type_hint)),
      optional(seq('=', $._expression)),
    ),

    // Typed parameter for closures
    typed_parameter: $ => seq(
      choice($.variable, $.identifier),
      optional(seq(':', $.type_hint)),
    ),

    // Macro definition - supports both styles:
    // macro name($a, $b) { } - parenthesized
    // macro name $a $b { }   - shell-style
    macro_definition: $ => seq(
      'macro',
      $.identifier,
      choice(
        $.parameter_list,                    // (param, param)
        repeat($.variable),                  // $a $b $c (shell-style)
      ),
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

    // Enum definition: enum Status { pending, active, done }
    enum_definition: $ => seq(
      'enum',
      $.identifier,
      '{',
      optional(seq(
        $.identifier,
        repeat(seq(',', $.identifier)),
        optional(','),
      )),
      '}',
    ),

    // Object definition: obj Name { field1, field2, ... }
    object_definition: $ => seq(
      'obj',
      $.identifier,
      '{',
      optional(seq(
        $.object_field,
        repeat(seq(',', $.object_field)),
        optional(','),
      )),
      '}',
    ),

    object_field: $ => choice(
      // Regular field
      $.identifier,
      // Method definition
      seq('fn', $.identifier, $.parameter_list, $.block),
    ),

    // Import statement
    import_statement: $ => choice(
      seq('use', choice($.module_path, $.string)),
      seq('from', choice($.module_path, $.string), 'import', $.import_list),
    ),

    // Source statement: source "file" or source "file" as namespace
    source_statement: $ => seq(
      'source',
      $.string,
      optional(seq('as', $.identifier)),
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

    // Assignment with keyword (let, const, set)
    assignment: $ => seq(
      choice('let', 'const', 'set'),
      $.identifier,
      '=',
      $._expression,
    ),

    // Bare variable assignment: $var = value
    variable_assignment: $ => prec.right(seq(
      $.variable,
      '=',
      $._expression,
    )),

    // Compound assignment: $var += 1, $var -= 2, etc.
    compound_assignment: $ => prec.right(seq(
      $.variable,
      choice('+=', '-=', '*=', '/=', '%='),
      $._expression,
    )),

    // Command expression - handles commands and command pipelines
    // Integrates pipe handling to avoid conflicts with pipeline rule
    command_expression: $ => prec.left(PREC.COMMAND, seq(
      $.command_name,
      repeat($.argument),
      optional($.pipe_continuation),
    )),

    // Pipe continuation for command pipelines: | cmd args | cmd args ...
    pipe_continuation: $ => prec.left(PREC.PIPE, repeat1(seq(
      choice('|', '|>', '|?', '|!'),
      $.command_name,
      repeat($.argument),
    ))),

    // Command names - built-in commands get special highlighting
    command_name: $ => choice(
      $.builtin_command,
      $.method_call,
      $.identifier,
    ),

    // Method-style calls: ai.ask, git.status, etc.
    method_call: $ => seq(
      $.identifier,
      '.',
      $.identifier,
    ),

    // All built-in commands - synced with ApXript v0.3.54
    builtin_command: $ => choice(
      // I/O Commands
      'echo', 'print', 'pwd', 'cd', 'cat', 'read', 'input', 'run',
      // File Operations
      'touch', 'cp', 'mv', 'rm', 'ls', 'll', 'mkdir', 'ln', 'symlink',
      'chmod', 'chown', 'chgrp', 'umask', 'home', 'rename',  // v0.3.53
      'exists', 'file-info', 'file-size', 'file-type', 'file-test',
      'write', 'append-file', 'read-bytes', 'write-bytes',
      'is-file', 'is-dir', 'is-symlink', 'glob', 'walk', 'tree',
      'basename', 'dirname', 'realpath', 'readlink',
      // List Operations
      'count', 'length', 'len', 'first', 'last', 'take', 'skip', 'get', 'head', 'tail',
      'reverse', 'append', 'prepend', 'flatten', 'uniq', 'unique', 'sum', 'avg',
      'min', 'max', 'range', 'enumerate', 'compact', 'zip', 'zip-record', 'zip-lists',
      'chunks', 'window', 'pair', 'insert-at', 'remove-at', 'has',
      'left', 'right',  // v0.3.52: take/drop from left/right of list
      // Pipeline Filters
      'where', 'each', 'select', 'sort', 'sort-by', 'group-by',
      'any', 'all', 'none', 'filter', 'map', 'find', 'reject',
      'mapfile', 'tee', 'cut',
      // String Operations
      'upper', 'lower', 'trim', 'split', 'join', 'replace', 'lines',
      'contains', 'starts-with', 'ends-with', 'empty',
      'chars', 'char-at', 'slice', 'index-of',
      'pad-left', 'pad-right', 'str-pad-left', 'str-pad-right',
      'repeat', 'capitalize', 'title-case',
      'str', 'str-distance', 'byte-len', 'bytes', 'bytes-at', 'bytes-slice',
      'bytes-find', 'bytes-replace', 'bytes-concat', 'brace-expand',
      'wc', 'tr', 'diff',
      // Math Commands
      'abs', 'round', 'ceil', 'floor', 'pow', 'sqrt',
      'sin', 'cos', 'tan', 'log', 'exp',
      'clamp', 'lerp', 'distance', 'angle', 'deg-to-rad', 'rad-to-deg',
      // Bitwise Operations
      'band', 'bor', 'bxor', 'bnot', 'shl', 'shr', 'bshl', 'bshr', 'brol', 'bror',
      // Colors & Formatting
      'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'bold', 'dim', 'underline',
      'italic', 'blink', 'strike', 'normal-mode', 'reverse-video',
      'bg-black', 'bg-blue', 'bg-cyan', 'bg-green', 'bg-magenta',
      'bg-red', 'bg-rgb', 'bg-white', 'bg-yellow',
      'rgb', 'color', 'hex', 'ansi-test',
      // Data Formats
      'parse-json', 'from-json', 'to-json',
      'parse-yaml', 'to-yaml',
      'parse-toml', 'to-toml',
      'parse-csv', 'to-csv',
      'from-html', 'to-html', 'to-md',
      'from-ini', 'parse-ini', 'to-ini',
      'from-msgpack', 'to-msgpack',
      'from-ssv', 'from-table', 'to-table',
      'table', 'table-columns', 'table-rows', 'table-print',
      // Date/Time
      'now', 'now-ms', 'timestamp', 'date', 'parse-date', 'format-date',
      'date-add', 'date-diff', 'date-parse', 'seq-date',
      'from-timestamp', 'to-timestamp', 'to-timezone', 'timezones', 'cal',
      'duration-ms', 'duration-ns', 'duration-secs', 'to-duration', 'elapsed',
      // Filesize
      'filesize-bytes', 'filesize-kb', 'filesize-mb', 'to-filesize',
      // Git Commands
      'git-status', 'git-log', 'git-branch', 'git-diff',
      'git-add', 'git-commit', 'git-push', 'git-pull',
      // Crypto & Hashing
      'hash-file', 'hash-id',
      'caesar', 'xor', 'rot13',
      'aes-encrypt', 'aes-decrypt', 'jwt-decode',
      'password-gen', 'entropy', 'random-bytes', 'uuid',
      // Encoding
      'hex-encode', 'hex-decode', 'hex-dump',
      'url-encode', 'url-decode', 'url-parse', 'url-join',
      // Network Commands
      'dns-lookup', 'ptr-lookup', 'whois', 'port-scan',
      'ip-addr', 'ping', 'netstat', 'ip-route', 'ip-link', 'traceroute', 'arp',
      'headers', 'recon', 'robots',
      // HTTP Commands
      'http-get', 'http-post', 'http-put', 'http-delete', 'http-patch',
      'http-head', 'http-options', 'http-request', 'http-serve',
      'download', 'fetch', 'serve',
      // WiFi Commands
      'wifi-scan', 'wifi-status', 'wifi-connect', 'wifi-disconnect',
      'wifi-saved', 'wifi-forget',
      // Bluetooth Commands
      'bt-status', 'bt-devices', 'bt-scan', 'bt-connect', 'bt-disconnect',
      'bt-pair', 'bt-power', 'bt-remove',
      // Firewall Commands
      'firewall-status', 'firewall-rules', 'firewall-allow', 'firewall-deny',
      // Binary Analysis
      'strings', 'binary-info', 'parse-elf', 'parse-pe', 'symbols', 'disassemble',
      'analyze', 'detect-encoding', 'decode-auto',
      // WebSocket
      'ws-connect', 'ws-echo',
      // Database - SQLite
      'sqlite-create', 'sqlite-exec', 'sqlite-query', 'sqlite-tables', 'sqlite-schema',
      // Storage Commands
      'stor-create', 'stor-insert', 'stor-get', 'stor-delete', 'stor-list', 'stor-clear',
      // Archive
      'zip', 'unzip',
      // Notifications
      'notify', 'notify-urgent', 'notify-progress', 'alert',
      // Audio
      'audio-play', 'audio-beep', 'audio-volume', 'beep',
      // QR Code
      'qr-encode', 'qr-save',
      // Email
      'email-validate', 'email-send',
      // SSH/SCP
      'ssh-exec', 'scp-upload',
      // PDF
      'pdf-create', 'pdf-text',
      // Markdown
      'md-to-html', 'md-parse', 'md-strip',
      // Screenshots & Display
      'monitors', 'screenshot', 'screenshot-region', 'screenshot-window', 'windows',
      'screen-size',
      // System Monitoring
      'sys-info', 'mem-info', 'cpu-info', 'disk-info', 'processes', 'loadavg', 'uptime',
      'launch', 'hostname', 'os', 'which', 'env', 'set-env', 'unsetenv',
      'spawn', 'spawn-process', 'kill-process', 'process-list',  // spawn added
      'term', 'term-size',
      // Cursor & Terminal
      'cursor-hide', 'cursor-show', 'cursor-move', 'raw-mode',
      // Canvas/Image (WASM)
      'canvas-circle', 'canvas-clear', 'canvas-fill', 'canvas-line',
      'canvas-rect', 'canvas-resize', 'canvas-size', 'canvas-text',
      'canvas-image', 'canvas-sprite', 'canvas-save', 'canvas-restore',
      'canvas-rotate', 'canvas-scale', 'canvas-translate', 'canvas-alpha',
      'canvas-mouse',
      // Collision Detection (WASM)
      'collide-rect', 'collide-point', 'collide-circle',
      // Regex Commands
      'matches', 'match-regex', 'replace-regex', 'split-regex', 'capture-groups', 'grep',
      // Type Conversion
      'to-int', 'to-float', 'to-string', 'to-bool',
      // Type Predicates
      'is-int', 'is-float', 'is-number', 'is-string', 'is-bool', 'is-list',
      'is-record', 'is-null', 'is-closure', 'is-path', 'is-tuple', 'is-set',
      'is-enum', 'is-task', 'is-duration', 'is-filesize', 'is-empty',
      'is-table', 'is-terminal', 'is-defined',
      // Set Operations
      'set-add', 'set-contains', 'set-diff', 'set-intersect',
      'set-remove', 'set-to-list', 'set-union',
      // Tuple Operations (tuple literal handled by tuple rule)
      'tuple-get', 'tuple-to-list',
      // Functional Commands
      'transpose',
      // Utility Commands
      'help', 'version', 'type', 'typeof', 'sleep', 'random', 'clear',
      'aliases', 'assert', 'debug', 'describe', 'inspect',
      'seq', 'seq-char', 'keys', 'values',
      'watch', 'confirm', 'choose', 'exec',
      'validate', 'getopts', 'sudo',
      'btw', 'progress', 'prompt', 'project', 'explore', 'theme',
      // Clipboard & Browser
      'clipboard-read', 'clipboard-write', 'browser-open', 'browser-confirm',
      // Panel Control (APEX GUI)
      'open', 'close', 'toggle', 'focus', 'hsplit', 'vsplit', 'edit', 'panels',
      // Timer/Async Commands
      'after', 'every', 'timeout', 'elapsed', 'timeit',
      // Session/Local Storage (WASM)
      'session-get', 'session-set', 'local-get', 'local-set', 'local-remove',
      // Location/Navigation (WASM)
      'location', 'location-hash', 'location-host', 'location-path', 'location-search',
      'navigate', 'reload', 'history-back', 'history-forward', 'history-search',
      // DOM Manipulation (WASM)
      'dom-get', 'dom-set', 'dom-query', 'dom-create', 'dom-remove',
      'dom-attr', 'dom-style', 'dom-html', 'dom-class-add', 'dom-class-remove',
      // Input/Keyboard (WASM)
      'input-value', 'input-set', 'input-focus', 'input-checked', 'input-listen',
      'key-wait', 'key-down', 'key-pressed', 'key-available', 'read-key', 'read-char',
      // Mouse (WASM)
      'mouse-pos', 'mouse-x', 'mouse-y', 'mouse-down',
      // Scroll (WASM)
      'scroll-to', 'scroll-by',
      // Console (WASM)
      'console-log', 'error', 'printf',
      // Note: 'set' literal handled by set rule, 'tuple' by tuple rule
    ),

    // Arguments - includes bare identifiers for commands like "sort-by name"
    argument: $ => choice(
      $.flag_with_value,
      $.flag,
      $.primary_expression,
      $.path_argument,
      $.identifier,
    ),

    // Path arguments for cd, etc: .., ., /path/to/file, dir/subdir
    path_argument: $ => token(choice(
      '..',
      '.',
      /\/[a-zA-Z0-9_.\/-]*/,           // absolute path: /home/user
      /[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.\/-]*/,  // relative path: dir/subdir
    )),

    // Flag with space-separated value: --limit 5, --file "path"
    flag_with_value: $ => prec.right(2, seq(
      $.long_flag,
      choice($.number, $.string, $.identifier),
    )),

    flag: $ => choice(
      $.long_flag,
      $.short_flag,
    ),

    // Long flags: --all, --limit, --limit=5
    long_flag: $ => seq(
      /--[a-zA-Z][a-zA-Z0-9-]*/,
      optional(seq('=', choice($.number, $.string, $.identifier))),
    ),

    // Short flags: -l, -la, -rf (multiple letters allowed)
    short_flag: $ => /-[a-zA-Z]+/,

    // Identifier
    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_-]*/,
  },
});
