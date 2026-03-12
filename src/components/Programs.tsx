import React, { useState } from 'react';
import type { Direction, ProgramStat } from '../types';
import { ALL_PROGRAMS } from '../logic/programs2';

type TabName = 'top' | 'pattern' | 'manual';

interface Props {
  sequence: number[];
  directions: Direction[];
  progStats: ProgramStat[];
}

interface ProgRow {
  name: string;
  category: string;
  pred: Direction;
  weight: number;
  acc: string;
  barWidth: number;
}

const Programs: React.FC<Props> = ({ sequence, directions, progStats }) => {
  const [activeTab, setActiveTab] = useState<TabName>('top');

  const maxW = Math.max(...progStats.map((p) => p.weight), 1);

  const rows: ProgRow[] = ALL_PROGRAMS.map((prog, i) => {
    const pred =
      sequence.length >= 2 ? prog.fn(sequence, directions) : (0 as Direction);
    const stat = progStats[i];
    const acc =
      stat.total > 0 ? `${((stat.correct / stat.total) * 100).toFixed(0)}%` : '—';
    return {
      name: prog.name,
      category: prog.category,
      pred,
      weight: stat.weight,
      acc,
      barWidth: (stat.weight / maxW) * 100,
    };
  });

  const sorted = [...rows].sort((a, b) => b.weight - a.weight);

  const visible: ProgRow[] =
    activeTab === 'top'
      ? sorted.slice(0, 30)
      : activeTab === 'pattern'
      ? sorted.filter((r) => r.category === 'pattern').slice(0, 60)
      : sorted.filter((r) => r.category === 'manual');

  const tabs: { key: TabName; label: string }[] = [
    { key: 'top',     label: 'TOP-30' },
    { key: 'pattern', label: 'PATTERNS' },
    { key: 'manual',  label: 'MANUAL' },
  ];

  return (
    <div className="panel">
      <div className="panel__title">
        programs
        <span className="panel__badge">{ALL_PROGRAMS.length}</span>
      </div>

      <div className="tabs">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            className={`tab${activeTab === key ? ' tab--active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="programs-list">
        {sequence.length < 2 ? (
          <div className="placeholder">waiting for data...</div>
        ) : (
          visible.map((row, i) => {
            const cls =
              row.pred > 0
                ? 'prog-item prog-item--up'
                : row.pred < 0
                ? 'prog-item prog-item--down'
                : 'prog-item prog-item--neutral';

            const arrow =
              row.pred > 0 ? (
                <span className="up">↑</span>
              ) : row.pred < 0 ? (
                <span className="down">↓</span>
              ) : (
                <span style={{ color: 'var(--muted)' }}>—</span>
              );

            return (
              <div className={cls} key={i}>
                <span className="prog-item__pred">{arrow}</span>
                <span className="prog-item__name" title={row.name}>{row.name}</span>
                <div className="prog-item__bar">
                  <div
                    className="prog-item__fill"
                    style={{ width: `${row.barWidth}%` }}
                  />
                </div>
                <span className="prog-item__acc">{row.acc}</span>
                <span className="prog-item__weight">{row.weight.toFixed(2)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Programs;