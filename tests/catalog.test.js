'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const catalog = require('../catalog.js');
const root = path.join(__dirname, '..');
const { LEVELS, CATEGORIES, RESEARCH_TOPICS } = catalog;
const levels = new Map(LEVELS.map((level) => [level.id, level]));
const algorithms = CATEGORIES.flatMap((category) =>
  category.algorithms.map((algorithm) => ({ ...algorithm, category: category.id }))
);
const ids = new Set(algorithms.map((algorithm) => algorithm.id));

test('catalogue has four ordered levels and five categories', () => {
  assert.deepEqual(LEVELS.map((level) => level.id), ['L1', 'L2', 'L3', 'L4']);
  assert.equal(CATEGORIES.length, 5);
  assert.equal(algorithms.length, 27);
  assert.ok(RESEARCH_TOPICS.length >= 5);
});

test('algorithm ids are unique within each category and every level is represented', () => {
  for (const category of CATEGORIES) {
    const categoryIds = new Set(category.algorithms.map((algorithm) => algorithm.id));
    assert.equal(categoryIds.size, category.algorithms.length, `${category.id} has duplicate ids`);
  }
  for (const level of LEVELS) {
    assert.ok(algorithms.some((algorithm) => algorithm.level === level.id), `${level.id} has no algorithm`);
  }
  for (const algorithm of algorithms) {
    assert.ok(levels.has(algorithm.level));
    assert.ok(algorithm.name && algorithm.en && algorithm.summary && algorithm.complexity);
    assert.ok(Array.isArray(algorithm.tags) && algorithm.tags.length > 0);
  }
});

test('every catalogue link resolves to an existing page and mode', () => {
  const pages = {
    'sorting-lab.html': ['bubble', 'selection', 'insertion', 'shell', 'merge', 'quick', 'heap', 'counting'],
    'graph-lab.html': ['bfs', 'dfs', 'dijkstra', 'prim'],
    'structures-lab.html': ['bst', 'heap', 'union-find', 'avl', 'rb'],
    'scheduling-lab.html': ['fcfs', 'sjf', 'priority', 'rr', 'edf', 'lpt'],
    'advanced-lab.html': ['lcs', 'kmp', 'hull', 'pagerank'],
  };

  for (const algorithm of algorithms) {
    assert.ok(algorithm.href, `${algorithm.id} has no href`);
    const [page, hash] = algorithm.href.split('#');
    assert.ok(fs.existsSync(path.join(root, page)), `${page} is missing`);
    assert.ok(pages[page], `${page} is not a known lab`);
    assert.ok(pages[page].includes(hash), `${algorithm.href} has no matching mode`);
  }
});

test('category CTAs and all lab pages exist', () => {
  for (const category of CATEGORIES) {
    assert.ok(category.labHref);
    assert.ok(fs.existsSync(path.join(root, category.labHref)));
  }
  for (const page of ['index.html', 'sorting-lab.html', 'graph-lab.html', 'structures-lab.html', 'scheduling-lab.html', 'advanced-lab.html', 'research.html']) {
    assert.ok(fs.existsSync(path.join(root, page)), `${page} missing`);
  }
});

test('research topics are L4 and each has substantive points', () => {
  for (const topic of RESEARCH_TOPICS) {
    assert.equal(topic.level, 'L4');
    assert.ok(topic.title && topic.en && topic.summary);
    assert.ok(Array.isArray(topic.points) && topic.points.length >= 2);
  }
});
