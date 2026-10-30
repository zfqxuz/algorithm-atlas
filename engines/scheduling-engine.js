/*
 * Dependency-free scheduling algorithms for the educational visualizer.
 *
 * The module is deliberately pure: jobs and options are validated, copied, and
 * never mutated. All schedule boundaries are integer time units.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SchedulingEngine = factory();
  }
})(
  typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
      ? globalThis
      : typeof self !== 'undefined'
        ? self
        : this,
  function () {
    'use strict';

    const ALGORITHMS = Object.freeze([
      Object.freeze({
        id: 'fcfs',
        name: '先来先服务',
        en: 'FCFS',
        level: 'L1',
        description: '按到达顺序占用 CPU；非抢占、实现简单，但长作业可能阻塞后面的短作业（护航效应）。',
        time: 'O(n log n)',
        space: 'O(n)',
      }),
      Object.freeze({
        id: 'sjf',
        name: '最短作业优先',
        en: 'SJF',
        level: 'L1',
        description: '每次选择已到达作业中运行时间最短者；非抢占，可最小化平均等待时间。',
        time: 'O(n²)',
        space: 'O(n)',
      }),
      Object.freeze({
        id: 'priority',
        name: '优先级调度',
        en: 'Priority Scheduling',
        level: 'L2',
        description: '按优先级选择已到达作业，数值越小优先级越高；非抢占，低优先级作业可能饥饿。',
        time: 'O(n²)',
        space: 'O(n)',
      }),
      Object.freeze({
        id: 'rr',
        name: '时间片轮转',
        en: 'Round Robin',
        level: 'L2',
        description: '每个作业最多连续运行一个时间片；可抢占、响应公平，但上下文切换更频繁。',
        time: 'O(n)',
        space: 'O(n)',
      }),
      Object.freeze({
        id: 'edf',
        name: '最早截止期优先',
        en: 'Earliest Deadline First',
        level: 'L3',
        description: '每个整数时刻选择绝对截止期最早的已到达作业；可抢占，是单机实时调度的最优规则。',
        time: 'O(n log n)',
        space: 'O(n)',
      }),
      Object.freeze({
        id: 'lpt',
        name: '多机 LPT 近似',
        en: 'Longest Processing Time',
        level: 'L4',
        description: '按处理时长降序把作业放到当前负载最小的机器，是 P||Cmax 的经典近似算法。',
        time: 'O(n log n + n log m)',
        space: 'O(n + m)',
      }),
    ]);

    const ALGORITHM_IDS = new Set(ALGORITHMS.map((algorithm) => algorithm.id));

    const DEFAULT_GENERATOR_PARAMS = Object.freeze({
      count: 6,
      arrivalSpread: 10,
      burstMin: 1,
      burstMax: 5,
      deadlineSlackMin: 0,
      deadlineSlackMax: 5,
      priorityLevels: 3,
      seed: 1,
    });

    /* ------------------------------------------------------------------ */
    /* Small helpers                                                       */
    /* ------------------------------------------------------------------ */

    function compareIds(a, b) {
      const left = String(a);
      const right = String(b);
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    }

    function cloneValue(value) {
      if (Array.isArray(value)) return value.map(cloneValue);
      if (value && typeof value === 'object') {
        const copy = {};
        for (const key of Object.keys(value)) {
          Object.defineProperty(copy, key, {
            value: cloneValue(value[key]),
            enumerable: true,
            writable: true,
            configurable: true,
          });
        }
        return copy;
      }
      return value;
    }

    function makeSegment(jobId, start, end, machine) {
      const segment = { jobId, start, end };
      if (machine !== undefined) segment.machine = machine;
      return segment;
    }

    function compareSegments(a, b) {
      if (a.start !== b.start) return a.start - b.start;
      const machineA = a.machine === undefined ? 0 : a.machine;
      const machineB = b.machine === undefined ? 0 : b.machine;
      if (machineA !== machineB) return machineA - machineB;
      return compareIds(a.jobId, b.jobId);
    }

    /*
     * Merge only segments that touch end-to-start. The Round Robin scheduler
     * deliberately keeps its quantum slices separate so the visualizer can show
     * the preemption cadence.
     */
    function normalizeSegments(rawSegments, mergeAdjacent) {
      const segments = rawSegments
        .map((segment) =>
          makeSegment(segment.jobId, segment.start, segment.end, segment.machine)
        )
        .sort(compareSegments);

      if (!mergeAdjacent) return segments;

      const merged = [];
      for (const segment of segments) {
        const previous = merged[merged.length - 1];
        if (
          previous &&
          previous.jobId === segment.jobId &&
          previous.machine === segment.machine &&
          previous.end === segment.start
        ) {
          previous.end = segment.end;
        } else {
          merged.push(segment);
        }
      }
      return merged;
    }

    function normalizeAlgorithmId(algorithmId) {
      if (typeof algorithmId !== 'string') {
        throw new TypeError('algorithmId must be a string.');
      }
      const normalized = algorithmId.trim().toLowerCase();
      if (!ALGORITHM_IDS.has(normalized)) {
        throw new RangeError(
          `Unknown scheduling algorithm: ${algorithmId}. Expected one of: ${Array.from(
            ALGORITHM_IDS
          ).join(', ')}.`
        );
      }
      return normalized;
    }

    function normalizeOptions(options) {
      if (options === undefined || options === null) return {};
      if (typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('options must be an object.');
      }
      return options;
    }

    function positiveIntegerOption(options, key, fallback) {
      const value = options[key] === undefined ? fallback : options[key];
      if (!Number.isInteger(value) || value < 1) {
        throw new RangeError(`${key} must be a positive integer.`);
      }
      return value;
    }

    /* ------------------------------------------------------------------ */
    /* Job validation                                                     */
    /* ------------------------------------------------------------------ */

    function validateAndCloneJobs(jobs) {
      if (!Array.isArray(jobs)) throw new TypeError('jobs must be an array.');

      const clonedJobs = cloneValue(jobs);
      const seenIds = new Set();

      clonedJobs.forEach((job, index) => {
        if (!job || typeof job !== 'object' || Array.isArray(job)) {
          throw new TypeError(`jobs[${index}] must be an object.`);
        }
        if (typeof job.id !== 'string' || job.id.length === 0) {
          throw new TypeError(`jobs[${index}].id must be a non-empty string.`);
        }
        if (seenIds.has(job.id)) {
          throw new RangeError(`Duplicate job id: ${job.id}.`);
        }
        seenIds.add(job.id);

        if (!Number.isInteger(job.arrival) || job.arrival < 0) {
          throw new RangeError(`Job ${job.id}: arrival must be a non-negative integer.`);
        }
        if (!Number.isInteger(job.burst) || job.burst < 1) {
          throw new RangeError(`Job ${job.id}: burst must be a positive integer.`);
        }
        if (!Number.isInteger(job.deadline) || job.deadline < 0) {
          throw new RangeError(`Job ${job.id}: deadline must be a non-negative integer.`);
        }
        if (!Number.isInteger(job.priority)) {
          throw new RangeError(`Job ${job.id}: priority must be an integer.`);
        }
      });

      return clonedJobs;
    }

    /* ------------------------------------------------------------------ */
    /* Job generator                                                      */
    /* ------------------------------------------------------------------ */

    function createRandom(seed) {
      let state = seed >>> 0;
      return function random() {
        state = (state + 0x6d2b79f5) | 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      };
    }

    function randomInteger(random, min, max) {
      return min + Math.floor(random() * (max - min + 1));
    }

    function integerParameter(params, key, fallback, min, max) {
      const value = params[key] === undefined ? fallback : params[key];
      if (!Number.isInteger(value)) {
        throw new RangeError(`${key} must be an integer.`);
      }
      if (value < min || value > max) {
        throw new RangeError(`${key} must be between ${min} and ${max}.`);
      }
      return value;
    }

    function generateJobs(params) {
      if (params === undefined || params === null) params = {};
      if (typeof params !== 'object' || Array.isArray(params)) {
        throw new TypeError('params must be an object.');
      }

      const count = integerParameter(
        params,
        'count',
        DEFAULT_GENERATOR_PARAMS.count,
        3,
        12
      );
      const arrivalSpread = integerParameter(
        params,
        'arrivalSpread',
        DEFAULT_GENERATOR_PARAMS.arrivalSpread,
        0,
        20
      );
      const burstMin = integerParameter(
        params,
        'burstMin',
        DEFAULT_GENERATOR_PARAMS.burstMin,
        1,
        10
      );
      const burstMax = integerParameter(
        params,
        'burstMax',
        DEFAULT_GENERATOR_PARAMS.burstMax,
        1,
        15
      );
      if (burstMax < burstMin) {
        throw new RangeError('burstMax must be greater than or equal to burstMin.');
      }

      const deadlineSlackMin = integerParameter(
        params,
        'deadlineSlackMin',
        DEFAULT_GENERATOR_PARAMS.deadlineSlackMin,
        0,
        12
      );
      const deadlineSlackMax =
        params.deadlineSlackMax === undefined
          ? DEFAULT_GENERATOR_PARAMS.deadlineSlackMax
          : params.deadlineSlackMax;
      if (!Number.isInteger(deadlineSlackMax) || deadlineSlackMax < deadlineSlackMin) {
        throw new RangeError(
          'deadlineSlackMax must be an integer greater than or equal to deadlineSlackMin.'
        );
      }

      const priorityLevels = integerParameter(
        params,
        'priorityLevels',
        DEFAULT_GENERATOR_PARAMS.priorityLevels,
        2,
        5
      );

      const rawSeed = params.seed === undefined ? DEFAULT_GENERATOR_PARAMS.seed : params.seed;
      if (typeof rawSeed !== 'number' || !Number.isFinite(rawSeed)) {
        throw new RangeError('seed must be a finite number.');
      }
      const seed = Math.trunc(rawSeed) >>> 0;
      const random = createRandom(seed);

      const jobs = [];
      for (let index = 0; index < count; index += 1) {
        const arrival = randomInteger(random, 0, arrivalSpread);
        const burst = randomInteger(random, burstMin, burstMax);
        const slack = randomInteger(random, deadlineSlackMin, deadlineSlackMax);
        const deadline = arrival + burst + slack;
        const priority = randomInteger(random, 1, priorityLevels);
        jobs.push({
          id: `J${index + 1}`,
          arrival,
          burst,
          deadline,
          priority,
        });
      }
      return jobs;
    }

    /* ------------------------------------------------------------------ */
    /* Non-preemptive schedulers                                          */
    /* ------------------------------------------------------------------ */

    function scheduleNonpreemptive(jobs, compareCandidates) {
      const pending = new Map(jobs.map((job) => [job.id, job]));
      const segments = [];
      let time = 0;

      while (pending.size > 0) {
        const ready = [];
        for (const job of pending.values()) {
          if (job.arrival <= time) ready.push(job);
        }

        if (ready.length === 0) {
          let nextArrival = Infinity;
          for (const job of pending.values()) {
            if (job.arrival < nextArrival) nextArrival = job.arrival;
          }
          time = nextArrival;
          continue;
        }

        ready.sort(compareCandidates);
        const job = ready[0];
        const start = time;
        const end = start + job.burst;
        segments.push(makeSegment(job.id, start, end));
        pending.delete(job.id);
        time = end;
      }

      return segments;
    }

    function byArrivalThenId(a, b) {
      return a.arrival - b.arrival || compareIds(a.id, b.id);
    }

    function scheduleFcfs(jobs) {
      return scheduleNonpreemptive(jobs, byArrivalThenId);
    }

    function scheduleSjf(jobs) {
      return scheduleNonpreemptive(
        jobs,
        (a, b) => a.burst - b.burst || byArrivalThenId(a, b)
      );
    }

    function schedulePriority(jobs) {
      return scheduleNonpreemptive(
        jobs,
        (a, b) => a.priority - b.priority || byArrivalThenId(a, b)
      );
    }

    /* ------------------------------------------------------------------ */
    /* Round Robin                                                        */
    /* ------------------------------------------------------------------ */

    function scheduleRoundRobin(jobs, quantum) {
      const byArrival = jobs
        .slice()
        .sort((a, b) => a.arrival - b.arrival || compareIds(a.id, b.id));
      const remaining = new Map(jobs.map((job) => [job.id, job.burst]));
      const completed = new Set();
      const readyQueue = [];
      const segments = [];
      let nextArrival = 0;
      let time = 0;

      const admitArrivals = (upTo) => {
        while (nextArrival < byArrival.length && byArrival[nextArrival].arrival <= upTo) {
          readyQueue.push(byArrival[nextArrival]);
          nextArrival += 1;
        }
      };

      admitArrivals(0);

      while (completed.size < jobs.length) {
        if (readyQueue.length === 0) {
          if (nextArrival >= byArrival.length) break;
          time = Math.max(time, byArrival[nextArrival].arrival);
          admitArrivals(time);
          continue;
        }

        const job = readyQueue.shift();
        const left = remaining.get(job.id);
        if (left === undefined || left <= 0) continue;

        const start = time;
        const run = Math.min(quantum, left);
        const end = start + run;
        segments.push(makeSegment(job.id, start, end));
        const rest = left - run;
        remaining.set(job.id, rest);
        time = end;

        // Jobs that arrived during this quantum join before the preempted job.
        admitArrivals(time);

        if (rest === 0) {
          completed.add(job.id);
        } else {
          readyQueue.push(job);
        }
      }

      return segments;
    }

    /* ------------------------------------------------------------------ */
    /* Earliest Deadline First                                            */
    /* ------------------------------------------------------------------ */

    function scheduleEdf(jobs) {
      const remaining = new Map(jobs.map((job) => [job.id, job.burst]));
      const segments = [];
      let completedCount = 0;
      let time = 0;

      while (completedCount < jobs.length) {
        const ready = jobs.filter(
          (job) => remaining.get(job.id) > 0 && job.arrival <= time
        );

        if (ready.length === 0) {
          let nextArrival = Infinity;
          for (const job of jobs) {
            if (remaining.get(job.id) > 0 && job.arrival < nextArrival) {
              nextArrival = job.arrival;
            }
          }
          time = nextArrival;
          continue;
        }

        ready.sort(
          (a, b) =>
            a.deadline - b.deadline ||
            a.arrival - b.arrival ||
            compareIds(a.id, b.id)
        );

        const job = ready[0];
        const start = time;
        const end = start + 1;
        const previous = segments[segments.length - 1];
        if (previous && previous.jobId === job.id && previous.end === start) {
          previous.end = end;
        } else {
          segments.push(makeSegment(job.id, start, end));
        }

        const rest = remaining.get(job.id) - 1;
        remaining.set(job.id, rest);
        time = end;
        if (rest === 0) completedCount += 1;
      }

      return segments;
    }

    /* ------------------------------------------------------------------ */
    /* Longest Processing Time (multi-machine list scheduling)             */
    /* ------------------------------------------------------------------ */

    function scheduleLpt(jobs, machines) {
      const ordered = jobs
        .slice()
        .sort((a, b) => b.burst - a.burst || compareIds(a.id, b.id));
      const loads = new Array(machines).fill(0);
      const segments = [];

      for (const job of ordered) {
        let machine = 0;
        for (let index = 1; index < machines; index += 1) {
          if (loads[index] < loads[machine]) machine = index;
        }
        const start = loads[machine];
        const end = start + job.burst;
        segments.push(makeSegment(job.id, start, end, machine));
        loads[machine] = end;
      }

      return segments;
    }

    /* ------------------------------------------------------------------ */
    /* Shared result assembly                                             */
    /* ------------------------------------------------------------------ */

    function buildResult(algorithmId, jobs, rawSegments, config) {
      const segments = normalizeSegments(rawSegments, config.mergeAdjacent === true);
      const machineCount = config.machines === undefined ? 1 : config.machines;
      const zeroArrival = config.zeroArrival === true;
      const segmentsByJob = new Map(jobs.map((job) => [job.id, []]));

      for (const segment of segments) {
        const ownSegments = segmentsByJob.get(segment.jobId);
        if (!ownSegments) {
          throw new Error(`Internal error: segment references unknown job ${segment.jobId}.`);
        }
        ownSegments.push(segment);
      }

      const perJob = {};
      let sumWaiting = 0;
      let sumTurnaround = 0;
      let sumLateness = 0;
      let maxLateness = jobs.length === 0 ? 0 : -Infinity;
      let makespan = 0;

      for (const job of jobs) {
        const ownSegments = segmentsByJob.get(job.id);
        if (ownSegments.length === 0) {
          throw new Error(`Internal error: job ${job.id} was not scheduled.`);
        }

        const start = ownSegments[0].start;
        const completion = ownSegments.reduce(
          (latest, segment) => Math.max(latest, segment.end),
          ownSegments[0].end
        );
        const effectiveArrival = zeroArrival ? 0 : job.arrival;
        const turnaround = completion - effectiveArrival;
        const waiting = turnaround - job.burst;
        const lateness = completion - job.deadline;

        Object.defineProperty(perJob, job.id, {
          value: {
            arrival: effectiveArrival,
            burst: job.burst,
            start,
            completion,
            waiting,
            turnaround,
            lateness,
          },
          enumerable: true,
          writable: true,
          configurable: true,
        });

        sumWaiting += waiting;
        sumTurnaround += turnaround;
        sumLateness += lateness;
        maxLateness = Math.max(maxLateness, lateness);
        makespan = Math.max(makespan, completion);
      }

      const jobCount = jobs.length;
      const totalBurst = jobs.reduce((total, job) => total + job.burst, 0);
      const utilization =
        makespan > 0 ? totalBurst / (makespan * machineCount) : 0;

      const result = {
        algorithmId,
        jobs,
        segments,
        metrics: {
          avgWaiting: jobCount === 0 ? 0 : sumWaiting / jobCount,
          avgTurnaround: jobCount === 0 ? 0 : sumTurnaround / jobCount,
          avgLateness: jobCount === 0 ? 0 : sumLateness / jobCount,
          maxLateness,
          makespan,
          utilization,
          totalBurst,
        },
        perJob,
      };

      if (config.machines !== undefined) result.machines = config.machines;
      if (config.notes && config.notes.length > 0) result.notes = config.notes.slice();
      return result;
    }

    /* ------------------------------------------------------------------ */
    /* Public API                                                         */
    /* ------------------------------------------------------------------ */

    function schedule(algorithmId, jobs, options) {
      const normalizedId = normalizeAlgorithmId(algorithmId);
      const safeJobs = validateAndCloneJobs(jobs);
      const safeOptions = normalizeOptions(options);
      let rawSegments;
      let config = { mergeAdjacent: false };

      switch (normalizedId) {
        case 'fcfs':
          rawSegments = scheduleFcfs(safeJobs);
          break;
        case 'sjf':
          rawSegments = scheduleSjf(safeJobs);
          break;
        case 'priority':
          rawSegments = schedulePriority(safeJobs);
          break;
        case 'rr': {
          const quantum = positiveIntegerOption(safeOptions, 'quantum', 2);
          rawSegments = scheduleRoundRobin(safeJobs, quantum);
          break;
        }
        case 'edf':
          rawSegments = scheduleEdf(safeJobs);
          config.mergeAdjacent = true;
          break;
        case 'lpt': {
          const machines = positiveIntegerOption(safeOptions, 'machines', 2);
          rawSegments = scheduleLpt(safeJobs, machines);
          config = {
            mergeAdjacent: false,
            machines,
            zeroArrival: true,
            notes: [
              'LPT 将所有作业视为时刻 0 到达；原始到达时间仍保留在 jobs 中，perJob.arrival 记为 0。',
              'machine 从 0 开始编号；makespan 为最后一台机器的完工时间。',
            ],
          };
          break;
        }
        default:
          throw new RangeError(`Unsupported scheduling algorithm: ${normalizedId}.`);
      }

      return buildResult(normalizedId, safeJobs, rawSegments, config);
    }

    return Object.freeze({
      ALGORITHMS,
      generateJobs,
      schedule,
    });
  }
);
