(function () {
  'use strict';

  const engine = window.FlowEngine;
  if (!engine) throw new Error('FlowEngine is missing.');

  const network = {
    nodes: ['S', 'A', 'B', 'C', 'D', 'T'],
    source: 'S',
    sink: 'T',
    edges: [
      { u: 'S', v: 'A', capacity: 8 },
      { u: 'S', v: 'B', capacity: 7 },
      { u: 'A', v: 'B', capacity: 2 },
      { u: 'A', v: 'C', capacity: 6 },
      { u: 'A', v: 'D', capacity: 3 },
      { u: 'B', v: 'C', capacity: 2 },
      { u: 'B', v: 'D', capacity: 5 },
      { u: 'C', v: 'D', capacity: 2 },
      { u: 'C', v: 'T', capacity: 8 },
      { u: 'D', v: 'T', capacity: 7 },
    ],
  };

  const result = engine.solve(network);
  const positions = new Map([
    ['S', { x: 80, y: 190 }],
    ['A', { x: 260, y: 82 }],
    ['B', { x: 260, y: 298 }],
    ['C', { x: 470, y: 82 }],
    ['D', { x: 470, y: 298 }],
    ['T', { x: 680, y: 190 }],
  ]);
  const state = { index: 0 };

  const dom = {
    canvas: document.querySelector('#flowCanvas'),
    message: document.querySelector('#flowMessage'),
    total: document.querySelector('#flowTotal'),
    limit: document.querySelector('#flowLimit'),
    iteration: document.querySelector('#flowIteration'),
    cut: document.querySelector('#flowCut'),
    reach: document.querySelector('#flowReach'),
    stage: document.querySelector('#flowStage'),
    next: document.querySelector('#flowNext'),
    reset: document.querySelector('#flowReset'),
  };

  function svgEl(tag, attrs) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, String(value));
    return node;
  }

  function edgeKey(a, b) {
    return `${a}->${b}`;
  }

  function edgeFlow(step, from, to) {
    return step.flows.find((edge) => edge.from === from && edge.to === to)?.flow || 0;
  }

  function draw() {
    const step = result.steps[state.index];
    const pathSet = new Set((step.path || []).map(([from, to]) => edgeKey(from, to)));
    const pathNodes = new Set(step.pathNodes || []);
    const cutSet = new Set((step.minCut || []).map((edge) => edgeKey(edge.from, edge.to)));
    const reachable = new Set(step.reachable || []);
    const totalAugmentations = result.steps.filter((item) => item.kind === 'augment').length;

    dom.canvas.replaceChildren();
    const svg = svgEl('svg', { viewBox: '0 0 760 380', role: 'img', 'aria-label': 'Edmonds-Karp 残量网络演示' });
    const defs = svgEl('defs');
    const marker = svgEl('marker', {
      id: 'flowArrow', viewBox: '0 0 10 10', refX: '9', refY: '5',
      markerWidth: '5', markerHeight: '5', orient: 'auto-start-reverse',
    });
    const arrow = svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#9b8e7b' });
    marker.appendChild(arrow);
    defs.appendChild(marker);
    svg.appendChild(defs);

    const edgeLayer = svgEl('g');
    const labelLayer = svgEl('g');
    const nodeLayer = svgEl('g');

    network.edges.forEach((edge, index) => {
      const from = positions.get(edge.u);
      const to = positions.get(edge.v);
      const flow = edgeFlow(step, edge.u, edge.v);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      const startX = from.x + ux * 27;
      const startY = from.y + uy * 27;
      const endX = to.x - ux * 30;
      const endY = to.y - uy * 30;
      const className = [
        'flow-edge',
        flow > 0 ? 'is-flowing' : '',
        pathSet.has(edgeKey(edge.u, edge.v)) ? 'is-augment' : '',
        cutSet.has(edgeKey(edge.u, edge.v)) ? 'is-cut' : '',
      ].filter(Boolean).join(' ');
      const line = svgEl('line', {
        x1: startX.toFixed(2), y1: startY.toFixed(2),
        x2: endX.toFixed(2), y2: endY.toFixed(2),
        class: className,
        'marker-end': 'url(#flowArrow)',
      });
      const title = svgEl('title');
      title.textContent = `${edge.u} → ${edge.v}：流量 ${flow} / 容量 ${edge.capacity}`;
      line.appendChild(title);
      edgeLayer.appendChild(line);

      const label = svgEl('text', {
        x: ((startX + endX) / 2).toFixed(2),
        y: ((startY + endY) / 2 - 5).toFixed(2),
        class: 'flow-edge-label',
      });
      label.textContent = `${flow}/${edge.capacity}`;
      labelLayer.appendChild(label);
    });

    network.nodes.forEach((id) => {
      const position = positions.get(id);
      const classes = [
        'flow-node',
        id === network.source ? 'is-source' : '',
        id === network.sink ? 'is-sink' : '',
        reachable.has(id) ? 'is-reachable' : '',
        pathNodes.has(id) ? 'is-on-path' : '',
      ].filter(Boolean).join(' ');
      const group = svgEl('g', { class: classes });
      group.appendChild(svgEl('circle', {
        cx: position.x, cy: position.y, r: 26,
      }));
      const label = svgEl('text', { x: position.x, y: position.y });
      label.textContent = id;
      group.appendChild(label);
      nodeLayer.appendChild(group);
    });

    svg.append(edgeLayer, labelLayer, nodeLayer);
    dom.canvas.appendChild(svg);

    dom.total.textContent = String(step.totalFlow);
    dom.limit.textContent = step.kind === 'done' ? String(result.maxFlow) : '?';
    const completedIterations = step.kind === 'done'
      ? totalAugmentations
      : Math.min(step.iteration || 0, totalAugmentations);
    dom.iteration.textContent = `${completedIterations} / ${totalAugmentations}`;
    dom.cut.textContent = step.kind === 'done' ? String(step.minCutCapacity) : '—';
    dom.reach.textContent = step.kind === 'done'
      ? (step.reachable || []).join(' · ')
      : 'S';
    dom.stage.textContent = step.kind;
    dom.message.textContent = step.message;
    dom.next.disabled = state.index >= result.steps.length - 1;
    dom.next.textContent = dom.next.disabled ? '已达到最大流' : '下一步增广';
  }

  dom.next.addEventListener('click', () => {
    if (state.index < result.steps.length - 1) {
      state.index += 1;
      draw();
    }
  });

  dom.reset.addEventListener('click', () => {
    state.index = 0;
    draw();
  });

  draw();

  const tocLinks = Array.from(document.querySelectorAll('.research-toc a'));
  const sections = Array.from(document.querySelectorAll('.research-topic'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const id = visible[0].target.id;
      for (const link of tocLinks) {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
      }
    }, { rootMargin: '-18% 0px -68% 0px', threshold: 0.01 });
    sections.forEach((section) => observer.observe(section));
  }
})();
