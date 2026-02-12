-- 0xTyLabs neovim config

-- Inspired By;

--Bread @https://github.com/BreadOnPenguins  
--Takuya Matsuyama @https://github.com/craftzdog
--Mariusz @https://github.com/vhyrro

-- vimplug setup
local data_dir = vim.fn.stdpath('data')
if vim.fn.empty(vim.fn.glob(data_dir .. '/site/autoload/plug.vim')) == 1 then
	vim.cmd('silent !curl -fLo ' .. data_dir .. '/site/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim')
	vim.o.runtimepath = vim.o.runtimepath
	vim.cmd('autocmd VimEnter * PlugInstall --sync | source $MYVIMRC')
end

-- init plugins 
require ("settings.plugins")

-- init Dashboard
require ("settings.alpha")

-- init personalized options
require ("settings.options")

--colorscheme
require ("settings.colorscheme")
 
-- Init Editor Behavior 
require ("settings.autocmd")

-- Plugin settings
require ("plugins.treesitter")
