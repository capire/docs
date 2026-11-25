# API reference generation

Run `npm run types:generate` to download the latest `@cap-js/cds-types` and
`@sap/cds-dk` packages and generate Markdown in `nodejs/types/`.
`npm run docs:build` generates the reference before building VitePress, including
in CI. No workflow-specific generation step is needed.

The generator reads the declaration entry point from the cds-types package's
`package.json`. TypeDoc reads the cds-dk JavaScript/JSDoc entry points listed in
`typedoc.json` directly. Extracted package files retain their original layout and
contents so relative imports and supporting declarations remain available.

There are no declaration transforms or Markdown post-processing steps. Rendering
and symbol names follow TypeDoc's Markdown plugin defaults. Update the
entry-point configuration if the set of documented APIs changes.

`flattenOutputFiles` avoids generating a `dist/` subdirectory from the published
typings path, since VitePress excludes directories named `dist` when finding pages.
`useHTMLAnchors` with an `api-` prefix makes links independent of the site's custom
heading slugifier without colliding with automatically generated heading anchors.

TypeDoc's `skipErrorChecking` is enabled: generating documentation is not a
type-check of the packages' JavaScript implementations (some opt into `@ts-check`).

VitePress includes the generated pages under `/nodejs/types/`. Open `/nodejs/types/`
for TypeDoc's reference index or link directly from prose documentation. Existing
site navigation is unchanged; no sidebar integration is added. VitePress can start
without generated files.

For unpublished changes, run `npm run types:generate:local`. This reads packages
from `~/git/cds-types` and `~/git/cds-dk`, using their declared typings and JSDoc
without modification. Package sources and generated output are ignored by Git.

When this repository is embedded as the internal docs workspace, run generation
through `npm run types:generate --workspace=@capire/docs` before the combined
VitePress build. Internal rewrites strip the `@external/` prefix, so links use the
same `/nodejs/types/` URL in both sites.
