import type { Direction } from '../types';

/**
 * LZ78 dictionary size — прокси для сложности Колмогорова.
 * Меньше = лучше сжимается = более регулярная последовательность.
 */
function lz78Size(arr: string[]): number {
  const dict = new Set<string>();
  let w = '';
  let size = 0;
  for (const c of arr) {
    const wc = w + c;
    if (dict.has(wc)) {
      w = wc;
    } else {
      dict.add(wc);
      size++;
      w = '';
    }
  }
  if (w.length) size++;
  return size;
}

/**
 * Предсказывает следующее направление сравнивая LZ78-сложность:
 *   history + ↑   vs   history + ↓
 *
 * Более сжимаемое продолжение считается более вероятным.
 */
export function compressionPredict(directions: Direction[]): Direction {
  if (directions.length < 4) return 0;

  const toStr = (d: Direction[]) => d.map((v) => (v > 0 ? 'U' : 'D'));
  const sizeU = lz78Size(toStr([...directions, 1 as Direction]));
  const sizeD = lz78Size(toStr([...directions, -1 as Direction]));

  if (sizeU === sizeD) return 0;
  return sizeU < sizeD ? 1 : -1;
}