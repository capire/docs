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

let initialized;
if (!import.meta.env.SSR) {
  // runs only in the browser
  initialized = initialize();
}

const AsyncFunction = async function () {}.constructor;
async function evalJS(code) {
  await initialized;
  const fn = new AsyncFunction(code);
  const { result, formatted } = await sql.trace(fn);
  const kind = result? 'json' : 'plaintext'
  return [
    { value: result ? typeof result !== 'string' ? JSON.stringify(result, null, 2) : result : "success", kind, name: 'Result' },
    { value: formatted, kind: 'sql', name: 'SQL'}
  ];
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
