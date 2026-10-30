import fs from 'node:fs';
import path from 'node:path';

const port = Number(process.argv[2] || 9333);
const targetUrl = process.argv[3] || 'about:blank';
const screenshotPath = process.argv[4] || '';

const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = pages.find((entry) => entry.type === 'page');
if (!page) throw new Error('No inspectable page found.');

const socket = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const logs = [];
let nextId = 1;

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
    else waiter.resolve(message.result);
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') {
    logs.push({
      type: 'exception',
      text: message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text,
    });
  }
  if (message.method === 'Runtime.consoleAPICalled') {
    logs.push({
      type: `console.${message.params.type}`,
      text: message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '),
    });
  }
  if (message.method === 'Log.entryAdded') {
    logs.push({ type: `log.${message.params.entry.level}`, text: message.params.entry.text });
  }
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: Number(process.env.VIEW_WIDTH || 1440),
  height: Number(process.env.VIEW_HEIGHT || 1100),
  deviceScaleFactor: 1,
  mobile: Boolean(process.env.VIEW_MOBILE === '1'),
});
await send('Page.navigate', { url: targetUrl });
await new Promise((resolve) => setTimeout(resolve, 1800));

if (process.env.ALGORITHM) {
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.algorithm-tab[data-algorithm=${JSON.stringify(process.env.ALGORITHM)}]')?.click()`,
  });
  await new Promise((resolve) => setTimeout(resolve, 450));
}

const shuffles = Number(process.env.SHUFFLE_CLICKS || 0);
if (shuffles > 0) {
  await send('Runtime.evaluate', {
    expression: `for (let i = 0; i < ${shuffles}; i += 1) document.querySelector('#shuffleBtn').click();`,
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
}

const steps = Number(process.env.STEP_CLICKS || 0);
if (steps > 0) {
  await send('Runtime.evaluate', {
    expression: `for (let i = 0; i < ${steps}; i += 1) document.querySelector('#stepBtn').click();`,
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
}

if (process.env.CHANGE_SOURCE) {
  await send('Runtime.evaluate', {
    expression: `(() => {
      const select = document.querySelector('#startSelect');
      select.value = ${JSON.stringify(process.env.CHANGE_SOURCE)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`,
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
}

if (process.env.DRAG === '1') {
  const pointResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const rect = document.querySelector('.node[data-id="A"]').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`,
    returnByValue: true,
  });
  const { x, y } = pointResult.result.value;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 58, y: y - 34, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 58, y: y - 34, button: 'left', clickCount: 1 });
  await new Promise((resolve) => setTimeout(resolve, 300));
}

let pauseCheck = null;
if (process.env.FINAL_ALGORITHM) {
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.algorithm-tab[data-algorithm=${JSON.stringify(process.env.FINAL_ALGORITHM)}]')?.click()`,
  });
  await new Promise((resolve) => setTimeout(resolve, 450));
}

if (process.env.CUSTOM_JS) {
  await send('Runtime.evaluate', { expression: process.env.CUSTOM_JS });
  await new Promise((resolve) => setTimeout(resolve, Number(process.env.CUSTOM_WAIT_MS || 350)));
}

if (process.env.PLAY === '1' && process.env.PLAY_PAUSE === '1') {
  await send('Runtime.evaluate', {
    expression: `(() => {
      const speed = document.querySelector('#speedRange');
      speed.value = '3';
      speed.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#playBtn').click();
    })()`,
  });
  await new Promise((resolve) => setTimeout(resolve, 800));
  await send('Runtime.evaluate', { expression: `document.querySelector('#playBtn').click()` });
  const pausedAt = await send('Runtime.evaluate', {
    expression: `document.querySelector('#stepPill').innerText`,
    returnByValue: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const stillAt = await send('Runtime.evaluate', {
    expression: `document.querySelector('#stepPill').innerText`,
    returnByValue: true,
  });
  pauseCheck = { pausedAt: pausedAt.result.value, stillAt: stillAt.result.value };
  await send('Runtime.evaluate', { expression: `document.querySelector('#playBtn').click()` });
  await new Promise((resolve) => setTimeout(resolve, Number(process.env.PLAY_WAIT_MS || 10000)));
} else if (process.env.PLAY === '1') {
  await send('Runtime.evaluate', {
    expression: `(() => {
      const speed = document.querySelector('#speedRange');
      speed.value = '3';
      speed.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#playBtn').click();
    })()`,
  });
  await new Promise((resolve) => setTimeout(resolve, Number(process.env.PLAY_WAIT_MS || 10000)));
}

const evaluation = await send('Runtime.evaluate', {
  expression: `(() => ({
    title: document.title,
    ready: document.readyState,
    nodeCount: document.querySelectorAll('#nodeLayer .node').length,
    edgeCount: document.querySelectorAll('#edgeLayer .edge').length,
    queueText: document.querySelector('#queueList')?.innerText,
    status: document.querySelector('#statusMessage')?.innerText,
    detail: document.querySelector('#statusDetail')?.innerText,
    step: document.querySelector('#stepPill')?.innerText,
    playLabel: document.querySelector('#playLabel')?.innerText,
    path: document.querySelector('#pathChain')?.innerText,
    resultLabel: document.querySelector('#resultLabel')?.innerText,
    resultCost: document.querySelector('#resultCost')?.innerText,
    phase: document.querySelector('#stagePhase')?.innerText,
    activeAlgorithm: document.querySelector('.algorithm-tab.is-active')?.dataset.algorithm,
    startValue: document.querySelector('#startSelect')?.value,
    endValue: document.querySelector('#endSelect')?.value,
    heading: document.querySelector('#pageTitle')?.innerText,
    queueTitle: document.querySelector('#queueTitle')?.innerText,
    queueEyebrow: document.querySelector('#queueEyebrow')?.innerText,
    metricLabels: Array.from(document.querySelectorAll('.metrics-row .metric > span')).map((el) => el.innerText),
    targetHidden: document.querySelector('#targetField')?.hidden,
    routeArrowHidden: document.querySelector('#routeArrow')?.hasAttribute('hidden'),
    routeEndHidden: document.querySelector('#routeEndPoint')?.hasAttribute('hidden'),
    visibleCode: document.querySelector('.code-block:not([hidden])')?.dataset.algorithm,
    pageTitle: document.title,
    sortAlgorithm: document.querySelector('.lab-entry.is-active')?.dataset.algorithm,
    sortStep: document.querySelector('#sortStepLabel')?.innerText,
    sortBars: document.querySelectorAll('#sortBars .sort-bar').length,
    sortComparisons: document.querySelector('#sortComparisons')?.innerText,
    sortSwaps: document.querySelector('#sortSwaps')?.innerText,
    sortSorted: document.querySelector('#sortSortedCount')?.innerText,
    sortMessage: document.querySelector('#sortCurrentMessage')?.innerText,
    sortDataLabel: document.querySelector('#sortDataSetLabel')?.innerText,
    sortSeedBadge: document.querySelector('#sortSeedBadge')?.innerText,
    sortPlayLabel: document.querySelector('#sortPlayLabel')?.innerText,
    sortProgress: document.querySelector('#sortProgressValue')?.innerText,
    scheduleAlgorithm: document.querySelector('#scheduleAlgorithmLabel')?.innerText,
    scheduleMakespan: document.querySelector('#scheduleMakespan')?.innerText,
    scheduleAvgWait: document.querySelector('#scheduleAvgWait')?.innerText,
    scheduleRunState: document.querySelector('#scheduleRunState')?.innerText,
    ganttBlockTexts: Array.from(document.querySelectorAll('.gantt-block')).map((node) => node.innerText),
    ganttRowLabels: Array.from(document.querySelectorAll('.gantt-row-label')).map((node) => node.innerText),
    jobCardCount: document.querySelectorAll('.job-card').length,
    comparisonRows: document.querySelectorAll('#comparisonRows tr').length,
    comparisonCurrent: document.querySelector('#comparisonRows tr.is-current td')?.innerText,
    advActive: document.querySelector('#advTabs .lab-entry.is-active')?.dataset.algorithm,
    advStageTitle: document.querySelector('#advStageTitle')?.innerText,
    advMessage: document.querySelector('#advMessage')?.innerText,
    advStep: document.querySelector('#advStepLabel')?.innerText,
    advDataLabel: document.querySelector('#advDataLabel')?.innerText,
    advPlayLabel: document.querySelector('#advPlayLabel')?.innerText,
    advCodeLine: document.querySelector('#advPseudoCode .lab-code-line.is-active .line-no')?.innerText,
    advMetrics: Array.from(document.querySelectorAll('#advMetrics .adv-metric')).map((node) => node.innerText),
    lcsCells: document.querySelectorAll('.lcs-table td').length,
    lcsResult: document.querySelector('.lcs-result-bar')?.innerText,
    kmpTextCells: document.querySelectorAll('.kmp-text-row .kmp-char').length,
    kmpMatches: Array.from(document.querySelectorAll('.kmp-match-chip')).map((node) => node.innerText),
    hullPoints: document.querySelectorAll('.hull-point').length,
    prNodes: document.querySelectorAll('.pr-node').length,
    advCodeDisplay: document.querySelector('.adv-code-body') ? getComputedStyle(document.querySelector('.adv-code-body')).display : null,
    advCodeCols: document.querySelector('.adv-code-body') ? getComputedStyle(document.querySelector('.adv-code-body')).gridTemplateColumns : null,
    advCodeWidth: document.querySelector('.adv-code-body') ? Math.round(document.querySelector('.adv-code-body').getBoundingClientRect().width) : null,
    advAsideWidth: document.querySelector('.adv-code-aside') ? Math.round(document.querySelector('.adv-code-aside').getBoundingClientRect().width) : null,
    advAsideTop: document.querySelector('.adv-code-aside') ? Math.round(document.querySelector('.adv-code-aside').getBoundingClientRect().top) : null,
    advCodeTop: document.querySelector('.adv-code-block, .lab-code-block') ? Math.round(document.querySelector('.adv-code-block, .lab-code-block').getBoundingClientRect().top) : null,
    structActive: document.querySelector('#structTabs .lab-entry.is-active')?.dataset.algorithm,
    structStageTitle: document.querySelector('#structStageTitle')?.innerText,
    structMessage: document.querySelector('#structMessage')?.innerText,
    structDataLabel: document.querySelector('#structDataLabel')?.innerText,
    structMetrics: Array.from(document.querySelectorAll('#structMetrics .struct-metric')).map((node) => node.innerText),
    structInvariant: document.querySelector('#structInvariantStatusText')?.innerText,
    structRunState: document.querySelector('#structRunState')?.innerText,
    structTreeNodes: document.querySelectorAll('.tree-node').length,
    structHeapNodes: document.querySelectorAll('.heap-node').length,
    structUfNodes: document.querySelectorAll('.uf-node').length,
    structCodeLine: Array.from(document.querySelectorAll('#structPseudoCode .lab-code-line.is-active .line-no')).map((node) => node.innerText),
    atlasResult: document.querySelector('#atlasResultCount')?.innerText,
    atlasCards: document.querySelectorAll('.atlas-card').length,
    atlasSections: document.querySelectorAll('.atlas-category').length,
    atlasResearch: document.querySelectorAll('.research-card').length,
    countingCells: document.querySelectorAll('.sort-count-cell').length,
    countingVisible: document.querySelector('#sortCounts') ? !document.querySelector('#sortCounts').hidden : null,
    flowTotal: document.querySelector('#flowTotal')?.innerText,
    flowIteration: document.querySelector('#flowIteration')?.innerText,
    flowCut: document.querySelector('#flowCut')?.innerText,
    flowMessage: document.querySelector('#flowMessage')?.innerText,
    flowNodes: document.querySelectorAll('.flow-node').length,
    flowEdgesCount: document.querySelectorAll('.flow-edge').length,
    researchSections: document.querySelectorAll('.research-topic').length,
    researchToc: document.querySelectorAll('.research-toc a').length,
    visualCards: document.querySelectorAll('.vcard').length,
    visualDomains: document.querySelectorAll('.domain-filter').length,
    visualResult: document.querySelector('#visualResultLabel')?.innerText,
    visualModalOpen: document.querySelector('#visualModal') ? !document.querySelector('#visualModal').hidden : null,
    visualModalTitle: document.querySelector('#vmTitle')?.innerText,
    abCards: document.querySelectorAll('.ab-card').length,
    abLab: document.querySelector('.ab-lab-title h1')?.innerText,
    abStep: document.querySelector('#abStepLabel')?.innerText,
    abParams: document.querySelectorAll('[data-param]').length,
    abMetrics: document.querySelectorAll('.ab-metric').length,
    abStage: document.querySelector('#abStage')?.className,
    visualActive: document.querySelectorAll('.vcard [data-vz].vz-active').length,
    visualSeen: document.querySelectorAll('.vcard [data-vz].vz-seen').length,
    visualPlayLabel: document.querySelector('#vmPlay')?.innerText,
    visualAnimLabel: document.querySelector('#vmAnimLabel')?.innerText,
    probe: ['.app-shell','.lab-main','.lab-layout','.lab-primary','.adv-stage-wrap','.adv-stage','.lcs-stage','.lcs-table-wrap','.lcs-table','.lab-entries','.lab-panel'].map((selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [selector, Math.round(r.left), Math.round(r.right), Math.round(r.width), el.scrollWidth];
    }),
    progress: document.querySelector('#progressValue')?.innerText,
    bodyHeight: document.body.scrollHeight,
    currentNodes: Array.from(document.querySelectorAll('#nodeLayer .node.is-current')).map((n) => n.dataset.id),
    frontierNodes: Array.from(document.querySelectorAll('#nodeLayer .node.is-frontier')).map((n) => n.dataset.id),
    pathNodes: Array.from(document.querySelectorAll('#nodeLayer .node.is-path')).map((n) => n.dataset.id),
    distanceLabels: Array.from(document.querySelectorAll('#nodeLayer .node.has-distance')).map((n) => n.querySelector('.node-dist text')?.textContent),
    nodeATransform: document.querySelector('.node[data-id="A"]')?.getAttribute('transform'),
    draggingNow: Boolean(document.querySelector('.node.is-dragging')),
    bodyWidth: document.body.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    viewport: [innerWidth, innerHeight],
    overflowing: Array.from(document.querySelectorAll('body *'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className : el.className.baseVal,
          id: el.id,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width)
        };
      })
      .filter((item) => item.right > ${Number(process.env.VIEW_WIDTH || 1440)} + 1 || item.left < -1)
      .slice(0, 20),
    sizes: (() => {
      const pick = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return [Math.round(r.width), Math.round(r.height)];
      };
      return {
        stage: pick('.graph-stage'),
        canvas: pick('.graph-canvas'),
        svg: pick('#graphSvg'),
        panel: pick('.graph-panel'),
        code: pick('.code-panel'),
        sidebar: pick('.side-column'),
        codeScroll: (() => {
          const el = document.querySelector('.code-block:not([hidden])');
          return el ? [el.clientWidth, el.scrollWidth] : null;
        })()
      };
    })(),
    targetDistanceFill: (() => {
      const text = document.querySelector('.node[data-id="H"] .node-dist text');
      return text ? getComputedStyle(text).fill : null;
    })(),
    settledMetric: document.querySelector('#settledCount')?.innerText,
    hasDijkstra: typeof window.Dijkstra,
    hasPresets: Array.isArray(window.GRAPH_PRESETS)
  }))()`,
  returnByValue: true,
});

console.log(JSON.stringify({ logs, pauseCheck, page: evaluation.result.value }, null, 2));

if (screenshotPath) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  fs.writeFileSync(screenshotPath, Buffer.from(shot.data, 'base64'));
  console.log(`Screenshot written: ${screenshotPath}`);
}

socket.close();
