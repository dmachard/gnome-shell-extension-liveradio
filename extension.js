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
        this._radioPanel = new RadioPanel(this);
        Main.panel.addToStatusArea(this.uuid, this._radioPanel);
    }

    disable() {
        if (this._radioPanel) {
            this._radioPanel.destroy();
            this._radioPanel = null;
        }
    }
}