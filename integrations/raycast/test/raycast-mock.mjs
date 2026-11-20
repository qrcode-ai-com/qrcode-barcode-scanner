// SPDX-License-Identifier: MIT
// A stand-in for `@raycast/api` with the parts this extension uses. Components are plain
// functions, so a view can be inspected as the element tree it returns. The host state
// (preferences, Finder selection, clipboard) is set by the test through `host`.

export const host = {
  preferences: {},
  /** An array of { path }, or an Error to reject with (Finder not frontmost). */
  finder: [],
  /** What Clipboard.read() resolves to, or an Error to reject with. */
  clipboard: { text: '' },
  opened: [],
  reset() {
    this.preferences = {};
    this.finder = [];
    this.clipboard = { text: '' };
    this.opened = [];
  },
};

function component(name) {
  const fn = (props) => props?.children ?? null;
  Object.defineProperty(fn, 'name', { value: name });
  fn.displayName = name;
  return fn;
}

export const List = Object.assign(component('List'), {
  Item: component('List.Item'),
  Section: component('List.Section'),
  EmptyView: component('List.EmptyView'),
});
export const ActionPanel = Object.assign(component('ActionPanel'), { Section: component('ActionPanel.Section') });
export const Action = Object.assign(component('Action'), {
  CopyToClipboard: component('Action.CopyToClipboard'),
  Paste: component('Action.Paste'),
  OpenInBrowser: component('Action.OpenInBrowser'),
});

export const Icon = new Proxy({}, { get: (_, name) => `icon:${String(name)}` });
export const Color = new Proxy({}, { get: (_, name) => `color:${String(name)}` });
export const Keyboard = { Shortcut: { Common: { Copy: { modifiers: ['cmd', 'shift'], key: 'c' } } } };

export function getPreferenceValues() {
  return { ...host.preferences };
}

export async function getSelectedFinderItems() {
  if (host.finder instanceof Error) throw host.finder;
  return host.finder;
}

export const Clipboard = {
  async read() {
    if (host.clipboard instanceof Error) throw host.clipboard;
    return host.clipboard;
  },
};

export async function openExtensionPreferences() {
  host.opened.push('preferences');
}
