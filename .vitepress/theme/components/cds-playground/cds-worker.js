function simpleSqlFormat(sql) {
  return sql
    .replace(/\b(select|from|where|group by|order by|having|limit|offset|join|left join|right join|inner join|outer join)\b/gi, "\n$1")
    .replace(/\b(and|or)\b/gi, "\n  $1")
    .replace(/,\s*/g, ",\n  ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Store all mutable state on self (the worker's persistent global scope) rather than
// module-level variables. The Vite bundle creates a circular ESM import:
//   cds-worker.js (worker entry, exports Rollup helpers)
//   └─ dynamically imports lib-yVvVtPSy.js
//      └─ statically imports helpers from cds-worker.js  ← circular
// Safari re-evaluates the worker entry module when this circular import is resolved,
// resetting any module-level variables. self properties survive that re-evaluation.
if (!self._cds) {
  self._cds = { cds: null, initPromise: null, sqlLog: [] };
}
const state = self._cds;

function injectLogger(sqlite) {
  if (state.loggerInjected) return;
  state.loggerInjected = true;
  const { prototype } = sqlite().constructor;
  const { prepare: original } = prototype;
  prototype.prepare = function prepare(sql) {
    state.sqlLog.push(sql);
    return original.call(this, sql);
  }
}

/**
 * Compile + deploy (+ optionally serve) a CDS model into a browser-local cds instance.
 *
 * @param {object} payload
 * @param {string | Record<string,string>} payload.model  single-file source (named models)
 *   or a path→content map (the multi-file bookshop model)
 * @param {Record<string,string>} [payload.csvs]  seed data keyed by path
 * @param {string} [payload.namespace]  forced onto the compiled CSN (bookshop)
 * @param {boolean} [payload.serve]  also `cds.serve('all')` so snippets can `cds.connect.to(...)`
 */
async function init({ model, csvs, namespace, serve }) {
  state.cds = (await import('@sap/cds')).default;
  const sqlite = (await import('better-sqlite3')).default;

  await sqlite.initialized; // wait for sqlite3-wasm to be ready (part of polyfill)
  injectLogger(sqlite);

  // unify single-file (named models) and multi-file map (bookshop)
  const csn = state.cds.compile(typeof model === 'string' ? { 'model.cds': model } : model);
  if (namespace) csn.namespace = namespace;
  state.cds.model = state.cds.compile.for.nodejs(csn);

  state.cds.db = await state.cds.connect.to('db');
  await state.cds.deploy(csn, null, csvs ?? {}).to(state.cds.db);

  if (serve) {
    const express = (await import('express')).default;
    const app = express();
    await state.cds.serve('all').from(csn).in(app);
  }

  // `js` snippet bodies reference `cds` as a free identifier; @sap/cds installs SELECT/INSERT/…
  // on the worker global itself, but `cds` is not auto-global, so expose it explicitly.
  self.cds = state.cds;
}

const AsyncFunction = async function () {}.constructor;

// Runs a ```js live``` snippet: rewrites it to return its last expression (compile), then evaluates
// it in the worker's global scope so `cds`, `SELECT`, `INSERT`, … resolve. Async snippets are traced
// for SQL; sync ones return without a SQL tab (matching the pre-worker main-thread behavior).
async function evalJS(code) {
  const cds = state.cds;
  const source = compile(code);

  function resultTabs(result, kind) {
    if (kind === 'json') {
      let yaml
      try { yaml = cds.compile.to.yaml(result) } catch {/* ignore */}
      if (yaml) return [
        { value: yaml, kind: 'yaml', name: 'Result (as yaml)' },
        { value: JSON.stringify(result, null, 2), kind: 'json', name: 'Result (raw)' },
      ]
    }
    return [{ value: result ? typeof result !== 'string' ? JSON.stringify(result, null, 2) : result : "success", kind, name: 'Result' }]
  }

  let fn;
  try { fn = new AsyncFunction(source) }
  catch { fn = new AsyncFunction(code) } // rewrite had a syntax error -> run the code unmodified
  state.sqlLog.length = 0;
  let result = await fn();
  if (result?.__return) result = result.__return
  const formatted = state.sqlLog.map(simpleSqlFormat).join('\n\n-------\n');
  const kind = result ? 'json' : 'plaintext'
  return [
    ...resultTabs(result, kind),
    { value: formatted, kind: 'sql', name: 'SQL' }
  ];
}

// Runs a ```cds live``` / ```cql live``` snippet: cds.ql(query) -> cds.db.run, traced for SQL.
async function runQuery(query) {
  state.sqlLog.length = 0;
  const cqn = state.cds.ql(query);
  const result = await state.cds.db.run(cqn);
  const formatted = state.sqlLog.map(simpleSqlFormat).join('\n\n-------\n');
  return [
    { value: result, kind: 'json', name: 'Result' },
    { value: formatted, kind: 'sql', name: 'SQL' },
    { value: cqn, kind: 'json', name: 'CQN' },
  ];
}

self.onmessage = async ({ data: { type, id, payload } }) => {
  try {
    if (type === 'init') {
      state.initPromise = init(payload);
      await state.initPromise;
      self.postMessage({ type: 'ready' });
    } else if (type === 'run') {
      if (!state.initPromise) throw new Error('Worker not initialized');
      await state.initPromise;
      const result = payload.language === 'js'
        ? await evalJS(payload.query)
        : await runQuery(payload.query);
      self.postMessage({ type: 'result', id, result });
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, error: err.message ?? String(err), stack: err.stack });
  }
};

// ---- ```js live``` source rewriting helpers (moved here from runners.js) ----

function compile(code) {
  const stmts = splitTopLevelStatements(code)
  if (!stmts.length) return code
  const last = stmts[stmts.length - 1]

  // last statement already returns, or is a control-flow/declaration keyword -> leave the code as is
  if (/^(return|throw|if|for|while|function|class|import|export)\b/.test(last.text)) return code

  // anchored right after the keyword so we don't match "=" occurring inside the initializer, e.g. in a template literal
  const declRe = /^(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=/
  if (declRe.test(last.text)) {
    // last statement declares a variable, e.g. "let result = 1+1" -> collect all top-level declarations in the
    // snippet so earlier ones aren't silently dropped, e.g. comparing "let q = ...; let p = ..." side by side
    const names = stmts.map(s => s.text.match(declRe)?.[1]).filter(Boolean)
    return names.length > 1
      ? `${code}\nreturn { ${names.join(', ')} };`
      : `${code}\nreturn { __return: (${names[0]}) };`
  }

  // last statement isn't a declaration -> treat it (possibly spanning multiple lines) as the expression to return
  return `${code.slice(0, last.start)}\nreturn { __return: (\n${last.text.replace(/;\s*$/, '')}\n) };`
}


// splits code into its top-level statements (ignoring newlines/semicolons nested inside brackets, strings,
// template literals or comments), so multi-line statements like object literals are kept intact as one unit
function splitTopLevelStatements(code) {
  const scrubbed = blankComments(code) // same length as code, but with comments replaced by spaces
  const stmts = []
  let start = 0, depth = 0, i = 0
  while (i < scrubbed.length) {
    const c = scrubbed[i]
    if (c === '"' || c === "'") { i = skipString(scrubbed, i, c); continue }
    if (c === '`') { i = skipTemplate(scrubbed, i); continue }
    if (c === '(' || c === '{' || c === '[') { depth++; i++; continue }
    if (c === ')' || c === '}' || c === ']') { depth--; i++; continue }
    if (depth <= 0 && (c === ';' || c === '\n')) {
      const text = scrubbed.slice(start, i).trim()
      if (text) stmts.push({ text, start })
      i++; start = i; continue
    }
    i++
  }
  const text = scrubbed.slice(start).trim()
  if (text) stmts.push({ text, start })
  return stmts
}

// replaces line and block comments with spaces of the same length, so a trailing comment (e.g. after the last
// statement, or commented-out code on its own line) is never mistaken for code, while offsets stay unchanged
function blankComments(code) {
  let out = ''
  let i = 0
  while (i < code.length) {
    const c = code[i]
    if (c === '/' && code[i + 1] === '/') { while (i < code.length && code[i] !== '\n') { out += ' '; i++ }; continue }
    if (c === '/' && code[i + 1] === '*') {
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) { out += code[i] === '\n' ? '\n' : ' '; i++ }
      out += '  '; i += 2; continue
    }
    if (c === '"' || c === "'") { const j = skipString(code, i, c); out += code.slice(i, j); i = j; continue }
    if (c === '`') { const j = skipTemplate(code, i); out += code.slice(i, j); i = j; continue }
    out += c; i++
  }
  return out
}

// skips a single- or double-quoted string starting at code[i], returning the index right after the closing quote
function skipString(code, i, quote) {
  i++
  while (i < code.length && code[i] !== quote) { if (code[i] === '\\') i++; i++ }
  return i + 1
}

// skips a template literal starting at code[i] (the opening backtick), diving into ${...} interpolations
function skipTemplate(code, i) {
  i++
  while (i < code.length) {
    if (code[i] === '\\') { i += 2; continue }
    if (code[i] === '`') return i + 1
    if (code[i] === '$' && code[i + 1] === '{') { i = skipBraces(code, i + 2); continue }
    i++
  }
  return i
}

// skips forward to the '}' balancing the '${' whose contents start at code[i]
function skipBraces(code, i) {
  let depth = 1
  while (i < code.length && depth > 0) {
    const c = code[i]
    if (c === '"' || c === "'") { i = skipString(code, i, c); continue }
    else if (c === '`') { i = skipTemplate(code, i); continue }
    else if (c === '{') depth++
    else if (c === '}') depth--
    i++
  }
  return i
}
