(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlowEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function validate(network) {
    if (!network || !Array.isArray(network.nodes) || !Array.isArray(network.edges)) {
      throw new TypeError('flow network must contain nodes and edges');
    }
    if (!network.nodes.includes(network.source) || !network.nodes.includes(network.sink)) {
      throw new RangeError('source and sink must be nodes');
    }
    const seen = new Set();
    for (const edge of network.edges) {
      if (!network.nodes.includes(edge.u) || !network.nodes.includes(edge.v)) {
        throw new RangeError('edge endpoints must be nodes');
      }
      if (!Number.isFinite(edge.capacity) || edge.capacity < 0) {
        throw new RangeError('edge capacity must be non-negative');
      }
      const key = `${edge.u}->${edge.v}`;
      if (seen.has(key)) throw new RangeError('parallel edges are not supported');
      seen.add(key);
    }
  }

  function solve(network, options) {
    validate(network);
    const settings = options || {};
    const source = network.source;
    const sink = network.sink;
    const nodes = network.nodes.slice();
    const index = new Map(nodes.map((id, position) => [id, position]));
    const size = nodes.length;
    const capacities = Array.from({ length: size }, () => Array(size).fill(0));
    const flows = network.edges.map(() => 0);

    network.edges.forEach((edge, edgeIndex) => {
      const u = index.get(edge.u);
      const v = index.get(edge.v);
      if (u === v) throw new RangeError('self-loops are not supported');
      capacities[u][v] += edge.capacity;
      edge.index = edgeIndex;
    });

    function forwardCapacity(u, v) {
      const capacity = capacities[u][v];
      if (capacity === 0) return 0;
      let used = 0;
      network.edges.forEach((edge, edgeIndex) => {
        if (index.get(edge.u) === u && index.get(edge.v) === v) used += flows[edgeIndex];
      });
      return capacity - used;
    }

    function residual(u, v) {
      if (capacities[u][v] === 0 && capacities[v][u] === 0) return 0;
      let value = forwardCapacity(u, v);
      network.edges.forEach((edge, edgeIndex) => {
        if (index.get(edge.u) === v && index.get(edge.v) === u) value += flows[edgeIndex];
      });
      return Math.max(0, value);
    }

    function flowSnapshot() {
      return network.edges.map((edge, edgeIndex) => ({
        from: edge.u,
        to: edge.v,
        capacity: edge.capacity,
        flow: flows[edgeIndex],
      }));
    }

    function reachableSet() {
      const seen = new Set([source]);
      const queue = [source];
      while (queue.length) {
        const u = queue.shift();
        for (const v of nodes) {
          if (!seen.has(v) && residual(index.get(u), index.get(v)) > 0) {
            seen.add(v);
            queue.push(v);
          }
        }
      }
      return seen;
    }

    function findPath() {
      const parent = new Map();
      const seen = new Set([source]);
      const queue = [source];
      while (queue.length) {
        const u = queue.shift();
        if (u === sink) break;
        for (const v of nodes) {
          if (!seen.has(v) && residual(index.get(u), index.get(v)) > 0) {
            seen.add(v);
            parent.set(v, u);
            queue.push(v);
          }
        }
      }
      if (!seen.has(sink)) return null;
      const path = [];
      let current = sink;
      while (current !== source) {
        const previous = parent.get(current);
        if (previous === undefined) return null;
        path.unshift([previous, current]);
        current = previous;
      }
      return path;
    }

    const steps = [{
      kind: 'init',
      path: [],
      bottleneck: 0,
      totalFlow: 0,
      flows: flowSnapshot(),
      message: '从源点开始，在残量网络中寻找一条增广路。',
    }];

    let totalFlow = 0;
    let iteration = 0;
    const maxIterations = Math.min(200, Math.max(1, Number(settings.maxIterations) || 100));
    while (iteration < maxIterations) {
      const path = findPath();
      if (!path) break;
      iteration += 1;
      let bottleneck = Infinity;
      for (const [u, v] of path) {
        bottleneck = Math.min(bottleneck, residual(index.get(u), index.get(v)));
      }
      for (const [u, v] of path) {
        const original = network.edges.findIndex(
          (edge) => edge.u === u && edge.v === v
        );
        if (original >= 0) {
          flows[original] += bottleneck;
        } else {
          const reverse = network.edges.findIndex(
            (edge) => edge.u === v && edge.v === u
          );
          if (reverse < 0) {
            throw new Error('residual path does not map to an original edge');
          }
          flows[reverse] -= bottleneck;
        }
      }
      totalFlow += bottleneck;
      const pathNodes = [path[0][0], ...path.map(([, v]) => v)];
      steps.push({
        kind: 'augment',
        iteration,
        path,
        pathNodes,
        bottleneck,
        totalFlow,
        flows: flowSnapshot(),
        message: `第 ${iteration} 次增广：${pathNodes.join(' → ')}，瓶颈容量 ${bottleneck}。`,
      });
    }

    const reachable = reachableSet();
    const minCut = network.edges
      .filter((edge) => reachable.has(edge.u) && !reachable.has(edge.v))
      .map((edge) => ({ from: edge.u, to: edge.v, capacity: edge.capacity }));
    const minCutCapacity = minCut.reduce((sum, edge) => sum + edge.capacity, 0);
    steps.push({
      kind: 'done',
      path: [],
      bottleneck: 0,
      totalFlow,
      flows: flowSnapshot(),
      reachable: [...reachable],
      minCut,
      minCutCapacity,
      message: `不存在增广路。最大流 ${totalFlow}，最小割 ${minCutCapacity}，两者相等。`,
    });

    return {
      maxFlow: totalFlow,
      steps,
      flows: flowSnapshot(),
      reachable: [...reachable],
      minCut,
      minCutCapacity,
    };
  }

  return { solve };
});
