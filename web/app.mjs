import { makeEvidenceMap } from './scene.mjs';

const byId = (id) => document.getElementById(id);
const workspace = byId('workspace');
const connection = byId('connection');
const scrub = byId('scrub');
const play = byId('play');

const kinds = {
  source: 'Source',
  candidate: 'Candidate date',
  confirmed: 'Confirmed in example',
  conflict: 'Conflicting dates',
  missing: 'Date missing',
  review: 'Human review',
};

let cases = [];
let selectedCase;
let currentStep = 0;
let activeSource;
let activeCitation;
let playback;
const visual = makeEvidenceMap(byId('map'), {
  onStep(index) {
    stop();
    selectStep(index);
  },
  onSource(id) {
    stop();
    selectSource(id, citationOf(selectedCase.stages[currentStep], id));
  },
});

function button(label, onClick, className) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.addEventListener('click', onClick);
  if (className) el.className = className;
  return el;
}

function setPushed(container, key) {
  for (const child of container.children) child.setAttribute('aria-pressed', String(child.dataset.key === String(key)));
}

function citationOf(stage, sourceId) {
  return (stage.evidence ?? []).find((item) => item.sourceId === sourceId);
}

function references(stage) {
  return [...new Set([...(stage.evidence ?? []).map((item) => item.sourceId), ...(stage.sourceIds ?? [])])];
}

function sourceLines(source) {
  if (Array.isArray(source.lines) && source.lines.length) return source.lines;
  return String(source.text || '').split(/\r?\n/).filter(Boolean).map((text, index) => ({ id: `${source.id}-${index + 1}`, text }));
}

function selectSource(id, citation) {
  const source = selectedCase.sources.find((item) => item.id === id);
  if (!source) return;
  activeSource = source.id;
  activeCitation = citation?.sourceId;
  const marked = new Set((citation?.lineIds ?? []).map(String));

  setPushed(byId('source-controls'), activeSource);
  setPushed(byId('citations'), activeCitation);
  byId('document').hidden = false;
  byId('document-title').textContent = source.title;
  const lines = sourceLines(source).map((line) => {
    const item = document.createElement('li');
    item.textContent = line.text;
    item.classList.toggle('is-evidence', marked.has(String(line.id)));
    return item;
  });
  byId('source-lines').replaceChildren(...lines);
  visual.update(selectedCase, currentStep, activeSource);
}

function revealEvidence(sourceId, citation) {
  selectSource(sourceId, citation);
  const target = byId('source-lines').querySelector('.is-evidence') || byId('document');
  target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
}

function showCitations(stage) {
  const sourceIds = references(stage);
  const controls = sourceIds.flatMap((id) => {
    const source = selectedCase.sources.find((item) => item.id === id);
    if (!source) return [];
    const citation = citationOf(stage, id);
    const allLines = sourceLines(source);
    const numbers = (citation?.lineIds ?? []).map((lineId) => allLines.findIndex((line) => String(line.id) === String(lineId)) + 1).filter(Boolean);
    const linesLabel = numbers.length ? ` · ${numbers.length === 1 ? 'line' : 'lines'} ${numbers.join(', ')}` : '';
    const control = button(`${source.label || source.title}${linesLabel}`, () => revealEvidence(id, citation));
    control.dataset.key = id;
    control.setAttribute('aria-pressed', 'false');
    return [control];
  });
  byId('citations').replaceChildren(...controls);
  byId('no-citations').hidden = controls.length > 0;
  return sourceIds;
}

function describeDate(raw) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${raw}T00:00:00Z`));
}

function selectStep(nextIndex) {
  const stage = selectedCase.stages[nextIndex];
  if (!stage) return;
  currentStep = nextIndex;
  scrub.value = String(nextIndex);
  scrub.setAttribute('aria-valuetext', stage.label || stage.title);
  byId('position').textContent = stage.label || stage.title;
  byId('stage-type').dataset.kind = stage.kind;
  byId('stage-type').textContent = kinds[stage.kind] ?? 'Review step';
  byId('detail-title').textContent = stage.title;
  byId('detail-date').hidden = !stage.at;
  byId('detail-date').textContent = stage.at ? `Recorded ${describeDate(stage.at)}` : '';
  byId('detail-copy').textContent = stage.detail;
  setPushed(byId('steps'), nextIndex);

  const supportedBy = showCitations(stage);
  const sourceId = supportedBy.includes(activeSource) ? activeSource : supportedBy[0] || activeSource;
  if (sourceId) selectSource(sourceId, citationOf(stage, sourceId));
  else visual.update(selectedCase, nextIndex);
}

function caseOutcome(item) {
  const kind = item.stages.find((stage) => ['confirmed', 'conflict', 'missing'].includes(stage.kind))?.kind || 'review';
  return { kind, badge: kinds[kind] };
}

function selectCase(item) {
  stop();
  selectedCase = item;
  activeSource = item.sources[0]?.id;
  activeCitation = undefined;
  setPushed(byId('case-controls'), item.id);
  byId('case-name').textContent = item.title;
  byId('source-count').textContent = `${item.sources.length} ${item.sources.length === 1 ? 'source' : 'sources'}`;
  const sourceButtons = item.sources.map((source) => {
    const control = button(source.label || source.title, () => selectSource(source.id, citationOf(item.stages[currentStep], source.id)));
    control.dataset.key = source.id;
    return control;
  });
  byId('source-controls').replaceChildren(...sourceButtons);
  byId('document').hidden = !item.sources.length;
  const stepButtons = item.stages.map((stage, index) => {
    const control = button(stage.label || stage.title, () => {
      stop();
      selectStep(index);
    });
    control.dataset.key = String(index);
    return control;
  });
  byId('steps').style.setProperty('--steps', item.stages.length);
  byId('steps').replaceChildren(...stepButtons);
  scrub.max = String(item.stages.length - 1);
  scrub.disabled = item.stages.length < 2;
  play.disabled = item.stages.length < 2;
  const outcomeIndex = item.stages.findIndex((stage) => ['confirmed', 'conflict', 'missing'].includes(stage.kind));
  selectStep(Math.max(0, outcomeIndex));
}

function populateCases() {
  const controls = cases.map((item) => {
    const { kind, badge } = caseOutcome(item);
    const control = button('', () => selectCase(item), 'case-button');
    control.dataset.key = item.id;
    const title = document.createElement('strong');
    title.textContent = item.title;
    const state = document.createElement('span');
    state.textContent = badge;
    state.dataset.kind = kind;
    control.append(title, state);
    return control;
  });
  byId('case-controls').replaceChildren(...controls);
}

function stop() {
  clearInterval(playback);
  playback = undefined;
  play.textContent = '▶';
  play.setAttribute('aria-label', 'Play review timeline');
  play.title = 'Play review timeline';
}

function togglePlayback() {
  if (playback) return stop();
  if (currentStep === selectedCase.stages.length - 1) selectStep(0);
  play.textContent = 'Ⅱ';
  play.setAttribute('aria-label', 'Pause review timeline');
  play.title = 'Pause review timeline';
  playback = setInterval(() => {
    selectStep(currentStep + 1);
    if (currentStep >= selectedCase.stages.length - 1) stop();
  }, 1450);
}

function showConnection(state, detail) {
  connection.dataset.state = state;
  connection.querySelector('span').textContent = detail;
}

function verifyGraph(payload) {
  if (!Array.isArray(payload?.cases) || !payload.cases.length) throw new Error('Relate graph returned no cases.');
  if (!payload.cases.every((item) => item.id && item.title && item.stages?.length && Array.isArray(item.sources))) throw new Error('Relate graph returned incomplete cases.');
  return payload;
}

async function getGraph() {
  try {
    const response = await fetch('/api/graph', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Graph API returned ${response.status}`);
    return verifyGraph(await response.json());
  } catch (liveError) {
    if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) throw liveError;
    const snapshot = await fetch('./graph.json', { cache: 'no-store' });
    if (!snapshot.ok) throw liveError;
    const graph = verifyGraph(await snapshot.json());
    if (graph.meta?.mode !== 'snapshot') throw liveError;
    return graph;
  }
}

async function load() {
  workspace.setAttribute('aria-busy', 'true');
  showConnection('connecting', 'Connecting to Relate…');
  byId('load-error').hidden = true;
  byId('experience').hidden = true;
  try {
    const graph = await getGraph();
    cases = graph.cases;
    populateCases();
    byId('experience').hidden = false;
    selectCase(cases.find((item) => caseOutcome(item).kind === 'conflict') ?? cases[0]);
    const mode = graph.meta?.mode === 'snapshot' ? 'snapshot' : 'live';
    showConnection(mode, mode === 'live' ? 'Relate · live query' : 'Relate · exported snapshot');
    const stages = cases.reduce((sum, item) => sum + item.stages.length, 0);
    byId('record-info').textContent = `${cases.length} cases · ${stages} stages · Relate by Neo4j`;
  } catch (error) {
    console.error(error);
    showConnection('error', 'Relate unavailable');
    byId('load-error').hidden = false;
  } finally {
    workspace.setAttribute('aria-busy', 'false');
  }
}

scrub.addEventListener('input', () => {
  stop();
  selectStep(Number(scrub.value));
});
play.addEventListener('click', togglePlayback);
byId('rotate-left').addEventListener('click', () => visual.rotate(-1));
byId('rotate-right').addEventListener('click', () => visual.rotate(1));
byId('retry').addEventListener('click', load);
load();
