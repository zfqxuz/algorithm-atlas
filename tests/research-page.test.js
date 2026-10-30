'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const catalog = require('../catalog.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'research.html'), 'utf8');

test('every research topic in the atlas has a full article anchor', () => {
  for (const topic of catalog.RESEARCH_TOPICS) {
    assert.match(
      html,
      new RegExp(`id="${topic.id}"`),
      `research.html is missing #${topic.id}`
    );
  }
  assert.equal((html.match(/class="research-topic"/g) || []).length, 7);
});

test('research page ships the interactive max-flow demo', () => {
  assert.match(html, /id="maxFlowDemo"/);
  assert.match(html, /id="flowCanvas"/);
  assert.match(html, /engines\/flow-engine\.js/);
  assert.match(html, /research\.js/);
  assert.ok(fs.existsSync(path.join(root, 'research.js')));
  assert.ok(fs.existsSync(path.join(root, 'engines', 'flow-engine.js')));
});

test('the page contains the six required graduate topics and a reading path', () => {
  for (const phrase of [
    '最大流 / 最小割',
    '线性规划与单纯形',
    'NP 完全性与归约',
    '近似算法',
    '随机算法',
    '在线算法与竞争比',
    '学习路径与研究入口',
    '最大流最小割定理',
    'PTAS',
    'Karger',
    '竞争比',
  ]) {
    assert.ok(html.includes(phrase), `missing research content: ${phrase}`);
  }
});
