# tree-sitter-apx

Tree-sitter grammar for ApX (APEX Command Language).

## Features

- Full ApX syntax support
- 200+ built-in commands
- Highlight queries for Neovim
- Scope tracking for go-to-definition

## Installation

### Neovim (nvim-treesitter)

Add to your parser config:

```lua
local parser_config = require("nvim-treesitter.parsers").get_parser_configs()

parser_config.apx = {
  install_info = {
    url = "https://github.com/apex-pde/tree-sitter-apx",
    files = { "src/parser.c" },
    branch = "main",
  },
  filetype = "apx",
}
```

Then run:

```vim
:TSInstall apx
```

### Building Locally

```bash
npm install
npm run build
npm test
```

## Supported Syntax

- Variables: `$name`, `$env.HOME`, `$it`, `$_`
- Strings: `"double"`, `'single'`, `"""triple"""`, `r"raw"`
- Numbers: `42`, `3.14`, `0xff`, `0b1010`, `0o777`
- Lists: `[1, 2, 3]`
- Records: `{name: "value"}`
- Pipelines: `data | where | select`
- Control flow: `if`, `for`, `while`, `match`
- Functions: `fn name(args) { }`
- Macros: `macro name { }`
- Error handling: `try { } catch { }`
- Async: `spawn`, `await`, `parallel`
- 200+ built-in commands

## Query Files

- `queries/highlights.scm` - Syntax highlighting
- `queries/locals.scm` - Scope tracking

## License

MIT
