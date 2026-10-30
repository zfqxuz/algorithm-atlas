/*
 * Step-by-step traces for classic graph algorithms.
 * The output shape matches Dijkstra's trace: every state is an immutable
 * snapshot that the visualizer can render without replaying prior steps.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./dijkstra.js'));
  } else {
    root.GraphAlgorithms = factory(root.Dijkstra);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Dijkstra) {
  'use strict';

  const INF = Dijkstra.INF;
  const formatDistance = Dijkstra.formatDistance;

  function prepare(graph, source) {
    Dijkstra.validateGraph(graph);
    const ids = graph.nodes.map((node) => node.id);
    if (!ids.includes(source)) throw new RangeError(`Unknown source node: ${source}`);

    const order = new Map(ids.map((id, index) => [id, index]));
    const adjacency = new Map(ids.map((id) => [id, []]));

    for (const edge of graph.edges) {
      adjacency.get(edge.u).push({ to: edge.v, weight: edge.w });
      adjacency.get(edge.v).push({ to: edge.u, weight: edge.w });
    }
    for (const neighbours of adjacency.values()) {
      neighbours.sort((a, b) => order.get(a.to) - order.get(b.to));
    }

    const dist = Object.create(null);
    const prev = Object.create(null);
    for (const id of ids) {
      dist[id] = INF;
      prev[id] = null;
    }

    return { ids, order, adjacency, dist, prev };
  }

  function reconstructPath(prev, source, target) {
    if (source === target) return [source];
    if (prev[target] === null || prev[target] === undefined) return [];

    const path = [target];
    let cursor = target;
    while (cursor !== source) {
      cursor = prev[cursor];
      if (cursor === null || cursor === undefined) return [];
      path.push(cursor);
      if (path.length > Object.keys(prev).length + 1) return [];
    }
    return path.reverse();
  }

  function requireTarget(ids, target) {
    if (target === null || target === undefined) {
      throw new RangeError('A target node is required for this algorithm.');
    }
    if (!ids.includes(target)) throw new RangeError(`Unknown target node: ${target}`);
  }

  /* ------------------------------------------------------------------ */
  /* BFS: shortest path measured in number of edges.                    */
  /* ------------------------------------------------------------------ */

  function buildBfsTrace(graph, source, target) {
    const { ids, adjacency, dist, prev } = prepare(graph, source);
    requireTarget(ids, target);

    const settled = new Set();
    const seen = new Set([source]);
    const fifo = [source];
    const trace = [];
    let found = false;

    dist[source] = 0;

    function queueSnapshot() {
      return fifo.map((id) => ({
        id,
        distance: dist[id],
        previous: prev[id],
      }));
    }

    function state(partial) {
      return Object.assign(
        {
          algorithm: 'bfs',
          kind: 'init',
          lineRange: [],
          current: null,
          activeEdge: null,
          relaxedNode: null,
          settled: [...settled],
          queue: queueSnapshot(),
          dist: Object.assign(Object.create(null), dist),
          prev: Object.assign(Object.create(null), prev),
          path: [],
          pathCost: null,
          message: '',
          detail: '',
        },
        partial,
        {
          settled: [...settled],
          queue: queueSnapshot(),
          dist: Object.assign(Object.create(null), dist),
          prev: Object.assign(Object.create(null), prev),
          path: partial.path ? [...partial.path] : [],
        }
      );
    }

    trace.push(
      state({
        kind: 'init',
        lineRange: [2, 3, 4],
        message: '初始化 BFS 队列',
        detail: `起点 ${source} 的距离设为 0 并进入 FIFO 队列；其余节点暂不可达。`,
      })
    );

    while (fifo.length > 0) {
      const u = fifo.shift();
      settled.add(u);
      const isTarget = u === target;

      trace.push(
        state({
          kind: 'select',
          lineRange: [6],
          current: u,
          message: isTarget ? `目标 ${u} 出队` : `出队节点 ${u}`,
          detail: isTarget
            ? `目标节点第一次出队，边数最少的路径已经确定：共 ${formatDistance(dist[u])} 条边。`
            : `${u} 离开队首（第 ${formatDistance(dist[u])} 层），开始发现它的邻居。`,
        })
      );

      if (isTarget) {
        const path = reconstructPath(prev, source, u);
        trace.push(
          state({
            kind: 'done',
            lineRange: [7],
            current: u,
            path,
            pathCost: dist[u],
            message: '最少边路径已确定',
            detail:
              path.length > 0
                ? `${path.join(' \u2192 ')}，共 ${path.length - 1} 条边。BFS 按层扩展，因此第一次到达目标时的边数最少。`
                : '起点与终点相同，路径代价为 0。',
          })
        );
        found = true;
        break;
      }

      for (const neighbour of adjacency.get(u)) {
        const v = neighbour.to;
        if (seen.has(v)) continue;

        seen.add(v);
        dist[v] = dist[u] + 1;
        prev[v] = u;
        fifo.push(v);

        trace.push(
          state({
            kind: 'discover',
            lineRange: [8, 9, 10, 11, 12],
            current: u,
            activeEdge: { from: u, to: v, weight: neighbour.weight },
            relaxedNode: v,
            message: `发现节点 ${v}`,
            detail: `从 ${u} 到达 ${v} 需要 ${dist[v]} 条边；将 ${v} 加入队尾，前驱设为 ${u}。边权不参与 BFS 的层级计算。`,
          })
        );
      }
    }

    if (!found) {
      trace.push(
        state({
          kind: 'unreachable',
          lineRange: [13],
          message: '目标不可达',
          detail: `BFS 队列已经清空，仍没有遇到 ${target}。从 ${source} 无法到达目标。`,
        })
      );
    }

    return trace;
  }

  /* ------------------------------------------------------------------ */
  /* DFS: explicit LIFO stack, path found by depth-first exploration.   */
  /* ------------------------------------------------------------------ */

  function buildDfsTrace(graph, source, target) {
    const { ids, adjacency, dist, prev } = prepare(graph, source);
    requireTarget(ids, target);

    const settled = new Set();
    const seen = new Set([source]);
    const stack = [source];
    const trace = [];
    let found = false;

    dist[source] = 0;

    function queueSnapshot() {
      return stack
        .slice()
        .reverse()
        .map((id) => ({
          id,
          distance: dist[id],
          previous: prev[id],
        }));
    }

    function state(partial) {
      return Object.assign(
        {
          algorithm: 'dfs',
          kind: 'init',
          lineRange: [],
          current: null,
          activeEdge: null,
          relaxedNode: null,
          settled: [...settled],
          queue: queueSnapshot(),
          dist: Object.assign(Object.create(null), dist),
          prev: Object.assign(Object.create(null), prev),
          path: [],
          pathCost: null,
          message: '',
          detail: '',
        },
        partial,
        {
          settled: [...settled],
          queue: queueSnapshot(),
          dist: Object.assign(Object.create(null), dist),
          prev: Object.assign(Object.create(null), prev),
          path: partial.path ? [...partial.path] : [],
        }
      );
    }

    trace.push(
      state({
        kind: 'init',
        lineRange: [2, 3, 4, 5],
        message: '初始化 DFS 栈',
        detail: `起点 ${source} 标记为已发现，深度为 0，压入栈顶。DFS 会优先深入最近发现的节点。`,
      })
    );

    while (stack.length > 0) {
      const u = stack.pop();
      settled.add(u);
      const isTarget = u === target;

      trace.push(
        state({
          kind: 'select',
          lineRange: [7],
          current: u,
          message: isTarget ? `目标 ${u} 弹出` : `弹出节点 ${u}`,
          detail: isTarget
            ? `目标节点从栈顶弹出，沿发现树回溯得到一条可行路径。DFS 不保证这是最短路径。`
            : `从栈顶取出 ${u}（DFS 深度 ${formatDistance(dist[u])}），继续沿它的邻居向下搜索。`,
        })
      );

      if (isTarget) {
        const path = reconstructPath(prev, source, u);
        trace.push(
          state({
            kind: 'done',
            lineRange: [8],
            current: u,
            path,
            pathCost: dist[u],
            message: 'DFS 路径已找到',
            detail:
              path.length > 0
                ? `${path.join(' \u2192 ')}，路径深度 ${path.length - 1}。这条路径取决于邻接节点的遍历顺序，不一定最短。`
                : '起点与终点相同，路径代价为 0。',
          })
        );
        found = true;
        break;
      }

      const neighbours = adjacency.get(u);
      for (let index = neighbours.length - 1; index >= 0; index -= 1) {
        const neighbour = neighbours[index];
        const v = neighbour.to;
        if (seen.has(v)) continue;

        seen.add(v);
        dist[v] = dist[u] + 1;
        prev[v] = u;
        stack.push(v);

        trace.push(
          state({
            kind: 'discover',
            lineRange: [9, 10, 11, 12, 13],
            current: u,
            activeEdge: { from: u, to: v, weight: neighbour.weight },
            relaxedNode: v,
            message: `压入节点 ${v}`,
            detail: `${v} 首次被发现，深度设为 ${formatDistance(dist[v])}，前驱为 ${u}。稍后它会从栈顶优先被处理。`,
          })
        );
      }
    }

    if (!found) {
      trace.push(
        state({
          kind: 'unreachable',
          lineRange: [14],
          message: '目标不可达',
          detail: `DFS 栈已经耗尽，仍未找到 ${target}。从 ${source} 无法到达目标。`,
        })
      );
    }

    return trace;
  }

  /* ------------------------------------------------------------------ */
  /* Prim: minimum spanning tree using the classic O(V^2 + E) scan.     */
  /* ------------------------------------------------------------------ */

  function buildPrimTrace(graph, source) {
    const { ids, order, adjacency, dist, prev } = prepare(graph, source);
    const trace = [];
    const inTree = new Set();
    const mstEdges = [];
    let totalWeight = 0;

    dist[source] = 0;

    function queueSnapshot() {
      return ids
        .filter((id) => !inTree.has(id) && Number.isFinite(dist[id]))
        .map((id) => ({ id, distance: dist[id], previous: prev[id] }))
        .sort((a, b) => a.distance - b.distance || order.get(a.id) - order.get(b.id));
    }

    function state(partial) {
      return Object.assign(
        {
          algorithm: 'prim',
          kind: 'init',
          lineRange: [],
          current: null,
          activeEdge: null,
          relaxedNode: null,
          settled: [...inTree],
          queue: queueSnapshot(),
          dist: Object.assign(Object.create(null), dist),
          prev: Object.assign(Object.create(null), prev),
          path: [],
          pathCost: totalWeight,
          totalWeight,
          mstEdges: mstEdges.map((edge) => ({ ...edge })),
          message: '',
          detail: '',
        },
        partial,
        {
          settled: [...inTree],
          queue: queueSnapshot(),
          dist: Object.assign(Object.create(null), dist),
          prev: Object.assign(Object.create(null), prev),
          path: partial.path ? [...partial.path] : [],
          totalWeight,
          mstEdges: mstEdges.map((edge) => ({ ...edge })),
        }
      );
    }

    trace.push(
      state({
        kind: 'init',
        lineRange: [2, 3, 4],
        message: '初始化连接代价',
        detail: `以 ${source} 为根，key[${source}] = 0；其余节点与生成树的连接代价暂定为 \u221e。`,
      })
    );

    while (inTree.size < ids.length) {
      let u = null;
      for (const id of ids) {
        if (inTree.has(id) || !Number.isFinite(dist[id])) continue;
        if (u === null || dist[id] < dist[u] || (dist[id] === dist[u] && order.get(id) < order.get(u))) {
          u = id;
        }
      }

      if (u === null) break;

      const isRoot = inTree.size === 0;
      const parent = prev[u];
      const connectingEdge =
        parent === null || parent === undefined
          ? null
          : { from: parent, to: u, weight: dist[u] };

      inTree.add(u);
      if (connectingEdge) {
        totalWeight += connectingEdge.weight;
        mstEdges.push({
          u: connectingEdge.from,
          v: connectingEdge.to,
          w: connectingEdge.weight,
        });
      }

      trace.push(
        state({
          kind: 'select',
          lineRange: [6, 8],
          current: u,
          activeEdge: connectingEdge,
          message: isRoot ? `以 ${u} 为根启动` : `加入节点 ${u}`,
          detail: isRoot
            ? `${u} 是生成树的根节点，连接代价为 0。开始比较它与其余节点之间的边。`
            : `选取当前连接代价最小的节点 ${u}（key = ${formatDistance(dist[u])}），通过边 ${parent} — ${u} 加入生成树。`,
        })
      );

      for (const neighbour of adjacency.get(u)) {
        const v = neighbour.to;
        if (inTree.has(v)) continue;
        if (neighbour.weight >= dist[v]) continue;

        const previousKey = dist[v];
        dist[v] = neighbour.weight;
        prev[v] = u;

        trace.push(
          state({
            kind: 'update',
            lineRange: [9, 10, 11],
            current: u,
            activeEdge: { from: u, to: v, weight: neighbour.weight },
            relaxedNode: v,
            message: `更新 ${v} 的连接代价`,
            detail: `边 ${u} — ${v} 的权重为 ${neighbour.weight}，小于原来的 ${formatDistance(previousKey)}；更新 key[${v}] = ${neighbour.weight}，父节点设为 ${u}。`,
          })
        );
      }
    }

    const connected = inTree.size === ids.length;

    trace.push(
      state({
        kind: 'done',
        lineRange: connected ? [12] : [7],
        current: null,
        path: [...inTree],
        pathCost: totalWeight,
        message: connected ? '最小生成树已完成' : '生成树已停止',
        detail: connected
          ? `已覆盖全部 ${ids.length} 个节点，共 ${mstEdges.length} 条树边，总权重 ${totalWeight}。`
          : `图不连通：生成树覆盖 ${inTree.size} / ${ids.length} 个节点，其余节点无法连接到根 ${source}。`,
      })
    );

    return trace;
  }

  return {
    buildBfsTrace,
    buildDfsTrace,
    buildPrimTrace,
  };
});
