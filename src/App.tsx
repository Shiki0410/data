import React, { useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import { csvParse } from 'd3-dsv';
import * as echarts from 'echarts';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initPageAnimations, setupMagneticElements } from './Animations';
import { SprayChart } from './components/charts/SprayChart';
import { RollingXwobaChart } from './components/charts/RollingXwobaChart';
import { PitchUsageChart } from './components/charts/PitchUsageChart';
import { MovementProfileChart } from './components/charts/MovementProfileChart';
import { RadarChart } from './components/charts/RadarChart';
import { buildBatYearBuckets, buildPitchUsageRows, buildRollingXwobaSeries, buildStoryChartData, buildYearOptions, buildYearSummary, shortName as transformShortName, percentileRank as transformPercentileRank, toNum as transformToNum } from './data/statcastTransforms';
import InfiniteGallery from './components/ui/3d-gallery-photography';
import { Component as HorizonHeroSection } from './components/ui/horizon-hero-section';
void [PitchUsageChart, MovementProfileChart, RadarChart, buildBatYearBuckets, buildPitchUsageRows, buildYearOptions, buildYearSummary, transformShortName, transformPercentileRank, transformToNum];
import './Typography.css';
import './Layout.css';

gsap.registerPlugin(ScrollTrigger);

type PitchRow = {
  game_date: string;
  player_name: string;
  pitch_name: string;
  release_speed: number;
  plate_x: number;
  plate_z: number;
  description: string;
  release_spin_rate: number;
  release_pos_x: number;
  release_pos_z: number;
  pfx_x: number;
  pfx_z: number;
  arm_angle?: number;
  balls: number;
  strikes: number;
  stand: string;
};

type BatRow = {
  game_date: string;
  player_name: string;
  events: string;
  launch_speed: number;
  launch_angle: number;
  hc_x: number;
  hc_y: number;
};

type TeamBatRow = {
  player_id: number;
  player_name: string;
  pa: number;
  woba: number;
  hardhit_percent: number;
  barrels_per_pa_percent: number;
  launch_speed: number;
  hrs: number;
};

type TeamPitchRow = {
  player_id: number;
  player_name: string;
  pa: number;
  k_percent: number;
  bb_percent: number;
  velocity: number;
  woba: number;
  pitcher_run_value_per_100?: number;
  batter_run_value_per_100?: number;
  api_break_x_batter_in?: number;
  api_break_z_induced?: number;
  xba?: number;
  swing_miss_percent?: number;
};

type YearOption = {
  value: number;
  label: string;
};

type PitchYearBucket = {
  year: number;
  rows: PitchRow[];
  usage: Array<{ name: string; value: number }>;
  topPitch: string;
  avgVelo: number;
  avgSpin: number;
};

type Fragment = {
  id: string;
  title: string;
  metric: string;
  desc: string;
};

type MetricGroup = {
  title: string;
  summary: string;
  lines: Array<{ k: string; d: string; note?: string }>;
};

type YearSummary = {
  year: number;
  count: number;
  avgEV: number;
  avgLA: number;
  hardHit: number;
  barrels: number;
  avgVelo: number;
  topPitch: string;
  usage: Array<{ name: string; value: number }>;
};

type StoryChartData = {
  year: number;
  pitchUsage: Array<{ name: string; value: number }>;
  pitchSpeed: Array<{ name: string; value: number }>;
  battingTrend: Array<{ x: number; y: number }>;
  sprayPoints: Array<{ x: number; y: number; hit: 'single' | 'double' | 'triple' | 'home_run' }>;
};

type OhtaniPercentileMetric = {
  key: string;
  label: string;
  value: number;
  display: string;
  pct: number;
  lowIsBetter?: boolean;
};

type OhtaniSeasonSummary = {
  year: number;
  rows: BatRow[];
  battingRunValue: number;
  baserunningRunValue: number;
  fieldingRunValue: number;
  xwoba: number;
  xba: number;
  xslg: number;
  avgExitVelo: number;
  barrelPct: number;
  hardHitPct: number;
  sweetSpotPct: number;
  batSpeed: number;
  squaredUpPct: number;
  chasePct: number;
  whiffPct: number;
  kPct: number;
  bbPct: number;
  sprintSpeed: number;
};

const localShortName = (name: string) => name.replace(/,.*/, '').trim();
const normalizePitchName = (name: string) => {
  const key = String(name ?? '').toLowerCase().trim();
  const map: Record<string, string> = {
    '4-seam fastball': '4-Seam Fastball',
    fourseam: '4-Seam Fastball',
    '4-seam': '4-Seam Fastball',
    ff: '4-Seam Fastball',
    fastball: '4-Seam Fastball',
    sinker: 'Sinker',
    si: 'Sinker',
    cutter: 'Cutter',
    fc: 'Cutter',
    slider: 'Slider',
    sl: 'Slider',
    curveball: 'Curveball',
    curve: 'Curveball',
    cu: 'Curveball',
    splitter: 'Split-Finger',
    'split-finger': 'Split-Finger',
    split: 'Split-Finger',
    fs: 'Split-Finger',
    sweeper: 'Sweeper',
    sw: 'Sweeper',
    changeup: 'Changeup',
    change: 'Changeup',
    ch: 'Changeup'
  };
  return map[key] ?? name.trim();
};

const headshotUrl = (playerId?: number) => {
  if (!Number.isFinite(playerId)) return '';
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_180,q_auto:best/v1/people/${Math.round(playerId as number)}/headshot/67/current`;
};

const localToNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const localPercentileRank = (arr: number[], value: number, lowIsBetter = false) => {
  if (!arr.length || !Number.isFinite(value)) return 0;
  const valid = arr.filter((n) => Number.isFinite(n));
  if (!valid.length) return 0;
  const lessEq = valid.filter((n) => n <= value).length;
  const raw = (lessEq / valid.length) * 100;
  return Math.max(1, Math.min(99, Math.round(lowIsBetter ? 100 - raw : raw)));
};

const sectionIds = ['hero', 'atlas', 'macro', 'lab', 'outro'] as const;
const heroGlyphText = 'PITCH DESIGN ✦ VISUAL LAB';
const glyphDirClasses = ['dir-up', 'dir-right', 'dir-left', 'dir-down'] as const;
const thinStripText = '001001011101 · PITCH VECTOR STREAM · HIT MAP FEED · 001001011101 · PITCH VECTOR STREAM · HIT MAP FEED · ';
const mainStripText = 'PITCH DESIGN · DATA NARRATIVE · INTERACTIVE VISUALIZATION · CONTACT MAP · TRAJECTORY ENGINE · ';
const heroFragments = [
  { text: 'EXIT VELO', seedX: 0.07, seedY: 0.12, rot: -10, player: 'yamamoto' as const },
  { text: 'LOCATION', seedX: 0.2, seedY: 0.67, rot: 8, player: 'yamamoto' as const },
  { text: 'SPIN RATE', seedX: 0.63, seedY: 0.16, rot: 11, player: 'ohtani' as const },
  { text: 'TRAJECTORY', seedX: 0.74, seedY: 0.58, rot: -7, player: 'ohtani' as const },
  { text: 'DATA / FRAGMENT', seedX: 0.5, seedY: 0.82, rot: 4, player: 'yamamoto' as const }
] as const;

const ohtaniBioCards = [
  { label: '角色', value: '二刀流 / 进攻核心' },
  { label: '精神', value: '持续挑战极限的时代标识' },
  { label: '关键字', value: '50轰50盗 · 牵制 · 速度 · 火力' }
] as const;

const metricGroups: MetricGroup[] = [
  {
    title: 'Batting',
    summary: '击球结果不只看标题指标，而是看从击球初速、仰角、甜区命中到结果产出的完整链路。每一个词条都补充定义、使用方式与它在打击分析中的意义。',
    lines: [
      { k: 'Exit Velocity (EV)', d: 'How fast, in miles per hour, a ball was hit by a batter.', note: '核心击球速度；越高通常代表更强的击球质量，但仍需结合仰角与结果一起判断。' },
      { k: 'Launch Angle (LA)', d: 'How high/low, in degrees, a ball was hit by a batter.', note: '决定球的飞行弧线；过低容易滚地，过高则容易形成无效高飞。' },
      { k: 'Barrels', d: 'A batted ball with the perfect combination of exit velocity and launch angle.', note: '甜区击球的高价值结果；是最能代表“打得扎实”的复合指标之一。' },
      { k: 'Hard Hit', d: "Statcast defines a 'hard-hit ball' as one hit with an exit velocity of 95 mph or higher.", note: '95mph 以上的硬击球阈值；常用于衡量打者是否稳定制造强击球。' },
      { k: 'Launch Angle Sweet-Spot', d: 'A batted-ball event with a launch angle between eight and 32 degrees.', note: '常见的理想仰角区间；这个窗口里更容易形成可转化的长打结果。' },
      { k: 'BBE', d: 'A Batted Ball Event represents any batted ball that produces a result.', note: '所有形成结果的击球统称；它把打席中的有效接触单独拎出来观察。' },
      { k: 'xBA', d: 'xBA measures the likelihood that a batted ball will become a hit.', note: '预期安打率；用击球质量估算安打概率，比单纯结果更稳定。' },
      { k: 'xwOBA', d: 'xwOBA is formulated using exit velocity, launch angle and Sprint Speed.', note: '预期加权上垒率；把击球质量和速度一起折算成更完整的进攻产出。' },
      { k: 'EV50', d: 'For a batter, EV50 is an average of the hardest 50% of his batted balls.', note: '只取最强的一半击球来平均，更能显示“上限”而不是总体均值。' },
      { k: 'Adjusted EV', d: 'Adjusted EV averages the maximum of 88 and the actual exit velocity.', note: '对极低值进行截断后的修正版击球速度，避免偶发软弱接触干扰理解。' }
    ]
  },
  {
    title: 'Bat Tracking',
    summary: '挥棒过程拆成速度、路径、角度与接触质量四层。这里不仅列术语，还说明它们如何共同决定击球质量与对球的掌控程度。',
    lines: [
      { k: 'Bat Speed', d: 'Bat speed is measured at the sweet-spot of the bat.' },
      { k: 'Fast Swing Rate', d: 'A fast swing is one that has 75 MPH or more of bat speed.' },
      { k: 'Swing Length', d: 'The total distance in feet traveled by the bat head from start to impact.' },
      { k: 'Attack Angle', d: 'The vertical angle at the point of impact with the ball.' },
      { k: 'Ideal Attack Angle', d: 'A ball is ideal when hit with a 5-20° Attack Angle.' },
      { k: 'Attack Direction', d: 'The horizontal angle of the bat path, expressed as PULL or OPPO.' },
      { k: 'Swing Path Tilt', d: 'The vertical angle of the arc traced by the swing path over the 40 ms prior to contact.' },
      { k: 'Squared-Up Rate', d: 'How much exit velocity was obtained compared to the maximum possible.' },
      { k: 'Blasts', d: 'A more valuable subset of squared-up balls with a fast swing.' },
      { k: 'Swords', d: 'A metric that quantifies when a pitcher forces an ugly-looking swing.' }
    ]
  },
  {
    title: 'Pitching',
    summary: '投球分析关注球速、转速、位移、出手点与预期失分等变量。每个术语都补足其测量对象与可读性，避免只剩标题。',
    lines: [
      { k: 'Pitch Velocity', d: 'How hard, in miles per hour, a pitch is thrown.', note: '球速是投手压制打者反应时间的第一层武器。' },
      { k: 'Pitch Movement', d: 'The movement of a pitch in inches, both raw and relative to average.', note: '位移决定球是否“看起来”像不同的球；是球路欺骗感的来源。' },
      { k: 'Active Spin', d: 'The spin that contributes to movement.', note: '真正推动位移的有效转速，不是全部转速都能转化为球路变化。' },
      { k: 'Spin Rate', d: 'How much spin, in revolutions per minute, a pitch was thrown with.', note: '常见的基础转速指标；通常与球路稳定性和欺骗性一同解读。' },
      { k: 'Extension', d: 'How far off the mound, in feet, a pitcher releases the pitch.', note: '出手前压缩了多少反应时间；延伸越前，打者感受到的球越“突然”。' },
      { k: 'xERA', d: 'A 1:1 translation of xwOBA, converted to the ERA scale.', note: '把预期被打程度换算成自责分尺度，便于和传统投球结果直接对照。' }
    ]
  },
  {
    title: 'Fielding / Catching',
    summary: '守备与接捕不是单一动作，而是反应、臂力、路线、覆盖范围和失误抑制的组合。这里把每个名词翻译成可直接理解的比赛含义。',
    lines: [
      { k: 'Pop Time', d: 'How quickly, in seconds, a catcher can get the ball out to the base.', note: '捕手出球速度；是限制盗垒最直接的时间指标。' },
      { k: 'Arm Strength', d: 'How hard, in miles per hour, a fielder throws the ball.', note: '外野/内野强臂能力的量化；影响传球威慑和跑者推进决策。' },
      { k: 'Lead Distance', d: 'How far, in feet, a runner is ranging off the bag.', note: '离垒距离；越大越利于起跑，但也更容易被牵制。' },
      { k: 'Jump', d: 'Which players have the fastest reactions and most direct routes.', note: '防守起步质量；结合反应速度和路线效率一起看。' },
      { k: 'OAA', d: 'A range-based metric of skill showing outs saved over peers.', note: '以守备范围衡量价值的核心指标，直接体现“多救了多少个出局”。' },
      { k: 'Fielding Run Value', d: 'Statcast’s overall metric for defensive performance on a run-based scale.', note: '把防守表现换算成失分价值，方便和进攻/投球放在同一尺度比较。' },
      { k: 'Catch Probability', d: 'The likelihood, in percent, that an outfielder makes a catch.', note: '接杀概率；常用于描述高难度飞球的可处理程度。' },
      { k: 'Blocks Above Average', d: 'Skill at preventing wild pitches or passed balls compared to peers.', note: '捕逸阻挡能力；对捕手稳定性和投手信任都很关键。' }
    ]
  },
  {
    title: 'Running',
    summary: '跑垒模块强调瞬时速度与攻击性跑垒的阈值。每条术语都说明如何判断快慢，以及它在比赛中的实际价值。',
    lines: [
      { k: 'Sprint Speed', d: 'A player’s top running speed in feet per second over the fastest one-second window.', note: '最能代表跑垒爆发力的速度阈值，反映瞬时推进能力。' },
      { k: 'Bolt', d: 'Any run where Sprint Speed is at least 30 ft/sec.', note: '超过 30 ft/s 的极速跑动；通常代表极强的威胁性推进。' }
    ]
  }
] as const;

function CyberCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;

    const move = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      gsap.set(dot, { x: mx, y: my });
    };

    const onHoverIn = () => ring.classList.add('cursor-active');
    const onHoverOut = () => ring.classList.remove('cursor-active');

    const bindInteractive = () => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('button, a, .magnetic'));
      nodes.forEach((n) => {
        n.addEventListener('mouseenter', onHoverIn);
        n.addEventListener('mouseleave', onHoverOut);
      });
      return () => {
        nodes.forEach((n) => {
          n.removeEventListener('mouseenter', onHoverIn);
          n.removeEventListener('mouseleave', onHoverOut);
        });
      };
    };

    const unbind = bindInteractive();

    let rafId = 0;
    const tick = () => {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      gsap.set(ring, { x: rx, y: ry });
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', move);
    tick();

    return () => {
      unbind();
      window.removeEventListener('mousemove', move);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cyber-cursor-ring" />
      <div ref={dotRef} className="cyber-cursor-dot" />
    </>
  );
}

export default function App() {
  const appRef = useRef<HTMLDivElement | null>(null);
  const horizontalTrackRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLSpanElement | null>(null);
  const fieldTunnelRef = useRef<HTMLDivElement | null>(null);

  const overviewBatBarRef = useRef<HTMLDivElement | null>(null);
  const batterAbilityRef = useRef<HTMLDivElement | null>(null);
  const pitcherAbilityRef = useRef<HTMLDivElement | null>(null);
  const yamamotoPitchChartRef = useRef<HTMLDivElement | null>(null);
  const ohtaniSprayChartRef = useRef<HTMLDivElement | null>(null);
  const movementChartRef = useRef<HTMLDivElement | null>(null);
  const percentileChartRef = useRef<HTMLDivElement | null>(null);
  void percentileChartRef;

  const [introDone, setIntroDone] = useState(false);
  const [introLeaving, setIntroLeaving] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [introMounted, setIntroMounted] = useState(true);
  const [mph, setMph] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [pitchRows, setPitchRows] = useState<PitchRow[]>([]);
  const [batRows, setBatRows] = useState<BatRow[]>([]);
  const [teamBatRows, setTeamBatRows] = useState<TeamBatRow[]>([]);
  const [teamPitchRows, setTeamPitchRows] = useState<TeamPitchRow[]>([]);
  const [heroPlayer, setHeroPlayer] = useState<'yamamoto' | 'ohtani'>('yamamoto');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedBatter, setSelectedBatter] = useState('Ohtani, Shohei');
  const [selectedPitcher, setSelectedPitcher] = useState('Yamamoto, Yoshinobu');
  const [sprayLayer, setSprayLayer] = useState({ singles: true, doubles: true, triples: true, homeRuns: true, trend: true, lgAvg: true });
  const [yearTransition, setYearTransition] = useState<{ from: number; to: number; direction: 1 | -1; active: boolean } | null>(null);
  const yearTransitionTimerRef = useRef<number | null>(null);
  const prevSelectedYearRef = useRef(selectedYear);
  
  const batterActionShots = {
    yamamoto: 'https://securea.mlb.com/images/players/action_shots/808967.jpg',
    ohtani: 'https://securea.mlb.com/images/players/action_shots/660271.jpg'
  };

  const galleryImages = [
    { src: './图片/1a5110e9-e3ba-46e6-af0e-b80c93f8ef97.jpg', alt: 'Baseball reference map and player popularity' },
    { src: './图片/483974778_1188211109563089_3678702623532556579_n.jpg', alt: 'Shohei Ohtani poster portrait' },
    { src: './图片/php2r1bXB.jpg', alt: 'Shohei Ohtani close-up poster' },
    { src: './图片/yoshinobu-yamamoto-is-our-lowest-paid-starting-pitcher-by-v0-jkqm9nsyt0zf1.webp', alt: 'Yoshinobu Yamamoto editorial portrait' },
    { src: './图片/e7622e06-7f7c-78d6-83d7-e389202bdc52_620.jpg', alt: 'Celebration on the field' },
    { src: './图片/player-redesign-promo.jpg', alt: 'Player redesign promo board' },
    { src: './图片/1_s.jpg', alt: 'Early career portrait' },
    { src: './图片/69AB997F620141772853631.jpeg', alt: 'Rising star focus' },
    { src: './图片/69AB9A673414D1772853863.jpeg', alt: 'Breakout season portrait' },
    { src: './图片/images.jpg', alt: 'Dominant batting moment' },
    { src: './图片/67OqtXcnAmuwCmkMP6aph4OJjgxYCN0aIA0K0kMj.jpg', alt: 'Championship era collage' },
    { src: './图片/cover_image_25103_46eca95e79.jpg', alt: 'World Series champion moment' },
    { src: './图片/phpUoLh3G.jpg', alt: 'Dual-threat legacy portrait' }
  ];

  const [heroAim, setHeroAim] = useState({ x: 430, y: 145 });
  const [heroAimTarget, setHeroAimTarget] = useState({ x: 430, y: 145 });
  const [heroHit, setHeroHit] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('./23-26山本投手数据.csv').then((r) => r.text()),
      fetch('./23-26大谷打者数据.csv').then((r) => r.text()),
      fetch('./23-26道奇队打者数据.csv').then((r) => r.text()),
      fetch('./23-26道奇队投手数据.csv').then((r) => r.text())
    ])
      .then(([pitchText, batText, teamBatText, teamPitchText]) => {
        const p = csvParse(pitchText).map((d) => {
          const row = d as Record<string, unknown>;
          return {
            game_date: String(row.game_date ?? ''),
            player_name: String(row.player_name ?? row.pitcher ?? 'Yamamoto, Yoshinobu'),
            pitch_name: String(row.pitch_name ?? 'Unknown'),
            release_speed: localToNum(row.release_speed),
            plate_x: localToNum(row.plate_x),
            plate_z: localToNum(row.plate_z),
            description: String(row.description ?? ''),
            release_spin_rate: localToNum(row.release_spin_rate ?? row.spin_rate),
            release_pos_x: localToNum(row.release_pos_x),
            release_pos_z: localToNum(row.release_pos_z),
            pfx_x: localToNum(row.pfx_x),
            pfx_z: localToNum(row.pfx_z),
            arm_angle: localToNum(row.arm_angle),
            balls: localToNum(row.balls),
            strikes: localToNum(row.strikes),
            stand: String(row.stand ?? 'ALL')
          } as PitchRow;
        });

        const b = csvParse(batText).map((d) => {
          const row = d as Record<string, unknown>;
          return {
            game_date: String(row.game_date ?? ''),
            player_name: String(row.player_name ?? row.batter ?? 'Ohtani, Shohei'),
            events: String(row.events ?? ''),
            launch_speed: localToNum(row.launch_speed),
            launch_angle: localToNum(row.launch_angle),
            hc_x: localToNum(row.hc_x),
            hc_y: localToNum(row.hc_y),
            pitch_name: String(row.pitch_name ?? ''),
            game_year: localToNum(row.game_year),
            game_pk: localToNum(row.game_pk),
            at_bat_number: localToNum(row.at_bat_number),
            pitch_number: localToNum(row.pitch_number),
            estimated_woba_using_speedangle: localToNum(row.estimated_woba_using_speedangle),
            woba_value: localToNum(row.woba_value),
            bb_type: String(row.bb_type ?? ''),
            hit_distance_sc: localToNum(row.hit_distance_sc)
          } as BatRow;
        });

        const tb = csvParse(teamBatText).map((d) => {
          const row = d as Record<string, unknown>;
          return {
            player_id: localToNum(row.player_id),
            player_name: String(row.player_name ?? row.name ?? 'Unknown'),
            pa: localToNum(row.pa),
            woba: localToNum(row.woba),
            hardhit_percent: localToNum(row.hardhit_percent),
            barrels_per_pa_percent: localToNum(row.barrels_per_pa_percent),
            launch_speed: localToNum(row.launch_speed),
            hrs: localToNum(row.hrs)
          } as TeamBatRow;
        });

        const tp = csvParse(teamPitchText).map((d) => {
          const row = d as Record<string, unknown>;
          return {
            player_id: localToNum(row.player_id),
            player_name: String(row.player_name ?? row.name ?? 'Unknown'),
            pa: localToNum(row.pa),
            k_percent: localToNum(row.k_percent),
            bb_percent: localToNum(row.bb_percent),
            velocity: localToNum(row.velocity),
            woba: localToNum(row.woba),
            pitcher_run_value_per_100: localToNum(row.pitcher_run_value_per_100),
            batter_run_value_per_100: localToNum(row.batter_run_value_per_100),
            api_break_x_batter_in: localToNum(row.api_break_x_batter_in),
            api_break_z_induced: localToNum(row.api_break_z_induced),
            xba: localToNum(row.xba),
            swing_miss_percent: localToNum(row.swing_miss_percent)
          } as TeamPitchRow;
        });

        setPitchRows(
          p.filter((r) => Number.isFinite(r.release_speed) && Number.isFinite(r.plate_x) && Number.isFinite(r.plate_z))
        );
        setBatRows(
          b.filter((r) => {
            const hasDate = String(r.game_date ?? '').length >= 4;
            const hasPlayer = String(r.player_name ?? '').trim().length > 0;
            const rr = r as BatRow & { estimated_woba_using_speedangle?: number; woba_value?: number };
            const hasAnyXwoba = Number.isFinite(rr.estimated_woba_using_speedangle) || Number.isFinite(rr.woba_value);
            const hasContactPoint = Number.isFinite(r.hc_x) && Number.isFinite(r.hc_y);
            const hasBattedBallMetrics = Number.isFinite(r.launch_speed) || Number.isFinite(r.launch_angle);
            return hasDate && hasPlayer && (hasAnyXwoba || hasContactPoint || hasBattedBallMetrics);
          })
        );
        setTeamBatRows(tb.filter((r) => Number.isFinite(r.woba) && Number.isFinite(r.pa) && r.pa >= 80));
        setTeamPitchRows(tp.filter((r) => Number.isFinite(r.k_percent) && Number.isFinite(r.bb_percent) && Number.isFinite(r.pa) && r.pa >= 50));
      })
      .catch(() => {
        setPitchRows([]);
        setBatRows([]);
        setTeamBatRows([]);
        setTeamPitchRows([]);
      });
  }, []);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, smoothWheel: true, wheelMultiplier: 0.95, touchMultiplier: 1.2 });
    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    const stopMagnetic = setupMagneticElements('.magnetic');
    const killAnimations = initPageAnimations({
      root: appRef.current,
      horizontalTrack: horizontalTrackRef.current,
      counterTarget: counterRef.current,
      fieldTunnel: fieldTunnelRef.current,
      onCounterUpdate: (v) => setMph(Math.floor(v)),
      onSectionChange: (id) => setActiveSection(id),
      onProgress: (p) => setScrollProgress(p)
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        window.scrollBy({ top: window.innerHeight * 0.86, behavior: 'smooth' });
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        window.scrollBy({ top: -window.innerHeight * 0.86, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      stopMagnetic();
      killAnimations();
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const introTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (introTimerRef.current != null) {
        window.clearTimeout(introTimerRef.current);
      }
    };
  }, []);

  const openIntro = () => {
    setIntroLeaving(true);
    introTimerRef.current = window.setTimeout(() => {
      setIntroDone(true);
      setIntroLeaving(false);
      window.setTimeout(() => setIntroMounted(false), 280);
    }, 900);
  };

  const skipIntro = () => {
    if (introTimerRef.current != null) {
      window.clearTimeout(introTimerRef.current);
    }
    setIntroDone(true);
    setIntroLeaving(false);
    window.setTimeout(() => setIntroMounted(false), 180);
  };

  useEffect(() => {
    const prevYear = prevSelectedYearRef.current;
    if (prevYear === selectedYear) return;
    const direction: 1 | -1 = selectedYear > prevYear ? 1 : -1;
    prevSelectedYearRef.current = selectedYear;
    setYearTransition({ from: prevYear, to: selectedYear, direction, active: true });
    if (yearTransitionTimerRef.current != null) {
      window.clearTimeout(yearTransitionTimerRef.current);
    }
    yearTransitionTimerRef.current = window.setTimeout(() => {
      setYearTransition((current) => (current && current.to === selectedYear ? { ...current, active: false } : current));
    }, 760);
  }, [selectedYear]);

  useEffect(() => {
    return () => {
      if (yearTransitionTimerRef.current != null) {
        window.clearTimeout(yearTransitionTimerRef.current);
      }
    };
  }, []);

  const yearOptions = useMemo<YearOption[]>(() => {
    const years = Array.from(new Set([...pitchRows, ...batRows].map((r) => Number(String(r.game_date).slice(0, 4))))).filter(Number.isFinite);
    return years.sort((a, b) => b - a).map((year) => ({ value: year, label: String(year) }));
  }, [pitchRows, batRows]);

  const yamamotoPitchRows = useMemo(
    () => pitchRows.filter((r) => localShortName(r.player_name) === 'Yoshinobu Yamamoto' || localShortName(r.player_name) === 'Yamamoto'),
    [pitchRows]
  );

  const ohtaniBatRows = useMemo(
    () => batRows.filter((r) => localShortName(r.player_name) === 'Shohei Ohtani' || localShortName(r.player_name) === 'Ohtani'),
    [batRows]
  );

  const storyChartData = useMemo<Record<'ohtani' | 'yamamoto', StoryChartData>>(
    () => buildStoryChartData(ohtaniBatRows, yamamotoPitchRows, selectedYear),
    [ohtaniBatRows, yamamotoPitchRows, selectedYear]
  );

  const changeYear = (delta: number) => {
    if (!yearOptions.length) return;
    const years = yearOptions.map((opt) => opt.value);
    const idx = years.indexOf(selectedYear);
    const nextIdx = Math.max(0, Math.min(years.length - 1, idx + delta));
    setSelectedYear(years[nextIdx] ?? years[0]);
  };

  const pitchYearBuckets = useMemo<PitchYearBucket[]>(() => {
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
  }, [pitchRows]);

  const batYearBuckets = useMemo(() => {
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
        return { year, count, avgEV, avgLA, hardHit, barrels };
      });
  }, [batRows]);

  const yamamotoSeasonSummaries = useMemo<OhtaniSeasonSummary[]>(() => {
    const yearData: Record<number, Omit<OhtaniSeasonSummary & { xera?: number }, 'year'>> = {
      2026: {
        rows: pitchRows.filter((r) => Number(String(r.game_date).slice(0, 4)) === 2026) as any,
        battingRunValue: 7,
        baserunningRunValue: 0,
        fieldingRunValue: 0,
        xwoba: 0,
        xba: 0.242,
        xslg: 0,
        avgExitVelo: 86.9,
        barrelPct: 8.6,
        hardHitPct: 31.4,
        sweetSpotPct: 42.9,
        batSpeed: 95.5,
        squaredUpPct: 0,
        chasePct: 32.5,
        whiffPct: 30.9,
        kPct: 22.1,
        bbPct: 3.2,
        sprintSpeed: 6.5,
        xera: 3.48
      },
      2025: {
        rows: pitchRows.filter((r) => Number(String(r.game_date).slice(0, 4)) === 2025) as any,
        battingRunValue: 42,
        baserunningRunValue: 0,
        fieldingRunValue: 0,
        xwoba: 0,
        xba: 0.199,
        xslg: 0,
        avgExitVelo: 88.3,
        barrelPct: 5.7,
        hardHitPct: 39.7,
        sweetSpotPct: 53.7,
        batSpeed: 95.3,
        squaredUpPct: 0,
        chasePct: 29.6,
        whiffPct: 28.9,
        kPct: 29.4,
        bbPct: 8.6,
        sprintSpeed: 6.5,
        xera: 2.74
      },
      2024: {
        rows: pitchRows.filter((r) => Number(String(r.game_date).slice(0, 4)) === 2024) as any,
        battingRunValue: 10,
        baserunningRunValue: 0,
        fieldingRunValue: 0,
        xwoba: 0,
        xba: 0.232,
        xslg: 0,
        avgExitVelo: 88.4,
        barrelPct: 8.3,
        hardHitPct: 41.3,
        sweetSpotPct: 48.3,
        batSpeed: 95.5,
        squaredUpPct: 0,
        chasePct: 31.7,
        whiffPct: 27.0,
        kPct: 28.5,
        bbPct: 6.0,
        sprintSpeed: 6.6,
        xera: 3.44
      }
    };
    return [2026, 2025, 2024].map((year) => ({ year, ...(yearData[year]) } as Omit<OhtaniSeasonSummary, 'year'> & { year: number; xera?: number }));
  }, [pitchRows]);

  const teamYearSummary = useMemo<YearSummary | null>(() => {
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
  }, [batYearBuckets, pitchYearBuckets, selectedYear]);

  useEffect(() => {
    if (pitchYearBuckets.length && !pitchYearBuckets.some((y) => y.year === selectedYear)) {
      setSelectedYear(pitchYearBuckets[0].year);
    }
  }, [pitchYearBuckets, selectedYear]);

  const pitchUsageData = heroPlayer === 'yamamoto' ? storyChartData.yamamoto.pitchUsage : [];
  const sprayData = heroPlayer === 'ohtani' ? storyChartData.ohtani.sprayPoints : [];
  const sprayYear = selectedYear;

  const rollingSeries = useMemo(
    () => buildRollingXwobaSeries(ohtaniBatRows, selectedYear, 100),
    [ohtaniBatRows, selectedYear]
  );

  const dodgersSummary = useMemo(() => {
    const rows = teamBatRows;
    const count = rows.length;
    const avgWoba = rows.reduce((s, r) => s + (Number.isFinite(r.woba) ? r.woba : 0), 0) / Math.max(1, count);
    const avgHardHit = rows.reduce((s, r) => s + (Number.isFinite(r.hardhit_percent) ? r.hardhit_percent : 0), 0) / Math.max(1, count);
    const avgBarrels = rows.reduce((s, r) => s + (Number.isFinite(r.barrels_per_pa_percent) ? r.barrels_per_pa_percent : 0), 0) / Math.max(1, count);
    const avgEV = rows.reduce((s, r) => s + (Number.isFinite(r.launch_speed) ? r.launch_speed : 0), 0) / Math.max(1, count);
    const totalPa = rows.reduce((s, r) => s + (Number.isFinite(r.pa) ? r.pa : 0), 0);
    const totalHr = rows.reduce((s, r) => s + (Number.isFinite(r.hrs) ? r.hrs : 0), 0);
    const leaders = [...rows].sort((a, b) => b.woba - a.woba).slice(0, 3);
    return { count, avgWoba, avgHardHit, avgBarrels, avgEV, totalPa, totalHr, leaders };
  }, [teamBatRows]);

  const batTrendData = rollingSeries;

  const rollingHeadline = useMemo(() => {
    if (!rollingSeries.length) return '.000';
    return rollingSeries[rollingSeries.length - 1].y.toFixed(3).replace(/^0/, '.');
  }, [rollingSeries]);


  const percentileRows = useMemo(() => [
    { label: 'xwOBA', value: 94, metric: '.414', color: 'great' },
    { label: 'Avg EV', value: 95, metric: '94.0', color: 'great' },
    { label: 'Barrel%', value: 98, metric: '23.9%', color: 'great' },
    { label: 'BB%', value: 92, metric: '17.1%', color: 'great' },
    { label: 'xERA', value: 64, metric: '3.53', color: 'mid' },
    { label: 'K%', value: 48, metric: '22.1%', color: 'mid' },
    { label: 'Whiff%', value: 76, metric: '30.9%', color: 'good' },
    { label: 'Pitch Velo', value: 67, metric: '95.5', color: 'good' }
  ], []);

  const movementPitchMeta = useMemo(() => {
    const aliasMap: Record<string, { label: string; color: string; short: string }> = {
      'split-finger': { label: 'Split', color: '#4eb4bd', short: 'Split' },
      splitter: { label: 'Split', color: '#4eb4bd', short: 'Split' },
      split: { label: 'Split', color: '#4eb4bd', short: 'Split' },
      '4-seam fastball': { label: '4-Seam', color: '#cb4862', short: '4-Seam' },
      fourseam: { label: '4-Seam', color: '#cb4862', short: '4-Seam' },
      cutter: { label: 'Cutter', color: '#93513d', short: 'Cutter' },
      curveball: { label: 'Curve', color: '#31c6da', short: 'Curve' },
      curve: { label: 'Curve', color: '#31c6da', short: 'Curve' },
      sinker: { label: 'Sinker', color: '#f4a329', short: 'Sinker' },
      slider: { label: 'Slider', color: '#e8df37', short: 'Slider' }
    };

    const rows = yamamotoPitchRows.filter((r) => Number(String(r.game_date).slice(0, 4)) === selectedYear);
    const safeRows = rows.length ? rows : yamamotoPitchRows;

    const pointList = safeRows
      .filter((r) => Number.isFinite(r.pfx_x) && Number.isFinite(r.pfx_z) && r.pitch_name)
      .map((r, idx) => {
        const key = String(r.pitch_name ?? '').toLowerCase().trim();
        const base = aliasMap[key] ?? aliasMap[key.replace(/\s+/g, '')] ?? { label: r.pitch_name, color: '#9fb2bf', short: r.pitch_name };
        const jitterX = Math.sin((idx + 1) * 2.137) * 0.18;
        const jitterY = Math.cos((idx + 1) * 1.773) * 0.18;
        return {
          type: base.label,
          color: base.color,
          x: Number((-(r.pfx_x * 13.8) + jitterX).toFixed(2)),
          y: Number(((r.pfx_z * 13.8) + jitterY).toFixed(2)),
          speed: r.release_speed
        };
      });

    const byType = pointList.reduce<Record<string, { type: string; color: string; count: number; speedSum: number }>>((acc, p) => {
      if (!acc[p.type]) acc[p.type] = { type: p.type, color: p.color, count: 0, speedSum: 0 };
      acc[p.type].count += 1;
      acc[p.type].speedSum += Number.isFinite(p.speed) ? p.speed : 0;
      return acc;
    }, {});

    const total = Math.max(1, pointList.length);
    const order = ['Split', '4-Seam', 'Cutter', 'Curve', 'Sinker', 'Slider'];
    const usageRows = order
      .map((t) => byType[t])
      .filter(Boolean)
      .map((item) => ({
        type: item.type,
        color: item.color,
        usage: Math.round((item.count / total) * 100),
        mph: Number((item.speedSum / Math.max(1, item.count)).toFixed(1)),
        rhpAvg: ({ Split: 86.7, '4-Seam': 95.0, Cutter: 89.8, Curve: 80.8, Sinker: 94.3, Slider: 86.7 } as Record<string, number>)[item.type] ?? 88.0
      }));

    const armRows = safeRows.filter((r) => Number.isFinite(r.arm_angle));
    const armAngle = armRows.length ? Math.round(armRows.reduce((s, r) => s + Number(r.arm_angle), 0) / armRows.length) : 41;

    return {
      points: pointList,
      usageRows,
      armAngle,
      pitcherLineAngle: Math.max(18, Math.min(58, armAngle - 3))
    };
  }, [yamamotoPitchRows, selectedYear]);


  const pitchYearSummary = useMemo(() => pitchYearBuckets.find((b) => b.year === selectedYear) ?? pitchYearBuckets[0], [pitchYearBuckets, selectedYear]);
  const batYearSummary = useMemo(() => batYearBuckets.find((b) => b.year === selectedYear) ?? batYearBuckets[0], [batYearBuckets, selectedYear]);

  const activePitchRows = useMemo(
    () => pitchRows.filter((r) => selectedPitcher === r.player_name || localShortName(selectedPitcher) === localShortName(r.player_name)),
    [selectedPitcher, pitchRows]
  );



  const maxMph = useMemo(() => {
    if (!activePitchRows.length) return 119;
    return Math.max(100, Math.round(Math.max(...activePitchRows.map((r) => r.release_speed))));
  }, [activePitchRows]);

  const fragments = useMemo<Fragment[]>(() => {
    if (!pitchRows.length) {
      return [
        { id: 'trajectory', title: 'TRAJECTORY', metric: '41.8°', desc: '垂直进垒角 · 最佳释放窗' },
        { id: 'velocity', title: 'VELOCITY', metric: '96.7', desc: '四缝平均球速 · MPH' },
        { id: 'location', title: 'LOCATION', metric: '62%', desc: '高价值落点命中率' },
        { id: 'spin', title: 'SPIN', metric: '2431', desc: '转速峰值 · RPM' }
      ];
    }

    const avgVelo = pitchRows.reduce((s, r) => s + r.release_speed, 0) / pitchRows.length;
    const inZone = pitchRows.filter((r) => r.plate_x >= -0.83 && r.plate_x <= 0.83 && r.plate_z >= 1.5 && r.plate_z <= 3.5)
      .length;
    const whiff = pitchRows.filter((r) => r.description.includes('swinging_strike')).length;
    const avgSpin =
      pitchRows.filter((r) => Number.isFinite(r.release_spin_rate)).reduce((s, r) => s + r.release_spin_rate, 0) /
      Math.max(1, pitchRows.filter((r) => Number.isFinite(r.release_spin_rate)).length);

    const xSpread = Math.max(...pitchRows.map((r) => r.plate_x)) - Math.min(...pitchRows.map((r) => r.plate_x));

    return [
      { id: 'velocity', title: 'VELOCITY', metric: avgVelo.toFixed(1), desc: '均速 · MPH' },
      { id: 'location', title: 'LOCATION', metric: `${Math.round((inZone / pitchRows.length) * 100)}%`, desc: '好球带命中率' },
      { id: 'whiff', title: 'WHIFF', metric: `${Math.round((whiff / pitchRows.length) * 100)}%`, desc: '挥空率' },
      { id: 'spin', title: 'SPIN', metric: `${Math.round(avgSpin || 0)}`, desc: '平均转速 · RPM' },
      { id: 'spread', title: 'SPREAD', metric: xSpread.toFixed(2), desc: '横向落点离散 · FT' }
    ];
  }, [pitchRows]);

  const mphText = useMemo(() => String(mph).padStart(3, '0'), [mph]);
  void mphText;

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const batterOptions = useMemo(
    () => [...teamBatRows].sort((a, b) => b.woba - a.woba).slice(0, 18),
    [teamBatRows]
  );

  const pitcherOptions = useMemo(
    () => [...teamPitchRows].sort((a, b) => b.k_percent - a.k_percent).slice(0, 18),
    [teamPitchRows]
  );

  const pitchUsageYearRows = useMemo(() => {
    return pitchYearBuckets.map((bucket) => ({
      year: bucket.year,
      usage: bucket.usage,
      total: bucket.rows.length
    }));
  }, [pitchYearBuckets]);

  const normalizedPitchUsageRows = useMemo(() => {
    const usage = pitchYearSummary?.usage ?? [];
    const total = Math.max(1, pitchYearSummary?.rows.length ?? 1);
    const allow = new Set(['4-Seam Fastball', 'Split-Finger', 'Curveball', 'Cutter', 'Sinker', 'Slider', 'Sweeper', 'Changeup']);
    const merged = usage.reduce<Record<string, number>>((acc, item) => {
      const name = normalizePitchName(item.name);
      if (!allow.has(name)) return acc;
      acc[name] = (acc[name] ?? 0) + Number(item.value ?? 0);
      return acc;
    }, {});

    return Object.entries(merged)
      .map(([name, value]) => {
        const pct = Math.round((value / total) * 100);
        return { name, value, pct };
      })
      .filter((row) => row.pct > 0)
      .sort((a, b) => b.value - a.value);
  }, [pitchYearSummary]);

  const yearTransitionClass = yearTransition?.active ? `year-transition--${yearTransition.direction > 0 ? 'forward' : 'backward'}` : '';
  const yearTransitionLabel = yearTransition?.active ? `${yearTransition.from} → ${yearTransition.to}` : `${selectedYear}`;
  const yearTransitionKey = `${selectedYear}-${yearTransition?.active ? 'moving' : 'steady'}`;

  const percentileYearRows = useMemo(() => {
    return batYearBuckets.map((bucket) => ({
      year: bucket.year,
      avgEV: bucket.avgEV,
      avgLA: bucket.avgLA,
      hardHit: bucket.hardHit,
      barrels: bucket.barrels
    }));
  }, [batYearBuckets]);

  const selectedBatterRow = useMemo(
    () => teamBatRows.find((r) => r.player_name === selectedBatter),
    [teamBatRows, selectedBatter]
  );

  const selectedPitcherRow = useMemo(
    () => teamPitchRows.find((r) => r.player_name === selectedPitcher),
    [teamPitchRows, selectedPitcher]
  );

  const pitcherRadarMetrics = useMemo(() => {
    if (!selectedPitcherRow || !teamPitchRows.length) return null;

    const rows = teamPitchRows;
    const runValueArr = rows.map((r) => Number(r.pitcher_run_value_per_100));
    const fastballArr = rows.map((r) => Number(r.batter_run_value_per_100));
    const breakingArr = rows.map((r) => Number(r.api_break_x_batter_in));
    const offspeedArr = rows.map((r) => Number(r.api_break_z_induced));
    const xEraArr = rows.map((r) => Number(r.xba));

    const raw = {
      PitchingRunValue: Number(selectedPitcherRow.pitcher_run_value_per_100),
      FastballRunValue: Number(selectedPitcherRow.batter_run_value_per_100),
      BreakingRunValue: Number(selectedPitcherRow.api_break_x_batter_in),
      OffspeedRunValue: Number(selectedPitcherRow.api_break_z_induced),
      xERA: Number(selectedPitcherRow.xba)
    };

    const safe = {
      PitchingRunValue: Number.isFinite(raw.PitchingRunValue) ? raw.PitchingRunValue : Number(selectedPitcherRow.pitcher_run_value_per_100 ?? 0),
      FastballRunValue: Number.isFinite(raw.FastballRunValue) ? raw.FastballRunValue : Number(selectedPitcherRow.velocity),
      BreakingRunValue: Number.isFinite(raw.BreakingRunValue) ? raw.BreakingRunValue : Number(selectedPitcherRow.api_break_x_batter_in ?? selectedPitcherRow.k_percent - selectedPitcherRow.bb_percent),
      OffspeedRunValue: Number.isFinite(raw.OffspeedRunValue) ? raw.OffspeedRunValue : Number(selectedPitcherRow.api_break_z_induced ?? selectedPitcherRow.bb_percent),
      xERA: Number.isFinite(raw.xERA) ? raw.xERA : Number(selectedPitcherRow.xba ?? selectedPitcherRow.woba)
    };

    return {
      labels: ['Pitching Run Value', 'Fastball Run Value', 'Breaking Run Value', 'Offspeed Run Value', 'xERA'],
      values: [safe.PitchingRunValue, safe.FastballRunValue, safe.BreakingRunValue, safe.OffspeedRunValue, safe.xERA],
      scales: {
        PitchingRunValue: localPercentileRank(runValueArr, safe.PitchingRunValue),
        FastballRunValue: localPercentileRank(fastballArr, safe.FastballRunValue),
        BreakingRunValue: localPercentileRank(breakingArr, safe.BreakingRunValue),
        OffspeedRunValue: localPercentileRank(offspeedArr, safe.OffspeedRunValue),
        xERA: localPercentileRank(xEraArr, safe.xERA, true)
      }
    };
  }, [selectedPitcherRow, teamPitchRows]);

  const abilityMatrixRows = useMemo(() => {
    if (!selectedBatterRow || !selectedPitcherRow) return [];
    const batWobaArr = teamBatRows.map((r) => r.woba);
    const batHardHitArr = teamBatRows.map((r) => r.hardhit_percent);
    const batBarrelArr = teamBatRows.map((r) => r.barrels_per_pa_percent);
    const batEvArr = teamBatRows.map((r) => r.launch_speed);
    const batHrArr = teamBatRows.map((r) => r.hrs);

    return [
      { dim: 'wOBA', batter: selectedBatterRow.woba.toFixed(3), batterPct: localPercentileRank(batWobaArr, selectedBatterRow.woba), pitcher: selectedPitcherRow.woba.toFixed(3), pitcherPct: localPercentileRank(teamPitchRows.map((r) => r.woba), selectedPitcherRow.woba, true) },
      { dim: 'HardHit%', batter: `${selectedBatterRow.hardhit_percent.toFixed(1)}%`, batterPct: localPercentileRank(batHardHitArr, selectedBatterRow.hardhit_percent), pitcher: `${Math.max(0, 100 - selectedPitcherRow.bb_percent * 2).toFixed(1)}%`, pitcherPct: localPercentileRank(teamPitchRows.map((r) => 100 - r.bb_percent * 2), 100 - selectedPitcherRow.bb_percent * 2, true) },
      { dim: 'Barrel/PA%', batter: `${selectedBatterRow.barrels_per_pa_percent.toFixed(1)}%`, batterPct: localPercentileRank(batBarrelArr, selectedBatterRow.barrels_per_pa_percent), pitcher: `${selectedPitcherRow.k_percent.toFixed(1)}%`, pitcherPct: localPercentileRank(teamPitchRows.map((r) => r.k_percent), selectedPitcherRow.k_percent) },
      { dim: 'AVG EV / Velo', batter: `${selectedBatterRow.launch_speed.toFixed(1)} mph`, batterPct: localPercentileRank(batEvArr, selectedBatterRow.launch_speed), pitcher: `${selectedPitcherRow.velocity.toFixed(1)} mph`, pitcherPct: localPercentileRank(teamPitchRows.map((r) => r.velocity), selectedPitcherRow.velocity) },
      { dim: 'HR / K-BB', batter: `${selectedBatterRow.hrs}`, batterPct: localPercentileRank(batHrArr, selectedBatterRow.hrs), pitcher: `${(selectedPitcherRow.k_percent - selectedPitcherRow.bb_percent).toFixed(1)}%`, pitcherPct: localPercentileRank(teamPitchRows.map((r) => r.k_percent - r.bb_percent), selectedPitcherRow.k_percent - selectedPitcherRow.bb_percent) }
    ];
  }, [selectedBatterRow, selectedPitcherRow, teamBatRows, teamPitchRows]);

  useEffect(() => {
    if (!overviewBatBarRef.current || !teamBatRows.length) return;
    const chart = echarts.init(overviewBatBarRef.current);
    const top = [...teamBatRows].sort((a, b) => b.woba - a.woba).slice(0, 10);
    chart.setOption({
      grid: { left: 110, right: 24, top: 12, bottom: 24 },
      xAxis: { type: 'value', axisLabel: { color: '#9fb2cc' }, splitLine: { lineStyle: { color: '#1d2a45' } } },
      yAxis: { type: 'category', data: top.map((r) => r.player_name.replace(/,.*/, '')), axisLabel: { color: '#dce8ff' } },
      series: [{ type: 'bar', data: top.map((r) => Number((r.woba * 1000).toFixed(0))), itemStyle: { color: '#42e8ff' }, barMaxWidth: 16 }]
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [teamBatRows]);

  useEffect(() => {
    if (!batterAbilityRef.current || !selectedBatterRow) return;
    const chart = echarts.init(batterAbilityRef.current);
    chart.setOption({
      radar: {
        radius: '62%',
        splitLine: { lineStyle: { color: 'rgba(109, 132, 168, 0.35)' } },
        splitArea: { areaStyle: { color: ['rgba(80,109,160,0.06)', 'rgba(80,109,160,0.02)'] } },
        indicator: [
          { name: 'wOBA', max: 0.48 },
          { name: 'HardHit%', max: 70 },
          { name: 'Barrel/PA%', max: 20 },
          { name: 'AVG EV', max: 100 },
          { name: 'HR', max: 130 }
        ],
        axisName: { color: '#cfe2ff' }
      },
      series: [{
        type: 'radar',
        data: [{
          value: [
            Number(selectedBatterRow.woba.toFixed(3)),
            Number(selectedBatterRow.hardhit_percent.toFixed(1)),
            Number(selectedBatterRow.barrels_per_pa_percent.toFixed(1)),
            Number(selectedBatterRow.launch_speed.toFixed(1)),
            selectedBatterRow.hrs
          ],
          areaStyle: { color: 'rgba(66,232,255,0.2)' },
          lineStyle: { color: '#42e8ff', width: 2 },
          itemStyle: { color: '#42e8ff' }
        }]
      }]
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [selectedBatterRow]);

  useEffect(() => {
    if (!pitcherAbilityRef.current || !selectedPitcherRow || !pitcherRadarMetrics) return;
    const chart = echarts.init(pitcherAbilityRef.current);
    const indicators = pitcherRadarMetrics.labels.map((name) => ({ name, max: 100 }));
    const values = pitcherRadarMetrics.labels.map((label) => pitcherRadarMetrics.scales[label.replace(/%/g, 'Pct').replace(/ /g, '') as keyof typeof pitcherRadarMetrics.scales]);
    chart.setOption({
      backgroundColor: 'transparent',
      animationDuration: 1200,
      animationEasing: 'cubicOut',
      radar: {
        radius: '78%',
        center: ['50%', '54%'],
        startAngle: 90,
        splitNumber: 4,
        shape: 'polygon',
        axisName: { color: '#d8e8f2', fontWeight: 700, fontSize: 11, padding: [2, 0, 0, 0] },
        axisNameGap: 16,
        splitLine: { lineStyle: { color: 'rgba(78, 150, 176, 0.22)', width: 1 } },
        splitArea: { areaStyle: { color: ['rgba(18, 31, 40, 0.60)', 'rgba(11, 20, 27, 0.35)'] } },
        axisLine: { lineStyle: { color: 'rgba(78, 150, 176, 0.22)' } },
        indicator: indicators
      },
      series: [{
        type: 'radar',
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#ff5d4d', width: 2.5, shadowBlur: 14, shadowColor: 'rgba(255,93,77,0.40)' },
        itemStyle: { color: '#ff5d4d', borderColor: '#ffe7e3', borderWidth: 1 },
        areaStyle: { color: 'rgba(255,93,77,0.18)' },
        data: [{ value: values, name: selectedPitcherRow.player_name }]
      }]
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [selectedPitcherRow, pitcherRadarMetrics]);

  useEffect(() => {
    if (!yamamotoPitchChartRef.current) return;
    const chart = echarts.init(yamamotoPitchChartRef.current);
    const data = normalizedPitchUsageRows;
    chart.setOption({
      backgroundColor: 'transparent',
      animationDuration: 1200,
      animationEasing: 'cubicOut',
      grid: { left: 72, right: 72, top: 32, bottom: 20 },
      xAxis: {
        type: 'value',
        max: 100,
        min: 0,
        axisLabel: { color: '#5f7488', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(109,132,168,0.14)' } },
        axisLine: { lineStyle: { color: 'rgba(109,132,168,0.32)' } }
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: data.map((d) => d.name),
        axisLabel: { color: '#eaf3ff', fontSize: 13, fontWeight: 700 },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        type: 'bar',
        data: data.map((d, idx) => ({ value: d.pct, itemStyle: { color: ['#ff5d4d', '#ff9f43', '#5ad7ff', '#7a6cff', '#3dd5a7', '#ffd24d'][idx % 6] } })),
        barWidth: 15,
        label: { show: true, position: 'right', color: '#dcecff', fontWeight: 700, formatter: (p: any) => `${Number(p.value)}%` },
        itemStyle: { borderRadius: [0, 999, 999, 0] }
      }]
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [normalizedPitchUsageRows]);

  useEffect(() => {
    if (!ohtaniSprayChartRef.current) return;
    const chart = echarts.init(ohtaniSprayChartRef.current);
    const points = sprayData
      .filter((p) => (p.hit === 'single' ? sprayLayer.singles : p.hit === 'double' ? sprayLayer.doubles : p.hit === 'triple' ? sprayLayer.triples : p.hit === 'home_run' ? sprayLayer.homeRuns : true))
      .map((p) => [p.x, p.y, p.hit === 'home_run' ? 4 : p.hit === 'triple' ? 3 : p.hit === 'double' ? 2 : 1]);
    const lgAvgLine = Array.from({ length: Math.max(2, batTrendData.length || 40) }, (_, i) => [i + 1, 92]);
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 20, right: 20, top: 12, bottom: 16 },
      xAxis: { min: 0, max: 400, show: false },
      yAxis: { min: 0, max: 350, show: false },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: batTrendData.map((p) => [p.x, p.y]),
          lineStyle: { color: '#61d6ff', width: 2.2 },
          areaStyle: sprayLayer.trend ? { color: 'rgba(97,214,255,0.08)' } : { opacity: 0 }
        },
        {
          type: 'line',
          smooth: false,
          showSymbol: false,
          data: lgAvgLine,
          lineStyle: { color: '#9fb2cc', width: 1.2, type: 'dashed', opacity: sprayLayer.lgAvg ? 0.9 : 0 },
          markLine: { symbol: 'none', lineStyle: { color: '#9fb2cc', type: 'dashed', opacity: sprayLayer.lgAvg ? 0.9 : 0 }, data: [{ yAxis: 92 }] }
        },
        {
          type: 'scatter',
          data: points.map((item) => ({ value: item })),
          symbolSize: (val: number[]) => 6 + val[2] * 2,
          itemStyle: {
            color: (params: any) => {
              const type = params.data.value[2];
              if (type === 4) return '#ff3d7f';
              if (type === 3) return '#ffb000';
              if (type === 2) return '#7b62ff';
              return '#ff8a1c';
            }
          },
          label: {
            show: true,
            formatter: (params: any) => {
              const type = params.data.value[2];
              if (type === 4) return 'HR';
              if (type === 3) return '3B';
              if (type === 2) return '2B';
              return '1B';
            },
            color: '#f5f8ff',
            fontSize: 10,
            position: 'top',
            distance: 6,
            backgroundColor: 'rgba(5,8,20,0.82)',
            borderColor: 'rgba(255,255,255,0.18)',
            borderWidth: 1,
            borderRadius: 10,
            padding: [2, 6]
          },
          emphasis: { scale: 1.15 },
          animationDuration: 900,
          animationEasing: 'cubicOut'
        }
      ]
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [batTrendData, sprayData, sprayLayer.lgAvg, sprayLayer.trend, sprayLayer.singles, sprayLayer.doubles, sprayLayer.triples, sprayLayer.homeRuns]);

  useEffect(() => {
    if (!movementChartRef.current) return;
    const chart = echarts.init(movementChartRef.current);
    const palette = ['#d22d49', '#00d1ed', '#ddb33a', '#3bacac', '#fe9d00', '#eee716', '#933f2c', '#0068ff'];
    const clusterBases = [
      [-12, 18], [16, 18], [-10, -2], [14, -4], [22, 10], [-18, 4]
    ];
    const rows = (pitchUsageData.length ? pitchUsageData : [{ name: 'FF', value: 1 }]).map((p, idx) => {
      const base = clusterBases[idx % clusterBases.length];
      const spread = 5 + (idx % 4) * 1.8;
      return { x: base[0] + Math.cos(idx * 1.7) * spread, y: base[1] + Math.sin(idx * 1.4) * spread, name: p.name, z: p.value };
    });
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 28, right: 28, top: 18, bottom: 22 },
      xAxis: { min: -30, max: 30, axisLabel: { color: '#86a6ca' }, splitLine: { lineStyle: { color: 'rgba(109,132,168,0.16)' } } },
      yAxis: { min: -30, max: 30, axisLabel: { color: '#86a6ca' }, splitLine: { lineStyle: { color: 'rgba(109,132,168,0.16)' } } },
      series: [{
        type: 'scatter',
        data: rows.map((r, idx) => [r.x, r.y, r.z, r.name, idx]),
        symbolSize: (val: number[]) => 18 + val[2] * 1.2,
        itemStyle: { color: (params: any) => palette[params.data.value[4] % palette.length] },
        animationDuration: 900,
        animationEasing: 'cubicOut'
      }]
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [pitchUsageData]);

  const yamamotoPercentileGroups = useMemo(() => {
    const current = yamamotoSeasonSummaries.find((item) => item.year === selectedYear) ?? yamamotoSeasonSummaries[0];
    const currentYear = current.year;
    const lookup: Record<number, { valueRows: OhtaniPercentileMetric[]; pitchingRows: OhtaniPercentileMetric[]; runningRows: OhtaniPercentileMetric[]; fieldingRows: OhtaniPercentileMetric[] }> = {
      2026: {
        valueRows: [
          { key: 'pitchingRunValue', label: 'Pitching Run Value', value: 7, display: '7', pct: 97 },
          { key: 'fastballRunValue', label: 'Fastball Run Value', value: 0, display: '0', pct: 46 },
          { key: 'breakingRunValue', label: 'Breaking Run Value', value: 2, display: '2', pct: 87 },
          { key: 'offspeedRunValue', label: 'Offspeed Run Value', value: 5, display: '5', pct: 100 }
        ],
        pitchingRows: [
          { key: 'xERA', label: 'xERA', value: 3.48, display: '3.48', pct: 66, lowIsBetter: true },
          { key: 'xBA', label: 'xBA', value: 0.242, display: '.242', pct: 52, lowIsBetter: true },
          { key: 'fastballVelo', label: 'Fastball Velo', value: 95.5, display: '95.5', pct: 66 },
          { key: 'avgExitVelo', label: 'Avg Exit Velo', value: 86.9, display: '86.9', pct: 77, lowIsBetter: true },
          { key: 'chasePct', label: 'Chase %', value: 32.5, display: '32.5', pct: 71 },
          { key: 'whiffPct', label: 'Whiff %', value: 30.9, display: '30.9', pct: 77 },
          { key: 'kPct', label: 'K %', value: 22.1, display: '22.1', pct: 49 },
          { key: 'bbPct', label: 'BB %', value: 3.2, display: '3.2', pct: 93, lowIsBetter: true },
          { key: 'barrelPct', label: 'Barrel %', value: 8.6, display: '8.6', pct: 46, lowIsBetter: true },
          { key: 'hardHitPct', label: 'Hard-Hit %', value: 31.4, display: '31.4', pct: 79, lowIsBetter: true },
          { key: 'gbPct', label: 'GB %', value: 42.9, display: '42.9', pct: 45 }
        ],
        fieldingRows: [],
        runningRows: [{ key: 'extension', label: 'Extension', value: 6.5, display: '6.5', pct: 52 }]
      },
      2025: {
        valueRows: [
          { key: 'pitchingRunValue', label: 'Pitching Run Value', value: 42, display: '42', pct: 99 },
          { key: 'fastballRunValue', label: 'Fastball Run Value', value: 26, display: '26', pct: 99 },
          { key: 'breakingRunValue', label: 'Breaking Run Value', value: 6, display: '6', pct: 83 },
          { key: 'offspeedRunValue', label: 'Offspeed Run Value', value: 10, display: '10', pct: 98 }
        ],
        pitchingRows: [
          { key: 'xERA', label: 'xERA', value: 2.74, display: '2.74', pct: 95, lowIsBetter: true },
          { key: 'xBA', label: 'xBA', value: 0.199, display: '.199', pct: 92, lowIsBetter: true },
          { key: 'fastballVelo', label: 'Fastball Velo', value: 95.3, display: '95.3', pct: 66 },
          { key: 'avgExitVelo', label: 'Avg Exit Velo', value: 88.3, display: '88.3', pct: 75, lowIsBetter: true },
          { key: 'chasePct', label: 'Chase %', value: 29.6, display: '29.6', pct: 66 },
          { key: 'whiffPct', label: 'Whiff %', value: 28.9, display: '28.9', pct: 76 },
          { key: 'kPct', label: 'K %', value: 29.4, display: '29.4', pct: 89 },
          { key: 'bbPct', label: 'BB %', value: 8.6, display: '8.6', pct: 38, lowIsBetter: true },
          { key: 'barrelPct', label: 'Barrel %', value: 5.7, display: '5.7', pct: 87, lowIsBetter: true },
          { key: 'hardHitPct', label: 'Hard-Hit %', value: 39.7, display: '39.7', pct: 57, lowIsBetter: true },
          { key: 'gbPct', label: 'GB %', value: 53.7, display: '53.7', pct: 91 }
        ],
        fieldingRows: [],
        runningRows: [{ key: 'extension', label: 'Extension', value: 6.5, display: '6.5', pct: 52 }]
      },
      2024: {
        valueRows: [
          { key: 'pitchingRunValue', label: 'Pitching Run Value', value: 10, display: '10', pct: 79 },
          { key: 'fastballRunValue', label: 'Fastball Run Value', value: 5, display: '5', pct: 72 },
          { key: 'breakingRunValue', label: 'Breaking Run Value', value: 3, display: '3', pct: 73 },
          { key: 'offspeedRunValue', label: 'Offspeed Run Value', value: 2, display: '2', pct: 79 }
        ],
        pitchingRows: [
          { key: 'xERA', label: 'xERA', value: 3.44, display: '3.44', pct: 73, lowIsBetter: true },
          { key: 'xBA', label: 'xBA', value: 0.232, display: '.232', pct: 55, lowIsBetter: true },
          { key: 'fastballVelo', label: 'Fastball Velo', value: 95.5, display: '95.5', pct: 73 },
          { key: 'avgExitVelo', label: 'Avg Exit Velo', value: 88.4, display: '88.4', pct: 62, lowIsBetter: true },
          { key: 'chasePct', label: 'Chase %', value: 31.7, display: '31.7', pct: 82 },
          { key: 'whiffPct', label: 'Whiff %', value: 27.0, display: '27.0', pct: 62 },
          { key: 'kPct', label: 'K %', value: 28.5, display: '28.5', pct: 85 },
          { key: 'bbPct', label: 'BB %', value: 6.0, display: '6.0', pct: 81, lowIsBetter: true },
          { key: 'barrelPct', label: 'Barrel %', value: 8.3, display: '8.3', pct: 37, lowIsBetter: true },
          { key: 'hardHitPct', label: 'Hard-Hit %', value: 41.3, display: '41.3', pct: 27, lowIsBetter: true },
          { key: 'gbPct', label: 'GB %', value: 48.3, display: '48.3', pct: 79 }
        ],
        fieldingRows: [],
        runningRows: [{ key: 'extension', label: 'Extension', value: 6.6, display: '6.6', pct: 58 }]
      }
    };
    return { ...(lookup[currentYear] ?? lookup[2026]) };
  }, [selectedYear, yamamotoSeasonSummaries]);


  

  

  

  

  

  

  

  


  

  const heroGlyphMotion = useMemo(
    () =>
      Array.from(heroGlyphText).map((ch, i) => ({
        char: ch === ' ' ? '\u00A0' : ch,
        dir: glyphDirClasses[Math.floor(Math.random() * glyphDirClasses.length)],
        dur: (3.4 + Math.random() * 2.1).toFixed(2),
        delay: ((i % 11) * 0.09).toFixed(2)
      })),
    []
  );

  useEffect(() => {
    let rafId = 0;
    let vx = 0;
    let vy = 0;
    let x = heroAim.x;
    let y = heroAim.y;

    const stiffness = 0.08;
    const damping = 0.84;

    const tick = () => {
      const dx = heroAimTarget.x - x;
      const dy = heroAimTarget.y - y;

      vx = (vx + dx * stiffness) * damping;
      vy = (vy + dy * stiffness) * damping;

      x += vx;
      y += vy;

      if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02 && Math.abs(vx) < 0.02 && Math.abs(vy) < 0.02) {
        x = heroAimTarget.x;
        y = heroAimTarget.y;
      }

      setHeroAim({ x, y });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [heroAimTarget]);

  const heroFragmentLayout = useMemo(() => {
    const baseWidth = 1200;
    const selectedOffset = heroPlayer === 'yamamoto' ? -0.06 : 0.06;
    return heroFragments.map((frag, idx) => {
      const sideBias = frag.player === heroPlayer ? 1 : -1;
      const wobble = Math.sin((idx + 1) * 1.7 + (heroAim.x + heroAim.y) * 0.005) * 0.035;
      const x = Math.max(0.05, Math.min(0.92, frag.seedX + selectedOffset * sideBias + wobble * sideBias));
      const y = Math.max(0.08, Math.min(0.9, frag.seedY + Math.cos((idx + 2) * 1.3 + heroAim.x * 0.003) * 0.025));
      const opacity = frag.player === heroPlayer ? 1 : 0.72;
      return {
        ...frag,
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        opacity,
        scale: frag.player === heroPlayer ? 1 : 0.92,
        blur: frag.player === heroPlayer ? 0 : 0.6,
        zIndex: frag.player === heroPlayer ? 3 : 2,
        side: frag.player === 'yamamoto' ? 'left' : 'right',
        width: `${Math.max(120, baseWidth * (0.12 + idx * 0.012))}px`,
        maxWidth: `${Math.round(baseWidth * 0.22)}px`
      };
    });
  }, [heroAim.x, heroAim.y, heroPlayer]);

  const heroWavePaths = useMemo(() => {
    const lines = 52;
    const steps = 34;
    const width = 1200;
    const height = 240;

    return Array.from({ length: lines }, (_, i) => {
      const yBase = (i / (lines - 1)) * height;
      const phase = i * 0.31;
      const freq = 1.4 + (i % 6) * 0.22;

      let d = '';
      for (let s = 0; s <= steps; s += 1) {
        const x = (s / steps) * width;
        const dx = x - heroAim.x;
        const dy = yBase - heroAim.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.exp(-dist / 170);

        const wave = Math.sin((x / width) * Math.PI * 2 * freq + phase) * (3 + influence * 16);
        const attract = ((heroAim.y - yBase) * influence) / 2.4;
        const y = yBase + wave + attract;

        d += `${s === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)} `;
      }

      return d.trim();
    });
  }, [heroAim]);

  useEffect(() => {
    if (!heroHit) return;
    const t = window.setTimeout(() => setHeroHit(false), 320);
    return () => window.clearTimeout(t);
  }, [heroHit]);

  return (
    <div ref={appRef} className="aw-root">
      <CyberCursor />
      <div className="noise-layer" />
      <div className="progress-line" style={{ transform: `scaleX(${scrollProgress})` }} />

      {introMounted && !introDone && (
        <HorizonHeroSection
          className={`app-opening ${introLeaving ? 'leave' : ''}`}
          onEnter={openIntro}
          onSkip={skipIntro}
        />
      )}

      <aside className="chapter-nav">
        {sectionIds.map((id) => (
          <button
            key={id}
            type="button"
            className={`chapter-dot magnetic ${activeSection === id ? 'is-active' : ''}`}
            onClick={() => jumpTo(id)}
            aria-label={id}
          >
            <span />
          </button>
        ))}
      </aside>

      {!introDone && (
        <div className={`intro-screen ${introLeaving ? 'leave' : ''}`}>
          <div className="intro-screen-fallback">
            <p className="intro-label">CYBER ATHLETIC DATA SCAPE</p>
            <h1 className="intro-title reveal-line title-art" aria-label="YAMAMOTO × OHTANI / DATA CINEMA">
              <span>YAMAMOTO × OHTANI</span>
              <span>DATA CINEMA</span>
            </h1>
            <p className="intro-sub">Data Engine / Motion System / WebGL Distortion</p>
            <div className="intro-actions">
              <button className="intro-enter magnetic" onClick={openIntro} type="button">PLAY OPENING</button>
              <button className="intro-skip magnetic" onClick={skipIntro} type="button">SKIP</button>
            </div>
          </div>
        </div>
      )}

      {showCredits && (
        <div className="credit-overlay" onClick={() => setShowCredits(false)}>
          <div className="credit-panel">
            <p>CYBER ATHLETIC VISUAL STORY</p>
            <p>DATA: Y. YAMAMOTO + S. OHTANI STATCAST</p>
            <p>CHARTS: PITCHING / BATTING FULL STACK</p>
            <p>CLICK ANYWHERE TO CLOSE</p>
          </div>
        </div>
      )}

      <main className={`story ${introDone ? 'ready' : 'locked'}`}>
        <section className="section hero" id="hero" data-section-id="hero">
          <p className="scroll-indicator">SCROLL / ARROW KEYS</p>
          <div className="hero-grid">
            <div
              className={`hero-top-kinetic ${heroHit ? 'is-hit' : ''}`}
              aria-hidden="true"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 1200;
                const y = ((e.clientY - rect.top) / rect.height) * 240;
                setHeroAimTarget({ x: Math.max(40, Math.min(1160, x)), y: Math.max(20, Math.min(220, y)) });
              }}
              onMouseLeave={() => setHeroAimTarget({ x: 430, y: 145 })}
              onClick={() => setHeroHit(true)}
            >
              <div className="hero-top-warp" />
              <svg className="hero-parabola" viewBox="0 0 1200 240" preserveAspectRatio="none">
                {heroWavePaths.map((d, idx) => (
                  <path key={idx} d={d} className={idx % 7 === 0 ? 'wave-strong' : ''} />
                ))}
                <path className="trajectory" d={`M0,190 C160,80 ${Math.round(heroAim.x * 0.62)},${Math.round(heroAim.y * 0.9)} ${Math.round(heroAim.x)},${Math.round(heroAim.y)} C620,226 760,82 930,122 C1030,146 1100,124 1200,78`} />
                <path className="trajectory alt" d={`M0,225 C190,150 ${Math.round(heroAim.x * 0.7)},${Math.round(heroAim.y * 1.16)} ${Math.round(heroAim.x + 40)},${Math.round(heroAim.y + 18)} C630,232 810,175 980,125 C1060,100 1130,90 1200,110`} />
                <circle cx={heroAim.x.toFixed(1)} cy={heroAim.y.toFixed(1)} r="6" className="hero-ball primary" />
                <circle cx={Math.min(1160, heroAim.x + 420).toFixed(1)} cy={Math.max(24, heroAim.y - 26).toFixed(1)} r="5" className="hero-ball" />
              </svg>
            </div>

            <p className="hero-kicker">STATCAST INTERACTIVE STORY</p>
            <div className="hero-micro-meta" aria-hidden="true">
              <span>CH.01 / OPENING SYSTEM</span>
              <span>COORD X: -118.2437 · Y: 34.0522</span>
              <span>GRID 60FPS · LIVE TRACKING</span>
            </div>

            <h2 className="hero-title hero-title-heavy reveal-line"><span>YOSHINOBU</span></h2>
            <h2 className="hero-title hero-title-light hero-title-offset reveal-line"><span>YAMAMOTO</span></h2>

            <div className="hero-divider-band" aria-hidden="true">
              <span />
              <span />
            </div>

            <p className="hero-animated-line" aria-label={heroGlyphText}>
              {heroGlyphMotion.map((g, i) => (
                <span
                  key={`${g.char}-${i}`}
                  className={`glyph-switch ${g.dir}`}
                  style={{
                    animationDelay: `${g.delay}s`,
                    ['--glyph-dur' as string]: `${g.dur}s`
                  }}
                  data-char={g.char}
                  data-char2={g.char}
                />
              ))}
            </p>

            <div className="hero-red-strip" aria-hidden="true">
              <div className="hero-red-strip-thin">
                <div className="hero-red-strip-thin-inner">
                  <span>{thinStripText}</span><span>{thinStripText}</span><span>{thinStripText}</span>
                </div>
              </div>
              <div className="hero-red-strip-main">
                <div className="hero-red-strip-inner">
                  <span>{mainStripText}</span><span>{mainStripText}</span><span>{mainStripText}</span>
                </div>
              </div>
            </div>

            <div className="field-origin field-origin-inline" id="origin" data-section-id="origin" ref={fieldTunnelRef}>
              <div className="field-wall field-wall-left" aria-hidden="true" />
              <div className="field-wall field-wall-right" aria-hidden="true" />

              <div className="field-grid-wrap" aria-hidden="true">
                <svg className="field-grid" viewBox="0 0 1400 700" preserveAspectRatio="none">
                  {Array.from({ length: 14 }).map((_, i) => {
                    const x = 60 + i * 98;
                    return <line key={`v-${i}`} x1={x} y1="120" x2={x} y2="700" />;
                  })}
                  {Array.from({ length: 9 }).map((_, i) => {
                    const y = 150 + i * 72;
                    const bend = i * 18;
                    return <path key={`h-${i}`} d={`M0 ${y} Q700 ${y - bend} 1400 ${y}`} />;
                  })}
                  <path className="roof" d="M0 110 Q700 0 1400 110" />
                  <path className="roof" d="M0 190 Q700 60 1400 190" />
                  <path className="foul" d="M700 430 L180 660" />
                  <path className="foul" d="M700 430 L1220 660" />
                  <path className="infield-arc" d="M500 540 Q700 420 900 540" />
                  <path className="diamond" d="M700 430 L772 500 L700 570 L628 500 Z" />
                  <circle className="base" cx="700" cy="570" r="7" />
                  <circle className="base" cx="628" cy="500" r="6" />
                  <circle className="base" cx="772" cy="500" r="6" />
                  <circle className="mound" cx="700" cy="500" r="10" />
                </svg>
              </div>

              <article className="field-copy reveal-up">
                <p className="field-kicker">BASEBALL / ORIGIN NOTE</p>
                <h3>棒球是空间几何与瞬时决策的运动</h3>
                <p>
                  从投手丘到本垒板，球路在不到半秒内完成位移。投手用速度、转速与位移控制空间，打者在极短时间完成识别与挥棒，这是棒球最核心的对抗结构。
                </p>
                <p>
                  本站将这套对抗拆解为可视化语言：轨迹、落点、击球初速、仰角与结果事件。你将从“视觉透视”走进“数据透视”，理解每一次投打背后的逻辑。
                </p>
              </article>
            </div>

          </div>
        </section>

        <section className="section metric-atlas" id="atlas" data-section-id="atlas">
          <div className="atlas-shell">
            <div className="atlas-wall atlas-wall-left" aria-hidden="true" />
            <div className="atlas-wall atlas-wall-right" aria-hidden="true" />

            <div className="atlas-grid" aria-hidden="true">
              {Array.from({ length: 10 }).map((_, i) => <span key={`v-${i}`} className="atlas-v" style={{ left: `${i * 10}%` }} />)}
              {Array.from({ length: 8 }).map((_, i) => <span key={`h-${i}`} className="atlas-h" style={{ top: `${i * 13}%` }} />)}
            </div>

            <div className="atlas-board">
              <div className="atlas-board-title reveal-up">
                <span className="atlas-board-kicker">COLLAGE BOARD</span>
                <h2>Atlas / Signal Notes</h2>
              </div>

              {metricGroups.map((group, gi) => (
                <article
                  key={group.title}
                  className={`atlas-card atlas-card-${gi + 1} reveal-up ${gi % 2 === 0 ? 'is-dark' : ''}`}
                  style={{
                    transform: `translate3d(${gi % 2 === 0 ? -10 : 14}px, ${gi === 0 ? 0 : gi === 1 ? 18 : gi === 2 ? -12 : gi === 3 ? 10 : -6}px, 0) rotate(${gi === 0 ? -2.4 : gi === 1 ? 1.6 : gi === 2 ? -1.2 : gi === 3 ? 2.2 : -0.8}deg)`,
                    zIndex: 5 - gi,
                  }}
                >
                  <span className="atlas-pin atlas-pin-a" aria-hidden="true" />
                  <span className="atlas-pin atlas-pin-b" aria-hidden="true" />
                  <span className="atlas-clip" aria-hidden="true" />
                  <header>
                    <div>
                      <p className="atlas-label">{group.title}</p>
                      <p className="atlas-summary">{group.summary}</p>
                    </div>
                    <span className="atlas-star" aria-hidden="true">✦</span>
                  </header>
                  <ul>
                    {group.lines.map((line, li) => {
                      const seed = gi * 17 + li * 13;
                      const dir = seed % 2 === 0 ? 1 : -1;
                      const revealX = 110 + (seed % 5) * 28;
                      const revealY = seed % 3 === 0 ? 0 : 14 + (seed % 4) * 6;

                      return (
                        <li
                          key={line.k}
                          className={`atlas-line atlas-line-${(li % 4) + 1}`}
                          data-dir={dir}
                          data-reveal-x={`${revealX}px`}
                          data-reveal-y={`${revealY}px`}
                        >
                          <div className="atlas-line-mask">
                            <span className="atlas-line-key">{line.k}</span>
                            <span className="atlas-line-desc">{line.d}</span>
                            {line.note && <span className="atlas-line-note">{line.note}</span>}
                          </div>
                          <i className="black-slab" aria-hidden="true" />
                          <i className="pv-streak pv-streak-a" aria-hidden="true" />
                          <i className="pv-streak pv-streak-b" aria-hidden="true" />
                          <i className="pv-streak pv-streak-c" aria-hidden="true" />
                        </li>
                      );
                    })}
                  </ul>
                  <div className="atlas-bubbles" aria-hidden="true">
                    <span>BB</span>
                    <span>EV</span>
                    <span>LA</span>
                    <span>K</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section horizontal" id="fragments" data-section-id="fragments">
          <div className="fragments-wall">
            <div className="fragments-heading reveal-up">
              <span className="fragments-kicker">FRAGMENTS WALL</span>
              <h2>Big Type / Notes / Pins</h2>

            </div>

            <div className="fragments-poster-grid">
              <div className="fragments-hero-card reveal-up" aria-hidden="true">
                <div className="fragments-hero-number">04</div>
                <div className="fragments-hero-copy">
                  <span>POSTER</span>
                  <strong>WALL</strong>
                </div>
                <div className="fragments-hero-ribbon">PINNED / SHIFTED / LAYERED</div>
              </div>

              {fragments.map((f, idx) => (
                <article
                  key={f.id}
                  className={`fragment-card magnetic reveal-up fragment-card-${idx + 1}`}
                  data-magnetic-strength="0.28"
                  style={{
                    transform: `translate3d(${idx % 2 === 0 ? -6 : 10}px, ${idx % 3 === 0 ? 0 : idx % 3 === 1 ? 16 : -10}px, 0) rotate(${idx === 0 ? -2.2 : idx === 1 ? 1.4 : idx === 2 ? -1.5 : 2.6}deg)`,
                    zIndex: 8 - idx,
                  }}
                >
                  <span className="fragment-pin fragment-pin-a" aria-hidden="true" />
                  <span className="fragment-pin fragment-pin-b" aria-hidden="true" />
                  <span className="fragment-ticket" aria-hidden="true">{f.id}</span>
                  <p className="fragment-id">{f.id}</p>
                  <h3>{f.title}</h3>
                  <p className="fragment-metric">{f.metric}</p>
                  <p className="fragment-desc">{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section transition" id="transition" data-section-id="transition">
          <div className="transition-gallery-hero reveal-up">
            <div className="transition-copy-hero">
              <p className="chart-shell-eyebrow">BASEBALL TRANSITION GALLERY</p>
              <div className="transition-title-stack" aria-label="BASEBALL">
                <span className="transition-title-ghost">BASEBALL</span>
                <span className="transition-title-main">BASEBALL</span>
                <span className="transition-title-ghost transition-title-ghost-b">BASEBALL</span>
              </div>
              <div className="transition-copy-mixed">
                <span className="transition-copy-vert">
                  <b>章</b>
                  <b>节</b>
                  <b>导</b>
                  <b>入</b>
                </span>
                <p className="transition-lead">从早期到成名、从巅峰到双刀流</p>
              </div>
              <div className="transition-sequence">
                <span>EARLY</span>
                <span>RISE</span>
                <span>CHAMPION</span>
                <span>DUAL-THREAT</span>
              </div>
            </div>
            <div className="transition-stage-hero">
              <div className="transition-stage-ribbon">
                <span>ENTER MACRO DATA CANVAS</span>
              </div>
              <InfiniteGallery
                images={galleryImages}
                speed={0.82}
                visibleCount={8}
                className="transition-canvas-hero"
              />
              <div className="transition-overlay-label">
                <span className="transition-overlay-kicker">BASEBALL</span>
                <strong>LEGACY · MOTION · IMPACT</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="section macro" id="macro" data-section-id="macro">
          <div className="macro-head macro-head-rich">
            <div className="macro-kicker-block reveal-up">
              <p className="micro-label">MACRO DATA CANVAS</p>
              <div className="macro-title-mixed" aria-label="FORCE. CONTROL. IMPACT.">
                <span className="macro-title-vert">
                  <b>F</b>
                  <b>O</b>
                  <b>R</b>
                  <b>C</b>
                  <b>E</b>
                </span>
                <h3 className="macro-title reveal-line"><span>CONTROL. IMPACT.</span></h3>
              </div>
            </div>
            <div className="macro-intro-copy reveal-up">
              <p>将投球拆解为速度、旋转、位移与进垒路径四层结构，用统一的赛博叙事面板读取“压制力”与“可击性”的变化。</p>
              <div className="macro-intro-tags">
                <span>Statcast 语境</span>
                <span>Savant 结构</span>
                <span>赛季对照</span>
                <span>3D 视窗</span>
              </div>
            </div>
          </div>

          <div className="macro-story-grid">
            <article className="macro-chart-panel reveal-up macro-stage-left">
              <div className="macro-chart-head">
                <div>
                  <p className="chart-shell-eyebrow">BASEBALL SAVANT / PITCH 3D</p>
                  <h4>Pitch 3D Reference Window</h4>
                </div>
                <a className="macro-source-link" href="https://baseballsavant.mlb.com/visuals/pitch3d?player_id=808967#v=1&mainView=tracking&pov=umpire&g1=823965&g2=746175&hitterSide=all&marks=none&plays1=all&plays2=all&pitchColors=pitch_type&dualActive=false&summaryViewActive=false&chartYear=2026&summaryYear=2026" target="_blank" rel="noreferrer">Open Savant ↗</a>
              </div>

              <div className="macro-stage macro-stage-embed">
                <div className="macro-stage-overlay" />
                <div className="macro-stage-embed-frame macro-stage-iframe-frame">
                  <div className="macro-embed-topbar">
                    <span>3D VIEW / 2026</span>
                    <strong>Yoshinobu Yamamoto</strong>
                  </div>
                  <iframe
                    className="macro-embed-iframe"
                    src="https://baseballsavant.mlb.com/visuals/pitch3d?player_id=808967#v=1&mainView=tracking&pov=umpire&g1=823965&g2=746175&hitterSide=all&marks=none&plays1=all&plays2=all&pitchColors=pitch_type&dualActive=false&summaryViewActive=false&chartYear=2026&summaryYear=2026"
                    title="Baseball Savant Pitch 3D"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="macro-stage-mini-grid">
                  <div className="macro-stage-mini-card">
                    <span>YEAR</span>
                    <strong>{selectedYear}</strong>
                  </div>
                  <div className="macro-stage-mini-card">
                    <span>AVG VELO</span>
                    <strong>{teamYearSummary ? `${teamYearSummary.avgVelo.toFixed(1)} MPH` : '—'}</strong>
                  </div>
                  <div className="macro-stage-mini-card">
                    <span>TOP PITCH</span>
                    <strong>{localShortName(teamYearSummary?.topPitch ?? 'Unknown')}</strong>
                  </div>
                </div>
                <div className="macro-axis-label axis-top-left">WHIFF</div>
                <div className="macro-axis-label axis-top-right">LOCATE</div>
                <div className="macro-axis-label axis-bottom-left">SPREAD</div>
                <div className="macro-axis-label axis-bottom-right">RPM</div>
              </div>

              <div className="macro-signal-strip">
                <div className="macro-signal-strip-item">
                  <span>Pitcher</span>
                  <strong>{localShortName(selectedPitcher)}</strong>
                </div>
                <div className="macro-signal-strip-item">
                  <span>Sample</span>
                  <strong>{pitchYearSummary?.rows.length ?? 0}</strong>
                </div>
                <div className="macro-signal-strip-item">
                  <span>Velo</span>
                  <strong>{maxMph} MPH</strong>
                </div>
                <div className="macro-signal-strip-item">
                  <span>Shape</span>
                  <strong>{pitchYearSummary?.topPitch ?? 'Unknown'}</strong>
                </div>
              </div>

              <div className="macro-interpretation macro-interpretation-tight">
                <div>
                  <span>官方说明</span>
                  <strong>页面采用 Pitch 3D 嵌入窗作为主视觉，右侧图表承担补充叙事</strong>
                </div>
                <p>
                  该视窗用于展示山本由伸在不同球种上的球路分离、垂直位移与出手结构；切换年份时，右侧辅助图表会同步更新，构成完整的赛季阅读路径。
                </p>
              </div>
            </article>

            <article className="macro-summary-panel reveal-up macro-visual-stack">
              <div className="macro-summary-head">
                <div>
                  <p className="chart-shell-eyebrow">BATTING / PITCHING SUMMARY</p>
                  <h4>Player Signal Card</h4>
                </div>
                <div className="macro-summary-year">{selectedYear}</div>
              </div>

              <div className="macro-topbar">
                <div className="macro-topbar-item">
                  <span>AVG EV</span>
                  <strong>{teamYearSummary ? `${teamYearSummary.avgEV.toFixed(1)} MPH` : '—'}</strong>
                </div>
                <div className="macro-topbar-item">
                  <span>TOP PITCH</span>
                  <strong>{localShortName(teamYearSummary?.topPitch ?? 'Unknown')}</strong>
                </div>
                <div className="macro-topbar-item">
                  <span>BATTERS</span>
                  <strong>{batYearSummary?.count ?? 0}</strong>
                </div>
                <div className="macro-topbar-item">
                  <span>PITCHES</span>
                  <strong>{pitchYearSummary?.rows.length ?? 0}</strong>
                </div>
              </div>

              <div className="macro-signal-grid">
                <div className="macro-signal-card batter">
                  <div className="macro-signal-head">
                    <span>BATTER</span>
                    <strong>{localShortName(selectedBatter)}</strong>
                  </div>
                  {selectedBatterRow ? (
                    <>
                      <div className="macro-signal-stats">
                        <div><em>wOBA</em><strong>{selectedBatterRow.woba.toFixed(3).replace(/^0/, '.')}</strong></div>
                        <div><em>AVG EV</em><strong>{selectedBatterRow.launch_speed.toFixed(1)}</strong></div>
                        <div><em>HR</em><strong>{selectedBatterRow.hrs}</strong></div>
                      </div>
                      <p className="macro-signal-copy">高质量接触与长打产出同时在线，击球质量维持在高位，具备稳定制造额外垒打的能力。</p>
                    </>
                  ) : (
                    <p className="macro-signal-copy">当前没有足够打者数据。</p>
                  )}
                </div>

                <div className="macro-signal-card pitcher">
                  <div className="macro-signal-head">
                    <span>PITCHER</span>
                    <strong>{localShortName(selectedPitcher)}</strong>
                  </div>
                  {selectedPitcherRow ? (
                    <>
                      <div className="macro-signal-stats">
                        <div><em>K%</em><strong>{selectedPitcherRow.k_percent.toFixed(1)}%</strong></div>
                        <div><em>Velo</em><strong>{selectedPitcherRow.velocity.toFixed(1)}</strong></div>
                        <div><em>xERA</em><strong>{selectedPitcherRow.xba?.toFixed(2) ?? '—'}</strong></div>
                      </div>
                      <p className="macro-signal-copy">以球速与球路分离驱动挥空，同时控制四坏与甜区接触，形成更接近 MLB 官方面板的高压投球轮廓。</p>
                    </>
                  ) : (
                    <p className="macro-signal-copy">当前没有足够投手数据。</p>
                  )}
                </div>
              </div>

              <div className="macro-interpretation">
                <div>
                  <span>官方解读</span>
                  <strong>Split-Finger 是该年最具识别度的主球种</strong>
                </div>
                <p>在 2026 年，样本均速 90.4 MPH，配合 24.2 MPH 的平均击球速度和 26 次硬击球，构成当前赛季最明确的攻防信号。</p>
              </div>
            </article>
          </div>
          <div className="macro-visual-panel-grid">
            <article className="macro-poster-card reveal-up">
              <div className="poster-main">
                <img src={encodeURI('./数据图 (3).svg')} alt="Statcast Batting Statistics" className="macro-visual-image" />
              </div>
              <div className="poster-annotation-bar">
                <span>主图</span>
                <strong>2024–2026 Batting Overview</strong>
                <p>击球质量、结果分布与赛季趋势统一阅读。</p>
              </div>
              <aside className="poster-sidebar">
                <p className="chart-shell-eyebrow">BATTED BALL PROFILE</p>
                <h4>Contact Distribution</h4>
                <p>将接触类型拆成清晰的边栏注释，强调结构而非装饰。</p>
              </aside>
            </article>
            <article className="macro-poster-card reveal-up">
              <div className="poster-main">
                <img src={encodeURI('./数据图 (2).svg')} alt="Batted Ball Profile" className="macro-visual-image" />
              </div>
              <div className="poster-annotation-bar">
                <span>主图</span>
                <strong>Hit Location / Outcome</strong>
                <p>通过注释条把数据解释锁定在版式中轴。</p>
              </div>
              <aside className="poster-sidebar">
                <p className="chart-shell-eyebrow">STATCAST BATTING STATISTICS</p>
                <h4>Side Note</h4>
                <p>边栏负责补充说明、年份提示与图表阅读路径。</p>
              </aside>
            </article>
          </div>

          <div className="macro-card-grid macro-card-grid-spread">
            <article className="macro-note-card reveal-up span-wide">
              <div className="spread-card-head">
                <div className="spread-card-index">01</div>
                <div>
                  <p className="chart-shell-eyebrow">BATTING STATCAST</p>
                  <h4>击球结果不是单一数值，而是输出曲线</h4>
                </div>
              </div>
              <p>把每个赛季的 wOBA、xSLG、平均击球初速与硬击球率放在一起看，才能看到大谷的击球质量是如何逐年抬升的。</p>
            </article>
            <article className="macro-note-card reveal-up poster-sidebar-card">
              <p className="chart-shell-eyebrow">BATTED BALL PROFILE</p>
              <h4>接触类型决定攻势形状</h4>
              <p>飞球、滚地球、拉打与反向球的比例变化，直接影响长打分布；这部分会用更接近官方的统计结构去讲故事。</p>
            </article>
            <article className="macro-note-card reveal-up poster-sidebar-card">
              <p className="chart-shell-eyebrow">MOVEMENT / SPIN AXIS</p>
              <h4>投球图表以嵌入式方式阅读</h4>
              <p>右侧图表区域承担补充说明，让图形、文字和卡片彼此对齐，像一个完整的 Savant 仪表板。</p>
            </article>
          </div>
        </section>

        <section className="section heroes" id="heroes" data-section-id="heroes">
          <div className="hero-gallery-stack hero-gallery-stack-lifted">
            <div className="hero-dual-gallery hero-dual-gallery-dynamic">
              <div className="hero-dual-switches" role="tablist" aria-label="切换选手">
                <button className={`switch-btn frosted magnetic ${heroPlayer === 'ohtani' ? 'active' : ''}`} type="button" onClick={() => setHeroPlayer('ohtani')}>
                  <span>OHTANI</span>
                  <em>左图主视图</em>
                </button>
                <button className={`switch-btn frosted magnetic ${heroPlayer === 'yamamoto' ? 'active' : ''}`} type="button" onClick={() => setHeroPlayer('yamamoto')}>
                  <span>YAMAMOTO</span>
                  <em>右图主视图</em>
                </button>
              </div>
              <div className="hero-dual-strip">
                <div className={`hero-year-transition ${yearTransitionClass}`} aria-hidden="true">
                  <div className="hero-year-transition-ring" />
                  <div className="hero-year-transition-scan" />
                  <div className="hero-year-transition-glow" />
                  <div className="hero-year-transition-label">
                    <span>YEAR SHIFT</span>
                    <strong>{yearTransitionLabel}</strong>
                  </div>
                </div>
                <div className={`hero-photo-panel left ${heroPlayer === 'ohtani' ? 'active' : ''}`}>
                  <div className="hero-photo-media">
                    <img
                      src={encodeURI('./选手底图 (1).jpg')}
                      alt="Ohtani"
                    />
                  </div>
                </div>
                <div className={`hero-photo-panel right ${heroPlayer === 'yamamoto' ? 'active' : ''}`}>
                  <div className="hero-photo-media">
                    <img
                      src={encodeURI('./选手底图 (2).jpg')}
                      alt="Yamamoto"
                    />
                  </div>
                </div>
                {heroFragmentLayout.map((frag, idx) => (
                  <span
                    key={`${frag.text}-${idx}`}
                    className={`hero-fragment hero-fragment-${idx + 1} ${frag.side} ${frag.player === heroPlayer ? 'active' : 'muted'}`}
                    style={{
                      left: frag.left,
                      top: frag.top,
                      width: frag.width,
                      maxWidth: frag.maxWidth,
                      opacity: frag.opacity,
                      transform: `translate3d(0, ${Math.sin((idx + 1) * 1.1 + heroAim.y * 0.01) * 8}px, 0) rotate(${frag.rot}deg) scale(${frag.scale})`,
                      filter: `blur(${frag.blur}px)`,
                      zIndex: frag.zIndex
                    }}
                  >
                    {frag.text}
                  </span>
                ))}
              </div>

              <div className="hero-story-panel">
                <div className="hero-story-head">
                  <div className="hero-story-head-block">
                    <p className="micro-label">{heroPlayer === 'ohtani' ? 'OHTANI / BATTER' : 'YAMAMOTO / PITCHER'}</p>
                    <div className="hero-story-head-mixed" aria-label={heroPlayer === 'ohtani' ? 'BATTING WIDE EXPANSION' : 'PITCHER REVEAL THE STORY'}>
                      <span className="hero-story-head-vert">
                        <span>{heroPlayer === 'ohtani' ? 'B' : 'P'}</span>
                        <span>{heroPlayer === 'ohtani' ? 'A' : 'I'}</span>
                        <span>{heroPlayer === 'ohtani' ? 'T' : 'T'}</span>
                        <span>{heroPlayer === 'ohtani' ? 'T' : 'C'}</span>
                        <span>{heroPlayer === 'ohtani' ? 'I' : 'H'}</span>
                        <span>{heroPlayer === 'ohtani' ? 'N' : 'E'}</span>
                        <span>{heroPlayer === 'ohtani' ? 'G' : 'R'}</span>
                      </span>
                      <h3>{heroPlayer === 'ohtani' ? 'WIDE EXPANSION' : 'REVEAL THE STORY'}</h3>
                    </div>
                  </div>
                </div>

                <div className="hero-story-media-shell">
                  <div className="hero-story-portrait">
                    <img src={batterActionShots[heroPlayer]} alt={heroPlayer === 'ohtani' ? 'Shohei Ohtani action shot' : 'Yoshinobu Yamamoto action shot'} loading="lazy" />
                    <div className="hero-story-portrait-overlay" />
                  </div>
                </div>

                <div className="hero-story-year-rail" aria-label="年份切换">
                  {yearOptions.map((y) => (
                    <button key={y.value} type="button" className={`hero-year-pill ${selectedYear === y.value ? 'active' : ''}`} onClick={() => setSelectedYear(y.value)}>
                      <span>{y.label}</span>
                      <em>{y.value}</em>
                    </button>
                  ))}
                </div>

                <div className="hero-story-metrics hero-story-metrics-savant">
                  {(heroPlayer === 'ohtani'
                    ? [
                        { label: 'xwOBA', value: '.414', pct: 94, band: 'great' },
                        { label: 'Avg EV', value: '94.0', pct: 95, band: 'great' },
                        { label: 'Barrel%', value: '23.9%', pct: 98, band: 'great' },
                        { label: 'BB%', value: '17.1%', pct: 92, band: 'great' }
                      ]
                    : [
                        { label: 'Pitch Velo', value: '95.5', pct: 67, band: 'average' },
                        { label: 'xERA', value: '3.53', pct: 64, band: 'average' },
                        { label: 'Whiff%', value: '30.9%', pct: 76, band: 'great' },
                        { label: 'K%', value: '22.1%', pct: 48, band: 'poor' }
                      ]).map((item) => (
                    <div key={item.label} className="hero-mini-card savant-row">
                      <div className="savant-row-head">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                      <div className="savant-band-track">
                        <i className="savant-band poor" />
                        <i className="savant-band average" />
                        <i className="savant-band great" />
                        <b className={`savant-band-marker ${item.band}`} style={{ left: `${item.pct}%` }}>
                          <em>{item.pct}</em>
                        </b>
                      </div>
                      <div className="savant-band-labels">
                        <span>POOR</span>
                        <span>AVERAGE</span>
                        <span>GREAT</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hero-story-chart-grid hero-story-chart-grid-batter">
                  <div className={`hero-story-chart hero-story-chart-main ${heroPlayer === 'ohtani' ? 'active' : ''}`}>
                    {heroPlayer === 'ohtani' ? (
                      <div className="chart-shell savant-panel">
                        <div className="chart-shell-head">
                          <div>
                            <p className="chart-shell-eyebrow">{selectedYear} HITS SPRAY CHART</p>
                            <h4>{selectedYear} Hits Spray Chart</h4>
                          </div>
                          <div className="chart-toggle-row">
                            {[
                              ['singles', 'SINGLE'],
                              ['doubles', 'DOUBLE'],
                              ['triples', 'TRIPLE'],
                              ['homeRuns', 'HOME RUN']
                            ].map(([key, label]) => (
                              <button key={key} type="button" className={`toggle-chip ${sprayLayer[key as keyof typeof sprayLayer] ? 'active' : ''}`} onClick={() => setSprayLayer((prev) => ({ ...prev, [key]: !prev[key as keyof typeof sprayLayer] }))}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <SprayChart points={sprayData} year={sprayYear} layer={sprayLayer} />
                      </div>
                    ) : (
                      <div className="chart-shell savant-panel">
                        <div className="chart-shell-head">
                          <div>
                            <p className="chart-shell-eyebrow">{selectedYear} MLB PERCENTILE RANKINGS</p>
                            <h4>{selectedYear} MLB Percentile Rankings</h4>
                          </div>
                        </div>
                        <div className="percentile-rail">
                          {percentileRows.map((row) => (
                            <div key={row.label} className="percentile-row">
                              <div className="percentile-label">{row.label}</div>
                              <div className="percentile-track">
                                <span className={`percentile-fill ${row.color}`} style={{ width: `${row.value}%` }} />
                                <b className={`percentile-marker ${row.color}`} style={{ left: `${row.value}%` }}>{row.value}</b>
                              </div>
                              <div className="percentile-value">{row.metric}</div>
                            </div>
                            ))}
                          </div>

                        <div className="yamamoto-rankings-card" key={`yamamoto-rankings-${selectedYear}`}>
                          <div className="yamamoto-rankings-top-scale">
                            <span>POOR</span>
                            <span>AVERAGE</span>
                            <span>GREAT</span>
                          </div>

                          <div className="yamamoto-group" key={`yamamoto-value-${selectedYear}`}>
                            <div className="yamamoto-group-title">
                              <img src={encodeURI('./MLB官方数据可视化/slider-trophy.png')} alt="value" />
                              <span>Value</span>
                            </div>
                            {yamamotoPercentileGroups.valueRows.map((row, idx) => (
                              <div key={row.key} className="yamamoto-rank-row value" style={{ ['--row-delay' as any]: `${idx * 40}ms` }}>
                                <div className="yamamoto-rank-label">{row.label}</div>
                                <div className="yamamoto-rank-track">
                                  <i style={{ width: `${row.pct}%` }} className={`fill ${row.lowIsBetter ? 'low' : 'high'}`} />
                                  <b style={{ left: `${row.pct}%` }}>{row.pct}</b>
                                </div>
                                <div className="yamamoto-rank-value">{row.display}</div>
                              </div>
                            ))}
                          </div>

                          <div className="yamamoto-group">
                            <div className="yamamoto-group-title">
                              <img src={encodeURI('./MLB官方数据可视化/slider-pitcher.png')} alt="pitching" />
                              <span>Pitching</span>
                            </div>
                            {yamamotoPercentileGroups.pitchingRows.map((row, idx) => (
                              <div key={row.key} className="yamamoto-rank-row" style={{ ['--row-delay' as any]: `${idx * 32 + 60}ms` }}>
                                <div className="yamamoto-rank-label">{row.label}</div>
                                <div className="yamamoto-rank-track">
                                  <i style={{ width: `${row.pct}%` }} className={`fill ${row.lowIsBetter ? 'low' : 'high'}`} />
                                  <b style={{ left: `${row.pct}%` }}>{row.pct}</b>
                                </div>
                                <div className="yamamoto-rank-value">{row.display}</div>
                              </div>
                            ))}
                          </div>

                          <div className="yamamoto-group">
                            <div className="yamamoto-group-title">
                              <img src={encodeURI('./MLB官方数据可视化/slider-fielder.png')} alt="fielding" />
                              <span>Fielding</span>
                            </div>
                          </div>

                          <div className="yamamoto-group">
                            <div className="yamamoto-group-title">
                              <img src={encodeURI('./MLB官方数据可视化/slider-runner.png')} alt="running" />
                              <span>Running</span>
                            </div>
                            {yamamotoPercentileGroups.runningRows.map((row, idx) => (
                              <div key={row.key} className="yamamoto-rank-row" style={{ ['--row-delay' as any]: `${idx * 45 + 120}ms` }}>
                                <div className="yamamoto-rank-label">{row.label}</div>
                                <div className="yamamoto-rank-track">
                                  <i style={{ width: `${row.pct}%` }} className={`fill ${row.lowIsBetter ? 'low' : 'high'}`} />
                                  <b style={{ left: `${row.pct}%` }}>{row.pct}</b>
                                </div>
                                <div className="yamamoto-rank-value">{row.display}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {heroPlayer === 'ohtani' ? (
                    <div className={`hero-story-chart hero-story-chart-side active year-fade-${yearTransition?.active ? (yearTransition.direction > 0 ? 'forward' : 'backward') : 'steady'}`}>
                      <div className="rolling-compare-grid">
                        <div className="chart-shell savant-panel">
                          <div className="chart-shell-head">
                            <div>
                              <p className="chart-shell-eyebrow">100 PAs ROLLING XWOBA · OHTANI</p>
                              <h4>100 PAs Rolling xwOBA (Shohei Ohtani)</h4>
                            </div>
                          </div>
                          <div className="rolling-chart-shell">
                            <RollingXwobaChart points={rollingSeries} year={selectedYear} />
                            <div className="rolling-metrics">
                              <div><span>rolling xwOBA</span><strong>{rollingHeadline}</strong></div>
                              <div><span>window</span><strong>100 PA</strong></div>
                              <div><span>spray hits</span><strong>{sprayData.length}</strong></div>
                              <div><span>samples</span><strong>{rollingSeries.length}</strong></div>
                            </div>
                          </div>
                        </div>

                        <div className="chart-shell savant-panel">
                          <div className="chart-shell-head">
                            <div>
                              <p className="chart-shell-eyebrow">DODGERS BATTING SUMMARY · TEAM CSV</p>
                              <h4>Dodgers Batters Summary</h4>
                            </div>
                          </div>
                          <div className="dodgers-summary-panel">
                            <div className="dodgers-summary-grid">
                              <div className="dodgers-summary-card"><span>wOBA</span><strong>{dodgersSummary.avgWoba.toFixed(3).replace(/^0/, '.')}</strong></div>
                              <div className="dodgers-summary-card"><span>PA</span><strong>{dodgersSummary.totalPa}</strong></div>
                              <div className="dodgers-summary-card"><span>HR</span><strong>{dodgersSummary.totalHr}</strong></div>
                              <div className="dodgers-summary-card"><span>HardHit%</span><strong>{dodgersSummary.avgHardHit.toFixed(1)}%</strong></div>
                              <div className="dodgers-summary-card"><span>Barrels/PA%</span><strong>{dodgersSummary.avgBarrels.toFixed(1)}%</strong></div>
                              <div className="dodgers-summary-card"><span>Avg EV</span><strong>{dodgersSummary.avgEV.toFixed(1)}</strong></div>
                            </div>
                            <div className="dodgers-summary-leaders">
                              <div className="dodgers-summary-title">Top wOBA hitters</div>
                              {dodgersSummary.leaders.map((row) => (
                                <div key={row.player_id} className="dodgers-summary-leader-row">
                                  <span>{localShortName(row.player_name)}</span>
                                  <strong>{row.woba.toFixed(3).replace(/^0/, '.')}</strong>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div key={`movement-${selectedYear}`} className={`hero-story-chart hero-story-chart-side active year-fade-${yearTransition?.active ? (yearTransition.direction > 0 ? 'forward' : 'backward') : 'steady'}`}>
                        <div className="chart-shell savant-panel movement-profile-panel">
                          <div className="chart-shell-head">
                            <div>
                              <p className="chart-shell-eyebrow">{selectedYear} MOVEMENT PROFILE (INDUCED BREAK)</p>
                              <h4>{selectedYear} Movement Profile (Induced Break)</h4>
                            </div>
                          </div>
                          <div className="movement-profile-shell-rebuild">
                            <div className="movement-top-guide">
                              <span>1B</span>
                              <span>MOVES TOWARD</span>
                              <span>3B</span>
                            </div>

                            <div className="movement-scatter-wrap">
                              <svg viewBox="0 0 420 520" className="movement-scatter-svg" aria-label="Movement Profile (Induced Break)">
                                <defs>
                                  <pattern id="movement-hatch-avg" patternUnits="userSpaceOnUse" width="6" height="6">
                                    <rect width="6" height="6" fill="rgb(104, 146, 162)" opacity="0.1" />
                                    <path d="M -3, 3 L 3, -3 M 0, 6 L 6, 0 M 3, 9 L 9, 3" className="movement-hatch-line" />
                                  </pattern>
                                  <radialGradient id="movement-glow-soft" cx="50%" cy="50%" r="60%">
                                    <stop offset="0%" stopColor="rgba(66, 232, 255, 0.18)" />
                                    <stop offset="70%" stopColor="rgba(66, 232, 255, 0.08)" />
                                    <stop offset="100%" stopColor="rgba(66, 232, 255, 0)" />
                                  </radialGradient>
                                </defs>

                                <circle cx="200" cy="238" r="180" fill="url(#movement-glow-soft)" opacity="0.75" />
                                <circle cx="200" cy="238" r="180" className="mov-ring-bg" />
                                <circle cx="200" cy="238" r="174" className="mov-ring" />
                                <circle cx="200" cy="238" r="142" className="mov-ring mov-ring-dashed" />
                                <circle cx="200" cy="238" r="104" className="mov-ring" />
                                <circle cx="200" cy="238" r="72" className="mov-ring mov-ring-dashed inner" />
                                <circle cx="200" cy="238" r="38" className="mov-ring mov-ring-dashed inner" />

                                <line x1="200" y1="46" x2="200" y2="470" className="mov-axis" />
                                <line x1="20" y1="238" x2="380" y2="238" className="mov-axis" />

                                <text x="200" y="84" className="mov-axis-label">24&quot;</text>
                                <text x="200" y="132" className="mov-axis-label">12&quot;</text>
                                <text x="115" y="238" className="mov-axis-label">12&quot;</text>
                                <text x="74" y="238" className="mov-axis-label">18&quot;</text>
                                <text x="44" y="238" className="mov-axis-label">24&quot;</text>
                                <text x="200" y="322" className="mov-axis-label">12&quot;</text>
                                <text x="200" y="398" className="mov-axis-label">24&quot;</text>
                                <text x="334" y="238" className="mov-axis-label">24&quot;</text>

                                <g transform="translate(366, 56)">
                                  <circle transform="translate(0, -24)" r="12" fill="url(#movement-hatch-avg)" />
                                  <text className="mov-avg-label" textAnchor="middle">MLB AVG.</text>
                                </g>

                                {movementPitchMeta.points.map((pt, idx) => {
                                  const cx = 200 + pt.x * 6.85;
                                  const cy = 238 - pt.y * 6.85;
                                  return (
                                    <circle
                                      key={`${pt.type}-${idx}`}
                                      cx={cx}
                                      cy={cy}
                                      r="6.9"
                                      className="mov-dot"
                                      fill={pt.color}
                                      style={{ animationDelay: `${(idx % 60) * 12}ms` }}
                                    />
                                  );
                                })}

                                <g transform="translate(326, 370) scale(1.04)">
                                  <image href={encodeURI('./MLB官方数据可视化/SavantPitchers_mid_right_back.svg')} x="-28" y="-34" width="60" height="94" preserveAspectRatio="xMidYMid meet" opacity="0.96" />
                                  <g transform={`rotate(${movementPitchMeta.pitcherLineAngle} 11 34)`}>
                                    <line x1="11" y1="34" x2="48" y2="0" className="mov-arm-guide" />
                                    <circle cx="48" cy="0" r="2.7" className="mov-arm-joint" />
                                    <circle cx="11" cy="34" r="3.1" className="mov-arm-anchor" />
                                  </g>
                                </g>
                              </svg>

                              <div className="mov-rise-drop rise">MORE RISE</div>
                              <div className="mov-rise-drop drop">MORE DROP</div>
                              <div className="mov-sample">100 PITCH SAMPLE</div>
                              <div className="mov-arm-angle"><span>ARM ANGLE</span><strong>{movementPitchMeta.armAngle}°</strong></div>
                            </div>

                            <div className="mov-usage-table">
                              <div className="mov-usage-headings">
                                <span>USAGE</span>
                                <span>MPH</span>
                                <span>RHP AVG</span>
                              </div>
                              {movementPitchMeta.usageRows.map((row) => (
                                <div key={row.type} className="mov-usage-col">
                                  <div className="mov-usage-name"><i style={{ backgroundColor: row.color }} />{row.type}</div>
                                  <div className="mov-usage-val">{row.usage}%</div>
                                  <div className="mov-usage-sub">{row.mph.toFixed(1)}</div>
                                  <div className="mov-usage-sub avg">{row.rhpAvg.toFixed(1)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="hero-side-spacer" />
                    </>
                  )}
                </div>


                <div className="hero-story-pills hero-story-pills-savant">
                  {(heroPlayer === 'ohtani' ? [
                    { k: 'ohtani rolling xwOBA', v: rollingHeadline },
                    { k: 'dodgers summary wOBA', v: dodgersSummary.avgWoba.toFixed(3).replace(/^0/, '.') },
                    { k: 'window', v: '100 PA' },
                    { k: 'ohtani samples', v: String(rollingSeries.length) },
                    { k: 'dodgers hitters', v: String(dodgersSummary.count) }
                  ] : [
                    { k: 'pitch usage', v: '6 types' },
                    { k: 'avg velo', v: '95.5' },
                    { k: 'movement', v: '3D plot' },
                    { k: 'whiff', v: '30.9%' }
                  ]).map((item) => (
                    <div key={item.k} className="hero-pill-card">
                      <span>{item.k}</span>
                      <strong>{item.v}</strong>
                    </div>
                  ))}
                </div>

                {heroPlayer === 'yamamoto' && (
                  <div className="yamamoto-story-section reveal-up">
                    <div className="yamamoto-story-section-head">
                      <div>
                        <p className="chart-shell-eyebrow">BOTTOM STORY AREA · YAMAMOTO</p>
                        <h4>山本由伸（Yoshinobu Yamamoto）</h4>
                        <p className="yamamoto-story-jp">精密制球 / 极限续航 / 大舞台爆发</p>
                      </div>
                      <div className="yamamoto-story-ribbon" aria-hidden="true">
                        <span>YOSHINOBU</span>
                        <span>YAMAMOTO</span>
                      </div>
                    </div>
                    <p className="yamamoto-bio-copy">
                      山本由伸出生于日本备前市，依靠独特的标枪生物力学训练法，打造了极其出色的投球稳定性与惊人的体能续航。他在2024年世界大赛第2战中首度登场，面对洋基队强悍的打线主投6.1局仅失1分，展现了极其强大的大舞台抗压能力。2025年对阵蓝鸟队的世界大赛则是他的终极封神之战：他不仅在第2战投出9局仅失1分的完投胜，更在最为关键的第7战中，在“零休息日”的极限状态下后援登板2.2局无失分，直接为球队锁定总冠军。凭借3场胜投、1.02的恐怖防御率以及15次三振，山本无可争议地荣膺2025年世界大赛MVP。
                    </p>
                    <div className="yamamoto-bio-grid">
                      {[
                        { label: '出身', value: '日本备前市' },
                        { label: '核心', value: '标枪式生物力学投球' },
                        { label: '荣誉', value: '2025 WS MVP' }
                      ].map((item) => (
                        <div key={item.label} className="yamamoto-bio-mini">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="yamamoto-trajectory-row" aria-hidden="true">
                      <span className="yamamoto-trajectory-dot" />
                      <span className="yamamoto-trajectory-curve" />
                      <span className="yamamoto-trajectory-dot" />
                    </div>
                  </div>
                )}

                {heroPlayer === 'ohtani' && (
                  <div className="ohtani-story-section reveal-up">
                    <div className="ohtani-story-section-head">
                      <div>
                        <p className="chart-shell-eyebrow">BOTTOM STORY AREA · OHTANI</p>
                        <h4>大谷翔平（Shohei Ohtani）</h4>
                        <p className="ohtani-story-jp">二刀流の頂点 / 进化し続ける打撃と走塁</p>
                      </div>
                      <div className="ohtani-story-ribbon" aria-hidden="true">
                        <span>SHOHEI</span>
                        <span>OHTANI</span>
                      </div>
                    </div>
                    <p className="ohtani-bio-copy">
                      大谷翔平是不断挑战棒球极限的世纪“二刀流”奇才。加盟道奇队后，他将顶级力量与速度完美结合，在2025赛季甚至达成了大联盟前无古人的“50轰50盗”伟大纪录。虽然2024年的世界大赛MVP由队友弗莱迪·弗里曼获得，大谷的作用依然不可替代。在2024年对阵洋基队的世界大赛中，尽管他在第2战不慎受伤，但他带伤出战，为球队提供了巨大的战术牵制力并助力夺冠。2025年对阵蓝鸟队的世界大赛上，大谷不仅在第2战利用敏锐的跑垒判断为球队扩大领先优势，其持续的进攻火力更是道奇队实现世界大赛二连霸的绝对精神与战术基石。
                    </p>
                    <div className="ohtani-bio-grid">
                      {ohtaniBioCards.map((item) => (
                        <div key={item.label} className="ohtani-bio-mini">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="ohtani-trajectory-row" aria-hidden="true">
                      <span className="ohtani-trajectory-bat" />
                      <span className="ohtani-trajectory-curve" />
                      <span className="ohtani-trajectory-bat" />
                    </div>
                    <div className="ohtani-particle-row" aria-hidden="true">
                      {Array.from({ length: 9 }).map((_, idx) => (
                        <span key={idx} className={`ohtani-particle p${idx + 1}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="section lab" id="lab" data-section-id="lab">
          <div className="macro-head">
            <p className="micro-label reveal-up">RESTORED VISUALIZATION STACK</p>
            <h3 className="macro-title reveal-line"><span>PITCHING × BATTING PANELS</span></h3>
            <p className="lab-sub reveal-up">Savant-style color logic · narrative reveal · integrated old+new datasets</p>
          </div>

          <div className="dashboard-grid dashboard-grid-top">
            <article className="chart-card reveal-up dashboard-hero-card">
              <h4>年份总览滑块</h4>
              <div className="panel-filter-row">
                <label htmlFor="yearSelect">年份</label>
                <select className="player-select" id="yearSelect" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                  {yearOptions.map((y) => (
                    <option key={y.value} value={y.value}>{y.label}</option>
                  ))}
                </select>
              </div>
              <div className="year-slider">
                <button type="button" className="module-btn active" onClick={() => changeYear(-1)}>上一年</button>
                <div className="year-slider-track">
                  {yearOptions.map((opt) => (
                    <button key={opt.value} type="button" className={`year-pill ${selectedYear === opt.value ? 'active' : ''}`} onClick={() => setSelectedYear(opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="module-btn active" onClick={() => changeYear(1)}>下一年</button>
              </div>
              <div className={`year-summary-grid year-transition-${yearTransition?.active ? (yearTransition.direction > 0 ? 'forward' : 'backward') : 'steady'}`} key={yearTransitionKey}>
                <div className="year-summary-chip"><span>Pitch</span><strong>{pitchYearSummary?.rows.length ?? 0}</strong><em>pitches</em></div>
                <div className="year-summary-chip"><span>Top Pitch</span><strong>{localShortName(pitchYearSummary?.topPitch ?? 'Unknown')}</strong><em>usage leader</em></div>
                <div className="year-summary-chip"><span>Avg Velo</span><strong>{(teamYearSummary?.avgVelo ?? 0).toFixed(1)}</strong><em>mph</em></div>
                <div className="year-summary-chip"><span>Avg EV</span><strong>{(teamYearSummary?.avgEV ?? 0).toFixed(1)}</strong><em>mph</em></div>
                <div className="year-summary-chip"><span>Hard Hit</span><strong>{teamYearSummary?.hardHit ?? 0}</strong><em>95+ mph</em></div>
                <div className="year-summary-chip"><span>Barrels</span><strong>{teamYearSummary?.barrels ?? 0}</strong><em>XBH proxy</em></div>
              </div>
              <p className="panel-tip">当前年份：{selectedYear} · 打者样本 {batYearSummary?.count ?? 0} · 投手样本 {pitchYearSummary?.rows.length ?? 0}</p>
            </article>
            <article className="chart-card reveal-up dashboard-side-card dashboard-blue-card"><h4>Dodgers Bat Top10 (wOBA)</h4><p className="panel-tip">球队年度击球能力总览 · {selectedYear}</p><div ref={overviewBatBarRef} className="chart-box" /></article>
          </div>
          <div className="dashboard-grid dashboard-grid-top">
            <article className="chart-card reveal-up dashboard-panel-card dashboard-rail-card">
              <h4>Pitch Usage</h4>
              <p className="panel-tip">投手年度球种占比参考 · {selectedYear}</p>
              <div className="savant-year-rail">
                {pitchUsageYearRows.map((row) => (
                  <button key={row.year} type="button" className={`savant-year-pill ${selectedYear === row.year ? 'active' : ''}`} onClick={() => setSelectedYear(row.year)}>
                    <strong>{row.year}</strong>
                    <span>{row.total}</span>
                  </button>
                ))}
              </div>
              <div className={`savant-usage-list year-transition-${yearTransition?.active ? (yearTransition.direction > 0 ? 'forward' : 'backward') : 'steady'}`} key={yearTransitionKey}>
                {normalizedPitchUsageRows.map((item, index) => (
                  <div key={item.name} className={`savant-usage-row accent-${(index % 4) + 1}`}>
                    <div className="savant-usage-head">
                      <span>{item.name}</span>
                      <strong>{item.pct}%</strong>
                    </div>
                    <div className="savant-usage-bar"><i style={{ width: `${item.pct}%` }} /></div>
                  </div>
                ))}
              </div>
            </article>

            <article className="chart-card reveal-up dashboard-panel-card dashboard-blue-card">
              <h4>Percentile Rankings</h4>
              <p className="panel-tip">打者/投手年度分位总览 · {selectedYear}</p>
              <div className="savant-percentile-meta">
                {[
                  { label: 'Avg EV', value: (teamYearSummary?.avgEV ?? 0).toFixed(1), hint: 'mph' },
                  { label: 'Launch Angle', value: (teamYearSummary?.avgLA ?? 0).toFixed(1), hint: 'deg' },
                  { label: 'Avg Velo', value: (teamYearSummary?.avgVelo ?? 0).toFixed(1), hint: 'mph' },
                  { label: 'Top Pitch', value: localShortName(teamYearSummary?.topPitch ?? 'Unknown'), hint: 'usage leader' }
                ].map((item) => (
                  <div key={item.label} className="savant-percentile-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.hint}</em>
                  </div>
                ))}
              </div>
              <div className="savant-percentile-list">
                {percentileYearRows.map((row) => {
                  const bar = Math.max(0, Math.min(100, Math.round((row.avgEV / 110) * 100)));
                  return (
                    <div key={row.year} className={`savant-percentile-row ${row.year === selectedYear ? 'active' : ''}`}>
                      <div className="savant-percentile-year">{row.year}</div>
                      <div className="savant-percentile-bars">
                        <div><span>EV</span><i style={{ width: `${bar}%` }} /></div>
                        <div><span>LA</span><i style={{ width: `${Math.max(0, Math.min(100, Math.round((Math.abs(row.avgLA) / 40) * 100)))}%` }} /></div>
                        <div><span>HH</span><i style={{ width: `${Math.min(100, row.hardHit)}%` }} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>

          <div className="dashboard-grid dashboard-grid-bottom">
            <article className="chart-card reveal-up dashboard-panel-card dashboard-blue-card">
              <h4>打者能力总览（Savant Radar）</h4>
              <div className="panel-filter-row">
                <label htmlFor="batterSelect">打者</label>
                <select className="player-select" id="batterSelect" value={selectedBatter} onChange={(e) => setSelectedBatter(e.target.value)}>
                  {batterOptions.map((r) => (
                    <option key={r.player_id} value={r.player_name}>{localShortName(r.player_name)}</option>
                  ))}
                </select>
              </div>
              <div className="player-meta-row">
                {selectedBatterRow && <img className="player-headshot" src={headshotUrl(selectedBatterRow.player_id)} alt={localShortName(selectedBatterRow.player_name)} loading="lazy" />}
                <div className="player-chip">{selectedBatterRow ? `${localShortName(selectedBatterRow.player_name)} · wOBA ${selectedBatterRow.woba.toFixed(3)} · HR ${selectedBatterRow.hrs}` : '暂无数据'}</div>
              </div>
              <div ref={batterAbilityRef} className="chart-box" />
            </article>
            <article className="chart-card reveal-up dashboard-panel-card dashboard-blue-card">
              <h4>投手能力总览（Savant Radar）</h4>
              <div className="panel-filter-row">
                <label htmlFor="pitcherSelect">投手</label>
                <select className="player-select pitcher" id="pitcherSelect" value={selectedPitcher} onChange={(e) => setSelectedPitcher(e.target.value)}>
                  {pitcherOptions.map((r) => (
                    <option key={r.player_id} value={r.player_name}>{localShortName(r.player_name)}</option>
                  ))}
                </select>
              </div>
              <div className="player-meta-row">
                {selectedPitcherRow && <img className="player-headshot" src={headshotUrl(selectedPitcherRow.player_id)} alt={localShortName(selectedPitcherRow.player_name)} loading="lazy" />}
                <div className="player-chip pitcher">{selectedPitcherRow ? `${localShortName(selectedPitcherRow.player_name)} · K% ${selectedPitcherRow.k_percent.toFixed(1)} · 球速 ${selectedPitcherRow.velocity.toFixed(1)}mph` : '暂无数据'}</div>
              </div>
              <div className={`chart-box year-transition-${yearTransition?.active ? (yearTransition.direction > 0 ? 'forward' : 'backward') : 'steady'}`} ref={pitcherAbilityRef} />
            </article>
          </div>

          <article className="chart-card reveal-up ability-matrix-card dashboard-full-span">
            <div className="matrix-head">
              <div className="matrix-head-copy">
                <span className="matrix-rail vertical-text">INDEX</span>
                <div>
                  <p className="chart-shell-eyebrow">ALBUM INNER PAGE</p>
                  <h4>能力图总览 / 图册内页</h4>
                </div>
              </div>
              <span>Savant Percentile Style</span>
            </div>
            <div className="matrix-table-wrap">
              <table className="ability-matrix">
                <thead>
                  <tr>
                    <th>维度</th>
                    <th>{localShortName(selectedBatter)}</th>
                    <th>打者分位</th>
                    <th>{localShortName(selectedPitcher)}</th>
                    <th>投手分位</th>
                  </tr>
                </thead>
                <tbody>
                  {abilityMatrixRows.map((row) => (
                    <tr key={row.dim}>
                      <td>{row.dim}</td>
                      <td>{row.batter}</td>
                      <td>
                        <div className="pct-cell"><span style={{ width: `${row.batterPct}%` }} />{row.batterPct}</div>
                      </td>
                      <td>{row.pitcher}</td>
                      <td>
                        <div className="pct-cell pitcher"><span style={{ width: `${row.pitcherPct}%` }} />{row.pitcherPct}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>




        </section>

        <section className="section outro" id="outro" data-section-id="outro">
          <p className="micro-label reveal-up">SESSION END</p>
          <h3 className="outro-title reveal-line"><span>SCROLL TO REPLAY</span></h3>
          <div className="outro-actions">
            <button className="outro-btn magnetic" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              BACK TO TOP
            </button>
            <button className="outro-btn magnetic" type="button" onClick={() => setShowCredits(true)}>
              ROLL CREDITS
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
