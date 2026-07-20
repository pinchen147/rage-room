import { useEffect, useMemo, useRef, useState } from 'react'
import { InstancedRigidBodies, RigidBody, useRapier } from '@react-three/rapier'
import type { InstancedRigidBodyProps, RapierRigidBody } from '@react-three/rapier'
import { getKit, getPhysics, getWreckGeos } from '../systems/shardKits'
import type { WreckStyle } from '../systems/shardKits'
import type { MaterialClass } from '../audio/sfx'

/** Debris spawning. Each break = one instanced swarm of small material shards
 * plus a few BIG structural wreck pieces with per-material physics.
 *
 * Debris is PERMANENT — nothing is ever deleted or swept (not even on R).
 * The newest LIVE_BATCHES stay fully dynamic (kickable, blastable); older
 * rubble freezes into fixed bodies where it lies — walkable wreckage strata
 * at zero solver cost. */

export interface DebrisSpec {
  origin: readonly [number, number, number]
  bias: readonly [number, number, number]
  material: MaterialClass
  count: number
  heroes: number
  wreck: WreckStyle
  /** Volume-solved scales (see SmashableProp): rubble ≈ the prop's matter. */
  shardScale: number
  wreckScale: number
  /** Spawn radius ≈ half the prop's footprint. */
  spread: number
}

type Listener = (spec: DebrisSpec) => void
let listener: Listener | null = null

export function spawnDebris(spec: DebrisSpec): void {
  listener?.(spec)
}

const LIVE_BATCHES = 36 // newest N stay dynamic; older rubble freezes in place
let nextBatchId = 0

// Small shards live in collision group 3 and DON'T collide with each other —
// piles of N shards otherwise generate O(N²) contacts, the main physics cost.
const SHARD_GROUPS = 0x0008fff7

interface Batch extends DebrisSpec {
  id: number
}

const rand = (span: number): number => (Math.random() - 0.5) * span

/** Freeze a body where it lies (dynamic → fixed). */
function useFreeze(frozen: boolean, bodies: () => (RapierRigidBody | null)[]) {
  const { rapier } = useRapier()
  useEffect(() => {
    if (!frozen) return
    for (const b of bodies()) b?.setBodyType(rapier.RigidBodyType.Fixed, false)
  }, [frozen, rapier, bodies])
}

function ShardBatch({ batch, frozen }: { batch: Batch; frozen: boolean }) {
  const kit = getKit(batch.material)
  const phys = getPhysics(batch.material)
  const geo = useMemo(() => kit.geos[batch.id % kit.geos.length], [kit, batch.id])
  const bodies = useRef<(RapierRigidBody | null)[]>(null)

  useFreeze(frozen, () => bodies.current ?? [])

  const instances = useMemo<InstancedRigidBodyProps[]>(() => {
    const { origin, bias, count, shardScale, spread } = batch
    return Array.from({ length: count }, (_, i) => {
      const s = shardScale * (0.7 + Math.random() * 0.6)
      return {
        key: i,
        position: [origin[0] + rand(spread), origin[1] + rand(spread) + 0.1, origin[2] + rand(spread)],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        scale: [s, s, s],
        linearVelocity: [bias[0] + rand(5), Math.abs(bias[1]) * 0.6 + Math.random() * 2.5, bias[2] + rand(5)],
        angularVelocity: [rand(16), rand(16), rand(16)],
      }
    })
  }, [batch])

  return (
    <InstancedRigidBodies
      ref={bodies}
      instances={instances}
      colliders="cuboid"
      collisionGroups={SHARD_GROUPS}
      restitution={phys.restitution}
      friction={0.8}
      linearDamping={phys.linearDamping}
      angularDamping={phys.angularDamping}
      gravityScale={phys.gravityScale}
    >
      <instancedMesh args={[geo, kit.mat, instances.length]} count={instances.length} frustumCulled={false} />
    </InstancedRigidBodies>
  )
}

/** One big wreck piece: a shelf beam, desk panel, tyre strip, drum plate… */
function WreckPiece({ batch, index, frozen }: { batch: Batch; index: number; frozen: boolean }) {
  const kit = getKit(batch.material)
  const phys = getPhysics(batch.material)
  const geos = getWreckGeos(batch.wreck)
  const geo = geos[(batch.id + index) % geos.length]
  const body = useRef<RapierRigidBody>(null)
  const s = useMemo(() => batch.wreckScale * (0.85 + Math.random() * 0.3), [batch.wreckScale])
  const { origin, bias } = batch

  useFreeze(frozen, () => [body.current])

  return (
    <RigidBody
      ref={body}
      colliders="cuboid"
      position={[origin[0] + rand(batch.spread), origin[1] + 0.12 + index * 0.06, origin[2] + rand(batch.spread)]}
      rotation={[Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI]}
      linearVelocity={[bias[0] * 0.7 + rand(2.5), Math.abs(bias[1]) * 0.45 + 1.2, bias[2] * 0.7 + rand(2.5)]}
      angularVelocity={[rand(8), rand(8), rand(8)]}
      restitution={phys.restitution}
      friction={0.85}
      linearDamping={phys.linearDamping}
      angularDamping={phys.angularDamping}
      gravityScale={phys.gravityScale}
    >
      {/* no castShadow: AO grounds rubble; shadow casters are budgeted */}
      <mesh geometry={geo} material={kit.mat} scale={s} />
    </RigidBody>
  )
}

export function DebrisManager() {
  const [batches, setBatches] = useState<Batch[]>([])

  useEffect(() => {
    listener = (spec) => setBatches((prev) => [...prev, { ...spec, id: nextBatchId++ }])
    return () => {
      listener = null
    }
  }, [])

  const firstLive = Math.max(0, batches.length - LIVE_BATCHES)

  return (
    <>
      {batches.map((b, i) => (
        <group key={b.id}>
          {b.count > 0 && <ShardBatch batch={b} frozen={i < firstLive} />}
          {Array.from({ length: b.heroes }, (_, j) => (
            <WreckPiece key={j} batch={b} index={j} frozen={i < firstLive} />
          ))}
        </group>
      ))}
    </>
  )
}
