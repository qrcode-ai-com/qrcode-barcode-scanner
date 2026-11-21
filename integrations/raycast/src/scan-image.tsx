// SPDX-License-Identifier: MIT
// Scan Image for Codes: reads the image selected in Finder, or the image file on the clipboard,
// with qrscan, and lists the codes. Decoded text is only shown, copied or pasted; nothing in it
// is opened.
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  getPreferenceValues,
  getSelectedFinderItems,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  allTexts,
  findQrscan,
  INSTALL_COMMAND,
  INSTALL_GUIDE,
  pickImage,
  PROFILES,
  QrscanMissingError,
  reportText,
  scanFile,
  TIME_LIMITS,
  UnreadableImageError,
  type Profile,
  type ScanResult,
  type Score,
  type TimeLimit,
} from "./qrscan";

/** The two-dimensional formats, shown with a grid icon; the others are barcodes. */
const MATRIX = new Set([
  "qr_code",
  "micro_qr_code",
  "rectangular_micro_qr_code",
  "data_matrix",
  "aztec",
  "maxi_code",
  "pdf417",
]);

/** The preferences of package.json. */
export interface ScanPreferences {
  qrscanPath?: string;
  profile?: string;
  timeLimit?: string;
}

export type ScanState =
  | { kind: "loading" }
  | { kind: "result"; result: ScanResult; name: string }
  | { kind: "none"; reason: string }
  | { kind: "missing"; looked: string[] }
  | { kind: "unreadable"; name: string; message: string }
  | { kind: "failed"; message: string };

/** Finds the image and qrscan, scans, and says what happened. It never throws. */
export async function loadScan(): Promise<ScanState> {
  const preferences = getPreferenceValues<ScanPreferences>();
  const profile: Profile = PROFILES.includes(preferences.profile as Profile)
    ? (preferences.profile as Profile)
    : "full";
  const limit: TimeLimit = TIME_LIMITS.includes(preferences.timeLimit as TimeLimit)
    ? (preferences.timeLimit as TimeLimit)
    : "profile";
  const picked = await pickImage({ finder: getSelectedFinderItems, clipboard: () => Clipboard.read() });
  if (picked.kind === "none") return { kind: "none", reason: picked.reason };
  try {
    const qrscan = await findQrscan(preferences.qrscanPath);
    return { kind: "result", result: await scanFile(qrscan, picked.path, profile, { limit }), name: picked.name };
  } catch (error) {
    if (error instanceof QrscanMissingError) return { kind: "missing", looked: error.looked };
    if (error instanceof UnreadableImageError) return { kind: "unreadable", name: picked.name, message: error.message };
    return { kind: "failed", message: error instanceof Error ? error.message : String(error) };
  }
}

/** One line for the list: the text with its line breaks shown, as the list item has one line. */
export function oneLine(text: string): string {
  return text === "" ? "(empty)" : text.replace(/\r\n|\r|\n/g, " ↵ ");
}

function budgetNote(result: ScanResult): string {
  return `The ${result.profile} profile ran out of time before the scan ended. Choose the full profile, or no time limit, in the preferences to search longer.`;
}

const PLACEHOLDER = "Filter the codes";

/** The tag of the judged code: its score and grade, colored by grade. */
export function scoreTag(score: Score): { value: string; color: Color } {
  const color =
    score.grade === "excellent" || score.grade === "good"
      ? Color.Green
      : score.grade === "acceptable"
        ? Color.Yellow
        : Color.Red;
  return { value: `Score ${score.value} · ${score.grade}`, color };
}

export function ScanView({ state }: { state: ScanState }) {
  if (state.kind === "loading") return <List isLoading searchBarPlaceholder={PLACEHOLDER} />;
  if (state.kind === "missing") {
    return (
      <List searchBarPlaceholder={PLACEHOLDER}>
        <List.EmptyView
          icon={Icon.Terminal}
          title="qrscan is not installed"
          description={`Install it with ${INSTALL_COMMAND}, or set its path in the preferences. Looked in ${state.looked.join(", ")}.`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Install Command" content={INSTALL_COMMAND} />
              <Action.OpenInBrowser title="Open Install Guide" url={INSTALL_GUIDE} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  if (state.kind === "none") {
    return (
      <List searchBarPlaceholder={PLACEHOLDER}>
        <List.EmptyView icon={Icon.Image} title="No image to scan" description={state.reason} />
      </List>
    );
  }
  if (state.kind === "unreadable") {
    return (
      <List searchBarPlaceholder={PLACEHOLDER}>
        <List.EmptyView
          icon={Icon.Warning}
          title={`${state.name} could not be read as an image`}
          description={state.message}
        />
      </List>
    );
  }
  if (state.kind === "failed") {
    return (
      <List searchBarPlaceholder={PLACEHOLDER}>
        <List.EmptyView icon={Icon.Warning} title="The scan failed" description={state.message} />
      </List>
    );
  }
  const { result, name } = state;
  if (result.codes.length === 0) {
    return (
      <List searchBarPlaceholder={PLACEHOLDER}>
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No QR code or barcode found"
          description={result.budgetExhausted ? budgetNote(result) : `qrscan found no code in ${name}.`}
        />
      </List>
    );
  }
  const all = allTexts(result.codes);
  const report = reportText(result);
  const count = result.codes.length === 1 ? "1 code" : `${result.codes.length} codes`;
  return (
    <List searchBarPlaceholder={PLACEHOLDER}>
      <List.Section title={name} subtitle={result.budgetExhausted ? `${count} · ${budgetNote(result)}` : count}>
        {result.codes.map((code, index) => (
          <List.Item
            key={`${index}`}
            icon={MATRIX.has(code.symbology) ? Icon.AppWindowGrid3x3 : Icon.BarCode}
            title={oneLine(code.text)}
            subtitle={code.label}
            keywords={[code.label, code.symbology]}
            accessories={[
              ...(code.complete ? [] : [{ tag: { value: "incomplete text", color: Color.Orange } }]),
              ...(index === 0 && result.score ? [{ tag: scoreTag(result.score) }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Text" content={code.text} />
                <Action.Paste title="Paste Text" content={code.text} />
                <Action.CopyToClipboard title="Copy All Texts" content={all} shortcut={Keyboard.Shortcut.Common.Copy} />
                <Action.CopyToClipboard
                  title="Copy Scan Report"
                  content={report}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  const [state, setState] = useState<ScanState>({ kind: "loading" });
  useEffect(() => {
    let live = true;
    void loadScan().then((next) => {
      if (live) setState(next);
    });
    return () => {
      live = false;
    };
  }, []);
  return <ScanView state={state} />;
}
