import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { domainCounts, domains, entries, entryById } from '../src/visuals/data';

const root = path.resolve(__dirname, '..');
const visualTypes = new Set([
  'bars', 'matrix', 'chart', 'graph', 'tree', 'pipeline', 'layers',
  'timeline', 'memory', 'table', 'stack', 'vector', 'topology',
]);

describe('Visual Atlas data', () => {
  it('contains at least 100 unique visual notes', () => {
    expect(entries.length).toBeGreaterThanOrEqual(100);
    expect(entries.length).toBe(122);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    expect(entryById.size).toBe(entries.length);
  });

  it('covers all 14 domains and all four levels', () => {
    expect(domains).toHaveLength(14);
    for (const domain of domains) {
      expect(domainCounts.get(domain.id)).toBeGreaterThan(0);
    }
    for (const level of ['L1', 'L2', 'L3', 'L4']) {
      expect(entries.some((entry) => entry.level === level)).toBe(true);
    }
  });

  it('has complete metadata and valid visual specifications', () => {
    for (const entry of entries) {
      expect(entry.title.length, entry.id).toBeGreaterThan(0);
      expect(entry.en.length, entry.id).toBeGreaterThan(0);
      expect(entry.summary.length, entry.id).toBeGreaterThan(0);
      expect(entry.mechanism.length, entry.id).toBeGreaterThan(0);
      expect(entry.observe.length, entry.id).toBeGreaterThan(0);
      expect(entry.tags.length, entry.id).toBeGreaterThan(0);
      expect(visualTypes.has(entry.visual.type), `${entry.id}: ${entry.visual.type}`).toBe(true);
    }
  });

  it('only links to local files that exist', () => {
    for (const entry of entries) {
      for (const [label, href] of entry.links ?? []) {
        expect(label.length, entry.id).toBeGreaterThan(0);
        if (/^https?:\/\//.test(href)) continue;
        const file = href.split('#')[0];
        expect(fs.existsSync(path.join(root, file)), `${entry.id} → ${href}`).toBe(true);
      }
    }
  });
});
