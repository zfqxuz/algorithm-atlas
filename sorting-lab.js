(function () {
  'use strict';

  const engine = window.SortingEngine;
  const Lab = window.LabCore;
  if (!engine || !Lab) throw new Error('排序算法引擎或公共组件未加载。');

  const DOM = {
    tabs: Lab.$('#sortAlgorithmTabs'),
    levelBadge: Lab.$('#sortLevelBadge'),
    complexityBadge: Lab.$('#sortComplexityBadge'),
    currentMessage: Lab.$('#sortCurrentMessage'),
    dataSetLabel: Lab.$('#sortDataSetLabel'),
    bars: Lab.$('#sortBars'),
    counts: Lab.$('#sortCounts'),
    countsBars: Lab.$('#sortCountsBars'),
    playBtn: Lab.$('#sortPlayBtn'),
    playLabel: Lab.$('#sortPlayLabel'),
    stepBtn: Lab.$('#sortStepBtn'),
    resetBtn: Lab.$('#sortResetBtn'),
    progressFill: Lab.$('#sortProgressFill'),
    progressTrack: Lab.$('#sortProgressTrack'),
    stepLabel: Lab.$('#sortStepLabel'),
    progressValue: Lab.$('#sortProgressValue'),
    speed: Lab.$('#sortSpeed'),
    speedValue: Lab.$('#sortSpeedValue'),
    pseudoCode: Lab.$('#sortPseudoCode'),
    codeAlgorithm: Lab.$('#sortCodeAlgorithm'),
    invariant: Lab.$('#sortInvariant'),
    time: Lab.$('#sortTime'),
    space: Lab.$('#sortSpace'),
    stable: Lab.$('#sortStable'),
    inPlace: Lab.$('#sortInPlace'),
    seedBadge: Lab.$('#sortSeedBadge'),
    size: Lab.$('#sortSize'),
    sizeValue: Lab.$('#sortSizeValue'),
    distribution: Lab.$('#sortDistribution'),
    maxValue: Lab.$('#sortMaxValue'),
    seed: Lab.$('#sortSeed'),
    generateBtn: Lab.$('#sortGenerateBtn'),
    randomSeedBtn: Lab.$('#sortRandomSeedBtn'),
    dataDescription: Lab.$('#sortDataDescription'),
    runState: Lab.$('#sortRunState'),
    comparisons: Lab.$('#sortComparisons'),
    comparisonsLabel: Lab.$('#sortComparisonsLabel'),
    swaps: Lab.$('#sortSwaps'),
    swapsLabel: Lab.$('#sortSwapsLabel'),
    sortedCount: Lab.$('#sortSortedCount'),
    detail: Lab.$('#sortDetail'),
    profileLevel: Lab.$('#sortProfileLevel'),
    description: Lab.$('#sortDescription'),
    profileTags: Lab.$('#sortProfileTags'),
  };

  const inventory = engine.ALGORITHMS;
  const byId = new Map(inventory.map((algorithm) => [algorithm.id, algorithm]));
  const distributionLabels = {
    random: '随机分布',
    'near-sorted': '近乎有序',
    reversed: '完全逆序',
    'few-unique': '少量重复',
    sawtooth: '锯齿序列',
  };
  const invariants = {
    bubble: '每轮结束后，末尾元素已经就位，并且是未排序区间的最大值。',
    selection: '前缀已经有序，并且包含整个数组中最小的若干元素。',
    insertion: '前缀始终有序，待插入元素在交换过程中逐步向左移动。',
    shell: '间隔为 gap 的子序列分别有序；gap 最终缩小为 1。',
    merge: '每个待合并的左右子数组各自有序，合并后整个区间有序。',
    quick: '划分后枢轴左侧不大于枢轴，右侧不小于枢轴；随后递归处理两侧。',
    heap: '堆区满足父节点不小于子节点；堆顶不断与末尾交换，逐步放大有序后缀。',
    counting: 'counts 前缀和表示每个值在稳定输出数组中的结束位置。',
  };

  const state = {
    algorithmId: 'bubble',
    generated: null,
    params: null,
    trace: null,
    steps: [],
    index: 0,
    speed: 1,
    player: null,
    barEls: [],
    countEls: [],
    maxValue: 1,
  };

  function paramsFromForm() {
    return {
      size: Number(DOM.size.value),
      maxValue: Number(DOM.maxValue.value),
      distribution: DOM.distribution.value,
      seed: Number(DOM.seed.value) || 2026,
    };
  }

  function updateDataSummary() {
    const params = state.params;
    const generated = state.generated;
    if (!params || !generated) return;
    const distribution = distributionLabels[params.distribution] || params.distribution;
    DOM.seedBadge.textContent = `seed ${generated.seed}`;
    DOM.dataSetLabel.textContent = `${distribution} · ${generated.values.length} 项`;
    DOM.dataDescription.innerHTML = '';
    DOM.dataDescription.append(
      document.createTextNode('规模 '),
      Lab.el('strong', '', String(generated.values.length)),
      document.createTextNode(` · 值域 0–${params.maxValue} · ${distribution} · seed `),
      Lab.el('strong', '', String(generated.seed)),
      document.createTextNode('。')
    );
    DOM.sizeValue.textContent = String(params.size);
    DOM.seed.value = String(generated.seed);
    Lab.updateRangeFill(DOM.size);
  }

  function ensureBars(length) {
    if (state.barEls.length === length) return;
    state.barEls = [];
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < length; index += 1) {
      const bar = Lab.el('div', 'sort-bar');
      const value = Lab.el('span', 'sort-bar-value');
      const body = Lab.el('span', 'sort-bar-body');
      bar.append(value, body);
      fragment.appendChild(bar);
      state.barEls.push({ root: bar, value, body });
    }
    DOM.bars.replaceChildren(fragment);
    DOM.bars.classList.toggle('show-values', length <= 32);
    DOM.bars.style.setProperty('--bar-gap', length <= 16 ? '4px' : length <= 32 ? '2px' : '1px');
  }

  function ensureCountBars(length) {
    if (state.countEls.length === length) return;
    state.countEls = [];
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < length; index += 1) {
      const cell = Lab.el('span', 'sort-count-cell');
      cell.title = `counts[${index}]`;
      fragment.appendChild(cell);
      state.countEls.push(cell);
    }
    DOM.countsBars.replaceChildren(fragment);
  }

  function renderBars(step) {
    ensureBars(step.values.length);
    const compare = new Set(step.compare || []);
    const active = new Set(step.active || []);
    const sorted = new Set(step.sorted || []);
    state.maxValue = Math.max(1, ...state.generated.values);

    step.values.forEach((value, index) => {
      const bar = state.barEls[index];
      if (!bar) return;
      const height = Math.max(2, (value / state.maxValue) * 82);
      bar.root.style.setProperty('--bar-h', `${height}%`);
      bar.value.textContent = String(value);
      bar.root.title = `索引 ${index} · 值 ${value}`;
      bar.root.classList.toggle('is-compare', compare.has(index));
      bar.root.classList.toggle('is-active', active.has(index) && !compare.has(index));
      bar.root.classList.toggle('is-pivot', step.pivot === index);
      bar.root.classList.toggle('is-sorted', sorted.has(index));
    });

    DOM.bars.setAttribute(
      'aria-label',
      `排序数组：${step.values.join('，')}。${step.message}`
    );

    if (Array.isArray(step.counts)) {
      DOM.counts.hidden = false;
      ensureCountBars(step.counts.length);
      const maxCount = Math.max(1, ...step.counts);
      step.counts.forEach((value, index) => {
        const cell = state.countEls[index];
        const height = Math.max(4, (value / maxCount) * 100);
        cell.style.setProperty('--count-h', `${height}%`);
        cell.title = `counts[${index}] = ${value}`;
      });
    } else {
      DOM.counts.hidden = true;
    }
  }

  function applyCodeLine(line) {
    const rows = Array.from(DOM.pseudoCode.children);
    rows.forEach((row, index) => {
      row.classList.toggle('is-active', index + 1 === line);
    });
    Lab.scrollActiveLine(DOM.pseudoCode);
  }

  function updateTransport() {
    if (!state.player) return;
    const playing = state.player.isPlaying();
    const atEnd = state.steps.length > 0 && state.index >= state.steps.length - 1;
    DOM.playBtn.dataset.state = playing ? 'playing' : 'idle';
    DOM.stepBtn.disabled = playing;
    DOM.playLabel.textContent = playing ? '暂停' : atEnd ? '重播' : state.index > 0 ? '继续' : '播放';
    DOM.playBtn.setAttribute('aria-label', playing ? '暂停排序动画' : atEnd ? '重新播放排序动画' : '播放排序动画');
  }

  function updateRunState() {
    const terminal = state.steps.length > 0 && state.index >= state.steps.length - 1;
    let kind = 'init';
    let label = 'READY';
    if (terminal) {
      kind = 'done';
      label = 'DONE';
    } else if (state.player && state.player.isPlaying()) {
      kind = 'update';
      label = 'RUNNING';
    } else if (state.index > 0) {
      kind = 'keep';
      label = 'PAUSED';
    }
    DOM.runState.dataset.kind = kind;
    DOM.runState.textContent = label;
    DOM.bars.classList.toggle('is-sorted', terminal);
  }

  function render() {
    const step = state.steps[state.index];
    if (!step) return;
    renderBars(step);
    applyCodeLine(step.line);

    const meta = byId.get(state.algorithmId);
    const terminal = state.steps.length > 0 && state.index >= state.steps.length - 1;
    const displayMessage = meta.id === 'counting' && terminal
      ? `计数排序完成：值域 0–${state.maxValue}，按前缀和稳定放置 ${step.values.length} 个元素。`
      : step.message;
    DOM.currentMessage.textContent = displayMessage;
    DOM.detail.textContent = displayMessage;
    if (meta.id === 'counting') {
      DOM.comparisons.textContent = String(state.maxValue + 1);
      DOM.swaps.textContent = '非比较';
    } else {
      DOM.comparisons.textContent = String(step.comparisons);
      DOM.swaps.textContent = String(step.swaps);
    }
    DOM.sortedCount.textContent = String((step.sorted || []).length);

    const total = state.steps.length;
    const progress = total <= 1 ? 100 : Math.round((state.index / (total - 1)) * 100);
    DOM.progressFill.style.width = `${progress}%`;
    DOM.progressValue.textContent = `${progress}%`;
    DOM.progressTrack.setAttribute('aria-valuenow', String(progress));
    DOM.stepLabel.textContent = `步骤 ${state.index} / ${Math.max(0, total - 1)}`;

    updateRunState();
    updateTransport();
  }

  function updateProfile() {
    const meta = byId.get(state.algorithmId);
    if (!meta) return;
    Lab.setLevelBadge(DOM.levelBadge, meta.level);
    Lab.setLevelBadge(DOM.profileLevel, meta.level);
    DOM.complexityBadge.textContent = meta.time;
    DOM.time.textContent = meta.time;
    DOM.space.textContent = meta.space;
    DOM.stable.textContent = meta.stable ? '稳定' : '不稳定';
    DOM.inPlace.textContent = meta.inPlace ? '是' : '否';
    DOM.codeAlgorithm.textContent = meta.en;
    DOM.description.textContent = meta.description;
    DOM.invariant.textContent = invariants[meta.id] || '—';
    DOM.comparisonsLabel.textContent = meta.id === 'counting' ? '值域 k' : '比较次数';
    DOM.swapsLabel.textContent = meta.id === 'counting' ? '策略' : '交换 / 写入';
    DOM.profileTags.replaceChildren();
    const tags = [
      meta.stable ? '稳定排序' : '不稳定',
      meta.inPlace ? '原地' : '额外空间',
      meta.id === 'counting' ? '非比较排序' : '比较排序',
    ];
    for (const tag of tags) DOM.profileTags.appendChild(Lab.el('span', '', tag));
    Lab.renderCode(DOM.pseudoCode, meta.pseudocode, []);
    for (const button of DOM.tabs.querySelectorAll('.lab-entry')) {
      const active = button.dataset.algorithm === meta.id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    updateTransport();
  }

  function rebuildTrace() {
    if (state.player) state.player.pause();
    state.trace = engine.createTrace(state.algorithmId, state.generated.values);
    state.steps = state.trace.steps;
    state.index = 0;
    render();
  }

  function setAlgorithm(algorithmId, writeHash) {
    if (!byId.has(algorithmId) || algorithmId === state.algorithmId) return;
    state.algorithmId = algorithmId;
    updateProfile();
    rebuildTrace();
    if (writeHash) Lab.writeMode(algorithmId);
  }

  function generateData(options) {
    const settings = options || {};
    if (state.player) state.player.pause();
    const params = paramsFromForm();
    const generated = engine.generateArray(params);
    state.params = params;
    state.generated = generated;
    updateDataSummary();
    state.trace = engine.createTrace(state.algorithmId, generated.values);
    state.steps = state.trace.steps;
    state.index = 0;
    if (!settings.silent) {
      DOM.currentMessage.textContent = '新数据已生成';
    }
    render();
  }

  function populateTabs() {
    DOM.tabs.replaceChildren();
    for (const algorithm of inventory) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lab-entry';
      button.dataset.algorithm = algorithm.id;
      button.setAttribute('aria-pressed', 'false');
      const label = Lab.el('span', '', algorithm.name.replace('排序', ''));
      button.append(label, Lab.el('small', '', algorithm.level));
      button.addEventListener('click', () => setAlgorithm(algorithm.id, true));
      DOM.tabs.appendChild(button);
    }
  }

  function setupPlayer() {
    state.player = Lab.createTimelinePlayer({
      getTotal: () => state.steps.length,
      getIndex: () => state.index,
      setIndex: (index) => { state.index = index; },
      render,
      getDelay: () => 78,
      getBatchSize: () => Math.max(1, Math.round(state.speed * 2)),
      onPlayStateChange: (event) => {
        if (event !== 'tick') render();
      },
    });
  }

  function bindEvents() {
    DOM.playBtn.addEventListener('click', () => state.player.toggle());
    DOM.stepBtn.addEventListener('click', () => {
      if (state.steps.length > 0 && state.index >= state.steps.length - 1) state.player.reset();
      state.player.step();
    });
    DOM.resetBtn.addEventListener('click', () => state.player.reset());
    DOM.speed.addEventListener('input', () => {
      state.speed = Number(DOM.speed.value);
      DOM.speedValue.textContent = `${state.speed.toFixed(1).replace('.0', '')}×`;
      Lab.updateRangeFill(DOM.speed);
    });

    DOM.size.addEventListener('input', () => {
      DOM.sizeValue.textContent = DOM.size.value;
      Lab.updateRangeFill(DOM.size);
    });
    DOM.generateBtn.addEventListener('click', () => generateData());
    DOM.randomSeedBtn.addEventListener('click', () => {
      DOM.seed.value = String(Lab.randomSeed());
      generateData();
    });

    document.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target.closest('input, select, textarea, button, a')) return;
      if (event.code === 'Space') {
        event.preventDefault();
        state.player.toggle();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        state.player.step();
      }
    });

    window.addEventListener('hashchange', () => {
      const next = Lab.readMode(inventory.map((algorithm) => algorithm.id), state.algorithmId);
      setAlgorithm(next, false);
    });
  }

  function init() {
    populateTabs();
    state.algorithmId = Lab.readMode(inventory.map((algorithm) => algorithm.id), 'bubble');
    const initialParams = paramsFromForm();
    const generated = engine.generateArray(initialParams);
    state.params = initialParams;
    state.generated = generated;
    updateDataSummary();
    updateProfile();
    state.trace = engine.createTrace(state.algorithmId, generated.values);
    state.steps = state.trace.steps;
    state.index = 0;
    state.speed = Number(DOM.speed.value);
    DOM.speedValue.textContent = `${state.speed.toFixed(1).replace('.0', '')}×`;
    Lab.updateRangeFill(DOM.speed);
    Lab.updateRangeFill(DOM.size);
    setupPlayer();
    bindEvents();
    render();
  }

  init();
})();
