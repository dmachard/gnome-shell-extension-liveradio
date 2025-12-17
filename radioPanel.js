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

        // Load settings
        this._settingsChangedId = this.settings.connect('changed::radios', () => {
            this._loadRadios();
            this._buildMenu();
        });

        let box = new St.BoxLayout({
            vertical: false,
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

        this.add_child(box);

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

        // Stop Button Section (Fixed at Top)
        let stopContainer = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });
        
        let stopIcon = new St.Icon({
            icon_name: 'media-playback-stop-symbolic',
            icon_size: 18,
            style_class: 'liveradio-controls-icon'
        });

        let stopLabel = new St.Label({
            text: _('Stop'),
            y_align: Clutter.ActorAlign.CENTER,
        });

        stopContainer.add_child(stopIcon);
        stopContainer.add_child(stopLabel);

        let stopMenuItem = new PopupMenu.PopupBaseMenuItem({
            reactive: true,
            can_focus: true
        });
        stopMenuItem.style = 'padding: 5px;';
        stopMenuItem.add_child(stopContainer);

        stopMenuItem.connect('activate', () => {
            this._stopRadio();
            this.menu.close();
        });
        this.menu.addMenuItem(stopMenuItem);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Scrollable Radio List
        // We create a ScrollView to prevent overflow
        let scrollView = new St.ScrollView({
            x_expand: true,
            y_expand: true,
            hscroll_policy: St.PolicyType.NEVER,
            vscroll_policy: St.PolicyType.AUTOMATIC,
            // Limit height so it doesn't go off screen
            // 400px is usually safe, or calculate based on screen height
            style: 'max-height: 400px;' 
        });

        // This section holds the actual menu items inside the ScrollView
        let radioSection = new PopupMenu.PopupMenuSection();
        
        if (this.radios.length === 0) {
            let noRadiosItem = new PopupMenu.PopupMenuItem(_('No radios configured'));
            noRadiosItem.sensitive = false;
            radioSection.addMenuItem(noRadiosItem);
        } else {
            this.radios.forEach(radio => {
                let radioItem = this._createRadioMenuItem(radio);
                radioSection.addMenuItem(radioItem);
            });
        }

        // Add the section to the ScrollView, and the ScrollView to the main menu
        scrollView.add_actor(radioSection.actor);
        this.menu.addMenuItem(scrollView);

        // Settings Button Section (Fixed at Bottom)
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let settingsContainer = new St.BoxLayout({
            vertical: false,
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
            can_focus: true
        });
        settingsMenuItem.style = 'padding: 5px;';
        settingsMenuItem.add_child(settingsContainer);
        
        settingsMenuItem.connect('activate', () => {
            this.menu.close();
            this.extension.openPreferences();
        });
        this.menu.addMenuItem(settingsMenuItem);
    }

    _createRadioMenuItem(radio) {
        let item = new PopupMenu.PopupBaseMenuItem({ style_class: 'popup-menu-item' });

        let box = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        let logoBox = new St.Bin({
            style_class: 'popup-menu-icon',
            width: 40,
            height: 40,
            y_align: Clutter.ActorAlign.CENTER
        });

        let defaultIcon = new St.Icon({
            icon_name: 'audio-x-generic-symbolic',
            icon_size: 32
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

    _loadLogo(logoFile, logoBox, fallbackIcon) {
        try {
            const userIconsDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'liveradio', 'icons']);

            const dirFile = Gio.File.new_for_path(userIconsDir);
            if (!dirFile.query_exists(null)) {
                try {
                    dirFile.make_directory_with_parents(null);
                } catch (e) {
                    console.error(`Error creating icons directory: ${e.message}`);
                    logoBox.set_child(fallbackIcon);
                    return;
                }
            }

            let filePath = GLib.build_filenamev([userIconsDir, logoFile]);
            let file = Gio.File.new_for_path(filePath);

            if (!file.query_exists(null)) {
                logoBox.set_child(fallbackIcon);
                return;
            }

            let gicon = Gio.FileIcon.new(file);
            let icon = new St.Icon({
                gicon: gicon,
                icon_size: 32
            });

            logoBox.set_child(icon);
        } catch {
            logoBox.set_child(fallbackIcon);
        }
    }

    _updateNowPlaying(isPlaying, radio = null) {
        if (isPlaying && radio) {
            this.nowPlayingLabel.text = radio.name;
            this.nowPlayingLabel.visible = true;

            if (radio.logo) {
                const userIconsDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'liveradio', 'icons']);
                let filePath = GLib.build_filenamev([userIconsDir, radio.logo]);
                let file = Gio.File.new_for_path(filePath);
                if (file.query_exists(null)) {
                    this.radioLogo.gicon = Gio.FileIcon.new(file);
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
        }
    }

    _playRadio(radio, menuItem) {
        if (!this.player) {
            this.player = new RadioPlayer();
        }

        if (this.player.isPlaying) this.player.stop();

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

    destroy() {
        if (this.player) {
            this.player.stop();
            this.player = null;
        }
        super.destroy();
    }
});
