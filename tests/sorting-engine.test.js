'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const {
  ALGORITHMS,
  generateArray,
  createTrace,
} = require('../engines/sorting-engine.js');

const EXPECTED_ALGORITHM_IDS = [
  'bubble',
  'selection',
  'insertion',
  'shell',
  'merge',
  'quick',
  'heap',
  'counting',
];

const DISTRIBUTIONS = [
  'random',
  'near-sorted',
  'reversed',
  'few-unique',
  'sawtooth',
];

function sortedCopy(values) {
  return values.slice().sort(function (a, b) {
    return a - b;
  });
}

function inversionCount(values) {
  let count = 0;
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      if (values[i] > values[j]) {
        count += 1;
      }
    }
  }
  return count;
}

function sortedIndices(size) {
  return Array.from({ length: size }, function (_, index) {
    return index;
  });
}

function assertValidIndexList(indices, size, label) {
  assert.ok(Array.isArray(indices), label + ' 应该是数组');
  for (const index of indices) {
    assert.ok(Number.isInteger(index), label + ' 应只包含整数下标');
    assert.ok(index >= 0 && index < size, label + ' 的下标越界');
  }
}

test('导出 API 与 8 个算法的元数据完整且合法', function () {
  assert.ok(Array.isArray(ALGORITHMS));
  assert.equal(ALGORITHMS.length, 8);
  assert.equal(typeof generateArray, 'function');
  assert.equal(typeof createTrace, 'function');
  assert.deepEqual(
    ALGORITHMS.map(function (algorithm) {
      return algorithm.id;
    }),
    EXPECTED_ALGORITHM_IDS,
  );

  const ids = new Set();
  for (const algorithm of ALGORITHMS) {
    assert.equal(typeof algorithm.id, 'string');
    assert.ok(algorithm.id.length > 0);
    assert.ok(!ids.has(algorithm.id), '算法 id 必须唯一');
    ids.add(algorithm.id);

    assert.match(algorithm.name, /[\u4e00-\u9fff]/, 'name 应为中文名称');
    assert.equal(typeof algorithm.en, 'string');
    assert.ok(algorithm.en.length > 0);
    assert.ok(['L1', 'L2', 'L3'].includes(algorithm.level));
    assert.ok(algorithm.description.length > 0);
    assert.ok(algorithm.description.endsWith('。'));
    assert.equal((algorithm.description.match(/。/g) || []).length, 1);
    assert.equal(typeof algorithm.time, 'string');
    assert.ok(algorithm.time.length > 0);
    assert.equal(typeof algorithm.space, 'string');
    assert.ok(algorithm.space.length > 0);
    assert.equal(typeof algorithm.stable, 'boolean');
    assert.equal(typeof algorithm.inPlace, 'boolean');

    assert.ok(Array.isArray(algorithm.pseudocode));
    assert.ok(algorithm.pseudocode.length > 0);
    for (const line of algorithm.pseudocode) {
      assert.equal(typeof line, 'string');
      assert.ok(line.trim().length > 0);
      assert.doesNotMatch(line, /^\s*\d+[.)、:：]/, '伪代码不应带行号');
    }
  }
});

test('所有算法都能排序包含重复元素的随机数组', function () {
  for (const algorithm of ALGORITHMS) {
    for (const seed of [7, 31]) {
      const generated = generateArray({
        size: 23,
        maxValue: 19,
        distribution: 'random',
        seed: seed,
      });
      const values = generated.values.concat([
        generated.values[0],
        generated.values[2],
      ]);
      assert.ok(new Set(values).size < values.length, '测试数据应包含重复值');

      const original = values.slice();
      const trace = createTrace(algorithm.id, values);
      const expected = sortedCopy(values);

      assert.deepEqual(values, original, 'createTrace 不应修改调用方数组');
      assert.equal(trace.algorithmId, algorithm.id);
      assert.deepEqual(trace.final, expected);
      assert.deepEqual(trace.steps[trace.steps.length - 1].values, expected);

      for (let i = 1; i < trace.final.length; i += 1) {
        assert.ok(trace.final[i - 1] <= trace.final[i]);
      }
    }
  }
});

test('初始步骤和最终步骤的格式正确', function () {
  const values = [5, 1, 4, 1, 3, 9, 0];

  for (const algorithm of ALGORITHMS) {
    const trace = createTrace(algorithm.id, values);
    const first = trace.steps[0];
    const last = trace.steps[trace.steps.length - 1];
    const expected = sortedCopy(values);

    assert.ok(trace.steps.length >= 2, '至少应有初始和最终两个步骤');
    assert.deepEqual(first.values, values);
    assert.equal(first.comparisons, 0);
    assert.equal(first.swaps, 0);
    assert.deepEqual(first.sorted, []);
    assert.ok(Number.isInteger(first.line));
    assert.ok(
      first.line >= 1 && first.line <= algorithm.pseudocode.length,
    );

    assert.deepEqual(last.values, expected);
    assert.deepEqual(trace.final, expected);
    assert.deepEqual(last.sorted, sortedIndices(values.length));
    assert.equal(last.comparisons, trace.comparisons);
    assert.equal(last.swaps, trace.swaps);
    assert.equal(last.line, algorithm.pseudocode.length);
    assert.equal(typeof last.message, 'string');
    assert.ok(last.message.length > 0);
  }
});

test('trace 中的数组彼此独立，也不修改调用方的数组', function () {
  for (const algorithm of ALGORITHMS) {
    const input = [4, 1, 3, 1, 2, 5, 2];
    const originalInput = input.slice();
    const trace = createTrace(algorithm.id, input);

    assert.deepEqual(input, originalInput, 'createTrace 不应修改调用方数组');

    const seenArrays = new Set();
    const arrayKeys = ['values', 'compare', 'active', 'sorted', 'counts'];

    for (const step of trace.steps) {
      for (const key of arrayKeys) {
        if (step[key] === undefined) {
          continue;
        }
        assert.ok(Array.isArray(step[key]), key + ' 必须是数组');
        assert.ok(
          !seenArrays.has(step[key]),
          algorithm.id + ' 的 ' + key + ' 数组不应被不同步骤复用',
        );
        seenArrays.add(step[key]);
      }
    }

    assert.notStrictEqual(trace.final, trace.steps[trace.steps.length - 1].values);
    assert.notStrictEqual(trace.final, input);
    assert.ok(!seenArrays.has(trace.final));

    const snapshotValues = trace.steps.map(function (step) {
      return step.values.slice();
    });
    const finalBefore = trace.final.slice();
    const probeIndex = Math.min(1, trace.steps.length - 1);
    const otherIndex = probeIndex === 0 ? trace.steps.length - 1 : 0;

    input[0] = 999;
    assert.deepEqual(trace.steps[0].values, snapshotValues[0]);
    assert.deepEqual(
      trace.steps[trace.steps.length - 1].values,
      snapshotValues[snapshotValues.length - 1],
    );

    trace.steps[probeIndex].values[0] = -12345;
    assert.notDeepEqual(
      trace.steps[probeIndex].values,
      snapshotValues[probeIndex],
    );
    assert.deepEqual(trace.steps[otherIndex].values, snapshotValues[otherIndex]);

    trace.final[0] = -54321;
    assert.deepEqual(
      trace.steps[trace.steps.length - 1].values,
      snapshotValues[snapshotValues.length - 1],
    );
    assert.notDeepEqual(trace.final, finalBefore);

    const comparisonSteps = trace.steps.filter(function (step) {
      return step.compare !== undefined;
    });
    if (comparisonSteps.length >= 2) {
      const otherComparison = comparisonSteps[1].compare.slice();
      comparisonSteps[0].compare[0] = -1;
      assert.deepEqual(comparisonSteps[1].compare, otherComparison);
    }

    if (algorithm.id === 'counting') {
      const countsSnapshots = trace.steps
        .filter(function (step) {
          return step.counts !== undefined;
        })
        .map(function (step) {
          return step.counts;
        });
      assert.ok(countsSnapshots.length >= 2);
      const otherCounts = countsSnapshots[1].slice();
      countsSnapshots[0][0] = -1;
      assert.deepEqual(countsSnapshots[1], otherCounts);
    }
  }
});

test('比较/交换计数、下标和行号保持一致且合法', function () {
  const values = [8, 3, 5, 3, 1, 9, 0, 7, 2, 2, 6, 4];
  const expectedMaximum = Math.max(...values);

  for (const algorithm of ALGORITHMS) {
    const trace = createTrace(algorithm.id, values);
    let previousComparisons = 0;
    let previousSwaps = 0;
    let comparisonSnapshots = 0;
    let swapIncreases = 0;
    let countsSnapshots = 0;

    for (const step of trace.steps) {
      assert.ok(Number.isInteger(step.comparisons));
      assert.ok(Number.isInteger(step.swaps));
      assert.ok(step.comparisons >= 0);
      assert.ok(step.swaps >= 0);
      assert.ok(step.comparisons >= previousComparisons);
      assert.ok(step.swaps >= previousSwaps);
      assert.equal(step.values.length, values.length);

      const comparisonDelta = step.comparisons - previousComparisons;
      const swapDelta = step.swaps - previousSwaps;
      assert.ok(comparisonDelta === 0 || comparisonDelta === 1);
      assert.ok(swapDelta === 0 || swapDelta === 1);

      if (step.compare !== undefined) {
        assert.equal(comparisonDelta, 1, '每次比较应产生一个快照');
        assert.equal(step.compare.length, 2);
        assertValidIndexList(step.compare, values.length, 'compare');
        comparisonSnapshots += 1;
      } else {
        assert.equal(comparisonDelta, 0);
      }

      swapIncreases += swapDelta;

      if (step.active !== undefined) {
        assertValidIndexList(step.active, values.length, 'active');
      }
      if (step.sorted !== undefined) {
        assertValidIndexList(step.sorted, values.length, 'sorted');
        assert.deepEqual(
          step.sorted,
          step.sorted.slice().sort(function (a, b) {
            return a - b;
          }),
        );
        assert.equal(new Set(step.sorted).size, step.sorted.length);
      }
      if (step.pivot !== undefined) {
        assert.ok(Number.isInteger(step.pivot));
        assert.ok(step.pivot >= 0 && step.pivot < values.length);
      }

      assert.ok(Number.isInteger(step.line));
      assert.ok(step.line >= 1);
      assert.ok(step.line <= algorithm.pseudocode.length);

      const hasCounts = Object.prototype.hasOwnProperty.call(step, 'counts');
      if (algorithm.id !== 'counting') {
        assert.equal(hasCounts, false, '只有计数排序应包含 counts');
      }
      if (hasCounts) {
        countsSnapshots += 1;
        assert.ok(Array.isArray(step.counts));
        assert.equal(step.counts.length, expectedMaximum + 1);
        for (const count of step.counts) {
          assert.ok(Number.isInteger(count));
          assert.ok(count >= 0);
        }
      }

      previousComparisons = step.comparisons;
      previousSwaps = step.swaps;
    }

    assert.equal(comparisonSnapshots, trace.comparisons);
    assert.equal(swapIncreases, trace.swaps);
    assert.equal(previousComparisons, trace.comparisons);
    assert.equal(previousSwaps, trace.swaps);
    assert.equal(
      countsSnapshots > 0,
      algorithm.id === 'counting',
      '计数排序应提供 counts 快照，其他算法不应提供',
    );
  }
});

test('generateArray 的所有分布可复现且生成合法非负整数', function () {
  for (const distribution of DISTRIBUTIONS) {
    const params = {
      size: 32,
      maxValue: 60,
      distribution: distribution,
      seed: 20261030,
    };
    const first = generateArray(params);
    const second = generateArray(params);

    assert.deepEqual(first, second, '相同 seed 必须产生完全相同的结果');
    assert.equal(first.distribution, distribution);
    assert.equal(first.seed, params.seed);
    assert.equal(first.values.length, params.size);
    assert.deepEqual(first.values, second.values);

    for (const value of first.values) {
      assert.ok(Number.isInteger(value));
      assert.ok(value >= 0);
      assert.ok(value <= params.maxValue);
    }
  }
});

test('generateArray 的分布特征符合预期', function () {
  const size = 24;
  const maxValue = 80;
  const make = function (distribution, seed) {
    return generateArray({
      size: size,
      maxValue: maxValue,
      distribution: distribution,
      seed: seed,
    }).values;
  };

  const random = make('random', 11);
  assert.ok(new Set(random).size > 1, 'random 应有多个不同值');

  const reversed = make('reversed', 12);
  assert.deepEqual(
    reversed,
    reversed.slice().sort(function (a, b) {
      return b - a;
    }),
    'reversed 应为非递增序列',
  );

  const nearSorted = make('near-sorted', 13);
  assert.ok(
    inversionCount(nearSorted) < inversionCount(reversed),
    'near-sorted 应明显比 reversed 更接近有序',
  );

  const fewUnique = make('few-unique', 14);
  const uniqueCount = new Set(fewUnique).size;
  assert.ok(uniqueCount >= 2);
  assert.ok(uniqueCount <= 4, 'few-unique 的不同值不应超过 4 个');

  const sawtooth = make('sawtooth', 15);
  const resets = sawtooth.filter(function (value, index) {
    return index > 0 && value === 0 && sawtooth[index - 1] > 0;
  }).length;
  assert.ok(resets >= 2, 'sawtooth 至少应出现两次明显回落');
  assert.ok(Math.max(...sawtooth) > 0);

  const differentSeed = generateArray({
    size: size,
    maxValue: maxValue,
    distribution: 'random',
    seed: 16,
  }).values;
  assert.notDeepEqual(differentSeed, random, '不同 seed 应产生不同序列');
});

test('generateArray 支持边界尺寸和值域并拒绝非法参数', function () {
  const small = generateArray({
    size: 6,
    maxValue: 10,
    distribution: 'few-unique',
    seed: 1,
  });
  assert.equal(small.values.length, 6);
  assert.ok(small.values.every((value) => value >= 0 && value <= 10));

  const large = generateArray({
    size: 64,
    maxValue: 200,
    distribution: 'sawtooth',
    seed: 2,
  });
  assert.equal(large.values.length, 64);
  assert.ok(large.values.every((value) => value >= 0 && value <= 200));

  assert.throws(
    function () {
      generateArray({ size: 5, maxValue: 20, distribution: 'random', seed: 1 });
    },
    RangeError,
  );
  assert.throws(
    function () {
      generateArray({ size: 20, maxValue: 201, distribution: 'random', seed: 1 });
    },
    RangeError,
  );
  assert.throws(
    function () {
      generateArray({ size: 20, maxValue: 20, distribution: 'unknown', seed: 1 });
    },
    RangeError,
  );
});

test('空数组、单元素、双元素与重复元素等边界情况均正确', function () {
  const edgeCases = [
    [],
    [42],
    [2, 1],
    [1, 2],
    [7, 7, 7, 7],
    [0, 0, 1, 1, 0, 1],
  ];

  for (const algorithm of ALGORITHMS) {
    for (const values of edgeCases) {
      const original = values.slice();
      const trace = createTrace(algorithm.id, values);
      const expected = sortedCopy(values);

      assert.deepEqual(values, original, algorithm.id + ' 不应修改输入数组');
      assert.ok(trace.steps.length >= 2);
      assert.deepEqual(trace.final, expected);
      assert.deepEqual(trace.steps[0].values, values);
      assert.deepEqual(
        trace.steps[trace.steps.length - 1].values,
        expected,
      );
      assert.deepEqual(
        trace.steps[trace.steps.length - 1].sorted,
        sortedIndices(values.length),
      );

      for (const step of trace.steps) {
        assert.ok(step.line >= 1);
        assert.ok(step.line <= algorithm.pseudocode.length);
        assert.ok(step.comparisons >= 0);
        assert.ok(step.swaps >= 0);
      }

      if (values.length <= 1) {
        assert.equal(trace.comparisons, 0);
        assert.equal(trace.swaps, 0);
      }
    }
  }
});

test('计数排序包含 counts 快照并最终得到稳定排序结果', function () {
  const values = [3, 1, 3, 0, 1, 5, 3];
  const trace = createTrace('counting', values);
  const countsSnapshots = trace.steps.filter(function (step) {
    return step.counts !== undefined;
  });

  assert.ok(countsSnapshots.length > values.length);
  assert.deepEqual(countsSnapshots[0].counts, new Array(6).fill(0));
  assert.deepEqual(trace.final, [0, 1, 1, 3, 3, 3, 5]);
  assert.deepEqual(
    trace.steps[trace.steps.length - 1].sorted,
    sortedIndices(values.length),
  );
  assert.ok(
    countsSnapshots.some(function (step) {
      return step.line === 4;
    }),
    '应包含统计频次的快照',
  );
  assert.ok(
    countsSnapshots.some(function (step) {
      return step.line === 5;
    }),
    '应包含前缀和快照',
  );
});

test('UMD 包装在浏览器经典脚本环境中暴露 window.SortingEngine', function () {
  const enginePath = path.join(__dirname, '..', 'engines', 'sorting-engine.js');
  const source = fs.readFileSync(enginePath, 'utf8');
  const context = { window: {} };

  vm.runInNewContext(source, context, { filename: 'sorting-engine.js' });

  assert.equal(typeof context.window.SortingEngine, 'object');
  assert.equal(typeof context.window.SortingEngine.createTrace, 'function');
  assert.equal(typeof context.window.SortingEngine.generateArray, 'function');
  assert.equal(context.window.SortingEngine.ALGORITHMS.length, 8);

  const generated = context.window.SortingEngine.generateArray({
    size: 8,
    maxValue: 20,
    distribution: 'random',
    seed: 99,
  });
  const trace = context.window.SortingEngine.createTrace(
    'bubble',
    generated.values,
  );
  assert.deepEqual(trace.final, sortedCopy(generated.values));
});
