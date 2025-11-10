/* extension.js
 *
 * Live Radio GNOME Shell extension
 *
 */

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {RadioPanel} from './radioPanel.js';

export default class LiveRadioExtension extends Extension {
    enable() {
        try {
            this._radioPanel = new RadioPanel(this);
            Main.panel.addToStatusArea(this.uuid, this._radioPanel);
        } catch (e) {
            Main.notify(_('Live Radio Error'), _('Failed to enable extension: ') + e.message);
        }
    }

    disable() {
        if (this._radioPanel) {
            this._radioPanel.destroy();
            this._radioPanel = null;
        }
    }
}