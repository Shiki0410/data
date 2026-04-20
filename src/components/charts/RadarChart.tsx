import React from 'react';

export type RadarRow = {
  name: string;
  value: number;
};

export type RadarChartProps = {
  rows: RadarRow[];
  title?: string;
};

const pointsForValue = (value: number, index: number, total: number, radius: number) => {
  const angle = (-Math.PI / 2) + (index / Math.max(1, total)) * Math.PI * 2;
  const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
  return {
    x: 160 + Math.cos(angle) * r,
    y: 160 + Math.sin(angle) * r
  };
};

export function RadarChart({ rows, title = 'Radar' }: RadarChartProps) {
  const safeRows = rows.length ? rows : [{ name: 'xERA', value: 64 }];
  const radius = 110;
  const polygon = safeRows
    .map((row, idx) => {
      const pt = pointsForValue(row.value, idx, safeRows.length, radius);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <div className="radar-shell">
      <svg viewBox="0 0 320 320" className="radar-svg" aria-label={title}>
        <defs>
          <radialGradient id="radar-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,90,120,0.24)" />
            <stop offset="100%" stopColor="rgba(255,90,120,0)" />
          </radialGradient>
        </defs>
        <circle cx="160" cy="160" r="118" className="radar-ring" />
        <circle cx="160" cy="160" r="88" className="radar-ring" />
        <circle cx="160" cy="160" r="58" className="radar-ring" />
        <circle cx="160" cy="160" r="28" className="radar-ring" />
        {safeRows.map((row, idx) => {
          const pt = pointsForValue(100, idx, safeRows.length, radius);
          return (
            <line
              key={row.name}
              x1="160"
              y1="160"
              x2={pt.x}
              y2={pt.y}
              className="radar-axis"
            />
          );
        })}
        <polygon points={polygon} fill="url(#radar-fill)" className="radar-fill" />
        {safeRows.map((row, idx) => {
          const pt = pointsForValue(row.value, idx, safeRows.length, radius);
          return <circle key={row.name} cx={pt.x} cy={pt.y} r="4.5" className="radar-node" />;
        })}
        {safeRows.map((row, idx) => {
          const pt = pointsForValue(100, idx, safeRows.length, radius + 18);
          return (
            <text key={row.name} x={pt.x} y={pt.y} className="radar-label">
              {row.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
