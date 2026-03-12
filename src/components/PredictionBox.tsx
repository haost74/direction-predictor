import React from 'react';
import type { Prediction } from '../types';

interface Props {
  prediction: Prediction | null;
}

function fmtPct(v: number | null, fallback = '—'): string {
  if (v === null) return fallback;
  return `${(v * 100).toFixed(0)}%${v >= 0.5 ? '↑' : '↓'}`;
}

function pColor(v: number | null): string {
  if (v === null) return 'var(--muted)';
  return v >= 0.5 ? 'var(--up)' : 'var(--down)';
}

const PredictionBox: React.FC<Props> = ({ prediction }) => {
  if (!prediction) {
    return (
      <div className="panel">
        <div className="panel__title">prediction - Bayesian mixture</div>
        <div className="prediction-box">
          <div className="pred-symbol" style={{ color: 'var(--muted)' }}>?</div>
          <div className="pred-info">
            <div className="pred-label">the next number will be</div>
            <div className="pred-confidence" style={{ color: 'var(--muted)' }}>
              at least 2 numbers are needed
            </div>
            <div className="prob-bar">
              <div className="prob-bar__mid" />
              <div className="prob-bar__fill" style={{ width: '50%', background: 'var(--muted)' }} />
            </div>
          </div>
        </div>
        <SourceRow prediction={null} />
      </div>
    );
  }

  const { direction, pUp, pUpPrograms, pUpCTW, compPred, pUpComp } = prediction;
  const isUp = direction > 0;
  const conf = isUp ? pUp : 1 - pUp;

  return (
    <div className="panel">
      <div className="panel__title">prediction - Bayesian mixture</div>

      <div className="prediction-box">
        <div
          className="pred-symbol"
          style={{ color: isUp ? 'var(--up)' : 'var(--down)' }}
        >
          {isUp ? '↑' : '↓'}
        </div>

        <div className="pred-info">
          <div className="pred-label">the next number will be</div>
          <div
            className="pred-confidence"
            style={{ color: isUp ? 'var(--up)' : 'var(--down)' }}
          >
            {isUp ? 'MORE' : 'LESS'}&nbsp;&nbsp;{(conf * 100).toFixed(1)}%
          </div>
          <div className="prob-bar">
            <div className="prob-bar__mid" />
            <div className="prob-bar__fill" style={{ width: `${pUp * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Source breakdown */}
      <div className="source-row">
        <div className="source-chip">
          <div className="source-chip__label">Programs</div>
          <div className="source-chip__value" style={{ color: pColor(pUpPrograms) }}>
            {fmtPct(pUpPrograms)}
          </div>
        </div>
        <div className="source-chip">
          <div className="source-chip__label">CTW</div>
          <div className="source-chip__value" style={{ color: pColor(pUpCTW) }}>
            {fmtPct(pUpCTW)}
          </div>
        </div>
        <div className="source-chip">
          <div className="source-chip__label">LZ78</div>
          <div
            className="source-chip__value"
            style={{ color: compPred > 0 ? 'var(--up)' : compPred < 0 ? 'var(--down)' : 'var(--muted)' }}
          >
            {compPred > 0 ? '↑ less' : compPred < 0 ? '↓ less' : '—'}
          </div>
        </div>
        <div className="source-chip">
          <div className="source-chip__label">P(↑) result</div>
          <div className="source-chip__value" style={{ color: pColor(pUp) }}>
            {fmtPct(pUp)}
          </div>
        </div>
      </div>
    </div>
  );
};

// internal helper
const SourceRow: React.FC<{ prediction: null }> = () => (
  <div className="source-row">
    {['Programs', 'CTW', 'LZ78', 'P(↑) итог'].map((lbl) => (
      <div className="source-chip" key={lbl}>
        <div className="source-chip__label">{lbl}</div>
        <div className="source-chip__value" style={{ color: 'var(--muted)' }}>—</div>
      </div>
    ))}
  </div>
);

export default PredictionBox;