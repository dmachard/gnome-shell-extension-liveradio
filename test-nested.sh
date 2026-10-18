#!/usr/bin/env bash
set -euo pipefail

UUID="liveradio@dmachard.dev"
TMP_DIR=$(mktemp -d -t gnome-test-XXXXXX)
EXT_DIR="$TMP_DIR/data/gnome-shell/extensions/$UUID"

# Cleanup temporary folder on exit
trap 'rm -rf "$TMP_DIR"' EXIT

echo "[+] Setting up isolated test environment in $TMP_DIR ..."
mkdir -p "$EXT_DIR/schemas"

# Copy extension files
cp extension.js radioPanel.js radioPlayer.js prefs.js metadata.json stylesheet.css "$EXT_DIR/"
cp schemas/*.gschema.xml "$EXT_DIR/schemas/"

# Compile GSettings schemas in test directory
echo "[+] Compiling GSettings schemas..."
glib-compile-schemas "$EXT_DIR/schemas/"

echo "[+] Launching isolated nested GNOME Shell..."
echo "[i] Close the window to exit and clean up."

# Run nested GNOME Shell with isolated configuration and extension pre-enabled
XDG_DATA_HOME="$TMP_DIR/data" \
XDG_CONFIG_HOME="$TMP_DIR/config" \
dbus-run-session bash -c "
    gsettings set org.gnome.shell enabled-extensions \"['$UUID']\"
    exec gnome-shell --devkit --wayland
"
