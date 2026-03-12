import type {
  Direction,
  Prediction,
  ProgramStat,
  CTWModel,
  AppState,
} from '../types';
import { softmaxWeights } from './math';
import { compressionPredict } from './compression';
import { ALL_PROGRAMS, initialWeight } from './programs2';

// ─── CTW helpers ──────────────────────────────────────────────────────────────

export function getCTWKey(dirs: Direction[], depth: number): string | null {
  if (dirs.length < depth) return null;
  return dirs
    .slice(-depth)
    .map((v) => (v > 0 ? 'U' : 'D'))
    .join('');
}

// ─── Predict ──────────────────────────────────────────────────────────────────

export function predict(
  sequence: number[],
  directions: Direction[],
  progStats: ProgramStat[],
  ctxModel: CTWModel,
): Prediction | null {
  if (sequence.length < 2) return null;

  // 1. Программы голосуют — мягкий голос [-1..1] × softmax-вес
  //
  //    Голос конвертируется в P(↑) через: pUp_i = (vote_i + 1) / 2
  //    Затем взвешенная сумма: sumUp += normW[i] * pUp_i
  //
  const normW = softmaxWeights(progStats.map((p) => p.weight));
  let sumUp = 0;
  let sumDown = 0;

  const programPreds: number[] = ALL_PROGRAMS.map((prog: any, i: number) => {
    const vote = prog.fn(sequence, directions); // [-1..1]
    // Конвертируем в вклад: положительный → sumUp, отрицательный → sumDown
    // Пропорционально силе голоса
    const pUpVote = (vote + 1) / 2; // [0..1]
    sumUp   += normW[i] * pUpVote;
    sumDown += normW[i] * (1 - pUpVote);
    return vote;
  });

  const progTotal = sumUp + sumDown;
  const pUpPrograms = progTotal > 0 ? sumUp / progTotal : 0.5;

  // 2. CTW иерархия: глубины 1–4 смешиваются
  let ctwSumUp = 0;
  let ctwSumDown = 0;
  let ctwTotalW = 0;

  for (let d = 1; d <= 4; d++) {
    const key = getCTWKey(directions, d);
    if (key && ctxModel[d]?.[key]) {
      const cm = ctxModel[d][key];
      const t = cm.up + cm.down;
      const lw = Math.log(t + 1) / (d * d);
      ctwSumUp   += (cm.up   / t) * lw;
      ctwSumDown += (cm.down / t) * lw;
      ctwTotalW  += lw;
    }
  }

  const pUpCTW  = ctwTotalW > 0 ? ctwSumUp / ctwTotalW : null;
  const ctwConf = Math.min(ctwTotalW / 2, 1.0);

  // 3. LZ78 компрессионный предсказатель
  const compPred = compressionPredict(directions);
  const pUpComp  = compPred > 0 ? 0.65 : compPred < 0 ? 0.35 : null;
  const compConf = directions.length >= 4 ? 0.35 : 0;

  // 4. Байесовская смесь трёх источников
  const wProg  = 1.0;
  const wCTW   = pUpCTW  !== null ? ctwConf * 0.9 : 0;
  const wComp  = pUpComp !== null ? compConf       : 0;
  const wTotal = wProg + wCTW + wComp;

  const pUp =
    (pUpPrograms        * wProg  +
    (pUpCTW  ?? 0.5)   * wCTW   +
    (pUpComp ?? 0.5)   * wComp) /
    wTotal;

  return {
    direction: (pUp >= 0.5 ? 1 : -1) as Direction,
    pUp,
    pUpPrograms,
    pUpCTW,
    compPred,
    pUpComp,
    programPreds, // мягкие голоса [-1..1]
  };
}

// ─── Update weights (snapshot-safe) ──────────────────────────────────────────

export function __updateWeights(
  actual: Direction,
  snapshot: Prediction,
  progStats: ProgramStat[],
  ctxModel: CTWModel,
  dirsBeforeStep: Direction[],
): { newProgStats: ProgramStat[]; newCtxModel: CTWModel } {

  const newProgStats: ProgramStat[] = progStats.map((stat, i) => {
    const vote = snapshot.programPreds[i]; // [-1..1]
    if (vote === 0) return stat;           // воздержался — не обновляем

    // Корректность: голос в нужную сторону?
    const correct = (vote > 0 && actual > 0) || (vote < 0 && actual < 0);

    // Сила обновления пропорциональна уверенности |vote|
    // Уверенный и правый → большой бонус
    // Уверенный и неправый → большой штраф
    const strength = Math.abs(vote); // [0..1]
    const factor = correct
      ? 1 + 0.08 * strength   // [1.00 .. 1.08]
      : 1 - 0.08 * strength;  // [0.92 .. 1.00]

    return {
      weight:  Math.max(0.001, Math.min(stat.weight * factor, 1000)),
      correct: stat.correct + (correct ? 1 : 0),
      total:   stat.total   + 1,
    };
  });

  // CTW обновляется по прежнему (бинарно — направление не изменилось)
  const newCtxModel: CTWModel = {
    1: { ...ctxModel[1] },
    2: { ...ctxModel[2] },
    3: { ...ctxModel[3] },
    4: { ...ctxModel[4] },
  };

  for (let d = 1; d <= 4; d++) {
    const key = getCTWKey(dirsBeforeStep, d);
    if (key) {
      const prev = ctxModel[d]?.[key] ?? { up: 1, down: 1 };
      newCtxModel[d][key] = {
        up:   prev.up   + (actual > 0 ? 1 : 0),
        down: prev.down + (actual < 0 ? 1 : 0),
      };
    }
  }

  return { newProgStats, newCtxModel };
}

export function updateWeights(
  actual: Direction,
  snapshot: Prediction,
  progStats: ProgramStat[],
  ctxModel: CTWModel,
  dirsBeforeStep: Direction[],
): { newProgStats: ProgramStat[]; newCtxModel: CTWModel } {

  const eta = 0.04; // скорость обучения (меньше = стабильнее)

  let newProgStats: ProgramStat[] = progStats.map((stat, i) => {
    const vote = snapshot.programPreds[i]; // [-1..1]

    if (vote === 0) return stat; // воздержался

    const strength = Math.abs(vote);

    const correct =
      (vote > 0 && actual > 0) ||
      (vote < 0 && actual < 0);

    // reward = ±|vote|
    const reward = correct ? strength : -strength;

    const newWeight = Math.max(
      1e-9,
      Math.min(stat.weight * Math.exp(eta * reward), 1000)
    );

    return {
      weight: newWeight,
      correct: stat.correct + (correct ? 1 : 0),
      total: stat.total + 1,
    };
  });

  // ─── НОРМАЛИЗАЦИЯ ВЕСОВ (очень важно при 1000+ правил) ───

  const sum = newProgStats.reduce((s, p) => s + p.weight, 0);

  if (sum > 0) {
    newProgStats = newProgStats.map((p) => ({
      ...p,
      weight: p.weight / sum,
    }));
  }

  // ─── CTW обновление ───

  const newCtxModel: CTWModel = {
    1: { ...ctxModel[1] },
    2: { ...ctxModel[2] },
    3: { ...ctxModel[3] },
    4: { ...ctxModel[4] },
  };

  for (let d = 1; d <= 4; d++) {
    const key = getCTWKey(dirsBeforeStep, d);

    if (key) {
      const prev = ctxModel[d]?.[key] ?? { up: 1, down: 1 };

      newCtxModel[d][key] = {
        up: prev.up + (actual > 0 ? 1 : 0),
        down: prev.down + (actual < 0 ? 1 : 0),
      };
    }
  }

  return { newProgStats, newCtxModel };
}

// ─── Initial state ────────────────────────────────────────────────────────────

export function buildInitialState(): AppState {
  return {
    sequence:          [],
    directions:        [],
    pendingPrediction: null,
    stats:             { total: 0, correct: 0 },
    accHistory:        [],
    logHistory:        [],
    // Начальный вес с штрафом Solomonoff: простые программы весят больше
    progStats:         ALL_PROGRAMS.map((p: any) => ({
      weight:  initialWeight(p),
      correct: 0,
      total:   0,
    })),
    ctxModel: { 1: {}, 2: {}, 3: {}, 4: {} },
  };
}

// ─── Process one new number (pure) ───────────────────────────────────────────

export function processNumber(state: AppState, val: number): AppState {
  const {
    sequence, directions, pendingPrediction,
    stats, accHistory, logHistory,
    progStats, ctxModel,
  } = state;

  let newProgStats  = progStats;
  let newCtxModel   = ctxModel;
  let newStats      = stats;
  let newAccHistory = accHistory;
  let newLogHistory = logHistory;
  let newDirections = directions;

  if (sequence.length >= 1) {
    const actual: Direction = val > sequence[sequence.length - 1] ? 1 : -1;
    newDirections = [...directions, actual];

    if (pendingPrediction !== null) {
      const correct = pendingPrediction.direction === actual;
      newStats = {
        total:   stats.total + 1,
        correct: stats.correct + (correct ? 1 : 0),
      };
      newAccHistory = [...accHistory, newStats.correct / newStats.total];
      newLogHistory = [
        {
          n:        newStats.total,
          prev:     sequence[sequence.length - 1],
          curr:     val,
          pred:     pendingPrediction.direction,
          actual,
          correct,
          pUp:      pendingPrediction.pUp,
          compPred: pendingPrediction.compPred,
        },
        ...logHistory,
      ];

      const updated = updateWeights(
        actual,
        pendingPrediction,
        progStats,
        ctxModel,
        directions,
      );
      newProgStats = updated.newProgStats;
      newCtxModel  = updated.newCtxModel;
    }
  }

  const newSequence   = [...sequence, val];
  const newPrediction = predict(newSequence, newDirections, newProgStats, newCtxModel);

  return {
    sequence:          newSequence,
    directions:        newDirections,
    pendingPrediction: newPrediction,
    stats:             newStats,
    accHistory:        newAccHistory,
    logHistory:        newLogHistory,
    progStats:         newProgStats,
    ctxModel:          newCtxModel,
  };
}