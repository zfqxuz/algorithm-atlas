/*
 * Advanced algorithm engine for the educational visualizer.
 *
 * Four dependency-free implementations exposed as `window.AdvancedEngine`
 * in a browser and as a CommonJS module in Node:
 *   - LCS          longest common subsequence (dynamic programming)
 *   - KMP          prefix function + substring search
 *   - Convex Hull  Andrew's monotone chain
 *   - PageRank     power iteration on a directed graph
 *
 * Every solver returns deterministic snapshots / traces so a UI can render
 * the algorithm one step at a time without re-running it.  Input generators
 * use a seeded mulberry32 PRNG and clamp their parameters to safe ranges.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.AdvancedEngine = api;
    // A page may be exercised inside a VM whose global object is not `window`.
    if (root.window && root.window !== root) root.window.AdvancedEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_SEED = 20240601;
  const DEFAULT_ALPHABET = 'ABCD';

  /* ------------------------------------------------------------------ */
  /* Shared helpers                                                      */
  /* ------------------------------------------------------------------ */

  function optionsOf(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function isSequence(value) {
    return typeof value === 'string' || Array.isArray(value);
  }

  function toClampedInteger(value, fallback, min, max) {
    if (value === undefined || value === null || value === '') return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(number)));
  }

  function toClampedNumber(value, fallback, min, max) {
    if (value === undefined || value === null || value === '') return fallback;
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function normalizeSeed(seed) {
    if (typeof seed === 'string' && seed.length > 0) {
      // FNV-1a keeps string seeds reproducible too.
      let hash = 2166136261;
      for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    }
    if (typeof seed === 'number' && Number.isFinite(seed)) {
      return Math.trunc(seed) >>> 0;
    }
    return DEFAULT_SEED;
  }

  function createRng(seed) {
    let state = normalizeSeed(seed);
    return function next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomInt(rng, min, max) {
    if (max <= min) return min;
    return min + Math.floor(rng() * (max - min + 1));
  }

  function pickSymbol(rng, alphabet) {
    return alphabet[Math.floor(rng() * alphabet.length)];
  }

  function normalizeAlphabet(alphabet) {
    let source = null;
    if (typeof alphabet === 'string') source = Array.from(alphabet);
    else if (Array.isArray(alphabet)) source = alphabet;

    const symbols = [];
    if (source) {
      for (const entry of source) {
        if (entry === undefined || entry === null) continue;
        const text = String(entry);
        if (text.length === 0) continue;
        const symbol = Array.from(text)[0];
        if (!symbols.includes(symbol)) symbols.push(symbol);
      }
    }
    if (symbols.length === 0) return Array.from(DEFAULT_ALPHABET);
    return symbols;
  }

  function randomSymbols(rng, alphabet, length) {
    const symbols = [];
    for (let index = 0; index < length; index += 1) {
      symbols.push(pickSymbol(rng, alphabet));
    }
    return symbols;
  }

  function readNodeId(node) {
    if (typeof node === 'string' && node.length > 0) return node;
    if (node && typeof node === 'object' && typeof node.id === 'string' && node.id.length > 0) {
      return node.id;
    }
    return null;
  }

  function defaultNodeId(index) {
    if (index < 26) return String.fromCharCode(65 + index);
    return `V${index + 1}`;
  }

  function copyPoint(point) {
    return { x: point.x, y: point.y };
  }

  function roundCoordinate(value) {
    return Math.round(Math.min(1000, Math.max(0, value)) * 100) / 100;
  }

  /* ------------------------------------------------------------------ */
  /* Pseudocode metadata (1-based line numbers are used by every step)   */
  /* ------------------------------------------------------------------ */

  const PSEUDOCODE = {
    lcs: [
      'function lcs(a, b):',
      '  m = length(a); n = length(b)',
      '  table = (m + 1) x (n + 1) matrix filled with 0',
      '  for i = 1 to m:',
      '    for j = 1 to n:',
      '      if a[i - 1] == b[j - 1]:',
      '        table[i][j] = table[i - 1][j - 1] + 1',
      '      else:',
      '        table[i][j] = max(table[i - 1][j], table[i][j - 1])',
      '  path = []',
      '  i = m; j = n',
      '  while i > 0 and j > 0:',
      '    if a[i - 1] == b[j - 1]:',
      '      path.push([i, j]); i = i - 1; j = j - 1',
      '    else if table[i - 1][j] >= table[i][j - 1]:',
      '      i = i - 1',
      '    else:',
      '      j = j - 1',
      '  return { length: table[m][n], path: reverse(path) }',
    ],
    kmp: [
      'function buildPrefix(pattern):',
      '  prefix = array of length(pattern) filled with 0',
      '  k = 0',
      '  for i = 1 to length(pattern) - 1:',
      '    while k > 0 and pattern[i] != pattern[k]:',
      '      k = prefix[k - 1]',
      '    if pattern[i] == pattern[k]:',
      '      k = k + 1',
      '    prefix[i] = k',
      '  return prefix',
      'function kmp(text, pattern):',
      '  prefix = buildPrefix(pattern)',
      '  matches = []',
      '  k = 0',
      '  for i = 0 to length(text) - 1:',
      '    while k > 0 and text[i] != pattern[k]:',
      '      k = prefix[k - 1]',
      '    if text[i] == pattern[k]:',
      '      k = k + 1',
      '    if k == length(pattern):',
      '      matches.push(i - length(pattern) + 1)',
      '      k = prefix[k - 1]',
      '  return matches',
    ],
    hull: [
      'function convexHull(points):',
      '  unique = sort(removeDuplicates(points), by x then y)',
      '  if length(unique) <= 2: return unique',
      '  lower = []',
      '  for each p in unique:',
      '    while length(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:',
      '      lower.pop()',
      '    lower.push(p)',
      '  upper = []',
      '  for each p in reverse(unique):',
      '    while length(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:',
      '      upper.pop()',
      '    upper.push(p)',
      '  hull = lower[0..-2] + upper[0..-2]',
      '  return hull',
    ],
    pagerank: [
      'function pagerank(nodes, edges, d = 0.85, tolerance = 1e-6, maxIterations = 100):',
      '  scores = { every node: 1 / n }',
      '  dangling = nodes with outdegree 0',
      '  repeat up to maxIterations:',
      '    next = { every node: (1 - d) / n }',
      '    for each node u:',
      '      for each outgoing edge u -> v:',
      '        next[v] += d * scores[u] / outdegree(u)',
      '    danglingMass = sum(scores[u] for u in dangling)',
      '    for each node v:',
      '      next[v] += d * danglingMass / n',
      '    delta = sum(abs(next[v] - scores[v]))',
      '    scores = next',
      '    if delta <= tolerance: converged = true; break',
      '  return { scores, converged }',
    ],
  };

  const ALGORITHMS = [
    {
      id: 'lcs',
      name: '最长公共子序列',
      en: 'Longest Common Subsequence',
      level: 'L2',
      description:
        '用二维状态表刻画两个序列前缀的最优子结构，再回溯得到一条最长公共子序列。',
      time: 'O(nm)',
      space: 'O(nm)',
      pseudocode: PSEUDOCODE.lcs,
    },
    {
      id: 'kmp',
      name: 'KMP 字符串匹配',
      en: 'Knuth–Morris–Pratt',
      level: 'L3',
      description:
        '先构造模式串的前缀函数，再让文本指针单向前进，在不回退文本指针的情况下完成线性时间匹配。',
      time: 'O(n + m)',
      space: 'O(m)',
      pseudocode: PSEUDOCODE.kmp,
    },
    {
      id: 'hull',
      name: '凸包（Andrew）',
      en: 'Convex Hull',
      level: 'L3',
      description:
        '按坐标排序后用 Andrew 单调链维护下凸包与上凸包，叉积判断转向并剔除共线点。',
      time: 'O(n log n)',
      space: 'O(n)',
      pseudocode: PSEUDOCODE.hull,
    },
    {
      id: 'pagerank',
      name: 'PageRank',
      en: 'PageRank',
      level: 'L4',
      description:
        '把有向图上的随机游走写成幂迭代，悬挂节点质量均匀再分配，收敛后得到节点重要性排名。',
      time: 'O(iter · (V + E))',
      space: 'O(V + E)',
      pseudocode: PSEUDOCODE.pagerank,
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Seeded input generators                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Generate two strings over `alphabet` for LCS.
   * lengthA / lengthB are clamped to 0..120.
   */
  function generateLcsInput(options) {
    const opts = optionsOf(options);
    const lengthA = toClampedInteger(opts.lengthA, 8, 0, 120);
    const lengthB = toClampedInteger(opts.lengthB, 8, 0, 120);
    const alphabet = normalizeAlphabet(opts.alphabet);
    const rng = createRng(opts.seed);

    return {
      a: randomSymbols(rng, alphabet, lengthA).join(''),
      b: randomSymbols(rng, alphabet, lengthB).join(''),
    };
  }

  /**
   * Generate a text and a pattern for KMP.  `plantedMatches` positions are
   * filled with the pattern in non-overlapping slots, guaranteeing at least
   * that many real matches (random text can of course add more).
   */
  function generateKmpInput(options) {
    const opts = optionsOf(options);
    const textLength = toClampedInteger(opts.textLength, 40, 0, 5000);
    const patternLength = toClampedInteger(
      opts.patternLength,
      Math.min(5, textLength),
      0,
      Math.min(64, textLength)
    );
    const alphabet = normalizeAlphabet(opts.alphabet);
    const rng = createRng(opts.seed);

    const pattern = randomSymbols(rng, alphabet, patternLength);
    const text = randomSymbols(rng, alphabet, textLength);

    const capacity = patternLength === 0 ? 0 : Math.floor(textLength / patternLength);
    const planted = toClampedInteger(opts.plantedMatches, Math.min(2, capacity), 0, capacity);

    if (planted > 0) {
      const blockSize = Math.floor(textLength / planted);
      for (let slot = 0; slot < planted; slot += 1) {
        const offset = randomInt(rng, 0, blockSize - patternLength);
        const start = slot * blockSize + offset;
        for (let index = 0; index < patternLength; index += 1) {
          text[start + index] = pattern[index];
        }
      }
    }

    return { text: text.join(''), pattern: pattern.join('') };
  }

  /**
   * Generate points in the 0..1000 box.  `spread` controls the overall
   * extent; `shape` is one of random / circle / clusters.
   */
  function generateHullInput(options) {
    const opts = optionsOf(options);
    const count = toClampedInteger(opts.count, 24, 1, 500);
    const spread = toClampedNumber(opts.spread, 900, 0, 1000);
    const requestedShape = typeof opts.shape === 'string' ? opts.shape.toLowerCase() : '';
    const shape = ['random', 'circle', 'clusters'].includes(requestedShape)
      ? requestedShape
      : 'random';
    const rng = createRng(opts.seed);
    const points = [];

    if (shape === 'circle') {
      const radius = spread / 2;
      const startAngle = rng() * Math.PI * 2;
      for (let index = 0; index < count; index += 1) {
        const angle = startAngle + (Math.PI * 2 * index) / count;
        points.push({
          x: roundCoordinate(500 + Math.cos(angle) * radius),
          y: roundCoordinate(500 + Math.sin(angle) * radius),
        });
      }
    } else if (shape === 'clusters') {
      const clusterCount = Math.min(3, count);
      const centers = [];
      for (let index = 0; index < clusterCount; index += 1) {
        centers.push({
          x: 500 + (rng() * 2 - 1) * spread * 0.3,
          y: 500 + (rng() * 2 - 1) * spread * 0.3,
        });
      }
      const clusterRadius = Math.max(2, spread * 0.1);
      for (let index = 0; index < count; index += 1) {
        const center = centers[index % clusterCount];
        const angle = rng() * Math.PI * 2;
        const radius = clusterRadius * Math.sqrt(rng());
        points.push({
          x: roundCoordinate(center.x + Math.cos(angle) * radius),
          y: roundCoordinate(center.y + Math.sin(angle) * radius),
        });
      }
    } else {
      for (let index = 0; index < count; index += 1) {
        points.push({
          x: roundCoordinate(500 + (rng() * 2 - 1) * (spread / 2)),
          y: roundCoordinate(500 + (rng() * 2 - 1) * (spread / 2)),
        });
      }
    }

    return { points };
  }

  /**
   * Generate a directed graph with at least 2 nodes, no self-loops, unique
   * directed edges and at least one outgoing edge for every node.
   */
  function generatePagerankInput(options) {
    const opts = optionsOf(options);
    const edgeProbability = toClampedNumber(opts.edgeProbability, 0.25, 0, 1);
    const rng = createRng(opts.seed);

    let ids = [];
    if (Array.isArray(opts.nodes)) {
      const seen = new Set();
      for (let index = 0; index < opts.nodes.length && ids.length < 300; index += 1) {
        const raw = opts.nodes[index];
        const id = readNodeId(raw) || `N${index + 1}`;
        if (seen.has(id)) throw new RangeError(`Duplicate node id: ${id}`);
        seen.add(id);
        ids.push(id);
      }
      if (ids.length < 2) {
        throw new RangeError('PageRank generation needs at least two nodes.');
      }
    } else {
      const count = toClampedInteger(opts.nodes, 8, 2, 300);
      ids = Array.from({ length: count }, (_, index) => defaultNodeId(index));
    }

    const outgoing = ids.map(() => false);
    const edges = [];
    for (let from = 0; from < ids.length; from += 1) {
      for (let to = 0; to < ids.length; to += 1) {
        if (from === to) continue;
        if (rng() >= edgeProbability) continue;
        edges.push({ from: ids[from], to: ids[to] });
        outgoing[from] = true;
      }
    }

    // Guarantee the generator invariant without ever creating a self-loop.
    for (let index = 0; index < ids.length; index += 1) {
      if (outgoing[index]) continue;
      const target = (index + 1) % ids.length;
      edges.push({ from: ids[index], to: ids[target] });
      outgoing[index] = true;
    }

    return { nodes: ids.slice(), edges };
  }

  /* ------------------------------------------------------------------ */
  /* LCS                                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * @param {{a: string|Array, b: string|Array}} input
   * @returns {{
   *   table: number[][],
   *   steps: Array<{row:number,col:number,line:number,message:string,
   *                 phase:string,type:string,changes:Array,value?:number}>,
   *   path: number[][],
   *   lcs: string|Array,
   *   length: number
   * }}
   *
   * `steps[i].row/col` and `path` use table coordinates: row 0 / column 0
   * are the empty-prefix borders, so a matched cell (i, j) consumes
   * a[i - 1] and b[j - 1].  `changes` is an incremental sparse snapshot that
   * keeps the trace memory linear in the table size.
   */
  function solveLcs(input) {
    const options = input || {};
    const a = options.a;
    const b = options.b;
    if (!isSequence(a) || !isSequence(b)) {
      throw new TypeError('solveLcs expects { a, b } where both are strings or arrays.');
    }

    const m = a.length;
    const n = b.length;
    const table = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    const steps = [
      {
        row: 0,
        col: 0,
        line: 3,
        phase: 'init',
        type: 'init',
        message: `建立 (${m + 1}) × (${n + 1}) 的动态规划表，边界初始化为 0`,
        changes: [],
      },
    ];

    for (let row = 1; row <= m; row += 1) {
      for (let col = 1; col <= n; col += 1) {
        let value;
        let line;
        let type;
        let message;
        if (a[row - 1] === b[col - 1]) {
          value = table[row - 1][col - 1] + 1;
          line = 7;
          type = 'match';
          message = `a[${row - 1}] = b[${col - 1}] = ${String(a[row - 1])}，取左上角 + 1`;
        } else {
          const up = table[row - 1][col];
          const left = table[row][col - 1];
          value = Math.max(up, left);
          line = 9;
          type = 'skip';
          message = `a[${row - 1}] ≠ b[${col - 1}]，取上侧 ${up} 与左侧 ${left} 的较大值`;
        }

        table[row][col] = value;
        steps.push({
          row,
          col,
          line,
          phase: 'fill',
          type,
          message,
          value,
          changes: [{ row, col, value }],
        });
      }
    }

    let row = m;
    let col = n;
    const path = [];
    while (row > 0 && col > 0) {
      if (a[row - 1] === b[col - 1]) {
        path.push([row, col]);
        row -= 1;
        col -= 1;
      } else if (table[row - 1][col] >= table[row][col - 1]) {
        row -= 1;
      } else {
        col -= 1;
      }
    }
    path.reverse();

    const symbols = path.map(([pathRow, pathCol]) => a[pathRow - 1]);
    const lcs = typeof a === 'string' && typeof b === 'string' ? symbols.join('') : symbols;
    const length = table[m][n];

    steps.push({
      row: m,
      col: n,
      line: 19,
      phase: 'done',
      type: 'done',
      message: `最长公共子序列长度为 ${length}`,
      value: length,
      path: path.map((cell) => cell.slice()),
      changes: [],
    });

    return { table, steps, path, lcs, length };
  }

  /* ------------------------------------------------------------------ */
  /* KMP                                                                 */
  /* ------------------------------------------------------------------ */

  function buildPrefixTrace(pattern) {
    const length = pattern.length;
    const prefix = new Array(length).fill(0);
    const prefixSteps = [];

    if (length === 0) return { prefix, prefixSteps };

    prefixSteps.push({
      phase: 'prefix',
      patternIndex: 0,
      line: 2,
      message: '初始化前缀函数数组为 0',
      k: 0,
      changes: [],
    });

    let k = 0;
    for (let index = 1; index < length; index += 1) {
      while (k > 0 && pattern[index] !== pattern[k]) {
        const from = k;
        k = prefix[k - 1];
        prefixSteps.push({
          phase: 'prefix',
          patternIndex: index,
          line: 6,
          message: `pattern[${index}] 与 pattern[${from}] 失配，回退到 ${k}`,
          k,
          kBefore: from,
          changes: [],
        });
      }
      if (pattern[index] === pattern[k]) {
        k += 1;
        prefixSteps.push({
          phase: 'prefix',
          patternIndex: index,
          line: 8,
          message: `pattern[${index}] 与前缀末尾匹配，k 增加到 ${k}`,
          k,
          changes: [],
        });
      }
      prefix[index] = k;
      prefixSteps.push({
        phase: 'prefix',
        patternIndex: index,
        line: 9,
        message: `prefix[${index}] = ${k}`,
        k,
        value: k,
        changes: [{ index, value: k }],
      });
    }

    prefixSteps.push({
      phase: 'prefix-done',
      patternIndex: length - 1,
      line: 10,
      message: '前缀函数构造完成',
      k,
      changes: [],
      prefix: prefix.slice(),
    });

    return { prefix, prefixSteps };
  }

  /**
   * @param {{text: string|Array, pattern: string|Array}} input
   * @returns {{
   *   prefix: number[],
   *   steps: Array<{textIndex:number,patternIndex:number,line:number,
   *                 message:string,match:boolean}>,
   *   matches: number[],
   *   prefixTable: number[],
   *   prefixSteps: Array<object>
   * }}
   *
   * `steps` traces only the scanning phase and therefore every step has an
   * integer text index.  The optional `prefixSteps` trace documents how the
   * prefix table itself was built.  An empty pattern yields no matches.
   */
  function solveKmp(input) {
    const options = input || {};
    const text = options.text;
    const pattern = options.pattern;
    if (!isSequence(text) || !isSequence(pattern)) {
      throw new TypeError('solveKmp expects { text, pattern } where both are strings or arrays.');
    }

    const { prefix, prefixSteps } = buildPrefixTrace(pattern);
    const patternLength = pattern.length;
    const steps = [];
    const matches = [];

    if (patternLength === 0) {
      return {
        prefix,
        steps,
        matches,
        prefixTable: prefix.slice(),
        prefixSteps,
      };
    }

    let k = 0;
    for (let textIndex = 0; textIndex < text.length; textIndex += 1) {
      while (k > 0 && text[textIndex] !== pattern[k]) {
        const from = k;
        k = prefix[k - 1];
        steps.push({
          textIndex,
          patternIndex: from,
          line: 17,
          phase: 'fallback',
          message: `text[${textIndex}] 与 pattern[${from}] 失配，回退到 ${k}`,
          match: false,
          k,
        });
      }

      if (text[textIndex] === pattern[k]) {
        steps.push({
          textIndex,
          patternIndex: k,
          line: 18,
          phase: 'compare',
          message: `text[${textIndex}] 匹配 pattern[${k}]`,
          match: false,
          accepted: true,
        });
        k += 1;
      } else {
        steps.push({
          textIndex,
          patternIndex: 0,
          line: 18,
          phase: 'compare',
          message: `text[${textIndex}] 与 pattern[0] 失配，文本指针继续前进`,
          match: false,
          accepted: false,
        });
      }

      if (k === patternLength) {
        const start = textIndex - patternLength + 1;
        matches.push(start);
        steps.push({
          textIndex,
          patternIndex: patternLength - 1,
          line: 21,
          phase: 'match',
          message: `在起始位置 ${start} 找到完整匹配`,
          match: true,
          start,
        });
        k = prefix[k - 1];
        steps.push({
          textIndex,
          patternIndex: k,
          line: 22,
          phase: 'fallback',
          message: `匹配后利用前缀函数回退到 ${k}，继续搜索`,
          match: false,
          k,
        });
      }
    }

    return {
      prefix,
      steps,
      matches,
      prefixTable: prefix.slice(),
      prefixSteps,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Convex hull (Andrew's monotone chain)                               */
  /* ------------------------------------------------------------------ */

  function crossProduct(origin, first, second) {
    return (
      (first.x - origin.x) * (second.y - origin.y) -
      (first.y - origin.y) * (second.x - origin.x)
    );
  }

  function normalizePoints(points) {
    if (!Array.isArray(points)) {
      throw new TypeError('solveHull expects { points: [{ x, y }, ...] }.');
    }
    const normalized = [];
    for (const point of points) {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        throw new TypeError('Every hull point needs finite numeric x and y coordinates.');
      }
      normalized.push({ x: point.x, y: point.y });
    }
    return normalized;
  }

  function sortUniquePoints(points) {
    const seen = new Set();
    const unique = [];
    for (const point of points) {
      const key = `${point.x},${point.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({ x: point.x, y: point.y });
    }
    unique.sort((first, second) => first.x - second.x || first.y - second.y);
    return unique;
  }

  /**
   * @param {{points: Array<{x:number,y:number}>}} input
   * @returns {{
   *   hull: Array<{x:number,y:number}>,
   *   lower: Array<{x:number,y:number}>,
   *   upper: Array<{x:number,y:number}>,
   *   steps: Array<{kind:string,index:number,line:number,message:string,
   *                 stack:Array<{x:number,y:number}>, discarded?:object}>
   * }}
   *
   * Duplicate points are removed and collinear boundary points are discarded,
   * so every vertex of a non-degenerate hull is an extreme point.  The hull
   * starts at the lexicographically smallest point and runs counter-clockwise.
   */
  function solveHull(input) {
    const source = Array.isArray(input) ? input : input && input.points;
    const points = normalizePoints(source);
    const unique = sortUniquePoints(points);
    const steps = [
      {
        kind: 'init',
        index: 0,
        line: 2,
        message: `去重并排序后得到 ${unique.length} 个候选点`,
        stack: [],
      },
    ];

    if (unique.length <= 2) {
      const hull = unique.map(copyPoint);
      steps.push({
        kind: 'degenerate',
        index: unique.length === 0 ? 0 : unique.length - 1,
        line: 3,
        message: unique.length === 0 ? '没有输入点，凸包为空' : '点数不足 3 个，直接返回排序后的点',
        stack: hull.map(copyPoint),
        hull: hull.map(copyPoint),
      });
      return { hull, lower: [], upper: [], steps };
    }

    const lower = [];
    for (let index = 0; index < unique.length; index += 1) {
      const point = unique[index];
      while (
        lower.length >= 2 &&
        crossProduct(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
      ) {
        const discarded = lower.pop();
        steps.push({
          kind: 'lower-pop',
          index,
          line: 7,
          message: `下凸包发现非左转，弹出 (${discarded.x}, ${discarded.y})`,
          stack: lower.map(copyPoint),
          discarded: copyPoint(discarded),
          point: copyPoint(point),
        });
      }
      lower.push(point);
      steps.push({
        kind: 'lower-push',
        index,
        line: 8,
        message: `将 (${point.x}, ${point.y}) 压入下凸包`,
        stack: lower.map(copyPoint),
        point: copyPoint(point),
      });
    }

    const upper = [];
    for (let index = unique.length - 1; index >= 0; index -= 1) {
      const point = unique[index];
      while (
        upper.length >= 2 &&
        crossProduct(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
      ) {
        const discarded = upper.pop();
        steps.push({
          kind: 'upper-pop',
          index,
          line: 12,
          message: `上凸包发现非左转，弹出 (${discarded.x}, ${discarded.y})`,
          stack: upper.map(copyPoint),
          discarded: copyPoint(discarded),
          point: copyPoint(point),
        });
      }
      upper.push(point);
      steps.push({
        kind: 'upper-push',
        index,
        line: 13,
        message: `将 (${point.x}, ${point.y}) 压入上凸包`,
        stack: upper.map(copyPoint),
        point: copyPoint(point),
      });
    }

    const hull = lower.slice(0, -1).concat(upper.slice(0, -1)).map(copyPoint);
    steps.push({
      kind: 'done',
      index: unique.length - 1,
      line: 14,
      message: `合并上下凸包，得到 ${hull.length} 个极点`,
      stack: hull.map(copyPoint),
      hull: hull.map(copyPoint),
    });

    return {
      hull,
      lower: lower.map(copyPoint),
      upper: upper.map(copyPoint),
      steps,
    };
  }

  /* ------------------------------------------------------------------ */
  /* PageRank                                                            */
  /* ------------------------------------------------------------------ */

  function preparePagerankGraph(graph) {
    if (!graph || typeof graph !== 'object') {
      throw new TypeError('solvePagerank expects { nodes, edges }.');
    }
    if (!Array.isArray(graph.nodes)) {
      throw new TypeError('PageRank graph.nodes must be an array.');
    }
    if (!Array.isArray(graph.edges)) {
      throw new TypeError('PageRank graph.edges must be an array.');
    }

    const ids = [];
    const indexById = new Map();
    for (const node of graph.nodes) {
      const id = readNodeId(node);
      if (id === null) {
        throw new TypeError('Every PageRank node needs a non-empty string id.');
      }
      if (indexById.has(id)) throw new RangeError(`Duplicate node id: ${id}`);
      indexById.set(id, ids.length);
      ids.push(id);
    }

    const adjacency = ids.map(() => new Set());
    for (const edge of graph.edges) {
      if (!edge || typeof edge !== 'object') {
        throw new TypeError('Every PageRank edge must be an object with from/to ids.');
      }
      const from = indexById.get(edge.from);
      const to = indexById.get(edge.to);
      if (from === undefined || to === undefined) {
        throw new RangeError(`Unknown PageRank edge endpoint: ${edge.from} -> ${edge.to}`);
      }
      // Parallel edges are collapsed: the stochastic matrix gets one entry
      // per (source, target) pair.
      adjacency[from].add(to);
    }

    return {
      ids,
      adjacency: adjacency.map((targets) => Array.from(targets)),
    };
  }

  function scoresToObject(scores, ids) {
    const entries = [];
    for (let index = 0; index < ids.length; index += 1) {
      entries.push([ids[index], scores[index]]);
    }
    return Object.fromEntries(entries);
  }

  /**
   * @param {{nodes: Array<string|{id:string}>, edges: Array<{from:string,to:string}>}} graph
   * @param {{damping?:number, iterations?:number, tolerance?:number}} options
   * @returns {{
   *   iterations: Array<{scores: Record<string, number>, delta: number}>,
   *   scores: Record<string, number>,
   *   order: Array<{id:string, score:number}>,
   *   converged: boolean,
   *   danglingNodes: string[]
   * }}
   *
   * The iteration history starts after the uniform initial vector.  Each
   * update uses the normalized stochastic matrix:
   *   (1 - d) / n  +  d * (link mass + dangling mass / n).
   */
  function solvePagerank(graph, options) {
    const { ids, adjacency } = preparePagerankGraph(graph);
    const opts = optionsOf(options);
    const damping = toClampedNumber(opts.damping, 0.85, 0, 1);
    const maxIterations = toClampedInteger(opts.iterations, 100, 1, 5000);
    const tolerance = toClampedNumber(opts.tolerance, 1e-6, 0, 1);
    const nodeCount = ids.length;

    if (nodeCount === 0) {
      return {
        iterations: [],
        scores: {},
        order: [],
        converged: true,
        danglingNodes: [],
      };
    }

    const danglingNodes = [];
    for (let index = 0; index < nodeCount; index += 1) {
      if (adjacency[index].length === 0) danglingNodes.push(ids[index]);
    }

    let scores = new Float64Array(nodeCount).fill(1 / nodeCount);
    const iterations = [];
    let converged = false;

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const teleport = (1 - damping) / nodeCount;
      const next = new Float64Array(nodeCount).fill(teleport);

      let danglingMass = 0;
      for (let index = 0; index < nodeCount; index += 1) {
        if (adjacency[index].length === 0) danglingMass += scores[index];
      }
      if (danglingMass > 0) {
        const share = (damping * danglingMass) / nodeCount;
        for (let index = 0; index < nodeCount; index += 1) next[index] += share;
      }

      for (let from = 0; from < nodeCount; from += 1) {
        const targets = adjacency[from];
        if (targets.length === 0) continue;
        const share = (damping * scores[from]) / targets.length;
        for (const to of targets) next[to] += share;
      }

      let delta = 0;
      for (let index = 0; index < nodeCount; index += 1) {
        delta += Math.abs(next[index] - scores[index]);
      }

      scores = next;
      iterations.push({ scores: scoresToObject(scores, ids), delta });
      if (delta <= tolerance) {
        converged = true;
        break;
      }
    }

    const finalScores = scoresToObject(scores, ids);
    const order = ids
      .map((id) => ({ id, score: finalScores[id] }))
      .sort((first, second) => {
        if (second.score !== first.score) return second.score - first.score;
        return first.id < second.id ? -1 : first.id > second.id ? 1 : 0;
      });

    return {
      iterations,
      scores: finalScores,
      order,
      converged,
      danglingNodes,
    };
  }

  return {
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
  };
});
