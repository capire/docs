import type { Plugin, ResolvedConfig } from 'vite';
import cds from '@sap/cds';
import fs from 'fs/promises';
import path from 'path';

/**
 * Vite plugin to load templates from specified directories.
 * @example
 * defineConfig({
 *   plugins: [ templates([".vitepress/templates"]) ]
 * })
 */
function templates(sources : string[] = [] ): Plugin {
  const RESOLVED_ID = '\0templates:';
  let config: ResolvedConfig;
  let resolvedSources: string[] = sources;

  async function walk(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true, recursive: true });
    return entries.filter((e) => e.isFile()).map((e) => path.join(e.parentPath, e.name));
  };

  async function templateDirs(dir : string | string[]): Promise<string[]> {
    if (Array.isArray(dir)) return Promise.all(dir.map(d => templateDirs(d))).then(arrs => arrs.flat());
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name));
  }

  async function buildTemplates(dir : string | string[]): Promise<Record<string, { path: string; content: string }[]>> {

    const dirs = await templateDirs(dir);

    const templates = await Promise.all(dirs.map(async (d) => {
      const filesInTemplate = await walk(d);
      const files = await Promise.all(filesInTemplate
        .map(async (f) => {
          const relPath = path.relative(d, f);
          const content = await fs.readFile(f, 'utf8');
          return {
            path: relPath,
            content,
          };
        }));
      const name = path.basename(d);

      // revisit: better way to include cds artifacts from npm modules?
      files.push({
        path: '@sap/cds/common',
        content: JSON.stringify(await cds.load('@sap/cds/common')),
      })

      return {
        name,
        files
      };
    }));


    return Object.fromEntries(templates.map(t => [t.name, t.files]));
  }

  function root(): string {
    return config.root || process.cwd();
  }

  return {
    name: 'templates-plugin',
    enforce: 'pre',
    configResolved(c) {
      config = c;
      resolvedSources = sources.map(s => path.resolve(root(), s));
    },
    resolveId(id) {
      if (id === 'virtual:templates') {
        return { id : RESOLVED_ID, attributes: { path: id } };
      }
    },
    async load(id) {
      if (id.startsWith(RESOLVED_ID)) {
        const templates = await buildTemplates(resolvedSources);
        return `export default ${JSON.stringify(templates, null, 2)};`;
      }
    },
    async handleHotUpdate(ctx) {
      if (resolvedSources.some(s => ctx.file.startsWith(s))) {
        const mod = ctx.server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) {
          ctx.server.moduleGraph.invalidateModule(mod);
          return [mod];
        }
      }
    },
  };
}

export default templates;
export { templates };
