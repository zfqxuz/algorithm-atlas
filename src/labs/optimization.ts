export type AlgorithmId = 'gd' | 'momentum' | 'rmsprop' | 'adam';
export type FunctionId = 'bowl' | 'valley' | 'anisotropic';

export interface LossFunction {
  id: FunctionId;
  name: string;
  fn: (x: number, y: number) => number;
  grad: (x: number, y: number) => [number, number];
  xRange: [number, number];
  yRange: [number, number];
  start: [number, number];
  optimum: [number, number];
  defaultLearningRate: number;
}

export interface OptimizerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mx: number;
  my: number;
  sx: number;
  sy: number;
  t: number;
}

export const algorithms: Record<AlgorithmId, { name: string; short: string }> = {
  gd: { name: 'Gradient Descent', short: 'GD' },
  momentum: { name: 'Momentum', short: 'Momentum' },
  rmsprop: { name: 'RMSProp', short: 'RMSProp' },
  adam: { name: 'Adam', short: 'Adam' },
};

export const lossFunctions: Record<FunctionId, LossFunction> = {
  bowl: {
    id: 'bowl',
    name: '椭圆碗 x² + 4y²',
    fn: (x, y) => x * x + 4 * y * y,
    grad: (x, y) => [2 * x, 8 * y],
    xRange: [-3, 3],
    yRange: [-3, 3],
    start: [-2.55, 2.05],
    optimum: [0, 0],
    defaultLearningRate: 0.08,
  },
  valley: {
    id: 'valley',
    name: 'Rosenbrock 峡谷',
    fn: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    grad: (x, y) => [
      -2 * (1 - x) - 400 * x * (y - x * x),
      200 * (y - x * x),
    ],
    xRange: [-2, 2],
    yRange: [-1, 3],
    start: [-1.7, 2.25],
    optimum: [1, 1],
    defaultLearningRate: 0.0018,
  },
  anisotropic: {
    id: 'anisotropic',
    name: '各向异性二次型 ½x² + 4y²',
    fn: (x, y) => 0.5 * x * x + 4 * y * y,
    grad: (x, y) => [x, 8 * y],
    xRange: [-3, 3],
    yRange: [-3, 3],
    start: [-2.4, 1.8],
    optimum: [0, 0],
    defaultLearningRate: 0.1,
  },
};

export function initialState(start: [number, number]): OptimizerState {
  return { x: start[0], y: start[1], vx: 0, vy: 0, mx: 0, my: 0, sx: 0, sy: 0, t: 0 };
}

export function applyStep(
  state: OptimizerState,
  loss: LossFunction,
  algorithm: AlgorithmId,
  learningRate: number,
): OptimizerState {
  const [gx, gy] = loss.grad(state.x, state.y);
  const next: OptimizerState = { ...state, t: state.t + 1 };
  const beta = 0.9;
  const eps = 1e-8;
  switch (algorithm) {
    case 'gd':
      next.x -= learningRate * gx;
      next.y -= learningRate * gy;
      break;
    case 'momentum':
      next.vx = beta * state.vx + gx;
      next.vy = beta * state.vy + gy;
      next.x -= learningRate * next.vx;
      next.y -= learningRate * next.vy;
      break;
    case 'rmsprop':
      next.sx = 0.9 * state.sx + 0.1 * gx * gx;
      next.sy = 0.9 * state.sy + 0.1 * gy * gy;
      next.x -= learningRate * gx / (Math.sqrt(next.sx) + eps);
      next.y -= learningRate * gy / (Math.sqrt(next.sy) + eps);
      break;
    case 'adam': {
      next.mx = 0.9 * state.mx + 0.1 * gx;
      next.my = 0.9 * state.my + 0.1 * gy;
      next.sx = 0.999 * state.sx + 0.001 * gx * gx;
      next.sy = 0.999 * state.sy + 0.001 * gy * gy;
      const mxHat = next.mx / (1 - 0.9 ** next.t);
      const myHat = next.my / (1 - 0.9 ** next.t);
      const sxHat = next.sx / (1 - 0.999 ** next.t);
      const syHat = next.sy / (1 - 0.999 ** next.t);
      next.x -= learningRate * mxHat / (Math.sqrt(sxHat) + eps);
      next.y -= learningRate * myHat / (Math.sqrt(syHat) + eps);
      break;
    }
    default:
      break;
  }
  return next;
}

export function runOptimization(
  loss: LossFunction,
  algorithm: AlgorithmId,
  learningRate: number,
  steps: number,
  start: [number, number] = loss.start,
): OptimizerState[] {
  const states = [initialState(start)];
  for (let index = 0; index < steps; index += 1) {
    states.push(applyStep(states[states.length - 1], loss, algorithm, learningRate));
  }
  return states;
}

function format(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1000) return value.toExponential(1);
  return value.toFixed(3);
}

const svgNS = 'http://www.w3.org/2000/svg';
const WIDTH = 560;
const HEIGHT = 400;
const PAD = { left: 48, right: 18, top: 24, bottom: 38 };

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function text(content: string, x: number, y: number, attrs: Record<string, string | number> = {}): SVGTextElement {
  const node = el('text', { x, y, ...attrs });
  node.textContent = content;
  return node;
}

function requireElement<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing element ${selector}`);
  return node;
}

const dom = {
  functionSelect: requireElement<HTMLSelectElement>('#optFunction'),
  algorithmSelect: requireElement<HTMLSelectElement>('#optAlgorithm'),
  learning: requireElement<HTMLInputElement>('#optLearning'),
  learningValue: requireElement<HTMLElement>('#optLearningValue'),
  stage: requireElement<HTMLElement>('#optStage'),
  play: requireElement<HTMLButtonElement>('#optPlay'),
  step: requireElement<HTMLButtonElement>('#optStep'),
  reset: requireElement<HTMLButtonElement>('#optReset'),
  iteration: requireElement<HTMLElement>('#optIteration'),
  loss: requireElement<HTMLElement>('#optLoss'),
  gradient: requireElement<HTMLElement>('#optGradient'),
  position: requireElement<HTMLElement>('#optPosition'),
  status: requireElement<HTMLElement>('#optStatus'),
  statusText: requireElement<HTMLElement>('#optStatusText'),
  insight: requireElement<HTMLElement>('#optInsight'),
  algoBadge: requireElement<HTMLElement>('#optAlgoBadge'),
  code: requireElement<HTMLElement>('#optCode'),
  stateBadge: requireElement<HTMLElement>('#optStateBadge'),
};

let loss = lossFunctions.bowl;
let algorithm: AlgorithmId = 'gd';
let state = initialState(loss.start);
let trajectory: Array<[number, number]> = [loss.start];
let playing = false;
let timer: number | null = null;
let svg: SVGSVGElement | null = null;
let pathEl: SVGPathElement | null = null;
let currentEl: SVGCircleElement | null = null;
let gradientEl: SVGLineElement | null = null;

const mapX = (x: number) => PAD.left + ((x - loss.xRange[0]) / (loss.xRange[1] - loss.xRange[0])) * (WIDTH - PAD.left - PAD.right);
const mapY = (y: number) => HEIGHT - PAD.bottom - ((y - loss.yRange[0]) / (loss.yRange[1] - loss.yRange[0])) * (HEIGHT - PAD.top - PAD.bottom);

function learningRate(): number {
  return Number(dom.learning.value) / 1000;
}

function renderLandscape(): void {
  dom.stage.replaceChildren();
  svg = el('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'vz', role: 'img', 'aria-label': '损失地形热力图与下降轨迹' });
  const columns = 34;
  const rows = 24;
  const cellW = (WIDTH - PAD.left - PAD.right) / columns;
  const cellH = (HEIGHT - PAD.top - PAD.bottom) / rows;
  const gridValues: number[][] = [];
  let min = Infinity;
  let max = -Infinity;
  for (let row = 0; row <= rows; row += 1) {
    const line: number[] = [];
    for (let col = 0; col <= columns; col += 1) {
      const x = loss.xRange[0] + (col / columns) * (loss.xRange[1] - loss.xRange[0]);
      const y = loss.yRange[0] + (row / rows) * (loss.yRange[1] - loss.yRange[0]);
      const value = Math.log1p(loss.fn(x, y));
      line.push(value);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    gridValues.push(line);
  }
  const span = Math.max(1e-6, max - min);
  const levels = [0.08, 0.2, 0.34, 0.5, 0.67, 0.84];
  levels.forEach((fraction, levelIndex) => {
    const level = min + fraction * span;
    let d = '';
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const x0 = PAD.left + col * cellW;
        const x1 = x0 + cellW;
        const y0 = PAD.top + row * cellH;
        const y1 = y0 + cellH;
        const v00 = gridValues[row]?.[col] ?? min;
        const v10 = gridValues[row]?.[col + 1] ?? min;
        const v11 = gridValues[row + 1]?.[col + 1] ?? min;
        const v01 = gridValues[row + 1]?.[col] ?? min;
        const edges: Array<[number, number, number, number]> = [];
        const edge = (a: number, b: number, ax: number, ay: number, bx: number, by: number) => {
          if ((a < level) === (b < level)) return;
          const t = (level - a) / (b - a || 1e-9);
          edges.push([ax + (bx - ax) * t, ay + (by - ay) * t, 0, 0]);
        };
        edge(v00, v10, x0, y0, x1, y0);
        edge(v10, v11, x1, y0, x1, y1);
        edge(v11, v01, x1, y1, x0, y1);
        edge(v01, v00, x0, y1, x0, y0);
        if (edges.length === 2) {
          d += `M ${edges[0][0].toFixed(2)} ${edges[0][1].toFixed(2)} L ${edges[1][0].toFixed(2)} ${edges[1][1].toFixed(2)} `;
        } else if (edges.length === 4) {
          d += `M ${edges[0][0].toFixed(2)} ${edges[0][1].toFixed(2)} L ${edges[1][0].toFixed(2)} ${edges[1][1].toFixed(2)} `;
          d += `M ${edges[2][0].toFixed(2)} ${edges[2][1].toFixed(2)} L ${edges[3][0].toFixed(2)} ${edges[3][1].toFixed(2)} `;
        }
      }
    }
    if (d && svg) {
      svg.appendChild(el('path', {
        d,
        fill: 'none',
        stroke: '#bf5b3b',
        'stroke-width': levelIndex < 2 ? 0.65 : 0.9,
        'stroke-opacity': (0.18 + levelIndex * 0.055).toFixed(3),
      }));
    }
  });
  svg.appendChild(el('rect', {
    x: PAD.left, y: PAD.top, width: WIDTH - PAD.left - PAD.right, height: HEIGHT - PAD.top - PAD.bottom,
    fill: 'none', stroke: '#d8cec0',
  }));
  for (let i = 0; i <= 4; i += 1) {
    const x = PAD.left + (i / 4) * (WIDTH - PAD.left - PAD.right);
    const y = HEIGHT - PAD.bottom - (i / 4) * (HEIGHT - PAD.top - PAD.bottom);
    svg.appendChild(text((loss.xRange[0] + (i / 4) * (loss.xRange[1] - loss.xRange[0])).toFixed(1), x, HEIGHT - 14, { 'text-anchor': 'middle', class: 'vz-sub' }));
    svg.appendChild(text((loss.yRange[0] + (i / 4) * (loss.yRange[1] - loss.yRange[0])).toFixed(1), PAD.left - 8, y + 3, { 'text-anchor': 'end', class: 'vz-sub' }));
  }
  const [ox, oy] = loss.optimum;
  svg.appendChild(el('circle', { cx: mapX(ox), cy: mapY(oy), r: 6, fill: 'none', stroke: '#5f7350', 'stroke-width': 1.8 }));
  svg.appendChild(text('opt', mapX(ox) + 9, mapY(oy) + 3, { class: 'vz-sub' }));
  const [sx, sy] = loss.start;
  svg.appendChild(el('circle', { cx: mapX(sx), cy: mapY(sy), r: 4, fill: '#fffdf8', stroke: '#8f826f', 'stroke-width': 1.4 }));

  pathEl = el('path', { fill: 'none', stroke: '#bf5b3b', 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  svg.appendChild(pathEl);
  gradientEl = el('line', { stroke: '#9a6c25', 'stroke-width': 1.6, 'marker-end': 'url(#opt-arrow)' });
  const defs = el('defs');
  const marker = el('marker', { id: 'opt-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' });
  marker.appendChild(el('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#9a6c25' }));
  defs.appendChild(marker);
  svg.appendChild(defs);
  svg.appendChild(gradientEl);
  currentEl = el('circle', { r: 5.5, fill: '#bf5b3b', stroke: '#fffdf8', 'stroke-width': 2 });
  svg.appendChild(currentEl);
  svg.addEventListener('click', (event) => {
    const node = svg;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const py = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    const x = loss.xRange[0] + ((px - PAD.left) / (WIDTH - PAD.left - PAD.right)) * (loss.xRange[1] - loss.xRange[0]);
    const y = loss.yRange[0] + ((HEIGHT - PAD.bottom - py) / (HEIGHT - PAD.top - PAD.bottom)) * (loss.yRange[1] - loss.yRange[0]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    stop();
    trajectory = [[x, y]];
    state = initialState([x, y]);
    drawDynamic();
    updateMetrics();
    dom.statusText.textContent = '已重设起点。';
  });
  dom.stage.appendChild(svg);
  drawDynamic();
}

function drawDynamic(): void {
  if (!pathEl || !currentEl || !gradientEl) return;
  const d = trajectory.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${mapX(x).toFixed(2)} ${mapY(y).toFixed(2)}`).join(' ');
  pathEl.setAttribute('d', d);
  currentEl.setAttribute('cx', mapX(state.x).toFixed(2));
  currentEl.setAttribute('cy', mapY(state.y).toFixed(2));
  const [gx, gy] = loss.grad(state.x, state.y);
  const norm = Math.hypot(gx, gy);
  const scale = norm > 0 ? Math.min(34, 12 + 220 / Math.max(1, norm)) : 0;
  const ux = norm > 0 ? gx / norm : 0;
  const uy = norm > 0 ? gy / norm : 0;
  gradientEl.setAttribute('x1', mapX(state.x).toFixed(2));
  gradientEl.setAttribute('y1', mapY(state.y).toFixed(2));
  gradientEl.setAttribute('x2', (mapX(state.x) + ux * scale).toFixed(2));
  gradientEl.setAttribute('y2', (mapY(state.y) - uy * scale).toFixed(2));
  gradientEl.setAttribute('opacity', norm > 1e-6 ? '0.9' : '0');
}

function updateMetrics(): void {
  const value = loss.fn(state.x, state.y);
  const [gx, gy] = loss.grad(state.x, state.y);
  const norm = Math.hypot(gx, gy);
  dom.iteration.textContent = String(state.t);
  dom.loss.textContent = format(value);
  dom.gradient.textContent = format(norm);
  dom.position.textContent = `${state.x.toFixed(2)}, ${state.y.toFixed(2)}`;
  dom.learningValue.textContent = learningRate().toFixed(3);
  dom.algorithmSelect.value = algorithm;
  dom.functionSelect.value = loss.id;
  dom.algoBadge.textContent = algorithms[algorithm].name;
  dom.stateBadge.textContent = playing ? 'RUNNING' : state.t > 0 ? 'PAUSED' : 'READY';
  dom.status.textContent = playing ? 'RUNNING' : state.t > 0 ? 'PAUSED' : 'READY';
  gradientEl?.setAttribute('opacity', norm > 1e-6 ? '0.9' : '0');
}

function updateCode(): void {
  const lines: Record<AlgorithmId, string> = {
    gd: 'for t in 1..T:\n  g = ∇f(x_t)\n  x_{t+1} = x_t - η g',
    momentum: 'v_{t+1} = β v_t + ∇f(x_t)\nx_{t+1} = x_t - η v_{t+1}\n# β 通常取 0.9',
    rmsprop: 's_{t+1} = 0.9 s_t + 0.1 g²\nx_{t+1} = x_t - η g / (√s_{t+1} + ε)',
    adam: 'm = β₁m + (1-β₁)g\ns = β₂s + (1-β₂)g²\nm̂ = m/(1-β₁ᵗ), ŝ = s/(1-β₂ᵗ)\nx = x - η m̂/(√ŝ + ε)',
  };
  dom.code.textContent = lines[algorithm];
}

function updateInsight(): void {
  if (loss.id === 'valley') {
    dom.insight.textContent = 'Rosenbrock 峡谷的梯度尺度差异极大；普通 GD 容易在陡壁间来回震荡，动量与自适应步长通常更稳。';
  } else if (loss.id === 'bowl') {
    dom.insight.textContent = '椭圆碗是二次型，条件数 4；学习率过大时轨迹会越过谷底并震荡。比较 GD 与动量的收敛速度。';
  } else {
    dom.insight.textContent = '各向异性二次型在 y 方向更陡；观察不同优化器是否能在两个方向上采用不同的有效步长。';
  }
}

function stop(): void {
  playing = false;
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  dom.play.textContent = '播放';
  dom.stateBadge.textContent = state.t > 0 ? 'PAUSED' : 'READY';
  dom.status.textContent = dom.stateBadge.textContent;
}

function step(): void {
  if (state.t >= 320) {
    stop();
    dom.statusText.textContent = '已达到最大迭代步数。';
    return;
  }
  state = applyStep(state, loss, algorithm, learningRate());
  trajectory.push([state.x, state.y]);
  drawDynamic();
  updateMetrics();
  if (state.t % 20 === 0) dom.statusText.textContent = `第 ${state.t} 步：f=${format(loss.fn(state.x, state.y))}，|∇f|=${format(Math.hypot(...loss.grad(state.x, state.y)))}。`;
}

function play(): void {
  if (playing) {
    stop();
    return;
  }
  if (state.t >= 320) reset();
  playing = true;
  dom.play.textContent = '暂停';
  dom.status.textContent = 'RUNNING';
  dom.stateBadge.textContent = 'RUNNING';
  timer = window.setInterval(() => {
    step();
    if (state.t >= 320) stop();
  }, 70);
}

function reset(): void {
  stop();
  state = initialState(loss.start);
  trajectory = [loss.start];
  renderLandscape();
  updateMetrics();
  updateCode();
  updateInsight();
  dom.statusText.textContent = `${loss.name} · 起点 (${loss.start[0]}, ${loss.start[1]})。`;
}

dom.functionSelect.addEventListener('change', () => {
  loss = lossFunctions[dom.functionSelect.value as FunctionId] ?? lossFunctions.bowl;
  dom.learning.value = String(Math.round(loss.defaultLearningRate * 1000));
  reset();
});
dom.algorithmSelect.addEventListener('change', () => {
  stop();
  algorithm = dom.algorithmSelect.value as AlgorithmId;
  updateCode();
  reset();
});
dom.learning.addEventListener('input', () => {
  stop();
  updateMetrics();
  dom.statusText.textContent = `学习率 η = ${learningRate().toFixed(3)}。`;
});
dom.play.addEventListener('click', play);
dom.step.addEventListener('click', () => {
  stop();
  step();
});
dom.reset.addEventListener('click', reset);

algorithm = (dom.algorithmSelect.value as AlgorithmId) || 'gd';
loss = lossFunctions[dom.functionSelect.value as FunctionId] ?? lossFunctions.bowl;
dom.learning.value = String(Math.round(loss.defaultLearningRate * 1000));
reset();
