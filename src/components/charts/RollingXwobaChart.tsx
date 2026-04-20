import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RollingPoint } from '../../data/statcastModels';

export type RollingXwobaChartProps = {
  points: RollingPoint[];
  baseline?: number;
  year: number;
};

const WIDTH = 500;
const HEIGHT = 260;
const PLOT = {
  left: 42,
  right: 18,
  top: 18,
  bottom: 34
};
const scaleX = (index: number, count: number) => {
  const inner = WIDTH - PLOT.left - PLOT.right;
  return PLOT.left + (index / Math.max(1, count - 1)) * inner;
};

const scaleY = (value: number, yMin: number, yMax: number) => {
  const inner = HEIGHT - PLOT.top - PLOT.bottom;
  const t = (value - yMin) / Math.max(0.0001, yMax - yMin);
  return PLOT.top + inner - inner * Math.max(0, Math.min(1, t));
};

const formatXwoba = (value: number) => value.toFixed(3).replace(/^0/, '.');
const MORPH_STEPS = 64;

const sampleSeries = (series: RollingPoint[], count: number) => {
  if (!series.length) return Array.from({ length: count }, () => 0.32);
  if (series.length === 1) return Array.from({ length: count }, () => series[0].y);
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const idx = t * (series.length - 1);
    const left = Math.floor(idx);
    const right = Math.min(series.length - 1, Math.ceil(idx));
    const mix = idx - left;
    const a = series[left]?.y ?? series[series.length - 1].y;
    const b = series[right]?.y ?? a;
    return a + (b - a) * mix;
  });
};

const morphBetween = (from: RollingPoint[], to: RollingPoint[], progress: number, count = MORPH_STEPS) => {
  const a = sampleSeries(from, count);
  const b = sampleSeries(to, count);
  return a.map((v, i) => v + (b[i] - v) * progress);
};

export function RollingXwobaChart({ points, baseline = 0.32, year }: RollingXwobaChartProps) {
  const [displayYear, setDisplayYear] = useState(year);
  const [transitionPhase, setTransitionPhase] = useState<'steady' | 'morph'>('steady');
  const [morphProgress, setMorphProgress] = useState(1);
  const [fromSeries, setFromSeries] = useState<RollingPoint[]>(points);
  const prevYearRef = useRef(year);
  const rafRef = useRef<number | null>(null);
  const series = useMemo(() => points, [points]);

  const stats = useMemo(() => {
    const activeSeries = transitionPhase === 'morph' ? fromSeries : series;
    const values = activeSeries.map((p) => p.y).filter((v) => Number.isFinite(v));
    const latest = values[values.length - 1] ?? baseline;
    const first = values[0] ?? baseline;
    const avg = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
    const min = values.length ? Math.min(...values) : baseline;
    const max = values.length ? Math.max(...values) : baseline;
    const delta = latest - first;

    const valueRange = Math.max(0.018, max - min);
    const paddedMin = Math.max(0.18, min - valueRange * 0.35);
    const paddedMax = Math.min(0.62, max + valueRange * 0.35);
    const yMin = Math.min(paddedMin, baseline - 0.03);
    const yMax = Math.max(paddedMax, baseline + 0.03);

    const roughStep = (yMax - yMin) / 4;
    const step = roughStep <= 0.03 ? 0.02 : roughStep <= 0.06 ? 0.03 : 0.05;
    const tickStart = Math.floor(yMin / step) * step;
    const tickEnd = Math.ceil(yMax / step) * step;
    const ticks: number[] = [];
    for (let t = tickStart; t <= tickEnd + 0.0001; t += step) {
      ticks.push(Number(t.toFixed(3)));
    }

    return { latest, first, avg, min, max, delta, yMin, yMax, ticks };
  }, [baseline, fromSeries, series, transitionPhase]);

  const linePath = useMemo(() => {
    if (!series.length) {
      return `M${PLOT.left},${scaleY(0.35, stats.yMin, stats.yMax)} L${WIDTH - PLOT.right},${scaleY(0.35, stats.yMin, stats.yMax)}`;
    }
    return `M${series
      .map((p, idx) => {
        const x = scaleX(idx, series.length);
        const y = scaleY(p.y, stats.yMin, stats.yMax);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' L ')}`;
  }, [series, stats.yMax, stats.yMin]);

  const areaPath = useMemo(() => {
    if (!series.length) return `M${PLOT.left},${HEIGHT - PLOT.bottom} L${WIDTH - PLOT.right},${HEIGHT - PLOT.bottom} L${PLOT.left},${HEIGHT - PLOT.bottom} Z`;
    const linePoints = series.map((p, idx) => {
      const x = scaleX(idx, series.length);
      const y = scaleY(p.y, stats.yMin, stats.yMax);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return `M${linePoints.join(' L ')} L${WIDTH - PLOT.right},${HEIGHT - PLOT.bottom} L${PLOT.left},${HEIGHT - PLOT.bottom} Z`;
  }, [series, stats.yMax, stats.yMin]);

  const morphSeries = useMemo(() => {
    if (transitionPhase !== 'morph') return series;
    const values = morphBetween(fromSeries, series, morphProgress);
    return values.map((value, idx) => ({ y: value, x: idx } as RollingPoint));
  }, [fromSeries, morphProgress, series, transitionPhase]);

  const morphLinePath = useMemo(() => {
    if (!morphSeries.length) return linePath;
    return `M${morphSeries
      .map((p, idx) => {
        const x = scaleX(idx, morphSeries.length);
        const y = scaleY(p.y, stats.yMin, stats.yMax);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' L ')}`;
  }, [linePath, morphSeries, stats.yMax, stats.yMin]);

  const morphAreaPath = useMemo(() => {
    if (!morphSeries.length) return areaPath;
    const linePoints = morphSeries.map((p, idx) => {
      const x = scaleX(idx, morphSeries.length);
      const y = scaleY(p.y, stats.yMin, stats.yMax);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return `M${linePoints.join(' L ')} L${WIDTH - PLOT.right},${HEIGHT - PLOT.bottom} L${PLOT.left},${HEIGHT - PLOT.bottom} Z`;
  }, [areaPath, morphSeries, stats.yMax, stats.yMin]);

  const ticks = stats.ticks;
  const lgAvgY = scaleY(baseline, stats.yMin, stats.yMax);
  const lastPoint = series[series.length - 1];
  const trendLabel = stats.delta >= 0 ? '上升' : '下降';

  useEffect(() => {
    const prevYear = prevYearRef.current;
    if (prevYear === year) {
      setFromSeries(series);
      setMorphProgress(1);
      setTransitionPhase('steady');
      return;
    }

    prevYearRef.current = year;
    setDisplayYear(year);
    setFromSeries((current) => (current.length ? current : series));
    setTransitionPhase('morph');
    setMorphProgress(0);

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const duration = 920;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setMorphProgress(eased);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setTransitionPhase('steady');
        setFromSeries(series);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [series, year]);

  const chartStateClass = transitionPhase === 'morph' ? 'is-morphing' : 'is-steady';

  const morphPoints = transitionPhase === 'morph' ? sampleSeries(fromSeries, MORPH_STEPS).map((y, idx) => ({ y, idx })) : series.map((p, idx) => ({ y: p.y, idx }));

  return (
    <div className={`rolling-chart-shell ${chartStateClass}`} data-year={displayYear} data-morph={morphProgress.toFixed(2)}>
      <div className="rolling-chart-header">
        <div>
          <div className="rolling-chart-kicker">100 PAs Rolling xwOBA</div>
          <h3 className="rolling-chart-title">
            <span className="rolling-chart-title-light">100 PAs</span> Rolling xwOBA
          </h3>
        </div>
        <div className="rolling-chart-badge">LG AVG {formatXwoba(baseline)} · {displayYear}</div>
      </div>

      <div className="rolling-chart-frame">
        <svg viewBox="0 0 500 260" className="rolling-chart-svg" preserveAspectRatio="none" role="img" aria-label={`Rolling xwOBA ${year}`}>
          <defs>
            <linearGradient id="rolling-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(97,214,255,0.24)" />
              <stop offset="100%" stopColor="rgba(97,214,255,0)" />
            </linearGradient>
            <linearGradient id="rolling-line-glow" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#111" />
              <stop offset="100%" stopColor="#000" />
            </linearGradient>
          </defs>

          <g className="rolling-grid">
            {ticks.map((tick) => {
              const y = scaleY(tick, stats.yMin, stats.yMax);
              return <line key={tick} x1={PLOT.left} x2={WIDTH - PLOT.right} y1={y} y2={y} />;
            })}
            <line x1={PLOT.left} x2={WIDTH - PLOT.right} y1={lgAvgY} y2={lgAvgY} className="lgavg" />
          </g>

          <line x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={HEIGHT - PLOT.bottom} className="rolling-axis-line" />
          <path d={transitionPhase === 'morph' ? morphAreaPath : areaPath} className={`rolling-area ${transitionPhase === 'morph' ? 'is-morphing' : ''}`} fill="url(#rolling-fill)" />
          <path id="trending-path" d={transitionPhase === 'morph' ? morphLinePath : linePath} className={`rolling-line ${transitionPhase === 'morph' ? 'is-morphing' : ''}`} stroke="url(#rolling-line-glow)" />

          {morphPoints.map((p, idx) => {
            const x = scaleX(idx, morphPoints.length);
            const y = scaleY(p.y, stats.yMin, stats.yMax);
            const source = transitionPhase === 'morph' ? (idx / Math.max(1, morphPoints.length - 1)) : 1;
            const opacity = transitionPhase === 'morph' ? Math.max(0.2, 0.35 + morphProgress * 0.65) : 1;
            return (
              <g key={`${displayYear}-${idx}`} className="point rolling-point-group" transform={`translate(${x.toFixed(2)}, ${y.toFixed(2)})`} style={{ opacity }}>
                <circle r={idx === morphPoints.length - 1 ? 4.4 : 3.4} className="rolling-point" style={{ ['--rolling-point-progress' as string]: String(source) } as React.CSSProperties} />
                <title>{`PA ${idx + 1}: ${p.y.toFixed(3)}`}</title>
              </g>
            );
          })}

          {ticks.map((tick) => {
            const y = scaleY(tick, stats.yMin, stats.yMax);
            return (
              <text key={`label-${tick}`} x={10} y={y + 4} className="rolling-axis">
                {formatXwoba(tick)}
              </text>
            );
          })}
          <text x={WIDTH - 8} y={lgAvgY + 4} className="rolling-lgavg" textAnchor="end">LG AVG</text>
          {lastPoint ? (
            <text x={WIDTH - 16} y={scaleY(lastPoint.y, stats.yMin, stats.yMax) - 10} className="rolling-last-label" textAnchor="end">
              {formatXwoba(lastPoint.y)}
            </text>
          ) : null}
        </svg>
      </div>

      <div className="rolling-metrics rolling-metrics--compact">
        <div><span>当前</span><strong>{formatXwoba(stats.latest)}</strong></div>
        <div><span>均值</span><strong>{formatXwoba(stats.avg)}</strong></div>
        <div><span>区间</span><strong>{formatXwoba(stats.min)}–{formatXwoba(stats.max)}</strong></div>
        <div><span>{trendLabel}</span><strong>{formatXwoba(Math.abs(stats.delta))}</strong></div>
      </div>

      <div className="rolling-mini-panel">
        <div className="rolling-mini-title">Recent 12 samples</div>
        <div className={`rolling-mini-bars ${transitionPhase === 'morph' ? 'is-morphing' : ''}`} aria-hidden="true">
          {series.slice(-12).map((p, idx) => (
            <div key={`${year}-mini-${idx}`} className="rolling-mini-bar-wrap">
              <div className="rolling-mini-bar" style={{ height: `${Math.max(8, ((p.y - stats.yMin) / Math.max(0.0001, stats.yMax - stats.yMin)) * 100)}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
