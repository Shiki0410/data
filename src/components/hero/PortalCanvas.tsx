import React, { type ReactNode } from 'react';
import { HeroesThreeScene } from '../../HeroesThreeScene';
import type { HeroPlayer, HeroSceneProgress, HeroSceneState, HeroStoryStage } from './heroSceneTypes';

type PortalCanvasProps = {
  heroPlayer: HeroPlayer;
  heroStoryStage: HeroStoryStage;
  heroSceneState: HeroSceneState;
  heroSceneProgress: HeroSceneProgress;
  heroSummary?: {
    batter?: { name: string; avgEV: number; avgLA: number; hardHit: number; barrels: number; spray?: Array<{ x: number; y: number }> } | null;
    pitcher?: { name: string; avgVelo: number; avgSpin: number; topPitch: string; usage: Array<{ name: string; value: number }>; tunnel?: Array<{ x: number; y: number }> } | null;
  };
  children?: ReactNode;
};

export function PortalCanvas({ heroPlayer, heroStoryStage, heroSceneState, heroSceneProgress, heroSummary }: PortalCanvasProps) {
  return (
    <div className="hero-stage-canvas-shell">
      <HeroesThreeScene
        heroPlayer={heroPlayer}
        heroStoryStage={heroStoryStage}
        heroSceneState={heroSceneState}
        heroSceneProgress={heroSceneProgress}
        heroSummary={heroSummary}
      />
    </div>
  );
}
