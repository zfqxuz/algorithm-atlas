(function () {
  'use strict';

  const treeEngine = window.TreeEngine;
  const Lab = window.LabCore;
  if (!treeEngine || !Lab) throw new Error('树引擎或公共组件未加载。');

  const DOM = {
    tabs: Lab.$('#structTabs'),
    levelBadge: Lab.$('#structLevelBadge'),
    algorithmLabel: Lab.$('#structAlgorithmLabel'),
    stageEyebrow: Lab.$('#structStageEyebrow'),
    stageTitle: Lab.$('#structStageTitle'),
    stage: Lab.$('#structStage'),
    message: Lab.$('#structMessage'),
    dataLabel: Lab.$('#structDataLabel'),
    playBtn: Lab.$('#structPlayBtn'),
    playLabel: Lab.$('#structPlayLabel'),
    stepBtn: Lab.$('#structStepBtn'),
    resetBtn: Lab.$('#structResetBtn'),
    progressFill: Lab.$('#structProgressFill'),
    progressTrack: Lab.$('#structProgressTrack'),
    stepLabel: Lab.$('#structStepLabel'),
    progressValue: Lab.$('#structProgressValue'),
    runState: Lab.$('#structRunState'),
    stateChip: Lab.$('#structStateChip'),
    pseudoCode: Lab.$('#structPseudoCode'),
    codeAlgorithm: Lab.$('#structCodeAlgorithm'),
    invariantText: Lab.$('#structInvariantText'),
    time: Lab.$('#structTime'),
    space: Lab.$('#structSpace'),
    levelText: Lab.$('#structLevelText'),
    phase: Lab.$('#structPhase'),
    insight: Lab.$('#structInsight'),
    opPanel: Lab.$('#structOpPanel'),
    opKind: Lab.$('#structOpKind'),
    opHint: Lab.$('#structOpHint'),
    paramForm: Lab.$('#structParamForm'),
    seedBadge: Lab.$('#structSeedBadge'),
    generateBtn: Lab.$('#structGenerateBtn'),
    randomSeedBtn: Lab.$('#structRandomSeedBtn'),
    clearBtn: Lab.$('#structClearBtn'),
    dataSummary: Lab.$('#structDataSummary'),
    dataHint: Lab.$('#structDataHint'),
    metrics: Lab.$('#structMetrics'),
    invariantStatus: Lab.$('#structInvariantStatus'),
    invariantStatusText: Lab.$('#structInvariantStatusText'),
    metricNote: Lab.$('#structMetricNote'),
    profileLevel: Lab.$('#structProfileLevel'),
    description: Lab.$('#structDescription'),
    profileTags: Lab.$('#structProfileTags'),
  };

  const LEVEL_NAMES = { L1: '本科基础', L2: '本科进阶', L3: '高阶 / 研究生入门' };
  const TREE_META = new Map(treeEngine.ALGORITHMS.map((meta) => [meta.id, meta]));
  const HEAP_META = {
    id: 'heap',
    name: '二叉堆（最小堆）',
    en: 'Binary Min-Heap',
    level: 'L2',
    description: '用完全二叉树的数组表示维护堆序：父节点的值不大于子节点，根始终是最小值。',
    time: '插入 / 取最小 O(log n)',
    space: 'O(n)',
  };
  const UF_META = {
    id: 'union-find',
    name: '并查集',
    en: 'Union-Find / DSU',
    level: 'L2',
    description: '维护不相交集合。按秩合并让树保持浅，路径压缩让后续查找几乎常数时间。',
    time: 'α(n) 摊还',
    space: 'O(n)',
  };

  const HEAP_CODE = [
    'insert(value):',
    '  heap.push(value)',
    '  i = heap.length - 1',
    '  while i > 0:',
    '    parent = floor((i - 1) / 2)',
    '    if heap[parent] <= heap[i]: break',
    '    swap(heap[parent], heap[i])',
    '    i = parent',
    '  return i',
    '',
    'extractMin():',
    '  if heap is empty: return null',
    '  minimum = heap[0]',
    '  heap[0] = heap.pop()',
    '  if heap not empty: siftDown(0)',
    '  return minimum',
    '',
    'siftDown(i):',
    '  while left(i) < heap.length:',
    '    child = left(i)',
    '    if right(i) < length and heap[right(i)] < heap[child]: child = right(i)',
    '    if heap[i] <= heap[child]: break',
    '    swap(heap[i], heap[child])',
    '    i = child',
  ];

  const UF_CODE = [
    'find(x):',
    '  if parent[x] != x:',
    '    parent[x] = find(parent[x])',
    '  return parent[x]',
    '',
    'union(a, b):',
    '  ra = find(a)',
    '  rb = find(b)',
    '  if ra == rb: return false',
    '  if rank[ra] < rank[rb]: swap(ra, rb)',
    '  parent[rb] = ra',
    '  if rank[ra] == rank[rb]: rank[ra] += 1',
    '  return true',
  ];

  const MODE_ORDER = ['bst', 'heap', 'union-find', 'avl', 'rb'];

  const MODE_DEFS = {
    bst: {
      meta: TREE_META.get('bst'),
      stageTitle: 'BST · 二叉搜索树',
      eyebrow: 'BINARY SEARCH TREE',
      coreInvariant: '中序遍历递增；左子树键值都小，右子树键值都大。',
      insight: 'BST 的查找成本取决于树高；同样的键集，不同插入顺序会得到完全不同的形状。',
      tags: ['有序性', '递归', '树高'],
      opHint: '插入会改变结构；查找只高亮比较路径，不改变数据。',
      idleMessage: '插入或查找一个键，观察比较路径与父子关系。',
      fields: [
        { key: 'count', label: '初始节点数', type: 'range', min: 3, max: 15, step: 1, default: 7 },
        { key: 'min', label: '键值下限', type: 'number', min: 1, max: 99, step: 1, default: 1 },
        { key: 'max', label: '键值上限', type: 'number', min: 1, max: 99, step: 1, default: 99 },
        { key: 'seed', label: '随机种子', type: 'number', min: 1, max: 99999, step: 1, default: 2026 },
      ],
      summary: (model) => `${model.keys.length} 个节点 · 键值 ${model.params.min}–${model.params.max} · seed ${model.params.seed}`,
      dataLabel: (model) => `${model.tree.stats().size} 个节点 · 高度 ${model.tree.stats().height}`,
      code: () => treeEngine.pseudocode('bst'),
      clear() {
        this.model.tree.clear();
        this.model.keys = [];
      },
    },
    heap: {
      meta: HEAP_META,
      stageTitle: '二叉堆 · 最小堆',
      eyebrow: 'PRIORITY QUEUE',
      coreInvariant: '堆序：每个父节点的值都不大于它的子节点，因此根是全局最小值。',
      insight: '完全二叉树可以无缝映射到数组；插入上浮、取最小下沉，都是沿一条根到叶的路径。',
      tags: ['优先队列', '完全二叉树', '堆序'],
      opHint: '插入时新值从末尾上浮；取出最小值时把末尾元素换到根再下沉。',
      idleMessage: '插入一个值或取出最小值，观察上浮与下沉。',
      fields: [
        { key: 'count', label: '初始元素数', type: 'range', min: 5, max: 18, step: 1, default: 10 },
        { key: 'maxValue', label: '值域上限', type: 'select', numeric: true, options: [[20, '20'], [50, '50'], [100, '100']], default: 50 },
        { key: 'seed', label: '随机种子', type: 'number', min: 1, max: 99999, step: 1, default: 2026 },
      ],
      summary: (model) => `${model.heap.size} 个元素 · 值域 0–${model.params.maxValue} · seed ${model.params.seed}`,
      dataLabel: (model) => `${model.heap.size} 个元素 · 根 ${model.heap.size ? model.heap.values[0] : '—'}`,
      code: () => HEAP_CODE,
      clear() {
        this.model.heap = new MinHeap();
      },
    },
    'union-find': {
      meta: UF_META,
      stageTitle: '并查集 · 动态连通性',
      eyebrow: 'DISJOINT SETS',
      coreInvariant: '每个集合是一棵有根树；按秩合并 + 路径压缩把查询成本压到几乎常数。',
      insight: 'find 沿着 parent 指针走向根，并把路径上的节点直接挂到根；union 只改变根之间的父子关系。',
      tags: ['连通性', '路径压缩', '摊还分析'],
      opHint: 'find 只压缩路径；union 先找两个根，再按 rank 合并。',
      idleMessage: '选择一个元素查找根，或合并两个集合。',
      fields: [
        { key: 'count', label: '元素数量', type: 'range', min: 5, max: 12, step: 1, default: 8 },
        { key: 'initialUnions', label: '初始合并次数', type: 'range', min: 0, max: 10, step: 1, default: 3 },
        { key: 'seed', label: '随机种子', type: 'number', min: 1, max: 99999, step: 1, default: 2026 },
      ],
      summary: (model) => `${model.dsu.n} 个元素 · ${model.dsu.components} 个集合 · seed ${model.params.seed}`,
      dataLabel: (model) => `${model.dsu.n} 个元素 · ${model.dsu.components} 个集合`,
      code: () => UF_CODE,
      clear() {
        this.model.dsu = new DSU(this.model.dsu.n);
      },
    },
    avl: {
      meta: TREE_META.get('avl'),
      stageTitle: 'AVL · 高度平衡',
      eyebrow: 'BALANCED BST',
      coreInvariant: '每个节点左右子树高度差（平衡因子）都必须在 -1、0、1 之间。',
      insight: 'AVL 用局部旋转修复全局高度：LL/RR 单旋，LR/RL 双旋。',
      tags: ['平衡树', '旋转', '高度'],
      opHint: '插入后观察平衡因子，遇到失衡节点时执行单旋或双旋。',
      idleMessage: '插入一个键，观察 AVL 如何在旋转后恢复平衡。',
      fields: [
        { key: 'count', label: '初始节点数', type: 'range', min: 3, max: 15, step: 1, default: 8 },
        { key: 'min', label: '键值下限', type: 'number', min: 1, max: 99, step: 1, default: 1 },
        { key: 'max', label: '键值上限', type: 'number', min: 1, max: 99, step: 1, default: 99 },
        { key: 'seed', label: '随机种子', type: 'number', min: 1, max: 99999, step: 1, default: 2026 },
      ],
      summary: (model) => `${model.keys.length} 个节点 · 键值 ${model.params.min}–${model.params.max} · seed ${model.params.seed}`,
      dataLabel: (model) => `${model.tree.stats().size} 个节点 · 高度 ${model.tree.stats().height}`,
      code: () => treeEngine.pseudocode('avl'),
      clear() {
        this.model.tree.clear();
        this.model.keys = [];
      },
    },
    rb: {
      meta: TREE_META.get('rb'),
      stageTitle: '红黑树 · 颜色不变量',
      eyebrow: 'BALANCED BST',
      coreInvariant: '根为黑；红节点的孩子必须为黑；从任意节点到空叶子的黑节点数相同。',
      insight: '红黑树用颜色而非严格高度来平衡。插入先染红，再通过变色与旋转修复。',
      tags: ['平衡树', '颜色不变量', '旋转'],
      opHint: '观察新建红节点、红叔变色、旋转与根节点染黑的过程。',
      idleMessage: '插入一个键，观察红黑树如何通过变色与旋转恢复性质。',
      fields: [
        { key: 'count', label: '初始节点数', type: 'range', min: 3, max: 15, step: 1, default: 8 },
        { key: 'min', label: '键值下限', type: 'number', min: 1, max: 99, step: 1, default: 1 },
        { key: 'max', label: '键值上限', type: 'number', min: 1, max: 99, step: 1, default: 99 },
        { key: 'seed', label: '随机种子', type: 'number', min: 1, max: 99999, step: 1, default: 2026 },
      ],
      summary: (model) => `${model.keys.length} 个节点 · 键值 ${model.params.min}–${model.params.max} · seed ${model.params.seed}`,
      dataLabel: (model) => `${model.tree.stats().size} 个节点 · 黑高 ${model.tree.stats().blackHeight}`,
      code: () => treeEngine.pseudocode('rb'),
      clear() {
        this.model.tree.clear();
        this.model.keys = [];
      },
    },
  };

  const modeState = {
    mode: 'bst',
    models: {},
    operation: null,
    player: null,
  };

  // ---------- local structures ----------

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function random() {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  class MinHeap {
    constructor() {
      this.values = [];
    }

    get size() {
      return this.values.length;
    }

    snapshot(extra) {
      const settings = extra || {};
      return {
        values: this.values.slice(),
        active: settings.active || [],
        message: settings.message || (this.values.length ? `当前最小堆，根为 ${this.values[0]}。` : '堆为空。'),
        line: settings.line || 0,
        stats: this.stats(),
      };
    }

    stats() {
      const size = this.values.length;
      return {
        size,
        height: size === 0 ? 0 : Math.floor(Math.log2(size)) + 1,
        root: size ? this.values[0] : null,
      };
    }

    insert(value) {
      const steps = [];
      this.values.push(value);
      let index = this.values.length - 1;
      steps.push({
        values: this.values.slice(),
        active: [index],
        message: `将 ${value} 放到数组末尾，准备上浮。`,
        line: 2,
        kind: 'insert',
        stats: this.stats(),
      });
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        steps.push({
          values: this.values.slice(),
          active: [index, parent],
          message: `比较子节点 ${this.values[index]} 与父节点 ${this.values[parent]}。`,
          line: 6,
          kind: 'compare',
          stats: this.stats(),
        });
        if (this.values[parent] <= this.values[index]) break;
        const temp = this.values[parent];
        this.values[parent] = this.values[index];
        this.values[index] = temp;
        steps.push({
          values: this.values.slice(),
          active: [index, parent],
          message: `交换父节点与子节点，${value} 继续上浮。`,
          line: 7,
          kind: 'swap',
          stats: this.stats(),
        });
        index = parent;
      }
      steps.push({
        values: this.values.slice(),
        active: [index],
        message: `插入 ${value} 完成，堆序恢复。`,
        line: 9,
        kind: 'done',
        stats: this.stats(),
      });
      return steps;
    }

    extractMin() {
      if (this.values.length === 0) {
        return [{
          values: [],
          active: [],
          message: '堆为空，没有可以取出的元素。',
          line: 11,
          kind: 'empty',
          stats: this.stats(),
        }];
      }
      const steps = [];
      const minimum = this.values[0];
      steps.push({
        values: this.values.slice(),
        active: [0],
        message: `根节点 ${minimum} 是当前最小值。`,
        line: 12,
        kind: 'read',
        stats: this.stats(),
      });
      const last = this.values.pop();
      if (this.values.length > 0) {
        this.values[0] = last;
        steps.push({
          values: this.values.slice(),
          active: [0],
          message: `把末尾元素 ${last} 移到根，准备下沉。`,
          line: 13,
          kind: 'move',
          stats: this.stats(),
        });
        let index = 0;
        while (index * 2 + 1 < this.values.length) {
          const left = index * 2 + 1;
          const right = left + 1;
          let child = left;
          steps.push({
            values: this.values.slice(),
            active: [index, left, ...(right < this.values.length ? [right] : [])],
            message: `比较根 ${this.values[index]} 与子节点 ${this.values[left]}${right < this.values.length ? `、${this.values[right]}` : ''}。`,
            line: 20,
            kind: 'compare',
            stats: this.stats(),
          });
          if (right < this.values.length && this.values[right] < this.values[left]) child = right;
          if (this.values[index] <= this.values[child]) break;
          const temp = this.values[index];
          this.values[index] = this.values[child];
          this.values[child] = temp;
          steps.push({
            values: this.values.slice(),
            active: [index, child],
            message: `交换 ${this.values[child]} 与 ${this.values[index]}，继续向下调整。`,
            line: 21,
            kind: 'swap',
            stats: this.stats(),
          });
          index = child;
        }
      } else {
        steps.push({
          values: [],
          active: [],
          message: `取出 ${minimum} 后堆为空。`,
          line: 14,
          kind: 'move',
          stats: this.stats(),
        });
      }
      steps.push({
        values: this.values.slice(),
        active: [],
        message: `取出了最小值 ${minimum}。`,
        line: 15,
        kind: 'done',
        stats: this.stats(),
      });
      return steps;
    }
  }

  class DSU {
    constructor(n) {
      this.n = n;
      this.parent = Array.from({ length: n }, (_, index) => index);
      this.rank = Array(n).fill(0);
      this.components = n;
      this.finds = 0;
      this.unions = 0;
    }

    find(x) {
      let root = x;
      while (this.parent[root] !== root) root = this.parent[root];
      while (this.parent[x] !== x) {
        const next = this.parent[x];
        this.parent[x] = root;
        x = next;
      }
      return root;
    }

    union(a, b) {
      const ra = this.find(a);
      const rb = this.find(b);
      if (ra === rb) return false;
      const high = this.rank[ra] >= this.rank[rb] ? ra : rb;
      const low = high === ra ? rb : ra;
      this.parent[low] = high;
      if (this.rank[high] === this.rank[low]) this.rank[high] += 1;
      this.components -= 1;
      this.unions += 1;
      return true;
    }

    snapshot(extra) {
      const settings = extra || {};
      return {
        n: this.n,
        parent: this.parent.slice(),
        rank: this.rank.slice(),
        components: this.components,
        active: settings.active || [],
        highlights: settings.highlights || [],
        message: settings.message || `当前有 ${this.components} 个集合。`,
        line: settings.line || 0,
        finds: this.finds,
        unions: this.unions,
      };
    }

    stats() {
      let maxRank = 0;
      for (const value of this.rank) maxRank = Math.max(maxRank, value);
      const roots = this.parent.reduce((count, value, index) => count + (value === index ? 1 : 0), 0);
      return { n: this.n, components: roots, maxRank, finds: this.finds, unions: this.unions };
    }

    findSteps(x) {
      const steps = [];
      const path = [];
      this.finds += 1;
      const visit = (node) => {
        path.push(node);
        steps.push(this.snapshot({
          active: path.slice(),
          message: `find(${x}) 访问元素 ${node}：parent[${node}] = ${this.parent[node]}。`,
          line: 2,
        }));
        if (this.parent[node] === node) {
          steps.push(this.snapshot({
            active: path.slice(),
            message: `${node} 是集合的根。`,
            line: 4,
          }));
          return node;
        }
        const root = visit(this.parent[node]);
        if (this.parent[node] !== root) {
          this.parent[node] = root;
          steps.push(this.snapshot({
            active: path.slice(),
            message: `路径压缩：parent[${node}] 直接指向根 ${root}。`,
            line: 3,
          }));
        }
        return root;
      };
      const root = visit(x);
      steps.push(this.snapshot({
        active: [x],
        message: `find(${x}) = ${root}，路径已压缩。`,
        line: 4,
      }));
      return { root, steps };
    }

    unionSteps(a, b) {
      const steps = [];
      this.unions += 1;
      const resultA = this.findSteps(a);
      steps.push(...resultA.steps);
      const resultB = this.findSteps(b);
      steps.push(...resultB.steps);
      const ra = resultA.root;
      const rb = resultB.root;
      if (ra === rb) {
        steps.push(this.snapshot({
          active: [ra],
          message: `${a} 与 ${b} 已经在同一个集合中。`,
          line: 9,
        }));
        return steps;
      }
      const high = this.rank[ra] >= this.rank[rb] ? ra : rb;
      const low = high === ra ? rb : ra;
      this.parent[low] = high;
      if (this.rank[high] === this.rank[low]) this.rank[high] += 1;
      this.components -= 1;
      steps.push(this.snapshot({
        active: [high, low],
        message: `按秩合并：把根 ${low} 挂到根 ${high} 下面。`,
        line: 11,
      }));
      steps.push(this.snapshot({
        active: [high],
        message: `合并完成，当前共有 ${this.components} 个集合。`,
        line: 12,
      }));
      return steps;
    }
  }

  // ---------- helper functions ----------

  function levelName(level) {
    return LEVEL_NAMES[level] || level;
  }

  function currentModel() {
    return modeState.models[modeState.mode];
  }

  function makeModel(mode, params) {
    if (mode === 'bst' || mode === 'avl' || mode === 'rb') {
      const keys = treeEngine.generateKeys({ count: params.count, min: params.min, max: params.max, seed: params.seed });
      const tree = treeEngine.createTree(mode);
      for (const key of keys) tree.insert(key);
      return { type: 'tree', mode, params: { ...params }, tree, keys };
    }
    if (mode === 'heap') {
      const rng = mulberry32(params.seed);
      const heap = new MinHeap();
      for (let index = 0; index < params.count; index += 1) {
        heap.insert(Math.floor(rng() * (params.maxValue + 1)));
      }
      return { type: 'heap', mode, params: { ...params }, heap };
    }
    if (mode === 'union-find') {
      const rng = mulberry32(params.seed);
      const dsu = new DSU(params.count);
      const target = Math.min(params.initialUnions, Math.max(0, params.count - 2));
      let merged = 0;
      let attempts = 0;
      while (merged < target && attempts < 200) {
        attempts += 1;
        const a = Math.floor(rng() * params.count);
        const b = Math.floor(rng() * params.count);
        if (a !== b && dsu.union(a, b)) merged += 1;
      }
      dsu.finds = 0;
      dsu.unions = 0;
      return { type: 'uf', mode, params: { ...params }, dsu };
    }
    throw new Error(`未知数据结构：${mode}`);
  }

  function readParams() {
    const def = MODE_DEFS[modeState.mode];
    const params = {};
    for (const field of def.fields) {
      const input = document.getElementById(`structParam-${field.key}`);
      if (!input) continue;
      params[field.key] = field.type === 'select' ? Number(input.value) : Number(input.value);
    }
    return params;
  }

  function formatFieldValue(field, value) {
    if (field.format) return field.format(value);
    return String(value);
  }

  function buildParamForm(params) {
    const def = MODE_DEFS[modeState.mode];
    DOM.paramForm.replaceChildren();
    for (const field of def.fields) {
      const label = Lab.el('label', 'lab-param');
      const head = document.createElement('span');
      const valueSlot = Lab.el('strong', '', '');
      head.append(document.createTextNode(`${field.label} `), valueSlot);
      label.appendChild(head);
      let input;
      if (field.type === 'select') {
        input = document.createElement('select');
        for (const [value, text] of field.options) {
          const option = document.createElement('option');
          option.value = String(value);
          option.textContent = text;
          input.appendChild(option);
        }
        input.value = String(params[field.key]);
        label.appendChild(input);
        valueSlot.remove();
      } else if (field.type === 'number') {
        input = document.createElement('input');
        input.type = 'number';
        input.min = String(field.min);
        input.max = String(field.max);
        input.step = String(field.step);
        input.value = String(params[field.key]);
        label.appendChild(input);
        valueSlot.remove();
      } else {
        const wrapper = Lab.el('div', 'lab-param-range');
        input = document.createElement('input');
        input.type = 'range';
        input.min = String(field.min);
        input.max = String(field.max);
        input.step = String(field.step);
        input.value = String(params[field.key]);
        wrapper.appendChild(input);
        label.appendChild(wrapper);
        valueSlot.textContent = formatFieldValue(field, Number(input.value));
        input.addEventListener('input', () => {
          valueSlot.textContent = formatFieldValue(field, Number(input.value));
          Lab.updateRangeFill(input);
        });
        Lab.updateRangeFill(input);
      }
      input.id = `structParam-${field.key}`;
      input.dataset.key = field.key;
      DOM.paramForm.appendChild(label);
    }
  }

  function updateDataSummary() {
    const model = currentModel();
    if (!model) return;
    DOM.seedBadge.textContent = `seed ${model.params.seed}`;
    DOM.dataSummary.textContent = MODE_DEFS[modeState.mode].summary(model);
    if (model.type === 'tree') {
      const size = model.tree.stats().size;
      DOM.dataLabel.textContent = `${size} 个节点 · seed ${model.params.seed}`;
    } else if (model.type === 'heap') {
      DOM.dataLabel.textContent = `${model.heap.size} 个元素 · 最小值 ${model.heap.size ? model.heap.values[0] : '—'}`;
    } else {
      DOM.dataLabel.textContent = `${model.dsu.n} 个元素 · ${model.dsu.components} 个集合`;
    }
  }

  function buildTreeOpPanel() {
    DOM.opPanel.replaceChildren();
    const form = Lab.el('div', 'struct-op-form');
    const row = Lab.el('div', 'struct-op-row is-single');
    const field = Lab.el('label', 'struct-op-field');
    field.append(document.createTextNode('键值'));
    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'structKeyInput';
    input.min = '1';
    input.max = '99';
    input.value = '42';
    field.appendChild(input);
    row.appendChild(field);
    const buttons = Lab.el('div', 'struct-op-buttons');
    const insert = Lab.el('button', 'button button-primary', '插入');
    insert.type = 'button';
    const search = Lab.el('button', 'button button-secondary', '查找');
    search.type = 'button';
    const random = Lab.el('button', 'button button-quiet', '随机键');
    random.type = 'button';
    buttons.append(insert, search, random);
    const meta = Lab.el('div', 'struct-op-meta');
    meta.append(Lab.el('span', '', '插入会改变结构'), Lab.el('span', '', '查找只读'));
    form.append(row, buttons, meta);
    DOM.opPanel.appendChild(form);

    function readKey() {
      const value = Number(input.value);
      if (!Number.isInteger(value) || value < 1 || value > 99) {
        DOM.message.textContent = '请输入 1–99 之间的整数键值。';
        return null;
      }
      return value;
    }
    insert.addEventListener('click', () => {
      const value = readKey();
      if (value === null) return;
      runOperation(() => currentModel().tree.insert(value).steps, 'INSERT');
    });
    search.addEventListener('click', () => {
      const value = readKey();
      if (value === null) return;
      runOperation(() => currentModel().tree.search(value).steps, 'SEARCH');
    });
    random.addEventListener('click', () => {
      input.value = String(Math.floor(Math.random() * 99) + 1);
    });
  }

  function buildHeapOpPanel() {
    DOM.opPanel.replaceChildren();
    const form = Lab.el('div', 'struct-op-form');
    const row = Lab.el('div', 'struct-op-row is-single');
    const field = Lab.el('label', 'struct-op-field');
    field.append(document.createTextNode('插入值'));
    const input = document.createElement('input');
    input.type = 'number';
    input.id = 'structHeapValue';
    input.min = '0';
    input.max = '100';
    input.value = '7';
    field.appendChild(input);
    row.appendChild(field);
    const buttons = Lab.el('div', 'struct-op-buttons');
    const insert = Lab.el('button', 'button button-primary', '插入');
    insert.type = 'button';
    const extract = Lab.el('button', 'button button-secondary', '取出最小值');
    extract.type = 'button';
    const random = Lab.el('button', 'button button-quiet', '随机值');
    random.type = 'button';
    buttons.append(insert, extract, random);
    const meta = Lab.el('div', 'struct-op-meta');
    meta.append(Lab.el('span', '', '上浮 / 下沉'), Lab.el('span', '', '最小堆'));
    form.append(row, buttons, meta);
    DOM.opPanel.appendChild(form);

    insert.addEventListener('click', () => {
      const value = Number(input.value);
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        DOM.message.textContent = '请输入 0–100 之间的整数。';
        return;
      }
      runOperation(() => currentModel().heap.insert(value), 'INSERT');
    });
    extract.addEventListener('click', () => {
      runOperation(() => currentModel().heap.extractMin(), 'EXTRACT');
    });
    random.addEventListener('click', () => {
      input.value = String(Math.floor(Math.random() * 100));
    });
  }

  function buildUfOpPanel() {
    DOM.opPanel.replaceChildren();
    const model = currentModel();
    const n = model.dsu.n;
    const form = Lab.el('div', 'struct-op-form');
    const row = Lab.el('div', 'struct-op-row');
    for (const [key, labelText, value] of [['a', '元素 A', '0'], ['b', '元素 B', '1']]) {
      const field = Lab.el('label', 'struct-op-field');
      field.append(document.createTextNode(labelText));
      const input = document.createElement('input');
      input.type = 'number';
      input.id = `structUf${key.toUpperCase()}`;
      input.min = '0';
      input.max = String(Math.max(0, n - 1));
      input.value = value;
      field.appendChild(input);
      row.appendChild(field);
    }
    const buttons = Lab.el('div', 'struct-op-buttons');
    const union = Lab.el('button', 'button button-primary', 'Union');
    union.type = 'button';
    const find = Lab.el('button', 'button button-secondary', 'Find A');
    find.type = 'button';
    const random = Lab.el('button', 'button button-quiet', '随机合并');
    random.type = 'button';
    buttons.append(union, find, random);
    const meta = Lab.el('div', 'struct-op-meta');
    meta.append(Lab.el('span', '', `${n} 个元素`), Lab.el('span', '', '按秩合并'));
    form.append(row, buttons, meta);
    DOM.opPanel.appendChild(form);

    const readIndex = (input) => {
      const value = Number(input.value);
      if (!Number.isInteger(value) || value < 0 || value >= n) {
        DOM.message.textContent = `请输入 0–${n - 1} 之间的元素编号。`;
        return null;
      }
      return value;
    };
    union.addEventListener('click', () => {
      const a = readIndex(document.getElementById('structUfA'));
      const b = readIndex(document.getElementById('structUfB'));
      if (a === null || b === null) return;
      runOperation(() => currentModel().dsu.unionSteps(a, b), 'UNION');
    });
    find.addEventListener('click', () => {
      const a = readIndex(document.getElementById('structUfA'));
      if (a === null) return;
      runOperation(() => currentModel().dsu.findSteps(a).steps, 'FIND');
    });
    random.addEventListener('click', () => {
      const a = Math.floor(Math.random() * n);
      const b = Math.floor(Math.random() * n);
      document.getElementById('structUfA').value = String(a);
      document.getElementById('structUfB').value = String(b);
      runOperation(() => currentModel().dsu.unionSteps(a, b), 'UNION');
    });
  }

  function buildOperations() {
    const mode = modeState.mode;
    if (mode === 'heap') buildHeapOpPanel();
    else if (mode === 'union-find') buildUfOpPanel();
    else buildTreeOpPanel();
    DOM.opKind.textContent = 'READY';
    DOM.opHint.textContent = MODE_DEFS[mode].opHint;
  }

  function runOperation(stepsFactory, label) {
    if (modeState.player) modeState.player.pause();
    let steps;
    try {
      steps = stepsFactory();
    } catch (error) {
      DOM.message.textContent = `操作失败：${error.message}`;
      return;
    }
    if (!steps || steps.length === 0) return;
    modeState.operation = { steps, index: 0, label };
    DOM.opKind.textContent = label;
    render();
    if (steps.length > 1) modeState.player.play();
  }

  // ---------- layout and renderers ----------

  function renderTree(model, snapshot) {
    if (!snapshot.rootId) {
      DOM.stage.replaceChildren(Lab.el('div', 'tree-empty', '树为空。插入一个键，或生成新的初始结构。'));
      return;
    }
    const nodeMap = new Map(snapshot.nodes.map((node) => [node.id, node]));
    const ordered = [];
    let maxDepth = 0;
    function walk(id, depth) {
      if (!id) return;
      const node = nodeMap.get(id);
      if (!node) return;
      walk(node.leftId, depth + 1);
      ordered.push({ node, depth });
      maxDepth = Math.max(maxDepth, depth);
      walk(node.rightId, depth + 1);
    }
    walk(snapshot.rootId, 0);
    const compact = window.innerWidth <= 700;
    const spacing = compact ? 42 : 68;
    const margin = compact ? 34 : 50;
    const width = Math.max(compact ? 340 : 620, ordered.length * spacing + margin * 2 + 20);
    const levelGap = compact ? 64 : 70;
    const height = Math.max(280, 34 + (maxDepth + 1) * levelGap + 26);
    const nodeRadius = compact ? 16 : 18;
    const ringRadius = compact ? 21 : 23;
    const fontSize = compact ? 11 : 8;
    const positions = new Map();
    ordered.forEach((entry, index) => {
      positions.set(entry.node.id, {
        x: margin + (index + 0.5) * ((width - margin * 2) / ordered.length),
        y: 34 + entry.depth * levelGap,
      });
    });
    const highlighted = new Set(snapshot.highlights || []);
    const activeId = snapshot.activeId;
    const svg = Lab.svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': `${modeState.mode} 树结构` });

    for (const node of snapshot.nodes) {
      if (!node.parentId) continue;
      const from = positions.get(node.parentId);
      const to = positions.get(node.id);
      if (!from || !to) continue;
      svg.appendChild(Lab.svgEl('line', {
        x1: from.x.toFixed(2), y1: from.y.toFixed(2),
        x2: to.x.toFixed(2), y2: to.y.toFixed(2),
        class: `tree-edge${highlighted.has(node.id) || highlighted.has(node.parentId) ? ' is-highlight' : ''}`,
      }));
    }

    for (const entry of ordered) {
      const node = entry.node;
      const position = positions.get(node.id);
      const isRed = snapshot.type === 'rb' && node.color === 'red';
      const classes = [
        'tree-node',
        isRed ? 'is-red' : '',
        snapshot.type === 'rb' && node.color === 'black' ? 'is-black' : '',
        highlighted.has(node.id) ? 'is-highlight' : '',
        activeId === node.id ? 'is-active' : '',
      ].filter(Boolean).join(' ');
      const group = Lab.svgEl('g', { class: classes });
      group.appendChild(Lab.svgEl('circle', {
        cx: position.x.toFixed(2), cy: position.y.toFixed(2), r: ringRadius,
        class: 'tree-highlight-ring',
      }));
      group.appendChild(Lab.svgEl('circle', {
        cx: position.x.toFixed(2), cy: position.y.toFixed(2), r: nodeRadius,
        class: 'tree-node-core',
      }));
      const text = Lab.svgEl('text', { x: position.x.toFixed(2), y: position.y.toFixed(2) });
      text.textContent = String(node.key);
      text.style.fontSize = `${fontSize}px`;
      group.appendChild(text);
      const title = Lab.svgEl('title');
      title.textContent = `${node.id} · 键 ${node.key}${node.color ? ` · ${node.color}` : ''}`;
      group.appendChild(title);
      svg.appendChild(group);
    }

    const canvas = Lab.el('div', 'tree-canvas');
    canvas.appendChild(svg);
    const legend = Lab.el('div', 'tree-legend');
    if (snapshot.type === 'rb') {
      legend.append(
        makeLegendItem('is-red', '红节点'),
        makeLegendItem('is-black', '黑节点'),
        makeLegendItem('is-highlight', '比较路径'),
        makeLegendItem('is-active', '当前节点')
      );
    } else {
      legend.append(
        makeLegendItem('', '节点'),
        makeLegendItem('is-highlight', '比较路径'),
        makeLegendItem('is-active', '当前节点')
      );
    }
    DOM.stage.replaceChildren(canvas, legend);
  }

  function makeLegendItem(className, text) {
    const item = Lab.el('span');
    item.append(Lab.el('i', className), document.createTextNode(text));
    return item;
  }

  function renderHeap(model, snapshot) {
    const values = snapshot.values;
    if (values.length === 0) {
      DOM.stage.replaceChildren(Lab.el('div', 'tree-empty', '堆为空。插入一个值，或生成新的初始堆。'));
      return;
    }
    const width = 1000;
    const maxDepth = Math.floor(Math.log2(values.length));
    const height = 40 + (maxDepth + 1) * 68 + 22;
    const positions = values.map((_, index) => {
      const depth = Math.floor(Math.log2(index + 1));
      const count = 2 ** depth;
      const offset = index - (count - 1);
      return {
        x: 60 + ((offset + 0.5) / count) * (width - 120),
        y: 34 + depth * 68,
      };
    });
    const active = new Set(snapshot.active || []);
    const svg = Lab.svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': '最小堆的完全二叉树' });
    for (let index = 1; index < values.length; index += 1) {
      const parent = Math.floor((index - 1) / 2);
      svg.appendChild(Lab.svgEl('line', {
        x1: positions[parent].x.toFixed(2), y1: positions[parent].y.toFixed(2),
        x2: positions[index].x.toFixed(2), y2: positions[index].y.toFixed(2),
        class: 'tree-edge',
      }));
    }
    values.forEach((value, index) => {
      const group = Lab.svgEl('g', { class: `heap-node${active.has(index) ? ' is-active' : ''}` });
      group.appendChild(Lab.svgEl('circle', {
        cx: positions[index].x.toFixed(2), cy: positions[index].y.toFixed(2), r: 18,
      }));
      const text = Lab.svgEl('text', { x: positions[index].x.toFixed(2), y: positions[index].y.toFixed(2) });
      text.textContent = String(value);
      group.appendChild(text);
      const title = Lab.svgEl('title');
      title.textContent = `数组下标 ${index} · 值 ${value}`;
      group.appendChild(title);
      svg.appendChild(group);
    });
    const canvas = Lab.el('div', 'heap-canvas');
    canvas.appendChild(svg);
    const arrayEl = Lab.el('div', 'heap-array');
    values.forEach((value, index) => {
      const cell = Lab.el('div', `heap-cell${active.has(index) ? ' is-active' : ''}${index === 0 ? ' is-root' : ''}`);
      cell.append(Lab.el('small', '', String(index)), Lab.el('strong', '', String(value)));
      arrayEl.appendChild(cell);
    });
    const legend = Lab.el('div', 'heap-legend');
    legend.append(
      makeLegendItem('', '普通节点'),
      makeLegendItem('is-active', '当前比较 / 交换'),
      makeLegendItem('is-root', '堆顶')
    );
    DOM.stage.replaceChildren(canvas, arrayEl, legend);
  }

  function renderUf(model, snapshot) {
    const n = snapshot.n;
    const parent = snapshot.parent;
    const rank = snapshot.rank;
    const children = new Map(Array.from({ length: n }, (_, index) => [index, []]));
    const roots = [];
    for (let index = 0; index < n; index += 1) {
      if (parent[index] === index) roots.push(index);
      else if (children.has(parent[index])) children.get(parent[index]).push(index);
    }
    const positions = new Map();
    let cursor = 36;
    let maxDepth = 0;
    function layout(node, depth, left) {
      maxDepth = Math.max(maxDepth, depth);
      const kids = children.get(node) || [];
      if (kids.length === 0) {
        positions.set(node, { x: left + 27, y: 34 + depth * 62 });
        return { width: 54, center: left + 27 };
      }
      let childLeft = left;
      const centers = [];
      for (const child of kids) {
        const result = layout(child, depth + 1, childLeft);
        centers.push(result.center);
        childLeft += result.width;
      }
      const center = (centers[0] + centers[centers.length - 1]) / 2;
      positions.set(node, { x: center, y: 34 + depth * 62 });
      return { width: childLeft - left, center };
    }
    const rootPositions = [];
    for (const root of roots) {
      const result = layout(root, 0, cursor);
      rootPositions.push({ root, baseline: cursor });
      cursor += result.width + 34;
    }
    const width = Math.max(480, cursor + 24);
    const height = Math.max(260, 34 + (maxDepth + 1) * 62 + 22);
    const active = new Set(snapshot.active || []);
    const rootColors = ['#70845e', '#a8792f', '#6e6092', '#b95f43', '#728691', '#8b9b6f', '#9d7f8d', '#948370'];
    const colorByRoot = new Map(roots.map((root, index) => [root, rootColors[index % rootColors.length]]));
    function rootOf(node) {
      let current = node;
      while (parent[current] !== current) current = parent[current];
      return current;
    }
    const rootColor = (node) => colorByRoot.get(rootOf(node)) || '#78e8bf';
    const svg = Lab.svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': '并查集森林' });

    for (let index = 0; index < n; index += 1) {
      if (parent[index] === index) continue;
      const from = positions.get(parent[index]);
      const to = positions.get(index);
      if (!from || !to) continue;
      svg.appendChild(Lab.svgEl('line', {
        x1: from.x.toFixed(2), y1: from.y.toFixed(2),
        x2: to.x.toFixed(2), y2: to.y.toFixed(2),
        class: `uf-edge${active.has(index) || active.has(parent[index]) ? ' is-highlight' : ''}`,
      }));
    }
    for (let index = 0; index < n; index += 1) {
      const position = positions.get(index);
      if (!position) continue;
      const group = Lab.svgEl('g', {
        class: `uf-node${parent[index] === index ? ' is-root' : ''}${active.has(index) ? ' is-active' : ''}`,
        style: `--uf-color:${rootColor(index)}`,
      });
      group.appendChild(Lab.svgEl('circle', {
        cx: position.x.toFixed(2), cy: position.y.toFixed(2), r: 17,
      }));
      const text = Lab.svgEl('text', { x: position.x.toFixed(2), y: position.y.toFixed(2) });
      text.textContent = String(index);
      group.appendChild(text);
      if (parent[index] === index) {
        const rankLabel = Lab.svgEl('text', {
          x: position.x.toFixed(2), y: (position.y + 23).toFixed(2), class: 'uf-rank-label',
        });
        rankLabel.textContent = `rank ${rank[index]}`;
        group.appendChild(rankLabel);
      }
      const title = Lab.svgEl('title');
      title.textContent = `元素 ${index} · parent ${parent[index]} · rank ${rank[index]}`;
      group.appendChild(title);
      svg.appendChild(group);
    }

    const canvas = Lab.el('div', 'uf-canvas');
    canvas.appendChild(svg);

    const arrays = Lab.el('div', 'uf-arrays');
    const parentRow = Lab.el('div', 'uf-array-row');
    parentRow.appendChild(Lab.el('span', 'uf-array-label', 'parent'));
    const rankRow = Lab.el('div', 'uf-array-row');
    rankRow.appendChild(Lab.el('span', 'uf-array-label', 'rank'));
    for (let index = 0; index < n; index += 1) {
      const parentCell = Lab.el('div', `uf-array-cell${parent[index] === index ? ' is-root' : ''}${active.has(index) ? ' is-active' : ''}`, String(parent[index]));
      const rankCell = Lab.el('div', `uf-array-cell${active.has(index) ? ' is-active' : ''}`, String(rank[index]));
      parentRow.appendChild(parentCell);
      rankRow.appendChild(rankCell);
    }
    arrays.append(parentRow, rankRow);

    const legend = Lab.el('div', 'uf-legend');
    legend.append(
      makeLegendItem('is-root', '集合根'),
      makeLegendItem('is-active', '当前路径'),
      makeLegendItem('', '普通元素')
    );
    DOM.stage.replaceChildren(canvas, arrays, legend);
  }

  // ---------- metrics, code, chrome ----------

  function renderMetrics(model, snapshot, step) {
    const mode = modeState.mode;
    let items;
    let statusText;
    let warning = false;
    if (model.type === 'tree') {
      const stats = snapshot.stats || model.tree.stats();
      if (mode === 'rb') {
        items = [
          ['节点数', stats.size],
          ['树高', stats.height],
          ['旋转', stats.rotations],
          ['黑高', stats.blackHeight],
        ];
        statusText = '根为黑 · 无红红冲突 · 黑高一致';
      } else if (mode === 'avl') {
        items = [
          ['节点数', stats.size],
          ['树高', stats.height],
          ['旋转', stats.rotations],
          ['平衡', stats.isBalanced ? '是' : '否'],
        ];
        statusText = stats.isBalanced ? 'AVL 平衡因子检查通过' : '平衡因子越界';
        warning = !stats.isBalanced;
      } else {
        items = [
          ['节点数', stats.size],
          ['树高', stats.height],
          ['键唯一', '是'],
          ['中序有序', '是'],
        ];
        statusText = '左小右大 · 中序遍历递增';
      }
    } else if (model.type === 'heap') {
      const stats = snapshot.stats || model.heap.stats();
      let heapOk = true;
      const values = snapshot.values;
      for (let index = 1; index < values.length; index += 1) {
        if (values[Math.floor((index - 1) / 2)] > values[index]) heapOk = false;
      }
      items = [
        ['元素数', stats.size],
        ['堆顶', stats.root === null ? '—' : stats.root],
        ['树高', stats.height],
        ['父 ≤ 子', heapOk ? '是' : '否'],
      ];
      statusText = heapOk ? '最小堆堆序成立，根为全局最小值' : '堆序被破坏';
      warning = !heapOk;
    } else {
      const stats = model.dsu.stats();
      items = [
        ['元素', stats.n],
        ['集合', stats.components],
        ['最大秩', stats.maxRank],
        ['操作', `${stats.finds} find / ${stats.unions} union`],
      ];
      statusText = '按秩合并 · 路径压缩';
    }

    DOM.metrics.replaceChildren();
    for (const [label, value] of items) {
      const item = Lab.el('div', 'struct-metric');
      item.append(Lab.el('span', '', label), Lab.el('strong', '', String(value)));
      DOM.metrics.appendChild(item);
    }
    DOM.invariantStatusText.textContent = statusText;
    DOM.invariantStatus.classList.toggle('is-warning', warning);
    DOM.metricNote.textContent = step ? step.message : (modeState.mode ? MODE_DEFS[modeState.mode].idleMessage : '');
    DOM.stateChip.dataset.kind = 'init';
    DOM.stateChip.textContent = 'LIVE';
  }

  function setActiveLines(lineRange) {
    const lines = new Set(Array.isArray(lineRange) ? lineRange : []);
    Array.from(DOM.pseudoCode.children).forEach((row, index) => {
      row.classList.toggle('is-active', lines.has(index + 1));
    });
    Lab.scrollActiveLine(DOM.pseudoCode);
  }

  function phaseText(step) {
    if (!step) return '—';
    if (step.kind) return step.kind;
    if (step.message.includes('旋转')) return '旋转';
    if (step.message.includes('染') || step.message.includes('变黑') || step.message.includes('变红')) return '染色';
    if (step.message.includes('查找') || step.message.includes('命中')) return '查找';
    if (step.message.includes('比较')) return '比较';
    if (step.message.includes('完成')) return '完成';
    return '调整';
  }

  function render() {
    const model = currentModel();
    if (!model) return;
    DOM.stage.dataset.structure = model.type;
    const operation = modeState.operation;
    const step = operation ? operation.steps[operation.index] : null;
    let snapshot;
    if (model.type === 'tree') {
      snapshot = step || model.tree.snapshot();
      renderTree(model, snapshot);
    } else if (model.type === 'heap') {
      snapshot = step || model.heap.snapshot();
      renderHeap(model, snapshot);
    } else {
      snapshot = step || model.dsu.snapshot();
      renderUf(model, snapshot);
    }

    const message = step ? step.message : MODE_DEFS[modeState.mode].idleMessage;
    DOM.message.textContent = message;
    if (model.type === 'tree') DOM.dataLabel.textContent = `${snapshot.stats.size} 个节点 · seed ${model.params.seed}`;
    else if (model.type === 'heap') DOM.dataLabel.textContent = `${model.heap.size} 个元素 · 根 ${model.heap.size ? model.heap.values[0] : '—'}`;
    else DOM.dataLabel.textContent = `${model.dsu.n} 个元素 · ${model.dsu.components} 个集合`;
    DOM.phase.textContent = phaseText(step);
    setActiveLines(step ? (step.lineRange || [step.line]) : []);
    renderMetrics(model, snapshot, step);

    const total = operation ? operation.steps.length : 0;
    const index = operation ? operation.index : 0;
    const progress = total <= 1 ? (total === 1 ? 100 : 0) : Math.round((index / (total - 1)) * 100);
    DOM.progressFill.style.width = `${progress}%`;
    DOM.progressValue.textContent = `${progress}%`;
    DOM.progressTrack.setAttribute('aria-valuenow', String(progress));
    DOM.stepLabel.textContent = total ? `步骤 ${index} / ${total - 1}` : '等待操作';
    updateTransport();

    const terminal = total > 0 && index >= total - 1;
    let runKind = 'init';
    let runLabel = 'READY';
    if (terminal) {
      runKind = 'done';
      runLabel = 'DONE';
    } else if (modeState.player && modeState.player.isPlaying()) {
      runKind = 'update';
      runLabel = 'RUNNING';
    } else if (index > 0) {
      runKind = 'keep';
      runLabel = 'PAUSED';
    }
    DOM.runState.dataset.kind = runKind;
    DOM.runState.textContent = runLabel;
  }

  function updateTransport() {
    const operation = modeState.operation;
    const total = operation ? operation.steps.length : 0;
    const index = operation ? operation.index : 0;
    const playing = modeState.player ? modeState.player.isPlaying() : false;
    const atEnd = total > 0 && index >= total - 1;
    DOM.playBtn.disabled = total === 0;
    DOM.stepBtn.disabled = total === 0 || playing;
    DOM.resetBtn.disabled = total === 0;
    DOM.playBtn.dataset.state = playing ? 'playing' : 'idle';
    DOM.playLabel.textContent = playing ? '暂停' : atEnd ? '重放' : index > 0 ? '继续' : '播放';
    DOM.playBtn.setAttribute('aria-label', playing ? '暂停操作动画' : '播放操作动画');
  }

  function updateProfile() {
    const def = MODE_DEFS[modeState.mode];
    const meta = def.meta;
    Lab.setLevelBadge(DOM.levelBadge, meta.level);
    Lab.setLevelBadge(DOM.profileLevel, meta.level);
    DOM.stageTitle.textContent = def.stageTitle;
    DOM.stageEyebrow.textContent = def.eyebrow;
    DOM.algorithmLabel.textContent = meta.en;
    DOM.codeAlgorithm.textContent = meta.en;
    DOM.time.textContent = meta.time;
    DOM.space.textContent = meta.space;
    DOM.levelText.textContent = `${meta.level} · ${levelName(meta.level)}`;
    DOM.invariantText.textContent = def.coreInvariant;
    DOM.insight.textContent = def.insight;
    DOM.description.textContent = meta.description;
    DOM.profileTags.replaceChildren();
    for (const tag of def.tags) DOM.profileTags.appendChild(Lab.el('span', '', tag));
    Lab.renderCode(DOM.pseudoCode, def.code(), []);
    DOM.opHint.textContent = def.opHint;
    for (const button of DOM.tabs.querySelectorAll('.lab-entry')) {
      const active = button.dataset.algorithm === modeState.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function updateDataSummaryForCurrent() {
    const model = currentModel();
    if (!model) return;
    DOM.seedBadge.textContent = `seed ${model.params.seed}`;
    DOM.dataSummary.textContent = MODE_DEFS[modeState.mode].summary(model);
  }

  function ensureModel(mode) {
    if (!modeState.models[mode]) {
      const def = MODE_DEFS[mode];
      const params = Object.fromEntries(def.fields.map((field) => [field.key, field.default]));
      modeState.models[mode] = makeModel(mode, params);
    }
    return modeState.models[mode];
  }

  function switchMode(mode, writeHash) {
    if (!MODE_DEFS[mode] || mode === modeState.mode) return;
    if (modeState.player) modeState.player.pause();
    modeState.mode = mode;
    modeState.operation = null;
    ensureModel(mode);
    const model = currentModel();
    updateProfile();
    buildParamForm(model.params);
    buildOperations();
    updateDataSummary();
    render();
    if (writeHash) Lab.writeMode(mode);
  }

  function generateNew(useRandomSeed) {
    if (useRandomSeed) {
      const seedInput = document.getElementById('structParam-seed');
      if (seedInput) seedInput.value = String(Lab.randomSeed());
    }
    const params = readParams();
    try {
      modeState.models[modeState.mode] = makeModel(modeState.mode, params);
    } catch (error) {
      DOM.message.textContent = `生成失败：${error.message}`;
      return;
    }
    if (modeState.player) modeState.player.pause();
    modeState.operation = null;
    const model = currentModel();
    buildParamForm(model.params);
    buildOperations();
    updateDataSummary();
    render();
  }

  function clearStructure() {
    if (modeState.player) modeState.player.pause();
    const model = currentModel();
    modeState.operation = null;
    if (model.type === 'tree') {
      model.tree.clear();
      model.keys = [];
    } else if (model.type === 'heap') {
      model.heap = new MinHeap();
    } else {
      model.dsu = new DSU(model.dsu.n);
    }
    DOM.opKind.textContent = 'READY';
    updateDataSummary();
    render();
  }

  function populateTabs() {
    DOM.tabs.replaceChildren();
    for (const mode of MODE_ORDER) {
      const def = MODE_DEFS[mode];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lab-entry';
      button.dataset.algorithm = mode;
      button.setAttribute('aria-pressed', 'false');
      button.append(
        Lab.el('span', '', def.meta.name),
        Lab.el('small', '', def.meta.level)
      );
      button.addEventListener('click', () => switchMode(mode, true));
      DOM.tabs.appendChild(button);
    }
  }

  function setupPlayer() {
    modeState.player = Lab.createTimelinePlayer({
      getTotal: () => (modeState.operation ? modeState.operation.steps.length : 0),
      getIndex: () => (modeState.operation ? modeState.operation.index : 0),
      setIndex: (index) => {
        if (modeState.operation) modeState.operation.index = index;
      },
      render,
      getDelay: () => 680,
      getBatchSize: () => 1,
      onPlayStateChange: (event) => {
        if (event !== 'tick') render();
      },
    });
  }

  function bindEvents() {
    DOM.playBtn.addEventListener('click', () => {
      if (!modeState.operation) return;
      modeState.player.toggle();
    });
    DOM.stepBtn.addEventListener('click', () => {
      if (!modeState.operation) return;
      if (modeState.operation.index >= modeState.operation.steps.length - 1) {
        modeState.player.reset();
      }
      modeState.player.step();
    });
    DOM.resetBtn.addEventListener('click', () => {
      if (modeState.operation) modeState.player.reset();
    });
    DOM.generateBtn.addEventListener('click', () => generateNew(false));
    DOM.randomSeedBtn.addEventListener('click', () => generateNew(true));
    DOM.clearBtn.addEventListener('click', clearStructure);

    document.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target.closest('input, select, textarea, button, a')) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (modeState.operation) modeState.player.toggle();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (modeState.operation) modeState.player.step();
      }
    });

    window.addEventListener('hashchange', () => {
      const next = Lab.readMode(MODE_ORDER, modeState.mode);
      switchMode(next, false);
    });
  }

  function init() {
    populateTabs();
    modeState.mode = Lab.readMode(MODE_ORDER, 'bst');
    ensureModel(modeState.mode);
    updateProfile();
    buildParamForm(currentModel().params);
    buildOperations();
    updateDataSummary();
    setupPlayer();
    bindEvents();
    render();
  }

  try {
    init();
  } catch (error) {
    console.error(error);
    if (DOM.stage) DOM.stage.textContent = `初始化失败：${error.message}`;
  }
})();
