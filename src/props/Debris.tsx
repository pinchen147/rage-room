import { useEffect, useMemo, useState } from 'react'
import { InstancedRigidBodies, RigidBody } from '@react-three/rapier'
import type { InstancedRigidBodyProps } from '@react-three/rapier'
import { getKit, getPhysics, getWreckGeos } from '../systems/shardKits'
import type { WreckStyle } from '../systems/shardKits'
import type { MaterialClass } from '../audio/sfx'
import { useGame } from '../state/store'

/** Debris spawning. Each break = one instanced swarm of small material shards
 * plus a few BIG structural wreck pieces (shelf beams, desk panels, tyre strips,
 * drum plates) with per-material physics. Debris PERSISTS — pieces stay physical
 * (kickable, blastable), sleeping when settled; only a hard batch cap retires
 * the oldest rubble, and R sweeps all. */

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

const MAX_BATCHES = 30 // worst case ~360 shard bodies — inside the desktop budget
let nextBatchId = 0

interface Batch extends DebrisSpec {
  id: number
}

const rand = (span: number): number => (Math.random() - 0.5) * span

function ShardBatch({ batch }: { batch: Batch }) {
  const kit = getKit(batch.material)
  const phys = getPhysics(batch.material)
  const geo = useMemo(() => kit.geos[batch.id % kit.geos.length], [kit, batch.id])

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
      instances={instances}
      colliders="cuboid"
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

/** One big wreck piece: a shelf beam, desk panel, tyre strip, drum plate…
 * Individual body (interpolated, casts shadow) with material physics. */
function WreckPiece({ batch, index }: { batch: Batch; index: number }) {
  const kit = getKit(batch.material)
  const phys = getPhysics(batch.material)
  const geos = getWreckGeos(batch.wreck)
  const geo = geos[(batch.id + index) % geos.length]
  const s = batch.wreckScale * (0.85 + Math.random() * 0.3)
  const { origin, bias } = batch
  return (
    <RigidBody
      colliders="hull"
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
      <mesh geometry={geo} material={kit.mat} scale={s} castShadow />
    </RigidBody>
  )
}

export function DebrisManager() {
  const [batches, setBatches] = useState<Batch[]>([])
  const roomKey = useGame((s) => s.roomKey)

  useEffect(() => {
    listener = (spec) => {
      const batch: Batch = { ...spec, id: nextBatchId++ }
      setBatches((prev) => [...prev.slice(-(MAX_BATCHES - 1)), batch])
    }
    return () => {
      listener = null
    }
  }, [])

  // R = fresh room: sweep the rubble with the respawn.
  useEffect(() => {
    setBatches([])
  }, [roomKey])

  return (
    <>
      {batches.map((b) => (
        <group key={b.id}>
          {b.count > 0 && <ShardBatch batch={b} />}
          {Array.from({ length: b.heroes }, (_, i) => (
            <WreckPiece key={i} batch={b} index={i} />
          ))}
        </group>
      ))}
    </>
  )
}
