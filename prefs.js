import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class LiveRadioPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.set_default_size(720, 560);

        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'radio-symbolic',
        });
        window.add(page);

        const saveButton = new Gtk.Button({
            label: 'Save',
            css_classes: ['suggested-action'],
            valign: Gtk.Align.CENTER,
        });

        const group = new Adw.PreferencesGroup({
            title: 'Radio Stations',
            description: 'Edit your list of stations in JSON format. Station icons (if specified in the JSON) must be located in: ~/.local/share/liveradio/icons',
            header_suffix: saveButton,
        });
        page.add(group);

        const textView = new Gtk.TextView({
            editable: true,
            monospace: true,
            wrap_mode: Gtk.WrapMode.NONE,
            top_margin: 12,
            bottom_margin: 12,
            left_margin: 14,
            right_margin: 14,
        });
        
        const buffer = textView.get_buffer();
        buffer.set_text(
            JSON.stringify(JSON.parse(settings.get_string('radios') || '[]'), null, 2),
            -1
        );

        // Lightweight JSON syntax highlighting
        const tagTable = buffer.get_tag_table();
        const keyTag = new Gtk.TextTag({ name: 'json-key', foreground: '#3584e4', weight: 700 });
        const strTag = new Gtk.TextTag({ name: 'json-str', foreground: '#2ec27e' });
        tagTable.add(keyTag);
        tagTable.add(strTag);

        const highlight = () => {
            const [start, end] = buffer.get_bounds();
            buffer.remove_all_tags(start, end);
            const text = buffer.get_text(start, end, false);

            const keyRegex = /"([^"]+)"\s*:/g;
            let m;
            while ((m = keyRegex.exec(text)) !== null) {
                const s = buffer.get_iter_at_offset(m.index);
                const e = buffer.get_iter_at_offset(m.index + m[1].length + 2);
                buffer.apply_tag(keyTag, s, e);
            }

            const strRegex = /:\s*"([^"]*)"/g;
            while ((m = strRegex.exec(text)) !== null) {
                const valStart = m.index + m[0].indexOf('"');
                const s = buffer.get_iter_at_offset(valStart);
                const e = buffer.get_iter_at_offset(valStart + m[1].length + 2);
                buffer.apply_tag(strTag, s, e);
            }
        };

        highlight();
        buffer.connect('changed', highlight);

        const scrolled = new Gtk.ScrolledWindow({
            child: textView,
            min_content_height: 300,
            vexpand: true,
            css_classes: ['card'],
        });
        group.add(scrolled);

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

                // Clean and validate each radio station
                const cleanedRadios = radios.map((r, index) => {
                    if (!r.name || !r.url)
                        throw new Error(`Radio at index ${index} must have "name" and "url"`);
                    
                    // Trim whitespace from URL
                    const cleanedUrl = r.url.trim();

                    // Validate URL format
                    if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
                        throw new Error(`Invalid URL for "${r.name}": must start with http:// or https://`);
                    }
                    
                    // Return cleaned radio object
                    return {
                        ...r,
                        name: r.name.trim(),
                        url: cleanedUrl
                    };
                });

                // Save cleaned radios back to settings
                settings.set_string('radios', JSON.stringify(cleanedRadios));
                window.close();
            } catch (e) {
                showDialog('Invalid JSON', e.message, true);
            }
        });
    }
}
