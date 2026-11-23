import { writeFile } from 'node:fs/promises';
import { openGraph, readGraph } from './graph.mjs';

// The export has its own ephemeral database so it can run while the local preview owns the persistent store.
const { connection } = openGraph(':memory:');
const result = readGraph(connection, { mode: 'snapshot' });
await writeFile(new URL('./web/graph.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
console.log(`Exported ${result.cases.length} cases and ${result.meta.evidencePaths} evidence paths from embedded Relate.`);
