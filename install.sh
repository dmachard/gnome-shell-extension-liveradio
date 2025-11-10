#!/bin/bash

# Script to install the Live Radio GNOME Shell extension

UUID="liveradio@dmachard.dev"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"

echo "Install Live Radio GNOME Shell extension"

# Create installation directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/schemas"

# Copy files
echo "Copying files to $INSTALL_DIR ..."
cp extension.js "$INSTALL_DIR/"
cp radioPanel.js "$INSTALL_DIR/"
cp radioPlayer.js "$INSTALL_DIR/"
cp prefs.js "$INSTALL_DIR/"
cp metadata.json "$INSTALL_DIR/"
cp stylesheet.css "$INSTALL_DIR/"

# Copy GSettings schemas
cp schemas/*.gschema.xml "$INSTALL_DIR/schemas/"

# Compile GSettings schemas
echo "Generating GSettings schemas ..."
glib-compile-schemas "$INSTALL_DIR/schemas/"

echo "Installation completed successfully!"
echo ""
echo "To activate the extension:"
echo "  1. Restart GNOME Shell (Alt+F2, then 'r' on X11)"
echo "  2. Or disconnect/reconnect no Wayland"
echo "  3. Activate the extension with: gnome-extensions enable $UUID"
echo ""
echo "To open settings:"
echo "  gnome-extensions prefs $UUID"