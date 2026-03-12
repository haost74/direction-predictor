import React, { useState } from 'react';
import type { CTWModel } from '../types';

interface Props {
  ctxModel: CTWModel;
}

const CTWPanel: React.FC<Props> = ({ ctxModel }) => {
  const [depth, setDepth] = useState<1 | 2 | 3 | 4>(1);

  const model = ctxModel[depth] ?? {};
  const keys = Object.keys(model).sort();

  const renderKey = (k: string) =>
    k.split('').map((c, i) => (
      <span key={i} className={c === 'U' ? 'up' : 'down'}>
        {c === 'U' ? '↑' : '↓'}
      </span>
    ));

  return (
    <div className="panel">
      <div className="panel__title">CTW — hierarchical context model</div>

      <div className="ctw-tabs">
        {([1, 2, 3, 4] as const).map((d) => (
          <button
            key={d}
            className={`ctw-tab${depth === d ? ' ctw-tab--active' : ''}`}
            onClick={() => setDepth(d)}
          >
            depth {d}
          </button>
        ))}
      </div>

      {keys.length === 0 ? (
        <div className="placeholder">no data for depth {depth}</div>
      ) : (
        <table className="ctw-table">
          <thead>
            <tr>
              <th>ctx({depth})</th>
              <th>↑</th>
              <th>↓</th>
              <th>P(↑)</th>
              <th>→</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const cm = model[k];
              const t = cm.up + cm.down;
              const pUp = Math.round((cm.up / t) * 100);
              return (
                <tr key={k}>
                  <td>{renderKey(k)}</td>
                  <td><span className="up">{cm.up}</span></td>
                  <td><span className="down">{cm.down}</span></td>
                  <td style={{ color: pUp >= 50 ? 'var(--up)' : 'var(--down)' }}>
                    {pUp}%
                  </td>
                  <td>
                    {pUp >= 50
                      ? <span className="up">↑</span>
                      : <span className="down">↓</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CTWPanel;