#!/usr/bin/env bash

# Kill any existing Waybar instances
killall -q waybar

# Wait for all processes to die
while pgrep -x waybar >/dev/null; do 
    sleep 0.1
done

waybar 