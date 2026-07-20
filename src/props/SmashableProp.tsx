import { useEffect, useMemo, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { PropDef } from './PropCatalog'
import { useGame } from '../state/store'
import { registerBreakable } from '../systems/destruction'
import { emitImpact } from '../feel/impactBus'
import { hitStop } from '../feel/timeState'
import { spawnDebris } from './Debris'
import { emitDust, emitSparks } from '../vfx/Particles'
import * as Audio from '../audio/AudioEngine'

interface Props {
  def: PropDef
  position: [number, number, number]
  rotationY?: number
}

/** A real GLB prop: intact photoreal model → on a hard enough hit it swaps to a
 * per-material shard batch + dust + layered smash audio, and scores its mass. */
export function SmashableProp({ def, position, rotationY = 0 }: Props) {
  const gltf = useGLTF(def.file)
  const destroy = useGame((s) => s.destroy)
  const addRage = useGame((s) => s.addRage)

  const body = useRef<RapierRigidBody>(null)
  const brokenRef = useRef(false)
  const readyRef = useRef(false)
  const [broken, setBroken] = useState(false)

  // Source GLTFs use inconsistent units (the shelves are 21m raw). Measure the
  // clone and normalize to the catalog's real-world targetHeight, re-origined
  // to xz-center with the base at y=0 so layout positions are exact.
  const { object, offset, factor } = useMemo(() => {
    const source = def.node ? (gltf.nodes[def.node] as THREE.Object3D | undefined) : gltf.scene
    if (!source) throw new Error(`Prop node not found: ${def.file} → ${def.node ?? '<scene>'}`)
    const clone = source.clone(true)
    clone.position.set(0, 0, 0)
    clone.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    const box = new THREE.Box3().setFromObject(clone)
    const height = box.max.y - box.min.y
    const f = def.targetHeight / (height > 1e-6 ? height : 1)
    const off: [number, number, number] = [
      (-(box.min.x + box.max.x) / 2) * f,
      -box.min.y * f,
      (-(box.min.z + box.max.z) / 2) * f,
    ]
    return { object: clone, offset: off, factor: f }
  }, [gltf, def])

  const size = def.targetHeight

  const breakable = Number.isFinite(def.breakSpeed)

  const doBreak = (bx: number, by: number, bz: number) => {
    if (brokenRef.current || !breakable) return
    brokenRef.current = true
    const t = body.current?.translation()
    const origin: [number, number, number] = t ? [t.x, t.y + size * 0.25, t.z] : position
    const energy = Math.min(1, 0.3 + def.mass / 16 + Math.hypot(bx, bz) / 22)

    setBroken(true)
    destroy(def.mass)
    addRage(0.05 + energy * 0.07)
    emitImpact(energy, ...origin)
    Audio.smash(def.material, energy, origin)
    spawnDebris({
      origin,
      bias: [bx, by, bz],
      material: def.material,
      count: def.shardCount,
      scale: Math.min(0.55, Math.max(0.1, size * 0.24)),
      heroes: def.heroes,
    })
    emitDust(origin, 8 + Math.round(energy * 14), 0.25 + size * 0.12)
    if (def.material === 'glass' || def.material === 'metal') emitSparks(origin, 8)
    if (energy > 0.45) hitStop(30 + energy * 45)
  }
  const doBreakRef = useRef(doBreak)
  doBreakRef.current = doBreak

  useEffect(() => {
    const t = window.setTimeout(() => (readyRef.current = true), 900)
    if (!breakable) return () => window.clearTimeout(t)
    const unregister = registerBreakable({
      position: () => {
        const p = body.current?.translation()
        return p ? { x: p.x, y: p.y, z: p.z } : null
      },
      break: (bx, by, bz) => doBreakRef.current(bx, by, bz),
      alive: () => !brokenRef.current,
      body: () => body.current,
    })
    return () => {
      window.clearTimeout(t)
      unregister()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (broken) return null

  return (
    <RigidBody
      ref={body}
      type={def.fixed ? 'fixed' : 'dynamic'}
      colliders={def.collider}
      position={position}
      rotation={[0, rotationY, 0]}
      restitution={def.restitution ?? 0.15}
      friction={0.85}
      onCollisionEnter={({ target, other }) => {
        if (!readyRef.current || brokenRef.current) return
        const a = target.rigidBody?.linvel()
        const b = other.rigidBody?.linvel()
        if (!a || !b) return
        const rel = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
        if (rel < 1.5) return
        const p = body.current?.translation()
        const at: [number, number, number] = p ? [p.x, p.y, p.z] : position
        if (breakable && rel > def.breakSpeed) {
          const speed = Math.hypot(b.x, b.y, b.z) || 1
          const f = Math.min(7, rel * 0.3)
          doBreak((b.x / speed) * f, 2, (b.z / speed) * f)
        } else {
          Audio.clank(def.material, Math.min(1, rel / 14), at)
        }
      }}
    >
      <group position={offset} scale={factor}>
        <primitive object={object} />
      </group>
    </RigidBody>
  )
}
