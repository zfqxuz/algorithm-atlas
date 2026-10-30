(function () {
  'use strict';

  const engine = window.AdvancedEngine;
  const Lab = window.LabCore;
  if (!engine || !Lab) throw new Error('进阶算法引擎或公共组件未加载。');

  const DOM = {
    tabs: Lab.$('#advTabs'),
    levelBadge: Lab.$('#advLevelBadge'),
    complexityBadge: Lab.$('#advComplexityBadge'),
    stageEyebrow: Lab.$('#advStageEyebrow'),
    stageTitle: Lab.$('#advStageTitle'),
    stage: Lab.$('#advStage'),
    message: Lab.$('#advMessage'),
    dataLabel: Lab.$('#advDataLabel'),
    playBtn: Lab.$('#advPlayBtn'),
    playLabel: Lab.$('#advPlayLabel'),
    stepBtn: Lab.$('#advStepBtn'),
    resetBtn: Lab.$('#advResetBtn'),
    progressFill: Lab.$('#advProgressFill'),
    progressTrack: Lab.$('#advProgressTrack'),
    stepLabel: Lab.$('#advStepLabel'),
    progressValue: Lab.$('#advProgressValue'),
    speed: Lab.$('#advSpeed'),
    speedValue: Lab.$('#advSpeedValue'),
    pseudoCode: Lab.$('#advPseudoCode'),
    codeAlgorithm: Lab.$('#advCodeAlgorithm'),
    coreIdea: Lab.$('#advCoreIdea'),
    time: Lab.$('#advTime'),
    space: Lab.$('#advSpace'),
    levelText: Lab.$('#advLevelText'),
    phase: Lab.$('#advPhase'),
    insight: Lab.$('#advInsight'),
    seedBadge: Lab.$('#advSeedBadge'),
    paramForm: Lab.$('#advParamForm'),
    generateBtn: Lab.$('#advGenerateBtn'),
    randomSeedBtn: Lab.$('#advRandomSeedBtn'),
    paramSummary: Lab.$('#advParamSummary'),
    paramHint: Lab.$('#advParamHint'),
    runState: Lab.$('#advRunState'),
    metrics: Lab.$('#advMetrics'),
    metricNote: Lab.$('#advMetricNote'),
    profileLevel: Lab.$('#advProfileLevel'),
    description: Lab.$('#advDescription'),
    profileTags: Lab.$('#advProfileTags'),
    profileNote: Lab.$('#advProfileNote'),
  };

  const LEVEL_NAMES = { L1: '本科基础', L2: '本科进阶', L3: '高阶 / 研究生入门', L4: '研究生 / 博一' };
  const ALGORITHMS = engine.ALGORITHMS;
  const byId = new Map(ALGORITHMS.map((algorithm) => [algorithm.id, algorithm]));

  const MODES = {
    lcs: {
      stageTitle: 'LCS 动态规划表',
      eyebrow: 'DYNAMIC PROGRAMMING',
      coreIdea: 'dp[i][j] 表示 a 的前 i 个字符与 b 的前 j 个字符的最长公共子序列长度。字符相等时取左上角 + 1，否则取上方与左侧的较大值。',
      insight: '右上到左下的依赖关系决定了填表顺序；最终从右下角回溯，才能读出具体的公共子序列。',
      profileNote: '观察字符相等时沿对角线 +1，失配时取上/左最大值；路径只在完成时点亮。',
      tags: ['二维 DP', '最优子结构', '回溯'],
      paramHint: '调整两条序列的长度与字母表大小，观察公共结构如何变得稀疏或密集。',
      fields: [
        { key: 'lengthA', label: '序列 A 长度', type: 'range', min: 4, max: 18, step: 1, default: 11 },
        { key: 'lengthB', label: '序列 B 长度', type: 'range', min: 4, max: 18, step: 1, default: 12 },
        { key: 'alphabet', label: '字母表大小', type: 'select', numeric: true, options: [[2, '2 个字母'], [3, '3 个字母'], [4, '4 个字母'], [5, '5 个字母']], default: 3 },
        { key: 'seed', label: '随机种子', type: 'number', min: 1, max: 99999, step: 1, default: 2026 },
      ],
      defaults() {
        return Object.fromEntries(this.fields.map((field) => [field.key, field.default]));
      },
      summary(params) {
        return `a 长 ${params.lengthA} · b 长 ${params.lengthB} · 字母表 ${params.alphabet} · seed ${params.seed}`;
      },
      dataLabel(screen) {
        return `a ${screen.input.a.length} · b ${screen.input.b.length}`;
      },
    },
    kmp: {
      stageTitle: 'KMP 前缀函数与匹配',
      eyebrow: 'STRING ALGORITHMS',
      coreIdea: '前缀函数 π[i] 记录 pattern[0..i] 的最长真前后缀长度。失配时把模式串沿 π 回退，而不回退文本指针。',
      insight: '文本指针 i 单调前进；真正移动的是模式指针 k。前缀表把“已经匹配了多少”编码成了可复用的状态。',
      profileNote: '先观察前缀函数的构造，再观察匹配阶段如何在失配时回退。',
      tags: ['前缀函数', '线性时间', '字符串'],
      paramHint: '调整文本长度、模式长度与植入匹配数量；字母表越小，偶然匹配越多。',
      fields: [
        { key: 'textLength', label: '文本长度', type: 'range', min: 12, max: 36, step: 1, default: 26 },
        { key: 'patternLength', label: '模式长度', type: 'range', min: 3, max: 8, step: 1, default: 4 },
        { key: 'alphabet', label: '字母表大小', type: 'select', numeric: true, options: [[2, 'AB'], [3, 'ABC'], [4, 'ABCD']], default: 3 },
        { key: 'plantedMatches', label: '植入匹配数', type: 'range', min: 0, max: 3, step: 1, default: 1 },
        { key: 'seed', label: '随机种子', type: 'number', min: 1, max: 99999, step: 1, default: 2026 },
      ],
      defaults() {
        return Object.fromEntries(this.fields.map((field) => [field.key, field.default]));
      },
      summary(params) {
        return `文本 ${params.textLength} · 模式 ${params.patternLength} · 字母表 ${params.alphabet} · 植入 ${params.plantedMatches} · seed ${params.seed}`;
      },
      dataLabel(screen) {
        return `text ${screen.input.text.length} · pattern ${screen.input.pattern.length}`;
      },
    },
    hull: {
      stageTitle: '凸包 · 单调链',
      eyebrow: 'COMPUTATIONAL GEOMETRY',
      coreIdea: '按坐标字典序排序后，从左到右维护下凸链，再从右到左维护上凸链。叉积 ≤ 0 时弹出栈顶，保证始终左转。',
      insight: '每个点最多入栈、出栈一次，因此排序后的线性扫描是 O(n)。边界共线与重复点需要单独处理。',
      profileNote: '注意弹出条件：非严格左转会被移除；最终凸包由下链与上链拼接而成。',
      tags: ['计算几何', '叉积', '单调链'],
      paramHint: '切换随机、圆形与簇状点集；边界共线点会被剔除。',
      fields: [
        { key: 'count', label: '点数', type: 'range', min: 6, max: 36, step: 1, default: 22 },
        { key: 'spread', label: '坐标范围', type: 'select', numeric: true, options: [[600, '600'], [800, '800'], [1000, '1000']], default: 800 },
        { key: 'shape', label: '点集形状', type: 'select', numeric: false, options: [['random', '随机'], ['circle', '圆形'], ['clusters', '簇状']], default: 'random' },
        { key: 'seed', label: '随机种子', type: 'number', min: 1, max: 99999, step: 1, default: 2026 },
      ],
      defaults() {
        return Object.fromEntries(this.fields.map((field) => [field.key, field.default]));
      },
      summary(params) {
        return `${params.count} 个点 · 范围 ${params.spread} · ${params.shape} · seed ${params.seed}`;
      },
      dataLabel(screen) {
        return `${screen.input.points.length} 个点 · ${screen.params.shape}`;
      },
    },
    pagerank: {
      stageTitle: 'PageRank 幂迭代',
      eyebrow: 'NETWORK SCIENCE',
      coreIdea: '把有向图视为随机游走：每个节点把分数按出度均分给邻居，再以阻尼 d 回到均匀分布。反复迭代直到分数收敛。',
      insight: 'PageRank 是线性方程组的幂迭代解，也是“随机游走 + 传送”的平稳分布。悬挂节点需要把质量重新均分。',
      profileNote: '观察节点面积与右侧排名随迭代变化；阻尼越大，随机游走越依赖链接结构。',
      tags: ['随机游走', '幂迭代', '线性代数'],
      paramHint: '调整节点数、边概率、阻尼与最大迭代次数；收敛阈值控制何时停止。',
      fields: [
        { key: 'nodes', label: '节点数', type: 'range', min: 4, max: 12, step: 1, default: 8 },
        { key: 'edgeProbability', label: '边概率', type: 'range', min: 0.15, max: 0.5, step: 0.05, default: 0.3, format: (v) => `${Math.round(v * 100)}%` },
        { key: 'damping', label: '阻尼系数 d', type: 'range', min: 0.5, max: 0.95, step: 0.05, default: 0.85, format: (v) => v.toFixed(2) },
        { key: 'iterations', label: '最大迭代次数', type: 'range', min: 5, max: 30, step: 1, default: 20 },
        { key: 'tolerance', label: '收敛阈值', type: 'select', numeric: true, options: [['0.001', '1e-3'], ['0.000001', '1e-6'], ['0.000000001', '1e-9']], default: 0.001 },
        { key: 'seed', label: '随机种子', type: 'number', min: 1, max: 99999, step: 1, default: 2026 },
      ],
      defaults() {
        return Object.fromEntries(this.fields.map((field) => [field.key, field.default]));
      },
      summary(params) {
        return `${params.nodes} 个节点 · 边概率 ${Math.round(params.edgeProbability * 100)}% · d=${params.damping.toFixed(2)} · ${params.iterations} 次 · seed ${params.seed}`;
      },
      dataLabel(screen) {
        return `${screen.input.nodes.length} nodes · ${screen.input.edges.length} edges · d ${screen.params.damping}`;
      },
    },
  };

  const state = {
    mode: 'lcs',
    screens: {},
    speed: 1,
    player: null,
  };

  function currentScreen() {
    return state.screens[state.mode];
  }

  function currentStep() {
    const screen = currentScreen();
    return screen ? screen.steps[screen.index] : null;
  }

  function format(value, digits) {
    if (!Number.isFinite(value)) return '—';
    const fixed = value.toFixed(digits === undefined ? 2 : digits);
    return fixed.replace(/\.0+$|(\.\d*[1-9])0+$/, '$1');
  }

  function activeRowAt(container, line) {
    Array.from(container.children).forEach((row, index) => {
      row.classList.toggle('is-active', index + 1 === line);
    });
    Lab.scrollActiveLine(container);
  }

  // ---------- screen construction ----------

  function buildLcsScreen(params) {
    const input = engine.generateLcsInput({
      lengthA: params.lengthA,
      lengthB: params.lengthB,
      alphabet: params.alphabet,
      seed: params.seed,
    });
    const solution = engine.solveLcs(input);
    const table = Array.from({ length: input.a.length + 1 }, () =>
      Array(input.b.length + 1).fill(0)
    );
    const frames = [];
    for (const step of solution.steps) {
      for (const change of step.changes || []) table[change.row][change.col] = change.value;
      frames.push(table.map((row) => row.slice()));
    }
    return { mode: 'lcs', params: { ...params }, input, solution, steps: solution.steps, frames, index: 0 };
  }

  function buildKmpScreen(params) {
    const input = engine.generateKmpInput({
      textLength: params.textLength,
      patternLength: params.patternLength,
      alphabet: params.alphabet,
      plantedMatches: params.plantedMatches,
      seed: params.seed,
    });
    const solution = engine.solveKmp(input);
    const prefix = Array(input.pattern.length).fill(0);
    const steps = [];
    for (const raw of solution.prefixSteps) {
      for (const change of raw.changes || []) prefix[change.index] = change.value;
      steps.push({
        ...raw,
        kind: 'prefix',
        prefix: prefix.slice(),
        matchesSoFar: [],
      });
    }
    const matchesSoFar = [];
    for (const raw of solution.steps) {
      if (raw.match && Number.isInteger(raw.start) && !matchesSoFar.includes(raw.start)) {
        matchesSoFar.push(raw.start);
      }
      steps.push({
        ...raw,
        kind: 'search',
        prefix: solution.prefix.slice(),
        matchesSoFar: matchesSoFar.slice(),
      });
    }
    return {
      mode: 'kmp',
      params: { ...params },
      input,
      solution,
      steps,
      prefix: solution.prefix,
      index: 0,
    };
  }

  function buildHullScreen(params) {
    const input = engine.generateHullInput({
      count: params.count,
      spread: params.spread,
      shape: params.shape,
      seed: params.seed,
    });
    const solution = engine.solveHull(input);
    return {
      mode: 'hull',
      params: { ...params },
      input,
      solution,
      steps: solution.steps,
      index: 0,
    };
  }

  function buildPagerankScreen(params) {
    const input = engine.generatePagerankInput({
      nodes: params.nodes,
      edgeProbability: params.edgeProbability,
      seed: params.seed,
    });
    const solution = engine.solvePagerank(input, {
      damping: params.damping,
      iterations: params.iterations,
      tolerance: params.tolerance,
    });
    const baseScores = Object.fromEntries(input.nodes.map((id) => [id, 1 / input.nodes.length]));
    const steps = [
      {
        kind: 'base',
        phase: '初始均匀分布',
        iteration: 0,
        scores: baseScores,
        delta: 0,
        line: 2,
        message: `将 ${input.nodes.length} 个节点的初始分数都设为 1/n。`,
      },
    ];
    solution.iterations.forEach((iteration, index) => {
      steps.push({
        kind: 'iterate',
        phase: `第 ${index + 1} 次幂迭代`,
        iteration: index + 1,
        scores: iteration.scores,
        delta: iteration.delta,
        line: 12,
        message: `第 ${index + 1} 次迭代完成，分数变化 Δ = ${format(iteration.delta, 6)}。`,
      });
    });
    return {
      mode: 'pagerank',
      params: { ...params },
      input,
      solution,
      steps,
      index: 0,
    };
  }

  function generateScreen(mode, params) {
    if (mode === 'lcs') return buildLcsScreen(params);
    if (mode === 'kmp') return buildKmpScreen(params);
    if (mode === 'hull') return buildHullScreen(params);
    if (mode === 'pagerank') return buildPagerankScreen(params);
    throw new Error(`未知模式：${mode}`);
  }

  // ---------- parameters ----------

  function formatField(field, value) {
    if (field.format) return field.format(value);
    return String(value);
  }

  function buildParamForm(params) {
    const config = MODES[state.mode];
    DOM.paramForm.replaceChildren();
    for (const field of config.fields) {
      const label = Lab.el('label', `lab-param${field.wide ? ' is-wide' : ''}`);
      const head = document.createElement('span');
      head.append(document.createTextNode(`${field.label} `));
      const valueSlot = Lab.el('strong', '', '');
      if (field.type === 'range') head.appendChild(valueSlot);
      label.appendChild(head);
      let input;
      if (field.type === 'range' || field.type === 'number') {
        if (field.type === 'range') {
          const wrapper = Lab.el('div', 'lab-param-range');
          input = document.createElement('input');
          input.type = 'range';
          input.min = String(field.min);
          input.max = String(field.max);
          input.step = String(field.step);
          input.value = String(params[field.key]);
          wrapper.appendChild(input);
          label.appendChild(wrapper);
        } else {
          input = document.createElement('input');
          input.type = 'number';
          input.min = String(field.min);
          input.max = String(field.max);
          input.step = String(field.step);
          input.value = String(params[field.key]);
          label.appendChild(input);
        }
        input.id = `advParam-${field.key}`;
        input.dataset.key = field.key;
        input.dataset.kind = 'number';
      } else {
        input = document.createElement('select');
        input.id = `advParam-${field.key}`;
        input.dataset.key = field.key;
        input.dataset.kind = 'select';
        for (const [value, labelText] of field.options) {
          const option = document.createElement('option');
          option.value = String(value);
          option.textContent = labelText;
          input.appendChild(option);
        }
        input.value = String(params[field.key]);
        label.appendChild(input);
      }
      if (field.type === 'range') {
        valueSlot.textContent = formatField(field, Number(input.value));
        input.addEventListener('input', () => {
          valueSlot.textContent = formatField(field, Number(input.value));
          Lab.updateRangeFill(input);
        });
        Lab.updateRangeFill(input);
      }
      DOM.paramForm.appendChild(label);
    }
  }

  function readParams() {
    const config = MODES[state.mode];
    const params = {};
    for (const field of config.fields) {
      const input = document.getElementById(`advParam-${field.key}`);
      if (!input) continue;
      if (field.type === 'select') {
        params[field.key] = field.numeric ? Number(input.value) : input.value;
      } else {
        params[field.key] = Number(input.value);
      }
    }
    return params;
  }

  function updateSeedAndSummary(screen) {
    const config = MODES[screen.mode];
    DOM.seedBadge.textContent = `seed ${screen.params.seed}`;
    DOM.paramSummary.textContent = config.summary(screen.params);
  }

  // ---------- common chrome ----------

  function updateProfile() {
    const config = MODES[state.mode];
    const meta = byId.get(state.mode);
    const screen = currentScreen();
    if (!meta || !config || !screen) return;
    Lab.setLevelBadge(DOM.levelBadge, meta.level);
    Lab.setLevelBadge(DOM.profileLevel, meta.level);
    DOM.complexityBadge.textContent = meta.time;
    DOM.stageTitle.textContent = config.stageTitle;
    DOM.stageEyebrow.textContent = config.eyebrow;
    DOM.codeAlgorithm.textContent = meta.en;
    DOM.coreIdea.textContent = config.coreIdea;
    DOM.time.textContent = meta.time;
    DOM.space.textContent = meta.space;
    DOM.levelText.textContent = `${meta.level} · ${LEVEL_NAMES[meta.level]}`;
    DOM.insight.textContent = config.insight;
    DOM.description.textContent = meta.description;
    DOM.profileNote.textContent = config.profileNote;
    DOM.paramHint.textContent = config.paramHint;
    DOM.profileTags.replaceChildren();
    for (const tag of config.tags) DOM.profileTags.appendChild(Lab.el('span', '', tag));
    Lab.renderCode(DOM.pseudoCode, meta.pseudocode, []);
    updateSeedAndSummary(screen);
    for (const button of DOM.tabs.querySelectorAll('.lab-entry')) {
      const active = button.dataset.algorithm === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function renderMetrics(items, note) {
    DOM.metrics.replaceChildren();
    for (const [label, value] of items) {
      const item = Lab.el('div', 'adv-metric');
      item.append(Lab.el('span', '', label), Lab.el('strong', '', String(value)));
      DOM.metrics.appendChild(item);
    }
    DOM.metricNote.textContent = note;
  }

  function updateTransport() {
    if (!state.player) return;
    const screen = currentScreen();
    const total = screen ? screen.steps.length : 0;
    const playing = state.player.isPlaying();
    const atEnd = total > 0 && screen.index >= total - 1;
    DOM.playBtn.dataset.state = playing ? 'playing' : 'idle';
    DOM.stepBtn.disabled = playing;
    DOM.playLabel.textContent = playing ? '暂停' : atEnd ? '重播' : screen && screen.index > 0 ? '继续' : '播放';
    DOM.playBtn.setAttribute('aria-label', playing ? '暂停动画' : atEnd ? '重新播放动画' : '播放动画');
  }

  function updateRunState() {
    const screen = currentScreen();
    const terminal = screen && screen.steps.length > 0 && screen.index >= screen.steps.length - 1;
    let kind = 'init';
    let label = 'READY';
    if (terminal) {
      kind = 'done';
      label = 'DONE';
    } else if (state.player && state.player.isPlaying()) {
      kind = 'update';
      label = 'RUNNING';
    } else if (screen && screen.index > 0) {
      kind = 'keep';
      label = 'PAUSED';
    }
    DOM.runState.dataset.kind = kind;
    DOM.runState.textContent = label;
  }

  // ---------- LCS rendering ----------

  function renderLcs(screen, step) {
    const frame = screen.frames[screen.index];
    const m = screen.input.a.length;
    const n = screen.input.b.length;
    const atEnd = screen.index >= screen.steps.length - 1;
    const pathSet = new Set((atEnd ? screen.solution.path : []).map(([row, col]) => `${row}:${col}`));

    const root = Lab.el('div', 'lcs-stage');
    const notes = Lab.el('div', 'lcs-note-row');
    for (const [label, sequence] of [['a', screen.input.a], ['b', screen.input.b]]) {
      const chip = Lab.el('span', 'lcs-sequence');
      chip.append(document.createTextNode(`${label} `), Lab.el('b', '', sequence));
      notes.appendChild(chip);
    }
    root.appendChild(notes);

    const wrap = Lab.el('div', 'lcs-table-wrap');
    const table = document.createElement('table');
    table.className = 'lcs-table';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.className = 'lcs-corner';
    headRow.appendChild(corner);
    for (let j = 0; j < n; j += 1) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = screen.input.b[j];
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 1; i <= m; i += 1) {
      const row = document.createElement('tr');
      const rowHead = document.createElement('th');
      rowHead.scope = 'row';
      rowHead.textContent = screen.input.a[i - 1];
      row.appendChild(rowHead);
      for (let j = 1; j <= n; j += 1) {
        const cell = document.createElement('td');
        const value = frame[i][j];
        const isActive = step.row === i && step.col === j;
        const isMatch = isActive && step.type === 'match';
        cell.textContent = String(value);
        if (value > 0) cell.classList.add('is-filled');
        if (isMatch) cell.classList.add('is-match');
        if (isActive) cell.classList.add('is-active');
        if (pathSet.has(`${i}:${j}`)) cell.classList.add('is-path');
        cell.title = `dp[${i}][${j}] = ${value}`;
        row.appendChild(cell);
      }
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    root.appendChild(wrap);

    const result = Lab.el('div', 'lcs-result-bar');
    if (atEnd) {
      const chip = Lab.el('span', 'lcs-result-chip');
      chip.append(document.createTextNode(`LCS = ${screen.solution.lcs || '∅'}`), Lab.el('span', '', `长度 ${screen.solution.length}`));
      result.append(document.createTextNode('答案：'), chip);
    } else if (step.row && step.col) {
      result.textContent = `当前单元 dp[${step.row}][${step.col}] = ${frame[step.row][step.col]}`;
    } else {
      result.textContent = '边界初始化为 0，动态规划表等待填充。';
    }
    root.appendChild(result);
    DOM.stage.replaceChildren(root);

    const filled = frame.flat().filter((value) => value > 0).length;
    renderMetrics(
      [
        ['当前单元', step.row && step.col ? `dp[${step.row}][${step.col}]` : '边界'],
        ['dp 值', step.value !== undefined ? step.value : '0'],
        ['已填单元', `${filled} / ${m * n}`],
        ['LCS 长度', atEnd ? screen.solution.length : '—'],
      ],
      step.message
    );
    DOM.phase.textContent = step.phase === 'init' ? '初始化' : step.phase === 'done' ? '回溯完成' : '填表';
  }

  // ---------- KMP rendering ----------

  function renderKmp(screen, step) {
    const { text, pattern } = screen.input;
    const root = Lab.el('div', 'kmp-stage');
    const isSearch = step.kind === 'search';
    const currentText = isSearch ? step.textIndex : null;
    const currentPattern = Number.isInteger(step.patternIndex) ? step.patternIndex : null;
    const alignment = isSearch && Number.isInteger(step.textIndex) && Number.isInteger(step.patternIndex)
      ? Math.max(0, step.textIndex - step.patternIndex)
      : 0;
    const matches = step.matchesSoFar || [];
    const matchSet = new Set();
    for (const start of matches) {
      for (let offset = 0; offset < pattern.length; offset += 1) matchSet.add(start + offset);
    }

    const prefixSection = Lab.el('div', '');
    const prefixLabel = Lab.el('div', 'kmp-section-label');
    prefixLabel.append(
      Lab.el('span', '', isSearch ? 'PREFIX TABLE · 已构建' : 'PREFIX TABLE · 构造中'),
      Lab.el('span', '', `pattern = ${pattern}`)
    );
    prefixSection.appendChild(prefixLabel);
    const prefixRow = Lab.el('div', 'kmp-prefix-row');
    for (let index = 0; index < pattern.length; index += 1) {
      const cell = Lab.el('div', `kmp-prefix-cell${currentPattern === index ? ' is-active' : ''}`);
      cell.append(Lab.el('span', '', pattern[index]), Lab.el('strong', '', String(step.prefix[index] ?? 0)));
      prefixRow.appendChild(cell);
    }
    prefixSection.appendChild(prefixRow);
    root.appendChild(prefixSection);

    const matchLabel = Lab.el('div', 'kmp-section-label');
    matchLabel.append(
      Lab.el('span', '', isSearch ? 'TEXT SCAN' : 'PATTERN PRIMING'),
      Lab.el('span', '', isSearch ? `文本指针 ${currentText}` : '先构造模式串的前缀函数')
    );
    root.appendChild(matchLabel);

    const windowEl = Lab.el('div', 'kmp-window');
    const track = Lab.el('div', 'kmp-track');
    track.style.setProperty('--kmp-text-len', String(text.length));
    const textRow = Lab.el('div', 'kmp-text-row');
    for (let index = 0; index < text.length; index += 1) {
      const cell = Lab.el('div', `kmp-char${currentText === index ? ' is-current' : ''}${matchSet.has(index) ? ' is-match' : ''}`);
      cell.textContent = text[index];
      cell.title = `text[${index}] = ${text[index]}`;
      textRow.appendChild(cell);
    }
    track.appendChild(textRow);
    const patternRow = Lab.el('div', 'kmp-pattern-row');
    const patternInner = Lab.el('div', `kmp-pattern-inner${isSearch ? '' : ' is-dim'}`);
    patternInner.style.setProperty('--kmp-align', String(alignment));
    patternInner.style.left = `calc(${alignment} * (var(--kmp-unit) + 2px))`;
    for (let index = 0; index < pattern.length; index += 1) {
      const cell = Lab.el('div', `kmp-char${index === currentPattern ? ' is-current' : ''}`);
      cell.textContent = pattern[index];
      cell.title = `pattern[${index}] = ${pattern[index]}`;
      patternInner.appendChild(cell);
    }
    patternRow.appendChild(patternInner);
    track.appendChild(patternRow);
    windowEl.appendChild(track);
    root.appendChild(windowEl);

    const matchRow = Lab.el('div', 'kmp-match-list');
    if (matches.length > 0) {
      for (const start of matches) {
        matchRow.appendChild(Lab.el('span', 'kmp-match-chip', `匹配 @ ${start}`));
      }
    } else {
      matchRow.appendChild(Lab.el('span', 'kmp-no-match', '尚未找到完整匹配'));
    }
    root.appendChild(matchRow);
    DOM.stage.replaceChildren(root);

    const atEnd = screen.index >= screen.steps.length - 1;
    renderMetrics(
      [
        ['文本位置', isSearch ? `${currentText} / ${text.length - 1}` : '—'],
        ['模式位置', currentPattern === null ? '—' : `${currentPattern} / ${pattern.length - 1}`],
        ['已找到', `${matches.length} 处`],
        ['最终匹配', atEnd ? (screen.solution.matches.length === 0 ? '无' : screen.solution.matches.join(', ')) : '—'],
      ],
      step.message
    );
    DOM.phase.textContent = isSearch ? (step.phase === 'match' ? '完整匹配' : step.phase === 'fallback' ? '失配回退' : '比较') : '构造前缀';
  }

  // ---------- hull rendering ----------

  function renderHull(screen, step) {
    const points = screen.input.points;
    const atEnd = screen.index >= screen.steps.length - 1;
    const stack = step.stack || [];
    const stackSet = new Set(stack.map((point) => `${point.x.toFixed(3)}:${point.y.toFixed(3)}`));
    const maxCoord = Math.max(100, screen.params.spread, ...points.map((point) => Math.max(point.x, point.y)));
    const mapX = (x) => 32 + (x / maxCoord) * 736;
    const mapY = (y) => 428 - (y / maxCoord) * 392;
    const active = step.point || null;

    const root = Lab.el('div', 'hull-stage');
    const canvas = Lab.el('div', 'hull-canvas');
    const svg = Lab.svgEl('svg', { viewBox: '0 0 800 460', role: 'img', 'aria-label': '点集与凸包扫描' });
    const gridGroup = Lab.svgEl('g');
    for (let index = 0; index <= 4; index += 1) {
      const x = 32 + (index / 4) * 736;
      const y = 36 + (index / 4) * 392;
      gridGroup.appendChild(Lab.svgEl('line', {
        x1: x, y1: 36, x2: x, y2: 428,
        stroke: 'rgba(183,220,207,0.055)', 'stroke-width': '1',
      }));
      gridGroup.appendChild(Lab.svgEl('line', {
        x1: 32, y1: y, x2: 768, y2: y,
        stroke: 'rgba(183,220,207,0.055)', 'stroke-width': '1',
      }));
    }
    const axisLabel = Lab.svgEl('text', { x: 32, y: 450, class: 'hull-axis-label' });
    axisLabel.textContent = `0 — ${maxCoord}`;
    gridGroup.appendChild(axisLabel);
    svg.appendChild(gridGroup);

    const hullPoints = atEnd && step.hull ? step.hull : stack;
    if (hullPoints.length > 1) {
      const d = hullPoints
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`)
        .join(' ');
      const path = Lab.svgEl('path', {
        d: atEnd ? `${d} Z` : d,
        class: 'hull-edge',
      });
      svg.appendChild(path);
    }

    points.forEach((point, index) => {
      const group = Lab.svgEl('g');
      const circle = Lab.svgEl('circle', {
        cx: mapX(point.x).toFixed(2),
        cy: mapY(point.y).toFixed(2),
        r: active && active.x === point.x && active.y === point.y ? 6.5 : 4.4,
        class: `hull-point${stackSet.has(`${point.x.toFixed(3)}:${point.y.toFixed(3)}`) ? ' is-stack' : ''}${active && active.x === point.x && active.y === point.y ? ' is-active' : ''}`,
      });
      const title = Lab.svgEl('title');
      title.textContent = `#${index} (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`;
      group.appendChild(circle);
      if (active && active.x === point.x && active.y === point.y) {
        group.appendChild(Lab.svgEl('circle', {
          cx: mapX(point.x).toFixed(2),
          cy: mapY(point.y).toFixed(2),
          r: 11,
          fill: 'none',
          stroke: '#bf5b3b',
          'stroke-width': '1.4',
          opacity: '0.9',
        }));
      }
      group.appendChild(title);
      svg.appendChild(group);
    });
    canvas.appendChild(svg);
    root.appendChild(canvas);

    const legend = Lab.el('div', 'hull-legend');
    for (const [className, text] of [['', '候选点'], ['is-stack', '当前链'], ['is-active', '当前点']]) {
      const item = Lab.el('span');
      item.append(Lab.el('i', className), document.createTextNode(text));
      legend.appendChild(item);
    }
    root.appendChild(legend);
    DOM.stage.replaceChildren(root);

    renderMetrics(
      [
        ['候选点', String(points.length)],
        ['当前栈', String(stack.length)],
        ['凸包顶点', atEnd ? String(screen.solution.hull.length) : '—'],
        ['当前点', step.point ? `#${step.index}` : '—'],
      ],
      step.message
    );
    DOM.phase.textContent = step.kind || '扫描';
  }

  // ---------- PageRank rendering ----------

  function renderPagerank(screen, step) {
    const { nodes, edges } = screen.input;
    const scores = step.scores;
    const atEnd = screen.index >= screen.steps.length - 1;
    const counts = new Map(nodes.map((id) => [id, 0]));
    for (const edge of edges) counts.set(edge.from, (counts.get(edge.from) || 0) + 1);
    const maxScore = Math.max(1e-9, ...nodes.map((id) => scores[id] || 0));
    const sorted = nodes
      .map((id) => ({ id, score: scores[id] || 0 }))
      .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
    const topId = sorted[0]?.id;

    const root = Lab.el('div', 'pr-stage');
    const graphWrap = Lab.el('div', 'pr-graph-wrap');
    const svg = Lab.svgEl('svg', { viewBox: '0 0 520 390', role: 'img', 'aria-label': 'PageRank 有向图' });
    const defs = Lab.svgEl('defs');
    const marker = Lab.svgEl('marker', {
      id: 'prArrow', viewBox: '0 0 10 10', refX: '9', refY: '5',
      markerWidth: '5', markerHeight: '5', orient: 'auto-start-reverse',
    });
    marker.appendChild(Lab.svgEl('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'pr-edge-arrow' }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    const positions = new Map();
    const n = nodes.length;
    const radius = 132;
    nodes.forEach((id, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / n;
      positions.set(id, {
        x: 260 + Math.cos(angle) * radius,
        y: 193 + Math.sin(angle) * radius,
        angle,
      });
    });
    const reverseSet = new Set(edges.map((edge) => `${edge.from}->${edge.to}`));
    edges.forEach((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) return;
      const offset = reverseSet.has(`${edge.to}->${edge.from}`) ? 7 : 0;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length;
      const ny = dx / length;
      const startX = from.x + (dx / length) * 13;
      const startY = from.y + (dy / length) * 13;
      const endX = to.x - (dx / length) * 14;
      const endY = to.y - (dy / length) * 14;
      const path = offset === 0
        ? `M ${startX} ${startY} L ${endX} ${endY}`
        : `M ${startX} ${startY} Q ${(startX + endX) / 2 + nx * offset} ${(startY + endY) / 2 + ny * offset} ${endX} ${endY}`;
      svg.appendChild(Lab.svgEl('path', {
        d: path,
        class: 'pr-edge',
        'marker-end': 'url(#prArrow)',
      }));
    });
    sorted.forEach(({ id, score }) => {
      const position = positions.get(id);
      const nodeRadius = 8 + (score / maxScore) * 9;
      const group = Lab.svgEl('g', {
        class: `pr-node${id === topId ? ' is-top' : ''}`,
      });
      group.appendChild(Lab.svgEl('circle', {
        cx: position.x.toFixed(2),
        cy: position.y.toFixed(2),
        r: nodeRadius.toFixed(2),
      }));
      const label = Lab.svgEl('text', {
        x: position.x.toFixed(2),
        y: position.y.toFixed(2),
      });
      label.textContent = id;
      group.appendChild(label);
      const title = Lab.svgEl('title');
      title.textContent = `${id} · ${(score * 100).toFixed(2)}% · 出度 ${counts.get(id) || 0}`;
      group.appendChild(title);
      svg.appendChild(group);
    });
    graphWrap.appendChild(svg);
    const caption = Lab.el('div', 'pr-graph-caption');
    caption.append(
      Lab.el('span', '', `${nodes.length} 节点 · ${edges.length} 有向边`),
      Lab.el('span', '', `d = ${screen.params.damping}`)
    );
    graphWrap.appendChild(caption);

    const rankPanel = Lab.el('div', 'pr-rank-panel');
    const rankHead = Lab.el('div', 'pr-rank-head');
    rankHead.append(
      Lab.el('span', '', atEnd ? 'FINAL RANK' : `ITERATION ${step.iteration}`),
      Lab.el('span', '', atEnd ? (screen.solution.converged ? 'CONVERGED' : 'MAX ITER') : 'SCORES')
    );
    rankPanel.appendChild(rankHead);
    const list = Lab.el('div', 'pr-rank-list');
    sorted.forEach(({ id, score }, index) => {
      const row = Lab.el('div', `pr-rank-row${id === topId ? ' is-top' : ''}`);
      const bar = Lab.el('div', 'pr-rank-bar');
      const fill = document.createElement('span');
      fill.style.setProperty('--rank-width', `${(score / maxScore) * 100}%`);
      fill.style.width = `${(score / maxScore) * 100}%`;
      bar.appendChild(fill);
      row.append(
        Lab.el('span', 'pr-rank-index', String(index + 1)),
        Lab.el('span', 'pr-rank-name', id),
        bar,
        Lab.el('span', 'pr-rank-score', `${(score * 100).toFixed(2)}%`)
      );
      list.appendChild(row);
    });
    rankPanel.appendChild(list);
    root.append(graphWrap, rankPanel);
    DOM.stage.replaceChildren(root);

    renderMetrics(
      [
        ['当前迭代', step.iteration === 0 ? '初始' : String(step.iteration)],
        ['变化 Δ', format(step.delta, 6)],
        ['最高节点', topId || '—'],
        ['收敛', atEnd ? (screen.solution.converged ? '是' : '未达到') : '—'],
      ],
      step.message
    );
    DOM.phase.textContent = step.phase;
  }

  // ---------- render / modes / player ----------

  function render() {
    const screen = currentScreen();
    const step = currentStep();
    if (!screen || !step) return;
    if (state.mode === 'lcs') renderLcs(screen, step);
    else if (state.mode === 'kmp') renderKmp(screen, step);
    else if (state.mode === 'hull') renderHull(screen, step);
    else if (state.mode === 'pagerank') renderPagerank(screen, step);

    DOM.stage.dataset.mode = state.mode;
    DOM.message.textContent = step.message;
    DOM.dataLabel.textContent = MODES[state.mode].dataLabel(screen);
    const line = step.line || (state.mode === 'pagerank' ? (step.iteration === 0 ? 2 : 12) : 1);
    activeRowAt(DOM.pseudoCode, line);

    const total = screen.steps.length;
    const progress = total <= 1 ? 100 : Math.round((screen.index / (total - 1)) * 100);
    DOM.progressFill.style.width = `${progress}%`;
    DOM.progressValue.textContent = `${progress}%`;
    DOM.progressTrack.setAttribute('aria-valuenow', String(progress));
    DOM.stepLabel.textContent = `步骤 ${screen.index} / ${Math.max(0, total - 1)}`;
    updateRunState();
    updateTransport();
  }

  function ensureScreen(mode) {
    if (!state.screens[mode]) {
      const config = MODES[mode];
      state.screens[mode] = generateScreen(mode, config.defaults());
    }
    return state.screens[mode];
  }

  function switchMode(mode, writeHash) {
    if (!MODES[mode] || mode === state.mode) return;
    if (state.player) state.player.pause();
    state.mode = mode;
    ensureScreen(mode);
    const screen = currentScreen();
    updateProfile();
    buildParamForm(screen.params);
    render();
    if (writeHash) Lab.writeMode(mode);
  }

  function generateNew(useRandomSeed) {
    const config = MODES[state.mode];
    if (useRandomSeed) {
      const seedInput = document.getElementById('advParam-seed');
      if (seedInput) seedInput.value = String(Lab.randomSeed());
    }
    const params = readParams();
    let screen;
    try {
      screen = generateScreen(state.mode, params);
    } catch (error) {
      DOM.message.textContent = `生成失败：${error.message}`;
      return;
    }
    if (state.player) state.player.pause();
    state.screens[state.mode] = screen;
    updateSeedAndSummary(screen);
    buildParamForm(screen.params);
    render();
  }

  function populateTabs() {
    DOM.tabs.replaceChildren();
    for (const algorithm of ALGORITHMS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lab-entry';
      button.dataset.algorithm = algorithm.id;
      button.setAttribute('aria-pressed', 'false');
      button.append(
        Lab.el('span', '', algorithm.name),
        Lab.el('small', '', algorithm.level)
      );
      button.addEventListener('click', () => switchMode(algorithm.id, true));
      DOM.tabs.appendChild(button);
    }
  }

  function setupPlayer() {
    state.player = Lab.createTimelinePlayer({
      getTotal: () => (currentScreen() ? currentScreen().steps.length : 0),
      getIndex: () => (currentScreen() ? currentScreen().index : 0),
      setIndex: (index) => {
        const screen = currentScreen();
        if (screen) screen.index = index;
      },
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
      const screen = currentScreen();
      if (screen && screen.index >= screen.steps.length - 1) state.player.reset();
      state.player.step();
    });
    DOM.resetBtn.addEventListener('click', () => state.player.reset());
    DOM.speed.addEventListener('input', () => {
      state.speed = Number(DOM.speed.value);
      DOM.speedValue.textContent = `${state.speed.toFixed(1).replace('.0', '')}×`;
      Lab.updateRangeFill(DOM.speed);
    });
    DOM.generateBtn.addEventListener('click', () => generateNew(false));
    DOM.randomSeedBtn.addEventListener('click', () => generateNew(true));

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
      const next = Lab.readMode(Object.keys(MODES), state.mode);
      switchMode(next, false);
    });
  }

  function init() {
    populateTabs();
    state.mode = Lab.readMode(Object.keys(MODES), 'lcs');
    state.speed = Number(DOM.speed.value);
    DOM.speedValue.textContent = `${state.speed.toFixed(1).replace('.0', '')}×`;
    Lab.updateRangeFill(DOM.speed);
    ensureScreen(state.mode);
    updateProfile();
    buildParamForm(currentScreen().params);
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
