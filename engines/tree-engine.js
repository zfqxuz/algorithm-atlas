/*
 * TreeEngine — dependency-free, step-traced binary search trees.
 *
 * Supported trees:
 *   bst — plain binary search tree (insert/search only)
 *   avl — AVL tree with iterative height maintenance and rotations
 *   rb  — red-black tree with CLRS-style insertion fixup
 *
 * Every trace step is a complete, immutable-by-copy snapshot. Node IDs are
 * stable for the whole lifetime of a tree (including across clear()), so a
 * front-end can animate steps using IDs as keys.
 */
(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else if (root) {
    root.TreeEngine = api;
  }
  // In a browser `window` is usually `root`, but assigning explicitly keeps
  // the UMD contract obvious and also works in sandboxed test harnesses.
  if (typeof window !== 'undefined') {
    window.TreeEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TYPE_ORDER = ['bst', 'avl', 'rb'];

  const ALGORITHMS = Object.freeze(
    [
      {
        id: 'bst',
        name: '二叉搜索树',
        en: 'Binary Search Tree',
        level: 'L1',
        description:
          '按左小右大规则插入与查找，结构直观但不自动平衡，有序输入可能退化成链表。',
        time: '插入/查找：平均 O(log n)，最坏 O(n)',
        space: 'O(n)',
      },
      {
        id: 'avl',
        name: 'AVL 平衡树',
        en: 'AVL Tree',
        level: 'L2',
        description:
          '严格平衡的二叉搜索树，每次插入后回溯更新高度，并用单旋或双旋把平衡因子恢复到 -1、0 或 1。',
        time: '插入/查找：O(log n)，旋转：O(1)',
        space: 'O(n)',
      },
      {
        id: 'rb',
        name: '红黑树',
        en: 'Red-Black Tree',
        level: 'L3',
        description:
          '以颜色约束换取近似平衡：根为黑、红节点不能相邻，且所有根到空指针路径的黑色节点数相同。',
        time: '插入/查找：O(log n)，修正：O(1) 次旋转',
        space: 'O(n)',
      },
    ].map((entry) => Object.freeze(entry))
  );

  const META = Object.freeze(
    Object.fromEntries(ALGORITHMS.map((algorithm) => [algorithm.id, algorithm]))
  );

  /* ------------------------------------------------------------------ */
  /* Pseudocode definitions. Tags are converted to 1-based line ranges.  */
  /* The displayed pseudocode never contains line numbers.               */
  /* ------------------------------------------------------------------ */

  const PSEUDO_DEFINITIONS = {
    bst: [
      '// ——— 插入（二叉搜索树）———',
      { tag: 'insert', code: 'insert(key):' },
      { tag: 'init', code: '  parent ← null; node ← root' },
      { tag: 'while', code: '  while node ≠ null:' },
      { tag: 'parent', code: '    parent ← node' },
      { tag: 'eq', code: '    if key = node.key:' },
      { tag: 'dup', code: '      return 未插入（忽略重复键）' },
      { tag: 'cmp', code: '    if key < node.key:' },
      { tag: 'goLeft', code: '      node ← node.left' },
      '    else:',
      { tag: 'goRight', code: '      node ← node.right' },
      { tag: 'create', code: '  new ← Node(key)' },
      { tag: 'attachRoot', code: '  if parent = null: root ← new' },
      { tag: 'attachLeft', code: '  else if key < parent.key: parent.left ← new' },
      { tag: 'attachRight', code: '  else: parent.right ← new' },
      { tag: 'size', code: '  size ← size + 1' },
      { tag: 'done', code: '  return 已插入' },
      '// ——— 查找（二叉搜索树）———',
      { tag: 'search', code: 'search(key):' },
      { tag: 'searchInit', code: '  node ← root' },
      { tag: 'searchWhile', code: '  while node ≠ null:' },
      { tag: 'searchEq', code: '    if key = node.key:' },
      { tag: 'found', code: '      return 找到' },
      { tag: 'searchCmp', code: '    if key < node.key:' },
      { tag: 'searchLeft', code: '      node ← node.left' },
      '    else:',
      { tag: 'searchRight', code: '      node ← node.right' },
      { tag: 'notFound', code: '  return 未找到' },
    ],
    avl: [
      '// ——— 插入（AVL 树）———',
      { tag: 'insert', code: 'insert(key):' },
      { tag: 'init', code: '  parent ← null; node ← root' },
      { tag: 'while', code: '  while node ≠ null:' },
      { tag: 'parent', code: '    parent ← node' },
      { tag: 'eq', code: '    if key = node.key:' },
      { tag: 'dup', code: '      return 未插入（忽略重复键）' },
      { tag: 'cmp', code: '    if key < node.key:' },
      { tag: 'goLeft', code: '      node ← node.left' },
      '    else:',
      { tag: 'goRight', code: '      node ← node.right' },
      { tag: 'create', code: '  new ← Node(key); new.height ← 1' },
      { tag: 'attachRoot', code: '  if parent = null: root ← new' },
      { tag: 'attachLeft', code: '  else if key < parent.key: parent.left ← new' },
      { tag: 'attachRight', code: '  else: parent.right ← new' },
      { tag: 'size', code: '  size ← size + 1' },
      { tag: 'retraceStart', code: '  node ← parent                       // 从新节点的父节点开始回溯' },
      { tag: 'retraceWhile', code: '  while node ≠ null:' },
      { tag: 'updateHeight', code: '    updateHeight(node)                 // height = 1 + max(h(left), h(right))' },
      { tag: 'balance', code: '    bf ← height(node.left) − height(node.right)' },
      { tag: 'leftHeavy', code: '    if bf > 1:                         // 左重' },
      { tag: 'lrTest', code: '      if height(node.left.left) < height(node.left.right):' },
      { tag: 'rotateLeftChild', code: '        rotateLeft(node.left); rotations += 1' },
      { tag: 'rotateRightNode', code: '      node ← rotateRight(node); rotations += 1' },
      { tag: 'rightHeavy', code: '    else if bf < −1:                   // 右重' },
      { tag: 'rlTest', code: '      if height(node.right.left) > height(node.right.right):' },
      { tag: 'rotateRightChild', code: '        rotateRight(node.right); rotations += 1' },
      { tag: 'rotateLeftNode', code: '      node ← rotateLeft(node); rotations += 1' },
      { tag: 'up', code: '    node ← node.parent' },
      { tag: 'done', code: '  return 已插入' },
      '// 单旋会重新挂接父子指针，并更新受影响节点的高度。',
      { tag: 'helper', code: 'rotateRight(y): x ← y.left; y.left ← x.right; x.right ← y; 更新高度; return x' },
      'rotateLeft(x): y ← x.right; x.right ← y.left; y.left ← x; 更新高度; return y',
      '// ——— 查找（AVL 树，与 BST 相同）———',
      { tag: 'search', code: 'search(key):' },
      { tag: 'searchInit', code: '  node ← root' },
      { tag: 'searchWhile', code: '  while node ≠ null:' },
      { tag: 'searchEq', code: '    if key = node.key:' },
      { tag: 'found', code: '      return 找到' },
      { tag: 'searchCmp', code: '    if key < node.key:' },
      { tag: 'searchLeft', code: '      node ← node.left' },
      '    else:',
      { tag: 'searchRight', code: '      node ← node.right' },
      { tag: 'notFound', code: '  return 未找到' },
    ],
    rb: [
      '// ——— 插入（红黑树）———',
      { tag: 'insert', code: 'insert(key):' },
      { tag: 'init', code: '  parent ← null; node ← root' },
      { tag: 'while', code: '  while node ≠ null:' },
      { tag: 'parent', code: '    parent ← node' },
      { tag: 'eq', code: '    if key = node.key:' },
      { tag: 'dup', code: '      return 未插入（忽略重复键）' },
      { tag: 'cmp', code: '    if key < node.key:' },
      { tag: 'goLeft', code: '      node ← node.left' },
      '    else:',
      { tag: 'goRight', code: '      node ← node.right' },
      { tag: 'create', code: '  new ← Node(key); new.color ← RED' },
      { tag: 'attachRoot', code: '  if parent = null: root ← new' },
      { tag: 'attachLeft', code: '  else if key < parent.key: parent.left ← new' },
      { tag: 'attachRight', code: '  else: parent.right ← new' },
      { tag: 'size', code: '  size ← size + 1' },
      { tag: 'fixupCall', code: '  fixInsert(new)' },
      { tag: 'done', code: '  return 已插入' },
      '// ——— 红黑修正 fixInsert(z) ———',
      { tag: 'fixupDef', code: 'fixInsert(z):' },
      { tag: 'fixLoop', code: '  while z.parent ≠ null and z.parent.color = RED:' },
      { tag: 'parentGrand', code: '    p ← z.parent; g ← p.parent' },
      { tag: 'parentIsLeft', code: '    if p = g.left:' },
      { tag: 'uncleLeft', code: '      u ← g.right' },
      { tag: 'redUncleL', code: '      if u ≠ null and u.color = RED:' },
      { tag: 'recolorParentUncleL', code: '        p.color ← BLACK; u.color ← BLACK' },
      { tag: 'recolorGrandL', code: '        g.color ← RED; z ← g' },
      { tag: 'blackUncleL', code: '      else:' },
      { tag: 'zigzagL', code: '        if z = p.right:' },
      { tag: 'rotateLeftZ', code: '          z ← p; LEFT-ROTATE(z)' },
      { tag: 'paintParentL', code: '        p ← z.parent; p.color ← BLACK' },
      { tag: 'paintGrandL', code: '        g ← p.parent; g.color ← RED' },
      { tag: 'rotateRightG', code: '        RIGHT-ROTATE(g)' },
      { tag: 'parentIsRight', code: '    else:' },
      { tag: 'uncleRight', code: '      u ← g.left' },
      { tag: 'redUncleR', code: '      if u ≠ null and u.color = RED:' },
      { tag: 'recolorParentUncleR', code: '        p.color ← BLACK; u.color ← BLACK' },
      { tag: 'recolorGrandR', code: '        g.color ← RED; z ← g' },
      { tag: 'blackUncleR', code: '      else:' },
      { tag: 'zigzagR', code: '        if z = p.left:' },
      { tag: 'rotateRightZ', code: '          z ← p; RIGHT-ROTATE(z)' },
      { tag: 'paintParentR', code: '        p ← z.parent; p.color ← BLACK' },
      { tag: 'paintGrandR', code: '        g ← p.parent; g.color ← RED' },
      { tag: 'rotateLeftG', code: '        LEFT-ROTATE(g)' },
      { tag: 'rootBlack', code: '  root.color ← BLACK' },
      { tag: 'fixDone', code: '  return' },
      '// ——— 查找（红黑树，与 BST 相同）———',
      { tag: 'search', code: 'search(key):' },
      { tag: 'searchInit', code: '  node ← root' },
      { tag: 'searchWhile', code: '  while node ≠ null:' },
      { tag: 'searchEq', code: '    if key = node.key:' },
      { tag: 'found', code: '      return 找到' },
      { tag: 'searchCmp', code: '    if key < node.key:' },
      { tag: 'searchLeft', code: '      node ← node.left' },
      '    else:',
      { tag: 'searchRight', code: '      node ← node.right' },
      { tag: 'notFound', code: '  return 未找到' },
    ],
  };

  const PSEUDO = Object.create(null);
  for (const type of TYPE_ORDER) {
    const lines = Object.create(null);
    const code = PSEUDO_DEFINITIONS[type].map((entry, index) => {
      if (typeof entry === 'string') return entry;
      lines[entry.tag] = index + 1;
      return entry.code;
    });
    PSEUDO[type] = Object.freeze({
      code: Object.freeze(code),
      lines: Object.freeze(lines),
    });
  }

  function makeRanges(type) {
    const L = PSEUDO[type].lines;
    const ranges = {
      compareLeft: [L.eq, L.goLeft],
      compareRight: [L.eq, L.goRight],
      duplicate: [L.eq, L.dup],
      attachRoot: [L.create, L.attachRoot],
      attachBranch: [L.create, L.attachRight],
      done: [L.done, L.done],
      searchCompareLeft: [L.searchEq, L.searchLeft],
      searchCompareRight: [L.searchEq, L.searchRight],
      searchFound: [L.searchEq, L.found],
      searchNotFound: [L.notFound, L.notFound],
    };

    for (const [name, range] of Object.entries(ranges)) {
      if (
        !Array.isArray(range) ||
        range.some(
          (line) =>
            !Number.isInteger(line) || line < 1 || line > PSEUDO[type].code.length
        )
      ) {
        throw new Error(
          `TreeEngine internal error: invalid pseudocode range ${type}.${name}`
        );
      }
    }

    return Object.freeze(
      Object.fromEntries(
        Object.entries(ranges).map(([name, range]) => [name, Object.freeze(range)])
      )
    );
  }

  const RANGES = Object.freeze(
    Object.fromEntries(TYPE_ORDER.map((type) => [type, makeRanges(type)]))
  );

  const NEUTRAL_LINE_RANGE = Object.freeze([1, 1]);

  /* ------------------------------------------------------------------ */
  /* Utilities                                                          */
  /* ------------------------------------------------------------------ */

  function assertType(type) {
    if (!TYPE_ORDER.includes(type)) {
      throw new RangeError(
        `TreeEngine: unknown tree type ${JSON.stringify(type)}; expected bst, avl or rb.`
      );
    }
  }

  function assertKey(key) {
    if (typeof key !== 'number' || !Number.isFinite(key) || !Number.isInteger(key)) {
      throw new TypeError('TreeEngine: keys must be finite integers.');
    }
  }

  function uniqueIds(ids) {
    return Array.from(
      new Set(
        ids.filter((id) => id !== null && id !== undefined && id !== '')
      )
    );
  }

  /* Deterministic PRNG (Mulberry32). */
  function mulberry32(seed) {
    let state = seed >>> 0;
    return function nextRandom() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------ */
  /* Public key generation                                              */
  /* ------------------------------------------------------------------ */

  function generateKeys(params) {
    if (params === undefined || params === null) params = {};
    if (typeof params !== 'object' || Array.isArray(params)) {
      throw new TypeError('TreeEngine.generateKeys: params must be an object.');
    }

    const count = params.count === undefined ? 12 : params.count;
    const min = params.min === undefined ? 1 : params.min;
    const max = params.max === undefined ? 99 : params.max;
    const seed = params.seed === undefined ? 1 : params.seed;

    if (!Number.isSafeInteger(count) || count < 0) {
      throw new RangeError('TreeEngine.generateKeys: count must be a non-negative integer.');
    }
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
      throw new RangeError('TreeEngine.generateKeys: min and max must be safe integers.');
    }
    if (min > max) {
      throw new RangeError('TreeEngine.generateKeys: min must not exceed max.');
    }
    if (typeof seed !== 'number' || !Number.isFinite(seed)) {
      throw new TypeError('TreeEngine.generateKeys: seed must be a finite number.');
    }

    const rangeSize = max - min + 1;
    if (!Number.isSafeInteger(rangeSize) || rangeSize < 1) {
      throw new RangeError('TreeEngine.generateKeys: key range is too large to sample safely.');
    }
    if (count > rangeSize) {
      throw new RangeError(
        `TreeEngine.generateKeys: cannot produce ${count} unique keys from the range [${min}, ${max}].`
      );
    }

    // Sparse partial Fisher–Yates: O(count) time and memory even when the
    // integer interval itself is huge. Every returned key is unique.
    const random = mulberry32(Math.trunc(seed));
    const swapped = new Map();
    const valueAt = (index) => (swapped.has(index) ? swapped.get(index) : index);
    const result = [];

    for (let index = 0; index < count; index += 1) {
      const pick = index + Math.floor(random() * (rangeSize - index));
      const valueAtIndex = valueAt(index);
      const valueAtPick = valueAt(pick);
      swapped.set(index, valueAtPick);
      swapped.set(pick, valueAtIndex);
      result.push(min + valueAtPick);
    }

    return result;
  }

  /* ------------------------------------------------------------------ */
  /* Trees                                                              */
  /* ------------------------------------------------------------------ */

  class BaseTree {
    constructor(type) {
      assertType(type);
      this.type = type;
      this.root = null;
      this._size = 0;
      this._rotations = 0;
      this._recolors = 0;
      this._nextId = 1;
      this._ranges = RANGES[type];
      this._lines = PSEUDO[type].lines;
    }

    /* ---------- internal node helpers ---------- */

    _makeNode(key, color) {
      const node = {
        id: `n${this._nextId}`,
        key,
        left: null,
        right: null,
        parent: null,
        height: 1,
        color: color === undefined ? null : color,
      };
      this._nextId += 1;
      return node;
    }

    _nodeHeight(node) {
      return node ? node.height : 0;
    }

    _updateHeight(node) {
      if (!node) return;
      node.height = 1 + Math.max(this._nodeHeight(node.left), this._nodeHeight(node.right));
    }

    _balanceOf(node) {
      if (!node) return 0;
      return this._nodeHeight(node.left) - this._nodeHeight(node.right);
    }

    _rotateLeft(x) {
      const y = x && x.right;
      if (!x || !y) {
        throw new Error('TreeEngine internal error: invalid left rotation.');
      }

      const parent = x.parent;
      const wasLeftChild = parent ? parent.left === x : false;

      x.right = y.left;
      if (y.left) y.left.parent = x;

      y.left = x;
      x.parent = y;
      y.parent = parent;

      if (!parent) this.root = y;
      else if (wasLeftChild) parent.left = y;
      else parent.right = y;

      this._updateHeight(x);
      this._updateHeight(y);
      this._rotations += 1;
      return y;
    }

    _rotateRight(y) {
      const x = y && y.left;
      if (!y || !x) {
        throw new Error('TreeEngine internal error: invalid right rotation.');
      }

      const parent = y.parent;
      const wasLeftChild = parent ? parent.left === y : false;

      y.left = x.right;
      if (x.right) x.right.parent = y;

      x.right = y;
      y.parent = x;
      x.parent = parent;

      if (!parent) this.root = x;
      else if (wasLeftChild) parent.left = x;
      else parent.right = x;

      this._updateHeight(y);
      this._updateHeight(x);
      this._rotations += 1;
      return x;
    }

    _paint(node, color) {
      if (!node) return;
      if (node.color !== color) {
        node.color = color;
        this._recolors += 1;
      }
    }

    _pathTo(node) {
      const path = [];
      for (let current = node; current; current = current.parent) {
        path.push(current.id);
      }
      path.reverse();
      return path;
    }

    _nodesInOrder() {
      const nodes = [];
      const visit = (node) => {
        if (!node) return;
        visit(node.left);
        nodes.push(node);
        visit(node.right);
      };
      visit(this.root);
      return nodes;
    }

    _inorderKeys() {
      return this._nodesInOrder().map((node) => node.key);
    }

    _treeHeight(node) {
      if (!node) return 0;
      return 1 + Math.max(this._treeHeight(node.left), this._treeHeight(node.right));
    }

    _balancedHeight(node) {
      if (!node) return 0;
      const leftHeight = this._balancedHeight(node.left);
      if (leftHeight < 0) return -1;
      const rightHeight = this._balancedHeight(node.right);
      if (rightHeight < 0) return -1;
      if (Math.abs(leftHeight - rightHeight) > 1) return -1;
      return 1 + Math.max(leftHeight, rightHeight);
    }

    _blackHeight(node) {
      if (!node) return 0;
      const left = this._blackHeight(node.left);
      if (left < 0) return -1;
      const right = this._blackHeight(node.right);
      if (right < 0) return -1;
      if (left !== right) return -1;
      return left + (node.color === 'black' ? 1 : 0);
    }

    /* ---------- metrics and snapshots ---------- */

    stats() {
      const stats = {
        size: this._size,
        height: this._treeHeight(this.root),
        rotations: this._rotations,
        recolors: this._recolors,
      };

      if (this.type === 'rb') {
        // Number of black nodes on a root-to-null path (root included).
        stats.blackHeight = this._blackHeight(this.root);
      } else {
        stats.isBalanced = this._balancedHeight(this.root) >= 0;
      }

      return stats;
    }

    _snapshot(overrides) {
      const options = overrides || {};
      const nodes = this._nodesInOrder().map((node) => ({
        id: node.id,
        key: node.key,
        color: this.type === 'rb' ? node.color : null,
        leftId: node.left ? node.left.id : null,
        rightId: node.right ? node.right.id : null,
        parentId: node.parent ? node.parent.id : null,
      }));

      return {
        type: this.type,
        nodes,
        rootId: this.root ? this.root.id : null,
        highlights: uniqueIds(Array.isArray(options.highlights) ? options.highlights : []),
        activeId: options.activeId === undefined ? null : options.activeId,
        message: typeof options.message === 'string' ? options.message : '',
        detail: typeof options.detail === 'string' ? options.detail : '',
        lineRange: Array.isArray(options.lineRange)
          ? options.lineRange.slice()
          : NEUTRAL_LINE_RANGE.slice(),
        stats: this.stats(),
      };
    }

    snapshot() {
      const meta = META[this.type];
      return this._snapshot({
        highlights: [],
        activeId: null,
        message: `当前${meta.name}：${this._size} 个节点。`,
        detail: this.root
          ? `根节点为 ${this.root.key}（${this.root.id}）。`
          : '树为空，等待插入。',
        lineRange: NEUTRAL_LINE_RANGE,
      });
    }

    clear() {
      this.root = null;
      this._size = 0;
      this._rotations = 0;
      this._recolors = 0;
      // IDs intentionally remain unique across the whole tree lifetime.
      return this;
    }

    /* ---------- insertion ---------- */

    _insertDoneMessage(key) {
      if (this.type === 'avl') {
        return `插入 ${key} 完成：AVL 平衡因子已恢复。`;
      }
      if (this.type === 'rb') {
        return `插入 ${key} 完成：红黑性质已恢复。`;
      }
      return `插入 ${key} 完成：二叉搜索树中序有序。`;
    }

    insert(key) {
      assertKey(key);

      const steps = [];
      const path = [];
      let current = this.root;
      let parent = null;
      let comparisons = 0;

      while (current) {
        comparisons += 1;
        path.push(current.id);

        if (key === current.key) {
          const finalState = this._snapshot({
            highlights: path.slice(),
            activeId: current.id,
            message: `键 ${key} 已存在，忽略重复插入。`,
            detail: `重复键命中节点 ${current.id}；树保持不变，未创建新节点。`,
            lineRange: this._ranges.duplicate,
          });
          steps.push(finalState);
          return { steps, inserted: false, finalState };
        }

        parent = current;
        const goLeft = key < current.key;
        steps.push(
          this._snapshot({
            highlights: path.slice(),
            activeId: current.id,
            message: `比较 ${key} 与 ${current.key}：${goLeft ? '向左' : '向右'}。`,
            detail: goLeft
              ? `${key} < ${current.key}，进入左子树。`
              : `${key} > ${current.key}，进入右子树。`,
            lineRange: goLeft ? this._ranges.compareLeft : this._ranges.compareRight,
          })
        );

        current = goLeft ? current.left : current.right;
      }

      const node = this._makeNode(key, this.type === 'rb' ? 'red' : null);
      node.parent = parent;

      if (!parent) {
        this.root = node;
      } else if (key < parent.key) {
        parent.left = node;
      } else {
        parent.right = node;
      }
      this._size += 1;

      const attachDetail =
        this.type === 'bst'
          ? '二叉搜索树无需再平衡，本次插入完成。'
          : this.type === 'avl'
            ? '从新节点的父节点开始回溯，更新高度并检查平衡因子。'
            : '新节点初始为红色，开始执行红黑修正。';

      steps.push(
        this._snapshot({
          highlights: path.concat(node.id),
          activeId: node.id,
          message: parent
            ? `创建节点 ${node.id}（${key}），挂接到 ${parent.key} 的${key < parent.key ? '左' : '右'}子树。`
            : `树为空，创建根节点 ${node.id}（${key}）。`,
          detail: attachDetail,
          lineRange: parent ? this._ranges.attachBranch : this._ranges.attachRoot,
        })
      );

      this._afterInsert(node, parent, path, steps);

      const finalStats = this.stats();
      const finalState = this._snapshot({
        highlights: [node.id],
        activeId: node.id,
        message: this._insertDoneMessage(key),
        detail:
          `本次插入比较 ${comparisons} 个节点；树高 ${finalStats.height}，` +
          `累计旋转 ${finalStats.rotations} 次、变色 ${finalStats.recolors} 次。`,
        lineRange: this._ranges.done,
      });
      steps.push(finalState);

      return { steps, inserted: true, finalState };
    }

    _afterInsert() {
      // BST: no rebalancing required.
    }

    /* ---------- search ---------- */

    search(key) {
      assertKey(key);

      const steps = [];
      const path = [];
      let current = this.root;
      let comparisons = 0;

      while (current) {
        comparisons += 1;
        path.push(current.id);

        if (key === current.key) {
          const finalState = this._snapshot({
            highlights: path.slice(),
            activeId: current.id,
            message: `查找 ${key} 成功：命中节点 ${current.key}。`,
            detail: `共比较 ${comparisons} 个节点，查找路径高亮显示。`,
            lineRange: this._ranges.searchFound,
          });
          steps.push(finalState);
          return { steps, found: true };
        }

        const goLeft = key < current.key;
        steps.push(
          this._snapshot({
            highlights: path.slice(),
            activeId: current.id,
            message: `比较 ${key} 与 ${current.key}：${goLeft ? '向左' : '向右'}。`,
            detail: goLeft
              ? `${key} < ${current.key}，继续查找左子树。`
              : `${key} > ${current.key}，继续查找右子树。`,
            lineRange: goLeft
              ? this._ranges.searchCompareLeft
              : this._ranges.searchCompareRight,
          })
        );

        current = goLeft ? current.left : current.right;
      }

      const finalState = this._snapshot({
        highlights: path.slice(),
        activeId: null,
        message:
          comparisons === 0
            ? `树为空，查找 ${key} 失败。`
            : `查找 ${key} 失败：到达空子节点。`,
        detail:
          comparisons === 0
            ? '没有可比较的节点。'
            : `共比较 ${comparisons} 个节点，未找到目标键。`,
        lineRange: this._ranges.searchNotFound,
      });
      steps.push(finalState);

      return { steps, found: false };
    }
  }

  class BSTTree extends BaseTree {
    constructor() {
      super('bst');
    }
  }

  class AVLTree extends BaseTree {
    constructor() {
      super('avl');
    }

    _afterInsert(node, parent, path, steps) {
      const L = this._lines;
      let cursor = parent;

      while (cursor) {
        this._updateHeight(cursor);
        const balance = this._balanceOf(cursor);
        const isUnbalanced = balance > 1 || balance < -1;

        let updateRange;
        if (balance > 1) {
          updateRange = [L.updateHeight, L.leftHeavy];
        } else if (balance < -1) {
          updateRange = [L.updateHeight, L.rightHeavy];
        } else {
          updateRange = [L.updateHeight, L.balance];
        }

        steps.push(
          this._snapshot({
            highlights: this._pathTo(cursor),
            activeId: cursor.id,
            message: isUnbalanced
              ? `回溯：节点 ${cursor.key} 失衡（BF=${balance}），执行旋转。`
              : `回溯：节点 ${cursor.key} 高度=${this._nodeHeight(cursor)}，BF=${balance}，保持平衡。`,
            detail: isUnbalanced
              ? '高度已更新；旋转会修复该子树，然后继续向根回溯。'
              : '该节点满足 AVL 平衡条件，继续检查父节点。',
            lineRange: updateRange,
          })
        );

        if (balance > 1) {
          const pivot = cursor;
          const left = pivot.left;
          let isZigzag = false;

          if (this._balanceOf(left) < 0) {
            isZigzag = true;
            const firstPivot = left;
            const newChildRoot = this._rotateLeft(firstPivot);
            steps.push(
              this._snapshot({
                highlights: uniqueIds([
                  firstPivot.id,
                  newChildRoot.id,
                  pivot.id,
                  ...this._pathTo(newChildRoot),
                ]),
                activeId: newChildRoot.id,
                message: `LR 型：先对左孩子 ${firstPivot.key} 左旋。`,
                detail: `旋转后 ${newChildRoot.key} 成为该子树的新根；累计旋转 ${this._rotations} 次。`,
                lineRange: [L.rotateLeftChild, L.rotateLeftChild],
              })
            );
          }

          const newRoot = this._rotateRight(pivot);
          steps.push(
            this._snapshot({
              highlights: uniqueIds([pivot.id, newRoot.id, ...this._pathTo(newRoot)]),
              activeId: newRoot.id,
              message: `${isZigzag ? 'LR' : 'LL'} 型：对 ${pivot.key} 右旋，${newRoot.key} 成为子树根。`,
              detail: `失衡子树已旋转修复；累计旋转 ${this._rotations} 次。`,
              lineRange: [L.rotateRightNode, L.rotateRightNode],
            })
          );

          cursor = newRoot.parent;
          continue;
        }

        if (balance < -1) {
          const pivot = cursor;
          const right = pivot.right;
          let isZigzag = false;

          if (this._balanceOf(right) > 0) {
            isZigzag = true;
            const firstPivot = right;
            const newChildRoot = this._rotateRight(firstPivot);
            steps.push(
              this._snapshot({
                highlights: uniqueIds([
                  firstPivot.id,
                  newChildRoot.id,
                  pivot.id,
                  ...this._pathTo(newChildRoot),
                ]),
                activeId: newChildRoot.id,
                message: `RL 型：先对右孩子 ${firstPivot.key} 右旋。`,
                detail: `旋转后 ${newChildRoot.key} 成为该子树的新根；累计旋转 ${this._rotations} 次。`,
                lineRange: [L.rotateRightChild, L.rotateRightChild],
              })
            );
          }

          const newRoot = this._rotateLeft(pivot);
          steps.push(
            this._snapshot({
              highlights: uniqueIds([pivot.id, newRoot.id, ...this._pathTo(newRoot)]),
              activeId: newRoot.id,
              message: `${isZigzag ? 'RL' : 'RR'} 型：对 ${pivot.key} 左旋，${newRoot.key} 成为子树根。`,
              detail: `失衡子树已旋转修复；累计旋转 ${this._rotations} 次。`,
              lineRange: [L.rotateLeftNode, L.rotateLeftNode],
            })
          );

          cursor = newRoot.parent;
          continue;
        }

        cursor = cursor.parent;
      }
    }
  }

  class RBTree extends BaseTree {
    constructor() {
      super('rb');
    }

    _afterInsert(node, parent, path, steps) {
      const L = this._lines;
      let z = node;

      while (z.parent !== null && z.parent.color === 'red') {
        const p = z.parent;
        const g = p.parent;

        // A red parent with a null grandparent can only occur transiently;
        // stop safely and let the root-black correction below finish.
        if (!g) break;

        if (p === g.left) {
          const uncle = g.right;

          if (uncle !== null && uncle.color === 'red') {
            this._paint(p, 'black');
            this._paint(uncle, 'black');
            this._paint(g, 'red');
            z = g;

            steps.push(
              this._snapshot({
                highlights: this._pathTo(z),
                activeId: z.id,
                message: `红叔情形（左）：父节点 ${p.key}、叔叔 ${uncle.key} 变黑，祖父 ${g.key} 变红。`,
                detail: `变色完成，从祖父节点继续向上检查；累计变色 ${this._recolors} 次。`,
                lineRange: [L.redUncleL, L.recolorGrandL],
              })
            );
          } else {
            let isZigzag = false;

            if (z === p.right) {
              isZigzag = true;
              z = p;
              const pivot = z;
              const newChildRoot = this._rotateLeft(pivot);

              steps.push(
                this._snapshot({
                  highlights: uniqueIds([pivot.id, newChildRoot.id, g.id]),
                  activeId: newChildRoot.id,
                  message: `LR 型：以 ${pivot.key} 为轴左旋。`,
                  detail: `旋转后 ${newChildRoot.key} 位于祖父 ${g.key} 的左子树；累计旋转 ${this._rotations} 次。`,
                  lineRange: [L.zigzagL, L.rotateLeftZ],
                })
              );
            }

            const newParent = z.parent;
            const grandparent = newParent ? newParent.parent : null;
            if (!newParent || !grandparent) break;

            this._paint(newParent, 'black');
            this._paint(grandparent, 'red');

            steps.push(
              this._snapshot({
                highlights: this._pathTo(newParent),
                activeId: newParent.id,
                message: `${isZigzag ? 'LR' : 'LL'} 型变色：父节点 ${newParent.key} 变黑，祖父 ${grandparent.key} 变红。`,
                detail: `准备对祖父 ${grandparent.key} 执行右旋；累计变色 ${this._recolors} 次。`,
                lineRange: [L.paintParentL, L.paintGrandL],
              })
            );

            const newRoot = this._rotateRight(grandparent);
            steps.push(
              this._snapshot({
                highlights: uniqueIds([
                  grandparent.id,
                  newRoot.id,
                  ...this._pathTo(newRoot),
                ]),
                activeId: newRoot.id,
                message: `${isZigzag ? 'LR' : 'LL'} 型：对 ${grandparent.key} 右旋，${newRoot.key} 成为子树新根。`,
                detail: `旋转完成；累计旋转 ${this._rotations} 次、变色 ${this._recolors} 次。`,
                lineRange: [L.rotateRightG, L.rotateRightG],
              })
            );

            // The new subtree root is black (its parent may be red, which is
            // allowed), so no further fixup is required.
            break;
          }
        } else {
          const uncle = g.left;

          if (uncle !== null && uncle.color === 'red') {
            this._paint(p, 'black');
            this._paint(uncle, 'black');
            this._paint(g, 'red');
            z = g;

            steps.push(
              this._snapshot({
                highlights: this._pathTo(z),
                activeId: z.id,
                message: `红叔情形（右）：父节点 ${p.key}、叔叔 ${uncle.key} 变黑，祖父 ${g.key} 变红。`,
                detail: `变色完成，从祖父节点继续向上检查；累计变色 ${this._recolors} 次。`,
                lineRange: [L.redUncleR, L.recolorGrandR],
              })
            );
          } else {
            let isZigzag = false;

            if (z === p.left) {
              isZigzag = true;
              z = p;
              const pivot = z;
              const newChildRoot = this._rotateRight(pivot);

              steps.push(
                this._snapshot({
                  highlights: uniqueIds([pivot.id, newChildRoot.id, g.id]),
                  activeId: newChildRoot.id,
                  message: `RL 型：以 ${pivot.key} 为轴右旋。`,
                  detail: `旋转后 ${newChildRoot.key} 位于祖父 ${g.key} 的右子树；累计旋转 ${this._rotations} 次。`,
                  lineRange: [L.zigzagR, L.rotateRightZ],
                })
              );
            }

            const newParent = z.parent;
            const grandparent = newParent ? newParent.parent : null;
            if (!newParent || !grandparent) break;

            this._paint(newParent, 'black');
            this._paint(grandparent, 'red');

            steps.push(
              this._snapshot({
                highlights: this._pathTo(newParent),
                activeId: newParent.id,
                message: `${isZigzag ? 'RL' : 'RR'} 型变色：父节点 ${newParent.key} 变黑，祖父 ${grandparent.key} 变红。`,
                detail: `准备对祖父 ${grandparent.key} 执行左旋；累计变色 ${this._recolors} 次。`,
                lineRange: [L.paintParentR, L.paintGrandR],
              })
            );

            const newRoot = this._rotateLeft(grandparent);
            steps.push(
              this._snapshot({
                highlights: uniqueIds([
                  grandparent.id,
                  newRoot.id,
                  ...this._pathTo(newRoot),
                ]),
                activeId: newRoot.id,
                message: `${isZigzag ? 'RL' : 'RR'} 型：对 ${grandparent.key} 左旋，${newRoot.key} 成为子树新根。`,
                detail: `旋转完成；累计旋转 ${this._rotations} 次、变色 ${this._recolors} 次。`,
                lineRange: [L.rotateLeftG, L.rotateLeftG],
              })
            );

            // The new subtree root is black (its parent may be red, which is
            // allowed), so no further fixup is required.
            break;
          }
        }
      }

      if (this.root && this.root.color !== 'black') {
        this._paint(this.root, 'black');
        steps.push(
          this._snapshot({
            highlights: this._pathTo(this.root),
            activeId: this.root.id,
            message: `根节点 ${this.root.key} 染黑。`,
            detail: `根节点必须为黑色；累计变色 ${this._recolors} 次。`,
            lineRange: [L.rootBlack, L.rootBlack],
          })
        );
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Public factory and module API                                      */
  /* ------------------------------------------------------------------ */

  function createTree(type) {
    assertType(type);
    if (type === 'bst') return new BSTTree();
    if (type === 'avl') return new AVLTree();
    return new RBTree();
  }

  function pseudocode(type) {
    assertType(type);
    return PSEUDO[type].code.slice();
  }

  return Object.freeze({
    ALGORITHMS,
    generateKeys,
    createTree,
    pseudocode,
  });
});
