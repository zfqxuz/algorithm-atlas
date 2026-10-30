'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'graphs.js'), 'utf8'), sandbox, {
  filename: 'graphs.js',
});

const generator = sandbox.GraphGenerator;
assert.ok(generator, 'GraphGenerator must be exposed');

function edgeKey(edge) {
  return `${edge.u}:${edge.v}`;
}

function reachable(graph) {
  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.edges) {
    adjacency.get(edge.u).push(edge.v);
    adjacency.get(edge.v).push(edge.u);
  }
  const seen = new Set([graph.start]);
  const queue = [graph.start];
  while (queue.length) {
    const current = queue.shift();
    for (const neighbor of adjacency.get(current)) {
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return seen;
}

function validate(graph) {
  const ids = new Set(graph.nodes.map((node) => node.id));
  assert.equal(ids.size, graph.nodes.length);
  assert.ok(ids.has(graph.start));
  assert.ok(ids.has(graph.end));
  assert.notEqual(graph.start, graph.end);
  assert.ok(graph.nodes.length >= 6 && graph.nodes.length <= 10);

  const keys = new Set();
  for (const edge of graph.edges) {
    assert.ok(ids.has(edge.u));
    assert.ok(ids.has(edge.v));
    assert.notEqual(edge.u, edge.v);
    assert.ok(Number.isInteger(edge.w) && edge.w > 0);
    const key = edgeKey(edge);
    assert.ok(!keys.has(key), `duplicate edge ${key}`);
    keys.add(key);
  }
  assert.ok(graph.edges.length >= graph.nodes.length - 1);
  assert.ok(graph.edges.length <= (graph.nodes.length * (graph.nodes.length - 1)) / 2);
  assert.equal(reachable(graph).size, graph.nodes.length);

  for (const node of graph.nodes) {
    assert.ok(Number.isFinite(node.x));
    assert.ok(Number.isFinite(node.y));
    assert.ok(node.x >= 0 && node.x <= 1000);
    assert.ok(node.y >= 0 && node.y <= 470);
  }
}

test('generated graphs are connected, valid, and deterministic', () => {
  const first = generator.generate({ nodeCount: 9, density: 'medium', weightMax: 9, seed: 2026 });
  const second = generator.generate({ nodeCount: 9, density: 'medium', weightMax: 9, seed: 2026 });
  assert.deepEqual(first, second);
  validate(first);
  assert.equal(first.start, 'A');
  assert.ok(first.edges.every((edge) => edge.w <= 9));
  assert.equal(first.generated.nodeCount, 9);
});

test('density and parameter bounds behave', () => {
  const sparse = generator.generate({ nodeCount: 8, density: 'sparse', weightMax: 9, seed: 77 });
  const medium = generator.generate({ nodeCount: 8, density: 'medium', weightMax: 9, seed: 77 });
  const dense = generator.generate({ nodeCount: 8, density: 'dense', weightMax: 20, seed: 77 });
  validate(sparse);
  validate(medium);
  validate(dense);
  assert.ok(dense.edges.length >= medium.edges.length);
  assert.ok(medium.edges.length >= sparse.edges.length);
  assert.ok(dense.edges.every((edge) => edge.w <= 20));

  const clampedLow = generator.generate({ nodeCount: 1, density: 'nope', weightMax: 999, seed: -5 });
  const clampedHigh = generator.generate({ nodeCount: 99, density: 'dense', weightMax: 9, seed: 1 });
  validate(clampedLow);
  validate(clampedHigh);
  assert.equal(clampedLow.nodes.length, 6);
  assert.equal(clampedHigh.nodes.length, 10);
});

test('many seeds stay connected and valid', () => {
  for (let seed = 1; seed <= 80; seed += 1) {
    validate(generator.generate({
      nodeCount: 6 + (seed % 5),
      density: ['sparse', 'medium', 'dense'][seed % 3],
      weightMax: seed % 2 ? 9 : 20,
      seed,
    }));
  }
});
