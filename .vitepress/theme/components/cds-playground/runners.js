import templates from 'virtual:templates'

// Worker pool: one worker per model (the shared bookshop model, plus one per named model source),
// created lazily on first evaluation and reused across all LiveCode instances on the page.
const workerPool = new Map();

function getOrCreateWorker(key, initPayload) {
  if (workerPool.has(key)) return workerPool.get(key);
  const worker = new Worker(new URL('./cds-worker.js', import.meta.url), { type: 'module' });
  const initPromise = new Promise((resolve, reject) => {
    worker.addEventListener('message', function once(e) {
      if (e.data.type !== 'ready' && e.data.type !== 'error') return;
      worker.removeEventListener('message', once);
      e.data.type === 'ready' ? resolve() : reject(new Error(e.data.error));
    });
    worker.addEventListener('error', (e) => reject(e.error ?? new Error(e.message)), { once: true });
    worker.postMessage({ type: 'init', payload: initPayload });
  });
  const entry = { worker, initPromise };
  workerPool.set(key, entry);
  return entry;
}

// Lazily initialize (on first call) the worker for `key`, then run one snippet against it. Every call
// gets a unique id so concurrent evaluations on the same page don't cross-talk.
function runOnWorker(key, initPayload, query, language) {
  const { worker, initPromise } = getOrCreateWorker(key, initPayload);
  return initPromise.then(() => new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    function handler(e) {
      if (e.data.id !== id) return;
      worker.removeEventListener('message', handler);
      e.data.type === 'error'
        ? reject(Object.assign(new Error(e.data.error), { stack: e.data.stack }))
        : resolve(e.data.result);
    }
    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'run', id, payload: { query, language } });
  }));
}

// Runs a snippet against a named model (```cds live model=FooBar```), each isolated in its own worker.
function runWithModel(query, modelSource, csvs, language = 'cds') {
  const key = csvs ? `${modelSource}\0${JSON.stringify(csvs)}` : modelSource;
  return runOnWorker(key, { model: modelSource, csvs }, query, language);
}

// The default bookshop model, built once from the bundled templates and shared by all default snippets.
let bookshopInitPayload;
function bookshopPayload() {
  if (bookshopInitPayload) return bookshopInitPayload;
  const { bookshop } = templates
  const model = Object.fromEntries((bookshop ?? [])
    .filter(file => file.path.endsWith('.cds') || file.path.startsWith('@sap/cds'))
    .map(file => [file.path, file.content]))
  const csvs = Object.fromEntries((bookshop ?? [])
    .filter(f => f.path.endsWith('.csv'))
    .map(f => [f.path, f.content]))
  return (bookshopInitPayload = { model, csvs, namespace: 'sap.capire.bookshop', serve: true })
}

function runBookshop(query, language) {
  return runOnWorker('bookshop', bookshopPayload(), query, language);
}

export {
  runBookshop,
  runWithModel,
}

export const runners = {
  js: (code) => runBookshop(code, 'js'),
  cql: (query) => runBookshop(query, 'cql'),
  cds: (query) => runBookshop(query, 'cds'),
}
