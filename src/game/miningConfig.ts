/** Global mining tune — lower = longer drill time per asteroid. */
export const MINING_DURATION_SCALE = 3;

/** Max distance (m) from ship to asteroid center to drill. */
export const MINE_RANGE = 22;

/** Min forward alignment (0–1) to prefer the rock you're aiming at. */
export const MINE_AIM_DOT = 0.25;

/** Ore units drained per second at rateMul 1 (was 3.2; ÷3 ≈ 3× longer to clear a rock). */
export const ORE_DRILL_RATE = 3.2 / MINING_DURATION_SCALE;

/** Chunk-break sparkle frequency while drilling. */
export const ORE_CHUNK_BREAK_RATE = 4 / MINING_DURATION_SCALE;

/** Asteroid shake ramp while drilling. */
export const ORE_WOBBLE_RATE = 3 / MINING_DURATION_SCALE;

/** Seconds between ore burst VFX from the mining beam. */
export const ORE_BURST_INTERVAL = 0.35 * MINING_DURATION_SCALE;
