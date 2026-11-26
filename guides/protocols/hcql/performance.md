---
description: Human-oriented OData/HCQL performance measurements, interpretation and limits for uncached requests.
search: false
---

# HCQL Performance Considerations

Local uncached read benchmarks compare OData and HCQL at two boundaries: adapter-isolated server time and full-stack request latency. They inform service-owner profiling, not a universal protocol ranking.

> [!tip]
> **tl;dr:** HCQL reduced adapter overhead in these local measurements, but full-request gains were much smaller. **Keep query validation enabled by default.** Privileged mode is a trust-boundary decision, not a general performance shortcut.

[[toc]]

> This page is for service owners, not part of the [HCQL client instructions](../hcql.md#client-instructions).

## Adapter-isolated reads

Server-side timing before protocol handling through response serialization, with service dispatch replaced by fixed responses. Database and service-handler execution, fixture preparation, client processing and outbound network completion are excluded; shared HTTP middleware and incoming body delivery remain included.

| Workload               | OData, p50 | HCQL CQL | HCQL CQN | HCQL raw CQN |
| ---------------------- | ---------: | -------: | -------: | -----------: |
| Key lookup             |      29 µs |    22 µs |    21 µs |        19 µs |
| Page, 20 rows          |      37 µs |    28 µs |    22 µs |        21 µs |
| Filtered page, 50 rows |      48 µs |    28 µs |    25 µs |        23 µs |
| Expand, 2 × 3          |      49 µs |    31 µs |    30 µs |        25 µs |
| Aggregate, 10 groups   |      43 µs |    33 µs |    24 µs |        23 µs |

Validated CQL used **23–42% less median server time** than OData; validated CQN **28–49% less**. Bypassing HCQL query validation saved a further **1–5 µs (5–16%)** versus validated CQN—not a demonstrated full-stack improvement.


## Full-stack reads

HTTP → CAP → SQLite → serialized response → client JSON parsing. Same service, 10,000 books, 200 authors; returned domain data matched. No query-template or response caching; database pages and keep-alive connections were warm.

| Workload                    | OData, p50 | Requests/s | HCQL CQL | Requests/s |
| --------------------------- | ---------: | ---------: | -------: | ---------: |
| Key lookup                  |     161 µs |      8,316 |   160 µs |      8,944 |
| Page, 20 rows               |     189 µs |      6,560 |   178 µs |      7,180 |
| Filtered page, 50 rows      |     240 µs |      5,173 |   220 µs |      5,789 |
| Expand, 2 authors × 3 books |     276 µs |      4,355 |   253 µs |      4,699 |
| Aggregate, 10 groups        |   1,436 µs |        774 | 1,411 µs |        786 |

HCQL CQL showed **0–8% lower median latency** and **2–12% higher throughput**. Key-read latency was effectively tied; database-heavy aggregation left little room for protocol savings. Parser-only speedups do not translate directly into equal application speedups.


## Avoid eager tuning

- **Keep defaults first.** For these small queries, removing validation bought microseconds, not a demonstrated full-request improvement.
- **CQN and privileged mode are separate choices.** CQN avoids CQL text parsing while retaining query validation. Prefer that distinction over eagerly enabling `cqn.any`.
- **Use privileged mode only for genuinely trusted internal integrations**, after profiling a relevant workload and verifying the deployed runtime. Never use it to satisfy a denied request or expose it to untrusted clients.
- `cqn.any=true` bypasses HCQL **query** validation—not JSON parsing, authentication, service authorization or input validation. Those remaining checks matter; see [trusted integrations](./config.md#trusted-internal-integrations).

## What likely dominates?

**Hypotheses, not a measured breakdown:** routing and CAP request-context/authentication middleware, JSON body parsing, query/request conversion, response serialization and asynchronous scheduling remain after HCQL query validation is removed. Verbose CQN also has JSON-parsing cost. These shared costs can outweigh field/reference checks on small queries; larger projections or deeper expressions may shift the balance. Allocation/GC effects were not fully removed by subtracting fixture-cloning time.

Profile those phases separately before deciding what to optimize. The current totals do not assign a percentage to any one phase.

<details>
<summary>Measurement scope and limits</summary>

November 2026 local development snapshot: CAP Node.js 10.3.0, Core QL 2.5.5, CDS compiler 7.2.1, SQLite 3.1.3 / db-service 3.2.0, Node.js 26.13.1, Apple M4 / macOS arm64. These are not released-runtime or production benchmarks.

The adapter-isolated results use the fixed native `cqn.any=true` path, with no benchmark workaround. Query-instance conversion remains necessary with or without validation. The rerun showed no major difference from the earlier wrapper-based measurements; it does not explain away the modest validation savings. Released-runtime availability remains unverified.

Five repetitions with rotated workload/protocol order and 100 warm-up requests per variant/workload. Reported p50s are medians of per-run p50s, rounded to whole microseconds. Full-stack: 71,500 timed requests; serial latency and eight-client throughput. Adapter-isolated: 100,000 serial requests, no database connection; response equality and validation-rejection/bypass controls passed. Default protocol envelopes were retained.

No cached query reuse or HTTP/result-cache plugin; ordinary model/database/connection warm-up remained. No exclusive CPU isolation, confidence intervals, TLS, production authentication, external-network RTT, HANA/PostgreSQL, writes or mixed production workloads. Small differences and p95 overlaps should not be treated as universal rankings. Runtime entry-file hashes stayed unchanged during each measurement.

Benchmark harnesses, exact requests and raw evidence are maintained with the CAP Node.js runtime, not distributed with this guide. Fixtures rely on the recorded local runtime; they are not portable release qualification capsules.

</details>
