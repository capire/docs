# API reference generation

Run `npm run types:generate` to download the pinned `@cap-js/cds-types` and
`@sap/cds-dk` packages from `packages.json` and generate Markdown in `nodejs/types/`.
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

## Security boundary

- Package versions, tarball URLs, and SHA-512 integrity hashes are committed in
  `packages.json`. Downloads must match those hashes before extraction. Updating
  the manifest requires reviewing the new artifacts; a matching hash does not
  establish that a publisher or package is trustworthy.
- Archive extraction accepts only regular files and directories under `package/`.
  Traversal paths, symlinks, hardlinks, and special files are rejected. Downloads
  are limited to 64 MiB and extracted entries to 512 MiB in total. The package name,
  version, and declaration entry-point location are also checked.
- A generic TypeDoc guard refuses `@include`, `@includeCode`, and `@document`
  directives before their built-in handlers can read files. Registered media
  copying is refused too. Declaration imports outside the configured source tree
  and installed dependency directories are refused before conversion, so they
  cannot publish build-host sources either. This is not a filesystem sandbox:
  TypeScript may read a referenced file while constructing its program, before
  the guard rejects it; it is not converted into documentation.
- TypeDoc sanitizes source comments. In addition, the shared VitePress renderer
  treats `/nodejs/types/` pages as data: it sanitizes raw HTML tokens before SFC
  extraction, sanitizes rendered HTML, and adds a `v-pre` boundary. Scripts, event
  handlers, unsafe URL schemes, Vue directives, and Vue interpolation cannot be
  used as executable API documentation. Image tokens are rendered as text rather
  than triggering asset imports or remote tracking. Generated examples are static, not live
  Vue components; ordinary guide rendering is unchanged.
- Security regression tests run before generation and as part of `npm test`. They
  exercise malicious comments and raw Markdown through a real VitePress build,
  as well as integrity mismatches and unsafe archives.
- `--local` is for trusted developer checkouts only and is refused in CI. Build
  jobs have no deployment/OIDC write permissions and do not retain checkout
  credentials. Deployment privileges belong to a separate job.

This is defense in depth, not a sandbox for the toolchain itself. TypeDoc,
VitePress, their plugins, and their dependencies execute trusted build code; keep
their committed npm lockfile and updates reviewed. Do not give documentation
builds unrelated secrets.

When this repository is embedded as the internal docs workspace, run generation
through `npm run types:generate --workspace=@capire/docs` before the combined
VitePress build. Internal rewrites strip the `@external/` prefix, so links use the
same `/nodejs/types/` URL in both sites.
