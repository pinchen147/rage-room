import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame } from '../state/store'
import { WEAPONS } from './arsenal'
import { onSwing } from './swing'

const ease = (x: number): number => x * x * (3 - 2 * x) // smoothstep: snappy but smooth

/** First-person weapon that follows the camera. The sledgehammer plays an
 * overhead wind-up → slam → lunge; throwables do a quick toss. Positioned in
 * camera space each frame (no scene-graph reparenting) to stay robust. */
export function Viewmodel() {
  const camera = useThree((s) => s.camera)
  const group = useRef<THREE.Group>(null)
  const weaponIndex = useGame((s) => s.weaponIndex)
  const w = WEAPONS[weaponIndex]
  const isMelee = w.kind === 'melee'
  const swingStart = useRef(-999)

  useEffect(() => onSwing(() => (swingStart.current = performance.now() / 1000)), [])

  useFrame(() => {
    const g = group.current
    if (!g) return
    const t = performance.now() / 1000 - swingStart.current
    const dur = isMelee ? 0.28 : 0.16

    let swing = 0 // rotateX offset
    let lunge = 0 // extra forward push
    let drop = 0
    if (t >= 0 && t < dur) {
      const p = t / dur
      if (isMelee) {
        if (p < 0.22) {
          swing = -0.9 * ease(p / 0.22) // fast windup
        } else if (p < 0.5) {
          const k = ease((p - 0.22) / 0.28)
          swing = -0.9 + k * 2.5 // slam down
          lunge = Math.sin(k * Math.PI) * 0.2
          drop = Math.sin(k * Math.PI) * 0.09
        } else {
          swing = 1.6 * (1 - ease((p - 0.5) / 0.5)) // smooth recover
        }
      } else {
        const k = ease(p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6) // quick out-and-back
        swing = -0.6 * k
        lunge = 0.28 * k
      }
    }

    g.position.copy(camera.position)
    g.quaternion.copy(camera.quaternion)
    g.translateX(0.3)
    g.translateY(-0.28 - drop)
    g.translateZ(-0.62 - lunge)
    g.rotateZ(0.12)
    g.rotateX(-0.2 + swing)
  })

  return (
    <group ref={group}>
      {w.kind === 'melee' ? (
        <>
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.024, 0.028, 0.5, 8]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <boxGeometry args={[0.22, 0.18, 0.2]} />
            <meshStandardMaterial color={w.color} metalness={0.6} roughness={0.35} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, -0.05, 0]}>
          <sphereGeometry args={[w.radius, 16, 16]} />
          <meshStandardMaterial
            color={w.color}
            metalness={w.metal}
            roughness={0.35}
            emissive={w.blast ? '#39ff6a' : '#000000'}
            emissiveIntensity={w.blast ? 0.5 : 0}
          />
        </mesh>
      )}
    </group>
  )
}
