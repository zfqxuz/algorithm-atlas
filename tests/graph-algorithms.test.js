'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const Dijkstra = require('../dijkstra.js');
const GraphAlgorithms = require('../graph-algorithms.js');

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'graphs.js'), 'utf8'), sandbox, {
  filename: 'graphs.js',
});
const presets = sandbox.GRAPH_PRESETS;

function makeGraph(preset) {
  return {
    nodes: preset.nodes.map((node) => ({ id: node.id })),
    edges: preset.edges.map((edge) => ({ ...edge })),
  };
}

function adjacencyOf(graph) {
  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.edges) {
    adjacency.get(edge.u).push({ to: edge.v, weight: edge.w });
    adjacency.get(edge.v).push({ to: edge.u, weight: edge.w });
  }
  return adjacency;
}

function edgeWeight(graph, a, b) {
  const match = graph.edges.find(
    (edge) => (edge.u === a && edge.v === b) || (edge.u === b && edge.v === a)
  );
  return match ? match.w : undefined;
}

function assertValidPath(graph, route, source, target) {
  assert.equal(route[0], source);
  assert.equal(route[route.length - 1], target);
  assert.equal(new Set(route).size, route.length, 'path must be simple');
  for (let index = 0; index < route.length - 1; index += 1) {
    assert.ok(
      Number.isFinite(edgeWeight(graph, route[index], route[index + 1])),
      `missing edge ${route[index]}-${route[index + 1]}`
    );
  }
}

function independentBfsDistance(graph, source, target) {
  const adjacency = adjacencyOf(graph);
  const distances = new Map([[source, 0]]);
  const queue = [source];
  while (queue.length > 0) {
    const u = queue.shift();
    if (u === target) return distances.get(u);
    for (const edge of adjacency.get(u)) {
      if (distances.has(edge.to)) continue;
      distances.set(edge.to, distances.get(u) + 1);
      queue.push(edge.to);
    }
  }
  return Infinity;
}

function independentMstWeight(graph) {
  const parent = new Map(graph.nodes.map((node) => [node.id, node.id]));
  const find = (id) => {
    let current = id;
    while (parent.get(current) !== current) current = parent.get(current);
    let cursor = id;
    while (parent.get(cursor) !== current) {
      const next = parent.get(cursor);
      parent.set(cursor, current);
      cursor = next;
    }
    return current;
  };
  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return false;
    parent.set(rootA, rootB);
    return true;
  };

  const sorted = graph.edges.slice().sort((a, b) => a.w - b.w);
  let total = 0;
  let edges = 0;
  for (const edge of sorted) {
    if (union(edge.u, edge.v)) {
      total += edge.w;
      edges += 1;
    }
  }
  return { total, edges, connected: edges === graph.nodes.length - 1 };
}

test('BFS finds the fewest-edge path for every pair in every preset', () => {
  for (const preset of presets) {
    const graph = makeGraph(preset);
    const ids = graph.nodes.map((node) => node.id);

    for (const source of ids) {
      for (const target of ids) {
        const trace = GraphAlgorithms.buildBfsTrace(graph, source, target);
        const final = trace[trace.length - 1];
        assert.equal(final.kind, 'done');
        const expected = independentBfsDistance(graph, source, target);
        assert.equal(final.path.length - 1, expected);
        assertValidPath(graph, final.path, source, target);
        assert.equal(final.pathCost, expected);
      }
    }
  }
});

test('BFS handles unreachable targets and produces clean discovery snapshots', () => {
  const graph = {
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    edges: [{ u: 'A', v: 'B', w: 1 }],
  };
  const trace = GraphAlgorithms.buildBfsTrace(graph, 'A', 'C');
  const last = trace[trace.length - 1];
  assert.equal(last.kind, 'unreachable');
  assert.deepEqual(last.queue, []);
  assert.deepEqual(last.settled, ['A', 'B']);
  assert.ok(trace.some((state) => state.kind === 'discover'));
});

test('DFS returns a valid, simple path but makes no shortest-path claim', () => {
  for (const preset of presets) {
    const graph = makeGraph(preset);
    const result = GraphAlgorithms.buildDfsTrace(graph, preset.start, preset.end);
    const final = result[result.length - 1];
    assert.equal(final.kind, 'done');
    assertValidPath(graph, final.path, preset.start, preset.end);
    assert.equal(final.pathCost, final.path.length - 1);
    assert.ok(result.some((state) => state.kind === 'discover'));
  }
});

test('DFS reports an unreachable target when the stack empties', () => {
  const graph = {
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    edges: [{ u: 'A', v: 'B', w: 1 }],
  };
  const trace = GraphAlgorithms.buildDfsTrace(graph, 'A', 'C');
  const last = trace[trace.length - 1];
  assert.equal(last.kind, 'unreachable');
  assert.deepEqual(last.queue, []);
  assert.deepEqual(last.settled, ['A', 'B']);
});

test('Prim produces a minimum spanning tree for every preset', () => {
  for (const preset of presets) {
    const graph = makeGraph(preset);
    const expected = independentMstWeight(graph);
    const trace = GraphAlgorithms.buildPrimTrace(graph, preset.start);
    const final = trace[trace.length - 1];

    assert.equal(final.kind, 'done');
    assert.equal(final.mstEdges.length, expected.edges);
    assert.equal(final.totalWeight, expected.total);
    assert.equal(final.pathCost, expected.total);
    assert.equal(final.settled.length, graph.nodes.length);
    assert.equal(final.queue.length, 0);

    const seen = new Set([preset.start]);
    const treeAdjacency = new Map(graph.nodes.map((node) => [node.id, []]));
    for (const edge of final.mstEdges) {
      assert.ok(Number.isFinite(edgeWeight(graph, edge.u, edge.v)));
      treeAdjacency.get(edge.u).push(edge.v);
      treeAdjacency.get(edge.v).push(edge.u);
    }
    const queue = [preset.start];
    while (queue.length > 0) {
      const u = queue.shift();
      for (const v of treeAdjacency.get(u)) {
        if (seen.has(v)) continue;
        seen.add(v);
        queue.push(v);
      }
    }
    assert.equal(seen.size, graph.nodes.length, 'MST should span the component');
  }
});

test('Prim reports a partial tree when the graph is disconnected', () => {
  const graph = {
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    edges: [{ u: 'A', v: 'B', w: 2 }],
  };
  const trace = GraphAlgorithms.buildPrimTrace(graph, 'A');
  const final = trace[trace.length - 1];
  assert.equal(final.kind, 'done');
  assert.equal(final.totalWeight, 2);
  assert.equal(final.mstEdges.length, 1);
  assert.deepEqual(final.settled, ['A', 'B']);
  assert.match(final.detail, /图不连通/);
});

test('all algorithm trace snapshots expose the fields consumed by the UI', () => {
  const preset = presets[0];
  const graph = makeGraph(preset);
  const traces = [
    Dijkstra.buildTrace(graph, 'A', 'H'),
    GraphAlgorithms.buildBfsTrace(graph, 'A', 'H'),
    GraphAlgorithms.buildDfsTrace(graph, 'A', 'H'),
    GraphAlgorithms.buildPrimTrace(graph, 'A'),
  ];

  for (const trace of traces) {
    assert.ok(trace.length > 2);
    for (const state of trace) {
      assert.ok(Array.isArray(state.queue));
      assert.ok(Array.isArray(state.settled));
      assert.ok(Array.isArray(state.path));
      assert.ok(state.dist && typeof state.dist === 'object');
      assert.ok(state.prev && typeof state.prev === 'object');
      assert.ok(state.lineRange.length > 0);
      assert.equal(typeof state.message, 'string');
      assert.equal(typeof state.detail, 'string');
    }
  }
});
