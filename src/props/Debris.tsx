import { useEffect, useMemo, useState } from 'react'
import { InstancedRigidBodies, RigidBody } from '@react-three/rapier'
import type { InstancedRigidBodyProps } from '@react-three/rapier'
import { getKit } from '../systems/shardKits'
import type { MaterialClass } from '../audio/sfx'

/** Debris spawning: one InstancedRigidBodies batch per break (cheap swarm) plus
 * a couple of individual "hero" chunks (interpolated, cast shadows). Batches
 * retire on a TTL under a hard cap so a long session never accumulates cost. */

export interface DebrisSpec {
  origin: readonly [number, number, number]
  bias: readonly [number, number, number]
  material: MaterialClass
  count: number
  scale: number
  heroes?: number
}

type Listener = (spec: DebrisSpec) => void
let listener: Listener | null = null

export function spawnDebris(spec: DebrisSpec): void {
  listener?.(spec)
}

const BATCH_TTL_MS = 8000
const MAX_BATCHES = 12
let nextBatchId = 0

interface Batch extends DebrisSpec {
  id: number
}

const rand = (span: number): number => (Math.random() - 0.5) * span

function ShardBatch({ batch }: { batch: Batch }) {
  const kit = getKit(batch.material)
  const geo = useMemo(() => kit.geos[batch.id % kit.geos.length], [kit, batch.id])

  const instances = useMemo<InstancedRigidBodyProps[]>(() => {
    const { origin, bias, count, scale } = batch
    return Array.from({ length: count }, (_, i) => {
      const s = scale * (0.55 + Math.random() * 0.75)
      return {
        key: i,
        position: [origin[0] + rand(scale * 0.9), origin[1] + rand(scale * 0.9) + 0.1, origin[2] + rand(scale * 0.9)],
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
      restitution={0.25}
      friction={0.8}
      linearDamping={0.15}
      angularDamping={0.6}
      gravityScale={1.5}
    >
      <instancedMesh args={[geo, kit.mat, instances.length]} count={instances.length} frustumCulled={false} />
    </InstancedRigidBodies>
  )
}

function HeroChunk({ batch, index }: { batch: Batch; index: number }) {
  const kit = getKit(batch.material)
  const geo = kit.geos[(batch.id + index + 1) % kit.geos.length]
  const s = batch.scale * (1.1 + Math.random() * 0.5)
  const { origin, bias } = batch
  return (
    <RigidBody
      colliders="cuboid"
      position={[origin[0] + rand(batch.scale), origin[1] + 0.15, origin[2] + rand(batch.scale)]}
      rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
      linearVelocity={[bias[0] * 0.8 + rand(3), Math.abs(bias[1]) * 0.5 + 1.5, bias[2] * 0.8 + rand(3)]}
      angularVelocity={[rand(10), rand(10), rand(10)]}
      restitution={0.3}
      friction={0.8}
      linearDamping={0.1}
      angularDamping={0.5}
    >
      <mesh geometry={geo} material={kit.mat} scale={s} castShadow />
    </RigidBody>
  )
}

export function DebrisManager() {
  const [batches, setBatches] = useState<Batch[]>([])

  useEffect(() => {
    listener = (spec) => {
      const batch: Batch = { ...spec, id: nextBatchId++ }
      setBatches((prev) => [...prev.slice(-(MAX_BATCHES - 1)), batch])
      window.setTimeout(() => {
        setBatches((prev) => prev.filter((b) => b.id !== batch.id))
      }, BATCH_TTL_MS)
    }
    return () => {
      listener = null
    }
  }, [])

  return (
    <>
      {batches.map((b) => (
        <group key={b.id}>
          <ShardBatch batch={b} />
          {Array.from({ length: b.heroes ?? 0 }, (_, i) => (
            <HeroChunk key={i} batch={b} index={i} />
          ))}
        </group>
      ))}
    </>
  )
}
