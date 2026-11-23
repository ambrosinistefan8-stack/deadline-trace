import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readGraph } from './graph.mjs';

const require = createRequire(import.meta.url);
const { Database } = require('@relate/relate');
const example = fileURLToPath(new URL('./demo/deadline-trace.rl', import.meta.url));
const database = Database.open(example, { readOnly: true });
const graph = readGraph(database.connect(), { mode: 'example' });
console.log(JSON.stringify(graph, null, 2));
