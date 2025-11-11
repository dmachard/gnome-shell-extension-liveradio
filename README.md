# gnome-shell-extension-liveradio

Listen to live radio stations directly from the GNOME Shell panel

<img src="liveradio-overview.png" alt="Live-RADIO"/>

## Features

- Manage your favorite internet radio streams directly from GNOME Shell
- JSON configuration for easy editing of radio lists
- Support for radio icons
- Lightweight and easy to use

## Compatibility

| GNOME Shell Version | Supported |
|---------------------|-----------|
| 48                  | ✅        |
| 49                  | ✅        |

## Installation


## Requirements

- GNOME Shell 48 or later
- GStreamer plugins for audio playback:
  ```bash
  sudo apt install gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly
  ```

### From source

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/gnome-shell-extension-liveradio.git
   cd gnome-shell-extension-liveradio
   ```

2. **Install to your extensions directory:**
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

3. **Restart GNOME Shell:**
   - On **X11**: Press `Alt+F2`, type `r`, and press Enter
   - On **Wayland**: Log out and log back in

4. **Enable the extension:**
   ```bash
   gnome-extensions enable liveradio@dmachard.dev
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

> Copy the contents of `stations.json.example` from this repository


Each radio can have:
- name → Display name
- url → Stream URL
- logo → Optional icon. If empty or invalid, the default icon will be used.

You can add your custom icons in:

```bash
~/.local/share/liveradio/icons/
```

The extension will create `~/.local/share/liveradio/icons/` automatically if it doesn’t exist.

## Troubleshooting

View logs in real-time

```bash
$ journalctl -f | grep -i liveradio
Nov 11 10:30:20 denis-laptop gnome-shell[207832]: [LiveRadio] ERROR: Failed to set pipeline to PLAYING state
```

## Build for website

Developers Guide: https://gjs.guide/extensions/

```bash
cd ~/.local/share/gnome-shell/extensions/liveradio@dmachard.dev

zip -r ~/liveradio@dmachard.dev.shell-extension.zip \
    extension.js \
    prefs.js \
    radioPanel.js \
    radioPlayer.js \
    metadata.json \
    stylesheet.css \
    schemas/
```