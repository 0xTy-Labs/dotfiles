#!/bin/bash

# Installation script for AppImage Manager

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}AppImage Manager Installation${NC}"
echo ""

# Check if script exists
if [ ! -f "appimage-manager.sh" ]; then
    echo -e "${RED}Error: appimage-manager.sh not found in current directory${NC}"
    exit 1
fi

# Make executable
chmod +x appimage-manager.sh

# Create bash_aliases if it doesn't exist
if [ ! -f "$HOME/.bash_aliases" ]; then
    echo -e "${BLUE}Creating ~/.bash_aliases${NC}"
    touch "$HOME/.bash_aliases"
fi

# Create zsh_aliases if it doesn't exist
if [ ! -f "$HOME/.zsh_aliases" ]; then
    echo -e "${BLUE}Creating ~/.zsh_aliases${NC}"
    touch "$HOME/.zsh_aliases"
fi

# Check if bash_aliases is sourced in bashrc
if [ -f "$HOME/.bashrc" ]; then
    if ! grep -q "\.bash_aliases" "$HOME/.bashrc" 2>/dev/null; then
        echo -e "${BLUE}Adding bash_aliases to ~/.bashrc${NC}"
        cat >> "$HOME/.bashrc" << 'EOF'

# Load bash aliases
if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi
EOF
    fi
fi

# Check if zsh_aliases is sourced in zshrc
if [ -f "$HOME/.zshrc" ]; then
    if ! grep -q "\.zsh_aliases" "$HOME/.zshrc" 2>/dev/null; then
        echo -e "${BLUE}Adding zsh_aliases to ~/.zshrc${NC}"
        cat >> "$HOME/.zshrc" << 'EOF'

# Load zsh aliases
if [ -f ~/.zsh_aliases ]; then
    . ~/.zsh_aliases
fi
EOF
    fi
elif [ -n "$ZSH_VERSION" ]; then
    # We're running in zsh but no .zshrc exists
    echo -e "${BLUE}Creating ~/.zshrc and adding zsh_aliases${NC}"
    cat > "$HOME/.zshrc" << 'EOF'
# Load zsh aliases
if [ -f ~/.zsh_aliases ]; then
    . ~/.zsh_aliases
fi
EOF
fi

# Create directories
mkdir -p "$HOME/.local/share/appimages"
mkdir -p "$HOME/.local/share/applications"
mkdir -p "$HOME/.local/share/icons/appimages"

echo -e "${GREEN}✓ Installation complete!${NC}"
echo ""
echo "Configured for:"
if [ -f "$HOME/.bashrc" ]; then
    echo "  ✓ Bash (via ~/.bash_aliases)"
fi
if [ -f "$HOME/.zshrc" ]; then
    echo "  ✓ Zsh (via ~/.zsh_aliases)"
fi
echo ""
echo "You can now use the script with:"
echo "  ./appimage-manager.sh add <appimage-path> <alias-name>"
echo ""
echo "Or install it globally (optional):"
echo "  sudo cp appimage-manager.sh /usr/local/bin/appimage-manager"
echo "  sudo chmod +x /usr/local/bin/appimage-manager"
echo ""
if [ -f "$HOME/.bashrc" ]; then
    echo -e "${YELLOW}Bash users: Restart your terminal or run 'source ~/.bashrc'${NC}"
fi
if [ -f "$HOME/.zshrc" ]; then
    echo -e "${YELLOW}Zsh users: Restart your terminal or run 'source ~/.zshrc'${NC}"
fi
