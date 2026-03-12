import React from 'react';
import type { LogEntry } from '../types/index';

interface Props {
  logHistory: LogEntry[];
}

const HistoryLog: React.FC<Props> = ({ logHistory }) => (
  <div className="panel">
    <div className="panel__title">history of predictions</div>

    <div className="history-log">
      {logHistory.length === 0 ? (
        <div className="placeholder">history is empty</div>
      ) : (
        logHistory.slice(0, 60).map((entry) => (
          <div
            key={entry.n}
            className={`log-row ${entry.correct ? 'log-row--correct' : 'log-row--wrong'}`}
          >
            <span className="log-row__n">#{entry.n}</span>

            <span className="log-row__seq">
              {entry.prev} → {entry.curr}
            </span>

            {/* predicted */}
            <span className={entry.pred > 0 ? 'up' : 'down'}>
              {entry.pred > 0 ? '↑' : '↓'}
            </span>

            <span style={{ color: 'var(--muted)' }}>vs</span>

            {/* actual */}
            <span className={entry.actual > 0 ? 'up' : 'down'}>
              {entry.actual > 0 ? '↑' : '↓'}
            </span>

            <span className="log-row__conf">
              {(entry.pUp * 100).toFixed(0)}%
            </span>

            <span className="log-row__lz">
              {entry.compPred > 0 ? 'LZ↑' : entry.compPred < 0 ? 'LZ↓' : ''}
            </span>

            <span className={entry.correct ? 'log-row__ok' : 'log-row__fail'}>
              {entry.correct ? '✓' : '✗'}
            </span>
          </div>
        ))
      )}
    </div>
  </div>
);

export default HistoryLog;