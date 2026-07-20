import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useGame } from '../state/store'

const MASS = 2
const BREAK_SPEED = 8 // m/s relative impact speed to shatter (throw ~26, walk ~6)

/** Interim break: on a hard hit the box swaps to 8 flying shards and ticks up
 * destruction%. Placeholder for the offline pre-fractured shard sets (v2 plan). */
function Shard({
  position,
  vel,
  color,
}: {
  position: [number, number, number]
  vel: [number, number, number]
  color: string
}) {
  const ref = useRef<RapierRigidBody>(null)
  useEffect(() => {
    ref.current?.setLinvel({ x: vel[0], y: vel[1], z: vel[2] }, true)
    ref.current?.setAngvel(
      { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 8 },
      true,
    )
  }, [vel])
  return (
    <RigidBody ref={ref} colliders="cuboid" position={position} mass={0.2} restitution={0.3} friction={0.9}>
      <mesh castShadow>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color={color} roughness={0.75} metalness={0.05} />
      </mesh>
    </RigidBody>
  )
}

function Shards({ position, color }: { position: [number, number, number]; color: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        off: [
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
        ] as [number, number, number],
        vel: [(Math.random() - 0.5) * 5, Math.random() * 4 + 1.5, (Math.random() - 0.5) * 5] as [
          number,
          number,
          number,
        ],
      })),
    [],
  )
  return (
    <>
      {pieces.map((p) => (
        <Shard
          key={p.id}
          position={[position[0] + p.off[0], position[1] + p.off[1], position[2] + p.off[2]]}
          vel={p.vel}
          color={color}
        />
      ))}
    </>
  )
}

function SmashableBox({ position, color }: { position: [number, number, number]; color: string }) {
  const register = useGame((s) => s.registerProp)
  const destroy = useGame((s) => s.destroy)
  const addRage = useGame((s) => s.addRage)
  const report = useGame((s) => s.reportImpact)
  const [broken, setBroken] = useState(false)
  const done = useRef(false)
  const ready = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    register(MASS)
    // Ignore contacts while the scene settles so nothing self-shatters on spawn.
    const t = window.setTimeout(() => (ready.current = true), 1200)
    return () => window.clearTimeout(t)
  }, [register])

  if (broken) return <Shards position={position} color={color} />
  return (
    <RigidBody
      colliders="cuboid"
      position={position}
      restitution={0.15}
      friction={0.85}
      onCollisionEnter={({ target, other }) => {
        if (!ready.current) return
        const a = target.rigidBody?.linvel()
        const b = other.rigidBody?.linvel()
        if (!a || !b) return
        const rel = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
        report(rel)
        if (rel > BREAK_SPEED) {
          setBroken(true)
          destroy(MASS)
          addRage(0.1)
        }
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>
    </RigidBody>
  )
}

const COLORS = ['#c94b4b', '#4b7bc9', '#4bc98a', '#c9a84b', '#9a4bc9']

/** A 5x5 grid of stacked boxes — a stand-in for the real prop set. */
export function SmashableField() {
  const boxes: ReactElement[] = []
  let i = 0
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      boxes.push(
        <SmashableBox
          key={`${x}:${z}`}
          position={[x * 1.2, 0.31, z * 1.2 - 2]}
          color={COLORS[i % COLORS.length]}
        />,
      )
      i++
    }
  }
  return <>{boxes}</>
}
