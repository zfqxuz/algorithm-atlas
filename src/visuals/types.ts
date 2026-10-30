export type Level = 'L1' | 'L2' | 'L3' | 'L4';

export type DomainId =
  | 'algorithms'
  | 'optimization'
  | 'ml'
  | 'neural'
  | 'os'
  | 'arch'
  | 'network'
  | 'db'
  | 'compiler'
  | 'distributed'
  | 'security'
  | 'graphics'
  | 'theory'
  | 'se';

export interface Domain {
  id: DomainId;
  title: string;
  en: string;
  note: string;
}

export interface BarsSpec {
  type: 'bars';
  values: number[];
  labels?: string[];
  highlight?: number[];
  caption?: string;
}

export interface MatrixSpec {
  type: 'matrix';
  cells: Array<Array<string | number>>;
  rowLabels?: string[];
  colLabels?: string[];
  highlight?: Array<[number, number]>;
  heat?: boolean;
  caption?: string;
}

export interface Series {
  points: Array<[number, number]>;
  mode?: 'line' | 'dots';
  color?: string;
}

export interface ChartSpec {
  type: 'chart';
  series: Series[];
  highlight?: [number, number];
  xLabel?: string;
  yLabel?: string;
  caption?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  a: string;
  b: string;
  label?: string;
  hot?: boolean;
}

export interface GraphSpec {
  type: 'graph';
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed?: boolean;
  highlight?: string[];
  caption?: string;
}

export interface TreeNode {
  id: string;
  label: string;
  parent: string | null;
}

export interface TreeSpec {
  type: 'tree';
  nodes: TreeNode[];
  highlight?: string[];
  caption?: string;
}

export interface PipelineSpec {
  type: 'pipeline';
  steps: string[];
  highlight?: number;
  caption?: string;
}

export interface Layer {
  label: string;
  sub?: string;
}

export interface LayersSpec {
  type: 'layers';
  layers: Layer[];
  highlight?: number;
  caption?: string;
}

export interface TimelineBlock {
  start: number;
  end: number;
  label: string;
  hot?: boolean;
}

export interface TimelineRow {
  label: string;
  blocks: TimelineBlock[];
}

export interface TimelineSpec {
  type: 'timeline';
  rows: TimelineRow[];
  max?: number;
  caption?: string;
}

export interface MemorySpec {
  type: 'memory';
  cells: string[];
  labels?: string[];
  highlight?: number[];
  caption?: string;
}

export interface TableSpec {
  type: 'table';
  columns: string[];
  rows: string[][];
  highlight?: number;
  caption?: string;
}

export interface StackSpec {
  type: 'stack';
  items: string[];
  pointer?: number;
  caption?: string;
}

export interface VectorSpec {
  type: 'vector';
  vectors: number[][];
  labels?: string[];
  highlight?: number;
  caption?: string;
}

export type TopologyKind = 'star' | 'ring' | 'mesh' | 'bus' | 'tree' | 'fat-tree';

export interface TopologySpec {
  type: 'topology';
  kind: TopologyKind;
  labels?: string[];
  highlight?: string[];
  caption?: string;
}

export type VisualSpec =
  | BarsSpec
  | MatrixSpec
  | ChartSpec
  | GraphSpec
  | TreeSpec
  | PipelineSpec
  | LayersSpec
  | TimelineSpec
  | MemorySpec
  | TableSpec
  | StackSpec
  | VectorSpec
  | TopologySpec;

export interface Entry {
  id: string;
  domain: DomainId;
  level: Level;
  title: string;
  en: string;
  tags: string[];
  summary: string;
  visual: VisualSpec;
  mechanism: string;
  observe: string;
  links?: Array<[string, string]>;
}
