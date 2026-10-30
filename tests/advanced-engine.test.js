'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const Engine = require('../engines/advanced-engine.js');
const {
  ALGORITHMS,
  PSEUDOCODE,
  generateLcsInput,
  generateKmpInput,
  generateHullInput,
  generatePagerankInput,
  solveLcs,
  solveKmp,
  solveHull,
  solvePagerank,
} = Engine;

const EPS = 1e-9;
const ENGINE_PATH = path.join(__dirname, '..', 'engines', 'advanced-engine.js');

/* ------------------------------------------------------------------ */
/* Shared test helpers                                                 */
/* ------------------------------------------------------------------ */

function approx(actual, expected, tolerance = 1e-9, message = '') {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    message || `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function assertStepLines(steps, pseudocode, label) {
  assert.ok(Array.isArray(steps), `${label}: steps must be an array`);
  for (const step of steps) {
    assert.equal(Number.isInteger(step.line), true, `${label}: line must be an integer`);
    assert.ok(step.line >= 1, `${label}: line must be 1-based`);
    assert.ok(
      step.line <= pseudocode.length,
      `${label}: line ${step.line} exceeds pseudocode length ${pseudocode.length}`
    );
    assert.equal(typeof step.message, 'string', `${label}: message must be a string`);
    assert.ok(step.message.length > 0, `${label}: message must not be empty`);
  }
}

function assertPoint(point, label = 'point') {
  assert.equal(typeof point, 'object', `${label}: point must be an object`);
  assert.equal(Number.isFinite(point.x), true, `${label}: x must be finite`);
  assert.equal(Number.isFinite(point.y), true, `${label}: y must be finite`);
}

function cross(origin, first, second) {
  return (
    (first.x - origin.x) * (second.y - origin.y) -
    (first.y - origin.y) * (second.x - origin.x)
  );
}

function signedArea(polygon) {
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function pointEquals(first, second) {
  return first.x === second.x && first.y === second.y;
}

function pointOnSegment(point, start, end) {
  if (Math.abs(cross(start, end, point)) > EPS) return false;
  return (
    point.x >= Math.min(start.x, end.x) - EPS &&
    point.x <= Math.max(start.x, end.x) + EPS &&
    point.y >= Math.min(start.y, end.y) - EPS &&
    point.y <= Math.max(start.y, end.y) + EPS
  );
}

function pointInConvexPolygon(point, polygon) {
  if (polygon.length === 0) return false;
  if (polygon.length === 1) return pointEquals(point, polygon[0]);
  if (polygon.length === 2) return pointOnSegment(point, polygon[0], polygon[1]);
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (cross(start, end, point) < -EPS) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* UMD surface and metadata                                           */
/* ------------------------------------------------------------------ */

test('UMD build exposes window.AdvancedEngine and dependency-free CommonJS API', () => {
  const source = fs.readFileSync(ENGINE_PATH, 'utf8');

  const sandbox = { console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'advanced-engine.js' });

  assert.equal(typeof sandbox.AdvancedEngine, 'object');
  assert.equal(sandbox.window.AdvancedEngine, sandbox.AdvancedEngine);
  assert.equal(typeof sandbox.AdvancedEngine.solveLcs, 'function');
  assert.equal(typeof sandbox.AdvancedEngine.solvePagerank, 'function');
  assert.equal(Array.isArray(sandbox.AdvancedEngine.ALGORITHMS), true);
  assert.equal(sandbox.AdvancedEngine.ALGORITHMS.length, 4);

  // A page-like VM where the global and window are distinct objects must
  // still receive the same public API on both.
  const nested = { window: {}, console };
  vm.createContext(nested);
  vm.runInContext(source, nested, { filename: 'advanced-engine.js' });
  assert.equal(typeof nested.AdvancedEngine, 'object');
  assert.equal(nested.window.AdvancedEngine, nested.AdvancedEngine);
});

test('ALGORITHMS metadata is complete and uses the requested levels', () => {
  assert.deepEqual(
    ALGORITHMS.map((algorithm) => algorithm.id),
    ['lcs', 'kmp', 'hull', 'pagerank']
  );
  assert.deepEqual(
    ALGORITHMS.map((algorithm) => algorithm.level),
    ['L2', 'L3', 'L3', 'L4']
  );

  const expectedKeys = ['id', 'name', 'en', 'level', 'description', 'time', 'space'];
  for (const algorithm of ALGORITHMS) {
    for (const key of expectedKeys) {
      assert.equal(typeof algorithm[key], 'string', `${algorithm.id}.${key}`);
      assert.ok(algorithm[key].length > 0, `${algorithm.id}.${key} must not be empty`);
    }
    assert.deepEqual(algorithm.pseudocode, PSEUDOCODE[algorithm.id]);
  }

  assert.deepEqual(Object.keys(PSEUDOCODE), ['lcs', 'kmp', 'hull', 'pagerank']);
  for (const id of ['lcs', 'kmp', 'hull', 'pagerank']) {
    assert.ok(Array.isArray(PSEUDOCODE[id]));
    assert.ok(PSEUDOCODE[id].length > 0);
    // Keep pseudo arrays plain strings so a UI can highlight by 1-based line.
    for (const line of PSEUDOCODE[id]) {
      assert.equal(typeof line, 'string');
      assert.ok(line.length > 0);
    }
  }
});

/* ------------------------------------------------------------------ */
/* LCS                                                                */
/* ------------------------------------------------------------------ */

function lcsLengthReference(a, b) {
  let previous = new Array(b.length + 1).fill(0);
  for (let row = 1; row <= a.length; row += 1) {
    const current = new Array(b.length + 1).fill(0);
    for (let col = 1; col <= b.length; col += 1) {
      current[col] =
        a[row - 1] === b[col - 1]
          ? previous[col - 1] + 1
          : Math.max(previous[col], current[col - 1]);
    }
    previous = current;
  }
  return previous[b.length];
}

function assertValidLcs(a, b) {
  const result = solveLcs({ a, b });

  assert.equal(result.table.length, a.length + 1);
  for (const row of result.table) assert.equal(row.length, b.length + 1);
  assert.deepEqual(result.table[0], new Array(b.length + 1).fill(0));
  for (let row = 1; row <= a.length; row += 1) assert.equal(result.table[row][0], 0);

  assert.equal(result.length, lcsLengthReference(a, b));
  assert.equal(result.length, result.table[a.length][b.length]);

  assert.ok(Array.isArray(result.path));
  assert.equal(result.path.length, result.length);
  let previousRow = 0;
  let previousCol = 0;
  const pathSymbols = [];
  for (const cell of result.path) {
    assert.equal(Array.isArray(cell), true);
    assert.equal(cell.length, 2);
    const [row, col] = cell;
    assert.equal(Number.isInteger(row), true);
    assert.equal(Number.isInteger(col), true);
    assert.ok(row > 0 && row <= a.length);
    assert.ok(col > 0 && col <= b.length);
    assert.ok(row > previousRow, 'path rows must strictly increase');
    assert.ok(col > previousCol, 'path columns must strictly increase');
    assert.equal(a[row - 1], b[col - 1], 'a path cell must match both sequences');
    pathSymbols.push(a[row - 1]);
    previousRow = row;
    previousCol = col;
  }

  if (typeof a === 'string' && typeof b === 'string') {
    assert.equal(typeof result.lcs, 'string');
    assert.equal(result.lcs, pathSymbols.join(''));
    assert.equal(result.lcs.length, result.length);
  } else {
    assert.equal(Array.isArray(result.lcs), true);
    assert.deepEqual(result.lcs, pathSymbols);
  }

  assertStepLines(result.steps, PSEUDOCODE.lcs, 'lcs');

  const rebuilt = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (const step of result.steps) {
    assert.ok(Number.isInteger(step.row) && step.row >= 0 && step.row <= a.length);
    assert.ok(Number.isInteger(step.col) && step.col >= 0 && step.col <= b.length);
    assert.ok(Array.isArray(step.changes));
    for (const change of step.changes) {
      assert.ok(Number.isInteger(change.row) && change.row >= 1 && change.row <= a.length);
      assert.ok(Number.isInteger(change.col) && change.col >= 1 && change.col <= b.length);
      assert.equal(change.value, result.table[change.row][change.col]);
      rebuilt[change.row][change.col] = change.value;
    }
  }
  assert.deepEqual(rebuilt, result.table);

  return result;
}

test('LCS known examples produce a valid longest common subsequence', () => {
  const examples = [
    ['ABCDGH', 'AEDFHR', 'ADH'],
    ['AGGTAB', 'GXTXAYB', 'GTAB'],
    ['ABCBDAB', 'BDCABA', null],
    ['AAAA', 'AA', 'AA'],
    ['ABC', 'ABC', 'ABC'],
    ['ABC', 'DEF', ''],
    ['', 'ABC', ''],
    ['ABC', '', ''],
    ['', '', ''],
  ];

  for (const [a, b, expected] of examples) {
    const result = assertValidLcs(a, b);
    if (expected !== null) assert.equal(result.lcs, expected);
  }
});

test('LCS random small cases match an independent DP and reconstruct valid paths', () => {
  for (let seed = 1; seed <= 80; seed += 1) {
    const generated = generateLcsInput({
      lengthA: seed % 11,
      lengthB: (seed * 3) % 12,
      alphabet: 'ABC',
      seed,
    });
    assertValidLcs(generated.a, generated.b);
  }
});

test('LCS supports character arrays without string coercion', () => {
  const result = solveLcs({ a: ['x', 'a', 'b', 'c'], b: ['a', 'c', 'z'] });
  assert.equal(Array.isArray(result.lcs), true);
  assert.deepEqual(result.lcs, ['a', 'c']);
  assert.equal(result.length, 2);
  assert.equal(result.path.length, 2);
});

/* ------------------------------------------------------------------ */
/* KMP                                                                */
/* ------------------------------------------------------------------ */

function prefixReference(pattern) {
  const prefix = new Array(pattern.length).fill(0);
  for (let index = 1; index < pattern.length; index += 1) {
    for (let length = 1; length <= index; length += 1) {
      if (pattern.slice(0, length) === pattern.slice(index - length + 1, index + 1)) {
        prefix[index] = length;
      }
    }
  }
  return prefix;
}

function naiveMatches(text, pattern) {
  if (pattern.length === 0) return [];
  const matches = [];
  for (let start = 0; start <= text.length - pattern.length; start += 1) {
    if (text.slice(start, start + pattern.length) === pattern) matches.push(start);
  }
  return matches;
}

function assertValidKmp(text, pattern) {
  const result = solveKmp({ text, pattern });

  assert.deepEqual(result.prefix, prefixReference(pattern));
  assert.deepEqual(result.prefixTable, result.prefix);
  assert.deepEqual(result.matches, naiveMatches(text, pattern));
  assert.deepEqual(result.matches, [...result.matches].sort((first, second) => first - second));

  const matchSteps = result.steps.filter((step) => step.match === true);
  assert.equal(matchSteps.length, result.matches.length);

  for (const step of result.steps) {
    assert.equal(Number.isInteger(step.textIndex), true);
    assert.ok(step.textIndex >= 0 && step.textIndex < text.length);
    assert.equal(Number.isInteger(step.patternIndex), true);
    assert.ok(step.patternIndex >= 0 && step.patternIndex < pattern.length);
    assert.equal(typeof step.match, 'boolean');
    if (step.match) {
      assert.equal(step.textIndex - pattern.length + 1, step.start);
      assert.ok(result.matches.includes(step.start));
    }
  }
  assertStepLines(result.steps, PSEUDOCODE.kmp, 'kmp.steps');
  assertStepLines(result.prefixSteps, PSEUDOCODE.kmp, 'kmp.prefixSteps');

  const rebuiltPrefix = new Array(pattern.length).fill(0);
  for (const step of result.prefixSteps) {
    if (!Array.isArray(step.changes)) continue;
    for (const change of step.changes) {
      assert.ok(change.index >= 0 && change.index < pattern.length);
      rebuiltPrefix[change.index] = change.value;
    }
  }
  assert.deepEqual(rebuiltPrefix, result.prefix);

  return result;
}

test('KMP prefix function matches known values', () => {
  const cases = [
    ['ABABAC', [0, 0, 1, 2, 3, 0]],
    ['AAAA', [0, 1, 2, 3]],
    ['ABCABCD', [0, 0, 0, 1, 2, 3, 0]],
    ['ABABCABAB', [0, 0, 1, 2, 0, 1, 2, 3, 4]],
    ['A', [0]],
    ['', []],
  ];

  for (const [pattern, expected] of cases) {
    const result = solveKmp({ text: 'anything', pattern });
    assert.deepEqual(result.prefix, expected);
    assert.deepEqual(result.prefixTable, expected);
  }
});

test('KMP known searches and mismatch-heavy cases terminate with correct matches', () => {
  const examples = [
    ['ABABDABACDABABCABAB', 'ABABCABAB', [10]],
    ['aaaaa', 'aa', [0, 1, 2, 3]],
    ['abc', '', []],
    ['', 'abc', []],
    ['abc', 'abcd', []],
    ['ABABABABABX', 'ABABAC', []],
    ['A'.repeat(5000) + 'B', 'A'.repeat(100) + 'B', [4900]],
    ['AAABAAAAB', 'AAAB', [0, 5]],
  ];

  for (const [text, pattern, expected] of examples) {
    const result = assertValidKmp(text, pattern);
    assert.deepEqual(result.matches, expected);
  }
});

test('KMP matches naive search on random generated inputs', () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const generated = generateKmpInput({
      textLength: seed % 26,
      patternLength: (seed * 5) % 8,
      alphabet: seed % 2 === 0 ? 'AB' : 'ABC',
      seed,
      plantedMatches: seed % 4,
    });
    const result = assertValidKmp(generated.text, generated.pattern);
    assert.deepEqual(result.matches, naiveMatches(generated.text, generated.pattern));
  }
});

test('KMP agrees with naive search exhaustively over small binary strings', () => {
  const binaryStrings = [];
  for (let length = 0; length <= 5; length += 1) {
    for (let mask = 0; mask < 1 << length; mask += 1) {
      let value = '';
      for (let bit = length - 1; bit >= 0; bit -= 1) {
        value += mask & (1 << bit) ? 'B' : 'A';
      }
      binaryStrings.push(value);
    }
  }

  const patterns = ['', 'A', 'B', 'AA', 'AB', 'BA', 'BB', 'AAA', 'AAB', 'ABA', 'ABB'];
  for (const text of binaryStrings) {
    for (const pattern of patterns) {
      const result = solveKmp({ text, pattern });
      assert.deepEqual(result.matches, naiveMatches(text, pattern));
      assert.deepEqual(result.prefix, prefixReference(pattern));
    }
  }
});

/* ------------------------------------------------------------------ */
/* Convex hull                                                        */
/* ------------------------------------------------------------------ */

function assertValidHull(points, result) {
  assert.ok(Array.isArray(result.hull));
  assert.ok(result.hull.length <= Math.max(1, points.length));
  const seen = new Set();
  for (const point of result.hull) {
    assertPoint(point, 'hull point');
    const key = `${point.x},${point.y}`;
    assert.equal(seen.has(key), false, 'hull must not contain duplicate points');
    seen.add(key);
  }

  if (result.hull.length >= 3) {
    assert.ok(signedArea(result.hull) > EPS, 'hull must be counter-clockwise with positive area');
    for (let index = 0; index < result.hull.length; index += 1) {
      const previous = result.hull[(index - 1 + result.hull.length) % result.hull.length];
      const current = result.hull[index];
      const next = result.hull[(index + 1) % result.hull.length];
      assert.ok(cross(previous, current, next) > EPS, 'every hull turn must be strictly left');
    }
    for (const point of points) {
      assert.equal(
        pointInConvexPolygon(point, result.hull),
        true,
        'hull must contain every input point'
      );
    }
    for (let index = 0; index < result.hull.length; index += 1) {
      const vertex = result.hull[index];
      const remaining = result.hull.filter((_, position) => position !== index);
      assert.equal(
        pointInConvexPolygon(vertex, remaining),
        false,
        'every hull vertex must be extreme'
      );
    }
  } else if (result.hull.length === 1) {
    for (const point of points) assert.equal(pointEquals(point, result.hull[0]), true);
  } else if (result.hull.length === 2) {
    for (const point of points) {
      assert.equal(pointOnSegment(point, result.hull[0], result.hull[1]), true);
    }
  } else {
    assert.equal(points.length, 0);
  }

  if (points.length > 0) {
    const sorted = [...points].sort(
      (first, second) => first.x - second.x || first.y - second.y
    );
    assert.deepEqual(result.hull[0], { x: sorted[0].x, y: sorted[0].y });
  }

  assertStepLines(result.steps, PSEUDOCODE.hull, 'hull');
  for (const step of result.steps) {
    assert.equal(typeof step.kind, 'string');
    assert.equal(Number.isInteger(step.index), true);
    if (points.length === 0) {
      assert.equal(step.index, 0);
    } else {
      assert.ok(step.index >= 0 && step.index < points.length, 'step index must reference a point');
    }
    assert.ok(Array.isArray(step.stack));
    for (const point of step.stack) assertPoint(point, 'stack point');
    if (step.kind.endsWith('-pop')) {
      assertPoint(step.discarded, 'discarded point');
    }
  }
  const finalStep = result.steps[result.steps.length - 1];
  assert.deepEqual(finalStep.stack, result.hull);

  return result;
}

test('convex hull handles known squares, duplicates, collinear points and degeneracy', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 0, y: 4 },
    { x: 2, y: 2 },
    { x: 2, y: 0 },
    { x: 4, y: 2 },
    { x: 0, y: 0 },
  ];
  const squareSnapshot = JSON.parse(JSON.stringify(square));
  const squareResult = assertValidHull(square, solveHull({ points: square }));
  assert.deepEqual(squareResult.hull, [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 4 },
    { x: 0, y: 4 },
  ]);
  assert.deepEqual(square, squareSnapshot, 'solveHull must not mutate its input');

  const collinear = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 3 },
    { x: 2, y: 2 },
  ];
  const collinearResult = assertValidHull(collinear, solveHull({ points: collinear }));
  assert.deepEqual(collinearResult.hull, [
    { x: 0, y: 0 },
    { x: 3, y: 3 },
  ]);

  const duplicates = [
    { x: 1, y: 1 },
    { x: 1, y: 1 },
    { x: 1, y: 1 },
  ];
  const duplicateResult = assertValidHull(duplicates, solveHull({ points: duplicates }));
  assert.deepEqual(duplicateResult.hull, [{ x: 1, y: 1 }]);

  const two = [
    { x: 5, y: 2 },
    { x: 1, y: 7 },
  ];
  const twoResult = assertValidHull(two, solveHull({ points: two }));
  assert.deepEqual(twoResult.hull, [
    { x: 1, y: 7 },
    { x: 5, y: 2 },
  ]);

  const empty = assertValidHull([], solveHull({ points: [] }));
  assert.deepEqual(empty.hull, []);
});

test('random, circular and clustered hull inputs satisfy all hull invariants', () => {
  for (const shape of ['random', 'circle', 'clusters']) {
    for (let seed = 1; seed <= 8; seed += 1) {
      const generated = generateHullInput({
        count: 30,
        spread: 900,
        seed,
        shape,
      });
      assertValidHull(generated.points, solveHull({ points: generated.points }));
    }
  }
});

test('hull handles a single point and a large random cloud', () => {
  const single = assertValidHull([{ x: 7, y: 9 }], solveHull({ points: [{ x: 7, y: 9 }] }));
  assert.deepEqual(single.hull, [{ x: 7, y: 9 }]);

  const cloud = generateHullInput({ count: 400, spread: 1000, seed: 42, shape: 'random' });
  const result = assertValidHull(cloud.points, solveHull(cloud));
  assert.ok(result.hull.length >= 3);
  assert.ok(result.steps.length > 0);
});

/* ------------------------------------------------------------------ */
/* PageRank                                                           */
/* ------------------------------------------------------------------ */

function assertRankingShape(result, ids) {
  const idSet = new Set(ids);
  assert.deepEqual(Object.keys(result.scores).sort(), [...ids].sort());
  let total = 0;
  for (const id of ids) {
    const score = result.scores[id];
    assert.equal(Number.isFinite(score), true, `score for ${id} must be finite`);
    assert.ok(score >= 0, `score for ${id} must be non-negative`);
    total += score;
  }
  approx(total, 1, 1e-9, 'PageRank scores must sum to 1');

  assert.ok(Array.isArray(result.order));
  assert.equal(result.order.length, ids.length);
  assert.deepEqual(new Set(result.order.map((entry) => entry.id)), idSet);

  for (let index = 1; index < result.order.length; index += 1) {
    assert.ok(result.order[index - 1].score >= result.order[index].score - EPS);
  }
  for (const entry of result.order) {
    assert.equal(entry.score, result.scores[entry.id]);
  }

  assert.ok(Array.isArray(result.danglingNodes));
  assert.ok(Array.isArray(result.iterations));
  assert.ok(result.iterations.length >= 1);
  for (const snapshot of result.iterations) {
    assert.deepEqual(Object.keys(snapshot.scores).sort(), [...ids].sort());
    approx(sum(Object.values(snapshot.scores)), 1, 1e-9);
    assert.equal(Number.isFinite(snapshot.delta), true);
    assert.ok(snapshot.delta >= 0);
  }
  assert.deepEqual(result.iterations[result.iterations.length - 1].scores, result.scores);
}

function referencePagerank(graph, options = {}) {
  const ids = graph.nodes.map((node) => (typeof node === 'string' ? node : node.id));
  const indexById = new Map(ids.map((id, index) => [id, index]));
  const adjacency = ids.map(() => new Set());
  for (const edge of graph.edges) {
    adjacency[indexById.get(edge.from)].add(indexById.get(edge.to));
  }
  const targets = adjacency.map((set) => [...set]);

  const damping = options.damping === undefined ? 0.85 : options.damping;
  const maxIterations = options.iterations === undefined ? 100 : options.iterations;
  const tolerance = options.tolerance === undefined ? 1e-6 : options.tolerance;
  const n = ids.length;
  if (n === 0) return { scores: {}, iterations: 0, converged: true };

  let scores = new Array(n).fill(1 / n);
  let converged = false;
  let iteration = 0;
  for (; iteration < maxIterations; iteration += 1) {
    const next = new Array(n).fill((1 - damping) / n);
    let danglingMass = 0;
    for (let index = 0; index < n; index += 1) {
      if (targets[index].length === 0) danglingMass += scores[index];
    }
    for (let index = 0; index < n; index += 1) {
      next[index] += (damping * danglingMass) / n;
    }
    for (let from = 0; from < n; from += 1) {
      if (targets[from].length === 0) continue;
      const share = (damping * scores[from]) / targets[from].length;
      for (const to of targets[from]) next[to] += share;
    }
    let delta = 0;
    for (let index = 0; index < n; index += 1) {
      delta += Math.abs(next[index] - scores[index]);
    }
    scores = next;
    if (delta <= tolerance) {
      converged = true;
      iteration += 1;
      break;
    }
  }

  return {
    scores: Object.fromEntries(ids.map((id, index) => [id, scores[index]])),
    iterations: iteration,
    converged,
  };
}

test('PageRank is uniform on symmetric graphs for damping values including 1', () => {
  const cycle = {
    nodes: ['A', 'B', 'C'],
    edges: [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' },
    ],
  };

  for (const damping of [0, 0.85, 1]) {
    const result = solvePagerank(cycle, { damping, iterations: 200, tolerance: 1e-12 });
    assert.equal(result.converged, true);
    assert.deepEqual(result.danglingNodes, []);
    for (const id of cycle.nodes) approx(result.scores[id], 1 / 3, 1e-9);
    assertRankingShape(result, cycle.nodes);
  }

  const complete = {
    nodes: ['A', 'B', 'C', 'D'],
    edges: [],
  };
  for (const from of complete.nodes) {
    for (const to of complete.nodes) {
      if (from !== to) complete.edges.push({ from, to });
    }
  }
  const completeResult = solvePagerank(complete, {
    damping: 0.85,
    iterations: 200,
    tolerance: 1e-12,
  });
  assert.equal(completeResult.converged, true);
  for (const id of complete.nodes) approx(completeResult.scores[id], 1 / 4, 1e-9);
});

test('PageRank redistributes dangling mass and conserves total rank', () => {
  const chain = {
    nodes: ['A', 'B'],
    edges: [{ from: 'A', to: 'B' }],
  };

  const dampingOne = solvePagerank(chain, {
    damping: 1,
    iterations: 1000,
    tolerance: 1e-12,
  });
  assert.equal(dampingOne.converged, true);
  assert.deepEqual(dampingOne.danglingNodes, ['B']);
  approx(dampingOne.scores.A, 1 / 3, 1e-9);
  approx(dampingOne.scores.B, 2 / 3, 1e-9);
  assertRankingShape(dampingOne, chain.nodes);

  const damped = solvePagerank(chain, {
    damping: 0.85,
    iterations: 200,
    tolerance: 1e-12,
  });
  assert.equal(damped.converged, true);
  assert.ok(damped.scores.B > damped.scores.A, 'dangling target should collect rank');
  assertRankingShape(damped, chain.nodes);

  const danglingStar = {
    nodes: ['A', 'B', 'C', 'D'],
    edges: [
      { from: 'A', to: 'B' },
      { from: 'A', to: 'C' },
      { from: 'B', to: 'D' },
      { from: 'C', to: 'D' },
    ],
  };
  const starResult = solvePagerank(danglingStar, {
    damping: 0.85,
    iterations: 500,
    tolerance: 1e-12,
  });
  assert.deepEqual(starResult.danglingNodes, ['D']);
  assert.equal(starResult.converged, true);
  assertRankingShape(starResult, danglingStar.nodes);
});

test('PageRank damping 1 handles non-convergent periodic walks without NaN or mass loss', () => {
  const oscillating = {
    nodes: ['A', 'B', 'C'],
    edges: [
      { from: 'A', to: 'B' },
      { from: 'A', to: 'C' },
      { from: 'B', to: 'A' },
      { from: 'C', to: 'A' },
    ],
  };
  const result = solvePagerank(oscillating, {
    damping: 1,
    iterations: 20,
    tolerance: 1e-12,
  });
  assert.equal(result.converged, false);
  assert.equal(result.iterations.length, 20);
  assertRankingShape(result, oscillating.nodes);

  // Values above 1 are clamped to a legal damping factor.
  const clamped = solvePagerank(oscillating, {
    damping: 1.5,
    iterations: 20,
    tolerance: 1e-12,
  });
  assert.deepEqual(clamped.scores, result.scores);
});

test('PageRank damping 0 returns the uniform distribution and converges immediately', () => {
  const graph = {
    nodes: ['A', 'B', 'C'],
    edges: [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'A' },
      { from: 'C', to: 'A' },
    ],
  };
  const result = solvePagerank(graph, { damping: 0, iterations: 100, tolerance: 1e-6 });
  assert.equal(result.converged, true);
  assert.equal(result.iterations.length, 1);
  assert.equal(result.iterations[0].delta, 0);
  for (const id of graph.nodes) assert.equal(result.scores[id], 1 / 3);
});

test('PageRank matches an independent power iteration on generated graphs', () => {
  const topologyFixtures = [
    {
      nodes: ['A', 'B', 'C', 'D'],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
        { from: 'D', to: 'A' },
      ],
    },
    {
      nodes: ['A', 'B', 'C'],
      edges: [
        { from: 'A', to: 'A' },
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
      ],
    },
  ];

  const graphs = [...topologyFixtures];
  for (let seed = 1; seed <= 12; seed += 1) {
    graphs.push(
      generatePagerankInput({
        nodes: 4 + (seed % 7),
        edgeProbability: 0.15 + (seed % 5) * 0.12,
        seed,
      })
    );
  }

  for (const graph of graphs) {
    const ids = graph.nodes.map((node) => (typeof node === 'string' ? node : node.id));
    const options = { damping: 0.85, iterations: 2000, tolerance: 1e-12 };
    const result = solvePagerank(graph, options);
    const reference = referencePagerank(graph, options);

    assert.equal(result.converged, reference.converged);
    for (const id of ids) {
      approx(result.scores[id], reference.scores[id], 1e-10, `score mismatch for ${id}`);
    }
    assertRankingShape(result, ids);
    assert.ok(result.iterations.length <= options.iterations);
    assert.ok(result.iterations[result.iterations.length - 1].delta <= options.tolerance);
  }
});

test('PageRank supports node objects, self-loops and an empty graph', () => {
  const objectGraph = {
    nodes: [{ id: 'A' }, { id: 'B' }],
    edges: [
      { from: 'A', to: 'A' },
      { from: 'A', to: 'B' },
    ],
  };
  const result = solvePagerank(objectGraph, {
    damping: 0.85,
    iterations: 500,
    tolerance: 1e-12,
  });
  assert.deepEqual(result.danglingNodes, ['B']);
  assert.equal(result.converged, true);
  assertRankingShape(result, ['A', 'B']);

  const empty = solvePagerank({ nodes: [], edges: [] });
  assert.deepEqual(empty.scores, {});
  assert.deepEqual(empty.order, []);
  assert.deepEqual(empty.danglingNodes, []);
  assert.equal(empty.converged, true);
  assert.deepEqual(empty.iterations, []);
});

test('PageRank validates malformed graph input', () => {
  assert.throws(() => solvePagerank(null), /expects/);
  assert.throws(() => solvePagerank({ nodes: ['A'], edges: [{ from: 'A', to: 'B' }] }), /Unknown/);
  assert.throws(
    () => solvePagerank({ nodes: ['A', 'A'], edges: [] }),
    /Duplicate node id/
  );
  assert.throws(() => solvePagerank({ nodes: ['A'], edges: 'nope' }), /edges/);
});

/* ------------------------------------------------------------------ */
/* Seeded generators                                                  */
/* ------------------------------------------------------------------ */

function countOccurrences(text, pattern, allowOverlap = true) {
  if (pattern.length === 0) return 0;
  let count = 0;
  let start = 0;
  while (start <= text.length - pattern.length) {
    if (text.slice(start, start + pattern.length) === pattern) {
      count += 1;
      start += allowOverlap ? 1 : pattern.length;
    } else {
      start += 1;
    }
  }
  return count;
}

test('LCS generator is reproducible, bounded and uses the requested alphabet', () => {
  const alphabet = 'XYZ';
  for (let seed = 1; seed <= 20; seed += 1) {
    const first = generateLcsInput({
      lengthA: seed,
      lengthB: seed + 2,
      alphabet,
      seed,
    });
    const second = generateLcsInput({
      lengthA: seed,
      lengthB: seed + 2,
      alphabet,
      seed,
    });
    assert.deepEqual(first, second);
    assert.equal(first.a.length, seed);
    assert.equal(first.b.length, seed + 2);
    for (const symbol of first.a + first.b) assert.ok(alphabet.includes(symbol));
  }

  const clamped = generateLcsInput({ lengthA: 9999, lengthB: -20, seed: 1 });
  assert.equal(clamped.a.length, 120);
  assert.equal(clamped.b.length, 0);
  assert.equal(generateLcsInput({ lengthA: 4, lengthB: 4, alphabet: '', seed: 1 }).a.length, 4);

  const arrayAlphabet = generateLcsInput({
    lengthA: 30,
    lengthB: 30,
    alphabet: ['a', 'b', 'a', 'c'],
    seed: 7,
  });
  for (const symbol of arrayAlphabet.a + arrayAlphabet.b) assert.ok('abc'.includes(symbol));

  const stringSeed = generateLcsInput({ seed: 'repeatable', lengthA: 20, lengthB: 20 });
  const stringSeedAgain = generateLcsInput({ seed: 'repeatable', lengthA: 20, lengthB: 20 });
  assert.deepEqual(stringSeed, stringSeedAgain);
});

test('KMP generator plants real matches, respects lengths and clamps parameters', () => {
  for (let seed = 1; seed <= 30; seed += 1) {
    const generated = generateKmpInput({
      textLength: 80,
      patternLength: 4,
      alphabet: 'ACGT',
      seed,
      plantedMatches: 3,
    });
    const again = generateKmpInput({
      textLength: 80,
      patternLength: 4,
      alphabet: 'ACGT',
      seed,
      plantedMatches: 3,
    });
    assert.deepEqual(generated, again);
    assert.equal(generated.text.length, 80);
    assert.equal(generated.pattern.length, 4);
    for (const symbol of generated.text) assert.ok('ACGT'.includes(symbol));
    assert.ok(
      countOccurrences(generated.text, generated.pattern) >= 3,
      'planted matches must actually occur'
    );
  }

  const clamped = generateKmpInput({
    textLength: 99999,
    patternLength: 999,
    seed: 2,
    plantedMatches: 999,
  });
  assert.equal(clamped.text.length, 5000);
  assert.ok(clamped.pattern.length <= 64);
  assert.ok(clamped.pattern.length <= clamped.text.length);

  const emptyText = generateKmpInput({ textLength: 0, patternLength: 5, plantedMatches: 2 });
  assert.deepEqual(emptyText, { text: '', pattern: '' });

  const tooLarge = generateKmpInput({ textLength: 7, patternLength: 20, seed: 3 });
  assert.ok(tooLarge.pattern.length <= tooLarge.text.length);
});

test('Hull generator produces bounded reproducible points for every shape', () => {
  for (const shape of ['random', 'circle', 'clusters']) {
    for (let seed = 1; seed <= 10; seed += 1) {
      const generated = generateHullInput({ count: 40, spread: 800, seed, shape });
      const again = generateHullInput({ count: 40, spread: 800, seed, shape });
      assert.deepEqual(generated, again);
      assert.equal(generated.points.length, 40);
      for (const point of generated.points) {
        assertPoint(point);
        assert.ok(point.x >= 0 && point.x <= 1000);
        assert.ok(point.y >= 0 && point.y <= 1000);
      }
    }
  }

  const invalid = generateHullInput({ count: 20, spread: 600, seed: 5, shape: 'triangle' });
  const random = generateHullInput({ count: 20, spread: 600, seed: 5, shape: 'random' });
  assert.deepEqual(invalid, random);

  assert.equal(generateHullInput({ count: 0, seed: 1 }).points.length, 1);
  assert.equal(generateHullInput({ count: 1000, seed: 1 }).points.length, 500);
  for (const point of generateHullInput({ count: 12, spread: 5000, seed: 4 }).points) {
    assert.ok(point.x >= 0 && point.x <= 1000);
    assert.ok(point.y >= 0 && point.y <= 1000);
  }

  const flat = generateHullInput({ count: 8, spread: 0, seed: 2, shape: 'random' });
  for (const point of flat.points) {
    assert.equal(point.x, 500);
    assert.equal(point.y, 500);
  }
});

test('PageRank generator is directed, self-loop-free, deterministic and has no dead ends', () => {
  const topologies = [
    { nodes: 2, edgeProbability: 0, seed: 1 },
    { nodes: 3, edgeProbability: 0.2, seed: 2 },
    { nodes: 8, edgeProbability: 0.4, seed: 3 },
    { nodes: 30, edgeProbability: 0.9, seed: 4 },
  ];

  for (const options of topologies) {
    const generated = generatePagerankInput(options);
    const again = generatePagerankInput(options);
    assert.deepEqual(generated, again);
    assert.equal(generated.nodes.length, options.nodes);
    assert.equal(new Set(generated.nodes).size, options.nodes);

    const ids = new Set(generated.nodes);
    const outgoing = new Map(generated.nodes.map((id) => [id, 0]));
    const pairs = new Set();
    for (const edge of generated.edges) {
      assert.ok(ids.has(edge.from));
      assert.ok(ids.has(edge.to));
      assert.notEqual(edge.from, edge.to, 'self-loops are forbidden');
      const key = `${edge.from}\u0000${edge.to}`;
      assert.equal(pairs.has(key), false, 'parallel edges must not be generated');
      pairs.add(key);
      outgoing.set(edge.from, outgoing.get(edge.from) + 1);
    }
    for (const id of generated.nodes) {
      assert.ok(outgoing.get(id) >= 1, `node ${id} must have an outgoing edge`);
    }
  }

  const noEdges = generatePagerankInput({ nodes: 5, edgeProbability: 0, seed: 9 });
  assert.equal(noEdges.edges.length, 5);
  for (let index = 0; index < noEdges.nodes.length; index += 1) {
    assert.equal(noEdges.edges[index].from, noEdges.nodes[index]);
    assert.equal(noEdges.edges[index].to, noEdges.nodes[(index + 1) % noEdges.nodes.length]);
  }

  const complete = generatePagerankInput({ nodes: 6, edgeProbability: 1, seed: 10 });
  assert.equal(complete.edges.length, 6 * 5);

  const clampedLow = generatePagerankInput({ nodes: 1, edgeProbability: -5, seed: 11 });
  assert.equal(clampedLow.nodes.length, 2);
  assert.equal(clampedLow.edges.length, 2);

  const clampedHigh = generatePagerankInput({ nodes: 1000, edgeProbability: 5, seed: 12 });
  assert.equal(clampedHigh.nodes.length, 300);
  assert.equal(clampedHigh.edges.length, 300 * 299);

  const custom = generatePagerankInput({
    nodes: ['alpha', 'beta', 'gamma'],
    edgeProbability: 0,
    seed: 13,
  });
  assert.deepEqual(custom.nodes, ['alpha', 'beta', 'gamma']);
  assert.equal(custom.edges.length, 3);

  const stringSeedA = generatePagerankInput({ nodes: 6, edgeProbability: 0.3, seed: 'seed' });
  const stringSeedB = generatePagerankInput({ nodes: 6, edgeProbability: 0.3, seed: 'seed' });
  assert.deepEqual(stringSeedA, stringSeedB);
});

test('every generator output feeds its solver without errors', () => {
  for (let seed = 1; seed <= 10; seed += 1) {
    const lcsInput = generateLcsInput({ seed, lengthA: 12, lengthB: 12 });
    assertValidLcs(lcsInput.a, lcsInput.b);

    const kmpInput = generateKmpInput({ seed, textLength: 50, patternLength: 4 });
    assertValidKmp(kmpInput.text, kmpInput.pattern);

    const hullInput = generateHullInput({ seed, count: 20, shape: 'random' });
    assertValidHull(hullInput.points, solveHull(hullInput));

    const graph = generatePagerankInput({ seed, nodes: 10, edgeProbability: 0.3 });
    const ranking = solvePagerank(graph, { iterations: 500, tolerance: 1e-10 });
    assert.equal(ranking.converged, true);
    assertRankingShape(ranking, graph.nodes);
  }
});
