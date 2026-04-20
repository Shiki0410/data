import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SprayPoint } from '../../data/statcastModels';

export type SprayChartLayerState = {
  singles: boolean;
  doubles: boolean;
  triples: boolean;
  homeRuns: boolean;
  trend: boolean;
  lgAvg: boolean;
};

export type SprayChartCalibration = {
  cxOffset: number;
  cxScale: number;
  cyOffset: number;
  cyScale: number;
  clamp: { min: number; max: number };
};

export type SprayChartProps = {
  points: SprayPoint[];
  year: number;
  layer: SprayChartLayerState;
  calibration?: Partial<SprayChartCalibration>;
};

type MappedPoint = {
  id: string;
  hit: string;
  cx: number;
  cy: number;
  rawX: number;
  rawY: number;
  color: string;
};

type BurstParticle = {
  id: string;
  cx: number;
  cy: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  delay: number;
};

const HIT_COLORS: Record<'single' | 'double' | 'triple' | 'home_run' | 'default', string> = {
  single: '#ff8a1c',
  double: '#7b62ff',
  triple: '#ffb000',
  home_run: '#ff3d7f',
  default: '#ff8a1c'
};

const SVG_SIZE = 500;
const DEFAULT_CALIBRATION: SprayChartCalibration = {
  // 对齐新版底图：本垒基准下移，外野弧线更接近官方示意
  cxOffset: 19.5,
  cxScale: 1.838,
  cyOffset: -10,
  cyScale: 2.24,
  clamp: { min: 14, max: SVG_SIZE - 14 }
};

const filterHit = (hit: string, layer: SprayChartLayerState) => {
  if (hit === 'single') return layer.singles;
  if (hit === 'double') return layer.doubles;
  if (hit === 'triple') return layer.triples;
  if (hit === 'home_run') return layer.homeRuns;
  return false;
};

const getHitColor = (hit: string) => {
  if (hit === 'single') return HIT_COLORS.single;
  if (hit === 'double') return HIT_COLORS.double;
  if (hit === 'triple') return HIT_COLORS.triple;
  if (hit === 'home_run') return HIT_COLORS.home_run;
  return HIT_COLORS.default;
};

const mapToSavantSpace = (rawX: number, rawY: number, calibration: SprayChartCalibration) => {
  const cx = calibration.cxOffset + rawX * calibration.cxScale;
  const cy = calibration.cyOffset + rawY * calibration.cyScale;
  return {
    cx: Math.max(calibration.clamp.min, Math.min(calibration.clamp.max, cx)),
    cy: Math.max(calibration.clamp.min, Math.min(calibration.clamp.max, cy))
  };
};

const outfieldPath = [
  'M 250 438',
  'L 166 346',
  'Q 112 286 76 240',
  'Q 44 200 76 160',
  'Q 162 72 250 44',
  'Q 338 72 424 160',
  'Q 456 200 424 240',
  'Q 388 286 334 346',
  'Z'
].join(' ');

export function SprayChart({ points, year, layer, calibration }: SprayChartProps) {
  const [displayYear, setDisplayYear] = useState(year);
  const [transitionPhase, setTransitionPhase] = useState<'steady' | 'burst' | 'settle'>('steady');
  const [visiblePoints, setVisiblePoints] = useState<MappedPoint[]>([]);
  const [burstParticles, setBurstParticles] = useState<BurstParticle[]>([]);
  const prevYearRef = useRef(year);
  const burstTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);

  const resolvedCalibration = useMemo<SprayChartCalibration>(() => ({
    cxOffset: calibration?.cxOffset ?? DEFAULT_CALIBRATION.cxOffset,
    cxScale: calibration?.cxScale ?? DEFAULT_CALIBRATION.cxScale,
    cyOffset: calibration?.cyOffset ?? DEFAULT_CALIBRATION.cyOffset,
    cyScale: calibration?.cyScale ?? DEFAULT_CALIBRATION.cyScale,
    clamp: {
      min: calibration?.clamp?.min ?? DEFAULT_CALIBRATION.clamp.min,
      max: calibration?.clamp?.max ?? DEFAULT_CALIBRATION.clamp.max
    }
  }), [calibration]);

  const spraySvgPoints = useMemo<MappedPoint[]>(() => {
    return points
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      .filter((p) => filterHit(p.hit, layer))
      .map((p, i) => {
        const mapped = mapToSavantSpace(p.x, p.y, resolvedCalibration);
        return {
          id: `${year}-${i}`,
          hit: p.hit,
          rawX: p.x,
          rawY: p.y,
          color: getHitColor(p.hit),
          ...mapped
        };
      });
  }, [layer, points, resolvedCalibration, year]);

  useEffect(() => {
    const prevYear = prevYearRef.current;
    if (prevYear === year) {
      setVisiblePoints(spraySvgPoints);
      return;
    }

    prevYearRef.current = year;
    setDisplayYear(year);
    setTransitionPhase('burst');

    if (burstTimerRef.current != null) window.clearTimeout(burstTimerRef.current);
    if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);

    const baseParticles: BurstParticle[] = Array.from({ length: Math.min(28, Math.max(12, spraySvgPoints.length || 18)) }, (_, idx) => {
      const angle = (idx / Math.max(1, Math.min(28, Math.max(12, spraySvgPoints.length || 18)))) * Math.PI * 2 + 0.25;
      const radial = 28 + (idx % 6) * 18;
      return {
        id: `burst-${year}-${idx}`,
        cx: 250,
        cy: 438,
        dx: Math.cos(angle) * radial,
        dy: -Math.abs(Math.sin(angle)) * (62 + (idx % 5) * 14),
        size: 3 + (idx % 4) * 1.2,
        color: idx % 4 === 0 ? '#ff3d7f' : idx % 4 === 1 ? '#7b62ff' : idx % 4 === 2 ? '#ffb000' : '#ff8a1c',
        delay: idx * 18
      };
    });
    setBurstParticles(baseParticles);

    burstTimerRef.current = window.setTimeout(() => {
      setVisiblePoints(spraySvgPoints);
      setTransitionPhase('settle');
      settleTimerRef.current = window.setTimeout(() => {
        setTransitionPhase('steady');
        setBurstParticles([]);
      }, 620);
    }, 260);

    return () => {
      if (burstTimerRef.current != null) window.clearTimeout(burstTimerRef.current);
      if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
    };
  }, [spraySvgPoints, year]);

  const staggerBaseClass = transitionPhase === 'burst' ? 'is-bursting' : transitionPhase === 'settle' ? 'is-settling' : 'is-steady';

  return (
    <div className={`savant-spray-frame ${staggerBaseClass}`} data-year={displayYear}>
      <div className="savant-spray-year-splash">
        <span>YEAR SHIFT</span>
        <strong>{displayYear}</strong>
      </div>
      <div className="savant-spray-origin-pulse" aria-hidden="true" />
      <div className="savant-spray-meta">
        <span>YEAR</span>
        <strong>{displayYear}</strong>
      </div>
      <svg viewBox="0 0 500 500" className="savant-spray-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Hits Spray Chart ${displayYear}`}>
        <defs>
          <filter id="spray-glow">
            <feGaussianBlur stdDeviation="1.9" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g id="spray-field-base">
          <path d={outfieldPath} className="spray-fence" />
          <path d="M 250 438 L 185 366 L 250 298 L 315 366 Z" className="spray-diamond" />
          <path d="M 250 438 L 230 416 L 250 395 L 270 416 Z" className="spray-home-plate" />
          <path d="M 250 438 Q 170 346 90 254" className="spray-foul-line" />
          <path d="M 250 438 Q 330 346 410 254" className="spray-foul-line" />
          <path d="M 250 438 Q 174 344 98 250" className="spray-distance-ring major" />
          <path d="M 250 438 Q 166 332 82 226" className="spray-distance-ring minor" />
          <path d="M 250 438 Q 158 318 66 198" className="spray-distance-ring major" />
          <path d="M 250 438 Q 234 415 250 392 Q 266 415 250 438 Z" className="spray-home-plate-outline" />
          <circle cx="250" cy="398" r="3.2" className="spray-mound" />
          <text x="70" y="248" className="spray-distance">330</text>
          <text x="430" y="248" className="spray-distance" textAnchor="end">330</text>
          <text x="58" y="208" className="spray-distance">360</text>
          <text x="442" y="208" className="spray-distance" textAnchor="end">360</text>
          <text x="48" y="168" className="spray-distance">390</text>
          <text x="452" y="168" className="spray-distance" textAnchor="end">390</text>
        </g>

        <g id="sprayChart" filter="url(#spray-glow)">
          {burstParticles.map((particle) => (
            <circle
              key={particle.id}
              cx={particle.cx}
              cy={particle.cy}
              r={particle.size}
              className="spray-burst-particle"
              fill={particle.color}
              style={{ ['--burst-dx' as string]: `${particle.dx}px`, ['--burst-dy' as string]: `${particle.dy}px`, ['--burst-delay' as string]: `${particle.delay}ms` } as React.CSSProperties}
            />
          ))}
          {visiblePoints.map((p, index) => {
            const cls = p.hit === 'home_run' ? 'hr' : p.hit === 'double' ? 'double' : p.hit === 'triple' ? 'triple' : 'single';
            const r = cls === 'hr' ? 4.9 : cls === 'double' ? 4.35 : cls === 'triple' ? 4.25 : 3.9;
            const delay = `${Math.min(520, index * 16)}ms`;
            return (
              <g
                key={p.id}
                className={`spray-point-group ${cls}`}
                style={{ ['--spray-delay' as string]: delay, ['--spray-color' as string]: p.color } as React.CSSProperties}
              >
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={r}
                  className={`spray-point ${cls}`}
                  fill={p.color}
                  stroke={p.color}
                  style={{ color: p.color }}
                >
                  <title>{`${p.hit} · hc_x:${p.rawX.toFixed(1)} hc_y:${p.rawY.toFixed(1)}`}</title>
                </circle>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
