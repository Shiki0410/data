import type { HeroPlayer, HeroSceneConfig, HeroScenePalette, HeroSceneSnapshot, HeroSceneState, HeroSceneStageMeta } from './heroSceneTypes';

export const heroStageOrder: HeroSceneState[] = ['selector', 'intro', 'perspective', 'portal', 'reveal', 'expand', 'sphere', 'panel'];

export const heroStageMeta: HeroSceneStageMeta[] = [
  { id: 'selector', title: 'SELECT PLAYER', description: '先选择大谷或山本，确定整套叙事的主题与数据语气。', start: 0, end: 0.12, visiblePanel: false },
  { id: 'intro', title: 'ASYNC SLIDER', description: '文字层以错位节奏进入，建立第一层滚动叙事的张力。', start: 0.12, end: 0.24, visiblePanel: false },
  { id: 'perspective', title: 'PERSPECTIVE', description: '透视背景与网格开始出现，场景深度逐步建立。', start: 0.24, end: 0.36, visiblePanel: false },
  { id: 'portal', title: 'PORTAL', description: '中央洞口与聚焦区域打开，为穿越镜头留出入口。', start: 0.36, end: 0.48, visiblePanel: false },
  { id: 'reveal', title: 'REVEAL', description: '核心文字从上方显露，信息与空间开始叠合。', start: 0.48, end: 0.62, visiblePanel: false },
  { id: 'expand', title: 'EXPAND', description: '镜头拉近，场景半径扩大，故事从局部走向整体。', start: 0.62, end: 0.76, visiblePanel: false },
  { id: 'sphere', title: 'SPHERE', description: '球体与环状结构接管视觉中心，进入最终空间形态。', start: 0.76, end: 0.88, visiblePanel: true },
  { id: 'panel', title: 'PANEL', description: '右侧数据面板进入稳定展示状态，准备接入图表与链接。', start: 0.88, end: 1, visiblePanel: true }
];

export const heroSceneConfig: Record<HeroSceneState, HeroSceneConfig> = {
  selector: { depth: 11.8, spin: 0.05, portal: 0.04, glow: 0.12, reveal: 0, spread: 0.18, textRise: 0.05, orbit: 0.06 },
  intro: { depth: 10.4, spin: 0.1, portal: 0.12, glow: 0.2, reveal: 0.14, spread: 0.26, textRise: 0.12, orbit: 0.12 },
  perspective: { depth: 8.6, spin: 0.18, portal: 0.24, glow: 0.3, reveal: 0.28, spread: 0.36, textRise: 0.2, orbit: 0.2 },
  portal: { depth: 6.4, spin: 0.3, portal: 0.7, glow: 0.5, reveal: 0.46, spread: 0.58, textRise: 0.34, orbit: 0.3 },
  reveal: { depth: 5, spin: 0.48, portal: 0.86, glow: 0.68, reveal: 0.74, spread: 0.76, textRise: 0.58, orbit: 0.46 },
  expand: { depth: 3.3, spin: 0.74, portal: 0.98, glow: 0.86, reveal: 0.9, spread: 0.96, textRise: 0.78, orbit: 0.7 },
  sphere: { depth: 2.2, spin: 0.96, portal: 1, glow: 1, reveal: 1, spread: 1, textRise: 0.94, orbit: 0.9 },
  panel: { depth: 2.5, spin: 1, portal: 0.92, glow: 0.9, reveal: 0.98, spread: 0.98, textRise: 0.9, orbit: 0.98 }
};

export const heroScenePalette: Record<HeroPlayer, HeroScenePalette> = {
  yamamoto: { primary: '#ffbb38', secondary: '#ffe29a', accent: '#fff3cc', background: '#160f06' },
  ohtani: { primary: '#42e8ff', secondary: '#96f6ff', accent: '#d4fdff', background: '#040b12' }
};

export const heroStageByProgress = (progress: number): HeroSceneState => {
  const match = heroStageMeta.find((stage) => progress >= stage.start && progress < stage.end);
  return match?.id ?? 'panel';
};

export const heroStageTitle = (stage: HeroSceneState) => heroStageMeta.find((item) => item.id === stage)?.title ?? 'SELECT PLAYER';
export const heroStageDescription = (stage: HeroSceneState) => heroStageMeta.find((item) => item.id === stage)?.description ?? '先从双人物入口开始，再进入滚动叙事。';
export const heroStagePanelVisible = (stage: HeroSceneState) => heroStageMeta.find((item) => item.id === stage)?.visiblePanel ?? false;

export const heroPlayerLabel = (player: HeroPlayer) => (player === 'ohtani' ? 'BATTING 3D FIELD' : 'PITCHING 3D FIELD');

export const resolveHeroSceneSnapshot = (progress: number, player: HeroPlayer): HeroSceneSnapshot => {
  const stage = heroStageByProgress(progress);
  const stageIndex = heroStageOrder.indexOf(stage);
  const meta = heroStageMeta.find((item) => item.id === stage) ?? heroStageMeta[0];

  return {
    stage,
    stageIndex,
    title: meta.title,
    description: meta.description,
    panelVisible: meta.visiblePanel,
    progress,
    player,
    palette: heroScenePalette[player],
    config: heroSceneConfig[stage]
  };
};
