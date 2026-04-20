import type { ReactNode } from 'react';
import type { HeroPlayer, HeroSceneProgress, HeroSceneState, HeroStoryStage } from './heroSceneTypes';

type StageShellProps = {
  heroPlayer: HeroPlayer;
  heroStoryStage: HeroStoryStage;
  heroSceneState: HeroSceneState;
  heroSceneProgress: HeroSceneProgress;
  heroPanelVisible: boolean;
  children: ReactNode;
};

export function StageShell({ heroPlayer, heroStoryStage, heroSceneState, heroSceneProgress, heroPanelVisible, children }: StageShellProps) {
  return (
    <section className={`hero-stage-layout stage-${heroSceneState} ${heroPanelVisible ? 'panel-ready' : ''}`} data-hero-stage={heroStoryStage} data-hero-player={heroPlayer}>
      {children}
      <div className="hero-stage-progress" aria-hidden="true">
        {Math.round(heroSceneProgress * 100)}%
      </div>
    </section>
  );
}
