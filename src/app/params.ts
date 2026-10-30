import type { LabEntry, LabParam } from './model';

function range(id: string, label: string, value: number, min: number, max: number, step = 1, hint?: string): LabParam {
  return { id, label, type: 'range', value, min, max, step, hint };
}

function seed(value = 2026): LabParam {
  return { id: 'seed', label: '随机种子', type: 'number', value, min: 1, max: 99999, step: 1, hint: '相同种子生成相同数据与轨迹' };
}

function select(id: string, label: string, value: string, options: Array<[string, string]>, hint?: string): LabParam {
  return { id, label, type: 'select', value, options: options.map(([optionValue, optionLabel]) => ({ value: optionValue, label: optionLabel })), hint };
}

function text(id: string, label: string, value: string, hint?: string): LabParam {
  return { id, label, type: 'text', value, hint };
}

export function defaultParams(entry: LabEntry): LabParam[] {
  const mode = entry.mode ?? '';
  switch (entry.kind) {
    case 'array':
      if (mode === 'kmp') {
        return [
          text('text', '文本', 'ababcababa', '可编辑的文本，建议使用 a/b 字符'),
          text('pattern', '模式串', 'ababa', '将在文本中查找'),
        ];
      }
      if (mode === 'binary') {
        return [
          range('size', '数组规模', 12, 6, 32),
          range('target', '目标值', 23, 1, 99),
          seed(),
        ];
      }
      if (mode === 'dsu') {
        return [
          range('size', '元素数量', 10, 4, 20),
          range('unions', '合并次数', 6, 1, 18),
          seed(),
        ];
      }
      if (mode === 'heapds') {
        return [range('size', '堆元素', 9, 5, 24), seed()];
      }
      return [
        range('size', '数组规模', mode ? 16 : 12, 6, 28),
        select('distribution', '数据分布', 'random', [
          ['random', '随机分布'],
          ['near-sorted', '接近有序'],
          ['reversed', '完全逆序'],
          ['few-unique', '少量重复'],
        ]),
        seed(),
      ];

    case 'graph': {
      const nodes = entry.visual?.type === 'graph' ? entry.visual.nodes.map((node) => node.label) : ['A', 'B', 'C', 'D', 'E', 'F'];
      return [
        select('source', '起点', nodes[0] ?? 'A', nodes.map((label) => [label, label])),
        select('target', '终点', nodes[nodes.length - 1] ?? 'F', nodes.map((label) => [label, label])),
        seed(),
      ];
    }

    case 'tree':
      if (entry.visual?.type === 'tree' && !['bst', 'avl', 'rb'].includes(mode)) {
        const nodes = entry.visual.nodes.length;
        return [range('limit', '访问节点上限', Math.min(6, nodes), 2, Math.max(2, nodes))];
      }
      return [
        range('keys', '插入键数量', 7, 4, 14),
        range('target', '查找键', 42, 1, 99),
        seed(),
      ];

    case 'matrix':
      if (mode === 'attention') {
        return [
          text('tokens', 'Token 序列', '寻径让算法可见', '逐字符或逐 token 输入'),
          select('heads', '注意力头数', '3', [['1', '1 头'], ['2', '2 头'], ['3', '3 头'], ['4', '4 头']]),
          select('mask', '因果掩码', 'on', [['on', '开启'], ['off', '关闭']]),
          seed(),
        ];
      }
      if (mode === 'lcs') {
        return [
          text('a', '序列 A', 'ABCBDAB'),
          text('b', '序列 B', 'BDCABA'),
        ];
      }
      return [range('size', '矩阵规模', entry.visual?.type === 'matrix' ? entry.visual.cells.length : 6, 2, 12), seed()];

    case 'chart':
      if (mode === 'hull') {
        return [range('points', '点数', 16, 6, 40), seed()];
      }
      if (entry.visual?.type === 'chart' && entry.domain !== 'optimization' && mode !== 'gd') {
        const points = Math.max(2, ...entry.visual.series.map((series) => series.points.length));
        return [range('samples', '显示数据点', points, 2, Math.max(2, points))];
      }
      return [
        select('function', '目标函数', 'bowl', [
          ['bowl', '碗形函数'],
          ['rosenbrock', 'Rosenbrock'],
          ['anisotropic', '各向异性二次型'],
        ]),
        range('lr', '学习率', 0.12, 0.01, 0.5, 0.01),
        range('iterations', '迭代次数', 28, 5, 80),
        seed(),
      ];

    case 'timeline':
      if (entry.visual?.type === 'timeline' && !entry.legacy) {
        return [range('steps', '时间步数', 10, 4, 20)];
      }
      return [
        range('jobs', '作业数量', 5, 3, 8),
        range('quantum', '时间片', 2, 1, 5),
        seed(),
      ];

    case 'frames':
      return [
        range('frames', '物理帧数', 4, 2, 6),
        range('refLength', '引用串长度', 16, 8, 28),
        select('algorithm', '置换算法', mode === 'lru' ? 'lru' : 'lru', [
          ['fifo', 'FIFO'],
          ['lru', 'LRU'],
          ['opt', 'OPT'],
        ]),
        seed(),
      ];

    case 'table':
      if (entry.visual?.type === 'table') return [range('rows', '数据行数', entry.visual.rows.length, 2, Math.max(2, entry.visual.rows.length))];
      return [range('rows', '数据行数', 6, 3, 10), seed()];

    case 'stack':
      return [range('items', '元素数量', entry.visual?.type === 'stack' ? entry.visual.items.length : 7, 2, 16)];

    case 'vector':
      if (entry.visual?.type === 'vector') return [range('dimension', '向量维度', entry.visual.vectors[0]?.length ?? 4, 2, Math.max(2, entry.visual.vectors[0]?.length ?? 4))];
      return [range('dimension', '向量维度', 4, 2, 8), seed()];

    case 'layers':
      if (entry.visual?.type === 'layers') return [range('depth', '层数', entry.visual.layers.length, 2, Math.max(2, entry.visual.layers.length)), range('width', '宽度', 6, 3, 10)];
      return [range('depth', '层数', 4, 2, 7), range('width', '宽度', 6, 3, 10)];

    case 'pipeline':
      return [range('batch', '批次大小', 5, 2, 10)];

    case 'topology':
      return [
        range('nodes', '节点数', entry.visual?.type === 'topology' ? (entry.visual.labels?.length ?? 8) : 8, 3, entry.visual?.type === 'topology' ? Math.max(3, entry.visual.labels?.length ?? 8) : 12),
        select('kind', '拓扑', 'mesh', [
          ['star', '星型'],
          ['ring', '环型'],
          ['mesh', '网格'],
          ['tree', '树型'],
        ]),
        range('failure', '链路故障率', 0, 0, 0.5, 0.05),
        seed(),
      ];

    default:
      return [seed()];
  }
}

export function paramsToRecord(params: LabParam[]): Record<string, string | number> {
  return Object.fromEntries(params.map((param) => [param.id, param.value]));
}
