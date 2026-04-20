export type HeroPlayer = 'yamamoto' | 'ohtani';

export type HeroSceneState = 'selector' | 'intro' | 'perspective' | 'portal' | 'reveal' | 'expand' | 'sphere' | 'panel';

export type HeroStoryStage = HeroSceneState;

export type HeroSceneProgress = number;

export type HeroSceneMetrics = {
  stageIndex: number;
  title: string;
  description: string;
  panelVisible: boolean;
};

export type HeroPanelState = {
  visible: boolean;
  title: string;
  description: string;
};

export type HeroSceneConfig = {
  depth: number;
  spin: number;
  portal: number;
  glow: number;
  reveal: number;
  spread: number;
  textRise: number;
  orbit: number;
};

export type HeroSceneStageMeta = {
  id: HeroSceneState;
  title: string;
  description: string;
  start: number;
  end: number;
  visiblePanel: boolean;
};

export type HeroScenePalette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
};

export type HeroSceneSnapshot = {
  stage: HeroSceneState;
  stageIndex: number;
  title: string;
  description: string;
  panelVisible: boolean;
  progress: HeroSceneProgress;
  player: HeroPlayer;
  palette: HeroScenePalette;
  config: HeroSceneConfig;
};
