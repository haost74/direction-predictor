import type { Direction, Program } from '../types';
import { avg, avgAbs, diff, median, stddev } from './math';

// ─── Manual programs ─────────────────────────────────────────────────────────

function buildManualPrograms(): Program[] {
  return [
    {
      name: 'trend (momentum)',
      category: 'manual',
      fn: (_s, d) => (d.length >= 1 ? d[d.length - 1] : 0),
    },
    {
      name: 'anti-trend',
      category: 'manual',
      fn: (_s, d) => (d.length >= 1 ? ((-d[d.length - 1]) as Direction) : 0),
    },
    {
      name: 'acceleration Δ',
      category: 'manual',
      fn: (_s, d) =>
        d.length >= 2 ? (d[d.length - 1] > d[d.length - 2] ? 1 : -1) : 0,
    },
    {
      name: 'deceleration Δ',
      category: 'manual',
      fn: (_s, d) =>
        d.length >= 2 ? (d[d.length - 1] < d[d.length - 2] ? 1 : -1) : 0,
    },
    {
      name: 'mean reversion (3)',
      category: 'manual',
      fn: (s) => (s.length >= 3 ? (s[s.length - 1] > avg(s.slice(-3)) ? -1 : 1) : 0),
    },
    {
      name: 'mean reversion (5)',
      category: 'manual',
      fn: (s) => (s.length >= 5 ? (s[s.length - 1] > avg(s.slice(-5)) ? -1 : 1) : 0),
    },
    {
      name: 'mean reversion (10)',
      category: 'manual',
      fn: (s) =>
        s.length >= 10 ? (s[s.length - 1] > avg(s.slice(-10)) ? -1 : 1) : 0,
    },
    {
      name: 'follows mean (5)',
      category: 'manual',
      fn: (s) =>
        s.length >= 5 ? (s[s.length - 1] > avg(s.slice(-5)) ? 1 : -1) : 0,
    },
    {
      name: 'below median → up',
      category: 'manual',
      fn: (s) =>
        s.length >= 5 ? (s[s.length - 1] < median(s.slice(-10)) ? 1 : -1) : 0,
    },
    { name: 'always up', category: 'manual', fn: () => 1 },
    { name: 'always down', category: 'manual', fn: () => -1 },
    {
      name: 'big step → reversal',
      category: 'manual',
      fn: (s, d) => {
        if (s.length < 4 || !d.length) return 0;
        const r = Math.abs(s[s.length - 1] - s[s.length - 2]);
        const av = avgAbs(diff(s.slice(-6)));
        return r > av * 1.6 ? ((-d[d.length - 1]) as Direction) : 0;
      },
    },
    {
      name: 'small step → continuation',
      category: 'manual',
      fn: (s, d) => {
        if (s.length < 4 || !d.length) return 0;
        const r = Math.abs(s[s.length - 1] - s[s.length - 2]);
        const av = avgAbs(diff(s.slice(-6)));
        return r < av * 0.4 ? d[d.length - 1] : 0;
      },
    },
    {
      name: 'up balance in window 5',
      category: 'manual',
      fn: (_s, d) => {
        if (d.length < 5) return 0;
        const u = d.slice(-5).filter((v) => v > 0).length;
        return u > 3 ? -1 : u < 2 ? 1 : 0;
      },
    },
    {
      name: 'up balance in window 10',
      category: 'manual',
      fn: (_s, d) => {
        if (d.length < 10) return 0;
        const u = d.slice(-10).filter((v) => v > 0).length;
        return u > 7 ? -1 : u < 3 ? 1 : 0;
      },
    },
    {
      name: 'volatility → reversal',
      category: 'manual',
      fn: (s, d) => {
        if (s.length < 8 || !d.length) return 0;
        const oldVol = stddev(s.slice(-8, -4));
        const newVol = stddev(s.slice(-4));
        return newVol > oldVol * 1.5 ? ((-d[d.length - 1]) as Direction) : 0;
      },
    },
  ];
}

// ─── Pattern programs generator ───────────────────────────────────────────────
// All patterns length 2..7: Σ(k=2..7) 2^k × 2 = 508 programs

function generatePatternPrograms(): Program[] {
  const programs: Program[] = [];

  for (let len = 2; len <= 7; len++) {
    const numPatterns = Math.pow(2, len);

    for (let pi = 0; pi < numPatterns; pi++) {
      // Decode pattern from bits (MSB first, 1=↑, 0=↓)
      const pattern: Direction[] = [];
      for (let b = len - 1; b >= 0; b--) {
        pattern.push(((pi >> b) & 1 ? 1 : -1) as Direction);
      }

      const patternLabel = pattern.map((v) => (v > 0 ? '↑' : '↓')).join('');

      for (const pr of [1, -1] as Direction[]) {
        const p = [...pattern]; // closure over copy
        const prr = pr;

        programs.push({
          name: `${patternLabel}→${pr > 0 ? '↑' : '↓'}`,
          category: 'pattern',
          fn: (_s: number[], d: Direction[]): Direction => {
            if (d.length < len) return 0;
            const tail = d.slice(-len);
            for (let i = 0; i < len; i++) {
              if (tail[i] !== p[i]) return 0;
            }
            return prr;
          },
        });
      }
    }
  }

  return programs;
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const MANUAL_PROGRAMS: Program[] = buildManualPrograms();
export const PATTERN_PROGRAMS: Program[] = generatePatternPrograms();
export const ALL_PROGRAMS: Program[] = [...MANUAL_PROGRAMS, ...PATTERN_PROGRAMS];