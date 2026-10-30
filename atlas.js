(function () {
  'use strict';

  const catalog = window.AlgorithmCatalog;
  if (!catalog) throw new Error('Algorithm catalogue is missing.');

  const { LEVELS, CATEGORIES, RESEARCH_TOPICS } = catalog;
  const levelById = new Map(LEVELS.map((level) => [level.id, level]));
  const allAlgorithms = CATEGORIES.flatMap((category) =>
    category.algorithms.map((algorithm) => ({ ...algorithm, category: category.id }))
  );

  const state = {
    category: 'all',
    level: 'all',
    query: '',
  };

  const dom = {
    topCount: document.querySelector('#atlasTopCount'),
    stats: document.querySelector('#atlasStats'),
    ladder: document.querySelector('#levelLadder'),
    categoryFilters: document.querySelector('#categoryFilters'),
    levelFilters: document.querySelector('#levelFilters'),
    search: document.querySelector('#atlasSearch'),
    resultCount: document.querySelector('#atlasResultCount'),
    clear: document.querySelector('#clearFilters'),
    sections: document.querySelector('#catalogSections'),
    empty: document.querySelector('#atlasEmpty'),
    emptyReset: document.querySelector('#emptyReset'),
    researchSection: document.querySelector('#research'),
    researchGrid: document.querySelector('#researchGrid'),
    researchCount: document.querySelector('#researchCount'),
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function matchesQuery(algorithm, query) {
    if (!query) return true;
    const haystack = [
      algorithm.name,
      algorithm.en,
      algorithm.summary,
      algorithm.complexity,
      algorithm.level,
      levelById.get(algorithm.level)?.name,
      ...(algorithm.tags || []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function visibleAlgorithms() {
    return allAlgorithms.filter((algorithm) => {
      if (state.category !== 'all' && algorithm.category !== state.category) return false;
      if (state.level !== 'all' && algorithm.level !== state.level) return false;
      return matchesQuery(algorithm, state.query.trim());
    });
  }

  function countByLevel() {
    const counts = Object.fromEntries(LEVELS.map((level) => [level.id, { algorithms: 0, topics: 0 }]));
    for (const algorithm of allAlgorithms) counts[algorithm.level].algorithms += 1;
    for (const topic of RESEARCH_TOPICS) counts[topic.level].topics += 1;
    return counts;
  }

  function renderStats() {
    const values = {
      algorithms: allAlgorithms.length,
      categories: CATEGORIES.length,
      levels: LEVELS.length,
      topics: RESEARCH_TOPICS.length,
    };
    for (const [key, value] of Object.entries(values)) {
      const slot = dom.stats.querySelector(`[data-stat="${key}"]`);
      if (slot) slot.textContent = String(value);
    }
    dom.topCount.textContent = `${values.algorithms} 算法 · ${values.topics} 专题`;
  }

  function renderLadder() {
    const counts = countByLevel();
    dom.ladder.replaceChildren();
    for (const level of LEVELS) {
      const card = element('button', 'level-ladder-card');
      card.type = 'button';
      card.dataset.level = level.id;
      card.innerHTML = `
        <span class="level-ladder-code">${level.id}</span>
        <span class="level-ladder-copy">
          <strong>${level.name}</strong>
          <small>${level.range}</small>
        </span>
        <span class="level-ladder-count">${counts[level.id].algorithms}<small>算法</small></span>
        <span class="level-ladder-arrow" aria-hidden="true">↗</span>
      `;
      card.setAttribute(
        'aria-label',
        `${level.name}，${counts[level.id].algorithms} 个交互算法，筛选这一难度`
      );
      card.addEventListener('click', () => {
        setLevel(level.id);
        document.querySelector('#catalogue').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      dom.ladder.appendChild(card);
    }
  }

  function makeFilterButton(label, value, count, pressed) {
    const button = element('button', 'atlas-filter-chip');
    button.type = 'button';
    button.dataset.value = value;
    button.setAttribute('aria-pressed', String(pressed));
    button.append(element('span', '', label));
    if (count !== null) button.append(element('small', '', String(count)));
    return button;
  }

  function renderFilters() {
    const levelCounts = countByLevel();
    dom.categoryFilters.replaceChildren();
    dom.categoryFilters.appendChild(
      makeFilterButton('全部', 'all', allAlgorithms.length, state.category === 'all')
    );
    for (const category of CATEGORIES) {
      const count = category.algorithms.length;
      dom.categoryFilters.appendChild(
        makeFilterButton(category.title, category.id, count, state.category === category.id)
      );
    }

    dom.levelFilters.replaceChildren();
    dom.levelFilters.appendChild(
      makeFilterButton('全部', 'all', allAlgorithms.length, state.level === 'all')
    );
    for (const level of LEVELS) {
      dom.levelFilters.appendChild(
        makeFilterButton(
          `${level.id} ${level.label}`,
          level.id,
          levelCounts[level.id].algorithms,
          state.level === level.id
        )
      );
    }
  }

  function makeAlgorithmCard(algorithm, category) {
    const level = levelById.get(algorithm.level);
    const card = element('a', `atlas-card level-${algorithm.level.toLowerCase()}`);
    card.href = algorithm.href;
    card.setAttribute('aria-label', `${algorithm.name}，${level.name}，${algorithm.complexity}`);

    const top = element('div', 'atlas-card-top');
    top.append(
      element('span', `atlas-level-badge level-${algorithm.level.toLowerCase()}`, algorithm.level),
      element('span', 'atlas-card-complexity', algorithm.complexity)
    );

    const title = element('h3', 'atlas-card-title');
    title.append(algorithm.name, element('small', '', algorithm.en));

    const summary = element('p', 'atlas-card-summary', algorithm.summary);

    const tags = element('div', 'atlas-card-tags');
    for (const tag of algorithm.tags.slice(0, 3)) {
      tags.appendChild(element('span', '', tag));
    }

    const footer = element('div', 'atlas-card-footer');
    footer.append(
      element('span', '', algorithm.labNote),
      element('span', 'atlas-card-arrow', '↗')
    );

    card.append(top, title, summary, tags, footer);
    card.dataset.category = category.id;
    card.dataset.level = algorithm.level;
    return card;
  }

  function renderCatalog() {
    const visible = visibleAlgorithms();
    const visibleIds = new Set(visible.map((algorithm) => `${algorithm.category}:${algorithm.id}`));
    dom.sections.replaceChildren();

    for (const [categoryIndex, category] of CATEGORIES.entries()) {
      const categoryAlgorithms = category.algorithms.filter((algorithm) =>
        visibleIds.has(`${category.id}:${algorithm.id}`)
      );
      if (categoryAlgorithms.length === 0) continue;

      const section = element('section', 'atlas-category');
      section.id = `category-${category.id}`;
      section.dataset.category = category.id;

      const header = element('header', 'atlas-category-head');
      const identity = element('div', 'atlas-category-identity');
      identity.append(
        element('span', 'atlas-category-index', String(categoryIndex + 1).padStart(2, '0')),
        element('span', 'eyebrow', category.en)
      );
      const copy = element('div', 'atlas-category-copy');
      copy.append(
        element('h2', '', category.title),
        element('p', '', category.description)
      );
      const action = element('a', 'atlas-lab-link', category.labLabel);
      action.href = category.labHref;
      action.append(element('span', '', '↗'));
      header.append(identity, copy, action);

      const levelStack = element('div', 'atlas-level-stack');
      for (const level of LEVELS) {
        const levelAlgorithms = categoryAlgorithms.filter(
          (algorithm) => algorithm.level === level.id
        );
        if (levelAlgorithms.length === 0) continue;

        const group = element('div', 'atlas-level-group');
        group.dataset.level = level.id;
        const rail = element('div', 'atlas-level-rail');
        rail.append(
          element('span', `atlas-level-badge level-${level.id.toLowerCase()}`, level.id),
          element('span', 'atlas-level-rail-label', level.label),
          element('span', 'atlas-level-rail-range', level.range)
        );

        const grid = element('div', 'atlas-algorithm-grid');
        for (const algorithm of levelAlgorithms) {
          grid.appendChild(makeAlgorithmCard(algorithm, category));
        }
        group.append(rail, grid);
        levelStack.appendChild(group);
      }

      section.append(header, levelStack);
      dom.sections.appendChild(section);
    }

    const hasFilters = state.category !== 'all' || state.level !== 'all' || state.query.trim() !== '';
    dom.clear.hidden = !hasFilters;
    dom.empty.hidden = visible.length !== 0;
    dom.resultCount.textContent = visible.length === allAlgorithms.length
      ? `共 ${allAlgorithms.length} 个交互算法，按类型与难度排列`
      : `显示 ${visible.length} / ${allAlgorithms.length} 个交互算法`;
    renderResearch(visible.length > 0);
  }

  function makeResearchCard(topic) {
    const details = document.createElement('details');
    details.className = 'research-card';
    const summary = document.createElement('summary');
    const head = element('div', 'research-card-head');
    head.append(
      element('span', 'atlas-level-badge level-l4', topic.level),
      element('span', 'research-card-en', topic.en)
    );
    const title = element('h3', '', topic.title);
    summary.append(head, title, element('p', '', topic.summary));
    const body = element('div', 'research-card-body');
    const points = element('ul', 'research-points');
    for (const point of topic.points) points.appendChild(element('li', '', point));
    const reading = element('div', 'research-card-foot');
    reading.append(element('span', 'research-reading', '研究生专题 · 概念地图'));
    const detailLink = element('a', 'research-detail-link', '阅读完整专题 →');
    detailLink.href = `research.html#${topic.id}`;
    reading.appendChild(detailLink);
    body.append(points, reading);
    details.append(summary, body);
    return details;
  }

  function renderResearch(hasAlgorithmResults) {
    const shouldShowCategory = state.category === 'all';
    const levelAllowsResearch = state.level === 'all' || state.level === 'L4';
    if (!shouldShowCategory || !levelAllowsResearch) {
      dom.researchSection.hidden = true;
      return;
    }

    const query = state.query.trim().toLowerCase();
    const topics = RESEARCH_TOPICS.filter((topic) => {
      if (!query) return true;
      return [topic.title, topic.en, topic.summary, ...topic.points]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
    dom.researchSection.hidden = topics.length === 0;
    dom.researchCount.textContent = `${topics.length} 个专题`;
    dom.researchGrid.replaceChildren();
    for (const topic of topics) dom.researchGrid.appendChild(makeResearchCard(topic));
  }

  function syncControls() {
    for (const button of dom.categoryFilters.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.value === state.category));
    }
    for (const button of dom.levelFilters.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.value === state.level));
    }
    for (const card of dom.ladder.querySelectorAll('button')) {
      card.classList.toggle('is-active', card.dataset.level === state.level);
    }
  }

  function render() {
    renderFilters();
    syncControls();
    renderCatalog();
  }

  function setCategory(value) {
    state.category = value;
    render();
  }

  function setLevel(value) {
    state.level = value;
    render();
  }

  function resetFilters() {
    state.category = 'all';
    state.level = 'all';
    state.query = '';
    dom.search.value = '';
    render();
    dom.search.focus({ preventScroll: true });
  }

  function bindEvents() {
    dom.categoryFilters.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-value]');
      if (button) setCategory(button.dataset.value);
    });
    dom.levelFilters.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-value]');
      if (button) setLevel(button.dataset.value);
    });
    dom.search.addEventListener('input', () => {
      state.query = dom.search.value;
      renderCatalog();
    });
    dom.clear.addEventListener('click', resetFilters);
    dom.emptyReset.addEventListener('click', resetFilters);
  }

  function init() {
    renderStats();
    renderLadder();
    renderFilters();
    renderCatalog();
    syncControls();
    bindEvents();
  }

  init();
})();
