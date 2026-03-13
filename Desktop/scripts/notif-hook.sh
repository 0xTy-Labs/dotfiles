#!/usr/bin/env bash
# axdots — scripts/notif-hook.sh
# Dunst calls this script for every notification via script_notification.
# Currently used for: logging, custom sounds, special app hooks.
#
# Dunst exports: $DUNST_APP_NAME $DUNST_SUMMARY $DUNST_BODY $DUNST_URGENCY
# Urgency values: LOW NORMAL CRITICAL

APP="${DUNST_APP_NAME:-}"
URGENCY="${DUNST_URGENCY:-NORMAL}"

# Play sound for critical notifications
if [[ "$URGENCY" == "CRITICAL" ]]; then
  if command -v paplay &>/dev/null; then
    paplay /usr/share/sounds/freedesktop/stereo/bell.oga &>/dev/null &
  fi
fi

# Optional: log to file
# echo "[$(date +%T)] [$URGENCY] $APP: $DUNST_SUMMARY" >> /tmp/axdots-notifs.log

exit 0
