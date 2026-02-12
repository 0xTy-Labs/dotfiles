#!/bin/bash

# AppImage Manager - Manage AppImage files with aliases and desktop integration
# Usage: ./appimage-manager.sh [add|remove|list] [appimage-path] [alias-name]

set -e

# Configuration
APPIMAGE_DIR="$HOME/.local/share/appimages"
DESKTOP_DIR="$HOME/.local/share/applications"
BASH_ALIAS_FILE="$HOME/.bash_aliases"
ZSH_ALIAS_FILE="$HOME/.zsh_aliases"
ICONS_DIR="$HOME/.local/share/icons/appimages"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p "$APPIMAGE_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICONS_DIR"

# Function to display usage
show_usage() {
    echo "AppImage Manager - Manage AppImage files with aliases and desktop integration"
    echo ""
    echo "Usage:"
    echo "  $0 add <appimage-path> <alias-name>    Add an AppImage"
    echo "  $0 remove <alias-name>                 Remove an AppImage"
    echo "  $0 list                                List all managed AppImages"
    echo ""
    echo "Examples:"
    echo "  $0 add ~/Downloads/MyApp.AppImage myapp"
    echo "  $0 remove myapp"
    echo "  $0 list"
}

# Function to extract icon from AppImage
extract_icon() {
    local appimage_path="$1"
    local alias_name="$2"
    local icon_path="$ICONS_DIR/${alias_name}.png"
    
    # Try to extract icon using --appimage-extract (if supported)
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    
    # Extract .DirIcon or icon files
    "$appimage_path" --appimage-extract ".DirIcon" 2>/dev/null || true
    "$appimage_path" --appimage-extract "*.png" 2>/dev/null || true
    "$appimage_path" --appimage-extract "usr/share/icons/hicolor/*/apps/*.png" 2>/dev/null || true
    
    # Find the best icon
    local found_icon=""
    if [ -f "squashfs-root/.DirIcon" ]; then
        found_icon="squashfs-root/.DirIcon"
    else
        # Find largest PNG icon
        found_icon=$(find squashfs-root -name "*.png" -type f 2>/dev/null | head -n 1)
    fi
    
    if [ -n "$found_icon" ] && [ -f "$found_icon" ]; then
        cp "$found_icon" "$icon_path"
        echo "$icon_path"
    else
        # Fallback to generic icon
        echo "application-x-executable"
    fi
    
    cd - > /dev/null
    rm -rf "$temp_dir"
}

# Function to get AppImage name
get_appimage_name() {
    local appimage_path="$1"
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    
    "$appimage_path" --appimage-extract "*.desktop" 2>/dev/null || true
    
    local desktop_file=$(find squashfs-root -name "*.desktop" -type f 2>/dev/null | head -n 1)
    local app_name=""
    
    if [ -n "$desktop_file" ] && [ -f "$desktop_file" ]; then
        app_name=$(grep "^Name=" "$desktop_file" | head -n 1 | cut -d'=' -f2)
    fi
    
    cd - > /dev/null
    rm -rf "$temp_dir"
    
    if [ -z "$app_name" ]; then
        app_name=$(basename "$appimage_path" .AppImage)
    fi
    
    echo "$app_name"
}

# Function to add alias to both bash and zsh
add_alias() {
    local alias_name="$1"
    local target_path="$2"
    
    # Add to bash aliases
    touch "$BASH_ALIAS_FILE"
    sed -i "/^alias ${alias_name}=/d" "$BASH_ALIAS_FILE"
    echo "alias ${alias_name}='\"${target_path}\"'" >> "$BASH_ALIAS_FILE"
    
    # Add to zsh aliases
    touch "$ZSH_ALIAS_FILE"
    sed -i "/^alias ${alias_name}=/d" "$ZSH_ALIAS_FILE"
    echo "alias ${alias_name}='\"${target_path}\"'" >> "$ZSH_ALIAS_FILE"
}

# Function to remove alias from both bash and zsh
remove_alias() {
    local alias_name="$1"
    
    # Remove from bash aliases
    if [ -f "$BASH_ALIAS_FILE" ]; then
        sed -i "/^alias ${alias_name}=/d" "$BASH_ALIAS_FILE"
    fi
    
    # Remove from zsh aliases
    if [ -f "$ZSH_ALIAS_FILE" ]; then
        sed -i "/^alias ${alias_name}=/d" "$ZSH_ALIAS_FILE"
    fi
}

# Function to add an AppImage
add_appimage() {
    local source_path="$1"
    local alias_name="$2"
    
    # Validate inputs
    if [ -z "$source_path" ] || [ -z "$alias_name" ]; then
        echo -e "${RED}Error: Missing required arguments${NC}"
        show_usage
        exit 1
    fi
    
    if [ ! -f "$source_path" ]; then
        echo -e "${RED}Error: AppImage file not found: $source_path${NC}"
        exit 1
    fi
    
    # Make source executable
    chmod +x "$source_path"
    
    # Copy AppImage to managed directory
    local target_path="$APPIMAGE_DIR/${alias_name}.AppImage"
    echo -e "${BLUE}Copying AppImage to $target_path${NC}"
    cp "$source_path" "$target_path"
    chmod +x "$target_path"
    
    # Extract icon
    echo -e "${BLUE}Extracting icon...${NC}"
    local icon_path=$(extract_icon "$target_path" "$alias_name")
    
    # Get app name
    local app_name=$(get_appimage_name "$target_path")
    
    # Create alias in both bash and zsh
    echo -e "${BLUE}Creating alias '$alias_name' in bash and zsh${NC}"
    add_alias "$alias_name" "$target_path"
    
    # Create desktop entry
    local desktop_file="$DESKTOP_DIR/${alias_name}.desktop"
    echo -e "${BLUE}Creating desktop entry${NC}"
    
    cat > "$desktop_file" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=${app_name}
Comment=AppImage application
Exec="${target_path}" %U
Icon=${icon_path}
Terminal=false
Categories=Utility;
StartupNotify=true
EOF
    
    chmod +x "$desktop_file"
    
    # Update desktop database
    if command -v update-desktop-database &> /dev/null; then
        update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ AppImage added successfully!${NC}"
    echo -e "${GREEN}  Alias: ${alias_name}${NC}"
    echo -e "${GREEN}  Location: ${target_path}${NC}"
    echo -e "${YELLOW}  Note: Run 'source ~/.bash_aliases' (bash) or 'source ~/.zsh_aliases' (zsh)${NC}"
    echo -e "${YELLOW}        or restart your terminal to use the alias${NC}"
}

# Function to remove an AppImage
remove_appimage() {
    local alias_name="$1"
    
    if [ -z "$alias_name" ]; then
        echo -e "${RED}Error: Missing alias name${NC}"
        show_usage
        exit 1
    fi
    
    local target_path="$APPIMAGE_DIR/${alias_name}.AppImage"
    local desktop_file="$DESKTOP_DIR/${alias_name}.desktop"
    local icon_path="$ICONS_DIR/${alias_name}.png"
    
    # Remove AppImage file
    if [ -f "$target_path" ]; then
        echo -e "${BLUE}Removing AppImage: $target_path${NC}"
        rm "$target_path"
    fi
    
    # Remove alias from both bash and zsh
    echo -e "${BLUE}Removing alias from bash and zsh${NC}"
    remove_alias "$alias_name"
    
    # Remove desktop entry
    if [ -f "$desktop_file" ]; then
        echo -e "${BLUE}Removing desktop entry${NC}"
        rm "$desktop_file"
    fi
    
    # Remove icon
    if [ -f "$icon_path" ]; then
        echo -e "${BLUE}Removing icon${NC}"
        rm "$icon_path"
    fi
    
    # Update desktop database
    if command -v update-desktop-database &> /dev/null; then
        update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ AppImage removed successfully!${NC}"
    echo -e "${YELLOW}  Note: Run 'source ~/.bash_aliases' (bash) or 'source ~/.zsh_aliases' (zsh)${NC}"
    echo -e "${YELLOW}        or restart your terminal to update aliases${NC}"
}

# Function to list managed AppImages
list_appimages() {
    echo -e "${BLUE}Managed AppImages:${NC}"
    echo ""
    
    if [ ! -d "$APPIMAGE_DIR" ] || [ -z "$(ls -A "$APPIMAGE_DIR" 2>/dev/null)" ]; then
        echo "  No AppImages found"
        return
    fi
    
    for appimage in "$APPIMAGE_DIR"/*.AppImage; do
        if [ -f "$appimage" ]; then
            local alias_name=$(basename "$appimage" .AppImage)
            local size=$(du -h "$appimage" | cut -f1)
            echo -e "${GREEN}  • ${alias_name}${NC}"
            echo "    Path: $appimage"
            echo "    Size: $size"
            
            local desktop_file="$DESKTOP_DIR/${alias_name}.desktop"
            if [ -f "$desktop_file" ]; then
                echo "    Desktop entry: ✓"
            else
                echo "    Desktop entry: ✗"
            fi
            echo ""
        fi
    done
}

# Main script logic
case "${1:-}" in
    add)
        add_appimage "$2" "$3"
        ;;
    remove)
        remove_appimage "$2"
        ;;
    list)
        list_appimages
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
