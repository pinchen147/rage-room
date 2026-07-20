import { useEffect, useMemo, useRef, useState } from 'react'
import { InstancedRigidBodies, RigidBody } from '@react-three/rapier'
import type { InstancedRigidBodyProps, RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { getKit, getPhysics, getWreckGeos } from '../systems/shardKits'
import type { WreckStyle } from '../systems/shardKits'
import type { MaterialClass } from '../audio/sfx'
import { markFrozenZone, unmarkFrozenZone } from '../systems/destruction'

/** Debris with a two-state lifecycle. Debris is PERMANENT — never deleted.
 *
 *  LIVE   — newest batches: instanced rigid bodies + big wreck pieces, fully
 *           physical (kickable, blastable).
 *  FROZEN — older batches: transforms captured, physics unmounted, all pieces
 *           BAKED into one merged static mesh (1 draw call, 0 physics, 0
 *           per-frame sync). A blast overlapping the zone un-bakes it back to
 *           LIVE with radial velocities, so old rubble still erupts. */

export interface DebrisSpec {
  origin: readonly [number, number, number]
  bias: readonly [number, number, number]
  material: MaterialClass
  count: number
  heroes: number
  wreck: WreckStyle
  shardScale: number
  wreckScale: number
  spread: number
}

interface Piece {
  p: [number, number, number]
  r: [number, number, number]
  s: number
  gi: number
}

interface Vel {
  l: [number, number, number]
  a: [number, number, number]
}

interface Entry {
  id: number
  spec: DebrisSpec
  state: 'live' | 'frozen'
  bornAt: number
  shards: Piece[]
  wrecks: Piece[]
  shardVels: Vel[]
  wreckVels: Vel[]
}

type Listener = (spec: DebrisSpec) => void
let listener: Listener | null = null

export function spawnDebris(spec: DebrisSpec): void {
  listener?.(spec)
}

const LIVE_BATCHES = 14 // newest N stay dynamic; older rubble bakes to static
const MIN_FREEZE_AGE_MS = 6000 // never bake mid-flight — rubble must settle first
let nextBatchId = 0

// Small shards skip shard-shard collisions (O(N²) contacts otherwise).
const SHARD_GROUPS = 0x0008fff7

const rand = (span: number): number => (Math.random() - 0.5) * span

function genEntry(spec: DebrisSpec): Entry {
  const { origin, bias, spread } = spec
  const shards: Piece[] = []
  const shardVels: Vel[] = []
  for (let i = 0; i < spec.count; i++) {
    shards.push({
      p: [origin[0] + rand(spread), origin[1] + rand(spread) + 0.1, origin[2] + rand(spread)],
      r: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
      s: spec.shardScale * (0.7 + Math.random() * 0.6),
      gi: i,
    })
    shardVels.push({
      l: [bias[0] + rand(5), Math.abs(bias[1]) * 0.6 + Math.random() * 2.5, bias[2] + rand(5)],
      a: [rand(16), rand(16), rand(16)],
    })
  }
  const wrecks: Piece[] = []
  const wreckVels: Vel[] = []
  for (let i = 0; i < spec.heroes; i++) {
    wrecks.push({
      p: [origin[0] + rand(spread), origin[1] + 0.12 + i * 0.06, origin[2] + rand(spread)],
      r: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
      s: spec.wreckScale * (0.85 + Math.random() * 0.3),
      gi: i,
    })
    wreckVels.push({
      l: [bias[0] * 0.7 + rand(2.5), Math.abs(bias[1]) * 0.45 + 1.2, bias[2] * 0.7 + rand(2.5)],
      a: [rand(8), rand(8), rand(8)],
    })
  }
  return { id: nextBatchId++, spec, state: 'live', bornAt: performance.now(), shards, wrecks, shardVels, wreckVels }
}

const _q = new THREE.Quaternion()
const _e = new THREE.Euler()

function capture(body: RapierRigidBody | null, prev: Piece): Piece {
  if (!body) return prev
  const t = body.translation()
  const rot = body.rotation()
  _e.setFromQuaternion(_q.set(rot.x, rot.y, rot.z, rot.w))
  return { p: [t.x, t.y, t.z], r: [_e.x, _e.y, _e.z], s: prev.s, gi: prev.gi }
}

// ---------------------------------------------------------------- LIVE

function LiveBatch({
  entry,
  freeze,
  onFrozen,
}: {
  entry: Entry
  freeze: boolean
  onFrozen: (id: number, shards: Piece[], wrecks: Piece[]) => void
}) {
  const kit = getKit(entry.spec.material)
  const phys = getPhysics(entry.spec.material)
  const geo = useMemo(() => kit.geos[entry.id % kit.geos.length], [kit, entry.id])
  const shardBodies = useRef<(RapierRigidBody | null)[]>(null)
  const wreckBodies = useRef<(RapierRigidBody | null)[]>([])
  const wreckGeos = getWreckGeos(entry.spec.wreck)

  useEffect(() => {
    if (!freeze) return
    const shards = entry.shards.map((p, i) => capture(shardBodies.current?.[i] ?? null, p))
    const wrecks = entry.wrecks.map((p, i) => capture(wreckBodies.current[i] ?? null, p))
    onFrozen(entry.id, shards, wrecks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeze])

  const instances = useMemo<InstancedRigidBodyProps[]>(
    () =>
      entry.shards.map((p, i) => ({
        key: i,
        position: p.p,
        rotation: p.r,
        scale: [p.s, p.s, p.s],
        linearVelocity: entry.shardVels[i].l,
        angularVelocity: entry.shardVels[i].a,
      })),
    [entry],
  )

  return (
    <>
      {instances.length > 0 && (
        <InstancedRigidBodies
          ref={shardBodies}
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
      )}
      {entry.wrecks.map((p, i) => (
        <RigidBody
          key={i}
          ref={(b) => {
            wreckBodies.current[i] = b
          }}
          colliders="cuboid"
          position={p.p}
          rotation={p.r}
          linearVelocity={entry.wreckVels[i].l}
          angularVelocity={entry.wreckVels[i].a}
          restitution={phys.restitution}
          friction={0.85}
          linearDamping={phys.linearDamping}
          angularDamping={phys.angularDamping}
          gravityScale={phys.gravityScale}
        >
          <mesh geometry={wreckGeos[p.gi % wreckGeos.length]} material={kit.mat} scale={p.s} />
        </RigidBody>
      ))}
    </>
  )
}

// ---------------------------------------------------------------- FROZEN

function FrozenBatch({
  entry,
  onThaw,
}: {
  entry: Entry
  onThaw: (id: number, cx: number, cy: number, cz: number, strength: number) => void
}) {
  const kit = getKit(entry.spec.material)
  const wreckGeos = getWreckGeos(entry.spec.wreck)
  const shardGeo = kit.geos[entry.id % kit.geos.length]

  const merged = useMemo(() => {
    const m = new THREE.Matrix4()
    const parts: THREE.BufferGeometry[] = []
    const bake = (source: THREE.BufferGeometry, piece: Piece) => {
      // mergeGeometries requires uniform layouts — arcs (Torus) are indexed,
      // jagged shards are not. Normalize everything to non-indexed.
      const g = source.index ? source.toNonIndexed() : source.clone()
      m.compose(
        new THREE.Vector3(...piece.p),
        _q.setFromEuler(_e.set(piece.r[0], piece.r[1], piece.r[2])),
        new THREE.Vector3(piece.s, piece.s, piece.s),
      )
      g.applyMatrix4(m)
      parts.push(g)
    }
    for (const p of entry.shards) bake(shardGeo, p)
    for (const p of entry.wrecks) bake(wreckGeos[p.gi % wreckGeos.length], p)
    const out = (parts.length > 0 ? mergeGeometries(parts) : null) ?? new THREE.BufferGeometry()
    for (const g of parts) g.dispose()
    return out
  }, [entry, shardGeo, wreckGeos])

  useEffect(() => {
    // zone bounds from baked pieces
    const all = [...entry.shards, ...entry.wrecks]
    if (all.length === 0) return
    let cx = 0
    let cy = 0
    let cz = 0
    for (const p of all) {
      cx += p.p[0]
      cy += p.p[1]
      cz += p.p[2]
    }
    cx /= all.length
    cy /= all.length
    cz /= all.length
    let r = 0.8
    for (const p of all) r = Math.max(r, Math.hypot(p.p[0] - cx, p.p[1] - cy, p.p[2] - cz) + 0.5)
    markFrozenZone(entry.id, { cx, cy, cz, r, thaw: (bx, by, bz, s) => onThaw(entry.id, bx, by, bz, s) })
    return () => unmarkFrozenZone(entry.id)
  }, [entry, onThaw])

  useEffect(() => () => merged.dispose(), [merged])

  return <mesh geometry={merged} material={kit.mat} receiveShadow />
}

// ---------------------------------------------------------------- MANAGER

export function DebrisManager() {
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    listener = (spec) => setEntries((prev) => [...prev, genEntry(spec)])
    return () => {
      listener = null
    }
  }, [])

  const onFrozen = useMemo(
    () => (id: number, shards: Piece[], wrecks: Piece[]) =>
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, state: 'frozen' as const, shards, wrecks } : e))),
    [],
  )

  /** Un-bake: rejoin the live window (moved to newest) with blast-radial velocities. */
  const onThaw = useMemo(
    () => (id: number, bx: number, by: number, bz: number, strength: number) =>
      setEntries((prev) => {
        const entry = prev.find((e) => e.id === id)
        if (!entry) return prev
        const radial = (p: Piece, k: number): Vel => {
          const dx = p.p[0] - bx
          const dy = p.p[1] - by
          const dz = p.p[2] - bz
          const d = Math.hypot(dx, dy, dz) || 1
          const v = Math.min(9, strength * 2.2) * k
          return {
            l: [(dx / d) * v, Math.abs(dy / d) * v * 0.6 + 2, (dz / d) * v],
            a: [rand(12), rand(12), rand(12)],
          }
        }
        const thawed: Entry = {
          ...entry,
          state: 'live',
          bornAt: performance.now(),
          shardVels: entry.shards.map((p) => radial(p, 1)),
          wreckVels: entry.wrecks.map((p) => radial(p, 0.7)),
        }
        return [...prev.filter((e) => e.id !== id), thawed]
      }),
    [],
  )

  const firstLive = Math.max(0, entries.length - LIVE_BATCHES)
  const now = performance.now()
  const mayFreeze = (e: Entry, i: number): boolean =>
    i < firstLive && now - e.bornAt > MIN_FREEZE_AGE_MS

  // A too-young batch past the window can't freeze yet — tick until it can.
  const [, forceTick] = useState(0)
  useEffect(() => {
    const pending = entries.some((e, i) => e.state === 'live' && i < entries.length - LIVE_BATCHES)
    if (!pending) return
    const t = window.setTimeout(() => forceTick((x) => x + 1), 1500)
    return () => window.clearTimeout(t)
  })

  return (
    <>
      {entries.map((e, i) =>
        e.state === 'live' ? (
          <LiveBatch key={e.id} entry={e} freeze={mayFreeze(e, i)} onFrozen={onFrozen} />
        ) : (
          <FrozenBatch key={e.id} entry={e} onThaw={onThaw} />
        ),
      )}
    </>
  )
}
