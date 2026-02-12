

AppImage files manager
adding terminal aliases and system integration.

## Features

- ✓ Create terminal aliases for quick AppImage launching (Bash & Zsh)
- ✓ Integrate AppImages into your application menu
- ✓ Automatic icon extraction
- ✓ Centralized AppImage management
- ✓ Easy add/remove functionality
- ✓ Automatic configuration for both Bash and Zsh shells

## Installation

1. Download the script:
```bash
chmod +x appimage-manager.sh
```

2. Optionally, move it to a location in your PATH:
```bash
sudo mv appimage-manager.sh /usr/local/bin/appimage-manager
```

## Usage

### Add an AppImage

```bash
./appimage-manager.sh add /path/to/MyApp.AppImage myapp
```

This will:
- Copy the AppImage to `~/.local/share/appimages/`
- Create an alias `myapp` in `~/.bash_aliases` (for Bash)
- Create an alias `myapp` in `~/.zsh_aliases` (for Zsh)
- Create a desktop entry in `~/.local/share/applications/`
- Extract and save the application icon

After adding, run:
```bash
# For Bash users
source ~/.bash_aliases

# For Zsh users
source ~/.zsh_aliases
```

Or restart your terminal to use the alias.

### Remove an AppImage

```bash
./appimage-manager.sh remove myapp
```

This removes the AppImage, alias, desktop entry, and icon.

### List all managed AppImages

```bash
./appimage-manager.sh list
```

Shows all AppImages managed by the script with their details.

## Examples

### Adding Firefox AppImage
```bash
./appimage-manager.sh add ~/Downloads/Firefox.AppImage firefox

# Now you can launch it with:
firefox
# Or from your application menu
```

### Adding VS Code
```bash
./appimage-manager.sh add ~/Downloads/VSCode.AppImage code

# Launch with:
code
```

### Removing an application
```bash
./appimage-manager.sh remove firefox
```

## Directory Structure

The script uses the following directories:

- **AppImages**: `~/.local/share/appimages/`
- **Desktop entries**: `~/.local/share/applications/`
- **Icons**: `~/.local/share/icons/appimages/`
- **Bash aliases**: `~/.bash_aliases`
- **Zsh aliases**: `~/.zsh_aliases`

## Automatic Alias Loading

The installation script automatically configures this for you, but if needed:

### For Bash

Ensure this is in your `~/.bashrc`:

```bash
if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi
```

### For Zsh

Ensure this is in your `~/.zshrc`:

```bash
if [ -f ~/.zsh_aliases ]; then
    . ~/.zsh_aliases
fi
```

## Shell Compatibility

### Bash and Zsh

The script automatically handles both Bash and Zsh! Aliases are added to both `~/.bash_aliases` and `~/.zsh_aliases`.

### For Fish users

Fish uses a different alias system. You can create functions instead:
```fish
function myapp
    ~/.local/share/appimages/myapp.AppImage $argv
end
funcsave myapp
```

## Troubleshooting

### Alias not working

1. Ensure you've sourced the aliases file:
   ```bash
   # For Bash
   source ~/.bash_aliases
   
   # For Zsh
   source ~/.zsh_aliases
   ```

2. Or restart your terminal

3. Verify the alias file exists and contains your alias:
   ```bash
   # For Bash
   cat ~/.bash_aliases | grep myapp
   
   # For Zsh
   cat ~/.zsh_aliases | grep myapp
   ```

### AppImage won't run

1. Ensure the AppImage is executable:
   ```bash
   chmod +x ~/.local/share/appimages/yourapp.AppImage
   ```

2. Install FUSE if missing (required for AppImages):
   ```bash
   # Ubuntu/Debian
   sudo apt install libfuse2
   
   # Fedora
   sudo dnf install fuse-libs
   
   # Arch
   sudo pacman -S fuse2
   ```

### Application not showing in menu

1. Update the desktop database:
   ```bash
   update-desktop-database ~/.local/share/applications/
   ```

2. Log out and log back in

## Uninstallation

To remove all managed AppImages:

```bash
rm -rf ~/.local/share/appimages/
rm -rf ~/.local/share/icons/appimages/
rm ~/.local/share/applications/*appimage*.desktop
# Manually remove aliases from ~/.bash_aliases and ~/.zsh_aliases
# or delete the alias files entirely:
rm ~/.bash_aliases
rm ~/.zsh_aliases
```

## License

MIT License - feel free to modify and distribute.
