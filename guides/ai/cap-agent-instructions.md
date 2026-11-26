---
description: >
  Concise CAP instructions for coding agents: current HTTP references, client-facing HCQL/Core QL APIs, CDS QL for service implementations, database plug-and-play defaults and behavioral verification.
---

# CAP Development Instructions

<!-- #region instructions -->

## Find Applicable Guidance

1. Identify the project's CAP runtime (Node.js or Java) and installed dependency versions, not just declared ranges.
2. Use the explicitly selected documentation base URL. Otherwise resolve the [documentation index](../../llms.txt) relative to this instruction file's fetched URL. If neither a base nor a source URL is supplied, use `https://cap.cloud.sap/docs/`.
3. Fetch `llms.txt`, follow relevant page links and read their Markdown forms: append `.md` if absent, before any heading fragment. Resolve relative links against the fetched document URL. Fetch only needed pages; use `llms-full.txt` only for broader reference needs.
4. Check runtime/version and release-status notes before applying guidance. Latest documentation or a local draft is not proof of installed-runtime support. Reuse applicable content; refresh when the task, dependencies, source or observed behavior changes.

If an index is stale or unavailable, use an explicitly supplied current Markdown URL and report the limitation. Do not start another documentation server or rebuild the site merely to read guidance. If required guidance is unavailable or conflicts with observed behavior or installed skills, identify the source/version limits and any fallback before implementing the affected behavior; do not silently substitute remembered syntax.

## Prefer HCQL/Core QL for Client Requests

- For agent-authored client requests to a supporting **CAP Node.js** service, prefer [`@hcql`](../protocols/hcql.md). Use REST-style requests for simple CRUD and [Core QL runtime queries](../protocols/hcql/core-ql.md) for navigation, filtering, nested results, aggregation and bound input values.
- This Core QL guidance is for protocol clients. For Node.js service implementations, see [Core QL in CAP Node.js Services](../../node.js/core-ql.md) for the CDS QL (aka Classic CQL) dialect comparison and current runtime limits; use CDS QL ([`cds.ql`](../../node.js/cds-ql.md)) for database-backed queries that need bound values until support is verified.
- Choose [`@odata`](../protocols/odata.md) **only for explicitly required OData-affine clients**, including Fiori UIs. Use both `@hcql` and `@odata` on the service when both interfaces are needed.
- Annotate the intended exposure explicitly. This is project guidance, not a change to CAP's default protocol; check HCQL applicability rather than inferring Java support or a minimum released version. Internal query capabilities do not bypass public HCQL restrictions.
- Use modeled actions for business changes. Do not substitute client read → compute → write for an atomic operation or relax authorization/query guards to make a request succeed.

## Use Database Plug-and-Play Defaults

For standard **CAP Node.js** setup, **do not add or generate any `cds.requires.db` configuration**—not `kind`, `impl` or `credentials`, in `package.json`, `.cdsrc.json` or another configuration source. Use the database integrations' plug-and-play defaults:

| Package | Supplied defaults |
| --- | --- |
| [`@cap-js/sqlite`](../databases/sqlite.md) | SQLite implementation and in-memory database for local development/testing |
| [`@cap-js/hana`](../databases/hana.md) | HANA implementation and profile-specific selection |

Inspect effective settings instead of writing an override:

```sh
cds env get requires.db
```

For ordinary SQLite development/tests, confirm startup uses `:memory:`. Even `kind: "sqlite"` can override the plugin preset and select a file database. Do not silently remove existing intentional configuration; identify non-default requirements before changing it. HANA provisioning and service bindings still require deployment setup; the plugin does not create a database instance or grant access.

## Verify Behavior and Report Limits

Prefer documented native capabilities and defaults before custom implementation or configuration. Verify the required behavior in the project: parsing, compiling or an HTTP success alone is not stored-state qualification. Use scoped HTTP reads when the task requires persisted confirmation; preserve required identity, sibling and rejection/rollback outcomes.

Record relevant documentation URLs, actual versions and validation scope when reporting consequential CAP choices. Distinguish an application rule, supported limitation, verified defect and untested assumption. Do not inspect or bypass disabled reference skills to replace current guidance, or delete user-installed skills during ordinary application setup.

<!-- #endregion instructions -->
