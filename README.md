# gnome-shell-extension-liveradio

Listen to live radio stations directly from the GNOME Shell panel

<img src="liveradio-overview.png" alt="Live-RADIO"/>

## Features

- Manage your favorite internet radio streams directly from GNOME Shell
- JSON configuration for easy editing of radio lists
- Support for radio icons
- Lightweight and easy to use

## Installation

```bash
# Make the install script executable
chmod +x install.sh

# Run the installer
./install.sh
```

## Settings

Open the LiveRadio preferences from GNOME Extensions to managing Radio Stations.

Radios are stored in a JSON format

```json
[
  {
    "name": "Radio Paradise",
    "url": "https://stream.radioparadise.com/mp3-192",
    "logo": "localradio.png"
  }
]
```

Each radio can have:
- name → Display name
- url → Stream URL
- logo → Optional icon. If empty or invalid, the default icon will be used.

You can add your custom icons in:

```bash
~/.local/share/liveradio/icons/
```

The extension will create `~/.local/share/liveradio/icons/` automatically if it doesn’t exist.