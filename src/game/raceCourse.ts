import * as THREE from "three";

export interface RaceGateDef {
  label: string;
  position: THREE.Vector3;
  radius: number;
  color: number;
  /** Unit vector — fly through the ring along this axis */
  axis: THREE.Vector3;
}

function trackAxis(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3().subVectors(to, from).normalize();
}

/** K-7 Grand Prix — flowing oval with a chicane, gates face the racing line */
const P = {
  start: new THREE.Vector3(0, 14, -58),
  g1: new THREE.Vector3(0, 14, 6),
  g2: new THREE.Vector3(50, 16, 50),
  g3: new THREE.Vector3(90, 13, -8),
  g4: new THREE.Vector3(36, 11, -50),
  finish: new THREE.Vector3(-10, 14, -42),
};

export const RACE_GATES: RaceGateDef[] = [
  {
    label: "LAUNCH",
    position: P.g1.clone(),
    radius: 26,
    color: 0xffd23f,
    axis: trackAxis(P.start, P.g1),
  },
  {
    label: "SWEEP",
    position: P.g2.clone(),
    radius: 24,
    color: 0xffd23f,
    axis: trackAxis(P.g1, P.g2),
  },
  {
    label: "OUTER",
    position: P.g3.clone(),
    radius: 24,
    color: 0xffd23f,
    axis: trackAxis(P.g2, P.g3),
  },
  {
    label: "CHICANE",
    position: P.g4.clone(),
    radius: 22,
    color: 0xffd23f,
    axis: trackAxis(P.g3, P.g4),
  },
  {
    label: "FINISH",
    position: P.finish.clone(),
    radius: 28,
    color: 0x66e8ff,
    axis: trackAxis(P.g4, P.finish),
  },
];

export const RACE_START = P.start.clone();
export const RACE_START_YAW = 0;

/** Waypoints for path beacons (start → each gate in order). */
export function raceTrackPath(): THREE.Vector3[] {
  return [RACE_START, ...RACE_GATES.map((g) => g.position)];
}

export function formatRaceTime(ms: number): string {
  const sec = ms / 1000;
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec - m * 60;
    return `${m}:${s.toFixed(2).padStart(5, "0")}`;
  }
  return `${sec.toFixed(2)}s`;
}
