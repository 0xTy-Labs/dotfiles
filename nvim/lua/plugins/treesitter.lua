require'nvim-treesitter.configs'.setup {
	ensure_installed = { "bash", "c", "vimdoc", "json", "lua", "markdown", "markdown_inline", "python", "rust", "tsx", "typescript","query" },
	auto_install = true ,
    
    highlight = {
		enable = true, -- Enable to run syntax and tree-sitter together 
                       --(may impact performance or cause duplicate highlights).

		additional_vim_regex_highlighting = true,
	},
	incremental_selection = {
		enable = true,
		keymaps = {
		init_selection = "<Leader>ss", -- selection start
		node_incremental = "<Leader>si", -- selection increment
		scope_incremental = "<Leader>sc", -- select scope
		node_decremental = "<Leader>sd", -- selection decrement
		},
	},
	textobjects = {
    select = {
      enable = true,
      lookahead = true,

      keymaps = {
        ["af"] = "@function.outer",
        ["if"] = "@function.inner",
        ["ac"] = "@class.outer",

        ["ic"] = { query = "@class.inner", desc = "Select inner part of a class region" },
     
        ["as"] = { query = "@local.scope", query_group = "locals", desc = "Select language scope" },
      },

      selection_modes = {
        ['@parameter.outer'] = 'v', -- charwise
        ['@function.outer'] = 'v', -- charwise 'V' = linewise
        ['@class.outer'] = '<c-v>', -- blockwise
      },
      include_surrounding_whitespace = true,
    },
  },
}