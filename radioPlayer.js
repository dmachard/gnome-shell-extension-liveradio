/* radioPlayer.js
 *
 * Radio player using GStreamer API directly
 *
 */

import GObject from 'gi://GObject';
import Gst from 'gi://Gst';
import * as Main from 'resource:///org/gnome/shell/extensions/extension.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';


export const RadioPlayer = GObject.registerClass(
class RadioPlayer extends GObject.Object {
    _init() {
        super._init();
        this.pipeline = null;
        this.bus = null;
        this.watchId = null;
        this.currentStation = null;
        this.isPlaying = false;
        this._gstInitialized = false;
        log('[LiveRadio] RadioPlayer created (GStreamer not yet initialized)');
    }

    _ensureGst() {
        if (!this._gstInitialized) {
            if (!Gst.is_initialized()) {
                Gst.init(null);
            }
            this._gstInitialized = true;
            log('[LiveRadio] GStreamer initialized');
        }
    }

    play(url) {
        log('[LiveRadio] RadioPlayer.play() URL: ' + url);
        this._ensureGst();
        this.stop();

        try {
            // Create playbin element
            this.pipeline = Gst.ElementFactory.make('playbin', 'player');
            
            if (!this.pipeline) {
                log('[LiveRadio] ERROR: Could not create playbin element');
                Main.notify(_('Error'), _('Could not create audio player'));
                return false;
            }

            // Set the URI
            this.pipeline.set_property('uri', url);
            log('[LiveRadio] URI set: ' + url);

            // Set volume (0.0 to 1.0)
            this.pipeline.set_property('volume', 1.0);

            // Get the bus and connect to messages
            this.bus = this.pipeline.get_bus();
            this.bus.add_signal_watch();
            this.watchId = this.bus.connect('message', (bus, message) => {
                this._onBusMessage(bus, message);
            });

            // Start playback
            let ret = this.pipeline.set_state(Gst.State.PLAYING);
            
            if (ret === Gst.StateChangeReturn.FAILURE) {
                log('[LiveRadio] ERROR: Failed to set pipeline to PLAYING state');
                Main.notify(_('Error'), _('Failed to start playback'));
                this.stop();
                return false;
            }

            this.isPlaying = true;
            log('[LiveRadio] Playback started');
            return true;

        } catch (e) {
            log('[LiveRadio] ERROR in play(): ' + e.message);
            log('[LiveRadio] Stack: ' + e.stack);
            Main.notify(_('Error'), _('Error during playback: ') + e.message);
            this.stop();
            return false;
        }
    }

    stop() {
        log('[LiveRadio] RadioPlayer.stop() called');
        
        if (this.bus && this.watchId) {
            this.bus.disconnect(this.watchId);
            this.bus.remove_signal_watch();
            this.watchId = null;
            this.bus = null;
        }

        if (this.pipeline) {
            log('[LiveRadio] Stopping pipeline');
            this.pipeline.set_state(Gst.State.NULL);
            this.pipeline = null;
        }

        this.isPlaying = false;
        this.currentStation = null;
        log('[LiveRadio] Stop completed');
    }

    setCurrentStation(station) {
        this.currentStation = station;
    }

    getCurrentStation() {
        return this.currentStation;
    }

    _onBusMessage(bus, message) {
        let type = message.type;

        if (type === Gst.MessageType.ERROR) {
            let [error, debug] = message.parse_error();
            log('[LiveRadio] ERROR message: ' + error.message);
            log('[LiveRadio] Debug info: ' + debug);
            Main.notify(_('Playback error'), error.message);
            this.stop();
        } else if (type === Gst.MessageType.EOS) {
            log('[LiveRadio] End of stream');
            this.stop();
        } else if (type === Gst.MessageType.STATE_CHANGED) {
            let [oldState, newState, pendingState] = message.parse_state_changed();
            if (message.src === this.pipeline) {
                log('[LiveRadio] State changed: ' + oldState + ' -> ' + newState);
            }
        }
    }
});
