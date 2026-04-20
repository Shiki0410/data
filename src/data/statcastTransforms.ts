import type {
  BatRow,
  BatYearBucket,
  PitchRow,
  PitchYearBucket,
  RollingPoint,
  SprayHitType,
  SprayPoint,
  StoryChartData,
  YearOption,
  YearSummary
} from './statcastModels';

export const shortName = (name: string) => name.replace(/,.*/, '').trim();

export const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export const percentileRank = (arr: number[], value: number, lowIsBetter = false) => {
  if (!arr.length || !Number.isFinite(value)) return 0;
  const valid = arr.filter((n) => Number.isFinite(n));
  if (!valid.length) return 0;
  const lessEq = valid.filter((n) => n <= value).length;
  const raw = (lessEq / valid.length) * 100;
  return Math.max(1, Math.min(99, Math.round(lowIsBetter ? 100 - raw : raw)));
};

export const buildYearOptions = (pitchRows: PitchRow[], batRows: BatRow[]): YearOption[] => {
  const years = Array.from(new Set([...pitchRows, ...batRows].map((r) => Number(String(r.game_date).slice(0, 4))))).filter(Number.isFinite);
  return years.sort((a, b) => b - a).map((year) => ({ value: year, label: String(year) }));
};

export const buildPitchYearBuckets = (pitchRows: PitchRow[]): PitchYearBucket[] => {
  const map = new Map<number, PitchRow[]>();
  pitchRows.forEach((row) => {
    const year = Number(String(row.game_date).slice(0, 4));
    if (!Number.isFinite(year)) return;
    const list = map.get(year) ?? [];
    list.push(row);
    map.set(year, list);
  });

  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, rows]) => {
      const usageMap = rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.pitch_name] = (acc[row.pitch_name] ?? 0) + 1;
        return acc;
      }, {});
      const usage = Object.entries(usageMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
      const topPitch = usage[0]?.name ?? 'Unknown';
      const avgVelo = rows.reduce((s, r) => s + (Number.isFinite(r.release_speed) ? r.release_speed : 0), 0) / Math.max(1, rows.length);
      const spinRows = rows.filter((r) => Number.isFinite(r.release_spin_rate));
      const avgSpin = spinRows.reduce((s, r) => s + r.release_spin_rate, 0) / Math.max(1, spinRows.length);
      return { year, rows, usage, topPitch, avgVelo, avgSpin };
    });
};

export const buildBatYearBuckets = (batRows: BatRow[]): BatYearBucket[] => {
  const map = new Map<number, BatRow[]>();
  batRows.forEach((row) => {
    const year = Number(String(row.game_date).slice(0, 4));
    if (!Number.isFinite(year)) return;
    const list = map.get(year) ?? [];
    list.push(row);
    map.set(year, list);
  });

  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, rows]) => {
      const count = rows.length || 1;
      const avgEV = rows.reduce((s, r) => s + (Number.isFinite(r.launch_speed) ? r.launch_speed : 0), 0) / count;
      const avgLA = rows.reduce((s, r) => s + (Number.isFinite(r.launch_angle) ? r.launch_angle : 0), 0) / count;
      const hardHit = rows.filter((r) => Number.isFinite(r.launch_speed) && r.launch_speed >= 95).length;
      const barrels = rows.filter((r) => r.events === 'home_run' || r.events === 'double' || r.events === 'triple').length;
      return { year, rows, count, avgEV, avgLA, hardHit, barrels };
    });
};

export const buildRollingXwobaSeries = (rows: BatRow[], year: number, windowSize = 100): RollingPoint[] => {
  const filtered = rows
    .filter((r) => Number(String(r.game_date).slice(0, 4)) === year)
    .slice()
    .sort((a, b) => {
      const da = new Date(a.game_date).getTime();
      const db = new Date(b.game_date).getTime();
      if (da !== db) return da - db;
      const ga = Number.isFinite(a.game_pk) ? Number(a.game_pk) : 0;
      const gb = Number.isFinite(b.game_pk) ? Number(b.game_pk) : 0;
      if (ga !== gb) return ga - gb;
      const aa = Number.isFinite(a.at_bat_number) ? Number(a.at_bat_number) : 0;
      const ab = Number.isFinite(b.at_bat_number) ? Number(b.at_bat_number) : 0;
      if (aa !== ab) return aa - ab;
      const pa = Number.isFinite(a.pitch_number) ? Number(a.pitch_number) : 0;
      const pb = Number.isFinite(b.pitch_number) ? Number(b.pitch_number) : 0;
      return pa - pb;
    });

  type PaBucket = {
    gameDate: string;
    gamePk: number;
    atBatNumber: number;
    xwoba: number;
    source: 'direct' | 'fallback';
    order: number;
  };

  const paMap = new Map<string, PaBucket>();

  filtered.forEach((r, index) => {
    const gamePk = Number.isFinite(r.game_pk) ? Number(r.game_pk) : -1;
    const atBatNumber = Number.isFinite(r.at_bat_number) ? Number(r.at_bat_number) : -1;
    if (gamePk < 0 || atBatNumber < 0) return;

    const key = `${r.game_date}__${gamePk}__${atBatNumber}`;
    const direct = Number(r.estimated_woba_using_speedangle);
    const fallback = Number(r.woba_value);
    const hasDirect = Number.isFinite(direct) && direct >= 0 && direct <= 1.2;
    const hasFallback = Number.isFinite(fallback) && fallback >= 0 && fallback <= 1.2;
    if (!hasDirect && !hasFallback) return;

    const candidate: PaBucket = {
      gameDate: r.game_date,
      gamePk,
      atBatNumber,
      xwoba: hasDirect ? direct : fallback,
      source: hasDirect ? 'direct' : 'fallback',
      order: index
    };

    const prev = paMap.get(key);
    if (!prev) {
      paMap.set(key, candidate);
      return;
    }

    if (prev.source === 'fallback' && candidate.source === 'direct') {
      paMap.set(key, candidate);
      return;
    }

    if (prev.source === candidate.source && candidate.order > prev.order) {
      paMap.set(key, candidate);
    }
  });

  const paSeries = Array.from(paMap.values())
    .sort((a, b) => {
      const da = new Date(a.gameDate).getTime();
      const db = new Date(b.gameDate).getTime();
      if (da !== db) return da - db;
      if (a.gamePk !== b.gamePk) return a.gamePk - b.gamePk;
      return a.atBatNumber - b.atBatNumber;
    })
    .map((p) => p.xwoba);

  if (!paSeries.length) return [];

  return paSeries.map((_, idx) => {
    const start = Math.max(0, idx - windowSize + 1);
    const slice = paSeries.slice(start, idx + 1);
    const avg = slice.reduce((s, v) => s + v, 0) / Math.max(1, slice.length);
    return { x: idx + 1, y: Number(avg.toFixed(3)) };
  });
};

const normalizeSprayHit = (event: string): SprayHitType | null => {
  const normalized = String(event ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'single') return 'single';
  if (normalized === 'double' || normalized === 'ground_rule_double') return 'double';
  if (normalized === 'triple') return 'triple';
  if (normalized === 'home_run') return 'home_run';
  return null;
};

export const buildStoryChartData = (ohtaniBatRows: BatRow[], yamamotoPitchRows: PitchRow[], selectedYear: number): Record<'ohtani' | 'yamamoto', StoryChartData> => {
  const buildPitch = (rows: PitchRow[], year: number): StoryChartData => {
    const filtered = rows.filter((r) => Number(String(r.game_date).slice(0, 4)) === year);
    const usageMap = filtered.reduce<Record<string, number>>((acc, row) => {
      acc[row.pitch_name] = (acc[row.pitch_name] ?? 0) + 1;
      return acc;
    }, {});
    const pitchUsage = Object.entries(usageMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const pitchSpeed = pitchUsage.map((item) => {
      const samePitch = filtered.filter((row) => row.pitch_name === item.name && Number.isFinite(row.release_speed));
      const avg = samePitch.reduce((s, row) => s + row.release_speed, 0) / Math.max(1, samePitch.length);
      return { name: item.name, value: Number(avg.toFixed(1)) };
    });

    return {
      year,
      pitchUsage,
      pitchSpeed,
      battingTrend: [],
      sprayPoints: []
    };
  };

  const buildBat = (rows: BatRow[], year: number): StoryChartData => {
    const filtered = rows.filter((r) => Number(String(r.game_date).slice(0, 4)) === year);
    const evList = filtered.filter((r) => Number.isFinite(r.launch_speed)).map((r) => r.launch_speed);
    const rollingWindow = 25;
    const trend: RollingPoint[] = evList.map((_, idx) => {
      const start = Math.max(0, idx - rollingWindow + 1);
      const slice = evList.slice(start, idx + 1);
      const avg = slice.reduce((s, v) => s + v, 0) / Math.max(1, slice.length);
      return { x: idx + 1, y: Number(avg.toFixed(3)) };
    });

    const spraySources = filtered.filter((r): r is BatRow & { hc_x: number; hc_y: number; events: string } => Number.isFinite(r.hc_x) && Number.isFinite(r.hc_y) && typeof r.events === 'string');
    const sprayPoints: SprayPoint[] = spraySources
      .map((r) => {
        const hit = normalizeSprayHit(r.events);
        if (!hit) return null;
        return { x: r.hc_x, y: r.hc_y, hit, gameDate: r.game_date };
      })
      .filter((p): p is SprayPoint => p !== null);

    return {
      year,
      pitchUsage: [],
      pitchSpeed: [],
      battingTrend: trend,
      sprayPoints
    };
  };

  return {
    ohtani: buildBat(ohtaniBatRows, selectedYear),
    yamamoto: buildPitch(yamamotoPitchRows, selectedYear)
  };
};

export const buildPitchUsageRows = (pitchYearBuckets: PitchYearBucket[]) => pitchYearBuckets.map((bucket) => ({
  year: bucket.year,
  usage: bucket.usage,
  total: bucket.rows.length
}));

export const buildBatYearRows = (batYearBuckets: BatYearBucket[]) => batYearBuckets.map((bucket) => ({
  year: bucket.year,
  avgEV: bucket.avgEV,
  avgLA: bucket.avgLA,
  hardHit: bucket.hardHit,
  barrels: bucket.barrels
}));

export const buildYearSummary = (selectedYear: number, pitchYearBuckets: PitchYearBucket[], batYearBuckets: BatYearBucket[]): YearSummary | null => {
  const pitchYear = pitchYearBuckets.find((b) => b.year === selectedYear);
  const batYear = batYearBuckets.find((b) => b.year === selectedYear);
  if (!pitchYear && !batYear) return null;
  return {
    year: selectedYear,
    count: batYear?.count ?? 0,
    avgEV: batYear?.avgEV ?? 0,
    avgLA: batYear?.avgLA ?? 0,
    hardHit: batYear?.hardHit ?? 0,
    barrels: batYear?.barrels ?? 0,
    avgVelo: pitchYear?.avgVelo ?? 0,
    topPitch: pitchYear?.topPitch ?? 'Unknown',
    usage: pitchYear?.usage ?? []
  };
};

export const buildMovementUsageRows = () => ([
  { name: 'FF', value: 31, color: '#d22d49', label: '4-Seam' },
  { name: 'FC', value: 19, color: '#933f2c', label: 'Cutter' },
  { name: 'FS', value: 23, color: '#3bacac', label: 'Splitter' },
  { name: 'SL', value: 6, color: '#eee716', label: 'Slider' },
  { name: 'SI', value: 9, color: '#fe9d00', label: 'Sinker' },
  { name: 'CU', value: 13, color: '#00d1ed', label: 'Curve' }
]);

export const buildRadarRows = () => ([
  { name: 'Pitching Run Value', value: 98 },
  { name: 'Fastball Run Value', value: 45 },
  { name: 'Breaking Run Value', value: 89 },
  { name: 'Offspeed Run Value', value: 100 },
  { name: 'xERA', value: 64 },
  { name: 'Whiff %', value: 76 }
]);
