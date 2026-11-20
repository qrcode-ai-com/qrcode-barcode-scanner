// SPDX-License-Identifier: MIT
import { App, Plugin, PluginSettingTab, Setting, type SettingDefinition } from 'obsidian';
import type { InsertFormat } from './format';
import { PROFILES, type Profile } from './scanner';

export interface ScannerSettings {
  profile: Profile;
  format: InsertFormat;
}

export const DEFAULT_SETTINGS: ScannerSettings = { profile: 'full', format: 'list' };

/** Saved data, with every unknown or missing value replaced by its default. */
export function readSettings(data: unknown): ScannerSettings {
  const saved = (data && typeof data === 'object' ? data : {}) as Partial<Record<keyof ScannerSettings, unknown>>;
  return {
    profile: PROFILES.includes(saved.profile as Profile) ? (saved.profile as Profile) : DEFAULT_SETTINGS.profile,
    format: saved.format === 'callout' || saved.format === 'list' ? saved.format : DEFAULT_SETTINGS.format,
  };
}

interface SettingsOwner extends Plugin {
  settings: ScannerSettings;
  saveSettings(): Promise<void>;
}

interface Dropdown {
  key: keyof ScannerSettings;
  name: string;
  desc: string;
  options: Record<string, string>;
}

// The one list both renderings read, so a setting cannot differ between Obsidian versions.
const DROPDOWNS: Dropdown[] = [
  {
    key: 'profile',
    name: 'Scan profile',
    desc: 'Full searches longest and reads the most damaged codes. Fast and frame stop sooner.',
    options: { full: 'Full', fast: 'Fast', frame: 'Frame' },
  },
  {
    key: 'format',
    name: 'Inserted text',
    desc: 'How the decoded codes are written into the note.',
    options: { list: 'List', callout: 'Callout' },
  },
];

export class ScannerSettingTab extends PluginSettingTab {
  constructor(app: App, readonly owner: SettingsOwner) {
    super(app, owner);
  }

  // Obsidian 1.13 and later render these definitions, index them for the settings search and no
  // longer call display(). Older versions, down to the manifest's minAppVersion, call display().
  getSettingDefinitions(): SettingDefinition[] {
    return DROPDOWNS.map(({ key, name, desc, options }): SettingDefinition => ({
      name,
      desc,
      control: { type: 'dropdown', key, options, defaultValue: DEFAULT_SETTINGS[key] },
    }));
  }

  getControlValue(key: string): unknown {
    return this.owner.settings[key as keyof ScannerSettings];
  }

  // Both renderings save through here: a value this plugin does not know is stored as its default.
  async setControlValue(key: string, value: unknown): Promise<void> {
    this.owner.settings = readSettings({ ...this.owner.settings, [key]: value });
    await this.owner.saveSettings();
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    for (const { key, name, desc, options } of DROPDOWNS) {
      new Setting(containerEl)
        .setName(name)
        .setDesc(desc)
        .addDropdown((dropdown) => dropdown
          .addOptions(options)
          .setValue(this.owner.settings[key])
          .onChange((value) => this.setControlValue(key, value)));
    }
  }
}
