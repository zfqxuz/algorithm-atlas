/*
 * Heap-based Dijkstra core with a step-by-step trace designed for visualization.
 * Works as a browser global (window.Dijkstra) and as a CommonJS module.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Dijkstra = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const INF = Infinity;

  function formatDistance(value) {
    return Number.isFinite(value) ? String(value) : '\u221e';
  }

  function validateGraph(graph) {
    if (!graph || typeof graph !== 'object') {
      throw new TypeError('Graph must be an object.');
    }
    if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
      throw new TypeError('Graph must contain at least one node.');
    }
    if (!Array.isArray(graph.edges)) {
      throw new TypeError('Graph.edges must be an array.');
    }

    const ids = new Set();
    for (const node of graph.nodes) {
      if (!node || typeof node.id !== 'string' || node.id.length === 0) {
        throw new TypeError('Every node needs a non-empty string id.');
      }
      if (ids.has(node.id)) {
        throw new TypeError(`Duplicate node id: ${node.id}`);
      }
      ids.add(node.id);
    }

    const seenEdges = new Set();
    for (const edge of graph.edges) {
      if (!edge || !ids.has(edge.u) || !ids.has(edge.v)) {
        throw new TypeError('Every edge must reference two existing nodes.');
      }
      if (edge.u === edge.v) {
        throw new TypeError(`Self loops are not supported: ${edge.u}`);
      }
      if (!Number.isFinite(edge.w) || edge.w <= 0) {
        throw new TypeError(`Edge ${edge.u}-${edge.v} needs a positive finite weight.`);
      }
      const key = edgeKey(edge.u, edge.v);
      if (seenEdges.has(key)) {
        throw new TypeError(`Duplicate edge: ${edge.u}-${edge.v}`);
      }
      seenEdges.add(key);
    }

    return graph;
  }

  function edgeKey(a, b) {
    return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
  }

  function buildAdjacency(graph) {
    const order = new Map();
    graph.nodes.forEach((node, index) => order.set(node.id, index));

    const adjacency = new Map();
    graph.nodes.forEach((node) => adjacency.set(node.id, []));

    for (const edge of graph.edges) {
      adjacency.get(edge.u).push({ to: edge.v, weight: edge.w });
      adjacency.get(edge.v).push({ to: edge.u, weight: edge.w });
    }

    for (const neighbours of adjacency.values()) {
      neighbours.sort((a, b) => order.get(a.to) - order.get(b.to));
    }

    return { adjacency, order };
  }

  /**
   * Indexed binary min-heap. Keys live in `dist`, so relaxing an edge only
   * requires updating the entry's position and sifting it upward.
   */
  class MinHeap {
    constructor(ids, dist, order) {
      this.heap = [];
      this.positions = new Map(ids.map((id) => [id, -1]));
      this.dist = dist;
      this.order = order;
    }

    size() {
      return this.heap.length;
    }

    has(id) {
      return this.positions.get(id) !== -1;
    }

    isLess(a, b) {
      if (this.dist[a] !== this.dist[b]) return this.dist[a] < this.dist[b];
      return this.order.get(a) < this.order.get(b);
    }

    insert(id) {
      if (this.has(id)) return;
      this.heap.push(id);
      const index = this.heap.length - 1;
      this.positions.set(id, index);
      this.siftUp(index);
    }

    decreaseKey(id) {
      const index = this.positions.get(id);
      if (index === undefined || index === -1) return;
      this.siftUp(index);
    }

    extractMin() {
      if (this.heap.length === 0) return null;
      const minimum = this.heap[0];
      this.removeAt(0);
      this.positions.set(minimum, -1);
      return minimum;
    }

    removeAt(index) {
      const last = this.heap.pop();
      if (index >= this.heap.length) return;
      this.heap[index] = last;
      this.positions.set(last, index);
      const parent = Math.floor((index - 1) / 2);
      if (index > 0 && this.isLess(this.heap[index], this.heap[parent])) {
        this.siftUp(index);
      } else {
        this.siftDown(index);
      }
    }

    siftUp(startIndex) {
      let index = startIndex;
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (!this.isLess(this.heap[index], this.heap[parent])) break;
        this.swap(index, parent);
        index = parent;
      }
    }

    siftDown(startIndex) {
      let index = startIndex;
      const length = this.heap.length;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;

        if (left < length && this.isLess(this.heap[left], this.heap[smallest])) {
          smallest = left;
        }
        if (right < length && this.isLess(this.heap[right], this.heap[smallest])) {
          smallest = right;
        }
        if (smallest === index) break;
        this.swap(index, smallest);
        index = smallest;
      }
    }

    swap(a, b) {
      const itemA = this.heap[a];
      const itemB = this.heap[b];
      this.heap[a] = itemB;
      this.heap[b] = itemA;
      this.positions.set(itemA, b);
      this.positions.set(itemB, a);
    }
  }

  function reconstructPath(prev, source, target) {
    if (source === target) return target === null ? [] : [source];
    if (prev[target] === null || prev[target] === undefined) return [];

    const path = [target];
    let cursor = target;
    const guard = Object.keys(prev).length + 1;

    while (cursor !== source) {
      cursor = prev[cursor];
      if (cursor === null || cursor === undefined) return [];
      path.push(cursor);
      if (path.length > guard) return [];
    }

    return path.reverse();
  }

  /**
   * Build every visible state transition for a shortest-path query.
   * Each state is an immutable snapshot: dist, prev, settled and queue
   * can be rendered without replaying previous steps.
   */
  function buildTrace(graph, source, target) {
    validateGraph(graph);

    const ids = graph.nodes.map((node) => node.id);
    if (!ids.includes(source)) throw new RangeError(`Unknown source node: ${source}`);
    if (target !== null && !ids.includes(target)) {
      throw new RangeError(`Unknown target node: ${target}`);
    }

    const { adjacency, order } = buildAdjacency(graph);
    const dist = Object.create(null);
    const prev = Object.create(null);
    const settled = new Set();
    const trace = [];

    for (const id of ids) {
      dist[id] = INF;
      prev[id] = null;
    }
    dist[source] = 0;

    const heap = new MinHeap(ids, dist, order);
    heap.insert(source);

    function makeState(partial) {
      const current = partial.current ?? null;
      const queue = ids
        .filter((id) => !settled.has(id) && id !== current && Number.isFinite(dist[id]))
        .map((id) => ({ id, distance: dist[id], previous: prev[id] }))
        .sort((a, b) => a.distance - b.distance || order.get(a.id) - order.get(b.id));

      return Object.assign(
        {
          kind: 'init',
          lineRange: [],
          current: null,
          activeEdge: null,
          relaxedNode: null,
          path: [],
          pathCost: null,
          dist: Object.assign(Object.create(null), dist),
          prev: Object.assign(Object.create(null), prev),
          settled: [...settled],
          queue,
          message: '',
          detail: '',
        },
        partial,
        {
          current,
          queue,
          dist: Object.assign(Object.create(null), dist),
          prev: Object.assign(Object.create(null), prev),
          settled: [...settled],
          path: partial.path ? [...partial.path] : [],
        }
      );
    }

    trace.push(
      makeState({
        kind: 'init',
        lineRange: [2, 3, 4],
        message: '初始化距离表',
        detail: `起点 ${source} 的距离设为 0；其余节点暂定为 \u221e。此时只有起点进入优先队列。`,
      })
    );

    while (true) {
      const u = heap.extractMin();

      if (u === null) {
        trace.push(
          makeState({
            kind: 'unreachable',
            lineRange: [14],
            message: '目标不可达',
            detail: `优先队列已经清空，但始终没有取出 ${target}。从 ${source} 出发无法到达目标。`,
          })
        );
        break;
      }

      const isTarget = u === target;
      settled.add(u);
      trace.push(
        makeState({
          kind: 'select',
          lineRange: [6],
          current: u,
          message: isTarget ? `目标 ${u} 出队` : `取出节点 ${u}`,
          detail: isTarget
            ? `目标节点的暂定距离 d = ${formatDistance(dist[u])}。它第一次出队时，这个距离就是最终最短路长度。`
            : `在所有未确定节点中，${u} 的暂定距离最小（d = ${formatDistance(dist[u])}），将它取出并固定。`,
        })
      );

      if (isTarget) {
        const path = reconstructPath(prev, source, u);
        trace.push(
          makeState({
            kind: 'done',
            lineRange: [7],
            current: u,
            path,
            pathCost: dist[u],
            message: '最短路径已确定',
            detail:
              path.length > 0
                ? `${path.join(' \u2192 ')}，总权重 ${formatDistance(dist[u])}。没有其他路径能给出更小的代价。`
                : '起点与终点相同，路径代价为 0。',
          })
        );
        break;
      }

      for (const neighbour of adjacency.get(u)) {
        const v = neighbour.to;
        if (settled.has(v)) continue;

        const weight = neighbour.weight;
        const alt = dist[u] + weight;
        const oldDistance = dist[v];
        const activeEdge = { from: u, to: v, weight };

        if (alt < dist[v]) {
          dist[v] = alt;
          prev[v] = u;
          if (heap.has(v)) {
            heap.decreaseKey(v);
          } else {
            heap.insert(v);
          }
          trace.push(
            makeState({
              kind: 'update',
              lineRange: [10, 11, 12, 13],
              current: u,
              activeEdge,
              relaxedNode: v,
              message: `松弛 ${u} \u2192 ${v}，d(${v}) = ${alt}`,
              detail: `${formatDistance(dist[u])} + ${weight} = ${alt} \u003c ${formatDistance(oldDistance)}；更新距离，并把前驱设为 ${u}。`,
            })
          );
        } else {
          trace.push(
            makeState({
              kind: 'keep',
              lineRange: [10, 11],
              current: u,
              activeEdge,
              relaxedNode: v,
              message: `保留 d(${v}) = ${formatDistance(dist[v])}`,
              detail: `经由 ${u} 到达 ${v} 的代价为 ${formatDistance(dist[u])} + ${weight} = ${alt}，不小于现有距离，因此不更新。`,
            })
          );
        }
      }
    }

    return trace;
  }

  function dijkstraShortestPath(graph, source, target) {
    const trace = buildTrace(graph, source, target);
    const finalState = trace[trace.length - 1];
    if (finalState.kind === 'done') {
      return {
        found: true,
        path: finalState.path.slice(),
        distance: finalState.pathCost,
        trace,
      };
    }
    return { found: false, path: [], distance: INF, trace };
  }

  return {
    INF,
    buildTrace,
    dijkstraShortestPath,
    edgeKey,
    formatDistance,
    validateGraph,
  };
});
