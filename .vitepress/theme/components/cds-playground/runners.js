function simpleSqlFormat(sql) {
  return sql
    .replace(/\b(select|from|where|group by|order by|having|limit|offset|join|left join|right join|inner join|outer join)\b/gi, "\n$1")
    .replace(/\b(and|or)\b/gi, "\n  $1")
    .replace(/,\s*/g, ",\n  ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

let sql;
function injectLogger(sqlite) {
  const sqlLog = [];
  const { prototype } = sqlite().constructor;
  const { prepare : original } = prototype;
  prototype.prepare = function prepare(sql) {
    sqlLog.push(sql);
    return original.call(this, sql);
  }

  sqlLog.trace = async function trace(cb) {
    sqlLog.length = 0;
    const result = await cb();
    return {result, trace: [...sqlLog], formatted: sqlLog.map(simpleSqlFormat).join('\n\n-------\n')};
  }

  sql = sqlLog;
  return sqlLog;
}

/** @returns {Promise<import('@sap/cds')>} */
async function initialize() {
  const cds = (await import('@sap/cds')).default;
  const express = (await import('express')).default;
  const templates = (await import('virtual:templates')).default;
  const sqlite = (await import('better-sqlite3')).default;

  const { bookshop } = templates
  const model = Object.fromEntries(bookshop
    ?.filter(file => file.path.endsWith('.cds') || file.path.startsWith('@sap/cds'))
    ?.map(file => [file.path, file.content]) ?? [])

  const csvs = Object.fromEntries(bookshop
      ?.filter(f => f.path.endsWith('.csv'))
      ?.map(f => [f.path, f.content]) ?? [])

  window.cds = cds
  //======= compile a csn model =======
  const csn = cds.compile(model);
  csn.namespace = 'sap.capire.bookshop';

  //======= start a cds server =======
  await sqlite.initialized // wait for sqlite3-wasm to be ready (part of polyfill)
  injectLogger(sqlite);

  cds.db = await cds.connect.to('db');
  await cds.deploy(csn, null, csvs).to(cds.db);

  const app = express();
  await cds.serve('all').from(csn).in(app);

  return cds;
}

/** @type {ReturnType<typeof initialize>} */
let initialized;
if (!import.meta.env.SSR) {
  // runs only in the browser
  initialized = initialize();
}

const AsyncFunction = async function () {}.constructor;
async function evalJS(code, isAsync) {
  const cds = await initialized;
  const source = compile(code);

  function resultTabs(result, kind) {
    if (kind === 'json') {
      let yaml
      try { yaml = cds.compile.to.yaml(result) } catch {}
      if (yaml) return [
        { value: yaml, kind: 'yaml', name: 'Result (as yaml)' },
        { value: JSON.stringify(result, null, 2), kind: 'json', name: 'Result (raw)' },
      ]
    }
    return [{ value: result ? typeof result !== 'string' ? JSON.stringify(result, null, 2) : result : "success", kind, name: 'Result' }]
  }

  if (isAsync) {
    let fn;
    try { fn = new AsyncFunction(source) }
    catch (e) { fn = new AsyncFunction(code) } // rewrite had a syntax error -> run the code unmodified
    const { result, formatted } = await sql.trace(fn);
    const kind = result? 'json' : 'plaintext'
    return [
      ...resultTabs(result, kind),
      { value: formatted, kind: 'sql', name: 'SQL'}
    ];
  }

  let fn;
  try { fn = new Function(source) }
  catch (e) { fn = new Function(code) } // rewrite had a syntax error -> run the code unmodified
  const result = fn();
  const kind = result? 'json' : 'plaintext'
  return resultTabs(result, kind);
}

async function cdsQL(query) {
  const cds = await initialized;
  const cqn = cds.ql(query);

  const { result, formatted } = await sql.trace(() => cds.db.run(cqn));
  return [
    { value: result, kind: 'json', name: 'Result' },
    { value: formatted, kind: 'sql', name: 'SQL'},
    { value: cqn, kind: 'json', name: 'CQN' },
  ];
}

// Worker pool: one worker per model source string, shared across all LiveCode instances
const workerPool = new Map();

function getOrCreateWorker(modelSource, csvs) {
  const key = csvs ? `${modelSource}\0${JSON.stringify(csvs)}` : modelSource;
  if (workerPool.has(key)) return workerPool.get(key);
  const worker = new Worker(new URL('./cds-worker.js', import.meta.url), { type: 'module' });
  const initPromise = new Promise((resolve, reject) => {
    worker.addEventListener('message', function once(e) {
      if (e.data.type !== 'ready' && e.data.type !== 'error') return;
      worker.removeEventListener('message', once);
      e.data.type === 'ready' ? resolve() : reject(new Error(e.data.error));
    });
    worker.addEventListener('error', (e) => reject(e.error ?? new Error(e.message)), { once: true });
    worker.postMessage({ type: 'init', payload: { modelSource, csvs } });
  });
  const entry = { worker, initPromise };
  workerPool.set(key, entry);
  return entry;
}

async function runWithModel(query, modelSource, csvs) {
  const { worker, initPromise } = getOrCreateWorker(modelSource, csvs);
  await initPromise;
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    function handler(e) {
      if (e.data.id !== id) return;
      worker.removeEventListener('message', handler);
      e.data.type === 'error' ? reject(new Error(e.data.error)) : resolve(e.data.result);
    }
    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'query', id, payload: { query } });
  });
}

export {
    evalJS,
    cdsQL,
    runWithModel,
}

export const runners = {
  js: evalJS,
  cql: cdsQL,
  cds: cdsQL,
}

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
      : `${code}\nreturn ${names[0]};`
  }

  // last statement isn't a declaration -> treat it (possibly spanning multiple lines) as the expression to return
  return `${code.slice(0, last.start)}\nreturn (\n${last.text.replace(/;\s*$/, '')}\n);`
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
