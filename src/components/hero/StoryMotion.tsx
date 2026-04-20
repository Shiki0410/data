import { useMemo } from 'react';
import { resolveHeroSceneSnapshot } from './heroSceneConfig';
import type { HeroPlayer, HeroSceneMetrics, HeroSceneProgress, HeroSceneState, HeroStoryStage } from './heroSceneTypes';

export type UseHeroStoryMotionInput = {
  progress: HeroSceneProgress;
  player: HeroPlayer;
};

export type UseHeroStoryMotionResult = {
  heroStoryStage: HeroStoryStage;
  heroSceneState: HeroSceneState;
  heroSceneProgress: HeroSceneProgress;
  heroSceneMetrics: HeroSceneMetrics;
};

export function useHeroStoryMotion({ progress, player }: UseHeroStoryMotionInput): UseHeroStoryMotionResult {
  const snapshot = resolveHeroSceneSnapshot(progress, player);

  const heroSceneMetrics = useMemo<HeroSceneMetrics>(() => ({
    stageIndex: snapshot.stageIndex,
    title: snapshot.title,
    description: snapshot.description,
    panelVisible: snapshot.panelVisible
  }), [snapshot.description, snapshot.panelVisible, snapshot.stageIndex, snapshot.title]);

  return {
    heroStoryStage: snapshot.stage,
    heroSceneState: snapshot.stage,
    heroSceneProgress: snapshot.progress,
    heroSceneMetrics
  };
}
