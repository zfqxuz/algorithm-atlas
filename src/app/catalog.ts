import { domains, entries as fieldGuideEntries } from '../visuals/data';
import type { DomainId, VisualSpec } from '../visuals/types';
import { legacyEntries } from './legacy';
import type { LabEntry, LabKind } from './model';

function kindFor(id: string, visual: VisualSpec): LabKind {
  if (['page-replacement', 'cache-mapping', 'cache-hierarchy', 'tlb', 'paging', 'page-fault'].includes(id)) return 'frames';
  if (['hash-table', 'hash-index'].includes(id)) return 'table';
  switch (visual.type) {
    case 'bars': return 'array';
    case 'graph': return 'graph';
    case 'tree': return 'tree';
    case 'matrix': return 'matrix';
    case 'chart': return 'chart';
    case 'timeline': return 'timeline';
    case 'memory': return 'frames';
    case 'table': return 'table';
    case 'stack': return 'stack';
    case 'vector': return 'vector';
    case 'layers': return 'layers';
    case 'pipeline': return 'pipeline';
    case 'topology': return 'topology';
    default: return 'array';
  }
}

function modeFor(id: string, visual: VisualSpec): string | undefined {
  if (id === 'bfs') return 'bfs';
  if (id === 'dfs') return 'dfs';
  if (id === 'union-find') return 'dsu';
  if (id === 'binary-search') return 'binary';
  if (id === 'page-replacement') return 'lru';
  if (id === 'gradient-descent') return 'gd';
  if (id === 'attention') return 'attention';
  if (id === 'multi-head-attention' || id === 'multihead') return 'attention';
  if (id === 'k-means') return 'kmeans';
  if (id === 'lcs') return undefined;
  if (id === 'topological-sort') return 'topo';
  if (visual.type === 'graph' && /DFS/i.test(id)) return 'dfs';
  return undefined;
}

const fieldGuide: LabEntry[] = fieldGuideEntries.map((entry) => ({
  id: entry.id,
  domain: entry.domain,
  level: entry.level,
  title: entry.title,
  en: entry.en,
  tags: entry.tags,
  summary: entry.summary,
  mechanism: entry.mechanism,
  observe: entry.observe,
  kind: kindFor(entry.id, entry.visual),
  mode: modeFor(entry.id, entry.visual),
  visual: entry.visual,
  links: entry.links,
}));

const legacyById = new Map(legacyEntries.map((entry) => [entry.id, entry]));
const merged = fieldGuide.map((entry) => {
  const legacy = legacyById.get(entry.id);
  if (!legacy) return entry;
  return { ...entry, legacy: true, mode: legacy.mode ?? entry.mode };
});

for (const entry of legacyEntries) {
  if (!merged.some((candidate) => candidate.id === entry.id)) merged.push(entry);
}

export const entries: LabEntry[] = merged.sort((a, b) => {
  const domainOrder = domains.findIndex((domain) => domain.id === a.domain) - domains.findIndex((domain) => domain.id === b.domain);
  if (domainOrder !== 0) return domainOrder;
  const levels = ['L1', 'L2', 'L3', 'L4'];
  const levelOrder = levels.indexOf(a.level) - levels.indexOf(b.level);
  if (levelOrder !== 0) return levelOrder;
  return a.title.localeCompare(b.title, 'zh-Hans-CN');
});

export const entryById = new Map(entries.map((entry) => [entry.id, entry]));
export const domainById = new Map(domains.map((domain) => [domain.id, domain]));
export const domainCounts = new Map<DomainId, number>();
for (const entry of entries) domainCounts.set(entry.domain, (domainCounts.get(entry.domain) ?? 0) + 1);

export function domainName(id: DomainId): string {
  return domainById.get(id)?.title ?? id;
}

export function domainEn(id: DomainId): string {
  return domainById.get(id)?.en ?? id;
}

export function entriesForDomain(id: DomainId): LabEntry[] {
  return entries.filter((entry) => entry.domain === id);
}

export { domains };
