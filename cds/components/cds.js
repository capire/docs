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
  window.sql = sqlLog;
  return sqlLog;
}


async function initialize() {
  // revisit: make this a static import with ssr handling
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
}

let initialized;
if (!import.meta.env.SSR) {
  // runs only in the browser
  console.log("Initialize CAP runtime")

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
  await initialized;

  const { result, formatted } = await sql.trace(() => cds.ql(query));
  return [
    { value: result, kind: 'json', name: 'Result' },
    { value: formatted, kind: 'sql', name: 'SQL'}
  ];
}

export {
    evalJS,
    cdsQL,
}
