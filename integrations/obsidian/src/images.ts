// SPDX-License-Identifier: MIT
// The images a note embeds or links, resolved through Obsidian's link index.
import type { App, CachedMetadata, TFile } from 'obsidian';

/** The image types the engine decodes. */
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

export function isImage(file: { extension: string }): boolean {
  return IMAGE_EXTENSIONS.includes(file.extension.toLowerCase());
}

export interface NoteImages {
  /** Each image once, the one on LINE first when given, then in note order. */
  images: TFile[];
  /** Image links that point to no file of the vault. */
  missing: string[];
}

function linkPath(link: string): string {
  const hash = link.indexOf('#');
  return hash >= 0 ? link.slice(0, hash) : link;
}

function looksLikeImage(path: string): boolean {
  const dot = path.lastIndexOf('.');
  return dot >= 0 && IMAGE_EXTENSIONS.includes(path.slice(dot + 1).toLowerCase());
}

/** The images NOTE embeds or links, from its metadata cache. */
export function imagesOfNote(app: App, note: TFile, line?: number): NoteImages {
  const cache: CachedMetadata | null = app.metadataCache.getFileCache(note);
  const references = [...(cache?.embeds ?? []), ...(cache?.links ?? [])]
    .sort((a, b) => a.position.start.offset - b.position.start.offset);
  const found = new Map<string, { file: TFile; onLine: boolean }>();
  const missing: string[] = [];
  for (const reference of references) {
    const path = linkPath(reference.link);
    if (!path) continue;
    const file = app.metadataCache.getFirstLinkpathDest(path, note.path);
    if (!file) {
      if (looksLikeImage(path) && !missing.includes(path)) missing.push(path);
      continue;
    }
    if (!isImage(file)) continue;
    const onLine = line !== undefined && reference.position.start.line <= line && line <= reference.position.end.line;
    const known = found.get(file.path);
    if (!known) found.set(file.path, { file, onLine });
    else if (onLine) known.onLine = true;
  }
  const entries = [...found.values()];
  const images = [...entries.filter((entry) => entry.onLine), ...entries.filter((entry) => !entry.onLine)].map((entry) => entry.file);
  return { images, missing };
}
