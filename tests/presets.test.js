'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const Dijkstra = require('../dijkstra.js');

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'graphs.js'), 'utf8'), sandbox, {
  filename: 'graphs.js',
});

const presets = sandbox.GRAPH_PRESETS;

function makeGraph(preset) {
  return {
    nodes: preset.nodes.map((node) => ({ ...node })),
    edges: preset.edges.map((edge) => ({ ...edge })),
  };
}

function allPairsShortestDistances(graph) {
  const ids = graph.nodes.map((node) => node.id);
  const index = new Map(ids.map((id, position) => [id, position]));
  const distances = ids.map((_, row) =>
    ids.map((__, column) => (row === column ? 0 : Infinity))
  );

  for (const edge of graph.edges) {
    const a = index.get(edge.u);
    const b = index.get(edge.v);
    distances[a][b] = Math.min(distances[a][b], edge.w);
    distances[b][a] = Math.min(distances[b][a], edge.w);
  }

  for (let via = 0; via < ids.length; via += 1) {
    for (let from = 0; from < ids.length; from += 1) {
      for (let to = 0; to < ids.length; to += 1) {
        const candidate = distances[from][via] + distances[via][to];
        if (candidate < distances[from][to]) distances[from][to] = candidate;
      }
    }
  }

  return { ids, index, distances };
}

function costOfPath(graph, route) {
  let total = 0;
  for (let index = 0; index < route.length - 1; index += 1) {
    const edge = graph.edges.find(
      (candidate) =>
        (candidate.u === route[index] && candidate.v === route[index + 1]) ||
        (candidate.v === route[index] && candidate.u === route[index + 1])
    );
    if (!edge) return Infinity;
    total += edge.w;
  }
  return total;
}

test('the three curated presets are valid and connected', () => {
  assert.equal(presets.length, 3);
  for (const preset of presets) {
    const graph = makeGraph(preset);
    assert.doesNotThrow(() => Dijkstra.validateGraph(graph));
    const result = Dijkstra.dijkstraShortestPath(graph, preset.start, preset.end);
    assert.equal(result.found, true, `${preset.name} should be connected`);
    assert.ok(Number.isFinite(result.distance));
  }
});

test('Dijkstra agrees with Floyd-Warshall for every pair in every preset', () => {
  for (const preset of presets) {
    const graph = makeGraph(preset);
    const { ids, index, distances } = allPairsShortestDistances(graph);

    for (const source of ids) {
      for (const target of ids) {
        const expected = distances[index.get(source)][index.get(target)];
        const result = Dijkstra.dijkstraShortestPath(graph, source, target);
        assert.equal(result.found, true, `${preset.name}: ${source} -> ${target}`);
        assert.equal(result.distance, expected, `${preset.name}: ${source} -> ${target}`);

        if (source === target) {
          assert.deepEqual(result.path, [source]);
        } else {
          assert.equal(result.path[0], source);
          assert.equal(result.path[result.path.length - 1], target);
          assert.equal(new Set(result.path).size, result.path.length, 'path should be simple');
          assert.equal(costOfPath(graph, result.path), result.distance);
        }
      }
    }
  }
});

test('featured routes and the visualizer metadata stay in sync', () => {
  const expected = [
    { path: ['A', 'C', 'F', 'H'], distance: 11 },
    { path: ['A', 'D', 'E', 'H', 'I'], distance: 15 },
    { path: ['C', 'D', 'F', 'G'], distance: 14 },
  ];

  presets.forEach((preset, presetIndex) => {
    assert.equal(preset.nodes.length, 9);
    const graph = makeGraph(preset);
    const result = Dijkstra.dijkstraShortestPath(graph, preset.start, preset.end);
    assert.deepEqual(result.path, expected[presetIndex].path);
    assert.equal(result.distance, expected[presetIndex].distance);
  });
});
