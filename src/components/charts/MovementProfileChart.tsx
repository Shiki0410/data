import React from 'react';

export type MovementProfilePoint = {
  name: string;
  x: number;
  y: number;
  z: number;
  color: string;
};

export type MovementProfileChartProps = {
  points: MovementProfilePoint[];
  year?: number;
};

const axisLabels = [
  { value: 24, y: 54 },
  { value: 12, y: 96 },
  { value: 0, y: 160 },
  { value: -12, y: 224 },
  { value: -24, y: 266 }
];

const phaseLabels = [
  { label: 'MORE RISE', x: 18, y: 114, dir: 'up' },
  { label: 'MORE DROP', x: 18, y: 198, dir: 'down' }
] as const;

const pitchTypeLegend = [
  ['Split', '#5ecad7'],
  ['4-Seam', '#d95e78'],
  ['Cutter', '#a66b4a'],
  ['Curve', '#efe047'],
  ['Sinker', '#f5a623'],
  ['Slider', '#2fc4e2']
] as const;

export function MovementProfileChart({ points, year = 2026 }: MovementProfileChartProps) {
  const safePoints = points.length ? points : [{ name: 'FF', x: 12, y: 4, z: 1, color: '#d22d49' }];

  return (
    <div className="movement-profile-shell">
      <div className="movement-profile-head">
        <div>
          <p className="movement-profile-eyebrow">{year} Movement Profile</p>
          <h4>Movement Profile (Induced Break)</h4>
        </div>
        <div className="movement-profile-help">?</div>
      </div>

      <div className="movement-profile-legend-top">
        <span>1B</span>
        <span>◀ MOVES TOWARD</span>
        <span>3B</span>
      </div>

      <div className="movement-profile-stage">
        {phaseLabels.map((item) => (
          <div key={item.label} className={`movement-profile-phase movement-profile-phase-${item.dir}`} style={{ left: item.x, top: item.y }}>
            <span>{item.label}</span>
            <i />
          </div>
        ))}

        <svg viewBox="0 0 320 320" className="movement-profile-svg" aria-label="Movement profile">
          <defs>
            <pattern id="movement-hatch" patternUnits="userSpaceOnUse" width="6" height="6">
              <rect width="6" height="6" fill="rgba(104,146,162,0.08)" />
              <path d="M -3, 3 L 3, -3 M 0, 6 L 6, 0 M 3, 9 L 9, 3" className="movement-hatch-line" />
            </pattern>
            <radialGradient id="movement-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(66,232,255,0.18)" />
              <stop offset="100%" stopColor="rgba(66,232,255,0)" />
            </radialGradient>
          </defs>
          <circle cx="160" cy="160" r="138" className="movement-backdrop" />
          <circle cx="160" cy="160" r="138" fill="url(#movement-glow)" opacity="0.55" />
          <circle cx="160" cy="160" r="122" className="movement-ring movement-ring-dashed" />
          <circle cx="160" cy="160" r="88" className="movement-ring" />
          <circle cx="160" cy="160" r="48" className="movement-ring movement-ring-dashed" />
          {[-24, -12, 0, 12, 24].map((tick) => (
            <g key={tick} className="movement-axis-group">
              <line x1="160" y1={160 - tick * 2.4} x2="292" y2={160 - tick * 2.4} />
              <line x1={160 + tick * 2.4} y1="28" x2={160 + tick * 2.4} y2="292" />
            </g>
          ))}
          <line x1="160" y1="28" x2="160" y2="292" className="movement-main-axis" />
          <line x1="28" y1="160" x2="292" y2="160" className="movement-main-axis" />

          {axisLabels.map((axis) => (
            <g key={axis.value}>
              <text x="160" y={axis.y} className="movement-axis-text">{Math.abs(axis.value)}"</text>
              <text x="310" y={axis.y} className="movement-axis-right">24"</text>
            </g>
          ))}

          <image href="./MLB官方数据可视化/SavantPitchers_mid_right_back.svg" x="244" y="238" width="54" height="72" transform="rotate(-12 271 274)" opacity="0.72" />

          <g transform="translate(276, 34)">
            <circle r="12" fill="url(#movement-hatch)" stroke="rgba(104,146,162,0.35)" />
            <text y="30" textAnchor="middle" className="movement-legend-label">MLB AVG.</text>
          </g>

          {safePoints.map((pt) => {
            const cx = 160 + pt.x * 2.15;
            const cy = 160 - pt.y * 2.15;
            const r = 8 + pt.z * 1.9;
            return (
              <g key={pt.name} className="movement-point-group">
                <circle cx={cx} cy={cy} r={r} fill={pt.color} fillOpacity="0.78" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
                <circle cx={cx} cy={cy} r={r + 6} fill={pt.color} fillOpacity="0.18" />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="movement-profile-foot">
        <div className="movement-profile-sample">100 PITCH SAMPLE</div>
        <div className="movement-profile-arm">
          <span>ARM ANGLE</span>
          <strong>41°</strong>
        </div>
      </div>

      <div className="movement-profile-usage">
        {pitchTypeLegend.map(([label, color]) => (
          <div key={label} className="movement-profile-usage-item">
            <span>{label}</span>
            <i style={{ background: color }} />
          </div>
        ))}
      </div>
    </div>
  );
}
