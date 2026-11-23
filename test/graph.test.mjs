import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { openGraph, readGraph } from '../graph.mjs';

test('confirmed, conflicting and missing cases resolve through source line relationships', () => {
  const { connection } = openGraph(':memory:');
  const graph = readGraph(connection);
  assert.equal(graph.meta.evidencePaths, 19);
  const [confirmed, conflict, missing] = graph.cases;

  assert.equal(confirmed.stages.at(-1).kind, 'confirmed');
  assert.equal(confirmed.stages.at(-1).evidence.length, 2);
  assert.equal(conflict.stages.at(-1).kind, 'review');
  assert.deepEqual(conflict.stages[1].sourceIds, ['studio-guide', 'studio-brief']);
  assert.ok(!conflict.stages.some(stage => stage.kind === 'confirmed'));
  assert.equal(missing.stages[1].kind, 'missing');
  assert.ok(!missing.stages.some(stage => stage.kind === 'candidate' || stage.kind === 'confirmed'));

  for (const item of graph.cases) {
    for (const stage of item.stages) {
      for (const evidence of stage.evidence) {
        const source = item.sources.find(candidate => candidate.id === evidence.sourceId);
        assert.ok(source);
        assert.ok(evidence.lineIds.every(lineId => source.lines.some(line => line.id === lineId)));
      }
    }
  }
});

test('projection follows live cypher relationships rather than unsaved fixture values', () => {
  const { connection } = openGraph(':memory:');
  connection.query(`
    MATCH (:Stage {id: $stage})-[edge:SUPPORTED_BY]->(:EvidenceLine {id: $line})
    DELETE edge
  `, { stage: 'studio-conflict', line: 'studio-brief-l1' });

  const graph = readGraph(connection);
  assert.equal(graph.meta.evidencePaths, 18);
  assert.deepEqual(graph.cases[1].stages[1].sourceIds, ['studio-guide']);
});

test('single-file store keeps and reads the same graph after reopening in another process', () => {
  const parent = tmpdir();
  const folder = mkdtempSync(join(parent, 'deadline-trace-test-'));
  const path = join(folder, 'persistent.rl');
  const module = new URL('../graph.mjs', import.meta.url).href;
  const script = `
    import { openGraph, readGraph } from ${JSON.stringify(module)};
    const { connection } = openGraph(process.env.DEADLINE_TRACE_TEST_STORE);
    console.log(JSON.stringify(readGraph(connection)));
  `;
  const open = () => {
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...process.env, DEADLINE_TRACE_TEST_STORE: path }, encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr);
    return JSON.parse(run.stdout);
  };

  try {
    const first = open();
    assert.equal(first.meta.evidencePaths, 19);
    assert.deepEqual(open(), first);
  } finally {
    // Only delete the directory returned by mkdtempSync under the named temp root.
    assert.equal(join(parent, folder.split(/[\\/]/).at(-1)), folder);
    rmSync(folder, { recursive: true, force: true });
  }
});
