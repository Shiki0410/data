import React, { useMemo } from 'react';
import type { PitchUsageItem } from '../../data/statcastModels';

export type PitchUsageChartProps = {
  items: PitchUsageItem[];
  year: number;
};

const PITCH_COLOR_MAP: Record<string, string> = {
  FF: '#D22D49',
  FourSeam: '#D22D49',
  "4-Seam Fastball": '#D22D49',
  "4-Seam": '#D22D49',
  FS: '#3BACAC',
  SplitFinger: '#3BACAC',
  "Split-Finger": '#3BACAC',
  FC: '#933F2C',
  Cutter: '#933F2C',
  CU: '#00D1ED',
  Curveball: '#00D1ED',
  SI: '#FE9D00',
  Sinker: '#FE9D00',
  SL: '#EEE716',
  Slider: '#EEE716',
  CH: '#0068FF',
  Changeup: '#0068FF',
  KN: '#7C5CFF',
  Knuckleball: '#7C5CFF'
};

const FALLBACK_COLORS = ['#D22D49', '#3BACAC', '#933F2C', '#00D1ED', '#FE9D00', '#EEE716', '#0068FF', '#7C5CFF'];

const getPitchColor = (name: string, idx: number) => PITCH_COLOR_MAP[name.replace(/\s+/g, '')] ?? PITCH_COLOR_MAP[name] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

export function PitchUsageChart({ items, year }: PitchUsageChartProps) {
  const rows = useMemo(() => [...items].sort((a, b) => b.value - a.value), [items]);
  const max = Math.max(1, ...rows.map((item) => item.value));

  return (
    <div className="pitch-usage-shell">
      <svg id="pitcher-usage-viz" width="210" height="140" viewBox="0 0 210 140" aria-label={`Pitch usage ${year}`}>
        <g id="pitcher-usage-viz-space">
          {rows.map((item, idx) => {
            const width = Math.max(18, (item.value / max) * 150);
            const y = 24 + idx * 20;
            const color = getPitchColor(item.name, idx);
            return (
              <g key={item.name} transform="translate(30 0)">
                <rect
                  className={`pitch-usage-pills pitch-usage-pills-${item.name.replace(/[^A-Za-z0-9]/g, '')}`}
                  x={6 + (max - item.value) * 4}
                  y={y}
                  width={width}
                  height="12"
                  rx="6"
                  stroke={color}
                  fill={color}
                  opacity="0.8"
                />
                <text x="0" y={y + 10} className="pitch-usage-text">
                  {item.name}
                </text>
                <text x={6 + width + 8} y={y + 10} className="pitch-usage-value">
                  {item.value}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
