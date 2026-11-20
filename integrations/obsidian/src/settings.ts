// SPDX-License-Identifier: MIT
import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
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

export class ScannerSettingTab extends PluginSettingTab {
  constructor(app: App, readonly owner: SettingsOwner) {
    super(app, owner);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName('Scan profile')
      .setDesc('Full searches longest and reads the most damaged codes. Fast and frame stop sooner.')
      .addDropdown((dropdown) => dropdown
        .addOptions({ full: 'Full', fast: 'Fast', frame: 'Frame' })
        .setValue(this.owner.settings.profile)
        .onChange(async (value) => {
          this.owner.settings.profile = value as Profile;
          await this.owner.saveSettings();
        }));
    new Setting(containerEl)
      .setName('Inserted text')
      .setDesc('How the decoded codes are written into the note.')
      .addDropdown((dropdown) => dropdown
        .addOptions({ list: 'List', callout: 'Callout' })
        .setValue(this.owner.settings.format)
        .onChange(async (value) => {
          this.owner.settings.format = value as InsertFormat;
          await this.owner.saveSettings();
        }));
  }
}
