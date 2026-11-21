// SPDX-License-Identifier: MIT
// The part of Make's IML and request handling this app relies on, so the tests can send the app's
// own requests to a scan service and read its answers as Make would. Every {{…}} expression in the
// app's files must be one this evaluator knows: EXPRESSIONS lists them, and a test checks that the
// app uses exactly that list, so a new expression cannot pass untested.

export const EXPRESSIONS = new Set([
  'connection.baseUrl',
  'parameters.baseUrl',
  'statusCode',
  'body.error.code',
  'body.error.message',
  'body.service',
  'body.engine',
  'parameters.mode',
  'parameters.data',
  'parameters.fileName',
  'length(body.detections)',
  'body.detections',
  'body.score',
  'body.hints',
  'body.trace',
  'body.versions',
  'parameters.url',
  'parameters.method',
  "toCollection(parameters.headers, 'key', 'value')",
  "toCollection(parameters.qs, 'key', 'value')",
  'parameters.body',
  'body',
  'headers',
  '...',
]);

const TOKEN = /\{\{([^{}]+)\}\}/g;
const lookup = (context, path) => path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), context);

/** Every expression in a parsed app file, in its keys and its strings. */
export function expressionsIn(value, found = new Set()) {
  if (typeof value === 'string') for (const [, expression] of value.matchAll(TOKEN)) found.add(expression);
  else if (Array.isArray(value)) value.forEach((item) => expressionsIn(item, found));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      expressionsIn(key, found);
      expressionsIn(item, found);
    }
  }
  return found;
}

export function evaluate(expression, context) {
  if (!EXPRESSIONS.has(expression)) throw new Error(`IML expression outside the tested set: ${expression}`);
  let match = /^length\(([\w.]+)\)$/.exec(expression);
  if (match) {
    const value = lookup(context, match[1]);
    return Array.isArray(value) ? value.length : 0;
  }
  match = /^toCollection\(([\w.]+), 'key', 'value'\)$/.exec(expression);
  if (match) return Object.fromEntries((lookup(context, match[1]) ?? []).map((item) => [item.key, item.value]));
  return lookup(context, expression);
}

/** A value of an app file with its expressions replaced, as Make renders it. */
export function render(value, context) {
  if (typeof value === 'string') {
    const whole = /^\{\{([^{}]+)\}\}$/.exec(value);
    if (whole) return evaluate(whole[1], context);
    return value.replace(TOKEN, (_, expression) => {
      const result = evaluate(expression, context);
      return result == null ? '' : String(result);
    });
  }
  if (Array.isArray(value)) return value.map((item) => render(item, context));
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === '{{...}}') Object.assign(out, render(item, context));
      else out[key] = render(item, context);
    }
    return out;
  }
  return value;
}

/**
 * Send one communication as Make does: the base's URL and headers under a relative URL, the query
 * string, a multipart or text body. Resolves with { statusCode, headers, body, output } or
 * { statusCode, error: { type, message } }, as the module would end.
 */
export async function send({ base = null, communication, connection, parameters }) {
  const context = { connection, parameters };
  const url = render(communication.url, context);
  const absolute = base && url.startsWith('/') ? render(base.baseUrl, context) + url : url;
  const target = new URL(absolute);
  for (const [key, value] of Object.entries(render(communication.qs ?? {}, context))) {
    if (value !== undefined && value !== null && value !== '') target.searchParams.append(key, String(value));
  }
  const headers = { ...render(base?.headers ?? {}, context), ...render(communication.headers ?? {}, context) };
  const method = render(communication.method ?? 'GET', context);
  let body;
  if (communication.type === 'multipart/form-data') {
    body = new FormData();
    for (const [name, field] of Object.entries(render(communication.body ?? {}, context))) {
      if (field && typeof field === 'object' && 'value' in field) {
        body.append(name, new Blob([field.value]), field.options?.filename);
      } else body.append(name, String(field));
    }
  } else if (communication.body !== undefined) {
    const rendered = render(communication.body, context);
    if (rendered !== undefined && rendered !== null && rendered !== '') body = typeof rendered === 'string' ? rendered : JSON.stringify(rendered);
  }
  const response = await fetch(target, { method, headers, body });
  const text = await response.text();
  const json = (response.headers.get('content-type') ?? '').startsWith('application/json');
  const answer = {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers),
    body: json && text !== '' ? JSON.parse(text) : text,
  };
  const outcome = { ...context, ...answer };
  if (response.status >= 400) {
    const spec = { ...(base?.response?.error ?? {}), ...(communication.response?.error ?? {}) };
    const specific = spec[String(response.status)] ?? {};
    const type = specific.type ?? spec.type ?? (response.status >= 500 ? 'ConnectionError' : 'RuntimeError');
    return { statusCode: response.status, error: { type, message: render(specific.message ?? spec.message, outcome) } };
  }
  const output = communication.response?.output;
  const metadata = communication.response?.metadata;
  return {
    ...answer,
    output: output === undefined ? answer.body : render(output, outcome),
    metadata: metadata === undefined ? undefined : render(metadata, outcome),
  };
}
