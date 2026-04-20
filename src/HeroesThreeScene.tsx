import React, { useEffect, useMemo, useRef, useState } from 'react';
import { resolveHeroSceneSnapshot, heroPlayerLabel } from './components/hero/heroSceneConfig';
import type { HeroPlayer, HeroSceneProgress, HeroSceneState, HeroStoryStage } from './components/hero/heroSceneTypes';

type HeroesThreeSceneProps = {
  heroPlayer: HeroPlayer;
  heroStoryStage: HeroStoryStage;
  heroSceneState: HeroSceneState;
  heroSceneProgress: HeroSceneProgress;
  heroSummary?: {
    batter?: { name: string; avgEV: number; avgLA: number; hardHit: number; barrels: number; spray?: Array<{ x: number; y: number }> } | null;
    pitcher?: { name: string; avgVelo: number; avgSpin: number; topPitch: string; usage: Array<{ name: string; value: number }>; tunnel?: Array<{ x: number; y: number }> } | null;
  };
};

type RibbonItem = {
  label: string;
  tone: 'hot' | 'cool' | 'neutral';
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
};

const stageWords: Record<HeroSceneState, string[]> = {
  selector: ['SELECT', 'PLAYER', 'DATA', 'FIELD', 'ENTRY'],
  intro: ['SILENT', 'LIFT', 'REVEAL', 'TENSION', 'OPEN'],
  perspective: ['GRID', 'DEPTH', 'TRACE', 'FRAME', 'SCAN'],
  portal: ['PORTAL', 'ENTRY', 'WORK', 'SHIFT', 'CUT'],
  reveal: ['REVEAL', 'SURFACE', 'STACK', 'CUT', 'RUN'],
  expand: ['EXPAND', 'BROADEN', 'WIDEN', 'OPEN', 'MOVE'],
  sphere: ['ORBIT', 'CIRCLE', 'FLOW', 'RING', 'SHELL'],
  panel: ['LINK', 'CHART', 'MAP', 'LIVE', 'CONTROL']
};

const stageCards: Record<HeroSceneState, Array<{ title: string; value: string; note: string }>> = {
  selector: [{ title: 'SELECT', value: '01', note: '入口选择' }, { title: 'READY', value: '02', note: '镜头预热' }],
  intro: [{ title: 'INTRO', value: '03', note: '上方显露' }, { title: 'PULSE', value: '04', note: '节奏进入' }],
  perspective: [{ title: 'DEPTH', value: '05', note: '建立透视' }, { title: 'GRID', value: '06', note: '空间网格' }],
  portal: [{ title: 'PORTAL', value: '07', note: '中央缺口' }, { title: 'ENTRY', value: '08', note: '中心聚焦' }],
  reveal: [{ title: 'REVEAL', value: '09', note: '逐渐显露' }, { title: 'STACK', value: '10', note: '文字层叠' }],
  expand: [{ title: 'EXPAND', value: '11', note: '镜头拉近' }, { title: 'WIDE', value: '12', note: '场景展开' }],
  sphere: [{ title: 'ORBIT', value: '13', note: '环绕成型' }, { title: 'SPHERE', value: '14', note: '进入环场' }],
  panel: [{ title: 'CHART', value: '15', note: '交互图表' }, { title: 'LIVE', value: '16', note: '鼠标驱动' }]
};

export function HeroesThreeScene({ heroPlayer, heroStoryStage, heroSceneState, heroSceneProgress, heroSummary }: HeroesThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5, active: false });

  const snapshot = useMemo(() => resolveHeroSceneSnapshot(heroSceneProgress, heroPlayer), [heroPlayer, heroSceneProgress]);
  const stageIndex = snapshot.stageIndex;
  const stageProgress = heroSceneProgress;
  const words = stageWords[heroSceneState];
  const cards = stageCards[heroSceneState];

  const ribbons = useMemo<RibbonItem[]>(() => {
    const labels = [...words, heroPlayer === 'ohtani' ? 'BATTING' : 'PITCHING', snapshot.title, 'AW CREATIVE', 'AIRBNB / APPLE'];
    return Array.from({ length: 18 }, (_, i) => ({
      label: labels[i % labels.length],
      tone: i % 3 === 0 ? 'hot' : i % 3 === 1 ? 'cool' : 'neutral',
      x: ((i * 13 + stageIndex * 7) % 100) / 100,
      y: ((i * 9 + stageIndex * 11) % 100) / 100,
      w: 8 + (i % 4) * 2,
      h: 18 + (i % 3) * 6,
      rot: ((i % 8) - 4) * 4 + stageProgress * 18
    }));
  }, [heroPlayer, snapshot.title, stageIndex, stageProgress, words]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      setMouse({ x, y, active: true });
    };

    const onLeave = () => setMouse({ x: 0.5, y: 0.5, active: false });

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const styleVars = {
    ['--mouse-x' as string]: mouse.x,
    ['--mouse-y' as string]: mouse.y,
    ['--stage-progress' as string]: stageProgress,
    ['--stage-index' as string]: stageIndex,
    ['--scene-active' as string]: mouse.active ? 1 : 0
  } as React.CSSProperties;

  return (
    <div ref={mountRef} className={`heroes-three-scene stage-${heroSceneState} ${mouse.active ? 'is-interactive' : ''}`} data-hero-stage={heroStoryStage} data-hero-player={heroPlayer} style={styleVars}>
      <div className="heroes-scene-stage">
        <div className="heroes-scene-grid" />

        <div className="heroes-scene-bgtext" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, row) => (
            <div key={row} className="heroes-scene-bgrow" style={{ ['--row' as string]: row } as React.CSSProperties}>
              {Array.from({ length: 14 }).map((__, col) => (<span key={col}>{heroPlayer === 'ohtani' ? 'W' : 'K'}</span>))}
            </div>
          ))}
        </div>

        <div className="heroes-scene-title-strip"><p>{heroPlayerLabel(heroPlayer)}</p><strong>{snapshot.title}</strong></div>

        <div className="heroes-scene-center">
          <div className="heroes-scene-portal">
            <div className="heroes-scene-mask" />
            <div className={`heroes-scene-stack stage-${heroSceneState}`}>
              {words.map((word, index) => (
                <span key={`${word}-${index}`} className={`heroes-scene-stack-line line-${(index % 4) + 1}`} style={{ animationDelay: `${index * 0.12}s`, transform: `translate3d(0, ${Math.max(0, 28 - stageProgress * 42 - index * 2)}px, 0) scale(${0.92 + stageProgress * 0.14})`, opacity: Math.min(1, 0.18 + stageProgress * 1.08) }}>
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="heroes-scene-ring-wrap" aria-hidden="true">
          <div className={`heroes-scene-ring stage-${heroSceneState}`} style={{ width: `min(${52 + stageProgress * 18}vw, ${760 + stageProgress * 260}px)`, height: `min(${52 + stageProgress * 18}vw, ${760 + stageProgress * 260}px)`, opacity: 0.28 + stageProgress * 0.52, transform: `rotateX(${72 - stageProgress * 8}deg) rotateZ(${stageProgress * 32}deg) scale(${0.92 + stageProgress * 0.26})` }}>
            <i /><i /><i />
          </div>
        </div>

        <div className={`heroes-scene-cards ${mouse.active ? 'visible' : ''}`} style={{ transform: `translate3d(${(mouse.x - 0.5) * 36}px, ${(mouse.y - 0.5) * 28}px, 0)`, opacity: mouse.active ? 1 : 0.72 }} aria-hidden="true">
          {cards.map((card, idx) => (
            <div key={card.title} className="heroes-scene-card" style={{ transform: `translate3d(${(mouse.x - 0.5) * (12 + idx * 5)}px, ${(mouse.y - 0.5) * (10 + idx * 4)}px, 0) rotate(${idx % 2 === 0 ? -1 : 1}deg)` }}>
              <span>{card.title}</span><strong>{card.value}</strong><em>{card.note}</em>
            </div>
          ))}
        </div>

        <div className={`heroes-scene-chartrail ${mouse.active ? 'visible' : ''}`} aria-hidden="true">
          {ribbons.map((item, index) => (
            <div key={`${item.label}-${index}`} className={`chart-chip ${item.tone === 'hot' ? 'accent' : ''}`} style={{ position: 'absolute', left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.w}ch`, minHeight: `${item.h}px`, transform: `translate(-50%, -50%) rotate(${item.rot}deg)`, opacity: 0.34 + stageProgress * 0.48 }}>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div className="heroes-three-scene-overlay">
        <span>{heroPlayerLabel(heroPlayer)}</span>
        <strong>{snapshot.title}</strong>
        <p>{Math.round(heroSceneProgress * 100)}%</p>
      </div>
    </div>
  );
}
