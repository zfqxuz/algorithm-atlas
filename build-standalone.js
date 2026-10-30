'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const html = read('graph-lab.html');
const css = [read('styles.css'), read('claude.css')].join('\n\n');
const scripts = ['dijkstra.js', 'graph-algorithms.js', 'graphs.js', 'app.js'].map(read).join('\n\n');

const styleBlock = `<style>\n${css}\n  </style>`;
const scriptBlock = `<script>\n${scripts}\n  </script>`;

let output = html.replace(
  /  <link rel="stylesheet" href="styles\.css">\n  <link rel="stylesheet" href="claude\.css">/,
  `  <!-- Standalone build: CSS and JavaScript are inlined. -->\n  ${styleBlock}`
);

output = output.replace(
  /  <script src="dijkstra\.js"><\/script>\n  <script src="graph-algorithms\.js"><\/script>\n  <script src="graphs\.js"><\/script>\n  <script src="app\.js"><\/script>/,
  `  ${scriptBlock}`
);

if (
  output.includes('src="app.js"') ||
  output.includes('href="styles.css"') ||
  output.includes('href="claude.css"')
) {
  throw new Error('Standalone build failed: external asset references remain.');
}

const target = path.join(root, 'dijkstra-visualizer.html');
fs.writeFileSync(target, output, 'utf8');
console.log(`Wrote ${path.relative(process.cwd(), target)} (${(Buffer.byteLength(output) / 1024).toFixed(1)} KB)`);
