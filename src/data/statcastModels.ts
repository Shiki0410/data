export type PitchRow = {
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
  balls: number;
  strikes: number;
  stand: string;
  pitch_type?: string;
  game_year?: number;
  events?: string;
  release_extension?: number;
  spin_axis?: number;
  arm_angle?: number;
  attack_angle?: number;
  attack_direction?: number;
  swing_path_tilt?: number;
  woba_value?: number;
  launch_speed?: number;
  launch_angle?: number;
  hc_x?: number;
  hc_y?: number;
};

export type BatRow = {
  game_date: string;
  player_name: string;
  events: string;
  launch_speed: number;
  launch_angle: number;
  hc_x: number;
  hc_y: number;
  pitch_name?: string;
  game_year?: number;
  game_pk?: number;
  at_bat_number?: number;
  pitch_number?: number;
  estimated_woba_using_speedangle?: number;
  woba_value?: number;
  bb_type?: string;
  hit_distance_sc?: number;
};

export type TeamBatRow = {
  player_id: number;
  player_name: string;
  pa: number;
  woba: number;
  hardhit_percent: number;
  barrels_per_pa_percent: number;
  launch_speed: number;
  hrs: number;
};

export type TeamPitchRow = {
  player_id: number;
  player_name: string;
  pa: number;
  k_percent: number;
  bb_percent: number;
  velocity: number;
  woba: number;
};

export type YearOption = {
  value: number;
  label: string;
};

export type PitchUsageItem = { name: string; value: number };
export type SprayHitType = 'single' | 'double' | 'triple' | 'home_run';
export type SprayPoint = { x: number; y: number; hit: SprayHitType; gameDate?: string };
export type RollingPoint = { x: number; y: number };

export type PitchYearBucket = {
  year: number;
  rows: PitchRow[];
  usage: PitchUsageItem[];
  topPitch: string;
  avgVelo: number;
  avgSpin: number;
};

export type BatYearBucket = {
  year: number;
  rows: BatRow[];
  count: number;
  avgEV: number;
  avgLA: number;
  hardHit: number;
  barrels: number;
};

export type StoryChartData = {
  year: number;
  pitchUsage: PitchUsageItem[];
  pitchSpeed: Array<{ name: string; value: number }>;
  battingTrend: RollingPoint[];
  sprayPoints: SprayPoint[];
};

export type YearSummary = {
  year: number;
  count: number;
  avgEV: number;
  avgLA: number;
  hardHit: number;
  barrels: number;
  avgVelo: number;
  topPitch: string;
  usage: PitchUsageItem[];
};
