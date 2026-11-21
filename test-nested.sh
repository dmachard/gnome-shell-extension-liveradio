#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

UUID="liveradio-test@dmachard.dev"
TMP_DIR=$(mktemp -d -t gnome-test-XXXXXX)
EXT_DIR="$TMP_DIR/.local/share/gnome-shell/extensions/$UUID"

# Cleanup temporary folder on exit
trap 'rm -rf "$TMP_DIR"' EXIT

echo "[+] Setting up isolated test environment in $TMP_DIR ..."
mkdir -p "$EXT_DIR/schemas" "$TMP_DIR/.config"

# Copy extension files with isolated test UUID so host v7 is never picked up
cp extension.js radioPanel.js radioPlayer.js prefs.js metadata.json stylesheet.css "$EXT_DIR/"
sed -i "s/liveradio@dmachard.dev/$UUID/" "$EXT_DIR/metadata.json"
cp schemas/*.gschema.xml "$EXT_DIR/schemas/"

# Compile GSettings schemas in test directory
echo "[+] Compiling GSettings schemas..."
glib-compile-schemas "$EXT_DIR/schemas/"

echo "[+] Launching isolated nested GNOME Shell..."
echo "[i] Close the window to exit and clean up."

# Strip Snap (e.g. VS Code) GLib/GTK/XDG overrides so host gnome-shell uses host schemas
unset GSETTINGS_SCHEMA_DIR GIO_MODULE_DIR GDK_PIXBUF_MODULEDIR GDK_PIXBUF_MODULE_FILE \
      GTK_EXE_PREFIX GTK_IM_MODULE_FILE GTK_PATH LOCPATH
export XDG_DATA_DIRS="${XDG_DATA_DIRS_VSCODE_SNAP_ORIG:-${XDG_DATA_DIRS:-/usr/local/share:/usr/share}}"
export XDG_CONFIG_DIRS="${XDG_CONFIG_DIRS_VSCODE_SNAP_ORIG:-${XDG_CONFIG_DIRS:-/etc/xdg}}"

# Run nested GNOME Shell with isolated HOME/XDG and extension pre-enabled
HOME="$TMP_DIR" \
XDG_DATA_HOME="$TMP_DIR/.local/share" \
XDG_CONFIG_HOME="$TMP_DIR/.config" \
dbus-run-session bash -c "
    gsettings set org.gnome.shell disable-user-extensions false
    gsettings set org.gnome.shell enabled-extensions \"['$UUID']\"
    gsettings --schemadir '$EXT_DIR/schemas' set org.gnome.shell.extensions.liveradio radios \"\$(cat '$PWD/stations.json.example')\"
    exec gnome-shell --devkit --wayland
"
