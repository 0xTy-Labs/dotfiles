-- auto install vim-plug and plugins, if not found

-- local data_dir = vim.fn.stdpath('data')
-- if vim.fn.empty(vim.fn.glob(data_dir .. '/site/autoload/plug.vim')) == 1 then
-- 	vim.cmd('silent !curl -fLo ' .. data_dir .. '/site/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim')
-- 	vim.o.runtimepath = vim.o.runtimepath
-- 	vim.cmd('autocmd VimEnter * PlugInstall --sync | source $MYVIMRC')
-- end


local vim = vim
local Plug = vim.fn['plug#']
vim.g.start_time = vim.fn.reltime()

vim.loader.enable() --  Flash 
vim.call('plug#begin')

Plug('nvim-lualine/lualine.nvim') --statusline
Plug('nvim-tree/nvim-web-devicons') --pretty icons
Plug('folke/which-key.nvim') --mappings popup
Plug('romgrk/barbar.nvim') --bufferline
Plug('goolord/alpha-nvim') --pretty startup
Plug('nvim-treesitter/nvim-treesitter') --improved syntax
Plug('nvim-treesitter/nvim-treesitter-textobjects') --treesiter text objects
Plug('mfussenegger/nvim-lint') --async linter
Plug('nvim-tree/nvim-tree.lua') --file explorer
Plug('windwp/nvim-autopairs') --autopairs 
Plug('lewis6991/gitsigns.nvim') --git
Plug('numToStr/Comment.nvim') --easier comments
Plug('norcalli/nvim-colorizer.lua') --color highlight
Plug('ibhagwan/fzf-lua') --fuzzy finder and grep
Plug('numToStr/FTerm.nvim') --floating terminal
Plug('ron-rs/ron.vim') --ron syntax highlighting
Plug('MeanderingProgrammer/render-markdown.nvim') --render md inline
Plug('emmanueltouzery/decisive.nvim') --view csv files
Plug('folke/twilight.nvim') --surrounding dim
Plug('craftzdog/solarized-osaka.nvim') --solarized colorscheme
vim.call('plug#end')
