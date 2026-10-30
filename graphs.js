/* Curated weighted graphs used by the visualizer. Coordinates use a 1000 x 470 canvas. */
(function (root) {
  'use strict';

  const PRESETS = [
    {
      id: 'delta',
      name: '三角洲网络',
      code: 'NETWORK 01',
      start: 'A',
      end: 'H',
      blurb: '一张疏密有致的加权图，最短路并不总是节点最少的那条。',
      nodes: [
        { id: 'A', x: 86, y: 226 },
        { id: 'B', x: 262, y: 84 },
        { id: 'C', x: 344, y: 234 },
        { id: 'D', x: 214, y: 393 },
        { id: 'E', x: 548, y: 96 },
        { id: 'F', x: 604, y: 252 },
        { id: 'G', x: 468, y: 406 },
        { id: 'H', x: 892, y: 212 },
        { id: 'I', x: 762, y: 362 },
      ],
      edges: [
        { u: 'A', v: 'B', w: 4 },
        { u: 'A', v: 'C', w: 4 },
        { u: 'A', v: 'D', w: 8 },
        { u: 'B', v: 'C', w: 2 },
        { u: 'B', v: 'E', w: 7 },
        { u: 'C', v: 'D', w: 3 },
        { u: 'C', v: 'E', w: 5 },
        { u: 'C', v: 'F', w: 5 },
        { u: 'D', v: 'F', w: 6 },
        { u: 'D', v: 'G', w: 4 },
        { u: 'E', v: 'F', w: 2 },
        { u: 'E', v: 'H', w: 8 },
        { u: 'F', v: 'G', w: 2 },
        { u: 'F', v: 'H', w: 2 },
        { u: 'G', v: 'I', w: 3 },
        { u: 'H', v: 'I', w: 5 },
      ],
    },
    {
      id: 'harbor',
      name: '港湾网络',
      code: 'NETWORK 02',
      start: 'A',
      end: 'I',
      blurb: '右侧密集的连线制造了更多候选路径，注意队列里的距离变化。',
      nodes: [
        { id: 'A', x: 90, y: 235 },
        { id: 'B', x: 250, y: 88 },
        { id: 'C', x: 390, y: 175 },
        { id: 'D', x: 285, y: 360 },
        { id: 'E', x: 520, y: 310 },
        { id: 'F', x: 625, y: 92 },
        { id: 'G', x: 735, y: 220 },
        { id: 'H', x: 650, y: 410 },
        { id: 'I', x: 890, y: 330 },
      ],
      edges: [
        { u: 'A', v: 'B', w: 5 },
        { u: 'A', v: 'D', w: 3 },
        { u: 'A', v: 'C', w: 8 },
        { u: 'B', v: 'C', w: 2 },
        { u: 'B', v: 'F', w: 7 },
        { u: 'C', v: 'D', w: 4 },
        { u: 'C', v: 'E', w: 3 },
        { u: 'C', v: 'F', w: 6 },
        { u: 'D', v: 'E', w: 5 },
        { u: 'D', v: 'H', w: 8 },
        { u: 'E', v: 'H', w: 2 },
        { u: 'E', v: 'G', w: 7 },
        { u: 'F', v: 'G', w: 3 },
        { u: 'G', v: 'I', w: 2 },
        { u: 'H', v: 'I', w: 5 },
      ],
    },
    {
      id: 'ridge',
      name: '山脊网络',
      code: 'NETWORK 03',
      start: 'C',
      end: 'G',
      blurb: '多个节点拥有相近的暂定距离，适合观察优先队列的出队顺序。',
      nodes: [
        { id: 'A', x: 100, y: 170 },
        { id: 'B', x: 230, y: 320 },
        { id: 'C', x: 355, y: 180 },
        { id: 'D', x: 500, y: 90 },
        { id: 'E', x: 515, y: 300 },
        { id: 'F', x: 690, y: 165 },
        { id: 'G', x: 835, y: 315 },
        { id: 'H', x: 675, y: 415 },
        { id: 'I', x: 390, y: 430 },
      ],
      edges: [
        { u: 'A', v: 'B', w: 4 },
        { u: 'A', v: 'C', w: 7 },
        { u: 'A', v: 'D', w: 6 },
        { u: 'B', v: 'C', w: 2 },
        { u: 'B', v: 'E', w: 5 },
        { u: 'B', v: 'I', w: 6 },
        { u: 'C', v: 'D', w: 5 },
        { u: 'C', v: 'E', w: 8 },
        { u: 'D', v: 'E', w: 2 },
        { u: 'D', v: 'F', w: 4 },
        { u: 'E', v: 'F', w: 3 },
        { u: 'E', v: 'H', w: 7 },
        { u: 'E', v: 'I', w: 4 },
        { u: 'F', v: 'G', w: 5 },
        { u: 'F', v: 'H', w: 6 },
        { u: 'G', v: 'H', w: 2 },
        { u: 'G', v: 'I', w: 8 },
        { u: 'H', v: 'I', w: 5 },
      ],
    },
  ];

  const DENSITIES = {
    sparse: { label: '稀疏', factor: 0.18 },
    medium: { label: '适中', factor: 0.38 },
    dense: { label: '密集', factor: 0.62 },
  };

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function random() {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generate(params) {
    const settings = params || {};
    const nodeCount = Math.max(6, Math.min(10, Math.round(Number(settings.nodeCount) || 9)));
    const density = DENSITIES[settings.density] ? settings.density : 'medium';
    const weightMax = [9, 20].includes(Number(settings.weightMax)) ? Number(settings.weightMax) : 9;
    const seed = Math.max(1, Math.min(999999, Math.round(Number(settings.seed) || 2026)));
    const random = mulberry32(seed);
    const letters = 'ABCDEFGHIJ';

    const nodes = [];
    for (let index = 0; index < nodeCount; index += 1) {
      const angle = -Math.PI / 2 + (index / nodeCount) * Math.PI * 2 + (random() - 0.5) * 0.24;
      const radiusX = 330 + random() * 80;
      const radiusY = 142 + random() * 34;
      const x = 500 + Math.cos(angle) * radiusX + (random() - 0.5) * 34;
      const y = 235 + Math.sin(angle) * radiusY + (random() - 0.5) * 26;
      nodes.push({
        id: letters[index],
        x: Math.round(Math.max(64, Math.min(936, x))),
        y: Math.round(Math.max(45, Math.min(424, y))),
      });
    }

    const edges = [];
    const edgeKeys = new Set();
    const addEdge = (uIndex, vIndex) => {
      if (uIndex === vIndex) return false;
      const a = Math.min(uIndex, vIndex);
      const b = Math.max(uIndex, vIndex);
      const key = `${a}:${b}`;
      if (edgeKeys.has(key)) return false;
      edgeKeys.add(key);
      edges.push({
        u: letters[a],
        v: letters[b],
        w: 1 + Math.floor(random() * weightMax),
      });
      return true;
    };

    for (let index = 1; index < nodeCount; index += 1) {
      addEdge(index, Math.floor(random() * index));
    }

    const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
    const targetEdges = Math.min(
      maxEdges,
      Math.max(nodeCount - 1, Math.round(nodeCount - 1 + (maxEdges - (nodeCount - 1)) * DENSITIES[density].factor))
    );
    let attempts = 0;
    while (edges.length < targetEdges && attempts < 500) {
      attempts += 1;
      addEdge(Math.floor(random() * nodeCount), Math.floor(random() * nodeCount));
    }

    const adjacency = new Map(nodes.map((node) => [node.id, []]));
    for (const edge of edges) {
      adjacency.get(edge.u).push({ id: edge.v, w: edge.w });
      adjacency.get(edge.v).push({ id: edge.u, w: edge.w });
    }
    const distances = new Map(nodes.map((node) => [node.id, Infinity]));
    const visited = new Set();
    distances.set(letters[0], 0);
    while (visited.size < nodeCount) {
      let current = null;
      let best = Infinity;
      for (const node of nodes) {
        if (!visited.has(node.id) && distances.get(node.id) < best) {
          best = distances.get(node.id);
          current = node.id;
        }
      }
      if (current === null) break;
      visited.add(current);
      for (const neighbor of adjacency.get(current)) {
        const candidate = distances.get(current) + neighbor.w;
        if (candidate < distances.get(neighbor.id)) distances.set(neighbor.id, candidate);
      }
    }
    let target = letters[nodeCount - 1];
    let farthest = -1;
    for (const node of nodes) {
      const distance = distances.get(node.id);
      if (distance !== Infinity && distance > farthest) {
        farthest = distance;
        target = node.id;
      }
    }

    return {
      id: `generated-${seed}`,
      name: '随机图',
      code: 'GENERATED',
      start: letters[0],
      end: target,
      blurb: `${nodeCount} 节点 · ${DENSITIES[density].label}边密度 · 权重 1–${weightMax} · seed ${seed}。`,
      nodes,
      edges,
      generated: { nodeCount, density, weightMax, seed },
    };
  }

  root.GRAPH_PRESETS = PRESETS;
  root.GraphGenerator = { generate, DENSITIES };
})(typeof globalThis !== 'undefined' ? globalThis : this);
