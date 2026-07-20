import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useGame } from '../state/store'
import { registerBreakable } from '../systems/destruction'
import { emitImpact } from '../feel/impactBus'

const BREAK_SPEED = 8 // m/s relative impact to shatter from a collision

interface Variant {
  size: number
  mass: number
  shards: number
}
const VARIANTS: Variant[] = [
  { size: 0.6, mass: 2, shards: 8 },
  { size: 0.9, mass: 4, shards: 12 },
  { size: 0.45, mass: 1, shards: 6 },
]

function Shard({
  position,
  vel,
  color,
  size,
}: {
  position: [number, number, number]
  vel: [number, number, number]
  color: string
  size: number
}) {
  const ref = useRef<RapierRigidBody>(null)
  useEffect(() => {
    ref.current?.setLinvel({ x: vel[0], y: vel[1], z: vel[2] }, true)
    ref.current?.setAngvel(
      { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10, z: (Math.random() - 0.5) * 10 },
      true,
    )
  }, [vel])
  return (
    <RigidBody ref={ref} colliders="cuboid" position={position} mass={0.2} restitution={0.3} friction={0.9}>
      <mesh castShadow>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color={color} roughness={0.75} metalness={0.05} />
      </mesh>
    </RigidBody>
  )
}

function Shards({
  origin,
  color,
  bias,
  count,
  size,
}: {
  origin: [number, number, number]
  color: string
  bias: [number, number, number]
  count: number
  size: number
}) {
  const shardSize = size / 3
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        off: [
          (Math.random() - 0.5) * size,
          (Math.random() - 0.5) * size,
          (Math.random() - 0.5) * size,
        ] as [number, number, number],
        vel: [
          bias[0] + (Math.random() - 0.5) * 5,
          bias[1] + Math.random() * 3 + 1,
          bias[2] + (Math.random() - 0.5) * 5,
        ] as [number, number, number],
      })),
    // frozen at break time
    [],
  )
  return (
    <>
      {pieces.map((p) => (
        <Shard
          key={p.id}
          position={[origin[0] + p.off[0], origin[1] + p.off[1], origin[2] + p.off[2]]}
          vel={p.vel}
          color={color}
          size={shardSize}
        />
      ))}
    </>
  )
}

function SmashableBox({
  position,
  color,
  variant,
}: {
  position: [number, number, number]
  color: string
  variant: Variant
}) {
  const register = useGame((s) => s.registerProp)
  const destroy = useGame((s) => s.destroy)
  const addRage = useGame((s) => s.addRage)
  const report = useGame((s) => s.reportImpact)

  const body = useRef<RapierRigidBody>(null)
  const brokenRef = useRef(false)
  const readyRef = useRef(false)
  const [brk, setBrk] = useState<{ origin: [number, number, number]; bias: [number, number, number] } | null>(null)

  // Break with a shard-launch bias. Uses refs only, so a stale closure is safe.
  const doBreak = (bx: number, by: number, bz: number) => {
    if (brokenRef.current) return
    brokenRef.current = true
    const t = body.current?.translation()
    const origin: [number, number, number] = t ? [t.x, t.y, t.z] : position
    setBrk({ origin, bias: [bx, by, bz] })
    destroy(variant.mass)
    addRage(0.08)
    const energy = Math.min(1, 0.4 + (Math.abs(bx) + Math.abs(bz)) / 24)
    emitImpact(energy, origin[0], origin[1], origin[2])
  }
  const doBreakRef = useRef(doBreak)
  doBreakRef.current = doBreak

  useEffect(() => {
    register(variant.mass)
    const t = window.setTimeout(() => (readyRef.current = true), 800)
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

  if (brk) {
    return <Shards origin={brk.origin} color={color} bias={brk.bias} count={variant.shards} size={variant.size} />
  }

  return (
    <RigidBody
      ref={body}
      colliders="cuboid"
      position={position}
      restitution={0.15}
      friction={0.85}
      onCollisionEnter={({ target, other }) => {
        if (!readyRef.current || brokenRef.current) return
        const a = target.rigidBody?.linvel()
        const b = other.rigidBody?.linvel()
        if (!a || !b) return
        const rel = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
        report(rel)
        if (rel > BREAK_SPEED) {
          const speed = Math.hypot(b.x, b.y, b.z) || 1
          const f = Math.min(6, rel * 0.25)
          doBreak((b.x / speed) * f, 2, (b.z / speed) * f)
        }
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[variant.size, variant.size, variant.size]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>
    </RigidBody>
  )
}

const COLORS = ['#c94b4b', '#4b7bc9', '#4bc98a', '#c9a84b', '#9a4bc9', '#c96b9a', '#4bc9c0']

/** A varied field of smashables. Keyed by roomKey so pressing R respawns them all. */
export function SmashableField() {
  const roomKey = useGame((s) => s.roomKey)
  const boxes: ReactElement[] = []
  let i = 0
  for (let gx = -3; gx <= 2; gx++) {
    for (let gz = -3; gz <= 2; gz++) {
      const v = VARIANTS[i % VARIANTS.length]
      const color = COLORS[i % COLORS.length]
      boxes.push(
        <SmashableBox
          key={`${roomKey}:${gx}:${gz}`}
          position={[gx * 1.6 + 0.8, v.size / 2 + 0.02, gz * 1.6 - 2]}
          color={color}
          variant={v}
        />,
      )
      i++
    }
  }
  return <>{boxes}</>
}
