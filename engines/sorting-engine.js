(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SortingEngine = factory();
  }
})(
  typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
      ? globalThis
      : this,
  function () {
    'use strict';

    var DISTRIBUTIONS = [
      'random',
      'near-sorted',
      'reversed',
      'few-unique',
      'sawtooth',
    ];

    var PSEUDOCODE = {
      bubble: [
        '对 i 从 0 到 n-2 逐轮扫描：',
        '  记录本轮是否发生交换（swapped = false）',
        '  对 j 从 0 到 n-i-2：',
        '    比较 a[j] 与 a[j+1]',
        '    若 a[j] > a[j+1]，交换两者并标记 swapped = true',
        '  本轮最大值已就位，标记位置 n-1-i 为已排序',
        '  若本轮未发生交换，则整个数组已有序，提前结束',
        '返回已排序数组',
      ],
      selection: [
        '对 i 从 0 到 n-2：',
        '  设 minIndex = i',
        '  对 j 从 i+1 到 n-1：',
        '    比较 a[j] 与 a[minIndex]',
        '    若 a[j] < a[minIndex]，令 minIndex = j',
        '  若 minIndex ≠ i，交换 a[i] 与 a[minIndex]',
        '  标记位置 i 为已排序',
        '返回已排序数组',
      ],
      insertion: [
        '对 i 从 1 到 n-1：',
        '  令 j = i',
        '  当 j > 0 时：',
        '    比较 a[j-1] 与 a[j]',
        '    若 a[j-1] <= a[j]，结束本轮插入',
        '    交换 a[j-1] 与 a[j]',
        '    j = j - 1',
        '  标记前缀 0..i 为已排序',
        '返回已排序数组',
      ],
      shell: [
        '选择初始增量 gap = floor(n / 2)',
        '当 gap > 0 时：',
        '  对 i 从 gap 到 n-1：',
        '    令 j = i',
        '    当 j >= gap 时：',
        '      比较 a[j-gap] 与 a[j]',
        '      若 a[j-gap] <= a[j]，结束本轮',
        '      交换 a[j-gap] 与 a[j]',
        '      j = j - gap',
        '  令 gap = floor(gap / 2)',
        '返回已排序数组',
      ],
      merge: [
        '对区间 [left..right] 归并排序：',
        '  若区间长度 ≤ 1，直接返回',
        '  取中点 mid = floor((left + right) / 2)',
        '  递归排序左半部分 [left..mid]',
        '  递归排序右半部分 [mid+1..right]',
        '  比较两半的当前元素，将较小者依次放入临时数组',
        '  将某一半剩余的元素依次放入临时数组',
        '  将临时数组依次写回原数组 [left..right]',
        '返回已排序数组',
      ],
      quick: [
        '对区间 [left..right] 快速排序：',
        '  若 left >= right，直接返回',
        '  若区间长度至少为 3，用三数取中法选择枢轴；否则选择右端元素',
        '  将枢轴交换到区间右端 right',
        '  令 store = left',
        '  对 i 从 left 到 right-1：比较 a[i] 与枢轴值',
        '    若 a[i] < 枢轴值，交换 a[store] 与 a[i]，并令 store = store + 1',
        '  将枢轴交换到 store 位置，枢轴归位',
        '  递归排序枢轴左侧 [left..store-1]',
        '  递归排序枢轴右侧 [store+1..right]',
        '返回已排序数组',
      ],
      heap: [
        'siftDown(start, end)：',
        '  parent = start',
        '  当 parent 的左子节点仍在 end 内时：',
        '    child = parent 的左子节点',
        '    若右子节点存在且大于左子节点，令 child 指向右子节点',
        '    若 a[parent] >= a[child]，停止下沉',
        '    交换 a[parent] 与 a[child]',
        '    parent = child',
        '从最后一个父节点开始向前调整，构建最大堆',
        '对 i 从 n-1 到 1：',
        '  交换 a[0] 与 a[i]，将当前最大值放到末尾',
        '  在剩余堆 [0..i-1] 中从根节点执行 siftDown',
        '返回已排序数组',
      ],
      counting: [
        '若数组为空，直接返回',
        '找出数组中的最大值 maxValue',
        '创建计数数组 counts，长度为 maxValue + 1，并全部初始化为 0',
        '遍历原数组，统计每个值出现的次数',
        '将 counts 中的计数转换为前缀和',
        '从后向前遍历原数组，根据 counts 将元素稳定地放入输出数组',
        '将输出数组依次复制回原数组',
        '返回已排序数组',
      ],
    };

    var LINES = {
      bubble: {
        initial: 1,
        compare: 4,
        swap: 5,
        passDone: 6,
        earlyExit: 7,
        final: 8,
      },
      selection: {
        initial: 1,
        compare: 4,
        newMinimum: 5,
        swap: 6,
        markSorted: 7,
        final: 8,
      },
      insertion: {
        initial: 1,
        compare: 4,
        swap: 6,
        markSorted: 8,
        final: 9,
      },
      shell: {
        initial: 1,
        compare: 6,
        swap: 8,
        nextGap: 10,
        final: 11,
      },
      merge: {
        initial: 1,
        compare: 6,
        remainder: 7,
        write: 8,
        final: 9,
      },
      quick: {
        initial: 1,
        choosePivot: 3,
        movePivot: 4,
        compare: 6,
        partitionSwap: 7,
        placePivot: 8,
        recurseLeft: 9,
        recurseRight: 10,
        final: 11,
      },
      heap: {
        initial: 9,
        chooseChild: 5,
        compare: 6,
        swap: 7,
        extract: 11,
        markSorted: 12,
        final: 13,
      },
      counting: {
        initial: 1,
        findMax: 2,
        initialiseCounts: 3,
        count: 4,
        prefix: 5,
        place: 6,
        copyBack: 7,
        final: 8,
      },
    };

    var ALGORITHMS = [
      {
        id: 'bubble',
        name: '冒泡排序',
        en: 'Bubble Sort',
        level: 'L1',
        description: '相邻元素两两比较并交换，每一轮把当前最大值冒泡到末尾。',
        time: 'O(n²)',
        space: 'O(1)',
        stable: true,
        inPlace: true,
        pseudocode: PSEUDOCODE.bubble,
      },
      {
        id: 'selection',
        name: '选择排序',
        en: 'Selection Sort',
        level: 'L1',
        description: '每轮从未排序区间选出最小值，与区间首位交换。',
        time: 'O(n²)',
        space: 'O(1)',
        stable: false,
        inPlace: true,
        pseudocode: PSEUDOCODE.selection,
      },
      {
        id: 'insertion',
        name: '插入排序',
        en: 'Insertion Sort',
        level: 'L1',
        description: '将新元素逐步向前交换，插入到已排序前缀中的正确位置。',
        time: 'O(n²)',
        space: 'O(1)',
        stable: true,
        inPlace: true,
        pseudocode: PSEUDOCODE.insertion,
      },
      {
        id: 'shell',
        name: '希尔排序',
        en: 'Shell Sort',
        level: 'L2',
        description: '按递减的增量对子序列做插入排序，逐步缩小增量直到 1。',
        time: 'O(n²)（最坏）',
        space: 'O(1)',
        stable: false,
        inPlace: true,
        pseudocode: PSEUDOCODE.shell,
      },
      {
        id: 'merge',
        name: '归并排序',
        en: 'Merge Sort',
        level: 'L2',
        description: '自顶向下分割数组，再将两个有序子数组合并为一个有序数组。',
        time: 'O(n log n)',
        space: 'O(n)',
        stable: true,
        inPlace: false,
        pseudocode: PSEUDOCODE.merge,
      },
      {
        id: 'quick',
        name: '快速排序',
        en: 'Quick Sort',
        level: 'L2',
        description: '用三数取中法选择枢轴，通过划分把较小元素放到枢轴左侧并递归排序。',
        time: 'O(n log n)（平均）',
        space: 'O(log n)',
        stable: false,
        inPlace: true,
        pseudocode: PSEUDOCODE.quick,
      },
      {
        id: 'heap',
        name: '堆排序',
        en: 'Heap Sort',
        level: 'L3',
        description: '先构建最大堆，再反复交换堆顶与末尾元素并调整堆。',
        time: 'O(n log n)',
        space: 'O(1)',
        stable: false,
        inPlace: true,
        pseudocode: PSEUDOCODE.heap,
      },
      {
        id: 'counting',
        name: '计数排序',
        en: 'Counting Sort',
        level: 'L3',
        description: '统计每个整数出现的次数，利用前缀和把元素稳定地放到输出位置。',
        time: 'O(n + k)',
        space: 'O(k)',
        stable: true,
        inPlace: false,
        pseudocode: PSEUDOCODE.counting,
      },
    ];

    var ALGORITHM_BY_ID = Object.create(null);
    ALGORITHMS.forEach(function (algorithm) {
      ALGORITHM_BY_ID[algorithm.id] = algorithm;
    });

    function hashSeed(seed) {
      var text = String(seed);
      var hash = 2166136261 >>> 0;
      for (var i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    }

    function mulberry32(seed) {
      var state = seed >>> 0;
      return function () {
        state = (state + 0x6d2b79f5) | 0;
        var value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      };
    }

    function randomInteger(random, min, max) {
      return min + Math.floor(random() * (max - min + 1));
    }

    function shuffle(values, random) {
      for (var i = values.length - 1; i > 0; i -= 1) {
        var j = randomInteger(random, 0, i);
        var temporary = values[i];
        values[i] = values[j];
        values[j] = temporary;
      }
      return values;
    }

    function buildRandom(values, random, size, maxValue) {
      for (var i = 0; i < size; i += 1) {
        values.push(randomInteger(random, 0, maxValue));
      }
    }

    function buildNearSorted(values, random, size, maxValue) {
      for (var i = 0; i < size; i += 1) {
        values.push(randomInteger(random, 0, maxValue));
      }
      values.sort(function (a, b) {
        return a - b;
      });

      var perturbations = Math.max(1, Math.round(size / 12));
      var used = Object.create(null);
      var attempts = 0;
      while (
        attempts < perturbations * 8 &&
        Object.keys(used).length < Math.min(perturbations, size - 1)
      ) {
        var index = randomInteger(random, 0, size - 2);
        attempts += 1;
        if (used[index]) {
          continue;
        }
        used[index] = true;
        var temporary = values[index];
        values[index] = values[index + 1];
        values[index + 1] = temporary;
      }
    }

    function buildReversed(values, random, size, maxValue) {
      buildRandom(values, random, size, maxValue);
      values.sort(function (a, b) {
        return b - a;
      });
    }

    function buildFewUnique(values, random, size, maxValue) {
      var uniqueCount = Math.min(4, maxValue + 1, size);
      var palette = [];
      while (palette.length < uniqueCount) {
        var candidate = randomInteger(random, 0, maxValue);
        if (palette.indexOf(candidate) === -1) {
          palette.push(candidate);
        }
      }

      for (var i = 0; i < size; i += 1) {
        if (i < uniqueCount) {
          values.push(palette[i]);
        } else {
          values.push(palette[randomInteger(random, 0, uniqueCount - 1)]);
        }
      }
      shuffle(values, random);
    }

    function buildSawtooth(values, random, size, maxValue) {
      var minimumPeriod = Math.max(3, Math.floor(size / 8));
      var maximumPeriod = Math.max(minimumPeriod, Math.min(9, size - 1));
      var period = randomInteger(random, minimumPeriod, maximumPeriod);
      var amplitude = maxValue - randomInteger(random, 0, Math.floor(maxValue / 4));

      for (var i = 0; i < size; i += 1) {
        var phase = i % period;
        values.push(Math.round((phase / (period - 1)) * amplitude));
      }
    }

    function generateArray(params) {
      if (!params || typeof params !== 'object') {
        throw new TypeError('generateArray 需要一个参数对象。');
      }

      var size = params.size;
      var maxValue = params.maxValue;
      var distribution = params.distribution === undefined ? 'random' : params.distribution;
      var seed
        = params.seed === undefined || params.seed === null
          ? (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0
          : params.seed;

      if (!Number.isInteger(size) || size < 6 || size > 64) {
        throw new RangeError('size 必须是 6 到 64 之间的整数。');
      }
      if (!Number.isInteger(maxValue) || maxValue < 10 || maxValue > 200) {
        throw new RangeError('maxValue 必须是 10 到 200 之间的整数。');
      }
      if (DISTRIBUTIONS.indexOf(distribution) === -1) {
        throw new RangeError(
          'distribution 必须是 random、near-sorted、reversed、few-unique 或 sawtooth。',
        );
      }
      if (
        (typeof seed !== 'number' || !Number.isFinite(seed))
        && typeof seed !== 'string'
      ) {
        throw new TypeError('seed 必须是有限数字或字符串。');
      }

      var random = mulberry32(hashSeed(seed));
      var values = [];

      if (distribution === 'random') {
        buildRandom(values, random, size, maxValue);
      } else if (distribution === 'near-sorted') {
        buildNearSorted(values, random, size, maxValue);
      } else if (distribution === 'reversed') {
        buildReversed(values, random, size, maxValue);
      } else if (distribution === 'few-unique') {
        buildFewUnique(values, random, size, maxValue);
      } else {
        buildSawtooth(values, random, size, maxValue);
      }

      return {
        values: values,
        distribution: distribution,
        seed: seed,
      };
    }

    function TraceBuilder(input, metadata) {
      this.arr = input.slice();
      this.metadata = metadata;
      this.steps = [];
      this.comparisons = 0;
      this.swaps = 0;
      this.sorted = new Set();
    }

    TraceBuilder.prototype.getSortedIndices = function () {
      return Array.from(this.sorted).sort(function (a, b) {
        return a - b;
      });
    };

    TraceBuilder.prototype.snapshot = function (message, options) {
      var settings = options || {};
      if (
        !Number.isInteger(settings.line)
        || settings.line < 1
        || settings.line > this.metadata.pseudocode.length
      ) {
        throw new Error(
          '内部错误：'
            + this.metadata.id
            + ' 的步骤行号超出伪代码范围。',
        );
      }

      var step = {
        values: this.arr.slice(),
        message: message,
        comparisons: this.comparisons,
        swaps: this.swaps,
        line: settings.line,
        sorted: this.getSortedIndices(),
      };

      if (settings.compare) {
        step.compare = settings.compare.slice();
      }
      if (settings.active) {
        step.active = settings.active.slice();
      }
      if (settings.pivot !== undefined) {
        step.pivot = settings.pivot;
      }
      if (settings.counts) {
        step.counts = settings.counts.slice();
      }

      this.steps.push(step);
    };

    TraceBuilder.prototype.compare = function (i, j, line, message, options) {
      var settings = options || {};
      this.comparisons += 1;
      var snapshotOptions = Object.assign({}, settings, {
        line: line,
        compare: [i, j],
      });
      if (snapshotOptions.active === undefined) {
        snapshotOptions.active = [i, j];
      }
      this.snapshot(message, snapshotOptions);
    };

    TraceBuilder.prototype.swap = function (i, j, line, message, options) {
      if (i === j) {
        return false;
      }
      var settings = options || {};
      var temporary = this.arr[i];
      this.arr[i] = this.arr[j];
      this.arr[j] = temporary;
      this.swaps += 1;
      var snapshotOptions = Object.assign({}, settings, {
        line: line,
      });
      if (snapshotOptions.active === undefined) {
        snapshotOptions.active = [i, j];
      }
      this.snapshot(message, snapshotOptions);
      return true;
    };

    TraceBuilder.prototype.write = function (index, value, line, message, options) {
      this.arr[index] = value;
      var settings = options || {};
      var snapshotOptions = Object.assign({}, settings, {
        line: line,
      });
      if (snapshotOptions.active === undefined) {
        snapshotOptions.active = [index];
      }
      this.snapshot(message, snapshotOptions);
    };

    TraceBuilder.prototype.markSorted = function (index) {
      this.sorted.add(index);
    };

    TraceBuilder.prototype.markRangeSorted = function (from, to) {
      for (var i = from; i <= to; i += 1) {
        this.sorted.add(i);
      }
    };

    TraceBuilder.prototype.finalize = function (algorithmId) {
      for (var i = 0; i < this.arr.length; i += 1) {
        this.sorted.add(i);
      }
      this.snapshot(
        '排序完成，共比较 '
          + this.comparisons
          + ' 次，交换 '
          + this.swaps
          + ' 次。',
        { line: this.metadata.pseudocode.length },
      );

      return {
        algorithmId: algorithmId,
        steps: this.steps,
        comparisons: this.comparisons,
        swaps: this.swaps,
        final: this.arr.slice(),
      };
    };

    function runBubble(trace) {
      var values = trace.arr;
      var size = values.length;
      var lines = LINES.bubble;

      if (size <= 1) {
        return;
      }

      for (var i = 0; i < size - 1; i += 1) {
        var swapped = false;
        for (var j = 0; j < size - 1 - i; j += 1) {
          trace.compare(
            j,
            j + 1,
            lines.compare,
            '比较位置 '
              + j
              + '（'
              + values[j]
              + '）与位置 '
              + (j + 1)
              + '（'
              + values[j + 1]
              + '）。',
          );
          if (values[j] > values[j + 1]) {
            var leftValue = values[j];
            var rightValue = values[j + 1];
            trace.swap(
              j,
              j + 1,
              lines.swap,
              '左侧的 '
                + leftValue
                + ' 大于右侧的 '
                + rightValue
                + '，交换位置 '
                + j
                + ' 与 '
                + (j + 1)
                + '。',
            );
            swapped = true;
          }
        }

        trace.markSorted(size - 1 - i);
        trace.snapshot(
          '第 '
            + (i + 1)
            + ' 轮结束，位置 '
            + (size - 1 - i)
            + ' 的最大值 '
            + values[size - 1 - i]
            + ' 已就位。',
          {
            line: lines.passDone,
            active: [size - 1 - i],
          },
        );

        if (!swapped) {
          trace.markRangeSorted(0, size - 1);
          trace.snapshot('本轮没有发生交换，数组已整体有序，提前结束。', {
            line: lines.earlyExit,
            active: [],
          });
          break;
        }
      }
    }

    function runSelection(trace) {
      var values = trace.arr;
      var size = values.length;
      var lines = LINES.selection;

      if (size <= 1) {
        return;
      }

      for (var i = 0; i < size - 1; i += 1) {
        var minIndex = i;
        for (var j = i + 1; j < size; j += 1) {
          trace.compare(
            j,
            minIndex,
            lines.compare,
            '比较位置 '
              + j
              + ' 的值 '
              + values[j]
              + ' 与当前最小值 '
              + values[minIndex]
              + '（位置 '
              + minIndex
              + '）。',
          );
          if (values[j] < values[minIndex]) {
            minIndex = j;
            trace.snapshot(
              '发现更小值 '
                + values[minIndex]
                + '，最小值位置更新为 '
                + minIndex
                + '。',
              {
                line: lines.newMinimum,
                active: [minIndex],
              },
            );
          }
        }

        if (minIndex !== i) {
          var minimum = values[minIndex];
          trace.swap(
            i,
            minIndex,
            lines.swap,
            '把最小值 '
              + minimum
              + ' 从位置 '
              + minIndex
              + ' 交换到位置 '
              + i
              + '。',
          );
        }

        trace.markSorted(i);
        trace.snapshot(
          '位置 '
            + i
            + ' 的值 '
            + values[i]
            + ' 已确定为当前未排序区间的最小值。',
          {
            line: lines.markSorted,
            active: [i],
          },
        );
      }
    }

    function runInsertion(trace) {
      var values = trace.arr;
      var size = values.length;
      var lines = LINES.insertion;

      if (size <= 1) {
        return;
      }

      for (var i = 1; i < size; i += 1) {
        var j = i;
        while (j > 0) {
          trace.compare(
            j - 1,
            j,
            lines.compare,
            '比较相邻位置 '
              + (j - 1)
              + '（'
              + values[j - 1]
              + '）与位置 '
              + j
              + '（'
              + values[j]
              + '）。',
          );
          if (values[j - 1] <= values[j]) {
            break;
          }

          var movingValue = values[j];
          trace.swap(
            j - 1,
            j,
            lines.swap,
            '左侧元素较大，把 '
              + movingValue
              + ' 向前交换到位置 '
              + (j - 1)
              + '。',
          );
          j -= 1;
        }

        trace.markRangeSorted(0, i);
        trace.snapshot(
          '本轮插入完成，前缀 0..'
            + i
            + ' 保持有序。',
          {
            line: lines.markSorted,
            active: [i],
          },
        );
      }
    }

    function runShell(trace) {
      var values = trace.arr;
      var size = values.length;
      var lines = LINES.shell;

      if (size <= 1) {
        return;
      }

      for (
        var gap = Math.floor(size / 2);
        gap > 0;
        gap = Math.floor(gap / 2)
      ) {
        for (var i = gap; i < size; i += 1) {
          var j = i;
          while (j >= gap) {
            trace.compare(
              j - gap,
              j,
              lines.compare,
              '增量 '
                + gap
                + '：比较位置 '
                + (j - gap)
                + '（'
                + values[j - gap]
                + '）与位置 '
                + j
                + '（'
                + values[j]
                + '）。',
            );
            if (values[j - gap] <= values[j]) {
              break;
            }

            trace.swap(
              j - gap,
              j,
              lines.swap,
              '增量 '
                + gap
                + ' 的逆序元素，交换位置 '
                + (j - gap)
                + ' 与 '
                + j
                + '。',
            );
            j -= gap;
          }
        }

        if (gap > 1) {
          trace.snapshot(
            '当前增量 '
              + gap
              + ' 处理完毕，下一轮增量缩小为 '
              + Math.floor(gap / 2)
              + '。',
            {
              line: lines.nextGap,
              active: [],
            },
          );
        }
      }
    }

    function runMerge(trace) {
      var values = trace.arr;
      var size = values.length;
      var lines = LINES.merge;

      if (size <= 1) {
        return;
      }

      function mergeSort(left, right) {
        if (left >= right) {
          return;
        }

        var middle = left + Math.floor((right - left) / 2);
        mergeSort(left, middle);
        mergeSort(middle + 1, right);

        var leftValues = values.slice(left, middle + 1);
        var rightValues = values.slice(middle + 1, right + 1);
        var merged = [];
        var i = 0;
        var j = 0;

        while (i < leftValues.length && j < rightValues.length) {
          var takeLeft = leftValues[i] <= rightValues[j];
          trace.compare(
            left + i,
            middle + 1 + j,
            lines.compare,
            '比较左半值 '
              + leftValues[i]
              + ' 与右半值 '
              + rightValues[j]
              + '，先取'
              + (takeLeft ? '左' : '右')
              + '半的 '
              + (takeLeft ? leftValues[i] : rightValues[j])
              + ' 放入临时数组。',
          );
          if (takeLeft) {
            merged.push(leftValues[i]);
            i += 1;
          } else {
            merged.push(rightValues[j]);
            j += 1;
          }
        }

        while (i < leftValues.length) {
          merged.push(leftValues[i]);
          i += 1;
        }
        while (j < rightValues.length) {
          merged.push(rightValues[j]);
          j += 1;
        }

        if (merged.length > 0) {
          trace.snapshot(
            '区间 ['
              + left
              + '..'
              + right
              + '] 的剩余元素已加入临时数组，准备写回原数组。',
            {
              line: lines.remainder,
              active: [left, right],
            },
          );
        }

        for (var offset = 0; offset < merged.length; offset += 1) {
          trace.write(
            left + offset,
            merged[offset],
            lines.write,
            '将 '
              + merged[offset]
              + ' 写回位置 '
              + (left + offset)
              + '。',
          );
        }
      }

      mergeSort(0, size - 1);
    }

    function runQuick(trace) {
      var values = trace.arr;
      var size = values.length;
      var lines = LINES.quick;

      if (size <= 1) {
        return;
      }

      function quickSort(left, right) {
        if (left >= right) {
          if (left === right) {
            trace.markSorted(left);
          }
          return;
        }

        var pivotIndex;
        if (right - left >= 2) {
          var middle = left + Math.floor((right - left) / 2);
          var first = left;
          var median = middle;
          var last = right;

          trace.compare(
            first,
            median,
            lines.choosePivot,
            '三数取中：比较左端位置 '
              + first
              + '（'
              + values[first]
              + '）与中点位置 '
              + median
              + '（'
              + values[median]
              + '）。',
          );
          if (values[first] > values[median]) {
            var firstTemporary = first;
            first = median;
            median = firstTemporary;
          }

          trace.compare(
            median,
            last,
            lines.choosePivot,
            '三数取中：比较中点位置 '
              + median
              + '（'
              + values[median]
              + '）与右端位置 '
              + last
              + '（'
              + values[last]
              + '）。',
          );
          if (values[median] > values[last]) {
            var medianTemporary = median;
            median = last;
            last = medianTemporary;
          }

          trace.compare(
            first,
            median,
            lines.choosePivot,
            '三数取中：再次比较候选位置 '
              + first
              + '（'
              + values[first]
              + '）与 '
              + median
              + '（'
              + values[median]
              + '）。',
          );
          if (values[first] > values[median]) {
            var secondTemporary = first;
            first = median;
            median = secondTemporary;
          }

          pivotIndex = median;
          trace.snapshot(
            '三数取中选出枢轴值 '
              + values[pivotIndex]
              + '（位置 '
              + pivotIndex
              + '）。',
            {
              line: lines.choosePivot,
              active: [left, middle, right],
              pivot: pivotIndex,
            },
          );
        } else {
          pivotIndex = right;
        }

        if (pivotIndex !== right) {
          var pivotToMove = values[pivotIndex];
          trace.swap(
            pivotIndex,
            right,
            lines.movePivot,
            '把枢轴值 '
              + pivotToMove
              + ' 交换到区间右端位置 '
              + right
              + '。',
            { pivot: right },
          );
        }

        var pivotValue = values[right];
        var store = left;

        for (var i = left; i < right; i += 1) {
          trace.compare(
            i,
            right,
            lines.compare,
            '比较位置 '
              + i
              + ' 的值 '
              + values[i]
              + ' 与枢轴值 '
              + pivotValue
              + '。',
            { pivot: right },
          );
          if (values[i] < pivotValue) {
            if (store !== i) {
              var smallerValue = values[i];
              trace.swap(
                store,
                i,
                lines.partitionSwap,
                '值 '
                  + smallerValue
                  + ' 小于枢轴，交换到位置 '
                  + store
                  + '。',
                { pivot: right },
              );
            }
            store += 1;
          }
        }

        if (store !== right) {
          trace.swap(
            store,
            right,
            lines.placePivot,
            '将枢轴值 '
              + pivotValue
              + ' 交换到最终位置 '
              + store
              + '。',
            { pivot: store },
          );
        }

        trace.markSorted(store);
        trace.snapshot(
          '枢轴值 '
            + pivotValue
            + ' 已固定在位置 '
            + store
            + '，继续递归处理左右子区间。',
          {
            line: lines.placePivot,
            active: [store],
            pivot: store,
          },
        );

        quickSort(left, store - 1);
        quickSort(store + 1, right);
      }

      quickSort(0, size - 1);
    }

    function runHeap(trace) {
      var values = trace.arr;
      var size = values.length;
      var lines = LINES.heap;

      if (size <= 1) {
        return;
      }

      function siftDown(start, end) {
        var parent = start;
        while (parent * 2 + 1 < end) {
          var child = parent * 2 + 1;

          if (child + 1 < end) {
            var rightIsLarger = values[child + 1] > values[child];
            trace.compare(
              child,
              child + 1,
              lines.chooseChild,
              '比较子节点位置 '
                + child
                + '（'
                + values[child]
                + '）与位置 '
                + (child + 1)
                + '（'
                + values[child + 1]
                + '），选择'
                + (rightIsLarger ? '右' : '左')
                + '子节点作为较大子节点。',
            );
            if (rightIsLarger) {
              child += 1;
            }
          }

          trace.compare(
            parent,
            child,
            lines.compare,
            '比较父节点位置 '
              + parent
              + '（'
              + values[parent]
              + '）与较大子节点位置 '
              + child
              + '（'
              + values[child]
              + '）。',
          );
          if (values[parent] >= values[child]) {
            break;
          }

          trace.swap(
            parent,
            child,
            lines.swap,
            '父节点较小，交换位置 '
              + parent
              + ' 与 '
              + child
              + '，继续向下调整。',
          );
          parent = child;
        }
      }

      for (var i = Math.floor(size / 2) - 1; i >= 0; i -= 1) {
        siftDown(i, size);
      }

      trace.snapshot('最大堆构建完成，最大值位于堆顶位置 0。', {
        line: lines.initial,
        active: [0],
      });

      for (var end = size - 1; end > 0; end -= 1) {
        var maximum = values[0];
        trace.swap(
          0,
          end,
          lines.extract,
          '交换堆顶的最大值 '
            + maximum
            + ' 与位置 '
            + end
            + '，将最大值放到末尾。',
        );
        trace.markSorted(end);
        trace.snapshot(
          '位置 '
            + end
            + ' 的值 '
            + values[end]
            + ' 已有序，继续调整剩余堆 [0..'
            + (end - 1)
            + ']。',
          {
            line: lines.markSorted,
            active: [end],
          },
        );
        siftDown(0, end);
      }
    }

    function runCounting(trace) {
      var values = trace.arr;
      var size = values.length;
      var lines = LINES.counting;

      if (size === 0) {
        return;
      }

      var maximum = values[0];
      var maximumIndex = 0;
      for (var i = 1; i < size; i += 1) {
        if (values[i] > maximum) {
          maximum = values[i];
          maximumIndex = i;
        }
      }

      trace.snapshot(
        '数组最大值为 '
          + maximum
          + '，位于位置 '
          + maximumIndex
          + '。',
        {
          line: lines.findMax,
          active: [maximumIndex],
        },
      );

      var counts = new Array(maximum + 1).fill(0);
      trace.snapshot(
        '创建长度为 '
          + counts.length
          + ' 的计数数组，并全部初始化为 0。',
        {
          line: lines.initialiseCounts,
          active: [],
          counts: counts,
        },
      );

      for (var valueIndex = 0; valueIndex < size; valueIndex += 1) {
        var value = values[valueIndex];
        counts[value] += 1;
        trace.snapshot(
          '统计值 '
            + value
            + '，counts['
            + value
            + '] = '
            + counts[value]
            + '。',
          {
            line: lines.count,
            active: [valueIndex],
            counts: counts,
          },
        );
      }

      for (var countIndex = 1; countIndex < counts.length; countIndex += 1) {
        counts[countIndex] += counts[countIndex - 1];
      }
      trace.snapshot('计数数组已转换为前缀和，用于确定每个值的输出位置。', {
        line: lines.prefix,
        active: [],
        counts: counts,
      });

      var output = new Array(size);
      for (var source = size - 1; source >= 0; source -= 1) {
        var currentValue = values[source];
        counts[currentValue] -= 1;
        var outputIndex = counts[currentValue];
        output[outputIndex] = currentValue;
        trace.snapshot(
          '从后向前读取位置 '
            + source
            + ' 的值 '
            + currentValue
            + '，稳定地放入输出位置 '
            + outputIndex
            + '。',
          {
            line: lines.place,
            active: [source, outputIndex],
            counts: counts,
          },
        );
      }

      for (var copyIndex = 0; copyIndex < size; copyIndex += 1) {
        trace.write(
          copyIndex,
          output[copyIndex],
          lines.copyBack,
          '将输出数组位置 '
            + copyIndex
            + ' 的值 '
            + output[copyIndex]
            + ' 复制回原数组。',
          { counts: counts },
        );
      }
    }

    var RUNNERS = {
      bubble: runBubble,
      selection: runSelection,
      insertion: runInsertion,
      shell: runShell,
      merge: runMerge,
      quick: runQuick,
      heap: runHeap,
      counting: runCounting,
    };

    function createTrace(algorithmId, values) {
      var algorithm = ALGORITHM_BY_ID[algorithmId];
      if (!algorithm) {
        throw new RangeError('未知排序算法：' + algorithmId + '。');
      }
      if (!Array.isArray(values)) {
        throw new TypeError('values 必须是数字数组。');
      }

      for (var index = 0; index < values.length; index += 1) {
        if (typeof values[index] !== 'number' || !Number.isFinite(values[index])) {
          throw new TypeError('values 只能包含有限数字。');
        }
      }

      if (algorithmId === 'counting') {
        for (var countValueIndex = 0; countValueIndex < values.length; countValueIndex += 1) {
          if (!Number.isInteger(values[countValueIndex]) || values[countValueIndex] < 0) {
            throw new RangeError('计数排序只支持非负整数数组。');
          }
        }
      }

      var input = values.slice();
      var trace = new TraceBuilder(input, algorithm);
      trace.snapshot(
        input.length === 0
          ? '初始数组为空，开始' + algorithm.name + '。'
          : '初始数组共有 '
              + input.length
              + ' 个元素，开始'
              + algorithm.name
              + '。',
        { line: LINES[algorithmId].initial },
      );

      RUNNERS[algorithmId](trace);
      return trace.finalize(algorithmId);
    }

    return {
      ALGORITHMS: ALGORITHMS,
      generateArray: generateArray,
      createTrace: createTrace,
    };
  },
);
