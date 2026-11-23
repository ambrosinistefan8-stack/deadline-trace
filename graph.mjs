import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { cases as fixtures } from './fixtures.mjs';

const require = createRequire(import.meta.url);
const { Database } = require('@relate/relate');
const root = dirname(fileURLToPath(import.meta.url));
export const databasePath = join(root, '.data', 'deadline-trace.rl');
const fixtureVersion = '2026-11-23';

const createCases = `
  UNWIND $items AS item
  CREATE (:Case {id: item.id, title: item.title, subtitle: item.subtitle, ordinal: item.ordinal})
`;
const createSources = `
  UNWIND $items AS item
  MATCH (c:Case {id: item.caseId})
  CREATE (c)-[:HAS_SOURCE]->(:Source {id: item.id, title: item.title, label: item.label, ordinal: item.ordinal})
`;
const createLines = `
  UNWIND $items AS item
  MATCH (source:Source {id: item.sourceId})
  CREATE (source)-[:HAS_LINE]->(:EvidenceLine {id: item.id, text: item.text, ordinal: item.ordinal})
`;
const createStages = `
  UNWIND $items AS item
  MATCH (c:Case {id: item.caseId})
  CREATE (c)-[:HAS_STAGE]->(:Stage {
    id: item.id, title: item.title, kind: item.kind, label: item.label, at: item.at,
    detail: item.detail, ordinal: item.ordinal
  })
`;
const citeLines = `
  UNWIND $items AS item
  MATCH (stage:Stage {id: item.stageId}), (line:EvidenceLine {id: item.lineId})
  CREATE (stage)-[:SUPPORTED_BY {ordinal: item.ordinal}]->(line)
`;

function seed(connection) {
  const caseRows = fixtures.map(({ id, title, subtitle }, ordinal) => ({ id, title, subtitle, ordinal }));
  const sourceRows = fixtures.flatMap(({ id: caseId, sources }) =>
    sources.map(({ id, title, label }, ordinal) => ({ caseId, id, title, label, ordinal })));
  const lineRows = fixtures.flatMap(({ sources }) => sources.flatMap(({ id: sourceId, lines }) =>
    lines.map(({ id, text }, ordinal) => ({ sourceId, id, text, ordinal }))));
  const stageRows = fixtures.flatMap(({ id: caseId, stages }) => stages.map(({ lines, ...stage }, ordinal) =>
    ({ ...stage, caseId, ordinal })));
  const citationRows = fixtures.flatMap(({ stages }) => stages.flatMap(({ id: stageId, lines }) =>
    lines.map((lineId, ordinal) => ({ stageId, lineId, ordinal }))));

  connection.begin();
  try {
    for (const [statement, items] of [
      [createCases, caseRows], [createSources, sourceRows], [createLines, lineRows],
      [createStages, stageRows], [citeLines, citationRows],
    ]) {
      connection.query(statement, { items });
    }
    connection.query('CREATE (:Fixture {version: $version})', { version: fixtureVersion });
    connection.commit();
  } catch (error) {
    connection.rollback();
    throw error;
  }
}

export function openGraph(path = databasePath) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const database = Database.open(path);
  const connection = database.connect();
  const found = connection.query('MATCH (marker:Fixture) RETURN marker.version AS version').rows;

  if (found.length === 0) {
    seed(connection);
    database.checkpoint();
  } else if (found.length !== 1 || found[0].version !== fixtureVersion) {
    throw new Error('Fixture store version differs. Use a new database file to import this demo.');
  }

  return { database, connection };
}

export function readGraph(connection, { mode = 'live' } = {}) {
  const caseRows = connection.query(`
    MATCH (c:Case)
    RETURN c.id AS id, c.title AS title, c.subtitle AS subtitle
    ORDER BY c.ordinal
  `).rows;

  const sourceRows = connection.query(`
    MATCH (c:Case)-[:HAS_SOURCE]->(source:Source)-[:HAS_LINE]->(line:EvidenceLine)
    RETURN c.id AS caseId, source.id AS sourceId, source.title AS title, source.label AS label,
      line.id AS lineId, line.text AS lineText
    ORDER BY c.ordinal, source.ordinal, line.ordinal
  `).rows;

  const stageRows = connection.query(`
    MATCH (c:Case)-[:HAS_STAGE]->(stage:Stage)-[citation:SUPPORTED_BY]->(line:EvidenceLine)
    MATCH (c)-[:HAS_SOURCE]->(source:Source)-[:HAS_LINE]->(line)
    RETURN c.id AS caseId, stage.id AS stageId, stage.title AS title, stage.kind AS kind,
      stage.label AS label, stage.at AS at, stage.detail AS detail,
      source.id AS sourceId, line.id AS lineId
    ORDER BY c.ordinal, stage.ordinal, citation.ordinal
  `).rows;

  const cases = new Map(caseRows.map(row => [row.id, { ...row, sources: [], stages: [] }]));
  const sources = new Map();
  const stages = new Map();

  for (const row of sourceRows) {
    if (!sources.has(row.sourceId)) {
      const source = { id: row.sourceId, title: row.title, label: row.label, text: '', lines: [] };
      sources.set(source.id, source);
      cases.get(row.caseId).sources.push(source);
    }
    sources.get(row.sourceId).lines.push({ id: row.lineId, text: row.lineText });
  }
  for (const source of sources.values()) {
    source.text = source.lines.map(line => line.text).join('\n');
  }

  for (const row of stageRows) {
    if (!stages.has(row.stageId)) {
      const stage = {
        id: row.stageId, title: row.title, kind: row.kind, label: row.label,
        at: row.at, detail: row.detail, sourceIds: [], evidence: [],
      };
      stages.set(stage.id, stage);
      cases.get(row.caseId).stages.push(stage);
    }
    const stage = stages.get(row.stageId);
    let evidence = stage.evidence.find(item => item.sourceId === row.sourceId);
    if (!evidence) {
      evidence = { sourceId: row.sourceId, lineIds: [] };
      stage.sourceIds.push(row.sourceId);
      stage.evidence.push(evidence);
    }
    evidence.lineIds.push(row.lineId);
  }

  return {
    cases: [...cases.values()],
    meta: { engine: 'Neo4j Relate', mode, evidencePaths: stageRows.length, synthetic: true },
  };
}
