#!/usr/bin/env bash

# Installation script for Waybar Popup System
echo "🚀 Installing Waybar Popup System..."

# Create directories
mkdir -p ~/.config/waybar/scripts
mkdir -p ~/.config/rofi

# Create Audio Popup Script
cat > ~/.config/waybar/scripts/audio-popup.sh << 'EOF'
#!/usr/bin/env bash
VOLUME=$(pactl get-sink-volume @DEFAULT_SINK@ | grep -Po '\d+(?=%)' | head -1)
MUTED=$(pactl get-sink-mute @DEFAULT_SINK@ | grep -Po '(?<=Mute: )\w+')

if [ "$MUTED" = "yes" ]; then
    STATUS="🔇 Muted"
else
    STATUS="🔊 Volume: $VOLUME%"
fi

CHOICE=$(echo -e "$STATUS\n━━━━━━━━━━━━\n🔊 Increase +5%\n🔉 Decrease -5%\n🔇 Toggle Mute\n━━━━━━━━━━━━\n🎧 Pavucontrol\n⚙️ Audio Settings" | \
    rofi -dmenu -i -p "Audio" \
    -theme ~/.config/rofi/waybar-popup.rasi \
    -theme-str 'window {location: north east; x-offset: -10px; y-offset: 35px;}')

case "$CHOICE" in
    *"Increase"*) pactl set-sink-volume @DEFAULT_SINK@ +5% ;;
    *"Decrease"*) pactl set-sink-volume @DEFAULT_SINK@ -5% ;;
    *"Mute"*) pactl set-sink-mute @DEFAULT_SINK@ toggle ;;
    *"Pavucontrol"*) pavucontrol & ;;
    *"Settings"*) pavucontrol & ;;
esac
EOF

# Create Network Popup Script
cat > ~/.config/waybar/scripts/network-popup.sh << 'EOF'
#!/usr/bin/env bash
WIFI_STATUS=$(nmcli -t -f ACTIVE,SSID dev wifi | grep '^yes' | cut -d: -f2)
IP_ADDR=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)

if [ -n "$WIFI_STATUS" ]; then
    MENU="📶 $WIFI_STATUS\n🌐 $IP_ADDR\n━━━━━━━━━━━━\n🔄 Reconnect\n📡 WiFi List\n⚙️ Settings\n🔌 Disconnect"
else
    MENU="📶 Disconnected\n━━━━━━━━━━━━\n📡 WiFi List\n⚙️ Settings"
fi

CHOICE=$(echo -e "$MENU" | \
    rofi -dmenu -i -p "Network" \
    -theme ~/.config/rofi/waybar-popup.rasi \
    -theme-str 'window {location: north east; x-offset: -10px; y-offset: 35px;}')

case "$CHOICE" in
    *"Reconnect"*) nmcli networking off && sleep 1 && nmcli networking on ;;
    *"WiFi List"*) nm-connection-editor & ;;
    *"Settings"*) nm-connection-editor & ;;
    *"Disconnect"*) nmcli device disconnect $(nmcli -t -f DEVICE,TYPE device | grep wifi | cut -d: -f1 | head -1) ;;
esac
EOF

# Create Battery Popup Script
cat > ~/.config/waybar/scripts/battery-popup.sh << 'EOF'
#!/usr/bin/env bash
BATTERY_PATH="/sys/class/power_supply/BAT0"
[ ! -d "$BATTERY_PATH" ] && BATTERY_PATH="/sys/class/power_supply/BAT1"

if [ -d "$BATTERY_PATH" ]; then
    CAPACITY=$(cat $BATTERY_PATH/capacity)
    STATUS=$(cat $BATTERY_PATH/status)
    
    MENU="🔋 Battery: $CAPACITY%\n⚡ Status: $STATUS\n━━━━━━━━━━━━\n⚙️ Power Settings\n📊 Statistics"
else
    MENU="🔋 No Battery\n━━━━━━━━━━━━\n⚙️ Power Settings"
fi

CHOICE=$(echo -e "$MENU" | \
    rofi -dmenu -i -p "Battery" \
    -theme ~/.config/rofi/waybar-popup.rasi \
    -theme-str 'window {location: north east; x-offset: -10px; y-offset: 35px;}')

case "$CHOICE" in
    *"Power Settings"*)
        if command -v gnome-control-center &> /dev/null; then
            gnome-control-center power &
        fi
        ;;
esac
EOF

# Create System Popup Script
cat > ~/.config/waybar/scripts/system-popup.sh << 'EOF'
#!/usr/bin/env bash
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEM_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
UPTIME=$(uptime -p | sed 's/up //')

MENU="💻 CPU: ${CPU_USAGE}%\n🧠 RAM: ${MEM_USAGE}%\n⏱️ Up: $UPTIME\n━━━━━━━━━━━━\n📊 Task Manager\n⚙️ Monitor"

CHOICE=$(echo -e "$MENU" | \
    rofi -dmenu -i -p "System" \
    -theme ~/.config/rofi/waybar-popup.rasi \
    -theme-str 'window {location: north east; x-offset: -10px; y-offset: 35px;}')

case "$CHOICE" in
    *"Task Manager"*)
        if command -v gnome-system-monitor &> /dev/null; then
            gnome-system-monitor &
        elif command -v htop &> /dev/null; then
            alacritty -e htop &
        fi
        ;;
    *"Monitor"*)
        gnome-system-monitor &
        ;;
esac
EOF

# Create Calendar Popup Script
cat > ~/.config/waybar/scripts/calendar-popup.sh << 'EOF'
#!/usr/bin/env bash
CURRENT_DATE=$(date '+%A, %B %d, %Y')
CALENDAR=$(cal -m | sed 's/^/  /')

MENU="📅 $CURRENT_DATE\n━━━━━━━━━━━━━━━━\n$CALENDAR"

echo -e "$MENU" | \
    rofi -dmenu -i -p "Calendar" \
    -theme ~/.config/rofi/waybar-popup.rasi \
    -theme-str 'window {width: 320px; location: north east; x-offset: -10px; y-offset: 35px;}' \
    -theme-str 'listview {lines: 12;}' \
    -theme-str 'element {enabled: false;}'
EOF

# Make scripts executable
chmod +x ~/.config/waybar/scripts/*.sh

# Create Rofi popup theme
cat > ~/.config/rofi/waybar-popup.rasi << 'EOF'
* {
    bg-color:            #1A1A1A;
    fg-color:            #F0F0F0;
    fg-dim:              #888888;
    accent:              #FF6B1A;
    accent-dim:          rgba(255, 107, 26, 0.2);
    border-muted:        #2E2E2E;
    
    background-color:    transparent;
    text-color:          @fg-color;
    border-color:        @border-muted;
}

window {
    background-color:    @bg-color;
    border:              0;
    border-radius:       24px;
    padding:             16px;
    width:               300px;
}

mainbox {
    border:              0;
    padding:             0;
    spacing:             8px;
}

inputbar {
    spacing:             8px;
    padding:             10px 12px;
    border-radius:       18px;
    background-color:    @bg-color;
    border:              0;
    children:            [ prompt ];
}

prompt {
    text-color:          @accent;
    background-color:    transparent;
    font:                "Syne 700 12";
}

listview {
    background-color:    transparent;
    border:              0;
    padding:             4px 0;
    spacing:             4px;
    scrollbar:           false;
    lines:               8;
}

element {
    padding:             8px 10px;
    border-radius:       18px;
    background-color:    transparent;
    text-color:          @fg-dim;
    border:              0;
}

element selected.normal {
    background-color:    @bg-color;
    text-color:          @fg-color;
    border:              2px solid;
    border-color:        @accent;
}

element-text {
    background-color:    transparent;
    text-color:          inherit;
    font:                "DM Sans 400 12";
}
EOF

echo "✅ Installation complete!"
echo ""
echo "📝 Scripts created in: ~/.config/waybar/scripts/"
echo "🎨 Rofi theme created: ~/.config/rofi/waybar-popup.rasi"
echo ""
echo "🔄 Now restart Waybar with: killall waybar && waybar &"
echo ""
echo "🎯 Click on these Waybar modules to see popups:"
echo "   • Clock - Calendar"
echo "   • Battery - Battery info & settings"
echo "   • CPU/Memory - System info"
echo "   • Network - Network controls"
echo "   • Audio - Volume controls"
