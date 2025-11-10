import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class LiveRadioPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'radio-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'Radio Stations',
            description: 'Edit your list of stations in JSON format. Station icons (if specified in the JSON) must be located in: ~/.local/share/liveradio/icons',
        });
        page.add(group);

        const textView = new Gtk.TextView({
            editable: true,
            monospace: true,
            wrap_mode: Gtk.WrapMode.WORD_CHAR,
            margin_top: 6,
            margin_bottom: 6,
        });
        
        const buffer = textView.get_buffer();
        buffer.set_text(
            JSON.stringify(JSON.parse(settings.get_string('radios') || '[]'), null, 2),
            -1
        );

        const scrolled = new Gtk.ScrolledWindow({
            child: textView,
            min_content_height: 250,
            vexpand: true,
        });

        const saveButton = new Gtk.Button({
            label: 'Save',
            css_classes: ['suggested-action'],
            halign: Gtk.Align.END,
        });

        const showDialog = (heading, body, destructive = false) => {
            const dialog = new Adw.MessageDialog({
                heading,
                body,
                transient_for: window,
                modal: true,
            });
            dialog.add_response('ok', 'OK');
            dialog.set_response_appearance(
                'ok',
                destructive
                    ? Adw.ResponseAppearance.DESTRUCTIVE
                    : Adw.ResponseAppearance.SUGGESTED
            );
            dialog.present();
        };

        saveButton.connect('clicked', () => {
            const [start, end] = buffer.get_bounds();
            const text = buffer.get_text(start, end, false);
            try {
                const radios = JSON.parse(text);
                if (!Array.isArray(radios))
                    throw new Error('Radios must be an array');
                for (const r of radios)
                    if (!r.name || !r.url)
                        throw new Error('Each radio must have "name" and "url"');
                settings.set_string('radios', JSON.stringify(radios));

                window.close();
            } catch (e) {
                showDialog('Invalid JSON', e.message, true);
            }
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
        });
        box.append(scrolled);
        box.append(saveButton);

        group.add(box);
    }
}
