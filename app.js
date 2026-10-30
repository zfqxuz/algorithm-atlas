(function () {
  'use strict';

  const Dijkstra = window.Dijkstra;
  const GraphAlgorithms = window.GraphAlgorithms;
  const PRESETS = window.GRAPH_PRESETS;
  if (!Dijkstra || !GraphAlgorithms || !Array.isArray(PRESETS) || PRESETS.length === 0) {
    throw new Error('Graph algorithm cores or graph presets are missing.');
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const BASE_DELAY = 920;
  const COMPACT_QUERY = '(max-width: 640px)';
  const PHASE_LABELS = {
    init: '待运行',
    done: '已完成',
    unreachable: '不可达',
  };

  const ALGORITHMS = {
    dijkstra: {
      id: 'dijkstra',
      name: 'Dijkstra',
      tagline: '最短路径',
      code: 'DIJKSTRA',
      needsTarget: true,
      sourceLabel: '起点',
      targetLabel: '终点',
      topbarNote: '加权无向图 · 正权边',
      blurb: '在带权图上每次锁定距离最小的节点，终点出队时答案已经最优。',
      badge: '贪心 + 松弛',
      queueEyebrow: 'PRIORITY QUEUE',
      queueTitle: '优先队列',
      queueHint: '按暂定距离升序 · 每次取出最小项',
      queueDoneHint: '终点已经出队 · 剩余候选无需继续扩展',
      queueEmptyHint: '优先队列已经清空',
      queueUnit: '个候选',
      queueDoneUnit: '个未扩展',
      emptyTitle: '队列已清空',
      emptyDetail: '没有更多可扩展的节点',
      nodePrefix: 'd',
      nodeValueLabel: '暂定距离',
      rootMarker: '起点',
      metrics: ['已确定', '队列中', '当前距离'],
      legend: [
        { type: 'dot', className: 'is-current', label: '当前节点' },
        { type: 'dot', className: 'is-frontier', label: '队列候选' },
        { type: 'dot', className: 'is-settled', label: '已确定' },
        { type: 'line', className: 'is-path', label: '最短路径' },
      ],
      eventLabels: {
        init: 'READY',
        select: 'EXTRACT MIN',
        update: 'RELAX',
        keep: 'NO UPDATE',
        done: 'COMPLETE',
        unreachable: 'UNREACHABLE',
      },
      doneStatus: '已找到最短路',
      resultLabel: '最短路径',
      resultType: 'path',
      doneProgress: '推演完成',
      unreachableProgress: '队列已耗尽',
      invariantLabel: 'GREEDY INVARIANT',
      invariant: '节点第一次从优先队列取出时，它的距离已经是最终最短距离。',
      timeComplexity: 'O((V+E) log V)',
      spaceComplexity: 'O(V + E)',
      warning: '边权必须非负，否则贪心前提不再成立。',
      build: (graph, source, target) => Dijkstra.buildTrace(graph, source, target),
    },
    bfs: {
      id: 'bfs',
      name: 'BFS',
      tagline: '广度优先搜索',
      code: 'BFS',
      needsTarget: true,
      sourceLabel: '起点',
      targetLabel: '终点',
      topbarNote: '无向图 · BFS 忽略边权',
      blurb: '用 FIFO 队列一层层推进，第一次遇到目标时得到边数最少的路径。',
      badge: '队列 + 分层',
      queueEyebrow: 'FIFO QUEUE',
      queueTitle: 'BFS 队列',
      queueHint: '先进先出 · 按发现顺序逐层扩展',
      queueDoneHint: '目标已出队 · 其余队列候选无需继续扩展',
      queueEmptyHint: 'BFS 队列已经清空',
      queueUnit: '个待出队',
      queueDoneUnit: '个未出队',
      emptyTitle: '队列已清空',
      emptyDetail: '所有可达节点都已处理',
      nodePrefix: 'd',
      nodeValueLabel: '层数',
      rootMarker: '起点',
      metrics: ['已访问', '队列中', '当前层数'],
      legend: [
        { type: 'dot', className: 'is-current', label: '当前节点' },
        { type: 'dot', className: 'is-frontier', label: '队列候选' },
        { type: 'dot', className: 'is-settled', label: '已访问' },
        { type: 'line', className: 'is-path', label: '最少边路径' },
      ],
      eventLabels: {
        init: 'READY',
        select: 'DEQUEUE',
        discover: 'DISCOVER',
        done: 'COMPLETE',
        unreachable: 'UNREACHABLE',
      },
      doneStatus: '已找到最少边路径',
      resultLabel: '最少边路径',
      resultType: 'path',
      doneProgress: '推演完成',
      unreachableProgress: '队列已耗尽',
      invariantLabel: 'LAYER INVARIANT',
      invariant: '队列按层保存节点，BFS 第一次到达某个节点时使用的边数已经最少。',
      timeComplexity: 'O(V + E)',
      spaceComplexity: 'O(V + E)',
      warning: 'BFS 最小化的是路径边数，不是权重；图中的边权不参与比较。',
      build: (graph, source, target) => GraphAlgorithms.buildBfsTrace(graph, source, target),
    },
    dfs: {
      id: 'dfs',
      name: 'DFS',
      tagline: '深度优先搜索',
      code: 'DFS',
      needsTarget: true,
      sourceLabel: '起点',
      targetLabel: '终点',
      topbarNote: '无向图 · DFS 忽略边权',
      blurb: '沿一条分支尽可能深入，走到尽头再回溯；用 LIFO 栈保存待探索节点。',
      badge: '栈 + 回溯',
      queueEyebrow: 'LIFO STACK',
      queueTitle: 'DFS 栈',
      queueHint: '后进先出 · 每次优先处理栈顶节点',
      queueDoneHint: '目标已弹出 · 搜索提前停止',
      queueEmptyHint: 'DFS 栈已经清空',
      queueUnit: '个栈元素',
      queueDoneUnit: '个未处理',
      emptyTitle: '栈已清空',
      emptyDetail: '已回溯完所有可达分支',
      nodePrefix: 'd',
      nodeValueLabel: '搜索深度',
      rootMarker: '起点',
      metrics: ['已访问', '栈深度', '当前深度'],
      legend: [
        { type: 'dot', className: 'is-current', label: '当前节点' },
        { type: 'dot', className: 'is-frontier', label: '栈中节点' },
        { type: 'dot', className: 'is-settled', label: '已访问' },
        { type: 'line', className: 'is-path', label: 'DFS 路径' },
      ],
      eventLabels: {
        init: 'READY',
        select: 'POP',
        discover: 'PUSH',
        done: 'COMPLETE',
        unreachable: 'UNREACHABLE',
      },
      doneStatus: 'DFS 路径已找到',
      resultLabel: 'DFS 路径',
      resultType: 'path',
      doneProgress: '推演完成',
      unreachableProgress: '栈已耗尽',
      invariantLabel: 'LIFO INVARIANT',
      invariant: '栈顶始终是最后被压入的节点，因此 DFS 会优先深入最近发现的分支。',
      timeComplexity: 'O(V + E)',
      spaceComplexity: 'O(V + E)',
      warning: 'DFS 找到的路径不保证最短，结果依赖邻接节点的遍历顺序。',
      build: (graph, source, target) => GraphAlgorithms.buildDfsTrace(graph, source, target),
    },
    prim: {
      id: 'prim',
      name: 'Prim',
      tagline: '最小生成树',
      code: 'PRIM',
      needsTarget: false,
      sourceLabel: '根节点',
      targetLabel: '',
      topbarNote: '加权无向图 · 最小生成树',
      blurb: '从根节点扩张生成树，每次加入跨越当前割的权重最小边。',
      badge: '贪心 + 割',
      queueEyebrow: 'CUT CANDIDATES',
      queueTitle: '候选节点',
      queueHint: '按最小连接代价升序 · 每次加入最小项',
      queueDoneHint: '所有可达节点都已加入生成树',
      queueEmptyHint: '没有可连接的外侧节点',
      queueUnit: '个候选节点',
      queueDoneUnit: '个候选节点',
      emptyTitle: '候选集为空',
      emptyDetail: '没有更多可扩展的节点',
      nodePrefix: 'w',
      nodeValueLabel: '连接代价',
      rootMarker: '根节点',
      metrics: ['已加入', '候选节点', '总权重'],
      legend: [
        { type: 'dot', className: 'is-current', label: '当前节点' },
        { type: 'dot', className: 'is-frontier', label: '候选节点' },
        { type: 'dot', className: 'is-settled', label: '树中节点' },
        { type: 'line', className: 'is-path', label: 'MST 边' },
      ],
      eventLabels: {
        init: 'READY',
        select: 'ADD NODE',
        update: 'UPDATE KEY',
        done: 'COMPLETE',
      },
      doneStatus: '生成树已完成',
      resultLabel: '最小生成树',
      resultType: 'tree',
      doneProgress: '推演完成',
      unreachableProgress: '生成树已停止',
      invariantLabel: 'CUT PROPERTY',
      invariant: '跨越当前割的最小权边一定属于某棵最小生成树，因此可以安全加入。',
      timeComplexity: 'O(V² + E)',
      spaceComplexity: 'O(V)',
      warning: 'Prim 适用于无向连通图；非连通图只能得到部分最小生成树。',
      build: (graph, source) => GraphAlgorithms.buildPrimTrace(graph, source),
    },
  };

  const $ = (selector) => document.querySelector(selector);
  const dom = {
    svg: $('#graphSvg'),
    edgeLayer: $('#edgeLayer'),
    nodeLayer: $('#nodeLayer'),
    graphTitle: $('#graphTitle'),
    graphDesc: $('#graphDesc'),
    presetCode: $('#presetCode'),
    graphMeta: $('#graphMeta'),
    presetBlurb: $('#presetBlurb'),
    shuffleBtn: $('#shuffleBtn'),
    generateGraphBtn: $('#generateGraphBtn'),
    layoutBtn: $('#layoutBtn'),
    graphGenOverlay: $('#graphGenOverlay'),
    graphGenClose: $('#graphGenClose'),
    graphGenCancel: $('#graphGenCancel'),
    graphGenSubmit: $('#graphGenSubmit'),
    graphGenNodes: $('#graphGenNodes'),
    graphGenNodeValue: $('#graphGenNodeValue'),
    graphGenDensity: $('#graphGenDensity'),
    graphGenWeight: $('#graphGenWeight'),
    graphGenSeed: $('#graphGenSeed'),
    topbarNote: $('#topbarNote'),
    algoHeading: $('#algoHeading'),
    algoTagline: $('#algoTagline'),
    algorithmTabs: Array.from(document.querySelectorAll('.algorithm-tab')),
    legend: $('#legend'),
    routeChip: $('#routeChip'),
    routeStart: $('#routeStart'),
    routeEnd: $('#routeEnd'),
    routeStartKey: $('#routeStartKey'),
    routeEndKey: $('#routeEndKey'),
    routeStartPoint: $('#routeStartPoint'),
    routeEndPoint: $('#routeEndPoint'),
    routeArrow: $('#routeArrow'),
    stagePhase: $('#stagePhase'),
    stepCounter: $('#stepCounter'),
    stepPill: $('#stepPill'),
    progressLabel: $('#progressLabel'),
    progressValue: $('#progressValue'),
    progressTrack: $('#progressTrack'),
    progressFill: $('#progressFill'),
    nodePicker: $('#nodePicker'),
    startFieldLabel: $('#startFieldLabel'),
    targetField: $('#targetField'),
    targetFieldLabel: $('#targetFieldLabel'),
    pickerArrow: $('#pickerArrow'),
    startSelect: $('#startSelect'),
    endSelect: $('#endSelect'),
    playBtn: $('#playBtn'),
    playLabel: $('#playLabel'),
    stepBtn: $('#stepBtn'),
    resetBtn: $('#resetBtn'),
    speedRange: $('#speedRange'),
    speedValue: $('#speedValue'),
    globalStatus: $('#globalStatus'),
    globalStatusText: $('#globalStatusText'),
    queueEyebrow: $('#queueEyebrow'),
    queueTitle: $('#queueTitle'),
    queueCount: $('#queueCount'),
    queueList: $('#queueList'),
    queueFootnote: $('#queueFootnote'),
    queueMetric: $('#queueMetric'),
    primaryMetricLabel: $('#primaryMetricLabel'),
    secondaryMetricLabel: $('#secondaryMetricLabel'),
    thirdMetricLabel: $('#thirdMetricLabel'),
    statusPanel: $('.status-panel'),
    eventChip: $('#eventChip'),
    statusMessage: $('#statusMessage'),
    statusDetail: $('#statusDetail'),
    settledCount: $('#settledCount'),
    settledTotal: $('#settledTotal'),
    currentDistance: $('#currentDistance'),
    resultCard: $('#resultCard'),
    resultLabel: $('#resultLabel'),
    resultCost: $('#resultCost'),
    pathChain: $('#pathChain'),
    codeLanguageLabel: $('#codeLanguageLabel'),
    algoChip: $('#algoChip'),
    invariantLabel: $('#invariantLabel'),
    invariantText: $('#invariantText'),
    timeComplexity: $('#timeComplexity'),
    spaceComplexity: $('#spaceComplexity'),
    warningText: $('#warningText'),
    pseudoBlocks: Array.from(document.querySelectorAll('.code-block[data-algorithm]')),
  };

  const app = {
    presetIndex: 0,
    currentGraphInfo: PRESETS[0],
    modalPreviousFocus: null,
    algorithmId: 'dijkstra',
    graph: null,
    source: 'A',
    target: 'H',
    trace: [],
    index: 0,
    playing: false,
    timer: null,
    speed: 1,
    compact: window.matchMedia(COMPACT_QUERY).matches,
    positions: new Map(),
    nodeEls: new Map(),
    edgeEls: [],
    drag: null,
    previousQueueIds: new Set(),
  };

  function svgEl(tag, attrs) {
    const element = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const [name, value] of Object.entries(attrs)) {
        element.setAttribute(name, String(value));
      }
    }
    return element;
  }

  function htmlEl(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function cloneGraph(preset) {
    return {
      nodes: preset.nodes.map((node) => ({ ...node })),
      edges: preset.edges.map((edge) => ({ ...edge })),
    };
  }

  function getStep() {
    return app.trace[app.index];
  }

  function getTotalMoves() {
    return Math.max(0, app.trace.length - 1);
  }

  function isTerminal(step) {
    return step.kind === 'done' || step.kind === 'unreachable';
  }

  function isAtEnd() {
    return app.index >= app.trace.length - 1;
  }

  function formatDistance(value) {
    return Number.isFinite(value) ? String(value) : '\u221e';
  }

  function clearTimer() {
    if (app.timer !== null) {
      window.clearTimeout(app.timer);
      app.timer = null;
    }
  }

  function getAlgorithm() {
    return ALGORITHMS[app.algorithmId];
  }

  function pickAlternativeTarget(source, preferred) {
    if (preferred && preferred !== source) return preferred;
    const fallback = app.graph.nodes.find((node) => node.id !== source);
    return fallback ? fallback.id : source;
  }

  function ensureValidTarget() {
    const config = getAlgorithm();
    if (!config.needsTarget) return;
    if (app.target && app.target !== app.source) return;
    const info = app.currentGraphInfo || PRESETS[app.presetIndex];
    app.target = pickAlternativeTarget(app.source, info.end);
  }

  function buildTraceForCurrent() {
    const config = getAlgorithm();
    ensureValidTarget();
    return config.build(app.graph, app.source, app.target);
  }

  function renderAlgorithmLegend() {
    const config = getAlgorithm();
    dom.legend.replaceChildren();
    for (const entry of config.legend) {
      const item = htmlEl('span', 'legend-item');
      const marker = htmlEl('i', entry.type === 'line' ? `legend-line ${entry.className}` : `legend-dot ${entry.className}`);
      item.append(marker, document.createTextNode(entry.label));
      dom.legend.appendChild(item);
    }
  }

  function updateAlgorithmUI() {
    const config = getAlgorithm();
    const preset = app.currentGraphInfo || PRESETS[app.presetIndex];

    for (const tab of dom.algorithmTabs) {
      const active = tab.dataset.algorithm === config.id;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-pressed', String(active));
    }

    dom.algoHeading.textContent = config.name;
    dom.algoTagline.textContent = config.tagline;
    dom.topbarNote.textContent = config.topbarNote;
    document.title = `寻径 · ${config.name} ${config.tagline}`;

    dom.presetCode.textContent = `${preset.code} · ${config.code}`;
    dom.graphMeta.textContent = `${app.graph.nodes.length} 节点 · ${app.graph.edges.length} 条边`;
    dom.presetBlurb.textContent = preset.code === 'GENERATED'
      ? `${preset.name} · ${preset.blurb}`
      : `${preset.name} · ${config.blurb}`;
    dom.settledTotal.textContent = String(app.graph.nodes.length);
    dom.graphTitle.textContent = `${preset.name}：${config.name} ${config.tagline}`;
    dom.graphDesc.textContent = config.needsTarget
      ? `从${config.sourceLabel} ${app.source} 到${config.targetLabel} ${app.target} 的 ${config.name} 搜索过程。节点可通过拖拽调整位置。`
      : `以 ${app.source} 为${config.sourceLabel}构建最小生成树。节点可通过拖拽调整位置。`;

    dom.startFieldLabel.textContent = config.sourceLabel;
    dom.targetFieldLabel.textContent = config.targetLabel;
    dom.startSelect.setAttribute('aria-label', `选择${config.sourceLabel}节点`);
    dom.endSelect.setAttribute('aria-label', `选择${config.targetLabel}节点`);

    dom.primaryMetricLabel.textContent = config.metrics[0];
    dom.secondaryMetricLabel.textContent = config.metrics[1];
    dom.thirdMetricLabel.textContent = config.metrics[2];

    dom.queueEyebrow.textContent = config.queueEyebrow;
    dom.queueTitle.textContent = config.queueTitle;

    dom.codeLanguageLabel.textContent = `PSEUDOCODE · ${config.code}`;
    dom.algoChip.textContent = config.badge;
    dom.invariantLabel.textContent = config.invariantLabel;
    dom.invariantText.textContent = config.invariant;
    dom.timeComplexity.textContent = config.timeComplexity;
    dom.spaceComplexity.textContent = config.spaceComplexity;
    dom.warningText.textContent = config.warning;

    for (const block of dom.pseudoBlocks) {
      block.hidden = block.dataset.algorithm !== config.id;
    }

    renderAlgorithmLegend();
    syncRouteLabels();
  }

  function selectAlgorithm(algorithmId) {
    if (!ALGORITHMS[algorithmId] || algorithmId === app.algorithmId) return;
    clearTimer();
    app.playing = false;
    app.algorithmId = algorithmId;
    ensureValidTarget();
    updateAlgorithmUI();
    rebuildTrace();
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', `#${algorithmId}`);
    }
  }

  function loadPreset(index) {
    clearTimer();
    app.playing = false;
    app.presetIndex = ((index % PRESETS.length) + PRESETS.length) % PRESETS.length;
    const preset = PRESETS[app.presetIndex];
    app.currentGraphInfo = preset;

    app.graph = cloneGraph(preset);
    Dijkstra.validateGraph(app.graph);
    app.source = preset.start;
    app.target = preset.end;
    ensureValidTarget();
    app.index = 0;
    app.previousQueueIds.clear();

    rebuildSelectors();
    updateAlgorithmUI();
    app.trace = buildTraceForCurrent();
    renderGraph();
    renderAll();
  }

  function loadCustomGraph(info) {
    clearTimer();
    app.playing = false;
    app.currentGraphInfo = info;
    app.graph = cloneGraph(info);
    Dijkstra.validateGraph(app.graph);
    app.source = info.start;
    app.target = info.end;
    ensureValidTarget();
    app.index = 0;
    app.previousQueueIds.clear();

    rebuildSelectors();
    updateAlgorithmUI();
    app.trace = buildTraceForCurrent();
    renderGraph();
    renderAll();
  }

  function rebuildSelectors() {
    for (const select of [dom.startSelect, dom.endSelect]) {
      select.replaceChildren();
      for (const node of app.graph.nodes) {
        const option = document.createElement('option');
        option.value = node.id;
        option.textContent = node.id;
        select.appendChild(option);
      }
    }
    dom.startSelect.value = app.source;
    dom.endSelect.value = app.target;
  }

  function rebuildTrace() {
    app.trace = buildTraceForCurrent();
    app.index = 0;
    app.previousQueueIds.clear();
    renderAll();
  }

  function syncRouteLabels() {
    const config = getAlgorithm();
    const showTarget = Boolean(config.needsTarget);
    dom.routeStart.textContent = app.source;
    dom.routeStartKey.textContent = config.sourceLabel;
    dom.routeEnd.textContent = showTarget ? app.target : '';
    dom.routeEndKey.textContent = config.targetLabel;
    dom.startSelect.value = app.source;
    if (showTarget) dom.endSelect.value = app.target;

    dom.routeEndPoint.toggleAttribute('hidden', !showTarget);
    dom.routeArrow.toggleAttribute('hidden', !showTarget);
    dom.targetField.toggleAttribute('hidden', !showTarget);
    dom.pickerArrow.toggleAttribute('hidden', !showTarget);
    dom.nodePicker.classList.toggle('is-single', !showTarget);
    dom.startFieldLabel.textContent = config.sourceLabel;
    dom.targetFieldLabel.textContent = config.targetLabel;
    dom.graphDesc.textContent = showTarget
      ? `${config.name} 从${config.sourceLabel} ${app.source} 到${config.targetLabel} ${app.target} 的搜索过程。节点可通过拖拽调整位置。`
      : `以 ${app.source} 为${config.sourceLabel}执行 Prim 最小生成树演示。节点可通过拖拽调整位置。`;
    dom.routeChip.setAttribute(
      'aria-label',
      showTarget
        ? `${config.sourceLabel} ${app.source}，${config.targetLabel} ${app.target}`
        : `${config.sourceLabel} ${app.source}`
    );
  }

  function setNodePositions() {
    const positions = new Map();

    if (!app.compact) {
      for (const node of app.graph.nodes) {
        positions.set(node.id, { x: node.x, y: node.y });
      }
      return positions;
    }

    const xs = app.graph.nodes.map((node) => node.x);
    const ys = app.graph.nodes.map((node) => node.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;

    for (const node of app.graph.nodes) {
      positions.set(node.id, {
        x: 52 + ((node.x - minX) / spanX) * 516,
        y: 90 + ((node.y - minY) / spanY) * 480,
      });
    }
    return positions;
  }

  function renderGraph() {
    dom.svg.setAttribute('viewBox', app.compact ? '0 0 620 680' : '0 0 1000 470');
    dom.svg.classList.toggle('is-compact', app.compact);
    dom.edgeLayer.replaceChildren();
    dom.nodeLayer.replaceChildren();
    app.nodeEls.clear();
    app.edgeEls = [];
    app.positions = setNodePositions();

    const nodeScale = app.compact ? 1.5 : 1;
    const weightScale = app.compact ? 1.55 : 1;

    for (const edge of app.graph.edges) {
      const key = Dijkstra.edgeKey(edge.u, edge.v);
      const group = svgEl('g', {
        class: 'edge',
        'data-key': key,
        'data-u': edge.u,
        'data-v': edge.v,
      });
      const title = svgEl('title');
      title.textContent = `${edge.u} — ${edge.v}，权重 ${edge.w}`;

      const halo = svgEl('line', { class: 'edge-halo' });
      const line = svgEl('line', { class: 'edge-line' });
      const flow = svgEl('line', { class: 'edge-flow' });
      const weightGroup = svgEl('g', { class: 'edge-weight' });
      const weightInner = svgEl('g', { class: 'weight-inner', transform: `scale(${weightScale})` });
      const weightBox = svgEl('rect', { x: -12, y: -9, width: 24, height: 18, rx: 6 });
      const weightText = svgEl('text', { x: 0, y: 0 });
      weightText.textContent = String(edge.w);
      weightInner.append(weightBox, weightText);
      weightGroup.appendChild(weightInner);
      group.append(title, halo, line, flow, weightGroup);
      dom.edgeLayer.appendChild(group);

      app.edgeEls.push({ edge, key, group, halo, line, flow, weightGroup });
    }

    for (const node of app.graph.nodes) {
      const group = svgEl('g', {
        class: 'node',
        'data-id': node.id,
        tabindex: '0',
        role: 'group',
        'aria-label': `节点 ${node.id}`,
      });
      const shape = svgEl('g', { class: 'node-shape', transform: `scale(${nodeScale})` });
      const halo = svgEl('circle', { class: 'node-halo', r: 34 });
      const body = svgEl('circle', { class: 'node-body', r: 22 });
      const ring = svgEl('circle', { class: 'node-ring', r: 27 });
      const label = svgEl('text', { class: 'node-label', x: 0, y: 0 });
      label.textContent = node.id;

      const distGroup = svgEl('g', { class: 'node-dist', transform: 'translate(0 42)' });
      const distBox = svgEl('rect', { x: -23, y: -9, width: 46, height: 18, rx: 7 });
      const distText = svgEl('text', { x: 0, y: 0 });
      distText.textContent = 'd=\u221e';
      distGroup.append(distBox, distText);

      const roleGroup = svgEl('g', { class: 'node-role', transform: 'translate(0 -43)' });
      const roleBox = svgEl('rect', { x: -21, y: -8.5, width: 42, height: 17, rx: 8.5 });
      const roleText = svgEl('text', { x: 0, y: 0 });
      roleText.textContent = '节点';
      roleGroup.append(roleBox, roleText);

      const title = svgEl('title');
      title.textContent = `节点 ${node.id}`;

      shape.append(halo, body, ring, label, distGroup, roleGroup);
      group.append(title, shape);
      dom.nodeLayer.appendChild(group);

      app.nodeEls.set(node.id, {
        group,
        shape,
        body,
        distText,
        roleText,
        title,
      });

      group.addEventListener('pointerdown', (event) => beginNodeDrag(event, node.id));
      group.addEventListener('keydown', (event) => handleNodeKeydown(event, node.id));
    }

    updateAllEdgeGeometry();
    updateNodeTransforms();
  }

  function updateAllEdgeGeometry() {
    for (const entry of app.edgeEls) {
      const from = app.positions.get(entry.edge.u);
      const to = app.positions.get(entry.edge.v);
      if (!from || !to) continue;
      for (const line of [entry.halo, entry.line, entry.flow]) {
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', to.y);
      }
      entry.weightGroup.setAttribute(
        'transform',
        `translate(${(from.x + to.x) / 2} ${(from.y + to.y) / 2})`
      );
    }
  }

  function updateNodeTransforms() {
    for (const [id, element] of app.nodeEls) {
      const position = app.positions.get(id);
      if (!position) continue;
      element.group.setAttribute('transform', `translate(${position.x} ${position.y})`);
    }
  }

  function applyGraphState(step) {
    const config = getAlgorithm();
    const queueIds = new Set(step.queue.map((item) => item.id));
    const settledIds = new Set(step.settled);
    const pathIds = new Set(step.path);
    const finished = step.kind === 'done';
    const pathEdgeKeys = new Set();
    const mstEdgeKeys = new Set();

    if (config.resultType === 'tree' && Array.isArray(step.mstEdges)) {
      for (const edge of step.mstEdges) {
        mstEdgeKeys.add(Dijkstra.edgeKey(edge.u, edge.v));
      }
    } else {
      for (let index = 0; index < step.path.length - 1; index += 1) {
        pathEdgeKeys.add(Dijkstra.edgeKey(step.path[index], step.path[index + 1]));
      }
    }
    const highlightedEdges = config.resultType === 'tree' ? mstEdgeKeys : pathEdgeKeys;

    for (const node of app.graph.nodes) {
      const id = node.id;
      const element = app.nodeEls.get(id);
      if (!element) continue;

      const isCurrent = step.current === id;
      const isFrontier = queueIds.has(id) && !isCurrent;
      const isSettled = settledIds.has(id);
      const isPath = pathIds.has(id);
      const isStart = id === app.source;
      const isEnd = Boolean(config.needsTarget) && id === app.target;

      element.group.classList.toggle('is-current', isCurrent);
      element.group.classList.toggle('is-frontier', isFrontier);
      element.group.classList.toggle('is-settled', isSettled);
      element.group.classList.toggle('is-path', isPath);
      element.group.classList.toggle('is-start', isStart);
      element.group.classList.toggle('is-end', isEnd);
      element.group.classList.toggle('is-unrelated', finished && !isPath);

      const value = step.dist[id];
      element.distText.textContent = `${config.nodePrefix}=${formatDistance(value)}`;
      element.roleText.textContent = isStart ? config.sourceLabel : isEnd ? config.targetLabel : '节点';
      element.group.classList.toggle('has-distance', Number.isFinite(value));

      const labels = [`节点 ${id}`];
      if (isStart) labels.push(config.sourceLabel);
      if (isEnd) labels.push(config.targetLabel);
      labels.push(`${config.nodeValueLabel} ${formatDistance(value)}`);
      if (isCurrent) labels.push('当前处理节点');
      if (isSettled) labels.push(config.resultType === 'tree' ? '树中节点' : '已访问');
      if (isPath) labels.push(config.resultLabel);
      else if (isFrontier) labels.push(config.queueTitle);
      element.group.setAttribute('aria-label', labels.join('，'));
      element.title.textContent = `${labels.join('，')}。使用方向键移动节点。`;
    }

    for (const entry of app.edgeEls) {
      const from = step.prev[entry.edge.u];
      const to = step.prev[entry.edge.v];
      const isTree =
        config.resultType === 'tree'
          ? mstEdgeKeys.has(entry.key)
          : from === entry.edge.v || to === entry.edge.u;
      const activeKey = step.activeEdge
        ? Dijkstra.edgeKey(step.activeEdge.from, step.activeEdge.to)
        : null;
      const isActive = activeKey === entry.key;
      const isPath = highlightedEdges.has(entry.key);

      entry.group.classList.toggle('is-tree', isTree);
      entry.group.classList.toggle('is-active', isActive);
      entry.group.classList.toggle('is-path', isPath);
      entry.group.classList.toggle('is-unrelated', finished && !isPath);
    }
  }

  function applyPseudoState(step) {
    const activeLines = new Set(step.lineRange);
    for (const block of dom.pseudoBlocks) {
      const activeBlock = block.dataset.algorithm === app.algorithmId;
      block.hidden = !activeBlock;
      if (!activeBlock) continue;
      for (const line of block.querySelectorAll('.code-line')) {
        const lineNumber = Number(line.dataset.line);
        line.classList.toggle('is-active', activeLines.has(lineNumber));
      }
    }
  }

  function renderQueue(step) {
    const config = getAlgorithm();
    const queue = step.queue;
    const currentIds = new Set(queue.map((item) => item.id));
    const list = dom.queueList;
    const stopped = isTerminal(step);
    list.replaceChildren();
    dom.queueCount.textContent = `${queue.length} ${stopped ? config.queueDoneUnit : config.queueUnit}`;
    dom.queueMetric.textContent = String(queue.length);
    dom.queueFootnote.textContent =
      step.kind === 'done'
        ? config.queueDoneHint
        : step.kind === 'unreachable'
          ? config.queueEmptyHint
          : config.queueHint;

    if (queue.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'queue-empty';
      empty.innerHTML =
        '<svg viewBox="0 0 18 18" fill="none" aria-hidden="true">' +
        '<path d="M4 5.5h10M5.8 9h6.4M7.3 12.5h3.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
        '</svg>';
      empty.append(htmlEl('span', '', config.emptyTitle), htmlEl('small', '', config.emptyDetail));
      list.appendChild(empty);
      app.previousQueueIds = currentIds;
      return;
    }

    queue.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'queue-item';
      row.setAttribute('role', 'listitem');
      if (index === 0 && !stopped) row.classList.add('is-min');
      if (!app.previousQueueIds.has(item.id)) {
        row.classList.add('is-new');
        row.style.animationDelay = `${Math.min(index * 25, 100)}ms`;
      }

      const rank = htmlEl('span', 'q-rank', String(index + 1).padStart(2, '0'));
      const node = htmlEl('span', 'q-node', item.id);
      const copy = htmlEl('span', 'q-copy');
      const previousText = item.previous
        ? `${config.id === 'prim' ? 'via' : '←'} ${item.previous}`
        : config.rootMarker;
      copy.append(htmlEl('strong', '', `节点 ${item.id}`), htmlEl('span', 'q-prev', previousText));
      const distance = htmlEl('span', 'q-distance', `${config.nodePrefix}=${formatDistance(item.distance)}`);
      row.append(rank, node, copy, distance);
      list.appendChild(row);
    });

    app.previousQueueIds = currentIds;
  }

  function createPathChain(step) {
    const config = getAlgorithm();
    dom.pathChain.replaceChildren();
    const weightByEdge = new Map();
    for (const edge of app.graph.edges) {
      weightByEdge.set(Dijkstra.edgeKey(edge.u, edge.v), edge.w);
    }

    step.path.forEach((id, index) => {
      const node = htmlEl('span', 'path-node', id);
      node.style.animationDelay = `${index * 70}ms`;
      dom.pathChain.appendChild(node);

      if (index < step.path.length - 1) {
        const next = step.path[index + 1];
        const arc = htmlEl('span', 'path-arc');
        if (config.id === 'dijkstra') {
          const weight = weightByEdge.get(Dijkstra.edgeKey(id, next));
          arc.appendChild(
            htmlEl('span', 'path-arc-weight', weight === undefined ? '?' : String(weight))
          );
        }
        arc.appendChild(htmlEl('span', 'path-arc-arrow', '→'));
        dom.pathChain.appendChild(arc);
      }
    });
  }

  function createTreeEdges(step) {
    dom.pathChain.replaceChildren();
    if (!step.mstEdges || step.mstEdges.length === 0) {
      dom.pathChain.appendChild(htmlEl('span', 'path-empty', '图中只有一个节点，树边数量为 0'));
      return;
    }

    step.mstEdges.forEach((edge, index) => {
      const chip = htmlEl('span', 'tree-edge-chip');
      chip.style.animationDelay = `${Math.min(index * 45, 280)}ms`;
      chip.append(
        htmlEl('span', 'tree-edge-nodes', `${edge.u} — ${edge.v}`),
        htmlEl('span', 'tree-edge-weight', String(edge.w))
      );
      dom.pathChain.appendChild(chip);
    });
  }

  function getThirdMetricValue(step, config) {
    if (config.resultType === 'tree') return Number.isFinite(step.totalWeight) ? step.totalWeight : null;
    if (step.kind === 'done') return step.pathCost;
    if (step.current) return step.dist[step.current];
    if (step.kind === 'init') return step.dist[app.source];
    return null;
  }

  function renderStatus(step) {
    const config = getAlgorithm();
    const totalMoves = getTotalMoves();
    const percentage = totalMoves === 0 ? 100 : Math.min(100, Math.round((app.index / totalMoves) * 100));
    const thirdValue = getThirdMetricValue(step, config);

    dom.statusMessage.textContent = step.message;
    dom.statusDetail.textContent = step.detail;
    dom.eventChip.textContent = config.eventLabels[step.kind] || 'TRACE';
    dom.eventChip.dataset.kind = step.kind;
    dom.statusPanel.dataset.kind = step.kind;
    dom.settledCount.textContent = String(step.settled.length);
    dom.currentDistance.textContent = thirdValue === null ? '—' : formatDistance(thirdValue);
    dom.queueMetric.textContent = String(step.queue.length);

    dom.stepPill.textContent = `${String(app.index).padStart(2, '0')} / ${String(totalMoves).padStart(2, '0')}`;
    dom.stepCounter.textContent =
      app.index === 0 ? '初始状态' : `步骤 ${app.index} / ${totalMoves}`;

    dom.progressFill.style.width = `${percentage}%`;
    dom.progressValue.textContent = `${percentage}%`;
    dom.progressTrack.setAttribute('aria-valuenow', String(percentage));

    if (step.kind === 'done') {
      dom.progressLabel.textContent = config.doneProgress;
    } else if (step.kind === 'unreachable') {
      dom.progressLabel.textContent = config.unreachableProgress;
    } else if (app.playing) {
      dom.progressLabel.textContent = '搜索进行中';
    } else if (app.index === 0) {
      dom.progressLabel.textContent = '尚未开始';
    } else {
      dom.progressLabel.textContent = '推演已暂停';
    }

    if (isTerminal(step)) {
      dom.stagePhase.textContent = PHASE_LABELS[step.kind];
    } else if (app.playing) {
      dom.stagePhase.textContent = '演示中';
    } else if (app.index === 0) {
      dom.stagePhase.textContent = '待运行';
    } else {
      dom.stagePhase.textContent = '已暂停';
    }

    if (step.kind === 'done') {
      dom.globalStatus.dataset.tone = 'complete';
      dom.globalStatusText.textContent = config.doneStatus;
    } else if (step.kind === 'unreachable') {
      dom.globalStatus.dataset.tone = 'blocked';
      dom.globalStatusText.textContent = '目标不可达';
    } else if (app.playing) {
      dom.globalStatus.dataset.tone = 'running';
      dom.globalStatusText.textContent = '正在推演';
    } else if (app.index > 0) {
      dom.globalStatus.dataset.tone = 'idle';
      dom.globalStatusText.textContent = '已暂停';
    } else {
      dom.globalStatus.dataset.tone = 'idle';
      dom.globalStatusText.textContent = '准备就绪';
    }

    dom.resultCard.classList.toggle('is-complete', step.kind === 'done');
    dom.resultCard.classList.toggle('is-blocked', step.kind === 'unreachable');
    dom.resultCard.classList.toggle('is-ready', step.kind !== 'done' && step.kind !== 'unreachable');

    if (step.kind === 'done') {
      dom.resultLabel.textContent = config.resultLabel;
      if (config.resultType === 'tree') {
        dom.resultCost.textContent = `Σ ${formatDistance(step.totalWeight)}`;
        createTreeEdges(step);
      } else {
        if (config.id === 'dijkstra') {
          dom.resultCost.textContent = `Σ ${formatDistance(step.pathCost)}`;
        } else if (config.id === 'bfs') {
          dom.resultCost.textContent = `${formatDistance(step.pathCost)} 条边`;
        } else {
          dom.resultCost.textContent = `深度 ${formatDistance(step.pathCost)}`;
        }
        createPathChain(step);
      }
    } else if (step.kind === 'unreachable') {
      dom.resultLabel.textContent = '目标不可达';
      dom.resultCost.textContent = '∞';
      dom.pathChain.replaceChildren(
        htmlEl('span', 'path-empty', `${app.source} 与 ${app.target} 之间没有可达路径`)
      );
    } else {
      dom.resultLabel.textContent = config.resultLabel;
      dom.resultCost.textContent = '—';
      const waiting =
        config.resultType === 'tree'
          ? '等待生成树启动'
          : config.id === 'dfs'
            ? '沿栈继续深入…'
            : '等待终点出队';
      dom.pathChain.replaceChildren(
        htmlEl('span', 'path-empty', app.index === 0 ? waiting : '搜索仍在进行中…')
      );
    }
  }

  function renderControls() {
    dom.playBtn.dataset.state = app.playing ? 'playing' : 'idle';
    dom.stepBtn.disabled = app.playing;

    if (app.playing) {
      dom.playLabel.textContent = '暂停';
    } else if (isAtEnd()) {
      dom.playLabel.textContent = '重新演示';
    } else if (app.index > 0) {
      dom.playLabel.textContent = '继续演示';
    } else {
      dom.playLabel.textContent = '开始演示';
    }

    const playAction = app.playing ? '暂停推演' : isAtEnd() ? '重新推演' : app.index > 0 ? '继续推演' : '开始推演';
    dom.playBtn.setAttribute('aria-label', playAction);
    dom.stepBtn.setAttribute('aria-label', '推进一步');
  }

  function renderAll() {
    const step = getStep();
    if (!step) return;
    syncRouteLabels();
    applyGraphState(step);
    applyPseudoState(step);
    renderQueue(step);
    renderStatus(step);
    renderControls();
  }

  function setSpeed(speed, reschedule) {
    app.speed = Math.min(3, Math.max(0.5, speed));
    dom.speedValue.textContent = `${app.speed.toFixed(1)}×`;
    const min = Number(dom.speedRange.min);
    const max = Number(dom.speedRange.max);
    const progress = ((app.speed - min) / (max - min)) * 100;
    dom.speedRange.style.setProperty('--range-progress', `${progress}%`);

    if (reschedule && app.playing) {
      clearTimer();
      scheduleNext();
    }
  }

  function advanceOnce() {
    if (!app.trace.length || app.index >= app.trace.length - 1) return false;
    app.index += 1;
    const step = getStep();
    if (isTerminal(step)) {
      app.playing = false;
      clearTimer();
    }
    renderAll();
    return true;
  }

  function scheduleNext() {
    clearTimer();
    if (!app.playing || isAtEnd()) return;
    const delay = BASE_DELAY / app.speed;
    app.timer = window.setTimeout(() => {
      app.timer = null;
      if (!app.playing) return;
      advanceOnce();
      if (app.playing) scheduleNext();
    }, delay);
  }

  function startPlayback() {
    if (app.playing) return;
    clearTimer();

    if (isAtEnd() || isTerminal(getStep())) {
      app.index = 0;
      app.previousQueueIds.clear();
    }

    app.playing = true;
    advanceOnce();
    if (app.playing) {
      scheduleNext();
    } else {
      renderControls();
    }
  }

  function pausePlayback() {
    if (!app.playing) return;
    app.playing = false;
    clearTimer();
    renderAll();
  }

  function togglePlayback() {
    if (app.playing) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }

  function resetPlayback() {
    clearTimer();
    app.playing = false;
    app.index = 0;
    app.previousQueueIds.clear();
    renderAll();
  }

  function manualStep() {
    clearTimer();
    app.playing = false;
    if (isAtEnd()) {
      app.index = 0;
      app.previousQueueIds.clear();
    }
    advanceOnce();
    renderControls();
  }

  function handleSourceChange(nextSource) {
    if (nextSource === app.source) return;
    const config = getAlgorithm();
    const previousSource = app.source;
    app.source = nextSource;
    if (config.needsTarget && app.target === app.source) {
      app.target = previousSource;
    }
    clearTimer();
    app.playing = false;
    ensureValidTarget();
    rebuildTrace();
  }

  function handleTargetChange(nextTarget) {
    if (!getAlgorithm().needsTarget || nextTarget === app.target) return;
    const previousTarget = app.target;
    app.target = nextTarget;
    if (app.source === app.target) {
      app.source = previousTarget;
    }
    clearTimer();
    app.playing = false;
    ensureValidTarget();
    rebuildTrace();
  }

  function cyclePreset() {
    loadPreset(app.presetIndex + 1);
  }

  function openGraphGenerator() {
    if (!dom.graphGenOverlay) return;
    app.modalPreviousFocus = document.activeElement;
    dom.graphGenNodeValue.textContent = dom.graphGenNodes.value;
    dom.graphGenOverlay.hidden = false;
    document.body.classList.add('is-modal-open');
    window.setTimeout(() => dom.graphGenNodes.focus(), 30);
  }

  function closeGraphGenerator() {
    if (!dom.graphGenOverlay || dom.graphGenOverlay.hidden) return;
    dom.graphGenOverlay.hidden = true;
    document.body.classList.remove('is-modal-open');
    if (app.modalPreviousFocus && typeof app.modalPreviousFocus.focus === 'function') {
      app.modalPreviousFocus.focus();
    }
    app.modalPreviousFocus = null;
  }

  function submitGeneratedGraph() {
    if (!window.GraphGenerator) return;
    const seed = Number(dom.graphGenSeed.value);
    const info = window.GraphGenerator.generate({
      nodeCount: Number(dom.graphGenNodes.value),
      density: dom.graphGenDensity.value,
      weightMax: Number(dom.graphGenWeight.value),
      seed: Number.isFinite(seed) && seed > 0 ? seed : 2026,
    });
    dom.graphGenSeed.value = String(info.generated.seed);
    closeGraphGenerator();
    loadCustomGraph(info);
  }

  function resetNodeLayout() {
    app.drag = null;
    renderGraph();
    renderAll();
  }

  function beginNodeDrag(event, id) {
    if (event.button !== undefined && event.button !== 0) return;
    if (app.drag) return;
    event.preventDefault();

    const point = clientToSvg(event.clientX, event.clientY);
    if (!point) return;
    const current = app.positions.get(id);
    if (!current) return;

    const element = app.nodeEls.get(id);
    if (element) {
      element.group.focus({ preventScroll: true });
      element.group.classList.add('is-dragging');
    }

    app.drag = {
      id,
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      originX: current.x,
      originY: current.y,
      moved: false,
    };

    try {
      dom.svg.setPointerCapture(event.pointerId);
    } catch (error) {
      /* Pointer capture can fail in older browsers; pointermove still works. */
    }
  }

  function handlePointerMove(event) {
    if (!app.drag || event.pointerId !== app.drag.pointerId) return;
    const point = clientToSvg(event.clientX, event.clientY);
    if (!point) return;

    const dx = point.x - app.drag.startX;
    const dy = point.y - app.drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 1) app.drag.moved = true;

    const bounds = getDragBounds();
    const nextX = Math.min(bounds.maxX, Math.max(bounds.minX, app.drag.originX + dx));
    const nextY = Math.min(bounds.maxY, Math.max(bounds.minY, app.drag.originY + dy));

    app.positions.set(app.drag.id, { x: nextX, y: nextY });
    updateAllEdgeGeometry();
    updateNodeTransforms();
  }

  function endNodeDrag(event) {
    if (!app.drag || (event && event.pointerId !== app.drag.pointerId)) return;
    const drag = app.drag;
    app.drag = null;
    const element = app.nodeEls.get(drag.id);
    if (element) element.group.classList.remove('is-dragging');
    try {
      if (dom.svg.hasPointerCapture(drag.pointerId)) {
        dom.svg.releasePointerCapture(drag.pointerId);
      }
    } catch (error) {
      /* No-op when capture was not acquired. */
    }
  }

  function handleNodeKeydown(event, id) {
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();

    const stepSize = app.compact ? 8 : 5;
    const position = app.positions.get(id);
    if (!position) return;
    const bounds = getDragBounds();
    app.positions.set(id, {
      x: Math.min(bounds.maxX, Math.max(bounds.minX, position.x + direction[0] * stepSize)),
      y: Math.min(bounds.maxY, Math.max(bounds.minY, position.y + direction[1] * stepSize)),
    });
    updateAllEdgeGeometry();
    updateNodeTransforms();
  }

  function getDragBounds() {
    return app.compact
      ? { minX: 55, maxX: 565, minY: 78, maxY: 590 }
      : { minX: 42, maxX: 958, minY: 60, maxY: 405 };
  }

  function clientToSvg(clientX, clientY) {
    const matrix = dom.svg.getScreenCTM();
    if (!matrix) return null;
    const point = dom.svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(matrix.inverse());
  }

  function bindEvents() {
    dom.playBtn.addEventListener('click', togglePlayback);
    dom.stepBtn.addEventListener('click', manualStep);
    dom.resetBtn.addEventListener('click', resetPlayback);
    dom.shuffleBtn.addEventListener('click', cyclePreset);
    dom.generateGraphBtn.addEventListener('click', openGraphGenerator);
    dom.graphGenClose.addEventListener('click', closeGraphGenerator);
    dom.graphGenCancel.addEventListener('click', closeGraphGenerator);
    dom.graphGenSubmit.addEventListener('click', submitGeneratedGraph);
    dom.graphGenNodes.addEventListener('input', () => {
      dom.graphGenNodeValue.textContent = dom.graphGenNodes.value;
    });
    dom.graphGenOverlay.addEventListener('click', (event) => {
      if (event.target === dom.graphGenOverlay) closeGraphGenerator();
    });
    dom.graphGenOverlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeGraphGenerator();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dom.graphGenOverlay.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])')
      ).filter((node) => !node.disabled);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    for (const tab of dom.algorithmTabs) {
      tab.addEventListener('click', () => selectAlgorithm(tab.dataset.algorithm));
    }
    dom.layoutBtn.addEventListener('click', resetNodeLayout);

    dom.startSelect.addEventListener('change', () => handleSourceChange(dom.startSelect.value));
    dom.endSelect.addEventListener('change', () => handleTargetChange(dom.endSelect.value));

    dom.speedRange.addEventListener('input', () => {
      setSpeed(Number(dom.speedRange.value), true);
    });

    dom.svg.addEventListener('pointermove', handlePointerMove);
    dom.svg.addEventListener('pointerup', endNodeDrag);
    dom.svg.addEventListener('pointercancel', endNodeDrag);
    dom.svg.addEventListener('lostpointercapture', endNodeDrag);

    document.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('button, select, input, textarea, a, [contenteditable="true"]')
      ) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        togglePlayback();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        manualStep();
      }
    });

    const compactQuery = window.matchMedia(COMPACT_QUERY);
    const handleBreakpoint = (event) => {
      const compact = event.matches;
      if (compact === app.compact) return;
      app.compact = compact;
      app.drag = null;
      renderGraph();
      renderAll();
    };

    if (typeof compactQuery.addEventListener === 'function') {
      compactQuery.addEventListener('change', handleBreakpoint);
    } else if (typeof compactQuery.addListener === 'function') {
      compactQuery.addListener(handleBreakpoint);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && app.playing) pausePlayback();
    });
  }

  function init() {
    const requestedAlgorithm = window.location.hash.replace('#', '');
    if (ALGORITHMS[requestedAlgorithm]) {
      app.algorithmId = requestedAlgorithm;
    }

    bindEvents();
    setSpeed(1, false);
    loadPreset(0);

    window.addEventListener('hashchange', () => {
      const hashAlgorithm = window.location.hash.replace('#', '');
      if (ALGORITHMS[hashAlgorithm] && hashAlgorithm !== app.algorithmId) {
        clearTimer();
        app.playing = false;
        app.algorithmId = hashAlgorithm;
        ensureValidTarget();
        updateAlgorithmUI();
        rebuildTrace();
      }
    });
  }

  init();
})();
