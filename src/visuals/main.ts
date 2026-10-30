import type { Domain, DomainId, Entry, Level } from './types';
import { domains, domainCounts, entries, entryById } from './data';
import { renderVisual } from './render';

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

const dom = {
  count: document.querySelector<HTMLElement>('#heroCount'),
  topCount: document.querySelector<HTMLElement>('#topVisualCount'),
  grid: document.querySelector<HTMLElement>('#visualGrid'),
  empty: document.querySelector<HTMLElement>('#visualEmpty'),
  result: document.querySelector<HTMLElement>('#visualResultLabel'),
  search: document.querySelector<HTMLInputElement>('#visualSearch'),
  domains: document.querySelector<HTMLElement>('#domainFilters'),
  levels: Array.from(document.querySelectorAll<HTMLButtonElement>('.vfilter')),
  random: document.querySelector<HTMLButtonElement>('#randomVisual'),
  modal: document.querySelector<HTMLElement>('#visualModal'),
  panel: document.querySelector<HTMLElement>('#vmPanel'),
  vmVisual: document.querySelector<HTMLElement>('#vmVisual'),
  vmDomain: document.querySelector<HTMLElement>('#vmDomain'),
  vmLevel: document.querySelector<HTMLElement>('#vmLevel'),
  vmIndex: document.querySelector<HTMLElement>('#vmIndex'),
  vmTitle: document.querySelector<HTMLElement>('#vmTitle'),
  vmEn: document.querySelector<HTMLElement>('#vmEn'),
  vmSummary: document.querySelector<HTMLElement>('#vmSummary'),
  vmMechanism: document.querySelector<HTMLElement>('#vmMechanism'),
  vmObserve: document.querySelector<HTMLElement>('#vmObserve'),
  vmTags: document.querySelector<HTMLElement>('#vmTags'),
  vmLinks: document.querySelector<HTMLElement>('#vmLinks'),
  vmPrev: document.querySelector<HTMLButtonElement>('#vmPrev'),
  vmNext: document.querySelector<HTMLButtonElement>('#vmNext'),
  vmClose: document.querySelector<HTMLButtonElement>('#vmClose'),
  vmCopy: document.querySelector<HTMLButtonElement>('#vmCopy'),
};

if (Object.values(dom).some((value) => value === null)) {
  throw new Error('Visual atlas DOM is incomplete.');
}

const domainById = new Map(domains.map((domain) => [domain.id, domain]));
const state: { domain: DomainId | 'all'; level: Level | 'all'; query: string } = {
  domain: 'all',
  level: 'all',
  query: '',
};
let visible: Entry[] = entries.slice();
let activeEntry: Entry | null = null;
let lastFocused: HTMLElement | null = null;

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
  if (dom.topCount) dom.topCount.textContent = `${entries.length} VISUAL NOTES`;
  if (dom.result) {
    const domainLabel = state.domain === 'all' ? '全部领域' : domainName(state.domain);
    const levelLabel = state.level === 'all' ? '全部难度' : state.level;
    dom.result.innerHTML = '';
    dom.result.append(
      `显示 `,
      Object.assign(make('strong'), { textContent: String(visible.length) }),
      ` / ${entries.length} 个 · ${domainLabel} · ${levelLabel}`,
    );
  }
  if (dom.empty) dom.empty.hidden = visible.length > 0;
  renderGrid();
}

function renderGrid(): void {
  if (!dom.grid) return;
  const fragment = document.createDocumentFragment();
  for (const item of visible) {
    const card = make('article', 'vcard');
    card.dataset.domain = item.domain;
    card.dataset.id = item.id;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${item.title}，${domainName(item.domain)}，${item.level}`);

    const visual = make('div', 'vcard-visual');
    visual.appendChild(renderVisual(item.visual));
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
}

function buildFilters(): void {
  if (!dom.domains) return;
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

function openEntry(id: string, options: { push?: boolean; focus?: boolean } = {}): void {
  const item = entryById.get(id);
  if (!item || !dom.modal || !dom.panel) return;
  activeEntry = item;
  lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dom.panel.dataset.domain = item.domain;
  dom.panel.style.setProperty('--vz-accent', DOMAIN_TONES[item.domain]);
  dom.vmVisual?.replaceChildren(renderVisual(item.visual));
  if (dom.vmDomain) dom.vmDomain.textContent = `${domainName(item.domain)} / ${domainEn(item.domain)}`;
  if (dom.vmLevel) dom.vmLevel.textContent = item.level;
  const index = visible.findIndex((entry) => entry.id === item.id);
  if (dom.vmIndex) dom.vmIndex.textContent = `${index >= 0 ? index + 1 : '—'} / ${visible.length || entries.length}`;
  if (dom.vmTitle) dom.vmTitle.textContent = item.title;
  if (dom.vmEn) dom.vmEn.textContent = item.en;
  if (dom.vmSummary) dom.vmSummary.textContent = item.summary;
  if (dom.vmMechanism) dom.vmMechanism.textContent = item.mechanism;
  if (dom.vmObserve) dom.vmObserve.textContent = item.observe;
  if (dom.vmTags) {
    dom.vmTags.replaceChildren(...item.tags.map((tag) => make('span', undefined, tag)));
  }
  if (dom.vmLinks) {
    dom.vmLinks.replaceChildren();
    for (const [label, href] of item.links ?? []) {
      const link = make('a', undefined, `${label} →`);
      link.href = href;
      dom.vmLinks.appendChild(link);
    }
    if (!(item.links?.length)) {
      dom.vmLinks.appendChild(make('span', 'vm-no-link', '本页视觉笔记 · 无外部实验'));
    }
  }
  if (dom.vmPrev) dom.vmPrev.disabled = index <= 0;
  if (dom.vmNext) dom.vmNext.disabled = index < 0 || index >= visible.length - 1;
  if (dom.vmCopy) dom.vmCopy.textContent = '复制链接';
  dom.modal.hidden = false;
  document.body.classList.add('is-modal-open');
  if (options.focus !== false) dom.vmClose?.focus();
  if (options.push !== false) {
    const nextHash = `#${item.id}`;
    if (window.location.hash !== nextHash) history.pushState({ id: item.id }, '', nextHash);
  }
}

function closeEntry(options: { push?: boolean } = {}): void {
  if (!dom.modal) return;
  if (dom.modal.hidden) return;
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
  if (!activeEntry || !dom.vmCopy) return;
  const url = `${window.location.origin}${window.location.pathname}#${activeEntry.id}`;
  const done = () => {
    if (!dom.vmCopy) return;
    dom.vmCopy.textContent = '已复制';
    window.setTimeout(() => {
      if (dom.vmCopy) dom.vmCopy.textContent = '复制链接';
    }, 1400);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => {
      window.prompt('复制链接', url);
    });
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
      if (dom.search) dom.search.value = '';
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

dom.search?.addEventListener('input', () => {
  state.query = normalize(dom.search?.value ?? '');
  updateVisible();
});
for (const button of dom.levels) {
  button.addEventListener('click', () => {
    const level = button.dataset.level as Level | 'all';
    selectLevel(level);
  });
}
dom.random?.addEventListener('click', randomEntry);
dom.vmClose?.addEventListener('click', () => closeEntry());
dom.modal?.addEventListener('click', (event) => {
  if (event.target === dom.modal) closeEntry();
});
dom.vmPrev?.addEventListener('click', () => moveEntry(-1));
dom.vmNext?.addEventListener('click', () => moveEntry(1));
dom.vmCopy?.addEventListener('click', copyCurrentLink);

window.addEventListener('popstate', syncFromHash);
window.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null;
  const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
  if (event.key === 'Escape') {
    if (dom.modal && !dom.modal.hidden) closeEntry();
    return;
  }
  if (event.key === '/' && !typing) {
    event.preventDefault();
    dom.search?.focus();
    return;
  }
  if (!dom.modal?.hidden) {
    if (event.key === 'ArrowLeft') moveEntry(-1);
    if (event.key === 'ArrowRight') moveEntry(1);
  }
});

if (window.location.hash) syncFromHash();
