// SPDX-License-Identifier: MIT
// The panel: the selection state, the profile, an optional expected text, the scan button and
// the codes found, each with its format, its kind and its exact text. Built from Canva's App UI
// Kit so it follows the editor's light and dark themes.
//
// For the tests in test/canva-csp.mjs the panel keeps a small DOM contract, the same as the other
// scanner pages of this repository: #result carries data-state and data-scan, #summary the
// sentence, .detection[data-symbology] .text each decoded text, and #report-json (hidden until
// asked for) the report of the first image with data-scan and data-profile.
import {
  Alert, Badge, Button, FormField, Rows, SegmentedControl, Text, TextInput, Title,
} from '@canva/app-ui-kit';
import { requestOpenExternalUrl } from '@canva/platform';
import { useState, useSyncExternalStore } from 'react';
import { useIntl } from 'react-intl';
import { MAX_IMAGES } from './controller.js';
import { ENGINE } from './engine.js';
import { KIND_MESSAGES, messages } from './messages.js';
import { DEFAULT_PROFILE, describeDetections } from './results.js';

export const SOURCE_URL = 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust';

const FORMAT_NAMES = { png: 'PNG', jpeg: 'JPEG', webp: 'WebP', gif: 'GIF' };

function errorText(intl, error) {
  switch (error?.kind) {
    case 'no-selection': return intl.formatMessage(messages.errorNoSelection);
    case 'selection': return intl.formatMessage(messages.errorSelection);
    case 'network': return intl.formatMessage(messages.errorNetwork);
    case 'http': return intl.formatMessage(messages.errorHttp, { status: String(error.detail) });
    case 'too-large': return intl.formatMessage(messages.errorTooLarge);
    case 'unsupported':
      return intl.formatMessage(messages.errorUnsupported, { format: String(error.detail).toUpperCase() });
    case 'engine': return intl.formatMessage(messages.errorEngine, { detail: String(error.detail) });
    default: return intl.formatMessage(messages.errorScan, { detail: String(error?.detail ?? '') });
  }
}

function summaryText(intl, state) {
  const count = state.items.reduce((sum, item) => sum + (item.report?.detections.length ?? 0), 0);
  switch (state.phase) {
    case 'loading': return intl.formatMessage(messages.loading);
    case 'scanning': {
      const profile = intl.formatMessage(messages[`profile${state.profile[0].toUpperCase()}${state.profile.slice(1)}`]);
      return intl.formatMessage(messages.scanning, { count: Math.min(state.selected, MAX_IMAGES), profile });
    }
    case 'result': return intl.formatMessage(messages.found, { count });
    case 'empty': return intl.formatMessage(messages.empty);
    case 'inconclusive': return intl.formatMessage(messages.inconclusive);
    case 'error': return errorText(intl, state.error);
    default: return '';
  }
}

function Detection({ row }) {
  const intl = useIntl();
  return (
    <li className="detection" data-symbology={row.symbology}>
      <Rows spacing="0.5u">
        <Text variant="bold" size="small">
          {`${row.format} · ${intl.formatMessage(KIND_MESSAGES[row.kind])}`}
        </Text>
        <span className="text" style={{ overflowWrap: 'anywhere', userSelect: 'text' }}>
          <Text size="medium">{row.shown}</Text>
        </span>
        {row.matches !== null && (
          <div style={{ display: 'flex' }}>
            {row.matches
              ? <Badge tone="positive" text={intl.formatMessage(messages.matches)} />
              : <Badge tone="critical" text={intl.formatMessage(messages.differs)} />}
          </div>
        )}
        {row.hidden > 0 && (
          <Text size="small" tone="secondary">{intl.formatMessage(messages.hidden, { count: row.hidden })}</Text>
        )}
        {row.lossy && <Text size="small" tone="secondary">{intl.formatMessage(messages.lossy)}</Text>}
      </Rows>
    </li>
  );
}

function ImageResult({ item, number, expected }) {
  const intl = useIntl();
  if (!item.report) {
    return <Alert tone="critical">{errorText(intl, item.error)}</Alert>;
  }
  const rows = describeDetections(item.report, expected);
  return (
    <Rows spacing="1u">
      <Text size="small" tone="secondary">
        {intl.formatMessage(messages.imageHeading, {
          number, format: FORMAT_NAMES[item.format] ?? item.format, size: Math.ceil(item.bytes / 1024),
        })}
      </Text>
      <ul className="detections" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '12px' }}>
        {rows.map((row) => <Detection key={row.index} row={row} />)}
      </ul>
    </Rows>
  );
}

export function App({ scanner }) {
  const intl = useIntl();
  const state = useSyncExternalStore(scanner.subscribe, scanner.getState);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [expected, setExpected] = useState('');
  const [showReport, setShowReport] = useState(false);
  const busy = state.phase === 'loading' || state.phase === 'scanning';
  const first = state.items[0]?.report ?? null;
  const tone = state.phase === 'error' ? 'critical' : state.phase === 'inconclusive' ? 'warn' : 'info';
  const options = ['full', 'fast', 'frame'].map((value) => ({
    value,
    label: intl.formatMessage(messages[`profile${value[0].toUpperCase()}${value.slice(1)}`]),
  }));

  return (
    // The same padding as Canva's starter kit: Canva's panel keeps the left edge.
    <div style={{ padding: 'var(--ui-kit-space-200) var(--ui-kit-space-200) var(--ui-kit-space-200) 0' }}>
      <Rows spacing="2u">
        <Title size="small">{intl.formatMessage(messages.title)}</Title>
        <Text>{intl.formatMessage(messages.intro)}</Text>
        <Text size="small" tone="secondary">{intl.formatMessage(messages.original)}</Text>
        <div id="selection" data-count={state.selected}>
          <Text variant="bold" size="small">
            {state.selected === 0
              ? intl.formatMessage(messages.selectedNone)
              : intl.formatMessage(messages.selectedSome, { count: state.selected })}
          </Text>
          {state.selected > MAX_IMAGES && (
            <Text size="small" tone="secondary">{intl.formatMessage(messages.selectedMany, { max: MAX_IMAGES })}</Text>
          )}
        </div>
        <FormField
          label={intl.formatMessage(messages.profile)}
          description={intl.formatMessage(messages.profileHelp)}
          value={profile}
          control={(props) => (
            <div id="profile" data-value={profile}>
              <SegmentedControl {...props} options={options} value={profile} onChange={setProfile} />
            </div>
          )}
        />
        <FormField
          label={intl.formatMessage(messages.expected)}
          labelMarker="optional"
          description={intl.formatMessage(messages.expectedHelp)}
          value={expected}
          control={(props) => <TextInput {...props} value={expected} onChange={setExpected} />}
        />
        <Button
          variant="primary"
          stretch
          loading={state.phase === 'scanning'}
          disabled={busy || state.selected === 0}
          onClick={() => scanner.scan(profile)}
        >
          {intl.formatMessage(messages.scan)}
        </Button>
        <div id="result" data-state={state.phase} data-scan={state.scan} aria-live="polite">
          <Rows spacing="2u">
            {state.phase !== 'ready' && (
              <div id="summary">
                {state.phase === 'result' || state.phase === 'empty' || state.phase === 'loading' || state.phase === 'scanning'
                  ? <Text>{summaryText(intl, state)}</Text>
                  : <Alert tone={tone}>{summaryText(intl, state)}</Alert>}
              </div>
            )}
            {state.items.length > 0 && state.phase !== 'error' && state.items.map((item, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <ImageResult key={index} item={item} number={index + 1} expected={expected} />
            ))}
            {state.phase === 'result' && (
              <Text size="small" tone="secondary">{intl.formatMessage(messages.untrusted)}</Text>
            )}
          </Rows>
        </div>
        {first && (
          <Button variant="tertiary" onClick={() => setShowReport(!showReport)}>
            {intl.formatMessage(showReport ? messages.hideReport : messages.showReport)}
          </Button>
        )}
        <pre
          id="report-json"
          data-scan={first ? state.scan : 0}
          data-profile={first ? state.profile : ''}
          hidden={!showReport || !first}
          style={{ maxHeight: '320px', overflow: 'auto', fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
        >
          {first ? JSON.stringify(first, null, 2) : ''}
        </pre>
        <Rows spacing="1u">
          <Text size="xsmall" tone="tertiary">
            <span id="about" data-package={ENGINE.package} data-version={ENGINE.version}
              data-wasm-sha256={ENGINE.wasm_sha256} data-engine-version={state.engineVersion ?? ''}>
              {intl.formatMessage(messages.about, { version: ENGINE.version })}
            </span>
          </Text>
          <Text size="xsmall" tone="tertiary">{intl.formatMessage(messages.license)}</Text>
          <Button variant="tertiary" onClick={() => requestOpenExternalUrl({ url: SOURCE_URL })}>
            {intl.formatMessage(messages.source)}
          </Button>
        </Rows>
      </Rows>
    </div>
  );
}
