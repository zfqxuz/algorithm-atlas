import type { ChartSpec, GraphSpec, MatrixSpec, TimelineSpec, TopologySpec, TreeSpec, VisualSpec } from './types';

type PlayerUpdate = (step: number, total: number, label: string) => void;

interface PlayerOptions {
  host: HTMLElement;
  auto?: boolean;
  progressive?: boolean;
  onUpdate?: PlayerUpdate;
}

const REDUCED_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function qsa(svg: SVGSVGElement, selector: string): SVGElement[] {
  return Array.from(svg.querySelectorAll<SVGElement>(selector));
}

function nodeSequence(spec: GraphSpec | TreeSpec): string[] {
  if (spec.type === 'graph') {
    if (spec.highlight?.length) return spec.highlight;
    return spec.nodes.map((node) => node.id);
  }
  if (spec.highlight?.length) return spec.highlight;
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const node of spec.nodes) {
    if (node.parent) {
      const list = children.get(node.parent) ?? [];
      list.push(node.id);
      children.set(node.parent, list);
    } else {
      roots.push(node.id);
    }
  }
  const order: string[] = [];
  const walk = (id: string) => {
    order.push(id);
    for (const child of children.get(id) ?? []) walk(child);
  };
  roots.forEach(walk);
  return order;
}

function primarySelector(spec: VisualSpec): string {
  switch (spec.type) {
    case 'bars': return '[data-vz="bar"]';
    case 'matrix': return '[data-vz="cell"]';
    case 'chart': return '[data-vz="dot"]';
    case 'graph':
    case 'tree': return '[data-vz="node"]';
    case 'pipeline': return '[data-vz="stage"]';
    case 'layers': return '[data-vz="layer"]';
    case 'timeline': return '[data-vz="block"]';
    case 'memory': return '[data-vz="cell"]';
    case 'table': return '[data-vz="table-cell"]';
    case 'stack': return '[data-vz="item"]';
    case 'vector': return '[data-vz="cell"]';
    case 'topology': return '[data-vz="node"]';
    default: return '[data-vz]';
  }
}

function labelFor(spec: VisualSpec, index: number): string {
  switch (spec.type) {
    case 'bars':
      return spec.labels?.[index] ?? String(spec.values[index] ?? '');
    case 'matrix': {
      const row = Math.floor(index / Math.max(1, spec.cells[0]?.length ?? 1));
      const col = index % Math.max(1, spec.cells[0]?.length ?? 1);
      return `${spec.rowLabels?.[row] ?? `行 ${row + 1}`} · ${spec.colLabels?.[col] ?? `列 ${col + 1}`}`;
    }
    case 'chart':
      return `t = ${spec.series[0]?.points[index]?.[0] ?? index}`;
    case 'graph':
    case 'tree': {
      const sequence = nodeSequence(spec);
      const id = sequence[index] ?? '';
      return spec.nodes.find((node) => node.id === id)?.label ?? id;
    }
    case 'pipeline':
      return spec.steps[index] ?? '';
    case 'layers':
      return spec.layers[index]?.label ?? '';
    case 'timeline':
      return `t = ${index}`;
    case 'memory':
      return spec.cells[index] ?? '';
    case 'table':
      return spec.rows[index]?.[0] ?? '';
    case 'stack':
      return spec.items[index] ?? '';
    case 'vector':
      return spec.labels?.[index] ?? `行 ${index + 1}`;
    case 'topology':
      return spec.labels?.[index] ?? '';
    default:
      return '';
  }
}

function totalFor(spec: VisualSpec, primary: SVGElement[]): number {
  switch (spec.type) {
    case 'timeline':
      return 10;
    case 'matrix':
      return Math.min(primary.length, 12);
    case 'chart':
      return Math.max(2, ...spec.series.map((series) => series.points.length));
    case 'graph':
    case 'tree':
      return Math.max(1, nodeSequence(spec).length);
    case 'table':
      return Math.max(1, spec.rows.length);
    case 'vector':
      return Math.max(1, spec.vectors.length);
    default:
      return Math.max(1, primary.length);
  }
}

export class VisualPlayer {
  readonly svg: SVGSVGElement;
  readonly spec: VisualSpec;
  readonly host: HTMLElement;
  readonly total: number;
  readonly primary: SVGElement[];
  private readonly auto: boolean;
  private readonly progressive: boolean;
  private readonly onUpdate?: PlayerUpdate;
  private stepIndex = 0;
  private timer = 0;
  private isPlaying = false;
  private isVisible = false;
  private lastFrame = 0;
  private playhead: SVGLineElement | null = null;
  private destroyed = false;

  constructor(svg: SVGSVGElement, spec: VisualSpec, options: PlayerOptions) {
    this.svg = svg;
    this.spec = spec;
    this.host = options.host;
    this.auto = options.auto !== false;
    this.progressive = options.progressive !== false;
    this.onUpdate = options.onUpdate;
    this.primary = qsa(svg, primarySelector(spec));
    this.total = totalFor(spec, this.primary);
    this.svg.classList.add('vz-anim');
    this.apply(0);
    if (REDUCED_MOTION) {
      this.setStep(this.total - 1);
      this.isPlaying = false;
    } else {
      this.isPlaying = this.auto;
      register(this);
    }
  }

  get step(): number {
    return this.stepIndex;
  }

  get stepLabel(): string {
    return labelFor(this.spec, this.stepIndex);
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
  }

  tick(now: number): void {
    if (this.destroyed || !this.isPlaying || !this.isVisible) return;
    if (now - this.lastFrame < 950) return;
    this.lastFrame = now;
    this.stepIndex = (this.stepIndex + 1) % this.total;
    this.apply(this.stepIndex);
  }

  play(): void {
    this.isPlaying = true;
  }

  pause(): void {
    this.isPlaying = false;
  }

  toggle(): boolean {
    this.isPlaying = !this.isPlaying;
    return this.isPlaying;
  }

  next(): void {
    this.pause();
    this.stepIndex = (this.stepIndex + 1) % this.total;
    this.apply(this.stepIndex);
  }

  reset(): void {
    this.pause();
    this.stepIndex = 0;
    this.apply(0);
  }

  setStep(step: number): void {
    this.stepIndex = Math.max(0, Math.min(this.total - 1, step));
    this.apply(this.stepIndex);
  }

  destroy(): void {
    this.destroyed = true;
    unregister(this);
    this.svg.classList.remove('vz-anim');
    for (const element of this.primary) {
      element.classList.remove('vz-seen', 'vz-active');
      element.removeAttribute('style');
    }
    for (const element of qsa(this.svg, '[data-vz="edge"]')) {
      element.classList.remove('vz-seen', 'vz-active');
    }
    this.playhead?.remove();
  }

  private apply(step: number): void {
    const activeIndex = this.total <= 1
      ? 0
      : Math.min(this.primary.length - 1, Math.floor((step / this.total) * this.primary.length));
    const progressive = this.progressive
      && !['pipeline', 'layers', 'timeline', 'memory', 'table', 'vector', 'topology'].includes(this.spec.type);
    if (this.spec.type === 'graph' || this.spec.type === 'tree') {
      const sequence = nodeSequence(this.spec);
      const activeId = sequence[Math.min(step, sequence.length - 1)];
      const seenIds = new Set(this.progressive ? sequence.slice(0, step + 1) : sequence);
      for (const node of qsa(this.svg, '[data-vz="node"]')) {
        const id = node.getAttribute('data-node') ?? '';
        node.classList.toggle('vz-seen', seenIds.has(id));
        node.classList.toggle('vz-active', id === activeId);
      }
      for (const edge of qsa(this.svg, '[data-vz="edge"]')) {
        const a = edge.getAttribute('data-a');
        const b = edge.getAttribute('data-b');
        const seen = Boolean(a && b && seenIds.has(a) && seenIds.has(b));
        edge.classList.toggle('vz-seen', seen);
        edge.classList.toggle('vz-active', Boolean(activeId && (a === activeId || b === activeId)));
      }
      this.onUpdate?.(step, this.total, this.stepLabel);
      return;
    }

    this.primary.forEach((element, index) => {
      element.classList.toggle('vz-seen', !progressive || index <= activeIndex);
      element.classList.toggle('vz-active', index === activeIndex);
    });

    if (this.spec.type === 'chart') {
      const chart = this.spec as ChartSpec;
      const progress = this.progressive ? (this.total <= 1 ? 1 : step / (this.total - 1)) : 1;
      for (const path of qsa(this.svg, '[data-vz="line"]')) {
        const length = path instanceof SVGPathElement ? path.getTotalLength() : 0;
        path.setAttribute('stroke-dasharray', String(length));
        path.setAttribute('stroke-dashoffset', String(length * (1 - progress)));
        path.classList.add('vz-seen');
      }
      // Keep only the dots that belong to the current progress.
      let dotIndex = 0;
      for (const series of chart.series) {
        for (let point = 0; point < series.points.length; point += 1) {
          const dot = this.svg.querySelector<SVGCircleElement>(`[data-vz="dot"][data-series="${chart.series.indexOf(series)}"][data-point="${point}"]`);
          dot?.classList.toggle('vz-seen', !this.progressive || dotIndex <= step);
          dot?.classList.toggle('vz-active', dotIndex === step);
          dotIndex += 1;
        }
      }
    }

    if (this.spec.type === 'matrix') {
      const cells = this.spec.cells;
      const cols = Math.max(1, cells[0]?.length ?? 1);
      const col = activeIndex % cols;
      const row = Math.floor(activeIndex / cols);
      for (const cell of qsa(this.svg, '[data-vz="cell"]')) {
        const cellRow = Number(cell.getAttribute('data-row'));
        const cellCol = Number(cell.getAttribute('data-col'));
        const seen = !this.progressive || cellRow < row || (cellRow === row && cellCol <= col);
        cell.classList.toggle('vz-seen', seen);
        cell.classList.toggle('vz-active', cellRow === row && cellCol === col);
      }
    }

    if (this.spec.type === 'timeline') {
      const timeline = this.spec as TimelineSpec;
      const max = timeline.max ?? Math.max(1, ...timeline.rows.flatMap((row) => row.blocks.map((block) => block.end)));
      const time = this.total <= 1 ? 0 : (step / (this.total - 1)) * max;
      const x = 58 + (time / max) * 288;
      if (!this.playhead) {
        this.playhead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this.playhead.setAttribute('class', 'vz-playhead');
        this.playhead.setAttribute('y1', '30');
        this.playhead.setAttribute('y2', '164');
        this.svg.appendChild(this.playhead);
      }
      this.playhead.setAttribute('x1', String(x));
      this.playhead.setAttribute('x2', String(x));
      for (const block of qsa(this.svg, '[data-vz="block"]')) {
        const row = Number(block.getAttribute('data-row'));
        const blocks = timeline.rows[row]?.blocks ?? [];
        // Blocks are all visible; the playhead is the temporal focus.
        block.classList.add('vz-seen');
        block.classList.remove('vz-active');
        block.classList.toggle('vz-active', blocks.some((item) => time >= item.start && time <= item.end));
      }
    }

    if (this.spec.type === 'table') {
      for (const cell of qsa(this.svg, '[data-vz="table-cell"]')) {
        const row = Number(cell.getAttribute('data-row'));
        cell.classList.add('vz-seen');
        cell.classList.toggle('vz-active', row === step);
      }
    }

    if (this.spec.type === 'vector') {
      for (const cell of qsa(this.svg, '[data-vz="cell"]')) {
        const row = Number(cell.getAttribute('data-row'));
        cell.classList.add('vz-seen');
        cell.classList.toggle('vz-active', row === step);
      }
    }

    if (this.spec.type === 'table' || this.spec.type === 'vector') {
      for (const element of this.primary) {
        const row = Number(element.getAttribute('data-row'));
        if (Number.isFinite(row)) element.classList.toggle('vz-active', row === step);
      }
    }

    if (this.spec.type === 'topology') {
      const activeNode = this.primary[activeIndex]?.getAttribute('data-node');
      for (const edge of qsa(this.svg, '[data-vz="edge"]')) {
        edge.classList.add('vz-seen');
        edge.classList.toggle('vz-active', Boolean(activeNode && (edge.getAttribute('data-a') === activeNode || edge.getAttribute('data-b') === activeNode)));
      }
    }

    this.onUpdate?.(step, this.total, this.stepLabel);
  }
}

const players = new Set<VisualPlayer>();
const observed = new WeakMap<Element, VisualPlayer>();
let raf = 0;

function loop(now: number): void {
  for (const player of players) player.tick(now);
  raf = window.requestAnimationFrame(loop);
}

function register(player: VisualPlayer): void {
  players.add(player);
  observed.set(player.host, player);
  observer?.observe(player.host);
  if (!raf) raf = window.requestAnimationFrame(loop);
}

function unregister(player: VisualPlayer): void {
  players.delete(player);
  observed.delete(player.host);
  observer?.unobserve(player.host);
  if (!players.size && raf) {
    window.cancelAnimationFrame(raf);
    raf = 0;
  }
}

const observer = typeof window !== 'undefined' && 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const player = observed.get(entry.target);
        player?.setVisible(entry.isIntersecting);
      }
    }, { rootMargin: '80px', threshold: 0.08 })
  : null;

export function createVisualPlayer(
  svg: SVGSVGElement,
  spec: VisualSpec,
  options: PlayerOptions,
): VisualPlayer {
  return new VisualPlayer(svg, spec, options);
}
