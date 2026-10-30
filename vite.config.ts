import { defineConfig } from 'vite';
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(__dirname);
const htmlPages = [
  'index.html',
  'graph-lab.html',
  'sorting-lab.html',
  'structures-lab.html',
  'scheduling-lab.html',
  'advanced-lab.html',
  'research.html',
  'visuals.html',
  'optimization-lab.html',
  'transformer-lab.html',
  'memory-lab.html',
];

const legacyAssetPattern = /\.(js|css)$/;

function copyLegacyAssets() {
  return {
    name: 'copy-legacy-assets',
    apply: 'build' as const,
    closeBundle() {
      const outDir = resolve(root, 'dist');
      for (const name of readdirSync(root)) {
        if (legacyAssetPattern.test(name)) {
          cpSync(join(root, name), join(outDir, name));
        }
      }
      for (const directory of ['engines']) {
        if (existsSync(join(root, directory))) {
          cpSync(join(root, directory), join(outDir, directory), { recursive: true });
        }
      }
      for (const name of ['dijkstra-visualizer.html']) {
        if (existsSync(join(root, name))) {
          cpSync(join(root, name), join(outDir, name));
        }
      }

      // Vite sorts generated CSS chunks by its module graph. The visual theme
      // must always win the cascade over the legacy atlas/base styles.
      for (const name of readdirSync(outDir)) {
        if (!name.endsWith('.html')) continue;
        const file = join(outDir, name);
        const html = readFileSync(file, 'utf8');
        const links = [...html.matchAll(/<link rel="stylesheet"[^>]*>/g)].map((match) => match[0]);
        if (links.length < 2) continue;
        const rank = (link: string) => {
          if (/claude-[\w-]+\.css/.test(link)) return 2;
          if (/visuals-[\w-]+\.css/.test(link)) return 3;
          if (/atlas-[\w-]+\.css/.test(link)) return 1;
          return 4;
        };
        const sorted = links.slice().sort((a, b) => rank(a) - rank(b));
        if (sorted.join('\n') !== links.join('\n')) {
          const blockPattern = new RegExp(links.map((link) => link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*'));
          if (blockPattern.test(html)) {
            writeFileSync(file, html.replace(blockPattern, sorted.join('\n')));
          }
        }
      }
    },
  };
}

export default defineConfig({
  root,
  base: process.env.VITE_BASE || '/',
  plugins: [copyLegacyAssets()],
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(htmlPages.map((page) => [page.replace(/\.html$/, ''), resolve(root, page)])),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
