import { useEffect, useMemo, useRef, useState } from 'react';
import { csvParse } from 'd3-dsv';
import * as echarts from 'echarts';

type PitchRow = {
  game_date: string;
  pitch_name: string;
  pitch_type: string;
  release_speed: number;
  plate_x: number;
  plate_z: number;
  pfx_x: number;
  pfx_z: number;
  stand: string;
  description: string;
  events: string;
};

type BatRow = {
  game_date: string;
  events: string;
  launch_speed: number;
  launch_angle: number;
  hc_x: number;
  hc_y: number;
  pitch_name: string;
};

type SelfLog = {
  date: string;
  mood: number;
  watchMinutes: number;
  note: string;
};

const selfLogs: SelfLog[] = [
  { date: '2026-04-07', mood: 9, watchMinutes: 160, note: '山本后段压制力非常强，情绪高涨。' },
  { date: '2026-04-08', mood: 8, watchMinutes: 140, note: '大谷关键打席质量高。' },
  { date: '2026-04-12', mood: 6, watchMinutes: 95, note: '比赛节奏偏慢，观感一般。' },
  { date: '2026-04-16', mood: 10, watchMinutes: 180, note: '高光夜，反复回看关键球。' }
];

const colorByPitch: Record<string, string> = {
  '4-Seam Fastball': '#ff5f5f',
  Sinker: '#ff9f43',
  Cutter: '#ffd166',
  Slider: '#4ecdc4',
  Sweeper: '#4ecdc4',
  Curveball: '#7b61ff',
  'Split-Finger': '#5dade2',
  Unknown: '#94a3b8'
};

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export default function App() {
  const [pitchRows, setPitchRows] = useState<PitchRow[]>([]);
  const [batRows, setBatRows] = useState<BatRow[]>([]);
  const [selectedStand, setSelectedStand] = useState<'ALL' | 'L' | 'R'>('ALL');

  const movementRef = useRef<HTMLDivElement | null>(null);
  const evLaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('./23-26山本投手数据.csv').then((r) => r.text()),
      fetch('./23-26大谷打者数据.csv').then((r) => r.text())
    ]).then(([pitchCsv, batCsv]) => {
      const p = csvParse(pitchCsv).map((d) => ({
        game_date: String(d.game_date ?? ''),
        pitch_name: String(d.pitch_name ?? 'Unknown'),
        pitch_type: String(d.pitch_type ?? ''),
        release_speed: toNum(d.release_speed),
        plate_x: toNum(d.plate_x),
        plate_z: toNum(d.plate_z),
        pfx_x: toNum(d.pfx_x),
        pfx_z: toNum(d.pfx_z),
        stand: String(d.stand ?? 'ALL'),
        description: String(d.description ?? ''),
        events: String(d.events ?? '')
      })) as PitchRow[];

      const b = csvParse(batCsv).map((d) => ({
        game_date: String(d.game_date ?? ''),
        events: String(d.events ?? ''),
        launch_speed: toNum(d.launch_speed),
        launch_angle: toNum(d.launch_angle),
        hc_x: toNum(d.hc_x),
        hc_y: toNum(d.hc_y),
        pitch_name: String(d.pitch_name ?? 'Unknown')
      })) as BatRow[];

      setPitchRows(p.filter((r) => Number.isFinite(r.plate_x) && Number.isFinite(r.plate_z)));
      setBatRows(b.filter((r) => Number.isFinite(r.launch_speed) && Number.isFinite(r.launch_angle)));
    });
  }, []);

  const filteredPitch = useMemo(() => {
    if (selectedStand === 'ALL') return pitchRows;
    return pitchRows.filter((r) => r.stand === selectedStand);
  }, [pitchRows, selectedStand]);

  const stats = useMemo(() => {
    const validSpeedRows = filteredPitch.filter((r) => Number.isFinite(r.release_speed));
    const avgVelo = validSpeedRows.length
      ? validSpeedRows.reduce((s, r) => s + r.release_speed, 0) / validSpeedRows.length
      : 0;
    const whiffs = filteredPitch.filter((r) => r.description === 'swinging_strike').length;
    const inPlay = filteredPitch.filter((r) => r.description?.includes('hit_into_play')).length;
    const hardHit = batRows.filter((r) => r.launch_speed >= 95).length;
    return {
      avgVelo: avgVelo || 0,
      whiffs,
      inPlay,
      hardHit
    };
  }, [filteredPitch, batRows]);

  useEffect(() => {
    if (!movementRef.current) return;
    const chart = echarts.init(movementRef.current);

    const grouped: Record<string, Array<[number, number]>> = {};
    filteredPitch.forEach((r) => {
      if (!Number.isFinite(r.pfx_x) || !Number.isFinite(r.pfx_z)) return;
      const key = r.pitch_name || 'Unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push([r.pfx_x * 12, r.pfx_z * 12]);
    });

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: { textStyle: { color: '#cbd5e1' } },
      xAxis: {
        name: '水平位移 (inch)',
        nameTextStyle: { color: '#94a3b8' },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1f2a44' } }
      },
      yAxis: {
        name: '垂直位移 (inch)',
        nameTextStyle: { color: '#94a3b8' },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1f2a44' } }
      },
      series: Object.entries(grouped).map(([name, data]) => ({
        name,
        type: 'scatter',
        data,
        symbolSize: 7,
        itemStyle: { color: colorByPitch[name] ?? colorByPitch.Unknown }
      }))
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [filteredPitch]);

  useEffect(() => {
    if (!evLaRef.current) return;
    const chart = echarts.init(evLaRef.current);
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      xAxis: {
        name: 'Launch Angle',
        nameTextStyle: { color: '#94a3b8' },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1f2a44' } }
      },
      yAxis: {
        name: 'Exit Velocity',
        nameTextStyle: { color: '#94a3b8' },
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1f2a44' } }
      },
      series: [
        {
          type: 'scatter',
          data: batRows.map((r) => [r.launch_angle, r.launch_speed]),
          symbolSize: 8,
          itemStyle: { color: '#00d4ff', opacity: 0.75 }
        }
      ]
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [batRows]);

  return (
    <div className="page">
      <header className="hero card">
        <div>
          <h1>90英尺之间：山本与大谷的球场物理学</h1>
          <p>
            以 2023-2026 逐球数据构建的交互网站：从投球位移、进垒点到击球质量，连接比赛物理与观赛情绪叙事。
          </p>
          <div className="links">
            <a href="https://baseballsavant.mlb.com/visuals" target="_blank" rel="noreferrer">
              打开 Baseball Savant Visuals
            </a>
          </div>
        </div>
      </header>

      <section className="kpi-grid">
        <article className="card kpi">
          <h3>山本均速</h3>
          <strong>{stats.avgVelo.toFixed(1)} mph</strong>
        </article>
        <article className="card kpi">
          <h3>挥空球数</h3>
          <strong>{stats.whiffs}</strong>
        </article>
        <article className="card kpi">
          <h3>投球进入比赛</h3>
          <strong>{stats.inPlay}</strong>
        </article>
        <article className="card kpi">
          <h3>大谷硬击球（95+）</h3>
          <strong>{stats.hardHit}</strong>
        </article>
      </section>

      <section className="card control">
        <label>投手对位筛选：</label>
        <select value={selectedStand} onChange={(e) => setSelectedStand(e.target.value as 'ALL' | 'L' | 'R')}>
          <option value="ALL">全部打者</option>
          <option value="L">仅左打者 (LHB)</option>
          <option value="R">仅右打者 (RHB)</option>
        </select>
      </section>

      <section className="charts-grid">
        <article className="card">
          <h2>山本球种位移图（Movement Profile）</h2>
          <p className="sub">每个点代表一球，颜色代表球种，单位为英寸。</p>
          <div ref={movementRef} className="chart" />
        </article>

        <article className="card">
          <h2>大谷击球质量（EV vs LA）</h2>
          <p className="sub">击球初速与仰角散点，观察 Barrel 区域潜力。</p>
          <div ref={evLaRef} className="chart" />
        </article>
      </section>

      <section className="card">
        <h2>最小 Self 日志表（Dear Data）</h2>
        <p className="sub">用于连接个人观赛体验与比赛数据，后续可扩展为情绪热图与比赛联动。</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>情绪分（1-10）</th>
                <th>观看时长（分钟）</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {selfLogs.map((log) => (
                <tr key={log.date}>
                  <td>{log.date}</td>
                  <td>{log.mood}</td>
                  <td>{log.watchMinutes}</td>
                  <td>{log.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
