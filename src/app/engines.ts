import type {
  ArrayStage,
  ChartStage,
  FramesStage,
  GraphStage,
  LabDefinition,
  LabEntry,
  LabFrame,
  MatrixStage,
  ParamValue,
  PipelineStage,
  StackStage,
  TableStage,
  TimelineStage,
  TopologyStage,
  TreeStage,
  VectorStage,
  LayersStage,
} from './model';
import { defaultParams } from './params';

type Params = Record<string, ParamValue>;

const num = (params: Params, id: string, fallback: number): number => {
  const value = Number(params[id]);
  return Number.isFinite(value) ? value : fallback;
};
const str = (params: Params, id: string, fallback: string): string => String(params[id] ?? fallback);

function hashSeed(value: number): number {
  let hash = 2166136261 >>> 0;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function random(seed: number): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function arrayStage(
  values: number[],
  labels: string[],
  active: number[],
  compare: number[],
  sorted: number[],
  caption: string,
  range?: [number, number],
  target?: number,
): ArrayStage {
  return { kind: 'array', values: values.slice(), labels: labels.slice(), active, compare, sorted, range, target, caption };
}

function metricFrames(frames: LabFrame[], metrics: Record<string, string | number>): void {
  if (frames.length) frames[frames.length - 1].metrics = metrics;
}

function pseudocodeFor(entry: LabEntry): { lines: string[]; complexity: string; invariant: string } {
  const mode = entry.mode ?? '';
  if (entry.kind === 'array') {
    if (mode === 'bubble') return { lines: ['for i = 0 to n-2:', '  for j = 0 to n-2-i:', '    if a[j] > a[j+1]: swap', '  if no swap: break', 'return sorted'], complexity: 'O(n²)', invariant: '每一轮结束后，末尾 i+1 个元素已经就位。' };
    if (mode === 'selection') return { lines: ['for i = 0 to n-1:', '  min = i', '  for j = i+1 to n-1: if a[j] < a[min]: min = j', '  swap(a[i], a[min])', 'return sorted'], complexity: 'O(n²)', invariant: '已排序前缀始终是当前最小的 i 个元素。' };
    if (mode === 'insertion') return { lines: ['for i = 1 to n-1:', '  j = i', '  while j > 0 and a[j] < a[j-1]: swap', '  sorted prefix grows to i+1', 'return sorted'], complexity: 'O(n²)', invariant: '处理到 i 时，a[0..i] 已经有序。' };
    if (mode === 'shell') return { lines: ['gap = n / 2', 'while gap > 0:', '  gap-insertion sort', '  gap = gap / 2', 'return sorted'], complexity: 'O(n log² n) 典型', invariant: '每个 gap 子序列内部有序。' };
    if (mode === 'merge') return { lines: ['split array in half', 'sort(left), sort(right)', 'merge two sorted halves', 'write merged buffer back', 'return sorted'], complexity: 'O(n log n)', invariant: '合并前左右两段各自有序；合并后整段有序。' };
    if (mode === 'quick') return { lines: ['choose pivot a[hi]', 'partition: smaller left, larger right', 'place pivot at store', 'recurse left and right', 'return sorted'], complexity: 'O(n log n) 平均', invariant: '分区后基准左侧不大于基准，右侧不小于基准。' };
    if (mode === 'counting') return { lines: ['count occurrences of each value', 'prefix sums determine ranges', 'write values back in order', 'return sorted'], complexity: 'O(n + k)', invariant: '输出按值域非降序，值域较大时空间开销上升。' };
    if (mode === 'heap' || mode === 'heapds') return { lines: ['build max/min heap', 'for end = n-1 downto 1:', '  swap root and end', '  sift down within heap', 'return sorted'], complexity: 'O(n log n)', invariant: '堆区始终满足堆序，已弹出区已经就位。' };
    if (mode === 'binary') return { lines: ['lo = 0, hi = n-1', 'while lo <= hi:', '  mid = (lo+hi)/2', '  compare a[mid] with target', '  discard one half', 'return index or NOT FOUND'], complexity: 'O(log n)', invariant: '目标若存在，一定在当前闭区间 [lo, hi] 内。' };
    if (mode === 'kmp') return { lines: ['build prefix function pi', 'scan text with index i', '  fallback matched = pi[matched-1] on mismatch', '  advance on match', 'return first full match'], complexity: 'O(n + m)', invariant: '文本指针不回退，matched 是当前已匹配模式前缀长度。' };
    if (mode === 'dsu') return { lines: ['parent[i] = i', 'find(x): path compression', 'union(a,b): link roots', 'record component count', 'return forest'], complexity: '近似 O(α(n))', invariant: '每个集合是一棵树，根节点的 parent 指向自己。' };
    return { lines: ['read array', 'scan candidate elements', 'compare and update metric', 'repeat until complete', 'return result'], complexity: 'O(n)', invariant: '每一步只改变当前候选位置和累计指标。' };
  }
  switch (entry.kind) {
    case 'graph':
      if (entry.mode === 'dijkstra') return {
        lines: ['dist[source] = 0, others = ∞', 'while unsettled nodes:', '  u = extract-min(dist)', '  settle(u)', '  for edge (u, v): relax dist[v]', 'return dist'],
        complexity: 'O((V+E) log V)',
        invariant: '已确定节点的距离不会再被改进；非负权重是前提。',
      };
      if (entry.mode === 'prim') return {
        lines: ['tree = {source}', 'while tree has fewer than V nodes:', '  edge = minimum edge crossing the cut', '  add edge and new node', 'return tree'],
        complexity: 'O(E log V)',
        invariant: '每次加入的都是当前割上的最小边。',
      };
      if (entry.mode === 'pagerank') return {
        lines: ['score[v] = 1/n', 'repeat:', '  next[v] = (1-d)/n + d * Σ score[u]/deg(u)', '  score = next', 'until convergence'],
        complexity: 'O(iterations × E)',
        invariant: '所有节点分数之和保持为 1；阻尼因子控制跳转。',
      };
      if (entry.mode === 'dfs') return {
        lines: ['stack = [source]', 'while stack not empty:', '  u = stack.pop()', '  if visited(u): continue', '  visit(u) and push neighbors', 'return order'],
        complexity: 'O(V+E)',
        invariant: '栈中保存的是待探索分支；访问顺序沿一条路径深入。',
      };
      return {
        lines: ['queue = [source]', 'while queue not empty:', '  u = pop(queue)', '  for v in neighbors(u):', '    if v not visited: enqueue(v)', '  mark u visited', 'return order'],
        complexity: 'O(V+E)',
        invariant: '队列中的节点都已被发现；BFS 第一次到达即最少边数。',
      };
    case 'tree':
      if (entry.mode === 'avl' || entry.mode === 'rb') return {
        lines: ['insert as in BST', 'walk back to the root', 'update height / colors', 'if unbalanced: rotate', 'return root'],
        complexity: 'O(log n)',
        invariant: 'AVL 高度差 ≤ 1；红黑树保持根黑、红节点不相邻、黑高一致。',
      };
      if (entry.mode === 'bst') return {
        lines: ['insert(root, key):', '  if root is empty: return new Node(key)', '  if key < root.key: go left', '  else: go right', '  attach new leaf', 'return root'],
        complexity: 'O(h)',
        invariant: '左子树键值更小，右子树键值更大。',
      };
      return {
        lines: ['queue = [root]', 'while queue not empty:', '  u = dequeue', '  visit u', '  enqueue children', 'return order'],
        complexity: 'O(n)',
        invariant: '队列中的节点都已发现，且按层序排列。',
      };
    case 'matrix':
      if (entry.mode === 'attention') {
        return {
          lines: ['Q = X Wq, K = X Wk, V = X Wv', 'scores = Q Kᵀ / sqrt(d)', 'apply causal mask if enabled', 'weights = softmax(scores, axis=keys)', 'context = weights V', 'return per-head contexts'],
          complexity: 'O(n²d)',
          invariant: '掩码位置权重为 0；每一行 softmax 权重之和为 1。',
        };
      }
      if (entry.mode === 'lcs') {
        return {
          lines: ['dp[0][*] = dp[*][0] = 0', 'for i in 1..n:', '  for j in 1..m:', '    if a[i] == b[j]: dp[i][j] = dp[i-1][j-1]+1', '    else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])', 'return dp[n][m]'],
          complexity: 'O(nm)',
          invariant: 'dp[i][j] 只依赖左、上、左上三个已经算出的单元格。',
        };
      }
      return {
        lines: ['for each row i:', '  for each column j:', '    compare / compute cell', '    mark dependency', '  derive current row/col', 'return table'],
        complexity: 'O(nm)',
        invariant: '已处理单元格的值只依赖已经计算过的单元格。',
      };
    case 'chart':
      if (entry.mode === 'hull') return {
        lines: ['sort points by x', 'build lower hull with a stack', '  while cross <= 0: pop', 'build upper hull symmetrically', 'concatenate both hulls', 'return hull'],
        complexity: 'O(n log n)',
        invariant: '栈中相邻三点始终构成左转；最后得到凸包顶点。',
      };
      return {
        lines: ['x = initial point', 'repeat:', '  g = gradient(x)', '  x = update(x, g)', '  record loss', 'until convergence'],
        complexity: 'O(iterations × cost(gradient))',
        invariant: '每一步只根据当前点和梯度更新，历史轨迹可用于检查收敛。',
      };
    case 'timeline':
      if (entry.mode === 'lpt') return {
        lines: ['sort jobs by decreasing burst', 'for each job:', '  machine = current minimum load', '  assign job to machine', 'return schedule'],
        complexity: 'O(n log n + nm)',
        invariant: '每个作业只分配一次；makespan 由最忙的机器决定。',
      };
      if (entry.mode === 'rr') return {
        lines: ['ready = FIFO arrivals', 'while ready:', '  job = dequeue', '  run for quantum q', '  if not finished: enqueue tail', 'return timeline'],
        complexity: 'O(n log n)',
        invariant: '运行中的作业不超过 CPU 数；每个时间片后队尾轮转。',
      };
      return {
        lines: ['admit jobs with arrival <= now', 'pick next job by policy', 'run until completion or quantum', 'update remaining / metrics', 'repeat until all done'],
        complexity: 'O(n log n)',
        invariant: '任一时刻运行中的作业不超过处理器数量；剩余时间不为负。',
      };
    case 'frames':
      return {
        lines: ['for page in reference:', '  if page in frames: hit', '  else: fault', '    choose victim', '    replace victim', '  update counters'],
        complexity: 'O(n × frames)',
        invariant: '每一帧最多存放一个页；命中/缺页计数之和等于已访问引用数。',
      };
    case 'table':
      return {
        lines: ['for each row:', '  inspect key / value', '  compare or update', '  record affected row', 'return result'],
        complexity: 'O(rows)',
        invariant: '每行只被当前操作修改一次，已提交行保持可见。',
      };
    case 'stack':
      return {
        lines: ['for item in operations:', '  if push: stack.append(item)', '  else: stack.pop()', '  record top', 'return stack'],
        complexity: 'O(n)',
        invariant: '栈顶始终是最后一个未被弹出的元素。',
      };
    case 'vector':
      return {
        lines: ['for each vector row:', '  compute dot / norm', '  update similarity', '  select best match', 'return result'],
        complexity: 'O(rows × dimension)',
        invariant: '每一行的计算结果只依赖对应向量和参数。',
      };
    case 'layers':
      return {
        lines: ['h = input', 'for layer in layers:', '  h = activate(W h + b)', '  record activation', 'return h'],
        complexity: 'O(depth × width²)',
        invariant: '第 k 层只读取第 k-1 层的输出。',
      };
    case 'pipeline':
      return {
        lines: ['for stage in pipeline:', '  input = stage(input)', '  record stage output', 'return output'],
        complexity: 'O(stages)',
        invariant: '阶段按顺序执行；后一阶段只读取前一阶段的结果。',
      };
    case 'topology':
      return {
        lines: ['path = [source]', 'while path not target:', '  choose next hop', '  if link failed: drop', '  move packet', 'return path'],
        complexity: 'O(V+E)',
        invariant: '数据包每次沿一条可用链路移动；路径不会重复访问节点。',
      };
    default:
      return {
        lines: ['read input', 'compare candidates', 'mutate state', 'record metric', 'repeat until done'],
        complexity: 'O(n)',
        invariant: '每一步只改变当前候选区间或当前元素。',
      };
  }
}

function normalizeFrames(frames: LabFrame[], codeLength: number): LabFrame[] {
  if (!frames.length) return frames;
  for (const frame of frames) {
    frame.codeLine = Math.max(0, Math.min(codeLength - 1, frame.codeLine));
  }
  if (frames.length < 5) {
    const first = frames[0];
    frames.unshift({
      ...first,
      narration: '初始化：读取参数，建立可复现的输入，并准备第一条状态轨迹。',
      stage: { ...first.stage, caption: '初始化：输入已生成，等待第一步操作。' },
      codeLine: 0,
      done: false,
    });
  }
  while (frames.length < 5) {
    const last = frames[frames.length - 1];
    frames.push({
      ...last,
      narration: `观察第 ${frames.length + 1} 个状态：保持当前输入，记录指标并准备收束。`,
      stage: { ...last.stage, caption: `观察第 ${frames.length + 1} 个状态；指标随当前操作更新。` },
      done: false,
    });
  }
  frames[frames.length - 1].done = true;
  return frames;
}

function baseDefinition(entry: LabEntry): LabDefinition {
  const params = defaultParams(entry);
  const pseudo = pseudocodeFor(entry);
  return {
    entry,
    params,
    pseudocode: pseudo.lines,
    invariant: pseudo.invariant,
    complexity: pseudo.complexity,
    run: (values) => ({
      frames: normalizeFrames(runEngine(entry, values), pseudo.lines.length),
      pseudocode: pseudo.lines,
      invariant: pseudo.invariant,
      params,
      summary: entry.summary,
      complexity: pseudo.complexity,
    }),
  };
}

export { baseDefinition };

/* ------------------------------------------------------------------ */
/* Array / sorting / search                                            */
/* ------------------------------------------------------------------ */

function generatedArray(params: Params, sorted = false): number[] {
  const size = Math.max(4, Math.min(28, Math.round(num(params, 'size', 16))));
  const distribution = str(params, 'distribution', 'random');
  const rng = random(num(params, 'seed', 2026) + size * 97);
  let values = Array.from({ length: size }, () => 1 + Math.floor(rng() * 96));
  if (distribution === 'near-sorted') {
    values = values.sort((a, b) => a - b).map((value, index) => (index % 5 === 0 ? Math.max(1, value - 8) : value));
  } else if (distribution === 'reversed') {
    values = values.sort((a, b) => b - a);
  } else if (distribution === 'few-unique') {
    const pool = [12, 34, 56, 78];
    values = Array.from({ length: size }, () => pool[Math.floor(rng() * pool.length)]);
  }
  if (sorted) values = values.sort((a, b) => a - b);
  return values;
}

function runArray(entry: LabEntry, params: Params): LabFrame[] {
  const mode = entry.mode ?? '';
  if (mode === 'binary') return searchBinary(params);
  if (mode === 'kmp') return searchKmp(params);
  if (mode === 'dsu') return runDsu(params);
  if (mode === 'heapds') return runHeapDs(params);
  if (['bubble', 'selection', 'insertion', 'shell', 'merge', 'quick', 'counting', 'heap'].includes(mode)) {
    return runSort(mode, params);
  }
  return runArrayScan(params);
}

function searchBinary(params: Params): LabFrame[] {
  const values = generatedArray(params, true);
  const target = Math.round(num(params, 'target', 23));
  const labels = values.map(String);
  const frames: LabFrame[] = [];
  let comparisons = 0;
  let lo = 0;
  let hi = values.length - 1;
  const push = (caption: string, active: number[], range?: [number, number], done = false): void => {
    frames.push({
      stage: arrayStage(values, labels, active, [], [], caption, range, target),
      narration: caption,
      metrics: { 比较次数: comparisons, 当前区间: range ? `${range[0]}–${range[1]}` : '—', 目标: target },
      codeLine: done ? 4 : 1,
      done,
    });
  };
  push('初始化：在有序数组上维护闭区间 [lo, hi]。', [], [lo, hi]);
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    comparisons += 1;
    push(`比较 a[${mid}] = ${values[mid]} 与目标 ${target}。`, [mid], [lo, hi]);
    if (values[mid] === target) {
      push(`命中：a[${mid}] = ${target}，共比较 ${comparisons} 次。`, [mid], [lo, hi], true);
      return frames;
    }
    if (values[mid] < target) lo = mid + 1;
    else hi = mid - 1;
    push(`排除中点，新的候选区间是 [${lo}, ${hi}]。`, [], [lo, hi]);
  }
  push(`区间为空，目标 ${target} 不在数组中。`, [], undefined, true);
  return frames;
}

function searchKmp(params: Params): LabFrame[] {
  const text = str(params, 'text', 'ababcababa');
  const pattern = str(params, 'pattern', 'ababa');
  const labels = text.split('');
  const frames: LabFrame[] = [];
  const values = Array.from(text, (char) => char.charCodeAt(0));
  let comparisons = 0;
  const push = (caption: string, active: number[], done = false): void => {
    frames.push({
      stage: arrayStage(values, labels, active, [], [], caption, undefined, undefined),
      narration: caption,
      metrics: { 比较次数: comparisons, 文本长度: text.length, 模式长度: pattern.length },
      codeLine: done ? 3 : 2,
      done,
    });
  };
  push(`预处理模式串 "${pattern}" 的 border 信息。`, []);
  const prefix = new Array(pattern.length).fill(0);
  for (let index = 1, length = 0; index < pattern.length;) {
    comparisons += 1;
    if (pattern[index] === pattern[length]) {
      length += 1;
      prefix[index] = length;
      index += 1;
    } else if (length > 0) {
      length = prefix[length - 1];
    } else {
      index += 1;
    }
  }
  push(`pi = [${prefix.join(', ')}]；开始扫描文本。`, []);
  for (let index = 0, matched = 0; index < text.length; index += 1) {
    comparisons += 1;
    while (matched > 0 && text[index] !== pattern[matched]) matched = prefix[matched - 1];
    if (text[index] === pattern[matched]) matched += 1;
    push(`扫描到 "${text[index]}"，已匹配模式前缀长度 ${matched}。`, [index]);
    if (matched === pattern.length) {
      push(`在位置 ${index - pattern.length + 1} 找到完整匹配。`, [index - pattern.length + 1], true);
      return frames;
    }
  }
  push('扫描结束，没有找到完整匹配。', [], true);
  return frames;
}

function runDsu(params: Params): LabFrame[] {
  const size = Math.round(num(params, 'size', 10));
  const unions = Math.round(num(params, 'unions', 6));
  const parent = Array.from({ length: size }, (_, index) => index);
  const values = parent.slice();
  const labels = parent.map(String);
  const frames: LabFrame[] = [];
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const push = (caption: string, active: number[], done = false): void => {
    frames.push({
      stage: arrayStage(values.slice(), labels, active, [], [], caption),
      narration: caption,
      metrics: { 集合数: new Set(parent.map((_, index) => find(index))).size, 合并次数: unions, 元素数: size },
      codeLine: done ? 4 : 2,
      done,
    });
  };
  push('初始化：每个元素自成一个集合。', []);
  const rng = random(num(params, 'seed', 2026) + 31);
  for (let step = 0; step < unions && step < size - 1; step += 1) {
    const a = Math.floor(rng() * size);
    const b = Math.floor(rng() * size);
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
    values.splice(0, values.length, ...parent);
    push(`合并 ${a} 与 ${b}：把根 ${rootB} 挂到根 ${rootA} 下。`, [a, b]);
  }
  push('合并结束；每个连通块对应一个集合。', [], true);
  return frames;
}

function runHeapDs(params: Params): LabFrame[] {
  const size = Math.round(num(params, 'size', 9));
  const rng = random(num(params, 'seed', 2026) + 17);
  const heap: number[] = [];
  const frames: LabFrame[] = [];
  const push = (caption: string, active: number[], done = false): void => {
    frames.push({
      stage: arrayStage(heap.slice(), heap.map(String), active, [], [], caption),
      narration: caption,
      metrics: { 堆大小: heap.length, 堆顶: heap[0] ?? '—', 插入数: size },
      codeLine: done ? 4 : 2,
      done,
    });
  };
  push('空堆；准备插入随机键。', []);
  for (let step = 0; step < size; step += 1) {
    const value = 1 + Math.floor(rng() * 90);
    heap.push(value);
    let index = heap.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (heap[parent] <= heap[index]) break;
      [heap[parent], heap[index]] = [heap[index], heap[parent]];
      index = parent;
    }
    push(`插入 ${value}，沿父链上浮到堆性质恢复。`, [index]);
  }
  while (heap.length > 1) {
    const top = heap[0];
    heap[0] = heap.pop() as number;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < heap.length && heap[left] < heap[smallest]) smallest = left;
      if (right < heap.length && heap[right] < heap[smallest]) smallest = right;
      if (smallest === index) break;
      [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
      index = smallest;
    }
    push(`弹出堆顶 ${top}，末尾元素下沉恢复堆。`, [index]);
  }
  push('堆中只剩最后一个元素，排序/优先队列过程结束。', [], true);
  return frames;
}

function runArrayScan(params: Params): LabFrame[] {
  const values = generatedArray(params);
  const labels = values.map(String);
  const frames: LabFrame[] = [];
  let comparisons = 0;
  const push = (caption: string, active: number[], done = false): void => {
    frames.push({
      stage: arrayStage(values, labels, active, [], [], caption),
      narration: caption,
      metrics: { 已检查: active.length ? active[0] + 1 : 0, 比较次数: comparisons, 元素数: values.length },
      codeLine: done ? 3 : 1,
      done,
    });
  };
  push('读取数组，逐项检查候选值。', []);
  for (let index = 1; index < values.length; index += 1) {
    comparisons += 1;
    push(`比较 a[${index - 1}] = ${values[index - 1]} 与 a[${index}] = ${values[index]}。`, [index - 1, index]);
  }
  push('扫描完成，得到当前统计结果。', [values.length - 1], true);
  return frames;
}

function sortFrames(entryMode: string, values: number[]): LabFrame[] {
  const frames: LabFrame[] = [];
  const labels = values.map(String);
  let comparisons = 0;
  let writes = 0;
  let sorted: number[] = [];
  const push = (caption: string, active: number[] = [], compare: number[] = [], line = 0, done = false): void => {
    frames.push({
      stage: arrayStage(values, labels, active, compare, sorted, caption),
      narration: caption,
      metrics: { 比较次数: comparisons, 交换或写入: writes, 已就位: sorted.length },
      codeLine: line,
      done,
    });
  };
  push('初始数组；准备开始排序。');

  const swap = (a: number, b: number): void => {
    [values[a], values[b]] = [values[b], values[a]];
    writes += 1;
  };

  if (entryMode === 'bubble') {
    for (let i = 0; i < values.length - 1; i += 1) {
      let swapped = false;
      for (let j = 0; j < values.length - 1 - i; j += 1) {
        comparisons += 1;
        push(`比较 ${values[j]} 与 ${values[j + 1]}。`, [j, j + 1], [j, j + 1], 1);
        if (values[j] > values[j + 1]) {
          swap(j, j + 1);
          swapped = true;
          push(`逆序，交换为 ${values[j]} / ${values[j + 1]}。`, [j, j + 1], [j, j + 1], 2);
        }
      }
      sorted = Array.from({ length: i + 1 }, (_, index) => values.length - 1 - index);
      push(`第 ${i + 1} 轮结束，末尾 ${values.length - i - 1} 已就位。`, [], [], 3);
      if (!swapped) break;
    }
  } else if (entryMode === 'selection') {
    for (let i = 0; i < values.length; i += 1) {
      let min = i;
      for (let j = i + 1; j < values.length; j += 1) {
        comparisons += 1;
        push(`在未排序区寻找最小值：比较 ${values[min]} 与 ${values[j]}。`, [min, j], [min, j], 1);
        if (values[j] < values[min]) min = j;
      }
      if (min !== i) {
        swap(i, min);
        writes += 1;
        push(`把最小值 ${values[i]} 换到位置 ${i}。`, [i, min], [i, min], 2);
      }
      sorted = Array.from({ length: i + 1 }, (_, index) => index);
    }
  } else if (entryMode === 'insertion') {
    sorted = [0];
    for (let i = 1; i < values.length; i += 1) {
      let j = i;
      while (j > 0) {
        comparisons += 1;
        push(`把 ${values[j]} 与左侧 ${values[j - 1]} 比较。`, [j, j - 1], [j, j - 1], 1);
        if (values[j] >= values[j - 1]) break;
        swap(j, j - 1);
        j -= 1;
        push(`左移 ${values[j + 1]}，有序前缀扩展。`, [j, j + 1], [j, j + 1], 2);
      }
      sorted = Array.from({ length: i + 1 }, (_, index) => index);
    }
  } else if (entryMode === 'shell') {
    for (let gap = Math.floor(values.length / 2); gap > 0; gap = Math.floor(gap / 2)) {
      for (let i = gap; i < values.length; i += 1) {
        let j = i;
        while (j >= gap) {
          comparisons += 1;
          push(`gap=${gap}：比较 ${values[j]} 与 ${values[j - gap]}。`, [j, j - gap], [j, j - gap], 2);
          if (values[j] >= values[j - gap]) break;
          swap(j, j - gap);
          j -= gap;
        }
      }
    }
  } else if (entryMode === 'merge') {
    const merge = (left: number, mid: number, right: number): void => {
      const buffer: number[] = [];
      let i = left;
      let j = mid + 1;
      while (i <= mid && j <= right) {
        comparisons += 1;
        push(`合并：比较 ${values[i]} 与 ${values[j]}。`, [i, j], [i, j], 2);
        buffer.push(values[i] <= values[j] ? values[i++] : values[j++]);
      }
      while (i <= mid) buffer.push(values[i++]);
      while (j <= right) buffer.push(values[j++]);
      for (let k = 0; k < buffer.length; k += 1) {
        values[left + k] = buffer[k];
        writes += 1;
      }
      push(`区间 [${left}, ${right}] 合并完成。`, [left, right], [], 3);
    };
    const sort = (left: number, right: number): void => {
      if (left >= right) return;
      const mid = Math.floor((left + right) / 2);
      sort(left, mid);
      sort(mid + 1, right);
      merge(left, mid, right);
    };
    sort(0, values.length - 1);
  } else if (entryMode === 'quick') {
    const partition = (left: number, right: number): number => {
      const pivot = values[right];
      let store = left;
      for (let index = left; index < right; index += 1) {
        comparisons += 1;
        push(`以 ${pivot} 为基准，比较 ${values[index]}。`, [index, right], [index], 2);
        if (values[index] < pivot) {
          if (index !== store) {
            swap(index, store);
            push(`把 ${values[store]} 放到基准左侧。`, [index, store], [], 3);
          }
          store += 1;
        }
      }
      swap(store, right);
      return store;
    };
    const sort = (left: number, right: number): void => {
      if (left >= right) return;
      const pivot = partition(left, right);
      sorted = [...sorted, pivot];
      sort(left, pivot - 1);
      sort(pivot + 1, right);
    };
    sort(0, values.length - 1);
  } else if (entryMode === 'counting') {
    const max = Math.max(...values);
    const count = new Array(max + 1).fill(0);
    for (const value of values) count[value] += 1;
    push(`统计频次：值域 0–${max}。`, []);
    for (let value = 0; value <= max; value += 1) {
      while (count[value] > 0) {
        values[sorted.length] = value;
        sorted.push(sorted.length);
        writes += 1;
        count[value] -= 1;
      }
    }
  } else {
    // Heap sort: build a max heap in place, then extract maxima.
    const sift = (start: number, end: number): void => {
      let root = start;
      while (root * 2 + 1 <= end) {
        const child = root * 2 + 1;
        let swapIndex = root;
        comparisons += 1;
        if (values[swapIndex] < values[child]) swapIndex = child;
        if (child + 1 <= end && values[swapIndex] < values[child + 1]) swapIndex = child + 1;
        if (swapIndex === root) return;
        swap(root, swapIndex);
        root = swapIndex;
      }
    };
    for (let start = Math.floor(values.length / 2) - 1; start >= 0; start -= 1) sift(start, values.length - 1);
    for (let end = values.length - 1; end > 0; end -= 1) {
      swap(0, end);
      sorted = [...sorted, end];
      sift(0, end - 1);
    }
  }
  sorted = values.map((_, index) => index);
  push('完成：数组已经有序。', [], [], 4, true);
  return frames;
}

function runSort(mode: string, params: Params): LabFrame[] {
  return sortFrames(mode, generatedArray(params));
}

/* ------------------------------------------------------------------ */
/* Graph                                                               */
/* ------------------------------------------------------------------ */

interface GraphData {
  nodes: Array<{ id: string; label: string; x: number; y: number }>;
  edges: Array<{ a: string; b: string; weight: number }>;
  directed: boolean;
}

function graphFromEntry(entry: LabEntry, params: Params): GraphData {
  if (entry.visual?.type === 'graph') {
    const weightRng = random(num(params, 'seed', 2026) + 7);
    const nodes = entry.visual.nodes.map((node, index) => ({
      id: node.label,
      label: node.label,
      x: node.x ?? 40 + (index % 4) * 80,
      y: node.y ?? 40 + Math.floor(index / 4) * 70,
    }));
    return {
      nodes,
      edges: entry.visual.edges.map((edge) => ({ a: edge.a, b: edge.b, weight: 1 + Math.floor(weightRng() * 9) })),
      directed: Boolean(entry.visual.directed),
    };
  }
  const rng = random(num(params, 'seed', 2026));
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const nodes = labels.map((label, index) => ({
    label,
    id: label,
    x: 45 + (index % 3) * 110,
    y: 40 + Math.floor(index / 3) * 90,
  }));
  const edges: GraphData['edges'] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    for (let other = index + 1; other < nodes.length; other += 1) {
      if (rng() < 0.45) edges.push({ a: nodes[index].id, b: nodes[other].id, weight: 1 + Math.floor(rng() * 9) });
    }
  }
  return { nodes, edges, directed: false };
}

function graphStage(
  graph: GraphData,
  queue: string[],
  visited: Set<string>,
  active: string[],
  caption: string,
  edgeState: Map<string, GraphStage['edges'][number]['state']> = new Map(),
): GraphStage {
  return {
    kind: 'graph',
    nodes: graph.nodes.map((node) => ({
      ...node,
      state: active.includes(node.id) ? 'active' : visited.has(node.id) ? 'visited' : queue.includes(node.id) ? 'frontier' : undefined,
    })),
    edges: graph.edges.map((edge) => ({
      a: edge.a,
      b: edge.b,
      weight: edge.weight,
      state: edgeState.get(`${edge.a}|${edge.b}`) ?? edgeState.get(`${edge.b}|${edge.a}`),
    })),
    queue: queue.slice(),
    visited: [...visited],
    caption,
    directed: graph.directed,
  };
}

function runGraph(entry: LabEntry, params: Params): LabFrame[] {
  const graph = graphFromEntry(entry, params);
  const mode = entry.mode ?? 'bfs';
  const source = str(params, 'source', graph.nodes[0]?.id ?? 'A');
  const target = str(params, 'target', graph.nodes[graph.nodes.length - 1]?.id ?? 'F');
  const frames: LabFrame[] = [];
  const push = (queue: string[], visited: Set<string>, active: string[], caption: string, line: number, edgeState?: Map<string, string>, done = false): void => {
    frames.push({
      stage: graphStage(graph, queue, visited, active, caption, edgeState as never),
      narration: caption,
      metrics: { 已访问: visited.size, 队列: queue.length, 边数: graph.edges.length },
      codeLine: line,
      done,
    });
  };
  if (mode === 'dijkstra') {
    const distances = new Map<string, number>(graph.nodes.map((node) => [node.id, Infinity]));
    distances.set(source, 0);
    const settled = new Set<string>();
    const queue = [source];
    push(queue, settled, [source], `初始化：dist[${source}] = 0，其余为 ∞。`, 1);
    while (queue.length) {
      queue.sort((a, b) => (distances.get(a) ?? Infinity) - (distances.get(b) ?? Infinity));
      const current = queue.shift() as string;
      if (settled.has(current)) continue;
      settled.add(current);
      push(queue, settled, [current], `取出暂定距离最小的 ${current}（${distances.get(current)}）。`, 2);
      for (const edge of graph.edges.filter((item) => item.a === current || (!graph.directed && item.b === current))) {
        const next = edge.a === current ? edge.b : edge.a;
        const distance = (distances.get(current) ?? 0) + edge.weight;
        if (distance < (distances.get(next) ?? Infinity)) {
          distances.set(next, distance);
          queue.push(next);
          push(queue, settled, [next], `松弛 ${current} → ${next}，新距离 ${distance}。`, 3);
        }
      }
    }
    push([], settled, [], `完成；${target} 的最短距离为 ${distances.get(target)}。`, 4, undefined, true);
    return frames;
  }
  if (mode === 'prim') {
    const inTree = new Set<string>([source]);
    const chosen: string[] = [];
    push([], inTree, [source], `从 ${source} 开始，维护已加入树的集合。`, 1);
    while (inTree.size < graph.nodes.length) {
      const candidates = graph.edges.filter((edge) => inTree.has(edge.a) !== inTree.has(edge.b));
      if (!candidates.length) break;
      candidates.sort((a, b) => a.weight - b.weight);
      const edge = candidates[0];
      const next = inTree.has(edge.a) ? edge.b : edge.a;
      inTree.add(next);
      chosen.push(`${edge.a}–${edge.b}`);
      push([], inTree, [next], `加入最小割边 ${edge.a}–${edge.b}（权重 ${edge.weight}）。`, 2, new Map([[`${edge.a}|${edge.b}`, 'tree']]));
    }
    push([], inTree, [], `MST 完成，选中边：${chosen.join('，')}。`, 3, undefined, true);
    return frames;
  }
  if (mode === 'pagerank') {
    const scores = new Map<string, number>(graph.nodes.map((node) => [node.id, 1 / graph.nodes.length]));
    for (let iteration = 0; iteration < 8; iteration += 1) {
      const next = new Map<string, number>();
      for (const node of graph.nodes) {
        let inbound = 0;
        for (const edge of graph.edges) {
          if (edge.b === node.id) inbound += (scores.get(edge.a) ?? 0) / Math.max(1, graph.edges.filter((item) => item.a === edge.a).length);
        }
        next.set(node.id, 0.15 / graph.nodes.length + 0.85 * inbound);
      }
      for (const [id, score] of next) scores.set(id, score);
      const top = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
      push([], new Set(scores.keys()), [top?.[0] ?? source], `第 ${iteration + 1} 轮：最高分 ${top?.[0]} = ${top?.[1].toFixed(3)}。`, 2);
    }
    push([], new Set(scores.keys()), [], 'PageRank 收敛，按分数排序得到重要性。', 3, undefined, true);
    return frames;
  }
  if (mode === 'dfs') {
    const visited = new Set<string>();
    const stack = [source];
    push(stack, visited, [source], `从 ${source} 开始，用栈保存待访问节点。`, 1);
    while (stack.length) {
      const current = stack.pop() as string;
      if (visited.has(current)) continue;
      visited.add(current);
      const neighbors = graph.edges.filter((edge) => edge.a === current || (!graph.directed && edge.b === current)).map((edge) => (edge.a === current ? edge.b : edge.a));
      for (const neighbor of neighbors.reverse()) if (!visited.has(neighbor)) stack.push(neighbor);
      push(stack, visited, [current], `访问 ${current}，把邻居压栈；栈顶是下一条路径。`, 2);
      if (current === target) {
        push(stack, visited, [current], `到达目标 ${target}。`, 3, undefined, true);
        return frames;
      }
    }
    push(stack, visited, [], '栈为空，搜索结束。', 4, undefined, true);
    return frames;
  }
  if (mode === 'topo') {
    const indegree = new Map<string, number>(graph.nodes.map((node) => [node.id, 0]));
    for (const edge of graph.edges) indegree.set(edge.b, (indegree.get(edge.b) ?? 0) + 1);
    const ready = graph.nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
    const order: string[] = [];
    const visited = new Set<string>();
    push(ready, visited, ready, `入度为 0 的节点入队：${ready.join('、') || '无'}。`, 1);
    while (ready.length) {
      const current = ready.shift() as string;
      visited.add(current);
      order.push(current);
      for (const edge of graph.edges.filter((item) => item.a === current)) {
        const next = indegree.get(edge.b) ?? 0;
        indegree.set(edge.b, next - 1);
        if (next - 1 === 0) ready.push(edge.b);
      }
      push(ready, visited, [current], `取出 ${current}；删除它的出边，新的入度 0 节点入队。`, 2);
    }
    push([], visited, [], `拓扑序：${order.join(' → ')}${order.length < graph.nodes.length ? '（存在环，序列不完整）' : ''}。`, 3, undefined, true);
    return frames;
  }
  // BFS default.
  const visited = new Set<string>();
  const queue = [source];
  const order: string[] = [];
  push(queue, visited, [source], `从 ${source} 开始，FIFO 队列初始化为 [${source}]。`, 1);
  while (queue.length) {
    const current = queue.shift() as string;
    if (visited.has(current)) continue;
    visited.add(current);
    order.push(current);
    const neighbors = graph.edges.filter((edge) => edge.a === current || (!graph.directed && edge.b === current)).map((edge) => (edge.a === current ? edge.b : edge.a));
    for (const neighbor of neighbors) if (!visited.has(neighbor) && !queue.includes(neighbor)) queue.push(neighbor);
    push(queue, visited, [current], `弹出 ${current}，发现 ${neighbors.join('、') || '无新邻居'}；队列长度 ${queue.length}。`, 2);
    if (current === target) {
      push(queue, visited, [current], `第一次到达 ${target}，BFS 保证这是最少边数路径。`, 3, undefined, true);
      return frames;
    }
  }
  push(queue, visited, [], `队列为空，访问顺序：${order.join(' → ')}。`, 4, undefined, true);
  return frames;
}

/* ------------------------------------------------------------------ */
/* Tree                                                                */
/* ------------------------------------------------------------------ */

interface TreeNodeData {
  id: string;
  label: string;
  key: number;
  parent: string | null;
  left: string | null;
  right: string | null;
  color: 'red' | 'black';
}

function treePositions(nodes: TreeNodeData[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  let cursor = 0;
  const visit = (id: string | null, depth: number): void => {
    const node = nodes.find((item) => item.id === id);
    if (!node) return;
    visit(node.left, depth + 1);
    positions.set(node.id, { x: 38 + cursor * 34, y: 38 + depth * 44 });
    cursor += 1;
    visit(node.right, depth + 1);
  };
  const root = nodes.find((node) => node.parent === null);
  visit(root?.id ?? null, 0);
  return positions;
}

function treeStage(nodes: TreeNodeData[], active: string[], caption: string, path: string[] = []): TreeStage {
  const positions = treePositions(nodes);
  return {
    kind: 'tree',
    nodes: nodes.map((node) => ({
      id: node.id,
      label: node.label,
      x: positions.get(node.id)?.x ?? 20,
      y: positions.get(node.id)?.y ?? 20,
      parent: node.parent,
      state: active.includes(node.id) ? 'active' : path.includes(node.id) ? 'path' : undefined,
      color: node.color,
    })),
    caption,
  };
}

interface BNode {
  id: string;
  key: number;
  left: BNode | null;
  right: BNode | null;
  parent: BNode | null;
  height: number;
  color: 'red' | 'black';
}

function bHeight(node: BNode | null): number {
  return node ? node.height : 0;
}

function bUpdate(node: BNode): void {
  node.height = Math.max(bHeight(node.left), bHeight(node.right)) + 1;
}

function bRotateLeft(root: BNode, x: BNode): BNode {
  const y = x.right as BNode;
  x.right = y.left;
  if (y.left) y.left.parent = x;
  y.parent = x.parent;
  if (!x.parent) root = y;
  else if (x === x.parent.left) x.parent.left = y;
  else x.parent.right = y;
  y.left = x;
  x.parent = y;
  bUpdate(x);
  bUpdate(y);
  return root;
}

function bRotateRight(root: BNode, x: BNode): BNode {
  const y = x.left as BNode;
  x.left = y.right;
  if (y.right) y.right.parent = x;
  y.parent = x.parent;
  if (!x.parent) root = y;
  else if (x === x.parent.right) x.parent.right = y;
  else x.parent.left = y;
  y.right = x;
  x.parent = y;
  bUpdate(x);
  bUpdate(y);
  return root;
}

function avlInsert(root: BNode | null, key: number, id: string): { root: BNode; node: BNode } {
  const node: BNode = { id, key, left: null, right: null, parent: null, height: 1, color: 'black' };
  if (!root) return { root: node, node };
  let parent = root;
  while (true) {
    if (key < parent.key) {
      if (parent.left) parent = parent.left;
      else { parent.left = node; node.parent = parent; break; }
    } else if (parent.right) parent = parent.right;
    else { parent.right = node; node.parent = parent; break; }
  }
  let current: BNode | null = node;
  while (current) {
    bUpdate(current);
    const balance = bHeight(current.left) - bHeight(current.right);
    if (balance > 1) {
      if (current.left && key > current.left.key) root = bRotateLeft(root, current.left);
      root = bRotateRight(root, current);
    } else if (balance < -1) {
      if (current.right && key < current.right.key) root = bRotateRight(root, current.right);
      root = bRotateLeft(root, current);
    }
    current = current.parent;
  }
  return { root, node };
}

function rbInsert(root: BNode | null, key: number, id: string): BNode {
  const node: BNode = { id, key, left: null, right: null, parent: null, height: 1, color: 'red' };
  if (!root) {
    node.color = 'black';
    return node;
  }
  let parent = root;
  while (true) {
    if (key < parent.key) {
      if (parent.left) parent = parent.left;
      else { parent.left = node; node.parent = parent; break; }
    } else if (parent.right) parent = parent.right;
    else { parent.right = node; node.parent = parent; break; }
  }
  let current = node;
  while (current.parent?.color === 'red') {
    const parent = current.parent;
    const grand = parent.parent;
    if (!grand) break;
    if (parent === grand.left) {
      const uncle = grand.right;
      if (uncle?.color === 'red') {
        parent.color = 'black';
        uncle.color = 'black';
        grand.color = 'red';
        current = grand;
      } else {
        if (current === parent.right) {
          current = parent;
          root = bRotateLeft(root, current);
        }
        current.parent!.color = 'black';
        current.parent!.parent!.color = 'red';
        root = bRotateRight(root, current.parent!.parent!);
      }
    } else {
      const uncle = grand.left;
      if (uncle?.color === 'red') {
        parent.color = 'black';
        uncle.color = 'black';
        grand.color = 'red';
        current = grand;
      } else {
        if (current === parent.left) {
          current = parent;
          root = bRotateRight(root, current);
        }
        current.parent!.color = 'black';
        current.parent!.parent!.color = 'red';
        root = bRotateLeft(root, current.parent!.parent!);
      }
    }
  }
  root.color = 'black';
  return root;
}

function bTreeData(root: BNode | null): TreeNodeData[] {
  const nodes: TreeNodeData[] = [];
  const visit = (node: BNode | null): void => {
    if (!node) return;
    nodes.push({
      id: node.id,
      label: String(node.key),
      key: node.key,
      parent: node.parent?.id ?? null,
      left: node.left?.id ?? null,
      right: node.right?.id ?? null,
      color: node.color,
    });
    visit(node.left);
    visit(node.right);
  };
  visit(root);
  return nodes;
}

function bFind(root: BNode | null, target: number): BNode[] {
  const path: BNode[] = [];
  let node = root;
  while (node) {
    path.push(node);
    if (target === node.key) break;
    node = target < node.key ? node.left : node.right;
  }
  return path;
}

function runBalancedTree(mode: 'avl' | 'rb', params: Params): LabFrame[] {
  const count = Math.round(num(params, 'keys', 7));
  const target = Math.round(num(params, 'target', 42));
  const rng = random(num(params, 'seed', 2026) + count * 7);
  const keys = Array.from({ length: count }, () => 1 + Math.floor(rng() * 90));
  let root: BNode | null = null;
  const frames: LabFrame[] = [];
  let nextId = 1;
  const push = (active: string[], caption: string, line = 2, done = false): void => {
    const nodes = bTreeData(root);
    const height = nodes.length ? Math.max(...nodes.map((node) => depthOf(nodes, node.id))) : 0;
    frames.push({
      stage: treeStage(nodes, active, caption),
      narration: caption,
      metrics: { 节点数: nodes.length, 高度: height, 查找目标: target },
      codeLine: line,
      done,
    });
  };
  push([], '空树，准备插入键值。');
  for (const key of keys) {
    if (mode === 'avl') {
      const result = avlInsert(root, key, `n${nextId++}`);
      root = result.root;
    } else {
      root = rbInsert(root, key, `n${nextId++}`);
    }
    const inserted = bFind(root, key);
    const current = inserted[inserted.length - 1];
    push([current?.id ?? ''], mode === 'avl'
      ? `插入 ${key}；回溯更新高度并检查平衡因子。`
      : `插入 ${key}（红）；按红黑规则变色/旋转，根保持黑色。`, 3);
  }
  const path = bFind(root, target);
  for (const node of path) push([node.id], `查找 ${target}：比较节点 ${node.key}。`, 4);
  push(path.map((node) => node.id), path[path.length - 1]?.key === target ? `命中 ${target}。` : `${target} 不在树中。`, 5, true);
  return frames;
}

function runTree(entry: LabEntry, params: Params): LabFrame[] {
  const mode = entry.mode ?? 'bst';
  if (mode === 'avl' || mode === 'rb') return runBalancedTree(mode, params);
  if (entry.visual?.type === 'tree' && !['bst', 'avl', 'rb'].includes(mode)) {
    return runTreeTraversal(entry, params);
  }
  const count = Math.round(num(params, 'keys', 7));
  const target = Math.round(num(params, 'target', 42));
  const rng = random(num(params, 'seed', 2026) + count * 13);
  const keys = Array.from({ length: count }, () => 1 + Math.floor(rng() * 90));
  const nodes: TreeNodeData[] = [];
  const frames: LabFrame[] = [];
  let height = 0;
  const push = (active: string[], caption: string, line = 1, done = false): void => {
    frames.push({
      stage: treeStage(nodes, active, caption),
      narration: caption,
      metrics: { 节点数: nodes.length, 高度: height, 查找目标: target },
      codeLine: line,
      done,
    });
  };
  push([], '空树，准备逐个插入键值。');
  for (const key of keys) {
    let parent: TreeNodeData | null = null;
    let current: TreeNodeData | null = nodes.find((node) => node.parent === null) ?? null;
    while (current) {
      parent = current;
      if (key < current.key) current = nodes.find((node) => node.id === current?.left) ?? null;
      else current = nodes.find((node) => node.id === current?.right) ?? null;
    }
    const id = `n${nodes.length + 1}`;
    const node: TreeNodeData = { id, label: String(key), key, parent: parent?.id ?? null, left: null, right: null, color: 'red' };
    nodes.push(node);
    if (parent) {
      if (key < parent.key) parent.left = id;
      else parent.right = id;
    }
    height = Math.max(height, depthOf(nodes, id));
    push([id], `插入 ${key}：沿比较路径落到空指针，成为${parent ? ` ${parent.label} 的子节点` : '根节点'}。`, 2);
  }
  // Search target along the BST path.
  let current = nodes.find((node) => node.parent === null) ?? null;
  const path: string[] = [];
  while (current) {
    path.push(current.id);
    push([current.id], `查找 ${target}：比较当前节点 ${current.label}。`, 4);
    if (current.key === target) {
      push([current.id], `命中 ${target}。`, 4, true);
      return frames;
    }
    const currentKey = current.key;
    const nextId = target < currentKey ? current.left : current.right;
    current = nodes.find((node) => node.id === nextId) ?? null;
  }
  push(path, `${target} 不在树中；查找路径长度为 ${path.length}。`, 5, true);
  return frames;
}

function depthOf(nodes: TreeNodeData[], id: string): number {
  let depth = 1;
  let node = nodes.find((item) => item.id === id);
  while (node?.parent) {
    depth += 1;
    node = nodes.find((item) => item.id === node?.parent);
  }
  return depth;
}

function runTreeTraversal(entry: LabEntry, params: Params): LabFrame[] {
  if (entry.visual?.type !== 'tree') return [];
  const visual = entry.visual;
  const limit = Math.max(2, Math.round(num(params, 'limit', visual.nodes.length)));
  const nodes: TreeNodeData[] = visual.nodes.map((node, index) => ({
    id: node.id,
    label: node.label,
    key: index,
    parent: node.parent,
    left: null,
    right: null,
    color: 'black',
  }));
  const frames: LabFrame[] = [];
  const visited: string[] = [];
  const queue = [nodes.find((node) => node.parent === null)?.id ?? nodes[0]?.id].filter(Boolean) as string[];
  while (queue.length && visited.length < limit) {
    const id = queue.shift() as string;
    visited.push(id);
    const children = nodes.filter((node) => node.parent === id);
    queue.push(...children.map((child) => child.id));
    const current = nodes.find((node) => node.id === id);
    frames.push({
      stage: treeStage(nodes, [id], `访问 ${current?.label ?? id}；队列加入 ${children.map((child) => child.label).join('、') || '无子节点'}。`),
      narration: `访问 ${current?.label ?? id}`,
      metrics: { 已访问: visited.length, 队列: queue.length, 节点总数: nodes.length },
      codeLine: 2,
    });
  }
  if (frames.length) frames[frames.length - 1].done = true;
  return frames;
}

/* ------------------------------------------------------------------ */
/* Matrix / attention / LCS                                            */
/* ------------------------------------------------------------------ */

function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exp = values.map((value) => Math.exp(value - max));
  const sum = exp.reduce((total, value) => total + value, 0);
  return exp.map((value) => value / (sum || 1));
}

function entropy(values: number[]): number {
  return -values.reduce((total, value) => total + (value > 0 ? value * Math.log2(value) : 0), 0);
}

function runAttention(params: Params): LabFrame[] {
  const tokens = [...str(params, 'tokens', '寻径让算法可见')].slice(0, 7);
  const heads = Math.max(1, Math.min(4, num(params, 'heads', 3)));
  const mask = str(params, 'mask', 'on') === 'on';
  const rng = random(num(params, 'seed', 2026) + tokens.length * 19);
  const dim = 8;
  const vectors = tokens.map(() => Array.from({ length: dim }, () => rng() * 2 - 1));
  const frames: LabFrame[] = [];
  const queryIndex = tokens.length - 1;
  const scoreScale = Math.sqrt(dim) * Math.sqrt(heads);
  const scores = tokens.map((_, index) => vectors[queryIndex].reduce((total, value, dimIndex) => total + value * vectors[index][dimIndex], 0) / scoreScale);
  for (let index = 0; index < scores.length; index += 1) if (mask && index > queryIndex) scores[index] = -Infinity;
  const weights = softmax(scores);
  const cells = tokens.map((_, row) => tokens.map((_, col) => {
    if (mask && col > row) return '–';
    const rowScores = tokens.map((__, index) => vectors[row].reduce((total, value, dimIndex) => total + value * vectors[index][dimIndex], 0) / scoreScale);
    return (softmax(rowScores.filter((__, index) => !mask || index <= row))[col] ?? 0).toFixed(2);
  }));
  const push = (active: Array<[number, number]>, caption: string, line: number, done = false): void => {
    frames.push({
      stage: {
        kind: 'matrix',
        rows: tokens,
        cols: tokens,
        cells,
        active,
        path: active,
        caption,
      },
      narration: caption,
      metrics: { 头数: heads, 当前行熵: entropy(weights).toFixed(2), 最大权重: Math.max(...weights).toFixed(2), 掩码: mask ? '开启' : '关闭' },
      codeLine: line,
      done,
    });
  };
  push([], 'token 序列与 Q/K/V 投影就绪；计算每对 token 的缩放点积分数。', 1);
  for (let row = 0; row < tokens.length; row += 1) {
    const rowScores = tokens.map((_, index) => vectors[row].reduce((total, value, dimIndex) => total + value * vectors[index][dimIndex], 0) / scoreScale);
    for (let col = 0; col < tokens.length; col += 1) {
      if (mask && col > row) continue;
      push([[row, col]], `计算 ${tokens[row]} 对 ${tokens[col]} 的分数，准备做 softmax。`, 2);
    }
    const rowWeights = softmax(rowScores.map((score, index) => (mask && index > row ? -Infinity : score)));
    push([[row, row]], `第 ${row + 1} 行 softmax 完成，最大权重 ${Math.max(...rowWeights).toFixed(2)}。`, 3);
  }
  push([[queryIndex, 0]], '用注意力权重对 V 加权求和，得到每个 query 的上下文向量。', 4, true);
  return frames;
}

function lcsFrames(params: Params): LabFrame[] {
  const a = str(params, 'a', 'ABCBDAB').slice(0, 12);
  const b = str(params, 'b', 'BDCABA').slice(0, 12);
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  const frames: LabFrame[] = [];
  const push = (active: Array<[number, number]>, caption: string, line: number, done = false): void => {
    const cells = table.map((row) => row.map((value) => value === 0 ? '0' : value));
    frames.push({
      stage: { kind: 'matrix', rows: ['∅', ...a.split('')], cols: ['∅', ...b.split('')], cells, active, caption },
      narration: caption,
      metrics: { 比较单元: frames.length, '当前 LCS': table[a.length][b.length], '序列 A': a, '序列 B': b },
      codeLine: line,
      done,
    });
  };
  push([], '初始化第一行与第一列为 0。', 0);
  for (let row = 1; row <= a.length; row += 1) {
    for (let col = 1; col <= b.length; col += 1) {
      if (a[row - 1] === b[col - 1]) table[row][col] = table[row - 1][col - 1] + 1;
      else table[row][col] = Math.max(table[row - 1][col], table[row][col - 1]);
      push([[row, col]], `比较 ${a[row - 1]} 与 ${b[col - 1]}，填写 dp[${row}][${col}] = ${table[row][col]}。`, 2);
    }
  }
  push([[a.length, b.length]], `LCS 长度 = ${table[a.length][b.length]}；从右下角回溯可得到具体序列。`, 4, true);
  return frames;
}

function runMatrix(entry: LabEntry, params: Params): LabFrame[] {
  if (entry.mode === 'attention') return runAttention(params);
  if (entry.mode === 'lcs') return lcsFrames(params);
  const visual = entry.visual?.type === 'matrix' ? entry.visual : null;
  const visualCells = visual ? visual.cells.map((row) => row.slice()) : [];
  const requested = Math.round(num(params, 'size', visualCells.length || 6));
  const size = visualCells.length ? Math.max(2, Math.min(visualCells.length, requested)) : requested;
  const colsCount = visualCells[0]?.length ? Math.max(2, Math.min(visualCells[0].length, requested)) : size;
  const rng = random(num(params, 'seed', 2026) + size * 11);
  const cells: Array<Array<string | number>> = visual
    ? visualCells.slice(0, size).map((row) => row.slice(0, colsCount))
    : Array.from({ length: size }, () => Array.from({ length: colsCount }, () => Math.floor(rng() * 10)));
  const rows = (visual?.rowLabels ?? Array.from({ length: size }, (_, index) => `r${index + 1}`)).slice(0, size);
  const cols = (visual?.colLabels ?? Array.from({ length: colsCount }, (_, index) => `c${index + 1}`)).slice(0, colsCount);
  const frames: LabFrame[] = [];
  let accesses = 0;
  const push = (active: Array<[number, number]>, caption: string, done = false): void => {
    frames.push({
      stage: { kind: 'matrix', rows, cols, cells: cells.map((row) => row.slice()), active, caption },
      narration: caption,
      metrics: { 访问单元: accesses, 行数: size, 列数: size },
      codeLine: done ? 3 : 2,
      done,
    });
  };
  push([], '矩阵就绪，按行扫描并累积局部结果。');
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      accesses += 1;
      push([[row, col]], `访问 (${row + 1}, ${col + 1}) = ${cells[row][col]}，当前累计 ${cells[row].slice(0, col + 1).reduce<number>((total, value) => total + Number(value || 0), 0)}。`);
    }
  }
  push([[size - 1, size - 1]], '扫描完成，得到逐行累积结果。', true);
  return frames;
}

/* ------------------------------------------------------------------ */
/* Chart / numeric                                                     */
/* ------------------------------------------------------------------ */

function gradientFrames(entry: LabEntry, params: Params): LabFrame[] {
  const fn = str(params, 'function', 'bowl');
  const lr = num(params, 'lr', 0.12);
  const iterations = Math.round(num(params, 'iterations', 28));
  const rng = random(num(params, 'seed', 2026));
  let x = fn === 'rosenbrock' ? -1.4 + rng() * 0.4 : -1.8 + rng() * 0.5;
  let y = fn === 'rosenbrock' ? 1.4 + rng() * 0.3 : 1.8 - rng() * 0.5;
  const trajectory: Array<[number, number]> = [];
  const curve: Array<[number, number]> = [];
  const loss = (px: number, py: number): number => {
    if (fn === 'rosenbrock') return (1 - px) ** 2 + 100 * (py - px * px) ** 2;
    if (fn === 'anisotropic') return 0.15 * px * px + 4 * py * py;
    return px * px + 0.8 * py * py;
  };
  const gradient = (px: number, py: number): [number, number] => {
    if (fn === 'rosenbrock') return [-2 * (1 - px) - 400 * px * (py - px * px), 200 * (py - px * px)];
    if (fn === 'anisotropic') return [0.3 * px, 8 * py];
    return [2 * px, 1.6 * py];
  };
  const points: Array<{ loss: number; gx: number; gy: number }> = [];
  for (let step = 0; step < iterations; step += 1) {
    const [gx, gy] = gradient(x, y);
    const currentLoss = loss(x, y);
    trajectory.push([x, y]);
    curve.push([step + 1, currentLoss]);
    points.push({ loss: currentLoss, gx, gy });
    x -= lr * gx;
    y -= lr * gy;
  }
  const frames: LabFrame[] = [];
  for (let step = 0; step < points.length; step += 1) {
    const current = points[step];
    frames.push({
      stage: {
        kind: 'chart',
        series: [
          { points: curve.slice(), color: 'var(--accent)' },
        ],
        marker: [step + 1, current.loss],
        xLabel: 'iteration',
        yLabel: 'loss',
        caption: `第 ${step + 1} 步：loss = ${current.loss.toFixed(4)}，梯度 = (${current.gx.toFixed(2)}, ${current.gy.toFixed(2)})。完整收敛曲线已预览。`,
      },
      narration: `第 ${step + 1} 步：计算梯度并更新参数。`,
      metrics: { 迭代: step + 1, loss: current.loss.toFixed(4), 梯度范数: Math.hypot(current.gx, current.gy).toFixed(3), 学习率: lr },
      codeLine: 3,
      done: step === points.length - 1,
    });
  }
  return frames;
}

function hullFrames(entry: LabEntry, params: Params): LabFrame[] {
  const count = Math.round(num(params, 'points', 16));
  const rng = random(num(params, 'seed', 2026) + count);
  const points: Array<[number, number]> = Array.from({ length: count }, () => [Math.round(rng() * 100), Math.round(rng() * 100)]);
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Array<[number, number]> = [];
  const frames: LabFrame[] = [];
  const push = (hull: Array<[number, number]>, caption: string, done = false): void => {
    frames.push({
      stage: {
        kind: 'chart',
        series: [
          { points, color: 'var(--muted)', },
          { points: hull, color: 'var(--accent)' },
        ],
        xLabel: 'x',
        yLabel: 'y',
        caption,
      },
      narration: caption,
      metrics: { 点数: count, 凸包点数: hull.length, 当前点: hull[hull.length - 1]?.join(',') ?? '—' },
      codeLine: done ? 4 : 2,
      done,
    });
  };
  push([], '按 x 坐标排序；开始构造下凸壳。');
  for (const point of points) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
    push(lower.slice(), `加入 (${point.join(', ')})，用叉积弹出右转点。`);
  }
  push(lower.slice(), '下凸壳完成；对称构造上凸壳即可得到完整凸包。', true);
  return frames;
}

function chartFrames(entry: LabEntry, params: Params): LabFrame[] {
  const visual = entry.visual?.type === 'chart' ? entry.visual : null;
  if (!visual) return [];
  const available = Math.max(2, ...visual.series.map((series) => series.points.length));
  const total = Math.max(2, Math.min(available, Math.round(num(params, 'samples', available))));
  const frames: LabFrame[] = [];
  for (let step = 0; step < total; step += 1) {
    const reveal = Math.min(1, (step + 1) / total);
    const series = visual.series.map((item) => {
      const count = Math.max(2, Math.round(item.points.length * reveal));
      return { points: item.points.slice(0, count), color: item.color, dashed: item.mode === 'dots' };
    });
    const markerSeries = visual.series[0];
    const markerIndex = Math.min(markerSeries.points.length - 1, Math.round((markerSeries.points.length - 1) * reveal));
    frames.push({
      stage: {
        kind: 'chart',
        series,
        marker: markerSeries.points[markerIndex],
        xLabel: visual.xLabel ?? 'x',
        yLabel: visual.yLabel ?? 'y',
        caption: visual.caption ?? `扫描到第 ${step + 1} 个数据点。`,
      },
      narration: `第 ${step + 1} / ${total} 个数据点：${markerSeries.points[markerIndex]?.join(', ') ?? '—'}`,
      metrics: { 数据点: total, 当前: step + 1, 进度: `${Math.round(reveal * 100)}%` },
      codeLine: 2,
      done: step === total - 1,
    });
  }
  return frames;
}

function runChart(entry: LabEntry, params: Params): LabFrame[] {
  if (entry.mode === 'hull') return hullFrames(entry, params);
  if (entry.domain === 'optimization' || entry.mode === 'gd') return gradientFrames(entry, params);
  const visual = entry.visual?.type === 'chart' ? entry.visual : null;
  if (visual) return chartFrames(entry, params);
  return gradientFrames(entry, params);
}

/* ------------------------------------------------------------------ */
/* Timeline / scheduling                                               */
/* ------------------------------------------------------------------ */

interface Job { id: string; arrival: number; burst: number; priority: number; deadline: number }

function jobsFor(params: Params): Job[] {
  const count = Math.round(num(params, 'jobs', 5));
  const rng = random(num(params, 'seed', 2026) + count * 29);
  return Array.from({ length: count }, (_, index) => ({
    id: `P${index + 1}`,
    arrival: Math.floor(rng() * 5),
    burst: 2 + Math.floor(rng() * 6),
    priority: 1 + Math.floor(rng() * 5),
    deadline: 5 + Math.floor(rng() * 15),
  }));
}

function scheduleFrames(mode: string, params: Params): LabFrame[] {
  const jobs = jobsFor(params);
  const quantum = Math.max(1, Math.round(num(params, 'quantum', 2)));
  const rows = jobs.map((job) => ({ label: job.id, blocks: [] as Array<{ start: number; end: number; label: string; tone?: string }> }));
  const remaining = new Map(jobs.map((job) => [job.id, job.burst]));
  const arrival = new Map(jobs.map((job) => [job.id, job.arrival]));
  const done = new Set<string>();
  const frames: LabFrame[] = [];
  let time = 0;
  let waiting = 0;
  let executed = 0;
  const push = (caption: string, doneFlag = false): void => {
    const max = Math.max(1, time, ...rows.flatMap((row) => row.blocks.map((block) => block.end)));
    frames.push({
      stage: { kind: 'timeline', rows: rows.map((row) => ({ ...row, blocks: row.blocks.slice() })), now: time, max: max + 1, caption },
      narration: caption,
      metrics: { 时间: time, 完成: done.size, 平均等待: done.size ? (waiting / done.size).toFixed(1) : '—', 时间片: quantum },
      codeLine: doneFlag ? 5 : 3,
      done: doneFlag,
    });
  };
  push(`作业 ${jobs.map((job) => `${job.id}(到达${job.arrival}, 运行${job.burst})`).join('，')}。`);
  if (mode === 'lpt') {
    const machines = Array.from({ length: 3 }, (_, index) => ({ label: `M${index + 1}`, blocks: [] as Array<{ start: number; end: number; label: string; tone?: string }> }));
    const sorted = jobs.slice().sort((a, b) => b.burst - a.burst);
    for (const job of sorted) {
      const target = machines.reduce((best, machine) => {
        const load = machine.blocks.reduce((total, block) => total + block.end - block.start, 0);
        return load < best.load ? { machine, load } : best;
      }, { machine: machines[0], load: Infinity });
      const start = target.machine.blocks.reduce((max, block) => Math.max(max, block.end), 0);
      target.machine.blocks.push({ start, end: start + job.burst, label: job.id });
      push(`LPT 把 ${job.id}（${job.burst}）放到当前负载最小的 ${target.machine.label}。`);
    }
    frames.push({
      stage: { kind: 'timeline', rows: machines, now: 0, max: Math.max(...machines.flatMap((m) => m.blocks.map((b) => b.end))), caption: '多机 LPT 分配完成。' },
      narration: 'LPT 分配完成。', metrics: { 机器数: 3, makespan: Math.max(...machines.flatMap((m) => m.blocks.map((b) => b.end))), 作业数: jobs.length }, codeLine: 4, done: true,
    });
    return frames;
  }
  const ready: Job[] = [];
  const admitted = new Set<string>();
  let current: Job | null = null;
  while (done.size < jobs.length && time < 80) {
    for (const job of jobs) {
      if (!admitted.has(job.id) && job.arrival <= time) {
        admitted.add(job.id);
        ready.push(job);
      }
    }
    if (!current && ready.length) {
      if (mode === 'sjf') ready.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
      else if (mode === 'priority') ready.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);
      else if (mode === 'edf') ready.sort((a, b) => a.deadline - b.deadline || a.arrival - b.arrival);
      else ready.sort((a, b) => a.arrival - b.arrival || a.id.localeCompare(b.id));
      current = ready.shift() ?? null;
    }
    if (!current) {
      const next = jobs.filter((job) => !admitted.has(job.id)).map((job) => job.arrival);
      time = next.length ? Math.max(time + 1, Math.min(...next)) : time + 1;
      continue;
    }
    const runtime = mode === 'rr' ? quantum : current.burst;
    const left = remaining.get(current.id) ?? 0;
    const amount = Math.min(left, runtime);
    const row = rows.find((item) => item.label === current?.id);
    const job = current;
    row?.blocks.push({ start: time, end: time + amount, label: job.id });
    time += amount;
    remaining.set(job.id, left - amount);
    executed += 1;
    if ((remaining.get(job.id) ?? 0) <= 0) {
      done.add(job.id);
      waiting += Math.max(0, time - job.arrival - job.burst);
      push(`${job.id} 完成；时间推进到 ${time}。`);
      current = null;
    } else {
      push(`${job.id} 用完时间片，剩余 ${remaining.get(job.id)}，回到就绪队列。`);
      ready.push(job);
      current = null;
    }
    if (executed > 40) break;
  }
  push(`调度完成，时间 ${time}；平均等待时间 ${(waiting / Math.max(1, done.size)).toFixed(1)}。`, true);
  return frames;
}

function runTimeline(entry: LabEntry, params: Params): LabFrame[] {
  if (entry.visual?.type === 'timeline' && !entry.legacy) {
    const visual = entry.visual;
    const max = visual.max ?? Math.max(1, ...visual.rows.flatMap((row) => row.blocks.map((block) => block.end)));
    const frameCount = Math.max(4, Math.round(num(params, 'steps', 10)));
    const frames: LabFrame[] = [];
    for (let step = 0; step < frameCount; step += 1) {
      const now = (step / Math.max(1, frameCount - 1)) * max;
      frames.push({
        stage: { kind: 'timeline', rows: visual.rows.map((row) => ({ ...row, blocks: row.blocks.slice() })), now, max, caption: visual.caption ?? `时间推进到 ${now.toFixed(1)}。` },
        narration: `时间 ${now.toFixed(1)} / ${max}：观察每个资源上的占用区间。`,
        metrics: { 时间: now.toFixed(1), 资源行: visual.rows.length, 区间数: visual.rows.reduce((total, row) => total + row.blocks.length, 0) },
        codeLine: 2,
        done: step === frameCount - 1,
      });
    }
    return frames;
  }
  return scheduleFrames(entry.mode ?? 'fcfs', params);
}

/* ------------------------------------------------------------------ */
/* Frames / page replacement                                           */
/* ------------------------------------------------------------------ */

function pageFrames(params: Params): LabFrame[] {
  const frameCount = Math.max(2, Math.round(num(params, 'frames', 4)));
  const length = Math.max(8, Math.round(num(params, 'refLength', 16)));
  const algorithm = str(params, 'algorithm', 'lru');
  const rng = random(num(params, 'seed', 2026) + length);
  const reference = Array.from({ length }, () => String(1 + Math.floor(rng() * 6)));
  const frames = new Array<string | null>(frameCount).fill(null);
  const framesOut: LabFrame[] = [];
  let hits = 0;
  let faults = 0;
  const lastUsed = new Map<string, number>();
  const push = (cursor: number, hit: boolean | undefined, victim: string | null, caption: string, done = false): void => {
    framesOut.push({
      stage: { kind: 'frames', frames: frames.slice(), reference, cursor, hit, victim, caption },
      narration: caption,
      metrics: { 命中: hits, 缺页: faults, 命中率: `${Math.round((hits / Math.max(1, cursor + 1)) * 100)}%`, 帧数: frameCount },
      codeLine: done ? 4 : hit ? 1 : 3,
      done,
    });
  };
  push(0, undefined, null, `引用串：${reference.join(' ')}；物理帧 ${frameCount} 个。`);
  for (let index = 0; index < reference.length; index += 1) {
    const page = reference[index];
    if (frames.includes(page)) {
      hits += 1;
      lastUsed.set(page, index);
      push(index, true, null, `访问 ${page}：命中，帧状态不变。`, index === reference.length - 1);
    } else {
      faults += 1;
      let victimIndex = frames.indexOf(null);
      let victim: string | null = null;
      if (victimIndex === -1) {
        if (algorithm === 'fifo') victimIndex = index % frameCount;
        else if (algorithm === 'opt') {
          let farthest = -1;
          frames.forEach((candidate, frameIndex) => {
            const nextUse = reference.indexOf(candidate ?? '', index + 1);
            const distance = nextUse === -1 ? Infinity : nextUse;
            if (distance > farthest) { farthest = distance; victimIndex = frameIndex; }
          });
        } else {
          let least = Infinity;
          frames.forEach((candidate, frameIndex) => {
            const used = candidate === null ? -1 : (lastUsed.get(candidate) ?? -1);
            if (used < least) { least = used; victimIndex = frameIndex; }
          });
        }
        victim = frames[victimIndex];
      }
      if (victim) lastUsed.delete(victim);
      frames[victimIndex] = page;
      lastUsed.set(page, index);
      push(index, false, victim, `访问 ${page}：缺页，淘汰 ${victim ?? '空帧'}，装入 ${page}。`, index === reference.length - 1);
    }
  }
  return framesOut;
}

function runFrames(entry: LabEntry, params: Params): LabFrame[] {
  if (/page|paging|tlb|cache/i.test(entry.id) || entry.mode === 'lru') return pageFrames(params);
  const cells = entry.visual?.type === 'memory' ? entry.visual.cells : ['A', 'B', 'C', 'D'];
  const frames: LabFrame[] = [];
  for (let index = 0; index < cells.length; index += 1) {
    frames.push({
      stage: { kind: 'frames', frames: [cells[index]], reference: cells, cursor: index, hit: true, caption: `访问单元格 ${cells[index]}。` },
      narration: `访问单元格 ${cells[index]}。`,
      metrics: { 访问: index + 1, 单元数: cells.length, 命中: index + 1 },
      codeLine: 1,
      done: index === cells.length - 1,
    });
  }
  return frames;
}

/* ------------------------------------------------------------------ */
/* Table / stack / vector / layers / pipeline / topology               */
/* ------------------------------------------------------------------ */

function runTable(entry: LabEntry, params: Params): LabFrame[] {
  const visual = entry.visual?.type === 'table' ? entry.visual : null;
  const columns = visual?.columns ?? ['key', 'value', 'state'];
  const allRows = visual?.rows ?? Array.from({ length: Math.round(num(params, 'rows', 6)) }, (_, index) => [`k${index + 1}`, String(1 + Math.floor(random(num(params, 'seed', 2026) + index)() * 90)), 'active']);
  const data = allRows.slice(0, Math.max(3, Math.min(allRows.length, Math.round(num(params, 'rows', allRows.length)))));
  const frames: LabFrame[] = [];
  for (let index = 0; index < data.length; index += 1) {
    frames.push({
      stage: { kind: 'table', columns, rows: data.slice(), activeRow: index, caption: `扫描第 ${index + 1} 行：${data[index].join(' · ')}。` },
      narration: `处理 ${data[index][0]}。`,
      metrics: { 行数: data.length, 当前行: index + 1, 已处理: index + 1 },
      codeLine: 1,
      done: index === data.length - 1,
    });
  }
  return frames;
}

function runStack(entry: LabEntry, params: Params): LabFrame[] {
  const count = Math.round(num(params, 'items', 7));
  const source = entry.visual?.type === 'stack'
    ? entry.visual.items.slice(0, Math.max(2, Math.min(entry.visual.items.length, count)))
    : Array.from({ length: count }, (_, index) => `x${index + 1}`);
  const items: string[] = [];
  const frames: LabFrame[] = [];
  for (let index = 0; index < source.length; index += 1) {
    items.push(source[index]);
    frames.push({
      stage: { kind: 'stack', items: items.slice(), active: items.length - 1, caption: `push ${source[index]}，栈顶变为 ${source[index]}。` },
      narration: `push ${source[index]}`,
      metrics: { 栈大小: items.length, 栈顶: items[items.length - 1], 操作: 'push' },
      codeLine: 1,
    });
  }
  while (items.length) {
    const popped = items.pop();
    frames.push({
      stage: { kind: 'stack', items: items.slice(), active: items.length - 1, caption: `pop ${popped}，栈顶变为 ${items[items.length - 1] ?? '空'}。` },
      narration: `pop ${popped}`,
      metrics: { 栈大小: items.length, 栈顶: items[items.length - 1] ?? '—', 操作: 'pop' },
      codeLine: 2,
      done: items.length === 0,
    });
  }
  return frames;
}

function runVector(entry: LabEntry, params: Params): LabFrame[] {
  const dimension = Math.max(2, Math.round(num(params, 'dimension', 4)));
  const rng = random(num(params, 'seed', 2026));
  const visual = entry.visual?.type === 'vector' ? entry.visual : null;
  const vectors = visual
    ? visual.vectors.map((row) => row.slice(0, Math.max(2, Math.min(row.length, dimension))))
    : Array.from({ length: 5 }, () => Array.from({ length: dimension }, () => Math.round((rng() * 2 - 1) * 10) / 10));
  const labels = visual?.labels ?? vectors.map((_, index) => `v${index + 1}`);
  const frames: LabFrame[] = [];
  const query = vectors[0];
  for (let index = 0; index < vectors.length; index += 1) {
    const dot = vectors[index].reduce((total, value, dim) => total + value * (query[dim] ?? 0), 0);
    frames.push({
      stage: { kind: 'vector', vectors: vectors.map((row) => row.slice()), labels, activeRow: index, caption: `计算 ${labels[index]} 与 query 的点积 ${dot.toFixed(2)}。` },
      narration: `${labels[index]} · query = ${dot.toFixed(2)}`,
      metrics: { 维度: vectors[index]?.length ?? 0, 当前行: index + 1, 点积: dot.toFixed(2) },
      codeLine: 1,
      done: index === vectors.length - 1,
    });
  }
  return frames;
}

function runLayers(entry: LabEntry, params: Params): LabFrame[] {
  const depth = Math.round(num(params, 'depth', 4));
  const width = Math.round(num(params, 'width', 6));
  const visualLayers = entry.visual?.type === 'layers' ? entry.visual.layers : [];
  const source = visualLayers.length
    ? visualLayers.map((layer) => ({ label: layer.label, sub: layer.sub ?? `width ${width}`, value: '—' }))
    : Array.from({ length: depth }, (_, index) => ({ label: `L${index + 1}`, sub: `width ${width}`, value: '—' }));
  const layers = source.slice(0, Math.max(2, Math.min(source.length, depth)));
  const frames: LabFrame[] = [];
  for (let index = 0; index < layers.length; index += 1) {
    layers[index].value = (Math.sin(index + 1) * 1.2).toFixed(2);
    frames.push({
      stage: { kind: 'layers', layers: layers.map((layer) => ({ ...layer })), active: index, caption: `前向传播到第 ${index + 1} 层“${layers[index].label}”，激活值 ${layers[index].value}。` },
      narration: `第 ${index + 1} 层 ${layers[index].label}：h = activation(W h + b)`,
      metrics: { 层数: layers.length, 宽度: width, 当前层: index + 1 },
      codeLine: 2,
      done: index === layers.length - 1,
    });
  }
  // Backward pass gives the lab a second, meaningful phase even for shallow nets.
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    frames.push({
      stage: { kind: 'layers', layers: layers.map((layer) => ({ ...layer })), active: index, caption: `反向传播到“${layers[index].label}”，用链式法则累积梯度。` },
      narration: `反向第 ${index + 1} 层 ${layers[index].label}：δ = (Wᵀ δ) ⊙ σ'(z)`,
      metrics: { 层数: layers.length, 宽度: width, 当前层: index + 1, 阶段: 'backward' },
      codeLine: 3,
      done: index === 0,
    });
  }
  return frames;
}

function runPipeline(entry: LabEntry, params: Params): LabFrame[] {
  const batch = Math.round(num(params, 'batch', 5));
  const steps = entry.visual?.type === 'pipeline' ? entry.visual.steps : ['取指', '译码', '执行', '访存', '写回'];
  const frames: LabFrame[] = [];
  for (let index = 0; index < steps.length; index += 1) {
    frames.push({
      stage: { kind: 'pipeline', steps, active: index, caption: `批次 ${batch}：进入阶段“${steps[index]}”。` },
      narration: `阶段 ${index + 1}：${steps[index]}`,
      metrics: { 阶段: index + 1, 总阶段: steps.length, 批次: batch },
      codeLine: index,
      done: index === steps.length - 1,
    });
  }
  return frames;
}

function topologyFrames(entry: LabEntry, params: Params): LabFrame[] {
  const visual = entry.visual?.type === 'topology' ? entry.visual : null;
  const allLabels = visual?.labels ?? Array.from({ length: Math.round(num(params, 'nodes', 8)) }, (_, index) => `n${index + 1}`);
  const count = Math.max(3, Math.min(allLabels.length, Math.round(num(params, 'nodes', allLabels.length))));
  const labels = allLabels.slice(0, count);
  const kind = str(params, 'kind', visual?.kind ?? 'mesh');
  const failure = num(params, 'failure', 0);
  const rng = random(num(params, 'seed', 2026) + count);
  const nodes = labels.map((label, index) => ({
    id: label,
    label,
    x: 40 + (index % 4) * 70,
    y: 38 + Math.floor(index / 4) * 60,
  }));
  const edges: Array<{ a: string; b: string }> = [];
  for (let index = 0; index < count; index += 1) {
    if (kind === 'star' && index > 0) edges.push({ a: nodes[0].id, b: nodes[index].id });
    else if (kind === 'ring') edges.push({ a: nodes[index].id, b: nodes[(index + 1) % count].id });
    else if (kind === 'tree' && index > 0) edges.push({ a: nodes[Math.floor((index - 1) / 2)].id, b: nodes[index].id });
    else if (index + 1 < count) edges.push({ a: nodes[index].id, b: nodes[index + 1].id });
    if (index + 4 < count) edges.push({ a: nodes[index].id, b: nodes[index + 4].id });
  }
  const failed = new Set(edges.filter(() => rng() < failure).map((edge) => `${edge.a}|${edge.b}`));
  const frames: LabFrame[] = [];
  const visited = new Set<string>([nodes[0].id]);
  const path = [nodes[0].id];
  const push = (active: string, caption: string, done = false): void => {
    frames.push({
      stage: {
        kind: 'topology',
        nodes: nodes.map((node) => ({ ...node, state: visited.has(node.id) ? 'visited' : undefined })),
        edges: edges.map((edge) => ({ ...edge, state: failed.has(`${edge.a}|${edge.b}`) ? 'failed' : path.includes(edge.a) && path.includes(edge.b) ? 'path' : undefined })),
        path: path.slice(),
        packet: active,
        caption,
      },
      narration: caption,
      metrics: { 节点数: count, 已到达: visited.size, 故障链路: failed.size, 跳数: path.length - 1 },
      codeLine: 2,
      done,
    });
  };
  push(nodes[0].id, `从 ${nodes[0].id} 发出数据包，拓扑 ${kind}，故障链路 ${failed.size} 条。`);
  for (let index = 1; index < Math.min(nodes.length, 5); index += 1) {
    const from = nodes[index - 1];
    const to = nodes[index];
    const failedLink = failed.has(`${from.id}|${to.id}`) || failed.has(`${to.id}|${from.id}`);
    if (failedLink) {
      push(from.id, `链路 ${from.id}–${to.id} 故障，数据包丢弃/重路由。`);
      continue;
    }
    visited.add(to.id);
    path.push(to.id);
    push(to.id, `数据包从 ${from.id} 跳到 ${to.id}。`);
  }
  push(path[path.length - 1], `到达 ${path[path.length - 1]}，路径：${path.join(' → ')}。`, true);
  return frames;
}

export function runEngine(entry: LabEntry, params: Params): LabFrame[] {
  switch (entry.kind) {
    case 'array': return runArray(entry, params);
    case 'graph': return runGraph(entry, params);
    case 'tree': return runTree(entry, params);
    case 'matrix': return runMatrix(entry, params);
    case 'chart': return runChart(entry, params);
    case 'timeline': return runTimeline(entry, params);
    case 'frames': return runFrames(entry, params);
    case 'table': return runTable(entry, params);
    case 'stack': return runStack(entry, params);
    case 'vector': return runVector(entry, params);
    case 'layers': return runLayers(entry, params);
    case 'pipeline': return runPipeline(entry, params);
    case 'topology': return topologyFrames(entry, params);
    default: return runArray(entry, params);
  }
}
