/* Small shared helpers for the algorithm labs. No build step, no dependencies. */
(function (root) {
  'use strict';

  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    }
    return node;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatInt(value) {
    return Number(value).toLocaleString('zh-CN');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function highlightCode(line) {
    let html = escapeHtml(line);
    html = html.replace(
      /\b(function|for|while|if|else|return|in|not|and|or|new|let|const|while|break|continue)\b/g,
      '<span class="tok-keyword">$1</span>'
    );
    html = html.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\(/g, '<span class="tok-fn">$1</span>(');
    html = html.replace(/\b(0|[1-9][0-9]*)\b/g, '<span class="tok-value">$1</span>');
    return html;
  }

  function renderCode(container, lines, activeLines) {
    const active = new Set(activeLines || []);
    container.replaceChildren();
    lines.forEach((line, index) => {
      const row = el('div', 'lab-code-line');
      const lineNo = el('span', 'line-no', String(index + 1).padStart(2, '0'));
      const code = document.createElement('code');
      code.innerHTML = highlightCode(line);
      if (active.has(index + 1)) row.classList.add('is-active');
      row.append(lineNo, code);
      container.appendChild(row);
    });
  }

  function setLevelBadge(node, level) {
    if (!node) return;
    node.classList.remove('level-l1', 'level-l2', 'level-l3', 'level-l4', 'is-l1', 'is-l2', 'is-l3', 'is-l4');
    node.classList.add(`level-${String(level).toLowerCase()}`);
    node.textContent = level;
  }

  function scrollActiveLine(container) {
    if (!container) return;
    const active = container.querySelector('.lab-code-line.is-active');
    if (!active) return;
    const top = active.offsetTop;
    const bottom = top + active.offsetHeight;
    if (top < container.scrollTop) container.scrollTop = Math.max(0, top - 8);
    else if (bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = bottom - container.clientHeight + 8;
    }
  }

  function createTimelinePlayer(options) {
    const {
      getTotal,
      getIndex,
      setIndex,
      render,
      getDelay = () => 90,
      getBatchSize = () => 1,
      onPlayStateChange = () => {},
    } = options;

    let playing = false;
    let timer = null;

    function clearTimer() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }

    function emit(state) {
      onPlayStateChange(state, playing);
    }

    function schedule() {
      clearTimer();
      if (!playing) return;
      timer = window.setTimeout(tick, getDelay());
    }

    function tick() {
      timer = null;
      if (!playing) return;
      const total = getTotal();
      if (total === 0) {
        stop();
        return;
      }
      const current = getIndex();
      if (current >= total - 1) {
        stop();
        return;
      }
      const next = Math.min(total - 1, current + Math.max(1, Math.round(getBatchSize())));
      setIndex(next);
      render();
      emit('tick');
      if (next >= total - 1) stop();
      else schedule();
    }

    function stop() {
      clearTimer();
      playing = false;
      emit('stop');
    }

    function play() {
      const total = getTotal();
      if (total === 0) return;
      if (playing) return;
      if (getIndex() >= total - 1) {
        setIndex(0);
        render();
      }
      playing = true;
      emit('play');
      if (getIndex() >= total - 1) {
        stop();
        return;
      }
      timer = window.setTimeout(tick, 30);
    }

    function pause() {
      if (!playing) return;
      clearTimer();
      playing = false;
      emit('pause');
    }

    function toggle() {
      if (playing) pause();
      else play();
    }

    function step(amount = 1) {
      pause();
      const total = getTotal();
      if (total === 0) return;
      const next = clamp(getIndex() + amount, 0, total - 1);
      setIndex(next);
      render();
      emit('step');
    }

    function reset() {
      pause();
      setIndex(0);
      render();
      emit('reset');
    }

    function goTo(index) {
      pause();
      const total = getTotal();
      if (total === 0) return;
      setIndex(clamp(index, 0, total - 1));
      render();
      emit('seek');
    }

    function isPlaying() {
      return playing;
    }

    return { play, pause, toggle, step, reset, goTo, isPlaying, dispose: stop };
  }

  function readMode(validIds, fallback) {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    return validIds.includes(hash) ? hash : fallback;
  }

  function writeMode(mode) {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', `#${mode}`);
    }
  }

  function randomSeed() {
    return Math.floor(Math.random() * 90000) + 1000;
  }

  function updateRangeFill(input) {
    if (!input) return;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value);
    const percent = ((value - min) / (max - min)) * 100;
    input.style.setProperty('--range-progress', `${percent}%`);
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(this, args), wait);
    };
  }

  root.LabCore = {
    $,
    $$,
    el,
    svgEl,
    clamp,
    formatInt,
    escapeHtml,
    renderCode,
    scrollActiveLine,
    setLevelBadge,
    createTimelinePlayer,
    readMode,
    writeMode,
    randomSeed,
    updateRangeFill,
    debounce,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
