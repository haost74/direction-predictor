import type { Direction, Program } from '../types';
import { avg, avgAbs, diff, median, stddev } from './math';

// ─────────────────────────────────────────────────────────────────────────────
// COMPLEXITY + INITIAL WEIGHT
// ─────────────────────────────────────────────────────────────────────────────

export function programComplexity(p: Program): number {
  if (p.category === 'manual') return 1;
  const arrowPart = p.name.split('→')[0];
  const len = (arrowPart.match(/[↑↓]/g) ?? []).length;
  if (len >= 2) return len;
  return 2;
}

export function initialWeight(p: Program): number {
  return Math.pow(2, -programComplexity(p));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MANUAL — soft signal where there is natural measure
// ─────────────────────────────────────────────────────────────────────────────

function buildManualPrograms(): Program[] {
  return [
    {
      // Strength and direction of the last step — normalized to average step
      name: 'trend (moment)',
      category: 'manual',
      fn: (s, d) => {
        if (d.length < 1) return 0;
        if (s.length < 3) return d[d.length - 1]; // little data — hard
        const lastAbs = Math.abs(s[s.length - 1] - s[s.length - 2]);
        const avgStep = avgAbs(diff(s.slice(-6))) + 1e-9;
        const strength = Math.min(lastAbs / avgStep, 2) / 2; // [0..1]
        return d[d.length - 1] * strength;
      },
    },
    {
      name: 'anti-trend',
      category: 'manual',
      fn: (s, d) => {
        if (d.length < 1) return 0;
        if (s.length < 3) return -d[d.length - 1];
        const lastAbs = Math.abs(s[s.length - 1] - s[s.length - 2]);
        const avgStep = avgAbs(diff(s.slice(-6))) + 1e-9;
        const strength = Math.min(lastAbs / avgStep, 2) / 2;
        return -d[d.length - 1] * strength;
      },
    },
    {
      // Acceleration magnitude is continuous
      name: 'acceleration Δ',
      category: 'manual',
      fn: (s) => {
        if (s.length < 4) return 0;
        const d1 = s[s.length - 1] - s[s.length - 2];
        const d2 = s[s.length - 2] - s[s.length - 3];
        const scale = avgAbs(diff(s.slice(-6))) + 1e-9;
        return Math.max(-1, Math.min(1, (d1 - d2) / scale));
      },
    },
    {
      name: 'deceleration Δ',
      category: 'manual',
      fn: (s) => {
        if (s.length < 4) return 0;
        const d1 = s[s.length - 1] - s[s.length - 2];
        const d2 = s[s.length - 2] - s[s.length - 3];
        const scale = avgAbs(diff(s.slice(-6))) + 1e-9;
        return Math.max(-1, Math.min(1, (d2 - d1) / scale));
      },
    },
    {
      // z-score — continuous measure of deviation from mean
      name: 'mean reversion (3)',
      category: 'manual',
      fn: (s) => {
        if (s.length < 3) return 0;
        const slice = s.slice(-3);
        const z = (s[s.length - 1] - avg(slice)) / (stddev(slice) + 1e-9);
        return Math.max(-1, Math.min(1, -z / 2));
      },
    },
    {
      name: 'mean reversion (5)',
      category: 'manual',
      fn: (s) => {
        if (s.length < 5) return 0;
        const slice = s.slice(-5);
        const z = (s[s.length - 1] - avg(slice)) / (stddev(slice) + 1e-9);
        return Math.max(-1, Math.min(1, -z / 2));
      },
    },
    {
      name: 'mean reversion (10)',
      category: 'manual',
      fn: (s) => {
        if (s.length < 10) return 0;
        const slice = s.slice(-10);
        const z = (s[s.length - 1] - avg(slice)) / (stddev(slice) + 1e-9);
        return Math.max(-1, Math.min(1, -z / 2));
      },
    },
    {
      name: 'follows mean (5)',
      category: 'manual',
      fn: (s) => {
        if (s.length < 5) return 0;
        const slice = s.slice(-5);
        const z = (s[s.length - 1] - avg(slice)) / (stddev(slice) + 1e-9);
        return Math.max(-1, Math.min(1, z / 2));
      },
    },
    {
      name: 'below median → ↑',
      category: 'manual',
      fn: (s) => {
        if (s.length < 5) return 0;
        const slice = s.slice(-10);
        const z = (s[s.length - 1] - median(slice)) / (stddev(slice) + 1e-9);
        return Math.max(-1, Math.min(1, -z / 2));
      },
    },
    // Constant signals — weak, without measure
    { name: 'always ↑', category: 'manual', fn: () => 0.5 },
    { name: 'always ↓', category: 'manual', fn: () => -0.5 },
    {
      // Ratio of step to mean — continuous measure
      name: 'large step → reversal',
      category: 'manual',
      fn: (s, d) => {
        if (s.length < 4 || !d.length) return 0;
        const r = Math.abs(s[s.length - 1] - s[s.length - 2]);
        const av = avgAbs(diff(s.slice(-6))) + 1e-9;
        const excess = r / av - 1.2; // 0 when ratio=1.2, grows further
        if (excess <= 0) return 0;
        return -d[d.length - 1] * Math.min(excess / 1.8, 1);
      },
    },
    {
      name: 'small step → continuation',
      category: 'manual',
      fn: (s, d) => {
        if (s.length < 4 || !d.length) return 0;
        const r = Math.abs(s[s.length - 1] - s[s.length - 2]);
        const av = avgAbs(diff(s.slice(-6))) + 1e-9;
        const smallness = 0.6 - r / av; // > 0 if small step
        if (smallness <= 0) return 0;
        return d[d.length - 1] * Math.min(smallness / 0.6, 1);
      },
    },
    {
      // Proportion of ↑ in window — continuous
      name: 'balance ↑ in window 5',
      category: 'manual',
      fn: (_s, d) => {
        if (d.length < 5) return 0;
        const ups = d.slice(-5).filter((v) => v > 0).length;
        return -(ups / 5 - 0.5) * 2; // 1→-1, 0.5→0, 0→+1
      },
    },
    {
      name: 'balance ↑ in window 10',
      category: 'manual',
      fn: (_s, d) => {
        if (d.length < 10) return 0;
        const ups = d.slice(-10).filter((v) => v > 0).length;
        return -(ups / 10 - 0.5) * 2;
      },
    },
    {
      // Volatility ratio — continuous measure
      name: 'volatility → reversal',
      category: 'manual',
      fn: (s, d) => {
        if (s.length < 8 || !d.length) return 0;
        const oldVol = stddev(s.slice(-8, -4)) + 1e-9;
        const newVol = stddev(s.slice(-4));
        const excess = newVol / oldVol - 1.2;
        if (excess <= 0) return 0;
        return -d[d.length - 1] * Math.min(excess / 1.8, 1);
      },
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PATTERNS — strict match, ±1 / 0
// ─────────────────────────────────────────────────────────────────────────────

function generatePatternPrograms(): Program[] {
  const programs: Program[] = [];
  for (let len = 2; len <= 7; len++) {
    const numPatterns = Math.pow(2, len);
    for (let pi = 0; pi < numPatterns; pi++) {
      const pattern: Direction[] = [];
      for (let b = len - 1; b >= 0; b--)
        pattern.push(((pi >> b) & 1 ? 1 : -1) as Direction);
      const label = pattern.map((v) => (v > 0 ? '↑' : '↓')).join('');
      for (const pr of [1, -1] as const) {
        const p = [...pattern], prr = pr;
        programs.push({
          name: `${label}→${pr > 0 ? '↑' : '↓'}`,
          category: 'pattern',
          fn: (_s, d): number => {
            if (d.length < len) return 0;
            const tail = d.slice(-len);
            for (let i = 0; i < len; i++) if (tail[i] !== p[i]) return 0;
            return prr; // ±1 — exact match
          },
        });
      }
    }
  }
  return programs;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DIFF RULES — binary conditions ±1/0, soft where there is magnitude
// ─────────────────────────────────────────────────────────────────────────────

function generateDiffPrograms(): Program[] {
  const programs: Program[] = [];

  // Binary pairwise comparisons of signs — hard ±1
  const addBinaryPair = (
    baseName: string,
    cond: (s: number[]) => boolean | null,
  ) => {
    for (const pr of [1, -1] as const) {
      const prr = pr;
      programs.push({
        name: `${baseName}→${pr > 0 ? '↑' : '↓'}`,
        category: 'pattern',
        fn: (s): number => {
          const r = cond(s);
          return r === null ? 0 : r ? prr : 0;
        },
      });
    }
  };

  // sign(Δ1) == sign(Δ2) — binary
  addBinaryPair('sign(Δ1)==sign(Δ2)', (s) => {
    if (s.length < 3) return null;
    return Math.sign(s[s.length-1]-s[s.length-2]) === Math.sign(s[s.length-2]-s[s.length-3]);
  });

  addBinaryPair('sign(Δ1)≠sign(Δ2)', (s) => {
    if (s.length < 3) return null;
    return Math.sign(s[s.length-1]-s[s.length-2]) !== Math.sign(s[s.length-2]-s[s.length-3]);
  });

  addBinaryPair('sign(Δ1)==sign(Δ3)', (s) => {
    if (s.length < 4) return null;
    return Math.sign(s[s.length-1]-s[s.length-2]) === Math.sign(s[s.length-3]-s[s.length-4]);
  });

  addBinaryPair('sign(Δ1)≠sign(Δ3)', (s) => {
    if (s.length < 4) return null;
    return Math.sign(s[s.length-1]-s[s.length-2]) !== Math.sign(s[s.length-3]-s[s.length-4]);
  });

  // Normalized continuous diff-signals — soft
  const addSoft = (name: string, compute: (s: number[]) => number | null) => {
    programs.push({
      name,
      category: 'pattern',
      fn: (s): number => {
        const v = compute(s);
        return v === null ? 0 : Math.max(-1, Math.min(1, v));
      },
    });
  };

  // Normalized Δ1 — continuous trend strength
  addSoft('softΔ1', (s) => {
    if (s.length < 3) return null;
    const d1 = s[s.length-1] - s[s.length-2];
    return d1 / (avgAbs(diff(s.slice(-6))) + 1e-9);
  });

  // Normalized acceleration (Δ1 - Δ2)
  addSoft('softAccel', (s) => {
    if (s.length < 4) return null;
    const d1 = s[s.length-1] - s[s.length-2];
    const d2 = s[s.length-2] - s[s.length-3];
    return (d1 - d2) / (avgAbs(diff(s.slice(-6))) + 1e-9);
  });

  addSoft('softDecel', (s) => {
    if (s.length < 4) return null;
    const d1 = s[s.length-1] - s[s.length-2];
    const d2 = s[s.length-2] - s[s.length-3];
    return (d2 - d1) / (avgAbs(diff(s.slice(-6))) + 1e-9);
  });

  // Normalized Δ1 relative to different windows
  for (const k of [3, 5, 7, 10]) {
    const kk = k;
    addSoft(`softRelΔ(${kk})`, (s) => {
      if (s.length < kk + 2) return null;
      const d1 = s[s.length-1] - s[s.length-2];
      return d1 / (avgAbs(diff(s.slice(-(kk+1)))) + 1e-9);
    });
  }

  // Normalized volatility increase
  addSoft('softVolChg', (s) => {
    if (s.length < 5) return null;
    const a1 = Math.abs(s[s.length-1] - s[s.length-2]);
    const a2 = Math.abs(s[s.length-2] - s[s.length-3]);
    // > 0 = volatility increase, reverse sign (reversal)
    return -(a1 / (a2 + 1e-9) - 1);
  });

  return programs;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MEAN REVERSION — z-score continuous, soft
// ─────────────────────────────────────────────────────────────────────────────

function generateMeanReversionPrograms(): Program[] {
  const programs: Program[] = [];
  const windows = [2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 20];

  for (const k of windows) {
    const kk = k;

    programs.push({
      name: `zRev(${kk})`,
      category: 'pattern',
      fn: (s): number => {
        if (s.length < kk) return 0;
        const slice = s.slice(-kk);
        const z = (s[s.length-1] - avg(slice)) / (stddev(slice) + 1e-9);
        return Math.max(-1, Math.min(1, -z / 2));
      },
    });

    programs.push({
      name: `zTrend(${kk})`,
      category: 'pattern',
      fn: (s): number => {
        if (s.length < kk) return 0;
        const slice = s.slice(-kk);
        const z = (s[s.length-1] - avg(slice)) / (stddev(slice) + 1e-9);
        return Math.max(-1, Math.min(1, z / 2));
      },
    });

    if (kk >= 4) {
      // Bollinger: soft signal only beyond ±1σ
      programs.push({
        name: `bollingerRev(${kk})`,
        category: 'pattern',
        fn: (s): number => {
          if (s.length < kk) return 0;
          const slice = s.slice(-kk);
          const z = (s[s.length-1] - avg(slice)) / (stddev(slice) + 1e-9);
          if (Math.abs(z) < 1) return 0; // inside bands — no signal
          return Math.max(-1, Math.min(1, -z / 2));
        },
      });
    }
  }

  for (const k of [5, 7, 10, 14, 20]) {
    const kk = k;
    programs.push({
      name: `medRev(${kk})`,
      category: 'pattern',
      fn: (s): number => {
        if (s.length < kk) return 0;
        const slice = s.slice(-kk);
        const z = (s[s.length-1] - median(slice)) / (stddev(slice) + 1e-9);
        return Math.max(-1, Math.min(1, -z / 2));
      },
    });
  }

  return programs;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MOMENTUM — normalized impulse, soft
// ─────────────────────────────────────────────────────────────────────────────

function generateMomentumPrograms(): Program[] {
  const programs: Program[] = [];
  const windows = [2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20];

  for (const k of windows) {
    const kk = k;

    programs.push({
      name: `mom(${kk})`,
      category: 'pattern',
      fn: (s): number => {
        if (s.length < kk + 2) return 0;
        const mom = s[s.length-1] - s[s.length-1-kk];
        const scale = avgAbs(diff(s.slice(-(kk+1)))) * kk + 1e-9;
        return Math.max(-1, Math.min(1, mom / scale));
      },
    });

    programs.push({
      name: `momRev(${kk})`,
      category: 'pattern',
      fn: (s): number => {
        if (s.length < kk + 2) return 0;
        const mom = s[s.length-1] - s[s.length-1-kk];
        const scale = avgAbs(diff(s.slice(-(kk+1)))) * kk + 1e-9;
        return Math.max(-1, Math.min(1, -mom / scale));
      },
    });

    // Proportion of ↑ — continuous
    programs.push({
      name: `upRatio(${kk})`,
      category: 'pattern',
      fn: (_s, d): number => {
        if (d.length < kk) return 0;
        const ups = d.slice(-kk).filter((v) => v > 0).length;
        return -(ups / kk - 0.5) * 2;
      },
    });
  }

  return programs;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CYCLE — mod match binary, x vs x[t-n] soft
// ─────────────────────────────────────────────────────────────────────────────

function generateCyclePrograms(): Program[] {
  const programs: Program[] = [];

  // t mod n == r — binary match, ±1
  for (let n = 2; n <= 8; n++) {
    for (let r = 0; r < n; r++) {
      const nn = n, rr = r;
      programs.push({
        name: `t%${nn}==${rr}→↑`,
        category: 'pattern',
        fn: (s): number => ((s.length - 1) % nn === rr ? 1 : 0),
      });
      programs.push({
        name: `t%${nn}==${rr}→↓`,
        category: 'pattern',
        fn: (s): number => ((s.length - 1) % nn === rr ? -1 : 0),
      });
    }
  }

  // x vs x[t-n] — normalized difference, soft
  for (const n of [2, 3, 4, 5, 6, 7, 8, 10, 12]) {
    const nn = n;

    programs.push({
      name: `cycleRev(${nn})`,
      category: 'pattern',
      fn: (s): number => {
        if (s.length < nn + 2) return 0;
        const delta = s[s.length-1] - s[s.length-1-nn];
        const scale = avgAbs(diff(s.slice(-(nn+1)))) * nn + 1e-9;
        return Math.max(-1, Math.min(1, -delta / scale));
      },
    });

    programs.push({
      name: `cycleTrend(${nn})`,
      category: 'pattern',
      fn: (s): number => {
        if (s.length < nn + 2) return 0;
        const delta = s[s.length-1] - s[s.length-1-nn];
        const scale = avgAbs(diff(s.slice(-(nn+1)))) * nn + 1e-9;
        return Math.max(-1, Math.min(1, delta / scale));
      },
    });
  }

  // dirEcho — binary direction match, ±1
  for (const n of [2, 3, 4, 5, 6, 7]) {
    const nn = n;
    programs.push({
      name: `dirEcho(${nn})`,
      category: 'pattern',
      fn: (_s, d): number => {
        if (d.length < nn + 1) return 0;
        return d[d.length-1] === d[d.length-1-nn] ? d[d.length-1] : 0;
      },
    });
    programs.push({
      name: `dirAntiEcho(${nn})`,
      category: 'pattern',
      fn: (_s, d): number => {
        if (d.length < nn + 1) return 0;
        return d[d.length-1] !== d[d.length-1-nn]
          ? (-d[d.length-1] as Direction) : 0;
      },
    });
  }

  return programs;
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────

export const MANUAL_PROGRAMS:   Program[] = buildManualPrograms();
export const PATTERN_PROGRAMS:  Program[] = generatePatternPrograms();
export const DIFF_PROGRAMS:     Program[] = generateDiffPrograms();
export const MEAN_PROGRAMS:     Program[] = generateMeanReversionPrograms();
export const MOMENTUM_PROGRAMS: Program[] = generateMomentumPrograms();
export const CYCLE_PROGRAMS:    Program[] = generateCyclePrograms();

export const ALL_PROGRAMS: Program[] = [
  ...MANUAL_PROGRAMS,
  ...PATTERN_PROGRAMS,
  ...DIFF_PROGRAMS,
  ...MEAN_PROGRAMS,
  ...MOMENTUM_PROGRAMS,
  ...CYCLE_PROGRAMS,
];