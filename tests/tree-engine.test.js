'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const Engine = require('../engines/tree-engine.js');

const ENGINE_PATH = path.join(__dirname, '..', 'engines', 'tree-engine.js');
const TYPES = ['bst', 'avl', 'rb'];
const PSEUDOCODE = Object.fromEntries(
  TYPES.map((type) => [type, Engine.pseudocode(type)])
);

/* ------------------------------------------------------------------ */
/* Snapshot inspection helpers                                        */
/* ------------------------------------------------------------------ */

function indexNodes(snapshot) {
  return new Map(snapshot.nodes.map((node) => [node.id, node]));
}

function computeSubtreeHeight(index, id, memo) {
  if (id === null) return 0;
  if (memo.has(id)) return memo.get(id);
  const node = index.get(id);
  const result =
    1 +
    Math.max(
      computeSubtreeHeight(index, node.leftId, memo),
      computeSubtreeHeight(index, node.rightId, memo)
    );
  memo.set(id, result);
  return result;
}

function collectInorder(index, rootId) {
  const keys = [];
  const visit = (id) => {
    if (id === null) return;
    const node = index.get(id);
    visit(node.leftId);
    keys.push(node.key);
    visit(node.rightId);
  };
  visit(rootId);
  return keys;
}

function collectBlackPathHeights(index, rootId) {
  const pathHeights = [];
  const visit = (id, blackCount) => {
    if (id === null) {
      pathHeights.push(blackCount);
      return;
    }
    const node = index.get(id);
    const nextCount = blackCount + (node.color === 'black' ? 1 : 0);
    visit(node.leftId, nextCount);
    visit(node.rightId, nextCount);
  };
  visit(rootId, 0);
  return pathHeights;
}

function blackHeightMetrics(snapshot) {
  const index = indexNodes(snapshot);
  if (snapshot.nodes.length === 0) {
    return { equal: true, blackHeight: 0, paths: [0] };
  }
  const paths = collectBlackPathHeights(index, snapshot.rootId);
  const unique = new Set(paths);
  return {
    equal: unique.size === 1,
    blackHeight: paths[0],
    paths,
  };
}

function assertAlgorithmInvariants(snapshot, type) {
  const index = indexNodes(snapshot);

  if (type === 'avl') {
    const heights = new Map();
    for (const node of snapshot.nodes) {
      const leftHeight = computeSubtreeHeight(index, node.leftId, heights);
      const rightHeight = computeSubtreeHeight(index, node.rightId, heights);
      assert.ok(
        Math.abs(leftHeight - rightHeight) <= 1,
        `AVL balance factor out of range at key ${node.key}`
      );
    }
    assert.equal(snapshot.stats.isBalanced, true);
  }

  if (type === 'rb') {
    if (snapshot.nodes.length === 0) {
      assert.equal(snapshot.stats.blackHeight, 0);
      return;
    }

    const root = index.get(snapshot.rootId);
    assert.equal(root.color, 'black', 'red-black root must be black');

    for (const node of snapshot.nodes) {
      if (node.color !== 'red') continue;
      for (const childId of [node.leftId, node.rightId]) {
        if (childId !== null) {
          assert.notEqual(
            index.get(childId).color,
            'red',
            `red-red violation between keys ${node.key} and ${index.get(childId).key}`
          );
        }
      }
    }

    const metrics = blackHeightMetrics(snapshot);
    assert.equal(metrics.equal, true, 'unequal black heights on root-to-null paths');
    assert.equal(snapshot.stats.blackHeight, metrics.blackHeight);
    assert.ok(snapshot.stats.blackHeight >= 0);
  }
}

function assertValidLineRange(snapshot, type) {
  const pseudocode = PSEUDOCODE[type];
  assert.ok(Array.isArray(snapshot.lineRange), 'lineRange must be an array');
  assert.equal(snapshot.lineRange.length, 2, 'lineRange must be [start, end]');
  const [start, end] = snapshot.lineRange;
  assert.ok(Number.isInteger(start), 'lineRange start must be an integer');
  assert.ok(Number.isInteger(end), 'lineRange end must be an integer');
  assert.ok(start >= 1, 'lineRange must be 1-based');
  assert.ok(end <= pseudocode.length, 'lineRange must point into pseudocode');
  assert.ok(start <= end, 'lineRange start must not exceed end');
}

function assertSnapshotShape(snapshot, type) {
  assert.ok(snapshot && typeof snapshot === 'object', 'snapshot must be an object');
  assert.equal(snapshot.type, type);
  assert.ok(Array.isArray(snapshot.nodes), 'snapshot.nodes must be an array');
  assert.ok(Object.hasOwn(snapshot, 'rootId'), 'snapshot.rootId must exist');
  assert.ok(Array.isArray(snapshot.highlights), 'snapshot.highlights must be an array');
  assert.ok(
    snapshot.activeId === null || typeof snapshot.activeId === 'string',
    'activeId must be a node id or null'
  );
  assert.equal(typeof snapshot.message, 'string');
  assert.ok(snapshot.message.length > 0, 'message must explain the step');
  assert.equal(typeof snapshot.detail, 'string');
  assert.ok(snapshot.detail.length > 0, 'detail must explain the step');
  assert.ok(snapshot.stats && typeof snapshot.stats === 'object');

  assertValidLineRange(snapshot, type);

  const nodes = snapshot.nodes;
  const index = new Map();
  const keyToId = new Map();

  for (const node of nodes) {
    assert.equal(typeof node.id, 'string');
    assert.ok(node.id.length > 0);
    assert.ok(!index.has(node.id), `duplicate node id ${node.id}`);
    assert.ok(Number.isInteger(node.key), 'node keys must be integers');
    assert.ok(!keyToId.has(node.key), `duplicate key ${node.key}`);
    assert.ok(node.leftId === null || typeof node.leftId === 'string');
    assert.ok(node.rightId === null || typeof node.rightId === 'string');
    assert.ok(node.parentId === null || typeof node.parentId === 'string');

    if (type === 'rb') {
      assert.ok(node.color === 'red' || node.color === 'black');
    } else {
      assert.equal(node.color, null);
    }

    index.set(node.id, node);
    keyToId.set(node.key, node.id);
  }

  if (nodes.length === 0) {
    assert.equal(snapshot.rootId, null);
  } else {
    assert.equal(typeof snapshot.rootId, 'string');
    assert.ok(index.has(snapshot.rootId), 'rootId must reference a node');
  }

  // Parent/child IDs must be mutually consistent.
  for (const node of nodes) {
    if (node.parentId !== null) {
      const parent = index.get(node.parentId);
      assert.ok(parent, `missing parent ${node.parentId}`);
      assert.ok(
        parent.leftId === node.id || parent.rightId === node.id,
        `parent ${parent.id} does not reference child ${node.id}`
      );
    }

    for (const [side, childId] of [
      ['left', node.leftId],
      ['right', node.rightId],
    ]) {
      if (childId === null) continue;
      const child = index.get(childId);
      assert.ok(child, `missing ${side} child ${childId}`);
      assert.equal(child.parentId, node.id);
    }
  }

  const roots = nodes.filter((node) => node.parentId === null);
  if (nodes.length === 0) {
    assert.equal(roots.length, 0);
  } else {
    assert.equal(roots.length, 1, 'the tree must have exactly one root');
    assert.equal(roots[0].id, snapshot.rootId);
  }

  // Reachability and acyclicity.
  if (nodes.length > 0) {
    const seen = new Set();
    const stack = [snapshot.rootId];
    let edges = 0;
    while (stack.length > 0) {
      const id = stack.pop();
      assert.ok(!seen.has(id), `cycle or duplicate reference at ${id}`);
      seen.add(id);
      const node = index.get(id);
      for (const childId of [node.leftId, node.rightId]) {
        if (childId !== null) {
          edges += 1;
          stack.push(childId);
        }
      }
    }
    assert.equal(seen.size, nodes.length, 'all nodes must be reachable from the root');
    assert.equal(edges, nodes.length - 1, 'a tree must have n - 1 edges');
  }

  // BST ordering and key uniqueness.
  const inorderKeys = collectInorder(index, snapshot.rootId);
  assert.equal(inorderKeys.length, nodes.length);
  for (let i = 1; i < inorderKeys.length; i += 1) {
    assert.ok(
      inorderKeys[i - 1] < inorderKeys[i],
      'in-order traversal must be strictly increasing'
    );
  }

  // Stats must describe the snapshot in hand.
  const stats = snapshot.stats;
  assert.equal(stats.size, nodes.length);
  assert.equal(typeof stats.height, 'number');
  assert.ok(Number.isInteger(stats.rotations) && stats.rotations >= 0);
  assert.ok(Number.isInteger(stats.recolors) && stats.recolors >= 0);

  const heights = new Map();
  const expectedHeight = computeSubtreeHeight(index, snapshot.rootId, heights);
  assert.equal(stats.height, expectedHeight);

  if (type === 'rb') {
    assert.ok(
      Number.isInteger(stats.blackHeight),
      'rb stats.blackHeight must be an integer'
    );
    assert.equal(Object.hasOwn(stats, 'isBalanced'), false);
  } else {
    assert.equal(typeof stats.isBalanced, 'boolean');
    let balanced = true;
    for (const node of nodes) {
      const leftHeight = computeSubtreeHeight(index, node.leftId, heights);
      const rightHeight = computeSubtreeHeight(index, node.rightId, heights);
      if (Math.abs(leftHeight - rightHeight) > 1) {
        balanced = false;
        break;
      }
    }
    assert.equal(stats.isBalanced, balanced);
  }

  // Highlight and active references must point at real nodes.
  const highlightSet = new Set(snapshot.highlights);
  assert.equal(highlightSet.size, snapshot.highlights.length);
  for (const id of snapshot.highlights) {
    assert.ok(index.has(id), `highlight references missing node ${id}`);
  }
  if (snapshot.activeId !== null) {
    assert.ok(index.has(snapshot.activeId));
    assert.ok(
      highlightSet.has(snapshot.activeId),
      'active node must also be highlighted'
    );
  }
}

function createIdTracker() {
  const idToKey = new Map();
  const keyToId = new Map();
  return {
    observe(snapshot) {
      for (const node of snapshot.nodes) {
        if (idToKey.has(node.id)) {
          assert.equal(
            idToKey.get(node.id),
            node.key,
            `node id ${node.id} changed key`
          );
        } else {
          idToKey.set(node.id, node.key);
        }

        if (keyToId.has(node.key)) {
          assert.equal(
            keyToId.get(node.key),
            node.id,
            `key ${node.key} changed node id`
          );
        } else {
          keyToId.set(node.key, node.id);
        }
      }
    },
    allIds() {
      return new Set(idToKey.keys());
    },
  };
}

function findSearchPath(snapshot, key) {
  const index = indexNodes(snapshot);
  const path = [];
  let id = snapshot.rootId;

  while (id !== null) {
    const node = index.get(id);
    path.push(id);
    if (key === node.key) {
      return { ids: path, found: true };
    }
    id = key < node.key ? node.leftId : node.rightId;
  }

  return { ids: path, found: false };
}

function insertAndCheck(tree, type, key, tracker, expectedInserted) {
  const result = tree.insert(key);
  if (expectedInserted !== undefined) {
    assert.equal(result.inserted, expectedInserted);
  }
  assert.equal(typeof result.inserted, 'boolean');
  assert.ok(Array.isArray(result.steps));
  assert.ok(result.steps.length > 0);
  assert.strictEqual(result.finalState, result.steps[result.steps.length - 1]);

  for (const step of result.steps) {
    assertSnapshotShape(step, type);
    tracker.observe(step);
  }

  assertAlgorithmInvariants(result.finalState, type);

  const current = tree.snapshot();
  assertSnapshotShape(current, type);
  tracker.observe(current);
  assert.deepEqual(current.nodes, result.finalState.nodes);
  assert.equal(current.rootId, result.finalState.rootId);
  assert.deepEqual(current.stats, result.finalState.stats);

  return result;
}

function searchAndCheck(tree, type, key, tracker) {
  const before = tree.snapshot();
  assertSnapshotShape(before, type);
  tracker.observe(before);

  const expected = findSearchPath(before, key);
  const result = tree.search(key);

  assert.equal(typeof result.found, 'boolean');
  assert.equal(result.found, expected.found);
  assert.ok(Array.isArray(result.steps));

  const extraFinalMissStep = expected.found ? 0 : 1;
  assert.equal(result.steps.length, expected.ids.length + extraFinalMissStep);

  for (let i = 0; i < result.steps.length; i += 1) {
    const step = result.steps[i];
    assertSnapshotShape(step, type);
    tracker.observe(step);

    if (i < expected.ids.length) {
      assert.equal(step.activeId, expected.ids[i]);
      assert.deepEqual(step.highlights, expected.ids.slice(0, i + 1));
    } else {
      assert.equal(expected.found, false);
      assert.equal(step.activeId, null);
      assert.deepEqual(step.highlights, expected.ids);
    }
  }

  const last = result.steps[result.steps.length - 1];
  assert.deepEqual(last.highlights, expected.ids);
  assert.equal(last.activeId, expected.found ? expected.ids.at(-1) : null);
  assert.ok(
    last.message.includes(expected.found ? '成功' : '失败'),
    'search result message must state hit/miss'
  );

  const resultCode = PSEUDOCODE[type]
    .slice(last.lineRange[0] - 1, last.lineRange[1])
    .join('\n');
  assert.match(resultCode, expected.found ? /找到/ : /未找到/);

  const after = tree.snapshot();
  assert.deepEqual(after, before, 'search must not mutate the tree');

  return result;
}

/* ------------------------------------------------------------------ */
/* API and pseudocode                                                */
/* ------------------------------------------------------------------ */

test('ALGORITHMS exposes the three levels with complete metadata', () => {
  assert.deepEqual(
    Engine.ALGORITHMS.map((algorithm) => algorithm.id),
    TYPES
  );
  assert.deepEqual(
    Engine.ALGORITHMS.map((algorithm) => algorithm.level),
    ['L1', 'L2', 'L3']
  );

  for (const algorithm of Engine.ALGORITHMS) {
    assert.equal(typeof algorithm.name, 'string');
    assert.match(algorithm.name, /[\u4e00-\u9fff]/);
    assert.equal(typeof algorithm.en, 'string');
    assert.ok(algorithm.en.length > 0);
    assert.equal(typeof algorithm.description, 'string');
    assert.ok(algorithm.description.length > 0);
    assert.equal(typeof algorithm.time, 'string');
    assert.ok(algorithm.time.length > 0);
    assert.equal(typeof algorithm.space, 'string');
    assert.ok(algorithm.space.length > 0);
  }
});

test('pseudocode is display-ready, non-empty, and has no line numbers', () => {
  for (const type of TYPES) {
    const lines = Engine.pseudocode(type);
    assert.ok(Array.isArray(lines));
    assert.ok(lines.length >= 20);
    assert.ok(lines.every((line) => typeof line === 'string'));
    assert.ok(lines.every((line) => line.trim().length > 0));

    for (const line of lines) {
      assert.doesNotMatch(line, /^\s*\d+\s*[.):]\s/, `line number leaked into ${type}`);
    }

    // The function returns a defensive copy, not its internal frozen array.
    lines.push('tamper');
    assert.notEqual(Engine.pseudocode(type).length, lines.length);
    assert.deepEqual(Engine.pseudocode(type), Engine.pseudocode(type));
  }

  assert.throws(() => Engine.pseudocode('splay'), RangeError);
  assert.throws(() => Engine.createTree('splay'), RangeError);
});

test('UMD build has no dependencies and exposes window.TreeEngine', () => {
  const source = fs.readFileSync(ENGINE_PATH, 'utf8');

  assert.doesNotMatch(source, /\brequire\s*\(/, 'engine must not require dependencies');
  assert.doesNotMatch(source, /\bdocument\b|querySelector|addEventListener/);

  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: ENGINE_PATH });

  const BrowserEngine = sandbox.window.TreeEngine;
  assert.ok(BrowserEngine);
  assert.deepEqual(
    Array.from(BrowserEngine.ALGORITHMS, (algorithm) => algorithm.id),
    TYPES
  );
  const tree = BrowserEngine.createTree('avl');
  const result = tree.insert(10);
  assert.equal(result.inserted, true);
  assert.equal(result.finalState.type, 'avl');
});

/* ------------------------------------------------------------------ */
/* Seeded key generation                                              */
/* ------------------------------------------------------------------ */

test('generateKeys is deterministic, unique, integral, and in range', () => {
  const first = Engine.generateKeys({ count: 24, min: -100, max: 100, seed: 1234 });
  const second = Engine.generateKeys({ count: 24, min: -100, max: 100, seed: 1234 });
  const otherSeed = Engine.generateKeys({ count: 24, min: -100, max: 100, seed: 4321 });

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, otherSeed);
  assert.equal(first.length, 24);
  assert.equal(new Set(first).size, 24);
  for (const key of first) {
    assert.ok(Number.isInteger(key));
    assert.ok(key >= -100 && key <= 100);
  }

  const fullRange = Engine.generateKeys({ count: 11, min: -5, max: 5, seed: 8 });
  assert.deepEqual([...fullRange].sort((a, b) => a - b), [
    -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5,
  ]);

  assert.deepEqual(Engine.generateKeys({ count: 0, min: 4, max: 4, seed: 1 }), []);
  assert.deepEqual(Engine.generateKeys({ count: 1, min: 7, max: 7, seed: 1 }), [7]);

  // Every draw remains unique even when the interval is nearly exhausted.
  for (let seed = 0; seed < 25; seed += 1) {
    const keys = Engine.generateKeys({ count: 15, min: 1, max: 17, seed });
    assert.equal(new Set(keys).size, 15);
  }

  assert.throws(
    () => Engine.generateKeys({ count: 5, min: 1, max: 3, seed: 1 }),
    RangeError
  );
  assert.throws(() => Engine.generateKeys({ count: -1 }), RangeError);
  assert.throws(() => Engine.generateKeys({ count: 1.5 }), RangeError);
  assert.throws(() => Engine.generateKeys({ count: 2, min: 10, max: 1 }), RangeError);
  assert.throws(() => Engine.generateKeys({ seed: NaN }), TypeError);
  assert.throws(() => Engine.generateKeys([]), TypeError);
});

/* ------------------------------------------------------------------ */
/* Empty tree, one node, clear                                        */
/* ------------------------------------------------------------------ */

for (const type of TYPES) {
  test(`${type}: empty tree, one-node case, and clear()`, () => {
    const tree = Engine.createTree(type);
    const tracker = createIdTracker();
    assert.equal(tree.type, type);

    const empty = tree.snapshot();
    assertSnapshotShape(empty, type);
    tracker.observe(empty);
    assert.equal(empty.rootId, null);
    assert.deepEqual(empty.nodes, []);
    assert.deepEqual(empty.highlights, []);
    assert.equal(empty.activeId, null);
    assert.equal(empty.stats.size, 0);
    assert.equal(empty.stats.height, 0);
    assert.equal(empty.stats.rotations, 0);
    assert.equal(empty.stats.recolors, 0);
    if (type === 'rb') {
      assert.equal(empty.stats.blackHeight, 0);
    } else {
      assert.equal(empty.stats.isBalanced, true);
    }

    const emptyMiss = searchAndCheck(tree, type, 42, tracker);
    assert.equal(emptyMiss.found, false);
    assert.equal(emptyMiss.steps.length, 1);
    assert.ok(emptyMiss.steps[0].message.includes('空'));

    const inserted = insertAndCheck(tree, type, 42, tracker, true);
    assert.equal(inserted.steps.length >= 2, true);
    assert.equal(inserted.finalState.stats.size, 1);
    assert.equal(inserted.finalState.stats.height, 1);
    assert.equal(inserted.finalState.stats.rotations, 0);
    assert.equal(inserted.finalState.rootId, inserted.finalState.nodes[0].id);
    assert.equal(inserted.finalState.nodes[0].parentId, null);
    assert.equal(inserted.finalState.nodes[0].leftId, null);
    assert.equal(inserted.finalState.nodes[0].rightId, null);

    if (type === 'rb') {
      assert.equal(inserted.finalState.nodes[0].color, 'black');
      assert.equal(inserted.finalState.stats.recolors, 1);
      assert.equal(inserted.finalState.stats.blackHeight, 1);
    } else {
      assert.equal(inserted.finalState.nodes[0].color, null);
      assert.equal(inserted.finalState.stats.recolors, 0);
      assert.equal(inserted.finalState.stats.isBalanced, true);
    }

    const hit = searchAndCheck(tree, type, 42, tracker);
    assert.equal(hit.found, true);
    assert.equal(hit.steps.length, 1);

    const miss = searchAndCheck(tree, type, 7, tracker);
    assert.equal(miss.found, false);
    assert.equal(miss.steps.length, 2);
    assert.deepEqual(miss.steps[0].highlights, [inserted.finalState.rootId]);

    const usedBeforeClear = tracker.allIds();
    assert.equal(usedBeforeClear.size, 1);

    tree.clear();
    const cleared = tree.snapshot();
    assertSnapshotShape(cleared, type);
    tracker.observe(cleared);
    assert.deepEqual(cleared.nodes, []);
    assert.equal(cleared.rootId, null);
    assert.equal(cleared.stats.size, 0);
    assert.equal(cleared.stats.height, 0);
    assert.equal(cleared.stats.rotations, 0);
    assert.equal(cleared.stats.recolors, 0);

    const afterClear = insertAndCheck(tree, type, 7, tracker, true);
    assert.equal(afterClear.finalState.stats.size, 1);
    const newRootId = afterClear.finalState.rootId;
    assert.equal(usedBeforeClear.has(newRootId), false, 'node ids must not be reused');
  });
}

/* ------------------------------------------------------------------ */
/* Duplicate policy                                                   */
/* ------------------------------------------------------------------ */

for (const type of TYPES) {
  test(`${type}: duplicate keys are ignored and reported`, () => {
    const tree = Engine.createTree(type);
    const tracker = createIdTracker();

    insertAndCheck(tree, type, 8, tracker, true);
    insertAndCheck(tree, type, 4, tracker, true);
    insertAndCheck(tree, type, 12, tracker, true);

    const before = tree.snapshot();
    const beforeIds = tracker.allIds();
    const duplicate = insertAndCheck(tree, type, 4, tracker, false);

    assert.equal(duplicate.inserted, false);
    assert.equal(duplicate.finalState.stats.size, 3);
    assert.equal(duplicate.finalState.stats.rotations, before.stats.rotations);
    assert.equal(duplicate.finalState.stats.recolors, before.stats.recolors);
    assert.match(duplicate.finalState.message, /已存在|重复/);
    assert.ok(duplicate.steps.length >= 1);
    assert.strictEqual(duplicate.finalState, duplicate.steps.at(-1));

    const after = tree.snapshot();
    assert.deepEqual(after.nodes, before.nodes);
    assert.equal(after.rootId, before.rootId);
    assert.deepEqual(after.stats, before.stats);
    assert.deepEqual(tracker.allIds(), beforeIds);

    for (const step of duplicate.steps) {
      assertSnapshotShape(step, type);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Randomized insertion and search                                    */
/* ------------------------------------------------------------------ */

const RANDOM_SEGMENTS = [
  { seed: 11, min: -900, max: -401 },
  { seed: 77, min: -300, max: 200 },
  { seed: 2024, min: 301, max: 900 },
];
const RANDOM_COUNT = 36;

for (const type of TYPES) {
  test(`${type}: random insertions keep invariants after every insert`, () => {
    const tree = Engine.createTree(type);
    const tracker = createIdTracker();
    const allKeys = [];
    let previousStats = tree.stats();

    for (const segment of RANDOM_SEGMENTS) {
      const keys = Engine.generateKeys({
        count: RANDOM_COUNT,
        min: segment.min,
        max: segment.max,
        seed: segment.seed,
      });
      assert.equal(new Set(keys).size, RANDOM_COUNT);

      for (const key of keys) {
        const beforeSize = tree.stats().size;
        const result = insertAndCheck(tree, type, key, tracker, true);
        allKeys.push(key);

        assert.equal(result.inserted, true);
        assert.equal(result.finalState.stats.size, beforeSize + 1);
        assert.ok(result.finalState.stats.rotations >= previousStats.rotations);
        assert.ok(result.finalState.stats.recolors >= previousStats.recolors);
        assert.deepEqual(tree.stats(), result.finalState.stats);

        if (type === 'bst' || type === 'avl') {
          assert.equal(result.finalState.stats.recolors, 0);
        }
        if (type === 'bst') {
          assert.equal(result.finalState.stats.rotations, 0);
        }
        if (type === 'rb') {
          assert.ok(result.finalState.stats.blackHeight >= 0);
        }

        previousStats = result.finalState.stats;
      }
    }

    assert.equal(tree.stats().size, RANDOM_SEGMENTS.length * RANDOM_COUNT);
    assert.equal(new Set(allKeys).size, allKeys.length);

    if (type === 'avl') {
      assert.ok(tree.stats().rotations > 0, 'random AVL inserts should rotate');
    }
    if (type === 'rb') {
      assert.ok(tree.stats().rotations > 0, 'random RB inserts should rotate');
      assert.ok(tree.stats().recolors > 0, 'random RB inserts should recolor');
    }

    // Every inserted key is found via the real search path.
    for (const key of allKeys) {
      const hit = searchAndCheck(tree, type, key, tracker);
      assert.equal(hit.found, true);
    }

    // Misses include keys below, between, and above the insertion segments.
    for (const key of [-10000, 0, 250, 10000]) {
      const miss = searchAndCheck(tree, type, key, tracker);
      assert.equal(miss.found, false);
    }

    assertSnapshotShape(tree.snapshot(), type);
    assertAlgorithmInvariants(tree.snapshot(), type);
  });
}

/* ------------------------------------------------------------------ */
/* AVL rotations                                                      */
/* ------------------------------------------------------------------ */

test('avl: LL, RR, LR, and RL rotations have correct traces and counts', () => {
  const scenarios = [
    { keys: [30, 20, 10], label: 'LL', rotations: 1 },
    { keys: [10, 20, 30], label: 'RR', rotations: 1 },
    { keys: [30, 10, 20], label: 'LR', rotations: 2 },
    { keys: [10, 30, 20], label: 'RL', rotations: 2 },
  ];

  for (const scenario of scenarios) {
    const tree = Engine.createTree('avl');
    const tracker = createIdTracker();
    const allSteps = [];

    for (const key of scenario.keys) {
      const result = insertAndCheck(tree, 'avl', key, tracker, true);
      allSteps.push(...result.steps);
      if (key === scenario.keys.at(-1)) {
        assert.strictEqual(result.finalState, result.steps.at(-1));
      }
    }

    const final = tree.snapshot();
    assertSnapshotShape(final, 'avl');
    assertAlgorithmInvariants(final, 'avl');
    assert.equal(final.rootId, final.nodes.find((node) => node.key === 20).id);
    assert.equal(final.stats.height, 2);
    assert.equal(final.stats.rotations, scenario.rotations);
    assert.equal(final.stats.recolors, 0);
    assert.equal(final.stats.size, 3);

    const messages = allSteps.map((step) => step.message).join('\n');
    assert.match(messages, new RegExp(`${scenario.label} 型`));

    const rotationSteps = allSteps.filter(
      (step) => /型.*(?:左旋|右旋)/.test(step.message)
    );
    assert.equal(rotationSteps.length, scenario.rotations);
    for (const step of rotationSteps) {
      const slice = PSEUDOCODE.avl
        .slice(step.lineRange[0] - 1, step.lineRange[1])
        .join('\n');
      assert.match(slice, /rotate/i, 'rotation lineRange must point at rotation code');
    }

    for (const key of scenario.keys) {
      assert.equal(searchAndCheck(tree, 'avl', key, tracker).found, true);
    }
  }
});

/* ------------------------------------------------------------------ */
/* Red-black rotations and recoloring                                 */
/* ------------------------------------------------------------------ */

test('rb: rotations and recoloring are traced and preserve RB invariants', () => {
  const scenarios = [
    { keys: [10, 20, 30], label: 'RR', rotations: 1 },
    { keys: [10, 30, 20], label: 'RL', rotations: 2 },
    { keys: [30, 20, 10], label: 'LL', rotations: 1 },
    { keys: [30, 10, 20], label: 'LR', rotations: 2 },
  ];

  for (const scenario of scenarios) {
    const tree = Engine.createTree('rb');
    const tracker = createIdTracker();
    const allSteps = [];

    for (const key of scenario.keys) {
      const result = insertAndCheck(tree, 'rb', key, tracker, true);
      allSteps.push(...result.steps);
    }

    const final = tree.snapshot();
    assertSnapshotShape(final, 'rb');
    assertAlgorithmInvariants(final, 'rb');
    assert.equal(final.rootId, final.nodes.find((node) => node.key === 20).id);
    assert.equal(final.nodes.find((node) => node.key === 20).color, 'black');
    assert.equal(final.stats.rotations, scenario.rotations);
    assert.equal(final.stats.recolors, 3);
    assert.equal(final.stats.blackHeight, 1);
    assert.equal(final.stats.size, 3);

    const messages = allSteps.map((step) => step.message).join('\n');
    assert.match(messages, new RegExp(`${scenario.label} 型`));

    const rotationSteps = allSteps.filter((step) => /型.*旋/.test(step.message));
    assert.equal(rotationSteps.length, scenario.rotations);
    for (const step of rotationSteps) {
      const slice = PSEUDOCODE.rb
        .slice(step.lineRange[0] - 1, step.lineRange[1])
        .join('\n');
      assert.match(slice, /ROTATE/i, 'rotation lineRange must point at rotation code');
    }

    for (const key of scenario.keys) {
      assert.equal(searchAndCheck(tree, 'rb', key, tracker).found, true);
    }
  }

  // Red uncle case: two red children of a black root, insert under the left one.
  const tree = Engine.createTree('rb');
  const tracker = createIdTracker();
  const allSteps = [];
  for (const key of [10, 5, 15, 1]) {
    const result = insertAndCheck(tree, 'rb', key, tracker, true);
    allSteps.push(...result.steps);
  }

  const final = tree.snapshot();
  assertSnapshotShape(final, 'rb');
  assertAlgorithmInvariants(final, 'rb');
  assert.equal(final.stats.rotations, 0);
  assert.equal(final.stats.recolors, 5);
  assert.equal(final.stats.blackHeight, 2);

  const actualColors = Object.fromEntries(final.nodes.map((node) => [node.key, node.color]));
  assert.deepEqual(actualColors, {
    10: 'black',
    5: 'black',
    15: 'black',
    1: 'red',
  });

  const redUncleStep = allSteps.find((step) => /红叔/.test(step.message));
  assert.ok(redUncleStep, 'red-uncle recolor step must be present');
  assert.match(
    PSEUDOCODE.rb
      .slice(redUncleStep.lineRange[0] - 1, redUncleStep.lineRange[1])
      .join('\n'),
    /color/i
  );

  for (const key of [10, 5, 15, 1]) {
    assert.equal(searchAndCheck(tree, 'rb', key, tracker).found, true);
  }
});

/* ------------------------------------------------------------------ */
/* Search paths on a known tree                                       */
/* ------------------------------------------------------------------ */

test('all trees: search hit/miss paths highlight every compared node', () => {
  const insertOrder = [50, 30, 70, 20, 40, 60, 80, 10, 25, 35, 45, 55, 65, 75, 85];
  const queries = [
    50, 10, 85, 40, 55, 25, 80, 45, 65, 5, 15, 42, 54, 72, 90, 0,
  ];

  for (const type of TYPES) {
    const tree = Engine.createTree(type);
    const tracker = createIdTracker();

    for (const key of insertOrder) {
      insertAndCheck(tree, type, key, tracker, true);
    }

    for (const key of queries) {
      searchAndCheck(tree, type, key, tracker);
    }
  }

  // Explicit BST path: root -> left -> left hits 20.
  const bst = Engine.createTree('bst');
  const bstTracker = createIdTracker();
  for (const key of insertOrder) {
    insertAndCheck(bst, 'bst', key, bstTracker, true);
  }
  const snapshot = bst.snapshot();
  const index = indexNodes(snapshot);
  const path = findSearchPath(snapshot, 20);
  assert.deepEqual(
    path.ids.map((id) => index.get(id).key),
    [50, 30, 20]
  );
  const result = bst.search(20);
  assert.equal(result.found, true);
  assert.deepEqual(result.steps.at(-1).highlights, path.ids);
  assert.deepEqual(
    result.steps.map((step) => index.get(step.activeId).key),
    [50, 30, 20]
  );
});

/* ------------------------------------------------------------------ */
/* Snapshot stability and input validation                            */
/* ------------------------------------------------------------------ */

test('snapshots are independent copies and node ids stay stable over a lifetime', () => {
  for (const type of TYPES) {
    const tree = Engine.createTree(type);
    const tracker = createIdTracker();

    const first = insertAndCheck(tree, type, 20, tracker, true).finalState;
    const firstCopy = JSON.parse(JSON.stringify(first));
    insertAndCheck(tree, type, 10, tracker, true);
    insertAndCheck(tree, type, 30, tracker, true);
    insertAndCheck(tree, type, 5, tracker, true);
    insertAndCheck(tree, type, 15, tracker, true);

    // Earlier trace snapshots must not be retroactively mutated.
    assert.deepEqual(first, firstCopy);

    const beforeTamper = tree.snapshot();
    const tampered = tree.snapshot();
    tampered.nodes[0].key = -999999;
    tampered.nodes[0].leftId = 'not-a-node';
    tampered.highlights.push('not-a-node');
    tampered.lineRange[0] = 999999;
    const fresh = tree.snapshot();
    assert.deepEqual(fresh, beforeTamper);

    // Existing node IDs remain stable as more keys arrive.
    for (const oldNode of first.nodes) {
      const current = fresh.nodes.find((node) => node.key === oldNode.key);
      assert.ok(current);
      assert.equal(current.id, oldNode.id);
    }

    for (const oldId of tracker.allIds()) {
      assert.ok(fresh.nodes.some((node) => node.id === oldId));
    }

    const usedIds = tracker.allIds();
    tree.clear();
    const afterClear = insertAndCheck(tree, type, 99, tracker, true);
    assert.equal(usedIds.has(afterClear.finalState.rootId), false);
  }
});

test('invalid keys fail before mutating the tree', () => {
  for (const type of TYPES) {
    const tree = Engine.createTree(type);
    const tracker = createIdTracker();
    insertAndCheck(tree, type, 10, tracker, true);
    const before = tree.snapshot();

    for (const invalidKey of [1.5, NaN, Infinity, '10', null, undefined, {}]) {
      assert.throws(() => tree.insert(invalidKey), TypeError);
      assert.throws(() => tree.search(invalidKey), TypeError);
    }

    assert.deepEqual(tree.snapshot(), before);
  }
});
