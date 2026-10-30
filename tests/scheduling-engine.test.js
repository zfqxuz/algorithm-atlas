'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const SchedulingEngine = require('../engines/scheduling-engine.js');
const { ALGORITHMS, generateJobs, schedule } = SchedulingEngine;

const EPSILON = 1e-9;

function makeJob(id, arrival, burst, deadline, priority = 1) {
  return { id, arrival, burst, deadline, priority };
}

function closeTo(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    `${message}: expected ${expected}, received ${actual}`
  );
}

function segmentTuples(result) {
  return result.segments.map((segment) => {
    const tuple = [segment.jobId, segment.start, segment.end];
    if (segment.machine !== undefined) tuple.push(segment.machine);
    return tuple;
  });
}

function independentLpt(jobs, machines) {
  const ordered = jobs
    .slice()
    .sort((a, b) => {
      if (a.burst !== b.burst) return b.burst - a.burst;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
  const loads = new Array(machines).fill(0);
  const assignment = new Map();

  for (const job of ordered) {
    let machine = 0;
    for (let index = 1; index < machines; index += 1) {
      if (loads[index] < loads[machine]) machine = index;
    }
    assignment.set(job.id, {
      machine,
      start: loads[machine],
      end: loads[machine] + job.burst,
    });
    loads[machine] += job.burst;
  }

  return {
    assignment,
    loads,
    makespan: Math.max(0, ...loads),
  };
}

function assertScheduleInvariants(result, sourceJobs, expectedMachines) {
  const { algorithmId, jobs, segments, metrics, perJob } = result;
  const jobIds = new Set(sourceJobs.map((job) => job.id));

  assert.equal(algorithmId === 'lpt', expectedMachines !== undefined);
  assert.deepEqual(jobs, sourceJobs, 'result jobs must preserve the input data');
  assert.notStrictEqual(jobs, sourceJobs, 'result jobs must be a new array');
  jobs.forEach((job, index) => {
    assert.notStrictEqual(job, sourceJobs[index], 'each result job must be copied');
  });

  let previousSegment = null;
  for (const segment of segments) {
    assert.ok(jobIds.has(segment.jobId), `unknown job in segment: ${segment.jobId}`);
    assert.ok(Number.isInteger(segment.start), 'segment.start must be an integer');
    assert.ok(Number.isInteger(segment.end), 'segment.end must be an integer');
    assert.ok(segment.start >= 0, 'segment.start must be non-negative');
    assert.ok(segment.end > segment.start, 'segment.end must follow segment.start');

    if (algorithmId === 'lpt') {
      assert.ok(
        Number.isInteger(segment.machine) &&
          segment.machine >= 0 &&
          segment.machine < expectedMachines,
        'LPT segments need a valid zero-based machine index'
      );
    } else {
      assert.equal(
        Object.prototype.hasOwnProperty.call(segment, 'machine'),
        false,
        'single-machine segments must not carry a machine field'
      );
    }

    if (previousSegment) {
      const previousMachine =
        previousSegment.machine === undefined ? 0 : previousSegment.machine;
      const currentMachine = segment.machine === undefined ? 0 : segment.machine;
      assert.ok(
        segment.start > previousSegment.start ||
          (segment.start === previousSegment.start && currentMachine >= previousMachine),
        'segments must be sorted by start, then machine'
      );
    }
    previousSegment = segment;
  }

  const segmentsByMachine = new Map();
  for (const segment of segments) {
    const key = segment.machine === undefined ? 0 : segment.machine;
    if (!segmentsByMachine.has(key)) segmentsByMachine.set(key, []);
    segmentsByMachine.get(key).push(segment);
  }
  for (const [machine, machineSegments] of segmentsByMachine) {
    const ordered = machineSegments.slice().sort((a, b) => a.start - b.start);
    for (let index = 1; index < ordered.length; index += 1) {
      assert.ok(
        ordered[index - 1].end <= ordered[index].start,
        `overlap on machine ${machine}: ${ordered[index - 1].jobId} and ${ordered[index].jobId}`
      );
    }
  }

  assert.equal(Object.keys(perJob).length, sourceJobs.length);
  let sumWaiting = 0;
  let sumTurnaround = 0;
  let sumLateness = 0;
  let expectedMakespan = 0;
  const latenesses = [];

  for (const job of sourceJobs) {
    const ownSegments = segments.filter((segment) => segment.jobId === job.id);
    assert.ok(ownSegments.length > 0, `job ${job.id} must have at least one segment`);
    const coveredBurst = ownSegments.reduce(
      (total, segment) => total + segment.end - segment.start,
      0
    );
    assert.equal(coveredBurst, job.burst, `job ${job.id} burst coverage`);

    const start = Math.min(...ownSegments.map((segment) => segment.start));
    const completion = Math.max(...ownSegments.map((segment) => segment.end));
    const entry = perJob[job.id];

    assert.ok(entry, `missing perJob entry for ${job.id}`);
    assert.equal(entry.arrival, algorithmId === 'lpt' ? 0 : job.arrival);
    assert.equal(entry.burst, job.burst);
    assert.equal(entry.start, start);
    assert.equal(entry.completion, completion);
    assert.equal(entry.turnaround, completion - entry.arrival);
    assert.equal(entry.waiting, entry.turnaround - entry.burst);
    assert.equal(entry.lateness, completion - job.deadline);
    assert.ok(entry.waiting >= 0, `job ${job.id} waiting time must be non-negative`);
    assert.ok(entry.start >= entry.arrival, `job ${job.id} cannot start before arrival`);

    for (const field of ['start', 'completion', 'waiting', 'turnaround', 'lateness']) {
      assert.ok(Number.isInteger(entry[field]), `${job.id}.${field} must be an integer`);
    }

    sumWaiting += entry.waiting;
    sumTurnaround += entry.turnaround;
    sumLateness += entry.lateness;
    latenesses.push(entry.lateness);
    expectedMakespan = Math.max(expectedMakespan, completion);
  }

  assert.deepEqual(Object.keys(perJob), sourceJobs.map((job) => job.id));
  assert.equal(metrics.totalBurst, sourceJobs.reduce((total, job) => total + job.burst, 0));
  assert.equal(metrics.makespan, expectedMakespan);
  closeTo(metrics.avgWaiting, sumWaiting / sourceJobs.length, 'avgWaiting');
  closeTo(metrics.avgTurnaround, sumTurnaround / sourceJobs.length, 'avgTurnaround');
  closeTo(metrics.avgLateness, sumLateness / sourceJobs.length, 'avgLateness');
  assert.equal(metrics.maxLateness, Math.max(...latenesses));

  const machineCount = algorithmId === 'lpt' ? expectedMachines : 1;
  closeTo(
    metrics.utilization,
    metrics.totalBurst / (metrics.makespan * machineCount),
    'utilization'
  );
  assert.ok(metrics.utilization <= 1 + EPSILON, 'utilization cannot exceed 100%');

  if (algorithmId === 'lpt') {
    assert.equal(result.machines, expectedMachines);
    assert.ok(Array.isArray(result.notes) && result.notes.length > 0);
  } else {
    assert.equal(result.machines, undefined);
  }
}

test('exports the six algorithms through CommonJS and a browser global', () => {
  assert.deepEqual(
    ALGORITHMS.map((algorithm) => algorithm.id),
    ['fcfs', 'sjf', 'priority', 'rr', 'edf', 'lpt']
  );
  assert.deepEqual(
    ALGORITHMS.map((algorithm) => algorithm.level),
    ['L1', 'L1', 'L2', 'L2', 'L3', 'L4']
  );
  for (const algorithm of ALGORITHMS) {
    for (const field of ['id', 'name', 'en', 'level', 'description', 'time', 'space']) {
      assert.equal(typeof algorithm[field], 'string', `${algorithm.id}.${field}`);
      assert.ok(algorithm[field].length > 0, `${algorithm.id}.${field} cannot be empty`);
    }
  }
  assert.equal(typeof generateJobs, 'function');
  assert.equal(typeof schedule, 'function');

  const source = fs.readFileSync(
    path.join(__dirname, '..', 'engines', 'scheduling-engine.js'),
    'utf8'
  );
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'scheduling-engine.js' });
  assert.equal(typeof sandbox.window.SchedulingEngine, 'object');
  assert.equal(typeof sandbox.window.SchedulingEngine.schedule, 'function');
  assert.deepEqual(
    Array.from(sandbox.window.SchedulingEngine.ALGORITHMS, (algorithm) => algorithm.id),
    ['fcfs', 'sjf', 'priority', 'rr', 'edf', 'lpt']
  );
});

test('generateJobs respects bounds and is reproducible per seed', () => {
  const params = Object.freeze({
    count: 12,
    arrivalSpread: 20,
    burstMin: 3,
    burstMax: 9,
    deadlineSlackMin: 1,
    deadlineSlackMax: 7,
    priorityLevels: 5,
    seed: 987654321,
  });
  const first = generateJobs(params);
  const second = generateJobs(params);
  const different = generateJobs({ ...params, seed: 987654322 });

  assert.equal(first.length, 12);
  assert.deepEqual(second, first, 'the same seed must reproduce the same jobs');
  assert.notStrictEqual(second, first);
  assert.notDeepEqual(different, first, 'different seeds should vary the sequence');

  first.forEach((job, index) => {
    assert.equal(job.id, `J${index + 1}`);
    assert.deepEqual(Object.keys(job), ['id', 'arrival', 'burst', 'deadline', 'priority']);
    for (const field of ['arrival', 'burst', 'deadline', 'priority']) {
      assert.ok(Number.isInteger(job[field]), `${job.id}.${field} must be integer`);
    }
    assert.ok(job.arrival >= 0 && job.arrival <= 20);
    assert.ok(job.burst >= 3 && job.burst <= 9);
    assert.ok(job.priority >= 1 && job.priority <= 5);
    const slack = job.deadline - job.arrival - job.burst;
    assert.ok(slack >= 1 && slack <= 7, 'deadline slack must stay in range');
  });

  const boundaryJobs = generateJobs({
    count: 3,
    arrivalSpread: 0,
    burstMin: 1,
    burstMax: 1,
    deadlineSlackMin: 0,
    deadlineSlackMax: 0,
    priorityLevels: 2,
    seed: 5,
  });
  assert.equal(boundaryJobs.length, 3);
  for (const job of boundaryJobs) {
    assert.equal(job.arrival, 0);
    assert.equal(job.burst, 1);
    assert.equal(job.deadline, 1);
    assert.ok(job.priority === 1 || job.priority === 2);
  }

  assert.equal(generateJobs({ seed: 7 }).length, 6, 'count defaults to 6');
});

test('generateJobs validates every parameter boundary', () => {
  assert.throws(() => generateJobs({ count: 2 }), /count/);
  assert.throws(() => generateJobs({ count: 13 }), /count/);
  assert.throws(() => generateJobs({ count: 3.5 }), /count/);
  assert.throws(() => generateJobs({ arrivalSpread: -1 }), /arrivalSpread/);
  assert.throws(() => generateJobs({ arrivalSpread: 21 }), /arrivalSpread/);
  assert.throws(() => generateJobs({ burstMin: 0 }), /burstMin/);
  assert.throws(() => generateJobs({ burstMin: 11 }), /burstMin/);
  assert.throws(() => generateJobs({ burstMax: 0 }), /burstMax/);
  assert.throws(() => generateJobs({ burstMax: 16 }), /burstMax/);
  assert.throws(() => generateJobs({ burstMin: 6, burstMax: 5 }), /burstMax/);
  assert.throws(() => generateJobs({ deadlineSlackMin: -1 }), /deadlineSlackMin/);
  assert.throws(() => generateJobs({ deadlineSlackMin: 13 }), /deadlineSlackMin/);
  assert.throws(
    () => generateJobs({ deadlineSlackMin: 5, deadlineSlackMax: 4 }),
    /deadlineSlackMax/
  );
  assert.throws(() => generateJobs({ deadlineSlackMax: 1.5 }), /deadlineSlackMax/);
  assert.throws(() => generateJobs({ priorityLevels: 1 }), /priorityLevels/);
  assert.throws(() => generateJobs({ priorityLevels: 6 }), /priorityLevels/);
  assert.throws(() => generateJobs({ seed: 'not-a-number' }), /seed/);
  assert.throws(() => generateJobs([]), /params/);
});

test('FCFS hand-checked example', () => {
  const jobs = [
    makeJob('J1', 0, 4, 8, 2),
    makeJob('J2', 1, 3, 6, 1),
    makeJob('J3', 2, 1, 5, 3),
  ];
  const result = schedule('fcfs', jobs);

  assert.deepEqual(segmentTuples(result), [
    ['J1', 0, 4],
    ['J2', 4, 7],
    ['J3', 7, 8],
  ]);
  assert.deepEqual(result.perJob, {
    J1: {
      arrival: 0,
      burst: 4,
      start: 0,
      completion: 4,
      waiting: 0,
      turnaround: 4,
      lateness: -4,
    },
    J2: {
      arrival: 1,
      burst: 3,
      start: 4,
      completion: 7,
      waiting: 3,
      turnaround: 6,
      lateness: 1,
    },
    J3: {
      arrival: 2,
      burst: 1,
      start: 7,
      completion: 8,
      waiting: 5,
      turnaround: 6,
      lateness: 3,
    },
  });
  closeTo(result.metrics.avgWaiting, 8 / 3, 'FCFS avgWaiting');
  closeTo(result.metrics.avgTurnaround, 16 / 3, 'FCFS avgTurnaround');
  closeTo(result.metrics.avgLateness, 0, 'FCFS avgLateness');
  assert.equal(result.metrics.maxLateness, 3);
  assert.equal(result.metrics.makespan, 8);
  assert.equal(result.metrics.utilization, 1);
  assert.equal(result.metrics.totalBurst, 8);
});

test('SJF hand-checked example stays non-preemptive', () => {
  const jobs = [
    makeJob('J1', 0, 4, 8, 2),
    makeJob('J2', 1, 3, 6, 1),
    makeJob('J3', 2, 1, 5, 3),
  ];
  const result = schedule('sjf', jobs);

  assert.deepEqual(segmentTuples(result), [
    ['J1', 0, 4],
    ['J3', 4, 5],
    ['J2', 5, 8],
  ]);
  assert.deepEqual(result.perJob, {
    J1: {
      arrival: 0,
      burst: 4,
      start: 0,
      completion: 4,
      waiting: 0,
      turnaround: 4,
      lateness: -4,
    },
    J2: {
      arrival: 1,
      burst: 3,
      start: 5,
      completion: 8,
      waiting: 4,
      turnaround: 7,
      lateness: 2,
    },
    J3: {
      arrival: 2,
      burst: 1,
      start: 4,
      completion: 5,
      waiting: 2,
      turnaround: 3,
      lateness: 0,
    },
  });
  closeTo(result.metrics.avgWaiting, 2, 'SJF avgWaiting');
  closeTo(result.metrics.avgTurnaround, 14 / 3, 'SJF avgTurnaround');
  closeTo(result.metrics.avgLateness, -2 / 3, 'SJF avgLateness');
  assert.equal(result.metrics.maxLateness, 2);
  assert.equal(result.metrics.makespan, 8);
  assert.equal(result.metrics.utilization, 1);
  assert.equal(result.metrics.totalBurst, 8);
});

test('priority scheduling is non-preemptive and lower numbers win', () => {
  const jobs = [
    makeJob('J1', 0, 4, 10, 3),
    makeJob('J2', 1, 3, 6, 3),
    makeJob('J3', 2, 1, 5, 1),
  ];
  const result = schedule('priority', jobs);

  assert.deepEqual(segmentTuples(result), [
    ['J1', 0, 4],
    ['J3', 4, 5],
    ['J2', 5, 8],
  ]);
  assert.deepEqual(result.perJob, {
    J1: {
      arrival: 0,
      burst: 4,
      start: 0,
      completion: 4,
      waiting: 0,
      turnaround: 4,
      lateness: -6,
    },
    J2: {
      arrival: 1,
      burst: 3,
      start: 5,
      completion: 8,
      waiting: 4,
      turnaround: 7,
      lateness: 2,
    },
    J3: {
      arrival: 2,
      burst: 1,
      start: 4,
      completion: 5,
      waiting: 2,
      turnaround: 3,
      lateness: 0,
    },
  });
  closeTo(result.metrics.avgWaiting, 2, 'priority avgWaiting');
  closeTo(result.metrics.avgTurnaround, 14 / 3, 'priority avgTurnaround');
  closeTo(result.metrics.avgLateness, -4 / 3, 'priority avgLateness');
  assert.equal(result.metrics.maxLateness, 2);
  assert.equal(result.metrics.makespan, 8);
  assert.equal(result.metrics.utilization, 1);
  assert.equal(result.metrics.totalBurst, 8);
});

test('Round Robin hand-checked example uses quantum slices and mid-slice arrivals', () => {
  const jobs = [
    makeJob('J1', 0, 5, 8, 1),
    makeJob('J2', 1, 4, 8, 2),
    makeJob('J3', 2, 1, 6, 3),
  ];
  const result = schedule('rr', jobs, { quantum: 2 });

  assert.deepEqual(segmentTuples(result), [
    ['J1', 0, 2],
    ['J2', 2, 4],
    ['J3', 4, 5],
    ['J1', 5, 7],
    ['J2', 7, 9],
    ['J1', 9, 10],
  ]);
  assert.deepEqual(result.perJob, {
    J1: {
      arrival: 0,
      burst: 5,
      start: 0,
      completion: 10,
      waiting: 5,
      turnaround: 10,
      lateness: 2,
    },
    J2: {
      arrival: 1,
      burst: 4,
      start: 2,
      completion: 9,
      waiting: 4,
      turnaround: 8,
      lateness: 1,
    },
    J3: {
      arrival: 2,
      burst: 1,
      start: 4,
      completion: 5,
      waiting: 2,
      turnaround: 3,
      lateness: -1,
    },
  });
  closeTo(result.metrics.avgWaiting, 11 / 3, 'RR avgWaiting');
  closeTo(result.metrics.avgTurnaround, 7, 'RR avgTurnaround');
  closeTo(result.metrics.avgLateness, 2 / 3, 'RR avgLateness');
  assert.equal(result.metrics.maxLateness, 2);
  assert.equal(result.metrics.makespan, 10);
  assert.equal(result.metrics.utilization, 1);
  assert.equal(result.metrics.totalBurst, 10);
  assert.equal(result.segments.length, 6, 'quantum slices must remain visible');
});

test('EDF preempts exactly at integer time boundaries', () => {
  const jobs = [
    makeJob('J1', 0, 4, 6, 2),
    makeJob('J2', 1, 2, 3, 1),
  ];
  const result = schedule('edf', jobs);

  assert.deepEqual(segmentTuples(result), [
    ['J1', 0, 1],
    ['J2', 1, 3],
    ['J1', 3, 6],
  ]);
  assert.deepEqual(result.perJob, {
    J1: {
      arrival: 0,
      burst: 4,
      start: 0,
      completion: 6,
      waiting: 2,
      turnaround: 6,
      lateness: 0,
    },
    J2: {
      arrival: 1,
      burst: 2,
      start: 1,
      completion: 3,
      waiting: 0,
      turnaround: 2,
      lateness: 0,
    },
  });
  closeTo(result.metrics.avgWaiting, 1, 'EDF avgWaiting');
  closeTo(result.metrics.avgTurnaround, 4, 'EDF avgTurnaround');
  closeTo(result.metrics.avgLateness, 0, 'EDF avgLateness');
  assert.equal(result.metrics.maxLateness, 0);
  assert.equal(result.metrics.makespan, 6);
  assert.equal(result.metrics.utilization, 1);
  assert.equal(result.metrics.totalBurst, 6);
});

test('LPT hand-checked machine assignment and makespan', () => {
  const jobs = [
    makeJob('J1', 7, 5, 12, 1),
    makeJob('J2', 0, 4, 8, 2),
    makeJob('J3', 10, 3, 15, 3),
    makeJob('J4', 2, 2, 10, 1),
    makeJob('J5', 4, 1, 9, 2),
  ];
  const result = schedule('lpt', jobs, { machines: 3 });

  assert.equal(result.machines, 3);
  assert.deepEqual(segmentTuples(result), [
    ['J1', 0, 5, 0],
    ['J2', 0, 4, 1],
    ['J3', 0, 3, 2],
    ['J4', 3, 5, 2],
    ['J5', 4, 5, 1],
  ]);
  assert.deepEqual(result.perJob, {
    J1: {
      arrival: 0,
      burst: 5,
      start: 0,
      completion: 5,
      waiting: 0,
      turnaround: 5,
      lateness: -7,
    },
    J2: {
      arrival: 0,
      burst: 4,
      start: 0,
      completion: 4,
      waiting: 0,
      turnaround: 4,
      lateness: -4,
    },
    J3: {
      arrival: 0,
      burst: 3,
      start: 0,
      completion: 3,
      waiting: 0,
      turnaround: 3,
      lateness: -12,
    },
    J4: {
      arrival: 0,
      burst: 2,
      start: 3,
      completion: 5,
      waiting: 3,
      turnaround: 5,
      lateness: -5,
    },
    J5: {
      arrival: 0,
      burst: 1,
      start: 4,
      completion: 5,
      waiting: 4,
      turnaround: 5,
      lateness: -4,
    },
  });
  closeTo(result.metrics.avgWaiting, 7 / 5, 'LPT avgWaiting');
  closeTo(result.metrics.avgTurnaround, 22 / 5, 'LPT avgTurnaround');
  closeTo(result.metrics.avgLateness, -32 / 5, 'LPT avgLateness');
  assert.equal(result.metrics.maxLateness, -4);
  assert.equal(result.metrics.makespan, 5);
  assert.equal(result.metrics.totalBurst, 15);
  assert.equal(result.metrics.utilization, 1);
  assert.deepEqual(result.jobs, jobs, 'LPT preserves the source jobs');
  assert.ok(result.notes.some((note) => note.includes('LPT')));
});

test('LPT makespan agrees with an independent P||Cmax simulation', () => {
  const jobs = [
    makeJob('J1', 5, 7, 20, 1),
    makeJob('J2', 0, 6, 20, 2),
    makeJob('J3', 8, 5, 20, 3),
    makeJob('J4', 3, 4, 20, 1),
    makeJob('J5', 2, 3, 20, 2),
    makeJob('J6', 9, 3, 20, 3),
    makeJob('J7', 1, 2, 20, 1),
    makeJob('J8', 6, 2, 20, 2),
    makeJob('J9', 4, 1, 20, 3),
  ];
  const machines = 4;
  const simulated = independentLpt(jobs, machines);
  const result = schedule('lpt', jobs, { machines });

  assert.equal(result.metrics.makespan, simulated.makespan);
  assert.equal(result.metrics.makespan, 9);

  const actualLoads = new Array(machines).fill(0);
  for (const segment of result.segments) {
    actualLoads[segment.machine] += segment.end - segment.start;
  }
  assert.deepEqual(actualLoads, simulated.loads);

  for (const [jobId, expected] of simulated.assignment) {
    assert.equal(result.perJob[jobId].start, expected.start);
    assert.equal(result.perJob[jobId].completion, expected.end);
    const segment = result.segments.find((candidate) => candidate.jobId === jobId);
    assert.equal(segment.machine, expected.machine);
  }

  assert.equal(result.metrics.totalBurst, 33);
  closeTo(result.metrics.utilization, 33 / 36, 'LPT utilization');
});

test('all schedulers preserve invariants on generated jobs', () => {
  const jobs = generateJobs({
    count: 9,
    arrivalSpread: 8,
    burstMin: 1,
    burstMax: 7,
    deadlineSlackMin: 0,
    deadlineSlackMax: 5,
    priorityLevels: 4,
    seed: 20261030,
  });
  const before = JSON.stringify(jobs);

  for (const algorithm of ALGORITHMS) {
    const options = { quantum: 3, machines: 3 };
    const result = schedule(algorithm.id, jobs, options);
    assert.equal(result.algorithmId, algorithm.id);
    assertScheduleInvariants(
      result,
      jobs,
      algorithm.id === 'lpt' ? options.machines : undefined
    );
  }

  assert.equal(JSON.stringify(jobs), before, 'scheduling must not mutate input jobs');
});

test('Round Robin fragments jobs when the quantum is smaller than bursts', () => {
  const jobs = [
    makeJob('J1', 0, 5, 20, 1),
    makeJob('J2', 0, 3, 20, 1),
  ];
  const result = schedule('rr', jobs, { quantum: 2 });
  assert.deepEqual(segmentTuples(result), [
    ['J1', 0, 2],
    ['J2', 2, 4],
    ['J1', 4, 6],
    ['J2', 6, 7],
    ['J1', 7, 8],
  ]);
  assert.equal(result.perJob.J1.completion, 8);
  assert.equal(result.perJob.J2.completion, 7);
  assertScheduleInvariants(result, jobs);
});

test('Round Robin with a quantum larger than all bursts is effectively drain-one-at-a-time', () => {
  const jobs = [
    makeJob('J1', 0, 2, 20, 1),
    makeJob('J2', 1, 3, 20, 1),
    makeJob('J3', 2, 1, 20, 1),
  ];
  const result = schedule('rr', jobs, { quantum: 10 });

  assert.deepEqual(segmentTuples(result), [
    ['J1', 0, 2],
    ['J2', 2, 5],
    ['J3', 5, 6],
  ]);
  assert.equal(result.segments.length, 3, 'no preemption is needed');
  assertScheduleInvariants(result, jobs);
});

test('single-job and zero-arrival-spread edge cases', () => {
  const one = [makeJob('solo', 5, 3, 20, 2)];
  for (const algorithm of ALGORITHMS) {
    const result = schedule(algorithm.id, one, { quantum: 50, machines: 2 });
    assert.equal(result.segments.length, 1, `${algorithm.id} should have one segment`);
    assert.equal(result.segments[0].start, algorithm.id === 'lpt' ? 0 : 5);
    assert.equal(result.segments[0].end, algorithm.id === 'lpt' ? 3 : 8);
    assert.equal(result.metrics.totalBurst, 3);
    assert.equal(result.perJob.solo.completion, algorithm.id === 'lpt' ? 3 : 8);
    assertScheduleInvariants(result, one, algorithm.id === 'lpt' ? 2 : undefined);
  }

  const fcfsOne = schedule('fcfs', one);
  assert.equal(fcfsOne.metrics.makespan, 8);
  closeTo(fcfsOne.metrics.utilization, 3 / 8, 'single idle FCFS utilization');

  const lptOne = schedule('lpt', one, { machines: 2 });
  assert.equal(lptOne.metrics.makespan, 3);
  closeTo(lptOne.metrics.utilization, 3 / 6, 'single LPT utilization');

  const noArrivalSpread = generateJobs({
    count: 5,
    arrivalSpread: 0,
    burstMin: 1,
    burstMax: 4,
    deadlineSlackMin: 1,
    deadlineSlackMax: 3,
    priorityLevels: 3,
    seed: 44,
  });
  assert.ok(noArrivalSpread.every((job) => job.arrival === 0));
  const fcfs = schedule('fcfs', noArrivalSpread);
  let cursor = 0;
  for (const job of noArrivalSpread) {
    assert.equal(fcfs.perJob[job.id].start, cursor, 'equal arrivals use id order');
    cursor += job.burst;
  }
  assert.equal(fcfs.metrics.makespan, fcfs.metrics.totalBurst);
  assert.equal(fcfs.metrics.utilization, 1);
});

test('schedule validates input, options, and copies results defensively', () => {
  const jobs = [makeJob('J1', 0, 2, 5, 1), makeJob('J2', 1, 1, 4, 2)];
  const frozenJobs = Object.freeze(jobs.map((job) => Object.freeze({ ...job })));
  const frozenOptions = Object.freeze({ quantum: 2, machines: 2 });
  const result = schedule('rr', frozenJobs, frozenOptions);

  assert.deepEqual(result.jobs, jobs);
  assert.notStrictEqual(result.jobs, frozenJobs);
  assert.notStrictEqual(result.jobs[0], frozenJobs[0]);
  result.jobs[0].burst = 999;
  assert.equal(frozenJobs[0].burst, 2, 'input jobs must not change through the result');

  assert.throws(() => schedule('does-not-exist', jobs), /Unknown scheduling algorithm/);
  assert.throws(() => schedule('rr', jobs, { quantum: 0 }), /quantum/);
  assert.throws(() => schedule('rr', jobs, { quantum: 1.5 }), /quantum/);
  assert.throws(() => schedule('lpt', jobs, { machines: 0 }), /machines/);
  assert.throws(() => schedule('lpt', jobs, { machines: 2.5 }), /machines/);
  assert.throws(() => schedule('fcfs', 'not-an-array'), /jobs/);
  assert.throws(() => schedule('fcfs', null), /jobs/);
  assert.throws(() => schedule('fcfs', jobs, []), /options/);
  assert.throws(
    () =>
      schedule('fcfs', [
        makeJob('J1', 0, 2, 5, 1),
        makeJob('J1', 1, 2, 5, 1),
      ]),
    /Duplicate job id/
  );
  assert.throws(() => schedule('fcfs', [makeJob('J1', -1, 2, 5, 1)]), /arrival/);
  assert.throws(() => schedule('fcfs', [makeJob('J1', 0, 0, 5, 1)]), /burst/);
  assert.throws(() => schedule('fcfs', [makeJob('J1', 0, 1.5, 5, 1)]), /burst/);
  assert.throws(() => schedule('fcfs', [makeJob('J1', 0, 2, -1, 1)]), /deadline/);
  assert.throws(() => schedule('fcfs', [makeJob('', 0, 2, 5, 1)]), /id/);
  assert.throws(() => schedule('fcfs', [makeJob('J1', 0, 2, 5, 1.5)]), /priority/);

  const empty = schedule('fcfs', []);
  assert.deepEqual(empty.jobs, []);
  assert.deepEqual(empty.segments, []);
  assert.deepEqual(empty.perJob, {});
  assert.deepEqual(empty.metrics, {
    avgWaiting: 0,
    avgTurnaround: 0,
    avgLateness: 0,
    maxLateness: 0,
    makespan: 0,
    utilization: 0,
    totalBurst: 0,
  });

  const emptyLpt = schedule('lpt', [], { machines: 3 });
  assert.deepEqual(emptyLpt.metrics, empty.metrics);
  assert.equal(emptyLpt.machines, 3);
  assert.deepEqual(emptyLpt.segments, []);
});
