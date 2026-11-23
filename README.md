# Deadline Trace

Deadline Trace shows how a deadline was arrived at. Move through a short review timeline, select a graph node and read the exact lines a finding depends on. The three fictional cases cover a confirmed filing time, contradictory sources and a missing due date. The tool leaves ambiguous dates for human review.

## Run locally

Use Node.js 20 or later on a platform supported by the official Relate npm package. A clean run was tested on Windows x64.

```sh
npm ci --ignore-scripts
npm test
npm start
```

Open `http://127.0.0.1:8879/`. The server binds to loopback. Installation needs network access to fetch the pinned dependency. Running the demo requires no account, network service or API key.

## How it uses Relate

Deadline Trace uses [Relate](https://github.com/relatedb/relate) in embedded, persistent single-file mode. It keeps the evidence graph next to the application, can reopen it after a restart, and needs no networked database, managed service or credentials at runtime.

The inspectable example database is [`demo/deadline-trace.rl`](demo/deadline-trace.rl). It contains only the fictional cases in `fixtures.mjs`. After installing dependencies, run `npm run inspect:demo` to open that file read-only, execute the application’s Cypher queries and print their JSON results. `npm start` creates or reopens its own writable `.data/deadline-trace.rl` and leaves the example database intact.

`graph.mjs` stores cases, source documents, numbered lines and review stages as nodes. Cypher joins a `Case` to its `Stage`, follows `SUPPORTED_BY` to an `EvidenceLine`, and verifies that the line belongs to a `Source` of that same case. The browser receives the 19 resulting evidence paths from `GET /api/graph`. Conflict stages reveal both dates. A missing deadline stays unset. The tests change a relationship and reopen a store to verify that the output follows live graph data.

`npm run export:graph` creates `web/graph.json` from the same Cypher queries against an in-memory Relate instance seeded with the fictional fixtures. A hosted static preview displays this export and labels it **Relate · exported snapshot**. The local preview queries the embedded graph live and surfaces engine errors.

## Try three cases

1. Open **Studio access application**. Choose **Dates disagree**. Select each source link. One document says 2 March, the other says 5 March. Move to **Needs review** and verify that the conflict is still open.
2. Open **Community gallery proposal**. Move to **Confirmed** and trace the date to the independent review note and the original notice.
3. Open **Workshop safety brief**. Choose **Deadline absent**. The event date stays separate from the missing filing deadline.

The graph rotates by drag or by the two buttons. The timeline and evidence lists also work by keyboard. All records are fictional. The prototype is an evidence viewer over prepared records, with no OCR, free-text extraction or automatic approval.

## Development disclosure

This independent application was started on 23 November 2026. The visual and technical implementation, fixture corpus and Cypher graph are new. OpenAI Codex assisted with implementation, testing, documentation and preparation of the demo. The application uses the official `@relate/relate` npm package and browser Canvas. Its runtime uses the embedded database and scripted examples.
