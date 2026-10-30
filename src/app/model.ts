import type { DomainId, Level, VisualSpec } from '../visuals/types';

export type LabKind =
  | 'array'
  | 'graph'
  | 'tree'
  | 'matrix'
  | 'chart'
  | 'timeline'
  | 'frames'
  | 'table'
  | 'stack'
  | 'vector'
  | 'layers'
  | 'pipeline'
  | 'topology';

export type ParamValue = string | number;

export interface LabParam {
  id: string;
  label: string;
  type: 'range' | 'select' | 'number' | 'text';
  value: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  hint?: string;
}

export interface LabEntry {
  id: string;
  domain: DomainId;
  level: Level;
  title: string;
  en: string;
  tags: string[];
  summary: string;
  mechanism: string;
  observe: string;
  kind: LabKind;
  mode?: string;
  legacy?: boolean;
  visual?: VisualSpec;
  links?: Array<[string, string]>;
}

export interface ArrayStage {
  kind: 'array';
  values: number[];
  labels: string[];
  active: number[];
  compare: number[];
  sorted: number[];
  range?: [number, number];
  target?: number;
  caption: string;
}

export interface GraphNodeView {
  id: string;
  label: string;
  x: number;
  y: number;
  state?: 'frontier' | 'visited' | 'active' | 'path';
}

export interface GraphEdgeView {
  a: string;
  b: string;
  weight?: number;
  state?: 'active' | 'tree' | 'path';
}

export interface GraphStage {
  kind: 'graph';
  nodes: GraphNodeView[];
  edges: GraphEdgeView[];
  queue: string[];
  visited: string[];
  caption: string;
  directed?: boolean;
}

export interface TreeStage {
  kind: 'tree';
  nodes: Array<{ id: string; label: string; x: number; y: number; parent: string | null; state?: 'active' | 'path' | 'visited'; color?: 'red' | 'black' }>;
  caption: string;
}

export interface MatrixStage {
  kind: 'matrix';
  rows: string[];
  cols: string[];
  cells: Array<Array<string | number>>;
  active: Array<[number, number]>;
  path?: Array<[number, number]>;
  caption: string;
}

export interface ChartStage {
  kind: 'chart';
  series: Array<{ points: Array<[number, number]>; color?: string; dashed?: boolean }>;
  marker?: [number, number];
  xLabel: string;
  yLabel: string;
  caption: string;
}

export interface TimelineStage {
  kind: 'timeline';
  rows: Array<{ label: string; blocks: Array<{ start: number; end: number; label: string; tone?: string }> }>;
  now: number;
  max: number;
  caption: string;
}

export interface FramesStage {
  kind: 'frames';
  frames: Array<string | null>;
  reference: string[];
  cursor: number;
  hit?: boolean;
  victim?: string | null;
  caption: string;
}

export interface TableStage {
  kind: 'table';
  columns: string[];
  rows: string[][];
  activeRow?: number;
  activeCol?: number;
  caption: string;
}

export interface StackStage {
  kind: 'stack';
  items: string[];
  active?: number;
  caption: string;
}

export interface VectorStage {
  kind: 'vector';
  vectors: number[][];
  labels: string[];
  activeRow?: number;
  activeCol?: number;
  caption: string;
}

export interface LayersStage {
  kind: 'layers';
  layers: Array<{ label: string; sub?: string; value?: string }>;
  active: number;
  caption: string;
}

export interface PipelineStage {
  kind: 'pipeline';
  steps: string[];
  active: number;
  caption: string;
}

export interface TopologyStage {
  kind: 'topology';
  nodes: Array<{ id: string; label: string; x: number; y: number; state?: string }>;
  edges: Array<{ a: string; b: string; state?: string }>;
  path: string[];
  packet?: string;
  caption: string;
}

export type Stage =
  | ArrayStage
  | GraphStage
  | TreeStage
  | MatrixStage
  | ChartStage
  | TimelineStage
  | FramesStage
  | TableStage
  | StackStage
  | VectorStage
  | LayersStage
  | PipelineStage
  | TopologyStage;

export interface LabFrame {
  stage: Stage;
  narration: string;
  metrics: Record<string, string | number>;
  codeLine: number;
  done?: boolean;
}

export interface LabRun {
  frames: LabFrame[];
  pseudocode: string[];
  invariant: string;
  params: LabParam[];
  summary: string;
  complexity: string;
}

export interface LabDefinition {
  entry: LabEntry;
  params: LabParam[];
  pseudocode: string[];
  invariant: string;
  complexity: string;
  run: (params: Record<string, ParamValue>) => LabRun;
}
