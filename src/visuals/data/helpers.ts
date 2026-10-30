import type {
  BarsSpec,
  ChartSpec,
  DomainId,
  Entry,
  GraphEdge,
  GraphSpec,
  LayersSpec,
  Level,
  MatrixSpec,
  MemorySpec,
  PipelineSpec,
  Series,
  StackSpec,
  TableSpec,
  TimelineRow,
  TimelineSpec,
  TreeSpec,
  TopologyKind,
  TopologySpec,
  VectorSpec,
  VisualSpec,
} from '../types';

export function bars(values: number[], options: Omit<BarsSpec, 'type' | 'values'> = {}): BarsSpec {
  return { type: 'bars', values, ...options };
}

export function matrix(cells: Array<Array<string | number>>, options: Omit<MatrixSpec, 'type' | 'cells'> = {}): MatrixSpec {
  return { type: 'matrix', cells, ...options };
}

export function chart(series: Series[], options: Omit<ChartSpec, 'type' | 'series'> = {}): ChartSpec {
  return { type: 'chart', series, ...options };
}

export function graph(
  nodes: Array<[string, string, number?, number?]>,
  edges: Array<[string, string, string?, boolean?]>,
  options: Omit<GraphSpec, 'type' | 'nodes' | 'edges'> = {},
): GraphSpec {
  return {
    type: 'graph',
    nodes: nodes.map(([id, label, x, y]) => ({ id, label, x, y })),
    edges: edges.map(([a, b, label, hot]) => ({ a, b, label, hot })) as GraphEdge[],
    ...options,
  };
}

export function tree(
  nodes: Array<[string, string, string | null]>,
  options: Omit<TreeSpec, 'type' | 'nodes'> = {},
): TreeSpec {
  return { type: 'tree', nodes: nodes.map(([id, label, parent]) => ({ id, label, parent })), ...options };
}

export function pipeline(steps: string[], options: Omit<PipelineSpec, 'type' | 'steps'> = {}): PipelineSpec {
  return { type: 'pipeline', steps, ...options };
}

export function layers(layersList: Array<string | [string, string]>, options: Omit<LayersSpec, 'type' | 'layers'> = {}): LayersSpec {
  return {
    type: 'layers',
    layers: layersList.map((layer) => (Array.isArray(layer) ? { label: layer[0], sub: layer[1] } : { label: layer })),
    ...options,
  };
}

export function timeline(rows: TimelineRow[], options: Omit<TimelineSpec, 'type' | 'rows'> = {}): TimelineSpec {
  return { type: 'timeline', rows, ...options };
}

export function memory(cells: string[], options: Omit<MemorySpec, 'type' | 'cells'> = {}): MemorySpec {
  return { type: 'memory', cells, ...options };
}

export function table(columns: string[], rows: string[][], options: Omit<TableSpec, 'type' | 'columns' | 'rows'> = {}): TableSpec {
  return { type: 'table', columns, rows, ...options };
}

export function stack(items: string[], options: Omit<StackSpec, 'type' | 'items'> = {}): StackSpec {
  return { type: 'stack', items, ...options };
}

export function vector(vectors: number[][], options: Omit<VectorSpec, 'type' | 'vectors'> = {}): VectorSpec {
  return { type: 'vector', vectors, ...options };
}

export function topology(
  kind: TopologyKind,
  options: Omit<TopologySpec, 'type' | 'kind'> = {},
): TopologySpec {
  return { type: 'topology', kind, ...options };
}

export function entry(
  id: string,
  domain: DomainId,
  level: Level,
  title: string,
  en: string,
  tags: string[],
  summary: string,
  visual: VisualSpec,
  mechanism: string,
  observe: string,
  links: Array<[string, string]> = [],
): Entry {
  return { id, domain, level, title, en, tags, summary, visual, mechanism, observe, links };
}
