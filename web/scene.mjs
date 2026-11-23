const colors = {
  source: '#77e3e0',
  candidate: '#c3a8ff',
  confirmed: '#9befb8',
  conflict: '#f9b181',
  missing: '#f9b181',
  review: '#ffd7a0',
};

const degree = Math.PI / 180;

export function makeEvidenceMap(canvas, { onStep, onSource }) {
  const context = canvas.getContext('2d');
  if (!context) return { update() {}, rotate() {} };
  let width = 0;
  let height = 0;
  let angle = -12 * degree;
  let data;
  let selected = 0;
  let sourceId;
  let hitTargets = [];
  let dragging;

  function project([x, y, z]) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const side = x * cos - z * sin;
    const depth = x * sin + z * cos;
    const perspective = 1 + depth * .035;
    const scale = Math.min(width / 16.2, height / 6.45);
    return {
      x: width / 2 + side * scale * perspective,
      y: height * .61 + (depth * .43 - y) * scale * perspective,
      scale,
      depth,
    };
  }

  function line(a, b, color, thickness = 1, dash = []) {
    context.beginPath();
    context.strokeStyle = color;
    context.lineWidth = thickness;
    context.setLineDash(dash);
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
    context.setLineDash([]);
  }

  function oval(x, y, rx, ry, color, fill = false, thickness = 1) {
    context.beginPath();
    context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) {
      context.fillStyle = color;
      context.fill();
    } else {
      context.strokeStyle = color;
      context.lineWidth = thickness;
      context.stroke();
    }
  }

  function floorGrid() {
    const corners = [[-7.5, 0, -3.25], [7.5, 0, -3.25], [7.5, 0, 3.15], [-7.5, 0, 3.15]].map(project);
    const glow = context.createLinearGradient(0, height * .18, width, height);
    glow.addColorStop(0, '#7964b843');
    glow.addColorStop(1, '#1e1b3530');
    context.beginPath();
    context.moveTo(corners[0].x, corners[0].y);
    for (const pt of corners.slice(1)) context.lineTo(pt.x, pt.y);
    context.closePath();
    context.fillStyle = glow;
    context.fill();
    context.strokeStyle = '#7a69aa8f';
    context.lineWidth = 1;
    context.stroke();
    for (let x = -7; x <= 7; x++) line(project([x, 0, -3.25]), project([x, 0, 3.15]), '#9e87db35');
    for (let z = -3; z <= 3; z++) line(project([-7.5, 0, z]), project([7.5, 0, z]), '#9e87db3a');
  }

  function tag(text, point, offset, bright = false) {
    const scale = width < 560 ? 11 : 12;
    const textWidth = width < 560 ? 108 : 155;
    context.font = `${bright ? 650 : 500} ${scale}px Segoe UI, sans-serif`;
    let label = text;
    while (context.measureText(label).width > textWidth && label.length > 4) label = `${label.replace(/…$/, '').slice(0, -1)}…`;
    const size = context.measureText(label).width + 14;
    const x = Math.max(3, Math.min(width - size - 3, point.x - size / 2));
    const y = Math.max(10, Math.min(height - 18, point.y + offset));
    context.fillStyle = bright ? '#2b2047' : '#211a32';
    context.beginPath();
    context.roundRect(x, y - 9, size, 19, 5);
    context.fill();
    const textColor = bright ? '#f5eaff' : '#d4c9e5';
    context.fillStyle = textColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, x + size / 2, y + 1);
  }

  function stageOrb(node) {
    const { point, floor, color, active, entry } = node;
    const r = Math.max(7.5, Math.min(15, point.scale * .29));
    line(floor, point, active ? `${color}c9` : `${color}69`, active ? 1.35 : 1);
    oval(floor.x, floor.y, r * 1.35, r * .56, `${color}85`);
    const glow = context.createRadialGradient(point.x, point.y, r * .18, point.x, point.y, r * 3.2);
    glow.addColorStop(0, `${color}${active ? 'bf' : '66'}`);
    glow.addColorStop(1, `${color}00`);
    oval(point.x, point.y, r * 3.2, r * 3.2, glow, true);
    if (active) {
      oval(point.x, point.y, r * 2.2, r * 2.2, `${color}55`);
      oval(point.x, point.y, r * 1.58, r * 1.58, `${color}b0`);
    }
    oval(point.x, point.y, r, r, '#241e3c', true);
    oval(point.x, point.y, r, r, color, false, active ? 2.1 : 1.6);
    oval(point.x, point.y, r * .43, r * .43, color, true);
    if (active || width > 640) tag(entry.label || entry.title, point, r * 2.5, active);
    hitTargets.push({ kind: 'step', id: node.index, point, radius: Math.max(19, r * 2) });
  }

  function sourceCard(node) {
    const { point, floor, active, entry } = node;
    const accent = colors.source;
    const radius = Math.max(7, Math.min(13, point.scale * .27));
    line(floor, point, `${accent}${active ? 'b4' : '52'}`, 1, [3, 3]);
    oval(floor.x, floor.y, radius, radius * .48, `${accent}5a`);
    context.beginPath();
    context.roundRect(point.x - radius, point.y - radius, radius * 2, radius * 2, 4);
    context.fillStyle = active ? '#245452' : '#163439';
    context.strokeStyle = active ? accent : `${accent}b0`;
    context.lineWidth = active ? 2 : 1;
    context.fill();
    context.stroke();
    for (const offset of [-3, 1, 4]) line({ x: point.x - radius * .55, y: point.y + offset }, { x: point.x + radius * .54, y: point.y + offset }, accent);
    if (active || width > 640) tag((entry.label || entry.title).split(' · ')[0], point, -radius - 17, active);
    hitTargets.push({ kind: 'source', id: entry.id, point, radius: Math.max(18, radius * 1.8) });
  }

  function distribute(index, count, min, max) {
    return count <= 1 ? (min + max) / 2 : min + (max - min) * index / (count - 1);
  }

  function draw() {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    hitTargets = [];
    floorGrid();
    if (!data) return;

    const stages = data.stages.map((entry, index) => {
      const x = distribute(index, data.stages.length, -6.25, 6.25);
      const z = index % 2 ? .55 : -.2;
      const active = index === selected;
      return { entry, index, point: project([x, active ? 1.34 : .96, z]), floor: project([x, 0, z]), color: colors[entry.kind] || colors.candidate, active };
    });
    const sources = data.sources.map((entry, index) => {
      const x = distribute(index, data.sources.length, -3.95, 3.95);
      const z = index % 2 ? -2.6 : -2.12;
      return { entry, point: project([x, 2.24, z]), floor: project([x, 0, z]), active: entry.id === sourceId };
    });

    for (let index = 1; index < stages.length; index++) {
      const reached = index <= selected;
      line(stages[index - 1].floor, stages[index].floor, reached ? '#be9bffc7' : '#7b6ca794', reached ? 2.2 : 1.4);
    }
    for (const stage of stages) {
      const linked = new Set([...(stage.entry.sourceIds ?? []), ...(stage.entry.evidence ?? []).map((link) => link.sourceId)]);
      for (const source of sources) {
        if (linked.has(source.entry.id)) {
          const focus = stage.active && source.active;
          line(source.point, stage.point, focus ? '#9ef5e5d7' : stage.active ? '#8fe6e7a0' : '#9285b852', focus ? 2.1 : 1, stage.active ? [] : [4, 3]);
        }
      }
    }

    sources.sort((a, b) => a.point.depth - b.point.depth).forEach(sourceCard);
    stages.sort((a, b) => a.point.depth - b.point.depth).forEach(stageOrb);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.round(rect.width);
    height = Math.round(rect.height);
    const density = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
    draw();
  }

  function turn(value) {
    angle = Math.max(-49 * degree, Math.min(33 * degree, value));
    draw();
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    dragging = { id: event.pointerId, x: event.clientX, angle, moved: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging || event.pointerId !== dragging.id) return;
    const difference = event.clientX - dragging.x;
    if (Math.abs(difference) > 4) dragging.moved = true;
    if (!dragging.moved) return;
    canvas.classList.add('dragging');
    turn(dragging.angle + difference * .24 * degree);
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!dragging || event.pointerId !== dragging.id) return;
    const moved = dragging.moved;
    dragging = undefined;
    canvas.classList.remove('dragging');
    if (moved) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const closest = [...hitTargets].reverse().find(({ point, radius }) => Math.hypot(point.x - x, point.y - y) <= radius);
    if (!closest) return;
    if (closest.kind === 'step') onStep(closest.id);
    else onSource(closest.id);
  });
  canvas.addEventListener('pointercancel', () => {
    dragging = undefined;
    canvas.classList.remove('dragging');
  });
  new ResizeObserver(resize).observe(canvas);

  return {
    update(nextData, nextStep, nextSource) {
      data = nextData;
      selected = nextStep;
      sourceId = nextSource;
      draw();
    },
    rotate(direction) { turn(angle + direction * 11 * degree); },
  };
}
