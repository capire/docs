function simpleSqlFormat(sql) {
  return sql
    .replace(/\b(select|from|where|group by|order by|having|limit|offset|join|left join|right join|inner join|outer join)\b/gi, "\n$1")
    .replace(/\b(and|or)\b/gi, "\n  $1")
    .replace(/,\s*/g, ",\n  ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

const sqlLog = [];

function injectLogger(sqlite) {
  const { prototype } = sqlite().constructor;
  const { prepare: original } = prototype;
  prototype.prepare = function prepare(sql) {
    sqlLog.push(sql);
    return original.call(this, sql);
  }
}

let cds;
let initialized = false;

async function init(modelSource) {
  cds = (await import('@sap/cds')).default;
  const sqlite = (await import('better-sqlite3')).default;

  await sqlite.initialized;
  injectLogger(sqlite);

  const csn = cds.compile({ 'model.cds': modelSource });
  cds.model = csn;

  cds.db = await cds.connect.to('db');

  const csvs = {}
  await cds.deploy(csn, null, csvs).to(cds.db);
  initialized = true;
}

self.onmessage = async ({ data: { type, id, payload } }) => {
  try {
    if (type === 'init') {
      await init(payload.modelSource);
      self.postMessage({ type: 'ready' });
    } else if (type === 'query') {
      if (!initialized) throw new Error('Worker not initialized');
      sqlLog.length = 0;
      const cqn = cds.ql(payload.query);
      const result = await cds.db.run(cqn);
      const formatted = sqlLog.map(simpleSqlFormat).join('\n\n-------\n');
      self.postMessage({ type: 'result', id, result: [
        { value: result, kind: 'json', name: 'Result' },
        { value: formatted, kind: 'sql', name: 'SQL' },
        { value: cqn, kind: 'json', name: 'CQN' },
      ]});
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, error: err.message ?? String(err) });
  }
};
