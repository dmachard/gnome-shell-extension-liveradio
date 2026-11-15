/* radioPanel.js
 * 
 * Live Radio panel for GNOME Shell
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {RadioPlayer} from './radioPlayer.js';

export const RadioPanel = GObject.registerClass(
class RadioPanel extends PanelMenu.Button {
    _init(extension) {
        super._init(0.5, _('Live Radio'));

        this.extension = extension;
        this.settings = extension.getSettings();
        this.radios = [];
        this.player = null;
        this._volume = 1.0;
        this._isMuted = false;
        this._volumeBeforeMute = 1.0;
        this._updatingSlider = false;

        // Load settings
        this._settingsChangedId = this.settings.connect('changed::radios', () => {
            this._loadRadios();
            this._buildMenu();
        });

        let box = new St.BoxLayout({
            y_align: Clutter.ActorAlign.CENTER
        });

        const isWayland = GLib.getenv('XDG_SESSION_TYPE') === 'wayland';
        const topBarHeight = Main.panel.height;

        this.radioLogo = new St.Icon({
            icon_name: 'audio-x-generic-symbolic',
            style_class: 'liveradio-radio-logo',
            visible: false,
            icon_size: Math.floor(topBarHeight * (isWayland ? 0.6 : 0.3))
        });
        box.add_child(this.radioLogo);

        this.nowPlayingLabel = new St.Label({
            text: _('Live Radio'),
            style_class: 'liveradio-now-playing',
            y_align: Clutter.ActorAlign.CENTER,
            visible: true
        });
        box.add_child(this.nowPlayingLabel);

        this.panelVolumeIcon = new St.Icon({
            icon_name: this._volumeIconName(this._volume),
            style_class: 'liveradio-panel-volume',
            visible: false,
            icon_size: Math.floor(topBarHeight * (isWayland ? 0.5 : 0.3))
        });
        box.add_child(this.panelVolumeIcon);

        this.add_child(box);

        // Connect scroll event for volume control
        this.connect('scroll-event', (actor, event) => {
            return this._onScroll(event);
        });

        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._loadRadios();
            this._buildMenu();
            return GLib.SOURCE_REMOVE;
        });
    }

    _loadRadios() {
        try {
            const radiosJson = this.settings.get_string('radios');
            this.radios = JSON.parse(radiosJson);
        } catch (e) {
            Main.notify(_('Live Radio Error'), _('Error loading radios: ') + e.message);
            console.error('[LiveRadio] ERROR: Error loading radios: ' + e.message);
            this.radios = [];
        }
    }

    _buildMenu() {
        // Clear all existing menu items
        this.menu.removeAll();

        // --- Stop Button ---
        let stopContainer = new St.BoxLayout({
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        stopContainer.add_child(new St.Icon({
            icon_name: 'media-playback-stop-symbolic',
            icon_size: 18,
            style_class: 'liveradio-controls-icon'
        }));
        stopContainer.add_child(new St.Label({
            text: _('Stop'),
            y_align: Clutter.ActorAlign.CENTER
        }));

        let stopMenuItem = new PopupMenu.PopupBaseMenuItem({
            reactive: true,
            can_focus: false
        });
        stopMenuItem.style = 'padding: 2px; min-height: 0;';
        stopMenuItem.add_child(stopContainer);
        stopMenuItem.connect('activate', () => {
            this._stopRadio();
            this.menu.close();
        });
        this.menu.addMenuItem(stopMenuItem);

        // --- Volume Slider ---
        let volumeContainer = new St.BoxLayout({
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        this._muteIcon = new St.Icon({
            icon_name: this._volumeIconName(this._isMuted ? 0 : this._volume),
            icon_size: 18,
            style_class: 'liveradio-controls-icon'
        });
        let muteButton = new St.Button({
            child: this._muteIcon,
            y_align: Clutter.ActorAlign.CENTER,
            reactive: true,
            can_focus: true
        });
        muteButton.connect('clicked', () => {
            this._toggleMute();
        });
        volumeContainer.add_child(muteButton);

        this._volumeSlider = new Slider.Slider(this._isMuted ? 0 : this._volume);
        this._volumeSlider.x_expand = true;
        this._volumeSlider.y_align = Clutter.ActorAlign.CENTER;
        this._volumeSlider.accessible_name = _('Volume');
        this._volumeSlider.connect('notify::value', () => {
            if (this._updatingSlider) return;
            this._applyVolume(this._volumeSlider.value, false);
        });
        volumeContainer.add_child(this._volumeSlider);

        let volumeMenuItem = new PopupMenu.PopupBaseMenuItem({
            activate: false,
            can_focus: false
        });
        volumeMenuItem.style = 'padding: 2px; min-height: 0;';
        volumeMenuItem.add_child(volumeContainer);
        this.menu.addMenuItem(volumeMenuItem);

        // --- Separator and Radio List ---
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // List of configured radios
        if (this.radios.length === 0) {
            let noRadiosItem = new PopupMenu.PopupMenuItem(_('No radios configured'));
            noRadiosItem.sensitive = false;
            this.menu.addMenuItem(noRadiosItem);
        } else {
            this.radios.forEach(radio => {
                let radioItem = this._createRadioMenuItem(radio);
                this.menu.addMenuItem(radioItem);
            });
        }

        // --- Separator and Radio List ---
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // --- Settings Button Section ---
        let settingsContainer = new St.BoxLayout({
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        let settingsIcon = new St.Icon({
            icon_name: 'preferences-system-symbolic',
            icon_size: 18,
            style_class: 'liveradio-controls-icon'
        });

        let settingsLabel = new St.Label({
            text: _('Settings'),
            y_align: Clutter.ActorAlign.CENTER
        });
        settingsContainer.add_child(settingsIcon);
        settingsContainer.add_child(settingsLabel);
        
        let settingsMenuItem = new PopupMenu.PopupBaseMenuItem({
            reactive: true,
            can_focus: false
        });
        settingsMenuItem.style = 'padding: 2px; min-height: 0;';
        settingsMenuItem.add_child(settingsContainer);
        
        settingsMenuItem.connect('activate', () => {
            this.menu.close();
            this.extension.openPreferences();
        });
        this.menu.addMenuItem(settingsMenuItem);
    }

    _createRadioMenuItem(radio) {
        let item = new PopupMenu.PopupBaseMenuItem({ style_class: 'popup-menu-item' });
        item.style = 'padding: 3px; min-height: 0;';

        let box = new St.BoxLayout({
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        let logoBox = new St.Bin({
            style_class: 'popup-menu-icon',
            width: 24,
            height: 24,
            y_align: Clutter.ActorAlign.CENTER
        });

        let defaultIcon = new St.Icon({
            icon_name: 'audio-x-generic-symbolic',
            icon_size: 20
        });
        logoBox.set_child(defaultIcon);
        box.add_child(logoBox);

        let label = new St.Label({
            text: radio.name,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true
        });
        box.add_child(label);

        item.add_child(box);

        item._radioData = radio;
        item._label = label;
        item._logoBox = logoBox;

        if (radio.logo) {
            this._loadLogo(radio.logo, logoBox, defaultIcon);
        }

        item.connect('activate', () => this._playRadio(radio, item));

        return item;
    }

    _getGIcon(logo) {
        if (!logo)
            return null;

        if (logo.startsWith('http://') || logo.startsWith('https://'))
            return Gio.FileIcon.new(Gio.File.new_for_uri(logo));

        const userIconsDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'liveradio', 'icons']);
        const filePath = GLib.build_filenamev([userIconsDir, logo]);
        const file = Gio.File.new_for_path(filePath);

        if (file.query_exists(null))
            return Gio.FileIcon.new(file);

        // Ensure directory exists for local icons if it doesn't
        try {
            const dirFile = Gio.File.new_for_path(userIconsDir);
            if (!dirFile.query_exists(null))
                dirFile.make_directory_with_parents(null);
        } catch (e) {
            console.error(`[LiveRadio] Error creating icons directory: ${e.message}`);
        }

        return null;
    }

    _loadLogo(logoFile, logoBox, fallbackIcon) {
        try {
            const gicon = this._getGIcon(logoFile);
            if (gicon) {
                const icon = new St.Icon({
                    gicon,
                    icon_size: 24
                });
                logoBox.set_child(icon);
            } else {
                logoBox.set_child(fallbackIcon);
            }
        } catch (e) {
            console.error(`[LiveRadio] Error loading logo: ${e.message}`);
            logoBox.set_child(fallbackIcon);
        }
    }

    _updateNowPlaying(isPlaying, radio = null) {
        if (isPlaying && radio) {
            this.nowPlayingLabel.text = radio.name;
            this.nowPlayingLabel.visible = true;
            this.panelVolumeIcon.visible = true;

            if (radio.logo) {
                const gicon = this._getGIcon(radio.logo);
                if (gicon) {
                    this.radioLogo.gicon = gicon;
                    this.radioLogo.visible = true;
                } else {
                    this.radioLogo.visible = false;
                }
            } else {
                this.radioLogo.visible = false;
            }
        } else {
            this.nowPlayingLabel.text = _('Live Radio');
            this.radioLogo.visible = false;
            this.panelVolumeIcon.visible = false;
        }
    }

    _playRadio(radio, menuItem) {
        if (!this.player) {
            this.player = new RadioPlayer();
        }

        if (this.player.isPlaying) this.player.stop();

        this.player.setVolume(this._isMuted ? 0 : this._volume);
        if (this.player.play(radio.url)) {
            this.player.setCurrentStation(radio);
            this._updateNowPlaying(true, radio);
        } else {
            this._updateNowPlaying(false);
            Main.notify(_('Live Radio'), _('Failed to play: ') + radio.name);
            console.error('[LiveRadio] ERROR: Failed to play radio ' + radio.name);
        }
    }

    _stopRadio() {
        if (this.player) {
            this.player.stop();
        }
        this._updateNowPlaying(false);
    }

    _onScroll(event) {
        if (!this.player || !this.player.isPlaying) {
            return Clutter.EVENT_PROPAGATE;
        }

        const direction = event.get_scroll_direction();
        const volumeStep = 0.05;
        let delta = 0;

        if (direction === Clutter.ScrollDirection.UP) {
            delta = volumeStep;
        } else if (direction === Clutter.ScrollDirection.DOWN) {
            delta = -volumeStep;
        } else if (direction === Clutter.ScrollDirection.SMOOTH) {
            const [, dy] = event.get_scroll_delta();
            if (dy === 0) {
                return Clutter.EVENT_PROPAGATE;
            }
            delta = -dy * volumeStep;
        } else {
            return Clutter.EVENT_PROPAGATE;
        }

        const baseVolume = this._isMuted ? 0 : this._volume;
        const nextVolume = this._applyVolume(baseVolume + delta);
        this._showVolumeOsd(nextVolume);

        return Clutter.EVENT_STOP;
    }

    _showVolumeOsd(volume) {
        const icon = Gio.ThemedIcon.new(this._volumeIconName(volume));
        const station = this.player?.getCurrentStation();
        const pct = Math.round(volume * 100);
        const label = station ? `${station.name} — ${pct}%` : `${pct}%`;
        Main.osdWindowManager.show(-1, icon, label, volume);
    }

    _applyVolume(volume, updateSlider = true) {
        volume = Math.max(0.0, Math.min(1.0, volume));
        this._volume = volume;
        if (this.player) {
            this.player.setVolume(volume);
        }
        if (updateSlider && this._volumeSlider) {
            this._updatingSlider = true;
            this._volumeSlider.value = volume;
            this._updatingSlider = false;
        }
        this._updateMuteUI(volume === 0, volume);
        return volume;
    }

    _toggleMute() {
        if (this._isMuted) {
            const target = this._volumeBeforeMute > 0 ? this._volumeBeforeMute : 1.0;
            this._applyVolume(target);
        } else {
            this._volumeBeforeMute = this._volume > 0 ? this._volume : 1.0;
            this._applyVolume(0);
        }
    }

    _volumeIconName(volume) {
        if (volume <= 0) return 'audio-volume-muted-symbolic';
        if (volume < 0.34) return 'audio-volume-low-symbolic';
        if (volume < 0.67) return 'audio-volume-medium-symbolic';
        return 'audio-volume-high-symbolic';
    }

    _updateMuteUI(muted, volume = this._volume) {
        this._isMuted = muted;
        const iconName = this._volumeIconName(muted ? 0 : volume);
        if (this._muteIcon) {
            this._muteIcon.icon_name = iconName;
        }
        if (this.panelVolumeIcon) {
            this.panelVolumeIcon.icon_name = iconName;
        }
    }

    destroy() {
        if (this.player) {
            this.player.stop();
            this.player = null;
        }
        super.destroy();
    }
});
