; ApX Tree-sitter highlight queries for Neovim

; Comments (single-line and multi-line block comments)
(comment) @comment
(line_comment) @comment
(block_comment) @comment

; Strings
(double_string) @string
(single_string) @string
(triple_string) @string
(raw_string) @string
(backtick_string) @string

; Numbers
(integer) @number
(float) @number.float
(hex_number) @number
(binary_number) @number
(octal_number) @number

; Booleans and null
(boolean) @boolean
(null) @constant.builtin

; Variables
(regular_variable) @variable
(env_variable) @variable.builtin
(special_variable) @variable.builtin

; Field access: $var.field
(field_access
  (identifier) @property)

; Method calls: ai.ask
(method_call
  (identifier) @function.call)

; Keywords - Control flow (using actual grammar keywords)
"if" @keyword.control
"else" @keyword.control
"elif" @keyword.control
"for" @keyword.control
"while" @keyword.control
"loop" @keyword.control
"in" @keyword.control
"match" @keyword.control
"return" @keyword.control

; Break and continue are statement nodes
(break_statement) @keyword.control
(continue_statement) @keyword.control

; Keywords - Definition
"fn" @keyword.function
"macro" @keyword.function
"alias" @keyword.function
"let" @keyword.function
"const" @keyword.function
"set" @keyword.function
"obj" @keyword.type
"enum" @keyword.type

; Keywords - Error handling
"try" @keyword.exception
"catch" @keyword.exception

; Keywords - Modules
"use" @keyword.import
"from" @keyword.import
"import" @keyword.import
"as" @keyword.import

; Keywords - Testing
"test" @keyword

; Keywords - Logical
"and" @keyword.operator
"or" @keyword.operator
"not" @keyword.operator

; Operators
[
  "+"
  "-"
  "*"
  "/"
  "%"
  "=="
  "!="
  "<"
  ">"
  "<="
  ">="
  "&&"
  "||"
  "!"
  "="
  "|"
  ".."
  "..="
  "=>"
] @operator

; Punctuation
[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  ","
  ":"
  "::"
] @punctuation.delimiter

; Function definition - identifier after 'fn'
(function_definition
  (identifier) @function.definition)

; Macro definition - identifier after 'macro'
(macro_definition
  (identifier) @function.macro)

; Alias definition - identifier after 'alias'
(alias_definition
  (identifier) @function)

; Test definition
(test_definition
  (string) @string.special)

; Object definition
(object_definition
  (identifier) @type.definition)

; Enum definition
(enum_definition
  (identifier) @type.definition)

; Function parameters
(parameter
  (identifier) @variable.parameter)

; Record fields
(record_field
  (identifier) @property)

; Import
(import_item
  (identifier) @namespace)

; Flags
(long_flag) @attribute
(short_flag) @attribute

; Built-in commands
(builtin_command) @function.builtin

; User-defined command calls
(command_expression
  (command_name
    (identifier) @function.call))

; Match patterns
(record_pattern
  (pattern_field
    (identifier) @property))

(typed_record_pattern
  (identifier) @type)  ; Type name in pattern

(list_pattern
  (list_pattern_element
    (identifier) @variable))

; Wildcard pattern
"_" @constant.builtin

; Match arms
(match_arm
  (_) @constant)

; Range
(range) @constant
