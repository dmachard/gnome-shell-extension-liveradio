#!/bin/bash

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

EXTENSION_ID="liveradio@dmachard.dev"
ZIP_NAME="$EXTENSION_ID.shell-extension.zip"

echo "Packing $EXTENSION_ID ..."

gnome-extensions pack "$EXTENSION_ID" \
    --force \
    --extra-source="icons" \
    --extra-source="logos" \
    --extra-source="radios.json" \
    --extra-source="radioPlayer.js" \
    --extra-source="extension.js" \
    --extra-source="stylesheet.css" \

echo "Packing done!"

while getopts i flag; do
    case $flag in

        i)  gnome-extensions install --force \
            $ZIP_NAME && \
            echo "Extension $EXTENSION_ID is installed. Please restart GNOME Shell." || \
            { echo "ERROR: Could not install extension!"; exit 1; };;

        *)  echo "ERROR: Invalid flag!"
            echo "Use '-i' to install the extension to your system."
            echo "To just build it, run the script without any flag."
            exit 1;;
    esac
done

