import type { Stage } from './model';

function escape(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function svgText(x: number, y: number, text: string | number, className = ''): string {
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="${className}" text-anchor="middle" dominant-baseline="middle">${escape(text)}</text>`;
}

function bounds<T extends { x: number; y: number }>(nodes: T[]): { minX: number; maxX: number; minY: number; maxY: number } {
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  return {
    minX: Math.min(...xs, 0),
    maxX: Math.max(...xs, 100),
    minY: Math.min(...ys, 0),
    maxY: Math.max(...ys, 100),
  };
}

function project(value: number, min: number, max: number, from: number, to: number): number {
  if (max === min) return (from + to) / 2;
  return from + ((value - min) / (max - min)) * (to - from);
}

function renderArray(stage: Extract<Stage, { kind: 'array' }>): string {
  const max = Math.max(1, ...stage.values);
  const bars = stage.values.map((value, index) => {
    const classes = ['ab-bar'];
    if (stage.active.includes(index)) classes.push('is-active');
    if (stage.compare.includes(index)) classes.push('is-compare');
    if (stage.sorted.includes(index)) classes.push('is-sorted');
    if (stage.range && (index < stage.range[0] || index > stage.range[1])) classes.push('is-outside');
    return `
      <div class="${classes.join(' ')}" style="--bar-height:${Math.max(4, (value / max) * 100)}%">
        <span class="ab-bar-value">${escape(value)}</span>
      </div>`;
  }).join('');
  return `<div class="ab-stage ab-stage-array">
    <div class="ab-array-plot">${bars}</div>
    <div class="ab-stage-caption">${escape(stage.caption)}</div>
  </div>`;
}

function renderGraph(stage: Extract<Stage, { kind: 'graph' }>): string {
  const box = bounds(stage.nodes);
  const nodes = stage.nodes.map((node) => {
    const x = project(node.x, box.minX, box.maxX, 36, 424);
    const y = project(node.y, box.minY, box.maxY, 34, 224);
    const classes = ['ab-node'];
    if (node.state) classes.push(`is-${node.state}`);
    return `<g class="${classes.join(' ')}">
      <circle cx="${x}" cy="${y}" r="14"></circle>
      ${svgText(x, y + 0.5, node.label, 'ab-node-label')}
    </g>`;
  }).join('');
  const positions = new Map(stage.nodes.map((node) => {
    const x = project(node.x, box.minX, box.maxX, 36, 424);
    const y = project(node.y, box.minY, box.maxY, 34, 224);
    return [node.id, [x, y]];
  }));
  const edges = stage.edges.map((edge) => {
    const a = positions.get(edge.a);
    const b = positions.get(edge.b);
    if (!a || !b) return '';
    const classes = ['ab-edge'];
    if (edge.state) classes.push(`is-${edge.state}`);
    return `<line class="${classes.join(' ')}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"></line>`;
  }).join('');
  return `<div class="ab-stage ab-stage-graph">
    <svg viewBox="0 0 460 260" role="img" aria-label="${escape(stage.caption)}">${edges}${nodes}</svg>
    <div class="ab-queue">
      <span class="ab-queue-label">QUEUE</span>
      ${stage.queue.length ? stage.queue.map((item) => `<span class="ab-chip">${escape(item)}</span>`).join('') : '<span class="ab-muted">空</span>'}
      <span class="ab-queue-label">VISITED</span>
      <span class="ab-muted">${stage.visited.length ? stage.visited.map(escape).join(' · ') : '—'}</span>
    </div>
    <div class="ab-stage-caption">${escape(stage.caption)}</div>
  </div>`;
}

function renderTree(stage: Extract<Stage, { kind: 'tree' }>): string {
  const box = bounds(stage.nodes);
  const positions = new Map(stage.nodes.map((node) => {
    const x = project(node.x, box.minX, box.maxX, 30, 430);
    const y = project(node.y, box.minY, box.maxY, 30, 230);
    return [node.id, [x, y]];
  }));
  const edges = stage.nodes.map((node) => {
    if (!node.parent) return '';
    const a = positions.get(node.parent);
    const b = positions.get(node.id);
    if (!a || !b) return '';
    return `<line class="ab-edge" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"></line>`;
  }).join('');
  const nodes = stage.nodes.map((node) => {
    const [x, y] = positions.get(node.id) ?? [0, 0];
    const classes = ['ab-node', `is-${node.color ?? 'black'}`];
    if (node.state) classes.push(`is-${node.state}`);
    return `<g class="${classes.join(' ')}">
      <circle cx="${x}" cy="${y}" r="14"></circle>
      ${svgText(x, y + 0.5, node.label, 'ab-node-label')}
    </g>`;
  }).join('');
  return `<div class="ab-stage ab-stage-tree">
    ${stage.nodes.length ? `<svg viewBox="0 0 460 260" role="img" aria-label="${escape(stage.caption)}">${edges}${nodes}</svg>` : '<div class="ab-empty-stage">空树 · 等待第一步操作</div>'}
    <div class="ab-stage-caption">${escape(stage.caption)}</div>
  </div>`;
}

function renderMatrix(stage: Extract<Stage, { kind: 'matrix' }>): string {
  const active = new Set(stage.active.map(([row, col]) => `${row}:${col}`));
  const path = new Set((stage.path ?? []).map(([row, col]) => `${row}:${col}`));
  const head = `<tr><th></th>${stage.cols.map((col) => `<th>${escape(col)}</th>`).join('')}</tr>`;
  const rows = stage.cells.map((row, rowIndex) => `<tr><th>${escape(stage.rows[rowIndex] ?? '')}</th>${row.map((cell, colIndex) => {
    const key = `${rowIndex}:${colIndex}`;
    const classes = ['ab-matrix-cell'];
    if (active.has(key)) classes.push('is-active');
    if (path.has(key)) classes.push('is-path');
    return `<td class="${classes.join(' ')}">${escape(cell)}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="ab-stage ab-stage-matrix">
    <div class="ab-matrix-wrap"><table class="ab-matrix"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
    <div class="ab-stage-caption">${escape(stage.caption)}</div>
  </div>`;
}

function renderChart(stage: Extract<Stage, { kind: 'chart' }>): string {
  const all = stage.series.flatMap((series) => series.points);
  const xs = all.map(([x]) => x);
  const ys = all.map(([, y]) => y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const map = ([x, y]: [number, number]): [number, number] => [
    project(x, minX, maxX, 34, 434),
    project(y, minY, maxY, 224, 22),
  ];
  const lines = stage.series.map((series) => {
    const points = series.points.map(map).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return `<polyline class="ab-chart-line" style="stroke:${series.color ?? 'var(--accent)'}" points="${points}"></polyline>`;
  }).join('');
  const marker = stage.marker ? map(stage.marker) : null;
  return `<div class="ab-stage ab-stage-chart">
    <svg viewBox="0 0 468 250" role="img" aria-label="${escape(stage.caption)}">
      <line class="ab-axis" x1="34" y1="224" x2="444" y2="224"></line>
      <line class="ab-axis" x1="34" y1="22" x2="34" y2="224"></line>
      ${lines}
      ${marker ? `<circle class="ab-chart-marker" cx="${marker[0]}" cy="${marker[1]}" r="5"></circle>` : ''}
      ${svgText(450, 236, stage.xLabel, 'ab-axis-label')}
      ${svgText(18, 20, stage.yLabel, 'ab-axis-label')}
    </svg>
    <div class="ab-stage-caption">${escape(stage.caption)}</div>
  </div>`;
}

function renderTimeline(stage: Extract<Stage, { kind: 'timeline' }>): string {
  const max = Math.max(1, stage.max || 1);
  const rows = stage.rows.map((row) => {
    const blocks = row.blocks.map((block) => {
      const left = (block.start / max) * 100;
      const width = Math.max(1.5, ((block.end - block.start) / max) * 100);
      return `<span class="ab-gantt-block" style="left:${left}%;width:${width}%">${escape(block.label)}</span>`;
    }).join('');
    return `<div class="ab-gantt-row"><span class="ab-gantt-label">${escape(row.label)}</span><div class="ab-gantt-track">${blocks}</div></div>`;
  }).join('');
  return `<div class="ab-stage ab-stage-timeline">
    <div class="ab-gantt">${rows}<div class="ab-gantt-now" style="left:calc(78px + (100% - 78px) * ${Math.min(1, stage.now / max)})"></div></div>
    <div class="ab-stage-caption">${escape(stage.caption)}</div>
  </div>`;
}

function renderFrames(stage: Extract<Stage, { kind: 'frames' }>): string {
  const refs = stage.reference.map((page, index) => `<span class="ab-ref ${index === stage.cursor ? 'is-current' : ''}">${escape(page)}</span>`).join('');
  const frames = stage.frames.map((page, index) => `<div class="ab-frame ${page === null ? 'is-empty' : ''} ${stage.victim === page ? 'is-victim' : ''}">
    <span class="ab-frame-index">F${index + 1}</span>
    <strong>${page ?? '—'}</strong>
  </div>`).join('');
  return `<div class="ab-stage ab-stage-frames">
    <div class="ab-ref-strip">${refs}</div>
    <div class="ab-frames">${frames}</div>
    ${stage.hit === undefined ? '<div class="ab-result">READY</div>' : `<div class="ab-result ${stage.hit ? 'is-hit' : 'is-miss'}">${stage.hit ? 'HIT' : 'PAGE FAULT'}${stage.victim ? ` · 淘汰 ${escape(stage.victim)}` : ''}</div>`}
    <div class="ab-stage-caption">${escape(stage.caption)}</div>
  </div>`;
}

function renderTable(stage: Extract<Stage, { kind: 'table' }>): string {
  const rows = stage.rows.map((row, index) => `<tr class="${index === stage.activeRow ? 'is-active' : ''}">
    ${row.map((cell, colIndex) => `<td class="${colIndex === stage.activeCol ? 'is-active' : ''}">${escape(cell)}</td>`).join('')}
  </tr>`).join('');
  return `<div class="ab-stage ab-stage-table">
    <table class="ab-data-table"><thead><tr>${stage.columns.map((column) => `<th>${escape(column)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
    <div class="ab-stage-caption">${escape(stage.caption)}</div>
  </div>`;
}

function renderStack(stage: Extract<Stage, { kind: 'stack' }>): string {
  const items = stage.items.map((item, index) => `<div class="ab-stack-item ${index === stage.active ? 'is-active' : ''}">${escape(item)}</div>`).join('');
  return `<div class="ab-stage ab-stage-stack"><div class="ab-stack">${items || '<span class="ab-muted">空栈</span>'}</div><div class="ab-stage-caption">${escape(stage.caption)}</div></div>`;
}

function renderVector(stage: Extract<Stage, { kind: 'vector' }>): string {
  const rows = stage.vectors.map((row, rowIndex) => `<div class="ab-vec-row ${rowIndex === stage.activeRow ? 'is-active' : ''}">
    <span class="ab-vec-label">${escape(stage.labels[rowIndex] ?? `v${rowIndex + 1}`)}</span>
    ${row.map((value, colIndex) => `<span class="ab-vec-cell ${colIndex === stage.activeCol ? 'is-active' : ''}">${escape(value)}</span>`).join('')}
  </div>`).join('');
  return `<div class="ab-stage ab-stage-vector">${rows}<div class="ab-stage-caption">${escape(stage.caption)}</div></div>`;
}

function renderLayers(stage: Extract<Stage, { kind: 'layers' }>): string {
  const layers = stage.layers.map((layer, index) => `<div class="ab-layer ${index === stage.active ? 'is-active' : ''}">
    <strong>${escape(layer.label)}</strong>
    <span>${escape(layer.sub ?? '')}</span>
    <em>${escape(layer.value ?? '')}</em>
  </div>`).join('');
  return `<div class="ab-stage ab-stage-layers"><div class="ab-layer-stack">${layers}</div><div class="ab-stage-caption">${escape(stage.caption)}</div></div>`;
}

function renderPipeline(stage: Extract<Stage, { kind: 'pipeline' }>): string {
  const steps = stage.steps.map((step, index) => `<div class="ab-pipe-stage ${index === stage.active ? 'is-active' : ''}">
    <span>${index + 1}</span><strong>${escape(step)}</strong>
  </div>`).join('');
  return `<div class="ab-stage ab-stage-pipeline"><div class="ab-pipeline">${steps}</div><div class="ab-stage-caption">${escape(stage.caption)}</div></div>`;
}

function renderTopology(stage: Extract<Stage, { kind: 'topology' }>): string {
  const positions = new Map(stage.nodes.map((node) => [node.id, [node.x, node.y]]));
  const edges = stage.edges.map((edge) => {
    const a = positions.get(edge.a);
    const b = positions.get(edge.b);
    if (!a || !b) return '';
    return `<line class="ab-edge ${edge.state ? `is-${edge.state}` : ''}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"></line>`;
  }).join('');
  const nodes = stage.nodes.map((node) => `<g class="ab-node ${node.state ? `is-${node.state}` : ''}">
    <circle cx="${node.x}" cy="${node.y}" r="13"></circle>${svgText(node.x, node.y + 0.5, node.label, 'ab-node-label')}
  </g>`).join('');
  return `<div class="ab-stage ab-stage-topology">
    <svg viewBox="0 0 460 240" role="img" aria-label="${escape(stage.caption)}">${edges}${nodes}</svg>
    <div class="ab-path">PATH ${stage.path.length ? stage.path.map(escape).join(' → ') : '—'}</div>
    <div class="ab-stage-caption">${escape(stage.caption)}</div>
  </div>`;
}

export function renderStage(stage: Stage): string {
  switch (stage.kind) {
    case 'array': return renderArray(stage);
    case 'graph': return renderGraph(stage);
    case 'tree': return renderTree(stage);
    case 'matrix': return renderMatrix(stage);
    case 'chart': return renderChart(stage);
    case 'timeline': return renderTimeline(stage);
    case 'frames': return renderFrames(stage);
    case 'table': return renderTable(stage);
    case 'stack': return renderStack(stage);
    case 'vector': return renderVector(stage);
    case 'layers': return renderLayers(stage);
    case 'pipeline': return renderPipeline(stage);
    case 'topology': return renderTopology(stage);
    default: return '';
  }
}
