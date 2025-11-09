/* extension.js
 *
 * Live Radio GNOME Shell extension
 *
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {RadioPlayer} from './radioPlayer.js';

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.5, _('Live Radio'));

        this.extension = extension;
        this.radios = [];
        this.player = null;
        this.currentMenuItem = null;

        let box = new St.BoxLayout({
            vertical: false,
            y_align: Clutter.ActorAlign.CENTER
        });

        const iconFile = Gio.File.new_for_path(`${this.extension.path}/icons/live-radio-off.svg`);
        this.icon = new St.Icon({
            gicon: Gio.FileIcon.new(iconFile),
            style_class: 'liveradio-panel-icon'
        });
        box.add_child(this.icon);

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
            text: _(''),
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
            let filePath = GLib.build_filenamev([this.extension.path, 'radios.json']);
            let file = Gio.File.new_for_path(filePath);

            if (!file.query_exists(null)) {
                Main.notify(_('Live Radio Error'), _('radios.json file not found'));
                return;
            }

            let [success, contents] = file.load_contents(null);
            if (!success) {
                Main.notify(_('Live Radio Error'), _('Unable to read radios.json'));
                return;
            }

            let decoder = new TextDecoder('utf-8');
            let json = decoder.decode(contents);
            this.radios = JSON.parse(json);
        } catch (e) {
            Main.notify(_('Live Radio Error'), _('Error loading radios: ') + e.message);
            this.radios = [];
        }
    }

    _buildMenu() {
        this.menu.removeAll();

        if (this.radios.length === 0) {
            let item = new PopupMenu.PopupMenuItem(_('No radios configured'));
            item.sensitive = false;
            this.menu.addMenuItem(item);
            return;
        }

        this.radios.forEach(radio => {
            let item = this._createRadioMenuItem(radio);
            this.menu.addMenuItem(item);
        });

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let stopItem = new PopupMenu.PopupImageMenuItem(_('Stop playing'), 'media-playback-stop-symbolic');
        stopItem.connect('activate', () => this._stopRadio());
        this.menu.addMenuItem(stopItem);
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
            let filePath = GLib.build_filenamev([this.extension.path, 'logos', logoFile]);
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
                let filePath = GLib.build_filenamev([this.extension.path, 'logos', radio.logo]);
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
            this.nowPlayingLabel.text = _('');
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
            this.currentMenuItem = menuItem;
            this._updateNowPlaying(true, radio);
        } else {
            this._updateNowPlaying(false);
            Main.notify(_('Live Radio'), _('Failed to play: ') + radio.name);
        }
    }

    _stopRadio() {
        if (this.player) {
            this.player.stop();
        }
        this.currentMenuItem = null;
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

export default class LiveRadioExtension extends Extension {
    enable() {
        try {
            this._indicator = new Indicator(this);
            Main.panel.addToStatusArea(this.uuid, this._indicator);
        } catch (e) {
            Main.notify(_('Live Radio Error'), _('Failed to enable extension'));
        }
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
