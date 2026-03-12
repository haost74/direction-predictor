import React, { useEffect, useRef } from 'react';
import type { AppStats } from '../types';
import { ALL_PROGRAMS } from '../logic/programs2';

interface Props {
  stats: AppStats;
  accHistory: number[];
}

const Statistics: React.FC<Props> = ({ stats, accHistory }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Accuracy colour
  let accColor = 'var(--accent3)';
  if (stats.total >= 5) {
    const a = stats.correct / stats.total;
    accColor = a >= 0.56 ? 'var(--up)' : a <= 0.44 ? 'var(--down)' : 'var(--accent3)';
  }

  const accLabel =
    stats.total > 0
      ? `${((stats.correct / stats.total) * 100).toFixed(1)}%`
      : '—';

  // Draw accuracy chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.parentElement?.clientWidth ?? 700;
    const H = 90;
    canvas.width = W;
    ctx.clearRect(0, 0, W, H);

    // Baseline 50%
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (accHistory.length < 2) return;

    const step = W / (accHistory.length - 1);
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    accHistory.forEach((v, i) => {
      const x = i * step;
      const y = H - v * H;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });

    const last = accHistory[accHistory.length - 1];
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, 'rgba(68,136,255,0.5)');
    grad.addColorStop(1, last >= 0.5 ? '#00ff88' : '#ff4466');
    ctx.strokeStyle = grad;
    ctx.stroke();

    // Fill under curve
    ctx.lineTo((accHistory.length - 1) * step, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle =
      last >= 0.5 ? 'rgba(0,255,136,0.05)' : 'rgba(255,68,102,0.05)';
    ctx.fill();
  }, [accHistory]);

  return (
    <div className="panel">
      <div className="panel__title">statistics</div>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-box__value">{stats.total}</div>
          <div className="stat-box__label">predictions</div>
        </div>
        <div className="stat-box">
          <div className="stat-box__value">{stats.correct}</div>
          <div className="stat-box__label">faithful</div>
        </div>
        <div className="stat-box">
          <div className="stat-box__value" style={{ color: accColor }}>{accLabel}</div>
          <div className="stat-box__label">accuracy</div>
        </div>
        <div className="stat-box">
          <div className="stat-box__value">{ALL_PROGRAMS.length}</div>
          <div className="stat-box__label">programs</div>
        </div>
      </div>

      <div className="chart-wrap">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default Statistics;