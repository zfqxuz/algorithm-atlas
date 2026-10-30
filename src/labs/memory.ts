export type ReplacementAlgorithm = 'fifo' | 'lru' | 'opt';

export interface MemoryStep {
  frames: Array<number | null>;
  referenceIndex: number;
  page: number | null;
  fault: boolean;
  evicted: number | null;
  faults: number;
  hits: number;
}

export function generateReferences(length: number, seed: number, pages = 8): number[] {
  let state = (Math.max(1, Math.floor(seed)) >>> 0) || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state;
  };
  return Array.from({ length: Math.max(1, Math.floor(length)) }, () => next() % pages);
}

export function simulate(
  references: number[],
  frameCount: number,
  algorithm: ReplacementAlgorithm,
): MemoryStep[] {
  const frames: Array<number | null> = Array.from({ length: Math.max(1, frameCount) }, () => null);
  const loadedAt = new Map<number, number>();
  const lastUsed = new Map<number, number>();
  const steps: MemoryStep[] = [{
    frames: frames.slice(),
    referenceIndex: -1,
    page: null,
    fault: false,
    evicted: null,
    faults: 0,
    hits: 0,
  }];
  let faults = 0;
  let hits = 0;

  references.forEach((page, index) => {
    const slot = frames.indexOf(page);
    let evicted: number | null = null;
    let fault = false;
    if (slot >= 0) {
      hits += 1;
      lastUsed.set(page, index);
    } else {
      fault = true;
      faults += 1;
      let target = frames.indexOf(null);
      if (target < 0) {
        if (algorithm === 'fifo') {
          let oldest = Infinity;
          frames.forEach((value, frameIndex) => {
            if (value === null) return;
            const stamp = loadedAt.get(value) ?? 0;
            if (stamp < oldest) {
              oldest = stamp;
              target = frameIndex;
            }
          });
        } else if (algorithm === 'lru') {
          let oldest = Infinity;
          frames.forEach((value, frameIndex) => {
            if (value === null) return;
            const stamp = lastUsed.get(value) ?? -1;
            if (stamp < oldest) {
              oldest = stamp;
              target = frameIndex;
            }
          });
        } else {
          let farthest = -1;
          frames.forEach((value, frameIndex) => {
            if (value === null) return;
            let nextUse = Infinity;
            for (let cursor = index + 1; cursor < references.length; cursor += 1) {
              if (references[cursor] === value) {
                nextUse = cursor;
                break;
              }
            }
            if (nextUse > farthest) {
              farthest = nextUse;
              target = frameIndex;
            }
          });
        }
      }
      if (target < 0) target = 0;
      evicted = frames[target];
      if (evicted !== null) {
        loadedAt.delete(evicted);
        lastUsed.delete(evicted);
      }
      frames[target] = page;
      loadedAt.set(page, index);
      lastUsed.set(page, index);
    }
    steps.push({
      frames: frames.slice(),
      referenceIndex: index,
      page,
      fault,
      evicted,
      faults,
      hits,
    });
  });

  return steps;
}

function requireElement<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}

const dom = {
  frames: requireElement<HTMLElement>('#memFrames'),
  refs: requireElement<HTMLElement>('#memRefs'),
  algorithm: requireElement<HTMLSelectElement>('#memAlgorithm'),
  frameCount: requireElement<HTMLInputElement>('#memFrameCount'),
  frameValue: requireElement<HTMLElement>('#memFramesValue'),
  length: requireElement<HTMLInputElement>('#memLength'),
  lengthValue: requireElement<HTMLElement>('#memLengthValue'),
  seed: requireElement<HTMLInputElement>('#memSeed'),
  play: requireElement<HTMLButtonElement>('#memPlay'),
  step: requireElement<HTMLButtonElement>('#memStep'),
  reset: requireElement<HTMLButtonElement>('#memReset'),
  fresh: requireElement<HTMLButtonElement>('#memNew'),
  state: requireElement<HTMLElement>('#memState'),
  status: requireElement<HTMLElement>('#memStatusText'),
  faults: requireElement<HTMLElement>('#memFaults'),
  hits: requireElement<HTMLElement>('#memHits'),
  rate: requireElement<HTMLElement>('#memRate'),
  current: requireElement<HTMLElement>('#memCurrent'),
  insight: requireElement<HTMLElement>('#memInsight'),
  algoBadge: requireElement<HTMLElement>('#memAlgoBadge'),
  code: requireElement<HTMLElement>('#memCode'),
};

let algorithm: ReplacementAlgorithm = 'fifo';
let references = generateReferences(20, 2026);
let steps: MemoryStep[] = simulate(references, 3, algorithm);
let index = 0;
let playing = false;
let timer: number | null = null;

const algorithmNames: Record<ReplacementAlgorithm, string> = {
  fifo: 'FIFO',
  lru: 'LRU',
  opt: 'OPT',
};

function render(): void {
  const step = steps[index];
  dom.frames.replaceChildren();
  step.frames.forEach((page, slot) => {
    const frame = document.createElement('div');
    frame.className = `mem-frame${page === null ? ' is-empty' : ''}${step.evicted === page && page !== null ? ' is-evicted' : ''}`;
    const label = document.createElement('small');
    label.textContent = `帧 ${slot}`;
    const value = document.createElement('strong');
    value.textContent = page === null ? '空' : String(page);
    frame.append(label, value);
    dom.frames.appendChild(frame);
  });

  dom.refs.replaceChildren();
  references.forEach((page, refIndex) => {
    const node = document.createElement('span');
    node.className = 'mem-ref';
    node.textContent = String(page);
    if (refIndex === step.referenceIndex) {
      node.classList.add('is-current');
      node.classList.add(step.fault ? 'is-fault' : 'is-hit');
    } else if (refIndex < step.referenceIndex) {
      node.classList.add('is-past');
    }
    dom.refs.appendChild(node);
  });

  const total = step.hits + step.faults;
  dom.faults.textContent = String(step.faults);
  dom.hits.textContent = String(step.hits);
  dom.rate.textContent = total ? `${((step.hits / total) * 100).toFixed(1)}%` : '—';
  dom.current.textContent = step.page === null ? '—' : String(step.page);
  dom.algoBadge.textContent = algorithmNames[algorithm];
  dom.frameValue.textContent = String(steps[0].frames.length);
  dom.lengthValue.textContent = String(references.length);
  dom.state.textContent = playing ? 'RUNNING' : index >= steps.length - 1 ? 'DONE' : index > 0 ? 'PAUSED' : 'READY';
  dom.play.textContent = playing ? '暂停' : '播放';
  dom.status.textContent = step.page === null
    ? '内存为空，等待第一次引用。'
    : `本次 ${step.page}：${step.fault ? '缺页' : '命中'}${step.evicted !== null ? `，淘汰 ${step.evicted}` : ''} · 累计 ${step.faults} 缺页 / ${step.hits} 命中`;
  dom.insight.textContent = algorithm === 'fifo'
    ? 'FIFO 可能淘汰仍会被频繁使用的页；切到 LRU 观察命中率变化。'
    : algorithm === 'lru'
      ? 'LRU 更符合时间局部性；它的代价是每次访问都要更新最近使用顺序。'
      : 'OPT 是离线最优下界；它需要预知未来，不能直接用于真实系统。';
  dom.algorithm.value = algorithm;
  dom.code.textContent = algorithm === 'fifo'
    ? 'on fault:\n  if frame empty: fill frame\n  else: evict earliest loaded page'
    : algorithm === 'lru'
      ? 'on access:\n  update last_used[page]\non fault:\n  evict page with smallest last_used'
      : 'on fault:\n  evict page whose next use is farthest\n  (or never used again)';
  dom.play.disabled = false;
  dom.step.disabled = index >= steps.length - 1;
}

function stop(): void {
  playing = false;
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  if (dom.play) dom.play.textContent = '播放';
}

function stepOnce(): void {
  if (index >= steps.length - 1) {
    stop();
    render();
    return;
  }
  index += 1;
  render();
}

function play(): void {
  if (playing) {
    stop();
    render();
    return;
  }
  if (index >= steps.length - 1) {
    index = 0;
    render();
  }
  playing = true;
  dom.play.textContent = '暂停';
  timer = window.setInterval(() => {
    if (index >= steps.length - 1) {
      stop();
      render();
      return;
    }
    index += 1;
    render();
  }, 560);
}

function rebuild(): void {
  stop();
  const frames = Number(dom.frameCount.value);
  const length = Number(dom.length.value);
  const seed = Number(dom.seed.value) || 2026;
  references = generateReferences(length, seed);
  steps = simulate(references, frames, algorithm);
  index = 0;
  render();
}

function setAlgorithm(): void {
  algorithm = dom.algorithm.value as ReplacementAlgorithm;
  rebuild();
}

dom.algorithm.addEventListener('change', setAlgorithm);
dom.frameCount.addEventListener('input', rebuild);
dom.length.addEventListener('input', rebuild);
dom.seed.addEventListener('change', rebuild);
dom.play.addEventListener('click', play);
dom.step.addEventListener('click', () => {
  stop();
  stepOnce();
});
dom.reset.addEventListener('click', () => {
  stop();
  index = 0;
  render();
});
dom.fresh.addEventListener('click', () => {
  dom.seed.value = String((Number(dom.seed.value) || 2026) + 1);
  rebuild();
});

rebuild();
