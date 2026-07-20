import type { RapierContext, RapierRigidBody } from '@react-three/rapier'

type PhysicsWorld = RapierContext['world']

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

export interface SlamResult {
  hits: number
  point: [number, number, number]
}

/** Sledgehammer slam: break the breakable you're AIMING at (nearest in a tight
 * cone), splash-break its immediate neighbours, and shock loose rubble at the
 * impact point. Whiffs slam through to a point in front of you (ground thud). */
export function slam(
  world: PhysicsWorld,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  range: number,
  power: number,
): SlamResult {
  let target: Breakable | null = null
  let targetDist = Infinity
  for (const b of registry) {
    if (!b.alive()) continue
    const p = b.position()
    if (!p) continue
    const vx = p.x - ox
    const vy = p.y - oy
    const vz = p.z - oz
    const dist = Math.hypot(vx, vy, vz)
    if (dist > range || dist < 1e-3) continue
    if ((vx * dx + vy * dy + vz * dz) / dist < 0.82) continue // tight aim cone
    if (dist < targetDist) {
      target = b
      targetDist = dist
    }
  }

  if (target) {
    const p = target.position()!
    const point: [number, number, number] = [p.x, p.y, p.z]
    target.break(dx * power, 2, dz * power)
    const splash = radialSmash(point[0], point[1], point[2], 1.5, power * 0.5)
    blastBodies(world, point[0], point[1], point[2], 1.8, 0.6)
    return { hits: 1 + splash, point }
  }

  // whiff: slam through to the floor in front
  const point: [number, number, number] = [
    ox + dx * range * 0.7,
    Math.max(0.06, oy + dy * range * 0.7),
    oz + dz * range * 0.7,
  ]
  blastBodies(world, point[0], point[1], point[2], 1.6, 0.5)
  return { hits: 0, point }
}

/** Old rubble frozen to fixed bodies (see Debris) registers here so blasts and
 * slams can thaw it back to dynamic — debris ALWAYS reacts to physics. */
const frozenDebris = new Map<number, () => void>()

export function markFrozen(handle: number, thaw: () => void): void {
  frozenDebris.set(handle, thaw)
}

/** Explosion shockwave: kick every dynamic body (debris, toys, projectiles)
 * radially away from the blast — and re-animate any frozen rubble in range.
 * Impulse scales with mass so everything gets a comparable velocity kick. */
export function blastBodies(world: PhysicsWorld, cx: number, cy: number, cz: number, radius: number, strength: number): void {
  world.forEachRigidBody((body) => {
    const t = body.translation()
    const dx = t.x - cx
    const dy = t.y - cy
    const dz = t.z - cz
    const dist = Math.hypot(dx, dy, dz)
    if (dist > radius || dist < 1e-3) return
    if (!body.isDynamic()) {
      const thaw = frozenDebris.get(body.handle)
      if (!thaw) return
      thaw()
      frozenDebris.delete(body.handle)
    }
    const k = strength * (1 - dist / radius) * body.mass()
    body.applyImpulse({ x: (dx / dist) * k, y: (dy / dist + 0.7) * k, z: (dz / dist) * k }, true)
  })
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
