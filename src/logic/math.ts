export const avg = (arr: number[]): number =>
  arr.reduce((s, v) => s + v, 0) / arr.length;

export const avgAbs = (arr: number[]): number =>
  arr.length ? arr.reduce((s, v) => s + Math.abs(v), 0) / arr.length : 1;

export const diff = (arr: number[]): number[] => {
  const r: number[] = [];
  for (let i = 1; i < arr.length; i++) r.push(arr[i] - arr[i - 1]);
  return r;
};

export const median = (arr: number[]): number => {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const stddev = (arr: number[]): number => {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
};

/**
 * Softmax-нормировка весов для стабильного байесовского смешивания.
 * Предотвращает взрывной рост весов.
 */
export const softmaxWeights = (weights: number[]): number[] => {
  const maxW = Math.max(...weights);
  const exps = weights.map((w) => Math.exp((w - maxW) * 0.4));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
};