(function () {
  'use strict';

  const engine = window.SchedulingEngine;
  const Lab = window.LabCore;
  if (!engine || !Lab) throw new Error('调度引擎或公共组件未加载。');

  const DOM = {
    tabs: Lab.$('#scheduleTabs'),
    levelBadge: Lab.$('#scheduleLevelBadge'),
    algorithmLabel: Lab.$('#scheduleAlgorithmLabel'),
    message: Lab.$('#scheduleMessage'),
    timeRange: Lab.$('#scheduleTimeRange'),
    ticks: Lab.$('#ganttTicks'),
    rows: Lab.$('#ganttRows'),
    chart: Lab.$('#ganttChart'),
    empty: Lab.$('#ganttEmpty'),
    legend: Lab.$('#ganttLegend'),
    footnote: Lab.$('#scheduleFootnote'),
    runState: Lab.$('#scheduleRunState'),
    jobCountBadge: Lab.$('#jobCountBadge'),
    jobGrid: Lab.$('#jobGrid'),
    comparisonRows: Lab.$('#comparisonRows'),
    seedBadge: Lab.$('#scheduleSeedBadge'),
    count: Lab.$('#scheduleCount'),
    countValue: Lab.$('#scheduleCountValue'),
    arrival: Lab.$('#scheduleArrival'),
    arrivalValue: Lab.$('#scheduleArrivalValue'),
    burstMin: Lab.$('#scheduleBurstMin'),
    burstMax: Lab.$('#scheduleBurstMax'),
    slackMin: Lab.$('#scheduleSlackMin'),
    slackMax: Lab.$('#scheduleSlackMax'),
    priorities: Lab.$('#schedulePriorities'),
    seed: Lab.$('#scheduleSeed'),
    quantum: Lab.$('#scheduleQuantum'),
    machines: Lab.$('#scheduleMachines'),
    generateBtn: Lab.$('#scheduleGenerateBtn'),
    randomSeedBtn: Lab.$('#scheduleRandomSeedBtn'),
    dataSummary: Lab.$('#scheduleDataSummary'),
    avgWait: Lab.$('#scheduleAvgWait'),
    avgTurn: Lab.$('#scheduleAvgTurn'),
    maxLateness: Lab.$('#scheduleMaxLateness'),
    makespan: Lab.$('#scheduleMakespan'),
    utilization: Lab.$('#scheduleUtilization'),
    totalBurst: Lab.$('#scheduleTotalBurst'),
    metricNote: Lab.$('#scheduleMetricNote'),
    profileLevel: Lab.$('#scheduleProfileLevel'),
    description: Lab.$('#scheduleDescription'),
    time: Lab.$('#scheduleTime'),
    space: Lab.$('#scheduleSpace'),
    profileTags: Lab.$('#scheduleProfileTags'),
    ruleTitle: Lab.$('#scheduleRuleTitle'),
    ruleBadge: Lab.$('#scheduleRuleBadge'),
    ruleCode: Lab.$('#scheduleRuleCode'),
    ruleNote: Lab.$('#scheduleRuleNote'),
  };

  const ALGORITHMS = engine.ALGORITHMS;
  const byId = new Map(ALGORITHMS.map((algorithm) => [algorithm.id, algorithm]));
  const COLORS = [
    { color: '#d9a57e', ink: '#3b2416' },
    { color: '#b9c79f', ink: '#2f3a24' },
    { color: '#e0c486', ink: '#3d3017' },
    { color: '#cba5a0', ink: '#3c2220' },
    { color: '#aebfc2', ink: '#233034' },
    { color: '#d6b7a2', ink: '#3b281d' },
    { color: '#c4b3d2', ink: '#302641' },
    { color: '#c8c0af', ink: '#343027' },
    { color: '#e2b086', ink: '#3c2516' },
    { color: '#afbfa5', ink: '#283223' },
    { color: '#d4b0c2', ink: '#38232e' },
    { color: '#b9c5b7', ink: '#293128' },
  ];

  const RULES = {
    fcfs: {
      tags: ['非抢占', '单机', '到达序'],
      code: [
        'while 有未完成作业:',
        '  若 CPU 空闲: 时间跳到下一个到达时刻',
        '  job ← 就绪集中到达时间最早者',
        '  非抢占运行 job，直到完成',
        '返回每个作业的开始与完成时间',
      ],
      note: '简单、公平、无需预测执行时间，但长作业在前时会产生护航效应。',
    },
    sjf: {
      tags: ['非抢占', '贪心', '最小平均等待'],
      code: [
        'while 有未完成作业:',
        '  将当前时刻已到达的作业加入就绪集',
        '  job ← burst 最小的就绪作业',
        '  非抢占运行 job，直到完成',
        '返回每个作业的开始与完成时间',
      ],
      note: '在非抢占单机上最小化平均等待时间；需要预知执行时间，长作业可能饥饿。',
    },
    priority: {
      tags: ['非抢占', '优先级', '饥饿风险'],
      code: [
        'while 有未完成作业:',
        '  将当前时刻已到达的作业加入就绪集',
        '  job ← priority 数字最小的就绪作业',
        '  非抢占运行 job，直到完成',
        '返回每个作业的开始与完成时间',
      ],
      note: '数字越小优先级越高；严格优先级可能让低优先级作业长期得不到 CPU。',
    },
    rr: {
      tags: ['抢占', '时间片', '响应时间'],
      code: [
        'time ← 0; queue ← 按到达顺序入队',
        'while queue 非空:',
        '  job ← queue 队首',
        '  运行 min(quantum, 剩余执行时间)',
        '  期间到达的作业加入队尾',
        '  若 job 未完成，加入队尾',
        '返回每个作业的所有时间片与完成时间',
      ],
      note: '时间片越大越接近 FCFS；越小响应越平滑，但切换与平均等待会增加。',
    },
    edf: {
      tags: ['抢占', '实时系统', '截止期'],
      code: [
        'for 每个整数时刻 t:',
        '  将 t 时刻到达的作业加入就绪集',
        '  job ← deadline 最小的就绪作业',
        '  在 t 到 t+1 运行 job 一个时间单位',
        '若所有截止期都满足，单机 EDF 最优',
      ],
      note: '可抢占单机上的 EDF 在可行时最优；超载时所有作业都可能错过截止期。',
    },
    lpt: {
      tags: ['多机', '近似算法', 'makespan'],
      code: [
        '假设所有作业在 t=0 可用',
        '按 burst 降序排序作业',
        'for 每个作业 job:',
        '  machine ← 当前负载最小的机器',
        '  把 job 放到 machine 上',
        '返回各机器排程与最大完工时间',
      ],
      note: 'P||Cmax 的 4/3 近似；作业在 0 时刻全部可用，等待时间与到达时刻不参与。',
    },
  };

  function colorFor(index) {
    return COLORS[index % COLORS.length];
  }

  function format(value, digits) {
    if (!Number.isFinite(value)) return '—';
    const fixed = value.toFixed(digits === undefined ? 2 : digits);
    return fixed.replace(/\.0+$|(\.\d*[1-9])0+$/, '$1');
  }

  function shortNumber(value) {
    return Number.isInteger(value) ? String(value) : format(value, 1);
  }

  const state = {
    algorithmId: 'fcfs',
    jobs: [],
    params: null,
    options: { quantum: 2, machines: 2 },
    schedule: null,
  };

  function readJobParams() {
    return {
      count: Number(DOM.count.value),
      arrivalSpread: Number(DOM.arrival.value),
      burstMin: Number(DOM.burstMin.value),
      burstMax: Number(DOM.burstMax.value),
      deadlineSlackMin: Number(DOM.slackMin.value),
      deadlineSlackMax: Number(DOM.slackMax.value),
      priorityLevels: Number(DOM.priorities.value),
      seed: Number(DOM.seed.value) || 2026,
    };
  }

  function readRuntimeOptions() {
    return {
      quantum: Number(DOM.quantum.value),
      machines: Number(DOM.machines.value),
    };
  }

  function updateParamLabels() {
    DOM.countValue.textContent = DOM.count.value;
    DOM.arrivalValue.textContent = DOM.arrival.value;
    Lab.updateRangeFill(DOM.count);
    Lab.updateRangeFill(DOM.arrival);
  }

  function updateDataSummary() {
    const params = state.params;
    if (!params) return;
    DOM.seedBadge.textContent = `seed ${params.seed}`;
    DOM.seed.value = String(params.seed);
    DOM.count.value = String(params.count);
    DOM.arrival.value = String(params.arrivalSpread);
    DOM.burstMin.value = String(params.burstMin);
    DOM.burstMax.value = String(params.burstMax);
    DOM.slackMin.value = String(params.deadlineSlackMin);
    DOM.slackMax.value = String(params.deadlineSlackMax);
    DOM.priorities.value = String(params.priorityLevels);
    updateParamLabels();
    DOM.dataSummary.replaceChildren(
      document.createTextNode(`${state.jobs.length} 个作业 · 到达 0–${params.arrivalSpread} · 执行 ${params.burstMin}–${params.burstMax}`),
      document.createElement('br'),
      document.createTextNode(`截止期松弛 ${params.deadlineSlackMin}–${params.deadlineSlackMax} · 优先级 1–${params.priorityLevels} · seed `),
      Lab.el('strong', '', String(params.seed)),
      document.createTextNode('。')
    );
  }

  function buildGanttRows(result) {
    const makespan = Math.max(1, result.metrics.makespan);
    const isMulti = result.algorithmId === 'lpt';
    const rowCount = isMulti ? result.machines || 1 : 1;
    const rows = Array.from({ length: rowCount }, (_, index) => ({
      label: isMulti ? `M${index + 1}` : 'CPU',
      segments: [],
    }));

    for (const segment of result.segments) {
      const row = isMulti ? segment.machine || 0 : 0;
      if (rows[row]) rows[row].segments.push(segment);
    }

    DOM.ticks.replaceChildren();
    const tickCount = Math.min(10, Math.max(2, Math.ceil(makespan)));
    const rawStep = makespan / tickCount;
    const exponent = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const fraction = rawStep / exponent;
    const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
    const tickStep = Math.max(1, nice * exponent);
    const ticks = [];
    for (let time = 0; time <= makespan; time += tickStep) ticks.push(time);
    if (ticks[ticks.length - 1] !== makespan) ticks.push(makespan);
    ticks.forEach((time, index) => {
      const tick = Lab.el('span', 'gantt-tick', String(time));
      tick.style.left = `${(time / makespan) * 100}%`;
      if (index === 0) tick.classList.add('is-first');
      if (index === ticks.length - 1) tick.classList.add('is-last');
      DOM.ticks.appendChild(tick);
    });

    DOM.rows.replaceChildren();
    const jobIndex = new Map(state.jobs.map((job, index) => [job.id, index]));
    let blockIndex = 0;
    rows.forEach((rowData) => {
      const row = Lab.el('div', 'gantt-row');
      const label = Lab.el('span', 'gantt-row-label', rowData.label);
      const track = Lab.el('div', 'gantt-track');
      for (const segment of rowData.segments) {
        const job = state.jobs[jobIndex.get(segment.jobId)];
        if (!job) continue;
        const palette = colorFor(jobIndex.get(job.id));
        const block = Lab.el('div', 'gantt-block');
        const left = (segment.start / makespan) * 100;
        const width = ((segment.end - segment.start) / makespan) * 100;
        block.style.left = `${left}%`;
        block.style.width = `${width}%`;
        block.style.setProperty('--job-color', palette.color);
        block.style.setProperty('--job-ink', palette.ink);
        block.style.setProperty('--block-delay', `${Math.min(blockIndex * 18, 440)}ms`);
        block.title = `${job.id} · ${segment.start}–${segment.end} · burst ${job.burst} · deadline ${job.deadline}`;
        block.append(document.createTextNode(job.id));
        if (width > 7) block.appendChild(Lab.el('small', '', String(segment.end - segment.start)));
        track.appendChild(block);
        blockIndex += 1;
      }
      row.append(label, track);
      DOM.rows.appendChild(row);
    });

    DOM.legend.replaceChildren();
    state.jobs.forEach((job, index) => {
      const palette = colorFor(index);
      const item = Lab.el('span', 'gantt-legend-item');
      const dot = Lab.el('span', 'gantt-legend-dot');
      dot.style.setProperty('--job-color', palette.color);
      item.append(dot, document.createTextNode(job.id));
      item.title = `到达 ${job.arrival} · 执行 ${job.burst} · 截止 ${job.deadline} · 优先级 ${job.priority}`;
      DOM.legend.appendChild(item);
    });

    DOM.timeRange.textContent = `0 → ${result.metrics.makespan} T`;
    DOM.chart.setAttribute(
      'aria-label',
      `${byId.get(result.algorithmId)?.name || result.algorithmId} 甘特图，完工时间 ${result.metrics.makespan}，${state.jobs.length} 个作业。`
    );
  }

  function renderMetrics(result) {
    DOM.avgWait.textContent = format(result.metrics.avgWaiting);
    DOM.avgTurn.textContent = format(result.metrics.avgTurnaround);
    DOM.maxLateness.textContent = format(result.metrics.maxLateness);
    DOM.makespan.textContent = String(result.metrics.makespan);
    DOM.utilization.textContent = `${format(result.metrics.utilization * 100, 1)}%`;
    DOM.totalBurst.textContent = String(result.metrics.totalBurst);
    const notes = [];
    if (result.algorithmId === 'lpt') {
      notes.push('LPT 将所有作业视为 0 时刻可用，等待从 0 计算；makespan 是最大机器负载。');
    }
    notes.push(`平均延迟 ${format(result.metrics.avgLateness)} T。`);
    DOM.metricNote.textContent = notes.join(' ');
    DOM.runState.dataset.kind = 'done';
    DOM.runState.textContent = 'SCHEDULED';
  }

  function renderJobGrid(result) {
    DOM.jobGrid.replaceChildren();
    DOM.jobCountBadge.textContent = `${state.jobs.length} 个作业`;
    state.jobs.forEach((job, index) => {
      const palette = colorFor(index);
      const info = result.perJob[job.id];
      const card = Lab.el('div', 'job-card');
      card.style.setProperty('--job-color', palette.color);
      const head = Lab.el('div', 'job-card-head');
      const title = Lab.el('span', 'job-card-title');
      title.append(Lab.el('i', 'job-dot'), document.createTextNode(job.id));
      head.append(title, Lab.el('span', 'job-card-status', info ? `完成 @ ${info.completion}` : '未排程'));
      const meta = Lab.el('div', 'job-card-meta');
      meta.innerHTML = '';
      const fields = [
        ['到达', job.arrival],
        ['执行', job.burst],
        ['截止', job.deadline],
        ['优先级', job.priority],
        ['等待', info ? format(info.waiting) : '—'],
        ['周转', info ? format(info.turnaround) : '—'],
      ];
      for (const [label, value] of fields) {
        const span = document.createElement('span');
        span.append(document.createTextNode(`${label} `), Lab.el('b', '', String(value)));
        meta.appendChild(span);
      }
      card.append(head, meta);
      DOM.jobGrid.appendChild(card);
    });
  }

  function renderComparison() {
    DOM.comparisonRows.replaceChildren();
    for (const algorithm of ALGORITHMS) {
      let result;
      try {
        result = engine.schedule(algorithm.id, state.jobs, state.options);
      } catch (error) {
        continue;
      }
      const row = document.createElement('tr');
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `切换到${algorithm.name}`);
      if (algorithm.id === state.algorithmId) row.classList.add('is-current');
      const name = document.createElement('td');
      name.append(document.createTextNode(algorithm.name));
      row.appendChild(name);
      row.appendChild(Lab.el('td', '', format(result.metrics.avgWaiting)));
      row.appendChild(Lab.el('td', '', format(result.metrics.avgTurnaround)));
      row.appendChild(Lab.el('td', '', format(result.metrics.maxLateness)));
      row.appendChild(Lab.el('td', '', String(result.metrics.makespan)));
      row.addEventListener('click', () => setAlgorithm(algorithm.id, true));
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setAlgorithm(algorithm.id, true);
        }
      });
      DOM.comparisonRows.appendChild(row);
    }
  }

  function renderProfile() {
    const meta = byId.get(state.algorithmId);
    const rule = RULES[state.algorithmId];
    if (!meta || !rule) return;
    Lab.setLevelBadge(DOM.levelBadge, meta.level);
    Lab.setLevelBadge(DOM.profileLevel, meta.level);
    DOM.algorithmLabel.textContent = meta.en;
    DOM.description.textContent = meta.description;
    DOM.time.textContent = meta.time;
    DOM.space.textContent = meta.space;
    DOM.ruleBadge.textContent = meta.en;
    DOM.ruleTitle.textContent = `${meta.name} · 调度规则`;
    DOM.ruleNote.textContent = rule.note;
    Lab.renderCode(DOM.ruleCode, rule.code, []);
    DOM.profileTags.replaceChildren();
    for (const tag of rule.tags) DOM.profileTags.appendChild(Lab.el('span', '', tag));
    for (const button of DOM.tabs.querySelectorAll('.lab-entry')) {
      const active = button.dataset.algorithm === meta.id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function render() {
    if (!state.schedule) return;
    const result = state.schedule;
    buildGanttRows(result);
    renderMetrics(result);
    renderJobGrid(result);
    renderComparison();
    renderProfile();
    DOM.message.textContent = `${byId.get(state.algorithmId).name} · ${state.jobs.length} 个作业 · ${result.metrics.makespan} T 完工`;
    DOM.empty.hidden = state.jobs.length > 0;
    DOM.footnote.textContent = state.algorithmId === 'lpt'
      ? '多机 LPT：所有作业在 0 时刻可用，以最小化 makespan 为目标。'
      : '参数改变后自动重新计算；作业完成情况见下方卡片。';
  }

  function recompute() {
    const options = readRuntimeOptions();
    state.options = options;
    try {
      state.schedule = engine.schedule(state.algorithmId, state.jobs, options);
    } catch (error) {
      DOM.message.textContent = `排程失败：${error.message}`;
      return;
    }
    render();
  }

  function setAlgorithm(algorithmId, writeHash) {
    if (!byId.has(algorithmId)) return;
    state.algorithmId = algorithmId;
    recompute();
    if (writeHash) Lab.writeMode(algorithmId);
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
      button.addEventListener('click', () => setAlgorithm(algorithm.id, true));
      DOM.tabs.appendChild(button);
    }
  }

  function generateJobs(useRandomSeed) {
    if (useRandomSeed) {
      DOM.seed.value = String(Lab.randomSeed());
    }
    const params = readJobParams();
    try {
      state.jobs = engine.generateJobs(params);
    } catch (error) {
      DOM.message.textContent = `参数无效：${error.message}`;
      return;
    }
    state.params = params;
    updateDataSummary();
    state.algorithmId = Lab.readMode(ALGORITHMS.map((algorithm) => algorithm.id), state.algorithmId);
    recompute();
  }

  function bindEvents() {
    DOM.count.addEventListener('input', updateParamLabels);
    DOM.arrival.addEventListener('input', updateParamLabels);
    DOM.generateBtn.addEventListener('click', () => generateJobs(false));
    DOM.randomSeedBtn.addEventListener('click', () => generateJobs(true));
    DOM.quantum.addEventListener('input', recompute);
    DOM.machines.addEventListener('input', recompute);
    window.addEventListener('hashchange', () => {
      const next = Lab.readMode(ALGORITHMS.map((algorithm) => algorithm.id), state.algorithmId);
      setAlgorithm(next, false);
    });
  }

  function init() {
    populateTabs();
    updateParamLabels();
    state.algorithmId = Lab.readMode(ALGORITHMS.map((algorithm) => algorithm.id), 'fcfs');
    state.options = readRuntimeOptions();
    state.jobs = engine.generateJobs(readJobParams());
    state.params = readJobParams();
    updateDataSummary();
    recompute();
    bindEvents();
  }

  init();
})();
