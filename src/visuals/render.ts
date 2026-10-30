import type {
  BarsSpec,
  ChartSpec,
  GraphSpec,
  LayersSpec,
  MatrixSpec,
  MemorySpec,
  PipelineSpec,
  StackSpec,
  TableSpec,
  TimelineSpec,
  TopologyKind,
  TopologySpec,
  TreeSpec,
  VectorSpec,
  VisualSpec,
} from './types';

const NS = 'http://www.w3.org/2000/svg';
let markerCounter = 0;

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  text?: string,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag) as SVGElementTagNameMap[K];
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

function text(
  content: string,
  x: number,
  y: number,
  attrs: Record<string, string | number> = {},
): SVGTextElement {
  return svgEl('text', { x, y, ...attrs }, content);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function caption(svg: SVGSVGElement, value?: string): void {
  if (!value) return;
  svg.appendChild(text(value, 6, 12, { class: 'vz-title' }));
}

function markerDefs(svg: SVGSVGElement, id: string, hot: boolean): void {
  const defs = svgEl('defs');
  const marker = svgEl('marker', {
    id,
    viewBox: '0 0 10 10',
    refX: 9,
    refY: 5,
    markerWidth: 5,
    markerHeight: 5,
    orient: 'auto-start-reverse',
  });
  marker.appendChild(svgEl('path', {
    d: 'M 0 0 L 10 5 L 0 10 z',
    class: hot ? 'vz-arrow is-hot' : 'vz-arrow',
  }));
  defs.appendChild(marker);
  svg.appendChild(defs);
}

function renderBars(spec: BarsSpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const values = spec.values.length ? spec.values : [0];
  const max = Math.max(...values, 1);
  const left = 16;
  const right = 8;
  const top = 26;
  const bottom = 28;
  const width = 360 - left - right;
  const height = 180 - top - bottom;
  const gap = values.length > 20 ? 1 : values.length > 12 ? 2 : 4;
  const barWidth = Math.max(2, (width - gap * (values.length - 1)) / values.length);
  const highlight = new Set(spec.highlight ?? []);
  svg.appendChild(svgEl('line', { x1: left, y1: top + height, x2: 360 - right, y2: top + height, class: 'vz-axis' }));
  values.forEach((value, index) => {
    const barHeight = Math.max(2, (value / max) * height);
    const x = left + index * (barWidth + gap);
    const y = top + height - barHeight;
    svg.appendChild(svgEl('rect', {
      x: x.toFixed(2), y: y.toFixed(2), width: barWidth.toFixed(2), height: barHeight.toFixed(2),
      rx: Math.min(2, barWidth / 2), class: highlight.has(index) ? 'vz-bar is-hot' : 'vz-bar',
    }));
    if (spec.labels?.[index] && values.length <= 12) {
      svg.appendChild(text(truncate(spec.labels[index] ?? '', 4), x + barWidth / 2, top + height + 12, {
        'text-anchor': 'middle', class: 'vz-sub',
      }));
    } else if (values.length <= 12) {
      svg.appendChild(text(String(value), x + barWidth / 2, y - 4, {
        'text-anchor': 'middle', class: 'vz-sub',
      }));
    }
  });
  return svg;
}

function renderMatrix(spec: MatrixSpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const rows = spec.cells.length;
  const cols = Math.max(...spec.cells.map((row) => row.length), 1);
  const hasRowLabels = Boolean(spec.rowLabels?.length);
  const hasColLabels = Boolean(spec.colLabels?.length);
  const left = hasRowLabels ? 46 : 12;
  const top = hasColLabels ? 34 : 24;
  const availableW = 348 - left;
  const availableH = 166 - top;
  const cellSize = Math.min(28, availableW / cols, availableH / rows);
  const gridW = cellSize * cols;
  const gridH = cellSize * rows;
  const originX = left + Math.max(0, (availableW - gridW) / 2);
  const originY = top;
  const numeric = spec.cells.flat().filter((value): value is number => typeof value === 'number');
  const maxAbs = Math.max(...numeric.map((value) => Math.abs(value)), 1);
  const highlight = new Set((spec.highlight ?? []).map(([row, col]) => `${row}:${col}`));

  if (hasColLabels) {
    for (let col = 0; col < cols; col += 1) {
      svg.appendChild(text(truncate(String(spec.colLabels?.[col] ?? ''), 4), originX + col * cellSize + cellSize / 2, originY - 7, {
        'text-anchor': 'middle', class: 'vz-sub',
      }));
    }
  }
  if (hasRowLabels) {
    for (let row = 0; row < rows; row += 1) {
      svg.appendChild(text(truncate(String(spec.rowLabels?.[row] ?? ''), 5), left - 8, originY + row * cellSize + cellSize / 2 + 3, {
        'text-anchor': 'end', class: 'vz-sub',
      }));
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const value = spec.cells[row]?.[col] ?? '';
      const x = originX + col * cellSize;
      const y = originY + row * cellSize;
      const isHot = highlight.has(`${row}:${col}`);
      const numericValue = typeof value === 'number' ? value : Number.NaN;
      const intensity = spec.heat && Number.isFinite(numericValue)
        ? clamp(Math.abs(numericValue) / maxAbs, 0, 1)
        : 0;
      const rect = svgEl('rect', {
        x: x + 0.6,
        y: y + 0.6,
        width: cellSize - 1.2,
        height: cellSize - 1.2,
        rx: 1.5,
        class: isHot ? 'vz-cell is-hot' : 'vz-cell',
      });
      if (spec.heat && intensity > 0 && !isHot) {
        rect.setAttribute('style', `fill:var(--vz-accent);fill-opacity:${(0.08 + intensity * 0.34).toFixed(3)}`);
      }
      svg.appendChild(rect);
      const content = typeof value === 'number' ? (Number.isInteger(value) ? String(value) : value.toFixed(2)) : value;
      if (String(content).length <= 5) {
        svg.appendChild(text(String(content), x + cellSize / 2, y + cellSize / 2 + 2.8, {
          class: 'vz-cell-text',
        }));
      }
    }
  }
  return svg;
}

function renderChart(spec: ChartSpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const allPoints = spec.series.flatMap((series) => series.points);
  if (!allPoints.length) return svg;
  const xs = allPoints.map(([x]) => x);
  const ys = allPoints.map(([, y]) => y);
  const left = 32;
  const right = 12;
  const top = 22;
  const bottom = 30;
  const width = 360 - left - right;
  const height = 180 - top - bottom;
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(0, ...ys);
  const yMax = Math.max(...ys, yMin + 1);
  const mapX = (x: number) => left + ((x - xMin) / Math.max(1, xMax - xMin)) * width;
  const mapY = (y: number) => top + height - ((y - yMin) / Math.max(1, yMax - yMin)) * height;

  for (let i = 0; i <= 3; i += 1) {
    const y = top + (i / 3) * height;
    svg.appendChild(svgEl('line', { x1: left, y1: y, x2: 360 - right, y2: y, class: 'vz-grid' }));
  }
  svg.appendChild(svgEl('line', { x1: left, y1: top, x2: left, y2: top + height, class: 'vz-axis' }));
  svg.appendChild(svgEl('line', { x1: left, y1: top + height, x2: 360 - right, y2: top + height, class: 'vz-axis' }));

  spec.series.forEach((series, seriesIndex) => {
    const points = series.points;
    if (!points.length) return;
    if (series.mode !== 'dots') {
      const d = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${mapX(x).toFixed(2)} ${mapY(y).toFixed(2)}`).join(' ');
      const path = svgEl('path', { d, class: 'vz-line' });
      if (series.color) path.setAttribute('style', `stroke:${series.color}`);
      svg.appendChild(path);
    }
    points.forEach(([x, y], pointIndex) => {
      const isHot = spec.highlight?.[0] === seriesIndex && spec.highlight?.[1] === pointIndex;
      const dot = svgEl('circle', {
        cx: mapX(x).toFixed(2),
        cy: mapY(y).toFixed(2),
        r: isHot ? 4 : series.mode === 'dots' ? 3 : 2,
        class: isHot ? 'vz-dot is-hot' : 'vz-dot',
      });
      if (series.color && !isHot) dot.setAttribute('style', `stroke:${series.color}`);
      svg.appendChild(dot);
    });
  });

  if (spec.xLabel) {
    svg.appendChild(text(spec.xLabel, 360 - right, 174, { 'text-anchor': 'end', class: 'vz-sub' }));
  }
  if (spec.yLabel) {
    svg.appendChild(text(spec.yLabel, left, 16, { class: 'vz-sub' }));
  }
  return svg;
}

function renderGraph(spec: GraphSpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const nodes = spec.nodes;
  if (!nodes.length) return svg;
  const map: Record<string, { x: number; y: number; label: string }> = {};
  nodes.forEach((node, index) => {
    map[node.id] = {
      x: 30 + ((node.x ?? (50 + 42 * Math.cos((index / nodes.length) * Math.PI * 2))) / 100) * 300,
      y: 30 + ((node.y ?? (50 + 42 * Math.sin((index / nodes.length) * Math.PI * 2))) / 100) * 116,
      label: node.label,
    };
  });
  const markerId = `vz-arrow-${markerCounter += 1}`;
  if (spec.directed !== false) markerDefs(svg, markerId, false);
  const highlight = new Set(spec.highlight ?? []);
  const edgeCount = spec.edges.length;
  spec.edges.forEach((edge) => {
    const from = map[edge.a];
    const to = map[edge.b];
    if (!from || !to) return;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const x1 = from.x + ux * 12;
    const y1 = from.y + uy * 12;
    const x2 = to.x - ux * (spec.directed === false ? 12 : 15);
    const y2 = to.y - uy * (spec.directed === false ? 12 : 15);
    const hot = edge.hot || (highlight.has(edge.a) && highlight.has(edge.b));
    const line = svgEl('line', {
      x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2),
      class: hot ? 'vz-edge is-hot' : 'vz-edge',
    });
    if (spec.directed !== false) line.setAttribute('marker-end', `url(#${markerId})`);
    svg.appendChild(line);
    if (edge.label && edgeCount <= 7) {
      svg.appendChild(text(edge.label, (x1 + x2) / 2, (y1 + y2) / 2 - 3, {
        'text-anchor': 'middle',
        class: 'vz-sub',
        style: 'paint-order:stroke;stroke:#fbf8f2;stroke-width:3px',
      }));
    }
  });
  nodes.forEach((node) => {
    const position = map[node.id];
    if (!position) return;
    const hot = highlight.has(node.id);
    svg.appendChild(svgEl('circle', {
      cx: position.x.toFixed(2),
      cy: position.y.toFixed(2),
      r: nodes.length > 7 ? 10 : 12,
      class: hot ? 'vz-node is-hot' : 'vz-node',
    }));
    svg.appendChild(text(truncate(position.label, 4), position.x, position.y + 3, {
      class: 'vz-node-label',
    }));
  });
  return svg;
}

function renderTree(spec: TreeSpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const byId = new Map(spec.nodes.map((node) => [node.id, node]));
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const node of spec.nodes) {
    if (node.parent && byId.has(node.parent)) {
      const list = children.get(node.parent) ?? [];
      list.push(node.id);
      children.set(node.parent, list);
    } else {
      roots.push(node.id);
    }
  }
  if (!roots.length) return svg;
  const leafOrder: string[] = [];
  const depthMap = new Map<string, number>();
  const walk = (id: string, depth: number) => {
    depthMap.set(id, depth);
    const kids = children.get(id) ?? [];
    if (!kids.length) {
      leafOrder.push(id);
      return;
    }
    kids.forEach((kid) => walk(kid, depth + 1));
  };
  roots.forEach((root) => walk(root, 0));
  const positions: Record<string, { x: number; y: number }> = {};
  const maxDepth = Math.max(...depthMap.values(), 0);
  const leafGap = Math.min(62, 300 / Math.max(1, leafOrder.length - 1));
  const leafStart = 180 - (leafGap * (leafOrder.length - 1)) / 2;
  leafOrder.forEach((id, index) => {
    positions[id] = { x: leafStart + index * leafGap, y: 32 + maxDepth * 30 };
  });
  const place = (id: string) => {
    const kids = children.get(id) ?? [];
    if (!kids.length) return;
    kids.forEach(place);
    const xs = kids.map((kid) => positions[kid]?.x ?? 180);
    positions[id] = { x: xs.reduce((sum, x) => sum + x, 0) / xs.length, y: 32 + (depthMap.get(id) ?? 0) * 30 };
  };
  roots.forEach(place);
  const highlight = new Set(spec.highlight ?? []);
  spec.nodes.forEach((node) => {
    const parent = node.parent ? positions[node.parent] : null;
    const position = positions[node.id];
    if (!position) return;
    if (parent) {
      svg.appendChild(svgEl('line', {
        x1: parent.x.toFixed(2), y1: parent.y.toFixed(2), x2: position.x.toFixed(2), y2: position.y.toFixed(2),
        class: 'vz-edge',
      }));
    }
    const hot = highlight.has(node.id);
    svg.appendChild(svgEl('circle', {
      cx: position.x.toFixed(2),
      cy: position.y.toFixed(2),
      r: spec.nodes.length > 8 ? 9 : 11,
      class: hot ? 'vz-node is-hot' : 'vz-node',
    }));
    svg.appendChild(text(truncate(node.label, 4), position.x, position.y + 3, { class: 'vz-node-label' }));
  });
  return svg;
}

function renderPipeline(spec: PipelineSpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const steps = spec.steps;
  if (!steps.length) return svg;
  const totalWidth = 340;
  const gap = 8;
  const width = (totalWidth - gap * (steps.length - 1)) / steps.length;
  const y = 68;
  const height = 44;
  steps.forEach((step, index) => {
    const x = 10 + index * (width + gap);
    const hot = spec.highlight === index;
    svg.appendChild(svgEl('rect', {
      x: x.toFixed(2), y, width: width.toFixed(2), height, rx: 5,
      class: hot ? 'vz-block is-hot' : 'vz-block',
    }));
    svg.appendChild(text(String(index + 1), x + width / 2, y - 7, {
      'text-anchor': 'middle', class: 'vz-sub',
    }));
    svg.appendChild(text(truncate(step, steps.length > 5 ? 4 : 5), x + width / 2, y + height / 2 + 3, {
      'text-anchor': 'middle',
      class: 'vz-block-label',
      style: hot ? 'fill:#fffaf2' : '',
    }));
    if (index < steps.length - 1) {
      svg.appendChild(svgEl('path', {
        d: `M ${x + width + 1} ${y + height / 2} L ${x + width + gap - 2} ${y + height / 2}`,
        class: 'vz-edge',
        style: 'stroke-width:1.4',
      }));
    }
  });
  return svg;
}

function renderLayers(spec: LayersSpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const list = spec.layers;
  if (!list.length) return svg;
  const top = 24;
  const available = 140;
  const height = Math.min(28, available / list.length);
  list.forEach((layer, index) => {
    const y = top + index * height;
    const hot = spec.highlight === index;
    svg.appendChild(svgEl('rect', {
      x: 14, y: y + 0.8, width: 332, height: Math.max(12, height - 3), rx: 4,
      class: hot ? 'vz-block is-hot' : 'vz-block',
    }));
    svg.appendChild(text(truncate(layer.label, 12), 22, y + height / 2 + 2.8, {
      class: 'vz-title',
      style: hot ? 'fill:#fffaf2' : '',
    }));
    if (layer.sub) {
      svg.appendChild(text(truncate(layer.sub, 14), 338, y + height / 2 + 2.8, {
        'text-anchor': 'end',
        class: 'vz-sub',
        style: hot ? 'fill:#fff3e9' : '',
      }));
    }
  });
  return svg;
}

function renderTimeline(spec: TimelineSpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const rows = spec.rows;
  if (!rows.length) return svg;
  const allEnds = rows.flatMap((row) => row.blocks.map((block) => block.end));
  const max = spec.max ?? Math.max(1, ...allEnds);
  const left = 58;
  const right = 14;
  const top = 34;
  const rowHeight = Math.min(32, 128 / rows.length);
  const trackWidth = 360 - left - right;
  for (let i = 0; i <= 4; i += 1) {
    const x = left + (i / 4) * trackWidth;
    svg.appendChild(svgEl('line', { x1: x, y1: top - 5, x2: x, y2: 180 - 18, class: 'vz-grid' }));
    svg.appendChild(text(String(Math.round((i / 4) * max)), x, 180 - 6, { 'text-anchor': 'middle', class: 'vz-sub' }));
  }
  rows.forEach((row, rowIndex) => {
    const y = top + rowIndex * rowHeight;
    svg.appendChild(text(truncate(row.label, 8), left - 7, y + rowHeight / 2 + 2.5, {
      'text-anchor': 'end', class: 'vz-sub',
    }));
    svg.appendChild(svgEl('rect', {
      x: left, y: y + 4, width: trackWidth, height: Math.max(12, rowHeight - 11), rx: 3, class: 'vz-track',
    }));
    row.blocks.forEach((block) => {
      const x = left + (block.start / max) * trackWidth;
      const width = Math.max(3, ((block.end - block.start) / max) * trackWidth);
      svg.appendChild(svgEl('rect', {
        x, y: y + 4, width, height: Math.max(12, rowHeight - 11), rx: 3,
        class: block.hot ? 'vz-block is-hot' : 'vz-block',
      }));
      if (width > 22) {
        svg.appendChild(text(truncate(block.label, 6), x + width / 2, y + rowHeight / 2 + 2, {
          'text-anchor': 'middle',
          class: 'vz-block-label',
          style: block.hot ? 'fill:#fffaf2' : '',
        }));
      }
    });
  });
  return svg;
}

function renderMemory(spec: MemorySpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const cells = spec.cells;
  if (!cells.length) return svg;
  const columns = cells.length <= 8 ? Math.min(cells.length, 8) : 4;
  const rows = Math.ceil(cells.length / columns);
  const width = Math.min(44, 330 / columns);
  const height = Math.min(30, 120 / rows);
  const gridW = width * columns;
  const gridH = height * rows;
  const originX = 180 - gridW / 2;
  const originY = 42;
  const highlight = new Set(spec.highlight ?? []);
  cells.forEach((cell, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const x = originX + col * width;
    const y = originY + row * height;
    const hot = highlight.has(index);
    svg.appendChild(svgEl('rect', {
      x: x + 1.5, y: y + 1.5, width: width - 3, height: height - 3, rx: 3,
      class: hot ? 'vz-cell is-hot' : 'vz-cell',
    }));
    svg.appendChild(text(truncate(cell, 6), x + width / 2, y + height / 2 + 2.5, { class: 'vz-cell-text' }));
    if (spec.labels?.[index]) {
      svg.appendChild(text(truncate(spec.labels[index] ?? '', 5), x + width / 2, y + height - 3.5, {
        'text-anchor': 'middle', class: 'vz-sub',
      }));
    }
  });
  return svg;
}

function renderTable(spec: TableSpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const columns = spec.columns;
  const rows = spec.rows;
  if (!columns.length) return svg;
  const width = 340 / columns.length;
  const rowHeight = Math.min(26, 118 / Math.max(1, rows.length + 1));
  const originX = 10;
  const originY = 28;
  columns.forEach((column, index) => {
    svg.appendChild(svgEl('rect', {
      x: originX + index * width, y: originY, width, height: rowHeight,
      class: 'vz-block', style: 'fill:#f0e9dd',
    }));
    svg.appendChild(text(truncate(column, 6), originX + index * width + width / 2, originY + rowHeight / 2 + 2.5, {
      'text-anchor': 'middle', class: 'vz-sub',
    }));
  });
  rows.forEach((row, rowIndex) => {
    const y = originY + (rowIndex + 1) * rowHeight;
    if (spec.highlight === rowIndex) {
      svg.appendChild(svgEl('rect', {
        x: originX, y, width: width * columns.length, height: rowHeight,
        class: 'vz-block', style: 'fill:var(--vz-accent);fill-opacity:.14',
      }));
    }
    row.forEach((cell, colIndex) => {
      svg.appendChild(svgEl('line', {
        x1: originX + colIndex * width, y1: y, x2: originX + colIndex * width, y2: y + rowHeight, class: 'vz-axis',
      }));
      svg.appendChild(text(truncate(cell, 7), originX + colIndex * width + width / 2, y + rowHeight / 2 + 2.5, {
        'text-anchor': 'middle', class: 'vz-cell-text',
      }));
    });
  });
  return svg;
}

function renderStack(spec: StackSpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const items = spec.items;
  if (!items.length) return svg;
  const height = Math.min(27, 126 / items.length);
  const width = 176;
  const x = 92;
  const bottom = 166;
  items.forEach((item, index) => {
    const y = bottom - (items.length - index) * height;
    const hot = spec.pointer === index;
    svg.appendChild(svgEl('rect', {
      x, y: y + 1, width, height: height - 2, rx: 3,
      class: hot ? 'vz-cell is-hot' : 'vz-cell',
    }));
    svg.appendChild(text(truncate(item, 10), x + width / 2, y + height / 2 + 2.5, { class: 'vz-cell-text' }));
  });
  if (spec.pointer !== undefined) {
    const y = bottom - (items.length - spec.pointer) * height + height / 2;
    svg.appendChild(text('SP →', x - 9, y + 3, { 'text-anchor': 'end', class: 'vz-title' }));
  }
  return svg;
}

function renderVector(spec: VectorSpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const vectors = spec.vectors;
  if (!vectors.length) return svg;
  const cols = Math.max(...vectors.map((row) => row.length), 1);
  const left = spec.labels?.length ? 66 : 14;
  const cellSize = Math.min(28, (348 - left) / cols);
  const rowHeight = Math.min(26, 126 / vectors.length);
  const width = cellSize * cols;
  const originX = left + Math.max(0, (348 - left - width) / 2);
  const originY = 30;
  const maxAbs = Math.max(...vectors.flat().map((value) => Math.abs(value)), 0.001);
  vectors.forEach((row, rowIndex) => {
    if (spec.labels?.[rowIndex]) {
      svg.appendChild(text(truncate(spec.labels[rowIndex] ?? '', 8), left - 7, originY + rowIndex * rowHeight + rowHeight / 2 + 2.5, {
        'text-anchor': 'end', class: 'vz-sub',
      }));
    }
    row.forEach((value, colIndex) => {
      const intensity = clamp(Math.abs(value) / maxAbs, 0, 1);
      const positive = value >= 0;
      const x = originX + colIndex * cellSize;
      const y = originY + rowIndex * rowHeight;
      const rect = svgEl('rect', {
        x: x + 0.8, y: y + 0.8, width: cellSize - 1.6, height: rowHeight - 1.6, rx: 2,
        class: spec.highlight === rowIndex ? 'vz-cell is-hot' : 'vz-cell',
      });
      rect.setAttribute('style', `fill:${positive ? 'var(--vz-accent)' : '#667558'};fill-opacity:${(0.08 + intensity * 0.45).toFixed(3)}`);
      svg.appendChild(rect);
      svg.appendChild(text(value.toFixed(1), x + cellSize / 2, y + rowHeight / 2 + 2.5, {
        class: 'vz-cell-text',
      }));
    });
  });
  return svg;
}

function topologyPositions(kind: TopologyKind, labels: string[]): Array<{ label: string; x: number; y: number }> {
  const count = Math.max(1, labels.length);
  const values = labels.length ? labels : Array.from({ length: count }, (_, index) => String(index + 1));
  switch (kind) {
    case 'star': {
      const center = { label: values[0] ?? 'C', x: 180, y: 92 };
      const leaves = values.slice(1).map((label, index, list) => {
        const angle = (index / Math.max(1, list.length)) * Math.PI * 2 - Math.PI / 2;
        return { label, x: 180 + Math.cos(angle) * 78, y: 92 + Math.sin(angle) * 56 };
      });
      return [center, ...leaves];
    }
    case 'ring':
      return values.map((label, index) => {
        const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
        return { label, x: 180 + Math.cos(angle) * 88, y: 94 + Math.sin(angle) * 62 };
      });
    case 'bus':
      return values.map((label, index) => ({
        label,
        x: 40 + (index / Math.max(1, count - 1)) * 280,
        y: 82 + (index % 2 === 0 ? -28 : 28),
      }));
    case 'tree': {
      const nodes = [{ label: values[0] ?? 'R', x: 180, y: 38 }];
      const second = values.slice(1, 3);
      second.forEach((label, index) => nodes.push({ label, x: 110 + index * 140, y: 88 }));
      values.slice(3, 7).forEach((label, index) => nodes.push({ label, x: 55 + index * 83, y: 140 }));
      return nodes;
    }
    case 'fat-tree': {
      const nodes = [];
      for (let i = 0; i < 3; i += 1) nodes.push({ label: `核心${i + 1}`, x: 80 + i * 100, y: 38 });
      for (let i = 0; i < 4; i += 1) nodes.push({ label: `汇聚${i + 1}`, x: 55 + i * 83, y: 94 });
      for (let i = 0; i < 6; i += 1) nodes.push({ label: `边缘${i + 1}`, x: 34 + i * 58, y: 148 });
      return nodes;
    }
    case 'mesh':
    default: {
      const positions: Array<{ label: string; x: number; y: number }> = [];
      values.slice(0, 8).forEach((label, index) => {
        const columns = 4;
        const row = Math.floor(index / columns);
        const col = index % columns;
        positions.push({ label, x: 60 + col * 80, y: 58 + row * 62 });
      });
      return positions;
    }
  }
}

function renderTopology(spec: TopologySpec): SVGSVGElement {
  const svg = svgEl('svg', { viewBox: '0 0 360 180', class: 'vz', role: 'img' });
  caption(svg, spec.caption);
  const positions = topologyPositions(spec.kind, spec.labels ?? []);
  const highlight = new Set(spec.highlight ?? []);
  const edges: Array<[number, number]> = [];
  if (spec.kind === 'star') {
    for (let i = 1; i < positions.length; i += 1) edges.push([0, i]);
  } else if (spec.kind === 'ring') {
    for (let i = 0; i < positions.length; i += 1) edges.push([i, (i + 1) % positions.length]);
  } else if (spec.kind === 'bus') {
    for (let i = 0; i < positions.length - 1; i += 1) edges.push([i, i + 1]);
  } else if (spec.kind === 'tree' || spec.kind === 'fat-tree') {
    for (let i = 1; i < positions.length; i += 1) edges.push([Math.floor((i - 1) / 2), i]);
  } else {
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        if ((i + j) % 2 === 0) edges.push([i, j]);
      }
    }
  }
  edges.forEach(([a, b]) => {
    const from = positions[a];
    const to = positions[b];
    if (!from || !to) return;
    svg.appendChild(svgEl('line', {
      x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: 'vz-edge',
    }));
  });
  positions.forEach((position) => {
    const hot = highlight.has(position.label);
    svg.appendChild(svgEl('circle', {
      cx: position.x, cy: position.y, r: spec.kind === 'fat-tree' ? 9 : 12,
      class: hot ? 'vz-node is-hot' : 'vz-node',
    }));
    svg.appendChild(text(truncate(position.label, spec.kind === 'fat-tree' ? 3 : 4), position.x, position.y + 3, {
      class: 'vz-node-label',
    }));
  });
  return svg;
}

export function renderVisual(spec: VisualSpec): SVGSVGElement {
  switch (spec.type) {
    case 'bars': return renderBars(spec);
    case 'matrix': return renderMatrix(spec);
    case 'chart': return renderChart(spec);
    case 'graph': return renderGraph(spec);
    case 'tree': return renderTree(spec);
    case 'pipeline': return renderPipeline(spec);
    case 'layers': return renderLayers(spec);
    case 'timeline': return renderTimeline(spec);
    case 'memory': return renderMemory(spec);
    case 'table': return renderTable(spec);
    case 'stack': return renderStack(spec);
    case 'vector': return renderVector(spec);
    case 'topology': return renderTopology(spec);
    default: {
      const exhaustive: never = spec;
      throw new Error(`Unsupported visual: ${JSON.stringify(exhaustive)}`);
    }
  }
}
