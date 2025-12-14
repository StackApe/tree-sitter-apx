# tree-sitter-apx

Tree-sitter grammar for [ApX](https://github.com/StackApe/apex-pde), the command-oriented scripting language for the APEX Personal Development Environment.

## Features

- Full ApX syntax support
- 200+ built-in commands
- Highlight queries for Neovim
- Scope tracking for go-to-definition

## Neovim Installation

### 1. Register the parser

Add this to your nvim-treesitter config. If using lazy.nvim:

```lua
-- ~/.config/nvim/lua/plugins/treesitter.lua
return {
  "nvim-treesitter/nvim-treesitter",
  build = ":TSUpdate",
  opts = {
    highlight = { enable = true },
    indent = { enable = true },
  },
  config = function(_, opts)
    -- Register ApX parser (not yet in nvim-treesitter registry)
    local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
    parser_config.apx = {
      install_info = {
        url = "https://github.com/StackApe/tree-sitter-apx",
        files = { "src/parser.c" },
        branch = "main",
      },
      filetype = "apx",
    }

    require("nvim-treesitter.configs").setup(opts)
  end,
}
```

Or add to an existing treesitter config:

```lua
local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
parser_config.apx = {
  install_info = {
    url = "https://github.com/StackApe/tree-sitter-apx",
    files = { "src/parser.c" },
    branch = "main",
  },
  filetype = "apx",
}
```

### 2. Install the parser

```vim
:TSInstall apx
```

### 3. Set up filetype detection

Add to `~/.config/nvim/ftdetect/apx.lua`:

```lua
vim.filetype.add({
  extension = {
    apx = "apx",
  },
})
```

### 4. Copy query files

Copy the query files to your Neovim runtime:

```bash
mkdir -p ~/.config/nvim/queries/apx
cp queries/highlights.scm ~/.config/nvim/queries/apx/
cp queries/locals.scm ~/.config/nvim/queries/apx/
```

Or clone and copy:

```bash
git clone https://github.com/StackApe/tree-sitter-apx /tmp/tree-sitter-apx
mkdir -p ~/.config/nvim/queries/apx
cp /tmp/tree-sitter-apx/queries/*.scm ~/.config/nvim/queries/apx/
```

### 5. Verify installation

Open a `.apx` file and run:

```vim
:InspectTree
```

You should see the parsed AST. Syntax highlighting should work automatically.

## Building Locally

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
