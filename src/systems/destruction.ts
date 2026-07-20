import type { RapierRigidBody } from '@react-three/rapier'

/** A prop that can be smashed. Registered while intact so melee swings and
 * explosions can find it without a Rapier shape-query (version-stable + predictable). */
export interface Breakable {
  /** World position, or null before the body exists. */
  position: () => { x: number; y: number; z: number } | null
  /** Break it, launching shards along the given bias velocity. */
  break: (biasX: number, biasY: number, biasZ: number) => void
  /** Still intact? */
  alive: () => boolean
  /** The Rapier body, for impulse knockback. */
  body: () => RapierRigidBody | null
}

const registry = new Set<Breakable>()

export function registerBreakable(b: Breakable): () => void {
  registry.add(b)
  return () => registry.delete(b)
}

/** Smash every intact breakable within `range` and within `cosArc` of `dir`
 * (dir normalized). Shards launch along dir * power. Returns hit count. */
export function meleeSmash(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  range: number,
  cosArc: number,
  power: number,
): number {
  let hits = 0
  for (const b of registry) {
    if (!b.alive()) continue
    const p = b.position()
    if (!p) continue
    const vx = p.x - ox
    const vy = p.y - oy
    const vz = p.z - oz
    const dist = Math.hypot(vx, vy, vz)
    if (dist > range || dist < 1e-3) continue
    if ((vx * dx + vy * dy + vz * dz) / dist < cosArc) continue
    b.break(dx * power, dy * power + 1.5, dz * power)
    hits++
  }
  return hits
}

/** Explosion: smash every intact breakable within `radius`, launching shards
 * radially outward with distance falloff. Returns hit count. */
export function radialSmash(
  cx: number,
  cy: number,
  cz: number,
  radius: number,
  power: number,
): number {
  let hits = 0
  for (const b of registry) {
    if (!b.alive()) continue
    const p = b.position()
    if (!p) continue
    const vx = p.x - cx
    const vy = p.y - cy
    const vz = p.z - cz
    const dist = Math.hypot(vx, vy, vz)
    if (dist > radius) continue
    const inv = dist < 1e-3 ? 0 : 1 / dist
    const falloff = 1 - dist / radius
    b.break(vx * inv * power * falloff, Math.abs(vy * inv) * power * falloff + 3, vz * inv * power * falloff)
    hits++
  }
  return hits
}
