'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Flow = require('../engines/flow-engine.js');

function network() {
  return {
    nodes: ['S', 'A', 'B', 'T'],
    source: 'S',
    sink: 'T',
    edges: [
      { u: 'S', v: 'A', capacity: 3 },
      { u: 'S', v: 'B', capacity: 2 },
      { u: 'A', v: 'B', capacity: 1 },
      { u: 'A', v: 'T', capacity: 2 },
      { u: 'B', v: 'T', capacity: 3 },
    ],
  };
}

function assertConservation(input, flows) {
  const balance = new Map(input.nodes.map((id) => [id, 0]));
  for (const edge of flows) {
    balance.set(edge.from, (balance.get(edge.from) || 0) - edge.flow);
    balance.set(edge.to, (balance.get(edge.to) || 0) + edge.flow);
  }
  for (const id of input.nodes) {
    if (id === input.source) assert.equal(balance.get(id), -flows.reduce((sum, e) => sum + (e.from === id ? e.flow : 0), 0));
    if (id === input.sink) assert.equal(balance.get(id), flows.reduce((sum, e) => sum + (e.to === id ? e.flow : 0), 0));
    if (id !== input.source && id !== input.sink) assert.equal(balance.get(id), 0);
  }
}

test('Edmonds-Karp finds the known maximum flow and a matching min cut', () => {
  const input = network();
  const result = Flow.solve(input);
  assert.equal(result.maxFlow, 5);
  assert.equal(result.minCutCapacity, 5);
  assert.equal(result.steps[0].kind, 'init');
  assert.equal(result.steps.at(-1).kind, 'done');
  assert.ok(result.steps.some((step) => step.kind === 'augment'));

  let previous = 0;
  for (const step of result.steps.filter((item) => item.kind === 'augment')) {
    assert.ok(step.bottleneck > 0);
    assert.ok(step.totalFlow > previous);
    previous = step.totalFlow;
    assert.ok(step.path.length >= 1);
    assert.equal(step.path[0][0], 'S');
    assert.equal(step.path.at(-1)[1], 'T');
    for (const edge of step.flows) {
      assert.ok(edge.flow >= 0 && edge.flow <= edge.capacity);
    }
    assertConservation(input, step.flows);
  }
  assert.equal(result.flows.reduce((sum, edge) => sum + (edge.from === 'S' ? edge.flow : 0), 0), 5);
  assertConservation(input, result.flows);
});

test('empty and unreachable networks return zero flow', () => {
  const result = Flow.solve({
    nodes: ['S', 'T'],
    source: 'S',
    sink: 'T',
    edges: [],
  });
  assert.equal(result.maxFlow, 0);
  assert.equal(result.minCutCapacity, 0);
  assert.equal(result.steps.at(-1).kind, 'done');
});

test('a cut is returned with capacity equal to the maximum flow', () => {
  const input = {
    nodes: ['S', 'A', 'B', 'C', 'T'],
    source: 'S',
    sink: 'T',
    edges: [
      { u: 'S', v: 'A', capacity: 10 },
      { u: 'S', v: 'B', capacity: 8 },
      { u: 'A', v: 'C', capacity: 6 },
      { u: 'A', v: 'B', capacity: 3 },
      { u: 'B', v: 'C', capacity: 4 },
      { u: 'B', v: 'T', capacity: 7 },
      { u: 'C', v: 'T', capacity: 9 },
    ],
  };
  const result = Flow.solve(input);
  assert.ok(result.maxFlow > 0);
  assert.equal(result.minCutCapacity, result.maxFlow);
  assert.ok(result.reachable.includes('S'));
  assert.ok(!result.reachable.includes('T'));
});

test('invalid networks are rejected', () => {
  assert.throws(() => Flow.solve({ nodes: ['S', 'T'], source: 'S', sink: 'T', edges: [{ u: 'S', v: 'X', capacity: 1 }] }), RangeError);
  assert.throws(() => Flow.solve({ nodes: ['S', 'T'], source: 'S', sink: 'T', edges: [{ u: 'S', v: 'T', capacity: -1 }] }), RangeError);
});
