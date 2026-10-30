'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Dijkstra = require('../dijkstra.js');

const defaultGraph = {
  nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((id) => ({ id })),
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
};

test('finds the expected shortest path on the featured graph', () => {
  const result = Dijkstra.dijkstraShortestPath(defaultGraph, 'A', 'H');
  assert.equal(result.found, true);
  assert.equal(result.distance, 11);
  assert.deepEqual(result.path, ['A', 'C', 'F', 'H']);
});

test('produces immutable, sequential snapshots with a valid queue', () => {
  const trace = Dijkstra.buildTrace(defaultGraph, 'A', 'H');
  assert.ok(trace.length > 10);
  assert.equal(trace[0].kind, 'init');
  assert.equal(trace[0].dist.A, 0);
  assert.equal(trace[0].dist.H, Infinity);
  assert.equal(trace[trace.length - 1].kind, 'done');
  assert.equal(trace[trace.length - 1].pathCost, 11);
  assert.deepEqual(trace[trace.length - 1].path, ['A', 'C', 'F', 'H']);

  for (const state of trace) {
    assert.ok(Array.isArray(state.queue));
    assert.ok(Array.isArray(state.settled));
    assert.ok(Array.isArray(state.path));
    assert.ok(state.lineRange.length >= 1);

    for (let index = 1; index < state.queue.length; index += 1) {
      const a = state.queue[index - 1];
      const b = state.queue[index];
      assert.ok(
        a.distance < b.distance || (a.distance === b.distance && a.id < b.id),
        'queue should be sorted by distance and then node id'
      );
    }

    for (const item of state.queue) {
      assert.equal(item.distance, state.dist[item.id]);
      assert.ok(!state.settled.includes(item.id));
    }

    if (state.kind === 'select' || state.kind === 'update' || state.kind === 'keep') {
      assert.ok(
        state.settled.includes(state.current),
        'the extracted node should already count as settled'
      );
    }

    // Snapshots must not be mutated by later algorithm steps.
    const frozenDistance = state.dist.A;
    assert.equal(frozenDistance, 0);
  }
});

test('ends with an unreachable result and a cleared queue', () => {
  const graph = {
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    edges: [{ u: 'A', v: 'B', w: 1 }],
  };
  const result = Dijkstra.dijkstraShortestPath(graph, 'A', 'C');
  assert.equal(result.found, false);
  assert.equal(result.distance, Infinity);
  assert.deepEqual(result.path, []);
  const last = result.trace[result.trace.length - 1];
  assert.equal(last.kind, 'unreachable');
  assert.deepEqual(last.queue, []);
  assert.deepEqual(last.settled.sort(), ['A', 'B']);
});

test('handles a single-node query', () => {
  const graph = { nodes: [{ id: 'A' }], edges: [] };
  const result = Dijkstra.dijkstraShortestPath(graph, 'A', 'A');
  assert.equal(result.found, true);
  assert.deepEqual(result.path, ['A']);
  assert.equal(result.distance, 0);
});

test('keeps the existing predecessor when a later route ties', () => {
  const graph = {
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
    edges: [
      { u: 'A', v: 'B', w: 1 },
      { u: 'A', v: 'C', w: 1 },
      { u: 'B', v: 'D', w: 2 },
      { u: 'C', v: 'D', w: 2 },
    ],
  };
  const result = Dijkstra.dijkstraShortestPath(graph, 'A', 'D');
  assert.equal(result.distance, 3);
  assert.deepEqual(result.path, ['A', 'B', 'D']);
  const keeps = result.trace.filter((state) => state.kind === 'keep');
  assert.ok(keeps.length >= 1);
});

test('decreases the heap key when a queued candidate improves', () => {
  const graph = {
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    edges: [
      { u: 'A', v: 'B', w: 10 },
      { u: 'A', v: 'C', w: 1 },
      { u: 'C', v: 'B', w: 1 },
    ],
  };
  const result = Dijkstra.dijkstraShortestPath(graph, 'A', 'B');
  assert.equal(result.distance, 2);
  assert.deepEqual(result.path, ['A', 'C', 'B']);
  const bUpdates = result.trace.filter(
    (state) => state.kind === 'update' && state.relaxedNode === 'B'
  );
  assert.equal(bUpdates.length, 2);
  assert.deepEqual(
    bUpdates.map((state) => state.dist.B),
    [10, 2]
  );
});

test('rejects invalid or unsupported graphs', () => {
  assert.throws(() => Dijkstra.validateGraph(null), /Graph must be an object/);
  assert.doesNotThrow(() =>
    Dijkstra.validateGraph({ nodes: [{ id: 'A' }, { id: 'B' }], edges: [{ u: 'A', v: 'B', w: 1 }] })
  );
  assert.throws(
    () =>
      Dijkstra.validateGraph({
        nodes: [{ id: 'A' }, { id: 'B' }],
        edges: [{ u: 'A', v: 'B', w: 0 }],
      }),
    /positive finite weight/
  );
  assert.throws(
    () =>
      Dijkstra.validateGraph({
        nodes: [{ id: 'A' }, { id: 'B' }],
        edges: [{ u: 'A', v: 'B', w: 1 }, { u: 'B', v: 'A', w: 2 }],
      }),
    /Duplicate edge/
  );
  assert.throws(
    () =>
      Dijkstra.validateGraph({
        nodes: [{ id: 'A' }],
        edges: [{ u: 'A', v: 'A', w: 1 }],
      }),
    /Self loops/
  );
});

test('rejects unknown source and target nodes', () => {
  assert.throws(() => Dijkstra.buildTrace(defaultGraph, 'Z', 'H'), /Unknown source/);
  assert.throws(() => Dijkstra.buildTrace(defaultGraph, 'A', 'Z'), /Unknown target/);
});
