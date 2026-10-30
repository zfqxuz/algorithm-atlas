import type { DomainId, Entry, Level } from './types';
import { domains, domainCounts, entries, entryById } from './data';
import { createVisualPlayer, type VisualPlayer } from './animate';
import { renderVisual } from './render';
import { ATLAS_TEMPLATE } from './template';

const DOMAIN_TONES: Record<DomainId, string> = {
  algorithms: '#667558',
  optimization: '#9a6c25',
  ml: '#6c5d90',
  neural: '#b55435',
  os: '#52717a',
  arch: '#8a6547',
  network: '#47736d',
  db: '#9a6c25',
  compiler: '#725b83',
  distributed: '#b55435',
  security: '#9a4f3f',
  graphics: '#4f7381',
  theory: '#6b6474',
  se: '#667558',
};

function get<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing visual atlas element ${selector}`);
  return node;
}

const appRoot = get<HTMLElement>('#csAtlasApp');
appRoot.innerHTML = ATLAS_TEMPLATE;

const dom = {
  count: document.querySelector<HTMLElement>('#heroCount'),
  topCount: document.querySelector<HTMLElement>('#topVisualCount'),
  grid: get<HTMLElement>('#visualGrid'),
  empty: get<HTMLElement>('#visualEmpty'),
  result: get<HTMLElement>('#visualResultLabel'),
  search: get<HTMLInputElement>('#visualSearch'),
  domains: get<HTMLElement>('#domainFilters'),
  levels: Array.from(document.querySelectorAll<HTMLButtonElement>('.vfilter')),
  random: get<HTMLButtonElement>('#randomVisual'),
  modal: get<HTMLElement>('#visualModal'),
  panel: get<HTMLElement>('#vmPanel'),
  vmVisual: get<HTMLElement>('#vmVisual'),
  vmDomain: get<HTMLElement>('#vmDomain'),
  vmLevel: get<HTMLElement>('#vmLevel'),
  vmIndex: get<HTMLElement>('#vmIndex'),
  vmTitle: get<HTMLElement>('#vmTitle'),
  vmEn: get<HTMLElement>('#vmEn'),
  vmSummary: get<HTMLElement>('#vmSummary'),
  vmMechanism: get<HTMLElement>('#vmMechanism'),
  vmObserve: get<HTMLElement>('#vmObserve'),
  vmTags: get<HTMLElement>('#vmTags'),
  vmLinks: get<HTMLElement>('#vmLinks'),
  vmPrev: get<HTMLButtonElement>('#vmPrev'),
  vmNext: get<HTMLButtonElement>('#vmNext'),
  vmClose: get<HTMLButtonElement>('#vmClose'),
  vmCopy: get<HTMLButtonElement>('#vmCopy'),
  vmPlay: get<HTMLButtonElement>('#vmPlay'),
  vmStep: get<HTMLButtonElement>('#vmStep'),
  vmReset: get<HTMLButtonElement>('#vmReset'),
  vmAnimLabel: get<HTMLElement>('#vmAnimLabel'),
};

const domainById = new Map(domains.map((domain) => [domain.id, domain]));
const state: { domain: DomainId | 'all'; level: Level | 'all'; query: string } = {
  domain: 'all',
  level: 'all',
  query: '',
};
let visible: Entry[] = entries.slice();
let activeEntry: Entry | null = null;
let lastFocused: HTMLElement | null = null;
let cardPlayers: VisualPlayer[] = [];
let modalPlayer: VisualPlayer | null = null;

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  textContent?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function domainName(domainId: DomainId): string {
  return domainById.get(domainId)?.title ?? domainId;
}

function domainEn(domainId: DomainId): string {
  return domainById.get(domainId)?.en ?? domainId;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matches(entry: Entry): boolean {
  if (state.domain !== 'all' && entry.domain !== state.domain) return false;
  if (state.level !== 'all' && entry.level !== state.level) return false;
  if (!state.query) return true;
  const haystack = [
    entry.title,
    entry.en,
    entry.summary,
    entry.tags.join(' '),
    domainName(entry.domain),
    domainEn(entry.domain),
  ].join(' ').toLowerCase();
  return haystack.includes(state.query);
}

function updateVisible(): void {
  visible = entries.filter(matches);
  if (dom.count) dom.count.textContent = String(entries.length);
  if (dom.topCount) dom.topCount.textContent = `${entries.length} DYNAMIC DEMOS`;
  const domainLabel = state.domain === 'all' ? '全部领域' : domainName(state.domain);
  const levelLabel = state.level === 'all' ? '全部难度' : state.level;
  dom.result.replaceChildren();
  dom.result.append('正在播放 ', Object.assign(make('strong'), { textContent: String(visible.length) }), ` / ${entries.length} 个 · ${domainLabel} · ${levelLabel}`);
  dom.empty.hidden = visible.length > 0;
  renderGrid();
}

function renderGrid(): void {
  for (const player of cardPlayers) player.destroy();
  cardPlayers = [];
  const pending: Array<{ svg: SVGSVGElement; spec: Entry['visual']; host: HTMLElement; progress: HTMLElement }> = [];
  const fragment = document.createDocumentFragment();
  for (const item of visible) {
    const card = make('article', 'vcard');
    card.dataset.domain = item.domain;
    card.dataset.id = item.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${item.title}，${domainName(item.domain)}，${item.level}，动态演示`);

    const visual = make('div', 'vcard-visual');
    const svg = renderVisual(item.visual);
    visual.appendChild(svg);
    visual.appendChild(make('span', 'vcard-live-tag', '● 动态'));
    const progress = make('span', 'vcard-progress');
    progress.appendChild(make('i'));
    visual.appendChild(progress);
    pending.push({ svg, spec: item.visual, host: visual, progress });

    const body = make('div', 'vcard-body');
    const meta = make('div', 'vcard-meta');
    const level = make('span', `vlevel is-${item.level.toLowerCase()}`, item.level);
    const domain = make('span', 'vcard-domain', domainName(item.domain));
    const open = make('span', 'vcard-open', '↗');
    meta.append(level, domain, open);
    const title = make('h3', undefined, item.title);
    const en = make('div', 'vcard-en', item.en);
    const summary = make('p', 'vcard-summary', item.summary);
    const tags = make('div', 'vcard-tags');
    for (const tag of item.tags.slice(0, 3)) tags.appendChild(make('span', undefined, tag));
    body.append(meta, title, en, summary, tags);
    card.append(visual, body);

    card.addEventListener('click', () => openEntry(item.id));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openEntry(item.id);
      }
    });
    fragment.appendChild(card);
  }
  dom.grid.replaceChildren(fragment);
  for (const item of pending) {
    cardPlayers.push(createVisualPlayer(item.svg, item.spec, {
      host: item.host,
      auto: true,
      progressive: false,
      onUpdate: (step, total) => {
        const bar = item.progress.firstElementChild as HTMLElement | null;
        if (bar) bar.style.width = `${((step + 1) / total) * 100}%`;
      },
    }));
  }
}

function buildFilters(): void {
  const all = make('button', 'domain-filter');
  all.type = 'button';
  all.dataset.domain = 'all';
  all.setAttribute('aria-pressed', 'true');
  const dot = make('span', 'domain-dot');
  dot.style.setProperty('--domain-tone', 'var(--accent)');
  all.append(dot, make('span', undefined, '全部领域'), make('small', undefined, String(entries.length)));
  all.addEventListener('click', () => selectDomain('all'));
  dom.domains.appendChild(all);

  for (const domain of domains) {
    const button = make('button', 'domain-filter');
    button.type = 'button';
    button.dataset.domain = domain.id;
    button.setAttribute('aria-pressed', 'false');
    const domainDot = make('span', 'domain-dot');
    domainDot.style.setProperty('--domain-tone', DOMAIN_TONES[domain.id]);
    button.append(
      domainDot,
      make('span', undefined, domain.title),
      make('small', undefined, String(domainCounts.get(domain.id) ?? 0)),
    );
    button.addEventListener('click', () => selectDomain(domain.id));
    dom.domains.appendChild(button);
  }
}

function selectDomain(domain: DomainId | 'all'): void {
  state.domain = domain;
  for (const button of document.querySelectorAll<HTMLButtonElement>('.domain-filter')) {
    button.setAttribute('aria-pressed', String(button.dataset.domain === domain));
  }
  updateVisible();
}

function selectLevel(level: Level | 'all'): void {
  state.level = level;
  for (const button of dom.levels) {
    button.setAttribute('aria-pressed', String(button.dataset.level === level));
  }
  updateVisible();
}

function visualLink(href: string): { href: string; id?: string } {
  if (href.startsWith('visuals.html#')) return { href: `#${href.split('#')[1]}`, id: href.split('#')[1] };
  if (href.startsWith('index.html#')) return { href: `#${href.split('#')[1]}`, id: href.split('#')[1] };
  if (href.startsWith('#')) return { href, id: href.slice(1) };
  return { href };
}

function openEntry(id: string, options: { push?: boolean; focus?: boolean } = {}): void {
  const item = entryById.get(id);
  if (!item) return;
  modalPlayer?.destroy();
  modalPlayer = null;
  activeEntry = item;
  lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dom.panel.dataset.domain = item.domain;
  dom.panel.style.setProperty('--vz-accent', DOMAIN_TONES[item.domain]);
  dom.vmVisual.replaceChildren();
  const svg = renderVisual(item.visual);
  dom.vmVisual.appendChild(svg);
  dom.vmDomain.textContent = `${domainName(item.domain)} / ${domainEn(item.domain)}`;
  dom.vmLevel.textContent = item.level;
  const index = visible.findIndex((entry) => entry.id === item.id);
  dom.vmIndex.textContent = `${index >= 0 ? index + 1 : '—'} / ${visible.length || entries.length}`;
  dom.vmTitle.textContent = item.title;
  dom.vmEn.textContent = item.en;
  dom.vmSummary.textContent = item.summary;
  dom.vmMechanism.textContent = item.mechanism;
  dom.vmObserve.textContent = item.observe;
  dom.vmTags.replaceChildren(...item.tags.map((tag) => make('span', undefined, tag)));
  dom.vmLinks.replaceChildren();
  for (const [label, href] of item.links ?? []) {
    const target = visualLink(href);
    const link = make('a', undefined, `${label} →`);
    link.href = target.href;
    if (target.id && entryById.has(target.id)) {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        openEntry(target.id as string);
      });
    }
    dom.vmLinks.appendChild(link);
  }
  if (!(item.links?.length)) dom.vmLinks.appendChild(make('span', 'vm-no-link', '本页动态演示 · 无外部实验'));
  dom.vmPrev.disabled = index <= 0;
  dom.vmNext.disabled = index < 0 || index >= visible.length - 1;
  dom.vmCopy.textContent = '复制链接';
  dom.modal.hidden = false;
  document.body.classList.add('is-modal-open');
  if (options.focus !== false) dom.vmClose.focus();
  modalPlayer = createVisualPlayer(svg, item.visual, {
    host: dom.vmVisual,
    auto: true,
    progressive: false,
    onUpdate: (step, total, label) => {
      dom.vmAnimLabel.textContent = `${step + 1} / ${total} · ${label}`;
      dom.vmPlay.textContent = '暂停';
    },
  });
  if (options.push !== false) {
    const nextHash = `#${item.id}`;
    if (window.location.hash !== nextHash) history.pushState({ id: item.id }, '', nextHash);
  }
}

function closeEntry(options: { push?: boolean } = {}): void {
  if (dom.modal.hidden) return;
  modalPlayer?.destroy();
  modalPlayer = null;
  dom.modal.hidden = true;
  document.body.classList.remove('is-modal-open');
  activeEntry = null;
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
  if (options.push !== false && window.location.hash) {
    history.pushState({}, '', `${window.location.pathname}${window.location.search}`);
  }
}

function moveEntry(direction: -1 | 1): void {
  if (!activeEntry) return;
  const index = visible.findIndex((entry) => entry.id === activeEntry?.id);
  const next = visible[index + direction];
  if (next) openEntry(next.id);
}

function copyCurrentLink(): void {
  if (!activeEntry) return;
  const url = `${window.location.origin}${window.location.pathname}#${activeEntry.id}`;
  const done = () => {
    dom.vmCopy.textContent = '已复制';
    window.setTimeout(() => { dom.vmCopy.textContent = '复制链接'; }, 1400);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => window.prompt('复制链接', url));
  } else {
    window.prompt('复制链接', url);
  }
}

function randomEntry(): void {
  const pool = visible.length ? visible : entries;
  const item = pool[Math.floor(Math.random() * pool.length)];
  if (item) openEntry(item.id);
}

function syncFromHash(): void {
  const id = window.location.hash.replace(/^#/, '');
  if (id && entryById.has(id)) {
    if (state.domain !== 'all' || state.level !== 'all' || state.query) {
      state.domain = 'all';
      state.level = 'all';
      state.query = '';
      dom.search.value = '';
      for (const button of document.querySelectorAll<HTMLButtonElement>('.domain-filter')) {
        button.setAttribute('aria-pressed', String(button.dataset.domain === 'all'));
      }
      for (const button of dom.levels) button.setAttribute('aria-pressed', String(button.dataset.level === 'all'));
      updateVisible();
    }
    openEntry(id, { push: false });
  } else {
    closeEntry({ push: false });
  }
}

buildFilters();
updateVisible();

dom.search.addEventListener('input', () => {
  state.query = normalize(dom.search.value);
  updateVisible();
});
for (const button of dom.levels) {
  button.addEventListener('click', () => {
    const level = button.dataset.level as Level | 'all';
    selectLevel(level);
  });
}
dom.random.addEventListener('click', randomEntry);
dom.vmClose.addEventListener('click', () => closeEntry());
dom.modal.addEventListener('click', (event) => {
  if (event.target === dom.modal) closeEntry();
});
dom.vmPrev.addEventListener('click', () => moveEntry(-1));
dom.vmNext.addEventListener('click', () => moveEntry(1));
dom.vmCopy.addEventListener('click', copyCurrentLink);
dom.vmPlay.addEventListener('click', () => {
  const playing = modalPlayer?.toggle() ?? false;
  dom.vmPlay.textContent = playing ? '暂停' : '播放';
});
dom.vmStep.addEventListener('click', () => {
  modalPlayer?.next();
  dom.vmPlay.textContent = '播放';
});
dom.vmReset.addEventListener('click', () => {
  modalPlayer?.reset();
  dom.vmPlay.textContent = '播放';
});

window.addEventListener('popstate', syncFromHash);
window.addEventListener('hashchange', syncFromHash);
window.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null;
  const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
  if (event.key === 'Escape' && !dom.modal.hidden) {
    closeEntry();
    return;
  }
  if (event.key === '/' && !typing) {
    event.preventDefault();
    dom.search.focus();
    return;
  }
  if (!dom.modal.hidden) {
    if (event.key === 'ArrowLeft') moveEntry(-1);
    if (event.key === 'ArrowRight') moveEntry(1);
  }
});

if (window.location.hash) syncFromHash();
