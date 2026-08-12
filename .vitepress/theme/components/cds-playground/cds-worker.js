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

async function init(modelSource, csvs) {
  state.cds = (await import('@sap/cds')).default;
  const sqlite = (await import('better-sqlite3')).default;

  await sqlite.initialized;
  injectLogger(sqlite);

  const csn = state.cds.compile({ 'model.cds': modelSource });
  state.cds.model = csn;

  state.cds.db = await state.cds.connect.to('db');

  await state.cds.deploy(csn, null, csvs ?? {}).to(state.cds.db);
}

self.onmessage = async ({ data: { type, id, payload } }) => {
  try {
    if (type === 'init') {
      state.initPromise = init(payload.modelSource, payload.csvs);
      await state.initPromise;
      self.postMessage({ type: 'ready' });
    } else if (type === 'query') {
      if (!state.initPromise) throw new Error('Worker not initialized');
      await state.initPromise;
      state.sqlLog.length = 0;
      const cqn = state.cds.ql(payload.query);
      const result = await state.cds.db.run(cqn);
      const formatted = state.sqlLog.map(simpleSqlFormat).join('\n\n-------\n');
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
