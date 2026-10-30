import { domains, domainCounts, domainEn, domainName, entries, entryById } from './catalog';
import { baseDefinition } from './engines';
import type { LabDefinition, LabEntry, LabFrame, LabParam } from './model';
import { defaultParams, paramsToRecord } from './params';
import { renderStage } from './stage';

const appRoot = document.querySelector<HTMLElement>('#app');
if (!appRoot) throw new Error('Atlas app mount is missing.');
const app: HTMLElement = appRoot;

let currentEntry: LabEntry | null = null;
let definition: LabDefinition | null = null;
let params: LabParam[] = [];
let runFrames: LabFrame[] = [];
let frameIndex = 0;
let playing = false;
let speed = 1;
let timer = 0;
let dirty = false;
let lastFocused: HTMLElement | null = null;
let catalogQuery = '';
let catalogDomain = 'all';
let catalogLevel = 'all';

function escape(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function levelClass(level: string): string {
  return level.toLowerCase();
}

function setStatus(text: string): void {
  const node = document.querySelector<HTMLElement>('#appStatus');
  if (node) node.textContent = text;
}

function updateTopbar(): void {
  const count = document.querySelector<HTMLElement>('#appStatus');
  if (!count) return;
  count.textContent = currentEntry ? `${entries.length} 实验 · 工作台` : `${entries.length} 实验 · 单页图谱`;
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

function homeTemplate(): string {
  return `<section class="ab-home">
    <header class="ab-hero">
      <div>
        <span class="ab-eyebrow">COMPUTER SCIENCE ATLAS · ONE WORKBENCH</span>
        <h1>把整个计算机专业<br>做成一座<br><em>可以动手的实验场</em>。</h1>
        <p class="ab-hero-copy">不是 122 张会动的图，而是 146 个真正可操作实验：选数据、改参数、生成轨迹、播放、单步、回退、查看指标与伪代码。排序实验室的交互标准，现在属于每一个条目。</p>
        <div class="ab-hero-actions">
          <button class="ab-btn ab-btn-primary" type="button" data-action="open-first">打开第一个实验 →</button>
          <button class="ab-btn" type="button" data-action="focus-catalog">浏览实验目录</button>
        </div>
        <dl class="ab-stats">
          <div><dt>可交互实验</dt><dd>${entries.length}</dd></div>
          <div><dt>覆盖领域</dt><dd>${domains.length}</dd></div>
          <div><dt>难度层级</dt><dd>4</dd></div>
          <div><dt>静态展板</dt><dd>0</dd></div>
        </dl>
      </div>
      <aside class="ab-standard">
        <span class="ab-eyebrow">LAB STANDARD</span>
        <h2>一个页面，一套实验规则</h2>
        <p>目录只是入口；所有操作发生在同一个工作台里，不再有第二个百科页面，也不再用高亮代替算法状态。</p>
        <ul>
          <li>参数生成器：相同种子可复现</li>
          <li>播放 / 单步 / 回退 / 重置 / 速度</li>
          <li>真实状态变化与领域指标</li>
          <li>伪代码、当前行、不变量</li>
          <li>深链与浏览器前进/后退</li>
        </ul>
      </aside>
    </header>

    <div class="ab-section-head" id="abCatalogAnchor">
      <div>
        <span class="ab-eyebrow">EXPERIMENT CATALOG</span>
        <h2>按领域 × 难度选择实验</h2>
      </div>
      <p>同一套工作台承载算法、系统、网络、AI 与理论实验。目录卡片本身不自动播放；打开后才进入可操作状态。</p>
    </div>

    <div class="ab-filterbar">
      <label class="ab-search">
        <span aria-hidden="true">⌕</span>
        <input id="abCatalogSearch" type="search" placeholder="搜索实验、英文名、标签…" autocomplete="off" aria-label="搜索实验">
      </label>
      <label for="abDomainFilter">领域</label>
      <select id="abDomainFilter" aria-label="按领域筛选">
        <option value="all">全部领域</option>
        ${domains.map((domain) => `<option value="${domain.id}">${escape(domain.title)}</option>`).join('')}
      </select>
      <label for="abLevelFilter">难度</label>
      <select id="abLevelFilter" aria-label="按难度筛选">
        <option value="all">全部难度</option>
        <option value="L1">L1 基础</option>
        <option value="L2">L2 进阶</option>
        <option value="L3">L3 高阶</option>
        <option value="L4">L4 研究</option>
      </select>
      <span class="ab-result" id="abCatalogCount"></span>
    </div>

    <div class="ab-domains" id="abCatalog"></div>
  </section>`;
}

function filteredEntries(): LabEntry[] {
  const query = catalogQuery.trim().toLowerCase();
  return entries.filter((entry) => {
    if (catalogDomain !== 'all' && entry.domain !== catalogDomain) return false;
    if (catalogLevel !== 'all' && entry.level !== catalogLevel) return false;
    if (!query) return true;
    return [entry.title, entry.en, entry.summary, entry.tags.join(' '), domainName(entry.domain)]
      .join(' ').toLowerCase().includes(query);
  });
}

function renderCatalog(): void {
  const list = filteredEntries();
  const count = document.querySelector<HTMLElement>('#abCatalogCount');
  if (count) count.textContent = `${list.length} / ${entries.length} 个实验`;
  const root = document.querySelector<HTMLElement>('#abCatalog');
  if (!root) return;
  if (!list.length) {
    root.innerHTML = '<div class="ab-empty">没有匹配的实验。换一个关键词，或清除筛选。</div>';
    return;
  }
  root.innerHTML = domains.map((domain) => {
    const domainEntries = list.filter((entry) => entry.domain === domain.id);
    if (!domainEntries.length) return '';
    return `<section class="ab-domain-block" data-domain="${domain.id}">
      <div class="ab-domain-head">
        <h3>${escape(domain.title)}</h3>
        <span>${escape(domain.en)}</span>
        <em>${domainEntries.length} 个实验</em>
      </div>
      <div class="ab-grid">
        ${domainEntries.map(cardTemplate).join('')}
      </div>
    </section>`;
  }).join('');
}

function cardTemplate(entry: LabEntry): string {
  return `<article class="ab-card" data-open="${escape(entry.id)}" tabindex="0" role="button" aria-label="${escape(entry.title)}，打开实验">
    <div class="ab-card-top">
      <span class="ab-card-level">${entry.level}</span>
      <span class="ab-card-kind">${entry.kind.toUpperCase()} LAB</span>
    </div>
    <h3>${escape(entry.title)}</h3>
    <div class="ab-card-en">${escape(entry.en)}</div>
    <p>${escape(entry.summary)}</p>
    <div class="ab-card-foot">
      ${entry.tags.slice(0, 2).map((tag) => `<span>${escape(tag)}</span>`).join('')}
      <strong>打开实验 →</strong>
    </div>
  </article>`;
}

function renderHome(): void {
  stopPlayback();
  currentEntry = null;
  definition = null;
  updateTopbar();
  app.innerHTML = homeTemplate();
  renderCatalog();
  setStatus(`${entries.length} 实验 · 单页图谱`);
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

/* ------------------------------------------------------------------ */
/* Rail                                                                */
/* ------------------------------------------------------------------ */

function railTemplate(): string {
  return `<aside class="ab-rail" aria-label="实验目录">
    <div class="ab-rail-head">
      <strong>实验目录</strong>
      <span>${entries.length} LABS · ONE WORKBENCH</span>
      <input class="ab-rail-search" id="abRailSearch" type="search" placeholder="筛选目录…" aria-label="筛选目录">
    </div>
    <div id="abRailList">
      ${domains.map((domain) => {
        const list = entries.filter((entry) => entry.domain === domain.id);
        if (!list.length) return '';
        return `<details class="ab-rail-domain" open>
          <summary><h4>${escape(domain.title)} <span>${list.length}</span></h4></summary>
          ${list.map((entry) => `<button class="ab-rail-entry ${entry.id === currentEntry?.id ? 'is-current' : ''}" type="button" data-open="${escape(entry.id)}">
            <span>${escape(entry.title)}</span><small>${entry.level}</small>
          </button>`).join('')}
        </details>`;
      }).join('')}
    </div>
  </aside>`;
}

function mobileRailTemplate(): string {
  return `<div class="ab-mobile-rail">
    <button class="ab-btn" type="button" data-action="back-home">← 图谱</button>
    <select id="abMobileSelect" aria-label="切换实验">
      ${domains.map((domain) => `<optgroup label="${escape(domain.title)}">
        ${entries.filter((entry) => entry.domain === domain.id).map((entry) => `<option value="${escape(entry.id)}" ${entry.id === currentEntry?.id ? 'selected' : ''}>${escape(entry.title)}</option>`).join('')}
      </optgroup>`).join('')}
    </select>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Workbench                                                           */
/* ------------------------------------------------------------------ */

function workbenchTemplate(entry: LabEntry): string {
  return `<div class="ab-workbench">
    ${railTemplate()}
    <main class="ab-workbench-main">
      ${mobileRailTemplate()}
      <header class="ab-lab-head">
        <button class="ab-back" type="button" data-action="back-home">← 图谱</button>
        <div class="ab-lab-title">
          <span class="ab-eyebrow">${escape(domainName(entry.domain))} / ${escape(domainEn(entry.domain))}</span>
          <h1>${escape(entry.title)}</h1>
          <p>${escape(entry.en)}</p>
          <div class="ab-lab-badges">
            <span class="ab-badge is-level">${entry.level}</span>
            <span class="ab-badge">${escape(definition?.complexity ?? '')}</span>
            ${entry.tags.slice(0, 4).map((tag) => `<span class="ab-badge">${escape(tag)}</span>`).join('')}
          </div>
        </div>
        <button class="ab-share" type="button" data-action="share">复制深链</button>
      </header>

      <section class="ab-panel">
        <div class="ab-panel-head">
          <h2>实验舞台</h2>
          <span id="abRunState">READY</span>
        </div>
        <div class="ab-stage-wrap" id="abStage"></div>
        <div class="ab-progress"><span id="abProgressFill"></span></div>
        <div class="ab-controls">
          <button class="ab-btn ab-btn-primary" id="abPlay" type="button" data-action="play">▶ 播放</button>
          <button class="ab-btn" type="button" data-action="prev">← 单步</button>
          <button class="ab-btn" type="button" data-action="step">单步 →</button>
          <button class="ab-btn" type="button" data-action="reset">重置</button>
          <span class="ab-step-label" id="abStepLabel">步骤 0 / 0</span>
          <span class="ab-speed">速度 <input id="abSpeed" type="range" min="0.5" max="4" step="0.5" value="1" aria-label="播放速度"> <strong id="abSpeedValue">1×</strong></span>
        </div>
        <div class="ab-narration" id="abNarration">准备生成第一条轨迹。</div>
      </section>

      <section class="ab-panel ab-code">
        <div class="ab-panel-head">
          <h2>伪代码与不变量</h2>
          <span>${escape(definition?.complexity ?? '')}</span>
        </div>
        <div class="ab-code-lines" id="abCode"></div>
        <div class="ab-invariant" id="abInvariant">${escape(definition?.invariant ?? '')}</div>
      </section>

      <section class="ab-panel">
        <div class="ab-panel-head">
          <h2>步骤日志</h2>
          <span>点击任意步骤跳转</span>
        </div>
        <div class="ab-log" id="abLog"></div>
      </section>
    </main>

    <aside class="ab-side">
      <section class="ab-panel">
        <div class="ab-panel-head">
          <h2>测试数据</h2>
          <span>GENERATOR</span>
        </div>
        <div class="ab-side-body">
          <p class="ab-dirty" id="abDirty" hidden>参数已修改，点击“生成新数据”后重建轨迹。</p>
          <div id="abParams"></div>
          <div class="ab-generate">
            <button class="ab-btn ab-btn-primary" type="button" data-action="generate">生成新数据</button>
            <button class="ab-btn" type="button" data-action="seed">换种子</button>
            <button class="ab-btn" type="button" data-action="defaults">恢复默认</button>
          </div>
        </div>
      </section>

      <section class="ab-panel">
        <div class="ab-panel-head">
          <h2>运行统计</h2>
          <span id="abMetricState">READY</span>
        </div>
        <div class="ab-side-body">
          <div class="ab-metrics" id="abMetrics"></div>
        </div>
      </section>

      <section class="ab-panel">
        <div class="ab-panel-head">
          <h2>实验档案</h2>
          <span>PROFILE</span>
        </div>
        <div class="ab-side-body">
          <p class="ab-field-hint">${escape(entry.mechanism)}</p>
          <p class="ab-field-hint" style="margin-top:10px">${escape(entry.observe)}</p>
          <div class="ab-generate" style="margin-top:12px">
            <button class="ab-btn" type="button" data-action="back-home">回到目录</button>
            <button class="ab-btn" type="button" data-action="share">复制深链</button>
          </div>
        </div>
      </section>
    </aside>
  </div>`;
}

function renderParams(): void {
  const root = document.querySelector<HTMLElement>('#abParams');
  if (!root) return;
  root.innerHTML = params.map((param) => {
    const id = `param-${param.id}`;
    if (param.type === 'range') {
      return `<div class="ab-field">
        <label for="${id}"><span>${escape(param.label)}</span><strong data-value="${escape(param.id)}">${escape(param.value)}</strong></label>
        <input id="${id}" data-param="${escape(param.id)}" type="range" min="${param.min ?? 0}" max="${param.max ?? 100}" step="${param.step ?? 1}" value="${param.value}">
        ${param.hint ? `<span class="ab-field-hint">${escape(param.hint)}</span>` : ''}
      </div>`;
    }
    if (param.type === 'select') {
      return `<div class="ab-field">
        <label for="${id}">${escape(param.label)}</label>
        <select id="${id}" data-param="${escape(param.id)}">
          ${(param.options ?? []).map((option) => `<option value="${escape(option.value)}" ${String(option.value) === String(param.value) ? 'selected' : ''}>${escape(option.label)}</option>`).join('')}
        </select>
        ${param.hint ? `<span class="ab-field-hint">${escape(param.hint)}</span>` : ''}
      </div>`;
    }
    return `<div class="ab-field">
      <label for="${id}">${escape(param.label)}</label>
      <input id="${id}" data-param="${escape(param.id)}" type="${param.type === 'text' ? 'text' : 'number'}" value="${escape(param.value)}" ${param.min !== undefined ? `min="${param.min}"` : ''} ${param.max !== undefined ? `max="${param.max}"` : ''} ${param.step !== undefined ? `step="${param.step}"` : ''}>
      ${param.hint ? `<span class="ab-field-hint">${escape(param.hint)}</span>` : ''}
    </div>`;
  }).join('');
}

function openLab(id: string, updateHistory = true): void {
  const entry = entryById.get(id);
  if (!entry) {
    renderHome();
    return;
  }
  stopPlayback();
  currentEntry = entry;
  definition = baseDefinition(entry);
  params = defaultParams(entry);
  runFrames = definition.run(paramsToRecord(params)).frames;
  frameIndex = 0;
  dirty = false;
  playing = false;
  lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  updateTopbar();
  setStatus(`${entry.title} · ${runFrames.length} 步`);
  app.innerHTML = workbenchTemplate(entry);
  bindWorkbench();
  renderParams();
  renderFrame();
  if (updateHistory && window.location.hash !== `#lab/${entry.id}`) {
    history.pushState({ lab: entry.id }, '', `#lab/${entry.id}`);
  }
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

function bindWorkbench(): void {
  const railSearch = document.querySelector<HTMLInputElement>('#abRailSearch');
  railSearch?.addEventListener('input', () => {
    const query = railSearch.value.trim().toLowerCase();
    for (const group of document.querySelectorAll<HTMLDetailsElement>('.ab-rail-domain')) {
      let shown = 0;
      for (const button of group.querySelectorAll<HTMLButtonElement>('.ab-rail-entry')) {
        const text = button.textContent?.toLowerCase() ?? '';
        const match = !query || text.includes(query);
        button.hidden = !match;
        if (match) shown += 1;
      }
      group.hidden = shown === 0;
    }
  });
  const mobile = document.querySelector<HTMLSelectElement>('#abMobileSelect');
  mobile?.addEventListener('change', () => openLab(mobile.value));
}

function stopPlayback(): void {
  if (timer) {
    window.clearInterval(timer);
    timer = 0;
  }
  playing = false;
  const button = document.querySelector<HTMLButtonElement>('#abPlay');
  if (button) button.textContent = '▶ 播放';
  const state = document.querySelector<HTMLElement>('#abRunState');
  if (state && runFrames.length) state.textContent = frameIndex >= runFrames.length - 1 ? 'DONE' : 'PAUSED';
  const metricState = document.querySelector<HTMLElement>('#abMetricState');
  if (metricState && runFrames.length) metricState.textContent = frameIndex >= runFrames.length - 1 ? 'DONE' : 'READY';
}

function startPlayback(): void {
  if (timer) window.clearInterval(timer);
  playing = true;
  const button = document.querySelector<HTMLButtonElement>('#abPlay');
  if (button) button.textContent = '❚❚ 暂停';
  const state = document.querySelector<HTMLElement>('#abRunState');
  if (state) state.textContent = 'PLAYING';
  const metricState = document.querySelector<HTMLElement>('#abMetricState');
  if (metricState) metricState.textContent = 'LIVE';
  if (frameIndex >= runFrames.length - 1) setFrame(0);
  timer = window.setInterval(() => {
    if (!playing) return;
    if (frameIndex >= runFrames.length - 1) {
      stopPlayback();
      return;
    }
    setFrame(frameIndex + 1);
  }, Math.max(120, 850 / speed));
}

function setFrame(index: number): void {
  frameIndex = Math.max(0, Math.min(runFrames.length - 1, index));
  renderFrame();
}

function renderFrame(): void {
  const frame = runFrames[frameIndex];
  if (!frame || !definition) return;
  const stage = document.querySelector<HTMLElement>('#abStage');
  if (stage) stage.innerHTML = renderStage(frame.stage);
  const narration = document.querySelector<HTMLElement>('#abNarration');
  if (narration) narration.textContent = frame.narration;
  const stepLabel = document.querySelector<HTMLElement>('#abStepLabel');
  if (stepLabel) stepLabel.textContent = `步骤 ${frameIndex + 1} / ${runFrames.length}`;
  const progress = document.querySelector<HTMLElement>('#abProgressFill');
  if (progress) progress.style.width = `${runFrames.length <= 1 ? 100 : (frameIndex / (runFrames.length - 1)) * 100}%`;
  const state = document.querySelector<HTMLElement>('#abRunState');
  if (state) state.textContent = frame.done ? 'DONE' : playing ? 'PLAYING' : 'PAUSED';
  const metricState = document.querySelector<HTMLElement>('#abMetricState');
  if (metricState) metricState.textContent = frame.done ? 'DONE' : playing ? 'LIVE' : 'READY';
  renderMetrics(frame);
  renderCode(frame);
  renderLog();
}

function renderMetrics(frame: LabFrame): void {
  const root = document.querySelector<HTMLElement>('#abMetrics');
  if (!root) return;
  root.innerHTML = Object.entries(frame.metrics).map(([label, value]) => `<div class="ab-metric">
    <span>${escape(label)}</span><strong>${escape(value)}</strong>
  </div>`).join('');
}

function renderCode(frame: LabFrame): void {
  const root = document.querySelector<HTMLElement>('#abCode');
  if (!root || !definition) return;
  root.innerHTML = definition.pseudocode.map((line, index) => `<div class="ab-code-line ${index === frame.codeLine ? 'is-active' : ''}">
    <span>${String(index + 1).padStart(2, '0')}</span><span>${escape(line)}</span>
  </div>`).join('');
  const active = root.querySelector('.is-active');
  active?.scrollIntoView({ block: 'nearest' });
}

function renderLog(): void {
  const root = document.querySelector<HTMLElement>('#abLog');
  if (!root) return;
  root.innerHTML = runFrames.map((frame, index) => `<button type="button" data-frame="${index}" class="${index === frameIndex ? 'is-current' : ''}">
    <span>${String(index + 1).padStart(2, '0')}</span>${escape(frame.narration)}
  </button>`).join('');
  const current = root.querySelector('.is-current');
  current?.scrollIntoView({ block: 'nearest' });
}

function setDirty(value: boolean): void {
  dirty = value;
  const node = document.querySelector<HTMLElement>('#abDirty');
  if (node) node.hidden = !dirty;
}

function regenerate(): void {
  if (!definition) return;
  stopPlayback();
  runFrames = definition.run(paramsToRecord(params)).frames;
  frameIndex = 0;
  setDirty(false);
  renderFrame();
}

function updateParam(id: string, value: string | number): void {
  const param = params.find((item) => item.id === id);
  if (!param) return;
  param.value = value;
  const display = document.querySelector<HTMLElement>(`[data-value="${id}"]`);
  if (display) display.textContent = String(value);
  setDirty(true);
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

app.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const open = target.closest<HTMLElement>('[data-open]');
  if (open?.dataset.open) {
    event.preventDefault();
    openLab(open.dataset.open);
    return;
  }
  const frameButton = target.closest<HTMLElement>('[data-frame]');
  if (frameButton?.dataset.frame) {
    stopPlayback();
    setFrame(Number(frameButton.dataset.frame));
    return;
  }
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (!action) return;
  switch (action) {
    case 'back-home':
      goHome();
      break;
    case 'open-first':
      openLab('bubble');
      break;
    case 'focus-catalog':
      document.querySelector('#abCatalogAnchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    case 'play':
      if (playing) stopPlayback();
      else startPlayback();
      break;
    case 'step':
      stopPlayback();
      setFrame(frameIndex + 1);
      break;
    case 'prev':
      stopPlayback();
      setFrame(frameIndex - 1);
      break;
    case 'reset':
      stopPlayback();
      setFrame(0);
      break;
    case 'generate':
      regenerate();
      break;
    case 'seed': {
      const seed = params.find((param) => param.id === 'seed');
      if (seed) {
        seed.value = (Number(seed.value) || 1) + 1;
        const input = document.querySelector<HTMLInputElement>('[data-param="seed"]');
        if (input) input.value = String(seed.value);
        regenerate();
      }
      break;
    }
    case 'defaults':
      if (currentEntry) {
        params = defaultParams(currentEntry);
        renderParams();
        setDirty(true);
      }
      break;
    case 'share':
      if (currentEntry) {
        const url = `${window.location.origin}${window.location.pathname}#lab/${currentEntry.id}`;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(url).then(() => setStatus('已复制实验深链')).catch(() => window.prompt('复制链接', url));
        } else {
          window.prompt('复制链接', url);
        }
      }
      break;
    default:
      break;
  }
});

app.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement;
  if (target.id === 'abCatalogSearch') {
    catalogQuery = target.value;
    renderCatalog();
    return;
  }
  if (target.id === 'abRailSearch') return;
  if (target.dataset.param) {
    updateParam(target.dataset.param, target.type === 'range' || target.type === 'number' ? Number(target.value) : target.value);
  }
  if (target.id === 'abSpeed') {
    speed = Number(target.value) || 1;
    const value = document.querySelector<HTMLElement>('#abSpeedValue');
    if (value) value.textContent = `${speed}×`;
    if (playing) startPlayback();
  }
});

app.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  if (target.id === 'abDomainFilter') {
    catalogDomain = target.value;
    renderCatalog();
    return;
  }
  if (target.id === 'abLevelFilter') {
    catalogLevel = target.value;
    renderCatalog();
    return;
  }
  if (target.id === 'abMobileSelect') {
    openLab(target.value);
    return;
  }
  if (target.dataset.param) updateParam(target.dataset.param, target.value);
});

app.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  const card = target.closest<HTMLElement>('[data-open]');
  if (card?.dataset.open && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    openLab(card.dataset.open);
    return;
  }
  if (target.matches('input, textarea, select')) return;
  if (event.key === 'Escape' && currentEntry) {
    goHome();
    return;
  }
  if (!currentEntry) return;
  if (event.code === 'Space') {
    event.preventDefault();
    if (playing) stopPlayback();
    else startPlayback();
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    stopPlayback();
    setFrame(frameIndex + 1);
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    stopPlayback();
    setFrame(frameIndex - 1);
  } else if (event.key === 'r' || event.key === 'R') {
    stopPlayback();
    setFrame(0);
  }
});

window.addEventListener('popstate', syncRoute);
window.addEventListener('hashchange', syncRoute);

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

function goHome(push = true): void {
  stopPlayback();
  if (push && window.location.hash !== '#atlas') history.pushState({}, '', '#atlas');
  renderHome();
  lastFocused?.focus?.();
}

function syncRoute(): void {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('lab/')) {
    const id = decodeURIComponent(hash.slice(4));
    if (entryById.has(id)) {
      if (currentEntry?.id !== id) openLab(id, false);
      return;
    }
  }
  if (!currentEntry) renderHome();
  else renderHome();
}

renderHome();
if (window.location.hash) syncRoute();
