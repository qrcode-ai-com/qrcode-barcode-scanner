// Declaration checks for ./camera-overlay on the Node side of the packed-package runner, with
// the consumer's own TypeScript passed in: the values a declaration file exports, the imported
// names a typecheck file never uses, and the options a typed object literal leaves out.

// [name, 'function' | 'value'] for every value (function or constant) a declaration file
// exports, sorted by name; interfaces and type aliases are not values.
export function valueExports(ts, file) {
  const program = ts.createProgram([file], { noEmit: true, noLib: true, noResolve: true, types: [] });
  const checker = program.getTypeChecker();
  return checker.getExportsOfModule(checker.getSymbolAtLocation(program.getSourceFile(file)))
    .filter(symbol => (symbol.flags & ts.SymbolFlags.Value) !== 0)
    .map(symbol => [symbol.name, (symbol.flags & ts.SymbolFlags.Function) !== 0 ? 'function' : 'value'])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

// One program over FILE with the consumer's compiler options, for the two checks below.
export function declarationProgram(ts, file, compilerOptions) {
  return ts.createProgram([file], { noEmit: true, ...compilerOptions });
}

// The names FILE imports from SPECIFIER that no reference outside its import declarations
// resolves to. The checker resolves each identifier: a property name, an object key or a local
// declaration that shadows the import is not a use of it; a shorthand property and an export
// specifier are.
export function unusedImports(ts, program, file, specifier) {
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const imports = source.statements.filter(node => ts.isImportDeclaration(node));
  const names = imports.filter(node => node.moduleSpecifier.text === specifier).flatMap(node => {
    const clause = node.importClause;
    const bindings = clause?.namedBindings;
    return [clause?.name, bindings && ts.isNamespaceImport(bindings) ? bindings.name : null,
      ...(bindings && ts.isNamedImports(bindings) ? bindings.elements.map(element => element.name) : [])]
      .filter(Boolean);
  });
  const aliases = new Map(names.map(name => {
    const symbol = checker.getSymbolAtLocation(name);
    if (!symbol) throw new Error(`${file}: the import ${name.text} has no symbol`);
    return [symbol, name.text];
  }));
  const used = new Set();
  const visit = node => {
    if (ts.isIdentifier(node)) {
      const { parent } = node;
      const symbol = ts.isShorthandPropertyAssignment(parent) && parent.name === node
        ? checker.getShorthandAssignmentValueSymbol(parent)
        : ts.isExportSpecifier(parent) ? checker.getExportSpecifierLocalTargetSymbol(parent)
          : checker.getSymbolAtLocation(node);
      if (symbol && aliases.has(symbol)) used.add(aliases.get(symbol));
    }
    ts.forEachChild(node, visit);
  };
  source.statements.filter(node => !ts.isImportDeclaration(node)).forEach(visit);
  return [...aliases.values()].filter(name => !used.has(name)).sort();
}

// The variable NAME of FILE is declared with a type and initialized with an object literal. Every
// property of that type is an option: the literal must name each one, and wherever it spells an
// option's value as an object literal (a satisfies clause around it is looked through), every
// property of that option's object type too, at any depth. Returns the dotted paths named and
// left out, the declared type's name and the file that declares it.
export function optionCoverage(ts, program, file, name) {
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  const find = node => (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name
    ? node : ts.forEachChild(node, find));
  const declaration = find(source);
  if (!declaration?.type || !declaration.initializer) throw new Error(`${file}: no typed initializer for ${name}`);
  const bare = node => {
    let current = node;
    while (ts.isParenthesizedExpression(current) || ts.isSatisfiesExpression(current)) current = current.expression;
    return current;
  };
  const keyOf = element => (element.name && (ts.isIdentifier(element.name) || ts.isStringLiteral(element.name))
    ? element.name.text : null);
  const named = [], unnamed = [];
  const walk = (literal, type, path) => {
    const members = (type.isUnion() ? type.types : [type]).filter(member =>
      (member.flags & ts.TypeFlags.Object) !== 0 && member.getCallSignatures().length === 0);
    const properties = new Map();
    for (const member of members) {
      for (const property of checker.getPropertiesOfType(member)) properties.set(property.name, property);
    }
    const given = new Map(literal.properties.map(element => [keyOf(element), element]));
    for (const key of [...properties.keys()].sort()) {
      const at = path ? `${path}.${key}` : key;
      const element = given.get(key);
      if (!element) {
        unnamed.push(at);
        continue;
      }
      named.push(at);
      const value = ts.isPropertyAssignment(element) ? bare(element.initializer) : null;
      if (value && ts.isObjectLiteralExpression(value)) {
        const declared = checker.getTypeOfSymbolAtLocation(properties.get(key), declaration);
        walk(value, checker.getNonNullableType(declared), at);
      }
    }
  };
  const declaredType = checker.getTypeFromTypeNode(declaration.type);
  const initializer = bare(declaration.initializer);
  if (!ts.isObjectLiteralExpression(initializer)) throw new Error(`${file}: ${name} is not an object literal`);
  walk(initializer, declaredType, '');
  const symbol = declaredType.aliasSymbol ?? declaredType.getSymbol();
  return { type: symbol?.name ?? null, declaredIn: symbol?.declarations?.[0]?.getSourceFile().fileName ?? null,
    named, unnamed };
}
