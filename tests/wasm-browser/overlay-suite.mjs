// The rendered overlay suite (crates/qrcode-ai-scanner-wasm/camera-overlay.test.mjs) as the
// packed-package runner reports it. Its source gives the engines each case declares; its
// spec-reporter output (node --test-reporter=spec) gives each case's outcome and the diagnostics
// printed after it. A case runs only in the enabled engines it declares. Every enabled engine a
// case does not declare, and every diagnostic other than a not-enabled line or a measurement
// line, is an exception: that part of the case did not run there, so the runner lists it as
// unverified instead of counting it as passed.
export const ENGINES = ['chromium', 'firefox', 'webkit'];

// The line the suite prints for a declared engine that is not enabled.
const NOT_ENABLED = /^(chromium|firefox|webkit) not run \(QRSCAN_TEST_[A-Z]+=1 enables it\)$/;
// Lines the suite prints beside checks that did run: values it measured, not checks left out.
// Any other diagnostic counts as an exception, an unknown one included.
const MEASURED = [
  /^(?:chromium|firefox|webkit) [\w-]+: scrollLeft -?\d+(?:\.\d+)?, after the wheel -?\d+(?:\.\d+)?$/,
  /^\d+ Hz, [^:]+: activations at [\d,.-]* ms$/,
];
const ENGINE_FIRST = /^(chromium|firefox|webkit)\b/;

// Every rendered(NAME, BODY, OPTIONS) call: NAME a string literal; its engines from
// OPTIONS.engines, else the default of rendered()'s own engines parameter. An engine list is an
// array literal of engine names or a top-level const holding one. Whatever cannot be read this
// way (a computed name, a spread, a variable) is a problem: where that case ran is then unknown.
export function suiteDeclarations(ts, file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const problems = [], cases = {};
  const at = node => `line ${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`;
  const literal = node => (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text : null);
  const keyOf = node => (node && (ts.isIdentifier(node) || ts.isStringLiteral(node)) ? node.text : null);
  const constants = new Map();
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        constants.set(declaration.name.text, declaration.initializer);
      }
    }
  }
  const engines = node => {
    const value = node && ts.isIdentifier(node) ? constants.get(node.text) : node;
    if (!value || !ts.isArrayLiteralExpression(value)) return null;
    const names = value.elements.map(literal);
    return names.length > 0 && names.every(name => ENGINES.includes(name))
      ? ENGINES.filter(name => names.includes(name)) : null;
  };
  const declaration = source.statements.find(statement => ts.isFunctionDeclaration(statement)
    && statement.name?.text === 'rendered');
  const pattern = declaration?.parameters[2]?.name;
  const binding = pattern && ts.isObjectBindingPattern(pattern)
    ? pattern.elements.find(element => keyOf(element.propertyName ?? element.name) === 'engines') : undefined;
  const defaults = engines(binding?.initializer);
  if (!defaults) problems.push('rendered() gives its engines parameter no default read here');
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'rendered') {
      const [nameNode, , options] = node.arguments;
      const name = literal(nameNode);
      let declared = defaults;
      if (options) {
        const readable = ts.isObjectLiteralExpression(options)
          && !options.properties.some(property => ts.isSpreadAssignment(property));
        const property = readable
          ? options.properties.find(item => keyOf(item.name) === 'engines') : undefined;
        if (!readable) declared = null;
        else if (property) {
          declared = ts.isPropertyAssignment(property) ? engines(property.initializer)
            : ts.isShorthandPropertyAssignment(property) ? engines(property.name) : null;
        }
      }
      if (name === null) problems.push(`the rendered() call at ${at(node)} has no literal name`);
      else if (declared === null) problems.push(`"${name}" (${at(node)}): engines not read here`);
      else if (Object.hasOwn(cases, name)) problems.push(`"${name}" is declared twice`);
      else cases[name] = declared;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { defaults, cases, problems };
}

// The spec reporter's top-level lines: each case result (✔ passed, ✖ failed, ﹣ skipped) with
// the diagnostics (ℹ) printed after it, up to the summary, which starts at "ℹ tests N". Color
// codes, which FORCE_COLOR adds even on a pipe, are removed first.
export function suiteRun(output) {
  const lines = output.replace(/\u001b\[[0-9;]*m/g, '').split(/\r?\n/);
  const summary = lines.findLastIndex(line => /^ℹ tests \d+$/.test(line));
  const counts = Object.fromEntries((summary < 0 ? [] : lines.slice(summary))
    .map(line => /^ℹ (\w+) (\d+(?:\.\d+)?)$/.exec(line)).filter(Boolean).map(match => [match[1], Number(match[2])]));
  const cases = [], orphans = [];
  for (const line of summary < 0 ? lines : lines.slice(0, summary)) {
    const result = /^(✔|✖|﹣) (.+) \(\d+(?:\.\d+)?ms\)(?: # (SKIP|TODO)\b.*)?$/.exec(line);
    if (result) {
      const outcome = result[3] ? result[3].toLowerCase() : { '✔': 'pass', '✖': 'fail', '﹣': 'skip' }[result[1]];
      cases.push({ name: result[2], outcome, diagnostics: [] });
      continue;
    }
    const diagnostic = /^ℹ (.*)$/.exec(line);
    if (diagnostic) (cases.length ? cases.at(-1).diagnostics : orphans).push(diagnostic[1]);
  }
  return { counts, cases, orphans };
}

// Per case printed, the enabled engines it ran in, and every exception as { case, engine,
// reason } (engine null when the line names none). Problems are what keeps the runner from
// telling where a case ran: a case no declaration names, a diagnostic before any case, or
// not-enabled lines that differ from the ones the declaration read here makes the suite print.
export function suiteCoverage({ declarations, run, enabled }) {
  const problems = [...declarations.problems], partial = [], ranIn = {};
  if (run.orphans.length) problems.push(`diagnostics before any case: ${run.orphans.join('; ')}`);
  const sameSet = (a, b) => a.length === b.length && a.every(item => b.includes(item));
  for (const item of run.cases) {
    const declared = declarations.cases[item.name];
    if (!declared) {
      problems.push(`"${item.name}" ran, but no rendered() call declares it`);
      continue;
    }
    ranIn[item.name] = declared.filter(engine => enabled.includes(engine));
    if (item.outcome !== 'pass') partial.push({ case: item.name, engine: null, reason: `outcome ${item.outcome}` });
    if (ranIn[item.name].length === 0) {
      partial.push({ case: item.name, engine: null, reason: 'it declares no enabled engine' });
    }
    for (const engine of enabled.filter(name => !declared.includes(name))) {
      partial.push({ case: item.name, engine, reason: `it runs in ${declared.join(', ')} only` });
    }
    const leftOut = [];
    for (const text of item.diagnostics) {
      const hint = NOT_ENABLED.exec(text);
      if (hint) leftOut.push(hint[1]);
      else if (!MEASURED.some(measured => measured.test(text))) {
        partial.push({ case: item.name, engine: ENGINE_FIRST.exec(text)?.[1] ?? null, reason: text });
      }
    }
    const expected = declared.filter(engine => !enabled.includes(engine));
    if (!sameSet(leftOut, expected)) {
      problems.push(`"${item.name}": not-enabled lines for [${leftOut.join(', ')}], where its declaration ` +
        `gives [${expected.join(', ')}]`);
    }
  }
  return { ranIn, partial, problems };
}

// The suite's output judged as a whole: its counts, the engines at least one case ran in, the
// engines it printed as not enabled, where each case ran and every exception, with the problems
// above. The runner asserts the counts and engines and that no problem was found, and lists each
// exception as unverified.
export function overlaySuiteReport({ ts, file, text, output, enabled }) {
  const run = suiteRun(output);
  const coverage = suiteCoverage({ declarations: suiteDeclarations(ts, file, text), run, enabled });
  const ranSomewhere = engine => Object.values(coverage.ranIn).some(engines => engines.includes(engine));
  const printedNotEnabled = engine => run.cases.some(item =>
    item.diagnostics.some(line => NOT_ENABLED.exec(line)?.[1] === engine));
  return { engines: ENGINES.filter(ranSomewhere), notEnabled: ENGINES.filter(printedNotEnabled),
    tests: run.counts.tests ?? NaN, pass: run.counts.pass ?? NaN, fail: run.counts.fail ?? NaN,
    printed: run.cases.length, ranIn: coverage.ranIn, partial: coverage.partial, problems: coverage.problems };
}
