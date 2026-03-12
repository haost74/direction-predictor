import type {
  Direction,
  Prediction,
  ProgramStat,
  CTWModel,
  AppState,
} from '../types';
import { softmaxWeights } from './math';
import { compressionPredict } from './compression';
import { ALL_PROGRAMS } from './programs2';

export function getCTWKey(dirs: Direction[], depth: number): string | null {
  if (dirs.length < depth) return null;
  return dirs
    .slice(-depth)
    .map((v) => (v > 0 ? 'U' : 'D'))
    .join('');
}

export function predict(
  sequence: number[],
  directions: Direction[],
  progStats: ProgramStat[],
  ctxModel: CTWModel,
): Prediction | null {
  if (sequence.length < 2) return null;

  // 1. Программы голосуют с softmax-нормированными весами
  const normW = softmaxWeights(progStats.map((p) => p.weight));
  let sumUp = 0;
  let sumDown = 0;

  const programPreds: Direction[] = ALL_PROGRAMS.map((prog, i) => {
    const pred = prog.fn(sequence, directions);
    if (pred > 0) sumUp += normW[i];
    else if (pred < 0) sumDown += normW[i];
    return pred;
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
    programPreds,
  };
}

export function updateWeights(
  actual: Direction,
  snapshot: Prediction,
  progStats: ProgramStat[],
  ctxModel: CTWModel,
  dirsBeforeStep: Direction[],
): { newProgStats: ProgramStat[]; newCtxModel: CTWModel } {
  // Обновляем веса по снимку — не пересчитываем fn() заново
  const newProgStats: ProgramStat[] = progStats.map((stat, i) => {
    const pred = snapshot.programPreds[i];
    if (pred === 0) return stat;
    const correct = (pred > 0 && actual > 0) || (pred < 0 && actual < 0);
    return {
      weight:  Math.max(0.001, Math.min(stat.weight * (correct ? 1.08 : 0.92), 1000)),
      correct: stat.correct + (correct ? 1 : 0),
      total:   stat.total + 1,
    };
  });

  // Обновляем CTW с контекстом ДО текущего шага
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

export function buildInitialState(): AppState {
  return {
    sequence:          [],
    directions:        [],
    pendingPrediction: null,
    stats:             { total: 0, correct: 0 },
    accHistory:        [],
    logHistory:        [],
    progStats:         ALL_PROGRAMS.map(() => ({ weight: 1.0, correct: 0, total: 0 })),
    ctxModel:          { 1: {}, 2: {}, 3: {}, 4: {} },
  };
}

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
        directions, // dirs ДО шага — ключевой момент
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