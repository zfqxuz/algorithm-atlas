export const TOKENS = ['寻', '径', '让', '算', '法', '可', '见'] as const;
export const DIM = 8;

export interface AttentionResult {
  scores: number[][];
  weights: number[][];
  outputs: number[][];
  q: number[][];
  k: number[][];
  v: number[][];
}

function embedding(tokenIndex: number): number[] {
  return Array.from({ length: DIM }, (_, dimension) => {
    const base = Math.sin((tokenIndex + 1) * (dimension + 2) * 0.53) * 0.9
      + Math.cos((tokenIndex + 1) * (dimension + 1) * 0.21) * 0.35;
    const position = Math.sin(tokenIndex / 10 ** (dimension / 4)) * 0.35;
    return base + position;
  });
}

export const embeddings: number[][] = TOKENS.map((_, index) => embedding(index));

function projectionWeight(head: number, kind: number, output: number, input: number): number {
  const phase = (output + 1) * 0.37 + (input + 1) * 0.61 + head * 1.7 + kind * 2.3;
  return 0.55 * Math.sin(phase) + 0.2 * Math.cos((output + 1) * (input + 1) * 0.11 + head);
}

function project(vector: number[], head: number, kind: number): number[] {
  return Array.from({ length: DIM }, (_, output) => {
    let value = 0;
    for (let input = 0; input < DIM; input += 1) {
      value += vector[input] * projectionWeight(head, kind, output, input);
    }
    return value;
  });
}

export function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - max));
  const total = exps.reduce((sum, value) => sum + value, 0) || 1;
  return exps.map((value) => value / total);
}

export function computeAttention(head: number, causal: boolean): AttentionResult {
  const q = embeddings.map((vector) => project(vector, head, 0));
  const k = embeddings.map((vector) => project(vector, head, 1));
  const v = embeddings.map((vector) => project(vector, head, 2));
  const scores = q.map((query, row) => k.map((key, col) => {
    if (causal && col > row) return -Infinity;
    let dot = 0;
    for (let dimension = 0; dimension < DIM; dimension += 1) {
      dot += query[dimension] * key[dimension];
    }
    return dot / Math.sqrt(DIM);
  }));
  const weights = scores.map((row) => softmax(row));
  const outputs = weights.map((row) => Array.from({ length: DIM }, (_, dimension) => {
    let sum = 0;
    for (let token = 0; token < TOKENS.length; token += 1) sum += row[token] * v[token][dimension];
    return sum;
  }));
  return { scores, weights, outputs, q, k, v };
}

export function entropy(row: number[]): number {
  return -row.reduce((sum, value) => (value > 0 ? sum + value * Math.log(value) : sum), 0);
}

function norm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

const HEADS = [
  'Head 1 · 句法',
  'Head 2 · 指代',
  'Head 3 · 位置',
];

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}

const dom = {
  tokens: requireElement<HTMLElement>('#attnTokens'),
  matrix: requireElement<HTMLElement>('#attnMatrix'),
  bars: requireElement<HTMLElement>('#attnBars'),
  query: requireElement<HTMLElement>('#attnQuery'),
  note: requireElement<HTMLElement>('#attnNote'),
  status: requireElement<HTMLElement>('#attnStatus'),
  head: requireElement<HTMLSelectElement>('#attnHead'),
  causal: requireElement<HTMLInputElement>('#attnCausal'),
  prev: requireElement<HTMLButtonElement>('#attnPrev'),
  next: requireElement<HTMLButtonElement>('#attnNext'),
  headBadge: requireElement<HTMLElement>('#attnHeadBadge'),
  state: requireElement<HTMLElement>('#attnState'),
  rowSum: requireElement<HTMLElement>('#attnRowSum'),
  top: requireElement<HTMLElement>('#attnTop'),
  entropy: requireElement<HTMLElement>('#attnEntropy'),
  outputNorm: requireElement<HTMLElement>('#attnNorm'),
  insight: requireElement<HTMLElement>('#attnInsight'),
  code: requireElement<HTMLElement>('#attnCode'),
};

let head = 0;
let causal = true;
let queryIndex = 0;

function rgba(alpha: number): string {
  return `rgba(191, 91, 59, ${alpha.toFixed(3)})`;
}

function render(): void {
  const result = computeAttention(head, causal);
  const weights = result.weights[queryIndex];
  const masked = (index: number) => causal && index > queryIndex;
  const allowed = TOKENS.map((token, index) => ({ token, index, weight: masked(index) ? -1 : weights[index] }))
    .filter((item) => item.weight >= 0);
  const top = allowed.slice().sort((a, b) => b.weight - a.weight)[0];
  const rowEntropy = entropy(weights);

  dom.headBadge.textContent = HEADS[head];
  dom.state.textContent = causal ? 'CAUSAL' : 'BIDIRECTIONAL';
  dom.query.textContent = TOKENS[queryIndex];
  dom.tokens.replaceChildren();
  TOKENS.forEach((token, index) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `attn-token${index === queryIndex ? ' is-active' : ''}${masked(index) ? ' is-masked' : ''}`;
    chip.textContent = token;
    chip.setAttribute('aria-pressed', String(index === queryIndex));
    chip.addEventListener('click', () => {
      queryIndex = index;
      render();
    });
    dom.tokens.appendChild(chip);
  });

  const table = document.createElement('table');
  table.className = 'attn-matrix';
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.appendChild(document.createElement('th'));
  TOKENS.forEach((token) => {
    const cell = document.createElement('th');
    cell.textContent = token;
    headerRow.appendChild(cell);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  TOKENS.forEach((rowToken, row) => {
    const tr = document.createElement('tr');
    if (row === queryIndex) tr.className = 'is-query';
    const rowHead = document.createElement('th');
    rowHead.textContent = rowToken;
    tr.appendChild(rowHead);
    TOKENS.forEach((_, col) => {
      const cell = document.createElement('td');
      if (causal && col > row) {
        cell.textContent = '—';
        cell.className = 'is-mask';
      } else {
        const weight = result.weights[row][col];
        cell.textContent = weight.toFixed(2);
        cell.style.background = rgba(0.035 + weight * 0.62);
        if (row === queryIndex) cell.classList.add('is-hot');
        if (row === queryIndex && col === (top?.index ?? -1)) cell.classList.add('is-top');
      }
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  dom.matrix.replaceChildren(table);

  dom.bars.replaceChildren();
  TOKENS.forEach((token, index) => {
    const row = document.createElement('div');
    row.className = 'attn-bar-row';
    const label = document.createElement('span');
    label.className = 'attn-bar-label';
    label.textContent = token;
    const track = document.createElement('div');
    track.className = 'attn-bar-track';
    const fill = document.createElement('span');
    const value = masked(index) ? 0 : weights[index];
    fill.style.width = `${(value * 100).toFixed(1)}%`;
    fill.className = masked(index) ? 'is-masked' : '';
    track.appendChild(fill);
    const number = document.createElement('span');
    number.className = 'attn-bar-value';
    number.textContent = masked(index) ? '—' : weightText(value);
    row.append(label, track, number);
    dom.bars.appendChild(row);
  });

  dom.rowSum.textContent = '1.000';
  dom.top.textContent = top ? `${top.token} · ${(top.weight * 100).toFixed(0)}%` : '—';
  dom.entropy.textContent = rowEntropy.toFixed(2);
  dom.outputNorm.textContent = norm(result.outputs[queryIndex]).toFixed(2);
  dom.note.textContent = top
    ? `查询「${TOKENS[queryIndex]}」最关注「${top.token}」，权重 ${(top.weight * 100).toFixed(0)}%。` 
    : '当前行没有可见 token。';
  dom.insight.textContent = [
    'Head 1 更偏向局部与相邻 token；切换 head 观察注意力如何重新分配。',
    'Head 2 尝试捕捉远距离指代；不同查询行会呈现不同的关注模式。',
    'Head 3 混合了位置与全局信息；对比因果/双向模式下每行的可见范围。',
  ][head];
  dom.prev.disabled = queryIndex <= 0;
  dom.next.disabled = queryIndex >= TOKENS.length - 1;
  dom.code.textContent = [
    'Q = X W_Q    K = X W_K    V = X W_V',
    'S = Q Kᵀ / √d',
    causal ? 'S[i,j] = -∞  for j > i' : 'S 不屏蔽未来位置',
    'A = softmax(S, dim=-1)',
    'O = A V',
  ].join('\n');
}

function weightText(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

dom.head.addEventListener('change', () => {
  head = Number(dom.head.value);
  render();
});
dom.causal.addEventListener('change', () => {
  causal = dom.causal.checked;
  render();
});
dom.prev.addEventListener('click', () => {
  queryIndex = Math.max(0, queryIndex - 1);
  render();
});
dom.next.addEventListener('click', () => {
  queryIndex = Math.min(TOKENS.length - 1, queryIndex + 1);
  render();
});

render();
