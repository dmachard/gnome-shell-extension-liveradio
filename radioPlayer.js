/* radioPlayer.js
 *
 * Radio player using GStreamer API directly
 *
 */

import GObject from 'gi://GObject';
import Gst from 'gi://Gst';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
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
    }

    _ensureGst() {
        if (!this._gstInitialized) {
            if (!Gst.is_initialized()) {
                Gst.init(null);
            }
            this._gstInitialized = true;
        }
    }

    play(url) {
        this._ensureGst();
        this.stop();

        try {
            // Create playbin element
            this.pipeline = Gst.ElementFactory.make('playbin', 'player');
            
            if (!this.pipeline) {
                console.error('[LiveRadio] ERROR: Could not create playbin element');
                return false;
            }

            // Set the URI
            this.pipeline.set_property('uri', url);

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
                console.error('[LiveRadio] ERROR: Failed to set pipeline to PLAYING state');
                this.stop();
                return false;
            }

            this.isPlaying = true;
            return true;

        } catch (e) {
            console.error('[LiveRadio] ERROR in play(): ' + e.message);
            console.error('[LiveRadio] Stack: ' + e.stack);
            this.stop();
            return false;
        }
    }

    stop() {
        if (this.bus && this.watchId) {
            this.bus.disconnect(this.watchId);
            this.bus.remove_signal_watch();
            this.watchId = null;
            this.bus = null;
        }

        if (this.pipeline) {
            this.pipeline.set_state(Gst.State.NULL);
            this.pipeline = null;
        }

        this.isPlaying = false;
        this.currentStation = null;
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
            console.error('[LiveRadio] ERROR message: ' + error.message);
            console.error('[LiveRadio] Debug info: ' + debug);
            this.stop();
        } else if (type === Gst.MessageType.EOS) {
            this.stop();
        }
    }
});
