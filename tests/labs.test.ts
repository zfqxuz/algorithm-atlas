import { describe, expect, it } from 'vitest';
import { entries } from '../src/app/catalog';
import { baseDefinition } from '../src/app/engines';
import { paramsToRecord } from '../src/app/params';

describe('single-page lab contract', () => {
  it('ships a unique interactive lab for every catalogue entry', () => {
    expect(entries.length).toBeGreaterThanOrEqual(140);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    const problems: string[] = [];
    for (const entry of entries) {
      const definition = baseDefinition(entry);
      const run = definition.run(paramsToRecord(definition.params));
      if (definition.params.length === 0) problems.push(`${entry.id}: no params`);
      if (definition.pseudocode.length === 0) problems.push(`${entry.id}: no pseudocode`);
      if (run.frames.length < 5) problems.push(`${entry.id}: only ${run.frames.length} frames`);
      if (run.frames.some((frame) => !frame.narration)) problems.push(`${entry.id}: empty narration`);
      if (run.frames.some((frame) => Object.keys(frame.metrics).length === 0)) problems.push(`${entry.id}: no metrics`);
      if (run.frames.some((frame) => frame.codeLine < 0 || frame.codeLine >= definition.pseudocode.length)) problems.push(`${entry.id}: invalid code line`);
      if (JSON.stringify(run.frames[0].stage) === JSON.stringify(run.frames[run.frames.length - 1].stage)) problems.push(`${entry.id}: no state change`);
      if (!run.frames[run.frames.length - 1].done) problems.push(`${entry.id}: no completion flag`);
    }
    expect(problems).toEqual([]);
  });
});
