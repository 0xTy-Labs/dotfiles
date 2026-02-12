local alpha = require('alpha')
local dashboard = require("alpha.themes.dashboard")
dashboard.section.header.val = {

[[  _______          _________          _        _______  ______   _______   ]],
[[ (  __   )|\     /|\__   __/|\     /|( \      (  ___  )(  ___ \ (  ____ \ ]],
[[ | (  )  |( \   / )   ) (   ( \   / )| (      | (   ) || (   ) )| (    \/ ]],
[[ | | /   | \ (_) /    | |    \ (_) / | |      | (___) || (__/ / | (_____  ]],
[[ | (/ /) |  ) _ (     | |     \   /  | |      |  ___  ||  __ (  (_____  ) ]],
[[ |   / | | / ( ) \    | |      ) (   | |      | (   ) || (  \ \       ) | ]],
[[ |  (__) |( /   \ )   | |      | |   | (____/\| )   ( || )___) )/\____) | ]],
[[ (_______)|/     \|   )_(      \_/   (_______/|/     \||/ \___/ \_______) ]],
                                                                        
}

dashboard.section.buttons.val = {
	dashboard.button("e", "  New file", ":ene <BAR> startinsert <CR>"),
	dashboard.button("f", "󰍉  Find file", ":lua require('fzf-lua').files() <CR>"),
	dashboard.button("t", "  Browse cwd", ":NvimTreeOpen<CR>"),
	dashboard.button("r", "  Browse src", ":e ~/.local/src/<CR>"),
	dashboard.button("s", "󰯂  Browse scripts", ":e ~/scripts/<CR>"),
	dashboard.button("c", "  Config", ":e ~/.config/nvim/<CR>"),
	dashboard.button("m", "  Mappings", ":e ~/.config/nvim/lua/config/mappings.lua<CR>"),
	dashboard.button("p", "  Plugins", ":PlugInstall<CR>"),
	dashboard.button("q", "󰅙  Quit", ":q!<CR>"),
}

dashboard.section.footer.val = function()
  return vim.g.startup_time_ms or "[[ Tyler Mwalo ]]"
end

dashboard.section.buttons.opts.hl = "Keyword"
dashboard.opts.opts.noautocmd = true
alpha.setup(dashboard.opts)
